import type { TranslationValues } from 'use-intl';

import {
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';

const interpolateClockTrainingTemplate = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template;
  }

  const interpolationValues: Record<string, unknown> = values;
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = interpolationValues[key];
    return value === undefined ? match : String(value);
  });
};

export const translateClockTrainingWithFallback = (
  translate: KangurMiniGameTranslate | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string =>
  interpolateClockTrainingTemplate(
    translateKangurMiniGameWithFallback(translate, `clockTraining.${key}`, fallback, values),
    values
  );
