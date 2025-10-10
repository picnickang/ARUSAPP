import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Ship, Activity } from "lucide-react";
import Analytics from "./analytics";
import AdvancedAnalytics from "./advanced-analytics";
import EnhancedTrendsValidation from "./enhanced-trends-validation";
import FleetPerformanceValidation from "./fleet-performance-validation";

export default function AnalyticsConsolidated() {
  return (
    <Tabs defaultValue="overview" className="p-6" data-testid="page-analytics-consolidated">
      <TabsList>
        <TabsTrigger value="overview" data-testid="tab-overview">
          <Activity className="h-4 w-4 mr-2" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="equipment" data-testid="tab-equipment">
          <TrendingUp className="h-4 w-4 mr-2" />
          Equipment
        </TabsTrigger>
        <TabsTrigger value="fleet" data-testid="tab-fleet">
          <Ship className="h-4 w-4 mr-2" />
          Fleet
        </TabsTrigger>
        <TabsTrigger value="trends" data-testid="tab-trends">
          <BarChart3 className="h-4 w-4 mr-2" />
          Trends
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Analytics />
      </TabsContent>

      <TabsContent value="equipment">
        <AdvancedAnalytics />
      </TabsContent>

      <TabsContent value="fleet">
        <FleetPerformanceValidation />
      </TabsContent>

      <TabsContent value="trends">
        <EnhancedTrendsValidation />
      </TabsContent>
    </Tabs>
  );
}
