import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Calendar, ChevronDown, Clock, Users, AlertTriangle, CheckCircle, Ship, Plus, Edit, Trash2, Settings2, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { format, addDays } from 'date-fns';
import FairnessViz from './FairnessViz';
import { insertShiftTemplateSchema, type SelectShiftTemplate, type InsertShiftTemplate } from '@shared/schema';
import { z } from 'zod';

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

interface EnhancedSchedulePlanResponse {
  engine: string;
  scheduled: ScheduleAssignment[];
  unfilled: UnfilledShift[];
  compliance?: {
    overall_ok: boolean;
    per_crew: Array<{
      crew_id: string;
      name: string;
      ok: boolean;
      min_rest_24: number;
      rest_7d: number;
      nights_this_week: number;
      violations: number;
    }>;
    rows_by_crew: { [crewId: string]: any[] };
  };
  summary: {
    totalShifts: number;
    scheduledAssignments: number;
    unfilledPositions: number;
    coverage?: number; // Optional since it might be calculated
  };
}

interface PortCall {
  id: string;
  vesselId: string;
  port: string;
  start: string;
  end: string;
  crewRequired: number;
}

interface DrydockWindow {
  id: string;
  vesselId: string;
  description: string;
  start: string;
  end: string;
  crewRequired: number;
}

interface CrewCertification {
  id: string;
  crewId: string;
  cert: string;
  expiresAt: string;
  issuedBy?: string;
}

export function CrewScheduler() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [scheduleResult, setScheduleResult] = useState<SchedulePlanResponse | null>(null);
  const [enhancedScheduleResult, setEnhancedScheduleResult] = useState<EnhancedSchedulePlanResponse | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true); // Changed to true for better UX
  const [selectedEngine, setSelectedEngine] = useState<string>('greedy');
  const [filterVessel, setFilterVessel] = useState<string>('all');
  const [filterCrew, setFilterCrew] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showConstraints, setShowConstraints] = useState(false);
  const [validateSTCW, setValidateSTCW] = useState(false);
  const [portCalls, setPortCalls] = useState<PortCall[]>([]);
  const [drydockWindows, setDrydockWindows] = useState<DrydockWindow[]>([]);
  const [newPortCall, setNewPortCall] = useState({ vesselId: '', port: '', start: '', end: '', crewRequired: 2 });
  const [newDrydock, setNewDrydock] = useState({ vesselId: '', description: '', start: '', end: '', crewRequired: 5 });
  
  // Preferences state for enhanced scheduling
  const [preferences, setPreferences] = useState({
    weights: {
      unfilled: 1000,
      fairness: 20,
      night_over: 10,
      consec_night: 8,
      pref_off: 6,
      vessel_mismatch: 3
    },
    rules: {
      max_nights_per_week: 4
    },
    per_crew: []
  });

  // Shift template form state and management
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);

  // Shift form with proper validation
  const shiftFormSchema = insertShiftTemplateSchema.extend({
    role: z.string().min(1, "Role is required"),
    start: z.string().min(1, "Start time is required"),
    end: z.string().min(1, "End time is required"),
    durationH: z.coerce.number().min(0.5, "Duration must be at least 0.5 hours").max(24, "Duration cannot exceed 24 hours"),
  });
  type ShiftFormData = z.infer<typeof shiftFormSchema>;

  const shiftForm = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
    defaultValues: {
      vesselId: '',
      equipmentId: '',
      role: '',
      start: '',
      end: '',
      durationH: 4,
      requiredSkills: '',
      rankMin: '',
      certRequired: ''
    }
  });

  // Fetch crew members
  const { data: crew = [], isLoading: isLoadingCrew } = useQuery({
    queryKey: ['/api/crew'],
    refetchInterval: 30000
  });

  // Fetch port calls and drydock windows for constraint management
  const { data: allPortCalls = [] } = useQuery({
    queryKey: ['/api/port-calls'],
    refetchInterval: 30000
  });

  const { data: allDrydockWindows = [] } = useQuery({
    queryKey: ['/api/drydock-windows'],
    refetchInterval: 30000
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['/api/crew/certifications'],
    refetchInterval: 60000
  });

  // Fetch shift templates - CRITICAL: Missing query was causing React crash
  const { data: shiftTemplates = [], isLoading: isLoadingShifts } = useQuery({
    queryKey: ['/api/shifts'],
    refetchInterval: 30000
  });

  // Fetch crew leave - fetch all leaves without crew-specific filters
  const { data: leaves = [] } = useQuery({
    queryKey: ['/api/crew/leave'],
    queryFn: () => apiRequest('/api/crew/leave'),
    enabled: false // Disable for now since endpoint expects parameters
  });

  // Fetch vessels for dropdown
  const { data: vessels = [] } = useQuery({
    queryKey: ['/api/vessels'],
    refetchInterval: 30000
  });

  // Shift template CRUD mutations
  const createShiftMutation = useMutation({
    mutationFn: (data: ShiftFormData) => apiRequest('POST', '/api/shifts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      shiftForm.reset();
      setIsShiftDialogOpen(false);
      toast({ title: "Shift template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create shift template", variant: "destructive" });
    }
  });

  const updateShiftMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string } & ShiftFormData) => 
      apiRequest('PUT', `/api/shifts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      setEditingShiftId(null);
      shiftForm.reset();
      setIsShiftDialogOpen(false);
      toast({ title: "Shift template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update shift template", variant: "destructive" });
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: (id: string) => apiRequest('DELETE', `/api/shifts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shifts'] });
      toast({ title: "Shift template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete shift template", variant: "destructive" });
    }
  });

  // Shift form handlers
  const onSubmitShift = (data: ShiftFormData) => {
    if (editingShiftId) {
      updateShiftMutation.mutate({ id: editingShiftId, ...data });
    } else {
      createShiftMutation.mutate(data);
    }
  };

  const handleEditShift = (shift: SelectShiftTemplate) => {
    setEditingShiftId(shift.id);
    shiftForm.reset({
      vesselId: shift.vesselId || '',
      equipmentId: shift.equipmentId || '',
      role: shift.role,
      start: shift.start,
      end: shift.end,
      durationH: shift.durationH,
      requiredSkills: shift.requiredSkills || '',
      rankMin: shift.rankMin || '',
      certRequired: shift.certRequired || ''
    });
    setIsShiftDialogOpen(true);
  };

  const handleCancelShiftEdit = () => {
    setEditingShiftId(null);
    shiftForm.reset();
    setIsShiftDialogOpen(false);
  };

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

  // Enhanced scheduling mutation with OR-Tools and constraints
  const enhancedScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('POST', '/api/crew/schedule/plan-enhanced', data);
    },
    onSuccess: (data: any) => {
      try {
        console.log("Enhanced schedule response:", data);
        
        // Validate response structure
        if (!data || typeof data !== 'object') {
          throw new Error('Invalid response format: not an object');
        }
        
        if (!data.summary || typeof data.summary !== 'object') {
          throw new Error('Invalid response format: missing summary object');
        }
        
        const safeData: EnhancedSchedulePlanResponse = {
          engine: data.engine || 'unknown',
          scheduled: Array.isArray(data.scheduled) ? data.scheduled : [],
          unfilled: Array.isArray(data.unfilled) ? data.unfilled : [],
          compliance: data.compliance,
          summary: {
            totalShifts: Number(data.summary.totalShifts) || 0,
            scheduledAssignments: Number(data.summary.scheduledAssignments) || 0,
            unfilledPositions: Number(data.summary.unfilledPositions) || 0,
            coverage: data.summary.coverage
          }
        };
        
        // Save compliance data to localStorage for HoR integration
        if (data.compliance && data.compliance.rows_by_crew) {
          try {
            localStorage.setItem('hor_proposed_rows', JSON.stringify(data.compliance.rows_by_crew));
          } catch (error) {
            console.warn('Failed to save proposed HoR rows to localStorage:', error);
          }
        }
        
        setEnhancedScheduleResult(safeData);
        
        const coveragePercent = safeData.summary.coverage || 
          (safeData.summary.totalShifts > 0 ? (safeData.summary.scheduledAssignments / safeData.summary.totalShifts) * 100 : 0);
          
        toast({
          title: "Enhanced Schedule Generated",
          description: `Successfully scheduled ${safeData.summary.scheduledAssignments} assignments with ${coveragePercent.toFixed(1)}% coverage using ${safeData.engine} engine`
        });
        
        queryClient.invalidateQueries({ queryKey: ['/api/crew/assignments'] });
      } catch (error) {
        console.error("Error processing enhanced schedule response:", error);
        console.error("Raw response data:", data);
        toast({
          title: "Response Processing Failed",
          description: `Error: ${error instanceof Error ? error.message : 'Unknown error processing response'}`,
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error("Enhanced scheduling network error:", error);
      toast({
        title: "Enhanced Scheduling Failed",
        description: error.message || "Failed to generate enhanced schedule",
        variant: "destructive"
      });
    }
  });

  // Add port call mutation
  const addPortCallMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/port-calls', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/port-calls'] });
      setNewPortCall({ vesselId: '', port: '', start: '', end: '', crewRequired: 2 });
      toast({ title: "Port call added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add port call", variant: "destructive" });
    }
  });

  // Add drydock mutation
  const addDrydockMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/drydock-windows', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/drydock-windows'] });
      setNewDrydock({ vesselId: '', description: '', start: '', end: '', crewRequired: 5 });
      toast({ title: "Drydock window added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add drydock window", variant: "destructive" });
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

  const handleEnhancedPlanSchedule = () => {
    if (selectedDays.length === 0) {
      toast({ 
        title: "No days selected", 
        description: "Please select the date range for scheduling",
        variant: "destructive" 
      });
      return;
    }

    const enhancedPlanData = {
      engine: selectedEngine,
      days: selectedDays,
      shifts: shiftTemplates,
      crew: crew,
      leaves: leaves,
      portCalls: portCalls,
      drydocks: drydockWindows,
      certifications: certifications.reduce((acc: any, cert: any) => {
        if (!acc[cert.crewId]) acc[cert.crewId] = [];
        acc[cert.crewId].push(cert.cert);
        return acc;
      }, {}),
      preferences: preferences,
      validate_stcw: validateSTCW
    };

    enhancedScheduleMutation.mutate(enhancedPlanData);
  };

  const handleAddPortCall = () => {
    if (!newPortCall.vesselId || !newPortCall.port || !newPortCall.start || !newPortCall.end) {
      toast({ title: "Please fill all port call fields", variant: "destructive" });
      return;
    }
    // Send only fields that exist in the current schema
    const portCallData = {
      vesselId: newPortCall.vesselId,
      port: newPortCall.port,
      start: newPortCall.start,
      end: newPortCall.end
    };
    addPortCallMutation.mutate(portCallData);
  };

  const handleAddDrydock = () => {
    if (!newDrydock.vesselId || !newDrydock.description || !newDrydock.start || !newDrydock.end) {
      toast({ title: "Please fill all drydock fields", variant: "destructive" });
      return;
    }
    // Map description to yard field and send only schema fields
    const drydockData = {
      vesselId: newDrydock.vesselId,
      yard: newDrydock.description, // Use description as yard name
      start: newDrydock.start,
      end: newDrydock.end
    };
    addDrydockMutation.mutate(drydockData);
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

            {/* Engine Selection */}
            <div>
              <Label className="text-base font-medium">Scheduling Engine</Label>
              <Select value={selectedEngine} onValueChange={setSelectedEngine}>
                <SelectTrigger data-testid="select-engine">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greedy">Greedy Algorithm (Fast)</SelectItem>
                  <SelectItem value="ortools">OR-Tools Optimizer (Advanced)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-gray-600 mt-1">
                {selectedEngine === 'greedy' 
                  ? 'Fast heuristic algorithm for basic scheduling'
                  : 'Advanced constraint satisfaction with optimal resource allocation'
                }
              </p>
            </div>

            {/* Improved Preferences Editor */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full justify-between" data-testid="toggle-preferences">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4" />
                    <span>Advanced Scheduling Preferences</span>
                  </div>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4 p-4 border rounded-lg bg-muted/30">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Priority Weights</Label>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-sm">Fairness ({preferences.weights.fairness})</Label>
                      </div>
                      <Slider
                        value={[preferences.weights.fairness]}
                        onValueChange={(val) => setPreferences({
                          ...preferences,
                          weights: { ...preferences.weights, fairness: val[0] }
                        })}
                        min={0}
                        max={100}
                        step={1}
                        data-testid="slider-fairness"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Balance workload across crew</p>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-sm">Night Shift Weight ({preferences.weights.night_over})</Label>
                      </div>
                      <Slider
                        value={[preferences.weights.night_over]}
                        onValueChange={(val) => setPreferences({
                          ...preferences,
                          weights: { ...preferences.weights, night_over: val[0] }
                        })}
                        min={0}
                        max={50}
                        step={1}
                        data-testid="slider-night"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Penalty for too many night shifts</p>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <Label className="text-sm">Crew Preferences ({preferences.weights.pref_off})</Label>
                      </div>
                      <Slider
                        value={[preferences.weights.pref_off]}
                        onValueChange={(val) => setPreferences({
                          ...preferences,
                          weights: { ...preferences.weights, pref_off: val[0] }
                        })}
                        min={0}
                        max={50}
                        step={1}
                        data-testid="slider-preferences"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Honor crew day-off requests</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Rules</Label>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm">Max Nights per Week:</Label>
                    <Input
                      type="number"
                      value={preferences.rules.max_nights_per_week}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        rules: { ...preferences.rules, max_nights_per_week: parseInt(e.target.value) || 4 }
                      })}
                      className="w-20"
                      min={0}
                      max={7}
                      data-testid="input-max-nights"
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Constraint Management Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showConstraints}
                onChange={(e) => setShowConstraints(e.target.checked)}
                data-testid="checkbox-show-constraints"
              />
              <Label>Manage Vessel Constraints</Label>
            </div>

            {/* STCW Validation Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={validateSTCW}
                onChange={(e) => setValidateSTCW(e.target.checked)}
                data-testid="checkbox-validate-stcw"
              />
              <Label>Validate STCW Compliance</Label>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handlePlanSchedule}
                disabled={selectedDays.length === 0 || planScheduleMutation.isPending}
                className="flex-1"
                data-testid="button-generate-schedule"
                variant="outline"
              >
                {planScheduleMutation.isPending ? 'Planning...' : 'Basic Schedule'}
              </Button>
              <Button 
                onClick={handleEnhancedPlanSchedule}
                disabled={selectedDays.length === 0 || enhancedScheduleMutation.isPending}
                className="flex-1"
                data-testid="button-generate-enhanced-schedule"
              >
                {enhancedScheduleMutation.isPending ? 'Optimizing...' : 'Enhanced Schedule'}
              </Button>
            </div>
            {selectedDays.length === 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Click one of the planning period buttons above to select dates for scheduling
              </p>
            )}
          </CardContent>
        </Card>

        {/* Vessel Constraints Management */}
        {showConstraints && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="h-5 w-5" />
                Vessel Constraints Management
              </CardTitle>
              <CardDescription>
                Manage port calls, drydock windows, and operational constraints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="portcalls" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="portcalls">Port Calls</TabsTrigger>
                  <TabsTrigger value="drydocks">Drydock Windows</TabsTrigger>
                </TabsList>

                <TabsContent value="portcalls" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">Add Port Call</h4>
                      <div className="space-y-2">
                        <Select 
                          value={newPortCall.vesselId} 
                          onValueChange={(val) => setNewPortCall({...newPortCall, vesselId: val})}
                        >
                          <SelectTrigger data-testid="select-port-vessel">
                            <SelectValue placeholder="Select Vessel" />
                          </SelectTrigger>
                          <SelectContent>
                            {vessels
                              .filter((vessel: any) => vessel.id && vessel.id.trim() !== '')
                              .map((vessel: any) => (
                                <SelectItem key={vessel.id} value={vessel.id}>
                                  {vessel.name || vessel.id}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Port Name"
                          value={newPortCall.port}
                          onChange={(e) => setNewPortCall({...newPortCall, port: e.target.value})}
                          data-testid="input-port-name"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="datetime-local"
                            value={newPortCall.start}
                            onChange={(e) => setNewPortCall({...newPortCall, start: e.target.value})}
                            data-testid="input-port-start"
                          />
                          <Input
                            type="datetime-local"
                            value={newPortCall.end}
                            onChange={(e) => setNewPortCall({...newPortCall, end: e.target.value})}
                            data-testid="input-port-end"
                          />
                        </div>
                        <Input
                          type="number"
                          placeholder="Crew Required"
                          value={newPortCall.crewRequired}
                          onChange={(e) => setNewPortCall({...newPortCall, crewRequired: parseInt(e.target.value) || 2})}
                          data-testid="input-port-crew"
                        />
                        <Button onClick={handleAddPortCall} className="w-full" data-testid="button-add-port">
                          Add Port Call
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Existing Port Calls</h4>
                      <div className="space-y-2">
                        {allPortCalls.map((port: any) => (
                          <div key={port.id} className="border rounded p-2">
                            <div className="font-medium">{port.port}</div>
                            <div className="text-sm text-gray-600">
                              {port.vesselId} • {new Date(port.start).toLocaleDateString()} - {new Date(port.end).toLocaleDateString()}
                            </div>
                            <div className="text-sm">Crew: {port.crewRequired}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="drydocks" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h4 className="font-medium">Add Drydock Window</h4>
                      <div className="space-y-2">
                        <Select 
                          value={newDrydock.vesselId} 
                          onValueChange={(val) => setNewDrydock({...newDrydock, vesselId: val})}
                        >
                          <SelectTrigger data-testid="select-drydock-vessel">
                            <SelectValue placeholder="Select Vessel" />
                          </SelectTrigger>
                          <SelectContent>
                            {vessels
                              .filter((vessel: any) => vessel.id && vessel.id.trim() !== '')
                              .map((vessel: any) => (
                                <SelectItem key={vessel.id} value={vessel.id}>
                                  {vessel.name || vessel.id}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <Input
                          placeholder="Description"
                          value={newDrydock.description}
                          onChange={(e) => setNewDrydock({...newDrydock, description: e.target.value})}
                          data-testid="input-drydock-description"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="datetime-local"
                            value={newDrydock.start}
                            onChange={(e) => setNewDrydock({...newDrydock, start: e.target.value})}
                            data-testid="input-drydock-start"
                          />
                          <Input
                            type="datetime-local"
                            value={newDrydock.end}
                            onChange={(e) => setNewDrydock({...newDrydock, end: e.target.value})}
                            data-testid="input-drydock-end"
                          />
                        </div>
                        <Input
                          type="number"
                          placeholder="Crew Required"
                          value={newDrydock.crewRequired}
                          onChange={(e) => setNewDrydock({...newDrydock, crewRequired: parseInt(e.target.value) || 5})}
                          data-testid="input-drydock-crew"
                        />
                        <Button onClick={handleAddDrydock} className="w-full" data-testid="button-add-drydock">
                          Add Drydock Window
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Existing Drydock Windows</h4>
                      <div className="space-y-2">
                        {allDrydockWindows.map((drydock: any) => (
                          <div key={drydock.id} className="border rounded p-2">
                            <div className="font-medium">{drydock.description}</div>
                            <div className="text-sm text-gray-600">
                              {drydock.vesselId} • {new Date(drydock.start).toLocaleDateString()} - {new Date(drydock.end).toLocaleDateString()}
                            </div>
                            <div className="text-sm">Crew: {drydock.crewRequired}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

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
              
              <TabsContent value="shifts" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Shift Templates</h3>
                  <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-add-shift">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Shift Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>
                          {editingShiftId ? 'Edit Shift Template' : 'Add Shift Template'}
                        </DialogTitle>
                        <DialogDescription>
                          Configure shift timing, requirements, and crew assignments
                        </DialogDescription>
                      </DialogHeader>
                      
                      <Form {...shiftForm}>
                        <form onSubmit={shiftForm.handleSubmit(onSubmitShift)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={shiftForm.control}
                              name="role"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Role</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      data-testid="input-shift-role"
                                      placeholder="e.g. Navigation Watch"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={shiftForm.control}
                              name="vesselId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Vessel (Optional)</FormLabel>
                                  <Select 
                                    value={field.value || 'none'} 
                                    onValueChange={(val) => field.onChange(val === 'none' ? '' : val)}
                                  >
                                    <FormControl>
                                      <SelectTrigger data-testid="select-shift-vessel">
                                        <SelectValue placeholder="Select Vessel" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="none">None (All Vessels)</SelectItem>
                                      {vessels
                                        .filter((vessel: any) => vessel.id && vessel.id.trim() !== '')
                                        .map((vessel: any) => (
                                          <SelectItem key={vessel.id} value={vessel.id}>
                                            {vessel.name || vessel.id}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <FormField
                              control={shiftForm.control}
                              name="start"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Start Time</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="time"
                                      data-testid="input-shift-start"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={shiftForm.control}
                              name="end"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>End Time</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="time"
                                      data-testid="input-shift-end"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={shiftForm.control}
                              name="durationH"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Duration (Hours)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      min="0.5"
                                      max="24"
                                      step="0.5"
                                      data-testid="input-shift-duration"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={shiftForm.control}
                              name="requiredSkills"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Required Skills (Optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      data-testid="input-shift-skills"
                                      placeholder="e.g. watchkeeping, navigation"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={shiftForm.control}
                              name="rankMin"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Minimum Rank (Optional)</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      data-testid="input-shift-rank"
                                      placeholder="e.g. Second Officer"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <FormField
                            control={shiftForm.control}
                            name="certRequired"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Required Certification (Optional)</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    data-testid="input-shift-cert"
                                    placeholder="e.g. STCW, BOSIET"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="flex justify-end gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              onClick={handleCancelShiftEdit}
                              data-testid="button-cancel-shift"
                            >
                              Cancel
                            </Button>
                            <Button 
                              type="submit"
                              disabled={createShiftMutation.isPending || updateShiftMutation.isPending}
                              data-testid="button-save-shift"
                            >
                              {editingShiftId ? 'Update' : 'Create'} Shift
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
                
                <div className="space-y-3">
                  {isLoadingShifts ? (
                    <div className="text-center py-4 text-muted-foreground">
                      Loading shift templates...
                    </div>
                  ) : shiftTemplates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No shift templates defined yet</p>
                      <p className="text-sm">Add your first shift template to get started</p>
                    </div>
                  ) : (
                    shiftTemplates.map((shift: SelectShiftTemplate) => (
                      <div 
                        key={shift.id} 
                        className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        data-testid={`shift-template-${shift.id}`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{shift.role}</h4>
                              {shift.vesselId && (
                                <Badge variant="outline" className="text-xs">
                                  <Ship className="h-3 w-3 mr-1" />
                                  {shift.vesselId}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {shift.start} - {shift.end} ({shift.durationH}h)
                                </span>
                              </div>
                              {(shift.requiredSkills || shift.rankMin || shift.certRequired) && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {shift.requiredSkills && (
                                    <Badge variant="secondary" className="text-xs">
                                      Skills: {shift.requiredSkills}
                                    </Badge>
                                  )}
                                  {shift.rankMin && (
                                    <Badge variant="secondary" className="text-xs">
                                      Rank: {shift.rankMin}
                                    </Badge>
                                  )}
                                  {shift.certRequired && (
                                    <Badge variant="secondary" className="text-xs">
                                      Cert: {shift.certRequired}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditShift(shift)}
                              data-testid={`button-edit-shift-${shift.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => deleteShiftMutation.mutate(shift.id)}
                              disabled={deleteShiftMutation.isPending}
                              data-testid={`button-delete-shift-${shift.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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

      {/* Enhanced Schedule Results Display */}
      {enhancedScheduleResult && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Enhanced Schedule Results
              <Badge variant="outline">{enhancedScheduleResult.engine.toUpperCase()}</Badge>
            </CardTitle>
            <CardDescription>
              Advanced optimization results using {enhancedScheduleResult.engine} engine
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Enhanced Summary Metrics - Fixed Coverage Calculations */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center border rounded p-3">
                <div className="text-2xl font-bold text-blue-600">
                  {enhancedScheduleResult.summary.scheduledAssignments}
                </div>
                <div className="text-sm text-muted-foreground">Scheduled</div>
              </div>
              <div className="text-center border rounded p-3">
                <div className="text-2xl font-bold text-green-600">
                  {(() => {
                    const totalUnfilledPositions = enhancedScheduleResult.unfilled.reduce((sum, u) => sum + u.need, 0);
                    const totalPositions = enhancedScheduleResult.summary.scheduledAssignments + totalUnfilledPositions;
                    const coverage = totalPositions > 0 ? (enhancedScheduleResult.summary.scheduledAssignments / totalPositions) * 100 : 0;
                    return coverage.toFixed(1);
                  })()}%
                </div>
                <div className="text-sm text-muted-foreground">Coverage</div>
              </div>
              <div className="text-center border rounded p-3">
                <div className="text-2xl font-bold text-orange-600">
                  {enhancedScheduleResult.unfilled.reduce((sum, u) => sum + u.need, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Unfilled</div>
              </div>
              <div className="text-center border rounded p-3">
                <div className="text-2xl font-bold text-purple-600">
                  {enhancedScheduleResult.summary.totalShifts}
                </div>
                <div className="text-sm text-muted-foreground">Total Shifts</div>
              </div>
            </div>

            {/* Fairness Visualization */}
            <div className="mb-6">
              <FairnessViz 
                scheduled={enhancedScheduleResult.scheduled}
                crew={crew}
              />
            </div>

            {/* STCW Compliance Summary */}
            {enhancedScheduleResult?.compliance && (
              <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <h3 className="text-lg font-medium mb-3">STCW Compliance Summary</h3>
                <div className="mb-3">
                  <span className="text-sm">Overall: </span>
                  <Badge variant={enhancedScheduleResult.compliance.overall_ok ? "default" : "destructive"}>
                    {enhancedScheduleResult.compliance.overall_ok ? "COMPLIANT" : "VIOLATIONS DETECTED"}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300 dark:border-gray-600">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-left">Crew</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">Status</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">MinRest24h</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">Rest7d</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">Nights/Week</th>
                        <th className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">Violations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enhancedScheduleResult.compliance.per_crew.map((crewComp, index) => (
                        <tr key={index} className={crewComp.ok ? "" : "bg-red-50 dark:bg-red-900/20"}>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1">{crewComp.name}</td>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                            <Badge variant={crewComp.ok ? "default" : "destructive"}>
                              {crewComp.ok ? "OK" : "BREACH"}
                            </Badge>
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                            {crewComp.min_rest_24?.toFixed(1) || "N/A"}h
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                            {crewComp.rest_7d?.toFixed(1) || "N/A"}h
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                            {crewComp.nights_this_week || 0}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 px-2 py-1 text-center">
                            {crewComp.violations || 0}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Filters Section */}
            <div className="flex flex-wrap gap-3 mb-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <Label className="text-sm font-medium">Filters:</Label>
              </div>
              <Select value={filterVessel} onValueChange={setFilterVessel}>
                <SelectTrigger className="w-[180px]" data-testid="filter-vessel">
                  <SelectValue placeholder="All Vessels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vessels</SelectItem>
                  {vessels
                    .filter((vessel: any) => vessel.id && vessel.id.trim() !== '')
                    .map((vessel: any) => (
                      <SelectItem key={vessel.id} value={vessel.id}>
                        {vessel.name || vessel.id}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Select value={filterCrew} onValueChange={setFilterCrew}>
                <SelectTrigger className="w-[180px]" data-testid="filter-crew">
                  <SelectValue placeholder="All Crew" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Crew</SelectItem>
                  {crew.map((member: Crew) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Search by role or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[220px]"
                data-testid="input-search"
              />
              {(filterVessel !== 'all' || filterCrew !== 'all' || searchQuery) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterVessel('all');
                    setFilterCrew('all');
                    setSearchQuery('');
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full mb-4">
                  <ChevronDown className="h-4 w-4 mr-2" />
                  {isDetailsOpen ? 'Hide' : 'Show'} Detailed Schedule
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4">
                <Tabs defaultValue="assignments" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="assignments">Assignments</TabsTrigger>
                    <TabsTrigger value="unfilled">Unfilled Positions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="assignments" className="space-y-3">
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {enhancedScheduleResult.scheduled
                        .filter(assignment => {
                          // Apply vessel filter
                          if (filterVessel !== 'all' && assignment.vesselId !== filterVessel) return false;
                          // Apply crew filter
                          if (filterCrew !== 'all' && assignment.crewId !== filterCrew) return false;
                          // Apply search filter
                          if (searchQuery) {
                            const search = searchQuery.toLowerCase();
                            const matchesRole = assignment.role?.toLowerCase().includes(search);
                            const matchesDate = assignment.date.includes(search);
                            const matchesCrew = getCrewName(assignment.crewId).toLowerCase().includes(search);
                            if (!matchesRole && !matchesDate && !matchesCrew) return false;
                          }
                          return true;
                        })
                        .map((assignment, index) => (
                        <div key={index} className="border rounded p-3 bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-medium">{getCrewName(assignment.crewId)}</div>
                              <div className="text-sm text-gray-600">
                                {assignment.role} • {format(new Date(assignment.date), 'MMM d')} • {getShiftTime(assignment.start, assignment.end)}
                              </div>
                            </div>
                            <Badge variant="outline">{assignment.vesselId || 'Fleet'}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="unfilled" className="space-y-3">
                    {enhancedScheduleResult.unfilled.length === 0 ? (
                      <div className="text-center text-green-600 p-6">
                        ✅ All positions successfully filled!
                      </div>
                    ) : (
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {enhancedScheduleResult.unfilled.map((unfilled, index) => (
                          <div key={index} className="border rounded p-3 bg-red-50">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium text-red-700">
                                  {unfilled.need} position(s) unfilled
                                </div>
                                <div className="text-sm text-gray-600">
                                  Day: {unfilled.day} • Shift: {unfilled.shiftId}
                                </div>
                                <div className="text-sm text-red-600">
                                  Reason: {unfilled.reason}
                                </div>
                              </div>
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Basic Schedule Results */}
      {scheduleResult && !enhancedScheduleResult && (
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
                  <div className="text-2xl font-bold text-red-600">
                    {scheduleResult.unfilled.reduce((sum, u) => sum + u.need, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Unfilled Positions</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-blue-600">
                    {(() => {
                      const totalUnfilledPositions = scheduleResult.unfilled.reduce((sum, u) => sum + u.need, 0);
                      const totalPositions = scheduleResult.scheduled + totalUnfilledPositions;
                      return totalPositions > 0 ? Math.round((scheduleResult.scheduled / totalPositions) * 100) : 0;
                    })()}%
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