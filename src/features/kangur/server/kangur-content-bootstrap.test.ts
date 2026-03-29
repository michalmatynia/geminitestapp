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
    const lessons = [
      {
        id: 'kangur-lesson-english_adverbs',
        componentId: 'english_adverbs',
        contentMode: 'component',
        subject: 'english',
        ageGroup: 'ten_year_old',
        title: 'Adverbs',
        description: 'desc',
        emoji: '📝',
        color: 'from-sky-500 to-cyan-500',
        activeBg: 'from-sky-500/20 via-cyan-500/15 to-white',
        sortOrder: 1,
        enabled: true,
      },
      {
        id: 'kangur-lesson-english_comparatives_superlatives',
        componentId: 'english_comparatives_superlatives',
        contentMode: 'component',
        subject: 'english',
        ageGroup: 'ten_year_old',
        title: 'Comparatives',
        description: 'desc',
        emoji: '🏆',
        color: 'from-rose-500 to-orange-500',
        activeBg: 'from-rose-500/20 via-orange-500/15 to-white',
        sortOrder: 2,
        enabled: true,
      },
    ] as const;

    const starterDocument = { version: 1, blocks: [], pages: [], narration: {}, updatedAt: 'now' };
    const importedDocument = {
      version: 1,
      blocks: [{ id: 'legacy' }],
      pages: [],
      narration: {},
      updatedAt: 'legacy',
    };

    const lessonDocumentRepository = {
      listLessonDocuments: vi.fn().mockResolvedValue({}),
      replaceLessonDocuments: vi.fn().mockImplementation(async (store) => store),
    };
    const lessonRepository = {
      listLessons: vi.fn().mockResolvedValue(lessons),
      replaceLessons: vi.fn().mockImplementation(async (nextLessons) => nextLessons),
    };
    const lessonSectionRepository = {
      listSections: vi.fn().mockResolvedValue([{ id: 'english' }]),
    };
    const lessonTemplateRepository = {
      listTemplates: vi.fn().mockResolvedValue([{ componentId: 'english_adverbs' }]),
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

    expect(lessonDocumentRepository.replaceLessonDocuments).toHaveBeenCalledWith(
      expect.objectContaining({
        'kangur-lesson-english_adverbs': importedDocument,
        'kangur-lesson-english_comparatives_superlatives': starterDocument,
      }),
      'pl'
    );
    expect(summary.lessonDocuments).toBe(createDefaultKangurLessons().length);
  });

  it('fills missing default lessons into Mongo before seeding lesson documents', async () => {
    const existingSubset = [
      {
        id: 'kangur-lesson-english_adverbs',
        componentId: 'english_adverbs',
        contentMode: 'component',
        subject: 'english',
        ageGroup: 'ten_year_old',
        title: 'Adverbs',
        description: 'desc',
        emoji: '📝',
        color: 'from-sky-500 to-cyan-500',
        activeBg: 'from-sky-500/20 via-cyan-500/15 to-white',
        sortOrder: 1,
        enabled: true,
      },
    ] as const;

    const lessonDocumentRepository = {
      listLessonDocuments: vi.fn().mockResolvedValue({}),
      replaceLessonDocuments: vi.fn().mockImplementation(async (store) => store),
    };
    const lessonRepository = {
      listLessons: vi.fn().mockResolvedValue(existingSubset),
      replaceLessons: vi.fn().mockImplementation(async (nextLessons) => nextLessons),
    };
    const lessonSectionRepository = {
      listSections: vi.fn().mockResolvedValue([{ id: 'english' }]),
    };
    const lessonTemplateRepository = {
      listTemplates: vi.fn().mockResolvedValue([{ componentId: 'english_adverbs' }]),
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

    const summary = await bootstrapKangurContentToMongo(['pl']);
    const persistedLessons = lessonRepository.replaceLessons.mock.calls[0]?.[0];

    expect(lessonRepository.replaceLessons).toHaveBeenCalledTimes(1);
    expect(Array.isArray(persistedLessons)).toBe(true);
    expect(persistedLessons).toHaveLength(createDefaultKangurLessons().length);
    expect(
      persistedLessons.find((lesson: { id: string }) => lesson.id === 'kangur-lesson-english_adverbs')
    ).toMatchObject({
      description: 'desc',
      sortOrder: 1,
      title: 'Adverbs',
    });
    expect(summary.lessons).toBe(createDefaultKangurLessons().length);
    expect(lessonDocumentRepository.replaceLessonDocuments).toHaveBeenCalledTimes(1);
  });
});
