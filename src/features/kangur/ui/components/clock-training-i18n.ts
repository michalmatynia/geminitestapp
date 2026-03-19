import type { TranslationValues } from 'use-intl';

import {
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';

export type ClockTrainingTranslate = KangurMiniGameTranslate;

const interpolateClockTrainingTemplate = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
};

export const translateClockTrainingWithFallback = (
  translate: ClockTrainingTranslate | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string =>
  interpolateClockTrainingTemplate(
    translateKangurMiniGameWithFallback(translate, `clockTraining.${key}`, fallback, values),
    values
  );
