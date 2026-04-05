import type { BaseImportPreflight, BaseImportPreflightIssue } from '@/shared/contracts/integrations/base-com';
import { getCatalogRepository } from '@/shared/lib/products/services/catalog-repository';
import { getProductDataProvider } from '@/shared/lib/products/services/product-provider';

import { resolvePriceGroupContext } from '../base-import-service-context';
import {
  StartBaseImportRunInput,
  BaseConnectionContext,
  nowIso,
  normalizeSelectedIds,
} from '../base-import-service-shared';

export const buildPreflight = async (
  input: StartBaseImportRunInput,
  connection: BaseConnectionContext
): Promise<{ preflight: BaseImportPreflight; catalogExists: boolean; hasPriceGroup: boolean }> => {
  const issues: BaseImportPreflightIssue[] = [];
  const checkedAt = nowIso();

  if (!input.inventoryId?.trim()) {
    issues.push({
      code: 'PRECHECK_FAILED',
      severity: 'error',
      message: 'Inventory ID is required.',
    });
  }

  if (connection.issue) {
    issues.push(connection.issue);
  }

  const catalogRepository = await getCatalogRepository();
  const catalogs = await catalogRepository.listCatalogs();
  const targetCatalog = catalogs.find((catalog) => catalog.id === input.catalogId);
  if (!targetCatalog) {
    issues.push({
      code: 'MISSING_CATALOG',
      severity: 'error',
      message: 'Selected catalog does not exist.',
    });
  }

  let hasPriceGroup = false;
  if (targetCatalog) {
    const provider = await getProductDataProvider();
    const pricingContext = await resolvePriceGroupContext(
      provider,
      targetCatalog.defaultPriceGroupId
    );
    hasPriceGroup = Boolean(pricingContext.defaultPriceGroupId);
    if (!hasPriceGroup) {
      issues.push({
        code: 'MISSING_PRICE_GROUP',
        severity: 'error',
        message: 'Catalog default price group is not configured.',
      });
    }
  }

  if (Array.isArray(input.selectedIds) && normalizeSelectedIds(input.selectedIds).length === 0) {
    issues.push({
      code: 'PRECHECK_FAILED',
      severity: 'error',
      message: 'Select at least one Base product before importing.',
    });
  }

  return {
    preflight: {
      ok: issues.every((issue) => issue.severity !== 'error'),
      issues,
      checkedAt,
    },
    catalogExists: Boolean(targetCatalog),
    hasPriceGroup,
  };
};
