import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { DollarSign, Zap, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CostSummary {
  provider: string;
  model: string;
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  avgLatency: number;
  fallbackCount: number;
}

interface CostTrend {
  date: string;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
}

export default function LlmCostsPage() {
  const [period, setPeriod] = useState("30d");
  
  const { data: summary, isLoading: summaryLoading } = useQuery<CostSummary[]>({
    queryKey: ["/api/analytics/llm-costs/summary", { period }],
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<CostTrend[]>({
    queryKey: ["/api/analytics/llm-costs/trends", { days: period === "7d" ? 7 : period === "90d" ? 90 : 30 }],
  });

  // Calculate overall metrics
  const totalCost = summary?.reduce((acc, item) => acc + item.totalCost, 0) || 0;
  const totalRequests = summary?.reduce((acc, item) => acc + item.totalRequests, 0) || 0;
  const totalTokens = summary?.reduce((acc, item) => acc + item.totalTokens, 0) || 0;
  const avgCostPerRequest = totalRequests > 0 ? totalCost / totalRequests : 0;
  const successRate = summary?.reduce((acc, item) => acc + item.successfulRequests, 0) || 0;
  const successRatePercent = totalRequests > 0 ? (successRate / totalRequests) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-llm-costs">LLM Cost Tracking</h1>
          <p className="text-muted-foreground" data-testid="text-description">
            Monitor AI API usage and optimize spending across providers
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]" data-testid="select-period">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d" data-testid="option-7d">Last 7 days</SelectItem>
            <SelectItem value="30d" data-testid="option-30d">Last 30 days</SelectItem>
            <SelectItem value="90d" data-testid="option-90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Stats */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Cost</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-total-cost">
                  ${totalCost.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Requests</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-total-requests">
                  {totalRequests.toLocaleString()}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Tokens</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-total-tokens">
                  {(totalTokens / 1000000).toFixed(2)}M
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Avg Cost/Request</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-avg-cost">
                  ${avgCostPerRequest.toFixed(4)}
                </p>
              )}
            </div>
          </div>
        </Card>

        <Card className="flex-1 min-w-[200px] p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Success Rate</p>
              {summaryLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <p className="text-2xl font-bold" data-testid="stat-success-rate">
                  {successRatePercent.toFixed(1)}%
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Cost by Provider & Model */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold" data-testid="heading-cost-breakdown">Cost Breakdown by Provider & Model</h2>
          <p className="text-sm text-muted-foreground">Detailed spending analysis across AI providers</p>
        </div>
        <div className="overflow-x-auto">
          {summaryLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : summary && summary.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-provider">Provider</TableHead>
                  <TableHead data-testid="header-model">Model</TableHead>
                  <TableHead className="text-right" data-testid="header-requests">Requests</TableHead>
                  <TableHead className="text-right" data-testid="header-tokens">Tokens</TableHead>
                  <TableHead className="text-right" data-testid="header-cost">Cost</TableHead>
                  <TableHead className="text-right" data-testid="header-latency">Avg Latency</TableHead>
                  <TableHead className="text-right" data-testid="header-success">Success Rate</TableHead>
                  <TableHead className="text-right" data-testid="header-fallbacks">Fallbacks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((item, index) => (
                  <TableRow key={`${item.provider}-${item.model}`} data-testid={`row-cost-${index}`}>
                    <TableCell className="font-medium" data-testid={`cell-provider-${index}`}>
                      {item.provider}
                    </TableCell>
                    <TableCell data-testid={`cell-model-${index}`}>
                      <Badge variant="outline">{item.model}</Badge>
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-requests-${index}`}>
                      {item.totalRequests.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-tokens-${index}`}>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">{(item.totalTokens / 1000).toFixed(1)}k</span>
                        <span className="text-xs text-muted-foreground">
                          {(item.inputTokens / 1000).toFixed(0)}k in / {(item.outputTokens / 1000).toFixed(0)}k out
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`cell-cost-${index}`}>
                      ${item.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-latency-${index}`}>
                      {item.avgLatency ? `${Math.round(item.avgLatency)}ms` : "—"}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-success-${index}`}>
                      {item.totalRequests > 0 ? (
                        <Badge 
                          className={
                            (item.successfulRequests / item.totalRequests) >= 0.95 
                              ? "bg-green-500" 
                              : (item.successfulRequests / item.totalRequests) >= 0.8 
                                ? "bg-yellow-500" 
                                : "bg-red-500"
                          }
                        >
                          {((item.successfulRequests / item.totalRequests) * 100).toFixed(0)}%
                        </Badge>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-fallbacks-${index}`}>
                      {item.fallbackCount > 0 ? (
                        <div className="flex items-center justify-end gap-1 text-orange-500">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{item.fallbackCount}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-no-data">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No LLM usage data available for this period</p>
              <p className="text-sm">Cost tracking will appear as AI features are used</p>
            </div>
          )}
        </div>
      </Card>

      {/* Daily Cost Trends */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold" data-testid="heading-trends">Daily Cost Trends</h2>
          <p className="text-sm text-muted-foreground">Track spending patterns over time</p>
        </div>
        <div className="overflow-x-auto">
          {trendsLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : trends && trends.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-date">Date</TableHead>
                  <TableHead className="text-right" data-testid="header-daily-requests">Requests</TableHead>
                  <TableHead className="text-right" data-testid="header-daily-tokens">Tokens</TableHead>
                  <TableHead className="text-right" data-testid="header-daily-cost">Cost</TableHead>
                  <TableHead className="text-right" data-testid="header-daily-latency">Avg Latency</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trends.slice(-14).reverse().map((trend, index) => (
                  <TableRow key={trend.date} data-testid={`row-trend-${index}`}>
                    <TableCell className="font-medium" data-testid={`cell-date-${index}`}>
                      {new Date(trend.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-daily-requests-${index}`}>
                      {trend.totalRequests}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-daily-tokens-${index}`}>
                      {(trend.totalTokens / 1000).toFixed(1)}k
                    </TableCell>
                    <TableCell className="text-right font-semibold" data-testid={`cell-daily-cost-${index}`}>
                      ${trend.totalCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right" data-testid={`cell-daily-latency-${index}`}>
                      {trend.avgLatency ? `${Math.round(trend.avgLatency)}ms` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-8 text-center text-muted-foreground" data-testid="text-no-trends">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No trend data available for this period</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
