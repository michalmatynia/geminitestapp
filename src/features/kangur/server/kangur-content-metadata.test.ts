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

describe('kangur-content-metadata', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('writes the localhost lesson content revision metadata to Mongo', async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        updateOne,
      })),
    });

    const { writeKangurLessonContentMetadata } = await import('./kangur-content-metadata');

    const result = await writeKangurLessonContentMetadata({
      lessonContentRevision: 'abc123revision',
      locales: ['pl', 'en'],
      source: 'localhost',
    });

    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'lesson-content' },
      {
        $set: expect.objectContaining({
          _id: 'lesson-content',
          lessonContentRevision: 'abc123revision',
          locales: ['pl', 'en'],
          source: 'localhost',
          syncedAt: expect.any(String),
        }),
      },
      { upsert: true }
    );
    expect(result).toEqual(
      expect.objectContaining({
        lessonContentRevision: 'abc123revision',
        locales: ['pl', 'en'],
        source: 'localhost',
        syncedAt: expect.any(String),
      })
    );
  });

  it('reads valid localhost lesson content metadata from Mongo', async () => {
    const findOne = vi.fn().mockResolvedValue({
      _id: 'lesson-content',
      lessonContentRevision: 'stored-revision',
      locales: ['pl', 'en'],
      source: 'localhost',
      syncedAt: '2026-03-30T12:00:00.000Z',
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        findOne,
      })),
    });

    const { readKangurLessonContentMetadata } = await import('./kangur-content-metadata');

    await expect(readKangurLessonContentMetadata()).resolves.toEqual({
      lessonContentRevision: 'stored-revision',
      locales: ['pl', 'en'],
      source: 'localhost',
      syncedAt: '2026-03-30T12:00:00.000Z',
    });
  });

  it('returns null for incomplete metadata records', async () => {
    const findOne = vi.fn().mockResolvedValue({
      _id: 'lesson-content',
      locales: ['pl'],
      source: 'localhost',
    });

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        findOne,
      })),
    });

    const { readKangurLessonContentMetadata } = await import('./kangur-content-metadata');

    await expect(readKangurLessonContentMetadata()).resolves.toBeNull();
  });
});
