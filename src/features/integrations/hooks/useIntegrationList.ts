import {
  useIntegrationsActions,
  useIntegrationsData,
} from '@/features/integrations/context/IntegrationsContext';
import { integrationDefinitions, type Integration } from '@/shared/contracts/integrations';

export function useIntegrationList() {
  const { integrations } = useIntegrationsData();
  const { handleIntegrationClick } = useIntegrationsActions();
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
  const linkedinDefinition =
    integrationDefinitions.find((definition) => definition.slug === 'linkedin') ?? null;

  return {
    integrations,
    handleIntegrationClick,
    integrationSlugs,
    hasIntegrations,
    traderaDefinition,
    traderaApiDefinition,
    allegroDefinition,
    baselinkerDefinition,
    linkedinDefinition,
  };
}
