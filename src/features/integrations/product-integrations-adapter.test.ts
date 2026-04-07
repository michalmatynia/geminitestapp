import { describe, expect, it } from 'vitest';

import * as adapter from './product-integrations-adapter';

describe('product integrations adapter', () => {
  it('exposes the modal and query helpers used by the products list UI', () => {
    expect(adapter.ListProductModal).toBeDefined();
    expect(adapter.MassListProductModal).toBeDefined();
    expect(adapter.ProductListingsModal).toBeDefined();
    expect(adapter.fetchIntegrationsWithConnections).toBeTypeOf('function');
    expect(adapter.fetchPreferredBaseConnection).toBeTypeOf('function');
    expect(adapter.fetchPreferredVintedConnection).toBeTypeOf('function');
    expect(adapter.fetchProductListings).toBeTypeOf('function');
    expect(adapter.productListingsQueryKey).toBeTypeOf('function');
    expect(adapter.integrationSelectionQueryKeys).toBeDefined();
  });

  it('exposes the product list integration hooks without the broad public barrel', () => {
    expect(adapter.useIntegrationListingBadges).toBeTypeOf('function');
    expect(adapter.useIntegrationModalOperations).toBeTypeOf('function');
    expect(adapter.useIntegrationOperations).toBeTypeOf('function');
    expect(adapter.useGenericExportToBaseMutation).toBeTypeOf('function');
    expect(adapter.isBaseIntegrationSlug).toBeTypeOf('function');
  });
});
