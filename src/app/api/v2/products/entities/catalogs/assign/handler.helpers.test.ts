import { describe, expect, it, vi } from 'vitest';

import {
  applyProductsCatalogAssignMutation,
  buildProductsCatalogAssignResponse,
  dedupeProductsCatalogAssignIds,
  requireValidProductsCatalogAssignCatalogIds,
  resolveProductsCatalogAssignMode,
  resolveValidProductsCatalogAssignCatalogIds,
} from './handler.helpers';

describe('product entities catalogs assign handler helpers', () => {
  it('dedupes ids, defaults mode, and filters valid catalog ids in order', () => {
    expect(dedupeProductsCatalogAssignIds(['a', 'b', 'a'])).toEqual(['a', 'b']);
    expect(resolveProductsCatalogAssignMode()).toBe('add');
    expect(resolveProductsCatalogAssignMode('remove')).toBe('remove');
    expect(
      resolveValidProductsCatalogAssignCatalogIds(['catalog-2', 'catalog-1', 'catalog-2'], [
        { id: 'catalog-1' },
        { id: 'catalog-2' },
      ])
    ).toEqual(['catalog-2', 'catalog-1']);
  });

  it('rejects when no valid catalog ids remain and builds the mutation response', () => {
    expect(() =>
      requireValidProductsCatalogAssignCatalogIds(['missing-catalog'], [])
    ).toThrow('No valid catalogs found.');
    expect(buildProductsCatalogAssignResponse(2, 1, 'replace')).toEqual({
      updated: 2,
      catalogs: 1,
      mode: 'replace',
    });
  });

  it('dispatches add, replace, and remove mutations to the matching repository method', async () => {
    const repository = {
      bulkReplaceProductCatalogs: vi.fn(),
      bulkRemoveProductCatalogs: vi.fn(),
      bulkAddProductCatalogs: vi.fn(),
    };

    await applyProductsCatalogAssignMutation({
      mode: 'add',
      productIds: ['product-1'],
      catalogIds: ['catalog-1'],
      productRepository: repository,
    });
    await applyProductsCatalogAssignMutation({
      mode: 'replace',
      productIds: ['product-1'],
      catalogIds: ['catalog-1'],
      productRepository: repository,
    });
    await applyProductsCatalogAssignMutation({
      mode: 'remove',
      productIds: ['product-1'],
      catalogIds: ['catalog-1'],
      productRepository: repository,
    });

    expect(repository.bulkAddProductCatalogs).toHaveBeenCalledWith(['product-1'], ['catalog-1']);
    expect(repository.bulkReplaceProductCatalogs).toHaveBeenCalledWith(
      ['product-1'],
      ['catalog-1']
    );
    expect(repository.bulkRemoveProductCatalogs).toHaveBeenCalledWith(
      ['product-1'],
      ['catalog-1']
    );
  });
});
