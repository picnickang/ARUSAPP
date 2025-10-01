import { db } from "../db";
import { dtcDefinitions } from "../../shared/schema";

// Standard J1939 FMI (Failure Mode Identifier) definitions
const FMI_DEFINITIONS = [
  { fmi: 0, name: "Data Valid But Above Normal Operating Range - Most Severe Level" },
  { fmi: 1, name: "Data Valid But Below Normal Operating Range - Most Severe Level" },
  { fmi: 2, name: "Data Erratic, Intermittent, or Incorrect" },
  { fmi: 3, name: "Voltage Above Normal or Shorted High" },
  { fmi: 4, name: "Voltage Below Normal or Shorted Low" },
  { fmi: 5, name: "Current Below Normal or Open Circuit" },
  { fmi: 6, name: "Current Above Normal or Grounded Circuit" },
  { fmi: 7, name: "Mechanical System Not Responding Properly" },
  { fmi: 8, name: "Abnormal Frequency, Pulse Width, or Period" },
  { fmi: 9, name: "Abnormal Update Rate" },
  { fmi: 10, name: "Abnormal Rate of Change" },
  { fmi: 11, name: "Failure Mode Not Identifiable" },
  { fmi: 12, name: "Bad Intelligent Device or Component" },
  { fmi: 13, name: "Out of Calibration" },
  { fmi: 14, name: "Special Instructions" },
  { fmi: 15, name: "Reserved for Future Assignment - SAE" },
  { fmi: 31, name: "Condition Exists" },
];

// Common J1939 SPN (Suspect Parameter Number) definitions for marine engines
const COMMON_SPNS = [
  { spn: 84, name: "Wheel-Based Vehicle Speed", severity: 3 },
  { spn: 91, name: "Accelerator Pedal Position 1", severity: 3 },
  { spn: 94, name: "Fuel Delivery Pressure", severity: 2 },
  { spn: 96, name: "Fuel Level 1", severity: 4 },
  { spn: 97, name: "Water In Fuel Indicator", severity: 2 },
  { spn: 98, name: "Engine Oil Level", severity: 2 },
  { spn: 100, name: "Engine Oil Pressure", severity: 1 },
  { spn: 102, name: "Engine Intake Manifold 1 Pressure", severity: 2 },
  { spn: 105, name: "Intake Manifold 1 Temperature", severity: 2 },
  { spn: 108, name: "Barometric Pressure", severity: 3 },
  { spn: 110, name: "Engine Coolant Temperature", severity: 1 },
  { spn: 111, name: "Engine Coolant Level", severity: 1 },
  { spn: 158, name: "Battery Potential / Power Input 1", severity: 2 },
  { spn: 164, name: "Engine Injection Control Pressure", severity: 2 },
  { spn: 168, name: "Battery Potential / Power Input 2", severity: 2 },
  { spn: 171, name: "Ambient Air Temperature", severity: 4 },
  { spn: 172, name: "Engine Air Inlet Temperature", severity: 3 },
  { spn: 173, name: "Engine Exhaust Gas Temperature", severity: 2 },
  { spn: 175, name: "Engine Oil Temperature 1", severity: 2 },
  { spn: 183, name: "Engine Fuel Rate", severity: 3 },
  { spn: 190, name: "Engine Speed", severity: 1 },
  { spn: 235, name: "Total Engine Hours", severity: 4 },
  { spn: 512, name: "Driver's Demand Engine - Percent Torque", severity: 3 },
  { spn: 513, name: "Actual Engine - Percent Torque", severity: 3 },
  { spn: 514, name: "Nominal Friction - Percent Torque", severity: 4 },
  { spn: 539, name: "Percent Clutch Slip", severity: 3 },
  { spn: 597, name: "Brake Application Pressure", severity: 2 },
  { spn: 608, name: "Engine Coolant Pressure", severity: 2 },
  { spn: 625, name: "Engine Turbocharger Lube Oil Pressure", severity: 2 },
  { spn: 636, name: "Intake Manifold 1 Air Temperature", severity: 3 },
  { spn: 637, name: "Intake Manifold Air Pressure", severity: 2 },
  { spn: 641, name: "Engine Exhaust 1 Temperature", severity: 2 },
  { spn: 642, name: "Engine Exhaust 2 Temperature", severity: 2 },
  { spn: 651, name: "Injector Metering Rail 1 Pressure", severity: 2 },
  { spn: 1081, name: "Engine Wait to Start Lamp", severity: 3 },
  { spn: 1127, name: "Engine Turbocharger 1 Boost Pressure", severity: 2 },
  { spn: 1188, name: "Engine Turbocharger 1 Compressor Inlet Temperature", severity: 3 },
  { spn: 1637, name: "Engine Starter Mode", severity: 2 },
  { spn: 3031, name: "Aftertreatment 1 Diesel Exhaust Fluid Tank Level", severity: 2 },
  { spn: 3251, name: "Aftertreatment 1 Exhaust Gas Temperature 1", severity: 2 },
  { spn: 3464, name: "Engine Fuel Leak Detected", severity: 1 },
  { spn: 3490, name: "Aftertreatment 1 Diesel Exhaust Fluid Pump Motor Speed", severity: 3 },
  { spn: 3563, name: "Aftertreatment 1 Diesel Particulate Filter Soot Load Percent", severity: 2 },
  { spn: 4076, name: "Aftertreatment 1 Diesel Particulate Filter Differential Pressure", severity: 2 },
  { spn: 5246, name: "Aftertreatment 1 Diesel Exhaust Fluid Tank Heater", severity: 3 },
];

async function seedDtcDefinitions() {
  console.log("Seeding DTC definitions...");

  let insertCount = 0;
  const dtcRecords = [];

  // Generate DTC definitions by combining SPNs with FMIs
  for (const spnDef of COMMON_SPNS) {
    for (const fmiDef of FMI_DEFINITIONS) {
      dtcRecords.push({
        spn: spnDef.spn,
        fmi: fmiDef.fmi,
        manufacturer: '', // Empty string for standard J1939 codes
        spnName: spnDef.name,
        fmiName: fmiDef.name,
        description: `${spnDef.name}: ${fmiDef.name}`,
        severity: spnDef.severity,
      });
    }
  }

  // Insert in batches to avoid memory issues
  const batchSize = 100;
  for (let i = 0; i < dtcRecords.length; i += batchSize) {
    const batch = dtcRecords.slice(i, i + batchSize);
    await db.insert(dtcDefinitions).values(batch).onConflictDoNothing();
    insertCount += batch.length;
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${insertCount} records`);
  }

  console.log(`✓ Seeded ${insertCount} DTC definitions`);
  console.log(`  - ${COMMON_SPNS.length} SPNs`);
  console.log(`  - ${FMI_DEFINITIONS.length} FMIs`);
  console.log(`  - ${insertCount} total combinations`);
}

seedDtcDefinitions()
  .then(() => {
    console.log("✓ DTC definitions seeded successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Failed to seed DTC definitions:", error);
    process.exit(1);
  });
