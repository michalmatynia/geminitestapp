import {
  KANGUR_BADGES,
  getLocalizedKangurCoreLessonTitle,
  getLocalizedKangurCoreLevelTitle,
  getLocalizedKangurMetadataBadgeName,
  type KangurAssignmentPlan,
  type KangurAssignmentPriority,
  type KangurLessonMasteryInsight,
  type KangurRecentSession,
} from '@kangur/core';
import { Link, type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createKangurDuelsHref } from '../duels/duelsHref';
import {
  getKangurMobileLocaleTag,
  useKangurMobileI18n,
} from '../i18n/kangurMobileI18n';
import { createKangurLessonHrefForPracticeOperation } from '../lessons/lessonHref';
import {
  useKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem,
} from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import {
  formatKangurMobileScoreOperation,
} from '../scores/mobileScoreSummary';
import { createKangurResultsHref } from '../scores/resultsHref';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { useKangurMobileProfileDuels } from './useKangurMobileProfileDuels';
import { useKangurMobileProfileAssignments } from './useKangurMobileProfileAssignments';
import { useKangurMobileProfileLessonMastery } from './useKangurMobileProfileLessonMastery';
import { useKangurMobileLearnerProfile } from './useKangurMobileLearnerProfile';

const RESULTS_ROUTE = createKangurResultsHref();
const DUELS_ROUTE = createKangurDuelsHref();
const LESSONS_ROUTE = '/lessons' as Href;

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

const formatProfileDate = (
  value: string | null,
  locale: 'pl' | 'en' | 'de',
): string => {
  if (!value) {
    return {
      de: 'kein Datum',
      en: 'no date',
      pl: 'brak daty',
    }[locale];
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      de: 'kein Datum',
      en: 'no date',
      pl: 'brak daty',
    }[locale];
  }

  return parsed.toLocaleDateString(getKangurMobileLocaleTag(locale), {
    day: '2-digit',
    month: 'short',
  });
};

const formatProfileDateTime = (
  value: string,
  locale: 'pl' | 'en' | 'de',
): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      de: 'kein Datum',
      en: 'no date',
      pl: 'brak daty',
    }[locale];
  }

  return parsed.toLocaleString(getKangurMobileLocaleTag(locale), {
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

const getPriorityLabel = (
  priority: KangurAssignmentPriority,
  locale: 'pl' | 'en' | 'de',
): string => {
  if (priority === 'high') {
    return {
      de: 'Hohe Priorität',
      en: 'High priority',
      pl: 'Priorytet wysoki',
    }[locale];
  }
  if (priority === 'medium') {
    return {
      de: 'Mittlere Priorität',
      en: 'Medium priority',
      pl: 'Priorytet średni',
    }[locale];
  }
  return {
    de: 'Niedrige Priorität',
    en: 'Low priority',
    pl: 'Priorytet niski',
  }[locale];
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
  const { copy, locale } = useKangurMobileI18n();
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
            {insight.emoji}{' '}
            {getLocalizedKangurCoreLessonTitle(insight.componentId, locale, insight.title)}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: `Versuche: ${insight.attempts} · letztes Ergebnis ${insight.lastScorePercent}%`,
              en: `Attempts: ${insight.attempts} · last score ${insight.lastScorePercent}%`,
              pl: `Próby: ${insight.attempts} · ostatni wynik ${insight.lastScorePercent}%`,
            })}
          </Text>
        </View>
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis: ${insight.bestScorePercent}% · Letzter Versuch: ${formatProfileDate(insight.lastCompletedAt, locale)}`,
          en: `Best score: ${insight.bestScorePercent}% · Last attempt: ${formatProfileDate(insight.lastCompletedAt, locale)}`,
          pl: `Najlepszy wynik: ${insight.bestScorePercent}% · Ostatnia próba: ${formatProfileDate(insight.lastCompletedAt, locale)}`,
        })}
      </Text>
    </View>
  );
}

function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getMasteryTone(item.masteryPercent);

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
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
            {item.emoji} {item.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: `Letztes Ergebnis: ${item.lastScorePercent}% · Versuche ${item.attempts}`,
              en: `Last score: ${item.lastScorePercent}% · attempts ${item.attempts}`,
              pl: `Ostatni wynik: ${item.lastScorePercent}% · próby ${item.attempts}`,
            })}
          </Text>
        </View>
        <Pill label={`${item.masteryPercent}%`} tone={masteryTone} />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Zuletzt gespeichert: ${formatProfileDateTime(item.lastCompletedAt, locale)} · bestes Ergebnis ${item.bestScorePercent}%`,
          en: `Last saved: ${formatProfileDateTime(item.lastCompletedAt, locale)} · best score ${item.bestScorePercent}%`,
          pl: `Ostatni zapis: ${formatProfileDateTime(item.lastCompletedAt, locale)} · najlepszy wynik ${item.bestScorePercent}%`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={item.lessonHref} asChild>
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
              {copy({
                de: 'Zur Lektion zurück',
                en: 'Return to lesson',
                pl: 'Wróć do lekcji',
              })}
              {`: ${item.title}`}
            </Text>
          </Pressable>
        </Link>

        {item.practiceHref ? (
          <Link href={item.practiceHref} asChild>
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
                {copy({
                  de: 'Danach trainieren',
                  en: 'Practice after',
                  pl: 'Potem trenuj',
                })}
                {`: ${item.title}`}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

function SessionRow({
  session,
}: {
  session: KangurRecentSession;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
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
              {formatKangurMobileScoreOperation(session.operation, locale)}
            </Text>
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              {formatProfileDateTime(session.createdAt, locale)}
            </Text>
          </View>
        </View>
        <Pill
          label={`${session.score}/${session.totalQuestions}`}
          tone={getSessionScoreTone(session.accuracyPercent)}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Trefferquote ${session.accuracyPercent}%`,
            en: `Accuracy ${session.accuracyPercent}%`,
            pl: `Skuteczność ${session.accuracyPercent}%`,
          })}
          tone={operationTone}
        />
        <Pill
          label={copy({
            de: `Zeit ${formatProfileDuration(session.timeTakenSeconds)}`,
            en: `Time ${formatProfileDuration(session.timeTakenSeconds)}`,
            pl: `Czas ${formatProfileDuration(session.timeTakenSeconds)}`,
          })}
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
              {copy({
                de: 'Erneut trainieren',
                en: 'Train again',
                pl: 'Trenuj ponownie',
              })}
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
                {copy({
                  de: 'Lektion öffnen',
                  en: 'Open lesson',
                  pl: 'Otwórz lekcję',
                })}
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
              {copy({
                de: 'Modusverlauf',
                en: 'Mode history',
                pl: 'Historia trybu',
              })}
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
  const { copy, locale } = useKangurMobileI18n();
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
      <Pill
        label={getPriorityLabel(assignment.priority, locale)}
        tone={priorityTone}
      />
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${assignment.target}`,
          en: `Goal: ${assignment.target}`,
          pl: `Cel: ${assignment.target}`,
        })}
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
              {translateKangurMobileActionLabel(assignment.action.label, locale)}
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
            {translateKangurMobileActionLabel(assignment.action.label, locale)} ·{' '}
            {copy({
              de: 'bald',
              en: 'soon',
              pl: 'wkrotce',
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

export function KangurProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { copy, locale } = useKangurMobileI18n();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 3 });
  const profileAssignments = useKangurMobileProfileAssignments();
  const profileLessonMastery = useKangurMobileProfileLessonMastery();
  const {
    authError,
    authMode,
    canNavigateToRecommendation,
    displayName,
    getActionHref,
    isAuthenticated,
    isLoadingAuth,
    isLoadingScores,
    recommendationsNote,
    refreshScores,
    scoresError,
    signIn,
    supportsLearnerCredentials,
    snapshot,
  } = useKangurMobileLearnerProfile();
  const duelProfile = useKangurMobileProfileDuels();

  const xpToNextLevel = snapshot.nextLevel
    ? Math.max(0, snapshot.nextLevel.minXp - snapshot.totalXp)
    : 0;
  const hasRecentSessions = snapshot.recentSessions.length > 0;
  const openDuelSession = (sessionId: string): void => {
    router.replace(createKangurDuelsHref({ sessionId }));
  };

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
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {copy({
                  de: 'Zurück',
                  en: 'Back',
                  pl: 'Wróć',
                })}
              </Text>
            </Pressable>
          </Link>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Daten und Fortschritt',
                en: 'Data and progress',
                pl: 'Dane i postęp',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {copy({
                de: 'Schülerprofil',
                en: 'Learner profile',
                pl: 'Profil ucznia',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {isLoadingAuth && !isAuthenticated
                ? copy({
                    de: 'Die Schulersitzung und die gespeicherten Statistiken werden wiederhergestellt.',
                    en: 'Restoring the learner session and saved stats.',
                    pl: 'Przywracamy sesję ucznia i zapisane statystyki.',
                  })
                : copy({
                    de: `Statistiken für ${displayName}.`,
                    en: `Learner stats: ${displayName}.`,
                    pl: `Statystyki ucznia: ${displayName}.`,
                  })}
            </Text>

            {isLoadingAuth && !isAuthenticated ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Wir prüfen die gespeicherte Schulersitzung. Danach stellen wir synchronisierte Ergebnisse und lokalen Fortschritt wieder her.',
                  en: 'Checking the saved learner session. After that we will restore synchronized results and local progress.',
                  pl: 'Sprawdzamy zapisaną sesję ucznia. Po zakończeniu przywrócimy zsynchronizowane wyniki i lokalny postęp.',
                })}
              </Text>
            ) : !isAuthenticated ? (
              supportsLearnerCredentials ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: `Der Modus \`${authMode}\` verlangt einen Schüler-Login. Das Anmeldeformular befindet sich jetzt auf dem Startbildschirm.`,
                      en: `The \`${authMode}\` mode requires a learner login. The sign-in form is now on the home screen.`,
                      pl: `Tryb \`${authMode}\` wymaga loginu ucznia. Formularz logowania jest teraz na ekranie głównym aplikacji.`,
                    })}
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
                        {copy({
                          de: 'Anmeldebildschirm öffnen',
                          en: 'Open auth screen',
                          pl: 'Otwórz ekran logowania',
                        })}
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
                    {copy({
                      de: 'Demo-Sitzung anmelden',
                      en: 'Sign in demo session',
                      pl: 'Zaloguj sesję demo',
                    })}
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
                    {copy({
                      de: 'Tagesplan öffnen',
                      en: 'Open daily plan',
                      pl: 'Otwórz plan dnia',
                    })}
                  </Text>
                </Pressable>
              </Link>
          </Card>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Level-Fortschritt',
                en: 'Level progress',
                pl: 'Postęp poziomu',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 24, fontWeight: '800' }}>
              {getLocalizedKangurCoreLevelTitle(
                snapshot.level.level,
                snapshot.level.title,
                locale,
              )}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14 }}>
              {copy({
                de: `Level ${snapshot.level.level} · ${snapshot.totalXp} XP insgesamt`,
                en: `Level ${snapshot.level.level} · ${snapshot.totalXp} XP total`,
                pl: `Poziom ${snapshot.level.level} · ${snapshot.totalXp} XP łącznie`,
              })}
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
                ? copy({
                    de: `Bis Level ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
                    en: `To level ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
                    pl: `Do poziomu ${snapshot.nextLevel.level}: ${xpToNextLevel} XP`,
                  })
                : copy({
                    de: 'Maximales Level erreicht',
                    en: 'Maximum level reached',
                    pl: 'Maksymalny poziom osiągnięty',
                  })}
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
              label={copy({
                de: 'Durchschnittliche Trefferquote',
                en: 'Average accuracy',
                pl: 'Średnia skuteczność',
              })}
              value={`${snapshot.averageAccuracy}%`}
              description={copy({
                de: `Beste Sitzung: ${snapshot.bestAccuracy}%`,
                en: `Best session: ${snapshot.bestAccuracy}%`,
                pl: `Najlepsza sesja: ${snapshot.bestAccuracy}%`,
              })}
            />
            <Metric
              label={copy({
                de: 'Tagesserie',
                en: 'Day streak',
                pl: 'Seria dni',
              })}
              value={`${snapshot.currentStreakDays}`}
              description={copy({
                de: `Längste: ${snapshot.longestStreakDays} Tage`,
                en: `Longest: ${snapshot.longestStreakDays} days`,
                pl: `Najdłuższa: ${snapshot.longestStreakDays} dni`,
              })}
            />
            <Metric
              label={copy({
                de: 'Tagesziel',
                en: 'Daily goal',
                pl: 'Cel dzienny',
              })}
              value={`${snapshot.todayGames}/${snapshot.dailyGoalGames}`}
              description={copy({
                de: `Erfüllung: ${snapshot.dailyGoalPercent}%`,
                en: `Completion: ${snapshot.dailyGoalPercent}%`,
                pl: `Wypełnienie: ${snapshot.dailyGoalPercent}%`,
              })}
            />
            <Metric
              label={copy({
                de: 'Abzeichen',
                en: 'Badges',
                pl: 'Odznaki',
              })}
              value={`${snapshot.unlockedBadges}/${snapshot.totalBadges}`}
              description={copy({
                de: 'Freigeschaltete Erfolge',
                en: 'Unlocked achievements',
                pl: 'Odblokowane osiągnięcia',
              })}
            />
          </View>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Duelle',
                  en: 'Duels',
                  pl: 'Pojedynki',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Ein kompakter Blick auf deinen Duellstand und die letzten Rivalen direkt im Profil.',
                  en: 'A compact view of your duel standing and recent rivals directly in the profile.',
                  pl: 'Kompaktowy podgląd Twojego wyniku w pojedynkach i ostatnich rywali bezpośrednio w profilu.',
                })}
              </Text>
            </View>

            {!duelProfile.isAuthenticated ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Melde die Schulersitzung an, um hier den Duellstand und letzte Rivalen zu sehen.',
                  en: 'Sign in the learner session to see duel standing and recent rivals here.',
                  pl: 'Zaloguj sesję ucznia, aby zobaczyć tutaj wynik w pojedynkach i ostatnich rywali.',
                })}
              </Text>
            ) : duelProfile.isRestoringAuth || duelProfile.isLoading ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die Duellstatistiken im Profil werden geladen.',
                  en: 'Loading duel stats in the profile.',
                  pl: 'Pobieramy statystyki pojedynków w profilu.',
                })}
              </Text>
            ) : duelProfile.error ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                  {duelProfile.error}
                </Text>
                <Pressable
                  accessibilityRole='button'
                  onPress={() => {
                    void duelProfile.refresh();
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    borderRadius: 999,
                    backgroundColor: '#0f172a',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    {copy({
                      de: 'Duelle aktualisieren',
                      en: 'Refresh duels',
                      pl: 'Odśwież pojedynki',
                    })}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {duelProfile.currentEntry ? (
                  <View
                    style={{
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#bfdbfe',
                      backgroundColor: '#eff6ff',
                      padding: 14,
                      gap: 8,
                    }}
                  >
                    <Text style={{ color: '#1d4ed8', fontSize: 12, fontWeight: '800' }}>
                      {copy({
                        de: 'DEIN DUELLSTAND',
                        en: 'YOUR DUEL SNAPSHOT',
                        pl: 'TWÓJ WYNIK W POJEDYNKACH',
                      })}
                    </Text>
                    <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                      #{duelProfile.currentRank} {duelProfile.currentEntry.displayName}
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: `Siege ${duelProfile.currentEntry.wins} • Niederlagen ${duelProfile.currentEntry.losses} • Unentschieden ${duelProfile.currentEntry.ties}`,
                        en: `Wins ${duelProfile.currentEntry.wins} • Losses ${duelProfile.currentEntry.losses} • Ties ${duelProfile.currentEntry.ties}`,
                        pl: `Wygrane ${duelProfile.currentEntry.wins} • Porażki ${duelProfile.currentEntry.losses} • Remisy ${duelProfile.currentEntry.ties}`,
                      })}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                      {copy({
                        de: `Matches ${duelProfile.currentEntry.matches} • Quote ${Math.round(duelProfile.currentEntry.winRate * 100)}% • letztes Duell ${formatProfileDateTime(duelProfile.currentEntry.lastPlayedAt, locale)}`,
                        en: `Matches ${duelProfile.currentEntry.matches} • Win rate ${Math.round(duelProfile.currentEntry.winRate * 100)}% • last duel ${formatProfileDateTime(duelProfile.currentEntry.lastPlayedAt, locale)}`,
                        pl: `Mecze ${duelProfile.currentEntry.matches} • Win rate ${Math.round(duelProfile.currentEntry.winRate * 100)}% • ostatni pojedynek ${formatProfileDateTime(duelProfile.currentEntry.lastPlayedAt, locale)}`,
                      })}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Dein Konto ist noch nicht im aktuellen Kurz-Ranking der Duelle sichtbar.',
                      en: 'Your account is not yet visible in the current compact duel ranking.',
                      pl: 'Twojego konta nie ma jeszcze w bieżącym skrócie rankingu pojedynków.',
                    })}
                  </Text>
                )}

                {duelProfile.actionError ? (
                  <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                    {duelProfile.actionError}
                  </Text>
                ) : null}

                {duelProfile.opponents.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine letzten Rivalen. Beende das erste Duell, damit hier schnelle Rückkämpfe erscheinen.',
                      en: 'There are no recent rivals yet. Finish the first duel to unlock quick rematches here.',
                      pl: 'Nie ma jeszcze ostatnich rywali. Zakończ pierwszy pojedynek, aby odblokować tutaj szybkie rewanże.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                      {copy({
                        de: 'Letzte Rivalen',
                        en: 'Recent rivals',
                        pl: 'Ostatni rywale',
                      })}
                    </Text>
                    {duelProfile.opponents.map((opponent) => (
                      <View
                        key={opponent.learnerId}
                        style={{
                          borderRadius: 20,
                          borderWidth: 1,
                          borderColor: '#e2e8f0',
                          backgroundColor: '#f8fafc',
                          padding: 14,
                          gap: 8,
                        }}
                      >
                        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                          {opponent.displayName}
                        </Text>
                        <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                          {copy({
                            de: `Letztes Duell ${formatProfileDateTime(opponent.lastPlayedAt, locale)}`,
                            en: `Last duel ${formatProfileDateTime(opponent.lastPlayedAt, locale)}`,
                            pl: `Ostatni pojedynek ${formatProfileDateTime(opponent.lastPlayedAt, locale)}`,
                          })}
                        </Text>
                        <Pressable
                          accessibilityRole='button'
                          disabled={duelProfile.isActionPending}
                          onPress={() => {
                            void duelProfile.createRematch(opponent.learnerId).then((sessionId) => {
                              if (sessionId) {
                                openDuelSession(sessionId);
                              }
                            });
                          }}
                          style={{
                            alignSelf: 'flex-start',
                            borderRadius: 999,
                            backgroundColor: duelProfile.isActionPending ? '#94a3b8' : '#1d4ed8',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                            {duelProfile.pendingOpponentLearnerId === opponent.learnerId
                              ? copy({
                                  de: 'Rückkampf wird gesendet...',
                                  en: 'Sending rematch...',
                                  pl: 'Wysyłanie rewanżu...',
                                })
                              : copy({
                                  de: 'Schneller Rückkampf',
                                  en: 'Quick rematch',
                                  pl: 'Szybki rewanż',
                                })}
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                <Link href={DUELS_ROUTE} asChild>
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
                      {copy({
                        de: 'Duelle öffnen',
                        en: 'Open duels',
                        pl: 'Otwórz pojedynki',
                      })}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Letzte Lektions-Checkpoints',
                  en: 'Recent lesson checkpoints',
                  pl: 'Ostatnie checkpointy lekcji',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Das Profil zeigt die zuletzt lokal gespeicherten Lektionsstände, damit du genau an der letzten Stelle wieder einsteigen kannst.',
                  en: 'The profile shows the most recently saved lesson states so you can resume exactly where the latest lesson was stored.',
                  pl: 'Profil pokazuje ostatnio zapisane stany lekcji, aby można było wrócić dokładnie do miejsca ostatniego zapisu.',
                })}
              </Text>
            </View>

            {lessonCheckpoints.recentCheckpoints.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit er hier erscheint.',
                  en: 'There are no saved checkpoints yet. Open a lesson and save the first state so it appears here.',
                  pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawił się tutaj.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {lessonCheckpoints.recentCheckpoints.map((item) => (
                  <LessonCheckpointRow key={item.componentId} item={item} />
                ))}

                <Link href={LESSONS_ROUTE} asChild>
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
                      {copy({
                        de: 'Lektionen öffnen',
                        en: 'Open lessons',
                        pl: 'Otwórz lekcje',
                      })}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Lektionsbeherrschung',
                  en: 'Lesson mastery',
                  pl: 'Opanowanie lekcji',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Das mobile Profil zeigt die stärksten und schwächsten Bereiche auf Basis gespeicherter Lektionen.',
                  en: 'The mobile profile shows the strongest and weakest areas based on saved lessons.',
                  pl: 'Mobilny profil pokazuje najmocniejsze i najsłabsze obszary na podstawie zapisanych lekcji.',
                })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={copy({
                  de: `Verfolgt ${profileLessonMastery.trackedLessons}`,
                  en: `Tracked ${profileLessonMastery.trackedLessons}`,
                  pl: `Śledzone ${profileLessonMastery.trackedLessons}`,
                })}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={copy({
                  de: `Beherrscht ${profileLessonMastery.masteredLessons}`,
                  en: `Mastered ${profileLessonMastery.masteredLessons}`,
                  pl: `Opanowane ${profileLessonMastery.masteredLessons}`,
                })}
                tone={{
                  backgroundColor: '#ecfdf5',
                  borderColor: '#a7f3d0',
                  textColor: '#047857',
                }}
              />
              <Pill
                label={copy({
                  de: `Zum Wiederholen ${profileLessonMastery.lessonsNeedingPractice}`,
                  en: `Needs review ${profileLessonMastery.lessonsNeedingPractice}`,
                  pl: `Do powtórki ${profileLessonMastery.lessonsNeedingPractice}`,
                })}
                tone={{
                  backgroundColor: '#fff7ed',
                  borderColor: '#fdba74',
                  textColor: '#c2410c',
                }}
              />
            </View>

            {profileLessonMastery.trackedLessons === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt keine gespeicherten Lektionsversuche. Schließe eine beliebige Lektion ab, um Stärken und Wiederholungsbereiche zu sehen.',
                  en: 'There are no saved lesson attempts. Complete any lesson to see strengths and review areas.',
                  pl: 'Brak zapisanych prób lekcji. Ukończ dowolną lekcję, aby zobaczyć mocne strony i obszary do powtórki.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 14 }}>
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                    {copy({
                      de: 'Zum Wiederholen',
                      en: 'Needs review',
                      pl: 'Do powtórki',
                    })}
                  </Text>
                  {profileLessonMastery.weakest.length === 0 ? (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Alle verfolgten Lektionen sind auf einem sicheren Niveau.',
                        en: 'All tracked lessons are at a safe level.',
                        pl: 'Wszystkie śledzone lekcje są na bezpiecznym poziomie.',
                      })}
                    </Text>
                  ) : (
                    profileLessonMastery.weakest.map((insight) => (
                      <MasteryInsightRow key={insight.componentId} insight={insight} />
                    ))
                  )}
                </View>

                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
                    {copy({
                      de: 'Stärkste Lektionen',
                      en: 'Strongest lessons',
                      pl: 'Najmocniejsze lekcje',
                    })}
                  </Text>
                  {profileLessonMastery.strongest.length === 0 ? (
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Schließe zuerst ein paar Lektionen ab, um die stärksten Bereiche zu sehen.',
                        en: 'Finish a few lessons first to see the strongest areas.',
                        pl: 'Najpierw ukończ kilka lekcji, aby zobaczyć najmocniejsze obszary.',
                      })}
                    </Text>
                  ) : (
                    profileLessonMastery.strongest.map((insight) => (
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
                {copy({
                  de: 'Plan für heute',
                  en: 'Plan for today',
                  pl: 'Plan na dziś',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Eine kurze Liste der nächsten Schritte auf Basis der letzten Ergebnisse und Aktivitäten.',
                  en: 'A short list of the next steps based on recent results and activity.',
                  pl: 'Krótka lista kolejnych kroków na podstawie ostatnich wyników i aktywności.',
                })}
              </Text>
            </View>

            {snapshot.recommendations.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14 }}>
                {copy({
                  de: 'Keine Empfehlungen zum Anzeigen.',
                  en: 'No recommendations to show.',
                  pl: 'Brak rekomendacji do wyświetlenia.',
                })}
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
                        {getPriorityLabel(recommendation.priority, locale)}
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
                              {translateKangurMobileActionLabel(
                                recommendation.action.label,
                                locale,
                              )}
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
                            {translateKangurMobileActionLabel(
                              recommendation.action.label,
                              locale,
                            )}{' '}
                            ·{' '}
                            {copy({
                              de: 'bald',
                              en: 'soon',
                              pl: 'wkrotce',
                            })}
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
                {copy({
                  de: 'Letzte Sitzungen',
                  en: 'Recent sessions',
                  pl: 'Ostatnie sesje',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Eine Übersicht der letzten Versuche und des Lernrhythmus. Sie ersetzt die ausführlichere Historie, bis weitere Screens portiert sind.',
                  en: 'A view of the latest attempts and the learner rhythm. This replaces the more advanced history until the remaining screens are ported.',
                  pl: 'Widok ostatnich prób i rytmu pracy ucznia. To zastąpi bardziej rozbudowaną historię po porcie kolejnych ekranów.',
                })}
              </Text>
            </View>

            {isLoadingScores ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die letzten Versuche des Lernenden werden geladen.',
                  en: 'Checking the learner recent attempts.',
                  pl: 'Sprawdzamy ostatnie podejścia ucznia.',
                })}
              </Text>
            ) : scoresError ? (
              <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>{scoresError}</Text>
            ) : !hasRecentSessions ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt noch keine gespielten Sitzungen. Die ersten Versuche erscheinen hier automatisch.',
                  en: 'There are no completed sessions yet. The first attempts will appear here automatically.',
                  pl: 'Brak rozegranych sesji. Pierwsze podejścia pojawią się tutaj automatycznie.',
                })}
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
                      {copy({
                        de: 'Gesamte Historie öffnen',
                        en: 'Open full history',
                        pl: 'Otwórz całą historię',
                      })}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Abzeichen',
                  en: 'Badges',
                  pl: 'Odznaki',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Das vollständige Abzeichenraster ist bereits zwischen Web und Mobile geteilt, daher zeigen wir hier nur den Freischaltstatus ohne zusätzliche Plattformlogik.',
                  en: 'The full badge grid is already shared between web and mobile, so this view only shows the unlock state without extra platform logic.',
                  pl: 'Pełna siatka odznak jest już wspólna dla web i mobile, więc tutaj pokazujemy stan odblokowania bez dodatkowej logiki platformowej.',
                })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {KANGUR_BADGES.map((badge) => {
                const unlocked = snapshot.unlockedBadgeIds.includes(badge.id);
                return (
                  <Pill
                    key={badge.id}
                    label={`${badge.emoji} ${getLocalizedKangurMetadataBadgeName(
                      badge.id,
                      badge.name,
                      locale,
                    )}`}
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
                {copy({
                  de: 'Nächste Schritte',
                  en: 'Next steps',
                  pl: 'Następne kroki',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Lokale Aufgaben im Profil',
                  en: 'Local tasks in the profile',
                  pl: 'Lokalne zadania w profilu',
                })}
              </Text>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Auch im Profil kannst du direkt in die nächsten lokalen Aufgaben aus deinem Fortschritt springen, ohne zur Startseite zurückzukehren.',
                  en: 'The profile can also jump straight into the next local tasks from your progress without going back to the home screen.',
                  pl: 'Także z profilu możesz od razu wejść w kolejne lokalne zadania wynikające z Twojego postępu bez wracania na ekran główny.',
                })}
              </Text>
            </View>

            {profileAssignments.assignmentItems.length === 0 ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Es gibt noch keine lokalen Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
                  en: 'There are no local tasks yet. Open lessons or complete more practice to build the next plan.',
                  pl: 'Nie ma jeszcze lokalnych zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {profileAssignments.assignmentItems.map((item) => (
                  <AssignmentRow
                    key={item.assignment.id}
                    assignment={item.assignment}
                    href={item.href}
                  />
                ))}
              </View>
            )}
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
                  {copy({
                    de: 'Ergebnisverlauf',
                    en: 'Score history',
                    pl: 'Historia wyników',
                  })}
                </Text>
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {isLoadingScores
                    ? copy({
                        de: 'Die gespeicherten Versuche für das Profil werden geladen.',
                        en: 'Loading saved attempts for the profile.',
                        pl: 'Pobieramy zapisane podejścia dla profilu.',
                      })
                    : scoresError ??
                      copy({
                        de: 'In dieser mobilen Version ist der Ergebnisverlauf nur eine Ergänzung zum lokalen Fortschritt.',
                        en: 'In this mobile version the score history is only a supplement to local progress.',
                        pl: 'W tej wersji mobilnej historia wyników jest tylko dodatkiem do lokalnego postępu.',
                      })}
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
                <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                  {copy({
                    de: 'Aktualisieren',
                    en: 'Refresh',
                    pl: 'Odśwież',
                  })}
                </Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
