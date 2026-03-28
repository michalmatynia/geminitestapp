import type { UnknownRecordDto } from '@/shared/contracts/base';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { parseKangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import type { KangurAiTutorTranslationStatusDto } from '@/shared/contracts/kangur-ai-tutor-locale-scaffold';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import { ENGLISH_KANGUR_AI_TUTOR_CONTENT_COPY } from './ai-tutor-content-locale-scaffold.en';
import { GERMAN_KANGUR_AI_TUTOR_CONTENT_COPY } from './ai-tutor-content-locale-scaffold.de';
import { UKRAINIAN_KANGUR_AI_TUTOR_CONTENT_COPY } from './ai-tutor-content-locale-scaffold.uk';

export type KangurAiTutorContentTranslatableSectionKey = Exclude<
  keyof KangurAiTutorContent,
  'locale' | 'version'
>;

export type KangurAiTutorContentTranslationStatus = KangurAiTutorTranslationStatusDto;

const isPlainObject = (value: unknown): value is UnknownRecordDto =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value)) as T;
};

const serializeComparable = (value: unknown): string => JSON.stringify(value);

const deepMerge = (base: unknown, override: unknown): unknown => {
  if (Array.isArray(base)) {
    return override === undefined ? cloneValue(base) : override;
  }

  if (isPlainObject(base) && isPlainObject(override)) {
    const next: UnknownRecordDto = {};

    for (const [key, baseValue] of Object.entries(base)) {
      next[key] = deepMerge(baseValue, override[key]);
    }

    for (const [key, overrideValue] of Object.entries(override)) {
      if (!Object.prototype.hasOwnProperty.call(base, key)) {
        next[key] = overrideValue;
      }
    }

    return next;
  }

  return override === undefined ? cloneValue(base) : override;
};

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


const CONTENT_COPY_BY_LOCALE: Record<string, Partial<KangurAiTutorContent>> = {
  en: ENGLISH_KANGUR_AI_TUTOR_CONTENT_COPY,
  de: GERMAN_KANGUR_AI_TUTOR_CONTENT_COPY,
  uk: UKRAINIAN_KANGUR_AI_TUTOR_CONTENT_COPY,
};

export const KANGUR_AI_TUTOR_CONTENT_TRANSLATABLE_SECTION_KEYS = Array.from(
  new Set(
    Object.values(CONTENT_COPY_BY_LOCALE).flatMap((content) =>
      Object.keys(content).filter((key) => key !== 'locale')
    )
  )
) as KangurAiTutorContentTranslatableSectionKey[];

export const getKangurAiTutorContentLocaleOverlay = (
  locale: string
): Partial<KangurAiTutorContent> => {
  const normalizedLocale = normalizeSiteLocale(locale);
  return CONTENT_COPY_BY_LOCALE[normalizedLocale] ?? { locale: normalizedLocale };
};

export const buildKangurAiTutorContentLocaleScaffold = (input: {
  locale: string;
  sourceContent: KangurAiTutorContent;
  existingContent?: Partial<KangurAiTutorContent> | null;
}): KangurAiTutorContent => {
  const normalizedLocale = normalizeSiteLocale(input.locale);
  const sourceScaffold = deepMerge(input.sourceContent, { locale: normalizedLocale });
  const withExistingContent = deepMerge(sourceScaffold, input.existingContent ?? {});
  const withLocaleOverlay = applyOverlayWhenStillSource(
    sourceScaffold,
    withExistingContent,
    getKangurAiTutorContentLocaleOverlay(normalizedLocale)
  );

  return parseKangurAiTutorContent(withLocaleOverlay);
};

const mergeKangurAiTutorContentWithSource = (input: {
  locale: string;
  sourceContent: KangurAiTutorContent;
  localizedContent?: Partial<KangurAiTutorContent> | null;
}): KangurAiTutorContent =>
  parseKangurAiTutorContent({
    ...(deepMerge(cloneValue(input.sourceContent), input.localizedContent ?? {}) as Partial<KangurAiTutorContent>),
    locale: normalizeSiteLocale(input.locale),
  });

export const buildKangurAiTutorContentTranslationStatusBySectionKey = (input: {
  locale: string;
  sourceContent: KangurAiTutorContent;
  localizedContent?: Partial<KangurAiTutorContent> | null;
  sourceLocale?: string;
}): Map<KangurAiTutorContentTranslatableSectionKey, KangurAiTutorContentTranslationStatus> => {
  const locale = normalizeSiteLocale(input.locale);
  const sourceLocale = normalizeSiteLocale(input.sourceLocale ?? 'pl');
  const sourceContent = parseKangurAiTutorContent(input.sourceContent);

  if (locale === sourceLocale) {
    return new Map(
      KANGUR_AI_TUTOR_CONTENT_TRANSLATABLE_SECTION_KEYS.map((sectionKey) => [
        sectionKey,
        'source-locale',
      ])
    );
  }

  const scaffoldContent = buildKangurAiTutorContentLocaleScaffold({
    locale,
    sourceContent,
  });
  const localizedContent = input.localizedContent
    ? mergeKangurAiTutorContentWithSource({
        locale,
        sourceContent,
        localizedContent: input.localizedContent,
      })
    : null;

  return new Map(
    KANGUR_AI_TUTOR_CONTENT_TRANSLATABLE_SECTION_KEYS.map((sectionKey) => {
      if (!localizedContent) {
        return [sectionKey, 'missing'] as const;
      }

      const sourceSection = sourceContent[sectionKey];
      const localizedSection = localizedContent[sectionKey];
      const scaffoldSection = scaffoldContent[sectionKey];

      if (serializeComparable(localizedSection) === serializeComparable(sourceSection)) {
        return [sectionKey, 'source-copy'] as const;
      }

      if (serializeComparable(localizedSection) === serializeComparable(scaffoldSection)) {
        return [sectionKey, 'scaffolded'] as const;
      }

      return [sectionKey, 'manual'] as const;
    })
  );
};

export const summarizeKangurAiTutorContentTranslationStatuses = (
  statuses: Iterable<KangurAiTutorContentTranslationStatus>
): Record<KangurAiTutorContentTranslationStatus, number> => {
  const summary: Record<KangurAiTutorContentTranslationStatus, number> = {
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
