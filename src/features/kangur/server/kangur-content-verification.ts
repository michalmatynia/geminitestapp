import 'server-only';

import { buildDefaultKangurPageContentStore } from '@/features/kangur/ai-tutor/page-content-catalog';
import { normalizeKangurLessonDocument } from '@/features/kangur/lesson-documents';
import { normalizeKangurLessonSection } from '@/features/kangur/services/kangur-lesson-section-repository/normalize-kangur-lesson-section';
import { normalizeKangurLessonTemplate } from '@/features/kangur/services/kangur-lesson-template-repository/normalize-kangur-lesson-template';
import {
  createDefaultKangurGames,
  getKangurGameBuiltInInstancesForGame,
  getKangurGameContentSetsForGame,
  getKangurGameDefinition,
} from '@/features/kangur/games';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { kangurLessonSchema } from '@/shared/contracts/kangur';
import {
  type KangurLessonTemplate,
} from '@/shared/contracts/kangur-lesson-templates';

import { KANGUR_CONTENT_BOOTSTRAP_LOCALES } from './kangur-content-bootstrap';
import {
  buildKangurLessonContentExactDiff,
  buildKangurLessonContentRevision,
  buildLocalKangurLessonContentSnapshot,
  KANGUR_LESSON_DOCUMENT_SYNC_LOCALES,
  normalizeKangurLessonDocumentStoreForSnapshot,
  normalizeKangurLessonForSnapshot,
  normalizeKangurLessonSectionForSnapshot,
  normalizeKangurLessonTemplateForSnapshot,
  serializeKangurLessonDocumentForComparison,
  type KangurLessonContentExactDiff,
} from './kangur-lesson-content-snapshot';
import { readKangurLessonContentMetadata } from './kangur-content-metadata';

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

type RevisionCheck = {
  actual: string;
  expected: string;
  matches: boolean;
  source: 'localhost' | null;
  stored: string | null;
  storedMatchesActual: boolean;
  storedMatchesExpected: boolean;
  syncedAt: string | null;
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

const toLessonRecord = <T extends { id: string }>(items: readonly T[]): Record<string, T> =>
  Object.fromEntries(items.map((item) => [item.id, item]));

const toTemplateRecord = (items: readonly KangurLessonTemplate[]): Record<string, KangurLessonTemplate> =>
  Object.fromEntries(items.map((item) => [item.componentId, item]));

const serializeComparableValue = (value: unknown): string => JSON.stringify(value);

const describeExactDiff = (
  label: string,
  diff: KangurLessonContentExactDiff
): string | null => {
  if (diff.matches) {
    return null;
  }

  return `${label} drift missing ${diff.missingIds.length}, extra ${diff.extraIds.length}, changed ${diff.changedIds.length}`;
};

const loadMongoLessons = async (
  db: Awaited<ReturnType<typeof getMongoDb>>
) =>
  (
    await db
      .collection(COLLECTIONS.lessons)
      .find({})
      .sort({ sortOrder: 1, id: 1 })
      .toArray()
  ).map((document) => normalizeKangurLessonForSnapshot(kangurLessonSchema.parse(document)));

const loadMongoLessonSections = async (
  db: Awaited<ReturnType<typeof getMongoDb>>
) =>
  (
    await db
      .collection(COLLECTIONS.lessonSections)
      .find({})
      .sort({ sortOrder: 1, id: 1 })
      .toArray()
  ).map((document) =>
    normalizeKangurLessonSectionForSnapshot(normalizeKangurLessonSection(document))
  );

const loadMongoLessonTemplatesByLocale = async (
  db: Awaited<ReturnType<typeof getMongoDb>>,
  locales: readonly string[]
): Promise<Record<string, KangurLessonTemplate[]>> =>
  Object.fromEntries(
    await Promise.all(
      locales.map(async (locale) => {
        const templates = (
          await db
            .collection(COLLECTIONS.lessonTemplates)
            .find(buildLocaleFilter(locale))
            .sort({ sortOrder: 1, componentId: 1 })
            .toArray()
        ).map((document) =>
          normalizeKangurLessonTemplateForSnapshot(
            normalizeKangurLessonTemplate(document)
          )
        );
        return [locale, templates] as const;
      })
    )
  );

const loadMongoLessonDocumentsByLocale = async (
  db: Awaited<ReturnType<typeof getMongoDb>>
): Promise<Record<string, Record<string, ReturnType<typeof normalizeKangurLessonDocument>>>> =>
  Object.fromEntries(
    await Promise.all(
      KANGUR_LESSON_DOCUMENT_SYNC_LOCALES.map(async (locale) => {
        const documents = await db
          .collection(COLLECTIONS.lessonDocuments)
          .find(buildLocaleFilter(locale))
          .sort({ lessonId: 1 })
          .toArray();
        return [
          locale,
          normalizeKangurLessonDocumentStoreForSnapshot(
            Object.fromEntries(
              documents.flatMap((document) => {
                const lessonId =
                  typeof document?.['lessonId'] === 'string' ? document['lessonId'] : null;
                if (!lessonId) {
                  return [];
                }

                return [
                  [
                    lessonId,
                    normalizeKangurLessonDocument(document['document']),
                  ] as const,
                ];
              })
            )
          ),
        ] as const;
      })
    )
  );

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
  lessonContentDiff: {
    lessonDocumentsByLocale: Record<string, KangurLessonContentExactDiff>;
    lessonTemplatesByLocale: Record<string, KangurLessonContentExactDiff>;
    lessons: KangurLessonContentExactDiff;
    lessonSections: KangurLessonContentExactDiff;
  };
  lessonContentRevision: RevisionCheck;
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
  const expectedLessonContent = await buildLocalKangurLessonContentSnapshot(resolvedLocales);
  const expectedGames = createDefaultKangurGames();

  const [
    actualLessonsList,
    actualLessonSectionsList,
    actualLessonTemplatesByLocale,
    actualLessonDocumentsByLocale,
    actualGames,
    actualAiTutorLocales,
    actualNativeGuideLocales,
    pageContentEntriesByLocale,
    gameContentSetsByGame,
    gameInstancesByGame,
    lessonContentMetadata,
  ] = await Promise.all([
    loadMongoLessons(db),
    loadMongoLessonSections(db),
    loadMongoLessonTemplatesByLocale(db, resolvedLocales),
    loadMongoLessonDocumentsByLocale(db),
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
      expectedGames.map(async (game) => {
        const expected = getKangurGameContentSetsForGame(
          getKangurGameDefinition(game.id)
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
          getKangurGameDefinition(game.id)
        ).length;
        const actual = await db
          .collection(COLLECTIONS.gameInstances)
          .countDocuments({ gameId: game.id });
        return [game.id, buildCountCheck(expected, actual)] as const;
      })
    ).then((entries) => Object.fromEntries(entries)),
    readKangurLessonContentMetadata(),
  ]);

  const actualLessons = toLessonRecord(actualLessonsList);
  const expectedLessons = toLessonRecord(expectedLessonContent.lessons);
  const actualLessonSections = toLessonRecord(actualLessonSectionsList);
  const expectedLessonSections = toLessonRecord(expectedLessonContent.sections);

  const lessonsDiff = buildKangurLessonContentExactDiff(
    expectedLessons,
    actualLessons,
    serializeComparableValue
  );
  const lessonSectionsDiff = buildKangurLessonContentExactDiff(
    expectedLessonSections,
    actualLessonSections,
    serializeComparableValue
  );
  const lessonTemplatesExactByLocale = Object.fromEntries(
    resolvedLocales.map((locale) => [
      locale,
      buildKangurLessonContentExactDiff(
        toTemplateRecord(expectedLessonContent.lessonTemplatesByLocale[locale] ?? []),
        toTemplateRecord(actualLessonTemplatesByLocale[locale] ?? []),
        serializeComparableValue
      ),
    ])
  );
  const lessonDocumentsExactByLocale = Object.fromEntries(
    KANGUR_LESSON_DOCUMENT_SYNC_LOCALES.map((locale) => [
      locale,
      buildKangurLessonContentExactDiff(
        expectedLessonContent.lessonDocumentsByLocale[locale] ?? {},
        actualLessonDocumentsByLocale[locale] ?? {},
        serializeKangurLessonDocumentForComparison
      ),
    ])
  );
  const actualLessonContentRevision = buildKangurLessonContentRevision({
    lessons: actualLessonsList,
    sections: actualLessonSectionsList,
    lessonTemplatesByLocale: actualLessonTemplatesByLocale,
    lessonDocumentsByLocale: actualLessonDocumentsByLocale,
  });

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

  const lessons = buildCountCheck(expectedLessonContent.lessons.length, actualLessonsList.length);
  const lessonDocuments = buildCountCheck(
    Object.keys(expectedLessonContent.lessonDocumentsByLocale['pl'] ?? {}).length,
    Object.keys(actualLessonDocumentsByLocale['pl'] ?? {}).length
  );
  const lessonSections = buildCountCheck(expectedLessonContent.sections.length, actualLessonSectionsList.length);
  const games = buildCountCheck(expectedGames.length, actualGames);
  const lessonTemplatesByLocale = Object.fromEntries(
    resolvedLocales.map((locale) => [
      locale,
      {
        locale,
        ...buildCountCheck(
          (expectedLessonContent.lessonTemplatesByLocale[locale] ?? []).length,
          (actualLessonTemplatesByLocale[locale] ?? []).length
        ),
      },
    ])
  );

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
  if (expectedLessonContent.lessonContentRevision !== actualLessonContentRevision) {
    mismatches.push('lessonContentRevision mismatch');
  }
  if (!lessonContentMetadata) {
    mismatches.push('lessonContentMetadata missing');
  } else if (lessonContentMetadata.lessonContentRevision !== expectedLessonContent.lessonContentRevision) {
    mismatches.push('lessonContentMetadata stale');
  }

  for (const entry of [
    describeExactDiff('lessons', lessonsDiff),
    describeExactDiff('lessonSections', lessonSectionsDiff),
  ]) {
    if (entry) {
      mismatches.push(entry);
    }
  }

  for (const [locale, diff] of Object.entries(lessonTemplatesExactByLocale)) {
    const mismatch = describeExactDiff(`lessonTemplates[${locale}]`, diff);
    if (mismatch) {
      mismatches.push(mismatch);
    }
  }

  for (const [locale, diff] of Object.entries(lessonDocumentsExactByLocale)) {
    const mismatch = describeExactDiff(`lessonDocuments[${locale}]`, diff);
    if (mismatch) {
      mismatches.push(mismatch);
    }
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
    lessonContentDiff: {
      lessonDocumentsByLocale: lessonDocumentsExactByLocale,
      lessonTemplatesByLocale: lessonTemplatesExactByLocale,
      lessons: lessonsDiff,
      lessonSections: lessonSectionsDiff,
    },
    lessonContentRevision: {
      actual: actualLessonContentRevision,
      expected: expectedLessonContent.lessonContentRevision,
      matches: expectedLessonContent.lessonContentRevision === actualLessonContentRevision,
      source: lessonContentMetadata?.source ?? null,
      stored: lessonContentMetadata?.lessonContentRevision ?? null,
      storedMatchesActual:
        lessonContentMetadata?.lessonContentRevision === actualLessonContentRevision,
      storedMatchesExpected:
        lessonContentMetadata?.lessonContentRevision ===
        expectedLessonContent.lessonContentRevision,
      syncedAt: lessonContentMetadata?.syncedAt ?? null,
    },
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
