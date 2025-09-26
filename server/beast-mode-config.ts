import { db } from "./db.js";
import { beastModeConfig, type BeastModeConfig, type InsertBeastModeConfig } from "../shared/schema.js";
import { eq, and } from "drizzle-orm";

/**
 * Beast Mode Feature Flags System
 * All features are disabled by default for safety
 */

export type BeastModeFeature = 
  | 'vibration_analysis'
  | 'weibull_rul' 
  | 'lp_optimizer'
  | 'enhanced_trends'
  | 'inventory_risk'
  | 'compliance_pdf';

export interface BeastModeFeatureConfig {
  enabled: boolean;
  configuration?: any;
}

export class BeastModeConfigManager {
  
  /**
   * Check if a Beast Mode feature is enabled for an organization
   */
  async isFeatureEnabled(orgId: string, feature: BeastModeFeature): Promise<boolean> {
    try {
      const [config] = await db
        .select()
        .from(beastModeConfig)
        .where(and(eq(beastModeConfig.orgId, orgId), eq(beastModeConfig.featureName, feature)))
        .limit(1);
      
      return config?.enabled ?? false; // Default to false
    } catch (error) {
      console.error(`[Beast Mode] Error checking feature ${feature} for org ${orgId}:`, error);
      return false; // Fail safely - disable feature on error
    }
  }

  /**
   * Get feature configuration with enabled status
   */
  async getFeatureConfig(orgId: string, feature: BeastModeFeature): Promise<BeastModeFeatureConfig> {
    try {
      const [config] = await db
        .select()
        .from(beastModeConfig)
        .where(and(eq(beastModeConfig.orgId, orgId), eq(beastModeConfig.featureName, feature)))
        .limit(1);
      
      return {
        enabled: config?.enabled ?? false,
        configuration: config?.configuration ?? null,
      };
    } catch (error) {
      console.error(`[Beast Mode] Error getting config for ${feature} in org ${orgId}:`, error);
      return { enabled: false }; // Fail safely
    }
  }

  /**
   * Enable a Beast Mode feature for an organization
   * CAUTION: Only enable features that are fully implemented
   */
  async enableFeature(
    orgId: string, 
    feature: BeastModeFeature, 
    configuration: any = null,
    lastModifiedBy: string = 'system'
  ): Promise<boolean> {
    try {
      // Insert or update the feature configuration
      await db
        .insert(beastModeConfig)
        .values({
          orgId,
          featureName: feature,
          enabled: true,
          configuration,
          lastModifiedBy,
        })
        .onConflictDoUpdate({
          target: [beastModeConfig.orgId, beastModeConfig.featureName],
          set: {
            enabled: true,
            configuration,
            lastModifiedBy,
            updatedAt: new Date(),
          },
        });

      console.log(`[Beast Mode] Feature ${feature} enabled for org ${orgId}`);
      return true;
    } catch (error) {
      console.error(`[Beast Mode] Error enabling feature ${feature} for org ${orgId}:`, error);
      return false;
    }
  }

  /**
   * Disable a Beast Mode feature for an organization
   */
  async disableFeature(orgId: string, feature: BeastModeFeature, lastModifiedBy: string = 'system'): Promise<boolean> {
    try {
      await db
        .insert(beastModeConfig)
        .values({
          orgId,
          featureName: feature,
          enabled: false,
          lastModifiedBy,
        })
        .onConflictDoUpdate({
          target: [beastModeConfig.orgId, beastModeConfig.featureName],
          set: {
            enabled: false,
            lastModifiedBy,
            updatedAt: new Date(),
          },
        });

      console.log(`[Beast Mode] Feature ${feature} disabled for org ${orgId}`);
      return true;
    } catch (error) {
      console.error(`[Beast Mode] Error disabling feature ${feature} for org ${orgId}:`, error);
      return false;
    }
  }

  /**
   * Get all Beast Mode feature configurations for an organization
   */
  async getAllFeatureConfigs(orgId: string): Promise<Record<BeastModeFeature, BeastModeFeatureConfig>> {
    try {
      const configs = await db
        .select()
        .from(beastModeConfig)
        .where(eq(beastModeConfig.orgId, orgId));
      
      // Create default configuration with all features disabled
      const result: Record<BeastModeFeature, BeastModeFeatureConfig> = {
        vibration_analysis: { enabled: false },
        weibull_rul: { enabled: false },
        lp_optimizer: { enabled: false },
        enhanced_trends: { enabled: false },
        inventory_risk: { enabled: false },
        compliance_pdf: { enabled: false },
      };

      // Override with actual configurations
      configs.forEach(config => {
        if (this.isValidFeature(config.featureName)) {
          result[config.featureName as BeastModeFeature] = {
            enabled: config.enabled ?? false,
            configuration: config.configuration,
          };
        }
      });

      return result;
    } catch (error) {
      console.error(`[Beast Mode] Error getting all configs for org ${orgId}:`, error);
      // Return all disabled on error
      return {
        vibration_analysis: { enabled: false },
        weibull_rul: { enabled: false },
        lp_optimizer: { enabled: false },
        enhanced_trends: { enabled: false },
        inventory_risk: { enabled: false },
        compliance_pdf: { enabled: false },
      };
    }
  }

  private isValidFeature(featureName: string): featureName is BeastModeFeature {
    return ['vibration_analysis', 'weibull_rul', 'lp_optimizer', 'enhanced_trends', 'inventory_risk', 'compliance_pdf']
      .includes(featureName);
  }
}

// Singleton instance for use throughout the application
export const beastModeManager = new BeastModeConfigManager();

// Utility function for quick feature checks
export async function isBeastModeFeatureEnabled(orgId: string, feature: BeastModeFeature): Promise<boolean> {
  return await beastModeManager.isFeatureEnabled(orgId, feature);
}

// Default organization ID for backward compatibility
export const DEFAULT_ORG_ID = "default-org-id";

/**
 * Safe Beast Mode feature check with fallback to default org
 */
export async function isBeastModeEnabled(feature: BeastModeFeature, orgId: string = DEFAULT_ORG_ID): Promise<boolean> {
  try {
    return await isBeastModeFeatureEnabled(orgId, feature);
  } catch (error) {
    console.error(`[Beast Mode] Error checking ${feature}, defaulting to disabled:`, error);
    return false; // Always fail safely to disabled state
  }
}