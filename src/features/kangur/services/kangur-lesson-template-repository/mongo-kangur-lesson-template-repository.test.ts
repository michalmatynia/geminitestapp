/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurLessonTemplates } from '@/features/kangur/lessons/lesson-template-defaults';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

describe('mongoKangurLessonTemplateRepository bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('seeds localized lesson templates into Mongo when a locale collection is empty', async () => {
    const expected = createDefaultKangurLessonTemplates('en').filter(
      (template) => template.subject === 'english'
    );
    const toArrayMock = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(expected);
    const collection = {
      bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
      countDocuments: vi.fn().mockResolvedValue(0),
      createIndex: vi.fn().mockResolvedValue('ok'),
      dropIndex: vi.fn().mockResolvedValue('ok'),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: toArrayMock,
        }),
      }),
      indexes: vi.fn().mockResolvedValue([]),
    };
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    });

    const { mongoKangurLessonTemplateRepository } = await import(
      './mongo-kangur-lesson-template-repository'
    );

    const result = await mongoKangurLessonTemplateRepository.listTemplates({
      locale: 'en',
      subject: 'english',
    });

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expected);
  });

  it('drops legacy lesson-template indexes before creating the localized replacements', async () => {
    const collection = {
      bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
      countDocuments: vi.fn().mockResolvedValue(1),
      createIndex: vi.fn().mockResolvedValue('ok'),
      dropIndex: vi.fn().mockResolvedValue('ok'),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      indexes: vi.fn().mockResolvedValue([
        {
          name: 'kangur_lesson_templates_subject_sort_idx',
          key: { subject: 1, sortOrder: 1 },
        },
        {
          name: 'kangur_lesson_templates_componentId_unique_idx',
          key: { componentId: 1 },
          unique: true,
        },
      ]),
    };
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    });

    const { mongoKangurLessonTemplateRepository } = await import(
      './mongo-kangur-lesson-template-repository'
    );

    await mongoKangurLessonTemplateRepository.listTemplates({ locale: 'en' });

    expect(collection.dropIndex).toHaveBeenCalledWith(
      'kangur_lesson_templates_subject_sort_idx'
    );
    expect(collection.dropIndex).toHaveBeenCalledWith(
      'kangur_lesson_templates_componentId_unique_idx'
    );
    expect(collection.createIndex).toHaveBeenCalledWith(
      { locale: 1, subject: 1, sortOrder: 1 },
      { name: 'kangur_lesson_templates_subject_sort_idx' }
    );
  });
});
