import { describe, expect, it } from 'vitest';

import { toProductResponse } from '../mongo-product-repository-mappers';

describe('mongo product repository mappers', () => {
  it('prefers localized scalar fields over legacy nested object values', () => {
    const result = toProductResponse({
      _id: 'product-1',
      id: 'product-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      name: { en: 'legacy name', pl: 'legacy-pl', de: 'legacy-de' },
      description: { en: 'legacy description', pl: 'legacy-pl', de: 'legacy-de' },
      name_en: 'new name',
      name_pl: null,
      name_de: 'new de',
      description_en: 'new description',
      description_pl: 'new pl',
      description_de: null,
      catalogId: 'catalog-1',
      published: false,
    } as any);

    expect(result.name.en).toBe('new name');
    expect(result.name.pl).toBeNull();
    expect(result.name.de).toBe('new de');
    expect(result.description.en).toBe('new description');
    expect(result.description.pl).toBe('new pl');
    expect(result.description.de).toBeNull();
  });

  it('falls back to nested localized object when scalar fields are missing', () => {
    const result = toProductResponse({
      _id: 'product-2',
      id: 'product-2',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      description: { en: 'legacy description', pl: 'legacy-pl', de: null },
      description_en: null,
      description_pl: undefined,
      description_de: undefined,
      catalogId: 'catalog-1',
      published: false,
    } as any);

    expect(result.description.en).toBe('legacy description');
    expect(result.description.pl).toBe('legacy-pl');
    expect(result.description.de).toBeNull();
  });
});
