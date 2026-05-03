import { resolveIntegrationDisplayName } from '@/features/integrations/components/listings/product-listings-labels';
import {
  isBaseIntegrationSlug,
  isLinkedInIntegrationSlug,
} from '@/features/integrations/constants/slugs';
import type { Integration } from '@/shared/contracts/integrations/base';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { MultiSelectOption } from '@/shared/contracts/ui/controls';

export type MarketplaceCopyFormEntry = NonNullable<
  ProductFormData['marketplaceContentOverrides']
>[number];

export type MarketplaceCopyErrorEntry = {
  integrationIds?: unknown;
  title?: unknown;
  description?: unknown;
};

export const createEmptyMarketplaceCopyOverride = (): MarketplaceCopyFormEntry => ({
  integrationIds: [],
  title: '',
  description: '',
});

export const toErrorMessage = (value: unknown): string | undefined => {
  if (value === null || value === undefined || typeof value !== 'object') return undefined;
  const message = (value as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
};

export const resolveMarketplaceIntegrationOptions = ({
  integrations,
  selectedIntegrationIds,
}: {
  integrations: Integration[];
  selectedIntegrationIds: string[];
}): MultiSelectOption[] => {
  const eligibleOptions = integrations
    .filter((integration: Integration) => {
      const slug = integration.slug.trim();
      return !isBaseIntegrationSlug(slug) && !isLinkedInIntegrationSlug(slug);
    })
    .map((integration: Integration) => ({
      value: integration.id,
      label: resolveIntegrationDisplayName(integration.name, integration.slug) ?? integration.name,
    }));

  const seen = new Set(eligibleOptions.map((option) => option.value));
  const unknownSelectedOptions = selectedIntegrationIds.flatMap((integrationId: string) => {
    if (integrationId.length === 0 || seen.has(integrationId)) return [];
    seen.add(integrationId);
    return [
      {
        value: integrationId,
        label: `Unknown integration (${integrationId})`,
      },
    ];
  });

  return [...eligibleOptions, ...unknownSelectedOptions].sort((left, right) =>
    left.label.localeCompare(right.label)
  );
};
