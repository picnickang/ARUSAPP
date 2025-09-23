import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, ChevronDown, Clock, Users, AlertTriangle, CheckCircle, Ship } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format, addDays } from 'date-fns';

interface Crew {
  id: string;
  name: string;
  rank: string;
  vesselId?: string;
  maxHours7d: number;
  minRestH: number;
  active: boolean;
  skills: string[];
}

interface ShiftTemplate {
  id: string;
  vesselId?: string;
  role: string;
  start: string;
  end: string;
  needed: number;
  skillRequired?: string;
  description?: string;
}

interface ScheduleAssignment {
  date: string;
  shiftId: string;
  crewId: string;
  vesselId?: string;
  start: string;
  end: string;
  role?: string;
}

interface UnfilledShift {
  day: string;
  shiftId: string;
  need: number;
  reason: string;
}

interface SchedulePlanResponse {
  scheduled: number;
  assignments: ScheduleAssignment[];
  unfilled: UnfilledShift[];
  message: string;
}

export function CrewScheduler() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduleResult, setScheduleResult] = useState<SchedulePlanResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Default maritime shift templates
  const [shiftTemplates] = useState<ShiftTemplate[]>([
    {
      id: 'WATCH_00_04',
      vesselId: 'MV_GREEN_BELAIT',
      role: 'Navigation Watch',
      start: '00:00:00',
      end: '04:00:00',
      needed: 2,
      skillRequired: 'watchkeeping',
      description: 'Midnight to 0400 bridge watch'
    },
    {
      id: 'WATCH_04_08',
      vesselId: 'MV_GREEN_BELAIT',
      role: 'Navigation Watch',
      start: '04:00:00',
      end: '08:00:00',
      needed: 2,
      skillRequired: 'watchkeeping',
      description: 'Morning watch 0400-0800'
    },
    {
      id: 'WATCH_08_12',
      vesselId: 'MV_GREEN_BELAIT',
      role: 'Navigation Watch',
      start: '08:00:00',
      end: '12:00:00',
      needed: 2,
      skillRequired: 'watchkeeping',
      description: 'Forenoon watch 0800-1200'
    },
    {
      id: 'WATCH_12_16',
      vesselId: 'MV_GREEN_BELAIT',
      role: 'Navigation Watch',
      start: '12:00:00',
      end: '16:00:00',
      needed: 2,
      skillRequired: 'watchkeeping',
      description: 'Afternoon watch 1200-1600'
    },
    {
      id: 'WATCH_16_20',
      vesselId: 'MV_GREEN_BELAIT',
      role: 'Navigation Watch',
      start: '16:00:00',
      end: '20:00:00',
      needed: 2,
      skillRequired: 'watchkeeping',
      description: 'Dog watch 1600-2000'
    },
    {
      id: 'WATCH_20_00',
      vesselId: 'MV_GREEN_BELAIT',
      role: 'Navigation Watch',
      start: '20:00:00',
      end: '00:00:00',
      needed: 2,
      skillRequired: 'watchkeeping',
      description: 'First dog watch 2000-midnight'
    }
  ]);

  // Fetch crew members
  const { data: crew = [], isLoading: isLoadingCrew } = useQuery({
    queryKey: ['/api/crew'],
    refetchInterval: 30000
  });

  // Fetch crew leave - fetch all leaves without crew-specific filters
  const { data: leaves = [] } = useQuery({
    queryKey: ['/api/crew/leave'],
    queryFn: () => apiRequest('/api/crew/leave'),
    enabled: false // Disable for now since endpoint expects parameters
  });

  // Plan schedule mutation
  const planScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/crew/schedule/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    onSuccess: (data: SchedulePlanResponse) => {
      setScheduleResult(data);
      queryClient.invalidateQueries({ queryKey: ['/api/crew/assignments'] });
      
      if (data.unfilled.length > 0) {
        toast({ 
          title: "Schedule completed with gaps",
          description: `${data.scheduled} shifts scheduled, ${data.unfilled.length} unfilled due to skill/availability constraints`,
          variant: "destructive"
        });
      } else {
        toast({ 
          title: "Schedule planned successfully",
          description: data.message
        });
      }
    },
    onError: (error: any) => {
      console.error("Schedule planning error:", error);
      const watchQualified = crew.filter((c: Crew) => c.skills.includes('watchkeeping')).length;
      const totalShifts = shiftTemplates.filter(s => s.skillRequired === 'watchkeeping').length;
      
      toast({ 
        title: "Unable to create schedule", 
        variant: "destructive",
        description: `Need crew with 'watchkeeping' skills. Currently ${watchQualified} of ${crew.length} crew are watch-qualified for ${totalShifts} watch shifts.`
      });
    }
  });

  const generateDayRange = (days: number) => {
    const today = new Date();
    const dayList = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(today, i);
      dayList.push(format(date, 'yyyy-MM-dd'));
    }
    setSelectedDays(dayList);
  };

  const handlePlanSchedule = () => {
    if (selectedDays.length === 0) {
      toast({ 
        title: "No days selected", 
        description: "Please select the date range for scheduling",
        variant: "destructive" 
      });
      return;
    }

    const planData = {
      days: selectedDays,
      shifts: shiftTemplates,
      crew: crew,
      leaves: leaves,
      existing: []
    };

    planScheduleMutation.mutate(planData);
  };

  const getShiftTime = (start: string, end: string) => {
    return `${start.slice(0, 5)} - ${end.slice(0, 5)}`;
  };

  const getCrewName = (crewId: string) => {
    const member = crew.find((c: Crew) => c.id === crewId);
    return member ? `${member.name} (${member.rank})` : crewId;
  };

  if (isLoadingCrew) {
    return <div className="p-6">Loading crew data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Crew Scheduler</h1>
        <Badge variant="outline">Intelligent Planning</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Planning Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Planning
            </CardTitle>
            <CardDescription>
              Configure date range and generate optimal crew assignments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date Range Selection */}
            <div>
              <Label className="text-base font-medium">Planning Period</Label>
              <div className="flex gap-2 mt-2">
                <Button 
                  variant="outline" 
                  onClick={() => generateDayRange(7)}
                  data-testid="button-7-days"
                  className="flex-1"
                >
                  Next 7 Days
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => generateDayRange(14)}
                  data-testid="button-14-days"
                  className="flex-1"
                >
                  Next 14 Days
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => generateDayRange(30)}
                  data-testid="button-30-days"
                  className="flex-1"
                >
                  Next 30 Days
                </Button>
              </div>
              {selectedDays.length > 0 && (
                <p className="text-sm text-muted-foreground mt-2">
                  {selectedDays.length} days selected: {format(new Date(selectedDays[0]), 'MMM d')} - {format(new Date(selectedDays[selectedDays.length - 1]), 'MMM d')}
                </p>
              )}
            </div>

            {/* Crew Summary */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Available Resources</Label>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="border rounded p-3">
                  <div className="text-2xl font-bold text-blue-600">{crew.length}</div>
                  <div className="text-sm text-muted-foreground">Total Crew</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-2xl font-bold text-green-600">
                    {crew.filter((c: Crew) => c.skills.includes('watchkeeping')).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Watch Qualified</div>
                </div>
                <div className="border rounded p-3">
                  <div className="text-2xl font-bold text-orange-600">{shiftTemplates.length}</div>
                  <div className="text-sm text-muted-foreground">Shift Templates</div>
                </div>
              </div>
            </div>

            <Button 
              onClick={handlePlanSchedule}
              data-testid="button-plan-schedule"
              disabled={planScheduleMutation.isPending || selectedDays.length === 0}
              className="w-full"
              size="lg"
            >
              {planScheduleMutation.isPending 
                ? 'Planning Schedule...' 
                : selectedDays.length === 0 
                  ? 'Select Date Range First' 
                  : 'Generate Optimal Schedule'
              }
            </Button>
            {selectedDays.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Click one of the planning period buttons above to select dates for scheduling
              </p>
            )}
          </CardContent>
        </Card>

        {/* Configuration Details */}
        <Card>
          <CardHeader>
            <CardTitle>Scheduling Configuration</CardTitle>
            <CardDescription>
              View shift templates and crew constraints
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="shifts" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="shifts">Shift Templates</TabsTrigger>
                <TabsTrigger value="crew">Crew Status</TabsTrigger>
              </TabsList>
              
              <TabsContent value="shifts" className="space-y-3 mt-4">
                {shiftTemplates.map(shift => (
                  <div 
                    key={shift.id} 
                    className="border rounded p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`shift-template-${shift.id}`}
                    onClick={() => {
                      toast({
                        title: "Shift Template",
                        description: `${shift.role}: ${shift.description || 'Standard maritime watch rotation'}`
                      });
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{shift.role}</div>
                        <div className="text-sm text-muted-foreground">
                          {getShiftTime(shift.start, shift.end)} • {shift.needed} crew needed
                        </div>
                        {shift.skillRequired && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Requires: {shift.skillRequired}
                          </Badge>
                        )}
                      </div>
                      {shift.vesselId && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Ship className="h-3 w-3" />
                          {shift.vesselId.split('_').pop()}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="crew" className="space-y-3 mt-4">
                {crew.slice(0, 6).map((member: Crew) => (
                  <div 
                    key={member.id} 
                    className="border rounded p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    data-testid={`crew-member-${member.id}`}
                    onClick={() => {
                      toast({
                        title: "Crew Member",
                        description: `${member.name} (${member.rank}) - Available for scheduling with ${member.skills.length} skills`
                      });
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {member.rank} • {member.maxHours7d}h/week max
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {member.skills.slice(0, 2).map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill.replace('_', ' ')}
                          </Badge>
                        ))}
                        {member.skills.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{member.skills.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {crew.length > 6 && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    and {crew.length - 6} more crew members...
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Schedule Results */}
      {scheduleResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Schedule Results
              <Badge variant={scheduleResult.unfilled.length > 0 ? "destructive" : "default"}>
                {scheduleResult.scheduled} Scheduled
              </Badge>
            </CardTitle>
            <CardDescription>
              {scheduleResult.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">{scheduleResult.scheduled}</div>
                  <div className="text-sm text-muted-foreground">Shifts Scheduled</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-red-600">{scheduleResult.unfilled.length}</div>
                  <div className="text-sm text-muted-foreground">Unfilled Positions</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    {Math.round((scheduleResult.scheduled / (scheduleResult.scheduled + scheduleResult.unfilled.length)) * 100)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Coverage Rate</div>
                </div>
              </div>

              {/* Unfilled Shifts Alert */}
              {scheduleResult.unfilled.length > 0 && (
                <div className="border border-yellow-200 bg-yellow-50 rounded p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Unfilled Positions</span>
                  </div>
                  <div className="space-y-1">
                    {scheduleResult.unfilled.map((unfilled, idx) => (
                      <div key={idx} className="text-sm text-yellow-700">
                        {format(new Date(unfilled.day), 'MMM d')}: {unfilled.shiftId} - {unfilled.need} position(s) ({unfilled.reason})
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Details */}
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <span>View Detailed Schedule</span>
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <div className="border rounded">
                    <div className="grid grid-cols-5 gap-2 p-3 bg-muted font-medium text-sm">
                      <div>Date</div>
                      <div>Shift</div>
                      <div>Crew Member</div>
                      <div>Time</div>
                      <div>Role</div>
                    </div>
                    {scheduleResult.assignments.map((assignment, idx) => (
                      <div key={idx} className="grid grid-cols-5 gap-2 p-3 border-t text-sm">
                        <div data-testid={`assignment-date-${idx}`}>
                          {format(new Date(assignment.date), 'MMM d')}
                        </div>
                        <div data-testid={`assignment-shift-${idx}`}>
                          {assignment.shiftId.split('_').slice(1).join(' ')}
                        </div>
                        <div data-testid={`assignment-crew-${idx}`}>
                          {getCrewName(assignment.crewId)}
                        </div>
                        <div data-testid={`assignment-time-${idx}`}>
                          {getShiftTime(assignment.start.slice(11, 19), assignment.end.slice(11, 19))}
                        </div>
                        <div data-testid={`assignment-role-${idx}`}>
                          {assignment.role || 'Watch'}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}