import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Package, 
  Warehouse, 
  Building2, 
  RefreshCw, 
  AlertTriangle, 
  TrendingUp,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Star
} from "lucide-react";

// Types based on the database schemas
interface Part {
  id: string;
  orgId: string;
  partNo: string;
  name: string;
  description?: string;
  category?: string;
  unitOfMeasure: string;
  minStockQty: number;
  maxStockQty: number;
  standardCost: number;
  leadTimeDays: number;
  criticality: string;
  specifications?: any;
  compatibleEquipment?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Supplier {
  id: string;
  orgId: string;
  name: string;
  code: string;
  contactInfo?: any;
  leadTimeDays: number;
  qualityRating: number;
  paymentTerms?: string;
  isPreferred: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Stock {
  id: string;
  orgId: string;
  partNo: string;
  location: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityOnOrder: number;
  lastCountDate?: Date;
  binLocation?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PartsInventory {
  id: string;
  orgId: string;
  partNumber: string;
  partName: string;
  description?: string;
  category: string;
  manufacturer?: string;
  unitCost: number;
  quantityOnHand: number;
  quantityReserved: number;
  minStockLevel: number;
  maxStockLevel: number;
  location?: string;
  supplierName?: string;
  supplierPartNumber?: string;
  leadTimeDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function InventoryManagement() {
  const [activeTab, setActiveTab] = useState("parts");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  
  const orgId = "default-org-id"; // TODO: Get from context when available

  // Parts Catalog queries and mutations
  const { data: parts = [], isLoading: isLoadingParts } = useQuery({
    queryKey: ["/api/parts", orgId],
    queryFn: () => fetch(`/api/parts?orgId=${orgId}`).then(res => res.json()),
  });

  // Stock queries
  const { data: stockItems = [], isLoading: isLoadingStock } = useQuery({
    queryKey: ["/api/stock", orgId],
    queryFn: () => fetch(`/api/stock?orgId=${orgId}`).then(res => res.json()),
  });

  // Suppliers queries
  const { data: suppliers = [], isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ["/api/suppliers", orgId],
    queryFn: () => fetch(`/api/suppliers?orgId=${orgId}`).then(res => res.json()),
  });

  // Parts Inventory queries
  const { data: partsInventory = [], isLoading: isLoadingInventory, error: inventoryError } = useQuery({
    queryKey: ["/api/parts-inventory", orgId],
    queryFn: async () => {
      const response = await fetch(`/api/parts-inventory?orgId=${orgId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch parts inventory: ${response.status}`);
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Risk Analysis queries
  const { data: riskSummary = {}, isLoading: isLoadingRisk } = useQuery({
    queryKey: ["/api/inventory/risk/summary", orgId],
    queryFn: () => fetch(`/api/inventory/risk/summary?orgId=${orgId}`).then(res => res.json()),
  });

  // Cost Planning queries
  const { data: costOptimization = [], isLoading: isLoadingCost } = useQuery({
    queryKey: ["/api/inventory/optimization", orgId],
    queryFn: () => fetch(`/api/inventory/optimization?orgId=${orgId}`).then(res => res.json()),
  });

  // Part mutations
  const createPartMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/parts", {
      method: "POST",
      body: JSON.stringify({ ...data, orgId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts", orgId] });
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Part created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create part", variant: "destructive" });
    },
  });

  const updatePartMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiRequest(`/api/parts/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...data, orgId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts", orgId] });
      setIsDialogOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "Part updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update part", variant: "destructive" });
    },
  });

  const deletePartMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/parts/${id}?orgId=${orgId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parts", orgId] });
      toast({ title: "Success", description: "Part deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete part", variant: "destructive" });
    },
  });

  // Supplier mutations
  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/suppliers", {
      method: "POST",
      body: JSON.stringify({ ...data, orgId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers", orgId] });
      setIsDialogOpen(false);
      toast({ title: "Success", description: "Supplier created successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create supplier", variant: "destructive" });
    },
  });

  const handleCreatePart = (data: any) => {
    createPartMutation.mutate(data);
  };

  const handleUpdatePart = (data: any) => {
    updatePartMutation.mutate({ id: editingItem.id, ...data });
  };

  const handleDeletePart = (id: string) => {
    if (confirm("Are you sure you want to delete this part?")) {
      deletePartMutation.mutate(id);
    }
  };

  const handleCreateSupplier = (data: any) => {
    createSupplierMutation.mutate(data);
  };

  const filteredParts = parts.filter((part: Part) =>
    part.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.partNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter((supplier: Supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInventory = (Array.isArray(partsInventory) ? partsInventory : []).filter((item: PartsInventory) =>
    item.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (item: PartsInventory) => {
    if (item.quantityOnHand <= item.minStockLevel) return "critical";
    if (item.quantityOnHand <= item.minStockLevel * 1.5) return "low";
    if (item.quantityOnHand >= item.maxStockLevel) return "excess";
    return "normal";
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case "critical": return "destructive";
      case "low": return "default";
      case "excess": return "secondary";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="inventory-management-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-inventory-management">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage parts catalog, stock levels, suppliers, and inventory optimization
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-64"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="parts" data-testid="tab-parts">
            <Package className="w-4 h-4 mr-2" />
            Parts Catalog
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            <Warehouse className="w-4 h-4 mr-2" />
            Stock Levels
          </TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">
            <Building2 className="w-4 h-4 mr-2" />
            Suppliers
          </TabsTrigger>
          <TabsTrigger value="substitutions" data-testid="tab-substitutions">
            <RefreshCw className="w-4 h-4 mr-2" />
            Substitutions
          </TabsTrigger>
          <TabsTrigger value="risk" data-testid="tab-risk">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Risk Analysis
          </TabsTrigger>
          <TabsTrigger value="optimization" data-testid="tab-optimization">
            <TrendingUp className="w-4 h-4 mr-2" />
            Optimization
          </TabsTrigger>
        </TabsList>

        {/* Parts Catalog Tab */}
        <TabsContent value="parts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Parts Catalog</h2>
            <Dialog open={isDialogOpen && activeTab === "parts"} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-part">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Part
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Part" : "Create New Part"}</DialogTitle>
                </DialogHeader>
                <PartForm
                  part={editingItem}
                  onSubmit={editingItem ? handleUpdatePart : handleCreatePart}
                  onCancel={() => {
                    setIsDialogOpen(false);
                    setEditingItem(null);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Unit Cost</TableHead>
                    <TableHead>Criticality</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingParts ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading parts...
                      </TableCell>
                    </TableRow>
                  ) : filteredParts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No parts found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredParts.map((part: Part) => (
                      <TableRow key={part.id} data-testid={`row-part-${part.id}`}>
                        <TableCell className="font-medium">{part.partNo}</TableCell>
                        <TableCell>{part.name}</TableCell>
                        <TableCell>{part.category}</TableCell>
                        <TableCell>${part.standardCost}</TableCell>
                        <TableCell>
                          <Badge variant={part.criticality === "critical" ? "destructive" : "default"}>
                            {part.criticality}
                          </Badge>
                        </TableCell>
                        <TableCell>{part.leadTimeDays} days</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingItem(part);
                                setIsDialogOpen(true);
                              }}
                              data-testid={`button-edit-part-${part.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePart(part.id)}
                              data-testid={`button-delete-part-${part.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Levels Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Stock Levels</h2>
            <Button variant="outline" data-testid="button-update-stock">
              <RefreshCw className="w-4 h-4 mr-2" />
              Update Stock
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Parts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{partsInventory.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {partsInventory.filter((item: PartsInventory) => getStockStatus(item) === "low").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Critical Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {partsInventory.filter((item: PartsInventory) => getStockStatus(item) === "critical").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${partsInventory.reduce((sum: number, item: PartsInventory) => sum + (item.quantityOnHand * item.unitCost), 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>On Hand</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Min/Max</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingInventory ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading inventory...
                      </TableCell>
                    </TableRow>
                  ) : filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No inventory found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item: PartsInventory) => {
                      const status = getStockStatus(item);
                      return (
                        <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                          <TableCell className="font-medium">{item.partNumber}</TableCell>
                          <TableCell>{item.partName}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.quantityOnHand}</TableCell>
                          <TableCell>{item.quantityReserved}</TableCell>
                          <TableCell>{item.minStockLevel}/{item.maxStockLevel}</TableCell>
                          <TableCell>
                            <Badge variant={getStockStatusColor(status)}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell>${(item.quantityOnHand * item.unitCost).toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Suppliers</h2>
            <Dialog open={isDialogOpen && activeTab === "suppliers"} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-supplier">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Supplier</DialogTitle>
                </DialogHeader>
                <SupplierForm
                  onSubmit={handleCreateSupplier}
                  onCancel={() => setIsDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Lead Time</TableHead>
                    <TableHead>Quality Rating</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingSuppliers ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading suppliers...
                      </TableCell>
                    </TableRow>
                  ) : filteredSuppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No suppliers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSuppliers.map((supplier: Supplier) => (
                      <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell>{supplier.code}</TableCell>
                        <TableCell>{supplier.leadTimeDays} days</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            {supplier.qualityRating}/10
                          </div>
                        </TableCell>
                        <TableCell>{supplier.paymentTerms || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {supplier.isPreferred && (
                              <Badge variant="default">Preferred</Badge>
                            )}
                            <Badge variant={supplier.isActive ? "outline" : "secondary"}>
                              {supplier.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Part Substitutions Tab */}
        <TabsContent value="substitutions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Part Substitutions</h2>
            <Button data-testid="button-create-substitution">
              <Plus className="w-4 h-4 mr-2" />
              Add Substitution
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Part substitution management coming soon. This feature will allow you to define alternative parts 
                  that can be used when primary parts are unavailable.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Risk Analysis</h2>
            <Button variant="outline" data-testid="button-analyze-risk">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Analyze Risk
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Critical Parts</CardTitle>
                <CardDescription>Parts requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {partsInventory.filter((item: PartsInventory) => getStockStatus(item) === "critical").length}
                </div>
                <p className="text-sm text-muted-foreground">Parts below minimum stock</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Excess Inventory</CardTitle>
                <CardDescription>Parts with excess stock levels</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {partsInventory.filter((item: PartsInventory) => getStockStatus(item) === "excess").length}
                </div>
                <p className="text-sm text-muted-foreground">Parts above maximum stock</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Total Risk Value</CardTitle>
                <CardDescription>Financial impact of stock issues</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">
                  ${partsInventory
                    .filter((item: PartsInventory) => getStockStatus(item) === "critical")
                    .reduce((sum: number, item: PartsInventory) => sum + (item.minStockLevel * item.unitCost), 0)
                    .toLocaleString()
                  }
                </div>
                <p className="text-sm text-muted-foreground">Potential stockout cost</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>High-Risk Parts</CardTitle>
              <CardDescription>Parts that require immediate attention</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part Number</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Risk Level</TableHead>
                    <TableHead>Potential Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partsInventory
                    .filter((item: PartsInventory) => getStockStatus(item) === "critical")
                    .map((item: PartsInventory) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.partNumber}</TableCell>
                        <TableCell>{item.partName}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.quantityOnHand}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">Critical</Badge>
                        </TableCell>
                        <TableCell>${(item.minStockLevel * item.unitCost).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Inventory Optimization</h2>
            <Button variant="outline" data-testid="button-optimize">
              <TrendingUp className="w-4 h-4 mr-2" />
              Run Optimization
            </Button>
          </div>

          <Card>
            <CardContent className="p-6">
              <Alert>
                <TrendingUp className="h-4 w-4" />
                <AlertDescription>
                  Inventory optimization tools coming soon. This feature will provide Economic Order Quantity (EOQ) 
                  calculations, reorder point optimization, and demand forecasting.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Part Form Component
function PartForm({ 
  part, 
  onSubmit, 
  onCancel 
}: { 
  part?: any; 
  onSubmit: (data: any) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    partNo: part?.partNo || "",
    name: part?.name || "",
    description: part?.description || "",
    category: part?.category || "",
    unitOfMeasure: part?.unitOfMeasure || "ea",
    minStockQty: part?.minStockQty || 0,
    maxStockQty: part?.maxStockQty || 0,
    standardCost: part?.standardCost || 0,
    leadTimeDays: part?.leadTimeDays || 7,
    criticality: part?.criticality || "medium",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="partNo">Part Number</Label>
          <Input
            id="partNo"
            value={formData.partNo}
            onChange={(e) => setFormData({ ...formData, partNo: e.target.value })}
            required
            data-testid="input-part-number"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-part-name"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          data-testid="input-part-description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger data-testid="select-part-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="filters">Filters</SelectItem>
              <SelectItem value="belts">Belts</SelectItem>
              <SelectItem value="fluids">Fluids</SelectItem>
              <SelectItem value="electrical">Electrical</SelectItem>
              <SelectItem value="mechanical">Mechanical</SelectItem>
              <SelectItem value="safety">Safety</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="criticality">Criticality</Label>
          <Select value={formData.criticality} onValueChange={(value) => setFormData({ ...formData, criticality: value })}>
            <SelectTrigger data-testid="select-part-criticality">
              <SelectValue placeholder="Select criticality" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="standardCost">Unit Cost ($)</Label>
          <Input
            id="standardCost"
            type="number"
            step="0.01"
            value={formData.standardCost}
            onChange={(e) => setFormData({ ...formData, standardCost: parseFloat(e.target.value) || 0 })}
            data-testid="input-part-cost"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="minStockQty">Min Stock</Label>
          <Input
            id="minStockQty"
            type="number"
            value={formData.minStockQty}
            onChange={(e) => setFormData({ ...formData, minStockQty: parseInt(e.target.value) || 0 })}
            data-testid="input-min-stock"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="maxStockQty">Max Stock</Label>
          <Input
            id="maxStockQty"
            type="number"
            value={formData.maxStockQty}
            onChange={(e) => setFormData({ ...formData, maxStockQty: parseInt(e.target.value) || 0 })}
            data-testid="input-max-stock"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit">
          {part ? "Update" : "Create"} Part
        </Button>
      </div>
    </form>
  );
}

// Supplier Form Component
function SupplierForm({ 
  onSubmit, 
  onCancel 
}: { 
  onSubmit: (data: any) => void; 
  onCancel: () => void; 
}) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    leadTimeDays: 14,
    qualityRating: 5.0,
    paymentTerms: "",
    isPreferred: false,
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Supplier Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            data-testid="input-supplier-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="code">Supplier Code</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
            required
            data-testid="input-supplier-code"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="leadTimeDays">Lead Time (Days)</Label>
          <Input
            id="leadTimeDays"
            type="number"
            value={formData.leadTimeDays}
            onChange={(e) => setFormData({ ...formData, leadTimeDays: parseInt(e.target.value) || 14 })}
            data-testid="input-lead-time"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qualityRating">Quality Rating (1-10)</Label>
          <Input
            id="qualityRating"
            type="number"
            min="1"
            max="10"
            step="0.1"
            value={formData.qualityRating}
            onChange={(e) => setFormData({ ...formData, qualityRating: parseFloat(e.target.value) || 5.0 })}
            data-testid="input-quality-rating"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="paymentTerms">Payment Terms</Label>
        <Input
          id="paymentTerms"
          value={formData.paymentTerms}
          onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
          placeholder="e.g., NET30, COD"
          data-testid="input-payment-terms"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          data-testid="input-supplier-notes"
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
          Cancel
        </Button>
        <Button type="submit" data-testid="button-submit">
          Create Supplier
        </Button>
      </div>
    </form>
  );
}