import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Plus, Pencil, Trash2, Copy, FileText, CheckSquare, Clock, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { useCustomMutation, useUpdateMutation, useDeleteMutation } from "@/hooks/useCrudMutations";

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

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "semi-annually", label: "Semi-Annually" },
  { value: "annually", label: "Annually" },
  { value: "hours-based", label: "Hours-Based" },
  { value: "condition-based", label: "Condition-Based" }
];

const priorityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" }
];

const templateSchema = z.object({
  equipmentType: z.string().min(1, "Equipment type is required"),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  frequency: z.string().min(1, "Frequency is required"),
  estimatedDuration: z.coerce.number().min(1, "Estimated duration must be at least 1 minute"),
  priority: z.string().min(1, "Priority is required"),
});

const checklistItemSchema = z.object({
  stepNumber: z.coerce.number().min(1),
  description: z.string().min(1, "Description is required"),
  required: z.boolean().default(false),
  estimatedMinutes: z.coerce.number().min(0).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export default function MaintenanceTemplatesPage() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("engine");
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);
  const [checklistItems, setChecklistItems] = useState<any[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Fetch all templates
  const { data: allTemplates = [], isLoading } = useQuery({
    queryKey: ["/api/maintenance-templates"],
    refetchInterval: 30000,
  });

  // Fetch checklist items for selected template when viewing
  const { data: templateItems = [] } = useQuery({
    queryKey: ["/api/maintenance-templates", selectedTemplate?.id, "items"],
    queryFn: () => apiRequest("GET", `/api/maintenance-templates/${selectedTemplate?.id}/items`),
    enabled: !!selectedTemplate?.id && isViewDialogOpen,
  });

  // Filter templates by selected type
  const filteredTemplates = allTemplates.filter((t: any) => t.equipmentType === selectedType);

  const templateForm = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      equipmentType: "engine",
      name: "",
      description: "",
      frequency: "",
      estimatedDuration: 60,
      priority: "medium",
    },
  });

  const itemForm = useForm({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      stepNumber: 1,
      description: "",
      required: false,
      estimatedMinutes: 10,
      imageUrl: "",
    },
  });

  // Template mutations using reusable hooks
  const createTemplateMutation = useCustomMutation<any, any>({
    mutationFn: async (data: any) => {
      const template = await apiRequest("POST", "/api/maintenance-templates", data);
      return template;
    },
    invalidateKeys: ["/api/maintenance-templates"],
    onSuccess: (template) => {
      // If there are checklist items, create them
      if (checklistItems.length > 0) {
        Promise.all(
          checklistItems.map((item) =>
            apiRequest("POST", `/api/maintenance-templates/${template.id}/items`, item)
          )
        ).then(() => {
          toast({ title: "Template created successfully with checklist items" });
          setIsCreateDialogOpen(false);
          setChecklistItems([]);
          templateForm.reset();
        }).catch((error) => {
          toast({ 
            title: "Template created but failed to add some checklist items",
            description: error.message,
            variant: "destructive"
          });
        });
      } else {
        toast({ title: "Template created successfully" });
        setIsCreateDialogOpen(false);
        templateForm.reset();
      }
    },
  });

  const updateTemplateMutation = useUpdateMutation('/api/maintenance-templates', {
    successMessage: "Template updated successfully",
    onSuccess: () => {
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
    },
  });

  const deleteTemplateMutation = useDeleteMutation('/api/maintenance-templates', {
    successMessage: "Template deleted successfully",
    onSuccess: () => {
      setDeleteTemplateId(null);
    },
  });

  const cloneTemplateMutation = useCustomMutation<string, void>({
    mutationFn: (id: string) => apiRequest("POST", `/api/maintenance-templates/${id}/clone`),
    invalidateKeys: ["/api/maintenance-templates"],
    successMessage: "Template cloned successfully",
  });

  const onTemplateSubmit = (data: any) => {
    if (isEditDialogOpen && selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  const handleEdit = (template: any) => {
    setSelectedTemplate(template);
    templateForm.reset({
      equipmentType: template.equipmentType,
      name: template.name,
      description: template.description || "",
      frequency: template.frequency,
      estimatedDuration: template.estimatedDuration,
      priority: template.priority,
    });
    setIsEditDialogOpen(true);
  };

  const handleView = (template: any) => {
    setSelectedTemplate(template);
    setIsViewDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTemplateId(id);
  };

  const handleClone = (id: string) => {
    cloneTemplateMutation.mutate(id);
  };

  const addChecklistItem = (data: any) => {
    if (editingItemIndex !== null) {
      const updated = [...checklistItems];
      updated[editingItemIndex] = data;
      setChecklistItems(updated);
      setEditingItemIndex(null);
    } else {
      setChecklistItems([...checklistItems, data]);
    }
    itemForm.reset({
      stepNumber: checklistItems.length + 2,
      description: "",
      required: false,
      estimatedMinutes: 10,
      imageUrl: "",
    });
  };

  const editChecklistItem = (index: number) => {
    setEditingItemIndex(index);
    itemForm.reset(checklistItems[index]);
  };

  const removeChecklistItem = (index: number) => {
    setChecklistItems(checklistItems.filter((_, i) => i !== index));
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, any> = {
      low: { variant: "secondary", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      medium: { variant: "default", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      high: { variant: "default", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
      critical: { variant: "destructive" },
    };
    const config = variants[priority] || variants.medium;
    return <Badge variant={config.variant} className={config.className}>{priority.toUpperCase()}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6" data-testid="maintenance-templates-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Maintenance Templates</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Create and manage preventive maintenance templates with checklists
          </p>
        </div>
        <Button onClick={() => {
          templateForm.reset();
          setChecklistItems([]);
          setIsCreateDialogOpen(true);
        }} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType} data-testid="equipment-type-tabs">
        <div className="overflow-x-auto pb-2">
          <TabsList className="inline-flex w-full min-w-fit p-1 gap-1">
            {equipmentTypes.map((type) => (
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

        {equipmentTypes.map((type) => (
          <TabsContent key={type.value} value={type.value} className="space-y-4">
            {filteredTemplates.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredTemplates.map((template: any) => (
                  <Card key={template.id} data-testid={`template-card-${template.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg" data-testid={`template-name-${template.id}`}>
                            {template.name}
                          </CardTitle>
                          <CardDescription className="mt-2" data-testid={`template-desc-${template.id}`}>
                            {template.description || "No description"}
                          </CardDescription>
                        </div>
                        {getPriorityBadge(template.priority)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Frequency:</span>
                          <span className="font-medium" data-testid={`template-freq-${template.id}`}>{template.frequency}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Duration:</span>
                          <span className="font-medium" data-testid={`template-duration-${template.id}`}>
                            {template.estimatedDuration} min
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleView(template)}
                          data-testid={`button-view-${template.id}`}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleEdit(template)}
                          data-testid={`button-edit-${template.id}`}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleClone(template.id)}
                          disabled={cloneTemplateMutation.isPending}
                          data-testid={`button-clone-${template.id}`}
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Clone
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(template.id)}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2" data-testid={`no-templates-${type.value}`}>
                    No templates for {type.label}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Create your first maintenance template for this equipment type
                  </p>
                  <Button onClick={() => {
                    templateForm.setValue("equipmentType", type.value);
                    setIsCreateDialogOpen(true);
                  }} data-testid={`button-create-first-${type.value}`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Create/Edit Template Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setIsEditDialogOpen(false);
          setSelectedTemplate(null);
          setChecklistItems([]);
          templateForm.reset();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title">
              {isEditDialogOpen ? "Edit Template" : "Create Template"}
            </DialogTitle>
            <DialogDescription>
              {isEditDialogOpen 
                ? "Update the template details below" 
                : "Create a new maintenance template with checklist items"}
            </DialogDescription>
          </DialogHeader>
          <Form {...templateForm}>
            <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={templateForm.control}
                  name="equipmentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-equipment-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {equipmentTypes.map((type) => (
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
                  control={templateForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Annual engine inspection" {...field} data-testid="input-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={templateForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Comprehensive inspection of main engine..." 
                        {...field} 
                        data-testid="textarea-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={templateForm.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-frequency">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {frequencyOptions.map((freq) => (
                            <SelectItem key={freq.value} value={freq.value}>
                              {freq.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="estimatedDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes) *</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-duration" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={templateForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-priority">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorityOptions.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {!isEditDialogOpen && (
                <div className="border-t pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Checklist Items</h3>
                    <Badge variant="secondary" data-testid="badge-item-count">
                      {checklistItems.length} items
                    </Badge>
                  </div>

                  {checklistItems.length > 0 && (
                    <div className="space-y-2">
                      {checklistItems.map((item, index) => (
                        <div 
                          key={index} 
                          className="flex items-start justify-between p-3 border rounded"
                          data-testid={`checklist-item-${index}`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" data-testid={`item-step-${index}`}>
                                Step {item.stepNumber}
                              </Badge>
                              {item.required && (
                                <Badge variant="destructive" data-testid={`item-required-${index}`}>
                                  Required
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm mt-2" data-testid={`item-description-${index}`}>
                              {item.description}
                            </p>
                            {item.estimatedMinutes && (
                              <p className="text-xs text-muted-foreground mt-1" data-testid={`item-minutes-${index}`}>
                                Est. {item.estimatedMinutes} minutes
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              type="button"
                              size="sm" 
                              variant="ghost" 
                              onClick={() => editChecklistItem(index)}
                              data-testid={`button-edit-item-${index}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button 
                              type="button"
                              size="sm" 
                              variant="ghost" 
                              onClick={() => removeChecklistItem(index)}
                              data-testid={`button-remove-item-${index}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Add Checklist Item</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={itemForm.control}
                        name="stepNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Step Number</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-step-number" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={itemForm.control}
                        name="estimatedMinutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Est. Minutes</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} data-testid="input-item-minutes" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={itemForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Check oil level..." {...field} data-testid="textarea-item-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="required"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <input 
                              type="checkbox" 
                              checked={field.value} 
                              onChange={field.onChange}
                              data-testid="checkbox-required"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Required step</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="button"
                      variant="secondary" 
                      onClick={itemForm.handleSubmit(addChecklistItem)}
                      data-testid="button-add-item"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {editingItemIndex !== null ? "Update Item" : "Add Item"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setIsEditDialogOpen(false);
                    setSelectedTemplate(null);
                    setChecklistItems([]);
                  }}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                  data-testid="button-submit"
                >
                  {createTemplateMutation.isPending || updateTemplateMutation.isPending
                    ? "Saving..."
                    : isEditDialogOpen
                    ? "Update Template"
                    : "Create Template"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Template Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle data-testid="view-dialog-title">{selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              {selectedTemplate?.description || "No description"}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Equipment Type</label>
                  <p className="text-sm" data-testid="view-equipment-type">
                    {equipmentTypes.find(t => t.value === selectedTemplate.equipmentType)?.label}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Frequency</label>
                  <p className="text-sm" data-testid="view-frequency">{selectedTemplate.frequency}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <p className="text-sm" data-testid="view-duration">
                    {selectedTemplate.estimatedDuration} minutes
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Priority</label>
                  <div className="mt-1">{getPriorityBadge(selectedTemplate.priority)}</div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <CheckSquare className="h-5 w-5" />
                  Checklist Items
                </h3>
                {templateItems.length > 0 ? (
                  <div className="space-y-2">
                    {templateItems.map((item: any, index: number) => (
                      <div 
                        key={item.id} 
                        className="p-3 border rounded flex items-start gap-3"
                        data-testid={`view-item-${index}`}
                      >
                        <Badge variant="outline" data-testid={`view-item-step-${index}`}>
                          {item.stepNumber}
                        </Badge>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {item.required && (
                              <Badge variant="destructive" data-testid={`view-item-required-${index}`}>
                                Required
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm" data-testid={`view-item-desc-${index}`}>
                            {item.description}
                          </p>
                          {item.estimatedMinutes && (
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`view-item-minutes-${index}`}>
                              Est. {item.estimatedMinutes} minutes
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 border rounded">
                    <CheckSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm" data-testid="view-no-items">
                      No checklist items defined
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setIsViewDialogOpen(false)} data-testid="button-close-view">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplateId} onOpenChange={(open) => !open && setDeleteTemplateId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="delete-dialog-title">Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this maintenance template? This will also delete all associated checklist items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTemplateId && deleteTemplateMutation.mutate(deleteTemplateId)}
              disabled={deleteTemplateMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
