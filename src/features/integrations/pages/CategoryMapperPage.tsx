"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { MarketplaceSelector } from "@/features/integrations/components/marketplaces/category-mapper/MarketplaceSelector";
import { BaseCategoryMapper } from "@/features/integrations/components/marketplaces/category-mapper/BaseCategoryMapper";
import { SectionHeader } from "@/shared/components/section-header";
import { SectionPanel } from "@/shared/components/section-panel";

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
      <SectionPanel className="p-6">
        <SectionHeader
          title="Category Mapper"
          description="Map external marketplace categories to your internal product categories for seamless import and export."
          className="mb-6"
        />

        <div className="grid gap-6 md:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <SectionPanel className="p-4">
            <MarketplaceSelector
              integrations={integrations}
              loading={loading}
              selectedConnectionId={selectedConnectionId}
              onSelectConnection={setSelectedConnectionId}
            />
          </SectionPanel>

          {/* Main Content */}
          <SectionPanel className="p-6">
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
          </SectionPanel>
        </div>
      </SectionPanel>
    </div>
  );
}
