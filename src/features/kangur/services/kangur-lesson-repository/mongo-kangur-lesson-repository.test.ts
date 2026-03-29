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
  const collection: MockCollection = {
    bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
    createIndex: vi.fn().mockResolvedValue('ok'),
    indexes: vi.fn().mockResolvedValue([]),
    dropIndex: vi.fn().mockResolvedValue('ok'),
    find: vi.fn().mockReturnValue({ sort }),
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
      './mongo-kangur-lesson-repository'
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
      './mongo-kangur-lesson-repository'
    );

    const result = await mongoKangurLessonRepository.listLessons({
      subject: 'english',
      enabledOnly: true,
    });

    expect(result).toEqual([]);
  });

  it('backfills lessons from the legacy Kangur settings key before using defaults', async () => {
    vi.resetModules();
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
    const { db, collection } = buildDb([], 0);
    const toArray = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(legacyLessons);
    const sort = vi.fn().mockReturnValue({ toArray });
    collection.find = vi.fn().mockReturnValue({ sort });
    vi.doMock('@/shared/lib/db/mongo-client', () => ({
      getMongoDb: vi.fn().mockResolvedValue(db),
    }));
    vi.doMock('@/features/kangur/services/kangur-settings-repository', () => ({
      readKangurSettingValue: vi.fn().mockResolvedValue(JSON.stringify(legacyLessons)),
    }));

    const { mongoKangurLessonRepository } = await import(
      './mongo-kangur-lesson-repository'
    );

    const result = await mongoKangurLessonRepository.listLessons({
      subject: 'english',
      enabledOnly: true,
    });

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(result).toEqual(legacyLessons);
  });
});
