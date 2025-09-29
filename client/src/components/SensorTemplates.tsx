import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings, Wrench, AlertCircle } from "lucide-react";

interface SensorTemplate {
  id: string;
  kind: string;
  unit: string;
  fields: Record<string, any>;
  notes: string;
}

interface ApplyTemplateRequest {
  vessel_id: string;
  sensor_id: string;
  template_id: string;
}

export function SensorTemplates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<SensorTemplate | null>(null);
  const [applyRequest, setApplyRequest] = useState<Partial<ApplyTemplateRequest>>({});

  const { data: templatesData, isLoading } = useQuery({
    queryKey: ["/api/sensors/templates"],
  });

  const { data: registryData } = useQuery({
    queryKey: ["/api/sensors/registry"],
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async (request: ApplyTemplateRequest) => {
      const response = await apiRequest("/api/sensors/templates/apply", {
        method: "POST",
        body: JSON.stringify(request),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Template Applied",
        description: "The sensor template has been applied successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sensors/registry"] });
      setSelectedTemplate(null);
      setApplyRequest({});
    },
    onError: (error: any) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to apply template",
        variant: "destructive",
      });
    },
  });

  const handleApplyTemplate = (template: SensorTemplate) => {
    setSelectedTemplate(template);
    setApplyRequest({ template_id: template.id });
  };

  const handleSubmitApplication = () => {
    if (!applyRequest.vessel_id || !applyRequest.sensor_id || !applyRequest.template_id) {
      return;
    }

    applyTemplateMutation.mutate(applyRequest as ApplyTemplateRequest);
  };

  const templates = templatesData?.templates || [];
  const registry = registryData?.entries || [];

  const getKindBadge = (kind: string) => {
    const colorMap: Record<string, string> = {
      vibration: "bg-blue-100 text-blue-800",
      pressure: "bg-green-100 text-green-800",
      temperature: "bg-red-100 text-red-800",
      flow: "bg-cyan-100 text-cyan-800",
      level: "bg-yellow-100 text-yellow-800",
      voltage: "bg-purple-100 text-purple-800",
      current: "bg-indigo-100 text-indigo-800",
      frequency: "bg-pink-100 text-pink-800",
      rpm: "bg-orange-100 text-orange-800",
    };

    return (
      <Badge variant="secondary" className={colorMap[kind] || "bg-gray-100 text-gray-800"}>
        {kind}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sensor Templates</CardTitle>
          <CardDescription>Loading sensor templates...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Available Sensor Templates</CardTitle>
          <CardDescription>
            Pre-configured sensor templates that can be applied to devices for standardized sensor setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sensor templates available.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template ID</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template: SensorTemplate) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.id}</TableCell>
                    <TableCell>{getKindBadge(template.kind)}</TableCell>
                    <TableCell>{template.unit}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {Object.entries(template.fields).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{template.notes}</TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplyTemplate(template)}
                            data-testid={`button-apply-${template.id}`}
                          >
                            <Wrench className="h-4 w-4 mr-1" />
                            Apply
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Apply Sensor Template</DialogTitle>
                            <DialogDescription>
                              Apply template "{selectedTemplate?.id}" to a specific vessel and sensor.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="vessel_id" className="text-right">
                                Vessel ID
                              </Label>
                              <Input
                                id="vessel_id"
                                className="col-span-3"
                                value={applyRequest.vessel_id || ""}
                                onChange={(e) => setApplyRequest({ ...applyRequest, vessel_id: e.target.value })}
                                placeholder="Enter vessel identifier"
                              />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="sensor_id" className="text-right">
                                Sensor ID
                              </Label>
                              <Input
                                id="sensor_id"
                                className="col-span-3"
                                value={applyRequest.sensor_id || ""}
                                onChange={(e) => setApplyRequest({ ...applyRequest, sensor_id: e.target.value })}
                                placeholder="Enter sensor identifier"
                              />
                            </div>
                            {selectedTemplate && (
                              <div className="grid gap-2 p-4 bg-muted rounded-lg">
                                <h4 className="font-medium">Template Details</h4>
                                <div className="text-sm space-y-1">
                                  <div><strong>Kind:</strong> {selectedTemplate.kind}</div>
                                  <div><strong>Unit:</strong> {selectedTemplate.unit}</div>
                                  <div><strong>Notes:</strong> {selectedTemplate.notes}</div>
                                </div>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={handleSubmitApplication}
                              disabled={!applyRequest.vessel_id || !applyRequest.sensor_id || applyTemplateMutation.isPending}
                              data-testid="button-submit-application"
                            >
                              {applyTemplateMutation.isPending ? "Applying..." : "Apply Template"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Applied Templates Registry</CardTitle>
          <CardDescription>
            Sensors that have been configured with templates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {registry.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates have been applied yet.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vessel ID</TableHead>
                  <TableHead>Sensor ID</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Configuration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registry.map((entry: any, index: number) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{entry.vessel_id}</TableCell>
                    <TableCell>{entry.sensor_id}</TableCell>
                    <TableCell>{getKindBadge(entry.kind)}</TableCell>
                    <TableCell>{entry.unit}</TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {entry.meta && Object.entries(entry.meta).map(([key, value]) => (
                          <div key={key}>
                            <span className="font-medium">{key}:</span> {String(value)}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}