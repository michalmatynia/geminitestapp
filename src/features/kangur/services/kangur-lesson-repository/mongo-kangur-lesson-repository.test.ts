/**
 * @vitest-environment node
 */

import { describe, expect, it, vi } from 'vitest';

type MockCollection = {
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
    const { db } = buildDb([], 0);
    vi.doMock('@/shared/lib/db/mongo-client', () => ({
      getMongoDb: vi.fn().mockResolvedValue(db),
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
});
