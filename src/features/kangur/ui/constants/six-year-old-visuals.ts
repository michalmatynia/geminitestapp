import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import type { KangurLessonAgeGroup } from '@/features/kangur/shared/contracts/kangur';

type KangurSixYearOldSubjectVisual = {
  detail: string;
  icon: string;
  introSteps: readonly string[];
};

const SIX_YEAR_OLD_SUBJECT_VISUALS: Partial<
  Record<KangurLessonSubject, KangurSixYearOldSubjectVisual>
> = {
  alphabet: {
    detail: '✍️',
    icon: '🔤',
    introSteps: ['👀', '🔤', '👉'],
  },
  art: {
    detail: '🌈',
    icon: '🎨',
    introSteps: ['🎨', '✨', '👉'],
  },
  english: {
    detail: '🧩',
    icon: '🔤',
    introSteps: ['👀', '🧩', '👉'],
  },
  geometry: {
    detail: '📐',
    icon: '🔷',
    introSteps: ['🔷', '📐', '👉'],
  },
  maths: {
    detail: '➕',
    icon: '🔢',
    introSteps: ['🔢', '➕', '👉'],
  },
  music: {
    detail: '👂',
    icon: '🎵',
    introSteps: ['👂', '🎵', '👉'],
  },
  web_development: {
    detail: '🌐',
    icon: '💻',
    introSteps: ['💻', '🌐', '👉'],
  },
  agentic_coding: {
    detail: '✨',
    icon: '🤖',
    introSteps: ['🤖', '✨', '👉'],
  },
};

export const getKangurSixYearOldSubjectVisual = (
  subject: KangurLessonSubject
): KangurSixYearOldSubjectVisual =>
  SIX_YEAR_OLD_SUBJECT_VISUALS[subject] ?? {
    detail: '✨',
    icon: '🎯',
    introSteps: ['✨', '👉'],
  };

export const getKangurSixYearOldLessonGroupIcon = (hasSubsections: boolean): string =>
  hasSubsections ? '🧩' : '📚';

export const getKangurSixYearOldAgeGroupVisual = (
  ageGroup: KangurLessonAgeGroup
): { detail: string; icon: string } => {
  switch (ageGroup) {
    case 'six_year_old':
      return { detail: '6', icon: '🐣' };
    case 'ten_year_old':
      return { detail: '10', icon: '🚀' };
    case 'grown_ups':
      return { detail: '+', icon: '🧠' };
    default:
      return { detail: '•', icon: '👥' };
  }
};

export const getKangurSixYearOldMasteryIcon = (
  accent: 'slate' | 'emerald' | 'amber' | 'rose'
): string => {
  switch (accent) {
    case 'emerald':
      return '⭐';
    case 'amber':
      return '🚧';
    case 'rose':
      return '🔁';
    default:
      return '🌱';
  }
};

export const KANGUR_SIX_YEAR_OLD_ASSIGNMENT_ICON = '📌';
export const KANGUR_SIX_YEAR_OLD_COMPLETED_ASSIGNMENT_ICON = '✅';
export const KANGUR_SIX_YEAR_OLD_CUSTOM_CONTENT_ICON = '📘';
export const KANGUR_SIX_YEAR_OLD_SUBSECTION_ICON = '🪄';
