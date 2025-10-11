import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Plus, X, Calculator, DollarSign, Clock, Package } from 'lucide-react';
import { useCustomMutation } from '@/hooks/useCrudMutations';

interface WorkOrderCostFormProps {
  workOrderId: string;
  onCostAdded?: () => void;
  existingCosts?: MaintenanceCost[];
}

interface MaintenanceCost {
  id: string;
  costType: 'labor' | 'parts' | 'equipment' | 'downtime';
  amount: number;
  currency: string;
  description?: string;
  vendor?: string;
}

interface PartCost {
  partNo: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface LaborEntry {
  laborType: 'standard' | 'overtime' | 'emergency';
  hours: number;
  costPerHour: number;
  totalCost: number;
  description: string;
}

const costSchema = z.object({
  costType: z.enum(['labor', 'parts', 'equipment', 'downtime']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('USD'),
  description: z.string().optional(),
  vendor: z.string().optional(),
});

const laborSchema = z.object({
  laborType: z.enum(['standard', 'overtime', 'emergency']),
  hours: z.number().min(0.1, 'Hours must be greater than 0'),
  costPerHour: z.number().min(0.01, 'Rate must be greater than 0'),
  description: z.string().min(1, 'Description is required'),
});

const partCostSchema = z.object({
  partNo: z.string().min(1, 'Part number is required'),
  partName: z.string().min(1, 'Part name is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitCost: z.number().min(0.01, 'Unit cost must be greater than 0'),
});

export function WorkOrderCostForm({ workOrderId, onCostAdded, existingCosts = [] }: WorkOrderCostFormProps) {
  const [activeTab, setActiveTab] = useState<'labor' | 'parts' | 'other'>('labor');
  const [laborEntries, setLaborEntries] = useState<LaborEntry[]>([]);
  const [partCosts, setPartCosts] = useState<PartCost[]>([]);
  const { toast } = useToast();

  const costForm = useForm<z.infer<typeof costSchema>>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      costType: 'equipment',
      currency: 'USD',
    },
  });

  const laborForm = useForm<z.infer<typeof laborSchema>>({
    resolver: zodResolver(laborSchema),
    defaultValues: {
      laborType: 'standard',
      costPerHour: 75.0,
    },
  });

  const partForm = useForm<z.infer<typeof partCostSchema>>({
    resolver: zodResolver(partCostSchema),
  });

  // Cost mutation using reusable hook  
  const addCostMutation = useCustomMutation<any, any>({
    mutationFn: async (costData: any) => {
      return await apiRequest('POST', `/api/work-orders/${workOrderId}/costs`, costData);
    },
    invalidateKeys: ['/api/work-orders', workOrderId],
    successMessage: 'Cost entry has been successfully added to the work order.',
    onSuccess: () => {
      onCostAdded?.();
    },
  });

  const addLaborEntry = (data: z.infer<typeof laborSchema>) => {
    const entry: LaborEntry = {
      ...data,
      totalCost: data.hours * data.costPerHour,
    };
    setLaborEntries([...laborEntries, entry]);
    laborForm.reset();
  };

  const removeLaborEntry = (index: number) => {
    setLaborEntries(laborEntries.filter((_, i) => i !== index));
  };

  const addPartCost = (data: z.infer<typeof partCostSchema>) => {
    const part: PartCost = {
      ...data,
      totalCost: data.quantity * data.unitCost,
    };
    setPartCosts([...partCosts, part]);
    partForm.reset();
  };

  const removePartCost = (index: number) => {
    setPartCosts(partCosts.filter((_, i) => i !== index));
  };

  const submitLaborCosts = async () => {
    if (laborEntries.length === 0) {
      toast({
        title: 'No Labor Entries',
        description: 'Please add at least one labor entry.',
        variant: 'destructive',
      });
      return;
    }

    for (const entry of laborEntries) {
      await addCostMutation.mutateAsync({
        costType: 'labor',
        amount: entry.totalCost,
        currency: 'USD',
        description: `${entry.laborType} labor: ${entry.hours}h @ $${entry.costPerHour}/h - ${entry.description}`,
      });
    }
    setLaborEntries([]);
  };

  const submitPartCosts = async () => {
    if (partCosts.length === 0) {
      toast({
        title: 'No Part Costs',
        description: 'Please add at least one part cost entry.',
        variant: 'destructive',
      });
      return;
    }

    for (const part of partCosts) {
      await addCostMutation.mutateAsync({
        costType: 'parts',
        amount: part.totalCost,
        currency: 'USD',
        description: `${part.partName} (${part.partNo}): ${part.quantity} × $${part.unitCost}`,
      });
    }
    setPartCosts([]);
  };

  const submitOtherCost = (data: z.infer<typeof costSchema>) => {
    addCostMutation.mutate(data);
    costForm.reset();
  };

  const totalLaborCost = laborEntries.reduce((sum, entry) => sum + entry.totalCost, 0);
  const totalPartCost = partCosts.reduce((sum, part) => sum + part.totalCost, 0);
  const totalExistingCosts = existingCosts.reduce((sum, cost) => sum + cost.amount, 0);
  const totalAllCosts = totalLaborCost + totalPartCost + totalExistingCosts;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Work Order Cost Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cost Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Costs</div>
              <div className="text-2xl font-bold">${totalAllCosts.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Labor (Pending)</div>
              <div className="text-xl font-semibold text-blue-600">${totalLaborCost.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Parts (Pending)</div>
              <div className="text-xl font-semibold text-green-600">${totalPartCost.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Recorded</div>
              <div className="text-xl font-semibold text-gray-600">${totalExistingCosts.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b">
          <Button
            variant={activeTab === 'labor' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('labor')}
            className="flex items-center gap-2"
            data-testid="tab-labor"
          >
            <Clock className="h-4 w-4" />
            Labor Costs
          </Button>
          <Button
            variant={activeTab === 'parts' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('parts')}
            className="flex items-center gap-2"
            data-testid="tab-parts"
          >
            <Package className="h-4 w-4" />
            Parts & Materials
          </Button>
          <Button
            variant={activeTab === 'other' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('other')}
            className="flex items-center gap-2"
            data-testid="tab-other"
          >
            <Calculator className="h-4 w-4" />
            Other Expenses
          </Button>
        </div>

        {/* Labor Costs Tab */}
        {activeTab === 'labor' && (
          <div className="space-y-4">
            <Form {...laborForm}>
              <form onSubmit={laborForm.handleSubmit(addLaborEntry)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <FormField
                    control={laborForm.control}
                    name="laborType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Labor Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-labor-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="standard">Standard</SelectItem>
                            <SelectItem value="overtime">Overtime</SelectItem>
                            <SelectItem value="emergency">Emergency</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={laborForm.control}
                    name="hours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hours</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="8.0"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-labor-hours"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={laborForm.control}
                    name="costPerHour"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rate ($/hour)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="75.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-labor-rate"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end">
                    <Button type="submit" className="w-full" data-testid="button-add-labor">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Labor
                    </Button>
                  </div>
                </div>
                <FormField
                  control={laborForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the work performed..."
                          {...field}
                          data-testid="textarea-labor-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>

            {/* Labor Entries List */}
            {laborEntries.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Labor Entries</h3>
                {laborEntries.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{entry.laborType}</Badge>
                        <span className="font-medium">{entry.hours}h @ ${entry.costPerHour}/h</span>
                        <span className="text-green-600 font-semibold">${entry.totalCost.toFixed(2)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{entry.description}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLaborEntry(index)}
                      data-testid={`button-remove-labor-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Total Labor Cost: ${totalLaborCost.toFixed(2)}</span>
                  <Button
                    onClick={submitLaborCosts}
                    disabled={addCostMutation.isPending}
                    data-testid="button-submit-labor"
                  >
                    Submit Labor Costs
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Parts Tab */}
        {activeTab === 'parts' && (
          <div className="space-y-4">
            <Form {...partForm}>
              <form onSubmit={partForm.handleSubmit(addPartCost)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <FormField
                    control={partForm.control}
                    name="partNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Number</FormLabel>
                        <FormControl>
                          <Input placeholder="P123456" {...field} data-testid="input-part-no" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={partForm.control}
                    name="partName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Part Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Oil Filter" {...field} data-testid="input-part-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={partForm.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="1"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            data-testid="input-part-quantity"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={partForm.control}
                    name="unitCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Cost ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="25.99"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-part-cost"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end">
                    <Button type="submit" className="w-full" data-testid="button-add-part">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Part
                    </Button>
                  </div>
                </div>
              </form>
            </Form>

            {/* Parts List */}
            {partCosts.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Parts & Materials</h3>
                {partCosts.map((part, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm">{part.partNo}</code>
                        <span className="font-medium">{part.partName}</span>
                        <span className="text-sm text-muted-foreground">
                          {part.quantity} × ${part.unitCost}
                        </span>
                        <span className="text-green-600 font-semibold">${part.totalCost.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePartCost(index)}
                      data-testid={`button-remove-part-${index}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-semibold">Total Parts Cost: ${totalPartCost.toFixed(2)}</span>
                  <Button
                    onClick={submitPartCosts}
                    disabled={addCostMutation.isPending}
                    data-testid="button-submit-parts"
                  >
                    Submit Parts Costs
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Other Expenses Tab */}
        {activeTab === 'other' && (
          <div className="space-y-4">
            <Form {...costForm}>
              <form onSubmit={costForm.handleSubmit(submitOtherCost)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={costForm.control}
                    name="costType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cost Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-cost-type">
                              <SelectValue placeholder="Select cost type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="equipment">Equipment Rental</SelectItem>
                            <SelectItem value="downtime">Downtime Cost</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={costForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="1000.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-cost-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={costForm.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor/Supplier (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Marine Services" {...field} data-testid="input-vendor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={costForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the expense..."
                          {...field}
                          data-testid="textarea-cost-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={addCostMutation.isPending} data-testid="button-submit-cost">
                  Add Cost Entry
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* Existing Costs Summary */}
        {existingCosts.length > 0 && (
          <div className="space-y-2">
            <Separator />
            <h3 className="font-semibold">Recorded Costs</h3>
            <div className="space-y-2">
              {existingCosts.map((cost) => (
                <div key={cost.id} className="flex items-center justify-between p-2 bg-muted rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{cost.costType}</Badge>
                    <span>{cost.description}</span>
                    {cost.vendor && <span className="text-sm text-muted-foreground">({cost.vendor})</span>}
                  </div>
                  <span className="font-semibold">${cost.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}