import {
  getLocalizedKangurCoreLessonTitle,
  type KangurAssignmentPlan,
  type KangurAssignmentPriority,
  type KangurLessonMasteryInsight,
} from '@kangur/core';
import type { Href } from 'expo-router';
import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { getSessionAccentTone } from './profile-tones';

export { getSessionAccentTone } from './profile-tones';

export const formatProfileDate = (value: string | null, locale: 'pl' | 'en' | 'de'): string => {
  const fallback = { de: 'kein Datum', en: 'no date', pl: 'brak daty' }[locale];
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString(getKangurMobileLocaleTag(locale), { day: '2-digit', month: 'short' });
};

export const formatProfileDateTime = (value: string, locale: 'pl' | 'en' | 'de'): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { de: 'kein Datum', en: 'no date', pl: 'brak daty' }[locale];
  return parsed.toLocaleString(getKangurMobileLocaleTag(locale), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const formatProfileDuration = (value: number): string => {
  const safeValue = Math.max(0, Math.floor(value));
  if (safeValue < 60) return `${safeValue}s`;
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

export const getPriorityLabel = (priority: KangurAssignmentPriority, locale: 'pl' | 'en' | 'de'): string => {
  return {
    high: { de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' },
    medium: { de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' },
    low: { de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' },
  }[priority][locale];
};

export const getPriorityTone = (priority: KangurAssignmentPriority): Tone => {
  if (priority === 'high') return { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
  if (priority === 'medium') return { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
  return { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', textColor: '#1d4ed8' };
};

export const getMasteryTone = (masteryPercent: number): Tone => {
  if (masteryPercent >= 80) return { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' };
  if (masteryPercent >= 60) return { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
  return { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
};

export const getSessionScoreTone = (accuracyPercent: number): Tone => {
  if (accuracyPercent >= 90) return { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', textColor: '#047857' };
  if (accuracyPercent >= 70) return { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
  return { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
};
