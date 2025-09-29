import React, { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Trash2, CheckCircle, AlertCircle } from "lucide-react";

interface UnknownSignal {
  vessel: string;
  protocol: string;
  sig: string;
  src: string;
  unit?: string;
  spn?: number;
  pid?: number;
  sample?: number;
  timestamp: string;
  guess: {
    sig: string;
    kind: string;
    unit?: string;
    confidence: number;
  };
}

interface ApprovalRule {
  protocol: string;
  sig: string;
  src: string;
  pgn?: number;
  name?: string;
  spnRule?: any;
  pidRule?: any;
}

export function UnknownSignals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSignal, setSelectedSignal] = useState<UnknownSignal | null>(null);
  const [approvalRule, setApprovalRule] = useState<Partial<ApprovalRule>>({});

  const { data: unknownSignalsData, isLoading } = useQuery({
    queryKey: ["/api/sensors/unknown"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const unknownSignals = unknownSignalsData?.items || [];

  const approveMutation = useMutation({
    mutationFn: async (rule: ApprovalRule) => {
      const response = await apiRequest("/api/sensors/approve", {
        method: "POST",
        body: JSON.stringify({ protocol: rule.protocol, rule }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Signal Approved",
        description: "The signal has been added to the mapping configuration.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sensors/unknown"] });
      setSelectedSignal(null);
      setApprovalRule({});
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve signal",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (index: number) => {
      const response = await apiRequest(`/api/sensors/unknown/${index}`, {
        method: "DELETE",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Signal Removed",
        description: "The unknown signal has been removed from the queue.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sensors/unknown"] });
    },
    onError: (error: any) => {
      toast({
        title: "Removal Failed",
        description: error.message || "Failed to remove signal",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (signal: UnknownSignal, index: number) => {
    setSelectedSignal(signal);
    setApprovalRule({
      protocol: signal.protocol,
      sig: signal.sig,
      src: signal.src,
    });
  };

  const handleSubmitApproval = () => {
    if (!selectedSignal || !approvalRule.protocol) return;

    const rule: ApprovalRule = {
      protocol: approvalRule.protocol,
      sig: selectedSignal.sig,
      src: selectedSignal.src,
    };

    if (approvalRule.protocol === "j1939") {
      rule.pgn = approvalRule.pgn;
      rule.name = approvalRule.name || selectedSignal.sig;
      rule.spnRule = {
        spn: selectedSignal.spn,
        name: selectedSignal.sig,
        unit: selectedSignal.guess.unit || selectedSignal.unit,
        src: selectedSignal.src,
      };
    } else if (approvalRule.protocol === "j1708") {
      rule.pidRule = {
        pid: selectedSignal.pid,
        name: selectedSignal.sig,
        unit: selectedSignal.guess.unit || selectedSignal.unit,
        src: selectedSignal.src,
      };
    }

    approveMutation.mutate(rule);
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return <Badge variant="default">High</Badge>;
    if (confidence >= 0.6) return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="destructive">Low</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unknown Signals</CardTitle>
          <CardDescription>Loading unknown signals...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Unknown Signals Queue</CardTitle>
        <CardDescription>
          Review and approve unclassified sensor signals to add them to the mapping configuration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unknownSignals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No unknown signals in the queue.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vessel</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead>Guess</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unknownSignals.items?.map((signal: UnknownSignal, index: number) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{signal.vessel}</TableCell>
                  <TableCell>{signal.sig}</TableCell>
                  <TableCell>{signal.protocol}</TableCell>
                  <TableCell>{signal.guess.kind}</TableCell>
                  <TableCell>{getConfidenceBadge(signal.guess.confidence)}</TableCell>
                  <TableCell>{signal.guess.unit || signal.unit || "—"}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(signal, index)}
                            data-testid={`button-approve-${index}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Approve Signal Mapping</DialogTitle>
                            <DialogDescription>
                              Configure the mapping for signal "{selectedSignal?.sig}" to add it to the protocol configuration.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="protocol" className="text-right">
                                Protocol
                              </Label>
                              <Select
                                value={approvalRule.protocol}
                                onValueChange={(value) => setApprovalRule({ ...approvalRule, protocol: value })}
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select protocol" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="j1939">J1939</SelectItem>
                                  <SelectItem value="j1708">J1708/J1587</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {approvalRule.protocol === "j1939" && (
                              <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="pgn" className="text-right">
                                    PGN
                                  </Label>
                                  <Input
                                    id="pgn"
                                    type="number"
                                    className="col-span-3"
                                    value={approvalRule.pgn || ""}
                                    onChange={(e) => setApprovalRule({ ...approvalRule, pgn: parseInt(e.target.value) })}
                                    placeholder="Parameter Group Number"
                                  />
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                  <Label htmlFor="name" className="text-right">
                                    Name
                                  </Label>
                                  <Input
                                    id="name"
                                    className="col-span-3"
                                    value={approvalRule.name || selectedSignal?.sig || ""}
                                    onChange={(e) => setApprovalRule({ ...approvalRule, name: e.target.value })}
                                    placeholder="Signal name"
                                  />
                                </div>
                              </>
                            )}
                          </div>
                          <DialogFooter>
                            <Button
                              onClick={handleSubmitApproval}
                              disabled={!approvalRule.protocol || approveMutation.isPending}
                              data-testid="button-submit-approval"
                            >
                              {approveMutation.isPending ? "Approving..." : "Approve"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteMutation.mutate(index)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}