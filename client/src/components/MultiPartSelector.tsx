import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Package, Search, ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { getCurrentOrgId } from '@/hooks/useOrganization';
import { useCustomMutation } from '@/hooks/useCrudMutations';

interface Part {
  id: string;
  partNumber: string;
  partName: string;
  description?: string;
  standardCost?: number;
  stock?: {
    id: string;
    quantityOnHand: number;
    unitCost: number;
    location?: string;
  };
}

interface SelectedPart {
  partId: string;
  partNumber: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  notes?: string;
}

interface MultiPartSelectorProps {
  workOrderId: string;
  onPartsAdded?: () => void;
}

interface CrewMember {
  id: string;
  name: string;
  rank?: string;
}

export function MultiPartSelector({ workOrderId, onPartsAdded }: MultiPartSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  const [usedBy, setUsedBy] = useState('');
  const { toast } = useToast();

  // Fetch available parts with stock information
  const { data: availableParts = [], isLoading } = useQuery({
    queryKey: ['/api/parts-inventory', searchTerm],
    queryFn: async () => {
      const url = searchTerm 
        ? `/api/parts-inventory?search=${encodeURIComponent(searchTerm)}`
        : '/api/parts-inventory';
      return apiRequest('GET', url);
    },
  });

  // Fetch ALL engineers for the technician dropdown
  const { data: engineers = [] } = useQuery<CrewMember[]>({
    queryKey: ['/api/crew', { role: 'engineer' }],
    queryFn: () => apiRequest('GET', '/api/crew?role=engineer'),
  });

  // Fetch existing work order parts
  const { data: existingParts = [] } = useQuery({
    queryKey: [`/api/work-orders/${workOrderId}/parts`],
    queryFn: () => apiRequest('GET', `/api/work-orders/${workOrderId}/parts`),
  });

  // Parts mutation using reusable hook
  const addPartsMutation = useCustomMutation<SelectedPart[], any>({
    mutationFn: async (parts: SelectedPart[]) => {
      const payload = {
        parts: parts.map(part => ({
          partId: part.partId,
          quantity: part.quantity,
          usedBy: usedBy || 'Unknown',
          notes: part.notes || ''
        }))
      };
      return apiRequest('POST', `/api/work-orders/${workOrderId}/parts/bulk`, payload);
    },
    invalidateKeys: [`/api/work-orders/${workOrderId}/parts`],
    onSuccess: (response) => {
      const summary = response.summary;
      toast({
        title: 'Parts Added Successfully',
        description: `Added ${summary.added} parts, updated ${summary.updated} parts${summary.errors > 0 ? `, ${summary.errors} errors` : ''}`,
      });
      
      // Clear selected parts and refresh data
      setSelectedParts([]);
      setUsedBy('');
      onPartsAdded?.();
    },
  });

  const addPartToSelection = (part: Part) => {
    const existingIndex = selectedParts.findIndex(p => p.partId === part.id);
    
    if (existingIndex >= 0) {
      // Update quantity if part already selected
      const updated = [...selectedParts];
      updated[existingIndex].quantity += 1;
      updated[existingIndex].totalCost = updated[existingIndex].quantity * updated[existingIndex].unitCost;
      setSelectedParts(updated);
    } else {
      // Add new part to selection
      const unitCost = part.stock?.unitCost || part.standardCost || 0;
      const newPart: SelectedPart = {
        partId: part.id,
        partNumber: part.partNumber,
        partName: part.partName,
        quantity: 1,
        unitCost,
        totalCost: unitCost,
      };
      setSelectedParts([...selectedParts, newPart]);
    }
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    if (quantity <= 0) {
      setSelectedParts(selectedParts.filter(p => p.partId !== partId));
      return;
    }

    const updated = selectedParts.map(part => 
      part.partId === partId
        ? { ...part, quantity, totalCost: quantity * part.unitCost }
        : part
    );
    setSelectedParts(updated);
  };

  const updatePartNotes = (partId: string, notes: string) => {
    const updated = selectedParts.map(part => 
      part.partId === partId ? { ...part, notes } : part
    );
    setSelectedParts(updated);
  };

  const removePartFromSelection = (partId: string) => {
    setSelectedParts(selectedParts.filter(p => p.partId !== partId));
  };

  const getTotalCost = () => {
    return selectedParts.reduce((total, part) => total + part.totalCost, 0);
  };

  const getStockStatus = (part: Part) => {
    if (!part.stock) return { status: 'unknown', color: 'bg-gray-500' };
    
    const stock = part.stock.quantityOnHand;
    if (stock === 0) return { status: 'Out of Stock', color: 'bg-red-500' };
    if (stock < 5) return { status: 'Low Stock', color: 'bg-yellow-500' };
    return { status: 'In Stock', color: 'bg-green-500' };
  };

  const filteredParts = availableParts.filter((part: Part) =>
    part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.partName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Available Parts Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Available Parts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parts by number or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-parts"
            />
          </div>

          {/* Parts Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Part Number</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading parts...
                    </TableCell>
                  </TableRow>
                ) : filteredParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? 'No parts found matching your search' : 'No parts available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParts.map((part: Part) => {
                    const stockStatus = getStockStatus(part);
                    return (
                      <TableRow key={part.id}>
                        <TableCell className="font-mono text-sm">{part.partNumber}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{part.partName}</div>
                            {part.description && (
                              <div className="text-sm text-muted-foreground">{part.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={`${stockStatus.color} text-white`}>
                              {part.stock?.quantityOnHand || 0}
                            </Badge>
                            <span className="text-sm text-muted-foreground">{stockStatus.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          ${(part.stock?.unitCost || part.standardCost || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {part.stock?.location || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => addPartToSelection(part)}
                            disabled={!part.stock || part.stock.quantityOnHand === 0}
                            data-testid={`button-add-part-${part.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Selected Parts Section */}
      {selectedParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Selected Parts ({selectedParts.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Technician Dropdown */}
            <div>
              <label className="text-sm font-medium mb-2 block">Technician / Engineer</label>
              <Select value={usedBy} onValueChange={setUsedBy}>
                <SelectTrigger data-testid="select-technician">
                  <SelectValue placeholder="Select technician..." />
                </SelectTrigger>
                <SelectContent>
                  {engineers.map((engineer) => (
                    <SelectItem key={engineer.id} value={engineer.name} data-testid={`option-engineer-${engineer.id}`}>
                      {engineer.name} {engineer.rank ? `- ${engineer.rank}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Selected Parts List */}
            <div className="space-y-3">
              {selectedParts.map((part) => (
                <div key={part.partId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{part.partNumber}</div>
                      <div className="text-sm text-muted-foreground">{part.partName}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removePartFromSelection(part.partId)}
                      data-testid={`button-remove-part-${part.partId}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        value={part.quantity}
                        onChange={(e) => updatePartQuantity(part.partId, parseInt(e.target.value) || 0)}
                        data-testid={`input-quantity-${part.partId}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Unit Cost</label>
                      <div className="text-sm py-2">${part.unitCost.toFixed(2)}</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Total</label>
                      <div className="text-sm py-2 font-medium">${part.totalCost.toFixed(2)}</div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">Notes (Optional)</label>
                    <Input
                      placeholder="Installation notes..."
                      value={part.notes || ''}
                      onChange={(e) => updatePartNotes(part.partId, e.target.value)}
                      data-testid={`input-notes-${part.partId}`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Summary and Submit */}
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                Total Cost: ${getTotalCost().toFixed(2)}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedParts([])}
                  data-testid="button-clear-selection"
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => addPartsMutation.mutate(selectedParts)}
                  disabled={addPartsMutation.isPending || selectedParts.length === 0 || !usedBy.trim()}
                  data-testid="button-add-parts"
                >
                  {addPartsMutation.isPending ? 'Adding...' : `Add ${selectedParts.length} Part${selectedParts.length === 1 ? '' : 's'}`}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Parts Summary */}
      {existingParts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Parts Already Used ({existingParts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {existingParts.map((part: any) => (
                <div key={part.id} className="flex justify-between items-center text-sm border-b pb-2">
                  <div>
                    <span className="font-medium">{part.partId}</span>
                    <span className="text-muted-foreground ml-2">× {part.quantityUsed}</span>
                  </div>
                  <div className="text-right">
                    <div>${part.totalCost.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">by {part.usedBy}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}