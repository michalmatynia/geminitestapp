import { DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE } from '@/features/kangur/shared/contracts/kangur-ai-tutor-native-guide';
import {
  kangurPageContentStoreSchema,
  type KangurPageContentEntry,
  type KangurPageContentFragment,
  type KangurPageContentPageKey,
  type KangurPageContentStore,
} from '@/features/kangur/shared/contracts/kangur-page-content';
import {
  KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO,
  type KangurAiTutorPageCoverageEntry,
} from '../page-coverage-manifest';
import { getKangurHomeHref, getKangurPageSlug } from '../../config/routing';
import {
  getLocalizedKangurLessonDescription,
  getLocalizedKangurLessonTitle,
} from '../../lessons/lesson-catalog-i18n';
import { KANGUR_LESSON_COMPONENT_OPTIONS, KANGUR_LESSON_LIBRARY } from '../../settings';
import { repairKangurPolishCopy } from '@/shared/lib/i18n/kangur-polish-diacritics';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  ENGLISH_PAGE_CONTENT_COPY_OVERRIDES,
  GERMAN_PAGE_CONTENT_COPY_OVERRIDES,
  PAGE_CONTENT_COPY_OVERRIDES,
  type KangurPageContentCopyOverride,
  UKRAINIAN_PAGE_CONTENT_COPY_OVERRIDES,
} from '../page-content-catalog.copy';
import { LESSON_LIBRARY_FRAGMENT_DETAILS } from './lesson-details';
import { KANGUR_TEST_QUESTION_FRAGMENTS } from './question-fragments';

const KANGUR_HOME_ROUTE = getKangurHomeHref('/');
const KANGUR_PAGE_CONTENT_VERSION = 1;

export const dedupeOrdered = (values: readonly string[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
};

export const resolveKangurPageContentLocale = (
  locale: string | null | undefined
): 'pl' | 'en' | 'de' | 'uk' => {
  const normalizedLocale = normalizeSiteLocale(locale);
  if (
    normalizedLocale === 'pl' ||
    normalizedLocale === 'de' ||
    normalizedLocale === 'uk'
  ) {
    return normalizedLocale;
  }
  return 'en';
};

export const resolvePageContentCopyOverride = (
  entryId: string,
  locale: string | null | undefined
): KangurPageContentCopyOverride | undefined => {
  const contentLocale = resolveKangurPageContentLocale(locale);

  if (contentLocale === 'pl') {
    return PAGE_CONTENT_COPY_OVERRIDES[entryId];
  }

  return (
    (contentLocale === 'de'
      ? GERMAN_PAGE_CONTENT_COPY_OVERRIDES[entryId]
      : contentLocale === 'uk'
        ? UKRAINIAN_PAGE_CONTENT_COPY_OVERRIDES[entryId]
        : undefined) ??
    ENGLISH_PAGE_CONTENT_COPY_OVERRIDES[entryId]
  );
};

export const resolveLessonLibraryAliases = (
  locale: string | null | undefined,
  lessonTitle: string,
  lessonDescription: string,
  lessonLabel: string,
  detailAliases: readonly string[] | undefined,
  normalizedComponentId: string
): string[] =>
  resolveKangurPageContentLocale(locale) !== 'pl'
    ? dedupeOrdered([
        lessonTitle,
        lessonDescription,
        normalizedComponentId,
        ...(detailAliases ?? []),
      ])
    : dedupeOrdered([lessonDescription, lessonLabel, ...(detailAliases ?? [])]);

export const resolveLessonLibraryTriggerPhrases = (
  locale: string | null | undefined,
  lessonTitle: string,
  lessonDescription: string,
  detailTriggerPhrases: readonly string[] | undefined,
  normalizedComponentId: string
): string[] =>
  resolveKangurPageContentLocale(locale) !== 'pl'
    ? dedupeOrdered([
        lessonTitle,
        lessonDescription,
        normalizedComponentId,
        ...(detailTriggerPhrases ?? []),
      ])
    : dedupeOrdered([
        lessonTitle,
        lessonDescription,
        normalizedComponentId,
        ...(detailTriggerPhrases ?? []),
      ]);

const LESSON_LIBRARY_COMPONENT_ORDER = KANGUR_LESSON_COMPONENT_OPTIONS.map(
  (option) => option.value
);

export const buildLessonLibraryFragments = (locale = 'pl'): KangurPageContentFragment[] =>
  LESSON_LIBRARY_COMPONENT_ORDER.map((componentId, index) => {
    const lesson = KANGUR_LESSON_LIBRARY[componentId];
    const lessonTitle = getLocalizedKangurLessonTitle(componentId, locale, lesson.title);
    const lessonDescription = getLocalizedKangurLessonDescription(
      componentId,
      locale,
      lesson.description
    );
    const detail = resolveKangurPageContentLocale(locale) !== 'pl'
      ? ({
          explanation: lessonDescription,
          triggerPhrases: [],
          aliases: [],
        } satisfies {
          explanation: string;
          triggerPhrases: string[];
          aliases?: string[];
        })
      : (LESSON_LIBRARY_FRAGMENT_DETAILS[componentId] ??
        ({
          explanation: lesson.description,
          triggerPhrases: [],
          aliases: [],
        } satisfies {
          explanation: string;
          triggerPhrases: string[];
          aliases?: string[];
        }));
    const normalizedComponentId = componentId.replace(/_/g, ' ');

    return {
      id: `lesson:${componentId}`,
      text: lessonTitle,
      aliases: resolveLessonLibraryAliases(
        locale,
        lessonTitle,
        lessonDescription,
        lesson.label,
        detail.aliases,
        normalizedComponentId
      ),
      explanation: detail.explanation,
      nativeGuideIds: [],
      triggerPhrases: resolveLessonLibraryTriggerPhrases(
        locale,
        lessonTitle,
        lessonDescription,
        detail.triggerPhrases,
        normalizedComponentId
      ),
      enabled: true,
      sortOrder: (index + 1) * 10,
    };
  });

export const buildKangurTestQuestionFragments = (): KangurPageContentFragment[] =>
  KANGUR_TEST_QUESTION_FRAGMENTS.map((fragment) => ({
    ...fragment,
    aliases: dedupeOrdered(fragment.aliases ?? []),
    nativeGuideIds: dedupeOrdered(fragment.nativeGuideIds ?? []),
    triggerPhrases: dedupeOrdered(fragment.triggerPhrases ?? []),
  }));

const PAGE_CONTENT_FRAGMENT_BUILDERS: Partial<
  Record<string, (locale: string) => KangurPageContentFragment[]>
> = {
  'lessons-library': buildLessonLibraryFragments,
  'tests-question': () => buildKangurTestQuestionFragments(),
  'game-kangur-session': () => buildKangurTestQuestionFragments(),
};

export const toRouteFromPageKey = (pageKey: KangurPageContentPageKey): string => {
  if (pageKey === 'Login' || pageKey === 'SharedChrome') {
    return KANGUR_HOME_ROUTE;
  }

  if (pageKey === 'Tests') {
    return '/tests';
  }

  const slug = getKangurPageSlug(pageKey).trim().replace(/^\/+/, '');
  return slug.length > 0 ? `/${slug}` : KANGUR_HOME_ROUTE;
};

const nativeGuideById = new Map(
  DEFAULT_KANGUR_AI_TUTOR_NATIVE_GUIDE_STORE.entries.map((entry) => [entry.id, entry] as const)
);

export const buildSummary = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string => {
  for (const guideId of linkedGuideIds) {
    const guide = nativeGuideById.get(guideId);
    if (guide?.shortDescription) {
      return guide.shortDescription;
    }
  }

  return entry.notes;
};

export const buildBody = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string => {
  const parts: string[] = [entry.notes];

  for (const guideId of linkedGuideIds) {
    const guide = nativeGuideById.get(guideId);
    if (!guide) {
      continue;
    }

    parts.push(`${guide.title}. ${guide.fullDescription}`);

    if (guide.hints.length > 0) {
      parts.push(`Wskazówki: ${guide.hints.join(' ')}`);
    }
  }

  return dedupeOrdered(parts).join('

');
};

export const buildTriggerPhrases = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string[] =>
  dedupeOrdered([
    entry.title,
    entry.componentId.replace(/[-_]+/g, ' '),
    ...linkedGuideIds.flatMap((guideId) => nativeGuideById.get(guideId)?.triggerPhrases ?? []),
  ]);

export const buildTags = (
  entry: KangurAiTutorPageCoverageEntry,
  linkedGuideIds: readonly string[]
): string[] =>
  dedupeOrdered([
    'page-content',
    'section',
    entry.pageKey.toLowerCase(),
    entry.screenKey.toLowerCase(),
    entry.componentId,
    entry.widget,
    ...(entry.surface ? [entry.surface] : []),
    ...(entry.focusKind ? [entry.focusKind] : []),
    ...linkedGuideIds,
  ]);

export const buildSectionEntry = (
  entry: KangurAiTutorPageCoverageEntry,
  index: number,
  locale: string
): KangurPageContentEntry => {
  const linkedGuideIds = entry.currentKnowledgeEntryIds;
  const copyOverride = resolvePageContentCopyOverride(entry.id, locale);

  return {
    id: entry.id,
    pageKey: entry.pageKey,
    screenKey: entry.screenKey,
    surface: entry.surface,
    route: toRouteFromPageKey(entry.pageKey),
    componentId: entry.componentId,
    widget: entry.widget,
    sourcePath: entry.sourcePath,
    title: copyOverride?.title ?? entry.title,
    summary: copyOverride?.summary ?? buildSummary(entry, linkedGuideIds),
    body: buildBody(entry, linkedGuideIds),
    anchorIdPrefix: entry.anchorIdPrefix,
    focusKind: entry.focusKind,
    contentIdPrefixes: [...entry.contentIdPrefixes],
    nativeGuideIds: [...linkedGuideIds],
    triggerPhrases: buildTriggerPhrases(entry, linkedGuideIds),
    tags: buildTags(entry, linkedGuideIds),
    fragments: PAGE_CONTENT_FRAGMENT_BUILDERS[entry.id]?.(locale) ?? [],
    notes: entry.notes,
    enabled: true,
    sortOrder: index * 10,
  };
};

export const buildDefaultKangurPageContentStore = (locale = 'pl'): KangurPageContentStore =>
  kangurPageContentStoreSchema.parse(
    repairKangurPolishCopy({
      locale,
      version: KANGUR_PAGE_CONTENT_VERSION,
      entries: KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map((entry, index) =>
        buildSectionEntry(entry, index, locale)
      ),
    })
  );
