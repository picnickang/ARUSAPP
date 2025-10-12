import { useState, useEffect } from "react";
import { useSearch } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LayoutDashboard, 
  Activity, 
  Ship, 
  Brain, 
  DollarSign, 
  Settings2,
  Waves
} from "lucide-react";
import Analytics from "./analytics";
import AdvancedAnalytics from "./advanced-analytics";
import EnhancedTrendsValidation from "./enhanced-trends-validation";
import FleetPerformanceValidation from "./fleet-performance-validation";
import PdmPack from "./pdm-pack";
import ExecutiveSummary from "@/components/ExecutiveSummary";

export default function AnalyticsConsolidated() {
  const searchParams = new URLSearchParams(useSearch());
  
  // Get initial tab from URL or default to dashboard
  const [activeTab, setActiveTab] = useState<string>(
    searchParams.get("view") || "dashboard"
  );

  // Update URL when tab changes (for bookmarking & sharing)
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== "dashboard") {
      params.set("view", activeTab);
    }
    const newSearch = params.toString();
    const currentPath = window.location.pathname;
    const newUrl = newSearch ? `${currentPath}?${newSearch}` : currentPath;
    window.history.replaceState(null, "", newUrl);
  }, [activeTab]);

  return (
    <div className="p-6" data-testid="page-analytics-consolidated">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Intelligence</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive insights, predictions, and performance monitoring
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-full min-w-fit p-1 gap-1">
            <TabsTrigger 
              value="dashboard" 
              data-testid="tab-dashboard"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[90px] sm:min-w-[110px] transition-all"
            >
              <LayoutDashboard className="h-4 w-4 mr-2" />
              <span>Dashboard</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="monitoring" 
              data-testid="tab-monitoring"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[90px] sm:min-w-[110px] transition-all"
            >
              <Activity className="h-4 w-4 mr-2" />
              <span>Real-Time</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="fleet" 
              data-testid="tab-fleet"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[90px] sm:min-w-[110px] transition-all"
            >
              <Ship className="h-4 w-4 mr-2" />
              <span>Fleet</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="predictive" 
              data-testid="tab-predictive"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[90px] sm:min-w-[110px] transition-all"
            >
              <Brain className="h-4 w-4 mr-2" />
              <span>Predictive</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="intelligence" 
              data-testid="tab-intelligence"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[90px] sm:min-w-[110px] transition-all"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              <span>Cost Intel</span>
            </TabsTrigger>

            <TabsTrigger 
              value="pdm" 
              data-testid="tab-pdm"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[90px] sm:min-w-[110px] transition-all"
            >
              <Waves className="h-4 w-4 mr-2" />
              <span>PDM Pack</span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="advanced" 
              data-testid="tab-advanced"
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[90px] sm:min-w-[110px] transition-all"
            >
              <Settings2 className="h-4 w-4 mr-2" />
              <span>Advanced</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard: Executive Summary + Today's Key Insights */}
        <TabsContent value="dashboard" className="space-y-0">
          <ExecutiveSummary />
        </TabsContent>

        {/* Real-Time Monitoring: Live Telemetry focused view */}
        <TabsContent value="monitoring" className="space-y-0">
          <Analytics />
        </TabsContent>

        {/* Fleet Performance: Performance Metrics + Health Trends */}
        <TabsContent value="fleet" className="space-y-0">
          <FleetPerformanceValidation />
        </TabsContent>

        {/* Predictive Analytics: Predictions, Anomalies, ML */}
        <TabsContent value="predictive" className="space-y-0">
          <AdvancedAnalytics />
        </TabsContent>

        {/* Cost Intelligence: Costs, ROI, Optimization */}
        <TabsContent value="intelligence" className="space-y-0">
          <Analytics />
        </TabsContent>

        {/* PDM Pack: Bearing & Pump Analysis */}
        <TabsContent value="pdm" className="space-y-0">
          <PdmPack />
        </TabsContent>

        {/* Advanced Tools: Trends, Digital Twins, Configuration */}
        <TabsContent value="advanced" className="space-y-0">
          <EnhancedTrendsValidation />
        </TabsContent>
      </Tabs>
    </div>
  );
}
