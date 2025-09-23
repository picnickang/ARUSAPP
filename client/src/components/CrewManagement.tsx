import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Users, Calendar, ShipWheel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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

interface CrewLeave {
  id: string;
  crewId: string;
  start: string;
  end: string;
  reason?: string;
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

export function CrewAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [crewForm, setCrewForm] = useState({
    name: '',
    rank: 'Able Seaman',
    vesselId: '',
    maxHours7d: 72,
    minRestH: 10
  });
  
  const [skillForm, setSkillForm] = useState({
    crewId: '',
    skill: '',
    level: 1
  });

  // Fetch crew members
  const { data: crew = [], isLoading } = useQuery({
    queryKey: ['/api/crew'],
    refetchInterval: 30000
  });

  // Create crew mutation
  const createCrewMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/crew', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crew'] });
      setCrewForm({ name: '', rank: 'Able Seaman', vesselId: '', maxHours7d: 72, minRestH: 10 });
      toast({ title: "Crew member created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create crew member", variant: "destructive" });
    }
  });

  // Add skill mutation
  const addSkillMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/crew/skills', { method: 'POST', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/crew'] });
      setSkillForm({ crewId: '', skill: '', level: 1 });
      toast({ title: "Skill added successfully" });
    },
    onError: () => {
      toast({ title: "Failed to add skill", variant: "destructive" });
    }
  });

  const handleSubmitCrew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewForm.name.trim()) return;
    createCrewMutation.mutate(crewForm);
  };

  const handleAddSkill = () => {
    if (!skillForm.crewId || !skillForm.skill.trim()) return;
    addSkillMutation.mutate(skillForm);
  };

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

  if (isLoading) {
    return <div className="p-6">Loading crew data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Crew Management</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add New Crew Member */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Crew Member
            </CardTitle>
            <CardDescription>
              Register new crew members with their maritime qualifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitCrew} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="crew-name">Name</Label>
                  <Input
                    id="crew-name"
                    data-testid="input-crew-name"
                    placeholder="Full name"
                    value={crewForm.name}
                    onChange={(e) => setCrewForm({ ...crewForm, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="crew-rank">Rank</Label>
                  <Select 
                    value={crewForm.rank} 
                    onValueChange={(value) => setCrewForm({ ...crewForm, rank: value })}
                  >
                    <SelectTrigger data-testid="select-crew-rank">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {maritimeRanks.map(rank => (
                        <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="vessel-id">Vessel ID</Label>
                  <Input
                    id="vessel-id"
                    data-testid="input-vessel-id"
                    placeholder="e.g., MV_BELAIT"
                    value={crewForm.vesselId}
                    onChange={(e) => setCrewForm({ ...crewForm, vesselId: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="max-hours">Max hrs/7d</Label>
                  <Input
                    id="max-hours"
                    data-testid="input-max-hours"
                    type="number"
                    min="40"
                    max="84"
                    value={crewForm.maxHours7d}
                    onChange={(e) => setCrewForm({ ...crewForm, maxHours7d: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="min-rest">Min rest (h)</Label>
                  <Input
                    id="min-rest"
                    data-testid="input-min-rest"
                    type="number"
                    min="6"
                    max="12"
                    value={crewForm.minRestH}
                    onChange={(e) => setCrewForm({ ...crewForm, minRestH: Number(e.target.value) })}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                data-testid="button-create-crew"
                disabled={createCrewMutation.isPending}
                className="w-full"
              >
                {createCrewMutation.isPending ? 'Creating...' : 'Add Crew Member'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Add Skills */}
        <Card>
          <CardHeader>
            <CardTitle>Add Skills</CardTitle>
            <CardDescription>
              Assign maritime skills and certifications to crew members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="skill-crew">Select Crew Member</Label>
              <Select 
                value={skillForm.crewId} 
                onValueChange={(value) => setSkillForm({ ...skillForm, crewId: value })}
              >
                <SelectTrigger data-testid="select-skill-crew">
                  <SelectValue placeholder="Choose crew member" />
                </SelectTrigger>
                <SelectContent>
                  {crew.map((member: Crew) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} ({member.rank})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="skill-name">Skill</Label>
              <Select 
                value={skillForm.skill} 
                onValueChange={(value) => setSkillForm({ ...skillForm, skill: value })}
              >
                <SelectTrigger data-testid="select-skill-name">
                  <SelectValue placeholder="Choose skill" />
                </SelectTrigger>
                <SelectContent>
                  {commonSkills.map(skill => (
                    <SelectItem key={skill} value={skill}>
                      {skill.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="skill-level">Level (1-5)</Label>
              <Select 
                value={skillForm.level.toString()} 
                onValueChange={(value) => setSkillForm({ ...skillForm, level: Number(value) })}
              >
                <SelectTrigger data-testid="select-skill-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map(level => (
                    <SelectItem key={level} value={level.toString()}>
                      Level {level} {level === 1 ? '(Basic)' : level === 5 ? '(Expert)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={handleAddSkill} 
              data-testid="button-add-skill"
              disabled={addSkillMutation.isPending}
              className="w-full"
            >
              {addSkillMutation.isPending ? 'Adding...' : 'Add Skill'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Crew Roster */}
      <Card>
        <CardHeader>
          <CardTitle>Crew Roster</CardTitle>
          <CardDescription>
            Complete crew manifest with qualifications and assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {crew.map((member: Crew) => (
              <div key={member.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-lg" data-testid={`text-crew-name-${member.id}`}>
                        {member.name}
                      </h3>
                      <Badge variant="outline" data-testid={`badge-rank-${member.id}`}>
                        {member.rank}
                      </Badge>
                      {member.vesselId && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <ShipWheel className="h-3 w-3" />
                          {member.vesselId}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex gap-6 text-sm text-muted-foreground">
                      <span>Max: {member.maxHours7d}h/week</span>
                      <span>Rest: {member.minRestH}h minimum</span>
                      <span className={member.active ? 'text-green-600' : 'text-red-600'}>
                        {member.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {member.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {member.skills.map(skill => (
                          <Badge key={skill} variant="outline" className="text-xs">
                            {skill.replace('_', ' ')}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {crew.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No crew members registered yet. Add your first crew member above.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}