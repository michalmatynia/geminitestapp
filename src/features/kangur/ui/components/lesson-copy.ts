import type { TranslationValues } from 'use-intl';

import { KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY } from '@/shared/contracts/kangur-lesson-templates.shared';

export type WidenLessonCopy<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly WidenLessonCopy<U>[]
    : T extends object
      ? { [K in keyof T]: WidenLessonCopy<T[K]> }
      : T;

export type LessonTranslate = (key: string, values?: TranslationValues) => string;
export type LessonShellScope = 'game' | 'draw' | 'synthesis';

type LessonTranslateWithHas = LessonTranslate & { has?: (messageKey: string) => boolean };

export const createLessonFallbackTranslate = (
  translate: LessonTranslateWithHas,
): LessonTranslateWithHas => {
  const fallbackTranslate = ((key: string, values?: TranslationValues): string =>
    translate(key, values)) as LessonTranslateWithHas;

  if (typeof translate.has === 'function') {
    fallbackTranslate.has = (messageKey: string): boolean => translate.has?.(messageKey) ?? false;
  }

  return fallbackTranslate;
};

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

export const getLessonShellTitleKeys = (scope: LessonShellScope) => ({
  forward: `${scope}.gameTitle`,
  legacy: `${scope}.${KANGUR_LEGACY_LESSON_SHELL_TITLE_KEY}`,
});

export const translateLessonShellTitle = (
  translate: LessonTranslate,
  scope: LessonShellScope,
  fallback: string,
): string => {
  const keys = getLessonShellTitleKeys(scope);
  return translateLessonValueWithLegacyKey(translate, keys.forward, keys.legacy, fallback);
};
