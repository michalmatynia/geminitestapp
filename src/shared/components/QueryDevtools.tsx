"use client";

import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useQueryAnalytics } from "@/shared/hooks/useQueryAnalytics";
import { Card, CardContent, CardHeader, CardTitle, Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui";
import { BarChart3, RefreshCw, Trash2, EyeOff, AlertTriangle, Zap, Database } from "lucide-react";

export function QueryDevtools(): React.ReactNode {
  const [isVisible, setIsVisible] = useState(false);
  const queryClient = useQueryClient();
  const analytics = useQueryAnalytics();

  const queries = useMemo(() => {
    return queryClient.getQueryCache().getAll().map(query => ({
      queryKey: JSON.stringify(query.queryKey),
      status: query.state.status,
      dataUpdatedAt: query.state.dataUpdatedAt,
      errorUpdatedAt: query.state.errorUpdatedAt,
      fetchStatus: query.state.fetchStatus,
      isStale: query.isStale(),
      observers: query.getObserversCount(),
      data: query.state.data,
      error: query.state.error,
    }));
  }, [queryClient]);

  const stats = useMemo(() => {
    const cacheStats = analytics.getCacheStats();
    return {
      ...cacheStats,
      total: queries.length,
      active: queries.filter(q => q.observers > 0).length,
      stale: queries.filter(q => q.isStale).length,
      errors: queries.filter(q => q.status === 'error').length,
      loading: queries.filter(q => q.fetchStatus === 'fetching').length,
    };
  }, [queries, analytics]);

  const slowQueries = analytics.getTopSlowQueries(5);
  const errorQueries = analytics.getErrorProneQueries(5);

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <BarChart3 className="h-4 w-4 mr-2" />
        Query Devtools
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-[600px] max-h-[80vh] overflow-hidden bg-background/95 backdrop-blur shadow-2xl">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Query Devtools
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="text-center p-1 rounded bg-slate-900/50">
            <div className="font-semibold">{stats.total}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
          <div className="text-center p-1 rounded bg-green-950/30">
            <div className="font-semibold text-green-500">{stats.active}</div>
            <div className="text-muted-foreground">Active</div>
          </div>
          <div className="text-center p-1 rounded bg-red-950/30">
            <div className="font-semibold text-red-500">{stats.errors}</div>
            <div className="text-muted-foreground">Errors</div>
          </div>
          <div className="text-center p-1 rounded bg-blue-950/30">
            <div className="font-semibold text-blue-500">{stats.loading}</div>
            <div className="text-muted-foreground">Loading</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="queries" className="w-full">
          <TabsList className="grid w-full grid-cols-4 rounded-none border-b h-9">
            <TabsTrigger value="queries" className="text-[10px]">
              <Database className="h-3 w-3 mr-1" />
              Queries
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-[10px]">
              <Zap className="h-3 w-3 mr-1" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="errors" className="text-[10px]">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Errors
            </TabsTrigger>
            <TabsTrigger value="cache" className="text-[10px]">
              <BarChart3 className="h-3 w-3 mr-1" />
              Cache
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queries" className="p-4 max-h-96 overflow-y-auto mt-0">
            <div className="space-y-2">
              {queries.map((query, index) => (
                <div key={index} className="p-2 border rounded text-[10px] bg-slate-950/20">
                  <div className="font-mono truncate mb-1" title={query.queryKey}>
                    {query.queryKey}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span 
                      className={`px-1 rounded ${
                        query.status === 'success' ? 'bg-green-900/30 text-green-400' : 
                        query.status === 'error' ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {query.status}
                    </span>
                    <span className="px-1 border border-slate-700 rounded text-slate-500">
                      {query.observers} observers
                    </span>
                    {query.isStale && (
                      <span className="px-1 border border-amber-900/50 text-amber-600 rounded">
                        stale
                      </span>
                    )}
                    {query.fetchStatus === 'fetching' && (
                      <span className="px-1 bg-blue-900/30 text-blue-400 rounded">
                        fetching
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="performance" className="p-4 mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-muted-foreground">Cache Hit Rate</div>
                  <div className="text-2xl font-bold text-green-500">
                    {(stats.cacheHitRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">Avg Execution Time</div>
                  <div className="text-2xl font-bold">
                    {stats.avgExecutionTime.toFixed(0)}ms
                  </div>
                </div>
              </div>
              
              <div>
                <div className="font-semibold text-sm mb-2">Slowest Queries</div>
                <div className="space-y-1">
                  {slowQueries.map((query, index) => (
                    <div key={index} className="flex justify-between text-[10px] p-1 border-b border-slate-800 last:border-0">
                      <span className="font-mono truncate flex-1 text-slate-400" title={query.queryKey}>
                        {query.queryKey}
                      </span>
                      <span className="font-semibold ml-2 text-amber-500">
                        {query.executionTime.toFixed(0)}ms
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="errors" className="p-4 mt-0">
            <div className="space-y-2">
              {errorQueries.length === 0 ? (
                <div className="text-center text-muted-foreground text-sm py-4">
                  No errors detected
                </div>
              ) : (
                errorQueries.map((query, index) => (
                  <div key={index} className="p-2 border border-red-900/50 bg-red-950/10 rounded text-[10px]">
                    <div className="font-mono truncate mb-1 text-red-200" title={query.queryKey}>
                      {query.queryKey}
                    </div>
                    <div className="text-red-500 font-bold">
                      {query.errorCount} errors
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="cache" className="p-4 mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-muted-foreground">Total Data Size</div>
                  <div className="text-lg font-bold">
                    {(stats.totalDataSize / 1024).toFixed(1)} KB
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-muted-foreground">Cache Entries</div>
                  <div className="text-lg font-bold">
                    {stats.total}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-2 border-t">
                <Button 
                  size="sm" 
                  onClick={() => { void queryClient.invalidateQueries(); }}
                  className="text-xs h-8 flex-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Invalidate All
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive" 
                  onClick={() => queryClient.clear()}
                  className="text-xs h-8 flex-1"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Cache
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
