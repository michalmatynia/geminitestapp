import type { TranslationValues } from 'use-intl';

export type WidenLessonCopy<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenLessonCopy<U>[]
    : T extends object
      ? { [K in keyof T]: WidenLessonCopy<T[K]> }
      : T;

export type LessonTranslate = (key: string, values?: TranslationValues) => string;

type LessonTranslateWithHas = LessonTranslate & { has?: (messageKey: string) => boolean };

export const isResolvedLessonTranslation = (
  translated: string,
  key: string,
): boolean => translated !== key && !translated.endsWith(`.${key}`);

export const translateLessonValue = (
  translate: LessonTranslate,
  key: string,
  fallback: string,
): string => {
  const translated = translate(key);
  return isResolvedLessonTranslation(translated, key) ? translated : fallback;
};

export const translateLessonValueWithLegacyKey = (
  translate: LessonTranslate,
  key: string,
  legacyKey: string,
  fallback: string,
): string => {
  const translator = translate as LessonTranslateWithHas;

  if (!translator.has || translator.has(key)) {
    const translated = translate(key);
    if (isResolvedLessonTranslation(translated, key)) {
      return translated;
    }
  }

  if (!translator.has || translator.has(legacyKey)) {
    const legacyTranslated = translate(legacyKey);
    return isResolvedLessonTranslation(legacyTranslated, legacyKey)
      ? legacyTranslated
      : fallback;
  }

  return fallback;
};
