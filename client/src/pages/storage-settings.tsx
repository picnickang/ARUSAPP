import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useDeleteMutation, useCustomMutation } from "@/hooks/useCrudMutations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, TestTube2, Settings, Database, HardDrive, CheckCircle, XCircle, AlertTriangle, Server } from "lucide-react";
import { formatTimeSgt } from "@/lib/time-utils";
import type { StorageConfig, InsertStorageConfig, OpsDbStaged } from "@shared/schema";

interface ProviderTestResult {
  ok: boolean;
  detail?: string;
}

export function StorageSettings() {
  const { toast } = useToast();

  // State for new configuration dialog
  const [showNewConfig, setShowNewConfig] = useState(false);
  const [newConfig, setNewConfig] = useState<InsertStorageConfig>({
    id: "",
    kind: "object",
    provider: "s3",
    isDefault: false,
    mirror: false,
    cfg: {}
  });

  // State for operational database staging
  const [newOpsDbUrl, setNewOpsDbUrl] = useState("");
  const [testResults, setTestResults] = useState<Record<string, ProviderTestResult>>({});

  // Fetch storage configurations
  const { data: storageConfigs = [], isLoading: isLoadingConfigs } = useQuery({
    queryKey: ["/api/storage/config"],
    refetchInterval: 10000,
  });

  // Fetch current operational database info
  const { data: currentOpsDb } = useQuery({
    queryKey: ["/api/storage/ops-db/current"],
  });

  // Fetch staged operational database
  const { data: stagedOpsDb } = useQuery({
    queryKey: ["/api/storage/ops-db/staged"],
  });

  // Create/Update storage configuration mutation using reusable hook
  const saveConfigMutation = useCustomMutation<InsertStorageConfig, any>({
    mutationFn: async (config) => {
      return apiRequest('POST', '/api/storage/config', config);
    },
    invalidateKeys: ["/api/storage/config"],
    successMessage: "Storage configuration saved successfully",
    onSuccess: () => {
      setShowNewConfig(false);
      resetNewConfig();
    },
  });

  // Delete storage configuration mutation using reusable hook
  const deleteConfigMutation = useDeleteMutation({
    endpoint: '/api/storage/config',
    invalidateKeys: ["/api/storage/config"],
    successMessage: "Storage configuration deleted",
  });

  // Test storage configuration mutation using reusable hook
  const testConfigMutation = useCustomMutation<InsertStorageConfig, ProviderTestResult>({
    mutationFn: async (config) => {
      return apiRequest('POST', '/api/storage/config/test', config);
    },
    onSuccess: (result, config) => {
      setTestResults(prev => ({ ...prev, [config.id]: result }));
      toast({
        title: result.ok ? "Connection Successful" : "Connection Failed",
        description: result.detail || (result.ok ? "Provider configuration is valid" : "Check configuration details"),
        variant: result.ok ? "default" : "destructive"
      });
    },
  });

  // Stage operational database mutation using reusable hook
  const stageOpsDbMutation = useCustomMutation<string, any>({
    mutationFn: async (url) => {
      return apiRequest('POST', '/api/storage/ops-db/stage', { url });
    },
    invalidateKeys: ["/api/storage/ops-db/staged"],
    successMessage: "Database URL staged for next restart",
    onSuccess: () => setNewOpsDbUrl(""),
  });

  // Test operational database mutation using reusable hook
  const testOpsDbMutation = useCustomMutation<string, ProviderTestResult>({
    mutationFn: async (url) => {
      return apiRequest('POST', '/api/storage/ops-db/test', { url });
    },
    onSuccess: (result) => {
      toast({
        title: result.ok ? "Database Connection Successful" : "Database Connection Failed",
        description: result.detail || (result.ok ? "Database URL is valid" : "Check connection string"),
        variant: result.ok ? "default" : "destructive"
      });
    },
  });

  const resetNewConfig = () => {
    setNewConfig({
      id: "",
      kind: "object",
      provider: "s3",
      isDefault: false,
      mirror: false,
      cfg: {}
    });
  };

  const handleConfigChange = (field: keyof InsertStorageConfig, value: any) => {
    setNewConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleCfgChange = (key: string, value: string) => {
    setNewConfig(prev => ({
      ...prev,
      cfg: { ...prev.cfg, [key]: value }
    }));
  };

  const getProviderFields = (provider: string) => {
    switch (provider) {
      case 's3':
        return ['endpoint', 'region', 'accessKeyId', 'secretAccessKey', 'bucket', 'forcePathStyle'];
      case 'gcs':
        return ['projectId', 'bucket', 'keyFilename'];
      case 'azure_blob':
        return ['accountName', 'accountKey', 'containerName'];
      case 'gdrive':
        return ['serviceAccountJson', 'folderId'];
      case 'sftp':
        return ['host', 'port', 'username', 'password', 'path'];
      case 'dropbox':
        return ['accessToken', 'path'];
      default:
        return ['endpoint', 'apiKey'];
    }
  };

  const getStatusIcon = (config: StorageConfig) => {
    const testResult = testResults[config.id];
    if (testResult) {
      return testResult.ok ? 
        <CheckCircle className="h-4 w-4 text-green-500" /> : 
        <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <AlertTriangle className="h-4 w-4 text-gray-400" />;
  };

  if (isLoadingConfigs) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Storage Settings
          </h1>
        </div>
        <div className="animate-pulse space-y-4">
          <Card className="h-32" />
          <Card className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="storage-settings-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Storage Settings
        </h1>
      </div>

      <Tabs defaultValue="providers" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="providers" data-testid="tab-providers">
            <HardDrive className="h-4 w-4 mr-2" />
            Storage Providers
          </TabsTrigger>
          <TabsTrigger value="database" data-testid="tab-database">
            <Database className="h-4 w-4 mr-2" />
            Operational Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Storage Providers</h2>
              <p className="text-sm text-muted-foreground">
                Manage object storage and export destinations
              </p>
            </div>
            <Dialog open={showNewConfig} onOpenChange={setShowNewConfig}>
              <DialogTrigger asChild>
                <Button onClick={() => setShowNewConfig(true)} data-testid="button-add-provider">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Storage Provider</DialogTitle>
                  <DialogDescription>
                    Configure a new storage provider for object storage or data exports
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="config-id">Configuration ID</Label>
                      <Input
                        id="config-id"
                        value={newConfig.id}
                        onChange={(e) => handleConfigChange('id', e.target.value)}
                        placeholder="my-s3-config"
                        data-testid="input-config-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="config-kind">Kind</Label>
                      <Select value={newConfig.kind} onValueChange={(value) => handleConfigChange('kind', value)}>
                        <SelectTrigger data-testid="select-config-kind">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="object">Object Storage</SelectItem>
                          <SelectItem value="export">Export Destination</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="config-provider">Provider</Label>
                    <Select value={newConfig.provider} onValueChange={(value) => handleConfigChange('provider', value)}>
                      <SelectTrigger data-testid="select-config-provider">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s3">Amazon S3 / Compatible</SelectItem>
                        <SelectItem value="gcs">Google Cloud Storage</SelectItem>
                        <SelectItem value="azure_blob">Azure Blob Storage</SelectItem>
                        <SelectItem value="gdrive">Google Drive</SelectItem>
                        <SelectItem value="sftp">SFTP</SelectItem>
                        <SelectItem value="dropbox">Dropbox</SelectItem>
                        <SelectItem value="b2">Backblaze B2</SelectItem>
                        <SelectItem value="webdav">WebDAV</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="config-default"
                      checked={newConfig.isDefault}
                      onCheckedChange={(checked) => handleConfigChange('isDefault', checked)}
                      data-testid="switch-config-default"
                    />
                    <Label htmlFor="config-default">Set as default for this kind</Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="config-mirror"
                      checked={newConfig.mirror}
                      onCheckedChange={(checked) => handleConfigChange('mirror', checked)}
                      data-testid="switch-config-mirror"
                    />
                    <Label htmlFor="config-mirror">Mirror exports to multiple targets</Label>
                  </div>

                  <div className="space-y-3">
                    <Label>Provider Configuration</Label>
                    {getProviderFields(newConfig.provider).map((field) => (
                      <div key={field}>
                        <Label className="text-xs text-muted-foreground capitalize">
                          {field.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                        {field === 'serviceAccountJson' ? (
                          <Textarea
                            value={newConfig.cfg[field] || ''}
                            onChange={(e) => handleCfgChange(field, e.target.value)}
                            placeholder="Paste service account JSON here"
                            className="font-mono text-xs"
                            rows={4}
                            data-testid={`textarea-cfg-${field}`}
                          />
                        ) : field.toLowerCase().includes('password') || field.toLowerCase().includes('key') || field.toLowerCase().includes('secret') ? (
                          <Input
                            type="password"
                            value={newConfig.cfg[field] || ''}
                            onChange={(e) => handleCfgChange(field, e.target.value)}
                            placeholder={`Enter ${field}`}
                            data-testid={`input-cfg-${field}`}
                          />
                        ) : field === 'forcePathStyle' ? (
                          <Select 
                            value={newConfig.cfg[field]?.toString() || 'false'} 
                            onValueChange={(value) => handleCfgChange(field, value === 'true')}
                          >
                            <SelectTrigger data-testid={`select-cfg-${field}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">False</SelectItem>
                              <SelectItem value="true">True</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            value={newConfig.cfg[field] || ''}
                            onChange={(e) => handleCfgChange(field, e.target.value)}
                            placeholder={`Enter ${field}`}
                            data-testid={`input-cfg-${field}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => testConfigMutation.mutate(newConfig)}
                      disabled={testConfigMutation.isPending || !newConfig.id}
                      data-testid="button-test-config"
                    >
                      <TestTube2 className="h-4 w-4 mr-2" />
                      Test Configuration
                    </Button>
                    <Button
                      onClick={() => saveConfigMutation.mutate(newConfig)}
                      disabled={saveConfigMutation.isPending || !newConfig.id}
                      data-testid="button-save-config"
                    >
                      Save Configuration
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {storageConfigs.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <HardDrive className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      No Storage Providers
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      Configure storage providers for object storage and data exports
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              storageConfigs.map((config: StorageConfig) => (
                <Card key={config.id} data-testid={`card-provider-${config.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">{config.id}</CardTitle>
                        {config.isDefault && (
                          <Badge variant="secondary" data-testid={`badge-default-${config.id}`}>
                            Default
                          </Badge>
                        )}
                        {config.mirror && (
                          <Badge variant="outline" data-testid={`badge-mirror-${config.id}`}>
                            Mirror
                          </Badge>
                        )}
                        {getStatusIcon(config)}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testConfigMutation.mutate(config)}
                          disabled={testConfigMutation.isPending}
                          data-testid={`button-test-${config.id}`}
                        >
                          <TestTube2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteConfigMutation.mutate(config.id)}
                          disabled={deleteConfigMutation.isPending}
                          data-testid={`button-delete-${config.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription>
                      {config.kind} • {config.provider} • Created {formatTimeSgt(new Date(config.createdAt!))}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      <div>Configuration keys: {Object.keys(config.cfg).join(', ')}</div>
                      {testResults[config.id] && (
                        <div className={`mt-2 ${testResults[config.id].ok ? 'text-green-600' : 'text-red-600'}`}>
                          Test result: {testResults[config.id].ok ? 'Success' : 'Failed'}
                          {testResults[config.id].detail && ` - ${testResults[config.id].detail}`}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="database" className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold">Operational Database Management</h2>
            <p className="text-sm text-muted-foreground">
              Manage the primary operational database connection
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Current Database
                </CardTitle>
                <CardDescription>Active database connection</CardDescription>
              </CardHeader>
              <CardContent>
                {currentOpsDb ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Driver</Label>
                      <div className="font-mono text-sm" data-testid="text-current-driver">
                        {currentOpsDb.driver}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Connection String</Label>
                      <div className="font-mono text-sm truncate" data-testid="text-current-url">
                        {currentOpsDb.database_url?.replace(/:[^:@]*@/, ':***@') || 'Not configured'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading...</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Staged Database
                </CardTitle>
                <CardDescription>Database for next application restart</CardDescription>
              </CardHeader>
              <CardContent>
                {stagedOpsDb ? (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Connection String</Label>
                      <div className="font-mono text-sm truncate" data-testid="text-staged-url">
                        {stagedOpsDb.url?.replace(/:[^:@]*@/, ':***@') || 'None staged'}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Staged At</Label>
                      <div className="text-sm" data-testid="text-staged-date">
                        {formatTimeSgt(new Date(stagedOpsDb.createdAt!))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">No database staged</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Stage New Database</CardTitle>
              <CardDescription>
                Configure a new database connection that will be used after the next restart
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Only PostgreSQL connections are supported. Changes take effect after application restart.
                </AlertDescription>
              </Alert>
              
              <div>
                <Label htmlFor="ops-db-url">Database Connection String</Label>
                <Input
                  id="ops-db-url"
                  type="password"
                  value={newOpsDbUrl}
                  onChange={(e) => setNewOpsDbUrl(e.target.value)}
                  placeholder="postgres://user:password@host:port/database"
                  className="font-mono"
                  data-testid="input-ops-db-url"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => testOpsDbMutation.mutate(newOpsDbUrl)}
                  disabled={testOpsDbMutation.isPending || !newOpsDbUrl}
                  data-testid="button-test-ops-db"
                >
                  <TestTube2 className="h-4 w-4 mr-2" />
                  Test Connection
                </Button>
                <Button
                  onClick={() => stageOpsDbMutation.mutate(newOpsDbUrl)}
                  disabled={stageOpsDbMutation.isPending || !newOpsDbUrl}
                  data-testid="button-stage-ops-db"
                >
                  Stage Database
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}