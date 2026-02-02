"use client";

import { useDependentQueries, useParallelQueries, useConditionalQuery } from "@/shared/hooks/useAdvancedQueries";
import { useAutocomplete, usePaginatedSearch } from "@/shared/hooks/useSearchQueries";
import { useStreamingQuery, useWebSocketQuery } from "@/shared/hooks/useStreamingQueries";
import { useAdaptiveQuery } from "@/shared/hooks/useSmartCache";
import { useState } from "react";

// Example component showcasing advanced TanStack Query patterns
export function AdvancedQueryExample() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // 1. Dependent Queries - Load user -> profile -> permissions in sequence
  const userChain = useDependentQueries(
    {
      queryKey: ['users', 'list'],
      queryFn: async () => {
        const res = await fetch('/api/users');
        return res.json();
      },
    },
    {
      queryKey: ['user', 'profile'],
      queryFn: async (users) => {
        if (!selectedUserId) throw new Error('No user selected');
        const res = await fetch(`/api/users/${selectedUserId}/profile`);
        return res.json();
      },
    },
    {
      queryKey: ['user', 'permissions'],
      queryFn: async (profile) => {
        const res = await fetch(`/api/users/${profile.id}/permissions`);
        return res.json();
      },
    }
  );

  // 2. Parallel Queries - Load multiple independent datasets
  const dashboardData = useParallelQueries({
    products: {
      queryKey: ['products', 'summary'],
      queryFn: async () => {
        const res = await fetch('/api/products/summary');
        return res.json();
      },
    },
    orders: {
      queryKey: ['orders', 'recent'],
      queryFn: async () => {
        const res = await fetch('/api/orders/recent');
        return res.json();
      },
    },
    analytics: {
      queryKey: ['analytics', 'dashboard'],
      queryFn: async () => {
        const res = await fetch('/api/analytics/dashboard');
        return res.json();
      },
    },
  });

  // 3. Conditional Query - Only load if user has admin role
  const adminData = useConditionalQuery(
    ['admin', 'sensitive-data'],
    async () => {
      const res = await fetch('/api/admin/sensitive-data');
      return res.json();
    },
    {
      userRole: ['admin', 'super-admin'],
      permission: 'view_sensitive_data',
    }
  );

  // 4. Advanced Search with Autocomplete
  const searchResults = useAutocomplete(
    searchTerm,
    async (query) => {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      return res.json();
    },
    {
      maxRecentSearches: 10,
      storageKey: 'product-searches',
    }
  );

  // 5. Paginated Search
  const paginatedResults = usePaginatedSearch(
    searchTerm,
    async (query, page, pageSize) => {
      const res = await fetch(`/api/search/paginated?q=${query}&page=${page}&size=${pageSize}`);
      return res.json();
    },
    { pageSize: 20 }
  );

  // 6. Streaming Data
  const liveMetrics = useStreamingQuery(
    ['metrics', 'live'],
    {
      endpoint: '/api/metrics/stream',
      onMessage: (data) => {
        console.log('New metrics:', data);
      },
    }
  );

  // 7. WebSocket Real-time Updates
  const { sendMessage, isConnected } = useWebSocketQuery(
    ['notifications', 'live'],
    'ws://localhost:3000/notifications',
    {
      onMessage: (notification) => {
        console.log('New notification:', notification);
      },
      reconnect: true,
    }
  );

  // 8. Adaptive Caching based on data type
  const staticConfig = useAdaptiveQuery(
    ['config', 'app'],
    async () => {
      const res = await fetch('/api/config');
      return res.json();
    },
    { dataType: 'static', priority: 'high' }
  );

  const realtimeStatus = useAdaptiveQuery(
    ['system', 'status'],
    async () => {
      const res = await fetch('/api/system/status');
      return res.json();
    },
    { dataType: 'realtime', priority: 'high' }
  );

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Advanced TanStack Query Examples</h1>

      {/* Search Example */}
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Advanced Search</h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products..."
          className="w-full p-2 border rounded"
        />
        
        {searchResults.recentSearches.length > 0 && searchTerm === "" && (
          <div className="text-sm text-gray-600">
            Recent: {searchResults.recentSearches.join(", ")}
          </div>
        )}
        
        {searchResults.data && (
          <div className="text-sm">
            Found {searchResults.data.length} results
          </div>
        )}
      </div>

      {/* Dashboard Data */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Products</h3>
          {dashboardData.isLoading ? (
            <div>Loading...</div>
          ) : (
            <div>{dashboardData.data.products?.total || 0}</div>
          )}
        </div>
        
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Orders</h3>
          {dashboardData.isLoading ? (
            <div>Loading...</div>
          ) : (
            <div>{dashboardData.data.orders?.count || 0}</div>
          )}
        </div>
        
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Analytics</h3>
          {dashboardData.isLoading ? (
            <div>Loading...</div>
          ) : (
            <div>{dashboardData.data.analytics?.revenue || 0}</div>
          )}
        </div>
      </div>

      {/* Real-time Status */}
      <div className="p-4 border rounded">
        <h3 className="font-semibold">System Status</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        {realtimeStatus.data && (
          <div className="mt-2 text-sm">
            CPU: {realtimeStatus.data.cpu}% | Memory: {realtimeStatus.data.memory}%
          </div>
        )}
      </div>

      {/* Admin Section */}
      {adminData.data && (
        <div className="p-4 border rounded bg-red-50">
          <h3 className="font-semibold text-red-800">Admin Data</h3>
          <div className="text-sm text-red-600">
            Sensitive information visible to admins only
          </div>
        </div>
      )}
    </div>
  );
}
