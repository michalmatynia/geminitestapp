/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

describe('mongoKangurLessonSectionRepository bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('seeds default lesson sections into Mongo when the collection is empty', async () => {
    const expected = createDefaultKangurSections().filter(
      (section) => section.subject === 'english' && section.enabled
    );
    const toArrayMock = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(expected);
    const collection = {
      bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
      countDocuments: vi.fn().mockResolvedValue(0),
      createIndex: vi.fn().mockResolvedValue('ok'),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: toArrayMock,
        }),
      }),
    };
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    });

    const { mongoKangurLessonSectionRepository } = await import(
      './mongo-kangur-lesson-section-repository'
    );

    const result = await mongoKangurLessonSectionRepository.listSections({
      subject: 'english',
      enabledOnly: true,
    });

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });
});
