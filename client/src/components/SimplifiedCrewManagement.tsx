import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, Power, Ship, Trash2, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

// Crew member interface with onDuty field from schema enhancement
interface Crew {
  id: string;
  name: string;
  rank: string;
  vesselId: string;
  active: boolean;
  onDuty: boolean;  // New field from Windows batch patch integration
}

interface Vessel {
  id: string;
  name: string;
  imo?: string;
  active: boolean;
}

export function SimplifiedCrewManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch crew members
  const { data: crew = [], isLoading: crewLoading } = useQuery<Crew[]>({
    queryKey: ['/api/crew'],
    refetchInterval: 30000
  });

  // Fetch vessels for reassignment dropdown
  const { data: vessels = [], isLoading: vesselsLoading } = useQuery<Vessel[]>({
    queryKey: ['/api/vessels'],
    refetchInterval: 60000
  });

  // Toggle duty status mutation (from Windows batch patch)
  const toggleDutyMutation = useMutation({
    mutationFn: (crewId: string) => 
      apiRequest('POST', `/api/crew/${crewId}/toggle-duty`),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/crew'] });
      toast({ 
        title: "Duty Status Updated", 
        description: response.message 
      });
    },
    onError: () => {
      toast({ 
        title: "Failed to toggle duty status", 
        variant: "destructive" 
      });
    }
  });

  // Crew reassignment mutation (existing endpoint)
  const reassignMutation = useMutation({
    mutationFn: ({ crewId, vesselId }: { crewId: string; vesselId: string }) =>
      apiRequest('PUT', `/api/crew/${crewId}`, { vesselId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crew'] });
      toast({ title: "Crew reassigned successfully" });
    },
    onError: () => {
      toast({ 
        title: "Failed to reassign crew member", 
        variant: "destructive" 
      });
    }
  });

  // Crew removal mutation (existing endpoint)
  const removeCrewMutation = useMutation({
    mutationFn: (crewId: string) => 
      apiRequest('DELETE', `/api/crew/${crewId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crew'] });
      toast({ title: "Crew member removed successfully" });
    },
    onError: () => {
      toast({ 
        title: "Failed to remove crew member", 
        variant: "destructive" 
      });
    }
  });

  const handleToggleDuty = (crewId: string) => {
    toggleDutyMutation.mutate(crewId);
  };

  const handleReassign = (crewId: string, vesselId: string) => {
    if (!vesselId) {
      toast({
        title: "Please select a vessel",
        variant: "destructive"
      });
      return;
    }
    reassignMutation.mutate({ crewId, vesselId });
  };

  const handleRemoveCrew = (crewId: string) => {
    removeCrewMutation.mutate(crewId);
  };

  const getVesselName = (vesselId: string) => {
    const vessel = vessels.find((v: Vessel) => v.id === vesselId);
    return vessel ? vessel.name : vesselId;
  };

  const getAvailableVessels = (currentVesselId: string) => {
    return vessels.filter((vessel: Vessel) => vessel.active && vessel.id !== currentVesselId);
  };

  if (crewLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Simplified Crew Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            Loading crew members...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Simplified Crew Management
        </CardTitle>
        <CardDescription>
          Quick crew operations: duty toggle, reassignment, and removal
          <br />
          <strong>Integration:</strong> Windows batch patch crew management functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Crew Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Vessel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crew.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No crew members found
                    </TableCell>
                  </TableRow>
                ) : (
                  crew.map((member: Crew) => (
                    <TableRow key={member.id} data-testid={`crew-row-${member.id}`}>
                      <TableCell className="font-medium" data-testid={`text-crew-name-${member.id}`}>
                        {member.name}
                      </TableCell>
                      <TableCell data-testid={`text-crew-rank-${member.id}`}>
                        {member.rank}
                      </TableCell>
                      <TableCell data-testid={`text-crew-vessel-${member.id}`}>
                        {getVesselName(member.vesselId)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={member.active ? "default" : "secondary"}
                          data-testid={`badge-crew-status-${member.id}`}
                        >
                          {member.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={member.onDuty ? "destructive" : "outline"}
                          data-testid={`badge-crew-duty-${member.id}`}
                        >
                          {member.onDuty ? "On Duty" : "Off Duty"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {/* Toggle Duty Button */}
                          <Button
                            size="sm"
                            variant={member.onDuty ? "outline" : "default"}
                            onClick={() => handleToggleDuty(member.id)}
                            disabled={toggleDutyMutation.isPending}
                            data-testid={`button-toggle-duty-${member.id}`}
                          >
                            <Power className="w-3 h-3 mr-1" />
                            {member.onDuty ? "Off" : "On"}
                          </Button>

                          {/* Reassignment Select */}
                          {(() => {
                            const availableVessels = getAvailableVessels(member.vesselId);
                            const hasAvailableVessels = availableVessels.length > 0;
                            
                            return (
                              <Select
                                onValueChange={(vesselId) => handleReassign(member.id, vesselId)}
                                disabled={vesselsLoading || reassignMutation.isPending || !hasAvailableVessels}
                              >
                                <SelectTrigger 
                                  className="w-32" 
                                  data-testid={`select-reassign-${member.id}`}
                                  title={!hasAvailableVessels ? "No other active vessels available for reassignment" : "Select vessel to reassign crew member"}
                                >
                                  <Ship className="w-3 h-3 mr-1" />
                                  <SelectValue 
                                    placeholder={hasAvailableVessels ? "Reassign" : "No vessels"} 
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {hasAvailableVessels ? (
                                    availableVessels.map((vessel: Vessel) => (
                                      <SelectItem key={vessel.id} value={vessel.id}>
                                        {vessel.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-2 text-sm text-muted-foreground">
                                      No other active vessels available
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                            );
                          })()}

                          {/* Remove Crew Button */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={removeCrewMutation.isPending}
                                data-testid={`button-remove-crew-${member.id}`}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Crew Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove <strong>{member.name}</strong>? 
                                  This action cannot be undone and will permanently delete 
                                  their record and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel data-testid={`button-cancel-remove-${member.id}`}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRemoveCrew(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  data-testid={`button-confirm-remove-${member.id}`}
                                >
                                  Remove
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold" data-testid="stat-total-crew">
                  {crew.length}
                </div>
                <p className="text-xs text-muted-foreground">Total Crew</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold" data-testid="stat-active-crew">
                  {crew.filter((m: Crew) => m.active).length}
                </div>
                <p className="text-xs text-muted-foreground">Active</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold" data-testid="stat-on-duty-crew">
                  {crew.filter((m: Crew) => m.onDuty).length}
                </div>
                <p className="text-xs text-muted-foreground">On Duty</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold" data-testid="stat-off-duty-crew">
                  {crew.filter((m: Crew) => !m.onDuty).length}
                </div>
                <p className="text-xs text-muted-foreground">Off Duty</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}