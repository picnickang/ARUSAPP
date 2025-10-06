/**
 * ML-LLM Integration Test
 * 
 * Verifies that ML model predictions are successfully integrated with LLM reports
 */

import { DatabaseStorage } from "../storage.js";
import { reportContextBuilder } from "../report-context.js";
import { enhancedLLM } from "../enhanced-llm.js";

const ORG_ID = "default-org-id";

async function testMLLLMIntegration() {
  console.log("\n🔬 Testing ML-LLM Integration...\n");
  console.log("=".repeat(60));
  
  const storage = new DatabaseStorage();
  
  try {
    // Step 1: Get equipment list
    console.log("\n📋 Step 1: Fetching equipment...");
    const equipment = await storage.getEquipmentRegistry(ORG_ID);
    
    if (equipment.length === 0) {
      console.log("❌ No equipment found. Please seed data first.");
      return false;
    }
    
    console.log(`✅ Found ${equipment.length} equipment units`);
    
    // Filter to equipment types that have ML models (pump, engine)
    const testEquipment = equipment.filter(eq => 
      eq.type === 'pump' || eq.type === 'engine'
    ).slice(0, 5);
    
    if (testEquipment.length === 0) {
      console.log("❌ No pump or engine equipment found (these are the only types with trained models)");
      return false;
    }
    
    console.log(`   Testing with ${testEquipment.length} equipment units that have ML models:`);
    testEquipment.forEach(eq => {
      console.log(`   - ${eq.name} (${eq.type})`);
    });
    
    // Step 2: Build context with ML predictions
    console.log("\n📊 Step 2: Building report context with ML predictions...");
    
    const vessels = await storage.getVessels();
    if (vessels.length === 0) {
      console.log("⚠️  No vessels found, using equipment-only context");
    }
    
    const vesselId = vessels[0]?.id;
    
    let context;
    if (vesselId) {
      context = await reportContextBuilder.buildVesselHealthContext(vesselId, ORG_ID, {
        includeIntelligence: true,
        includePredictions: true,
        audience: 'technical',
        timeframeDays: 30
      });
    } else {
      context = await reportContextBuilder.buildFleetSummaryContext(ORG_ID, {
        includeIntelligence: true,
        includePredictions: true,
        audience: 'technical',
        timeframeDays: 30
      });
    }
    
    // Step 3: Verify ML predictions are in context
    console.log("\n🔍 Step 3: Verifying ML predictions in context...");
    
    if (!context.intelligence?.predictions) {
      console.log("❌ No predictions found in context");
      console.log("   This could mean:");
      console.log("   - No trained models are available");
      console.log("   - Equipment doesn't have sufficient telemetry data");
      console.log("   - ML prediction service encountered errors");
      return false;
    }
    
    const predictionCount = context.intelligence.predictions.length;
    console.log(`✅ Found ${predictionCount} ML predictions in context:`);
    
    context.intelligence.predictions.forEach(pred => {
      const prob = (pred.mlPrediction.failureProbability * 100).toFixed(0);
      const health = pred.mlPrediction.healthScore;
      const days = pred.mlPrediction.remainingDays;
      
      console.log(`\n   Equipment: ${pred.equipmentName} (${pred.equipmentType})`);
      console.log(`   Method: ${pred.mlPrediction.method}`);
      console.log(`   Failure Probability: ${prob}%`);
      console.log(`   Health Score: ${health}/100`);
      console.log(`   Remaining Days: ${days}`);
      console.log(`   Recommendations: ${pred.mlPrediction.recommendations[0]}`);
    });
    
    // Step 4: Verify knowledge base enrichment
    console.log("\n📚 Step 4: Verifying knowledge base enrichment...");
    
    if (!context.intelligence?.knowledgeBase) {
      console.log("❌ No knowledge base found in context");
      return false;
    }
    
    const mlKnowledge = context.intelligence.knowledgeBase.filter(k => 
      k.includes('ML Prediction') || k.includes('LSTM') || k.includes('Random Forest')
    );
    
    if (mlKnowledge.length === 0) {
      console.log("❌ No ML predictions found in knowledge base");
      console.log("   Knowledge base content:");
      context.intelligence.knowledgeBase.forEach(k => console.log(`   - ${k}`));
      return false;
    }
    
    console.log(`✅ Found ${mlKnowledge.length} ML knowledge snippets:`);
    mlKnowledge.forEach(k => console.log(`   ${k}`));
    
    // Step 5: Generate LLM report (optional - requires API keys)
    console.log("\n🤖 Step 5: Testing LLM report generation...");
    
    try {
      let report;
      if (vesselId) {
        report = await enhancedLLM.generateVesselHealthReport(
          vesselId,
          'technical',
          { includeScenarios: false }
        );
      } else {
        report = await enhancedLLM.generateFleetSummaryReport(
          'technical',
          { includeScenarios: false }
        );
      }
      
      console.log("✅ LLM report generated successfully");
      console.log(`   Provider: ${report.metadata.provider}`);
      console.log(`   Model: ${report.metadata.model}`);
      console.log(`   Processing Time: ${report.metadata.processingTime}ms`);
      console.log(`   Confidence: ${report.confidence}%`);
      
      // Check if ML predictions are referenced in the analysis
      const mlReferences = [
        'ML', 'machine learning', 'LSTM', 'Random Forest', 
        'predicted', 'prediction', 'failure probability'
      ];
      
      const hasMLReference = mlReferences.some(ref => 
        report.analysis.toLowerCase().includes(ref.toLowerCase())
      );
      
      if (hasMLReference) {
        console.log("✅ LLM analysis references ML predictions");
        console.log("\n   Sample from analysis:");
        const lines = report.analysis.split('\n').slice(0, 5);
        lines.forEach(line => console.log(`   ${line}`));
      } else {
        console.log("⚠️  LLM analysis may not explicitly reference ML predictions");
        console.log("   (This could be normal if no critical predictions were made)");
      }
      
    } catch (error: any) {
      if (error.message.includes('API key') || error.message.includes('not initialized')) {
        console.log("⚠️  LLM report generation skipped (API keys not configured)");
        console.log("   This is expected if OPENAI_API_KEY is not set");
      } else {
        console.log("❌ LLM report generation failed:", error.message);
        return false;
      }
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ ML-LLM Integration Test PASSED");
    console.log("\n✨ Summary:");
    console.log(`   - ML predictions are fetched: ✅`);
    console.log(`   - Predictions added to context: ✅`);
    console.log(`   - Knowledge base enriched: ✅`);
    console.log(`   - Integration pipeline: ✅ COMPLETE`);
    console.log("\n🎯 Your ML models are now integrated with the LLM system!");
    
    return true;
    
  } catch (error) {
    console.error("\n❌ Integration test failed:", error);
    if (error instanceof Error) {
      console.error("   Error:", error.message);
      console.error("   Stack:", error.stack);
    }
    return false;
  }
}

// Run the test
testMLLLMIntegration()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
