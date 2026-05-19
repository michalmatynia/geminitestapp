import type { KangurTestChoice, KangurTestQuestion } from '@kangur/contracts/kangur-tests';
import { Text, View } from 'react-native';

import { createKangurLessonsCatalogHref } from '../lessons/lessonHref';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  BASE_TONE,
  ChoiceCardButton,
  INDIGO_TONE,
  SUCCESS_TONE,
  WARNING_TONE,
  type Tone,
} from '../shared/KangurAssessmentUi';
import {
  OutlineLink,
  PrimaryButton,
  SectionCard,
  StatusPill,
} from '../shared/KangurAssessmentUi';
import type { KangurMobileLocale, KangurMobileCopy } from '../i18n/kangurMobileI18n';
import { formatKangurMobileQuestionCount } from '../shared/questionCountLabel';
import { createKangurTestsHref } from './testsHref';
import type { KangurMobileTestSuiteItem } from './useKangurMobileTests';

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
        de: `Niveau ${suite.gradeLevel}`,
        en: `Level ${suite.gradeLevel}`,
        pl: `Poziom ${suite.gradeLevel}`,
      }[locale],
    );
  }

  if (suite.category.trim().length > 0) {
    parts.push(
      {
        de: `Kategorie ${suite.category}`,
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
): string => formatKangurMobileQuestionCount(count, locale);

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

const getChoiceTone = (
  isRevealed: boolean,
  isCorrect: boolean,
  isSelected: boolean
): Tone => {
  if (isRevealed) {
    if (isCorrect) return SUCCESS_TONE;
    if (isSelected) return ERROR_TONE;
    return BASE_TONE;
  }
  return isSelected ? INDIGO_TONE : BASE_TONE;
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

  const tone = getChoiceTone(isRevealed, isCorrect, isSelected);

  return (
    <ChoiceCardButton
      description={choice.description?.trim() ? choice.description : undefined}
      disabled={disabled}
      helperText={
        choice.svgContent.trim() !== '' ? (
          <Text
            style={{
              color: '#64748b',
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            {
              {
                de: 'This answer has extra graphics.',
                en: 'This answer includes extra illustration content.',
                pl: 'Ta odpowiedź ma dodatkową ilustrację.',
              }[locale]
            }
          </Text>
        ) : undefined
      }
      indexLabel={label}
      label={choice.text}
      onPress={onPress}
      tone={tone}
    />
  );
}

type TestExplanationViewProps = {
  copy: KangurMobileCopy;
  currentQuestion: KangurTestQuestion;
  selectedChoice: KangurTestChoice | null;
  correctChoice: KangurTestChoice | null;
};

export function TestExplanationView({
  copy,
  currentQuestion,
  selectedChoice,
  correctChoice,
}: TestExplanationViewProps): React.JSX.Element {
  if (selectedChoice === null || correctChoice === null) {
    return (
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {copy({
          de: 'Bitte wähle zuerst eine Antwort.',
          en: 'Select an answer first.',
          pl: 'Najpierw wybierz odpowiedź.',
        })}
      </Text>
    );
  }

  const isCorrect = selectedChoice.label === correctChoice.label;

  return (
    <View style={{ gap: 6 }}>
      <StatusPill
        label={
          isCorrect
            ? copy({ de: 'Richtige Antwort', en: 'Correct answer', pl: 'Dobra odpowiedź' })
            : copy({
                de: 'Falsche Antwort',
                en: 'Wrong answer',
                pl: 'Zła odpowiedź',
              })
        }
        tone={isCorrect ? SUCCESS_TONE : ERROR_TONE}
      />
      <Text style={{ color: '#334155', fontSize: 14, lineHeight: 20 }}>
        {isCorrect
          ? copy({
              de: `Richtig: ${correctChoice.label}. ${correctChoice.text}`,
              en: `Correct: ${correctChoice.label}. ${correctChoice.text}`,
              pl: `Poprawnie: ${correctChoice.label}. ${correctChoice.text}`,
            })
          : copy({
              de: `Richtig: ${correctChoice.label}. ${correctChoice.text}`,
              en: `Correct: ${correctChoice.label}. ${correctChoice.text}`,
              pl: `Poprawnie: ${correctChoice.label}. ${correctChoice.text}`,
            })}
      </Text>
      {currentQuestion.explanation.trim() !== '' ? (
        <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
          {currentQuestion.explanation}
        </Text>
      ) : null}
    </View>
  );
}

type TestPlayerResultsViewProps = {
  score: number;
  maxScore: number;
  scorePercent: number;
  summaryTone: Tone;
  copy: KangurMobileCopy;
  onBackToCatalog: () => void;
};

export function TestPlayerResultsView({
  score,
  maxScore,
  scorePercent,
  summaryTone,
  copy,
  onBackToCatalog,
}: TestPlayerResultsViewProps): React.JSX.Element {
  return (
    <SectionCard title={copy({ de: 'Testergebnis', en: 'Test result', pl: 'Wynik testu' })}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
          {`${score}/${maxScore} pkt · ${scorePercent}%`}
        </Text>
        <StatusPill
          label={`${copy({ de: 'Wynik', en: 'Result', pl: 'Wynik' })}: ${scorePercent}%`}
          tone={summaryTone}
        />
        <PrimaryButton
          label={copy({
            de: 'Zurück zum Katalog',
            en: 'Back to catalog',
            pl: 'Powrót do katalogu',
          })}
          onPress={onBackToCatalog}
          tone={BASE_TONE}
        />
        <View style={{ gap: 8 }}>
          <OutlineLink
            href={RESULTS_ROUTE}
            label={copy({
              de: 'Ergebnisse öffnen',
              en: 'Open results',
              pl: 'Otwórz wyniki',
            })}
          />
          <OutlineLink
            href={PLAN_ROUTE}
            label={copy({
              de: 'Tagesplan öffnen',
              en: 'Go to daily plan',
              pl: 'Przejdź do planu dnia',
            })}
          />
        </View>
      </View>
    </SectionCard>
  );
}

type TestSuiteCardProps = {
  copy: KangurMobileCopy;
  item: KangurMobileTestSuiteItem;
  locale: KangurMobileLocale;
  onOpen: (suiteId: string) => void;
};

export function TestSuiteCard({
  copy,
  item,
  locale,
  onOpen,
}: TestSuiteCardProps): React.JSX.Element {
  const suiteMeta = formatSuiteMeta(item.suite, locale);
  return (
    <SectionCard title={item.suite.title}>
      <View style={{ gap: 10 }}>
        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{formatQuestionCount(item.questionCount, locale)}</Text>
        <View style={{ gap: 4 }}>
          {suiteMeta.map((part) => (
            <Text key={part} style={{ color: '#0f172a', fontSize: 14, fontWeight: '700' }}>
              {part}
            </Text>
          ))}
        </View>
        <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 18 }}>
          {item.suite.description}
        </Text>
        <PrimaryButton
          label={copy({
            de: 'Test starten',
            en: 'Start test',
            pl: 'Uruchom test',
          })}
          onPress={() => {
            onOpen(item.suite.id);
          }}
          tone={INDIGO_TONE}
        />
      </View>
    </SectionCard>
  );
}

export { type Tone, BASE_TONE, OutlineLink, PrimaryButton, SectionCard, StatusPill };
