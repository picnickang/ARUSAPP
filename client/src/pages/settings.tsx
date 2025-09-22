import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchSettings, updateSettings } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import type { SystemSettings } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: fetchSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Partial<SystemSettings>) => updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Updated",
        description: "System settings have been successfully updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-destructive">Error loading settings: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">System Settings</h2>
            <p className="text-muted-foreground">Configure system behavior and features</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={handleSave}
              disabled={updateSettingsMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-save-settings"
            >
              {updateSettingsMutation.isPending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Security & Authentication</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure authentication and security features
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="hmac-required">HMAC Authentication</Label>
                <p className="text-sm text-muted-foreground">
                  Require HMAC signatures for all API requests
                </p>
              </div>
              <Switch
                id="hmac-required"
                checked={formData.hmacRequired || false}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, hmacRequired: checked }))
                }
                data-testid="switch-hmac-required"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-payload">Max Payload Size (bytes)</Label>
              <Input
                id="max-payload"
                type="number"
                value={formData.maxPayloadBytes || 2097152}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, maxPayloadBytes: parseInt(e.target.value) }))
                }
                data-testid="input-max-payload"
              />
              <p className="text-sm text-muted-foreground">
                Maximum allowed payload size for API requests
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="strict-units">Strict Units Validation</Label>
                <p className="text-sm text-muted-foreground">
                  Require unit specifications for all sensor metrics
                </p>
              </div>
              <Switch
                id="strict-units"
                checked={formData.strictUnits || false}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, strictUnits: checked }))
                }
                data-testid="switch-strict-units"
              />
            </div>
          </CardContent>
        </Card>

        {/* AI/ML Settings */}
        <Card>
          <CardHeader>
            <CardTitle>AI & Machine Learning</CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure predictive maintenance and AI features
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="llm-enabled">LLM Processing</Label>
                <p className="text-sm text-muted-foreground">
                  Enable AI-powered analytics and insights
                </p>
              </div>
              <Switch
                id="llm-enabled"
                checked={formData.llmEnabled || false}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, llmEnabled: checked }))
                }
                data-testid="switch-llm-enabled"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="llm-model">LLM Model</Label>
              <Select 
                value={formData.llmModel || "gpt-4o-mini"}
                onValueChange={(value) => 
                  setFormData(prev => ({ ...prev, llmModel: value }))
                }
              >
                <SelectTrigger data-testid="select-llm-model">
                  <SelectValue placeholder="Select LLM model" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                  <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Language model for generating insights and reports
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
            <p className="text-sm text-muted-foreground">
              Current system status and configuration
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">System ID</Label>
                  <p className="text-sm text-muted-foreground font-mono" data-testid="text-system-id">
                    {settings?.id || "system"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">HMAC Required</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-hmac-status">
                    {settings?.hmacRequired ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Max Payload</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-max-payload">
                    {(settings?.maxPayloadBytes || 0).toLocaleString()} bytes
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">LLM Processing</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-llm-status">
                    {settings?.llmEnabled ? "Enabled" : "Disabled"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Current Model</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-current-model">
                    {settings?.llmModel || "gpt-4o-mini"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Units Validation</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-units-validation">
                    {settings?.strictUnits ? "Strict" : "Flexible"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
