import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

const NON_POLISH_QUESTION_COUNT_LABELS = {
  de: {
    singular: 'Frage',
    plural: 'Fragen',
  },
  en: {
    singular: 'question',
    plural: 'questions',
  },
} as const;

const resolvePolishQuestionNoun = (count: number): string => {
  if (count === 1) {
    return 'pytanie';
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  return lastDigit >= 2 &&
    lastDigit <= 4 &&
    (lastTwoDigits < 12 || lastTwoDigits > 14)
    ? 'pytania'
    : 'pytań';
};

export const formatKangurMobileQuestionCount = (
  count: number,
  locale: KangurMobileLocale,
): string => {
  if (locale === 'pl') {
    return `${count} ${resolvePolishQuestionNoun(count)}`;
  }

  const labels = NON_POLISH_QUESTION_COUNT_LABELS[locale];
  return `${count} ${count === 1 ? labels.singular : labels.plural}`;
};
