/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const toArray = vi.fn();
  const find = vi.fn(() => ({ toArray }));
  const collection = vi.fn(() => ({ find }));
  const getMongoDb = vi.fn(async () => ({ collection }));

  return {
    collection,
    find,
    getMongoDb,
    toArray,
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: mocks.getMongoDb,
}));

import { normalizeCatalogLanguageSelection } from './catalog-language-normalization';

describe('catalog-language-normalization', () => {
  beforeEach(() => {
    mocks.collection.mockClear();
    mocks.find.mockClear();
    mocks.getMongoDb.mockClear();
    mocks.toArray.mockReset();
  });

  it('normalizes language ids and default language ids through the mongo lookup table', async () => {
    mocks.toArray.mockResolvedValueOnce([
      { id: 'lang-en', code: 'EN' },
      { id: 'lang-pl', code: 'pl' },
      { id: 'lang-de', code: 'DE' },
    ]);

    const result = await normalizeCatalogLanguageSelection({
      provider: { kind: 'mongo' } as never,
      languageIds: [' EN ', 'lang-pl', 'pl', 'custom-id', '', 'lang-de'],
      defaultLanguageId: ' de ',
    });

    expect(mocks.collection).toHaveBeenCalledWith('languages');
    expect(mocks.find).toHaveBeenCalledWith({}, { projection: { id: 1, code: 1 } });
    expect(result).toEqual({
      languageIds: ['lang-en', 'lang-pl', 'custom-id', 'lang-de'],
      defaultLanguageId: 'lang-de',
    });
  });

  it('falls back to trimmed raw values when lookup rows are incomplete', async () => {
    mocks.toArray.mockResolvedValueOnce([
      { id: '', code: 'de' },
      { id: null, code: 'es' },
      { id: 'lang-fr', code: null },
    ]);

    const result = await normalizeCatalogLanguageSelection({
      provider: { kind: 'mongo' } as never,
      languageIds: [' de ', 'es', ' lang-fr ', ' raw ', 'raw'],
      defaultLanguageId: ' raw ',
    });

    expect(result).toEqual({
      languageIds: ['de', 'es', 'lang-fr', 'raw'],
      defaultLanguageId: 'raw',
    });
  });
});
