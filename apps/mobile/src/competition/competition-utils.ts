import type { KangurExamQuestion } from '@kangur/contracts';

import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import { formatKangurMobileQuestionCount } from '../shared/questionCountLabel';
import type {
  KangurMobileCompetitionMode,
  KangurMobileCompetitionModeItem,
} from './useKangurMobileCompetition';

export const formatQuestionCount = (
  count: number,
  locale: KangurMobileLocale,
): string => formatKangurMobileQuestionCount(count, locale);

export const formatQuestionProgress = (
  current: number,
  total: number,
  locale: KangurMobileLocale,
): string =>
  ({
    de: `Frage ${current} von ${total}`,
    en: `Question ${current} of ${total}`,
    pl: `Pytanie ${current} z ${total}`,
  })[locale];

export const formatCompetitionModeTitle = (
  mode: KangurMobileCompetitionMode,
  locale: KangurMobileLocale,
): string => {
  if (mode === 'full_test_2024') {
    return {
      de: 'Kangur 2024 · Voller Wettbewerb',
      en: 'Kangaroo 2024 · Full competition',
      pl: 'Kangur 2024 · Pełny konkurs',
    }[locale];
  }

  if (mode === 'original_4pt_2024') {
    return {
      de: 'Kangur 2024 · 4-Punkte-Teil',
      en: 'Kangaroo 2024 · 4-point round',
      pl: 'Kangur 2024 · Część za 4 pkt',
    }[locale];
  }

  if (mode === 'original_5pt_2024') {
    return {
      de: 'Kangur 2024 · 5-Punkte-Teil',
      en: 'Kangaroo 2024 · 5-point round',
      pl: 'Kangur 2024 · Część za 5 pkt',
    }[locale];
  }

  return {
    de: 'Kangur 2024 · 3-Punkte-Teil',
    en: 'Kangaroo 2024 · 3-point round',
    pl: 'Kangur 2024 · Część za 3 pkt',
  }[locale];
};

export const formatCompetitionModeDescription = (
  mode: KangurMobileCompetitionMode,
  locale: KangurMobileLocale,
): string => {
  if (mode === 'full_test_2024') {
    return {
      de: 'Der komplette Wettbewerbstest 2024 mit dem vollen Satz der Aufgaben.',
      en: 'The full 2024 competition session with the complete set of tasks.',
      pl: 'Pełna sesja konkursowa z 2024 roku z całym zestawem zadań.',
    }[locale];
  }

  if (mode === 'original_4pt_2024') {
    return {
      de: 'Mittlere Wettbewerbsrunde z 2024 roku z zadaniami za 4 punkty.',
      en: 'The mid competition round from 2024 with the 4-point tasks.',
      pl: 'Środkowa runda konkursu z 2024 roku z zadaniami za 4 punkty.',
    }[locale];
  }

  if (mode === 'original_5pt_2024') {
    return {
      de: 'Trudniejsza runda konkursu z 2024 roku z zadaniami za 5 punktów.',
      en: 'The harder 2024 competition round with the 5-point tasks.',
      pl: 'Trudniejsza runda konkursu z 2024 roku z zadaniami za 5 punktów.',
    }[locale];
  }

  return {
    de: 'Startowa runda konkursu z 2024 roku z zadaniami za 3 punkty.',
    en: 'The starter 2024 competition round with the 3-point tasks.',
    pl: 'Startowa runda konkursu z 2024 roku z zadaniami za 3 punkty.',
  }[locale];
};

export const formatCompetitionTierLabel = (
  pointTier: KangurMobileCompetitionModeItem['pointTier'],
  locale: KangurMobileLocale,
): string => {
  if (pointTier === 'mixed') {
    return {
      de: '3-5 Punkte',
      en: '3-5 points',
      pl: '3-5 punktów',
    }[locale];
  }

  return {
    de: `${pointTier} Punkte`,
    en: `${pointTier} points`,
    pl: `${pointTier} punkty`,
  }[locale];
};

export const formatModeToken = (value: string): string =>
  value.replace(/[-_]+/g, ' ').trim();

export const getCompetitionQuestionPointValue = (
  question: Pick<KangurExamQuestion, 'id'>,
): number => {
  if (question.id.includes('_5pt_')) {
    return 5;
  }
  if (question.id.includes('_4pt_')) {
    return 4;
  }
  return 3;
};

export const getCompetitionChoiceDescription = (
  question: KangurExamQuestion,
  index: number,
): string => {
  const describedChoice = question.choiceDescriptions?.[index]?.trim();
  if (describedChoice) {
    return describedChoice;
  }

  const choice = question.choices[index];
  if (typeof choice === 'number') {
    return String(choice);
  }

  return choice ?? '';
};
