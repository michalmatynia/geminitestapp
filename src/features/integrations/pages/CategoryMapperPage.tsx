'use client';

import { useEffect, useMemo, useState } from 'react';

import { BaseCategoryMapper } from '@/features/integrations/components/marketplaces/category-mapper/BaseCategoryMapper';
import { MarketplaceSelector } from '@/features/integrations/components/marketplaces/category-mapper/MarketplaceSelector';
import { useIntegrationsWithConnections } from '@/features/integrations/hooks/useIntegrationQueries';
import type { IntegrationWithConnections } from '@/features/integrations/types/listings';
import { useToast, SectionHeader, SectionPanel } from '@/shared/ui';

export default function CategoryMapperPage(): React.JSX.Element {
  const [selectedConnectionIdOverride, setSelectedConnectionIdOverride] = useState<string | null>(null);
  const { toast } = useToast();
  const integrationsQuery = useIntegrationsWithConnections();

  useEffect(() => {
    if (!integrationsQuery.isError) return;
    const message =
      integrationsQuery.error instanceof Error
        ? integrationsQuery.error.message
        : 'Failed to load integrations.';
    toast(message, { variant: 'error' });
  }, [integrationsQuery.error, integrationsQuery.isError, toast]);

  const integrations = useMemo<IntegrationWithConnections[]>((): IntegrationWithConnections[] => {
    const data = integrationsQuery.data ?? [];
    return data.filter(
      (i: IntegrationWithConnections) => i.slug.toLowerCase() === 'baselinker' || i.slug.toLowerCase() === 'base'
    );
  }, [integrationsQuery.data]);

  const selectedConnectionId = useMemo((): string | null => {
    if (selectedConnectionIdOverride) {
      const exists = integrations.some((i: IntegrationWithConnections) =>
        i.connections.some((c: { id: string }) => c.id === selectedConnectionIdOverride)
      );
      if (exists) return selectedConnectionIdOverride;
    }
    const firstConnection = integrations
      .flatMap((i: IntegrationWithConnections) => i.connections)
      .find((c: { id: string }) => c);
    return firstConnection?.id ?? null;
  }, [integrations, selectedConnectionIdOverride]);

  const selectedConnection = ((): { name: string; id: string; integration: IntegrationWithConnections } | null => {
    if (!selectedConnectionId) return null;
    const allConnections = integrations.flatMap((i: IntegrationWithConnections) =>
      i.connections.map((c: { id: string; name: string }) => ({ ...c, integration: i }))
    );
    return allConnections.find((c: { id: string }) => c.id === selectedConnectionId) ?? null;
  })();

  const isBaseConnection = ((): boolean => {
    if (!selectedConnection) return false;
    const slug = selectedConnection.integration.slug.toLowerCase();
    return slug === 'baselinker' || slug === 'base';
  })();

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
              onSelectConnection={setSelectedConnectionIdOverride}
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
                connectionName={selectedConnection?.name ?? ''}
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
