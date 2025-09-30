import cron from 'node-cron';
import { storage } from './storage';

export function setupVesselSchedules(): void {
  console.log('⚓ Setting up vessel operation schedules...');
  
  const vesselOperationSchedule = process.env.VESSEL_OPERATION_CRON || '0 0 * * *';
  
  cron.schedule(vesselOperationSchedule, async () => {
    try {
      console.log('⚓ Daily vessel operation counter update starting...');
      
      const allVessels = await storage.getVessels();
      const activeVessels = allVessels.filter(v => v.active);
      let updated = 0;
      
      console.log(`Found ${activeVessels.length} active vessels out of ${allVessels.length} total`);
      
      for (const vessel of activeVessels) {
        try {
          const currentOperationDays = parseFloat(vessel.operationDays || '0');
          
          await storage.updateVessel(vessel.id, {
            operationDays: (currentOperationDays + 1).toString(),
          });
          
          updated++;
        } catch (error) {
          console.error(`❌ Failed to update operation days for vessel ${vessel.id}:`, error);
        }
      }
      
      console.log(`✅ Daily vessel operation update completed: ${updated}/${activeVessels.length} active vessels updated`);
      
    } catch (error) {
      console.error('❌ Vessel operation counter update failed:', error);
    }
  });
  
  console.log(`✅ Vessel operation schedule configured (${vesselOperationSchedule})`);
}
