import type { KangurTestChoice } from '@kangur/contracts';
import { Pressable, Text, View } from 'react-native';

import { createKangurLessonsCatalogHref } from '../lessons/lessonHref';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  BASE_TONE,
  INDIGO_TONE,
  SUCCESS_TONE,
  WARNING_TONE,
  type Tone,
} from '../shared/KangurAssessmentUi';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import type { KangurMobileTestSuiteItem } from './useKangurMobileTests';
import { createKangurTestsHref } from './testsHref';

export const TESTS_ROUTE = createKangurTestsHref();
export const LESSONS_ROUTE = createKangurLessonsCatalogHref();
export const PRACTICE_ROUTE = createKangurPracticeHref('mixed');
export const PLAN_ROUTE = createKangurPlanHref();
export const RESULTS_ROUTE = createKangurResultsHref();

export const ERROR_TONE: Tone = {
  backgroundColor: '#fef2f2',
  borderColor: '#fecaca',
  textColor: '#b91c1c',
};

export const formatFocusToken = (value: string): string => value.replace(/[-_]+/g, ' ').trim();

export const formatSuiteMeta = (
  suite: KangurMobileTestSuiteItem['suite'],
  locale: KangurMobileLocale,
): string[] => {
  const parts: string[] = [];

  if (typeof suite.year === 'number') {
    parts.push(
      {
        de: `Jahr ${suite.year}`,
        en: `Year ${suite.year}`,
        pl: `Rok ${suite.year}`,
      }[locale],
    );
  }

  if (suite.gradeLevel.trim().length > 0) {
    parts.push(
      {
        de: `Poziom ${suite.gradeLevel}`,
        en: `Level ${suite.gradeLevel}`,
        pl: `Poziom ${suite.gradeLevel}`,
      }[locale],
    );
  }

  if (suite.category.trim().length > 0) {
    parts.push(
      {
        de: `Kategoria ${suite.category}`,
        en: `Category ${suite.category}`,
        pl: `Kategoria ${suite.category}`,
      }[locale],
    );
  }

  return parts;
};

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

export const formatQuestionCount = (
  count: number,
  locale: KangurMobileLocale,
): string => {
  if (locale === 'de') {
    return count === 1 ? '1 Frage' : `${count} Fragen`;
  }

  if (locale === 'en') {
    return count === 1 ? '1 question' : `${count} questions`;
  }

  if (count === 1) {
    return '1 pytanie';
  }

  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14)) {
    return `${count} pytania`;
  }

  return `${count} pytań`;
};

export const formatPointsLabel = (
  value: number,
  locale: KangurMobileLocale,
): string =>
  ({
    de: `${value} Pkt`,
    en: `${value} pts`,
    pl: `${value} pkt`,
  })[locale];

export const resolveQuestionStatusTone = (scorePercent: number): Tone => {
  if (scorePercent >= 80) {
    return SUCCESS_TONE;
  }
  if (scorePercent >= 50) {
    return WARNING_TONE;
  }
  return ERROR_TONE;
};

type ChoiceButtonProps = {
  choice: KangurTestChoice;
  disabled?: boolean;
  isCorrect: boolean;
  isRevealed: boolean;
  isSelected: boolean;
  label: string;
  locale: KangurMobileLocale;
  onPress: () => void;
};

export function ChoiceButton(props: ChoiceButtonProps): React.JSX.Element {
  const {
    choice,
    disabled = false,
    isCorrect,
    isRevealed,
    isSelected,
    label,
    locale,
    onPress,
  } = props;
  const tone = isRevealed
    ? isCorrect
      ? SUCCESS_TONE
      : isSelected
        ? ERROR_TONE
        : BASE_TONE
    : isSelected
      ? INDIGO_TONE
      : BASE_TONE;

  return (
    <Pressable
      accessibilityRole='button'
      disabled={disabled}
      onPress={onPress}
      style={{
        backgroundColor: tone.backgroundColor,
        borderColor: tone.borderColor,
        borderRadius: 20,
        borderWidth: 1,
        gap: 8,
        opacity: disabled ? 0.8 : 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <View
        style={{
          alignItems: 'center',
          flexDirection: 'row',
          gap: 10,
        }}
      >
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderColor: tone.borderColor,
            borderRadius: 999,
            borderWidth: 1,
            height: 28,
            justifyContent: 'center',
            width: 28,
          }}
        >
          <Text style={{ color: '#0f172a', fontWeight: '800' }}>{label}</Text>
        </View>
        <Text
          style={{
            color: '#0f172a',
            flex: 1,
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          {choice.text}
        </Text>
      </View>
      {choice.description ? (
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
          {choice.description}
        </Text>
      ) : null}
      {choice.svgContent.trim().length > 0 ? (
        <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 16 }}>
          {
            {
              de: 'Diese Antwort hat zusatzliche Illustrationen.',
              en: 'This answer includes extra illustration content.',
              pl: 'Ta odpowiedź ma dodatkową ilustrację.',
            }[locale]
          }
        </Text>
      ) : null}
    </Pressable>
  );
}
