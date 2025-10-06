import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { useIsMobile } from "@/components/MobileTouchControls";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import VesselManagement from "@/pages/vessel-management";
import VesselDetail from "@/pages/vessel-detail";
import HealthMonitor from "@/pages/health-monitor";
import Analytics from "@/pages/analytics";
import AdvancedAnalytics from "@/pages/advanced-analytics";
import MLTraining from "@/pages/ml-training";
import InventoryManagement from "@/pages/inventory-management";
import OptimizationTools from "@/pages/optimization-tools";
import WorkOrders from "@/pages/work-orders";
import MaintenanceSchedules from "@/pages/maintenance-schedules";
import Alerts from "@/pages/alerts";
import Reports from "@/pages/reports";
import Settings from "@/pages/settings";
import TransportSettings from "@/pages/transport-settings";
import ManualTelemetryUpload from "@/pages/manual-telemetry-upload";
import CrewManagement from "@/pages/crew-management";
import CrewScheduler from "@/pages/crew-scheduler";
import HoursOfRest from "@/pages/hours-of-rest";
import SensorConfig from "@/pages/sensor-config";
import EquipmentRegistry from "@/pages/equipment-registry";
import OrganizationManagement from "@/pages/organization-management";
import { StorageSettings } from "@/pages/storage-settings";
import SystemAdministration from "@/pages/system-administration";
import PdmPack from "@/pages/pdm-pack";
import SensorManagement from "@/pages/sensor-management";
import AIInsights from "@/pages/ai-insights";
import Diagnostics from "@/pages/diagnostics";
import OperatingParametersPage from "@/pages/OperatingParametersPage";
import MaintenanceTemplatesPage from "@/pages/MaintenanceTemplatesPage";
import EnhancedTrendsValidation from "@/pages/enhanced-trends-validation";
import FleetPerformanceValidation from "@/pages/fleet-performance-validation";
import NotFound from "@/pages/not-found";

function Router() {
  const isMobile = useIsMobile();
  
  // Enable real-time multi-device synchronization
  useRealtimeSync();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && <Sidebar />}
      
      {/* Mobile Navigation - only shown on mobile */}
      {isMobile && <MobileNavigation />}
      
      <main className="flex-1 overflow-auto">
        <div className={isMobile ? "mobile-container pt-16 pb-20" : "lg:p-0"}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/devices" component={Devices} />
            <Route path="/vessels/:id" component={VesselDetail} />
            <Route path="/vessel-management" component={VesselManagement} />
            <Route path="/health" component={HealthMonitor} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/advanced-analytics" component={AdvancedAnalytics} />
            <Route path="/ml-training" component={MLTraining} />
            <Route path="/ai-insights" component={AIInsights} />
            <Route path="/diagnostics" component={Diagnostics} />
            <Route path="/enhanced-trends-validation" component={EnhancedTrendsValidation} />
            <Route path="/fleet-performance-validation" component={FleetPerformanceValidation} />
            <Route path="/inventory-management" component={InventoryManagement} />
            <Route path="/optimization-tools" component={OptimizationTools} />
            <Route path="/work-orders" component={WorkOrders} />
            <Route path="/maintenance" component={MaintenanceSchedules} />
            <Route path="/maintenance-templates" component={MaintenanceTemplatesPage} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/reports" component={Reports} />
            <Route path="/crew-management" component={CrewManagement} />
            <Route path="/crew-scheduler" component={CrewScheduler} />
            <Route path="/hours-of-rest" component={HoursOfRest} />
            <Route path="/sensor-config" component={SensorConfig} />
            <Route path="/sensor-management" component={SensorManagement} />
            <Route path="/equipment-registry" component={EquipmentRegistry} />
            <Route path="/operating-parameters" component={OperatingParametersPage} />
            <Route path="/organization-management" component={OrganizationManagement} />
            <Route path="/pdm-pack" component={PdmPack} />
            <Route path="/settings" component={Settings} />
            <Route path="/transport-settings" component={TransportSettings} />
            <Route path="/storage-settings" component={StorageSettings} />
            <Route path="/system-administration" component={SystemAdministration} />
            <Route path="/telemetry-upload" component={ManualTelemetryUpload} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark" storageKey="arus-ui-theme">
          <Toaster />
          <Router />
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
