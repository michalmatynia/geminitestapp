import { describe, expect, it } from 'vitest';

import { buildListProjectStage } from './read';

describe('buildListProjectStage', () => {
  it('includes parameters in the paged list projection when SKU filtering is not used', () => {
    const stage = buildListProjectStage({});

    expect(stage).not.toBeNull();
    expect(stage).toMatchObject({
      importSource: 1,
      category: {
        id: '$category.id',
        name: '$category.name',
        catalogId: '$category.catalogId',
        name_en: '$category.name_en',
      },
      parameters: 1,
      name_en: 1,
      name_pl: 1,
      name_de: 1,
    });
  });

  it('disables the compact projection for direct SKU lookups', () => {
    expect(buildListProjectStage({ sku: 'KEYCHA1217' })).toBeNull();
  });
});
