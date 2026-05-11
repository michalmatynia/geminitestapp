import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileTests } from './useKangurMobileTests';
import { KangurMobileScrollScreen } from '../shared/KangurMobileUi';
import {
  TESTS_ROUTE,
  ChoiceButton,
  formatQuestionProgress,
  formatPointsLabel,
  resolveQuestionStatusTone,
  SectionCard,
  PrimaryButton,
  TestExplanationView,
  TestPlayerResultsView,
  TestSuiteCard,
} from './tests-primitives';
import type { KangurTestQuestion, KangurTestSuiteItem } from '@kangur/contracts/kangur-tests';

type TestPlayerProps = {
  item: KangurTestSuiteItem;
  onBackToCatalog: () => void;
  copy: ReturnType<typeof useKangurMobileI18n>['copy'];
  locale: ReturnType<typeof useKangurMobileI18n>['locale'];
};

function KangurMobileTestPlayer({
  item,
  onBackToCatalog,
  copy,
  locale,
}: TestPlayerProps): React.JSX.Element {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});

  const questions = Array.isArray(item.questions) ? item.questions : [];
  const currentQuestion = questions[currentIndex] ?? null;

  const totalScore = questions.reduce(
    (sum, question) =>
      answers[question.id] === question.correctChoiceLabel ? sum + question.pointValue : sum,
    0,
  );
  const totalPoints = questions.reduce((sum, question) => sum + question.pointValue, 0);
  const scorePercent = totalPoints > 0 ? Math.round((totalScore / totalPoints) * 100) : 0;

  if (currentQuestion === null) {
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

  if (finished) {
    return (
      <TestPlayerResultsView
        onBackToCatalog={onBackToCatalog}
        score={totalScore}
        maxScore={totalPoints}
        scorePercent={scorePercent}
        summaryTone={resolveQuestionStatusTone(scorePercent)}
        copy={copy}
      />
    );
  }

  const selectedChoiceLabel = answers[currentQuestion.id] ?? null;
  const selectedChoice = currentQuestion.choices.find((choice) => choice.label === selectedChoiceLabel) ?? null;
  const correctChoice = currentQuestion.choices.find(
    (choice) => choice.label === currentQuestion.correctChoiceLabel,
  ) ?? null;
  const isAnswered = selectedChoiceLabel !== null;
  const isRevealed = Boolean(revealedAnswers[currentQuestion.id]);

  const revealAnswer = (): void => {
    if (isAnswered && !isRevealed) {
      setRevealedAnswers((previous) => ({ ...previous, [currentQuestion.id]: true }));
    }
  };

  const skipToNext = (): void => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
    } else {
      setFinished(true);
    }
  };

  return (
    <SectionCard
      title={formatQuestionProgress(currentIndex + 1, questions.length, locale)}
    >
      <Text style={{ color: '#334155', fontSize: 13, lineHeight: 18 }}>
        {formatPointsLabel(currentQuestion.pointValue, locale)}
      </Text>
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700', lineHeight: 22 }}>
        {currentQuestion.prompt}
      </Text>

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
            onPress={() => {
              if (!isRevealed) {
                setAnswers((previous) => ({ ...previous, [currentQuestion.id]: choice.label }));
              }
            }}
          />
        ))}
      </View>

      {isRevealed ? (
        <TestExplanationView
          copy={copy}
          currentQuestion={currentQuestion}
          selectedChoice={selectedChoice}
          correctChoice={correctChoice}
        />
      ) : null}

      <View style={{ gap: 8 }}>
        {!isRevealed ? (
          <PrimaryButton
            disabled={!isAnswered}
            label={copy({
              de: 'Überprüfen',
              en: 'Sprawdź odpowiedź',
              pl: 'Sprawdź odpowiedź',
            })}
            onPress={revealAnswer}
            tone={{ backgroundColor: '#0f172a', borderColor: '#1e293b', textColor: '#f8fafc' }}
          />
        ) : (
          <PrimaryButton
            disabled={!isRevealed}
            label={currentIndex + 1 === questions.length ? copy({
              de: 'Test beenden',
              en: 'Finish test',
              pl: 'Zakończ test',
            }) : copy({
              de: 'Nächste Frage',
              en: 'Next question',
              pl: 'Następne pytanie',
            })}
            onPress={skipToNext}
          />
        )}
      </View>
    </SectionCard>
  );
}

export function KangurTestsScreen(): React.JSX.Element {
  const router = useRouter();
  const { copy, locale } = useKangurMobileI18n();
  const params = useLocalSearchParams<{ focus?: string | string[] }>();
  const focusToken = Array.isArray(params.focus) ? params.focus[0] ?? null : params.focus ?? null;

  const { suites, isLoading, error, focusToken: resolvedFocusToken, focusedSuiteId, refresh } =
    useKangurMobileTests(focusToken);

  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(focusedSuiteId);

  const activeSuite = activeSuiteId !== null
    ? suites.find((item) => item.suite.id === activeSuiteId) ?? null
    : null;

  const hasStaleFocus = resolvedFocusToken !== null && focusedSuiteId === null;

  if (isLoading) {
    return (
      <KangurMobileScrollScreen>
        <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
          {copy({ de: 'Tests', en: 'Tests', pl: 'Testy' })}
        </Text>
        <SectionCard title={copy({ de: 'Lade Tests', en: 'Loading tests', pl: 'Ładujemy testy' })}>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Wir laden aktive Tests und veröffentlichte Fragen.',
              en: 'We are loading active test sets and published questions.',
              pl: 'Pobieramy aktywne zestawy testów i ich opublikowane pytania.',
            })}
          </Text>
        </SectionCard>
      </KangurMobileScrollScreen>
    );
  }

  if (activeSuite !== null) {
    return (
      <KangurMobileScrollScreen>
        <KangurMobileTestPlayer
          item={activeSuite}
          copy={copy}
          locale={locale}
          onBackToCatalog={() => setActiveSuiteId(null)}
        />
      </KangurMobileScrollScreen>
    );
  }

  return (
    <KangurMobileScrollScreen>
      <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
        {copy({ de: 'Tests', en: 'Tests', pl: 'Testy' })}
      </Text>
      <KangurMobileAiTutorCard />

      {error !== null ? (
        <SectionCard title={copy({ de: 'Fehler', en: 'Error', pl: 'Błąd' })}>
          <Text style={{ color: '#b91c1c', fontSize: 14 }}>{error}</Text>
          <PrimaryButton label={copy({ de: 'Erneut versuchen', en: 'Retry', pl: 'Spróbuj ponownie' })} onPress={refresh} />
        </SectionCard>
      ) : null}

      {hasStaleFocus ? (
        <SectionCard title={copy({ de: 'Test-Verknüpfung', en: 'Test shortcut', pl: 'Skrót testu' })}>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: 'Der Fokus verweist auf keinen Test.',
              en: 'The focus shortcut does not match an active test.',
              pl: 'Skrót testu nie pasuje do aktywnego testu.',
            })}
          </Text>
          <PrimaryButton
            label={copy({
              de: 'Komplette Übersicht öffnen',
              en: 'Open full catalog',
              pl: 'Otwórz pełny katalog',
            })}
            onPress={() => {
              void router.replace(TESTS_ROUTE);
            }}
            tone={{ backgroundColor: '#334155', borderColor: '#334155', textColor: '#f8fafc' }}
          />
        </SectionCard>
      ) : null}

      <View style={{ gap: 12 }}>
        {suites.map((item) => (
          <TestSuiteCard
            copy={copy}
            item={item}
            key={item.suite.id}
            locale={locale}
            onOpen={setActiveSuiteId}
          />
        ))}
      </View>
    </KangurMobileScrollScreen>
  );
}
