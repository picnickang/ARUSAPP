import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, RefreshCw, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { fetchSettings, updateSettings } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import type { SystemSettings } from "@shared/schema";
import { DeviceIdManager } from "@/components/DeviceIdManager";

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

  // Factory Reset Mutation (from Windows batch patch integration)
  const factoryResetMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/admin/factory-reset', { 
      confirmationCode: 'FACTORY_RESET_CONFIRMED' 
    }),
    onSuccess: (response: any) => {
      toast({
        title: "Factory Reset Complete",
        description: `${response.message}. ${response.clearedTables} tables cleared.`,
        variant: "destructive",
      });
      // Invalidate all queries since all data has been wiped
      queryClient.clear();
    },
    onError: (error) => {
      toast({
        title: "Factory Reset Failed",
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

            <div className="space-y-2">
              <Label htmlFor="openai-api-key">OpenAI API Key</Label>
              <Input
                id="openai-api-key"
                type="password"
                placeholder="sk-..."
                value={formData.openaiApiKey || ""}
                onChange={(e) => 
                  setFormData(prev => ({ ...prev, openaiApiKey: e.target.value }))
                }
                data-testid="input-openai-api-key"
              />
              <p className="text-sm text-muted-foreground">
                OpenAI API key for AI-powered insights and analysis
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Device Registration (Hub & Sync) */}
        <DeviceIdManager />

        {/* Dangerous Operations (Windows batch patch integration) */}
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Dangerous Operations
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              <strong>WARNING:</strong> These operations cannot be undone and will permanently affect system data.
              <br />
              <strong>Integration:</strong> Windows batch patch administrative functionality
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Label className="text-destructive font-semibold">Factory Reset</Label>
                  <p className="text-sm text-muted-foreground max-w-md">
                    <strong className="text-destructive">DANGER:</strong> This will permanently delete ALL system data including:
                  </p>
                  <ul className="text-xs text-muted-foreground ml-4 space-y-1">
                    <li>• All crew members, vessels, and assignments</li>
                    <li>• All telemetry data and device configurations</li>
                    <li>• All work orders and maintenance schedules</li>
                    <li>• All alerts, logs, and system history</li>
                    <li>• All user preferences and settings</li>
                  </ul>
                  <p className="text-sm text-destructive font-medium">
                    This action cannot be undone. The system will be reset to initial state.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={factoryResetMutation.isPending}
                      data-testid="button-factory-reset"
                      className="ml-4"
                    >
                      {factoryResetMutation.isPending ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Factory Reset
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-5 h-5" />
                        Confirm Factory Reset
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-3">
                        <div className="text-base font-medium text-destructive">
                          ⚠️ This will permanently delete ALL system data
                        </div>
                        <div className="text-sm">
                          You are about to perform a complete factory reset that will:
                        </div>
                        <ul className="text-sm space-y-1 ml-4">
                          <li>• Delete all crew members, vessels, and assignments</li>
                          <li>• Remove all telemetry data and equipment records</li>
                          <li>• Clear all work orders and maintenance schedules</li>
                          <li>• Erase all alerts, logs, and system history</li>
                          <li>• Reset all settings to defaults</li>
                        </ul>
                        <div className="text-sm font-semibold text-destructive bg-destructive/10 p-3 rounded border border-destructive/20">
                          <strong>THIS ACTION CANNOT BE UNDONE</strong>
                          <br />
                          Make sure you have backups of any important data before proceeding.
                        </div>
                        <div className="text-sm">
                          Are you absolutely sure you want to continue?
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel data-testid="button-cancel-factory-reset">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => factoryResetMutation.mutate()}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        data-testid="button-confirm-factory-reset"
                      >
                        Yes, Reset Everything
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
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
                <div>
                  <Label className="text-sm font-medium">API Key Status</Label>
                  <p className="text-sm text-muted-foreground" data-testid="text-api-key-status">
                    {settings?.openaiApiKey ? "Configured" : "Not Set"}
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
