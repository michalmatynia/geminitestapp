"use client";

import { useToast, SectionHeader, SectionPanel } from "@/shared/ui";
import React, { useEffect, useMemo, useState } from "react";

import { MarketplaceSelector } from "@/features/integrations/components/marketplaces/category-mapper/MarketplaceSelector";
import { BaseCategoryMapper } from "@/features/integrations/components/marketplaces/category-mapper/BaseCategoryMapper";
import { useIntegrationsWithConnections } from "@/features/integrations/hooks/useIntegrationQueries";
import type { IntegrationWithConnections } from "@/features/integrations/types/listings";

export default function CategoryMapperPage() {
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const { toast } = useToast();
  const integrationsQuery = useIntegrationsWithConnections();

  useEffect(() => {
    if (!integrationsQuery.isError) return;
    const message =
      integrationsQuery.error instanceof Error
        ? integrationsQuery.error.message
        : "Failed to load integrations.";
    toast(message, { variant: "error" });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  const integrations = useMemo<IntegrationWithConnections[]>(() => {
    const data = integrationsQuery.data ?? [];
    return data.filter(
      (i) => i.slug.toLowerCase() === "baselinker" || i.slug.toLowerCase() === "base"
    );
  }, [integrationsQuery.data]);

  // Auto-select first connection if none selected
  // Done during render to avoid useEffect state sync warnings
  if (!selectedConnectionId && integrations.length > 0) {
    const firstConnection = integrations
      .flatMap((i) => i.connections)
      .find((c) => c);
    if (firstConnection) {
      setSelectedConnectionId(firstConnection.id);
    }
  }

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
              loading={integrationsQuery.isLoading}
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
