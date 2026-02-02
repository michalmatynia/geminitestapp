"use client";

import { useEnhancedProducts, useEnhancedUsers, useEnhancedSettings } from "@/features/products/hooks/useEnhancedQueries";
import { useQueryLifecycle } from "@/shared/hooks/useQueryLifecycle";
import { useQueryBatching } from "@/shared/hooks/useQueryBatching";
import { useSmartCache } from "@/shared/hooks/useSmartCache";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@/shared/ui";

export function ComprehensiveQueryDemo() {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Enhanced queries with all advanced features
  const { products, stats, selectById } = useEnhancedProducts();
  const { users, permissions, activity } = useEnhancedUsers();
  const settings = useEnhancedSettings();
  
  // Query management hooks
  const { getQueryStats, cleanupStaleQueries } = useQueryLifecycle();
  const { getCacheStats, optimizeCache } = useSmartCache();
  const { batchQuery } = useQueryBatching();
  
  const [queryStats, setQueryStats] = useState<any>(null);
  const [cacheStats, setCacheStats] = useState<any>(null);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => {
      setQueryStats(getQueryStats());
      setCacheStats(getCacheStats());
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, [getQueryStats, getCacheStats]);

  // Batch load multiple products
  const loadProductsBatch = async (ids: string[]) => {
    const promises = ids.map(id => 
      batchQuery(['products', id], async () => {
        const res = await fetch(`/api/products/${id}`);
        return res.json();
      })
    );
    
    const results = await Promise.all(promises);
    console.log('Batch loaded products:', results);
  };

  const selectedProduct = selectedProductId ? selectById(selectedProductId) : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Comprehensive TanStack Query Demo</h1>
        <div className="flex gap-2">
          <Button onClick={optimizeCache} variant="outline" size="sm">
            Optimize Cache
          </Button>
          <Button onClick={cleanupStaleQueries} variant="outline" size="sm">
            Cleanup Queries
          </Button>
        </div>
      </div>

      {/* Query Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Query Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {queryStats && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Queries:</span>
                  <Badge>{queryStats.totalQueries}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Active Queries:</span>
                  <Badge variant="secondary">{queryStats.activeQueries}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>High Priority:</span>
                  <Badge variant="destructive">{queryStats.highPriorityQueries}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Memory Usage:</span>
                  <Badge variant="outline">{Math.round(queryStats.totalMemoryUsage / 1024)}KB</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cache Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            {cacheStats && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Cache Hit Rate:</span>
                  <Badge variant="default">{(cacheStats.cacheHitRate * 100).toFixed(1)}%</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Avg Execution:</span>
                  <Badge variant="secondary">{cacheStats.avgExecutionTime.toFixed(0)}ms</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Size:</span>
                  <Badge variant="outline">{cacheStats.totalDataSize}KB</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Product Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product Analytics (Composed Query)</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.isLoading ? (
            <div>Loading statistics...</div>
          ) : stats.data ? (
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.data.total}</div>
                <div className="text-sm text-muted-foreground">Total Products</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.data.published}</div>
                <div className="text-sm text-muted-foreground">Published</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.data.categories}</div>
                <div className="text-sm text-muted-foreground">Categories</div>
              </div>
              <div>
                <div className="text-2xl font-bold">${stats.data.avgPrice?.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Avg Price</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Normalized Products */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Products (Normalized Query)</CardTitle>
        </CardHeader>
        <CardContent>
          {products.isLoading ? (
            <div>Loading products...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {products.normalized?.allIds.slice(0, 10).map(id => (
                  <Button
                    key={id}
                    variant={selectedProductId === id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedProductId(id)}
                  >
                    Product {id.slice(0, 8)}
                  </Button>
                ))}
              </div>
              
              <Button 
                onClick={() => loadProductsBatch(products.normalized?.allIds.slice(0, 5) || [])}
                variant="secondary"
              >
                Batch Load First 5 Products
              </Button>

              {selectedProduct && (
                <div className="p-4 border rounded">
                  <h3 className="font-semibold">{selectedProduct.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                  <div className="mt-2">
                    <Badge>${selectedProduct.price}</Badge>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Users (Long-term Cache)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.data?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Total Users</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Permissions (Standard Cache)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {permissions.data?.length || 0}
            </div>
            <div className="text-sm text-muted-foreground">Permissions</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Activity (Real-time)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activity.data?.activeUsers || 0}
            </div>
            <div className="text-sm text-muted-foreground">Active Now</div>
          </CardContent>
        </Card>
      </div>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Composed Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {settings.isLoading ? (
            <div>Loading settings...</div>
          ) : settings.data ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Theme:</strong> {settings.data.theme}
              </div>
              <div>
                <strong>Language:</strong> {settings.data.language}
              </div>
              <div>
                <strong>System Status:</strong> {settings.data.system?.status}
              </div>
              <div>
                <strong>Version:</strong> {settings.data.system?.version}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
