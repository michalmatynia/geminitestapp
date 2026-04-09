import { describe, expect, it } from 'vitest';

import { buildProductLeafCategoriesContextBundle } from '../workspace';

describe('buildProductLeafCategoriesContextBundle', () => {
  it('includes leaf categories with hierarchy context while keeping the leaf label as the output name', () => {
    const bundle = buildProductLeafCategoriesContextBundle({
      catalogs: [
        {
          id: 'catalog-a',
          name: 'Default Catalog',
          isDefault: true,
          languageIds: [],
          defaultLanguageId: null,
          defaultPriceGroupId: null,
          priceGroupIds: [],
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z',
        },
      ],
      selectedCatalogIds: ['catalog-a'],
      categories: [
        {
          id: 'cat-parent',
          name: 'Jewelry',
          color: null,
          parentId: null,
          catalogId: 'catalog-a',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z',
        },
        {
          id: 'cat-leaf-a',
          name: 'Pins',
          color: null,
          parentId: 'cat-parent',
          catalogId: 'catalog-a',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z',
        },
        {
          id: 'cat-leaf-b',
          name: 'Brooches',
          color: null,
          parentId: 'cat-parent',
          catalogId: 'catalog-a',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z',
        },
      ],
    });

    const document = bundle.documents[0];
    const section = document?.sections?.[0];

    expect(document?.entityType).toBe('product_editor_leaf_categories');
    expect(document?.facts?.['leafCategoryCount']).toBe(2);
    expect(document?.facts?.['categoryOutputPolicy']).toBe('final_leaf_segment_only');
    expect(section?.text).toContain('"Pins"');
    expect(section?.text).toContain('"Brooches"');
    expect(section?.text).toContain('"leafName": "Pins"');
    expect(section?.text).toContain('"hierarchyPath": "Jewelry > Pins"');
    expect(section?.text).toContain('"pathSegments": [');
    expect(section?.text).not.toContain('"leafName": "Jewelry"');
  });
});
