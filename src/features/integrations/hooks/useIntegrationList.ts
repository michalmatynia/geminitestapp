import {
  useIntegrationsActions,
  useIntegrationsData,
} from '@/features/integrations/context/IntegrationsContext';
import { integrationDefinitions } from '@/shared/contracts/integrations/domain';
import { type Integration } from '@/shared/contracts/integrations';

type IntegrationDefinition = (typeof integrationDefinitions)[number];

type IntegrationListState = {
  integrations: ReturnType<typeof useIntegrationsData>['integrations'];
  handleIntegrationClick: ReturnType<typeof useIntegrationsActions>['handleIntegrationClick'];
  integrationSlugs: Integration['slug'][];
  hasIntegrations: boolean;
  traderaDefinition: IntegrationDefinition | null;
  allegroDefinition: IntegrationDefinition | null;
  vintedDefinition: IntegrationDefinition | null;
  scanner1688Definition: IntegrationDefinition | null;
  baselinkerDefinition: IntegrationDefinition | null;
  linkedinDefinition: IntegrationDefinition | null;
};

export function useIntegrationList(): IntegrationListState {
  const { integrations } = useIntegrationsData();
  const { handleIntegrationClick } = useIntegrationsActions();
  const integrationSlugs = integrations.map((integration: Integration) => integration.slug);
  const hasIntegrations = integrations.length > 0;

  const traderaDefinition =
    integrationDefinitions.find((definition) => definition.slug === 'tradera') ?? null;
  const allegroDefinition =
    integrationDefinitions.find((definition) => definition.slug === 'allegro') ?? null;
  const vintedDefinition =
    integrationDefinitions.find((definition) => definition.slug === 'vinted') ?? null;
  const scanner1688Definition =
    integrationDefinitions.find((definition) => definition.slug === '1688') ?? null;
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
    allegroDefinition,
    vintedDefinition,
    scanner1688Definition,
    baselinkerDefinition,
    linkedinDefinition,
  };
}
