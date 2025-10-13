import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { MobileNavigation } from "@/components/MobileNavigation";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useIsMobile } from "@/components/MobileTouchControls";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import QuickActionsFAB from "@/components/QuickActionsFAB";
import useKeyboardShortcuts from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initializeGlobalErrorHandlers } from "@/lib/errorHandler";
import { FocusModeProvider } from "@/contexts/FocusModeContext";
import { useEffect } from "react";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import VesselManagement from "@/pages/vessel-management";
import VesselDetail from "@/pages/vessel-detail";
import HealthMonitor from "@/pages/health-monitor";
import AnalyticsConsolidated from "@/pages/analytics-consolidated";
import MLAIConsolidated from "@/pages/ml-ai-consolidated";
import InventoryManagement from "@/pages/inventory-management";
import OptimizationTools from "@/pages/optimization-tools";
import WorkOrders from "@/pages/work-orders";
import MaintenanceSchedules from "@/pages/maintenance-schedules";
import Alerts from "@/pages/alerts";
import Reports from "@/pages/reports";
import AIInsights from "@/pages/ai-insights";
import Settings from "@/pages/settings";
import TransportSettings from "@/pages/transport-settings";
import ManualTelemetryUpload from "@/pages/manual-telemetry-upload";
import CrewManagement from "@/pages/crew-management";
import CrewScheduler from "@/pages/crew-scheduler";
import HoursOfRest from "@/pages/hours-of-rest";
import SensorConfig from "@/pages/sensor-config";
import SensorOptimization from "@/pages/sensor-optimization";
import EquipmentRegistry from "@/pages/equipment-registry";
import OrganizationManagement from "@/pages/organization-management";
import { StorageSettings } from "@/pages/storage-settings";
import SystemAdministration from "@/pages/system-administration";
import PdmPack from "@/pages/pdm-pack";
import SensorManagement from "@/pages/sensor-management";
import Diagnostics from "@/pages/diagnostics";
import OperatingParametersPage from "@/pages/OperatingParametersPage";
import MaintenanceTemplatesPage from "@/pages/MaintenanceTemplatesPage";
import MLTrainingPage from "@/pages/ml-training";
import NotFound from "@/pages/not-found";

function Router() {
  const isMobile = useIsMobile();
  
  // Enable real-time multi-device synchronization
  useRealtimeSync();
  
  // Enable global keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      {!isMobile && <Sidebar />}
      
      {/* Mobile Top Navigation - shown on mobile */}
      {isMobile && <MobileNavigation />}
      
      {/* Bottom Navigation - shown on mobile */}
      {isMobile && <BottomNavigation />}
      
      <main className="flex-1 overflow-auto">
        <div className={isMobile ? "mobile-container pt-16 bottom-nav-safe" : "lg:p-0"}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/devices" component={Devices} />
            <Route path="/vessels/:id" component={VesselDetail} />
            <Route path="/vessel-management" component={VesselManagement} />
            <Route path="/health" component={HealthMonitor} />
            <Route path="/analytics" component={AnalyticsConsolidated} />
            <Route path="/ml-ai" component={MLAIConsolidated} />
            <Route path="/ml-training" component={MLTrainingPage} />
            <Route path="/diagnostics" component={Diagnostics} />
            <Route path="/inventory-management" component={InventoryManagement} />
            <Route path="/optimization-tools" component={OptimizationTools} />
            <Route path="/work-orders" component={WorkOrders} />
            <Route path="/maintenance" component={MaintenanceSchedules} />
            <Route path="/maintenance-templates" component={MaintenanceTemplatesPage} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/reports" component={Reports} />
            <Route path="/ai-insights" component={AIInsights} />
            <Route path="/crew-management" component={CrewManagement} />
            <Route path="/crew-scheduler" component={CrewScheduler} />
            <Route path="/hours-of-rest" component={HoursOfRest} />
            <Route path="/sensor-config" component={SensorConfig} />
            <Route path="/sensor-optimization" component={SensorOptimization} />
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
        
        {/* Quick Actions FAB - available on all pages */}
        <QuickActionsFAB />
        
        {/* Keyboard Shortcuts Dialog */}
        <KeyboardShortcutsDialog />
      </main>
    </div>
  );
}

function App() {
  // Setup global error handler on mount
  useEffect(() => {
    initializeGlobalErrorHandlers();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ThemeProvider defaultTheme="dark" storageKey="arus-ui-theme">
          <FocusModeProvider>
            <Toaster />
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </FocusModeProvider>
        </ThemeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
