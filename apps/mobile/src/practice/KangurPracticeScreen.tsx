import {
  completeKangurPracticeSession,
  generateKangurLogicPracticeQuestions,
  generateTrainingQuestions,
  getKangurPracticeOperationConfig,
  isKangurLogicPracticeOperation,
  resolveKangurPracticeOperation,
  type KangurPracticeCompletionResult,
  type KangurPracticeOperation,
  type KangurPracticeQuestion,
} from '@kangur/core';
import type { KangurOperation } from '@kangur/core';
import type { KangurQuestionChoice } from '@kangur/contracts/kangur';
import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { KangurAiTutorConversationContext } from '../../../../src/shared/contracts/kangur-ai-tutor';
import { KangurMobileAiTutorCard } from '../ai-tutor/KangurMobileAiTutorCard';
import { useKangurMobileAuth } from '../auth/KangurMobileAuthContext';
import { createKangurDuelsHref } from '../duels/duelsHref';
import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import { useKangurMobileRuntime } from '../providers/KangurRuntimeContext';
import { createKangurResultsHref } from '../scores/resultsHref';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  KangurMobileCard as Card,
  KangurMobileLinkButton as LinkButton,
  KangurMobileScrollScreen,
} from '../shared/KangurMobileUi';
import {
  ChoiceButton,
} from './practice-primitives';
import {
  PracticeCompletionCard,
  PracticePreparationCard,
} from './practice-sections';
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
import { useKangurMobilePracticeAssignments } from './useKangurMobilePracticeAssignments';
import {
  PRACTICE_QUESTION_COUNT,
  PROFILE_ROUTE,
  formatPracticeAnswerFeedback,
  formatPracticeProgressLabel,
  formatPracticeResultLabel,
  getPracticeKindChipLabel,
  getPracticeKindDescription,
  getPracticeSyncPreview,
  resolvePracticePlayerName,
} from './practice-utils';
import { useKangurMobilePracticeDuels } from './useKangurMobilePracticeDuels';
import { useKangurMobilePracticeLessonMastery } from './useKangurMobilePracticeLessonMastery';
import { useKangurMobilePracticeBadges } from './useKangurMobilePracticeBadges';
import { useKangurMobilePracticeRecentResults } from './useKangurMobilePracticeRecentResults';
import { useKangurPracticeSyncProof } from './useKangurPracticeSyncProof';

type PendingPracticeScoreSyncInput = {
  completedRunId: number;
  correctAnswers: number;
  operation: KangurPracticeOperation;
  totalQuestions: number;
};

export function KangurPracticeScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const localeTag = getKangurMobileLocaleTag(locale);
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonMastery = useKangurMobilePracticeLessonMastery();
  const practiceBadges = useKangurMobilePracticeBadges();
  const practiceAssignments = useKangurMobilePracticeAssignments();
  const practiceRecentResults = useKangurMobilePracticeRecentResults();
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
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;
  const lessonFocusSummary = weakestLesson
    ? copy({
        de: `Fokus nach dem Training: ${weakestLesson.title} braucht noch eine kurze Wiederholung, bevor du weiterziehst.`,
        en: `Post-practice focus: ${weakestLesson.title} still needs a short review before you move on.`,
        pl: `Fokus po treningu: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, zanim przejdziesz dalej.`,
      })
    : strongestLesson
      ? copy({
          de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und eignet sich für eine kurze Auffrischung nach dem Training.`,
          en: `Stable strength: ${strongestLesson.title} is holding its level and works well for a short post-practice refresh.`,
          pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i nadaje się na krótkie podtrzymanie po treningu.`,
        })
      : null;
  const operationConfig = getKangurPracticeOperationConfig(operation, locale);
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
          locale,
        );
      }

      return generateTrainingQuestions(
        operationConfig.categories as KangurOperation[],
        'easy',
        PRACTICE_QUESTION_COUNT,
      );
    },
    [locale, operation, operationConfig.categories, runId],
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
        setScoreSyncState(buildAwaitingAuthRetryState(locale));
        return;
      }

      setScoreSyncState(buildLocalOnlySyncState('auth', locale));
      return;
    }

    pendingScoreSyncRef.current = null;
    setScoreSyncState(buildSyncingState(locale));

    const timeTakenSeconds = Math.max(
      0,
      Math.round((Date.now() - runStartedAt) / 1000),
    );

    try {
      await apiClient.createScore({
        player_name: resolvePracticePlayerName(session, locale),
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

      setScoreSyncState(buildSyncedState(locale));
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
        setScoreSyncState(buildLocalOnlySyncState('expected-error', locale));
        return;
      }

      if (error instanceof TypeError) {
        setScoreSyncState(buildLocalOnlySyncState('expected-error', locale));
        return;
      }

      setScoreSyncState(buildUnexpectedSyncFailureState(locale));
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
  const practiceModeHistoryHref = createKangurResultsHref({
    operation,
  });
  const practiceResultsHistoryHref = createKangurResultsHref();
  const practiceDuels = useKangurMobilePracticeDuels();
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
      setScoreSyncState(buildLocalOnlySyncState('auth', locale));
      return;
    }

    const pendingInput = pendingScoreSyncRef.current;
    pendingScoreSyncRef.current = null;
    void syncScoreRecord(pendingInput);
  }, [isLoadingAuth, locale, session.status, syncScoreRecord]);

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

  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };
  const practiceSyncPreview = getPracticeSyncPreview({
    isLoadingAuth,
    locale,
    sessionStatus: session.status,
  });
  let preparationLessonAction = null;
  let completionLessonAction = null;

  if (lessonHref) {
    preparationLessonAction = (
      <LinkButton
        borderRadius={16}
        centered
        href={lessonHref}
        label={translateKangurMobileActionLabel('Open matching lesson', locale)}
        stretch
        tone='primary'
        verticalPadding={12}
      />
    );
    completionLessonAction = (
      <LinkButton
        href={lessonHref}
        label={translateKangurMobileActionLabel('Open matching lesson', locale)}
        tone='secondary'
      />
    );
  }
  const shouldShowPreparationCard = completion === null && currentIndex === 0;
  const practiceTutorContext: KangurAiTutorConversationContext = completion
    ? {
        contentId: 'game:result',
        description: getPracticeKindDescription(operationConfig.kind, locale),
        focusId: 'kangur-game-result-summary',
        focusKind: 'summary',
        masterySummary: formatPracticeResultLabel(correctAnswers, questions.length, locale),
        surface: 'game',
        title: operationConfig.label,
      }
    : shouldShowPreparationCard
      ? {
          contentId: 'game:training-setup',
          description: getPracticeKindDescription(operationConfig.kind, locale),
          focusId: 'kangur-game-training-setup',
          focusKind: 'screen',
          surface: 'game',
          title: operationConfig.label,
        }
      : currentQuestion
        ? {
            answerRevealed: selectedChoice !== null,
            contentId: `game:practice:${operation}`,
            currentQuestion: currentQuestion.question,
            focusId:
              selectedChoice !== null
                ? 'kangur-game-result-summary'
                : 'kangur-game-question-anchor',
            focusKind: selectedChoice !== null ? 'review' : 'question',
            questionProgressLabel: formatPracticeProgressLabel(
              currentIndex + 1,
              questions.length,
              locale,
            ),
            selectedChoiceText:
              selectedChoice !== null ? String(selectedChoice) : undefined,
            surface: 'game',
            title: operationConfig.label,
          }
        : {
            contentId: 'game:training-setup',
            description: getPracticeKindDescription(operationConfig.kind, locale),
            focusId: 'kangur-game-training-setup',
            focusKind: 'screen',
            surface: 'game',
            title: operationConfig.label,
          };

  return (
    <KangurMobileScrollScreen
      contentContainerStyle={{
        gap: 18,
        paddingHorizontal: 20,
        paddingVertical: 24,
      }}
    >
        <View style={{ gap: 14 }}>
          <LinkButton
            href='/'
            label={translateKangurMobileActionLabel('Back', locale)}
          />

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Training',
                en: 'Practice',
                pl: 'Trening',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {operationConfig.label}
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {getPracticeKindDescription(operationConfig.kind, locale)}
            </Text>
          </Card>

          <KangurMobileAiTutorCard context={practiceTutorContext} />

          {shouldShowPreparationCard ? (
            <PracticePreparationCard
              copy={copy}
              locale={locale}
              practiceKindChipLabel={getPracticeKindChipLabel(operationConfig.kind, locale)}
              practiceModeHistoryHref={practiceModeHistoryHref}
              practiceSyncPreview={practiceSyncPreview}
              preparationLessonAction={preparationLessonAction}
              questionsLength={questions.length}
            />
          ) : null}

          {completion ? (
            <PracticeCompletionCard
              completion={completion}
              completionLessonAction={completionLessonAction}
              copy={copy}
              correctAnswers={correctAnswers}
              lessonCheckpoints={lessonCheckpoints}
              lessonFocusSummary={lessonFocusSummary}
              lessonMastery={lessonMastery}
              locale={locale}
              localeTag={localeTag}
              openDuelSession={openDuelSession}
              practiceAssignments={practiceAssignments}
              practiceBadges={practiceBadges}
              practiceDuels={practiceDuels}
              practiceModeHistoryHref={practiceModeHistoryHref}
              practiceRecentResults={practiceRecentResults}
              practiceSyncProof={practiceSyncProof}
              profileHref={PROFILE_ROUTE}
              questionsLength={questions.length}
              restart={restart}
              resultsHistoryHref={practiceResultsHistoryHref}
              scoreSyncAppearance={scoreSyncAppearance}
              scoreSyncState={scoreSyncState}
              shouldShowSyncProof={__DEV__ && scoreSyncState?.status === 'synced'}
              strongestLesson={strongestLesson}
              weakestLesson={weakestLesson}
            />
          ) : currentQuestion ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {formatPracticeProgressLabel(currentIndex + 1, questions.length, locale)}
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
                {copy({
                  de: 'Waehle eine Antwort. Das Ergebnis wird lokal gespeichert, sobald die ganze Runde beendet ist.',
                  en: 'Choose one answer. The result will be saved locally after the whole run finishes.',
                  pl: 'Wybierz jedną odpowiedź. Wynik zapisze się lokalnie po zakończeniu całej serii.',
                })}
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
                    {formatPracticeAnswerFeedback(
                      isChoiceCorrect,
                      String(currentQuestion.answer),
                      locale,
                    )}
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
                        {isLastQuestion
                          ? copy({
                              de: 'Training beenden',
                              en: 'Finish practice',
                              pl: 'Zakończ trening',
                            })
                          : copy({
                              de: 'Naechste Frage',
                              en: 'Next question',
                              pl: 'Następne pytanie',
                            })}
                      </Text>
                    </Pressable>
                </View>
              ) : null}
            </Card>
          ) : null}
        </View>
    </KangurMobileScrollScreen>
  );
}
