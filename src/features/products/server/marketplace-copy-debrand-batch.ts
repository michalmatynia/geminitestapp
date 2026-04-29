import 'server-only';

import { integrationService } from '@/features/integrations/services/integration-service';
import type { IntegrationRecord } from '@/shared/contracts/integrations/repositories';
import type {
  ProductMarketplaceContentOverrideDraft,
  ProductWithImages,
} from '@/shared/contracts/products/product';
import { normalizeProductMarketplaceContentOverrideDrafts } from '@/shared/contracts/products/product';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import {
  isBaseIntegrationSlug,
  isLinkedInIntegrationSlug,
  normalizeIntegrationSlug,
} from '@/shared/lib/integration-slugs';

export type MarketplaceCopyOverrideResolution = {
  marketplaceContentOverrides: ProductMarketplaceContentOverrideDraft[];
  row: ProductMarketplaceContentOverrideDraft;
  rowIndex: number;
  created: boolean;
};

const normalizeOptionalText = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const resolveMarketplaceCopyDebrandIntegrationName = (
  integration: Pick<IntegrationRecord, 'id' | 'name' | 'slug'>
): string => {
  const name = normalizeOptionalText(integration.name);
  if (name.length > 0) return name;
  const slug = normalizeOptionalText(integration.slug);
  return slug.length > 0 ? slug : integration.id;
};

export const isMarketplaceCopyDebrandIntegrationEligible = (
  integration: Pick<IntegrationRecord, 'slug'> | null | undefined
): boolean => {
  const slug = normalizeIntegrationSlug(integration?.slug);
  return slug.length > 0 && !isBaseIntegrationSlug(slug) && !isLinkedInIntegrationSlug(slug);
};

export const resolveMarketplaceCopyDebrandIntegration = async (
  integrationId: string
): Promise<IntegrationRecord> => {
  const normalizedIntegrationId = integrationId.trim();
  if (normalizedIntegrationId.length === 0) {
    throw badRequestError('Marketplace integration is required.');
  }

  const integration = await integrationService.getIntegrationById(normalizedIntegrationId);
  if (!integration) {
    throw notFoundError('Marketplace integration was not found.', {
      integrationId: normalizedIntegrationId,
    });
  }
  if (!isMarketplaceCopyDebrandIntegrationEligible(integration)) {
    throw badRequestError('Selected integration cannot be used for marketplace copy debranding.', {
      integrationId: normalizedIntegrationId,
      integrationSlug: integration.slug,
    });
  }

  return integration;
};

export const ensureProductMarketplaceCopyOverrideForIntegration = (
  product: Pick<ProductWithImages, 'marketplaceContentOverrides'>,
  integrationId: string
): MarketplaceCopyOverrideResolution => {
  const normalizedIntegrationId = integrationId.trim();
  const marketplaceContentOverrides = normalizeProductMarketplaceContentOverrideDrafts(
    product.marketplaceContentOverrides ?? []
  );
  const existingIndex = marketplaceContentOverrides.findIndex(
    (entry: ProductMarketplaceContentOverrideDraft): boolean =>
      entry.integrationIds.includes(normalizedIntegrationId)
  );

  if (existingIndex >= 0) {
    const existingRow = marketplaceContentOverrides[existingIndex];
    if (existingRow === undefined) {
      throw badRequestError('Marketplace copy override could not be resolved.', {
        integrationId: normalizedIntegrationId,
      });
    }
    return {
      marketplaceContentOverrides,
      row: existingRow,
      rowIndex: existingIndex,
      created: false,
    };
  }

  const row: ProductMarketplaceContentOverrideDraft = {
    integrationIds: [normalizedIntegrationId],
    title: null,
    description: null,
  };

  return {
    marketplaceContentOverrides: [...marketplaceContentOverrides, row],
    row,
    rowIndex: marketplaceContentOverrides.length,
    created: true,
  };
};
