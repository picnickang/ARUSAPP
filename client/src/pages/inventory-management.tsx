import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Users, Box, Edit, Trash2, Search, Filter, Check, X, Edit2 } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Type definitions
interface PartsInventory {
  id: string;
  orgId: string;
  partId: string;
  partNumber: string;
  partName: string;
  category: string;
  unitCost: number;
  quantityOnHand: number;
  quantityReserved: number;
  minStockLevel: number;
  maxStockLevel: number;
  stockStatus: 'critical' | 'low_stock' | 'adequate' | 'excess_stock' | 'out_of_stock';
  locationCount: number;
  unitOfMeasure?: string;
  criticality?: string;
  location?: string;
  supplierName?: string;
  supplierPartNumber?: string;
  leadTimeDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Simple test cell component - no editing functionality yet 
const SimpleStockCell = ({ 
  partId, 
  field, 
  value, 
  className = "" 
}: { 
  partId: string; 
  field: string; 
  value: number; 
  className?: string; 
}) => {
  return (
    <div 
      className={`flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 ${className}`}
      onClick={() => console.log(`Clicked ${field} for ${partId}: ${value}`)}
      data-testid={`cell-${field}-${partId}`}
    >
      <span className="font-medium">{value}</span>
      <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
    </div>
  );
};

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("parts");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStockCell, setEditingStockCell] = useState<string | null>(null);
  const [stockEditValues, setStockEditValues] = useState<{[key: string]: string}>({});
  
  const { toast } = useToast();
  const orgId = "default-org-id";

  // Fetch parts inventory data
  const { data: partsInventory = [], isLoading: isLoadingInventory } = useQuery({
    queryKey: ["/api/parts-inventory", orgId],
    queryFn: async () => {
      console.log('Fetching parts inventory...');
      const response = await fetch(`/api/parts-inventory?orgId=${orgId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch parts inventory: ${response.status}`);
      }
      const data = await response.json();
      console.log('Parts inventory response:', data);
      console.log('First item keys:', data.length > 0 ? Object.keys(data[0]) : 'No items');
      return Array.isArray(data) ? data : [];
    },
  });

  // Stock update mutation 
  const updateStockMutation = useMutation({
    mutationFn: async ({ partId, updateData }: { partId: string; updateData: any }) => {
      return apiRequest(`/api/parts-inventory/${partId}/stock`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts-inventory"] });
      toast({ title: "Success", description: "Stock level updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update stock level", 
        variant: "destructive" 
      });
    },
  });

  // Stock editing helper functions
  const handleStockEdit = (partId: string, field: string, currentValue: number) => {
    const cellKey = `${partId}-${field}`;
    setEditingStockCell(cellKey);
    setStockEditValues(prev => ({ ...prev, [cellKey]: currentValue.toString() }));
  };

  const handleStockSave = (partId: string, field: string) => {
    const cellKey = `${partId}-${field}`;
    const newValue = stockEditValues[cellKey];
    
    // Validate input
    const numValue = Number(newValue);
    if (isNaN(numValue) || !Number.isInteger(numValue)) {
      toast({ title: "Error", description: "Please enter a valid integer", variant: "destructive" });
      return;
    }

    // Business rule validation
    if ((field === 'quantityReserved' || field === 'minStockLevel' || field === 'maxStockLevel') && numValue < 0) {
      toast({ title: "Error", description: `${field} cannot be negative`, variant: "destructive" });
      return;
    }

    const updateData = { [field]: numValue };
    
    // Use regular mutate to avoid async issues
    updateStockMutation.mutate({ partId, updateData }, {
      onSuccess: () => {
        setEditingStockCell(null);
        setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
      }
    });
  };

  const handleStockCancel = (partId: string, field: string) => {
    const cellKey = `${partId}-${field}`;
    setEditingStockCell(null);
    setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
  };

  const handleStockKeyPress = (e: React.KeyboardEvent, partId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStockSave(partId, field);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleStockCancel(partId, field);
    }
  };

  // Helper function for stock value changes
  const handleStockValueChange = (cellKey: string, value: string) => {
    setStockEditValues(prev => ({ ...prev, [cellKey]: value }));
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6" data-testid="inventory-management-page">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold truncate" data-testid="text-inventory-management">Inventory Management</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your marine equipment inventory, stock levels, and suppliers
          </p>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="parts" data-testid="tab-parts">Parts Catalog</TabsTrigger>
          <TabsTrigger value="stock" data-testid="tab-stock">Stock Levels</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">Suppliers</TabsTrigger>
        </TabsList>
        
        <TabsContent value="parts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parts Catalog</CardTitle>
              <CardDescription>
                Manage your marine equipment parts catalog
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Parts catalog functionality will be added here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels Management</CardTitle>
              <CardDescription>
                Monitor and manage stock levels with inline editing capabilities
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingInventory ? (
                <div>Loading inventory data...</div>
              ) : (
                <div>
                  <p>Found {partsInventory.length} inventory items</p>
                  {partsInventory.length > 0 && console.log('First inventory item:', partsInventory[0])}
                  {partsInventory.length > 0 && (
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Part Number</TableHead>
                            <TableHead>Part Name</TableHead>
                            <TableHead>On Hand</TableHead>
                            <TableHead>Reserved</TableHead>
                            <TableHead>Min Level</TableHead>
                            <TableHead>Max Level</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {partsInventory.map((item: PartsInventory) => (
                            <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                              <TableCell className="font-medium">{item.partNumber}</TableCell>
                              <TableCell>{item.partName}</TableCell>
                              <TableCell className="p-1">
                                <SimpleStockCell
                                  partId={item.id}
                                  field="quantityOnHand"
                                  value={item.quantityOnHand}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <SimpleStockCell
                                  partId={item.id}
                                  field="quantityReserved"
                                  value={item.quantityReserved}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <SimpleStockCell
                                  partId={item.id}
                                  field="minStockLevel"
                                  value={item.minStockLevel}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <SimpleStockCell
                                  partId={item.id}
                                  field="maxStockLevel"
                                  value={item.maxStockLevel}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.stockStatus}</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>
                Manage your supplier information and relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Suppliers functionality will be added here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}