/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  createStarterKangurLessonDocumentMock,
  getKangurAiTutorContentMock,
  getKangurAiTutorNativeGuideStoreMock,
  getKangurGameContentSetRepositoryMock,
  getKangurGameInstanceRepositoryMock,
  getKangurLessonDocumentRepositoryMock,
  getKangurLessonRepositoryMock,
  getKangurLessonSectionRepositoryMock,
  getKangurLessonTemplateRepositoryMock,
  getKangurPageContentStoreMock,
  importLegacyKangurLessonDocumentMock,
  listKangurGamesMock,
} = vi.hoisted(() => ({
  createStarterKangurLessonDocumentMock: vi.fn(),
  getKangurAiTutorContentMock: vi.fn(),
  getKangurAiTutorNativeGuideStoreMock: vi.fn(),
  getKangurGameContentSetRepositoryMock: vi.fn(),
  getKangurGameInstanceRepositoryMock: vi.fn(),
  getKangurLessonDocumentRepositoryMock: vi.fn(),
  getKangurLessonRepositoryMock: vi.fn(),
  getKangurLessonSectionRepositoryMock: vi.fn(),
  getKangurLessonTemplateRepositoryMock: vi.fn(),
  getKangurPageContentStoreMock: vi.fn(),
  importLegacyKangurLessonDocumentMock: vi.fn(),
  listKangurGamesMock: vi.fn(),
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  createStarterKangurLessonDocument: createStarterKangurLessonDocumentMock,
}));

vi.mock('@/features/kangur/legacy-lesson-imports', () => ({
  importLegacyKangurLessonDocument: importLegacyKangurLessonDocumentMock,
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

  it('persists authored starter lesson documents for missing lessons during bootstrap', async () => {
    const starterDocument = { version: 1, blocks: [], pages: [], narration: {}, updatedAt: 'now' };
    const importedDocument = {
      version: 1,
      blocks: [{ id: 'legacy' }],
      pages: [],
      narration: {},
      updatedAt: 'legacy',
    };

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
    createStarterKangurLessonDocumentMock.mockReturnValue(starterDocument);
    importLegacyKangurLessonDocumentMock.mockImplementation((componentId: string) =>
      componentId === 'english_adverbs'
        ? { document: importedDocument, importedPageCount: 1, warnings: [] }
        : null
    );

    const { bootstrapKangurContentToMongo } = await import('./kangur-content-bootstrap');
    const { buildLocalKangurLessonContentSnapshot } = await import('./kangur-lesson-content-snapshot');

    const summary = await bootstrapKangurContentToMongo(['pl']);
    const snapshot = await buildLocalKangurLessonContentSnapshot(['pl']);

    const [storedDocuments, storedLocale] =
      lessonDocumentRepository.replaceLessonDocuments.mock.calls[0] ?? [];

    expect(storedLocale).toBe('pl');
    expect(storedDocuments['kangur-lesson-english_adverbs']).toEqual(
      expect.objectContaining({
        updatedAt: importedDocument.updatedAt,
        version: importedDocument.version,
      })
    );
    expect(storedDocuments['kangur-lesson-english_adverbs']?.blocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'legacy' })])
    );
    expect(storedDocuments['kangur-lesson-english_comparatives_superlatives']).toEqual(
      expect.objectContaining({
        updatedAt: starterDocument.updatedAt,
        version: starterDocument.version,
      })
    );
    expect(storedDocuments['kangur-lesson-english_comparatives_superlatives']?.pages).toHaveLength(1);
    expect(lessonRepository.replaceLessons).toHaveBeenCalledWith(snapshot.lessons);
    expect(summary.lessonDocuments).toBe(Object.keys(snapshot.lessonDocumentsByLocale['pl'] ?? {}).length);
    expect(summary.lessons).toBe(snapshot.lessons.length);
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
    createStarterKangurLessonDocumentMock.mockReturnValue({
      version: 1,
      blocks: [],
      pages: [],
      narration: {},
      updatedAt: 'now',
    });
    importLegacyKangurLessonDocumentMock.mockReturnValue(null);

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
  });
});
