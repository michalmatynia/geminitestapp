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
    const { createDefaultKangurLessons } = await import('@/features/kangur/settings');

    const summary = await bootstrapKangurContentToMongo(['pl']);
    const defaultLessons = createDefaultKangurLessons();

    expect(lessonDocumentRepository.replaceLessonDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        'kangur-lesson-english_adverbs': importedDocument,
        'kangur-lesson-english_comparatives_superlatives': starterDocument,
      }),
      'pl'
    );
    expect(lessonRepository.replaceLessons).toHaveBeenCalledWith(defaultLessons);
    expect(summary.lessonDocuments).toBe(defaultLessons.length);
    expect(summary.lessons).toBe(defaultLessons.length);
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
    const { createDefaultKangurLessons } = await import('@/features/kangur/settings');
    const { createDefaultKangurSections } = await import('@/features/kangur/lessons/lesson-section-defaults');
    const { createDefaultKangurLessonTemplates } = await import('@/features/kangur/lessons/lesson-template-defaults');

    const summary = await bootstrapKangurContentToMongo(['pl']);
    const defaultLessons = createDefaultKangurLessons();
    const defaultSections = createDefaultKangurSections();
    const defaultTemplates = createDefaultKangurLessonTemplates('pl');

    expect(lessonRepository.replaceLessons).toHaveBeenCalledWith(defaultLessons);
    expect(lessonSectionRepository.replaceSections).toHaveBeenCalledWith(defaultSections);
    expect(lessonTemplateRepository.replaceTemplates).toHaveBeenCalledWith(defaultTemplates, 'pl');
    expect(summary.lessons).toBe(createDefaultKangurLessons().length);
    expect(summary.lessonSections).toBe(defaultSections.length);
    expect(summary.lessonTemplatesByLocale['pl']).toBe(defaultTemplates.length);
    expect(summary.lessonContentRevision).toHaveLength(16);
  });
});
