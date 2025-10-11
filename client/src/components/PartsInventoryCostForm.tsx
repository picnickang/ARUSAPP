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
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useCreateMutation, useCustomMutation } from '@/hooks/useCrudMutations';
import { 
  Package, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  Search,
  Edit2,
  Save,
  X
} from 'lucide-react';

interface PartsInventory {
  id: string;
  partNo: string;
  name: string;
  category: string;
  unitCost: number;
  quantityOnHand: number;
  quantityReserved: number;
  minStockLevel: number;
  maxStockLevel: number;
  leadTimeDays: number;
  supplier: string;
  lastUpdated: Date;
}

const partCostSchema = z.object({
  partNo: z.string().min(1, 'Part number is required'),
  name: z.string().min(1, 'Part name is required'),
  category: z.string().min(1, 'Category is required'),
  unitCost: z.number().min(0.01, 'Unit cost must be greater than 0'),
  quantityOnHand: z.number().min(0, 'Quantity cannot be negative'),
  minStockLevel: z.number().min(0, 'Minimum stock cannot be negative'),
  maxStockLevel: z.number().min(1, 'Maximum stock must be at least 1'),
  leadTimeDays: z.number().min(1, 'Lead time must be at least 1 day'),
  supplier: z.string().min(1, 'Supplier is required'),
});

const costUpdateSchema = z.object({
  unitCost: z.number().min(0.01, 'Unit cost must be greater than 0'),
  supplier: z.string().min(1, 'Supplier is required'),
  notes: z.string().optional(),
});

export function PartsInventoryCostForm() {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPart, setEditingPart] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { toast } = useToast();

  // Fetch parts inventory
  const { data: partsInventory = [], isLoading } = useQuery({
    queryKey: ['/api/parts-inventory'],
  });

  // Create new part form
  const newPartForm = useForm<z.infer<typeof partCostSchema>>({
    resolver: zodResolver(partCostSchema),
    defaultValues: {
      unitCost: 0,
      quantityOnHand: 0,
      minStockLevel: 1,
      maxStockLevel: 10,
      leadTimeDays: 7,
    },
  });

  // Update cost form
  const updateCostForm = useForm<z.infer<typeof costUpdateSchema>>({
    resolver: zodResolver(costUpdateSchema),
  });

  // Create part mutation using reusable hook
  const createPartMutation = useCreateMutation({
    endpoint: '/api/parts-inventory',
    invalidateKeys: ['/api/parts-inventory'],
    successMessage: 'New part has been added to inventory with cost information.',
    onSuccess: () => newPartForm.reset(),
  });

  // Update cost mutation using reusable hook
  const updateCostMutation = useCustomMutation<{ partId: string; costData: z.infer<typeof costUpdateSchema> }, any>({
    mutationFn: async ({ partId, costData }) => {
      return apiRequest('PATCH', `/api/parts-inventory/${partId}/cost`, costData);
    },
    invalidateKeys: ['/api/parts-inventory'],
    successMessage: 'Part cost information has been updated.',
    onSuccess: () => {
      setEditingPart(null);
      updateCostForm.reset();
    },
  });

  // Filter parts based on search and category
  const filteredParts = partsInventory.filter((part: PartsInventory) => {
    const matchesSearch = part.partNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         part.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = [...new Set(partsInventory.map((part: PartsInventory) => part.category))];

  const handleEditPart = (part: PartsInventory) => {
    setEditingPart(part.id);
    updateCostForm.reset({
      unitCost: part.unitCost,
      supplier: part.supplier,
    });
  };

  const handleUpdateCost = (partId: string, data: z.infer<typeof costUpdateSchema>) => {
    updateCostMutation.mutate({ partId, costData: data });
  };

  const getStockStatus = (part: PartsInventory) => {
    const available = part.quantityOnHand - part.quantityReserved;
    if (available <= 0) return { status: 'out-of-stock', color: 'destructive' };
    if (available <= part.minStockLevel) return { status: 'low-stock', color: 'warning' };
    if (available >= part.maxStockLevel) return { status: 'overstock', color: 'secondary' };
    return { status: 'normal', color: 'success' };
  };

  const calculateInventoryValue = () => {
    return partsInventory.reduce((total: number, part: PartsInventory) => 
      total + (part.quantityOnHand * part.unitCost), 0
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              <div className="text-sm text-muted-foreground">Total Parts</div>
            </div>
            <div className="text-2xl font-bold">{partsInventory.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-500" />
              <div className="text-sm text-muted-foreground">Inventory Value</div>
            </div>
            <div className="text-2xl font-bold">${calculateInventoryValue().toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div className="text-sm text-muted-foreground">Low Stock Items</div>
            </div>
            <div className="text-2xl font-bold">
              {partsInventory.filter((p: PartsInventory) => 
                (p.quantityOnHand - p.quantityReserved) <= p.minStockLevel
              ).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              <div className="text-sm text-muted-foreground">Avg. Unit Cost</div>
            </div>
            <div className="text-2xl font-bold">
              ${partsInventory.length > 0 ? 
                (partsInventory.reduce((sum: number, p: PartsInventory) => sum + p.unitCost, 0) / partsInventory.length).toFixed(2) : 
                '0.00'
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add New Part Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Add New Part with Cost Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...newPartForm}>
            <form onSubmit={newPartForm.handleSubmit((data) => createPartMutation.mutate(data))} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={newPartForm.control}
                  name="partNo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part Number</FormLabel>
                      <FormControl>
                        <Input placeholder="P123456" {...field} data-testid="input-new-part-no" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPartForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Engine Oil Filter" {...field} data-testid="input-new-part-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPartForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="Filters" {...field} data-testid="input-new-part-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPartForm.control}
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
                          data-testid="input-new-part-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPartForm.control}
                  name="supplier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Marine Parts" {...field} data-testid="input-new-part-supplier" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPartForm.control}
                  name="leadTimeDays"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Time (Days)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="7"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-new-part-leadtime"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={newPartForm.control}
                  name="quantityOnHand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-new-part-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPartForm.control}
                  name="minStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Minimum Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          placeholder="2"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-new-part-min"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPartForm.control}
                  name="maxStockLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Maximum Stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          placeholder="20"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                          data-testid="input-new-part-max"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <Button type="submit" disabled={createPartMutation.isPending} data-testid="button-create-part">
                {createPartMutation.isPending ? 'Creating...' : 'Create Part'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Parts Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle>Parts Inventory Cost Management</CardTitle>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                data-testid="input-search-parts"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading parts inventory...</div>
          ) : (
            <div className="space-y-4">
              {filteredParts.map((part: PartsInventory) => {
                const stockStatus = getStockStatus(part);
                const available = part.quantityOnHand - part.quantityReserved;
                const isEditing = editingPart === part.id;

                return (
                  <div key={part.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{part.partNo}</code>
                          <h3 className="font-semibold">{part.name}</h3>
                          <Badge variant="outline">{part.category}</Badge>
                          <Badge variant={stockStatus.color as any}>{stockStatus.status}</Badge>
                        </div>
                        
                        {isEditing ? (
                          <Form {...updateCostForm}>
                            <form onSubmit={updateCostForm.handleSubmit((data) => handleUpdateCost(part.id, data))} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <FormField
                                  control={updateCostForm.control}
                                  name="unitCost"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Unit Cost ($)</FormLabel>
                                      <FormControl>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          data-testid={`input-edit-cost-${part.id}`}
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={updateCostForm.control}
                                  name="supplier"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Supplier</FormLabel>
                                      <FormControl>
                                        <Input {...field} data-testid={`input-edit-supplier-${part.id}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={updateCostForm.control}
                                  name="notes"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Notes</FormLabel>
                                      <FormControl>
                                        <Input placeholder="Price update reason..." {...field} data-testid={`input-edit-notes-${part.id}`} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <div className="flex gap-2">
                                <Button type="submit" size="sm" disabled={updateCostMutation.isPending} data-testid={`button-save-cost-${part.id}`}>
                                  <Save className="h-4 w-4 mr-2" />
                                  Save
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setEditingPart(null)} data-testid={`button-cancel-edit-${part.id}`}>
                                  <X className="h-4 w-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </Form>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Unit Cost:</span>
                              <div className="font-semibold text-green-600">${part.unitCost.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Available:</span>
                              <div className="font-semibold">{available}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">On Hand:</span>
                              <div>{part.quantityOnHand}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Reserved:</span>
                              <div>{part.quantityReserved}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Supplier:</span>
                              <div>{part.supplier}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Lead Time:</span>
                              <div>{part.leadTimeDays} days</div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {!isEditing && (
                        <div className="flex flex-col items-end gap-2">
                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Total Value</div>
                            <div className="text-lg font-bold">
                              ${(part.quantityOnHand * part.unitCost).toFixed(2)}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditPart(part)}
                            data-testid={`button-edit-cost-${part.id}`}
                          >
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit Cost
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {filteredParts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No parts found matching your search criteria.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}