import { Text, View } from 'react-native';
import React, { useState } from 'react';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  BASE_TONE,
  INDIGO_TONE,
  OutlineLink,
  PrimaryButton,
  SectionCard,
  StatusPill,
  SUCCESS_TONE,
  WARNING_TONE,
} from '../shared/KangurAssessmentUi';
import { KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import {
  ChoiceButton,
  formatPointsLabel,
  formatQuestionCount,
  formatQuestionProgress,
  formatSuiteMeta,
  resolveQuestionStatusTone,
  RESULTS_ROUTE,
} from './tests-primitives';
import {
  useKangurMobileTests,
  type KangurMobileTestSuiteItem,
} from './useKangurMobileTests';

const TestPlayerResultsView = ({
  score,
  maxScore,
  scorePercent,
  summaryTone,
  onBackToCatalog,
  copy,
}: {
  score: number;
  maxScore: number;
  scorePercent: number;
  summaryTone: { backgroundColor: string; borderColor: string; textColor: string };
  onBackToCatalog: () => void;
  copy: (v: Record<string, string>) => string;
}): React.JSX.Element => (
  <SectionCard title={copy({ de: 'Testergebnis', en: 'Test result', pl: 'Wynik testu' })}>
    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 12 }}>
      <StatusPill
        label={copy({ de: 'Test abgeschlossen', en: 'Test finished', pl: 'Test zakończony' })}
        tone={summaryTone}
      />
      <Text style={{ color: '#0f172a', fontSize: 32, fontWeight: '800' }}>
        {`${scorePercent}%`}
      </Text>
      <Text style={{ color: '#475569', fontSize: 15 }}>
        {`${score} / ${maxScore} points`}
      </Text>
    </View>
    <View style={{ flexDirection: 'column', gap: 12 }}>
      <PrimaryButton
        label={copy({ de: 'Wróć', en: 'Back to catalog', pl: 'Wróć do katalogu' })}
        onPress={onBackToCatalog}
      />
      <OutlineLink
        href={RESULTS_ROUTE}
        label={copy({ de: 'Wyniki', en: 'See all results', pl: 'Zobacz wyniki' })}
      />
    </View>
  </SectionCard>
);

const TestExplanationView = ({
  currentQuestion,
  selectedChoice,
  correctChoice,
  copy,
}: {
  currentQuestion: KangurMobileTestSuiteItem['questions'][number];
  selectedChoice: KangurMobileTestSuiteItem['questions'][number]['choices'][number] | null;
  correctChoice: KangurMobileTestSuiteItem['questions'][number]['choices'][number] | null;
  copy: (v: Record<string, string>) => string;
}): React.JSX.Element => (
  <View
    style={{
      backgroundColor: '#f8fafc',
      borderColor: '#cbd5e1',
      borderRadius: 20,
      borderWidth: 1,
      gap: 8,
      padding: 16,
    }}
  >
    <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '700' }}>
      {selectedChoice?.label === currentQuestion.correctChoiceLabel
        ? copy({ de: 'Dobra', en: 'Correct answer', pl: 'Dobra odpowiedź' })
        : copy({ de: 'Sprawdzona', en: 'Answer reviewed', pl: 'Sprawdzona odpowiedź' })}
    </Text>
    {selectedChoice !== null && (
      <Text style={{ color: '#475569', fontSize: 14 }}>
        {`Wybrano: ${selectedChoice.label}. ${selectedChoice.text}`}
      </Text>
    )}
    {correctChoice !== null && (
      <Text style={{ color: '#475569', fontSize: 14 }}>
        {`Poprawnie: ${correctChoice.label}. ${correctChoice.text}`}
      </Text>
    )}
    {currentQuestion.explanation !== undefined && currentQuestion.explanation.trim().length > 0 && (
      <Text style={{ color: '#334155', fontSize: 14 }}>
        {currentQuestion.explanation.trim()}
      </Text>
    )}
  </View>
);

function KangurMobileTestPlayer({
  item,
  onBackToCatalog,
}: {
  item: KangurMobileTestSuiteItem;
  onBackToCatalog: () => void;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const currentQuestion = item.questions[currentIndex] ?? null;
  const selectedLabel = currentQuestion !== null ? (answers[currentQuestion.id] ?? null) : null;
  const isAnswered = selectedLabel !== null;
  const showAnswer = currentQuestion !== null ? Boolean(revealedAnswers[currentQuestion.id]) : false;

  const score = useMemo(() => item.questions.reduce((total, q) =>
    answers[q.id] === q.correctChoiceLabel ? total + q.pointValue : total, 0), [answers, item.questions]);

  const maxScore = useMemo(() => item.questions.reduce((total, q) => total + q.pointValue, 0), [item.questions]);
  const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const summaryTone = resolveQuestionStatusTone(scorePercent);

  const handleSelect = (label: string): void => {
    if (currentQuestion === null || showAnswer) return;
    setAnswers((p) => ({ ...p, [currentQuestion.id]: label }));
  };

  const handleRevealAnswer = (): void => {
    if (currentQuestion === null || !isAnswered || showAnswer) return;
    setRevealedAnswers((p) => ({ ...p, [currentQuestion.id]: true }));
  };

  const handleNext = (): void => {
    if (currentIndex < item.questions.length - 1) {
      setCurrentIndex((p) => p + 1);
    } else {
      setFinished(true);
    }
  };

  if (finished) {
    return (
      <TestPlayerResultsView
        score={score}
        maxScore={maxScore}
        scorePercent={scorePercent}
        summaryTone={summaryTone}
        onBackToCatalog={onBackToCatalog}
        copy={copy}
      />
    );
  }

  if (currentQuestion === null) return <SectionCard title='Error'><Text>No question.</Text></SectionCard>;

  const selectedChoice = currentQuestion.choices.find((c) => c.label === selectedLabel) ?? null;
  const correctChoice = currentQuestion.choices.find((c) => c.label === currentQuestion.correctChoiceLabel) ?? null;

  return (
    <>
      <SectionCard title={formatQuestionProgress(currentIndex + 1, item.questions.length, locale)}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <StatusPill label={formatPointsLabel(currentQuestion.pointValue, locale)} tone={WARNING_TONE} />
        </View>
        <Text style={{ fontSize: 16, fontWeight: '700' }}>{currentQuestion.prompt}</Text>
        <View style={{ gap: 10 }}>
          {currentQuestion.choices.map((choice) => (
            <ChoiceButton
              choice={choice}
              disabled={showAnswer}
              isCorrect={choice.label === currentQuestion.correctChoiceLabel}
              isRevealed={showAnswer}
              isSelected={choice.label === selectedLabel}
              key={choice.label}
              label={choice.label}
              locale={locale}
              onPress={() => { handleSelect(choice.label); }}
            />
          ))}
        </View>
        {showAnswer && <TestExplanationView copy={copy} currentQuestion={currentQuestion} selectedChoice={selectedChoice} correctChoice={correctChoice} />}
        <View style={{ gap: 10 }}>
          <PrimaryButton disabled={!isAnswered || showAnswer} label={copy({ de: 'Prüfen', en: 'Reveal', pl: 'Sprawdź' })} onPress={handleRevealAnswer} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <PrimaryButton disabled={currentIndex === 0} label='Prev' onPress={() => setCurrentIndex((p) => p - 1)} tone={BASE_TONE} />
            <PrimaryButton disabled={!showAnswer} label='Next' onPress={handleNext} tone={SUCCESS_TONE} />
          </View>
        </View>
      </SectionCard>
    </>
  );
}

const TestSuiteCard = ({ item, onOpen, copy, locale }: {
  item: KangurMobileTestSuiteItem;
  onOpen: (id: string) => void;
  copy: (v: Record<string, string>) => string;
  locale: 'de' | 'en' | 'pl';
}): React.JSX.Element => (
  <SectionCard title={item.suite.title}>
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <StatusPill label={formatQuestionCount(item.questions.length, locale)} tone={INDIGO_TONE} />
      <StatusPill label={formatSuiteMeta(item.suite, locale)[0] ?? ''} tone={BASE_TONE} />
    </View>
    <Text style={{ color: '#475569', fontSize: 14 }}>{item.suite.description}</Text>
    <PrimaryButton label={copy({ de: 'Start', en: 'Start', pl: 'Start' })} onPress={() => onOpen(item.suite.id)} />
  </SectionCard>
);

export function KangurTestsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  const { suites, isLoading, error, refresh } = useKangurMobileTests();
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);

  const activeSuite = activeSuiteId !== null ? suites.find((s) => s.suite.id === activeSuiteId) ?? null : null;

  if (activeSuite !== null) {
    return (
      <KangurMobileScrollScreen title={activeSuite.suite.title}>
        <KangurMobileTestPlayer item={activeSuite} onBackToCatalog={() => setActiveSuiteId(null)} />
      </KangurMobileScrollScreen>
    );
  }

  return (
    <KangurMobileScrollScreen onRefresh={async () => { await refresh(); }} refreshing={isLoading} title='Tests'>
      {isLoading && <Text>Loading...</Text>}
      {error !== null && <Text>{error}</Text>}
      {suites.map((item) => (
        <TestSuiteCard copy={copy} item={item} key={item.suite.id} locale={locale} onOpen={setActiveSuiteId} />
      ))}
    </KangurMobileScrollScreen>
  );
}
