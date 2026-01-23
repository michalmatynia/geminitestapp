"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { MarketplaceSelector } from "./components/MarketplaceSelector";
import { BaseCategoryMapper } from "./components/BaseCategoryMapper";

type Integration = {
  id: string;
  name: string;
  slug: string;
};

type Connection = {
  id: string;
  integrationId: string;
  name: string;
};

type IntegrationWithConnections = Integration & {
  connections: Connection[];
};

export default function CategoryMapperPage() {
  const [integrations, setIntegrations] = useState<IntegrationWithConnections[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/integrations/with-connections");
      if (!res.ok) {
        throw new Error("Failed to fetch integrations");
      }
      const data = (await res.json()) as IntegrationWithConnections[];

      // Filter to only show marketplace integrations that support category mapping
      const marketplaceIntegrations = data.filter(
        (i) => i.slug.toLowerCase() === "baselinker" || i.slug.toLowerCase() === "base"
      );
      setIntegrations(marketplaceIntegrations);

      // Auto-select first connection if available
      const firstConnection = marketplaceIntegrations
        .flatMap((i) => i.connections)
        .find((c) => c);
      if (firstConnection && !selectedConnectionId) {
        setSelectedConnectionId(firstConnection.id);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
      toast("Failed to load integrations", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedConnectionId]);

  useEffect(() => {
    void fetchIntegrations();
  }, [fetchIntegrations]);

  const selectedConnection = useMemo(() => {
    if (!selectedConnectionId) return null;
    for (const integration of integrations) {
      const connection = integration.connections.find((c) => c.id === selectedConnectionId);
      if (connection) {
        return { ...connection, integration };
      }
    }
    return null;
  }, [integrations, selectedConnectionId]);

  const isBaseConnection = useMemo(() => {
    if (!selectedConnection) return false;
    const slug = selectedConnection.integration.slug.toLowerCase();
    return slug === "baselinker" || slug === "base";
  }, [selectedConnection]);

  return (
    <div className="container mx-auto py-10">
      <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
        <h1 className="mb-2 text-3xl font-bold text-white">Category Mapper</h1>
        <p className="mb-6 text-sm text-gray-400">
          Map external marketplace categories to your internal product categories for seamless import and export.
        </p>

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="rounded-md border border-gray-800 bg-gray-900 p-4">
            <MarketplaceSelector
              integrations={integrations}
              loading={loading}
              selectedConnectionId={selectedConnectionId}
              onSelectConnection={setSelectedConnectionId}
            />
          </aside>

          {/* Main Content */}
          <section className="rounded-md border border-gray-800 bg-gray-900 p-6">
            {!selectedConnectionId ? (
              <div className="flex h-64 items-center justify-center text-gray-500">
                <p>Select a marketplace connection to start mapping categories.</p>
              </div>
            ) : isBaseConnection ? (
              <BaseCategoryMapper
                connectionId={selectedConnectionId}
                connectionName={selectedConnection?.name ?? ""}
              />
            ) : (
              <div className="flex h-64 items-center justify-center text-gray-500">
                <p>Category mapping is not yet supported for this marketplace.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
