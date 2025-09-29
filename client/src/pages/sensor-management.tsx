import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnknownSignals } from "@/components/UnknownSignals";
import { SensorTemplates } from "@/components/SensorTemplates";
import { Settings, AlertTriangle, Wrench } from "lucide-react";

export default function SensorManagement() {
  const [activeTab, setActiveTab] = useState("unknown-signals");

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b bg-card">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Sensor Management</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Manage sensor classification, unknown signals, and sensor templates for automated configuration.
        </p>
      </div>

      <div className="flex-1 p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="unknown-signals" className="flex items-center gap-2" data-testid="tab-unknown-signals">
              <AlertTriangle className="h-4 w-4" />
              Unknown Signals
            </TabsTrigger>
            <TabsTrigger value="sensor-templates" className="flex items-center gap-2" data-testid="tab-sensor-templates">
              <Wrench className="h-4 w-4" />
              Sensor Templates
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4">
            <TabsContent value="unknown-signals" className="h-full" data-testid="content-unknown-signals">
              <UnknownSignals />
            </TabsContent>

            <TabsContent value="sensor-templates" className="h-full" data-testid="content-sensor-templates">
              <SensorTemplates />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}