import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Plus, Package, Users, Box, Edit, Trash2, Search, Filter, Check, X, Edit2, AlertTriangle } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";

// Type definitions
interface PartsInventory {
  id: string;
  partNumber: string;
  partName: string;
  description?: string;
  category: string;
  unitOfMeasure?: string;
  standardCost?: number;
  criticality?: string;
  leadTimeDays: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  stock?: {
    id: string;
    quantityOnHand: number;
    quantityReserved: number;
    quantityOnOrder: number;
    availableQuantity: number;
    unitCost: number;
    location: string;
    status: string;
  };
}

// Form schema for adding/editing parts
const partFormSchema = z.object({
  partNumber: z.string().min(1, "Part number is required"),
  partName: z.string().min(1, "Part name is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  unitOfMeasure: z.string().optional(),
  standardCost: z.number({ required_error: "Standard cost is required", invalid_type_error: "Standard cost must be a number" }).min(0, "Standard cost cannot be negative"),
  criticality: z.string().optional(),
  leadTimeDays: z.number({ required_error: "Lead time is required", invalid_type_error: "Lead time must be a number" }).min(1, "Lead time must be at least 1 day"),
  quantityOnHand: z.number({ required_error: "Quantity is required", invalid_type_error: "Quantity must be a number" }).min(0, "Quantity cannot be negative"),
  minStockLevel: z.number({ required_error: "Min stock is required", invalid_type_error: "Min stock must be a number" }).min(0, "Minimum stock cannot be negative"),
  maxStockLevel: z.number({ required_error: "Max stock is required", invalid_type_error: "Max stock must be a number" }).min(1, "Maximum stock must be at least 1"),
  location: z.string().optional(),
});

type PartFormData = z.infer<typeof partFormSchema>;

export default function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [editingStockCell, setEditingStockCell] = useState<string | null>(null);
  const [stockEditValues, setStockEditValues] = useState<{[key: string]: string}>({});
  const [isAddPartDialogOpen, setIsAddPartDialogOpen] = useState(false);
  const [isEditPartDialogOpen, setIsEditPartDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<PartsInventory | null>(null);
  
  const { toast } = useToast();
  const orgId = "default-org-id";

  // Part form for adding/editing
  const partForm = useForm<PartFormData>({
    resolver: zodResolver(partFormSchema),
    defaultValues: {
      partNumber: "",
      partName: "",
      description: "",
      category: "",
      unitOfMeasure: "ea",
      standardCost: 0,
      criticality: "medium",
      leadTimeDays: 7,
      quantityOnHand: 0,
      minStockLevel: 1,
      maxStockLevel: 100,
      location: "MAIN",
    },
  });

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

  // Part mutations
  const createPartMutation = useMutation({
    mutationFn: async (data: PartFormData) => {
      return apiRequest('POST', '/api/parts-inventory', {
        partNo: data.partNumber,
        name: data.partName,
        category: data.category,
        unitCost: data.standardCost,
        quantityOnHand: data.quantityOnHand,
        minStockLevel: data.minStockLevel,
        maxStockLevel: data.maxStockLevel,
        leadTimeDays: data.leadTimeDays,
        supplier: "TBD",
        orgId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts-inventory", orgId] });
      setIsAddPartDialogOpen(false);
      partForm.reset();
      toast({ title: "Success", description: "Part added successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to add part", 
        variant: "destructive" 
      });
    },
  });

  const updatePartMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PartFormData }) => {
      return apiRequest('PUT', `/api/parts-inventory/${id}`, {
        partNo: data.partNumber,
        name: data.partName,
        category: data.category,
        unitCost: data.standardCost,
        quantityOnHand: data.quantityOnHand,
        minStockLevel: data.minStockLevel,
        maxStockLevel: data.maxStockLevel,
        leadTimeDays: data.leadTimeDays,
        supplier: "TBD",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts-inventory", orgId] });
      setIsEditPartDialogOpen(false);
      setEditingPart(null);
      partForm.reset();
      toast({ title: "Success", description: "Part updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update part", 
        variant: "destructive" 
      });
    },
  });

  const deletePartMutation = useMutation({
    mutationFn: async (partId: string) => {
      return apiRequest('DELETE', `/api/parts-inventory/${partId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parts-inventory", orgId] });
      toast({ title: "Success", description: "Part deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete part", 
        variant: "destructive" 
      });
    },
  });

  // Stock update mutation 
  const updateStockMutation = useMutation({
    mutationFn: async ({ partId, updateData }: { partId: string; updateData: any }) => {
      return apiRequest('PATCH', `/api/parts-inventory/${partId}/stock`, updateData);
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
      // Category field uses a select dropdown
      if (field === 'category') {
        return (
          <div className={`flex items-center space-x-2 ${className}`}>
            <Select 
              value={inputValue} 
              onValueChange={(val) => handleStockValueChange(cellKey, val)}
            >
              <SelectTrigger className="h-8 text-sm" data-testid={`select-${field}-${partId}`}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="filters">Filters</SelectItem>
                <SelectItem value="belts">Belts</SelectItem>
                <SelectItem value="fluids">Fluids</SelectItem>
                <SelectItem value="electrical">Electrical</SelectItem>
                <SelectItem value="mechanical">Mechanical</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
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
      
      // Text and number inputs
      const isTextField = field === 'location' || field === 'partNumber' || field === 'partName';
      const isDecimalField = field === 'unitCost' || field === 'standardCost';
      
      return (
        <div className={`flex items-center space-x-2 ${className}`}>
          <Input
            type={isTextField ? 'text' : 'number'}
            step={isDecimalField ? '0.01' : '1'}
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
    
    // Text fields (partNumber, partName, location)
    if (field === 'partNumber' || field === 'partName' || field === 'location') {
      if (!newValue || newValue.trim() === '') {
        toast({ title: "Error", description: `${field === 'partNumber' ? 'Part number' : field === 'partName' ? 'Part name' : 'Location'} cannot be empty`, variant: "destructive" });
        return;
      }
      
      const partUpdateData: any = {};
      if (field === 'partNumber') {
        partUpdateData.partNo = newValue.trim();
      } else if (field === 'partName') {
        partUpdateData.name = newValue.trim();
      }
      
      if (field === 'location') {
        updateStockMutation.mutate({ partId, updateData: { location: newValue.trim() } }, {
          onSuccess: () => {
            setEditingStockCell(null);
            setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
          }
        });
      } else {
        updatePartMutation.mutate({ id: partId, data: partUpdateData as any }, {
          onSuccess: () => {
            setEditingStockCell(null);
            setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
          }
        });
      }
      return;
    }
    
    // Category field
    if (field === 'category') {
      if (!newValue) {
        toast({ title: "Error", description: "Category cannot be empty", variant: "destructive" });
        return;
      }
      updatePartMutation.mutate({ id: partId, data: { category: newValue } as any }, {
        onSuccess: () => {
          setEditingStockCell(null);
          setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
        }
      });
      return;
    }
    
    // Numeric fields
    const numValue = Number(newValue);
    
    if (isNaN(numValue)) {
      toast({ title: "Error", description: "Please enter a valid number", variant: "destructive" });
      return;
    }
    
    // standardCost, leadTimeDays, unitCost
    if (field === 'standardCost') {
      if (numValue < 0) {
        toast({ title: "Error", description: "Standard cost cannot be negative", variant: "destructive" });
        return;
      }
      updatePartMutation.mutate({ id: partId, data: { unitCost: numValue } as any }, {
        onSuccess: () => {
          setEditingStockCell(null);
          setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
        }
      });
    } else if (field === 'leadTimeDays') {
      if (!Number.isInteger(numValue) || numValue < 1) {
        toast({ title: "Error", description: "Lead time must be a positive whole number", variant: "destructive" });
        return;
      }
      updatePartMutation.mutate({ id: partId, data: { leadTimeDays: numValue } as any }, {
        onSuccess: () => {
          setEditingStockCell(null);
          setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
        }
      });
    } else if (field === 'unitCost') {
      if (numValue < 0) {
        toast({ title: "Error", description: "Unit cost cannot be negative", variant: "destructive" });
        return;
      }
      updateStockMutation.mutate({ partId, updateData: { unitCost: numValue } }, {
        onSuccess: () => {
          setEditingStockCell(null);
          setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
        }
      });
    } else {
      // Integer quantities (quantityOnHand, quantityReserved)
      if (!Number.isInteger(numValue)) {
        toast({ title: "Error", description: "Quantity must be a whole number", variant: "destructive" });
        return;
      }
      
      if (field === 'quantityReserved' && numValue < 0) {
        toast({ title: "Error", description: "Reserved quantity cannot be negative", variant: "destructive" });
        return;
      }
      
      updateStockMutation.mutate({ partId, updateData: { [field]: numValue } }, {
        onSuccess: () => {
          setEditingStockCell(null);
          setStockEditValues(prev => ({ ...prev, [cellKey]: "" }));
        }
      });
    }
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

  // Part management handlers
  const handleAddPart = () => {
    partForm.reset();
    setIsAddPartDialogOpen(true);
  };

  const handleEditPart = (part: PartsInventory) => {
    setEditingPart(part);
    partForm.reset({
      partNumber: part.partNumber,
      partName: part.partName,
      description: part.description || "",
      category: part.category,
      unitOfMeasure: part.unitOfMeasure || "ea",
      standardCost: part.standardCost ?? 0,
      criticality: part.criticality || "medium",
      leadTimeDays: part.leadTimeDays,
      quantityOnHand: part.stock?.quantityOnHand ?? 0,
      minStockLevel: part.minStockLevel ?? 1,
      maxStockLevel: part.maxStockLevel ?? 100,
      location: part.stock?.location || "MAIN",
    });
    setIsEditPartDialogOpen(true);
  };

  const handleDeletePart = (part: PartsInventory) => {
    if (confirm(`Are you sure you want to delete "${part.partName}" (${part.partNumber})?`)) {
      deletePartMutation.mutate(part.id);
    }
  };

  const onSubmitPart = (data: PartFormData) => {
    if (editingPart) {
      updatePartMutation.mutate({ id: editingPart.id, data });
    } else {
      createPartMutation.mutate(data);
    }
  };

  // Filtering and data processing
  const filteredParts = partsInventory.filter(part => {
    const matchesSearch = searchTerm === '' ||
      part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      part.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(partsInventory.map(part => part.category))).sort();

  // Stock status calculation
  const getStockStatus = (part: PartsInventory) => {
    if (!part.stock) return 'unknown';
    const { quantityOnHand, quantityReserved } = part.stock;
    const available = Math.max(0, quantityOnHand - quantityReserved);
    const minStock = part.minStockLevel;
    const maxStock = part.maxStockLevel;
    
    // Use the same logic as backend calculateStockStatus
    if (quantityOnHand <= 0) return 'out_of_stock';
    if (available <= 0) return 'critical';
    if (available < minStock * 0.5) return 'critical';
    if (available < minStock) return 'low_stock';
    if (available > maxStock) return 'excess_stock';
    return 'adequate';
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'out_of_stock':
      case 'critical':
        return 'destructive';
      case 'low_stock':
        return 'secondary';
      case 'excess_stock':
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6" data-testid="inventory-management-page">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div className="min-w-0">
          <h1 className="text-xl md:text-3xl font-bold truncate" data-testid="text-inventory-management">
            Parts & Inventory Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Unified parts catalog and stock level management
          </p>
        </div>
        <Button onClick={handleAddPart} data-testid="button-add-part">
          <Plus className="h-4 w-4 mr-2" />
          Add Part
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Parts Catalog & Stock Levels
          </CardTitle>
          <CardDescription>
            Manage parts catalog and stock levels in one unified interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-y-0 md:space-x-4 mb-6">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search parts by number, name, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
                data-testid="input-search-parts"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48" data-testid="select-category-filter">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoadingInventory ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p>Loading inventory data...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-2" />
                <p className="text-destructive">Error loading inventory: {error.message}</p>
              </div>
            </div>
          ) : filteredParts.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Part Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Standard Cost</TableHead>
                    <TableHead>On Hand</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => {
                    const stockStatus = getStockStatus(part);
                    return (
                      <TableRow key={part.id} data-testid={`row-part-${part.id}`}>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="partNumber"
                            value={part.partNumber}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="partName"
                            value={part.partName}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="category"
                            value={part.category}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="standardCost"
                            value={part.standardCost || part.stock?.unitCost || 0}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="quantityOnHand"
                            value={part.stock?.quantityOnHand || 0}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="quantityReserved"
                            value={part.stock?.quantityReserved || 0}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="unitCost"
                            value={part.stock?.unitCost || part.standardCost || 0}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-green-600 dark:text-green-400">
                          ${((part.stock?.unitCost || part.standardCost || 0) * (part.stock?.quantityOnHand || 0)).toFixed(2)}
                        </TableCell>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="location"
                            value={part.stock?.location || "MAIN"}
                          />
                        </TableCell>
                        <TableCell className="p-1">
                          <SimpleStockCell
                            partId={part.id}
                            field="leadTimeDays"
                            value={part.leadTimeDays}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(stockStatus)}>
                            {stockStatus.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditPart(part)}
                              data-testid={`button-edit-${part.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePart(part)}
                              data-testid={`button-delete-${part.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No parts found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || selectedCategory !== 'all'
                  ? "No parts match your search criteria."
                  : "Get started by adding your first part to the catalog."
                }
              </p>
              <Button onClick={handleAddPart} data-testid="button-add-first-part">
                <Plus className="h-4 w-4 mr-2" />
                Add First Part
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Part Dialog */}
      <Dialog open={isAddPartDialogOpen || isEditPartDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsAddPartDialogOpen(false);
          setIsEditPartDialogOpen(false);
          setEditingPart(null);
          partForm.reset();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPart ? "Edit Part" : "Add New Part"}</DialogTitle>
            <DialogDescription>
              {editingPart ? "Update the part information" : "Add a new part to your inventory catalog"}
            </DialogDescription>
          </DialogHeader>
          <Form {...partForm}>
            <form onSubmit={partForm.handleSubmit(onSubmitPart)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={partForm.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="P12345" {...field} data-testid="input-part-number" />
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
                      <FormLabel>Part Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Marine engine filter" {...field} data-testid="input-part-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={partForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Part description..." {...field} data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={partForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="filters">Filters</SelectItem>
                            <SelectItem value="belts">Belts</SelectItem>
                            <SelectItem value="fluids">Fluids</SelectItem>
                            <SelectItem value="electrical">Electrical</SelectItem>
                            <SelectItem value="mechanical">Mechanical</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={partForm.control}
                  name="unitOfMeasure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure</FormLabel>
                      <FormControl>
                        <Input placeholder="ea, gal, ft" {...field} data-testid="input-unit-measure" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={partForm.control}
                  name="criticality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Criticality</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger data-testid="select-criticality">
                            <SelectValue placeholder="Select criticality" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="critical">Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={partForm.control}
                  name="standardCost"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Standard Cost *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          value={value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || val === "-") {
                              onChange("");
                            } else {
                              const numVal = parseFloat(val);
                              onChange(isNaN(numVal) ? "" : numVal);
                            }
                          }}
                          data-testid="input-standard-cost"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={partForm.control}
                  name="leadTimeDays"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Lead Time (Days) *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="7"
                          value={value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || val === "-") {
                              onChange("");
                            } else {
                              const numVal = parseInt(val);
                              onChange(isNaN(numVal) ? "" : numVal);
                            }
                          }}
                          data-testid="input-lead-time"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <FormField
                  control={partForm.control}
                  name="quantityOnHand"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Initial Quantity</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0"
                          value={value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || val === "-") {
                              onChange("");
                            } else {
                              const numVal = parseInt(val);
                              onChange(isNaN(numVal) ? "" : numVal);
                            }
                          }}
                          data-testid="input-quantity"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={partForm.control}
                  name="minStockLevel"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Min Stock</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1"
                          value={value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || val === "-") {
                              onChange("");
                            } else {
                              const numVal = parseInt(val);
                              onChange(isNaN(numVal) ? "" : numVal);
                            }
                          }}
                          data-testid="input-min-stock"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={partForm.control}
                  name="maxStockLevel"
                  render={({ field: { value, onChange, ...field } }) => (
                    <FormItem>
                      <FormLabel>Max Stock</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100"
                          value={value ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || val === "-") {
                              onChange("");
                            } else {
                              const numVal = parseInt(val);
                              onChange(isNaN(numVal) ? "" : numVal);
                            }
                          }}
                          data-testid="input-max-stock"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={partForm.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <Input placeholder="MAIN" {...field} data-testid="input-location" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddPartDialogOpen(false);
                    setIsEditPartDialogOpen(false);
                    setEditingPart(null);
                    partForm.reset();
                  }}
                  data-testid="button-cancel-part"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createPartMutation.isPending || updatePartMutation.isPending}
                  data-testid="button-save-part"
                >
                  {editingPart ? (
                    updatePartMutation.isPending ? "Updating..." : "Update Part"
                  ) : (
                    createPartMutation.isPending ? "Adding..." : "Add Part"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}