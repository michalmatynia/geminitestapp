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
  scrapedSourceDefinition: IntegrationDefinition | null;
  linkedinDefinition: IntegrationDefinition | null;
  pracujDefinition: IntegrationDefinition | null;
};

const findIntegrationDefinition = (
  slug: IntegrationDefinition['slug']
): IntegrationDefinition | null =>
  integrationDefinitions.find((definition) => definition.slug === slug) ?? null;

export function useIntegrationList(): IntegrationListState {
  const { integrations } = useIntegrationsData();
  const { handleIntegrationClick } = useIntegrationsActions();
  const integrationSlugs = integrations.map((integration: Integration) => integration.slug);
  const hasIntegrations = integrations.length > 0;

  const traderaDefinition = findIntegrationDefinition('tradera');
  const allegroDefinition = findIntegrationDefinition('allegro');
  const vintedDefinition = findIntegrationDefinition('vinted');
  const scanner1688Definition = findIntegrationDefinition('1688');
  const baselinkerDefinition = findIntegrationDefinition('baselinker');
  const scrapedSourceDefinition = findIntegrationDefinition('scraped-source');
  const linkedinDefinition = findIntegrationDefinition('linkedin');
  const pracujDefinition = findIntegrationDefinition('pracuj-pl');

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
    scrapedSourceDefinition,
    linkedinDefinition,
    pracujDefinition,
  };
}
