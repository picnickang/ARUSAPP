import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, Clock, User, Smartphone } from "lucide-react";
import { useResolveConflict, useAutoResolveConflicts } from "@/hooks/useConflictResolution";
import { useToast } from "@/hooks/use-toast";
import type { SyncConflict } from "@shared/sync-conflicts-schema";
import { formatDistanceToNow } from "date-fns";

// Safe JSON parser for conflict values (handles both JSON strings and plain values)
function safeParseConflictValue(value: string | null): any {
  // Explicitly check for null/undefined (preserve empty strings!)
  if (value === null || value === undefined) return null;
  
  // Empty string is a valid value, don't convert to null
  if (value === "") return "";
  
  try {
    return JSON.parse(value);
  } catch {
    // If not valid JSON, return the string as-is
    return value;
  }
}

// Format value for display
function formatValueForDisplay(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

interface ConflictResolutionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conflicts: SyncConflict[];
}

export function ConflictResolutionModal({
  open,
  onOpenChange,
  conflicts,
}: ConflictResolutionModalProps) {
  const { toast } = useToast();
  const resolveConflict = useResolveConflict();
  const autoResolve = useAutoResolveConflicts();
  
  const [resolutions, setResolutions] = useState<Record<string, { choice: 'local' | 'server', value: any }>>({});

  const handleChoiceChange = (conflictId: string, choice: 'local' | 'server', conflict: SyncConflict) => {
    const value = choice === 'local' 
      ? safeParseConflictValue(conflict.localValue)
      : safeParseConflictValue(conflict.serverValue);
    
    setResolutions(prev => ({
      ...prev,
      [conflictId]: { choice, value }
    }));
  };

  const handleResolveAll = async () => {
    const resolvedBy = 'user@example.com'; // TODO: Get from auth context

    // Split conflicts into auto-resolvable and manual
    const autoResolvable = conflicts.filter(c => !c.isSafetyCritical && !resolutions[c.id]);
    const manual = conflicts.filter(c => c.isSafetyCritical || resolutions[c.id]);

    try {
      // Auto-resolve non-safety-critical conflicts
      if (autoResolvable.length > 0) {
        await autoResolve.mutateAsync({
          conflictIds: autoResolvable.map(c => c.id),
          resolvedBy,
        });
      }

      // Manually resolve conflicts with user choices
      for (const conflict of manual) {
        const resolution = resolutions[conflict.id];
        if (resolution) {
          await resolveConflict.mutateAsync({
            conflictId: conflict.id,
            resolvedValue: resolution.value,
            resolvedBy,
          });
        }
      }

      toast({
        title: "Conflicts Resolved",
        description: `Successfully resolved ${conflicts.length} conflict(s)`,
      });

      onOpenChange(false);
      setResolutions({});
    } catch (error) {
      toast({
        title: "Resolution Failed",
        description: error instanceof Error ? error.message : "Failed to resolve conflicts",
        variant: "destructive",
      });
    }
  };

  const canResolve = conflicts.every(c => !c.isSafetyCritical || resolutions[c.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="modal-conflict-resolution">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Data Sync Conflicts Detected
          </DialogTitle>
          <DialogDescription>
            Multiple devices have modified the same data. Please review and resolve the conflicts below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {conflicts.map((conflict) => (
            <Card key={conflict.id} className="border-amber-200 dark:border-amber-900" data-testid={`card-conflict-${conflict.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {conflict.tableName}.{conflict.fieldName}
                      {conflict.isSafetyCritical && (
                        <Badge variant="destructive" className="ml-2">
                          Safety Critical
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Record ID: {conflict.recordId.slice(0, 8)}...
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {conflict.resolutionStrategy}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {conflict.isSafetyCritical ? (
                  <RadioGroup
                    value={resolutions[conflict.id]?.choice}
                    onValueChange={(choice) => handleChoiceChange(conflict.id, choice as 'local' | 'server', conflict)}
                    data-testid={`radio-group-${conflict.id}`}
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Local Device Value */}
                      <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent transition-colors">
                        <RadioGroupItem value="local" id={`${conflict.id}-local`} data-testid={`radio-local-${conflict.id}`} />
                        <div className="flex-1 space-y-1">
                          <Label htmlFor={`${conflict.id}-local`} className="font-medium cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              Your Device
                            </div>
                          </Label>
                          <p className="text-2xl font-bold" data-testid={`text-local-value-${conflict.id}`}>
                            {formatValueForDisplay(safeParseConflictValue(conflict.localValue))}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {conflict.localUser}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {conflict.localTimestamp ? formatDistanceToNow(new Date(conflict.localTimestamp), { addSuffix: true }) : 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Server Value */}
                      <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent transition-colors">
                        <RadioGroupItem value="server" id={`${conflict.id}-server`} data-testid={`radio-server-${conflict.id}`} />
                        <div className="flex-1 space-y-1">
                          <Label htmlFor={`${conflict.id}-server`} className="font-medium cursor-pointer">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              {conflict.serverDevice || 'Server'}
                            </div>
                          </Label>
                          <p className="text-2xl font-bold" data-testid={`text-server-value-${conflict.id}`}>
                            {formatValueForDisplay(safeParseConflictValue(conflict.serverValue))}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {conflict.serverUser}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {conflict.serverTimestamp ? formatDistanceToNow(new Date(conflict.serverTimestamp), { addSuffix: true }) : 'Unknown'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                ) : (
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">Auto-Resolvable</p>
                        <p className="text-sm text-muted-foreground">
                          This conflict will be automatically resolved using the "{conflict.resolutionStrategy}" strategy.
                        </p>
                        <div className="mt-2 grid gap-2 md:grid-cols-2 text-xs">
                          <div data-testid={`text-auto-local-${conflict.id}`}>
                            <span className="font-medium">Your value:</span> {formatValueForDisplay(safeParseConflictValue(conflict.localValue))}
                          </div>
                          <div data-testid={`text-auto-server-${conflict.id}`}>
                            <span className="font-medium">Server value:</span> {formatValueForDisplay(safeParseConflictValue(conflict.serverValue))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-resolution"
          >
            Cancel
          </Button>
          <Button
            onClick={handleResolveAll}
            disabled={!canResolve || resolveConflict.isPending || autoResolve.isPending}
            data-testid="button-resolve-all"
          >
            {resolveConflict.isPending || autoResolve.isPending ? "Resolving..." : `Resolve ${conflicts.length} Conflict${conflicts.length > 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
