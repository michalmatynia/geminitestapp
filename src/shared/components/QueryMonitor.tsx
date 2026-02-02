"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/shared/ui";
import { RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";

export function QueryMonitor(): React.ReactNode {
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'stale' | 'error'>('all');

  const queries = useMemo(() => {
    const cache = queryClient.getQueryCache();
    return cache.getAll().map(query => ({
      queryKey: JSON.stringify(query.queryKey),
      status: query.state.status,
      dataUpdatedAt: query.state.dataUpdatedAt,
      errorUpdatedAt: query.state.errorUpdatedAt,
      fetchStatus: query.state.fetchStatus,
      isStale: query.isStale(),
      observers: query.getObserversCount(),
    }));
  }, [queryClient]);

  const filteredQueries = useMemo(() => {
    return queries.filter(query => {
      switch (filter) {
        case 'active':
          return query.observers > 0;
        case 'stale':
          return query.isStale;
        case 'error':
          return query.status === 'error';
        default:
          return true;
      }
    });
  }, [queries, filter]);

  const stats = useMemo(() => ({
    total: queries.length,
    active: queries.filter(q => q.observers > 0).length,
    stale: queries.filter(q => q.isStale).length,
    errors: queries.filter(q => q.status === 'error').length,
  }), [queries]);

  const clearCache = (): void => {
    queryClient.clear();
  };

  const invalidateAll = (): void => {
    void queryClient.invalidateQueries();
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 left-4 z-50"
      >
        <Eye className="h-4 w-4" />
        Query Monitor
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-96 max-h-96 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Query Monitor</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2 text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">Total: {stats.total}</span>
          <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-200">Active: {stats.active}</span>
          <span className="px-1.5 py-0.5 rounded bg-red-900/50 text-red-200">Errors: {stats.errors}</span>
          <span className="px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-200">Stale: {stats.stale}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-1">
          {(['all', 'active', 'stale', 'error'] as const).map(f => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs h-7 px-2"
            >
              {f}
            </Button>
          ))}
        </div>
        
        <div className="flex gap-1">
          <Button size="sm" onClick={invalidateAll} className="text-xs h-7 px-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh All
          </Button>
          <Button size="sm" variant="destructive" onClick={clearCache} className="text-xs h-7 px-2">
            <Trash2 className="h-3 w-3 mr-1" />
            Clear Cache
          </Button>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1 mt-2">
          {filteredQueries.map((query, index) => (
            <div
              key={index}
              className="p-2 border rounded text-[10px] space-y-1 bg-black/20"
            >
              <div className="font-mono truncate" title={query.queryKey}>
                {query.queryKey}
              </div>
              <div className="flex gap-2">
                <span className={`px-1 rounded ${
                  query.status === 'success' ? 'bg-green-900/30 text-green-400' : 
                  query.status === 'error' ? 'bg-red-900/30 text-red-400' : 'bg-slate-800 text-slate-400'
                }`}>
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
