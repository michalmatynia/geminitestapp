/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getMongoDbMock,
  getKangurAiTutorContentMock,
  getKangurAiTutorNativeGuideStoreMock,
  getKangurGameContentSetRepositoryMock,
  getKangurGameInstanceRepositoryMock,
  getKangurLessonDocumentRepositoryMock,
  getKangurLessonRepositoryMock,
  getKangurLessonSectionRepositoryMock,
  getKangurLessonTemplateRepositoryMock,
  getKangurPageContentStoreMock,
  listKangurGamesMock,
} = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  getKangurAiTutorContentMock: vi.fn(),
  getKangurAiTutorNativeGuideStoreMock: vi.fn(),
  getKangurGameContentSetRepositoryMock: vi.fn(),
  getKangurGameInstanceRepositoryMock: vi.fn(),
  getKangurLessonDocumentRepositoryMock: vi.fn(),
  getKangurLessonRepositoryMock: vi.fn(),
  getKangurLessonSectionRepositoryMock: vi.fn(),
  getKangurLessonTemplateRepositoryMock: vi.fn(),
  getKangurPageContentStoreMock: vi.fn(),
  listKangurGamesMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-content-repository', () => ({
  getKangurAiTutorContent: getKangurAiTutorContentMock,
}));

vi.mock('@/features/kangur/server/ai-tutor-native-guide-repository', () => ({
  getKangurAiTutorNativeGuideStore: getKangurAiTutorNativeGuideStoreMock,
}));

vi.mock('@/features/kangur/server/page-content-repository', () => ({
  getKangurPageContentStore: getKangurPageContentStoreMock,
}));

vi.mock('@/features/kangur/services/kangur-game-content-set-repository', () => ({
  getKangurGameContentSetRepository: getKangurGameContentSetRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-game-instance-repository', () => ({
  getKangurGameInstanceRepository: getKangurGameInstanceRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-lesson-document-repository', () => ({
  getKangurLessonDocumentRepository: getKangurLessonDocumentRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-lesson-repository', () => ({
  getKangurLessonRepository: getKangurLessonRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-lesson-section-repository', () => ({
  getKangurLessonSectionRepository: getKangurLessonSectionRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-lesson-template-repository', () => ({
  getKangurLessonTemplateRepository: getKangurLessonTemplateRepositoryMock,
}));

vi.mock('@/features/kangur/services/kangur-game-repository/mongo-kangur-game-repository', () => ({
  listKangurGames: listKangurGamesMock,
}));

describe('bootstrapKangurContentToMongo', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('replaces Mongo lesson documents with the exact local snapshot', async () => {
    const lessonDocumentRepository = {
      replaceLessonDocuments: vi.fn().mockImplementation(async (store) => store),
    };
    const lessonRepository = {
      replaceLessons: vi.fn().mockImplementation(async (nextLessons) => nextLessons),
    };
    const lessonSectionRepository = {
      replaceSections: vi.fn().mockImplementation(async (sections) => sections),
    };
    const lessonTemplateRepository = {
      replaceTemplates: vi.fn().mockImplementation(async (templates) => templates),
    };
    const gameContentSetRepository = {
      listContentSets: vi.fn().mockResolvedValue([]),
    };
    const gameInstanceRepository = {
      listInstances: vi.fn().mockResolvedValue([]),
    };
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1 });

    getKangurLessonRepositoryMock.mockResolvedValue(lessonRepository);
    getKangurLessonDocumentRepositoryMock.mockResolvedValue(lessonDocumentRepository);
    getKangurLessonSectionRepositoryMock.mockResolvedValue(lessonSectionRepository);
    getKangurLessonTemplateRepositoryMock.mockResolvedValue(lessonTemplateRepository);
    getKangurGameContentSetRepositoryMock.mockResolvedValue(gameContentSetRepository);
    getKangurGameInstanceRepositoryMock.mockResolvedValue(gameInstanceRepository);
    getKangurPageContentStoreMock.mockResolvedValue({ entries: [] });
    getKangurAiTutorContentMock.mockImplementation(async (locale: string) => ({ locale }));
    getKangurAiTutorNativeGuideStoreMock.mockImplementation(async (locale: string) => ({ locale }));
    listKangurGamesMock.mockResolvedValue([]);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        updateOne,
      })),
    });

    const { bootstrapKangurContentToMongo } = await import('./kangur-content-bootstrap');
    const { buildLocalKangurLessonContentSnapshot } = await import('./kangur-lesson-content-snapshot');

    const summary = await bootstrapKangurContentToMongo(['pl']);
    const snapshot = await buildLocalKangurLessonContentSnapshot(['pl']);

    const [storedDocuments, storedLocale] =
      lessonDocumentRepository.replaceLessonDocuments.mock.calls[0] ?? [];

    expect(storedLocale).toBe('pl');
    expect(storedDocuments).toEqual(snapshot.lessonDocumentsByLocale['pl']);
    expect(lessonRepository.replaceLessons).toHaveBeenCalledWith(snapshot.lessons);
    expect(updateOne).toHaveBeenCalledWith(
      { _id: 'lesson-content' },
      expect.objectContaining({
        $set: expect.objectContaining({
          _id: 'lesson-content',
          lessonContentRevision: snapshot.lessonContentRevision,
          locales: ['pl'],
          source: 'localhost',
        }),
      }),
      { upsert: true }
    );
    expect(summary.lessonDocuments).toBe(0);
    expect(summary.lessons).toBe(snapshot.lessons.length);
    expect(summary.lessonContentRevisionSyncedAt).toEqual(expect.any(String));
  });

  it('replaces lessons, sections, and templates from the local snapshot', async () => {
    const lessonDocumentRepository = {
      replaceLessonDocuments: vi.fn().mockImplementation(async (store) => store),
    };
    const lessonRepository = {
      replaceLessons: vi.fn().mockImplementation(async (nextLessons) => nextLessons),
    };
    const lessonSectionRepository = {
      replaceSections: vi.fn().mockImplementation(async (sections) => sections),
    };
    const lessonTemplateRepository = {
      replaceTemplates: vi.fn().mockImplementation(async (templates) => templates),
    };
    const gameContentSetRepository = {
      listContentSets: vi.fn().mockResolvedValue([]),
    };
    const gameInstanceRepository = {
      listInstances: vi.fn().mockResolvedValue([]),
    };
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true, matchedCount: 1, modifiedCount: 1 });

    getKangurLessonRepositoryMock.mockResolvedValue(lessonRepository);
    getKangurLessonDocumentRepositoryMock.mockResolvedValue(lessonDocumentRepository);
    getKangurLessonSectionRepositoryMock.mockResolvedValue(lessonSectionRepository);
    getKangurLessonTemplateRepositoryMock.mockResolvedValue(lessonTemplateRepository);
    getKangurGameContentSetRepositoryMock.mockResolvedValue(gameContentSetRepository);
    getKangurGameInstanceRepositoryMock.mockResolvedValue(gameInstanceRepository);
    getKangurPageContentStoreMock.mockResolvedValue({ entries: [] });
    getKangurAiTutorContentMock.mockImplementation(async (locale: string) => ({ locale }));
    getKangurAiTutorNativeGuideStoreMock.mockImplementation(async (locale: string) => ({ locale }));
    listKangurGamesMock.mockResolvedValue([]);
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn(() => ({
        updateOne,
      })),
    });

    const { bootstrapKangurContentToMongo } = await import('./kangur-content-bootstrap');
    const { buildLocalKangurLessonContentSnapshot } = await import('./kangur-lesson-content-snapshot');

    const summary = await bootstrapKangurContentToMongo(['pl']);
    const snapshot = await buildLocalKangurLessonContentSnapshot(['pl']);

    expect(lessonRepository.replaceLessons).toHaveBeenCalledWith(snapshot.lessons);
    expect(lessonSectionRepository.replaceSections).toHaveBeenCalledWith(snapshot.sections);
    const [storedDocuments, storedLocale] =
      lessonDocumentRepository.replaceLessonDocuments.mock.calls[0] ?? [];

    expect(storedLocale).toBe('pl');
    expect(Object.keys(storedDocuments ?? {})).toHaveLength(
      Object.keys(snapshot.lessonDocumentsByLocale['pl'] ?? {}).length
    );
    expect(lessonTemplateRepository.replaceTemplates).toHaveBeenCalledWith(
      snapshot.lessonTemplatesByLocale['pl'],
      'pl'
    );
    expect(summary.lessons).toBe(snapshot.lessons.length);
    expect(summary.lessonSections).toBe(snapshot.sections.length);
    expect(summary.lessonTemplatesByLocale['pl']).toBe(
      snapshot.lessonTemplatesByLocale['pl']?.length ?? 0
    );
    expect(summary.lessonContentRevision).toHaveLength(16);
    expect(updateOne).toHaveBeenCalledTimes(1);
  });
});
