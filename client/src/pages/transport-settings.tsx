import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Settings, Wifi, WifiOff, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

type TransportSettings = {
  enableHttpIngest: boolean;
  enableMqttIngest: boolean;
  mqttHost: string;
  mqttPort: number;
  mqttUser: string;
  mqttPass: string;
  mqttTopic: string;
};

async function fetchTransportSettings(): Promise<TransportSettings> {
  const response = await fetch("/api/transport-settings");
  if (!response.ok) throw new Error("Failed to fetch transport settings");
  return response.json();
}

export default function TransportSettings() {
  const { toast } = useToast();
  const [isDirty, setIsDirty] = useState(false);
  
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["/api/transport-settings"],
    queryFn: fetchTransportSettings,
    refetchInterval: 30000,
  });

  const [formData, setFormData] = useState<TransportSettings>({
    enableHttpIngest: true,
    enableMqttIngest: false,
    mqttHost: "",
    mqttPort: 8883,
    mqttUser: "",
    mqttPass: "",
    mqttTopic: "fleet/+/telemetry"
  });

  // Update form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      setIsDirty(false);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: TransportSettings) => {
      return apiRequest("PUT", "/api/transport-settings", newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transport-settings"] });
      setIsDirty(false);
      toast({
        title: "Settings Updated",
        description: "Transport settings have been successfully updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error?.message || "Failed to update transport settings",
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: keyof TransportSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      setIsDirty(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading transport settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" />
            Error Loading Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Failed to load transport settings. Please check your connection and try again.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transport Settings</h1>
        <p className="text-muted-foreground">
          Configure telemetry ingestion methods and transport protocols for your fleet.
        </p>
      </div>

      {/* HTTP Ingestion Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {formData.enableHttpIngest ? (
              <Wifi className="mr-2 h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="mr-2 h-5 w-5 text-muted-foreground" />
            )}
            HTTP Ingestion
            <Badge variant={formData.enableHttpIngest ? "default" : "secondary"} className="ml-2">
              {formData.enableHttpIngest ? "Enabled" : "Disabled"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Accept telemetry data via HTTP POST requests. This is the primary ingestion method for edge devices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.enableHttpIngest}
              onCheckedChange={(checked) => handleInputChange("enableHttpIngest", checked)}
              data-testid="switch-http-ingest"
            />
            <Label htmlFor="http-ingest" className="text-sm font-medium">
              Enable HTTP telemetry ingestion
            </Label>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            When enabled, devices can send telemetry data to the <code>/ingest</code> endpoint.
          </p>
        </CardContent>
      </Card>

      {/* MQTT Ingestion Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {formData.enableMqttIngest ? (
              <Wifi className="mr-2 h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="mr-2 h-5 w-5 text-muted-foreground" />
            )}
            MQTT Ingestion
            <Badge variant={formData.enableMqttIngest ? "default" : "secondary"} className="ml-2">
              {formData.enableMqttIngest ? "Enabled" : "Disabled"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Subscribe to MQTT topics for real-time telemetry data streaming from IoT devices.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.enableMqttIngest}
              onCheckedChange={(checked) => handleInputChange("enableMqttIngest", checked)}
              data-testid="switch-mqtt-ingest"
            />
            <Label htmlFor="mqtt-ingest" className="text-sm font-medium">
              Enable MQTT telemetry ingestion
            </Label>
          </div>

          {formData.enableMqttIngest && (
            <>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mqtt-host" className="text-sm font-medium">MQTT Broker Host</Label>
                  <Input
                    id="mqtt-host"
                    placeholder="mqtt.example.com"
                    value={formData.mqttHost}
                    onChange={(e) => handleInputChange("mqttHost", e.target.value)}
                    data-testid="input-mqtt-host"
                  />
                </div>
                <div>
                  <Label htmlFor="mqtt-port" className="text-sm font-medium">Port</Label>
                  <Input
                    id="mqtt-port"
                    type="number"
                    placeholder="8883"
                    value={formData.mqttPort}
                    onChange={(e) => handleInputChange("mqttPort", parseInt(e.target.value) || 8883)}
                    data-testid="input-mqtt-port"
                  />
                </div>
                <div>
                  <Label htmlFor="mqtt-user" className="text-sm font-medium">Username</Label>
                  <Input
                    id="mqtt-user"
                    placeholder="mqtt_user"
                    value={formData.mqttUser}
                    onChange={(e) => handleInputChange("mqttUser", e.target.value)}
                    data-testid="input-mqtt-user"
                  />
                </div>
                <div>
                  <Label htmlFor="mqtt-pass" className="text-sm font-medium">Password</Label>
                  <Input
                    id="mqtt-pass"
                    type="password"
                    placeholder="••••••••"
                    value={formData.mqttPass}
                    onChange={(e) => handleInputChange("mqttPass", e.target.value)}
                    data-testid="input-mqtt-pass"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="mqtt-topic" className="text-sm font-medium">Topic Pattern</Label>
                <Input
                  id="mqtt-topic"
                  placeholder="fleet/+/telemetry"
                  value={formData.mqttTopic}
                  onChange={(e) => handleInputChange("mqttTopic", e.target.value)}
                  data-testid="input-mqtt-topic"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use + for single-level wildcards and # for multi-level wildcards
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isDirty && (
            <Badge variant="outline" className="text-orange-600">
              <AlertCircle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty || updateSettingsMutation.isPending}
            data-testid="button-reset-settings"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateSettingsMutation.isPending}
            data-testid="button-save-settings"
          >
            <Save className="w-4 h-4 mr-2" />
            {updateSettingsMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}