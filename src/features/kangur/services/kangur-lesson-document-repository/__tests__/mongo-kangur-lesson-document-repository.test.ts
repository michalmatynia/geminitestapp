/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { createDefaultKangurLessons } from '@/features/kangur/settings';

const { getMongoDbMock, readKangurSettingValueMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  readKangurSettingValueMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/features/kangur/services/kangur-settings-repository', () => ({
  readKangurSettingValue: readKangurSettingValueMock,
}));

describe('mongoKangurLessonDocumentRepository legacy backfill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates missing Polish lesson documents from the legacy Kangur settings key', async () => {
    const legacyDocument = createDefaultKangurLessonDocument();
    const findOneMock = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        _id: 'kangur-lesson-english_adverbs',
        lessonId: 'kangur-lesson-english_adverbs',
        locale: 'pl',
        document: legacyDocument,
      });
    const collection = {
      bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
      createIndex: vi.fn().mockResolvedValue('kangur_lesson_documents_updated_idx'),
      find: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      findOne: findOneMock,
    };
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    });
    readKangurSettingValueMock.mockResolvedValue(
      JSON.stringify({
        'kangur-lesson-english_adverbs': legacyDocument,
      })
    );

    const { mongoKangurLessonDocumentRepository } = await import(
      '../mongo-kangur-lesson-document-repository'
    );

    const document = await mongoKangurLessonDocumentRepository.getLessonDocument(
      'kangur-lesson-english_adverbs',
      'pl'
    );

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(document).toEqual(legacyDocument);
  });

  it('fills starter lesson documents for default lessons missing from the legacy store', async () => {
    const legacyDocument = createDefaultKangurLessonDocument();
    const defaultLessons = createDefaultKangurLessons();
    const findToArrayMock = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(
        defaultLessons.map((lesson, index) => ({
          _id: lesson.id,
          lessonId: lesson.id,
          locale: 'pl',
          document:
            index === 0
              ? legacyDocument
              : createDefaultKangurLessonDocument(),
        }))
      );
    const collection = {
      bulkWrite: vi.fn().mockResolvedValue({ acknowledged: true }),
      createIndex: vi.fn().mockResolvedValue('kangur_lesson_documents_updated_idx'),
      find: vi.fn().mockReturnValue({
        toArray: findToArrayMock,
      }),
      findOne: vi.fn(),
    };
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue(collection),
    });
    readKangurSettingValueMock.mockResolvedValue(
      JSON.stringify({
        [defaultLessons[0]?.id ?? 'kangur-lesson-english_adverbs']: legacyDocument,
      })
    );

    const { mongoKangurLessonDocumentRepository } = await import(
      '../mongo-kangur-lesson-document-repository'
    );

    const store = await mongoKangurLessonDocumentRepository.listLessonDocuments('pl');

    expect(collection.bulkWrite).toHaveBeenCalledTimes(1);
    expect(Object.keys(store)).toHaveLength(defaultLessons.length);
    expect(store[defaultLessons[0]?.id ?? '']).toEqual(legacyDocument);
  });
});
