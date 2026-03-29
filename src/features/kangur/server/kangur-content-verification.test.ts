/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

describe('verifyKangurContentInMongo', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('reports missing built-in content without failing on harmless extras', async () => {
    const countDocuments = vi.fn(async (filter?: Record<string, unknown>) => {
      if (!filter || Object.keys(filter).length === 0) {
        return 0;
      }

      if ('locale' in filter && filter.locale === 'en') {
        return 999;
      }

      if ('gameId' in filter && filter.gameId === 'english_adverbs_action_studio') {
        return 0;
      }

      if ('$or' in filter) {
        return 0;
      }

      return 0;
    });

    const distinct = vi.fn().mockResolvedValue(['pl']);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn((name: string) => {
        if (name === 'kangur_ai_tutor_content') {
          return { countDocuments, distinct };
        }
        return { countDocuments };
      }),
    });

    const { verifyKangurContentInMongo } = await import('./kangur-content-verification');

    const result = await verifyKangurContentInMongo(['pl', 'en']);

    expect(result.aiTutorLocales.missing).toEqual(['en']);
    expect(result.pageContentEntriesByLocale['en']?.meetsMinimum).toBe(true);
    expect(result.lessonDocuments.meetsMinimum).toBe(false);
    expect(result.mismatches).toContain('aiTutorLocales missing en');
    expect(
      result.mismatches.some((entry) => entry.startsWith('gameInstances[english_adverbs_action_studio]'))
    ).toBe(true);
    expect(result.ok).toBe(false);
  });
});
