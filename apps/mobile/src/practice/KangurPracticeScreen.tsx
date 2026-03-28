import {
  completeKangurPracticeSession,
  generateKangurLogicPracticeQuestions,
  getKangurPracticeOperationConfig,
  isKangurLogicPracticeOperation,
  resolveKangurPracticeOperation,
  type KangurPracticeCompletionResult,
  type KangurPracticeOperation,
  type KangurPracticeQuestion,
} from '@kangur/core/practice';
import { generateTrainingQuestions } from '@kangur/core/math/questions';
import { getLocalizedKangurMetadataBadgeName } from '@kangur/core/progress-i18n';
import type { KangurOperation } from '@kangur/core/math/types';
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
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
} from '../shared/KangurMobileUi';
import {
  ChoiceButton,
  LessonCheckpointRow,
  LessonMasteryRow,
  PracticeAssignmentRow,
  PracticeBadgeChip,
  PracticeRecentResultRow,
} from './practice-primitives';
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
  PRACTICE_COUNT_TONE,
  PRACTICE_KIND_TONE,
  PRACTICE_QUESTION_COUNT,
  PROFILE_ROUTE,
  formatPracticeAnswerFeedback,
  formatPracticeDuelRecord,
  formatPracticeProgressLabel,
  formatPracticeQuestionCountLabel,
  formatPracticeResultLabel,
  formatPracticeSummaryMeta,
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
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Vor dem Start',
                  en: 'Before you start',
                  pl: 'Przed startem',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>
                {copy({
                  de: 'Trainingsplan',
                  en: 'Session plan',
                  pl: 'Plan sesji',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Zum Start siehst du hier den Umfang der Serie, den Speicherweg und die schnellsten Wege zurück zu Lektionen, Verlauf und Tagesplan.',
                  en: 'At the start, this shows the run size, the save path, and the quickest routes back to lessons, history, and the daily plan.',
                  pl: 'Na starcie widzisz tutaj rozmiar serii, sposób zapisu oraz najszybsze przejścia do lekcji, historii i planu dnia.',
                })}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <Pill
                  label={formatPracticeQuestionCountLabel(questions.length, locale)}
                  tone={PRACTICE_COUNT_TONE}
                />
                <Pill
                  label={getPracticeKindChipLabel(operationConfig.kind, locale)}
                  tone={PRACTICE_KIND_TONE}
                />
                <Pill label={practiceSyncPreview.label} tone={practiceSyncPreview.tone} />
              </View>

              <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
                {practiceSyncPreview.body}
              </Text>

              <View style={{ gap: 10 }}>
                {preparationLessonAction}
                <LinkButton
                  borderRadius={16}
                  centered
                  href={practiceModeHistoryHref}
                  label={translateKangurMobileActionLabel('View mode history', locale)}
                  stretch
                  tone='secondary'
                  verticalPadding={12}
                />
                <LinkButton
                  borderRadius={16}
                  centered
                  href={createKangurPlanHref()}
                  label={translateKangurMobileActionLabel('Open daily plan', locale)}
                  stretch
                  tone='secondary'
                  verticalPadding={12}
                />
              </View>
            </Card>
          ) : null}

          {completion ? (
            <Card>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Zusammenfassung',
                  en: 'Summary',
                  pl: 'Podsumowanie',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
                {formatPracticeResultLabel(correctAnswers, questions.length, locale)}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {formatPracticeSummaryMeta(completion, locale)}
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
                    {copy({
                      de: 'Entwickler-Prüfung der Synchronisierung',
                      en: 'Developer sync checks',
                      pl: 'Deweloperskie sprawdzenie synchronizacji',
                    })}
                  </Text>
                  <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
                    {copy({
                      de: 'Das prüft dieselben Daten für Ergebnisse, Profil, Tagesplan und Rangliste, die nach einer Serie aktualisiert werden.',
                      en: 'This checks the same results, profile, daily plan, and leaderboard data used after a run.',
                      pl: 'To sprawdza te same dane wyników, profilu, planu dnia i rankingu, których używamy po serii.',
                    })}
                  </Text>
                  {practiceSyncProof.isLoading ? (
                    <Text style={{ color: '#1e3a8a', fontSize: 13, lineHeight: 18 }}>
                      {copy({
                        de: 'Synchronisierungs-Prüfung wird aktualisiert...',
                        en: 'Refreshing sync checks...',
                        pl: 'Odświeżamy sprawdzenie synchronizacji...',
                      })}
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
                            {surface.status === 'ready'
                              ? copy({
                                  de: 'bereit',
                                  en: 'ready',
                                  pl: 'gotowe',
                                })
                              : copy({
                                  de: 'fehlt',
                                  en: 'missing',
                                  pl: 'brak',
                                })}
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
                      {translateKangurMobileActionLabel('Refresh proof', locale)}
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
                      {copy({
                        de: 'Neues Abzeichen',
                        en: 'New badge',
                        pl: 'Nowa odznaka',
                      })}
                      : {getLocalizedKangurMetadataBadgeName(badgeId, locale, badgeId)}
                    </Text>
                  </View>
                ))}
              </View>
              <InsetPanel gap={10}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Nach dem Training',
                    en: 'After practice',
                    pl: 'Po treningu',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Schneller Rückweg zu Rivalen',
                    en: 'Quick return to rivals',
                    pl: 'Szybki powrót do rywali',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Prüfe den aktuellen Duellstand, sieh die letzten Rivalen und starte einen Rückkampf, ohne die Trainingszusammenfassung zu verlassen.',
                    en: 'Check the current duel standing, see recent rivals, and start a rematch without leaving the practice summary.',
                    pl: 'Sprawdź aktualny stan pojedynków, zobacz ostatnich rywali i wejdź w rewanż bez wychodzenia z podsumowania treningu.',
                  })}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <Pill
                    label={copy({
                      de: `Rivalen ${practiceDuels.opponents.length}`,
                      en: `Rivals ${practiceDuels.opponents.length}`,
                      pl: `Rywale ${practiceDuels.opponents.length}`,
                    })}
                    tone={{
                      backgroundColor: '#eef2ff',
                      borderColor: '#c7d2fe',
                      textColor: '#4338ca',
                    }}
                  />
                  <Pill
                    label={
                      practiceDuels.currentRank
                        ? copy({
                            de: `Deine Position #${practiceDuels.currentRank}`,
                            en: `Your rank #${practiceDuels.currentRank}`,
                            pl: `Twoja pozycja #${practiceDuels.currentRank}`,
                          })
                        : copy({
                            de: 'Wartet auf Sichtbarkeit',
                            en: 'Waiting for visibility',
                            pl: 'Czeka na widoczność',
                          })
                    }
                    tone={{
                      backgroundColor: '#ecfdf5',
                      borderColor: '#a7f3d0',
                      textColor: '#047857',
                    }}
                  />
                </View>

                {practiceDuels.isRestoringAuth || practiceDuels.isLoading ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Der Duellstand nach dem Training wird geladen.',
                      en: 'Loading the post-practice duel standing.',
                      pl: 'Pobieramy stan pojedynków po treningu.',
                    })}
                  </Text>
                ) : practiceDuels.error ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                      {practiceDuels.error}
                    </Text>
                    <ActionButton
                      label={copy({
                        de: 'Duelle aktualisieren',
                        en: 'Refresh duels',
                        pl: 'Odśwież pojedynki',
                      })}
                      onPress={() => {
                        void practiceDuels.refresh();
                      }}
                      tone='primary'
                    />
                  </View>
                ) : !practiceDuels.isAuthenticated ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Melde dich an, um hier deinen Duellstand, letzte Rivalen und schnelle Rueckspiele zu sehen.',
                      en: 'Sign in to see your duel standing, recent rivals, and quick rematches here.',
                      pl: 'Zaloguj się, aby zobaczyć tutaj swój stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 12 }}>
                    {practiceDuels.currentEntry ? (
                      <InsetPanel
                        gap={6}
                        padding={12}
                        style={{
                          borderRadius: 18,
                          borderColor: '#bfdbfe',
                          backgroundColor: '#eff6ff',
                        }}
                      >
                        <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                          {copy({
                            de: 'DEIN DUELLERGEBNIS',
                            en: 'YOUR DUEL RESULT',
                            pl: 'TWÓJ WYNIK W POJEDYNKACH',
                          })}
                        </Text>
                        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                          #{practiceDuels.currentRank} {practiceDuels.currentEntry.displayName}
                        </Text>
                        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                          {formatPracticeDuelRecord(practiceDuels.currentEntry, locale)}
                        </Text>
                      </InsetPanel>
                    ) : (
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {copy({
                          de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                          en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                          pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
                        })}
                      </Text>
                    )}

                    {practiceDuels.actionError ? (
                      <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                        {practiceDuels.actionError}
                      </Text>
                    ) : null}

                    {practiceDuels.opponents.length === 0 ? (
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {copy({
                          de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rueckspiele frei.',
                          en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.',
                          pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
                        })}
                      </Text>
                    ) : (
                      <View style={{ gap: 10 }}>
                        {practiceDuels.opponents.map((opponent) => (
                          <InsetPanel
                            key={opponent.learnerId}
                            gap={6}
                            padding={12}
                            style={{
                              borderRadius: 18,
                              backgroundColor: '#ffffff',
                            }}
                          >
                            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                              {opponent.displayName}
                            </Text>
                            <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                              {copy({
                                de: 'Letztes Duell',
                                en: 'Last duel',
                                pl: 'Ostatni pojedynek',
                              })}{' '}
                              {new Intl.DateTimeFormat(localeTag, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(opponent.lastPlayedAt))}
                            </Text>
                            <KangurMobilePendingActionButton
                              horizontalPadding={12}
                              label={copy({
                                de: 'Schnelles Rueckspiel',
                                en: 'Quick rematch',
                                pl: 'Szybki rewanż',
                              })}
                              onPress={() => {
                                void practiceDuels.createRematch(opponent.learnerId).then((sessionId) => {
                                  if (sessionId) {
                                    openDuelSession(sessionId);
                                  }
                                });
                              }}
                              pending={practiceDuels.pendingOpponentLearnerId === opponent.learnerId}
                              pendingLabel={copy({
                                de: 'Rueckspiel wird gesendet...',
                                en: 'Sending rematch...',
                                pl: 'Wysyłanie rewanżu...',
                              })}
                              verticalPadding={9}
                            />
                          </InsetPanel>
                        ))}
                      </View>
                    )}

                    <View style={{ alignSelf: 'stretch', gap: 10 }}>
                      <ActionButton
                        centered
                        label={copy({
                          de: 'Duelle aktualisieren',
                          en: 'Refresh duels',
                          pl: 'Odśwież pojedynki',
                        })}
                        onPress={() => {
                          void practiceDuels.refresh();
                        }}
                        stretch
                        tone='secondary'
                      />

                      <LinkButton
                        centered
                        href={createKangurDuelsHref()}
                        label={copy({
                          de: 'Duelle oeffnen',
                          en: 'Open duels',
                          pl: 'Otwórz pojedynki',
                        })}
                        stretch
                        tone='secondary'
                      />
                    </View>
                  </View>
                )}
              </InsetPanel>

              <InsetPanel gap={10}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Lektionsbeherrschung',
                    en: 'Lesson mastery',
                    pl: 'Opanowanie lekcji',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Lektionsplan nach dem Training',
                    en: 'Post-practice lesson plan',
                    pl: 'Plan lekcji po treningu',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Verbinde das frische Trainingsergebnis direkt mit lokal gespeichertem Lektionsstand und entscheide sofort, was wiederholt und was nur gehalten werden soll.',
                    en: 'Connect the fresh practice result directly with saved lesson mastery and decide right away what needs review and what only needs maintaining.',
                    pl: 'Połącz świeży wynik treningu z zapisanym opanowaniem lekcji i od razu zdecyduj, co powtórzyć, a co tylko podtrzymać.',
                  })}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View
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
                      {copy({
                        de: `Verfolgt ${lessonMastery.trackedLessons}`,
                        en: `Tracked ${lessonMastery.trackedLessons}`,
                        pl: `Śledzone ${lessonMastery.trackedLessons}`,
                      })}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#a7f3d0',
                      backgroundColor: '#ecfdf5',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#047857', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: `Beherrscht ${lessonMastery.masteredLessons}`,
                        en: `Mastered ${lessonMastery.masteredLessons}`,
                        pl: `Opanowane ${lessonMastery.masteredLessons}`,
                      })}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#fde68a',
                      backgroundColor: '#fffbeb',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
                        en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
                        pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
                      })}
                    </Text>
                  </View>
                </View>

                {lessonMastery.trackedLessons === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
                      en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
                      pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {lessonFocusSummary ? (
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {lessonFocusSummary}
                      </Text>
                    ) : null}

                    <View style={{ alignSelf: 'stretch', gap: 10 }}>
                      {weakestLesson ? (
                        <LinkButton
                          centered
                          href={weakestLesson.lessonHref}
                          label={copy({
                            de: `Fokus: ${weakestLesson.title}`,
                            en: `Focus: ${weakestLesson.title}`,
                            pl: `Skup się: ${weakestLesson.title}`,
                          })}
                          stretch
                          tone='primary'
                        />
                      ) : null}

                      {strongestLesson ? (
                        <LinkButton
                          centered
                          href={strongestLesson.lessonHref}
                          label={copy({
                            de: `Stärke halten: ${strongestLesson.title}`,
                            en: `Maintain strength: ${strongestLesson.title}`,
                            pl: `Podtrzymaj: ${strongestLesson.title}`,
                          })}
                          stretch
                          tone='secondary'
                        />
                      ) : null}
                    </View>

                    {lessonMastery.weakest[0] ? (
                      <LessonMasteryRow
                        insight={lessonMastery.weakest[0]}
                        title={copy({
                          de: 'Zum Wiederholen',
                          en: 'Needs review',
                          pl: 'Do powtórki',
                        })}
                      />
                    ) : null}
                    {lessonMastery.strongest[0] ? (
                      <LessonMasteryRow
                        insight={lessonMastery.strongest[0]}
                        title={copy({
                          de: 'Stärkste Lektion',
                          en: 'Strongest lesson',
                          pl: 'Najmocniejsza lekcja',
                        })}
                      />
                    ) : null}
                  </View>
                )}
              </InsetPanel>

              <InsetPanel gap={10}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Abzeichen',
                    en: 'Badges',
                    pl: 'Odznaki',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Abzeichen-Zentrale',
                    en: 'Badge hub',
                    pl: 'Centrum odznak',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Behalte im Blick, was bereits freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
                    en: 'Keep track of what is already unlocked and which local goal is closest to the next badge threshold.',
                    pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.',
                  })}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View
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
                      {copy({
                        de: `Freigeschaltet ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
                        en: `Unlocked ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
                        pl: `Odblokowane ${practiceBadges.unlockedBadges}/${practiceBadges.totalBadges}`,
                      })}
                    </Text>
                  </View>
                  <View
                    style={{
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#fde68a',
                      backgroundColor: '#fffbeb',
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                    }}
                  >
                    <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: `Offen ${practiceBadges.remainingBadges}`,
                        en: `Remaining ${practiceBadges.remainingBadges}`,
                        pl: `Do zdobycia ${practiceBadges.remainingBadges}`,
                      })}
                    </Text>
                  </View>
                </View>

                {practiceBadges.recentBadges.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
                      en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
                      pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                      {copy({
                        de: 'Zuletzt freigeschaltet',
                        en: 'Recently unlocked',
                        pl: 'Ostatnio odblokowane',
                      })}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {practiceBadges.recentBadges.map((item) => (
                        <PracticeBadgeChip key={item.id} item={item} />
                      ))}
                    </View>
                  </View>
                )}

                <LinkButton
                  href={PROFILE_ROUTE}
                  label={copy({
                    de: 'Profil und Abzeichen öffnen',
                    en: 'Open profile and badges',
                    pl: 'Otwórz profil i odznaki',
                  })}
                  tone='secondary'
                />
              </InsetPanel>

              <InsetPanel gap={10}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Nach dem Training',
                    en: 'After practice',
                    pl: 'Po treningu',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Ergebniszentrale',
                    en: 'Results hub',
                    pl: 'Centrum wyników',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Nach der Runde bleiben die letzten Ergebnisse hier griffbereit, damit du direkt wieder ins Training, die passende Lektion oder die Modus-Historie springen kannst.',
                    en: 'The latest results stay close here so you can jump right back into practice, the matching lesson, or the mode history.',
                    pl: 'Ostatnie wyniki są tutaj pod ręką, aby można było od razu wrócić do treningu, pasującej lekcji albo historii trybu.',
                  })}
                </Text>

                <LinkButton
                  href={createKangurResultsHref()}
                  label={copy({
                    de: 'Vollständigen Verlauf öffnen',
                    en: 'Open full history',
                    pl: 'Otwórz pełną historię',
                  })}
                  tone='secondary'
                />

                {practiceRecentResults.isLoading || practiceRecentResults.isRestoringAuth ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Die letzten Ergebnisse werden geladen.',
                      en: 'Loading recent results.',
                      pl: 'Ładujemy ostatnie wyniki.',
                    })}
                  </Text>
                ) : !practiceRecentResults.isEnabled ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Melde dich an, um hier Ergebnisse zu sehen.',
                      en: 'Sign in to see results here.',
                      pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.',
                    })}
                  </Text>
                ) : practiceRecentResults.error ? (
                  <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                    {practiceRecentResults.error}
                  </Text>
                ) : practiceRecentResults.recentResultItems.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt hier noch keine Ergebnisse. Beende einen Lauf, um diesen Bereich zu füllen.',
                      en: 'There are no results here yet. Finish a run to fill this section.',
                      pl: 'Nie ma tu jeszcze wyników. Ukończ serię, aby wypełnić tę sekcję.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {practiceRecentResults.recentResultItems.map((item) => (
                      <PracticeRecentResultRow key={item.result.id} item={item} />
                    ))}
                  </View>
                )}
              </InsetPanel>

              <InsetPanel gap={10}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Nach dem Training',
                    en: 'After practice',
                    pl: 'Po treningu',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Plan nach dem Training',
                    en: 'Post-practice plan',
                    pl: 'Plan po treningu',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Wandle diese Runde direkt in die nächsten lokalen Schritte um, ohne den Trainingsfluss zu verlieren.',
                    en: 'Turn this run directly into the next local actions without losing the training flow.',
                    pl: 'Zamień tę serię od razu w kolejne lokalne kroki, bez gubienia rytmu treningu.',
                  })}
                </Text>

                {practiceAssignments.assignmentItems.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine lokalen Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
                      en: 'There are no local tasks yet. Open lessons or complete more practice to build the next plan.',
                      pl: 'Nie ma jeszcze lokalnych zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {practiceAssignments.assignmentItems.map((item) => (
                      <PracticeAssignmentRow key={item.assignment.id} item={item} />
                    ))}
                  </View>
                )}
              </InsetPanel>

              <InsetPanel gap={10}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  {copy({
                    de: 'Letzte Lektions-Checkpoints',
                    en: 'Recent lesson checkpoints',
                    pl: 'Ostatnie checkpointy lekcji',
                  })}
                </Text>
                <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                  {copy({
                    de: 'Weiter mit Lektionen',
                    en: 'Continue with lessons',
                    pl: 'Kontynuuj lekcje',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Nach der Runde kannst du direkt zu den zuletzt gespeicherten Lektionen zurückspringen und dann passend weitertrainieren.',
                    en: 'After the run you can jump back to the most recently saved lessons and then continue with matching practice.',
                    pl: 'Po zakończeniu serii możesz wrócić do ostatnio zapisanych lekcji i potem dalej trenować w pasującym trybie.',
                  })}
                </Text>

                {lessonCheckpoints.recentCheckpoints.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
                      en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
                      pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {lessonCheckpoints.recentCheckpoints.map((item) => (
                      <LessonCheckpointRow key={item.componentId} item={item} />
                    ))}
                    <LinkButton
                      href='/lessons'
                      label={copy({
                        de: 'Lektionen öffnen',
                        en: 'Open lessons',
                        pl: 'Otwórz lekcje',
                      })}
                      tone='secondary'
                    />
                  </View>
                )}
              </InsetPanel>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <ActionButton
                  label={translateKangurMobileActionLabel('Train again', locale)}
                  onPress={restart}
                  tone='primary'
                />
                <LinkButton
                  href={practiceModeHistoryHref}
                  label={translateKangurMobileActionLabel('View mode history', locale)}
                  tone='secondary'
                />
                {completionLessonAction}
                <LinkButton
                  href={createKangurPlanHref()}
                  label={translateKangurMobileActionLabel('Open daily plan', locale)}
                  tone='secondary'
                />
                <LinkButton
                  href='/profile'
                  label={translateKangurMobileActionLabel('Back to profile', locale)}
                  tone='brand'
                />
              </View>
            </Card>
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
