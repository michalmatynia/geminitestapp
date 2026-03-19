export type KangurMiniGameTranslate = (key: string, values?: Record<string, any>) => string;

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
