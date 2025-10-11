import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useCreateMutation, useUpdateMutation, useCustomMutation } from '@/hooks/useCrudMutations';
import { 
  Clock, 
  DollarSign, 
  Users, 
  Settings,
  Edit2,
  Save,
  X,
  Plus,
  TrendingUp
} from 'lucide-react';

interface LaborRate {
  id: string;
  skillLevel: string;
  position: string;
  standardRate: number;
  overtimeRate: number;
  emergencyRate: number;
  contractorRate: number;
  currency: string;
  effectiveDate: Date;
  isActive: boolean;
}

interface CrewMember {
  id: string;
  name: string;
  skillLevel: string;
  position: string;
  currentRate: number;
  overtimeMultiplier: number;
}

const laborRateSchema = z.object({
  skillLevel: z.string().min(1, 'Skill level is required'),
  position: z.string().min(1, 'Position is required'),
  standardRate: z.number().min(0.01, 'Standard rate must be greater than 0'),
  overtimeRate: z.number().min(0.01, 'Overtime rate must be greater than 0'),
  emergencyRate: z.number().min(0.01, 'Emergency rate must be greater than 0'),
  contractorRate: z.number().min(0.01, 'Contractor rate must be greater than 0'),
  currency: z.string().default('USD'),
});

const crewRateUpdateSchema = z.object({
  standardRate: z.number().min(0.01, 'Rate must be greater than 0'),
  overtimeMultiplier: z.number().min(1, 'Overtime multiplier must be at least 1'),
  effectiveDate: z.string().min(1, 'Effective date is required'),
});

export function LaborRateConfiguration() {
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [editingCrew, setEditingCrew] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch labor rates
  const { data: laborRates = [], isLoading: ratesLoading } = useQuery({
    queryKey: ['/api/labor-rates'],
  });

  // Fetch crew members
  const { data: crewMembers = [], isLoading: crewLoading } = useQuery({
    queryKey: ['/api/crew'],
  });

  const newRateForm = useForm<z.infer<typeof laborRateSchema>>({
    resolver: zodResolver(laborRateSchema),
    defaultValues: {
      currency: 'USD',
      standardRate: 75.0,
      overtimeRate: 112.5, // 1.5x standard
      emergencyRate: 150.0, // 2x standard
      contractorRate: 125.0,
    },
  });

  const updateRateForm = useForm<z.infer<typeof laborRateSchema>>({
    resolver: zodResolver(laborRateSchema),
  });

  const crewRateForm = useForm<z.infer<typeof crewRateUpdateSchema>>({
    resolver: zodResolver(crewRateUpdateSchema),
    defaultValues: {
      overtimeMultiplier: 1.5,
    },
  });

  // Create labor rate mutation using reusable hook
  const createRateMutation = useCreateMutation({
    endpoint: '/api/labor-rates',
    invalidateKeys: ['/api/labor-rates'],
    successMessage: 'New labor rate configuration has been saved.',
    onSuccess: () => newRateForm.reset(),
  });

  // Update labor rate mutation using reusable hook
  const updateRateMutation = useUpdateMutation({
    endpoint: '/api/labor-rates',
    invalidateKeys: ['/api/labor-rates'],
    successMessage: 'Labor rate configuration has been updated.',
    onSuccess: () => setEditingRate(null),
  });

  // Update crew member rate mutation using reusable hook
  const updateCrewRateMutation = useCustomMutation<{ crewId: string; rateData: z.infer<typeof crewRateUpdateSchema> }, any>({
    mutationFn: async ({ crewId, rateData }) => {
      return apiRequest('PATCH', `/api/crew/${crewId}/rate`, rateData);
    },
    invalidateKeys: ['/api/crew'],
    successMessage: 'Crew member labor rate has been updated.',
    onSuccess: () => setEditingCrew(null),
  });

  const handleEditRate = (rate: LaborRate) => {
    setEditingRate(rate.id);
    updateRateForm.reset({
      skillLevel: rate.skillLevel,
      position: rate.position,
      standardRate: rate.standardRate,
      overtimeRate: rate.overtimeRate,
      emergencyRate: rate.emergencyRate,
      contractorRate: rate.contractorRate,
      currency: rate.currency,
    });
  };

  const handleEditCrew = (crew: CrewMember) => {
    setEditingCrew(crew.id);
    crewRateForm.reset({
      standardRate: crew.currentRate,
      overtimeMultiplier: crew.overtimeMultiplier,
      effectiveDate: new Date().toISOString().split('T')[0],
    });
  };

  const calculateAverageRates = () => {
    if (laborRates.length === 0) return { standard: 0, overtime: 0, emergency: 0 };
    
    const totals = laborRates.reduce((acc: any, rate: LaborRate) => ({
      standard: acc.standard + rate.standardRate,
      overtime: acc.overtime + rate.overtimeRate,
      emergency: acc.emergency + rate.emergencyRate,
    }), { standard: 0, overtime: 0, emergency: 0 });

    return {
      standard: totals.standard / laborRates.length,
      overtime: totals.overtime / laborRates.length,
      emergency: totals.emergency / laborRates.length,
    };
  };

  const averageRates = calculateAverageRates();

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div className="text-sm text-muted-foreground">Rate Configurations</div>
            </div>
            <div className="text-2xl font-bold">{laborRates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div className="text-sm text-muted-foreground">Avg. Standard Rate</div>
            </div>
            <div className="text-2xl font-bold">${averageRates.standard.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div className="text-sm text-muted-foreground">Avg. Overtime Rate</div>
            </div>
            <div className="text-2xl font-bold">${averageRates.overtime.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-500" />
              <div className="text-sm text-muted-foreground">Avg. Emergency Rate</div>
            </div>
            <div className="text-2xl font-bold">${averageRates.emergency.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Create New Labor Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Create New Labor Rate Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...newRateForm}>
            <form onSubmit={newRateForm.handleSubmit((data) => createRateMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={newRateForm.control}
                  name="skillLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skill Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-skill-level">
                            <SelectValue placeholder="Select skill level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="trainee">Trainee</SelectItem>
                          <SelectItem value="apprentice">Apprentice</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="senior_technician">Senior Technician</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="specialist">Specialist</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newRateForm.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-position">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="engine_technician">Engine Technician</SelectItem>
                          <SelectItem value="mechanical_engineer">Mechanical Engineer</SelectItem>
                          <SelectItem value="electrical_technician">Electrical Technician</SelectItem>
                          <SelectItem value="electronics_technician">Electronics Technician</SelectItem>
                          <SelectItem value="hvac_technician">HVAC Technician</SelectItem>
                          <SelectItem value="deck_hand">Deck Hand</SelectItem>
                          <SelectItem value="maintenance_supervisor">Maintenance Supervisor</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <FormField
                  control={newRateForm.control}
                  name="standardRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Standard Rate ($/hour)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="75.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-standard-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newRateForm.control}
                  name="overtimeRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Overtime Rate ($/hour)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="112.50"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-overtime-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newRateForm.control}
                  name="emergencyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Emergency Rate ($/hour)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="150.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-emergency-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newRateForm.control}
                  name="contractorRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contractor Rate ($/hour)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="125.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-contractor-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={createRateMutation.isPending} data-testid="button-create-rate">
                <Plus className="h-4 w-4 mr-2" />
                {createRateMutation.isPending ? 'Creating...' : 'Create Labor Rate'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Labor Rates List */}
      <Card>
        <CardHeader>
          <CardTitle>Labor Rate Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {ratesLoading ? (
            <div className="text-center py-8">Loading labor rates...</div>
          ) : (
            <div className="space-y-4">
              {laborRates.map((rate: LaborRate) => {
                const isEditing = editingRate === rate.id;

                return (
                  <div key={rate.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <Badge variant="outline">{rate.skillLevel}</Badge>
                          <h3 className="font-semibold">{rate.position}</h3>
                          {rate.isActive ? (
                            <Badge variant="success">Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <Form {...updateRateForm}>
                            <form onSubmit={updateRateForm.handleSubmit((data) => updateRateMutation.mutate({ id: rate.id, data }))} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormField
                                  control={updateRateForm.control}
                                  name="standardRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Standard Rate</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          data-testid={`input-edit-standard-${rate.id}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={updateRateForm.control}
                                  name="overtimeRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Overtime Rate</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          data-testid={`input-edit-overtime-${rate.id}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={updateRateForm.control}
                                  name="emergencyRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Emergency Rate</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          data-testid={`input-edit-emergency-${rate.id}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={updateRateForm.control}
                                  name="contractorRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Contractor Rate</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          data-testid={`input-edit-contractor-${rate.id}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={updateRateMutation.isPending} data-testid={`button-save-rate-${rate.id}`}>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingRate(null)} data-testid={`button-cancel-rate-${rate.id}`}>
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </Form>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Standard:</span>
                              <div className="font-semibold text-green-600">${rate.standardRate}/hr</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Overtime:</span>
                              <div className="font-semibold text-orange-600">${rate.overtimeRate}/hr</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Emergency:</span>
                              <div className="font-semibold text-red-600">${rate.emergencyRate}/hr</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Contractor:</span>
                              <div className="font-semibold text-blue-600">${rate.contractorRate}/hr</div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditRate(rate)}
                          data-testid={`button-edit-rate-${rate.id}`}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {laborRates.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No labor rate configurations found. Create your first rate configuration above.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Crew Member Rates */}
      <Card>
        <CardHeader>
          <CardTitle>Individual Crew Member Rates</CardTitle>
        </CardHeader>
        <CardContent>
          {crewLoading ? (
            <div className="text-center py-8">Loading crew members...</div>
          ) : (
            <div className="space-y-4">
              {crewMembers.map((crew: CrewMember) => {
                const isEditing = editingCrew === crew.id;

                return (
                  <div key={crew.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-semibold">{crew.name}</h3>
                          <Badge variant="outline">{crew.position}</Badge>
                          <Badge variant="secondary">{crew.skillLevel}</Badge>
                        </div>
                        
                        {isEditing ? (
                          <Form {...crewRateForm}>
                            <form onSubmit={crewRateForm.handleSubmit((data) => updateCrewRateMutation.mutate({ crewId: crew.id, rateData: data }))} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                  control={crewRateForm.control}
                                  name="standardRate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Standard Rate ($/hour)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          data-testid={`input-crew-rate-${crew.id}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={crewRateForm.control}
                                  name="overtimeMultiplier"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Overtime Multiplier</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.1"
                                          placeholder="1.5"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 1)}
                                          data-testid={`input-crew-multiplier-${crew.id}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={crewRateForm.control}
                                  name="effectiveDate"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Effective Date</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="date"
                                          {...field}
                                          data-testid={`input-crew-date-${crew.id}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={updateCrewRateMutation.isPending} data-testid={`button-save-crew-${crew.id}`}>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingCrew(null)} data-testid={`button-cancel-crew-${crew.id}`}>
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </Form>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Current Rate:</span>
                              <div className="font-semibold text-green-600">${crew.currentRate}/hr</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Overtime Rate:</span>
                              <div className="font-semibold text-orange-600">
                                ${(crew.currentRate * crew.overtimeMultiplier).toFixed(2)}/hr
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Overtime Multiplier:</span>
                              <div className="font-semibold">{crew.overtimeMultiplier}x</div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {!isEditing && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCrew(crew)}
                          data-testid={`button-edit-crew-${crew.id}`}
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Update Rate
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {crewMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No crew members found. Add crew members first to configure individual rates.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}