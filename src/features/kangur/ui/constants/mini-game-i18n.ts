import type { TranslationValues } from 'use-intl';

export type KangurMiniGameTranslate = (
  key: string,
  values?: TranslationValues
) => string;

const interpolateMiniGameTemplate = (
  template: string,
  values?: TranslationValues
): string =>
  template.replace(/\{(\w+)\}/g, (match: string, token: string) => {
    const interpolationValues: Record<string, unknown> | undefined = values;
    const value = interpolationValues?.[token];
    return value === undefined ? match : String(value);
  });

export const translateKangurMiniGameWithFallback = (
  translate: KangurMiniGameTranslate | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string => {
  if (!translate) {
    return interpolateMiniGameTemplate(fallback, values);
  }

  const translated = translate(key, values);
  return translated === key || translated.endsWith(`.${key}`)
    ? interpolateMiniGameTemplate(fallback, values)
    : interpolateMiniGameTemplate(translated, values);
};

export const getKangurMiniGameFinishLabel = (
  translate: KangurMiniGameTranslate,
  variant: 'lesson' | 'topics' | 'play' | 'back' | 'menu' | 'done' | 'end'
): string => translate(`shared.finish.${variant}`);

export const getKangurMiniGameScoreLabel = (
  translate: KangurMiniGameTranslate,
  score: number,
  total: number
): string => `${translate('shared.scoreLabel')}: ${score}/${total}`;

export const getKangurMiniGameScorePointsLabel = (
  translate: KangurMiniGameTranslate,
  score: number
): string => `${translate('shared.scoreLabel')}: ${score} ${translate('shared.pointsShort')}`;

export const getKangurMiniGameAccuracyText = (
  translate: KangurMiniGameTranslate,
  percent: number
): string => `${percent}% ${translate('shared.correctAnswersSuffix')}`;
