import 'server-only';

import { buildDefaultKangurPageContentStore } from '@/features/kangur/page-content-catalog';
import { createDefaultKangurLessons } from '@/features/kangur/settings';
import { createDefaultKangurSections } from '@/features/kangur/lessons/lesson-section-defaults';
import { createDefaultKangurLessonTemplates } from '@/features/kangur/lessons/lesson-template-defaults';
import {
  createDefaultKangurGames,
  getKangurGameBuiltInInstancesForGame,
  getKangurGameContentSetsForGame,
  getKangurGameDefinition,
} from '@/features/kangur/games';
import type { KangurGameId } from '@/shared/contracts/kangur-games';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { KANGUR_CONTENT_BOOTSTRAP_LOCALES } from './kangur-content-bootstrap';

const COLLECTIONS = {
  aiTutor: 'kangur_ai_tutor_content',
  aiTutorNativeGuides: 'kangur_ai_tutor_native_guides',
  gameContentSets: 'kangur_game_content_sets',
  gameInstances: 'kangur_game_instances',
  games: 'kangur_games',
  lessonDocuments: 'kangur_lesson_documents',
  lessonSections: 'kangur_lesson_sections',
  lessonTemplates: 'kangur_lesson_templates',
  lessons: 'kangur_lessons',
  pageContent: 'kangur_page_content',
} as const;

type CountCheck = {
  actual: number;
  extra: number;
  expectedMinimum: number;
  meetsMinimum: boolean;
  missing: number;
};

type LocaleCheck = CountCheck & {
  locale: string;
};

const buildCountCheck = (expectedMinimum: number, actual: number): CountCheck => ({
  actual,
  extra: Math.max(actual - expectedMinimum, 0),
  expectedMinimum,
  meetsMinimum: actual >= expectedMinimum,
  missing: Math.max(expectedMinimum - actual, 0),
});

const buildLocaleFilter = (locale: string) =>
  locale === 'pl'
    ? {
        $or: [{ locale }, { locale: { $exists: false } }],
      }
    : { locale };

export type KangurContentVerificationResult = {
  aiTutorLocales: {
    actual: string[];
    expectedMinimum: string[];
    extra: string[];
    matches: boolean;
    missing: string[];
  };
  nativeGuideLocales: {
    actual: string[];
    expectedMinimum: string[];
    extra: string[];
    matches: boolean;
    missing: string[];
  };
  gameContentSetsByGame: Record<string, CountCheck>;
  gameInstancesByGame: Record<string, CountCheck>;
  games: CountCheck;
  lessonDocuments: CountCheck;
  lessonSections: CountCheck;
  lessonTemplatesByLocale: Record<string, LocaleCheck>;
  lessons: CountCheck;
  locales: string[];
  mismatchCount: number;
  mismatches: string[];
  ok: boolean;
  pageContentEntriesByLocale: Record<string, LocaleCheck>;
};

export async function verifyKangurContentInMongo(
  locales: readonly string[] = KANGUR_CONTENT_BOOTSTRAP_LOCALES
): Promise<KangurContentVerificationResult> {
  const resolvedLocales = locales.length > 0 ? [...new Set(locales)] : [...KANGUR_CONTENT_BOOTSTRAP_LOCALES];
  const db = await getMongoDb();

  const expectedLessons = createDefaultKangurLessons();
  const expectedSections = createDefaultKangurSections();
  const expectedGames = createDefaultKangurGames();

  const [
    actualLessons,
    actualLessonDocuments,
    actualLessonSections,
    actualGames,
    actualAiTutorLocales,
    actualNativeGuideLocales,
    pageContentEntriesByLocale,
    lessonTemplatesByLocale,
    gameContentSetsByGame,
    gameInstancesByGame,
  ] = await Promise.all([
    db.collection(COLLECTIONS.lessons).countDocuments(),
    db.collection(COLLECTIONS.lessonDocuments).countDocuments(buildLocaleFilter('pl')),
    db.collection(COLLECTIONS.lessonSections).countDocuments(),
    db.collection(COLLECTIONS.games).countDocuments(),
    db.collection(COLLECTIONS.aiTutor).distinct('locale').then((values) =>
      values.filter((value): value is string => typeof value === 'string').sort()
    ),
    db.collection(COLLECTIONS.aiTutorNativeGuides).distinct('locale').then((values) =>
      values.filter((value): value is string => typeof value === 'string').sort()
    ),
    Promise.all(
      resolvedLocales.map(async (locale) => {
        const expected = buildDefaultKangurPageContentStore(locale).entries.length;
        const actual = await db.collection(COLLECTIONS.pageContent).countDocuments({ locale });
        return [
          locale,
          {
            locale,
            ...buildCountCheck(expected, actual),
          },
        ] as const;
      })
    ).then((entries) => Object.fromEntries(entries)),
    Promise.all(
      resolvedLocales.map(async (locale) => {
        const expected = createDefaultKangurLessonTemplates(locale).length;
        const actual = await db
          .collection(COLLECTIONS.lessonTemplates)
          .countDocuments(buildLocaleFilter(locale));
        return [
          locale,
          {
            locale,
            ...buildCountCheck(expected, actual),
          },
        ] as const;
      })
    ).then((entries) => Object.fromEntries(entries)),
    Promise.all(
      expectedGames.map(async (game) => {
        const expected = getKangurGameContentSetsForGame(
          getKangurGameDefinition(game.id as KangurGameId)
        ).length;
        const actual = await db
          .collection(COLLECTIONS.gameContentSets)
          .countDocuments({ gameId: game.id });
        return [game.id, buildCountCheck(expected, actual)] as const;
      })
    ).then((entries) => Object.fromEntries(entries)),
    Promise.all(
      expectedGames.map(async (game) => {
        const expected = getKangurGameBuiltInInstancesForGame(
          getKangurGameDefinition(game.id as KangurGameId)
        ).length;
        const actual = await db
          .collection(COLLECTIONS.gameInstances)
          .countDocuments({ gameId: game.id });
        return [game.id, buildCountCheck(expected, actual)] as const;
      })
    ).then((entries) => Object.fromEntries(entries)),
  ]);

  const aiTutorMissing = resolvedLocales.filter((locale) => !actualAiTutorLocales.includes(locale));
  const aiTutorExtra = actualAiTutorLocales.filter((locale) => !resolvedLocales.includes(locale));
  const aiTutorMatches = aiTutorMissing.length === 0;
  const nativeGuideMissing = resolvedLocales.filter(
    (locale) => !actualNativeGuideLocales.includes(locale)
  );
  const nativeGuideExtra = actualNativeGuideLocales.filter(
    (locale) => !resolvedLocales.includes(locale)
  );
  const nativeGuideMatches = nativeGuideMissing.length === 0;

  const lessons = buildCountCheck(expectedLessons.length, actualLessons);
  const lessonDocuments = buildCountCheck(expectedLessons.length, actualLessonDocuments);
  const lessonSections = buildCountCheck(expectedSections.length, actualLessonSections);
  const games = buildCountCheck(expectedGames.length, actualGames);

  const mismatches: string[] = [];

  if (!lessons.meetsMinimum) {
    mismatches.push(`lessons missing ${lessons.missing}`);
  }
  if (!lessonDocuments.meetsMinimum) {
    mismatches.push(`lessonDocuments missing ${lessonDocuments.missing}`);
  }
  if (!lessonSections.meetsMinimum) {
    mismatches.push(`lessonSections missing ${lessonSections.missing}`);
  }
  if (!games.meetsMinimum) {
    mismatches.push(`games missing ${games.missing}`);
  }
  if (!aiTutorMatches) {
    mismatches.push(`aiTutorLocales missing ${aiTutorMissing.join(',')}`);
  }
  if (!nativeGuideMatches) {
    mismatches.push(`nativeGuideLocales missing ${nativeGuideMissing.join(',')}`);
  }

  for (const [locale, check] of Object.entries(pageContentEntriesByLocale)) {
    if (!check.meetsMinimum) {
      mismatches.push(`pageContent[${locale}] missing ${check.missing}`);
    }
  }

  for (const [locale, check] of Object.entries(lessonTemplatesByLocale)) {
    if (!check.meetsMinimum) {
      mismatches.push(`lessonTemplates[${locale}] missing ${check.missing}`);
    }
  }

  for (const [gameId, check] of Object.entries(gameContentSetsByGame)) {
    if (!check.meetsMinimum) {
      mismatches.push(`gameContentSets[${gameId}] missing ${check.missing}`);
    }
  }

  for (const [gameId, check] of Object.entries(gameInstancesByGame)) {
    if (!check.meetsMinimum) {
      mismatches.push(`gameInstances[${gameId}] missing ${check.missing}`);
    }
  }

  return {
    aiTutorLocales: {
      actual: actualAiTutorLocales,
      expectedMinimum: resolvedLocales,
      extra: aiTutorExtra,
      matches: aiTutorMatches,
      missing: aiTutorMissing,
    },
    nativeGuideLocales: {
      actual: actualNativeGuideLocales,
      expectedMinimum: resolvedLocales,
      extra: nativeGuideExtra,
      matches: nativeGuideMatches,
      missing: nativeGuideMissing,
    },
    gameContentSetsByGame,
    gameInstancesByGame,
    games,
    lessonDocuments,
    lessonSections,
    lessonTemplatesByLocale,
    lessons,
    locales: resolvedLocales,
    mismatchCount: mismatches.length,
    mismatches,
    ok: mismatches.length === 0,
    pageContentEntriesByLocale,
  };
}
