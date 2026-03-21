import {
  completeKangurPracticeSession,
  generateKangurLogicPracticeQuestions,
  generateTrainingQuestions,
  getKangurPracticeOperationConfig,
  isKangurLogicPracticeOperation,
  resolveKangurPracticeOperation,
  type KangurOperation,
  type KangurPracticeCompletionResult,
  type KangurPracticeOperation,
  type KangurPracticeQuestion,
  type KangurQuestionChoice,
} from '@kangur/core';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import { createKangurPlanHref } from '../plan/planHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  buildAwaitingAuthRetryState,
  buildLocalOnlySyncState,
  buildSyncedState,
  buildSyncingState,
  buildUnexpectedSyncFailureState,
  resolvePracticeScoreSyncAppearance,
  type PracticeScoreSyncState,
} from './practiceScoreSyncState';
import { resolveKangurPracticeDebugAutoComplete } from './practiceDebugAutoComplete';
import {
  createKangurPracticeDebugRedirectHref,
  resolveKangurPracticeDebugRedirectTarget,
} from './practiceDebugRedirect';
import { useKangurPracticeSyncProof } from './useKangurPracticeSyncProof';

const PRACTICE_QUESTION_COUNT = 8;

const resolvePracticePlayerName = (
  session: ReturnType<typeof useKangurMobileAuth>['session'],
): string => {
  const activeLearnerName = session.user?.activeLearner?.displayName?.trim();
  if (activeLearnerName) {
    return activeLearnerName;
  }

  const fullName = session.user?.full_name?.trim();
  if (fullName) {
    return fullName;
  }

  return 'Uczen mobilny';
};

function Card({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: '#ffffff',
        padding: 18,
        gap: 12,
        shadowColor: '#0f172a',
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

function ChoiceButton({
  label,
  onPress,
  state,
}: {
  label: string;
  onPress: () => void;
  state: 'idle' | 'correct' | 'incorrect' | 'neutral';
}): React.JSX.Element {
  const backgroundColor =
    state === 'correct'
      ? '#ecfdf5'
      : state === 'incorrect'
        ? '#fef2f2'
        : state === 'neutral'
          ? '#f8fafc'
          : '#ffffff';
  const borderColor =
    state === 'correct'
      ? '#86efac'
      : state === 'incorrect'
        ? '#fca5a5'
        : '#cbd5e1';
  const textColor =
    state === 'correct'
      ? '#166534'
      : state === 'incorrect'
        ? '#b91c1c'
        : '#0f172a';

  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 16,
        paddingVertical: 14,
      }}
    >
      <Text style={{ color: textColor, fontSize: 16, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

type PendingPracticeScoreSyncInput = {
  completedRunId: number;
  correctAnswers: number;
  operation: KangurPracticeOperation;
  totalQuestions: number;
};

export function KangurPracticeScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{
    debugAutoComplete?: string | string[];
    debugRedirectTo?: string | string[];
    operation?: string | string[];
  }>();
  const router = useRouter();
  const rawOperation = Array.isArray(params.operation)
    ? params.operation[0]
    : params.operation;
  const debugAutoCompleteMode = __DEV__
    ? resolveKangurPracticeDebugAutoComplete(params.debugAutoComplete)
    : null;
  const debugRedirectTarget = __DEV__
    ? resolveKangurPracticeDebugRedirectTarget(params.debugRedirectTo)
    : null;
  const operation = resolveKangurPracticeOperation(
    typeof rawOperation === 'string' ? rawOperation : null,
  );
  const operationConfig = getKangurPracticeOperationConfig(operation);
  const queryClient = useQueryClient();
  const { isLoadingAuth, session } = useKangurMobileAuth();
  const { apiClient, progressStore } = useKangurMobileRuntime();
  const [runId, setRunId] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [runStartedAt, setRunStartedAt] = useState(() => Date.now());
  const [selectedChoice, setSelectedChoice] = useState<KangurQuestionChoice | null>(null);
  const [completion, setCompletion] = useState<KangurPracticeCompletionResult | null>(null);
  const [scoreSyncState, setScoreSyncState] = useState<PracticeScoreSyncState | null>(
    null,
  );
  const latestRunIdRef = useRef(runId);
  const hasAppliedDebugAutoCompleteRef = useRef(false);
  const hasAppliedDebugRedirectRef = useRef(false);
  const pendingScoreSyncRef = useRef<PendingPracticeScoreSyncInput | null>(null);
  latestRunIdRef.current = runId;

  const questions = useMemo<KangurPracticeQuestion[]>(
    () => {
      if (isKangurLogicPracticeOperation(operation)) {
        return generateKangurLogicPracticeQuestions(
          operation,
          PRACTICE_QUESTION_COUNT,
        );
      }

      return generateTrainingQuestions(
        operationConfig.categories as KangurOperation[],
        'easy',
        PRACTICE_QUESTION_COUNT,
      );
    },
    [operation, operationConfig.categories, runId],
  );

  const currentQuestion = questions[currentIndex] ?? null;
  const isLastQuestion = currentIndex >= questions.length - 1;
  const isChoiceCorrect =
    selectedChoice !== null && currentQuestion
      ? String(selectedChoice) === String(currentQuestion.answer)
      : false;

  const restart = (): void => {
    const nextRunId = latestRunIdRef.current + 1;
    latestRunIdRef.current = nextRunId;
    hasAppliedDebugAutoCompleteRef.current = false;
    hasAppliedDebugRedirectRef.current = false;
    pendingScoreSyncRef.current = null;
    setRunId(nextRunId);
    setCurrentIndex(0);
    setCorrectAnswers(0);
    setRunStartedAt(Date.now());
    setSelectedChoice(null);
    setCompletion(null);
    setScoreSyncState(null);
  };

  const handleChoicePress = (choice: KangurQuestionChoice): void => {
    if (!currentQuestion || selectedChoice !== null) {
      return;
    }

    setSelectedChoice(choice);
  };

  const syncScoreRecord = async (input: {
    correctAnswers: number;
    completedRunId: number;
    operation: KangurPracticeOperation;
    totalQuestions: number;
  }): Promise<void> => {
    if (session.status !== 'authenticated') {
      if (isLoadingAuth) {
        pendingScoreSyncRef.current = input;
        setScoreSyncState(buildAwaitingAuthRetryState());
        return;
      }

      setScoreSyncState(buildLocalOnlySyncState('auth'));
      return;
    }

    pendingScoreSyncRef.current = null;
    setScoreSyncState(buildSyncingState());

    const timeTakenSeconds = Math.max(
      0,
      Math.round((Date.now() - runStartedAt) / 1000),
    );

    try {
      await apiClient.createScore({
        player_name: resolvePracticePlayerName(session),
        score: input.correctAnswers,
        operation: input.operation,
        subject: 'maths',
        total_questions: input.totalQuestions,
        correct_answers: input.correctAnswers,
        time_taken: timeTakenSeconds,
      });

      if (latestRunIdRef.current !== input.completedRunId) {
        return;
      }

      setScoreSyncState(buildSyncedState());
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['kangur-mobile', 'leaderboard'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['kangur-mobile', 'scores'],
        }),
      ]);
    } catch (error) {
      if (latestRunIdRef.current !== input.completedRunId) {
        return;
      }

      const status =
        typeof error === 'object' &&
        error &&
        'status' in error &&
        typeof error.status === 'number'
          ? error.status
          : null;

      if (status === 401 || status === 403) {
        setScoreSyncState(buildLocalOnlySyncState('expected-error'));
        return;
      }

      if (error instanceof TypeError) {
        setScoreSyncState(buildLocalOnlySyncState('expected-error'));
        return;
      }

      setScoreSyncState(buildUnexpectedSyncFailureState());
    }
  };

  const handleNext = (): void => {
    if (!currentQuestion || selectedChoice === null) {
      return;
    }

    const nextCorrectAnswers = isChoiceCorrect ? correctAnswers + 1 : correctAnswers;

    if (isLastQuestion) {
      const completedRunId = runId;
      const progress = progressStore.loadProgress();
      const result = completeKangurPracticeSession({
        progress,
        operation,
        correctAnswers: nextCorrectAnswers,
        totalQuestions: questions.length,
      });
      progressStore.saveProgress(result.updated);
      setCorrectAnswers(nextCorrectAnswers);
      setCompletion(result);
      setSelectedChoice(null);
      void syncScoreRecord({
        correctAnswers: nextCorrectAnswers,
        completedRunId,
        operation,
        totalQuestions: questions.length,
      });
      return;
    }

    setCorrectAnswers(nextCorrectAnswers);
    setCurrentIndex((current) => current + 1);
    setSelectedChoice(null);
  };

  const scoreSyncAppearance = scoreSyncState
    ? resolvePracticeScoreSyncAppearance(scoreSyncState.status)
    : null;
  const lessonHref = createKangurLessonHrefForPracticeOperation(operation);
  const practiceSyncProof = useKangurPracticeSyncProof({
    enabled: __DEV__ && scoreSyncState?.status === 'synced',
    expectedCorrectAnswers: correctAnswers,
    expectedTotalQuestions: questions.length,
    operation,
    runStartedAt,
  });

  useEffect(() => {
    if (!pendingScoreSyncRef.current || isLoadingAuth) {
      return;
    }

    if (session.status !== 'authenticated') {
      pendingScoreSyncRef.current = null;
      setScoreSyncState(buildLocalOnlySyncState('auth'));
      return;
    }

    const pendingInput = pendingScoreSyncRef.current;
    pendingScoreSyncRef.current = null;
    void syncScoreRecord(pendingInput);
  }, [isLoadingAuth, session.status, syncScoreRecord]);

  useEffect(() => {
    if (!debugAutoCompleteMode || completion || hasAppliedDebugAutoCompleteRef.current) {
      return;
    }

    hasAppliedDebugAutoCompleteRef.current = true;

    const completedRunId = runId;
    const autoCorrectAnswers =
      debugAutoCompleteMode === 'perfect' ? questions.length : 0;
    const progress = progressStore.loadProgress();
    const result = completeKangurPracticeSession({
      progress,
      operation,
      correctAnswers: autoCorrectAnswers,
      totalQuestions: questions.length,
    });

    progressStore.saveProgress(result.updated);
    setCurrentIndex(questions.length - 1);
    setCorrectAnswers(autoCorrectAnswers);
    setCompletion(result);
    setSelectedChoice(null);
    void syncScoreRecord({
      correctAnswers: autoCorrectAnswers,
      completedRunId,
      operation,
      totalQuestions: questions.length,
    });
  }, [
    completion,
    debugAutoCompleteMode,
    operation,
    progressStore,
    questions.length,
    runId,
    syncScoreRecord,
  ]);

  useEffect(() => {
    if (
      !debugRedirectTarget ||
      !completion ||
      scoreSyncState?.status !== 'synced' ||
      hasAppliedDebugRedirectRef.current
    ) {
      return;
    }

    hasAppliedDebugRedirectRef.current = true;
    router.replace(
      createKangurPracticeDebugRedirectHref({
        operation,
        target: debugRedirectTarget,
      }),
    );
  }, [completion, debugRedirectTarget, operation, router, scoreSyncState?.status]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fffaf2' }}>
      <ScrollView
        contentContainerStyle={{
          gap: 18,
          paddingHorizontal: 20,
          paddingVertical: 24,
        }}
      >
        <View style={{ gap: 14 }}>
          <Link href='/' asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#e2e8f0',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>Wroc</Text>
            </Pressable>
          </Link>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              Trening mobilny
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {operationConfig.label}
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {operationConfig.kind === 'logic'
                ? 'To pierwszy mobilny quiz logiczny w aplikacji. Korzysta z tekstowych pytan wielokrotnego wyboru i tej samej sciezki zapisu postepu oraz wynikow co trening arytmetyczny.'
                : operationConfig.kind === 'time'
                  ? 'To lekki mobilny trening czasu i kalendarza. Nadal korzysta z prostych pytan wielokrotnego wyboru oraz tej samej sciezki postepu i wynikow.'
                  : 'To pierwszy mobilny zamiennik glownego trybu gry. Na razie obejmuje lekki trening pytan wielokrotnego wyboru dla podstawowych operacji.'}
            </Text>
          </Card>

          {completion ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Podsumowanie
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
                Wynik: {correctAnswers}/{questions.length}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Skutecznosc {completion.scorePercent}% · XP +{completion.xpGained}
                {completion.isPerfect ? ' · Perfekcyjna gra' : ''}
              </Text>
              {scoreSyncState ? (
                <View
                  style={{
                    ...scoreSyncAppearance,
                    borderRadius: 18,
                    borderWidth: 1,
                    padding: 12,
                  }}
                >
                  <Text
                    style={{
                      color: scoreSyncAppearance?.textColor ?? '#0f172a',
                      fontSize: 13,
                      lineHeight: 18,
                      fontWeight: '600',
                    }}
                  >
                    {scoreSyncState.message}
                  </Text>
                </View>
              ) : null}
              {__DEV__ && scoreSyncState?.status === 'synced' ? (
                <View
                  style={{
                    borderRadius: 18,
                    borderWidth: 1,
                    borderColor: '#dbeafe',
                    backgroundColor: '#eff6ff',
                    padding: 12,
                    gap: 10,
                  }}
                >
                  <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                    Deweloperski podglad synchronizacji
                  </Text>
                  <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
                    To sprawdza te same mobilne zrodla danych, ktore zasilaja
                    wyniki, profil, plan dnia i ranking.
                  </Text>
                  {practiceSyncProof.isLoading ? (
                    <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
                      Odswiezamy podglad synchronizacji...
                    </Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {practiceSyncProof.snapshot.surfaces.map((surface) => (
                        <View
                          key={surface.label}
                          style={{
                            borderRadius: 14,
                            borderWidth: 1,
                            borderColor:
                              surface.status === 'ready' ? '#86efac' : '#fca5a5',
                            backgroundColor:
                              surface.status === 'ready' ? '#f0fdf4' : '#fef2f2',
                            padding: 10,
                            gap: 4,
                          }}
                        >
                          <Text
                            style={{
                              color:
                                surface.status === 'ready' ? '#166534' : '#b91c1c',
                              fontSize: 13,
                              fontWeight: '800',
                            }}
                          >
                            {surface.label}:{' '}
                            {surface.status === 'ready' ? 'gotowe' : 'brak'}
                          </Text>
                          <Text
                            style={{
                              color:
                                surface.status === 'ready' ? '#166534' : '#991b1b',
                              fontSize: 13,
                              lineHeight: 18,
                            }}
                          >
                            {surface.detail}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {practiceSyncProof.error ? (
                    <Text style={{ color: '#991b1b', fontSize: 13, lineHeight: 18 }}>
                      {practiceSyncProof.error}
                    </Text>
                  ) : null}
                  <Pressable
                    accessibilityRole='button'
                    onPress={() => {
                      void practiceSyncProof.refresh();
                    }}
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#93c5fd',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                    }}
                  >
                    <Text style={{ color: '#1d4ed8', fontWeight: '700' }}>
                      Odswiez podglad
                    </Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {completion.newBadges.map((badgeId) => (
                  <View
                    key={badgeId}
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#c7d2fe',
                      backgroundColor: '#eef2ff',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
                      Nowa odznaka: {badgeId}
                    </Text>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <Pressable
                  accessibilityRole='button'
                  onPress={restart}
                  style={{
                    borderRadius: 999,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>Zagraj ponownie</Text>
                </Pressable>
                <Link
                  href={createKangurResultsHref({
                    operation,
                  })}
                  asChild
                >
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                      Zobacz historie trybu
                    </Text>
                  </Pressable>
                </Link>
                {lessonHref ? (
                  <Link href={lessonHref} asChild>
                    <Pressable
                      accessibilityRole='button'
                      style={{
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: '#cbd5e1',
                        backgroundColor: '#ffffff',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                        Otworz pasujaca lekcje
                      </Text>
                    </Pressable>
                  </Link>
                ) : null}
                <Link href={createKangurPlanHref()} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                      Otworz plan dnia
                    </Text>
                  </Pressable>
                </Link>
                <Link href='/profile' asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      borderRadius: 999,
                      backgroundColor: '#1d4ed8',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>Wroc do profilu</Text>
                  </Pressable>
                </Link>
              </View>
            </Card>
          ) : currentQuestion ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Pytanie {currentIndex + 1} z {questions.length}
              </Text>
              <View
                style={{
                  height: 10,
                  borderRadius: 999,
                  overflow: 'hidden',
                  backgroundColor: '#e2e8f0',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${((currentIndex + 1) / questions.length) * 100}%`,
                    backgroundColor: '#1d4ed8',
                  }}
                />
              </View>
              <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
                {currentQuestion.question}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Wybierz jedna odpowiedz. Wynik zapisze sie lokalnie po zakonczeniu calej serii.
              </Text>

              <View style={{ gap: 10 }}>
                {currentQuestion.choices.map((choice) => {
                  const isSelected =
                    selectedChoice !== null &&
                    String(selectedChoice) === String(choice);
                  const isCorrectChoice =
                    String(choice) === String(currentQuestion.answer);
                  const state =
                    selectedChoice === null
                      ? 'idle'
                      : isCorrectChoice
                        ? 'correct'
                        : isSelected
                          ? 'incorrect'
                          : 'neutral';

                  return (
                    <ChoiceButton
                      key={String(choice)}
                      label={String(choice)}
                      onPress={() => {
                        handleChoicePress(choice);
                      }}
                      state={state}
                    />
                  );
                })}
              </View>

              {selectedChoice !== null ? (
                <View style={{ gap: 10 }}>
                  <Text
                    style={{
                      color: isChoiceCorrect ? '#166534' : '#b91c1c',
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {isChoiceCorrect
                      ? 'Dobra odpowiedz.'
                      : `Poprawna odpowiedz: ${String(currentQuestion.answer)}.`}
                  </Text>
                  <Pressable
                    accessibilityRole='button'
                    onPress={handleNext}
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      backgroundColor: '#0f172a',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                      {isLastQuestion ? 'Zakoncz trening' : 'Nastepne pytanie'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
