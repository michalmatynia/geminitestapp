import React from 'react';

import type { PriceGroup } from '@/shared/contracts/products/catalogs';
import { resolvePriceGroupIdentifierToId } from '@/shared/lib/products/utils/price-group-identifiers';

type CatalogPriceGroupLookup = {
  canonicalizePriceGroupId: (value: string) => string;
  normalizePriceGroupIds: (values: string[]) => string[];
};

export function useCatalogPriceGroups(priceGroups: PriceGroup[]): CatalogPriceGroupLookup {
  const canonicalizePriceGroupId = React.useCallback(
    (value: string): string => resolvePriceGroupIdentifierToId(priceGroups, value),
    [priceGroups]
  );

  const normalizePriceGroupIds = React.useCallback(
    (values: string[]): string[] =>
      Array.from(
        new Set(
          values
            .map((value) => canonicalizePriceGroupId(value))
            .filter((value) => value.length > 0)
        )
      ),
    [canonicalizePriceGroupId]
  );

  return {
    canonicalizePriceGroupId,
    normalizePriceGroupIds,
  };
}
