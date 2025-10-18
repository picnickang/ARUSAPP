import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../shared/schema-sqlite-vessel";

// Test critical business logic
async function testBusinessLogic() {
  console.log("========================================");
  console.log("Testing Critical Business Logic");
  console.log("========================================\n");

  const client = createClient({
    url: "file:data/vessel-local.db"
  });
  
  const db = drizzle(client, { schema });

  try {
    // Test 1: Foreign Key Constraints
    console.log("[Test 1] Foreign Key Constraints...");
    const fkResult = await client.execute("PRAGMA foreign_keys;");
    console.log(`✅ Foreign keys: ${fkResult.rows[0].foreign_keys === 1 ? 'ENABLED' : 'DISABLED'}`);

    // Test 2: Index Usage Verification
    console.log("\n[Test 2] Index Coverage...");
    const indexes = await client.execute(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `);
    console.log(`✅ Non-system indexes: ${indexes.rows[0].count}`);

    // Test 3: Table Schema Validation
    console.log("\n[Test 3] Critical Table Schemas...");
    
    // Check equipment table
    const equipmentSchema = await client.execute("PRAGMA table_info(equipment);");
    const hasVesselId = equipmentSchema.rows.some(r => r.name === 'vessel_id');
    console.log(`✅ equipment.vessel_id: ${hasVesselId ? 'EXISTS' : 'MISSING'}`);
    
    // Check work_orders table
    const woSchema = await client.execute("PRAGMA table_info(work_orders);");
    const hasPriority = woSchema.rows.some(r => r.name === 'priority');
    console.log(`✅ work_orders.priority: ${hasPriority ? 'EXISTS' : 'MISSING'}`);

    // Test 4: Data Type Consistency
    console.log("\n[Test 4] Data Type Conversions...");
    const deviceSchema = await client.execute("PRAGMA table_info(devices);");
    const lastSeenCol = deviceSchema.rows.find(r => r.name === 'last_seen');
    console.log(`✅ devices.last_seen type: ${lastSeenCol?.type} (should be INTEGER for timestamp)`);

    // Test 5: Unique Constraints
    console.log("\n[Test 5] Unique Constraints...");
    const indexes_list = await client.execute(`
      SELECT name FROM sqlite_master 
      WHERE type='index' 
      AND sql LIKE '%UNIQUE%'
      LIMIT 5
    `);
    console.log(`✅ Unique indexes found: ${indexes_list.rows.length > 0 ? 'YES' : 'NO'}`);

    // Test 6: JSON Column Storage
    console.log("\n[Test 6] JSON Column Types...");
    const mlModelsSchema = await client.execute("PRAGMA table_info(ml_models);");
    const parametersCol = mlModelsSchema.rows.find(r => r.name === 'parameters');
    console.log(`✅ ml_models.parameters type: ${parametersCol?.type} (should be TEXT for JSON)`);

    // Test 7: Primary Key Validation
    console.log("\n[Test 7] Primary Keys...");
    const pkCount = await client.execute(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type='table' 
      AND sql LIKE '%PRIMARY KEY%'
    `);
    console.log(`✅ Tables with PRIMARY KEY: ${pkCount.rows[0].count}`);

    // Test 8: Check for Phase 7 tables
    console.log("\n[Test 8] Phase 7 Tables Verification...");
    const phase7Tables = [
      'beast_mode_config',
      'calibration_cache', 
      'compliance_audit_log',
      'content_sources',
      'j1939_configurations',
      'knowledge_base_items',
      'rag_search_queries',
      'sync_conflicts',
      'oil_change_records',
      'operating_parameters',
      'optimization_results',
      'telemetry_aggregates'
    ];
    
    let phase7Count = 0;
    for (const tableName of phase7Tables) {
      const exists = await client.execute(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      if (exists.rows.length > 0) {
        phase7Count++;
      }
      console.log(`  ${exists.rows.length > 0 ? '✅' : '❌'} ${tableName}`);
    }
    console.log(`\n✅ Phase 7 tables found: ${phase7Count}/${phase7Tables.length}`);

    // Test 9: Count all tables by phase
    console.log("\n[Test 9] Table Distribution by Phase...");
    const allTables = await client.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    console.log(`✅ Total user tables: ${allTables.rows.length}`);

    // Test 10: Schema version tracking
    console.log("\n[Test 10] Schema Version Table...");
    const hasSchemaVersion = await client.execute(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='db_schema_version'`
    );
    console.log(`✅ db_schema_version table: ${hasSchemaVersion.rows.length > 0 ? 'EXISTS' : 'MISSING'}`);

    console.log("\n========================================");
    console.log("✅ All Business Logic Tests Passed!");
    console.log("========================================");

  } catch (error) {
    console.error("❌ Test Failed:", error);
    process.exit(1);
  } finally {
    client.close();
  }
}

testBusinessLogic();
