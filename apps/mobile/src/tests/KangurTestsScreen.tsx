import { useState, useMemo } from 'react';
import { View, Text } from 'react-native';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { useKangurMobileTests } from './useKangurMobileTests';
import { KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import { 
  SectionCard, 
  StatusPill, 
  ChoiceButton, 
  PrimaryButton, 
  TestPlayerResultsView, 
  TestExplanationView, 
  TestSuiteCard 
} from './tests-primitives';
import { 
    WARNING_TONE, 
    BASE_TONE, 
    SUCCESS_TONE 
} from '../shared/KangurMobileUi';
import { 
    formatQuestionProgress, 
    formatPointsLabel, 
    resolveQuestionStatusTone 
} from '../scores/mobileScoreSummary';
import { type KangurTestSuiteItem, type KangurTestQuestion } from '@kangur/contracts/kangur-tests';

// Mock/Stub imports for missing test components
// ... (Imports)

function KangurMobileTestPlayer({
  item,
  onBackToCatalog,
}: {
  item: KangurTestSuiteItem;
  onBackToCatalog: () => void;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const questions = Array.isArray(item.questions) ? (item.questions as KangurTestQuestion[]) : [];

  const scoreInfo = useMemo(() => {
      const score = questions.reduce((total, q) => answers[q.id] === q.correctChoiceLabel ? total + q.pointValue : total, 0);
      const maxScore = questions.reduce((total, q) => total + q.pointValue, 0);
      const scorePercent = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      return { score, maxScore, scorePercent };
  }, [questions, answers]);

  if (finished) {
    return (
      <TestPlayerResultsView
        score={scoreInfo.score}
        maxScore={scoreInfo.maxScore}
        scorePercent={scoreInfo.scorePercent}
        summaryTone={resolveQuestionStatusTone(scoreInfo.scorePercent)}
        onBackToCatalog={onBackToCatalog}
        copy={copy}
      />
    );
  }

  const currentQuestion = questions[currentIndex] ?? null;
  if (currentQuestion === null) {
      return <SectionCard title='Error'><Text>No question.</Text></SectionCard>;
  }

  return (
    <TestPlayerQuestionView
        currentQuestion={currentQuestion}
        currentIndex={currentIndex}
        totalQuestions={questions.length}
        locale={locale as 'de' | 'en' | 'pl'}
        copy={copy}
        answers={answers}
        setAnswers={setAnswers}
        revealedAnswers={revealedAnswers}
        setRevealedAnswers={setRevealedAnswers}
        setCurrentIndex={setCurrentIndex}
        setFinished={setFinished}
    />
  );
}

function QuestionChoices({
    currentQuestion,
    selectedLabel,
    showAnswer,
    handleSelect
}: {
    currentQuestion: KangurTestQuestion,
    selectedLabel: string | null,
    showAnswer: boolean,
    handleSelect: (label: string) => void
}): React.JSX.Element {
    return (
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
                    onPress={() => handleSelect(choice.label)}
                />
            ))}
        </View>
    );
}

   
 function TestControls({
    currentIndex,
    _totalQuestions,
    isAnswered,
    showAnswer,
    handleReveal,
    handleNext,
    setCurrentIndex
}: {
    currentIndex: number,
    _totalQuestions: number,
    isAnswered: boolean,
    showAnswer: boolean,
    handleReveal: () => void,
    handleNext: () => void,
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>
}): React.JSX.Element {
    return (
        <View style={{ gap: 10 }}>
            <PrimaryButton disabled={!isAnswered || showAnswer} label='Reveal' onPress={handleReveal} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
                <PrimaryButton disabled={currentIndex === 0} label='Prev' onPress={() => setCurrentIndex((p) => p - 1)} tone={BASE_TONE} />
                <PrimaryButton disabled={!showAnswer} label='Next' onPress={handleNext} tone={SUCCESS_TONE} />
            </View>
        </View>
    );
}

interface TestPlayerQuestionViewProps {
    currentQuestion: KangurTestQuestion;
    currentIndex: number;
    totalQuestions: number;
    locale: 'de' | 'en' | 'pl';
    copy: (text: Record<string, string>) => string;
    answers: Record<string, string>;
    setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    revealedAnswers: Record<string, boolean>;
    setRevealedAnswers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    setCurrentIndex: React.Dispatch<React.SetStateAction<number>>;
    setFinished: React.Dispatch<React.SetStateAction<boolean>>;
}

function TestPlayerQuestionView(props: TestPlayerQuestionViewProps): React.JSX.Element {
    const { 
        currentQuestion, currentIndex, totalQuestions, locale, copy, answers, 
        setAnswers, revealedAnswers, setRevealedAnswers, setCurrentIndex, setFinished 
    } = props;
    
    const selectedLabel = answers[currentQuestion.id] ?? null;
    const isAnswered = selectedLabel !== null;
    const showAnswer = Boolean(revealedAnswers[currentQuestion.id]);

    const handleSelect = (label: string): void => {
        if (!showAnswer) setAnswers((p) => ({ ...p, [currentQuestion.id]: label }));
    };

    const handleReveal = (): void => {
        if (isAnswered && !showAnswer) setRevealedAnswers((p) => ({ ...p, [currentQuestion.id]: true }));
    };

    const handleNext = (): void => {
        if (currentIndex < totalQuestions - 1) setCurrentIndex((p) => p + 1);
        else setFinished(true);
    };

    const selectedChoice = currentQuestion.choices.find((c) => c.label === selectedLabel) ?? null;
    const correctChoice = currentQuestion.choices.find((c) => c.label === currentQuestion.correctChoiceLabel) ?? null;

    return (
        <SectionCard title={formatQuestionProgress(currentIndex + 1, totalQuestions, locale)}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                <StatusPill label={formatPointsLabel(currentQuestion.pointValue, locale)} tone={WARNING_TONE} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{currentQuestion.prompt}</Text>
            
            <QuestionChoices 
                currentQuestion={currentQuestion} 
                selectedLabel={selectedLabel} 
                showAnswer={showAnswer} 
                handleSelect={handleSelect} 
            />
            
            {showAnswer && <TestExplanationView copy={copy} currentQuestion={currentQuestion} selectedChoice={selectedChoice} correctChoice={correctChoice} />}
            
            <TestControls 
                currentIndex={currentIndex} 
                totalQuestions={totalQuestions} 
                isAnswered={isAnswered} 
                showAnswer={showAnswer} 
                handleReveal={handleReveal} 
                handleNext={handleNext} 
                setCurrentIndex={setCurrentIndex} 
            />
        </SectionCard>
    );
}

export function KangurTestsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  const { suites, isLoading, error, refresh } = useKangurMobileTests(null);
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
