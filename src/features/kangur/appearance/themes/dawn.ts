import { type ThemeSettings } from '@/shared/contracts/cms-theme';
import { KANGUR_DAILY_BLOOM_THEME } from './daily';

export const KANGUR_DAWN_THEME: ThemeSettings = {
  ...KANGUR_DAILY_BLOOM_THEME,
  themePreset: 'kangur-dawn',
  homeActionLessonsLabelStartActive: '#ffffff',
  homeActionLessonsLabelMidActive: '#ffffff',
  homeActionLessonsLabelEndActive: '#ffffff',
  homeActionPlayLabelStartActive: '#ffffff',
  homeActionPlayLabelMidActive: '#ffffff',
  homeActionPlayLabelEndActive: '#ffffff',
  homeActionTrainingLabelStartActive: '#ffffff',
  homeActionTrainingLabelMidActive: '#ffffff',
  homeActionTrainingLabelEndActive: '#ffffff',
  homeActionKangurLabelStartActive: '#ffffff',
  homeActionKangurLabelMidActive: '#ffffff',
  homeActionKangurLabelEndActive: '#ffffff',
};

/**
 * Default dawn theme — uses factory dawn baseline.
 * Used as the dawn reset target.
 */
export const KANGUR_DEFAULT_DAWN_THEME: ThemeSettings = KANGUR_DAWN_THEME;
