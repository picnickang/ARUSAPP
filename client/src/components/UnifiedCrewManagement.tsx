import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ResponsiveDialog } from '@/components/ResponsiveDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Users, Ship, Power, Plus, Edit, Trash2, Search, X, Download,
  UserCheck, UserX, Award, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, ShipWheel
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useCreateMutation, useUpdateMutation, useDeleteMutation, useCustomMutation } from '@/hooks/useCrudMutations';
import { exportToCSV } from '@/lib/exportUtils';

interface Crew {
  id: string;
  name: string;
  rank: string;
  vesselId: string;
  maxHours7d: number;
  minRestH: number;
  active: boolean;
  onDuty: boolean;
  skills: string[];
}

interface Vessel {
  id: string;
  name: string;
  imo?: string;
  active: boolean;
}

type SortField = 'name' | 'rank' | 'vessel' | 'status' | 'duty';
type SortDirection = 'asc' | 'desc';

const maritimeRanks = [
  'Captain', 'Chief Officer', 'Second Officer', 'Third Officer',
  'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer',
  'Bosun', 'Able Seaman', 'Ordinary Seaman', 'Chief Cook', 
  'Engine Fitter', 'Oiler', 'Wiper'
];

const commonSkills = [
  'watchkeeping', 'diesel_maintenance', 'crane_operation', 'welding',
  'electrical', 'navigation', 'safety_officer', 'first_aid', 
  'fire_fighting', 'ecdis_operation', 'radio_operation'
];

export function UnifiedCrewManagement() {
  const { toast } = useToast();
  
  // Filter and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVessel, setSelectedVessel] = useState<string>('all');
  const [selectedRank, setSelectedRank] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Dialog state
  const [isAddCrewDialogOpen, setIsAddCrewDialogOpen] = useState(false);
  const [isEditCrewDialogOpen, setIsEditCrewDialogOpen] = useState(false);
  const [isAddSkillDialogOpen, setIsAddSkillDialogOpen] = useState(false);
  const [editingCrew, setEditingCrew] = useState<Crew | null>(null);
  const [skillAssignmentCrewId, setSkillAssignmentCrewId] = useState<string>('');

  // Fetch data
  const { data: crew = [], isLoading: crewLoading } = useQuery<Crew[]>({
    queryKey: ['/api/crew']
  });

  const { data: vessels = [] } = useQuery<Vessel[]>({
    queryKey: ['/api/vessels']
  });

  // Crew form schema
  const crewFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    rank: z.string().min(1, "Rank is required"),
    vesselId: z.string().min(1, "Vessel is required"),
    maxHours7d: z.coerce.number().min(40).max(84),
    minRestH: z.coerce.number().min(6).max(12)
  });
  type CrewFormData = z.infer<typeof crewFormSchema>;

  const crewForm = useForm<CrewFormData>({
    resolver: zodResolver(crewFormSchema),
    defaultValues: {
      name: '',
      rank: 'Able Seaman',
      vesselId: '',
      maxHours7d: 72,
      minRestH: 10
    }
  });

  // Skill assignment form
  const skillFormSchema = z.object({
    crewId: z.string().min(1, "Crew member is required"),
    skill: z.string().min(1, "Skill is required"),
    level: z.coerce.number().min(1).max(5)
  });
  type SkillFormData = z.infer<typeof skillFormSchema>;

  const skillForm = useForm<SkillFormData>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: {
      crewId: '',
      skill: '',
      level: 1
    }
  });

  // Mutations
  const createCrewMutation = useCreateMutation('/api/crew', {
    invalidateKeys: ['/api/crew'],
    successMessage: "Crew member created successfully",
    onSuccess: () => {
      crewForm.reset();
      setIsAddCrewDialogOpen(false);
    }
  });

  const updateCrewMutation = useUpdateMutation('/api/crew', {
    invalidateKeys: ['/api/crew'],
    successMessage: "Crew member updated successfully",
    onSuccess: () => {
      setIsEditCrewDialogOpen(false);
      setEditingCrew(null);
      crewForm.reset();
    }
  });

  const deleteCrewMutation = useDeleteMutation('/api/crew', {
    invalidateKeys: ['/api/crew'],
    successMessage: "Crew member removed successfully"
  });

  const toggleDutyMutation = useCustomMutation({
    mutationFn: (crewId: string) => 
      fetch(`/api/crew/${crewId}/toggle-duty`, { method: 'POST' }).then(r => r.json()),
    invalidateKeys: [['/api/crew']],
    successMessage: (response: any) => response.message,
  });

  const reassignMutation = useUpdateMutation('/api/crew', {
    invalidateKeys: ['/api/crew'],
    successMessage: "Crew reassigned successfully"
  });

  const addSkillMutation = useCreateMutation('/api/crew/skills', {
    invalidateKeys: ['/api/crew'],
    successMessage: "Skill added successfully",
    onSuccess: () => {
      skillForm.reset();
      setIsAddSkillDialogOpen(false);
      setSkillAssignmentCrewId('');
    }
  });

  // Auto-capitalize names
  const capitalizeNames = (name: string): string => {
    return name
      .split(' ')
      .map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Form handlers
  const onSubmitCrew = (data: CrewFormData) => {
    if (editingCrew) {
      updateCrewMutation.mutate({ id: editingCrew.id, data });
    } else {
      createCrewMutation.mutate(data);
    }
  };

  const onSubmitSkill = (data: SkillFormData) => {
    addSkillMutation.mutate(data);
  };

  const handleEditCrew = (member: Crew) => {
    setEditingCrew(member);
    crewForm.reset({
      name: member.name,
      rank: member.rank,
      vesselId: member.vesselId,
      maxHours7d: member.maxHours7d,
      minRestH: member.minRestH
    });
    setIsEditCrewDialogOpen(true);
  };

  const handleAddSkillClick = (crewId: string) => {
    setSkillAssignmentCrewId(crewId);
    skillForm.setValue('crewId', crewId);
    setIsAddSkillDialogOpen(true);
  };

  const handleToggleDuty = (crewId: string) => {
    toggleDutyMutation.mutate(crewId);
  };

  const handleReassign = (crewId: string, vesselId: string) => {
    if (!vesselId) {
      toast({ title: "Please select a vessel", variant: "destructive" });
      return;
    }
    reassignMutation.mutate({ id: crewId, data: { vesselId } });
  };

  const handleDeleteCrew = (crewId: string) => {
    deleteCrewMutation.mutate(crewId);
  };

  const getVesselName = (vesselId: string) => {
    const vessel = vessels.find(v => v.id === vesselId);
    return vessel ? vessel.name : vesselId;
  };

  // Calculate overview stats
  const stats = useMemo(() => {
    const totalCrew = crew.length;
    const activeCrew = crew.filter(c => c.active).length;
    const onDutyCrew = crew.filter(c => c.onDuty).length;
    const uniqueVessels = new Set(crew.map(c => c.vesselId)).size;
    const uniqueSkills = new Set(crew.flatMap(c => c.skills)).size;

    return {
      totalCrew,
      activeCrew,
      onDutyCrew,
      uniqueVessels,
      uniqueSkills
    };
  }, [crew]);

  // Filter and sort crew
  const filteredAndSortedCrew = useMemo(() => {
    let filtered = [...crew];

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(c => 
        c.name.toLowerCase().includes(search) ||
        c.rank.toLowerCase().includes(search) ||
        c.skills.some(skill => skill.toLowerCase().includes(search))
      );
    }

    // Apply vessel filter
    if (selectedVessel !== 'all') {
      filtered = filtered.filter(c => c.vesselId === selectedVessel);
    }

    // Apply rank filter
    if (selectedRank !== 'all') {
      filtered = filtered.filter(c => c.rank === selectedRank);
    }

    // Apply status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'active') {
        filtered = filtered.filter(c => c.active);
      } else if (selectedStatus === 'inactive') {
        filtered = filtered.filter(c => !c.active);
      } else if (selectedStatus === 'on_duty') {
        filtered = filtered.filter(c => c.onDuty);
      } else if (selectedStatus === 'off_duty') {
        filtered = filtered.filter(c => !c.onDuty);
      }
    }

    // Apply skill filter
    if (selectedSkill !== 'all') {
      filtered = filtered.filter(c => c.skills.includes(selectedSkill));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareA: any;
      let compareB: any;

      switch (sortField) {
        case 'name':
          compareA = a.name.toLowerCase();
          compareB = b.name.toLowerCase();
          break;
        case 'rank':
          compareA = maritimeRanks.indexOf(a.rank);
          compareB = maritimeRanks.indexOf(b.rank);
          break;
        case 'vessel':
          compareA = getVesselName(a.vesselId).toLowerCase();
          compareB = getVesselName(b.vesselId).toLowerCase();
          break;
        case 'status':
          compareA = a.active ? 1 : 0;
          compareB = b.active ? 1 : 0;
          break;
        case 'duty':
          compareA = a.onDuty ? 1 : 0;
          compareB = b.onDuty ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (compareA < compareB) return sortDirection === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [crew, searchTerm, selectedVessel, selectedRank, selectedStatus, selectedSkill, sortField, sortDirection]);

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedVessel !== 'all') count++;
    if (selectedRank !== 'all') count++;
    if (selectedStatus !== 'all') count++;
    if (selectedSkill !== 'all') count++;
    return count;
  }, [searchTerm, selectedVessel, selectedRank, selectedStatus, selectedSkill]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedVessel('all');
    setSelectedRank('all');
    setSelectedStatus('all');
    setSelectedSkill('all');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 ml-1" /> : 
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const getAriaSort = (field: SortField): "ascending" | "descending" | "none" => {
    if (sortField !== field) return "none";
    return sortDirection === 'asc' ? "ascending" : "descending";
  };

  const handleExportCSV = () => {
    const exportData = filteredAndSortedCrew.map(c => ({
      name: c.name,
      rank: c.rank,
      vessel: getVesselName(c.vesselId),
      status: c.active ? 'Active' : 'Inactive',
      dutyStatus: c.onDuty ? 'On Duty' : 'Off Duty',
      maxHoursWeek: c.maxHours7d,
      minRestH: c.minRestH,
      skills: c.skills.join('; ')
    }));

    const success = exportToCSV(exportData, {
      filename: `crew-roster-${new Date().toISOString().split('T')[0]}.csv`,
      columns: ['name', 'rank', 'vessel', 'status', 'dutyStatus', 'maxHoursWeek', 'minRestH', 'skills'],
      headers: {
        name: 'Name',
        rank: 'Rank',
        vessel: 'Vessel',
        status: 'Status',
        dutyStatus: 'Duty Status',
        maxHoursWeek: 'Max Hours/Week',
        minRestH: 'Min Rest (h)',
        skills: 'Skills'
      }
    });

    if (success) {
      toast({ title: "CSV exported successfully" });
    } else {
      toast({ title: "No Data", description: "No crew data to export", variant: "destructive" });
    }
  };

  const getAvailableVessels = (currentVesselId: string) => {
    return vessels.filter(v => v.active && v.id !== currentVesselId);
  };

  if (crewLoading) {
    return <div className="p-6">Loading crew data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Crew Management</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportCSV} variant="outline" data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setIsAddCrewDialogOpen(true)} data-testid="button-add-crew">
            <Plus className="h-4 w-4 mr-2" />
            Add Crew Member
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-total-crew">
                {stats.totalCrew}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Total Crew</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div className="text-2xl font-bold text-green-600" data-testid="stat-active-crew">
                {stats.activeCrew}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Active</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Power className="h-4 w-4 text-orange-600" />
              <div className="text-2xl font-bold text-orange-600" data-testid="stat-on-duty-crew">
                {stats.onDutyCrew}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">On Duty</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4 text-purple-600" />
              <div className="text-2xl font-bold text-purple-600" data-testid="stat-vessels">
                {stats.uniqueVessels}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Vessels</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-teal-600" />
              <div className="text-2xl font-bold text-teal-600" data-testid="stat-skills">
                {stats.uniqueSkills}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Unique Skills</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, rank, or skill..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-crew"
              />
            </div>

            <Select value={selectedVessel} onValueChange={setSelectedVessel}>
              <SelectTrigger data-testid="select-vessel-filter">
                <SelectValue placeholder="All Vessels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vessels</SelectItem>
                {vessels.filter(v => v.active).map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRank} onValueChange={setSelectedRank}>
              <SelectTrigger data-testid="select-rank-filter">
                <SelectValue placeholder="All Ranks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ranks</SelectItem>
                {maritimeRanks.map(rank => (
                  <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="on_duty">On Duty</SelectItem>
                <SelectItem value="off_duty">Off Duty</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground" data-testid="text-result-count">
                Showing {filteredAndSortedCrew.length} of {crew.length} crew members
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{activeFilterCount} filters active</Badge>
                )}
              </p>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} data-testid="button-clear-filters">
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Crew Table */}
      <Card>
        <CardHeader>
          <CardTitle>Crew Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSort('name')}
                    aria-sort={getAriaSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSort('rank')}
                    aria-sort={getAriaSort('rank')}
                  >
                    <div className="flex items-center">
                      Rank
                      {getSortIcon('rank')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSort('vessel')}
                    aria-sort={getAriaSort('vessel')}
                  >
                    <div className="flex items-center">
                      Vessel
                      {getSortIcon('vessel')}
                    </div>
                  </TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSort('status')}
                    aria-sort={getAriaSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => handleSort('duty')}
                    aria-sort={getAriaSort('duty')}
                  >
                    <div className="flex items-center">
                      Duty
                      {getSortIcon('duty')}
                    </div>
                  </TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedCrew.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {activeFilterCount > 0 ? "No crew members match your filters." : "No crew members found. Add your first crew member above."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedCrew.map(member => (
                    <TableRow key={member.id} data-testid={`row-crew-${member.id}`}>
                      <TableCell className="font-medium" data-testid={`text-crew-name-${member.id}`}>
                        {member.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.rank}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <ShipWheel className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{getVesselName(member.vesselId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.skills.length > 0 ? (
                            member.skills.slice(0, 3).map(skill => (
                              <Badge key={skill} variant="secondary" className="text-xs">
                                {skill.replace('_', ' ')}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">No skills</span>
                          )}
                          {member.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{member.skills.length - 3}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.active ? "default" : "secondary"}>
                          {member.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.onDuty ? "destructive" : "outline"}>
                          {member.onDuty ? "On Duty" : "Off Duty"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          <div>{member.maxHours7d}h/wk</div>
                          <div>{member.minRestH}h rest</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditCrew(member)}
                            data-testid={`button-edit-${member.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={member.onDuty ? "outline" : "ghost"}
                            onClick={() => handleToggleDuty(member.id)}
                            data-testid={`button-toggle-duty-${member.id}`}
                          >
                            <Power className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleAddSkillClick(member.id)}
                            data-testid={`button-add-skill-${member.id}`}
                          >
                            <Award className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-delete-${member.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Crew Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove <strong>{member.name}</strong>? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteCrew(member.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
        </CardContent>
      </Card>

      {/* Add/Edit Crew Dialog */}
      <ResponsiveDialog
        open={isAddCrewDialogOpen || isEditCrewDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddCrewDialogOpen(false);
            setIsEditCrewDialogOpen(false);
            setEditingCrew(null);
            crewForm.reset();
          }
        }}
        title={editingCrew ? "Edit Crew Member" : "Add New Crew Member"}
        description={editingCrew ? "Update crew member information" : "Register a new crew member with maritime qualifications"}
        footer={
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddCrewDialogOpen(false);
                setIsEditCrewDialogOpen(false);
                setEditingCrew(null);
                crewForm.reset();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={crewForm.handleSubmit(onSubmitCrew)}
              disabled={createCrewMutation.isPending || updateCrewMutation.isPending}
              className="flex-1"
              data-testid="button-save-crew"
            >
              {editingCrew ? 'Update' : 'Add'} Crew Member
            </Button>
          </div>
        }
      >
        <Form {...crewForm}>
          <form className="space-y-4">
            <FormField
              control={crewForm.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Full name"
                      onChange={(e) => field.onChange(capitalizeNames(e.target.value))}
                      data-testid="input-crew-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={crewForm.control}
                name="rank"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rank</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-crew-rank">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maritimeRanks.map(rank => (
                          <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={crewForm.control}
                name="vesselId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vessel</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-crew-vessel">
                          <SelectValue placeholder="Select vessel" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vessels.filter(v => v.active).map(v => (
                          <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={crewForm.control}
                name="maxHours7d"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Hours/Week</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="40"
                        max="84"
                        data-testid="input-max-hours"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={crewForm.control}
                name="minRestH"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Rest (hours)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        min="6"
                        max="12"
                        data-testid="input-min-rest"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>
      </ResponsiveDialog>

      {/* Add Skill Dialog */}
      <ResponsiveDialog
        open={isAddSkillDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddSkillDialogOpen(false);
            setSkillAssignmentCrewId('');
            skillForm.reset();
          }
        }}
        title="Add Skill to Crew Member"
        description="Assign a maritime skill or certification"
        footer={
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddSkillDialogOpen(false);
                setSkillAssignmentCrewId('');
                skillForm.reset();
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={skillForm.handleSubmit(onSubmitSkill)}
              disabled={addSkillMutation.isPending}
              className="flex-1"
              data-testid="button-save-skill"
            >
              Add Skill
            </Button>
          </div>
        }
      >
        <Form {...skillForm}>
          <form className="space-y-4">
            {skillAssignmentCrewId ? (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium">Assigning skill to:</p>
                <p className="text-lg font-semibold">
                  {crew.find(c => c.id === skillAssignmentCrewId)?.name || 'Unknown'}
                </p>
              </div>
            ) : (
              <FormField
                control={skillForm.control}
                name="crewId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Crew Member</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-skill-crew">
                          <SelectValue placeholder="Select crew member" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {crew.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name} ({member.rank})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={skillForm.control}
              name="skill"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Skill</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger data-testid="select-skill-name">
                        <SelectValue placeholder="Select skill" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {commonSkills.map(skill => (
                        <SelectItem key={skill} value={skill}>
                          {skill.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={skillForm.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proficiency Level</FormLabel>
                  <Select value={field.value?.toString()} onValueChange={(v) => field.onChange(parseInt(v))}>
                    <FormControl>
                      <SelectTrigger data-testid="select-skill-level">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(level => (
                        <SelectItem key={level} value={level.toString()}>
                          Level {level} {level === 1 ? '(Basic)' : level === 5 ? '(Expert)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </ResponsiveDialog>
    </div>
  );
}
