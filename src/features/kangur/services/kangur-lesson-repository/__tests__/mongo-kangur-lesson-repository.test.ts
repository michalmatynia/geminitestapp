/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest';

type MockCollection = {
  bulkWrite: ReturnType<typeof vi.fn>;
  createIndex: ReturnType<typeof vi.fn>;
  indexes: ReturnType<typeof vi.fn>;
  dropIndex: ReturnType<typeof vi.fn>;
  find: ReturnType<typeof vi.fn>;
  countDocuments: ReturnType<typeof vi.fn>;
};

const buildDb = (docs: unknown[], count: number) => {
  const toArray = vi.fn().mockResolvedValue(docs);
  const sort = vi.fn().mockReturnValue({ toArray });
  const find = vi.fn().mockImplementation((_filter?: unknown, options?: { projection?: unknown }) =>
    options?.projection ? { toArray } : { sort }
  );
  const collection: MockCollection = {
    bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
    createIndex: vi.fn().mockResolvedValue('ok'),
    indexes: vi.fn().mockResolvedValue([]),
    dropIndex: vi.fn().mockResolvedValue('ok'),
    find,
    countDocuments: vi.fn().mockResolvedValue(count),
  };
  const db = {
    collection: vi.fn().mockReturnValue(collection),
  };

  return { db, collection };
};

describe('mongoKangurLessonRepository fallback', () => {
  it('returns default lessons for a subject when no records exist', async () => {
    vi.resetModules();
    const { db, collection } = buildDb([], 0);
    vi.doMock('@/shared/lib/db/mongo-client', () => ({
      getMongoDb: vi.fn().mockResolvedValue(db),
    }));
    vi.doMock('@/features/kangur/services/kangur-settings-repository', () => ({
      readKangurSettingValue: vi.fn().mockResolvedValue(null),
    }));

    const { mongoKangurLessonRepository } = await import(
      '../mongo-kangur-lesson-repository'
    );
    const { createDefaultKangurLessons } = await import('@/features/kangur/settings');

    const result = await mongoKangurLessonRepository.listLessons({
      subject: 'english',
      enabledOnly: true,
    });

    const expected = createDefaultKangurLessons().filter(
      (lesson) => lesson.subject === 'english' && lesson.enabled
    );
    expect(result).toEqual(expected);
    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
  });

  it('does not fallback when lessons exist for the subject but are filtered out', async () => {
    vi.resetModules();
    const { db } = buildDb([], 2);
    vi.doMock('@/shared/lib/db/mongo-client', () => ({
      getMongoDb: vi.fn().mockResolvedValue(db),
    }));

    const { mongoKangurLessonRepository } = await import(
      '../mongo-kangur-lesson-repository'
    );

    const result = await mongoKangurLessonRepository.listLessons({
      subject: 'english',
      enabledOnly: true,
    });

    expect(result).toEqual([]);
  });

  it('merges legacy Kangur settings entries into the full default lesson catalog', async () => {
    vi.resetModules();
    const { createDefaultKangurLessons } = await import('@/features/kangur/settings');
    const legacyLessons = [
      {
        id: 'kangur-lesson-english_adverbs',
        componentId: 'english_adverbs',
        contentMode: 'component',
        subject: 'english',
        ageGroup: 'ten_year_old',
        title: 'Custom adverbs',
        description: 'Legacy Mongo settings lesson',
        emoji: '📝',
        color: 'from-sky-500 to-cyan-500',
        activeBg: 'from-sky-500/20 via-cyan-500/15 to-white',
        sortOrder: 1000,
        enabled: true,
      },
    ];
    const mergedLessons = createDefaultKangurLessons().map((lesson) =>
      lesson.id === 'kangur-lesson-english_adverbs'
        ? {
            ...lesson,
            title: 'Custom adverbs',
            description: 'Legacy Mongo settings lesson',
            color: 'from-sky-500 to-cyan-500',
            activeBg: 'from-sky-500/20 via-cyan-500/15 to-white',
          }
        : lesson
    );
    const englishMergedLessons = mergedLessons.filter(
      (lesson) => lesson.subject === 'english' && lesson.enabled
    );
    const { db, collection } = buildDb([], 0);
    const toArray = vi.fn().mockImplementation(async () =>
      collection.bulkWrite.mock.calls.length > 0 ? englishMergedLessons : []
    );
    const sort = vi.fn().mockReturnValue({ toArray });
    collection.find = vi.fn().mockImplementation((_filter?: unknown, options?: { projection?: unknown }) =>
      options?.projection ? { toArray } : { sort }
    );
    vi.doMock('@/shared/lib/db/mongo-client', () => ({
      getMongoDb: vi.fn().mockResolvedValue(db),
    }));
    vi.doMock('@/features/kangur/services/kangur-settings-repository', () => ({
      readKangurSettingValue: vi.fn().mockResolvedValue(JSON.stringify(legacyLessons)),
    }));

    const { mongoKangurLessonRepository } = await import(
      '../mongo-kangur-lesson-repository'
    );

    const result = await mongoKangurLessonRepository.listLessons({
      subject: 'english',
      enabledOnly: true,
    });

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(result.length).toBeGreaterThan(legacyLessons.length);
    expect(result).toHaveLength(
      createDefaultKangurLessons().filter(
        (lesson) => lesson.subject === 'english' && lesson.enabled
      ).length
    );
    expect(
      result.find((lesson) => lesson.id === 'kangur-lesson-english_adverbs')
    ).toMatchObject({
      title: 'Custom adverbs',
      description: 'Legacy Mongo settings lesson',
    });
  });

  it('backfills missing default lessons when the collection is only partially populated', async () => {
    vi.resetModules();
    const { createDefaultKangurLessons } = await import('@/features/kangur/settings');
    const englishDefaults = createDefaultKangurLessons().filter(
      (lesson) => lesson.subject === 'english' && lesson.enabled
    );
    const partialEnglishLessons = englishDefaults.filter(
      (lesson) => lesson.componentId !== 'english_comparatives_superlatives'
    );
    const toArray = vi.fn().mockImplementation(async () =>
      collection.bulkWrite.mock.calls.length > 0 ? englishDefaults : partialEnglishLessons
    );
    const sort = vi.fn().mockReturnValue({ toArray });
    const collection: MockCollection = {
      bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
      createIndex: vi.fn().mockResolvedValue('ok'),
      indexes: vi.fn().mockResolvedValue([]),
      dropIndex: vi.fn().mockResolvedValue('ok'),
      find: vi.fn().mockImplementation((_filter?: unknown, options?: { projection?: unknown }) =>
        options?.projection ? { toArray } : { sort }
      ),
      countDocuments: vi.fn().mockResolvedValue(partialEnglishLessons.length),
    };
    const db = {
      collection: vi.fn().mockReturnValue(collection),
    };
    vi.doMock('@/shared/lib/db/mongo-client', () => ({
      getMongoDb: vi.fn().mockResolvedValue(db),
    }));
    vi.doMock('@/features/kangur/services/kangur-settings-repository', () => ({
      readKangurSettingValue: vi.fn().mockResolvedValue(null),
    }));

    const { mongoKangurLessonRepository } = await import(
      '../mongo-kangur-lesson-repository'
    );

    const result = await mongoKangurLessonRepository.listLessons({
      subject: 'english',
      enabledOnly: true,
    });

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(result).toEqual(englishDefaults);
    expect(
      result.some((lesson) => lesson.componentId === 'english_comparatives_superlatives')
    ).toBe(true);
  });

  it('filters lessons by componentIds when a subset is requested', async () => {
    vi.resetModules();
    const { createDefaultKangurLessons } = await import('@/features/kangur/settings');
    const filteredLessons = createDefaultKangurLessons().filter(
      (lesson) =>
        lesson.subject === 'english' &&
        lesson.enabled &&
        ['english_adjectives', 'english_comparatives_superlatives'].includes(lesson.componentId)
    );
    const { db, collection } = buildDb(filteredLessons, filteredLessons.length);
    vi.doMock('@/shared/lib/db/mongo-client', () => ({
      getMongoDb: vi.fn().mockResolvedValue(db),
    }));
    vi.doMock('@/features/kangur/services/kangur-settings-repository', () => ({
      readKangurSettingValue: vi.fn().mockResolvedValue(null),
    }));

    const { mongoKangurLessonRepository } = await import(
      '../mongo-kangur-lesson-repository'
    );

    const result = await mongoKangurLessonRepository.listLessons({
      subject: 'english',
      enabledOnly: true,
      componentIds: ['english_adjectives', 'english_comparatives_superlatives'],
    });

    expect(collection.find).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'english',
        enabled: true,
        componentId: {
          $in: ['english_adjectives', 'english_comparatives_superlatives'],
        },
      })
    );
    expect(result).toEqual(filteredLessons);
  });
});
