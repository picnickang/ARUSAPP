/**
 * SQLite Database Initialization for Vessel Mode
 * 
 * This script initializes the local SQLite database with the necessary
 * tables and structure for offline vessel deployments.
 */

import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * Initialize SQLite database with required tables
 */
export async function initializeSqliteDatabase() {
  console.log('[SQLite Init] Initializing vessel mode database...');

  // Ensure data directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const dbPath = path.join(DATA_DIR, "vessel-local.db");
  
  const client = createClient({
    url: `file:${dbPath}`,
  });

  const db = drizzle(client);

  try {
    // Create organizations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        domain TEXT,
        billing_email TEXT,
        max_users INTEGER DEFAULT 50,
        max_equipment INTEGER DEFAULT 1000,
        subscription_tier TEXT NOT NULL DEFAULT 'basic',
        is_active INTEGER DEFAULT 1,
        emergency_labor_multiplier INTEGER DEFAULT 3,
        emergency_parts_multiplier REAL DEFAULT 1.5,
        emergency_downtime_multiplier INTEGER DEFAULT 3,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create users table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        is_active INTEGER DEFAULT 1,
        last_login_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create sync_journal table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sync_journal (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT,
        user_id TEXT,
        sync_status TEXT DEFAULT 'pending',
        created_at INTEGER
      )
    `);

    // Create sync_outbox table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sync_outbox (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        payload TEXT,
        processed INTEGER DEFAULT 0,
        processing_attempts INTEGER DEFAULT 0,
        created_at INTEGER,
        processed_at INTEGER
      )
    `);

    // Create vessels table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS vessels (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        imo TEXT,
        flag TEXT,
        vessel_type TEXT,
        vessel_class TEXT,
        condition TEXT DEFAULT 'good',
        online_status TEXT DEFAULT 'unknown',
        last_heartbeat INTEGER,
        dwt INTEGER,
        year_built INTEGER,
        active INTEGER DEFAULT 1,
        notes TEXT,
        day_rate_sgd REAL,
        downtime_days REAL DEFAULT 0,
        downtime_reset_at INTEGER,
        operation_days REAL DEFAULT 0,
        operation_reset_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create equipment table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS equipment (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        vessel_id TEXT,
        vessel_name TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        serial_number TEXT,
        location TEXT,
        is_active INTEGER DEFAULT 1,
        specifications TEXT,
        operating_parameters TEXT,
        maintenance_schedule TEXT,
        emergency_labor_multiplier REAL,
        emergency_parts_multiplier REAL,
        emergency_downtime_multiplier REAL,
        created_at INTEGER,
        updated_at INTEGER,
        version INTEGER DEFAULT 1,
        last_modified_by TEXT,
        last_modified_device TEXT
      )
    `);

    // Create devices table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT,
        label TEXT,
        vessel TEXT,
        buses TEXT,
        sensors TEXT,
        config TEXT,
        hmac_key TEXT,
        device_type TEXT DEFAULT 'generic',
        j1939_config TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create equipment_telemetry table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS equipment_telemetry (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        ts INTEGER NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        value REAL NOT NULL,
        unit TEXT NOT NULL,
        threshold REAL,
        status TEXT NOT NULL DEFAULT 'normal'
      )
    `);

    // Create downtime_events table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS downtime_events (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        work_order_id TEXT,
        equipment_id TEXT,
        vessel_id TEXT,
        downtime_type TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_hours REAL,
        reason TEXT,
        impact_level TEXT DEFAULT 'medium',
        revenue_impact REAL,
        opportunity_cost REAL,
        root_cause TEXT,
        preventable INTEGER,
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // ========================================================================
    // PHASE 1: WORK ORDERS & MAINTENANCE TABLES (16 tables)
    // ========================================================================

    // Work Orders table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS work_orders (
        id TEXT PRIMARY KEY,
        wo_number TEXT,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        vessel_id TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        priority INTEGER NOT NULL DEFAULT 3,
        maintenance_type TEXT,
        reason TEXT,
        description TEXT,
        estimated_hours REAL,
        actual_hours REAL,
        estimated_cost_per_hour REAL,
        actual_cost_per_hour REAL,
        estimated_downtime_hours REAL,
        actual_downtime_hours REAL,
        total_parts_cost REAL DEFAULT 0,
        total_labor_cost REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        roi REAL,
        downtime_cost_per_hour REAL,
        affects_vessel_downtime INTEGER DEFAULT 0,
        vessel_downtime_started_at INTEGER,
        assigned_crew_id TEXT,
        required_skills TEXT,
        labor_hours REAL,
        labor_cost REAL,
        port_call_id TEXT,
        drydock_window_id TEXT,
        maintenance_window TEXT,
        maintenance_template_id TEXT,
        schedule_id TEXT,
        planned_start_date INTEGER,
        planned_end_date INTEGER,
        actual_start_date INTEGER,
        actual_end_date INTEGER,
        created_at INTEGER,
        updated_at INTEGER,
        version INTEGER DEFAULT 1,
        last_modified_by TEXT,
        last_modified_device TEXT
      )
    `);

    // Work Order Completions table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS work_order_completions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        work_order_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        vessel_id TEXT,
        completed_at INTEGER NOT NULL,
        completed_by TEXT,
        completed_by_name TEXT,
        actual_duration_minutes INTEGER,
        estimated_duration_minutes INTEGER,
        planned_start_date INTEGER,
        planned_end_date INTEGER,
        actual_start_date INTEGER,
        actual_end_date INTEGER,
        total_cost REAL DEFAULT 0,
        total_parts_cost REAL DEFAULT 0,
        total_labor_cost REAL DEFAULT 0,
        estimated_downtime_hours REAL,
        actual_downtime_hours REAL,
        affects_vessel_downtime INTEGER DEFAULT 0,
        vessel_downtime_hours REAL,
        parts_used TEXT,
        parts_count INTEGER DEFAULT 0,
        completion_status TEXT DEFAULT 'completed',
        compliance_flags TEXT,
        quality_check_passed INTEGER,
        notes TEXT,
        predictive_context TEXT,
        maintenance_schedule_id TEXT,
        maintenance_type TEXT,
        on_time_completion INTEGER,
        duration_variance_percent REAL,
        cost_variance_percent REAL,
        created_at INTEGER
      )
    `);

    // Work Order Parts table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS work_order_parts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        work_order_id TEXT NOT NULL,
        part_id TEXT NOT NULL,
        quantity_used INTEGER NOT NULL,
        unit_cost REAL NOT NULL,
        total_cost REAL NOT NULL,
        used_by TEXT NOT NULL,
        used_at INTEGER,
        notes TEXT,
        supplier_id TEXT,
        estimated_delivery_date INTEGER,
        actual_delivery_date INTEGER,
        actual_cost REAL,
        delivery_status TEXT DEFAULT 'pending',
        inventory_movement_id TEXT,
        created_at INTEGER
      )
    `);

    // Maintenance Schedules table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS maintenance_schedules (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        vessel_id TEXT,
        scheduled_date INTEGER NOT NULL,
        maintenance_type TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 2,
        estimated_duration INTEGER,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled',
        assigned_to TEXT,
        pdm_score REAL,
        auto_generated INTEGER DEFAULT 0,
        work_order_id TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Maintenance Records table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        schedule_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        maintenance_type TEXT NOT NULL,
        actual_start_time INTEGER,
        actual_end_time INTEGER,
        actual_duration INTEGER,
        technician TEXT,
        notes TEXT,
        parts_used TEXT,
        labor_hours REAL,
        downtime_minutes INTEGER,
        completion_status TEXT NOT NULL DEFAULT 'completed',
        follow_up_required INTEGER DEFAULT 0,
        created_at INTEGER
      )
    `);

    // Maintenance Costs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS maintenance_costs (
        id TEXT PRIMARY KEY,
        record_id TEXT,
        schedule_id TEXT,
        equipment_id TEXT NOT NULL,
        work_order_id TEXT,
        cost_type TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        description TEXT,
        incurred_at INTEGER,
        created_at INTEGER
      )
    `);

    // Maintenance Templates table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS maintenance_templates (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        equipment_type TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        maintenance_type TEXT NOT NULL,
        frequency_days INTEGER,
        frequency_hours INTEGER,
        estimated_duration_hours REAL,
        priority INTEGER DEFAULT 3,
        required_skills TEXT,
        required_parts TEXT,
        safety_notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Maintenance Checklist Items table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS maintenance_checklist_items (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        step_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        required INTEGER DEFAULT 1,
        image_url TEXT,
        estimated_minutes INTEGER,
        safety_warning TEXT,
        expected_result TEXT,
        acceptance_criteria TEXT
      )
    `);

    // Maintenance Checklist Completions table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS maintenance_checklist_completions (
        id TEXT PRIMARY KEY,
        work_order_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        completed_at INTEGER,
        completed_by TEXT,
        completed_by_name TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        passed INTEGER,
        actual_value TEXT,
        notes TEXT,
        photo_urls TEXT
      )
    `);

    // Equipment Lifecycle table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS equipment_lifecycle (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        serial_number TEXT,
        installation_date INTEGER,
        warranty_expiry INTEGER,
        expected_lifespan INTEGER,
        replacement_cost REAL,
        operating_hours INTEGER DEFAULT 0,
        maintenance_count INTEGER DEFAULT 0,
        last_major_overhaul INTEGER,
        next_recommended_replacement INTEGER,
        condition TEXT NOT NULL DEFAULT 'good',
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Performance Metrics table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id TEXT PRIMARY KEY,
        equipment_id TEXT NOT NULL,
        metric_date INTEGER NOT NULL,
        efficiency REAL,
        reliability REAL,
        availability REAL,
        mtbf_hours REAL,
        mttr_hours REAL,
        total_downtime_minutes INTEGER,
        planned_downtime_minutes INTEGER,
        unplanned_downtime_minutes INTEGER,
        operating_hours REAL,
        energy_consumption REAL,
        performance_score REAL,
        notes TEXT,
        created_at INTEGER
      )
    `);

    // Maintenance Windows table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS maintenance_windows (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'low',
        status TEXT NOT NULL DEFAULT 'scheduled',
        start_time INTEGER NOT NULL,
        end_time INTEGER NOT NULL,
        actual_start_time INTEGER,
        actual_end_time INTEGER,
        affected_services TEXT,
        maintenance_tasks TEXT,
        completed_tasks TEXT,
        rollback_plan TEXT,
        created_by TEXT,
        assigned_to TEXT,
        notify_users TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Port Call table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS port_call (
        id TEXT PRIMARY KEY,
        vessel_id TEXT NOT NULL,
        port TEXT NOT NULL,
        start INTEGER NOT NULL,
        end INTEGER NOT NULL,
        status TEXT DEFAULT 'scheduled',
        created_at INTEGER
      )
    `);

    // Drydock Window table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS drydock_window (
        id TEXT PRIMARY KEY,
        vessel_id TEXT NOT NULL,
        yard TEXT,
        start INTEGER NOT NULL,
        end INTEGER NOT NULL,
        work_type TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at INTEGER
      )
    `);

    // Expenses table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        description TEXT NOT NULL,
        vendor TEXT,
        invoice_number TEXT,
        work_order_id TEXT,
        vessel_name TEXT,
        expense_date INTEGER NOT NULL,
        approval_status TEXT NOT NULL DEFAULT 'pending',
        approved_by TEXT,
        approved_at INTEGER,
        receipt TEXT,
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Labor Rates table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS labor_rates (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        skill_level TEXT NOT NULL,
        position TEXT NOT NULL,
        standard_rate REAL NOT NULL,
        overtime_rate REAL NOT NULL,
        emergency_rate REAL NOT NULL,
        contractor_rate REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        effective_date INTEGER,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // ========================================================================
    // PHASE 2: INVENTORY & PARTS MANAGEMENT TABLES (6 tables)
    // ========================================================================

    // Parts Inventory table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS parts_inventory (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        part_number TEXT NOT NULL,
        part_name TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        manufacturer TEXT,
        unit_cost REAL NOT NULL,
        quantity_on_hand INTEGER NOT NULL DEFAULT 0,
        quantity_reserved INTEGER NOT NULL DEFAULT 0,
        min_stock_level INTEGER DEFAULT 1,
        max_stock_level INTEGER DEFAULT 100,
        location TEXT,
        supplier_name TEXT,
        supplier_part_number TEXT,
        lead_time_days INTEGER DEFAULT 7,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Stock table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS stock (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        part_id TEXT NOT NULL,
        part_no TEXT NOT NULL,
        location TEXT NOT NULL DEFAULT 'MAIN',
        quantity_on_hand REAL DEFAULT 0,
        quantity_reserved REAL DEFAULT 0,
        quantity_on_order REAL DEFAULT 0,
        unit_cost REAL DEFAULT 0,
        last_count_date INTEGER,
        bin_location TEXT,
        supplier_id TEXT,
        reorder_point REAL,
        max_quantity REAL,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Inventory Movements table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS inventory_movements (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        part_id TEXT NOT NULL,
        work_order_id TEXT,
        movement_type TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        quantity_before INTEGER NOT NULL,
        quantity_after INTEGER NOT NULL,
        reserved_before INTEGER NOT NULL DEFAULT 0,
        reserved_after INTEGER NOT NULL DEFAULT 0,
        performed_by TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER
      )
    `);

    // Suppliers table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS suppliers (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        contact_info TEXT,
        lead_time_days INTEGER DEFAULT 14,
        quality_rating REAL DEFAULT 5.0,
        reliability_score REAL DEFAULT 5.0,
        cost_rating REAL DEFAULT 5.0,
        payment_terms TEXT,
        is_preferred INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        on_time_delivery_rate REAL,
        defect_rate REAL DEFAULT 0,
        average_lead_time INTEGER,
        total_order_value REAL DEFAULT 0,
        total_orders INTEGER DEFAULT 0,
        last_order_date INTEGER,
        risk_level TEXT DEFAULT 'medium',
        backup_suppliers TEXT,
        minimum_order_value REAL,
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Purchase Orders table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        supplier_id TEXT NOT NULL,
        order_number TEXT NOT NULL,
        expected_date INTEGER,
        total_amount REAL,
        currency TEXT DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'draft',
        notes TEXT,
        created_by TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Purchase Order Items table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id TEXT PRIMARY KEY,
        po_id TEXT NOT NULL,
        part_id TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total_price REAL NOT NULL,
        received_quantity REAL DEFAULT 0,
        notes TEXT,
        created_at INTEGER
      )
    `);

    // Create indexes for better performance
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_journal_entity 
      ON sync_journal(entity_type, entity_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_journal_status 
      ON sync_journal(sync_status)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_sync_outbox_processed 
      ON sync_outbox(processed)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_vessels_org 
      ON vessels(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_equipment_org 
      ON equipment(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_equipment_vessel 
      ON equipment(vessel_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_devices_org 
      ON devices(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_devices_equipment 
      ON devices(equipment_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_telemetry_org 
      ON equipment_telemetry(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_telemetry_equipment_ts 
      ON equipment_telemetry(equipment_id, ts)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_telemetry_sensor_ts 
      ON equipment_telemetry(sensor_type, ts)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_telemetry_status 
      ON equipment_telemetry(status)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_org 
      ON downtime_events(org_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_work_order 
      ON downtime_events(work_order_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_equipment 
      ON downtime_events(equipment_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_vessel 
      ON downtime_events(vessel_id)
    `);

    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_downtime_time 
      ON downtime_events(start_time)
    `);

    // Indexes for Phase 1 tables (Work Orders & Maintenance)
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wo_org ON work_orders(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wo_equipment_status ON work_orders(equipment_id, status)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wo_vessel ON work_orders(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wo_schedule ON work_orders(schedule_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wo_status ON work_orders(status)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_woc_org ON work_order_completions(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_woc_completed_at ON work_order_completions(completed_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_woc_equipment ON work_order_completions(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_woc_vessel ON work_order_completions(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_woc_work_order ON work_order_completions(work_order_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wop_work_order ON work_order_parts(work_order_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wop_part ON work_order_parts(part_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_ms_equipment ON maintenance_schedules(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_ms_vessel ON maintenance_schedules(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_ms_scheduled_date ON maintenance_schedules(scheduled_date)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_ms_status ON maintenance_schedules(status)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mr_schedule ON maintenance_records(schedule_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mr_equipment ON maintenance_records(equipment_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mc_equipment ON maintenance_costs(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mc_work_order ON maintenance_costs(work_order_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mt_type ON maintenance_templates(equipment_type)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mt_active ON maintenance_templates(is_active)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mci_template ON maintenance_checklist_items(template_id, step_number)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mcc_work_order ON maintenance_checklist_completions(work_order_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mcc_item ON maintenance_checklist_completions(item_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_el_equipment ON equipment_lifecycle(equipment_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pm_equipment ON performance_metrics(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pm_date ON performance_metrics(metric_date)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mw_org ON maintenance_windows(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mw_status ON maintenance_windows(status)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pc_vessel ON port_call(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pc_start ON port_call(start)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_dw_vessel ON drydock_window(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_dw_start ON drydock_window(start)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_exp_org ON expenses(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_exp_work_order ON expenses(work_order_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_exp_date ON expenses(expense_date)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_lr_org ON labor_rates(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_lr_active ON labor_rates(is_active)`);

    // Indexes for Phase 2 tables (Inventory & Parts)
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pi_org ON parts_inventory(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pi_part_number ON parts_inventory(part_number)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pi_category ON parts_inventory(category)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_stock_org_part_location ON stock(org_id, part_id, location)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_stock_part_no ON stock(part_no)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_stock_supplier ON stock(supplier_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_im_part ON inventory_movements(part_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_im_work_order ON inventory_movements(work_order_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_im_type ON inventory_movements(movement_type)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_suppliers_org_code ON suppliers(org_id, code)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_po_supplier ON purchase_orders(supplier_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_po_status ON purchase_orders(status)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_po_order_number ON purchase_orders(order_number)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_poi_po ON purchase_order_items(po_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_poi_part ON purchase_order_items(part_id)`);

    console.log('[SQLite Init] Database initialized successfully with 31 tables at:', dbPath);
    return true;

  } catch (error) {
    console.error('[SQLite Init] Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Check if SQLite database is initialized
 */
export async function isSqliteDatabaseInitialized(): Promise<boolean> {
  const dbPath = path.join(DATA_DIR, "vessel-local.db");
  
  if (!fs.existsSync(dbPath)) {
    return false;
  }

  try {
    const client = createClient({
      url: `file:${dbPath}`,
    });

    const db = drizzle(client);

    // Check if core tables exist (9 base + 16 Phase 1 + 6 Phase 2 = 31 total)
    const result = await db.get<{ count: number }>(sql`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' AND name IN (
        'organizations', 'users', 'sync_journal', 'sync_outbox',
        'vessels', 'equipment', 'devices', 'equipment_telemetry', 'downtime_events',
        'work_orders', 'work_order_completions', 'work_order_parts',
        'maintenance_schedules', 'maintenance_records', 'maintenance_costs',
        'maintenance_templates', 'maintenance_checklist_items', 'maintenance_checklist_completions',
        'equipment_lifecycle', 'performance_metrics', 'maintenance_windows',
        'port_call', 'drydock_window', 'expenses', 'labor_rates',
        'parts_inventory', 'stock', 'inventory_movements', 'suppliers', 'purchase_orders', 'purchase_order_items'
      )
    `);

    return result?.count === 31;
  } catch {
    return false;
  }
}
