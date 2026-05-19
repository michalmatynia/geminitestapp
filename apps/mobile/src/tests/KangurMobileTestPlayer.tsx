import React, { useState } from 'react';
import { Text, View } from 'react-native';
import {
  ChoiceButton,
  formatQuestionProgress,
  formatPointsLabel,
  resolveQuestionStatusTone,
  SectionCard,
  PrimaryButton,
  TestExplanationView,
  TestPlayerResultsView,
} from './tests-primitives';
import type { KangurMobileTestSuiteItem } from './useKangurMobileTests';
import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';
import type { KangurTestQuestion } from '@kangur/contracts/kangur-tests';

type TestPlayerProps = {
  item: KangurMobileTestSuiteItem;
  onBackToCatalog: () => void;
  copy: (v: Record<string, string>) => string;
  locale: KangurMobileLocale;
};

type TestPlayerState = {
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  currentIndex: number;
  setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
  finished: boolean;
  setFinished: React.Dispatch<React.SetStateAction<boolean>>;
  revealedAnswers: Record<string, boolean>;
  setRevealedAnswers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  currentQuestion: KangurTestQuestion | null;
  totalScore: number;
  totalPoints: number;
  scorePercent: number;
};

const useTestPlayerState = (questions: KangurMobileTestSuiteItem['questions']): TestPlayerState => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const currentQuestion = questions[currentIndex] ?? null;

  const totalScore = questions.reduce(
    (sum, question) =>
      answers[question.id] === question.correctChoiceLabel ? sum + question.pointValue : sum,
    0,
  );
  const totalPoints = questions.reduce((sum, question) => sum + question.pointValue, 0);
  const scorePercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  return {
    answers,
    setAnswers,
    currentIndex,
    setCurrentIndex,
    finished,
    setFinished,
    revealedAnswers,
    setRevealedAnswers,
    currentQuestion,
    totalScore,
    totalPoints,
    scorePercent,
  };
};

function TestPlayerNoQuestionsView({ copy }: { copy: (v: Record<string, string>) => string }): React.JSX.Element {
  return (
    <SectionCard title={copy({ de: 'Test nicht verfügbar', en: 'Test unavailable', pl: 'Test niedostępny' })}>
      <Text style={{ color: '#475569', fontSize: 14 }}>
        {copy({
          de: 'Dieser Test hat aktuell keine Fragen.',
          en: 'This test currently has no questions.',
          pl: 'Ten test nie ma teraz pytań.',
        })}
      </Text>
    </SectionCard>
  );
}

const TestPlayerChoicesList = ({
  currentQuestion,
  selectedChoiceLabel,
  isRevealed,
  locale,
  onChoicePress,
}: {
  currentQuestion: KangurTestQuestion;
  selectedChoiceLabel: string | null;
  isRevealed: boolean;
  locale: KangurMobileLocale;
  onChoicePress: (label: string) => void;
}): React.JSX.Element => (
  <View style={{ gap: 10 }}>
    {currentQuestion.choices.map((choice, index) => (
      <ChoiceButton
        choice={choice}
        disabled={isRevealed}
        isCorrect={choice.label === currentQuestion.correctChoiceLabel}
        isRevealed={isRevealed}
        isSelected={choice.label === selectedChoiceLabel}
        key={choice.label}
        label={String.fromCharCode(65 + index)}
        locale={locale}
        onPress={() => onChoicePress(choice.label)}
      />
    ))}
  </View>
);

const TestPlayerFooterActions = ({
  isRevealed,
  isAnswered,
  isLastQuestion,
  copy,
  onReveal,
  onNext,
}: {
  isRevealed: boolean;
  isAnswered: boolean;
  isLastQuestion: boolean;
  copy: (v: Record<string, string>) => string;
  onReveal: () => void;
  onNext: () => void;
}): React.JSX.Element => (
  <View style={{ gap: 8 }}>
    {!isRevealed ? (
      <PrimaryButton
        disabled={!isAnswered}
        label={copy({
          de: 'Überprüfen',
          en: 'Check answer',
          pl: 'Sprawdź odpowiedź',
        })}
        onPress={onReveal}
        tone={{ backgroundColor: '#0f172a', borderColor: '#1e293b', textColor: '#f8fafc' }}
      />
    ) : (
      <PrimaryButton
        disabled={!isRevealed}
        label={isLastQuestion ? copy({
          de: 'Test beenden',
          en: 'Finish test',
          pl: 'Zakończ test',
        }) : copy({
          de: 'Nächste Frage',
          en: 'Next question',
          pl: 'Następne pytanie',
        })}
        onPress={onNext}
      />
    )}
  </View>
);

const TestPlayerQuestionContent = ({
  currentQuestion,
  locale,
}: {
  currentQuestion: KangurTestQuestion;
  locale: KangurMobileLocale;
}): React.JSX.Element => (
  <>
    <Text style={{ color: '#334155', fontSize: 13, lineHeight: 18 }}>
      {formatPointsLabel(currentQuestion.pointValue, locale)}
    </Text>
    <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
      {currentQuestion.prompt}
    </Text>
  </>
);

type TestPlayerQuestionState = {
  currentQuestion: KangurTestQuestion;
  selectedChoiceLabel: string | null;
  selectedChoice: KangurTestQuestion['choices'][number] | null;
  correctChoice: KangurTestQuestion['choices'][number] | null;
  isAnswered: boolean;
  isRevealed: boolean;
};

const useTestPlayerQuestionState = (state: TestPlayerState): TestPlayerQuestionState | null => {
  const { currentQuestion, answers, revealedAnswers } = state;
  if (!currentQuestion) return null;

  const selectedChoiceLabel = answers[currentQuestion.id] ?? null;
  const selectedChoice = currentQuestion.choices.find((choice) => choice.label === selectedChoiceLabel) ?? null;
  const correctChoice = currentQuestion.choices.find(
    (choice) => choice.label === currentQuestion.correctChoiceLabel,
  ) ?? null;
  const isAnswered = selectedChoiceLabel !== null;
  const isRevealed = Boolean(revealedAnswers[currentQuestion.id]);

  return {
    currentQuestion,
    selectedChoiceLabel,
    selectedChoice,
    correctChoice,
    isAnswered,
    isRevealed,
  };
};


const TestPlayerQuestionCard = ({
  state,
  questions,
  locale,
  copy,
}: {
  state: TestPlayerState;
  questions: KangurMobileTestSuiteItem['questions'];
  locale: KangurMobileLocale;
  copy: (v: Record<string, string>) => string;
}): React.JSX.Element => {
  const questionState = useTestPlayerQuestionState(state);
  if (!questionState) return <View />;

  const { currentQuestion, selectedChoiceLabel, selectedChoice, correctChoice, isAnswered, isRevealed } = questionState;

  const onChoicePress = (label: string): void => {
    if (!isRevealed) {
      state.setAnswers((previous) => ({ ...previous, [currentQuestion.id]: label }));
    }
  };

  const onReveal = (): void => {
    if (isAnswered && !isRevealed) {
      state.setRevealedAnswers((previous) => ({ ...previous, [currentQuestion.id]: true }));
    }
  };

  const onNext = (): void => {
    if (state.currentIndex < questions.length - 1) {
      state.setCurrentIndex((previous) => previous + 1);
    } else {
      state.setFinished(true);
    }
  };

  return (
    <SectionCard title={formatQuestionProgress(state.currentIndex + 1, questions.length, locale)}>
      <TestPlayerQuestionContent currentQuestion={currentQuestion} locale={locale} />

      <TestPlayerChoicesList
        currentQuestion={currentQuestion}
        selectedChoiceLabel={selectedChoiceLabel}
        isRevealed={isRevealed}
        locale={locale}
        onChoicePress={onChoicePress}
      />

      {isRevealed && (
        <TestExplanationView
          copy={copy}
          currentQuestion={currentQuestion}
          selectedChoice={selectedChoice}
          correctChoice={correctChoice}
        />
      )}

      <TestPlayerFooterActions
        isRevealed={isRevealed}
        isAnswered={isAnswered}
        isLastQuestion={state.currentIndex === questions.length - 1}
        copy={copy}
        onReveal={onReveal}
        onNext={onNext}
      />
    </SectionCard>
  );
};




export function KangurMobileTestPlayer({
  item,
  onBackToCatalog,
  copy,
  locale,
}: TestPlayerProps): React.JSX.Element {
  const questions = Array.isArray(item.questions) ? item.questions : [];
  const state = useTestPlayerState(questions);

  if (state.currentQuestion === null) {
    return <TestPlayerNoQuestionsView copy={copy} />;
  }

  if (state.finished) {
    return (
      <TestPlayerResultsView
        onBackToCatalog={onBackToCatalog}
        score={state.totalScore}
        maxScore={state.totalPoints}
        scorePercent={state.scorePercent}
        summaryTone={resolveQuestionStatusTone(state.scorePercent)}
        copy={copy}
      />
    );
  }

  return <TestPlayerQuestionCard state={state} questions={questions} locale={locale} copy={copy} />;
}
