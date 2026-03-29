import 'server-only';

import type { KangurLesson, KangurLessonDocumentStore } from '@kangur/contracts';
import { createStarterKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { getKangurAiTutorContent } from '@/features/kangur/server/ai-tutor-content-repository';
import { getKangurPageContentStore } from '@/features/kangur/server/page-content-repository';
import { getKangurGameContentSetRepository } from '@/features/kangur/services/kangur-game-content-set-repository';
import { getKangurGameInstanceRepository } from '@/features/kangur/services/kangur-game-instance-repository';
import { getKangurLessonDocumentRepository } from '@/features/kangur/services/kangur-lesson-document-repository';
import { getKangurLessonRepository } from '@/features/kangur/services/kangur-lesson-repository';
import { getKangurLessonSectionRepository } from '@/features/kangur/services/kangur-lesson-section-repository';
import { getKangurLessonTemplateRepository } from '@/features/kangur/services/kangur-lesson-template-repository';
import { listKangurGames } from '@/features/kangur/services/kangur-game-repository/mongo-kangur-game-repository';

const DEFAULT_KANGUR_CONTENT_LOCALES = ['pl', 'en', 'de', 'uk'] as const;

export type KangurContentBootstrapLocale = (typeof DEFAULT_KANGUR_CONTENT_LOCALES)[number];

export type KangurContentBootstrapSummary = {
  aiTutorLocales: string[];
  gameContentSetsByGame: Record<string, number>;
  gameInstancesByGame: Record<string, number>;
  games: number;
  lessonDocuments: number;
  lessonSections: number;
  lessons: number;
  locales: string[];
  pageContentEntriesByLocale: Record<string, number>;
  lessonTemplatesByLocale: Record<string, number>;
};

export const KANGUR_CONTENT_BOOTSTRAP_LOCALES: readonly KangurContentBootstrapLocale[] =
  DEFAULT_KANGUR_CONTENT_LOCALES;

type LegacyLessonImportFn = typeof import('@/features/kangur/legacy-lesson-imports').importLegacyKangurLessonDocument;

const loadLegacyLessonImportFn = async (): Promise<LegacyLessonImportFn | null> => {
  try {
    const module = await import('@/features/kangur/legacy-lesson-imports');
    return module.importLegacyKangurLessonDocument;
  } catch {
    return null;
  }
};

const sortLessons = (lessons: readonly KangurLesson[]): KangurLesson[] =>
  [...lessons].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.id.localeCompare(right.id)
  );

const buildBootstrapLessons = (existingLessons: readonly KangurLesson[]): KangurLesson[] => {
  const merged = new Map<string, KangurLesson>();

  for (const lesson of createDefaultKangurLessons()) {
    merged.set(lesson.id, lesson);
  }

  for (const lesson of existingLessons) {
    merged.set(lesson.id, lesson);
  }

  return sortLessons([...merged.values()]);
};

const buildBootstrapLessonDocumentStore = async (
  lessons: readonly KangurLesson[],
  existingStore: KangurLessonDocumentStore
): Promise<KangurLessonDocumentStore> => {
  const nextStore: KangurLessonDocumentStore = { ...existingStore };
  const importLegacyLessonDocument = await loadLegacyLessonImportFn();

  for (const lesson of lessons) {
    if (nextStore[lesson.id]) {
      continue;
    }

    const importedDocument = importLegacyLessonDocument?.(lesson.componentId)?.document;
    nextStore[lesson.id] =
      importedDocument ?? createStarterKangurLessonDocument(lesson.componentId);
  }

  return nextStore;
};

export async function bootstrapKangurContentToMongo(
  locales: readonly string[] = KANGUR_CONTENT_BOOTSTRAP_LOCALES
): Promise<KangurContentBootstrapSummary> {
  const resolvedLocales = locales.length > 0 ? [...new Set(locales)] : [...KANGUR_CONTENT_BOOTSTRAP_LOCALES];

  const [
    lessonRepository,
    lessonDocumentRepository,
    lessonSectionRepository,
    lessonTemplateRepository,
    gameContentSetRepository,
    gameInstanceRepository,
  ] = await Promise.all([
    getKangurLessonRepository(),
    getKangurLessonDocumentRepository(),
    getKangurLessonSectionRepository(),
    getKangurLessonTemplateRepository(),
    getKangurGameContentSetRepository(),
    getKangurGameInstanceRepository(),
  ]);

  const [initialLessons, initialLessonDocuments, lessonSections, games] = await Promise.all([
    lessonRepository.listLessons(),
    lessonDocumentRepository.listLessonDocuments('pl'),
    lessonSectionRepository.listSections(),
    listKangurGames(),
  ]);

  const hydratedLessons = buildBootstrapLessons(initialLessons);
  const lessons =
    hydratedLessons.length === initialLessons.length
      ? initialLessons
      : await lessonRepository.replaceLessons(hydratedLessons);

  const hydratedLessonDocuments = await buildBootstrapLessonDocumentStore(
    lessons,
    initialLessonDocuments
  );
  const lessonDocuments =
    Object.keys(hydratedLessonDocuments).length === Object.keys(initialLessonDocuments).length
      ? initialLessonDocuments
      : await lessonDocumentRepository.replaceLessonDocuments(hydratedLessonDocuments, 'pl');

  const [pageContentEntriesByLocale, lessonTemplatesByLocale, aiTutorLocales] = await Promise.all([
    Promise.all(
      resolvedLocales.map(async (locale) => {
        const store = await getKangurPageContentStore(locale);
        return [locale, store.entries.length] as const;
      })
    ).then((entries) => Object.fromEntries(entries)),
    Promise.all(
      resolvedLocales.map(async (locale) => {
        const templates = await lessonTemplateRepository.listTemplates({ locale });
        return [locale, templates.length] as const;
      })
    ).then((entries) => Object.fromEntries(entries)),
    Promise.all(
      resolvedLocales.map(async (locale) => {
        const content = await getKangurAiTutorContent(locale);
        return content.locale;
      })
    ),
  ]);

  const gameContentSetsByGame = Object.fromEntries(
    await Promise.all(
      games.map(async (game) => {
        const contentSets = await gameContentSetRepository.listContentSets({ gameId: game.id });
        return [game.id, contentSets.length] as const;
      })
    )
  );

  const gameInstancesByGame = Object.fromEntries(
    await Promise.all(
      games.map(async (game) => {
        const instances = await gameInstanceRepository.listInstances({ gameId: game.id });
        return [game.id, instances.length] as const;
      })
    )
  );

  return {
    aiTutorLocales,
    gameContentSetsByGame,
    gameInstancesByGame,
    games: games.length,
    lessonDocuments: Object.keys(lessonDocuments).length,
    lessonSections: lessonSections.length,
    lessons: lessons.length,
    locales: resolvedLocales,
    pageContentEntriesByLocale,
    lessonTemplatesByLocale,
  };
}
