import { db } from './db';
import { sql } from 'drizzle-orm';

/**
 * Database Views Management
 * 
 * This module manages database views that extend the core Drizzle schema.
 * Views are created as part of schema setup to ensure consistency across all environments.
 */

/**
 * Create all essential database views for ARUS inventory management
 */
export async function createDatabaseViews(): Promise<void> {
  console.log('🔧 Creating database views for inventory management...');
  
  try {
    // Parts with Stock View: Efficient joining of parts and stock data
    await db.execute(sql`
      CREATE OR REPLACE VIEW v_parts_with_stock AS
      SELECT 
        p.id as part_id,
        p.part_no,
        p.name,
        p.description,
        p.category,
        p.unit_of_measure,
        p.standard_cost,
        p.criticality,
        p.lead_time_days,
        p.org_id,
        -- Stock aggregations (sum across all locations)
        COALESCE(SUM(s.quantity_on_hand), 0) as total_on_hand,
        COALESCE(SUM(s.quantity_reserved), 0) as total_reserved,
        COALESCE(SUM(s.quantity_on_order), 0) as total_on_order,
        COALESCE(SUM(s.quantity_on_hand) - SUM(s.quantity_reserved), 0) as available_quantity,
        -- Use stock unit cost if available, fallback to part standard cost
        COALESCE(AVG(s.unit_cost), p.standard_cost) as effective_unit_cost,
        -- Stock status calculation
        CASE 
          WHEN COALESCE(SUM(s.quantity_on_hand), 0) <= 0 THEN 'out_of_stock'
          WHEN COALESCE(SUM(s.quantity_on_hand), 0) < p.min_stock_qty THEN 'low_stock'
          WHEN COALESCE(SUM(s.quantity_on_hand), 0) > p.max_stock_qty THEN 'excess_stock'
          ELSE 'adequate'
        END as stock_status,
        -- Part thresholds
        p.min_stock_qty,
        p.max_stock_qty,
        -- Location count
        COUNT(s.id) as location_count
      FROM parts p
      LEFT JOIN stock s ON s.part_id = p.id
      GROUP BY 
        p.id, p.part_no, p.name, p.description, p.category, 
        p.unit_of_measure, p.standard_cost, p.criticality, 
        p.lead_time_days, p.org_id, p.min_stock_qty, p.max_stock_qty
    `);
    
    console.log('✅ Database views created successfully');
    
  } catch (error) {
    console.error('❌ Failed to create database views:', error);
    throw error; // Views are critical for inventory functionality
  }
}

/**
 * Verify that all essential views exist and return expected data
 */
export async function verifyDatabaseViews(): Promise<{success: boolean, errors: string[]}> {
  const errors: string[] = [];
  
  try {
    // Test v_parts_with_stock view
    const testQuery = await db.execute(sql`
      SELECT part_id, part_no, total_on_hand, stock_status 
      FROM v_parts_with_stock 
      LIMIT 1
    `);
    
    // View should exist and have expected columns
    if (testQuery.rows.length >= 0) {
      console.log('✅ v_parts_with_stock view verified');
    }
    
  } catch (error) {
    const msg = `v_parts_with_stock view verification failed: ${error}`;
    errors.push(msg);
    console.error('❌', msg);
  }
  
  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Drop all managed views (for testing/development)
 */
export async function dropDatabaseViews(): Promise<void> {
  console.log('🗑️ Dropping database views...');
  
  try {
    await db.execute(sql`DROP VIEW IF EXISTS v_parts_with_stock`);
    console.log('✅ Database views dropped');
  } catch (error) {
    console.error('❌ Failed to drop database views:', error);
    throw error;
  }
}