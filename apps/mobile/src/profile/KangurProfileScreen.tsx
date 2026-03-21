import {
  KANGUR_BADGES,
  type KangurAssignmentPlan,
  type KangurAssignmentPriority,
  type KangurLessonMasteryInsight,
  type KangurRecentSession,
} from '@kangur/core';
import { Link, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from '../scores/resultsHref';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { useKangurMobileLearnerProfile } from './useKangurMobileLearnerProfile';

const RESULTS_ROUTE = createKangurResultsHref();

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
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

function Metric({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 14,
        gap: 6,
        backgroundColor: '#f8fafc',
        flexBasis: '48%',
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18 }}>{description}</Text>
    </View>
  );
}

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: tone.borderColor,
        backgroundColor: tone.backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: tone.textColor, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const formatProfileDate = (value: string | null): string => {
  if (!value) {
    return 'brak daty';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'brak daty';
  }

  return parsed.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'short',
  });
};

const formatProfileDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'brak daty';
  }

  return parsed.toLocaleString('pl-PL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatProfileDuration = (value: number): string => {
  const safeValue = Math.max(0, Math.floor(value));
  if (safeValue < 60) {
    return `${safeValue}s`;
  }

  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
};

const getPriorityLabel = (priority: KangurAssignmentPriority): string => {
  if (priority === 'high') {
    return 'Priorytet wysoki';
  }
  if (priority === 'medium') {
    return 'Priorytet sredni';
  }
  return 'Priorytet niski';
};

const getPriorityTone = (priority: KangurAssignmentPriority): Tone => {
  if (priority === 'high') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
      textColor: '#b91c1c',
    };
  }
  if (priority === 'medium') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }
  return {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    textColor: '#1d4ed8',
  };
};

const getMasteryTone = (masteryPercent: number): Tone => {
  if (masteryPercent >= 80) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (masteryPercent >= 60) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }
  return {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
  };
};

const getSessionScoreTone = (accuracyPercent: number): Tone => {
  if (accuracyPercent >= 90) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (accuracyPercent >= 70) {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }
  return {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    textColor: '#b91c1c',
  };
};

const getSessionAccentTone = (operation: string): Tone => {
  if (operation === 'addition') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fde68a',
      textColor: '#b45309',
    };
  }
  if (operation === 'division') {
    return {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
      textColor: '#1d4ed8',
    };
  }
  if (operation === 'multiplication') {
    return {
      backgroundColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      textColor: '#6d28d9',
    };
  }
  if (operation === 'subtraction') {
    return {
      backgroundColor: '#fff1f2',
      borderColor: '#fecdd3',
      textColor: '#be123c',
    };
  }
  if (operation === 'logical_thinking') {
    return {
      backgroundColor: '#f5f3ff',
      borderColor: '#ddd6fe',
      textColor: '#6d28d9',
    };
  }
  if (operation === 'logical_patterns') {
    return {
      backgroundColor: '#eef2ff',
      borderColor: '#c7d2fe',
      textColor: '#4338ca',
    };
  }
  if (operation === 'logical_classification') {
    return {
      backgroundColor: '#ecfeff',
      borderColor: '#a5f3fc',
      textColor: '#0f766e',
    };
  }
  if (operation === 'logical_reasoning') {
    return {
      backgroundColor: '#fff7ed',
      borderColor: '#fdba74',
      textColor: '#c2410c',
    };
  }
  if (operation === 'logical_analogies') {
    return {
      backgroundColor: '#fdf2f8',
      borderColor: '#fbcfe8',
      textColor: '#be185d',
    };
  }
  return {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
    textColor: '#4338ca',
  };
};

function MasteryInsightRow({
  insight,
}: {
  insight: KangurLessonMasteryInsight;
}): React.JSX.Element {
  const masteryTone = getMasteryTone(insight.masteryPercent);

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {insight.emoji} {insight.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            Proby: {insight.attempts} · ostatni wynik {insight.lastScorePercent}%
          </Text>
        </View>
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        Najlepszy wynik: {insight.bestScorePercent}% · Ostatnia proba:{' '}
        {formatProfileDate(insight.lastCompletedAt)}
      </Text>
    </View>
  );
}

function SessionRow({
  session,
}: {
  session: KangurRecentSession;
}): React.JSX.Element {
  const operationTone = getSessionAccentTone(session.operation);
  const lessonHref = createKangurLessonHrefForPracticeOperation(session.operation);

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 10,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', gap: 10, flex: 1 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: operationTone.borderColor,
              backgroundColor: operationTone.backgroundColor,
            }}
          >
            <Text style={{ fontSize: 18 }}>{session.operationEmoji}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
              {session.operationLabel}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              {formatProfileDateTime(session.createdAt)}
            </Text>
          </View>
        </View>
        <Pill
          label={`${session.score}/${session.totalQuestions}`}
          tone={getSessionScoreTone(session.accuracyPercent)}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill label={`Skutecznosc ${session.accuracyPercent}%`} tone={operationTone} />
        <Pill
          label={`Czas ${formatProfileDuration(session.timeTakenSeconds)}`}
          tone={{
            backgroundColor: '#f1f5f9',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={createKangurPracticeHref(session.operation)} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              Trenuj ponownie
            </Text>
          </Pressable>
        </Link>

        {lessonHref ? (
          <Link href={lessonHref} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                Otworz lekcje
              </Text>
            </Pressable>
          </Link>
        ) : null}

        <Link
          href={createKangurResultsHref({
            operation: session.operation,
          })}
          asChild
        >
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#cbd5e1',
              backgroundColor: '#ffffff',
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>
              Historia trybu
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

function AssignmentRow({
  assignment,
  href,
}: {
  assignment: KangurAssignmentPlan;
  href: Href | null;
}): React.JSX.Element {
  const priorityTone = getPriorityTone(assignment.priority);

  return (
    <View
      style={{
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
        gap: 8,
      }}
    >
      <Pill label={getPriorityLabel(assignment.priority)} tone={priorityTone} />
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        Cel: {assignment.target}
      </Text>
      {href ? (
        <Link href={href} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#1d4ed8',
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {translateKangurMobileActionLabel(assignment.action.label)}
            </Text>
          </Pressable>
        </Link>
      ) : (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: '#e2e8f0',
            paddingHorizontal: 14,
            paddingVertical: 10,
          }}
        >
          <Text style={{ color: '#475569', fontWeight: '700' }}>
            {translateKangurMobileActionLabel(assignment.action.label)} · wkrotce
          </Text>
        </View>
      )}
    </View>
  );
}

export function KangurProfileScreen(): React.JSX.Element {
  const {
    assignments,
    authError,
    authMode,
    canNavigateToRecommendation,
    displayName,
    getActionHref,
    isAuthenticated,
    isLoadingAuth,
    isLoadingScores,
    masteryInsights,
    recommendationsNote,
    refreshScores,
    scoresError,
    signIn,
    supportsLearnerCredentials,
    snapshot,
  } = useKangurMobileLearnerProfile();

  const xpToNextLevel = snapshot.nextLevel
    ? Math.max(0, snapshot.nextLevel.minXp - snapshot.totalXp)
    : 0;
  const hasRecentSessions = snapshot.recentSessions.length > 0;

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
              Dane i postep
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              Profil ucznia
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {isLoadingAuth && !isAuthenticated
                ? 'Przywracamy sesje ucznia i zapisane statystyki.'
                : `Statystyki ucznia: ${displayName}.`}
            </Text>

            {isLoadingAuth && !isAuthenticated ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Sprawdzamy zapisana sesje ucznia. Po zakonczeniu przywrocimy
                zsynchronizowane wyniki i lokalny postep.
              </Text>
            ) : !isAuthenticated ? (
              supportsLearnerCredentials ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    Tryb `{authMode}` wymaga loginu ucznia. Formularz logowania jest teraz na
                    ekranie glownym aplikacji.
                  </Text>
                  <Link href='/' asChild>
                    <Pressable
                      accessibilityRole='button'
                      style={{
                        alignSelf: 'flex-start',
                        borderRadius: 999,
                        backgroundColor: '#1d4ed8',
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                        Otworz ekran logowania
                      </Text>
                    </Pressable>
                  </Link>
                </View>
              ) : (
                <Pressable
                  accessibilityRole='button'
                  onPress={() => {
                    void signIn();
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    borderRadius: 999,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    Zaloguj sesje demo
                  </Text>
                </Pressable>
              )
            ) : null}
            {authError ? (
              <Text style={{ color: '#b91c1c', fontSize: 13, lineHeight: 18 }}>
                {authError}
              </Text>
            ) : null}
            <Link href={createKangurPlanHref()} asChild>
              <Pressable
                accessibilityRole='button'
                style={{
                  alignSelf: 'flex-start',
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  backgroundColor: '#ffffff',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                }}
              >
                <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                  Otworz plan dnia
                </Text>
              </Pressable>
            </Link>
          </Card>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              Postep poziomu
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
              {snapshot.level.title}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14 }}>
              Poziom {snapshot.level.level} · {snapshot.totalXp} XP lacznie
            </Text>
            <View
              style={{
                height: 12,
                borderRadius: 999,
                backgroundColor: '#e2e8f0',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${snapshot.levelProgressPercent}%`,
                  height: '100%',
                  backgroundColor: '#4f46e5',
                }}
              />
            </View>
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {snapshot.nextLevel
                ? `Do poziomu ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`
                : 'Maksymalny poziom osiagniety'}
            </Text>
          </Card>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <Metric
              label='Srednia skutecznosc'
              value={`${snapshot.averageAccuracy}%`}
              description={`Najlepsza sesja: ${snapshot.bestAccuracy}%`}
            />
            <Metric
              label='Seria dni'
              value={`${snapshot.currentStreakDays}`}
              description={`Najdluzsza: ${snapshot.longestStreakDays} dni`}
            />
            <Metric
              label='Cel dzienny'
              value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
              description={`Wypelnienie: ${snapshot.dailyGoalPercent}%`}
            />
            <Metric
              label='Odznaki'
              value={`${snapshot.unlockedBadges}/${snapshot.totalBadges}`}
              description='Odblokowane osiagniecia'
            />
          </View>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Opanowanie lekcji
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Mobilny profil pokazuje najmocniejsze i najslabsze obszary na podstawie
                zapisanych lekcji.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={`Sledzone ${masteryInsights.trackedLessons}`}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={`Opanowane ${masteryInsights.masteredLessons}`}
                tone={{
                  backgroundColor: '#ecfdf5',
                  borderColor: '#a7f3d0',
                  textColor: '#047857',
                }}
              />
              <Pill
                label={`Do powtorki ${masteryInsights.lessonsNeedingPractice}`}
                tone={{
                  backgroundColor: '#fff7ed',
                  borderColor: '#fdba74',
                  textColor: '#c2410c',
                }}
              />
            </View>

            {masteryInsights.trackedLessons === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Brak zapisanych prob lekcji. Ukoncz dowolna lekcje, aby zobaczyc mocne strony i
                obszary do powtorki.
              </Text>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                    Do powtorki
                  </Text>
                  {masteryInsights.weakest.length === 0 ? (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      Wszystkie sledzone lekcje sa na bezpiecznym poziomie.
                    </Text>
                  ) : (
                    masteryInsights.weakest.map((insight) => (
                      <MasteryInsightRow key={insight.componentId} insight={insight} />
                    ))
                  )}
                </View>

                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                    Najmocniejsze lekcje
                  </Text>
                  {masteryInsights.strongest.length === 0 ? (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      Najpierw ukoncz kilka lekcji, aby zobaczyc najmocniejsze obszary.
                    </Text>
                  ) : (
                    masteryInsights.strongest.map((insight) => (
                      <MasteryInsightRow key={insight.componentId} insight={insight} />
                    ))
                  )}
                </View>
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Plan na dzis
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Krotka lista kolejnych krokow na podstawie ostatnich wynikow i aktywnosci.
              </Text>
            </View>

            {snapshot.recommendations.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14 }}>
                Brak rekomendacji do wyswietlenia.
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {snapshot.recommendations.map((recommendation) => {
                  const canNavigate = canNavigateToRecommendation(recommendation.action.page);
                  const actionHref = getActionHref(recommendation.action);

                  return (
                    <View
                      key={recommendation.id}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        backgroundColor: '#f8fafc',
                        padding: 14,
                        gap: 8,
                      }}
                    >
                      <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                        {recommendation.priority === 'high'
                          ? 'Priorytet wysoki'
                          : recommendation.priority === 'medium'
                            ? 'Priorytet sredni'
                            : 'Priorytet niski'}
                      </Text>
                      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                        {recommendation.title}
                      </Text>
                      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                        {recommendation.description}
                      </Text>

                      {canNavigate && actionHref ? (
                        <Link href={actionHref} asChild>
                          <Pressable
                            accessibilityRole='button'
                            style={{
                              alignSelf: 'flex-start',
                              borderRadius: 999,
                              backgroundColor: '#1d4ed8',
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                            }}
                          >
                            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                              {translateKangurMobileActionLabel(recommendation.action.label)}
                            </Text>
                          </Pressable>
                        </Link>
                      ) : (
                        <View
                          style={{
                            alignSelf: 'flex-start',
                            borderRadius: 999,
                            backgroundColor: '#e2e8f0',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <Text style={{ color: '#475569', fontWeight: '700' }}>
                            {translateKangurMobileActionLabel(recommendation.action.label)} · wkrotce
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
              {recommendationsNote}
            </Text>
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Ostatnie sesje
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Widok ostatnich prob i rytmu pracy ucznia. To zastapi bardziej rozbudowana historie
                po porcie kolejnych ekranow.
              </Text>
            </View>

            {isLoadingScores ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Sprawdzamy ostatnie podejscia ucznia.
              </Text>
            ) : scoresError ? (
              <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>{scoresError}</Text>
            ) : !hasRecentSessions ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Brak rozegranych sesji. Pierwsze podejscia pojawia sie tutaj automatycznie.
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {snapshot.recentSessions.map((session) => (
                  <SessionRow key={session.id} session={session} />
                ))}

                <Link href={RESULTS_ROUTE} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      alignSelf: 'flex-start',
                      borderRadius: 999,
                      backgroundColor: '#f1f5f9',
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                      Otworz cala historie
                    </Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Odznaki
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Pelna siatka odznak jest juz wspolna dla web i mobile, wiec tutaj pokazujemy stan
                odblokowania bez dodatkowej logiki platformowej.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {KANGUR_BADGES.map((badge) => {
                const unlocked = snapshot.unlockedBadgeIds.includes(badge.id);
                return (
                  <Pill
                    key={badge.id}
                    label={`${badge.emoji} ${badge.name}`}
                    tone={
                      unlocked
                        ? {
                            backgroundColor: '#eef2ff',
                            borderColor: '#c7d2fe',
                            textColor: '#4338ca',
                          }
                        : {
                            backgroundColor: '#f8fafc',
                            borderColor: '#e2e8f0',
                            textColor: '#64748b',
                          }
                    }
                  />
                );
              })}
            </View>
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                Zadania na teraz
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                To lekka wersja planera zadan. Pelny panel przypisanych zadan zostanie przeniesiony
                pozniej razem z trasami Game i Lessons.
              </Text>
            </View>

            <View style={{ gap: 10 }}>
              {assignments.map((assignment) => (
                <AssignmentRow
                  key={assignment.id}
                  assignment={assignment}
                  href={getActionHref(assignment.action)}
                />
              ))}
            </View>
          </Card>

          <Card>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View style={{ gap: 4, flex: 1 }}>
                <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                  Historia wynikow
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {isLoadingScores
                    ? 'Pobieramy zapisane podejscia dla profilu.'
                    : scoresError ??
                      'W tej wersji mobilnej historia wynikow jest tylko dodatkiem do lokalnego postepu.'}
                </Text>
              </View>
              <Pressable
                accessibilityRole='button'
                onPress={() => {
                  void refreshScores();
                }}
                style={{
                  borderRadius: 999,
                  backgroundColor: '#0f172a',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>Odswiez</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
