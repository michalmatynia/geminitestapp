import 'server-only';

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

  const [lessons, lessonDocuments, lessonSections, games] = await Promise.all([
    lessonRepository.listLessons(),
    lessonDocumentRepository.listLessonDocuments('pl'),
    lessonSectionRepository.listSections(),
    listKangurGames(),
  ]);

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
