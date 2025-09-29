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

// This component will be moved inside InventoryManagement to access state/handlers

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("parts");
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStockCell, setEditingStockCell] = useState<string | null>(null);
  const [stockEditValues, setStockEditValues] = useState<{[key: string]: string}>({});
  
  const { toast } = useToast();
  const orgId = "default-org-id";

  // Fetch parts inventory data
  const { data: partsInventory = [], isLoading: isLoadingInventory, error } = useQuery({
    queryKey: ["parts-inventory", orgId],
    queryFn: async () => {
      const response = await fetch(`/api/parts-inventory?orgId=${orgId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch parts inventory: ${response.status}`);
      }
      const data = await response.json();
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
      queryClient.invalidateQueries({ queryKey: ["parts-inventory", orgId] });
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
  const handleStockEdit = (partId: string, field: string, currentValue: number | string) => {
    const cellKey = `${partId}-${field}`;
    setEditingStockCell(cellKey);
    setStockEditValues(prev => ({ ...prev, [cellKey]: currentValue.toString() }));
  };

  // SimpleStockCell component inside InventoryManagement to access state/handlers
  const SimpleStockCell = ({ 
    partId, 
    field, 
    value, 
    className = "" 
  }: { 
    partId: string; 
    field: string; 
    value: number | string; 
    className?: string; 
  }) => {
    const cellKey = `${partId}-${field}`;
    const isEditing = editingStockCell === cellKey;
    const inputValue = stockEditValues[cellKey] || "";

    if (isEditing) {
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
          <Input
            type={field === 'location' ? 'text' : 'number'}
            step={field === 'unitCost' ? '0.01' : '1'}
            value={inputValue}
            onChange={(e) => handleStockValueChange(cellKey, e.target.value)}
            onKeyDown={(e) => handleStockKeyPress(e, partId, field)}
            className="h-8 text-sm"
            data-testid={`input-${field}-${partId}`}
            autoFocus
          />
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStockSave(partId, field)}
              className="h-6 w-6 p-0"
              data-testid={`button-save-${partId}`}
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleStockCancel(partId, field)}
              className="h-6 w-6 p-0"
              data-testid={`button-cancel-${partId}`}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className={`flex items-center justify-between group cursor-pointer hover:bg-muted/50 rounded px-2 py-1 ${className}`}
        onClick={() => handleStockEdit(partId, field, value)}
        data-testid={`cell-${field}-${partId}`}
      >
        <span className="font-medium">{value}</span>
        <Edit2 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
      </div>
    );
  };

  const handleStockSave = (partId: string, field: string) => {
    const cellKey = `${partId}-${field}`;
    const newValue = stockEditValues[cellKey];
    
    let updateData: any = {};
    
    // Handle different field types
    if (field === 'location') {
      // Location is a text field
      if (!newValue || newValue.trim() === '') {
        toast({ title: "Error", description: "Location cannot be empty", variant: "destructive" });
        return;
      }
      updateData[field] = newValue.trim();
    } else {
      // Numeric fields (quantities and costs)
      const numValue = Number(newValue);
      
      // Validate numeric input
      if (isNaN(numValue)) {
        toast({ title: "Error", description: "Please enter a valid number", variant: "destructive" });
        return;
      }
      
      // Integer fields vs decimal fields
      if (field === 'unitCost') {
        // Allow decimals for unit cost
        if (numValue < 0) {
          toast({ title: "Error", description: "Unit cost cannot be negative", variant: "destructive" });
          return;
        }
        updateData[field] = numValue;
      } else {
        // Integer quantities (quantityOnHand, quantityReserved)
        if (!Number.isInteger(numValue)) {
          toast({ title: "Error", description: "Quantity must be a whole number", variant: "destructive" });
          return;
        }
        
        // Business rule validation for specific fields
        if (field === 'quantityReserved' && numValue < 0) {
          toast({ title: "Error", description: "Reserved quantity cannot be negative", variant: "destructive" });
          return;
        }
        
        updateData[field] = numValue;
      }
    }
    
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
                  {error && <p className="text-red-600">Error: {error.message}</p>}
                  {partsInventory.length > 0 && (
                    <div className="mt-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Part Number</TableHead>
                            <TableHead>Part Name</TableHead>
                            <TableHead>On Hand</TableHead>
                            <TableHead>Reserved</TableHead>
                            <TableHead>Unit Cost</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {partsInventory.map((item: any) => (
                            <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                              <TableCell className="font-medium">{item.partNumber}</TableCell>
                              <TableCell>{item.partName}</TableCell>
                              <TableCell className="p-1">
                                <SimpleStockCell
                                  partId={item.id}
                                  field="quantityOnHand"
                                  value={item.stock?.quantityOnHand || 0}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <SimpleStockCell
                                  partId={item.id}
                                  field="quantityReserved"
                                  value={item.stock?.quantityReserved || 0}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <SimpleStockCell
                                  partId={item.id}
                                  field="unitCost"
                                  value={item.stock?.unitCost || 0}
                                />
                              </TableCell>
                              <TableCell className="p-1">
                                <SimpleStockCell
                                  partId={item.id}
                                  field="location"
                                  value={item.stock?.location || "MAIN"}
                                />
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={
                                  item.stock?.status === 'out_of_stock' ? 'bg-red-100 text-red-800' :
                                  item.stock?.status === 'excess_stock' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }>
                                  {item.stock?.status?.replace('_', ' ').toUpperCase() || 'UNKNOWN'}
                                </Badge>
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