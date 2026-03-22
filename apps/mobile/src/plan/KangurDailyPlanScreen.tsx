import type { KangurAssignmentPlan } from '@kangur/core';
import type { KangurScore } from '@kangur/contracts';
import { Link, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  useKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem,
} from '../lessons/useKangurMobileLessonCheckpoints';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { createKangurResultsHref } from '../scores/resultsHref';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { useKangurMobileDailyPlanAssignments } from './useKangurMobileDailyPlanAssignments';
import {
  useKangurMobileDailyPlanBadges,
  type KangurMobileDailyPlanBadgeItem,
} from './useKangurMobileDailyPlanBadges';
import { useKangurMobileDailyPlanDuels } from './useKangurMobileDailyPlanDuels';
import { useKangurMobileDailyPlan } from './useKangurMobileDailyPlan';
import {
  useKangurMobileDailyPlanLessonMastery,
  type KangurMobileDailyPlanLessonMasteryItem,
} from './useKangurMobileDailyPlanLessonMastery';

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

function Pill({
  label,
  tone,
}: {
  label: string;
  tone: {
    backgroundColor: string;
    borderColor: string;
    textColor: string;
  };
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

function LinkButton({
  href,
  label,
  tone = 'secondary',
  stretch = false,
}: {
  href: Href;
  label: string;
  stretch?: boolean;
  tone?: 'primary' | 'secondary';
}): React.JSX.Element {
  const isPrimary = tone === 'primary';

  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole='button'
        style={{
          alignSelf: stretch ? 'stretch' : 'flex-start',
          width: stretch ? '100%' : undefined,
          borderRadius: 999,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: isPrimary ? 'transparent' : '#cbd5e1',
          backgroundColor: isPrimary ? '#0f172a' : '#ffffff',
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Text
          style={{
            color: isPrimary ? '#ffffff' : '#0f172a',
            fontWeight: '700',
            textAlign: stretch ? 'center' : 'left',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function FocusCard({
  accentColor,
  description,
  historyHref,
  lessonHref,
  operation,
  practiceHref,
  title,
}: {
  accentColor: string;
  description: string;
  historyHref: Href;
  lessonHref: Href | null;
  operation: {
    averageAccuracyPercent: number;
    operation: string;
    sessions: number;
  };
  practiceHref: Href;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

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
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {formatKangurMobileScoreOperation(operation.operation, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{description}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Durchschnitt ${operation.averageAccuracyPercent}%`,
            en: `Average ${operation.averageAccuracyPercent}%`,
            pl: `Średnio ${operation.averageAccuracyPercent}%`,
          })}
          tone={{
            backgroundColor: accentColor === '#b91c1c' ? '#fef2f2' : '#ecfdf5',
            borderColor: accentColor === '#b91c1c' ? '#fecaca' : '#a7f3d0',
            textColor: accentColor,
          }}
        />
        <Pill
          label={copy({
            de: `Ergebnisse ${operation.sessions}`,
            en: `Results ${operation.sessions}`,
            pl: `Wyniki ${operation.sessions}`,
          })}
          tone={{
            backgroundColor: '#f1f5f9',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={practiceHref}
          label={copy({
            de: 'Jetzt trainieren',
            en: 'Practice now',
            pl: 'Trenuj teraz',
          })}
          tone='primary'
        />
        {lessonHref ? (
          <LinkButton
            href={lessonHref}
            label={copy({
              de: 'Lektion öffnen',
              en: 'Open lesson',
              pl: 'Otwórz lekcję',
            })}
          />
        ) : null}
        <LinkButton
          href={historyHref}
          label={copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}
        />
      </View>
    </View>
  );
}

const getPriorityTone = (
  priority: KangurAssignmentPlan['priority'],
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
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

const getPriorityLabel = (priority: KangurAssignmentPlan['priority']): string => {
  return priority;
};

function AssignmentRow({
  assignment,
  href,
}: {
  assignment: KangurAssignmentPlan;
  href: Href | null;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

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
        label={copy({
          de:
            getPriorityLabel(assignment.priority) === 'high'
              ? 'Hohe Priorität'
              : getPriorityLabel(assignment.priority) === 'medium'
                ? 'Mittlere Priorität'
                : 'Niedrige Priorität',
          en:
            getPriorityLabel(assignment.priority) === 'high'
              ? 'High priority'
              : getPriorityLabel(assignment.priority) === 'medium'
                ? 'Medium priority'
                : 'Low priority',
          pl:
            getPriorityLabel(assignment.priority) === 'high'
              ? 'Priorytet wysoki'
              : getPriorityLabel(assignment.priority) === 'medium'
                ? 'Priorytet średni'
                : 'Priorytet niski',
        })}
        tone={getPriorityTone(assignment.priority)}
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
        <LinkButton
          href={href}
          label={translateKangurMobileActionLabel(assignment.action.label, locale)}
          tone='primary'
        />
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

function RecentResultRow({
  historyHref,
  lessonHref,
  practiceHref,
  result,
}: {
  historyHref: Href;
  lessonHref: Href | null;
  practiceHref: Href;
  result: KangurScore;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const accuracyPercent = getKangurMobileScoreAccuracyPercent(result);

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
            {formatKangurMobileScoreOperation(result.operation, locale)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            {formatKangurMobileScoreDateTime(result.created_date, locale)}
          </Text>
        </View>
        <Pill
          label={`${result.correct_answers}/${result.total_questions}`}
          tone={{
            backgroundColor:
              accuracyPercent >= 80 ? '#ecfdf5' : accuracyPercent >= 60 ? '#fffbeb' : '#fef2f2',
            borderColor:
              accuracyPercent >= 80 ? '#a7f3d0' : accuracyPercent >= 60 ? '#fde68a' : '#fecaca',
            textColor:
              accuracyPercent >= 80 ? '#047857' : accuracyPercent >= 60 ? '#b45309' : '#b91c1c',
          }}
        />
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={practiceHref}
          label={copy({
            de: 'Erneut trainieren',
            en: 'Train again',
            pl: 'Trenuj ponownie',
          })}
          tone='primary'
        />
        {lessonHref ? (
          <LinkButton
            href={lessonHref}
            label={copy({
              de: 'Lektion öffnen',
              en: 'Open lesson',
              pl: 'Otwórz lekcję',
            })}
          />
        ) : null}
        <LinkButton
          href={historyHref}
          label={copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}
        />
      </View>
    </View>
  );
}

function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

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
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
            {item.emoji} {item.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
            {copy({
              de: `Letztes Ergebnis ${item.lastScorePercent}% • Beherrschung ${item.masteryPercent}%`,
              en: `Last score ${item.lastScorePercent}% • mastery ${item.masteryPercent}%`,
              pl: `Ostatni wynik ${item.lastScorePercent}% • opanowanie ${item.masteryPercent}%`,
            })}
          </Text>
        </View>
        <Pill
          label={`${item.bestScorePercent}%`}
          tone={{
            backgroundColor: '#eef2ff',
            borderColor: '#c7d2fe',
            textColor: '#4338ca',
          }}
        />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Zuletzt gespeichert ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
          en: `Last saved ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
          pl: `Ostatni zapis ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={item.lessonHref}
          label={`${copy({
            de: 'Zur Lektion zurück',
            en: 'Return to lesson',
            pl: 'Wróć do lekcji',
          })}: ${item.title}`}
          tone='primary'
        />
        {item.practiceHref ? (
          <LinkButton
            href={item.practiceHref}
            label={`${copy({
              de: 'Danach trainieren',
              en: 'Practice after',
              pl: 'Potem trenuj',
            })}: ${item.title}`}
          />
        ) : null}
      </View>
    </View>
  );
}

const getLessonMasteryTone = (
  masteryPercent: number,
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
  if (masteryPercent >= 90) {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#a7f3d0',
      textColor: '#047857',
    };
  }
  if (masteryPercent >= 70) {
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

function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobileDailyPlanLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getLessonMasteryTone(insight.masteryPercent);
  const lastAttemptLabel = insight.lastCompletedAt
    ? formatKangurMobileScoreDateTime(insight.lastCompletedAt, locale)
    : copy({
        de: 'kein Datum',
        en: 'no date',
        pl: 'brak daty',
      });

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
          <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
            {insight.emoji} {insight.title}
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>
            {copy({
              de: `Versuche ${insight.attempts} • letztes Ergebnis ${insight.lastScorePercent}%`,
              en: `Attempts ${insight.attempts} • last score ${insight.lastScorePercent}%`,
              pl: `Próby ${insight.attempts} • ostatni wynik ${insight.lastScorePercent}%`,
            })}
          </Text>
        </View>
        <Pill label={`${insight.masteryPercent}%`} tone={masteryTone} />
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzter Versuch ${lastAttemptLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last attempt ${lastAttemptLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia próba ${lastAttemptLabel}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={insight.lessonHref}
          label={copy({
            de: 'Lektion öffnen',
            en: 'Open lesson',
            pl: 'Otwórz lekcję',
          })}
          tone='primary'
        />
        {insight.practiceHref ? (
          <LinkButton
            href={insight.practiceHref}
            label={copy({
              de: 'Danach trainieren',
              en: 'Practice after',
              pl: 'Potem trenuj',
            })}
          />
        ) : null}
      </View>
    </View>
  );
}

const LESSONS_ROUTE = '/lessons' as Href;
const DUELS_ROUTE = createKangurDuelsHref();
const PROFILE_ROUTE = '/profile' as Href;
const RESULTS_ROUTE = createKangurResultsHref();

function DailyPlanBadgeChip({
  item,
}: {
  item: KangurMobileDailyPlanBadgeItem;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor: '#c7d2fe',
        backgroundColor: '#eef2ff',
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: '#4338ca', fontSize: 12, fontWeight: '700' }}>
        {item.emoji} {item.name}
      </Text>
    </View>
  );
}

export function KangurDailyPlanScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const lessonMastery = useKangurMobileDailyPlanLessonMastery();
  const dailyPlanBadges = useKangurMobileDailyPlanBadges();
  const dailyPlanAssignments = useKangurMobileDailyPlanAssignments();
  const {
    authError,
    displayName,
    isAuthenticated,
    isLoadingAuth,
    isLoading,
    recentResultItems,
    refresh,
    scoreError,
    signIn,
    strongestFocus,
    supportsLearnerCredentials,
    weakestFocus,
  } = useKangurMobileDailyPlan();
  const duelPlan = useKangurMobileDailyPlanDuels();
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;
  const lessonFocusSummary = weakestLesson
    ? copy({
        de: `Fokus für heute: ${weakestLesson.title} braucht noch eine kurze Wiederholung, bevor du wieder Tempo aufnimmst.`,
        en: `Focus for today: ${weakestLesson.title} still needs a short review before you build pace again.`,
        pl: `Fokus na dziś: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, zanim znowu wejdziesz w tempo.`,
      })
    : strongestLesson
      ? copy({
          de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und eignet sich für einen kurzen sicheren Einstieg.`,
          en: `Stable strength: ${strongestLesson.title} is holding its level and works well for a short confident start.`,
          pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i nadaje się na krótki, pewny start.`,
        })
      : null;
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
                de: 'Tagesplan',
                en: 'Daily plan',
                pl: 'Plan dnia',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {copy({
                de: 'Ein Ort für heute',
                en: 'One place for today',
                pl: 'Jedno miejsce na dziś',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 15, lineHeight: 22 }}>
              {isLoadingAuth && !isAuthenticated
                ? copy({
                    de: 'Die Anmeldung und der letzte Plan auf Basis von Ergebnissen und Fortschritt werden wiederhergestellt.',
                    en: 'Restoring sign-in and the latest plan based on results and progress.',
                    pl: 'Przywracamy logowanie oraz ostatni plan oparty na wynikach i postępie.',
                  })
                : copy({
                    de: `Ein fokussierter Lernplan für ${displayName} aus Training, Lektionen und den wichtigsten Ergebnissen.`,
                    en: `A focused learning plan for ${displayName}, built from practice, lessons, and the most important results.`,
                    pl: `Skupiony plan nauki dla ${displayName}, złożony z treningu, lekcji i najważniejszych wyników.`,
                  })}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={copy({
                  de: `Aufgaben ${dailyPlanAssignments.assignmentItems.length}`,
                  en: `Tasks ${dailyPlanAssignments.assignmentItems.length}`,
                  pl: `Zadania ${dailyPlanAssignments.assignmentItems.length}`,
                })}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={copy({
                  de: `Ergebnisse ${recentResultItems.length}`,
                  en: `Results ${recentResultItems.length}`,
                  pl: `Wyniki ${recentResultItems.length}`,
                })}
                tone={{
                  backgroundColor: '#ecfdf5',
                  borderColor: '#a7f3d0',
                  textColor: '#047857',
                }}
              />
              <Pill
                label={copy({
                  de: `Lektionen ${lessonMastery.trackedLessons}`,
                  en: `Lessons ${lessonMastery.trackedLessons}`,
                  pl: `Lekcje ${lessonMastery.trackedLessons}`,
                })}
                tone={{
                  backgroundColor: '#fffbeb',
                  borderColor: '#fde68a',
                  textColor: '#b45309',
                }}
              />
            </View>

            <View style={{ alignSelf: 'stretch', gap: 10 }}>
              <LinkButton
                href='/practice?operation=mixed'
                label={copy({
                  de: 'Gemischtes Training starten',
                  en: 'Start mixed practice',
                  pl: 'Uruchom trening mieszany',
                })}
                tone='primary'
                stretch
              />
              <LinkButton
                href={RESULTS_ROUTE}
                label={copy({
                  de: 'Ergebnisse öffnen',
                  en: 'Open results',
                  pl: 'Otwórz wyniki',
                })}
                stretch
              />
              <LinkButton
                href={DUELS_ROUTE}
                label={copy({
                  de: 'Duelle öffnen',
                  en: 'Open duels',
                  pl: 'Otwórz pojedynki',
                })}
                stretch
              />
              <Pressable
                accessibilityRole='button'
                onPress={() => {
                  void refresh();
                }}
                style={{
                  alignSelf: 'stretch',
                  width: '100%',
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#cbd5e1',
                  backgroundColor: '#ffffff',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>
                  {copy({
                    de: 'Plan aktualisieren',
                    en: 'Refresh plan',
                    pl: 'Odśwież plan',
                  })}
                </Text>
              </Pressable>
            </View>

            {isLoadingAuth && !isAuthenticated ? (
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die Anmeldung wird wiederhergestellt. Sobald sie bereit ist, lädt der Plan Ergebnisse und Trainingshinweise.',
                  en: 'Restoring sign-in. Once it is ready, the plan will load results and training guidance.',
                  pl: 'Przywracamy logowanie. Gdy będzie gotowe, plan pobierze wyniki i wskazówki treningowe.',
                })}
              </Text>
            ) : !isAuthenticated ? (
              supportsLearnerCredentials ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Melde dich an, um Ergebnisse, Trainingsfokus und letzte Fortschritte zu laden.',
                      en: 'Sign in to load results, training focus, and recent progress.',
                      pl: 'Zaloguj się, aby pobrać wyniki, fokus treningowy i ostatnie postępy.',
                    })}
                  </Text>
                  <LinkButton
                    href='/'
                    label={copy({
                      de: 'Zum Login',
                      en: 'Go to sign in',
                      pl: 'Przejdź do logowania',
                    })}
                  />
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
                    backgroundColor: '#1d4ed8',
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    {copy({
                      de: 'Demo starten',
                      en: 'Start demo',
                      pl: 'Uruchom demo',
                    })}
                  </Text>
                </Pressable>
              )
            ) : null}

            {authError ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{authError}</Text>
            ) : null}
          </Card>

          <Card>
            <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
              {copy({
                de: 'Trainingsfokus',
                en: 'Training focus',
                pl: 'Fokus treningowy',
              })}
            </Text>
            {isLoading ? (
              <Text style={{ color: '#475569' }}>
                {copy({
                  de: 'Der ergebnisbasierte Fokus wird geladen...',
                  en: 'Loading score-based focus...',
                  pl: 'Ładujemy fokus oparty na wynikach...',
                })}
              </Text>
            ) : scoreError ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{scoreError}</Text>
            ) : !isAuthenticated ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Melde dich an, um Hinweise für den stärksten und schwächsten Modus freizuschalten.',
                  en: 'Sign in to unlock guidance for the strongest and weakest modes.',
                  pl: 'Zaloguj się, aby odblokować wskazówki dla najmocniejszego i najsłabszego trybu.',
                })}
              </Text>
            ) : !weakestFocus && !strongestFocus ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Schließe einen Lauf ab, um den ersten Trainingsfokus aufzubauen.',
                  en: 'Finish one run to build the first training focus.',
                  pl: 'Ukończ jedną serię, aby zbudować pierwszy fokus treningowy.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {weakestFocus ? (
                  <FocusCard
                    accentColor='#b91c1c'
                    description={copy({
                      de: 'Das ist aktuell der schwächste Bereich in deinen Ergebnissen. Starte mit einer kurzen gezielten Serie und kehre bei Bedarf zur passenden Lektion zurück.',
                      en: 'This is currently the weakest area in your results. Start with a short targeted run and then return to the matching lesson if needed.',
                      pl: 'To obecnie najsłabszy obszar w Twoich wynikach. Zacznij od krótkiej celowanej serii, a potem wróć do pasującej lekcji, jeśli będzie trzeba.',
                    })}
                    historyHref={weakestFocus.historyHref}
                    lessonHref={weakestFocus.lessonHref}
                    operation={weakestFocus.operation}
                    practiceHref={weakestFocus.practiceHref}
                    title={copy({
                      de: 'Zum Wiederholen',
                      en: 'Needs review',
                      pl: 'Do powtórki',
                    })}
                  />
                ) : null}
                {strongestFocus ? (
                  <FocusCard
                    accentColor='#047857'
                    description={copy({
                      de: 'Dieser Modus ist gerade am stabilsten. Nutze ihn für einen schnellen Selbstvertrauensschub oder ein kurzes Aufwärmen.',
                      en: 'This mode is the most stable right now. Use it for a quick confidence boost or a light warm-up.',
                      pl: 'Ten tryb jest teraz najbardziej stabilny. Użyj go do szybkiego podbicia pewności albo lekkiej rozgrzewki.',
                    })}
                    historyHref={strongestFocus.historyHref}
                    lessonHref={strongestFocus.lessonHref}
                    operation={strongestFocus.operation}
                    practiceHref={strongestFocus.practiceHref}
                    title={copy({
                      de: 'Stärkster Modus',
                      en: 'Strongest mode',
                      pl: 'Najmocniejszy tryb',
                    })}
                  />
                ) : null}
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
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Abzeichen-Zentrale',
                  en: 'Badge hub',
                  pl: 'Centrum odznak',
                })}
              </Text>
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Behalte im Blick, was schon freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
                  en: 'Keep track of what is already unlocked and which local goal is closest to the next badge threshold.',
                  pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.',
                })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={copy({
                  de: `Freigeschaltet ${dailyPlanBadges.unlockedBadges}/${dailyPlanBadges.totalBadges}`,
                  en: `Unlocked ${dailyPlanBadges.unlockedBadges}/${dailyPlanBadges.totalBadges}`,
                  pl: `Odblokowane ${dailyPlanBadges.unlockedBadges}/${dailyPlanBadges.totalBadges}`,
                })}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={copy({
                  de: `Offen ${dailyPlanBadges.remainingBadges}`,
                  en: `Remaining ${dailyPlanBadges.remainingBadges}`,
                  pl: `Do zdobycia ${dailyPlanBadges.remainingBadges}`,
                })}
                tone={{
                  backgroundColor: '#fffbeb',
                  borderColor: '#fde68a',
                  textColor: '#b45309',
                }}
              />
            </View>

            {dailyPlanBadges.recentBadges.length === 0 ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Es gibt noch keine lokal freigeschalteten Abzeichen. Schließe Lektionen, Trainings oder Spiele ab, damit sie hier erscheinen.',
                  en: 'There are no locally unlocked badges yet. Finish lessons, practice runs, or games so they appear here.',
                  pl: 'Nie ma jeszcze lokalnie odblokowanych odznak. Ukończ lekcje, treningi albo gry, aby pojawiły się tutaj.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
                  {copy({
                    de: 'Zuletzt freigeschaltet',
                    en: 'Recently unlocked',
                    pl: 'Ostatnio odblokowane',
                  })}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {dailyPlanBadges.recentBadges.map((item) => (
                    <DailyPlanBadgeChip key={item.id} item={item} />
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
            />
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Duelle für heute',
                  en: 'Duels for today',
                  pl: 'Pojedynki na dziś',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Schneller Rückweg zu Rivalen',
                  en: 'Quick return to rivals',
                  pl: 'Szybki powrót do rywali',
                })}
              </Text>
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Prüfe den aktuellen Duellstand, sieh die letzten Rivalen und starte einen Rückkampf, ohne den Tagesplan zu verlassen.',
                  en: 'Check the current duel standing, see recent rivals, and start a rematch without leaving the daily plan.',
                  pl: 'Sprawdź aktualny stan pojedynków, zobacz ostatnich rywali i wejdź w rewanż bez wychodzenia z planu dnia.',
                })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={copy({
                  de: `Rivalen ${duelPlan.opponents.length}`,
                  en: `Rivals ${duelPlan.opponents.length}`,
                  pl: `Rywale ${duelPlan.opponents.length}`,
                })}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={
                  duelPlan.currentRank
                    ? copy({
                        de: `Deine Position #${duelPlan.currentRank}`,
                        en: `Your rank #${duelPlan.currentRank}`,
                        pl: `Twoja pozycja #${duelPlan.currentRank}`,
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

            {duelPlan.isRestoringAuth || duelPlan.isLoading ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Der heutige Duellstand wird geladen...',
                  en: 'Loading today’s duel standing...',
                  pl: 'Ładujemy dzisiejszy stan pojedynków...',
                })}
              </Text>
            ) : duelPlan.error ? (
              <View style={{ gap: 10 }}>
                <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{duelPlan.error}</Text>
                <Pressable
                  accessibilityRole='button'
                  onPress={() => {
                    void duelPlan.refresh();
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
            ) : !duelPlan.isAuthenticated ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Melde dich an, um hier deinen Duellstand, letzte Rivalen und schnelle Rückkämpfe zu sehen.',
                  en: 'Sign in to see duel standing, recent rivals, and quick rematches here.',
                  pl: 'Zaloguj się, aby zobaczyć tutaj stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {duelPlan.currentEntry ? (
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
                      #{duelPlan.currentRank} {duelPlan.currentEntry.displayName}
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: `Siege ${duelPlan.currentEntry.wins} • Niederlagen ${duelPlan.currentEntry.losses} • Unentschieden ${duelPlan.currentEntry.ties}`,
                        en: `Wins ${duelPlan.currentEntry.wins} • Losses ${duelPlan.currentEntry.losses} • Ties ${duelPlan.currentEntry.ties}`,
                        pl: `Wygrane ${duelPlan.currentEntry.wins} • Porażki ${duelPlan.currentEntry.losses} • Remisy ${duelPlan.currentEntry.ties}`,
                      })}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({
                      de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                      en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                      pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
                    })}
                  </Text>
                )}

                {duelPlan.actionError ? (
                  <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{duelPlan.actionError}</Text>
                ) : null}

                {duelPlan.opponents.length === 0 ? (
                  <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({
                      de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rückkämpfe frei.',
                      en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.',
                      pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 12 }}>
                    {duelPlan.opponents.map((opponent) => (
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
                            de: `Letztes Duell ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale)}`,
                            en: `Last duel ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale)}`,
                            pl: `Ostatni pojedynek ${formatKangurMobileScoreDateTime(opponent.lastPlayedAt, locale)}`,
                          })}
                        </Text>
                        <Pressable
                          accessibilityRole='button'
                          disabled={duelPlan.isActionPending}
                          onPress={() => {
                            void duelPlan.createRematch(opponent.learnerId).then((sessionId) => {
                              if (sessionId) {
                                openDuelSession(sessionId);
                              }
                            });
                          }}
                          style={{
                            alignSelf: 'flex-start',
                            borderRadius: 999,
                            backgroundColor: duelPlan.isActionPending ? '#94a3b8' : '#1d4ed8',
                            paddingHorizontal: 14,
                            paddingVertical: 10,
                          }}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                            {duelPlan.pendingOpponentLearnerId === opponent.learnerId
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

                <View style={{ alignSelf: 'stretch', gap: 10 }}>
                  <Pressable
                    accessibilityRole='button'
                    onPress={() => {
                      void duelPlan.refresh();
                    }}
                    style={{
                      alignSelf: 'stretch',
                      width: '100%',
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: '#cbd5e1',
                      backgroundColor: '#ffffff',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}>
                      {copy({
                        de: 'Duelle aktualisieren',
                        en: 'Refresh duels',
                        pl: 'Odśwież pojedynki',
                      })}
                    </Text>
                  </Pressable>

                  <LinkButton
                    href={DUELS_ROUTE}
                    label={copy({
                      de: 'Duelle öffnen',
                      en: 'Open duels',
                      pl: 'Otwórz pojedynki',
                    })}
                    stretch
                  />
                </View>
              </View>
            )}
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                {copy({
                  de: 'Für heute',
                  en: 'For today',
                  pl: 'Na dziś',
                })}
              </Text>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Aktionsplan für heute',
                  en: 'Action plan for today',
                  pl: 'Plan działań na dziś',
                })}
              </Text>
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Wandle den Blick auf Fortschritt, Ergebnisse und Fokus direkt in die nächsten Schritte für heute um.',
                  en: 'Turn progress, results, and focus into the next steps for today right away.',
                  pl: 'Zamień postęp, wyniki i fokus w kolejne kroki na dziś, bez gubienia rytmu nauki.',
                })}
              </Text>
            </View>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>
              {copy({
                de: 'Aufgaben für heute',
                en: 'Tasks for today',
                pl: 'Zadania na dziś',
              })}
            </Text>
            {dailyPlanAssignments.assignmentItems.length === 0 ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Es gibt noch keine Aufgaben. Öffne Lektionen oder absolviere ein Training, um den ersten Plan der nächsten Schritte zu erzeugen.',
                  en: 'There are no tasks yet. Open lessons or complete more practice to build the first next-steps plan.',
                  pl: 'Nie ma jeszcze zadań. Otwórz lekcje albo wykonaj więcej treningów, aby zbudować pierwszy plan kolejnych kroków.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {dailyPlanAssignments.assignmentItems.map(({ assignment, href }) => (
                  <AssignmentRow
                    key={assignment.id}
                    assignment={assignment}
                    href={href}
                  />
                ))}
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
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Lektionsplan für heute',
                  en: 'Lesson plan for today',
                  pl: 'Plan lekcji na dziś',
                })}
              </Text>
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Verbinde den aktuellen Lektionsstand direkt mit schnellen Wiederholungen und entscheide sofort, was heute Fokus und was nur Erhaltung ist.',
                  en: 'Connect the current lesson progress directly with quick review and decide right away what is today’s focus and what only needs maintenance.',
                  pl: 'Połącz bieżące opanowanie lekcji z szybką powtórką i od razu zdecyduj, co jest dziś fokusem, a co wymaga tylko podtrzymania.',
                })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pill
                label={copy({
                  de: `Verfolgt ${lessonMastery.trackedLessons}`,
                  en: `Tracked ${lessonMastery.trackedLessons}`,
                  pl: `Śledzone ${lessonMastery.trackedLessons}`,
                })}
                tone={{
                  backgroundColor: '#eef2ff',
                  borderColor: '#c7d2fe',
                  textColor: '#4338ca',
                }}
              />
              <Pill
                label={copy({
                  de: `Beherrscht ${lessonMastery.masteredLessons}`,
                  en: `Mastered ${lessonMastery.masteredLessons}`,
                  pl: `Opanowane ${lessonMastery.masteredLessons}`,
                })}
                tone={{
                  backgroundColor: '#ecfdf5',
                  borderColor: '#a7f3d0',
                  textColor: '#047857',
                }}
              />
              <Pill
                label={copy({
                  de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
                  en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
                  pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
                })}
                tone={{
                  backgroundColor: '#fffbeb',
                  borderColor: '#fde68a',
                  textColor: '#b45309',
                }}
              />
            </View>

            {lessonMastery.trackedLessons === 0 ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Es gibt noch keine Lektions-Checkpoints. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
                  en: 'There are no lesson checkpoints yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
                  pl: 'Nie ma jeszcze checkpointów lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {lessonFocusSummary ? (
                  <Text style={{ color: '#475569', lineHeight: 22 }}>{lessonFocusSummary}</Text>
                ) : null}

                <View style={{ alignSelf: 'stretch', gap: 10 }}>
                  {weakestLesson ? (
                    <LinkButton
                      href={weakestLesson.lessonHref}
                      label={copy({
                        de: `Fokus: ${weakestLesson.title}`,
                        en: `Focus: ${weakestLesson.title}`,
                        pl: `Skup się: ${weakestLesson.title}`,
                      })}
                      tone='primary'
                      stretch
                    />
                  ) : null}
                  {strongestLesson ? (
                    <LinkButton
                      href={strongestLesson.lessonHref}
                      label={copy({
                        de: `Stärke halten: ${strongestLesson.title}`,
                        en: `Maintain strength: ${strongestLesson.title}`,
                        pl: `Podtrzymaj: ${strongestLesson.title}`,
                      })}
                      stretch
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
          </Card>

          <Card>
            <View style={{ gap: 4 }}>
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Letzte Lektions-Checkpoints',
                  en: 'Recent lesson checkpoints',
                  pl: 'Ostatnie checkpointy lekcji',
                })}
              </Text>
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Die letzten lokal gespeicherten Lektionen helfen dir, vor dem nächsten Training genau an der letzten Stelle weiterzumachen.',
                  en: 'The most recently saved lessons help you resume exactly from the last saved point before the next practice block.',
                  pl: 'Ostatnio zapisane lekcje pomagają wrócić dokładnie do ostatniego miejsca przed kolejnym blokiem treningowym.',
                })}
              </Text>
            </View>

            {lessonCheckpoints.recentCheckpoints.length === 0 ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Es gibt noch keine gespeicherten Checkpoints. Öffne eine Lektion und speichere den ersten Stand, damit sie hier erscheinen.',
                  en: 'There are no saved checkpoints yet. Open a lesson and save the first state so they appear here.',
                  pl: 'Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby pojawiły się tutaj.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {lessonCheckpoints.recentCheckpoints.map((item) => (
                  <LessonCheckpointRow
                    key={item.componentId}
                    item={item}
                  />
                ))}
                <LinkButton
                  href={LESSONS_ROUTE}
                  label={copy({
                    de: 'Lektionen öffnen',
                    en: 'Open lessons',
                    pl: 'Otwórz lekcje',
                  })}
                />
              </View>
            )}
          </Card>

          <Card>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Text style={{ color: '#0f172a', fontSize: 20, fontWeight: '800' }}>
                {copy({
                  de: 'Ergebniszentrale',
                  en: 'Results hub',
                  pl: 'Centrum wyników',
                })}
              </Text>
              <LinkButton
                href={createKangurResultsHref()}
                label={copy({
                  de: 'Vollständigen Verlauf öffnen',
                  en: 'Open full history',
                  pl: 'Otwórz pełną historię',
                })}
              />
            </View>
            {isLoading ? (
              <Text style={{ color: '#475569' }}>
                {copy({
                  de: 'Die letzten Ergebnisse werden geladen...',
                  en: 'Loading recent results...',
                  pl: 'Ładujemy ostatnie wyniki...',
                })}
              </Text>
            ) : !isAuthenticated ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Melde dich an, um hier Ergebnisse zu sehen.',
                  en: 'Sign in to see results here.',
                  pl: 'Zaloguj się, aby zobaczyć tutaj wyniki.',
                })}
              </Text>
            ) : scoreError ? (
              <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{scoreError}</Text>
            ) : recentResultItems.length === 0 ? (
              <Text style={{ color: '#475569', lineHeight: 22 }}>
                {copy({
                  de: 'Es gibt hier noch keine Ergebnisse. Schließe einen Lauf ab, um diesen Bereich zu füllen.',
                  en: 'There are no results here yet. Finish one run to fill this section.',
                  pl: 'Nie ma tu jeszcze wyników. Ukończ jedną serię, aby wypełnić tę sekcję.',
                })}
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {recentResultItems.map(({ result, historyHref, lessonHref, practiceHref }) => (
                  <RecentResultRow
                    key={result.id}
                    result={result}
                    historyHref={historyHref}
                    lessonHref={lessonHref}
                    practiceHref={practiceHref}
                  />
                ))}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
