import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  AlertTriangle, CheckCircle, Info, AlertCircle,
  Filter, Download, RefreshCw, ChevronDown, ChevronUp, Trash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { ErrorLog } from '@shared/schema';
import { format } from 'date-fns';

const SEVERITY_COLORS = {
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  critical: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const SEVERITY_ICONS = {
  info: Info,
  warning: AlertCircle,
  error: AlertTriangle,
  critical: AlertTriangle,
};

export function ErrorLogsTab() {
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    severity: 'all',
    category: 'all',
    resolved: 'all',
    limit: 100,
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  const { data: logs = [], isLoading, refetch } = useQuery<ErrorLog[]>({
    queryKey: ['/api/error-logs', filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        orgId: 'default-org-id',
        limit: String(filters.limit),
      });
      if (filters.severity !== 'all') params.set('severity', filters.severity);
      if (filters.category !== 'all') params.set('category', filters.category);
      if (filters.resolved !== 'all') params.set('resolved', filters.resolved);
      
      const response = await fetch(`/api/error-logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch error logs');
      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['/api/error-logs/stats'],
    queryFn: async () => {
      const response = await fetch('/api/error-logs/stats?orgId=default-org-id&days=7');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    refetchInterval: 60000, // Refresh stats every minute
  });

  const handleResolve = async (id: string) => {
    try {
      await apiRequest('PATCH', `/api/error-logs/${id}/resolve`, { resolvedBy: 'user' });
      toast({ title: 'Error marked as resolved' });
      refetch();
      refetchStats();
    } catch (error) {
      toast({ title: 'Failed to resolve error', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await apiRequest('DELETE', `/api/error-logs/${id}`);
      toast({ title: 'Error log deleted' });
      refetch();
      refetchStats();
    } catch (error) {
      toast({ title: 'Failed to delete error log', variant: 'destructive' });
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedLogs(newExpanded);
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'Severity', 'Category', 'Message', 'Resolved'].join(','),
      ...logs.map(log => [
        format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
        log.severity,
        log.category,
        `"${log.message.replace(/"/g, '""')}"`,
        log.resolved ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Errors (7 days)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.unresolved}</div>
              <p className="text-sm text-muted-foreground">Unresolved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">Resolution Rate</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Error Logs
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                data-testid="button-refresh-logs"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport}
                data-testid="button-export-logs"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Select 
              value={filters.severity} 
              onValueChange={(value) => setFilters(f => ({ ...f, severity: value }))}
            >
              <SelectTrigger className="w-40" data-testid="select-severity-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.category} 
              onValueChange={(value) => setFilters(f => ({ ...f, category: value }))}
            >
              <SelectTrigger className="w-40" data-testid="select-category-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="api">API</SelectItem>
                <SelectItem value="database">Database</SelectItem>
                <SelectItem value="security">Security</SelectItem>
                <SelectItem value="performance">Performance</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.resolved} 
              onValueChange={(value) => setFilters(f => ({ ...f, resolved: value }))}
            >
              <SelectTrigger className="w-40" data-testid="select-resolved-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Resolved</SelectItem>
                <SelectItem value="false">Unresolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error Logs List */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No error logs found</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => {
                const Icon = SEVERITY_ICONS[log.severity as keyof typeof SEVERITY_ICONS];
                const isExpanded = expandedLogs.has(log.id);
                
                return (
                  <div 
                    key={log.id} 
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                    data-testid={`error-log-${log.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={SEVERITY_COLORS[log.severity as keyof typeof SEVERITY_COLORS]}>
                              {log.severity}
                            </Badge>
                            <Badge variant="outline">{log.category}</Badge>
                            {log.resolved && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{log.message}</p>
                          {log.errorCode && (
                            <p className="text-xs text-muted-foreground">Code: {log.errorCode}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!log.resolved && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleResolve(log.id)}
                            data-testid={`button-resolve-${log.id}`}
                          >
                            Resolve
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDelete(log.id)}
                          data-testid={`button-delete-${log.id}`}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => toggleExpand(log.id)}
                          data-testid={`button-toggle-${log.id}`}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    
                    {isExpanded && log.stackTrace && (
                      <div className="mt-4 p-3 bg-muted rounded text-xs">
                        <strong className="block mb-2">Stack Trace:</strong>
                        <pre className="overflow-auto max-h-40 whitespace-pre-wrap">
                          {log.stackTrace}
                        </pre>
                      </div>
                    )}
                    
                    {isExpanded && log.context && (
                      <div className="mt-4 p-3 bg-muted rounded text-xs">
                        <strong className="block mb-2">Context:</strong>
                        <pre className="overflow-auto max-h-40">
                          {JSON.stringify(log.context, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
