import type { UnknownRecordDto } from '@/shared/contracts/base';
import {
  mergeKangurAiTutorNativeGuideStore,
  parseKangurAiTutorNativeGuideStore,
  type KangurAiTutorNativeGuideEntry,
  type KangurAiTutorNativeGuideStore,
} from '@/shared/contracts/kangur-ai-tutor-native-guide';
import type { KangurAiTutorTranslationStatusDto } from '@/shared/contracts/kangur-ai-tutor-locale-scaffold';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import type { GuideEntryOverlay } from './ai-tutor-native-guide-locale-scaffold.shared';
import {
  ENGLISH_KANGUR_AI_TUTOR_NATIVE_GUIDE_COPY,
} from './ai-tutor-native-guide-locale-scaffold.en';
import {
  GERMAN_KANGUR_AI_TUTOR_NATIVE_GUIDE_COPY,
} from './ai-tutor-native-guide-locale-scaffold.de';

type KangurAiTutorNativeGuideLocaleOverlay = {
  locale: string;
  entries: Record<string, GuideEntryOverlay>;
};

type ComparableNativeGuideEntry = Pick<
  KangurAiTutorNativeGuideEntry,
  | 'title'
  | 'shortDescription'
  | 'fullDescription'
  | 'hints'
  | 'relatedGames'
  | 'relatedTests'
  | 'followUpActions'
  | 'triggerPhrases'
>;

export type KangurAiTutorNativeGuideTranslationStatus = KangurAiTutorTranslationStatusDto;

const isPlainObject = (value: unknown): value is UnknownRecordDto =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const serializeComparable = (value: unknown): string => JSON.stringify(value);

const applyOverlayWhenStillSource = (
  source: unknown,
  current: unknown,
  overlay: unknown
): unknown => {
  if (overlay === undefined) {
    return current;
  }

  if (isPlainObject(overlay)) {
    const sourceRecord = isPlainObject(source) ? source : {};
    const currentRecord = isPlainObject(current) ? current : {};
    const next = { ...currentRecord };

    for (const [key, overlayValue] of Object.entries(overlay)) {
      next[key] = applyOverlayWhenStillSource(sourceRecord[key], currentRecord[key], overlayValue);
    }

    return next;
  }

  if (
    current === undefined ||
    current === null ||
    (typeof current === 'string' && current.trim().length === 0)
  ) {
    return overlay;
  }

  return serializeComparable(current) === serializeComparable(source) ? overlay : current;
};
const pickComparableEntry = (
  entry: KangurAiTutorNativeGuideEntry | null | undefined
): ComparableNativeGuideEntry | null => {
  if (!entry) {
    return null;
  }

  return {
    title: entry.title,
    shortDescription: entry.shortDescription,
    fullDescription: entry.fullDescription,
    hints: entry.hints,
    relatedGames: entry.relatedGames,
    relatedTests: entry.relatedTests,
    followUpActions: entry.followUpActions,
    triggerPhrases: entry.triggerPhrases,
  };
};

const GUIDE_COPY_BY_LOCALE: Record<string, Record<string, GuideEntryOverlay>> = {
  en: ENGLISH_KANGUR_AI_TUTOR_NATIVE_GUIDE_COPY,
  de: GERMAN_KANGUR_AI_TUTOR_NATIVE_GUIDE_COPY,
};

export const getKangurAiTutorNativeGuideLocaleOverlay = (
  locale: string
): KangurAiTutorNativeGuideLocaleOverlay => {
  const normalizedLocale = normalizeSiteLocale(locale);

  return {
    locale: normalizedLocale,
    entries: GUIDE_COPY_BY_LOCALE[normalizedLocale] ?? {},
  };
};

export const buildKangurAiTutorNativeGuideLocaleScaffold = (input: {
  locale: string;
  sourceStore: KangurAiTutorNativeGuideStore;
  existingStore?: Partial<KangurAiTutorNativeGuideStore> | null;
}): KangurAiTutorNativeGuideStore => {
  const locale = normalizeSiteLocale(input.locale);
  const sourceStore = parseKangurAiTutorNativeGuideStore({
    ...cloneValue(input.sourceStore),
    locale,
  });
  const currentStore = input.existingStore
    ? mergeKangurAiTutorNativeGuideStore(sourceStore, input.existingStore)
    : sourceStore;
  const overlay = getKangurAiTutorNativeGuideLocaleOverlay(locale);
  const sourceEntriesById = new Map(sourceStore.entries.map((entry) => [entry.id, entry] as const));

  const entries = currentStore.entries.map((entry) => {
    const entryOverlay = overlay.entries[entry.id];
    if (!entryOverlay) {
      return entry;
    }

    const sourceEntry = sourceEntriesById.get(entry.id) ?? entry;
    return applyOverlayWhenStillSource(sourceEntry, entry, entryOverlay) as KangurAiTutorNativeGuideEntry;
  });

  return parseKangurAiTutorNativeGuideStore({
    ...currentStore,
    locale,
    entries,
  });
};

export const buildKangurAiTutorNativeGuideTranslationStatusByEntryId = (input: {
  locale: string;
  sourceStore: KangurAiTutorNativeGuideStore;
  localizedStore?: Partial<KangurAiTutorNativeGuideStore> | null;
  sourceLocale?: string;
}): Map<string, KangurAiTutorNativeGuideTranslationStatus> => {
  const locale = normalizeSiteLocale(input.locale);
  const sourceLocale = normalizeSiteLocale(input.sourceLocale ?? 'pl');
  const sourceStore = parseKangurAiTutorNativeGuideStore(input.sourceStore);

  if (locale === sourceLocale) {
    return new Map(
      sourceStore.entries.map((entry) => [entry.id, 'source-locale'] as const)
    );
  }

  const localizedStore = input.localizedStore
    ? mergeKangurAiTutorNativeGuideStore(
        parseKangurAiTutorNativeGuideStore({
          ...cloneValue(sourceStore),
          locale,
        }),
        input.localizedStore
      )
    : null;
  const scaffoldStore = buildKangurAiTutorNativeGuideLocaleScaffold({
    locale,
    sourceStore,
  });
  const localizedEntriesById = new Map(localizedStore?.entries.map((entry) => [entry.id, entry]) ?? []);
  const scaffoldEntriesById = new Map(scaffoldStore.entries.map((entry) => [entry.id, entry]));

  return new Map(
    sourceStore.entries.map((sourceEntry) => {
      const localizedEntry = localizedEntriesById.get(sourceEntry.id) ?? null;
      if (!localizedEntry) {
        return [sourceEntry.id, 'missing'] as const;
      }

      const sourceComparable = pickComparableEntry(sourceEntry);
      const localizedComparable = pickComparableEntry(localizedEntry);
      const scaffoldComparable = pickComparableEntry(
        scaffoldEntriesById.get(sourceEntry.id) ?? null
      );

      if (serializeComparable(localizedComparable) === serializeComparable(sourceComparable)) {
        return [sourceEntry.id, 'source-copy'] as const;
      }

      if (serializeComparable(localizedComparable) === serializeComparable(scaffoldComparable)) {
        return [sourceEntry.id, 'scaffolded'] as const;
      }

      return [sourceEntry.id, 'manual'] as const;
    })
  );
};

export const summarizeKangurAiTutorNativeGuideTranslationStatuses = (
  statuses: Iterable<KangurAiTutorNativeGuideTranslationStatus>
): Record<KangurAiTutorNativeGuideTranslationStatus, number> => {
  const summary: Record<KangurAiTutorNativeGuideTranslationStatus, number> = {
    'source-locale': 0,
    missing: 0,
    'source-copy': 0,
    scaffolded: 0,
    manual: 0,
  };

  for (const status of statuses) {
    summary[status] += 1;
  }

  return summary;
};
