'use client';

import { useIntegrationsContext } from '@/shared/lib/integrations/context/IntegrationsContext';
import { integrationDefinitions, type Integration } from '@/shared/contracts/integrations';

export function useIntegrationList() {
  const { integrations, handleIntegrationClick } = useIntegrationsContext();
  const integrationSlugs = integrations.map((integration: Integration) => integration.slug);
  const hasIntegrations = integrations.length > 0;

  const traderaDefinition =
    integrationDefinitions.find((definition) => definition.slug === 'tradera') ?? null;
  const traderaApiDefinition =
    integrationDefinitions.find((definition) => definition.slug === 'tradera-api') ?? null;
  const allegroDefinition =
    integrationDefinitions.find((definition) => definition.slug === 'allegro') ?? null;
  const baselinkerDefinition =
    integrationDefinitions.find((definition) => definition.slug === 'baselinker') ?? null;

  return {
    integrations,
    handleIntegrationClick,
    integrationSlugs,
    hasIntegrations,
    traderaDefinition,
    traderaApiDefinition,
    allegroDefinition,
    baselinkerDefinition,
  };
}
