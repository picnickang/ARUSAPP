import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/sidebar";
import Dashboard from "@/pages/dashboard";
import Devices from "@/pages/devices";
import HealthMonitor from "@/pages/health-monitor";
import Analytics from "@/pages/analytics";
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
import { StorageSettings } from "@/pages/storage-settings";
import PdmPack from "@/pages/pdm-pack";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto lg:pl-0 pl-0">
        <div className="lg:p-0 pt-16 lg:pt-0"> {/* Add top padding for mobile menu button */}
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/devices" component={Devices} />
            <Route path="/health" component={HealthMonitor} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/work-orders" component={WorkOrders} />
            <Route path="/maintenance" component={MaintenanceSchedules} />
            <Route path="/alerts" component={Alerts} />
            <Route path="/reports" component={Reports} />
            <Route path="/crew-management" component={CrewManagement} />
            <Route path="/crew-scheduler" component={CrewScheduler} />
            <Route path="/hours-of-rest" component={HoursOfRest} />
            <Route path="/sensor-config" component={SensorConfig} />
            <Route path="/pdm-pack" component={PdmPack} />
            <Route path="/settings" component={Settings} />
            <Route path="/transport-settings" component={TransportSettings} />
            <Route path="/storage-settings" component={StorageSettings} />
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
        <div className="dark">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
