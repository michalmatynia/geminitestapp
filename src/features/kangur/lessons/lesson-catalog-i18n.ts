import {
  KANGUR_AGE_GROUPS,
  KANGUR_LESSON_LIBRARY,
  KANGUR_SUBJECTS,
} from '@/features/kangur/lessons/lesson-catalog';
import type {
  KangurLessonAgeGroup,
  KangurLessonComponentId,
  KangurLessonSubject,
} from '@/features/kangur/shared/contracts/kangur';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import {
  ENGLISH_AGE_GROUP_LABELS,
  ENGLISH_LESSON_SECTION_LABELS,
  ENGLISH_LESSON_SECTION_TYPE_LABELS,
  ENGLISH_SUBJECT_LABELS,
  GERMAN_AGE_GROUP_LABELS,
  GERMAN_LESSON_SECTION_LABELS,
  GERMAN_LESSON_SECTION_TYPE_LABELS,
  GERMAN_SUBJECT_LABELS,
  UKRAINIAN_AGE_GROUP_LABELS,
  UKRAINIAN_LESSON_SECTION_LABELS,
  UKRAINIAN_LESSON_SECTION_TYPE_LABELS,
  UKRAINIAN_SUBJECT_LABELS,
} from './lesson-catalog-i18n.labels';
import {
  ENGLISH_LESSON_COPY_OVERRIDES,
  GERMAN_LESSON_COPY_OVERRIDES,
  type LessonCopyOverride,
  UKRAINIAN_LESSON_COPY_OVERRIDES,
} from './lesson-catalog-i18n.overrides';

type KangurLessonCatalogLocale = 'pl' | 'en' | 'de' | 'uk';

const SUBJECT_LABEL_MAP = new Map<KangurLessonSubject, string>(
  KANGUR_SUBJECTS.map((subject) => [subject.id, subject.label])
);

const AGE_GROUP_LABEL_MAP = new Map<KangurLessonAgeGroup, string>(
  KANGUR_AGE_GROUPS.map((group) => [group.id, group.label])
);

const resolveKangurLessonCatalogLocale = (
  locale: string | null | undefined
): KangurLessonCatalogLocale => {
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

const getLessonSourceValue = (
  componentId: string,
  field: keyof LessonCopyOverride
): string | null => {
  if (!(componentId in KANGUR_LESSON_LIBRARY)) {
    return null;
  }

  const template = KANGUR_LESSON_LIBRARY[componentId as keyof typeof KANGUR_LESSON_LIBRARY];
  const sourceValue = template?.[field];

  return typeof sourceValue === 'string' ? sourceValue : null;
};

const shouldApplyOverride = (
  componentId: string,
  fallbackValue: string | null | undefined,
  field: keyof LessonCopyOverride
): boolean => {
  const sourceValue = getLessonSourceValue(componentId, field);

  if (typeof sourceValue !== 'string') {
    return false;
  }

  if (typeof fallbackValue !== 'string' || fallbackValue.trim().length === 0) {
    return true;
  }

  return fallbackValue.trim() === sourceValue.trim();
};

const resolveLessonOverride = (
  componentId: string,
  locale: string | null | undefined,
  field: keyof LessonCopyOverride,
  fallbackValue: string | null | undefined
): string => {
  const catalogLocale = resolveKangurLessonCatalogLocale(locale);
  const resolvedFallbackValue =
    typeof fallbackValue === 'string' && fallbackValue.trim().length > 0
      ? fallbackValue
      : getLessonSourceValue(componentId, field) ?? '';

  if (catalogLocale === 'pl') {
    return resolvedFallbackValue;
  }

  if (!shouldApplyOverride(componentId, fallbackValue, field)) {
    return resolvedFallbackValue;
  }

  return (
    (catalogLocale === 'de'
      ? GERMAN_LESSON_COPY_OVERRIDES[componentId as KangurLessonComponentId]?.[field]
      : catalogLocale === 'uk'
        ? UKRAINIAN_LESSON_COPY_OVERRIDES[componentId as KangurLessonComponentId]?.[field]
      : undefined) ??
    ENGLISH_LESSON_COPY_OVERRIDES[componentId as KangurLessonComponentId]?.[field] ??
    resolvedFallbackValue
  );
};

export const getLocalizedKangurLessonTitle = (
  componentId: string,
  locale: string | null | undefined,
  fallbackTitle: string
): string => resolveLessonOverride(componentId, locale, 'title', fallbackTitle);

export const getLocalizedKangurLessonLabel = (
  componentId: string,
  locale: string | null | undefined,
  fallbackLabel: string
): string => resolveLessonOverride(componentId, locale, 'title', fallbackLabel);

export const getLocalizedKangurLessonDescription = (
  componentId: string,
  locale: string | null | undefined,
  fallbackDescription?: string | null
): string => resolveLessonOverride(componentId, locale, 'description', fallbackDescription);

export const getLocalizedKangurSubjectLabel = (
  subject: KangurLessonSubject,
  locale: string | null | undefined,
  fallbackLabel?: string
): string => {
  const sourceLabel = fallbackLabel ?? SUBJECT_LABEL_MAP.get(subject) ?? subject;
  const catalogLocale = resolveKangurLessonCatalogLocale(locale);

  if (catalogLocale === 'pl') {
    return sourceLabel;
  }

  return (
    (catalogLocale === 'de'
      ? GERMAN_SUBJECT_LABELS[subject]
      : catalogLocale === 'uk'
        ? UKRAINIAN_SUBJECT_LABELS[subject]
        : undefined) ??
    ENGLISH_SUBJECT_LABELS[subject] ??
    sourceLabel
  );
};

export const getLocalizedKangurAgeGroupLabel = (
  ageGroup: KangurLessonAgeGroup,
  locale: string | null | undefined,
  fallbackLabel?: string
): string => {
  const sourceLabel = fallbackLabel ?? AGE_GROUP_LABEL_MAP.get(ageGroup) ?? ageGroup;
  const catalogLocale = resolveKangurLessonCatalogLocale(locale);

  if (catalogLocale === 'pl') {
    return sourceLabel;
  }

  return (
    (catalogLocale === 'de'
      ? GERMAN_AGE_GROUP_LABELS[ageGroup]
      : catalogLocale === 'uk'
        ? UKRAINIAN_AGE_GROUP_LABELS[ageGroup]
        : undefined) ??
    ENGLISH_AGE_GROUP_LABELS[ageGroup] ??
    sourceLabel
  );
};

export const getLocalizedKangurLessonSectionLabel = (
  sectionId: string,
  locale: string | null | undefined,
  fallbackLabel: string
): string => {
  const catalogLocale = resolveKangurLessonCatalogLocale(locale);

  if (catalogLocale === 'pl') {
    return fallbackLabel;
  }

  return (
    (catalogLocale === 'de'
      ? GERMAN_LESSON_SECTION_LABELS[sectionId]
      : catalogLocale === 'uk'
        ? UKRAINIAN_LESSON_SECTION_LABELS[sectionId]
        : undefined) ??
    ENGLISH_LESSON_SECTION_LABELS[sectionId] ??
    fallbackLabel
  );
};

export const getLocalizedKangurLessonSectionTypeLabel = (
  locale: string | null | undefined,
  fallbackTypeLabel: string
): string => {
  const catalogLocale = resolveKangurLessonCatalogLocale(locale);

  if (catalogLocale === 'pl') {
    return fallbackTypeLabel;
  }

  return (
    (catalogLocale === 'de'
      ? GERMAN_LESSON_SECTION_TYPE_LABELS[fallbackTypeLabel]
      : catalogLocale === 'uk'
        ? UKRAINIAN_LESSON_SECTION_TYPE_LABELS[fallbackTypeLabel]
        : undefined) ??
    ENGLISH_LESSON_SECTION_TYPE_LABELS[fallbackTypeLabel] ??
    fallbackTypeLabel
  );
};
