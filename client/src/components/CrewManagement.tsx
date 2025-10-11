import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2, Users, Calendar, ShipWheel } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertSkillSchema } from '@shared/schema';
import { useCreateMutation, useUpdateMutation, useDeleteMutation } from '@/hooks/useCrudMutations';

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
  
  const [crewForm, setCrewForm] = useState({
    name: '',
    rank: 'Able Seaman',
    vesselId: '',
    maxHours7d: 72,
    minRestH: 10
  });
  
  const [crewSkillForm, setCrewSkillForm] = useState({
    crewId: '',
    skill: '',
    level: 1
  });

  // Fetch crew members
  const { data: crew = [], isLoading } = useQuery({
    queryKey: ['/api/crew'],
    refetchInterval: 30000
  });

  // Fetch vessels for dropdown
  const { data: vessels = [] } = useQuery({
    queryKey: ['/api/vessels'],
    refetchInterval: 30000
  });

  // Crew mutations using reusable hooks
  const createCrewMutation = useCreateMutation('/api/crew', {
    successMessage: "Crew member created successfully",
    onSuccess: () => {
      setCrewForm({ name: '', rank: 'Able Seaman', vesselId: '', maxHours7d: 72, minRestH: 10 });
    },
  });

  const addSkillMutation = useCreateMutation('/api/crew/skills', {
    successMessage: "Skill added successfully",
    invalidateKeys: ['/api/crew'],
    onSuccess: () => {
      setCrewSkillForm({ crewId: '', skill: '', level: 1 });
    },
  });

  // Auto-capitalize first letter of each word in names
  const capitalizeNames = (name: string): string => {
    // Don't trim - preserve spaces during typing
    return name
      .split(' ') // Split by single space to preserve spacing during typing
      .map(word => {
        if (word.length === 0) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  const handleSubmitCrew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!crewForm.name.trim()) return;
    createCrewMutation.mutate(crewForm);
  };

  const handleAddSkill = () => {
    if (!crewSkillForm.crewId || !crewSkillForm.skill.trim()) return;
    addSkillMutation.mutate(crewSkillForm);
  };

  const maritimeRanks = [
    'Captain', 'Chief Officer', 'Second Officer', 'Third Officer',
    'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer',
    'Bosun', 'Able Seaman', 'Ordinary Seaman', 'Chief Cook', 
    'Engine Fitter', 'Oiler', 'Wiper'
  ];

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);

  // Skills form with proper validation
  const skillFormSchema = insertSkillSchema.extend({
    category: z.string().min(1, "Category is required"),
    maxLevel: z.coerce.number().min(1).max(5, "Max level must be between 1-5"),
  }).omit({ orgId: true });
  type SkillFormData = z.infer<typeof skillFormSchema>;

  const skillForm = useForm<SkillFormData>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: {
      name: '',
      category: '',
      description: '',
      maxLevel: 5,
      orgId: 'default-org-id'
    }
  });

  // Fetch skills master catalog
  const { data: skillsCatalog = [] } = useQuery({
    queryKey: ['/api/skills'],
    refetchInterval: 30000
  });

  // Skills mutations using reusable hooks
  const createSkillMutation = useCreateMutation<SkillFormData>('/api/skills', {
    successMessage: "Skill created successfully",
    onSuccess: () => {
      skillForm.reset();
    },
  });

  const updateSkillMutation = useUpdateMutation<SkillFormData>('/api/skills', {
    successMessage: "Skill updated successfully",
    onSuccess: () => {
      setEditingSkillId(null);
      skillForm.reset();
    },
  });

  const deleteSkillMutation = useDeleteMutation('/api/skills', {
    successMessage: "Skill deleted successfully",
  });

  const onSubmitSkill = (data: SkillFormData) => {
    if (editingSkillId) {
      updateSkillMutation.mutate({ id: editingSkillId, ...data });
    } else {
      createSkillMutation.mutate(data);
    }
  };

  const handleEditSkill = (skill: any) => {
    setEditingSkillId(skill.id);
    skillForm.reset({
      name: skill.name,
      category: skill.category || '',
      description: skill.description || '',
      maxLevel: skill.maxLevel || 5
    });
  };

  const handleCancelEdit = () => {
    setEditingSkillId(null);
    skillForm.reset();
  };

  const skillCategories = ['Navigation', 'Engineering', 'Deck', 'Safety', 'Communication', 'Maintenance'];

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

      <Tabs defaultValue="crew" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="crew" data-testid="tab-crew">Crew Members</TabsTrigger>
          <TabsTrigger value="skills" data-testid="tab-skills">Skills Catalog</TabsTrigger>
          <TabsTrigger value="assign" data-testid="tab-assign">Assign Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="crew" className="space-y-6">
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
                    onChange={(e) => setCrewForm({ ...crewForm, name: capitalizeNames(e.target.value) })}
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
                  <Label htmlFor="vessel-id">Vessel</Label>
                  <Select
                    value={crewForm.vesselId}
                    onValueChange={(value) => setCrewForm({ ...crewForm, vesselId: value })}
                  >
                    <SelectTrigger data-testid="select-vessel-id">
                      <SelectValue placeholder="Select vessel" />
                    </SelectTrigger>
                    <SelectContent>
                      {vessels.map((vessel: any) => (
                        <SelectItem key={vessel.id} value={vessel.id}>
                          {vessel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                value={crewSkillForm.crewId} 
                onValueChange={(value) => setCrewSkillForm({ ...crewSkillForm, crewId: value })}
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
                value={crewSkillForm.skill} 
                onValueChange={(value) => setCrewSkillForm({ ...crewSkillForm, skill: value })}
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
                value={crewSkillForm.level.toString()} 
                onValueChange={(value) => setCrewSkillForm({ ...crewSkillForm, level: Number(value) })}
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
        </TabsContent>

        <TabsContent value="skills" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Add New Skill */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  {editingSkillId ? 'Edit Skill' : 'Add Skill'}
                </CardTitle>
                <CardDescription>
                  Manage the master catalog of skills that can be assigned to crew members
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...skillForm}>
                  <form onSubmit={skillForm.handleSubmit(onSubmitSkill)} className="space-y-4">
                    <FormField
                      control={skillForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skill Name</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-skill-name"
                              placeholder="e.g. Watchkeeping"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={skillForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-skill-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {skillCategories.map(category => (
                                  <SelectItem key={category} value={category}>{category}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={skillForm.control}
                        name="maxLevel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Max Level</FormLabel>
                            <Select
                              value={field.value?.toString()}
                              onValueChange={(value) => field.onChange(parseInt(value))}
                            >
                              <FormControl>
                                <SelectTrigger data-testid="select-skill-max-level">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {[1, 2, 3, 4, 5].map(level => (
                                  <SelectItem key={level} value={level.toString()}>Level {level}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={skillForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              data-testid="input-skill-description"
                              placeholder="Detailed description of the skill"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        data-testid="button-save-skill"
                        disabled={createSkillMutation.isPending || updateSkillMutation.isPending}
                      >
                        {editingSkillId ? 'Update Skill' : 'Add Skill'}
                      </Button>
                      {editingSkillId && (
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleCancelEdit}
                          data-testid="button-cancel-edit"
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Skills List */}
            <Card>
              <CardHeader>
                <CardTitle>Skills Catalog ({skillsCatalog.length})</CardTitle>
                <CardDescription>
                  Available skills in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {skillsCatalog.map((skill: any) => (
                    <div key={skill.id} className="border rounded p-3">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium" data-testid={`text-skill-name-${skill.id}`}>
                              {skill.name}
                            </h4>
                            {skill.category && (
                              <Badge variant="outline">{skill.category}</Badge>
                            )}
                            <Badge variant="secondary">Max Level {skill.maxLevel}</Badge>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditSkill(skill)}
                              data-testid={`button-edit-skill-${skill.id}`}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteSkillMutation.mutate(skill.id)}
                              disabled={deleteSkillMutation.isPending}
                              data-testid={`button-delete-skill-${skill.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {skill.description && (
                          <p className="text-sm text-muted-foreground">{skill.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {skillsCatalog.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No skills in catalog yet. Add your first skill above.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assign" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Assign Skills to Crew
              </CardTitle>
              <CardDescription>
                Assign skills from the catalog to crew members with proficiency levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="assign-crew">Crew Member</Label>
                  <Select
                    value={crewSkillForm.crewId}
                    onValueChange={(value) => setCrewSkillForm({ ...crewSkillForm, crewId: value })}
                  >
                    <SelectTrigger data-testid="select-assign-crew">
                      <SelectValue placeholder="Select crew member" />
                    </SelectTrigger>
                    <SelectContent>
                      {crew.map((member: any) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.rank})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assign-skill">Skill</Label>
                  <Select
                    value={crewSkillForm.skill}
                    onValueChange={(value) => setCrewSkillForm({ ...crewSkillForm, skill: value })}
                  >
                    <SelectTrigger data-testid="select-assign-skill">
                      <SelectValue placeholder="Select skill" />
                    </SelectTrigger>
                    <SelectContent>
                      {skillsCatalog.map((skill: any) => (
                        <SelectItem key={skill.id} value={skill.name}>
                          {skill.name} {skill.category && `(${skill.category})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assign-level">Proficiency Level</Label>
                  <Select
                    value={crewSkillForm.level.toString()}
                    onValueChange={(value) => setCrewSkillForm({ ...crewSkillForm, level: parseInt(value) })}
                  >
                    <SelectTrigger data-testid="select-assign-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(level => (
                        <SelectItem key={level} value={level.toString()}>
                          Level {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddSkill}
                    disabled={!crewSkillForm.crewId || !crewSkillForm.skill || addSkillMutation.isPending}
                    data-testid="button-assign-skill"
                  >
                    Assign Skill
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}