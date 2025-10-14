import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Wrench,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  BarChart3
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { InfoTooltip } from "@/components/ui/info-tooltip";

interface SavingsSummary {
  totalSavings: number;
  totalDowntimePrevented: number;
  savingsByType: {
    labor: number;
    parts: number;
    downtime: number;
  };
  savingsCount: number;
  avgSavingsPerIncident: number;
  topSavings: Array<{
    workOrderId: string;
    equipmentName: string;
    savings: number;
    downtimePrevented: number;
  }>;
}

interface SavingsTrend {
  month: string;
  totalSavings: number;
  laborSavings: number;
  partsSavings: number;
  downtimeSavings: number;
  downtimePrevented: number;
  savingsCount: number;
}

const COLORS = {
  labor: '#3b82f6',     // Blue
  parts: '#10b981',     // Green
  downtime: '#f59e0b',  // Amber
  total: '#8b5cf6'      // Purple
};

export default function SavingsDashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery<SavingsSummary>({
    queryKey: ['/api/cost-savings/summary'],
    refetchInterval: 60000
  });

  const { data: trend, isLoading: trendLoading } = useQuery<SavingsTrend[]>({
    queryKey: ['/api/cost-savings/trend'],
    refetchInterval: 60000
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatHours = (hours: number) => {
    return `${hours.toFixed(1)}h`;
  };

  // Prepare pie chart data
  const pieData = summary ? [
    { name: 'Labor Savings', value: summary.savingsByType.labor, color: COLORS.labor },
    { name: 'Parts Savings', value: summary.savingsByType.parts, color: COLORS.parts },
    { name: 'Downtime Savings', value: summary.savingsByType.downtime, color: COLORS.downtime },
  ].filter(item => item.value > 0) : [];

  if (summaryLoading || trendLoading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-green-500" />
          Cost Savings Dashboard
        </h2>
        <p className="text-muted-foreground mt-1">
          Track money saved through predictive maintenance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Total Savings
              <InfoTooltip content="Money saved by catching issues early through predictive maintenance instead of emergency repairs" />
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalSavings || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 12 months
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Downtime Prevented
              <InfoTooltip content="Hours of equipment downtime avoided by proactive maintenance" />
            </CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatHours(summary?.totalDowntimePrevented || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Prevented outages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Incidents Prevented
              <InfoTooltip content="Number of potential failures caught and prevented" />
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {summary?.savingsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Proactive actions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-1">
              Avg Savings/Incident
              <InfoTooltip content="Average money saved per prevented failure" />
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(summary?.avgSavingsPerIncident || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per incident
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Monthly Savings Trend
            </CardTitle>
            <CardDescription>
              Savings breakdown by category over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Legend />
                <Bar dataKey="laborSavings" stackId="a" fill={COLORS.labor} name="Labor" />
                <Bar dataKey="partsSavings" stackId="a" fill={COLORS.parts} name="Parts" />
                <Bar dataKey="downtimeSavings" stackId="a" fill={COLORS.downtime} name="Downtime" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Savings Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Savings Breakdown
            </CardTitle>
            <CardDescription>
              Total savings by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Downtime Prevention Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Downtime Prevention Timeline
          </CardTitle>
          <CardDescription>
            Hours of downtime prevented each month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trend || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip 
                formatter={(value: number) => `${value.toFixed(1)} hours`}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="downtimePrevented" 
                stroke={COLORS.downtime} 
                strokeWidth={2}
                name="Downtime Prevented (hrs)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Savings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Top Cost Savings
          </CardTitle>
          <CardDescription>
            Equipment with highest savings from predictive maintenance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary && summary.topSavings.length > 0 ? (
            <div className="space-y-3">
              {summary.topSavings.map((item, index) => (
                <div 
                  key={item.workOrderId} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold
                      ${index === 0 ? 'bg-yellow-100 text-yellow-700' : ''}
                      ${index === 1 ? 'bg-gray-100 text-gray-700' : ''}
                      ${index === 2 ? 'bg-orange-100 text-orange-700' : ''}
                      ${index > 2 ? 'bg-blue-100 text-blue-700' : ''}
                    `}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">{item.equipmentName}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatHours(item.downtimePrevented)} downtime prevented
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(item.savings)}
                    </div>
                    <div className="text-xs text-muted-foreground">saved</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No savings data yet</p>
              <p className="text-sm mt-1">
                Complete preventive or predictive work orders to see savings
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <Sparkles className="h-5 w-5" />
            How Cost Savings Are Calculated
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-green-200 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold">1</span>
            </div>
            <div>
              <p className="font-medium">ML Predicts Failure</p>
              <p className="text-muted-foreground">AI detects potential issues before they become emergencies</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-green-200 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold">2</span>
            </div>
            <div>
              <p className="font-medium">Preventive Action Taken</p>
              <p className="text-muted-foreground">Equipment fixed during planned maintenance window</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-green-200 dark:bg-green-900 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-bold">3</span>
            </div>
            <div>
              <p className="font-medium">Savings Calculated</p>
              <p className="text-muted-foreground">
                <strong>Emergency Cost</strong> (Labor×3 + Parts×1.5 + Downtime) - <strong>Actual Cost</strong> = <strong className="text-green-600">Savings</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
