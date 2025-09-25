import { useState } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, RefreshCw, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Component for managing device ID persistence and registration.
 * Implements Hub & Sync device registry functionality.
 */
export function DeviceIdManager() {
  const { deviceId, isLoading, setNewDeviceId, clearDeviceId } = useDeviceId();
  const [customId, setCustomId] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { toast } = useToast();

  const handleCopyDeviceId = async () => {
    if (!deviceId) return;
    
    try {
      await navigator.clipboard.writeText(deviceId);
      toast({
        title: "Device ID Copied",
        description: "Device ID has been copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy device ID to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleSetCustomId = () => {
    if (!customId.trim()) {
      toast({
        title: "Invalid Device ID",
        description: "Please enter a valid device ID",
        variant: "destructive",
      });
      return;
    }
    
    setNewDeviceId(customId.trim());
    setCustomId('');
    toast({
      title: "Device ID Updated",
      description: "Custom device ID has been set successfully",
    });
  };

  const handleRegenerateId = async () => {
    setIsRegenerating(true);
    
    // Add a small delay for visual feedback
    setTimeout(() => {
      clearDeviceId();
      setIsRegenerating(false);
      toast({
        title: "Device ID Regenerated",
        description: "A new device ID has been generated and saved",
      });
    }, 1000);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Device Registration
          </CardTitle>
          <CardDescription>
            Loading device identification...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Device Registration
        </CardTitle>
        <CardDescription>
          Manage your device identification for Hub & Sync functionality.
          This device ID is automatically included in all API requests.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Device ID */}
        <div className="space-y-2">
          <Label htmlFor="current-device-id">Current Device ID</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="current-device-id"
              value={deviceId || 'Not available'}
              readOnly
              className="font-mono text-sm"
              data-testid="input-current-device-id"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyDeviceId}
              disabled={!deviceId}
              data-testid="button-copy-device-id"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {deviceId ? 'Active' : 'Unavailable'}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Automatically sent as X-Device-Id header
            </span>
          </div>
        </div>

        {/* Custom Device ID */}
        <div className="space-y-2">
          <Label htmlFor="custom-device-id">Set Custom Device ID</Label>
          <div className="flex items-center space-x-2">
            <Input
              id="custom-device-id"
              placeholder="device-custom-12345"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="font-mono text-sm"
              data-testid="input-custom-device-id"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleSetCustomId}
              disabled={!customId.trim()}
              data-testid="button-set-custom-id"
            >
              Set
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use a custom device identifier for specific deployments or testing.
          </p>
        </div>

        {/* Regenerate Device ID */}
        <div className="space-y-2">
          <Label>Generate New Device ID</Label>
          <Button
            variant="outline"
            onClick={handleRegenerateId}
            disabled={isRegenerating}
            className="w-full"
            data-testid="button-regenerate-device-id"
          >
            {isRegenerating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Device ID
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground">
            Creates a new unique device identifier. Previous device data may not be accessible.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}