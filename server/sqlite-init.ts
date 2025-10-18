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

    // ========================================================================
    // PHASE 3: CREW MANAGEMENT TABLES (9 tables)
    // ========================================================================

    // Crew table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS crew (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        rank TEXT,
        vessel_id TEXT,
        max_hours_7d REAL DEFAULT 72,
        min_rest_h REAL DEFAULT 10,
        active INTEGER DEFAULT 1,
        on_duty INTEGER DEFAULT 0,
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Skills table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS skills (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        max_level INTEGER DEFAULT 5,
        active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Crew Skills table (composite PK)
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS crew_skill (
        crew_id TEXT NOT NULL,
        skill TEXT NOT NULL,
        level INTEGER DEFAULT 1,
        PRIMARY KEY (crew_id, skill)
      )
    `);

    // Crew Leave table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS crew_leave (
        id TEXT PRIMARY KEY,
        crew_id TEXT NOT NULL,
        start INTEGER NOT NULL,
        end INTEGER NOT NULL,
        reason TEXT,
        created_at INTEGER
      )
    `);

    // Shift Template table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS shift_template (
        id TEXT PRIMARY KEY,
        vessel_id TEXT,
        equipment_id TEXT,
        role TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        duration_h REAL NOT NULL,
        required_skills TEXT,
        rank_min TEXT,
        cert_required TEXT,
        created_at INTEGER
      )
    `);

    // Crew Assignment table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS crew_assignment (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        shift_id TEXT,
        crew_id TEXT NOT NULL,
        vessel_id TEXT,
        start INTEGER NOT NULL,
        end INTEGER NOT NULL,
        role TEXT,
        status TEXT DEFAULT 'scheduled',
        created_at INTEGER,
        version INTEGER DEFAULT 1,
        last_modified_by TEXT,
        last_modified_device TEXT
      )
    `);

    // Crew Certifications table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS crew_cert (
        id TEXT PRIMARY KEY,
        crew_id TEXT NOT NULL,
        cert TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        issued_by TEXT,
        created_at INTEGER
      )
    `);

    // Crew Rest Sheet table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS crew_rest_sheet (
        id TEXT PRIMARY KEY,
        crew_id TEXT NOT NULL,
        month TEXT NOT NULL,
        vessel_id TEXT,
        signed_by TEXT,
        signed_at INTEGER,
        created_at INTEGER
      )
    `);

    // Crew Rest Day table (composite PK with 24 hourly columns)
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS crew_rest_day (
        sheet_id TEXT NOT NULL,
        date TEXT NOT NULL,
        h0 INTEGER DEFAULT 0, h1 INTEGER DEFAULT 0, h2 INTEGER DEFAULT 0, h3 INTEGER DEFAULT 0,
        h4 INTEGER DEFAULT 0, h5 INTEGER DEFAULT 0, h6 INTEGER DEFAULT 0, h7 INTEGER DEFAULT 0,
        h8 INTEGER DEFAULT 0, h9 INTEGER DEFAULT 0, h10 INTEGER DEFAULT 0, h11 INTEGER DEFAULT 0,
        h12 INTEGER DEFAULT 0, h13 INTEGER DEFAULT 0, h14 INTEGER DEFAULT 0, h15 INTEGER DEFAULT 0,
        h16 INTEGER DEFAULT 0, h17 INTEGER DEFAULT 0, h18 INTEGER DEFAULT 0, h19 INTEGER DEFAULT 0,
        h20 INTEGER DEFAULT 0, h21 INTEGER DEFAULT 0, h22 INTEGER DEFAULT 0, h23 INTEGER DEFAULT 0,
        PRIMARY KEY (sheet_id, date)
      )
    `);

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

    // Indexes for Phase 3 tables (Crew Management)
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_org ON crew(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_vessel ON crew(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_active ON crew(active)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_skills_org ON skills(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_skill_crew ON crew_skill(crew_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_leave_crew ON crew_leave(crew_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_leave_dates ON crew_leave(start, end)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_shift_template_vessel ON shift_template(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_shift_template_role ON shift_template(role)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_assignment_crew_date ON crew_assignment(crew_id, date)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_assignment_vessel ON crew_assignment(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_assignment_shift ON crew_assignment(shift_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_assignment_status ON crew_assignment(status)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_cert_crew ON crew_cert(crew_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_cert_expiry ON crew_cert(expires_at)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_rest_sheet_crew_month ON crew_rest_sheet(crew_id, month)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_rest_sheet_vessel ON crew_rest_sheet(vessel_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_crew_rest_day_sheet ON crew_rest_day(sheet_id)`);

    // ============================================================================
    // PHASE 4A: CORE ML & PREDICTIVE MAINTENANCE TABLES (8 tables)
    // ============================================================================

    // Create ml_models table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS ml_models (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        version TEXT NOT NULL,
        model_type TEXT NOT NULL,
        target_equipment_type TEXT,
        training_data_features TEXT,
        hyperparameters TEXT,
        performance TEXT,
        model_artifact_path TEXT,
        status TEXT DEFAULT 'training',
        deployed_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create failure_predictions table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS failure_predictions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        prediction_timestamp INTEGER,
        failure_probability REAL NOT NULL,
        predicted_failure_date INTEGER,
        remaining_useful_life INTEGER,
        confidence_interval TEXT,
        failure_mode TEXT,
        risk_level TEXT NOT NULL,
        model_id TEXT,
        input_features TEXT,
        maintenance_recommendations TEXT,
        cost_impact TEXT,
        resolved_by_work_order_id TEXT,
        actual_failure_date INTEGER,
        actual_failure_mode TEXT,
        prediction_accuracy REAL,
        time_to_failure_error INTEGER,
        outcome_label TEXT,
        outcome_verified_at INTEGER,
        outcome_verified_by TEXT,
        metadata TEXT
      )
    `);

    // Create anomaly_detections table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS anomaly_detections (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        detection_timestamp INTEGER,
        anomaly_score REAL NOT NULL,
        anomaly_type TEXT,
        severity TEXT NOT NULL,
        detected_value REAL,
        expected_value REAL,
        deviation REAL,
        model_id TEXT,
        contributing_factors TEXT,
        recommended_actions TEXT,
        acknowledged_by TEXT,
        acknowledged_at INTEGER,
        resolved_by_work_order_id TEXT,
        actual_failure_occurred INTEGER,
        outcome_label TEXT,
        outcome_verified_at INTEGER,
        outcome_verified_by TEXT,
        metadata TEXT
      )
    `);

    // Create prediction_feedback table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS prediction_feedback (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        prediction_id TEXT NOT NULL,
        prediction_type TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        feedback_type TEXT NOT NULL,
        rating INTEGER,
        is_accurate INTEGER,
        corrected_value TEXT,
        comments TEXT,
        actual_failure_date INTEGER,
        actual_failure_mode TEXT,
        flag_reason TEXT,
        use_for_retraining INTEGER DEFAULT 1,
        feedback_status TEXT DEFAULT 'pending',
        reviewed_by TEXT,
        reviewed_at INTEGER,
        review_notes TEXT,
        created_at INTEGER
      )
    `);

    // Create component_degradation table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS component_degradation (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        component_type TEXT NOT NULL,
        measurement_timestamp INTEGER,
        degradation_metric REAL NOT NULL,
        degradation_rate REAL,
        vibration_level REAL,
        temperature REAL,
        oil_condition REAL,
        acoustic_signature REAL,
        wear_particle_count INTEGER,
        operating_hours INTEGER,
        cycle_count INTEGER,
        load_factor REAL,
        environment_conditions TEXT,
        trend_analysis TEXT,
        predicted_failure_date INTEGER,
        confidence_score REAL,
        metadata TEXT
      )
    `);

    // Create failure_history table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS failure_history (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        failure_timestamp INTEGER NOT NULL,
        failure_mode TEXT NOT NULL,
        failure_severity TEXT NOT NULL,
        root_cause TEXT,
        component_affected TEXT,
        age_at_failure INTEGER,
        cycles_at_failure INTEGER,
        prior_warnings TEXT,
        degradation_history TEXT,
        environmental_factors TEXT,
        maintenance_history TEXT,
        repair_cost REAL,
        downtime_hours REAL,
        replacement_parts_cost REAL,
        total_cost REAL,
        was_preventable INTEGER,
        preventability_analysis TEXT,
        lessons_learned TEXT,
        work_order_id TEXT,
        verified_by TEXT,
        verified_at INTEGER,
        metadata TEXT,
        created_at INTEGER
      )
    `);

    // Create dtc_definitions table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS dtc_definitions (
        spn INTEGER NOT NULL,
        fmi INTEGER NOT NULL,
        manufacturer TEXT NOT NULL DEFAULT '',
        spn_name TEXT NOT NULL,
        fmi_name TEXT NOT NULL,
        description TEXT NOT NULL,
        severity INTEGER NOT NULL DEFAULT 3,
        created_at INTEGER,
        updated_at INTEGER,
        PRIMARY KEY (spn, fmi, manufacturer)
      )
    `);

    // Create dtc_faults table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS dtc_faults (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        spn INTEGER NOT NULL,
        fmi INTEGER NOT NULL,
        oc INTEGER,
        sa INTEGER,
        pgn INTEGER,
        lamp TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        created_at INTEGER,
        version INTEGER DEFAULT 1,
        last_modified_by TEXT,
        last_modified_device TEXT
      )
    `);

    // Create indexes for Phase 4A tables
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_ml_models_name_version ON ml_models(name, version)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_ml_models_org ON ml_models(org_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_failure_equipment_risk ON failure_predictions(equipment_id, risk_level)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_failure_prediction_time ON failure_predictions(prediction_timestamp)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_anomaly_equipment_time ON anomaly_detections(equipment_id, detection_timestamp)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_anomaly_severity ON anomaly_detections(severity)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_feedback_prediction ON prediction_feedback(prediction_id, prediction_type)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_feedback_equipment ON prediction_feedback(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_feedback_user ON prediction_feedback(user_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_feedback_status ON prediction_feedback(feedback_status)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_component_deg_equipment_time ON component_degradation(equipment_id, measurement_timestamp)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_component_deg_component ON component_degradation(component_type)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_failure_history_equipment ON failure_history(equipment_id, failure_timestamp)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_failure_history_mode ON failure_history(failure_mode)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_failure_history_severity ON failure_history(failure_severity)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_dtc_definitions_spn ON dtc_definitions(spn)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_dtc_definitions_severity ON dtc_definitions(severity)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_dtc_faults_org_eq_active ON dtc_faults(org_id, equipment_id, active)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_dtc_faults_device_active ON dtc_faults(device_id, active)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_dtc_faults_last_seen ON dtc_faults(org_id, last_seen)`);

    //================================================================
    // Phase 4B: ML Analytics & Training Support (8 tables)
    //================================================================

    // Create model_performance_validations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS model_performance_validations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        prediction_id INTEGER,
        prediction_type TEXT NOT NULL,
        prediction_timestamp INTEGER NOT NULL,
        predicted_outcome TEXT NOT NULL,
        actual_outcome TEXT,
        validated_at INTEGER,
        validated_by TEXT,
        accuracy_score REAL,
        time_to_failure_error INTEGER,
        classification_label TEXT,
        model_version TEXT,
        performance_metrics TEXT,
        created_at INTEGER
      )
    `);

    // Create retraining_triggers table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS retraining_triggers (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        equipment_type TEXT,
        trigger_type TEXT NOT NULL,
        trigger_reason TEXT NOT NULL,
        trigger_metrics TEXT NOT NULL,
        current_performance TEXT,
        performance_threshold REAL,
        new_data_points INTEGER,
        negative_feedback_count INTEGER,
        last_training_date INTEGER,
        days_since_training INTEGER,
        priority TEXT NOT NULL DEFAULT 'medium',
        status TEXT NOT NULL DEFAULT 'pending',
        scheduled_for INTEGER,
        processing_started_at INTEGER,
        processing_completed_at INTEGER,
        new_model_id TEXT,
        retraining_duration INTEGER,
        retraining_result TEXT,
        error_message TEXT,
        triggered_by TEXT,
        reviewed_by TEXT,
        review_notes TEXT,
        created_at INTEGER
      )
    `);

    // Create sensor_configurations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sensor_configurations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        sample_rate_hz REAL,
        gain REAL DEFAULT 1.0,
        offset REAL DEFAULT 0.0,
        deadband REAL DEFAULT 0.0,
        min_valid REAL,
        max_valid REAL,
        warn_lo REAL,
        warn_hi REAL,
        crit_lo REAL,
        crit_hi REAL,
        hysteresis REAL DEFAULT 0.0,
        ema_alpha REAL,
        target_unit TEXT,
        notes TEXT,
        expected_interval_ms INTEGER,
        grace_multiplier REAL DEFAULT 2.0,
        version INTEGER DEFAULT 1,
        last_modified_by TEXT,
        last_modified_device TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create sensor_states table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sensor_states (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        last_value REAL,
        ema REAL,
        last_ts INTEGER,
        updated_at INTEGER
      )
    `);

    // Create threshold_optimizations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS threshold_optimizations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        optimization_timestamp INTEGER,
        current_thresholds TEXT,
        optimized_thresholds TEXT,
        improvement_metrics TEXT,
        optimization_method TEXT,
        validation_results TEXT,
        applied_at INTEGER,
        status TEXT DEFAULT 'pending',
        performance TEXT,
        metadata TEXT
      )
    `);

    // Create vibration_features table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS vibration_features (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        vessel_id TEXT,
        timestamp INTEGER,
        rpm REAL,
        rms REAL,
        crest_factor REAL,
        kurtosis REAL,
        peak_frequency REAL,
        band_1_power REAL,
        band_2_power REAL,
        band_3_power REAL,
        band_4_power REAL,
        raw_data_length INTEGER,
        sample_rate REAL,
        analysis_metadata TEXT,
        created_at INTEGER
      )
    `);

    // Create model_registry table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS model_registry (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        component_class TEXT NOT NULL,
        model_type TEXT NOT NULL,
        version TEXT NOT NULL,
        algorithm TEXT,
        window_days INTEGER,
        features TEXT,
        metrics TEXT,
        is_active INTEGER DEFAULT 1,
        deployed_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create sensor_types table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sensor_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        default_unit TEXT NOT NULL,
        units TEXT NOT NULL,
        description TEXT,
        min_value REAL,
        max_value REAL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER
      )
    `);

    // Create indexes for Phase 4B tables
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_perf_val_model ON model_performance_validations(model_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_perf_val_equipment ON model_performance_validations(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_perf_val_prediction_time ON model_performance_validations(prediction_timestamp)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_perf_val_classification ON model_performance_validations(classification_label)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_perf_val_model_equipment ON model_performance_validations(model_id, equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_perf_val_prediction_lookup ON model_performance_validations(prediction_type, prediction_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_retrain_model ON retraining_triggers(model_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_retrain_status ON retraining_triggers(status)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_retrain_priority ON retraining_triggers(priority)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_retrain_scheduled ON retraining_triggers(scheduled_for)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_retrain_trigger_type ON retraining_triggers(trigger_type)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sensor_config_equipment_sensor ON sensor_configurations(equipment_id, sensor_type, org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sensor_config_org ON sensor_configurations(org_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sensor_state_equipment_sensor ON sensor_states(equipment_id, sensor_type, org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sensor_state_org ON sensor_states(org_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_threshold_opt_equipment_time ON threshold_optimizations(equipment_id, optimization_timestamp)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_threshold_opt_org ON threshold_optimizations(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_threshold_opt_status ON threshold_optimizations(status)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_vibration_equipment_time ON vibration_features(equipment_id, timestamp)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_vibration_vessel ON vibration_features(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_vibration_org ON vibration_features(org_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_model_registry_component ON model_registry(component_class, model_type)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_model_registry_active ON model_registry(is_active, deployed_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_model_registry_org ON model_registry(org_id)`);

    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sensor_types_category ON sensor_types(category)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sensor_types_active ON sensor_types(is_active)`);

    // ==================== PHASE 5: ALERT & NOTIFICATION SYSTEM ====================

    // Alert Configurations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS alert_configurations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        warning_threshold REAL,
        critical_threshold REAL,
        enabled INTEGER DEFAULT 1,
        notify_email INTEGER DEFAULT 0,
        notify_in_app INTEGER DEFAULT 1,
        version INTEGER DEFAULT 1,
        last_modified_by TEXT,
        last_modified_device TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Alert Notifications table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS alert_notifications (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        alert_type TEXT NOT NULL,
        message TEXT NOT NULL,
        value REAL NOT NULL,
        threshold REAL NOT NULL,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_at INTEGER,
        acknowledged_by TEXT,
        created_at INTEGER
      )
    `);

    // Alert Suppressions table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS alert_suppressions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT,
        sensor_type TEXT,
        suppress_until INTEGER NOT NULL,
        reason TEXT,
        created_by TEXT NOT NULL,
        created_at INTEGER
      )
    `);

    // Alert Comments table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS alert_comments (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        alert_id TEXT NOT NULL,
        comment TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER
      )
    `);

    // Operating Condition Alerts table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS operating_condition_alerts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        condition_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        detected_at INTEGER NOT NULL,
        resolved_at INTEGER,
        created_at INTEGER
      )
    `);

    // PDM Alerts table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS pdm_alerts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        prediction_id TEXT,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        acknowledged INTEGER DEFAULT 0,
        acknowledged_by TEXT,
        acknowledged_at INTEGER,
        created_at INTEGER
      )
    `);


    // ==================== PARTS & INVENTORY ====================

    // Parts Catalog table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS parts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        part_no TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        unit_of_measure TEXT NOT NULL DEFAULT 'ea',
        min_stock_qty REAL DEFAULT 0,
        max_stock_qty REAL DEFAULT 0,
        standard_cost REAL DEFAULT 0,
        lead_time_days INTEGER DEFAULT 7,
        criticality TEXT DEFAULT 'medium',
        specifications TEXT,
        compatible_equipment TEXT,
        primary_supplier_id TEXT,
        alternate_supplier_ids TEXT,
        risk_level TEXT DEFAULT 'medium',
        last_order_date INTEGER,
        average_lead_time INTEGER,
        demand_variability REAL,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Inventory Parts table (simplified)
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS inventory_parts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        part_number TEXT NOT NULL,
        description TEXT NOT NULL,
        current_stock INTEGER NOT NULL DEFAULT 0,
        min_stock_level INTEGER NOT NULL,
        max_stock_level INTEGER NOT NULL,
        lead_time_days INTEGER NOT NULL,
        unit_cost REAL,
        supplier TEXT,
        last_usage_30d INTEGER DEFAULT 0,
        risk_level TEXT NOT NULL DEFAULT 'low',
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Part Substitutions table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS part_substitutions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        original_part_id TEXT NOT NULL,
        substitute_part_id TEXT NOT NULL,
        substitution_type TEXT NOT NULL,
        notes TEXT,
        created_at INTEGER
      )
    `);

    // Part Failure History table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS part_failure_history (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        part_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        failure_date INTEGER NOT NULL,
        failure_mode TEXT,
        hours_in_service INTEGER,
        replacement_cost REAL,
        downtime_hours REAL,
        notes TEXT,
        created_at INTEGER
      )
    `);

    // Reservations table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS reservations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        part_id TEXT NOT NULL,
        work_order_id TEXT,
        quantity INTEGER NOT NULL,
        reserved_by TEXT NOT NULL,
        reserved_at INTEGER NOT NULL,
        expires_at INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        created_at INTEGER
      )
    `);

    // Storage Config table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS storage_config (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        location_name TEXT NOT NULL,
        location_type TEXT NOT NULL,
        vessel_id TEXT,
        capacity REAL,
        current_utilization REAL DEFAULT 0,
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // ==================== WORK ORDER EXTENSIONS ====================

    // Work Order Checklists table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS work_order_checklists (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        work_order_id TEXT NOT NULL,
        template_name TEXT NOT NULL,
        checklist_items TEXT NOT NULL,
        completed_items TEXT NOT NULL DEFAULT '[]',
        completion_rate REAL DEFAULT 0,
        completed_by TEXT,
        completed_at INTEGER,
        created_at INTEGER
      )
    `);

    // Work Order Worklogs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS work_order_worklogs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        work_order_id TEXT NOT NULL,
        technician_name TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_minutes INTEGER,
        description TEXT NOT NULL,
        labor_type TEXT NOT NULL DEFAULT 'standard',
        labor_cost_per_hour REAL DEFAULT 75.0,
        total_labor_cost REAL,
        status TEXT NOT NULL DEFAULT 'in_progress',
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // ==================== LLM & REPORTS ====================

    // LLM Budget Configs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS llm_budget_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL UNIQUE,
        provider TEXT,
        daily_limit REAL,
        monthly_limit REAL,
        alert_threshold REAL DEFAULT 0.8,
        current_daily_spend REAL DEFAULT 0,
        current_monthly_spend REAL DEFAULT 0,
        last_reset_date INTEGER,
        is_enabled INTEGER DEFAULT 1,
        notify_email TEXT,
        block_when_exceeded INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // LLM Cost Tracking table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS llm_cost_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        request_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        request_type TEXT NOT NULL,
        report_type TEXT,
        audience TEXT,
        vessel_id TEXT,
        equipment_id TEXT,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        estimated_cost REAL NOT NULL,
        actual_cost REAL,
        latency_ms INTEGER,
        success INTEGER NOT NULL DEFAULT 1,
        error_message TEXT,
        fallback_used INTEGER DEFAULT 0,
        fallback_model TEXT,
        user_id TEXT,
        metadata TEXT,
        created_at INTEGER
      )
    `);

    // Insight Reports table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS insight_reports (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        report_type TEXT NOT NULL,
        vessel_id TEXT,
        equipment_id TEXT,
        content TEXT NOT NULL,
        audience TEXT NOT NULL,
        generated_at INTEGER NOT NULL,
        valid_until INTEGER,
        metadata TEXT,
        created_at INTEGER
      )
    `);

    // Insight Snapshots table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS insight_snapshots (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        snapshot_type TEXT NOT NULL,
        vessel_id TEXT,
        snapshot_data TEXT NOT NULL,
        captured_at INTEGER NOT NULL,
        created_at INTEGER
      )
    `);

    // Visualization Assets table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS visualization_assets (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        vessel_id TEXT,
        equipment_id TEXT,
        asset_data TEXT NOT NULL,
        generated_at INTEGER NOT NULL,
        expires_at INTEGER,
        created_at INTEGER
      )
    `);

    // Cost Savings table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS cost_savings (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        vessel_id TEXT,
        equipment_id TEXT NOT NULL,
        savings_type TEXT NOT NULL,
        prediction_id TEXT,
        work_order_id TEXT,
        estimated_savings REAL NOT NULL,
        actual_savings REAL,
        calculation_method TEXT NOT NULL,
        baseline TEXT,
        actual TEXT,
        verified_at INTEGER,
        notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);


    // ==================== SYSTEM SETTINGS & ADMIN ====================

    // System Settings table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY DEFAULT 'system',
        hmac_required INTEGER DEFAULT 0,
        max_payload_bytes INTEGER DEFAULT 2097152,
        strict_units INTEGER DEFAULT 0,
        llm_enabled INTEGER DEFAULT 1,
        llm_model TEXT DEFAULT 'gpt-4o-mini',
        openai_api_key TEXT,
        ai_insights_throttle_minutes INTEGER DEFAULT 2,
        timestamp_tolerance_minutes INTEGER DEFAULT 5
      )
    `);

    // Admin System Settings table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS admin_system_settings (
        id TEXT PRIMARY KEY,
        setting_key TEXT NOT NULL UNIQUE,
        setting_value TEXT,
        setting_type TEXT NOT NULL,
        description TEXT,
        updated_by TEXT,
        updated_at INTEGER,
        created_at INTEGER
      )
    `);

    // Admin Audit Events table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS admin_audit_events (
        id TEXT PRIMARY KEY,
        org_id TEXT,
        admin_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        action_details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER
      )
    `);

    // Integration Configs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS integration_configs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        integration_type TEXT NOT NULL,
        config_name TEXT NOT NULL,
        config_data TEXT NOT NULL,
        is_enabled INTEGER DEFAULT 1,
        last_sync_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Error Logs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS error_logs (
        id TEXT PRIMARY KEY,
        org_id TEXT,
        error_type TEXT NOT NULL,
        error_message TEXT NOT NULL,
        stack_trace TEXT,
        context TEXT,
        severity TEXT NOT NULL,
        resolved INTEGER DEFAULT 0,
        resolved_at INTEGER,
        timestamp INTEGER NOT NULL,
        created_at INTEGER
      )
    `);

    // ==================== ESSENTIAL TELEMETRY ====================

    // Raw Telemetry table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS raw_telemetry (
        id TEXT NOT NULL,
        org_id TEXT NOT NULL,
        ts INTEGER NOT NULL,
        equipment_id TEXT NOT NULL,
        device_id TEXT,
        payload TEXT NOT NULL,
        created_at INTEGER
      )
    `);

    // Metrics History table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS metrics_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        recorded_at INTEGER NOT NULL,
        active_devices INTEGER NOT NULL DEFAULT 0,
        fleet_health REAL NOT NULL DEFAULT 0,
        open_work_orders INTEGER NOT NULL DEFAULT 0,
        risk_alerts INTEGER NOT NULL DEFAULT 0,
        total_equipment INTEGER NOT NULL DEFAULT 0,
        healthy_equipment INTEGER NOT NULL DEFAULT 0,
        warning_equipment INTEGER NOT NULL DEFAULT 0,
        critical_equipment INTEGER NOT NULL DEFAULT 0
      )
    `);

    // PDM Score Logs table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS pdm_score_logs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        score REAL NOT NULL,
        trend TEXT,
        factors TEXT,
        created_at INTEGER
      )
    `);

    // Edge Heartbeats table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS edge_heartbeats (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        vessel_id TEXT,
        timestamp INTEGER NOT NULL,
        status TEXT NOT NULL,
        uptime_seconds INTEGER,
        cpu_usage REAL,
        memory_usage REAL,
        disk_usage REAL,
        metadata TEXT,
        created_at INTEGER
      )
    `);

    // ==================== KEY CONDITION MONITORING ====================

    // Condition Monitoring table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS condition_monitoring (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        monitoring_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        readings TEXT NOT NULL,
        status TEXT NOT NULL,
        anomalies_detected TEXT,
        recommendations TEXT,
        created_at INTEGER
      )
    `);

    // Oil Analysis table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS oil_analysis (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sample_date INTEGER NOT NULL,
        hours_on_oil INTEGER,
        viscosity REAL,
        water_content REAL,
        particle_count INTEGER,
        acidity REAL,
        oxidation REAL,
        metal_content TEXT,
        condition TEXT NOT NULL,
        recommendations TEXT,
        lab_report_url TEXT,
        created_at INTEGER
      )
    `);

    // Vibration Analysis table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS vibration_analysis (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        overall_velocity REAL,
        overall_acceleration REAL,
        frequency_spectrum TEXT,
        bearing_condition TEXT,
        imbalance_detected INTEGER,
        misalignment_detected INTEGER,
        status TEXT NOT NULL,
        created_at INTEGER
      )
    `);

    // Sensor Mapping table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sensor_mapping (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_identifier TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        measurement_point TEXT,
        mapping_config TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Sensor Thresholds table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sensor_thresholds (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        warning_low REAL,
        warning_high REAL,
        critical_low REAL,
        critical_high REAL,
        unit TEXT NOT NULL,
        auto_adjust INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // ==================== KEY ML/ANALYTICS ====================

    // Digital Twins table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS digital_twins (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL UNIQUE,
        twin_model TEXT NOT NULL,
        current_state TEXT NOT NULL,
        last_sync_at INTEGER,
        accuracy REAL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Data Quality Metrics table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS data_quality_metrics (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        data_source TEXT NOT NULL,
        metric_type TEXT NOT NULL,
        metric_value REAL NOT NULL,
        threshold REAL,
        status TEXT NOT NULL,
        measured_at INTEGER NOT NULL,
        details TEXT,
        created_at INTEGER
      )
    `);

    // ==================== DEVICE MANAGEMENT ====================

    // Device Registry table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS device_registry (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        device_type TEXT NOT NULL,
        serial_number TEXT,
        manufacturer TEXT,
        model TEXT,
        firmware_version TEXT,
        vessel_id TEXT,
        equipment_id TEXT,
        last_seen_at INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // MQTT Devices table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS mqtt_devices (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        device_id TEXT NOT NULL UNIQUE,
        mqtt_client_id TEXT NOT NULL UNIQUE,
        topic_prefix TEXT NOT NULL,
        credentials TEXT,
        is_active INTEGER DEFAULT 1,
        last_connected_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // ==================== UTILITY TABLES ====================

    // Request Idempotency table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS request_idempotency (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        request_id TEXT NOT NULL UNIQUE,
        endpoint TEXT NOT NULL,
        response_code INTEGER,
        response_body TEXT,
        expires_at INTEGER NOT NULL,
        created_at INTEGER
      )
    `);

    // Idempotency Log table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS idempotency_log (
        id TEXT PRIMARY KEY,
        request_key TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        response TEXT,
        created_at INTEGER,
        expires_at INTEGER
      )
    `);

    // DB Schema Version table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS db_schema_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL UNIQUE,
        description TEXT,
        applied_at INTEGER NOT NULL
      )
    `);

    // Sheet Lock table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sheet_lock (
        id TEXT PRIMARY KEY,
        sheet_id TEXT NOT NULL UNIQUE,
        locked_by TEXT NOT NULL,
        locked_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      )
    `);

    // Sheet Version table
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sheet_version (
        id TEXT PRIMARY KEY,
        sheet_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        data TEXT NOT NULL,
        created_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    // PHASE 7: Final 31 tables for 100% completion
    
    // Beast Mode Config
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS beast_mode_config (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        feature_name TEXT NOT NULL,
        enabled INTEGER DEFAULT 0,
        configuration TEXT,
        last_modified_by TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Calibration Cache
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS calibration_cache (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_type TEXT NOT NULL,
        manufacturer TEXT NOT NULL,
        model TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        calibration_source TEXT NOT NULL,
        coefficients TEXT NOT NULL,
        valid_from INTEGER,
        valid_until INTEGER,
        fetched_at INTEGER,
        applied_to_configs INTEGER DEFAULT 0,
        notes TEXT
      )
    `);

    // Compliance Audit Log
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS compliance_audit_log (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        performed_by TEXT NOT NULL,
        timestamp INTEGER,
        details TEXT,
        compliance_standard TEXT,
        regulatory_reference TEXT
      )
    `);

    // Compliance Bundles
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS compliance_bundles (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        bundle_id TEXT NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        generated_at INTEGER,
        sha256_hash TEXT NOT NULL,
        file_path TEXT,
        file_format TEXT DEFAULT 'html',
        payload_data TEXT,
        compliance_standards TEXT,
        validity_period_months INTEGER,
        status TEXT DEFAULT 'active',
        created_at INTEGER
      )
    `);

    // Content Sources
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS content_sources (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        source_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        entity_name TEXT,
        last_modified INTEGER,
        data_quality REAL DEFAULT 1.0,
        access_level TEXT DEFAULT 'public',
        tags TEXT,
        related_sources TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Discovered Signals
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS discovered_signals (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        vessel_id TEXT NOT NULL,
        source_id TEXT NOT NULL,
        signal_id TEXT NOT NULL,
        unit TEXT,
        first_seen INTEGER,
        last_seen INTEGER,
        sample_count INTEGER DEFAULT 0,
        min_value REAL,
        max_value REAL,
        avg_value REAL,
        is_mapped INTEGER DEFAULT 0,
        suggested_sensor_type TEXT
      )
    `);

    // Edge Diagnostic Logs
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS edge_diagnostic_logs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        device_id TEXT,
        equipment_id TEXT,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        status TEXT NOT NULL DEFAULT 'pending',
        message TEXT NOT NULL,
        details TEXT,
        auto_fix_applied INTEGER DEFAULT 0,
        auto_fix_action TEXT,
        created_at INTEGER,
        resolved_at INTEGER
      )
    `);

    // Industry Benchmarks
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS industry_benchmarks (
        id TEXT PRIMARY KEY,
        equipment_type TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        vessel_type TEXT,
        average_mtbf INTEGER,
        average_mttr INTEGER,
        typical_failure_modes TEXT,
        recommended_maintenance_interval INTEGER,
        average_lifespan INTEGER,
        industry_standard TEXT,
        data_source TEXT,
        sample_size INTEGER,
        last_updated INTEGER,
        created_at INTEGER
      )
    `);

    // J1939 Configurations
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS j1939_configurations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        device_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        can_interface TEXT DEFAULT 'can0',
        baud_rate INTEGER DEFAULT 250000,
        mappings TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Knowledge Base Items
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS knowledge_base_items (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        content_type TEXT NOT NULL,
        source_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        metadata TEXT DEFAULT '{}',
        keywords TEXT,
        relevance_score REAL DEFAULT 1.0,
        is_active INTEGER DEFAULT 1,
        last_updated INTEGER,
        created_at INTEGER
      )
    `);

    // Oil Change Records
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS oil_change_records (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        change_date INTEGER NOT NULL,
        service_hours REAL NOT NULL,
        oil_type TEXT NOT NULL,
        oil_grade TEXT NOT NULL,
        quantity_liters REAL NOT NULL,
        oil_manufacturer TEXT,
        batch_number TEXT,
        change_reason TEXT NOT NULL,
        filter_changed INTEGER DEFAULT 1,
        filter_type TEXT,
        labor_hours REAL,
        total_cost REAL,
        pre_change_condition TEXT,
        drained_oil_analysis_id TEXT,
        technician_id TEXT,
        work_order_id TEXT,
        service_notes TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Operating Parameters
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS operating_parameters (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_type TEXT NOT NULL,
        manufacturer TEXT,
        model TEXT,
        parameter_name TEXT NOT NULL,
        parameter_type TEXT NOT NULL,
        unit TEXT NOT NULL,
        optimal_min REAL,
        optimal_max REAL,
        critical_min REAL,
        critical_max REAL,
        life_impact_description TEXT,
        recommended_action TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER,
        version INTEGER DEFAULT 1
      )
    `);

    // Ops DB Staged
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS ops_db_staged (
        id INTEGER PRIMARY KEY DEFAULT 1,
        url TEXT,
        created_at INTEGER
      )
    `);

    // Optimization Results
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS optimization_results (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        configuration_id TEXT NOT NULL,
        run_status TEXT NOT NULL DEFAULT 'pending',
        start_time INTEGER,
        end_time INTEGER,
        execution_time_ms INTEGER,
        equipment_scope TEXT,
        time_horizon INTEGER,
        total_schedules INTEGER DEFAULT 0,
        total_cost_estimate REAL,
        cost_savings REAL,
        resource_utilization TEXT,
        conflicts_resolved INTEGER DEFAULT 0,
        optimization_score REAL,
        algorithm_metrics TEXT,
        recommendations TEXT,
        applied_to_production INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Optimizer Configurations
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS optimizer_configurations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        algorithm_type TEXT NOT NULL DEFAULT 'greedy',
        enabled INTEGER DEFAULT 1,
        config TEXT NOT NULL,
        max_scheduling_horizon INTEGER DEFAULT 90,
        cost_weight_factor REAL DEFAULT 0.4,
        urgency_weight_factor REAL DEFAULT 0.6,
        resource_constraint_strict INTEGER DEFAULT 1,
        conflict_resolution_strategy TEXT DEFAULT 'priority_based',
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // PDM Baseline
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS pdm_baseline (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        vessel_name TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        asset_class TEXT NOT NULL,
        feature TEXT NOT NULL,
        mu REAL NOT NULL,
        sigma REAL NOT NULL,
        n INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER
      )
    `);

    // RAG Search Queries
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS rag_search_queries (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        query TEXT NOT NULL,
        search_type TEXT NOT NULL,
        filters TEXT DEFAULT '{}',
        result_count INTEGER DEFAULT 0,
        execution_time_ms INTEGER,
        result_ids TEXT,
        relevance_scores TEXT,
        report_context TEXT,
        ai_model_used TEXT,
        successful INTEGER DEFAULT 1,
        created_at INTEGER
      )
    `);

    // Replay Incoming
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS replay_incoming (
        id TEXT PRIMARY KEY,
        device_id TEXT,
        endpoint TEXT,
        key TEXT,
        received_at INTEGER
      )
    `);

    // Resource Constraints
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS resource_constraints (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        resource_type TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        resource_name TEXT NOT NULL,
        availability_window TEXT NOT NULL,
        max_concurrent_tasks INTEGER DEFAULT 1,
        cost_per_hour REAL,
        cost_per_unit REAL,
        skills TEXT,
        restrictions TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // RUL Fit History
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS rul_fit_history (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        shape_k REAL NOT NULL,
        scale_lambda REAL NOT NULL,
        training_size INTEGER,
        goodness_of_fit REAL,
        fitted_at INTEGER
      )
    `);

    // RUL Models
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS rul_models (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        component_class TEXT NOT NULL,
        equipment_type TEXT,
        shape_k REAL NOT NULL,
        scale_lambda REAL NOT NULL,
        confidence_lo REAL,
        confidence_hi REAL,
        fitted_at INTEGER,
        training_data TEXT,
        validation_metrics TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Schedule Optimizations
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS schedule_optimizations (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        optimization_result_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        current_schedule_id TEXT,
        recommended_schedule_date INTEGER NOT NULL,
        recommended_maintenance_type TEXT NOT NULL,
        recommended_priority INTEGER NOT NULL,
        estimated_duration INTEGER,
        estimated_cost REAL,
        assigned_technician_id TEXT,
        required_parts TEXT,
        optimization_reason TEXT,
        conflicts_with TEXT,
        priority REAL NOT NULL DEFAULT 50,
        status TEXT NOT NULL DEFAULT 'pending',
        applied_at INTEGER,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Serial Port States
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS serial_port_states (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        port_path TEXT NOT NULL,
        port_type TEXT NOT NULL,
        protocol TEXT,
        baud_rate INTEGER,
        parity TEXT,
        data_bits INTEGER DEFAULT 8,
        stop_bits INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'unknown',
        last_frame_at INTEGER,
        frame_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        auto_detected_baud INTEGER DEFAULT 0,
        auto_detected_protocol INTEGER DEFAULT 0,
        restart_count INTEGER DEFAULT 0,
        last_restart_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Sync Conflicts
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        local_value TEXT,
        local_version INTEGER,
        local_timestamp INTEGER,
        local_user TEXT,
        local_device TEXT,
        server_value TEXT,
        server_version INTEGER,
        server_timestamp INTEGER,
        server_user TEXT,
        server_device TEXT,
        resolution_strategy TEXT,
        resolved INTEGER,
        resolved_value TEXT,
        resolved_by TEXT,
        resolved_at INTEGER,
        is_safety_critical INTEGER,
        created_at INTEGER
      )
    `);

    // Telemetry Aggregates
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS telemetry_aggregates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL DEFAULT 'default-org-id',
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        time_window TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        window_end INTEGER NOT NULL,
        avg_value REAL,
        min_value REAL,
        max_value REAL,
        std_dev REAL,
        sample_count INTEGER,
        anomaly_score REAL,
        quality_score REAL,
        metadata TEXT,
        created_at INTEGER
      )
    `);

    // Telemetry Retention Policies
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS telemetry_retention_policies (
        id INTEGER PRIMARY KEY DEFAULT 1,
        retention_days INTEGER DEFAULT 365,
        rollup_enabled INTEGER DEFAULT 1,
        rollup_bucket TEXT DEFAULT '5 minutes',
        compression_enabled INTEGER DEFAULT 0,
        compression_after_days INTEGER DEFAULT 7,
        updated_at INTEGER
      )
    `);

    // Telemetry Rollups
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS telemetry_rollups (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        sensor_type TEXT NOT NULL,
        bucket INTEGER NOT NULL,
        bucket_size TEXT NOT NULL,
        avg_value REAL,
        min_value REAL,
        max_value REAL,
        sample_count INTEGER NOT NULL,
        unit TEXT
      )
    `);

    // Transport Failovers
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS transport_failovers (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        from_transport TEXT NOT NULL,
        to_transport TEXT NOT NULL,
        reason TEXT NOT NULL,
        failed_at INTEGER,
        recovered_at INTEGER,
        readings_pending INTEGER DEFAULT 0,
        readings_flushed INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1
      )
    `);

    // Transport Settings
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS transport_settings (
        id TEXT PRIMARY KEY,
        enable_http_ingest INTEGER DEFAULT 1,
        enable_mqtt_ingest INTEGER DEFAULT 0,
        mqtt_host TEXT,
        mqtt_port INTEGER DEFAULT 8883,
        mqtt_user TEXT,
        mqtt_pass TEXT,
        mqtt_topic TEXT DEFAULT 'fleet/+/telemetry',
        updated_at INTEGER
      )
    `);

    // Wear Particle Analysis
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS wear_particle_analysis (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        equipment_id TEXT NOT NULL,
        oil_analysis_id TEXT,
        analysis_date INTEGER NOT NULL,
        sample_number TEXT NOT NULL,
        dl REAL,
        ds REAL,
        pq_index REAL,
        wpc REAL,
        severity TEXT NOT NULL DEFAULT 'normal',
        cutting_particles REAL,
        sliding_particles REAL,
        fatigue_particles REAL,
        spherical_particles REAL,
        fibers_contaminants REAL,
        ferro_magnetic REAL,
        non_ferrous REAL,
        large_particles REAL,
        medium_particles REAL,
        small_particles REAL,
        gear_wear REAL,
        bearing_wear REAL,
        pump_wear REAL,
        cylinder_wear REAL,
        wear_mode TEXT,
        wear_severity TEXT NOT NULL DEFAULT 'normal',
        suspected_component TEXT,
        recommendations TEXT,
        analyst_comments TEXT,
        magnification TEXT,
        analysis_method TEXT NOT NULL DEFAULT 'ferrography',
        image_urls TEXT,
        analysis_metadata TEXT,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Weibull Estimates
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS weibull_estimates (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        model_id TEXT NOT NULL,
        component_class TEXT NOT NULL,
        equipment_type TEXT,
        shape_k REAL NOT NULL,
        scale_lambda REAL NOT NULL,
        confidence_lo REAL,
        confidence_hi REAL,
        fitted_at INTEGER,
        training_data TEXT,
        validation_metrics TEXT,
        notes TEXT,
        is_active INTEGER DEFAULT 1,
        created_at INTEGER,
        updated_at INTEGER
      )
    `);

    // Create indexes for Phase 5-6 tables
    // Alert system indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_alert_config_org ON alert_configurations(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_alert_config_equipment ON alert_configurations(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_alert_notif_org ON alert_notifications(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_alert_notif_equipment ON alert_notifications(equipment_id)`);
    
    // Parts & Inventory indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_parts_org ON parts(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_parts_partno ON parts(part_no)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_inv_parts_org ON inventory_parts(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_part_fail_equipment ON part_failure_history(equipment_id)`);
    
    // Work Order extensions indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wo_checklist_wo ON work_order_checklists(work_order_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wo_worklog_wo ON work_order_worklogs(work_order_id)`);
    
    // LLM & Reports indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_llm_cost_org_date ON llm_cost_tracking(org_id, created_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_insight_reports_org ON insight_reports(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_cost_savings_equipment ON cost_savings(equipment_id)`);
    
    // Telemetry indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_raw_telem_equipment_ts ON raw_telemetry(equipment_id, ts)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_metrics_history_org ON metrics_history(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pdm_score_equipment ON pdm_score_logs(equipment_id)`);
    
    // Condition Monitoring indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_cond_mon_equipment ON condition_monitoring(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_oil_analysis_equipment ON oil_analysis(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_vib_analysis_equipment ON vibration_analysis(equipment_id)`);
    
    // Device management indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_device_reg_org ON device_registry(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_mqtt_devices_device ON mqtt_devices(device_id)`);
    
    // System & Admin indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_admin_audit_org ON admin_audit_events(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_error_logs_org ON error_logs(org_id)`);
    
    // Indexes for Phase 7: Final 31 tables
    // Calibration Cache indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_calibration_org ON calibration_cache(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_calibration_equipment ON calibration_cache(equipment_type, manufacturer, model)`);
    
    // Compliance indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_compliance_audit_entity ON compliance_audit_log(entity_type, entity_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_compliance_bundles_org ON compliance_bundles(org_id)`);
    
    // Content Sources & Knowledge Base indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_content_sources_org ON content_sources(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_content_sources_type ON content_sources(source_type, source_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_kb_items_org ON knowledge_base_items(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_kb_items_type ON knowledge_base_items(content_type)`);
    
    // Discovered Signals indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_discovered_signals_vessel ON discovered_signals(vessel_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_discovered_signals_source ON discovered_signals(source_id, signal_id)`);
    
    // Edge Diagnostic Logs indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_edge_diag_device ON edge_diagnostic_logs(device_id, created_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_edge_diag_event_type ON edge_diagnostic_logs(event_type)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_edge_diag_status ON edge_diagnostic_logs(status)`);
    
    // Industry Benchmarks indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_benchmarks_type ON industry_benchmarks(equipment_type)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_benchmarks_mfg ON industry_benchmarks(manufacturer, model)`);
    
    // J1939 indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_j1939_org ON j1939_configurations(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_j1939_device ON j1939_configurations(device_id)`);
    
    // Oil Change Records indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_oil_change_equipment ON oil_change_records(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_oil_change_date ON oil_change_records(change_date)`);
    
    // Operating Parameters indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_operating_params_type ON operating_parameters(equipment_type)`);
    
    // Optimization indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_opt_results_org ON optimization_results(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_opt_config_org ON optimizer_configurations(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_schedule_opts_equipment ON schedule_optimizations(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_schedule_opts_result ON schedule_optimizations(optimization_result_id)`);
    
    // PDM Baseline indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_pdm_baseline_vessel_asset ON pdm_baseline(vessel_name, asset_id, feature)`);
    
    // RAG Search Queries indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_rag_search_org ON rag_search_queries(org_id)`);
    
    // Resource Constraints indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_resource_constraints_org ON resource_constraints(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_resource_constraints_type ON resource_constraints(resource_type)`);
    
    // RUL Models indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_rul_models_org ON rul_models(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_rul_models_component ON rul_models(component_class)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_rul_fit_model ON rul_fit_history(model_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_weibull_org ON weibull_estimates(org_id)`);
    
    // Serial Port States indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_serial_port_device ON serial_port_states(device_id, port_path)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_serial_port_status ON serial_port_states(status)`);
    
    // Sync Conflicts indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sync_conflicts_org ON sync_conflicts(org_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_sync_conflicts_table ON sync_conflicts(table_name, record_id)`);
    
    // Telemetry indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_telem_agg_equipment ON telemetry_aggregates(equipment_id, window_start)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_telem_rollup_equipment ON telemetry_rollups(equipment_id, bucket)`);
    
    // Transport indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_failover_device ON transport_failovers(device_id, failed_at)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_failover_active ON transport_failovers(is_active)`);
    
    // Wear Particle Analysis indexes
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wear_particle_equipment ON wear_particle_analysis(equipment_id)`);
    await db.run(sql`CREATE INDEX IF NOT EXISTS idx_wear_particle_date ON wear_particle_analysis(analysis_date)`);

    console.log('[SQLite Init] Database initialized successfully with 131 tables (100% feature parity) at:', dbPath);
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

    // Check if core tables exist (131 tables - 100% feature parity)
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
        'parts_inventory', 'stock', 'inventory_movements', 'suppliers', 'purchase_orders', 'purchase_order_items',
        'crew', 'skills', 'crew_skill', 'crew_leave', 'shift_template', 'crew_assignment', 'crew_cert', 'crew_rest_sheet', 'crew_rest_day',
        'ml_models', 'failure_predictions', 'anomaly_detections', 'prediction_feedback', 'component_degradation', 'failure_history', 'dtc_definitions', 'dtc_faults',
        'model_performance_validations', 'retraining_triggers', 'sensor_configurations', 'sensor_states', 'threshold_optimizations', 'vibration_features', 'model_registry', 'sensor_types',
        'alert_configurations', 'alert_notifications', 'alert_suppressions', 'alert_comments', 'operating_condition_alerts', 'pdm_alerts',
        'parts', 'inventory_parts', 'part_substitutions', 'part_failure_history', 'reservations', 'storage_config',
        'work_order_checklists', 'work_order_worklogs',
        'llm_budget_configs', 'llm_cost_tracking', 'insight_reports', 'insight_snapshots', 'visualization_assets', 'cost_savings',
        'system_settings', 'admin_system_settings', 'admin_audit_events', 'integration_configs', 'error_logs',
        'raw_telemetry', 'metrics_history', 'pdm_score_logs', 'edge_heartbeats',
        'condition_monitoring', 'oil_analysis', 'vibration_analysis', 'sensor_mapping', 'sensor_thresholds',
        'digital_twins', 'data_quality_metrics', 'device_registry', 'mqtt_devices',
        'request_idempotency', 'idempotency_log', 'db_schema_version', 'sheet_lock', 'sheet_version',
        'beast_mode_config', 'calibration_cache', 'compliance_audit_log', 'compliance_bundles',
        'content_sources', 'discovered_signals', 'edge_diagnostic_logs', 'industry_benchmarks',
        'j1939_configurations', 'knowledge_base_items', 'oil_change_records', 'operating_parameters',
        'ops_db_staged', 'optimization_results', 'optimizer_configurations', 'pdm_baseline',
        'rag_search_queries', 'replay_incoming', 'resource_constraints', 'rul_fit_history',
        'rul_models', 'schedule_optimizations', 'serial_port_states', 'sync_conflicts',
        'telemetry_aggregates', 'telemetry_retention_policies', 'telemetry_rollups',
        'transport_failovers', 'transport_settings', 'wear_particle_analysis', 'weibull_estimates'
      )
    `);

    return result?.count >= 131;
  } catch {
    return false;
  }
}
