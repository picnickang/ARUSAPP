import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Receipt, 
  DollarSign, 
  TrendingDown, 
  AlertTriangle,
  FileText,
  Calendar,
  Search,
  Filter,
  Upload,
  X,
  Check
} from 'lucide-react';

interface Expense {
  id: string;
  type: 'vendor_invoice' | 'labor_cost' | 'downtime_cost' | 'emergency_repair' | 'port_fees' | 'fuel_cost' | 'other';
  amount: number;
  currency: string;
  description: string;
  vendor?: string;
  invoiceNumber?: string;
  workOrderId?: string;
  vesselName?: string;
  expenseDate: Date;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  receipt?: string;
  notes?: string;
  createdAt: Date;
}

const expenseSchema = z.object({
  type: z.enum(['vendor_invoice', 'labor_cost', 'downtime_cost', 'emergency_repair', 'port_fees', 'fuel_cost', 'other']),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: z.string().default('USD'),
  description: z.string().min(1, 'Description is required'),
  vendor: z.string().optional(),
  invoiceNumber: z.string().optional(),
  workOrderId: z.string().optional(),
  vesselName: z.string().optional(),
  expenseDate: z.string().min(1, 'Expense date is required'),
  notes: z.string().optional(),
});

const downtimeSchema = z.object({
  vesselName: z.string().min(1, 'Vessel name is required'),
  equipmentId: z.string().min(1, 'Equipment is required'),
  downtimeStart: z.string().min(1, 'Start time is required'),
  downtimeEnd: z.string().min(1, 'End time is required'),
  reason: z.string().min(1, 'Reason is required'),
  hourlyLossRate: z.number().min(0.01, 'Hourly loss rate must be greater than 0'),
  description: z.string().optional(),
});

export function ExpenseTrackingForm() {
  const [activeTab, setActiveTab] = useState<'add' | 'track' | 'downtime'>('add');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['/api/expenses'],
  });

  // Fetch vessels for dropdown
  const { data: vessels = [] } = useQuery({
    queryKey: ['/api/vessels'],
  });

  // Fetch equipment for dropdown
  const { data: equipment = [] } = useQuery({
    queryKey: ['/api/equipment'],
  });

  const expenseForm = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      currency: 'USD',
      expenseDate: new Date().toISOString().split('T')[0],
    },
  });

  const downtimeForm = useForm<z.infer<typeof downtimeSchema>>({
    resolver: zodResolver(downtimeSchema),
    defaultValues: {
      hourlyLossRate: 500.0, // Default $500/hour loss rate
    },
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData: z.infer<typeof expenseSchema>) => {
      return await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Expense Recorded',
        description: 'Expense has been successfully recorded.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      expenseForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record expense.',
        variant: 'destructive',
      });
    },
  });

  // Create downtime cost mutation
  const createDowntimeMutation = useMutation({
    mutationFn: async (downtimeData: z.infer<typeof downtimeSchema>) => {
      // Calculate total downtime cost
      const start = new Date(downtimeData.downtimeStart);
      const end = new Date(downtimeData.downtimeEnd);
      const hoursDown = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      const totalCost = hoursDown * downtimeData.hourlyLossRate;

      const expenseData = {
        type: 'downtime_cost' as const,
        amount: totalCost,
        currency: 'USD',
        description: `Downtime: ${downtimeData.reason} - ${hoursDown.toFixed(2)} hours @ $${downtimeData.hourlyLossRate}/hr`,
        vesselName: downtimeData.vesselName,
        expenseDate: downtimeData.downtimeStart.split('T')[0],
        notes: downtimeData.description,
      };

      return await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify(expenseData),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Downtime Cost Recorded',
        description: 'Downtime cost has been calculated and recorded.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
      downtimeForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to record downtime cost.',
        variant: 'destructive',
      });
    },
  });

  // Approve expense mutation
  const approveExpenseMutation = useMutation({
    mutationFn: async ({ expenseId, action }: { expenseId: string; action: 'approve' | 'reject' }) => {
      return await apiRequest(`/api/expenses/${expenseId}/${action}`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: 'Expense Updated',
        description: 'Expense approval status has been updated.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/expenses'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update expense.',
        variant: 'destructive',
      });
    },
  });

  // Filter expenses
  const filteredExpenses = expenses.filter((expense: Expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.approvalStatus === statusFilter;
    const matchesType = typeFilter === 'all' || expense.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate totals
  const totalExpenses = expenses.reduce((sum: number, exp: Expense) => sum + exp.amount, 0);
  const pendingExpenses = expenses.filter((exp: Expense) => exp.approvalStatus === 'pending');
  const approvedExpenses = expenses.filter((exp: Expense) => exp.approvalStatus === 'approved');

  const getExpenseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      vendor_invoice: 'Vendor Invoice',
      labor_cost: 'Labor Cost',
      downtime_cost: 'Downtime Cost',
      emergency_repair: 'Emergency Repair',
      port_fees: 'Port Fees',
      fuel_cost: 'Fuel Cost',
      other: 'Other',
    };
    return labels[type] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'destructive';
      default: return 'warning';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div className="text-sm text-muted-foreground">Total Expenses</div>
            </div>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div className="text-sm text-muted-foreground">Pending Approval</div>
            </div>
            <div className="text-2xl font-bold">{pendingExpenses.length}</div>
            <div className="text-sm text-muted-foreground">
              ${pendingExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              <div className="text-sm text-muted-foreground">Approved</div>
            </div>
            <div className="text-2xl font-bold">{approvedExpenses.length}</div>
            <div className="text-sm text-muted-foreground">
              ${approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div className="text-sm text-muted-foreground">Avg. Expense</div>
            </div>
            <div className="text-2xl font-bold">
              ${expenses.length > 0 ? (totalExpenses / expenses.length).toFixed(2) : '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 border-b">
        <Button
          variant={activeTab === 'add' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('add')}
          className="flex items-center gap-2"
          data-testid="tab-add-expense"
        >
          <Receipt className="h-4 w-4" />
          Add Expense
        </Button>
        <Button
          variant={activeTab === 'downtime' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('downtime')}
          className="flex items-center gap-2"
          data-testid="tab-downtime-cost"
        >
          <TrendingDown className="h-4 w-4" />
          Downtime Cost
        </Button>
        <Button
          variant={activeTab === 'track' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('track')}
          className="flex items-center gap-2"
          data-testid="tab-track-expenses"
        >
          <FileText className="h-4 w-4" />
          Track Expenses
        </Button>
      </div>

      {/* Add Expense Tab */}
      {activeTab === 'add' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Record New Expense
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...expenseForm}>
              <form onSubmit={expenseForm.handleSubmit((data) => createExpenseMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={expenseForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-expense-type">
                              <SelectValue placeholder="Select expense type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="vendor_invoice">Vendor Invoice</SelectItem>
                            <SelectItem value="labor_cost">Labor Cost</SelectItem>
                            <SelectItem value="emergency_repair">Emergency Repair</SelectItem>
                            <SelectItem value="port_fees">Port Fees</SelectItem>
                            <SelectItem value="fuel_cost">Fuel Cost</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={expenseForm.control}
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
                            data-testid="input-expense-amount"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={expenseForm.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-expense-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={expenseForm.control}
                    name="vendor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendor/Supplier (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Marine Services" {...field} data-testid="input-expense-vendor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={expenseForm.control}
                    name="invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="INV-2025-001" {...field} data-testid="input-invoice-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={expenseForm.control}
                    name="vesselName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vessel (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-expense-vessel">
                              <SelectValue placeholder="Select vessel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vessels.map((vessel: any) => (
                              <SelectItem key={vessel.id} value={vessel.name}>{vessel.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={expenseForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the expense in detail..."
                          {...field}
                          data-testid="textarea-expense-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={expenseForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional notes or comments..."
                          {...field}
                          data-testid="textarea-expense-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createExpenseMutation.isPending} data-testid="button-submit-expense">
                  {createExpenseMutation.isPending ? 'Recording...' : 'Record Expense'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Downtime Cost Tab */}
      {activeTab === 'downtime' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Calculate Downtime Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...downtimeForm}>
              <form onSubmit={downtimeForm.handleSubmit((data) => createDowntimeMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={downtimeForm.control}
                    name="vesselName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vessel</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-downtime-vessel">
                              <SelectValue placeholder="Select vessel" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vessels.map((vessel: any) => (
                              <SelectItem key={vessel.id} value={vessel.name}>{vessel.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={downtimeForm.control}
                    name="equipmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-downtime-equipment">
                              <SelectValue placeholder="Select equipment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipment.map((eq: any) => (
                              <SelectItem key={eq.id} value={eq.id}>{eq.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={downtimeForm.control}
                    name="downtimeStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Downtime Start</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            data-testid="input-downtime-start"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={downtimeForm.control}
                    name="downtimeEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Downtime End</FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            {...field}
                            data-testid="input-downtime-end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={downtimeForm.control}
                    name="hourlyLossRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Loss Rate ($)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="500.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            data-testid="input-hourly-loss-rate"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={downtimeForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Downtime Reason</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-downtime-reason">
                              <SelectValue placeholder="Select reason" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="equipment_failure">Equipment Failure</SelectItem>
                            <SelectItem value="planned_maintenance">Planned Maintenance</SelectItem>
                            <SelectItem value="emergency_repair">Emergency Repair</SelectItem>
                            <SelectItem value="weather_delay">Weather Delay</SelectItem>
                            <SelectItem value="port_delay">Port Delay</SelectItem>
                            <SelectItem value="crew_availability">Crew Availability</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={downtimeForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe the downtime incident and impact..."
                          {...field}
                          data-testid="textarea-downtime-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createDowntimeMutation.isPending} data-testid="button-submit-downtime">
                  {createDowntimeMutation.isPending ? 'Calculating...' : 'Calculate & Record Downtime Cost'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Track Expenses Tab */}
      {activeTab === 'track' && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Tracking & Approval</CardTitle>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                  data-testid="input-search-expenses"
                />
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-type-filter">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="vendor_invoice">Vendor Invoice</SelectItem>
                    <SelectItem value="labor_cost">Labor Cost</SelectItem>
                    <SelectItem value="downtime_cost">Downtime Cost</SelectItem>
                    <SelectItem value="emergency_repair">Emergency Repair</SelectItem>
                    <SelectItem value="port_fees">Port Fees</SelectItem>
                    <SelectItem value="fuel_cost">Fuel Cost</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading expenses...</div>
            ) : (
              <div className="space-y-4">
                {filteredExpenses.map((expense: Expense) => (
                  <div key={expense.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{getExpenseTypeLabel(expense.type)}</Badge>
                          <Badge variant={getStatusColor(expense.approvalStatus) as any}>
                            {expense.approvalStatus}
                          </Badge>
                          {expense.vesselName && (
                            <Badge variant="secondary">{expense.vesselName}</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold mb-2">{expense.description}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <div className="font-semibold text-green-600">
                              ${expense.amount.toFixed(2)} {expense.currency}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date:</span>
                            <div>{new Date(expense.expenseDate).toLocaleDateString()}</div>
                          </div>
                          {expense.vendor && (
                            <div>
                              <span className="text-muted-foreground">Vendor:</span>
                              <div>{expense.vendor}</div>
                            </div>
                          )}
                          {expense.invoiceNumber && (
                            <div>
                              <span className="text-muted-foreground">Invoice:</span>
                              <div className="font-mono text-sm">{expense.invoiceNumber}</div>
                            </div>
                          )}
                        </div>
                        {expense.notes && (
                          <p className="text-sm text-muted-foreground mt-2">{expense.notes}</p>
                        )}
                      </div>
                      
                      {expense.approvalStatus === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            onClick={() => approveExpenseMutation.mutate({ expenseId: expense.id, action: 'approve' })}
                            disabled={approveExpenseMutation.isPending}
                            data-testid={`button-approve-${expense.id}`}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => approveExpenseMutation.mutate({ expenseId: expense.id, action: 'reject' })}
                            disabled={approveExpenseMutation.isPending}
                            data-testid={`button-reject-${expense.id}`}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {filteredExpenses.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No expenses found matching your search criteria.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}