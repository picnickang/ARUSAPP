import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOperatingParameterSchema, OperatingParameter, InsertOperatingParameter } from "@shared/schema";
import { Plus, Pencil, Trash2, Settings, Info } from "lucide-react";
import { z } from "zod";
import { useCustomMutation } from "@/hooks/useCrudMutations";

const equipmentTypes = [
  { value: "engine", label: "Engine" },
  { value: "pump", label: "Pump" },
  { value: "compressor", label: "Compressor" },
  { value: "gearbox", label: "Gearbox" },
  { value: "propulsion", label: "Propulsion" },
  { value: "generator", label: "Generator" },
  { value: "hvac", label: "HVAC" },
  { value: "other", label: "Other" }
];

// Extended validation schema with cross-field range validation
const formSchema = insertOperatingParameterSchema
  .omit({ id: true, orgId: true, createdAt: true, updatedAt: true })
  .extend({
    equipmentType: z.string().min(1, "Equipment type is required"),
    parameterName: z.string().min(1, "Parameter name is required"),
    parameterType: z.string().min(1, "Parameter type is required"),
    unit: z.string().min(1, "Unit is required"),
  })
  .refine(
    (data) => {
      if (data.optimalMin != null && data.optimalMax != null) {
        return data.optimalMin <= data.optimalMax;
      }
      return true;
    },
    {
      message: "Optimal minimum must be less than or equal to optimal maximum",
      path: ["optimalMax"],
    }
  )
  .refine(
    (data) => {
      if (data.criticalMin != null && data.criticalMax != null) {
        return data.criticalMin <= data.criticalMax;
      }
      return true;
    },
    {
      message: "Critical minimum must be less than or equal to critical maximum",
      path: ["criticalMax"],
    }
  )
  .refine(
    (data) => {
      const hasOptimalRange = data.optimalMin != null || data.optimalMax != null;
      const hasCriticalRange = data.criticalMin != null || data.criticalMax != null;
      return hasOptimalRange || hasCriticalRange;
    },
    {
      message: "At least one optimal or critical range value must be provided",
      path: ["optimalMin"],
    }
  )
  .refine(
    (data) => {
      const hasOptimalRange = data.optimalMin != null && data.optimalMax != null;
      const hasCriticalRange = data.criticalMin != null && data.criticalMax != null;
      
      if (!hasOptimalRange || !hasCriticalRange) {
        return true;
      }
      
      return data.criticalMax! < data.optimalMin! || data.criticalMin! > data.optimalMax!;
    },
    {
      message: "Critical range must be outside the optimal range",
      path: ["criticalMin"],
    }
  );

type FormValues = z.infer<typeof formSchema>;

export default function OperatingParametersPage() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState("engine");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("all");
  const [selectedParameter, setSelectedParameter] = useState<OperatingParameter | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const { data: parameters = [], isLoading } = useQuery<OperatingParameter[]>({
    queryKey: ["/api/operating-parameters"],
    refetchInterval: 30000,
  });

  // Extract unique manufacturers for filter dropdown
  const manufacturers = useMemo(() => {
    const unique = new Set(
      parameters
        .filter(p => p.manufacturer)
        .map(p => p.manufacturer)
    );
    return Array.from(unique).sort();
  }, [parameters]);

  // Filter parameters by equipment type and manufacturer
  const filteredParameters = useMemo(() => {
    return parameters.filter(p => {
      const typeMatch = p.equipmentType === selectedType;
      const manufacturerMatch = selectedManufacturer === "all" || p.manufacturer === selectedManufacturer;
      return typeMatch && manufacturerMatch;
    });
  }, [parameters, selectedType, selectedManufacturer]);

  // Operating parameter mutations using reusable hooks with custom headers
  const createMutation = useCustomMutation<InsertOperatingParameter, void>({
    mutationFn: (data: InsertOperatingParameter) => 
      apiRequest("POST", "/api/operating-parameters", data, {
        "x-org-id": "default-org-id"
      }),
    invalidateKeys: ["/api/operating-parameters"],
    successMessage: "Operating parameter created successfully",
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      createForm.reset();
    },
  });

  const updateMutation = useCustomMutation<{ id: string; data: Partial<InsertOperatingParameter> }, void>({
    mutationFn: ({ id, data }) =>
      apiRequest("PUT", `/api/operating-parameters/${id}`, data, {
        "x-org-id": "default-org-id"
      }),
    invalidateKeys: ["/api/operating-parameters"],
    successMessage: "Operating parameter updated successfully",
    onSuccess: () => {
      setIsEditDialogOpen(false);
      setSelectedParameter(null);
      editForm.reset();
    },
  });

  const deleteMutation = useCustomMutation<string, void>({
    mutationFn: (id: string) => 
      apiRequest("DELETE", `/api/operating-parameters/${id}`, undefined, {
        "x-org-id": "default-org-id"
      }),
    invalidateKeys: ["/api/operating-parameters"],
    successMessage: "Operating parameter deleted successfully",
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedParameter(null);
    },
  });

  const createForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      equipmentType: selectedType,
      manufacturer: "",
      model: "",
      parameterName: "",
      parameterType: "",
      unit: "",
      optimalMin: null,
      optimalMax: null,
      criticalMin: null,
      criticalMax: null,
      lifeImpactDescription: "",
      recommendedAction: "",
      isActive: true,
    },
  });

  const editForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const onCreateSubmit = (data: FormValues) => {
    createMutation.mutate(data as InsertOperatingParameter);
  };

  const onEditSubmit = (data: FormValues) => {
    if (!selectedParameter) return;
    updateMutation.mutate({ 
      id: selectedParameter.id, 
      data: data as Partial<InsertOperatingParameter> 
    });
  };

  const handleEdit = (parameter: OperatingParameter) => {
    setSelectedParameter(parameter);
    editForm.reset({
      equipmentType: parameter.equipmentType,
      manufacturer: parameter.manufacturer || "",
      model: parameter.model || "",
      parameterName: parameter.parameterName,
      parameterType: parameter.parameterType,
      unit: parameter.unit,
      optimalMin: parameter.optimalMin,
      optimalMax: parameter.optimalMax,
      criticalMin: parameter.criticalMin,
      criticalMax: parameter.criticalMax,
      lifeImpactDescription: parameter.lifeImpactDescription || "",
      recommendedAction: parameter.recommendedAction || "",
      isActive: parameter.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (parameter: OperatingParameter) => {
    setSelectedParameter(parameter);
    setIsDeleteDialogOpen(true);
  };

  const handleCreateDialogOpen = () => {
    createForm.setValue("equipmentType", selectedType);
    setIsCreateDialogOpen(true);
  };

  const formatRange = (min: number | null, max: number | null, unit: string) => {
    if (min === null && max === null) return "—";
    if (min !== null && max !== null) return `${min} - ${max} ${unit}`;
    if (min !== null) return `≥ ${min} ${unit}`;
    if (max !== null) return `≤ ${max} ${unit}`;
    return "—";
  };

  const ParameterFormFields = ({ form }: { form: any }) => (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="equipmentType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Equipment Type *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-equipment-type">
                    <SelectValue placeholder="Select equipment type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {equipmentTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="parameterName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parameter Name *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., rpm, temperature, pressure, load" 
                  {...field} 
                  data-testid="input-parameter-name"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="manufacturer"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Manufacturer</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Optional" 
                  {...field} 
                  data-testid="input-manufacturer"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="model"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Optional" 
                  {...field} 
                  data-testid="input-model"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="parameterType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parameter Type *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., temperature, pressure, vibration" 
                  {...field} 
                  data-testid="input-parameter-type"
                />
              </FormControl>
              <FormDescription>
                Must match telemetry sensorType
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="e.g., RPM, °C, PSI, %" 
                  {...field} 
                  data-testid="input-unit"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold mb-2">Optimal Range</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="optimalMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optimal Min</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="any"
                      placeholder="Optional" 
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                      data-testid="input-optimal-min"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="optimalMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Optimal Max</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="any"
                      placeholder="Optional" 
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                      data-testid="input-optimal-max"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">Critical Range</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="criticalMin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Critical Min</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="any"
                      placeholder="Optional" 
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                      data-testid="input-critical-min"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="criticalMax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Critical Max</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="any"
                      placeholder="Optional" 
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
                      data-testid="input-critical-max"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>

      <FormField
        control={form.control}
        name="lifeImpactDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Life Impact Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Explain how this parameter affects equipment life" 
                {...field}
                data-testid="textarea-life-impact"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="recommendedAction"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Recommended Action</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="What to do when out of range" 
                {...field}
                data-testid="textarea-recommended-action"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="isActive"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Active</FormLabel>
              <FormDescription>
                Enable this parameter for monitoring
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                data-testid="switch-is-active"
              />
            </FormControl>
          </FormItem>
        )}
      />
    </>
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Operating Parameters
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure optimal and critical operating ranges for equipment to extend life and detect violations
          </p>
        </div>
        <Button 
          onClick={handleCreateDialogOpen} 
          className="gap-2"
          data-testid="button-add-parameter"
        >
          <Plus className="h-4 w-4" />
          Add Parameter
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Parameters by Equipment Type</CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Manufacturer:</label>
              <Select value={selectedManufacturer} onValueChange={setSelectedManufacturer}>
                <SelectTrigger className="w-[200px]" data-testid="select-manufacturer-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Manufacturers</SelectItem>
                  {manufacturers.map(mfr => (
                    <SelectItem key={mfr} value={mfr!}>
                      {mfr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedType} onValueChange={setSelectedType}>
            <div className="overflow-x-auto pb-2 mb-4">
              <TabsList className="inline-flex w-full min-w-fit p-1 gap-1">
                {equipmentTypes.map(type => (
                  <TabsTrigger 
                    key={type.value} 
                    value={type.value}
                    data-testid={`tab-${type.value}`}
                    className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px] min-w-[80px] sm:min-w-[100px] transition-all"
                  >
                    <span>{type.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {equipmentTypes.map(type => (
              <TabsContent key={type.value} value={type.value}>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : filteredParameters.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No parameters defined for {type.label.toLowerCase()}
                    {selectedManufacturer !== "all" && ` from ${selectedManufacturer}`}
                  </div>
                ) : (
                  <TooltipProvider>
                    <div className="rounded-md border">
                      <Table data-testid="table-parameters">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Parameter Name</TableHead>
                            <TableHead>Parameter Type</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Optimal Range</TableHead>
                            <TableHead>Critical Range</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredParameters.map(param => (
                            <TableRow key={param.id} data-testid={`row-parameter-${param.id}`}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  {param.parameterName}
                                  {param.lifeImpactDescription && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <p className="text-sm">{param.lifeImpactDescription}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                                {param.manufacturer && (
                                  <div className="text-xs text-muted-foreground">
                                    {param.manufacturer} {param.model && `- ${param.model}`}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{param.parameterType}</TableCell>
                              <TableCell>{param.unit}</TableCell>
                              <TableCell>
                                {formatRange(param.optimalMin, param.optimalMax, param.unit)}
                              </TableCell>
                              <TableCell>
                                {formatRange(param.criticalMin, param.criticalMax, param.unit)}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={param.isActive ? "default" : "secondary"}
                                  data-testid={`badge-status-${param.id}`}
                                >
                                  {param.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(param)}
                                    data-testid={`button-edit-parameter-${param.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(param)}
                                    data-testid={`button-delete-parameter-${param.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TooltipProvider>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Operating Parameter</DialogTitle>
            <DialogDescription>
              Define optimal and critical operating ranges for equipment monitoring
            </DialogDescription>
          </DialogHeader>
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
              <ParameterFormFields form={createForm} />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? "Creating..." : "Create Parameter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Operating Parameter</DialogTitle>
            <DialogDescription>
              Update the operating ranges and configuration
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <ParameterFormFields form={editForm} />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setSelectedParameter(null);
                    editForm.reset();
                  }}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  data-testid="button-submit-edit"
                >
                  {updateMutation.isPending ? "Updating..." : "Update Parameter"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Operating Parameter?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete this parameter? This will affect operating condition monitoring.
              {selectedParameter && (
                <div className="mt-2 p-2 bg-muted rounded-md">
                  <strong>{selectedParameter.parameterName}</strong> 
                  {selectedParameter.manufacturer && ` - ${selectedParameter.manufacturer}`}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedParameter && deleteMutation.mutate(selectedParameter.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
