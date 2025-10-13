import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCreateMutation, useUpdateMutation, useDeleteMutation, useCustomMutation } from "@/hooks/useCrudMutations";
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
import { ResponsiveDialog } from "@/components/ResponsiveDialog";
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
import { Plus, Package, Users, Box, Edit, Trash2, Search, Filter, Check, X, Edit2, AlertTriangle, DollarSign, TrendingDown, TrendingUp, Layers, Download, ArrowUpDown, ArrowUp, ArrowDown, XCircle, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("partName");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
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

  // Part mutations using reusable hooks
  const createPartMutation = useCustomMutation({
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
    invalidateKeys: [["parts-inventory", orgId]],
    successMessage: "Part added successfully",
    onSuccess: () => {
      setIsAddPartDialogOpen(false);
      partForm.reset();
    },
  });

  const updatePartMutation = useCustomMutation({
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
    invalidateKeys: [["parts-inventory", orgId]],
    successMessage: "Part updated successfully",
    onSuccess: () => {
      setIsEditPartDialogOpen(false);
      setEditingPart(null);
      partForm.reset();
    },
  });

  const deletePartMutation = useCustomMutation({
    mutationFn: async (partId: string) => apiRequest('DELETE', `/api/parts-inventory/${partId}`),
    invalidateKeys: [["parts-inventory", orgId]],
    successMessage: "Part deleted successfully",
  });

  const updateStockMutation = useCustomMutation({
    mutationFn: async ({ partId, updateData }: { partId: string; updateData: any }) => {
      return apiRequest('PATCH', `/api/parts-inventory/${partId}/stock`, updateData);
    },
    invalidateKeys: [["parts-inventory", orgId]],
    successMessage: "Stock level updated successfully",
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

  // Calculate statistics
  const stats = useMemo(() => {
    const totalParts = partsInventory.length;
    const totalValue = partsInventory.reduce((sum, part) => {
      const cost = part.stock?.unitCost || part.standardCost || 0;
      const qty = part.stock?.quantityOnHand || 0;
      return sum + (cost * qty);
    }, 0);

    let criticalCount = 0;
    let lowStockCount = 0;
    let adequateCount = 0;

    partsInventory.forEach(part => {
      const status = getStockStatus(part);
      if (status === 'out_of_stock' || status === 'critical') {
        criticalCount++;
      } else if (status === 'low_stock') {
        lowStockCount++;
      } else if (status === 'adequate') {
        adequateCount++;
      }
    });

    const categories = Array.from(new Set(partsInventory.map(part => part.category))).length;

    return {
      totalParts,
      totalValue,
      criticalCount,
      lowStockCount,
      adequateCount,
      categories,
    };
  }, [partsInventory]);

  // Filtering and data processing
  const filteredParts = useMemo(() => {
    let parts = partsInventory.filter(part => {
      const matchesSearch = searchTerm === '' ||
        part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        part.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || part.category === selectedCategory;
      
      const status = getStockStatus(part);
      const matchesStatus = selectedStatus === 'all' || status === selectedStatus;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });

    // Sorting
    parts.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'partName':
          aValue = a.partName.toLowerCase();
          bValue = b.partName.toLowerCase();
          break;
        case 'partNumber':
          aValue = a.partNumber.toLowerCase();
          bValue = b.partNumber.toLowerCase();
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'available':
          aValue = (a.stock?.quantityOnHand || 0) - (a.stock?.quantityReserved || 0);
          bValue = (b.stock?.quantityOnHand || 0) - (b.stock?.quantityReserved || 0);
          break;
        case 'unitCost':
          aValue = a.stock?.unitCost || a.standardCost || 0;
          bValue = b.stock?.unitCost || b.standardCost || 0;
          break;
        case 'totalValue':
          aValue = (a.stock?.unitCost || a.standardCost || 0) * (a.stock?.quantityOnHand || 0);
          bValue = (b.stock?.unitCost || b.standardCost || 0) * (b.stock?.quantityOnHand || 0);
          break;
        case 'status':
          const statusOrder = { 'critical': 0, 'out_of_stock': 1, 'low_stock': 2, 'adequate': 3, 'excess_stock': 4, 'unknown': 5 };
          aValue = statusOrder[getStockStatus(a) as keyof typeof statusOrder] || 5;
          bValue = statusOrder[getStockStatus(b) as keyof typeof statusOrder] || 5;
          break;
        default:
          aValue = a.partName.toLowerCase();
          bValue = b.partName.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return parts;
  }, [partsInventory, searchTerm, selectedCategory, selectedStatus, sortField, sortDirection]);

  const categories = Array.from(new Set(partsInventory.map(part => part.category))).sort();

  // Sorting handler
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setSelectedStatus("all");
  };

  // Export to CSV
  const handleExportCSV = () => {
    const csvHeaders = [
      'Part Number',
      'Part Name',
      'Category',
      'Available Qty',
      'On Hand',
      'Reserved',
      'Unit Cost',
      'Total Value',
      'Location',
      'Status'
    ];

    const csvRows = filteredParts.map(part => {
      const available = (part.stock?.quantityOnHand || 0) - (part.stock?.quantityReserved || 0);
      const unitCost = part.stock?.unitCost || part.standardCost || 0;
      const totalValue = unitCost * (part.stock?.quantityOnHand || 0);
      const status = getStockStatus(part);

      return [
        part.partNumber,
        part.partName,
        part.category,
        available,
        part.stock?.quantityOnHand || 0,
        part.stock?.quantityReserved || 0,
        unitCost.toFixed(2),
        totalValue.toFixed(2),
        part.stock?.location || 'MAIN',
        status.replace('_', ' ').toUpperCase()
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${filteredParts.length} parts to CSV`,
    });
  };

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'all' || selectedStatus !== 'all';

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handleAddPart} data-testid="button-add-part">
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
        <Card className="bg-card" data-testid="stat-total-parts">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Parts</p>
                <h3 className="text-xl md:text-2xl font-bold mt-1">{stats.totalParts}</h3>
              </div>
              <Package className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card" data-testid="stat-total-value">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Total Value</p>
                <h3 className="text-xl md:text-2xl font-bold mt-1">${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card" data-testid="stat-critical">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Critical/Out</p>
                <h3 className="text-xl md:text-2xl font-bold mt-1 text-destructive">{stats.criticalCount}</h3>
              </div>
              <AlertCircle className="h-8 w-8 text-destructive opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card" data-testid="stat-low-stock">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Low Stock</p>
                <h3 className="text-xl md:text-2xl font-bold mt-1 text-yellow-600 dark:text-yellow-400">{stats.lowStockCount}</h3>
              </div>
              <TrendingDown className="h-8 w-8 text-yellow-600 dark:text-yellow-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card" data-testid="stat-categories">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm font-medium text-muted-foreground">Categories</p>
                <h3 className="text-xl md:text-2xl font-bold mt-1">{stats.categories}</h3>
              </div>
              <Layers className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
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
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <div className="flex items-center space-x-2 flex-1">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search parts by number, name, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:max-w-sm"
                  data-testid="input-search-parts"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48" data-testid="select-category-filter">
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

                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-48" data-testid="select-status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span>Critical</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="out_of_stock">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span>Out of Stock</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="low_stock">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-yellow-600" />
                        <span>Low Stock</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="adequate">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>Adequate</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="excess_stock">Excess Stock</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="default"
                    onClick={handleClearFilters}
                    data-testid="button-clear-filters"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Result count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span data-testid="text-result-count">
                Showing <span className="font-medium text-foreground">{filteredParts.length}</span> of <span className="font-medium text-foreground">{partsInventory.length}</span> parts
                {hasActiveFilters && <span className="ml-2 text-xs px-2 py-1 bg-primary/10 text-primary rounded-md">{(searchTerm ? 1 : 0) + (selectedCategory !== 'all' ? 1 : 0) + (selectedStatus !== 'all' ? 1 : 0)} filters active</span>}
              </span>
            </div>
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
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer hover:bg-accent" onClick={() => handleSort('partName')}>
                      <div className="flex items-center gap-1">
                        Part Name
                        {sortField === 'partName' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-accent" onClick={() => handleSort('category')}>
                      <div className="flex items-center gap-1">
                        Category
                        {sortField === 'category' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-accent" onClick={() => handleSort('available')}>
                      <div className="flex items-center gap-1">
                        Available
                        {sortField === 'available' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-accent" onClick={() => handleSort('unitCost')}>
                      <div className="flex items-center gap-1">
                        Unit Cost
                        {sortField === 'unitCost' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-accent" onClick={() => handleSort('totalValue')}>
                      <div className="flex items-center gap-1">
                        Total Value
                        {sortField === 'totalValue' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-accent" onClick={() => handleSort('status')}>
                      <div className="flex items-center gap-1">
                        Status
                        {sortField === 'status' && (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => {
                    const stockStatus = getStockStatus(part);
                    const available = (part.stock?.quantityOnHand || 0) - (part.stock?.quantityReserved || 0);
                    const unitCost = part.stock?.unitCost || part.standardCost || 0;
                    const totalValue = unitCost * (part.stock?.quantityOnHand || 0);
                    
                    // Row highlighting based on status
                    const rowClass = stockStatus === 'critical' || stockStatus === 'out_of_stock' 
                      ? 'bg-destructive/5 hover:bg-destructive/10' 
                      : stockStatus === 'low_stock'
                      ? 'bg-yellow-500/5 hover:bg-yellow-500/10'
                      : 'hover:bg-accent/50';

                    return (
                      <TableRow key={part.id} className={rowClass} data-testid={`row-part-${part.id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{part.partName}</span>
                            <span className="text-xs text-muted-foreground">{part.partNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{part.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={`font-medium ${
                              available <= 0 ? 'text-destructive' :
                              available < (part.minStockLevel || 0) ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-foreground'
                            }`}>
                              {available}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({part.stock?.quantityOnHand || 0} - {part.stock?.quantityReserved || 0})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${unitCost.toFixed(2)}
                        </TableCell>
                        <TableCell className="font-medium text-green-600 dark:text-green-400">
                          ${totalValue.toFixed(2)}
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
                              aria-label={`Edit ${part.partName || part.partNumber}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePart(part)}
                              data-testid={`button-delete-${part.id}`}
                              aria-label={`Delete ${part.partName || part.partNumber}`}
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
      <ResponsiveDialog 
        open={isAddPartDialogOpen || isEditPartDialogOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddPartDialogOpen(false);
            setIsEditPartDialogOpen(false);
            setEditingPart(null);
            partForm.reset();
          }
        }}
        title={editingPart ? "Edit Part" : "Add New Part"}
        description={editingPart ? "Update the part information" : "Add a new part to your inventory catalog"}
        className="max-w-2xl"
        footer={
          <div className="flex gap-2 w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setIsAddPartDialogOpen(false);
                setIsEditPartDialogOpen(false);
                setEditingPart(null);
                partForm.reset();
              }}
              className="flex-1"
              data-testid="button-cancel-part"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={partForm.handleSubmit(onSubmitPart)}
              disabled={createPartMutation.isPending || updatePartMutation.isPending}
              className="flex-1"
              data-testid="button-save-part"
            >
              {editingPart ? (
                updatePartMutation.isPending ? "Updating..." : "Update Part"
              ) : (
                createPartMutation.isPending ? "Adding..." : "Add Part"
              )}
            </Button>
          </div>
        }
      >
          <Form {...partForm}>
            <form onSubmit={partForm.handleSubmit(onSubmitPart)} className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={partForm.control}
                  name="partNumber"
                  render={({ field }) => (
                    <FormItem className="mobile-form-field">
                      <FormLabel className="mobile-label">Part Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="P12345" {...field} className="mobile-input" data-testid="input-part-number" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={partForm.control}
                  name="partName"
                  render={({ field }) => (
                    <FormItem className="mobile-form-field">
                      <FormLabel className="mobile-label">Part Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Marine engine filter" {...field} className="mobile-input" data-testid="input-part-name" />
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
                  <FormItem className="mobile-form-field">
                    <FormLabel className="mobile-label">Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Part description..." {...field} className="mobile-textarea" data-testid="input-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            </form>
          </Form>
      </ResponsiveDialog>
    </div>
  );
}