import { Link, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  useKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem,
} from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { useKangurMobileLeaderboard } from './useKangurMobileLeaderboard';
import {
  useKangurMobileLeaderboardAssignments,
  type KangurMobileLeaderboardAssignmentItem,
} from './useKangurMobileLeaderboardAssignments';
import {
  useKangurMobileLeaderboardLessonMastery,
  type KangurMobileLeaderboardLessonMasteryItem,
} from './useKangurMobileLeaderboardLessonMastery';
import {
  useKangurMobileLeaderboardBadges,
  type KangurMobileLeaderboardBadgeItem,
} from './useKangurMobileLeaderboardBadges';
import { useKangurMobileLeaderboardDuels } from './useKangurMobileLeaderboardDuels';

const FILTER_SCROLL_STYLE = {
  gap: 8,
  paddingBottom: 4,
} as const;
const LESSONS_ROUTE = '/lessons' as Href;
const PLAN_ROUTE = createKangurPlanHref();
const PROFILE_ROUTE = '/profile' as Href;

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      accessibilityRole='button'
      onPress={onPress}
      style={{
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? '#1d4ed8' : '#cbd5e1',
        backgroundColor: selected ? '#dbeafe' : '#ffffff',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text
        style={{
          color: selected ? '#1d4ed8' : '#334155',
          fontSize: 13,
          fontWeight: '700',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}): React.JSX.Element {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          fontSize: 28,
          fontWeight: '800',
          color: '#0f172a',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: '#475569',
          fontSize: 15,
          lineHeight: 22,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function SummaryChip({
  label,
  backgroundColor = '#eef2ff',
  borderColor = '#c7d2fe',
  textColor = '#4338ca',
}: {
  label: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        borderWidth: 1,
        borderColor,
        backgroundColor,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Text style={{ color: textColor, fontSize: 12, fontWeight: '700' }}>{label}</Text>
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
            {item.bestScorePercent}%
          </Text>
        </View>
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Zuletzt gespeichert ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
          en: `Last saved ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
          pl: `Ostatni zapis ${formatKangurMobileScoreDateTime(item.lastCompletedAt, locale)}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={item.lessonHref} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {`${copy({
                de: 'Zur Lektion zurück',
                en: 'Return to lesson',
                pl: 'Wróć do lekcji',
              })}: ${item.title}`}
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
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {`${copy({
                  de: 'Danach trainieren',
                  en: 'Practice after',
                  pl: 'Potem trenuj',
                })}: ${item.title}`}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

function LeaderboardAssignmentRow({
  item,
}: {
  item: KangurMobileLeaderboardAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityTone =
    item.assignment.priority === 'high'
      ? {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          textColor: '#b91c1c',
        }
      : item.assignment.priority === 'medium'
        ? {
            backgroundColor: '#fffbeb',
            borderColor: '#fde68a',
            textColor: '#b45309',
          }
        : {
            backgroundColor: '#eff6ff',
            borderColor: '#bfdbfe',
            textColor: '#1d4ed8',
          };

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
          alignSelf: 'flex-start',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: priorityTone.borderColor,
          backgroundColor: priorityTone.backgroundColor,
          paddingHorizontal: 12,
          paddingVertical: 7,
        }}
      >
        <Text style={{ color: priorityTone.textColor, fontSize: 12, fontWeight: '700' }}>
          {copy({
            de:
              item.assignment.priority === 'high'
                ? 'Hohe Priorität'
                : item.assignment.priority === 'medium'
                  ? 'Mittlere Priorität'
                  : 'Niedrige Priorität',
            en:
              item.assignment.priority === 'high'
                ? 'High priority'
                : item.assignment.priority === 'medium'
                  ? 'Medium priority'
                  : 'Low priority',
            pl:
              item.assignment.priority === 'high'
                ? 'Priorytet wysoki'
                : item.assignment.priority === 'medium'
                  ? 'Priorytet średni'
                  : 'Priorytet niski',
          })}
        </Text>
      </View>

      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {item.assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {item.assignment.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${item.assignment.target}`,
          en: `Goal: ${item.assignment.target}`,
          pl: `Cel: ${item.assignment.target}`,
        })}
      </Text>

      {item.href ? (
        <Link href={item.href} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {translateKangurMobileActionLabel(item.assignment.action.label, locale)}
            </Text>
          </Pressable>
        </Link>
      ) : (
        <View
          style={{
            alignSelf: 'flex-start',
            borderRadius: 999,
            backgroundColor: '#e2e8f0',
            paddingHorizontal: 12,
            paddingVertical: 9,
          }}
        >
          <Text style={{ color: '#475569', fontWeight: '700' }}>
            {translateKangurMobileActionLabel(item.assignment.action.label, locale)} ·{' '}
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

function LeaderboardBadgeChip({
  item,
}: {
  item: KangurMobileLeaderboardBadgeItem;
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

const getMasteryTone = (
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
  insight: KangurMobileLeaderboardLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getMasteryTone(insight.masteryPercent);
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
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: masteryTone.borderColor,
            backgroundColor: masteryTone.backgroundColor,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: masteryTone.textColor, fontSize: 12, fontWeight: '700' }}>
            {insight.masteryPercent}%
          </Text>
        </View>
      </View>

      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Bestes Ergebnis ${insight.bestScorePercent}% • letzter Versuch ${lastAttemptLabel}`,
          en: `Best score ${insight.bestScorePercent}% • last attempt ${lastAttemptLabel}`,
          pl: `Najlepszy wynik ${insight.bestScorePercent}% • ostatnia próba ${lastAttemptLabel}`,
        })}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={insight.lessonHref} asChild>
          <Pressable
            accessibilityRole='button'
            style={{
              alignSelf: 'flex-start',
              borderRadius: 999,
              backgroundColor: '#0f172a',
              paddingHorizontal: 12,
              paddingVertical: 9,
            }}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>
              {copy({
                de: 'Lektion öffnen',
                en: 'Open lesson',
                pl: 'Otwórz lekcję',
              })}
            </Text>
          </Pressable>
        </Link>
        {insight.practiceHref ? (
          <Link href={insight.practiceHref} asChild>
            <Pressable
              accessibilityRole='button'
              style={{
                alignSelf: 'flex-start',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                paddingHorizontal: 12,
                paddingVertical: 9,
              }}
            >
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>
                {copy({
                  de: 'Danach trainieren',
                  en: 'Practice after',
                  pl: 'Potem trenuj',
                })}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

export function KangurLeaderboardScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const {
    error,
    isLoading,
    isRestoringAuth,
    items,
    operationFilter,
    operationOptions,
    refresh,
    setOperationFilter,
    setUserFilter,
    userFilter,
    userOptions,
    visibleCount,
  } = useKangurMobileLeaderboard();
  const duelLeaderboard = useKangurMobileLeaderboardDuels();
  const leaderboardAssignments = useKangurMobileLeaderboardAssignments();
  const lessonMastery = useKangurMobileLeaderboardLessonMastery();
  const leaderboardBadges = useKangurMobileLeaderboardBadges();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;
  const topDuelEntry = duelLeaderboard.entries[0] ?? null;
  const duelTopWinRatePercent = topDuelEntry ? Math.round(topDuelEntry.winRate * 100) : null;
  const lessonFocusSummary = weakestLesson
    ? copy({
        de: `Fokus nach der Rangliste: ${weakestLesson.title} braucht noch eine kurze Wiederholung vor dem nächsten Training.`,
        en: `Post-leaderboard focus: ${weakestLesson.title} needs one short review before the next practice run.`,
        pl: `Fokus po rankingu: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki przed kolejnym treningiem.`,
      })
    : strongestLesson
      ? copy({
          de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und braucht nur ein kurzes Auffrischen.`,
          en: `Stable strength: ${strongestLesson.title} is holding its level and only needs a short refresh.`,
          pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i wymaga tylko krótkiego odświeżenia.`,
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
        <View
          style={{
            alignItems: 'flex-start',
            gap: 14,
          }}
        >
          <Link href='/' asChild>
            <Pressable
              accessibilityRole='button'
              style={{
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

          <SectionTitle
            title={copy({
              de: 'Rangliste',
              en: 'Leaderboard',
              pl: 'Ranking',
            })}
            subtitle={copy({
              de: 'Prüfe die letzten Ergebnisse, vergleiche das Duelltempo und springe direkt zurück in die nächsten mobilen Lernschritte.',
              en: 'Check the latest results, compare duel momentum, and jump straight back into the next mobile study steps.',
              pl: 'Sprawdź ostatnie wyniki, porównaj tempo w pojedynkach i od razu wróć do kolejnych mobilnych kroków nauki.',
            })}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <SummaryChip
              label={copy({
                de: `Ergebnisse ${visibleCount}`,
                en: `Results ${visibleCount}`,
                pl: `Wyniki ${visibleCount}`,
              })}
            />
            <SummaryChip
              label={
                duelLeaderboard.isLoading
                  ? copy({
                      de: 'Duelle werden geladen',
                      en: 'Duels loading',
                      pl: 'Pojedynki wczytywane',
                    })
                  : copy({
                      de: `Duelle ${duelLeaderboard.entries.length}`,
                      en: `Duels ${duelLeaderboard.entries.length}`,
                      pl: `Pojedynki ${duelLeaderboard.entries.length}`,
                    })
              }
              backgroundColor='#eff6ff'
              borderColor='#bfdbfe'
              textColor='#1d4ed8'
            />
            <SummaryChip
              label={copy({
                de: `Lektionen ${lessonMastery.trackedLessons}`,
                en: `Lessons ${lessonMastery.trackedLessons}`,
                pl: `Lekcje ${lessonMastery.trackedLessons}`,
              })}
              backgroundColor='#ecfdf5'
              borderColor='#a7f3d0'
              textColor='#047857'
            />
          </View>

          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Link href={PLAN_ROUTE} asChild>
              <Pressable
                accessibilityRole='button'
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
                    de: 'Tagesplan jetzt',
                    en: 'Daily plan now',
                    pl: 'Plan dnia teraz',
                  })}
                </Text>
              </Pressable>
            </Link>

            <Link href={createKangurDuelsHref()} asChild>
              <Pressable
                accessibilityRole='button'
                style={{
                  alignSelf: 'stretch',
                  width: '100%',
                  borderRadius: 999,
                  backgroundColor: '#0f172a',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                }}
              >
                <Text style={{ color: '#ffffff', fontWeight: '700', textAlign: 'center' }}>
                  {copy({
                    de: 'Duell-Lobby öffnen',
                    en: 'Open duel lobby',
                    pl: 'Otwórz lobby pojedynków',
                  })}
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>

        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#ffffff',
            padding: 18,
            gap: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Abzeichen',
                en: 'Badges',
                pl: 'Odznaki',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
              {copy({
                de: 'Abzeichen-Zentrale',
                en: 'Badge hub',
                pl: 'Centrum odznak',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Verfolge, was bereits freigeschaltet ist und welches lokale Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
                en: 'Track what is already unlocked and which local goal is closest to the next badge threshold.',
                pl: 'Śledź, co jest już odblokowane i który lokalny cel jest najbliżej kolejnego progu odznaki.',
              })}
            </Text>
          </View>

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
                  de: `Freigeschaltet ${leaderboardBadges.unlockedBadges}/${leaderboardBadges.totalBadges}`,
                  en: `Unlocked ${leaderboardBadges.unlockedBadges}/${leaderboardBadges.totalBadges}`,
                  pl: `Odblokowane ${leaderboardBadges.unlockedBadges}/${leaderboardBadges.totalBadges}`,
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
                  de: `Offen ${leaderboardBadges.remainingBadges}`,
                  en: `Remaining ${leaderboardBadges.remainingBadges}`,
                  pl: `Do zdobycia ${leaderboardBadges.remainingBadges}`,
                })}
              </Text>
            </View>
          </View>

          {leaderboardBadges.recentBadges.length === 0 ? (
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
                {leaderboardBadges.recentBadges.map((item) => (
                  <LeaderboardBadgeChip key={item.id} item={item} />
                ))}
              </View>
            </View>
          )}

          <Link href={PROFILE_ROUTE} asChild>
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
                  de: 'Profil und Abzeichen öffnen',
                  en: 'Open profile and badges',
                  pl: 'Otwórz profil i odznaki',
                })}
              </Text>
            </Pressable>
          </Link>
        </View>

        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#ffffff',
            padding: 18,
            gap: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>
              {copy({
                de: 'Modus',
                en: 'Mode',
                pl: 'Tryb',
              })}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={FILTER_SCROLL_STYLE}>
              {operationOptions.map((option) => (
                <FilterChip
                  key={option.id}
                  label={`${option.emoji} ${option.label}`}
                  onPress={() => {
                    setOperationFilter(option.id);
                  }}
                  selected={operationFilter === option.id}
                />
              ))}
            </ScrollView>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 16 }}>
              {copy({
                de: 'Spieler',
                en: 'Players',
                pl: 'Gracze',
              })}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={FILTER_SCROLL_STYLE}>
              {userOptions.map((option) => (
                <FilterChip
                  key={option.id}
                  label={option.label}
                  onPress={() => {
                    setUserFilter(option.id);
                  }}
                  selected={userFilter === option.id}
                />
              ))}
            </ScrollView>
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#64748b', fontSize: 13 }}>
              {copy({
                de: `Sichtbare Ergebnisse: ${visibleCount}`,
                en: `Visible results: ${visibleCount}`,
                pl: `Widoczne wyniki: ${visibleCount}`,
              })}
            </Text>
            <Pressable
              accessibilityRole='button'
              onPress={() => {
                void refresh();
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
        </View>

        {isLoading ? (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: '#ffffff',
              padding: 20,
            }}
          >
            <Text style={{ color: '#334155', fontSize: 15 }}>
              {isRestoringAuth
                ? copy({
                    de: 'Die Schulersitzung und die Rangliste werden wiederhergestellt...',
                    en: 'Restoring the learner session and leaderboard...',
                    pl: 'Przywracamy sesję ucznia i ranking...',
                  })
                : copy({
                    de: 'Die Rangliste wird geladen...',
                    en: 'Loading leaderboard...',
                    pl: 'Ładujemy ranking...',
                  })}
            </Text>
          </View>
        ) : error ? (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: '#ffffff',
              padding: 20,
              gap: 8,
            }}
          >
            <Text style={{ color: '#991b1b', fontWeight: '800', fontSize: 16 }}>
              {copy({
                de: 'Rangliste nicht verfügbar',
                en: 'Leaderboard unavailable',
                pl: 'Ranking niedostępny',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 21 }}>
              {error}{' '}
              {copy({
                de: 'Starte die Kangur-Web-API unter der konfigurierten Adresse und aktualisiere dann die Ansicht.',
                en: 'Start the Kangur web API at the configured address and then refresh the view.',
                pl: 'Uruchom webowe API Kangura pod skonfigurowanym adresem, a potem odśwież widok.',
              })}
            </Text>
          </View>
        ) : items.length === 0 ? (
          <View
            style={{
              borderRadius: 24,
              backgroundColor: '#ffffff',
              padding: 20,
            }}
          >
            <Text style={{ color: '#334155', fontSize: 15 }}>
              {copy({
                de: 'Kein Ergebnis passt zu den aktuellen Filtern.',
                en: 'No result matches the current filters.',
                pl: 'Żaden wynik nie pasuje do obecnych filtrów.',
              })}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {items.map((item) => (
              <View
                key={item.id}
                style={{
                  borderRadius: 22,
                  backgroundColor: item.isCurrentUser ? '#eef2ff' : '#ffffff',
                  borderWidth: 1,
                  borderColor: item.isCurrentUser ? '#c7d2fe' : '#e2e8f0',
                  padding: 16,
                  gap: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
                      {item.rankLabel}
                    </Text>
                    <View>
                      <Text
                        style={{
                          color: '#0f172a',
                          fontSize: 16,
                          fontWeight: '800',
                        }}
                      >
                        {item.playerName}
                      </Text>
                      <Text style={{ color: '#64748b', fontSize: 13 }}>
                        {item.metaLabel}
                      </Text>
                    </View>
                  </View>

                  {item.isCurrentUser ? (
                    <View
                      style={{
                        borderRadius: 999,
                        backgroundColor: '#1d4ed8',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                        {item.currentUserBadgeLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-end',
                  }}
                >
                  <Text style={{ color: '#475569', fontSize: 14 }}>
                    {item.operationSummary}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text
                      style={{
                        color: '#1d4ed8',
                        fontSize: 18,
                        fontWeight: '800',
                      }}
                    >
                      {item.scoreLabel}
                    </Text>
                    <Text style={{ color: '#64748b', fontSize: 13 }}>
                      {item.timeLabel}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#ffffff',
            padding: 18,
            gap: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Duell-Rangliste',
                en: 'Duel leaderboard',
                pl: 'Ranking pojedynków',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
              {copy({
                de: 'Mobile Rivalentabelle',
                en: 'Mobile rivals board',
                pl: 'Mobilna tabela rywali',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Vergleiche die aktuelle Form, prüfe ob dein Stand schon sichtbar ist und fordere Rivalen heraus, ohne den mobilen Ablauf zu verlassen.',
                en: 'Compare current form, check whether your standing is already visible, and challenge a rival without leaving the mobile flow.',
                pl: 'Porównaj bieżącą formę, sprawdź czy Twój wynik jest już widoczny i rzuć wyzwanie bez wychodzenia z mobilnego flow.',
              })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <SummaryChip
              label={copy({
                de: `Spieler ${duelLeaderboard.entries.length}`,
                en: `Players ${duelLeaderboard.entries.length}`,
                pl: `Gracze ${duelLeaderboard.entries.length}`,
              })}
              backgroundColor='#eff6ff'
              borderColor='#bfdbfe'
              textColor='#1d4ed8'
            />
            <SummaryChip
              label={
                duelTopWinRatePercent === null
                  ? copy({
                      de: 'Top-Quote wartet',
                      en: 'Top win rate pending',
                      pl: 'Top win rate czeka',
                    })
                  : copy({
                      de: `Top-Quote ${duelTopWinRatePercent}%`,
                      en: `Top win rate ${duelTopWinRatePercent}%`,
                      pl: `Top win rate ${duelTopWinRatePercent}%`,
                    })
              }
              backgroundColor='#fffbeb'
              borderColor='#fde68a'
              textColor='#b45309'
            />
            <SummaryChip
              label={
                duelLeaderboard.currentRank
                  ? copy({
                      de: `Deine Position #${duelLeaderboard.currentRank}`,
                      en: `Your rank #${duelLeaderboard.currentRank}`,
                      pl: `Twoja pozycja #${duelLeaderboard.currentRank}`,
                    })
                  : duelLeaderboard.isAuthenticated
                    ? copy({
                        de: 'Wartet auf Sichtbarkeit',
                        en: 'Waiting for visibility',
                        pl: 'Czeka na widoczność',
                      })
                    : copy({
                        de: 'Lernersitzung anmelden',
                        en: 'Sign in learner',
                        pl: 'Zaloguj ucznia',
                      })
              }
              backgroundColor='#ecfdf5'
              borderColor='#a7f3d0'
              textColor='#047857'
            />
          </View>

          {duelLeaderboard.isLoading ? (
            <Text style={{ color: '#334155', fontSize: 15 }}>
              {copy({
                de: 'Die Duell-Rangliste wird geladen...',
                en: 'Loading duel leaderboard...',
                pl: 'Ładujemy ranking pojedynków...',
              })}
            </Text>
          ) : duelLeaderboard.error ? (
            <View style={{ gap: 10 }}>
              <Text style={{ color: '#991b1b', fontSize: 14, lineHeight: 21 }}>
                {duelLeaderboard.error}
              </Text>
              <Pressable
                accessibilityRole='button'
                onPress={() => {
                  void duelLeaderboard.refresh();
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
          ) : duelLeaderboard.entries.length === 0 ? (
            <Text style={{ color: '#334155', fontSize: 15 }}>
              {copy({
                de: 'Es gibt in diesem Fenster noch keine abgeschlossenen Duelle. Die ersten beendeten Matches füllen hier sofort die mobile Rivalentabelle.',
                en: 'There are no completed duels in this window yet. The first finished matches will fill the mobile rivals table here right away.',
                pl: 'Nie ma jeszcze zakończonych pojedynków w tym oknie. Pierwsze skończone mecze od razu wypełnią tutaj mobilną tabelę rywali.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 12 }}>
              {duelLeaderboard.isAuthenticated ? (
                duelLeaderboard.currentEntry ? (
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
                      #{duelLeaderboard.currentRank} {duelLeaderboard.currentEntry.displayName}
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: `Siege ${duelLeaderboard.currentEntry.wins} • Niederlagen ${duelLeaderboard.currentEntry.losses} • Unentschieden ${duelLeaderboard.currentEntry.ties}`,
                        en: `Wins ${duelLeaderboard.currentEntry.wins} • Losses ${duelLeaderboard.currentEntry.losses} • Ties ${duelLeaderboard.currentEntry.ties}`,
                        pl: `Wygrane ${duelLeaderboard.currentEntry.wins} • Porażki ${duelLeaderboard.currentEntry.losses} • Remisy ${duelLeaderboard.currentEntry.ties}`,
                      })}
                    </Text>
                  </View>
                ) : (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Dein Konto ist in dieser mobilen Ranglisten-Momentaufnahme noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                      en: 'Your account is not visible in this mobile leaderboard snapshot yet. Finish another duel or open the lobby so your rank appears here.',
                      pl: 'Twojego konta nie widać jeszcze w tej mobilnej migawce rankingu. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
                    })}
                  </Text>
                )
              ) : (
                <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                  {copy({
                    de: 'Melde die Schulersitzung an, damit deine eigene Position in dieser mobilen Ranglisten-Momentaufnahme hervorgehoben wird.',
                    en: 'Sign in the learner session so your own standing can be highlighted in this mobile leaderboard snapshot.',
                    pl: 'Zaloguj sesję ucznia, aby wyróżnić tutaj Twoją pozycję w tej mobilnej migawce rankingu.',
                  })}
                </Text>
              )}

              {duelLeaderboard.actionError ? (
                <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                  {duelLeaderboard.actionError}
                </Text>
              ) : null}

              <View style={{ gap: 10 }}>
                {duelLeaderboard.entries.map((entry, index) => {
                  const isCurrentLearner =
                    duelLeaderboard.currentEntry?.learnerId === entry.learnerId;

                  return (
                    <View
                      key={entry.learnerId}
                      style={{
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: isCurrentLearner ? '#bfdbfe' : '#e2e8f0',
                        backgroundColor: isCurrentLearner ? '#eff6ff' : '#f8fafc',
                        padding: 14,
                        gap: 8,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
                            #{index + 1}
                          </Text>
                          <View style={{ gap: 4 }}>
                            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                              {entry.displayName}
                            </Text>
                            <Text style={{ color: '#475569', fontSize: 13 }}>
                              {copy({
                                de: `Siege ${entry.wins} • Niederlagen ${entry.losses} • Unentschieden ${entry.ties}`,
                                en: `Wins ${entry.wins} • Losses ${entry.losses} • Ties ${entry.ties}`,
                                pl: `Wygrane ${entry.wins} • Porażki ${entry.losses} • Remisy ${entry.ties}`,
                              })}
                            </Text>
                          </View>
                        </View>

                        {isCurrentLearner ? (
                          <View
                            style={{
                              borderRadius: 999,
                              backgroundColor: '#1d4ed8',
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                              {copy({
                                de: 'Du',
                                en: 'You',
                                pl: 'Ty',
                              })}
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Text style={{ color: '#64748b', fontSize: 13, lineHeight: 19 }}>
                        {copy({
                          de: `Matches ${entry.matches} • Quote ${Math.round(entry.winRate * 100)}% • letztes Duell ${formatKangurMobileScoreDateTime(entry.lastPlayedAt, locale)}`,
                          en: `Matches ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • last duel ${formatKangurMobileScoreDateTime(entry.lastPlayedAt, locale)}`,
                          pl: `Mecze ${entry.matches} • Win rate ${Math.round(entry.winRate * 100)}% • ostatni pojedynek ${formatKangurMobileScoreDateTime(entry.lastPlayedAt, locale)}`,
                        })}
                      </Text>

                      {duelLeaderboard.isAuthenticated && !isCurrentLearner ? (
                        <Pressable
                          accessibilityRole='button'
                          disabled={duelLeaderboard.isActionPending}
                          onPress={() => {
                            void duelLeaderboard.challengeLearner(entry.learnerId).then((sessionId) => {
                              if (sessionId) {
                                openDuelSession(sessionId);
                              }
                            });
                          }}
                          style={{
                            alignSelf: 'flex-start',
                            borderRadius: 999,
                            backgroundColor:
                              duelLeaderboard.isActionPending ? '#94a3b8' : '#1d4ed8',
                            paddingHorizontal: 12,
                            paddingVertical: 9,
                          }}
                        >
                          <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                            {duelLeaderboard.pendingLearnerId === entry.learnerId
                              ? copy({
                                  de: 'Duell wird gesendet...',
                                  en: 'Sending duel...',
                                  pl: 'Wysyłanie pojedynku...',
                                })
                              : copy({
                                  de: 'Herausfordern',
                                  en: 'Challenge player',
                                  pl: 'Rzuć wyzwanie',
                                })}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              <View style={{ alignSelf: 'stretch', gap: 10 }}>
                <Pressable
                  accessibilityRole='button'
                  onPress={() => {
                    void duelLeaderboard.refresh();
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

                <Link href={createKangurDuelsHref()} asChild>
                  <Pressable
                    accessibilityRole='button'
                    style={{
                      alignSelf: 'stretch',
                      width: '100%',
                      borderRadius: 999,
                      backgroundColor: '#0f172a',
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700', textAlign: 'center' }}>
                      {copy({
                        de: 'Duelle öffnen',
                        en: 'Open duels',
                        pl: 'Otwórz pojedynki',
                      })}
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          )}
        </View>

        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#ffffff',
            padding: 18,
            gap: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Lektionsbeherrschung',
                en: 'Lesson mastery',
                pl: 'Opanowanie lekcji',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
              {copy({
                de: 'Lektionsplan nach der Rangliste',
                en: 'Post-leaderboard lesson plan',
                pl: 'Plan lekcji po rankingu',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Nutze den Stand aus der Rangliste als Kontrollpunkt und entscheide sofort, was wiederholt und was nur warm gehalten werden soll.',
                en: 'Use the leaderboard state as a checkpoint and decide right away what needs review and what only needs to stay warm.',
                pl: 'Wykorzystaj stan z rankingu jako checkpoint i od razu zdecyduj, co wymaga powtórki, a co trzeba tylko podtrzymać.',
              })}
            </Text>
          </View>

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
                de: 'Es gibt noch keine gespeicherten Lektionsversuche. Öffne eine Lektion und speichere den ersten Checkpoint, damit hier Stärken und Wiederholungen erscheinen.',
                en: 'There are no saved lesson attempts yet. Open a lesson and save the first checkpoint to unlock strengths and review suggestions here.',
                pl: 'Nie ma jeszcze zapisanych prób lekcji. Otwórz lekcję i zapisz pierwszy checkpoint, aby odblokować tutaj mocne strony i powtórki.',
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
                  <Link href={weakestLesson.lessonHref} asChild>
                    <Pressable
                      accessibilityRole='button'
                      style={{
                        alignSelf: 'stretch',
                        width: '100%',
                        borderRadius: 999,
                        backgroundColor: '#0f172a',
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                      }}
                    >
                      <Text style={{ color: '#ffffff', fontWeight: '700', textAlign: 'center' }}>
                        {copy({
                          de: `Fokus: ${weakestLesson.title}`,
                          en: `Focus: ${weakestLesson.title}`,
                          pl: `Skup się: ${weakestLesson.title}`,
                        })}
                      </Text>
                    </Pressable>
                  </Link>
                ) : null}

                {strongestLesson ? (
                  <Link href={strongestLesson.lessonHref} asChild>
                    <Pressable
                      accessibilityRole='button'
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
                          de: `Stärke halten: ${strongestLesson.title}`,
                          en: `Maintain strength: ${strongestLesson.title}`,
                          pl: `Podtrzymaj: ${strongestLesson.title}`,
                        })}
                      </Text>
                    </Pressable>
                  </Link>
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
        </View>

        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#ffffff',
            padding: 18,
            gap: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
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
                de: 'Springe direkt zu den zuletzt gespeicherten Lektionen zurück, solange der Vergleich mit der Rangliste noch frisch ist.',
                en: 'Jump back to the most recently saved lessons while the leaderboard comparison is still fresh.',
                pl: 'Wróć od razu do ostatnio zapisanych lekcji, dopóki porównanie z rankingiem jest jeszcze świeże.',
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
              <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
                {copy({
                  de: 'Lektionen fortsetzen',
                  en: 'Continue lessons',
                  pl: 'Kontynuuj lekcje',
                })}
              </Text>

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
        </View>

        <View
          style={{
            borderRadius: 24,
            backgroundColor: '#ffffff',
            padding: 18,
            gap: 14,
            shadowColor: '#0f172a',
            shadowOpacity: 0.08,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 3,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'Nach der Rangliste',
                en: 'After leaderboard',
                pl: 'Po rankingu',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
              {copy({
                de: 'Lokale Aufgaben nach der Rangliste',
                en: 'Local tasks after leaderboard',
                pl: 'Lokalne zadania po rankingu',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Wandle den Blick auf die Rangliste direkt in die nächsten lokalen Schritte um, ohne den Trainingsfluss zu verlieren.',
                en: 'Turn the leaderboard check directly into the next local actions without losing the training flow.',
                pl: 'Zamień sprawdzenie rankingu od razu w kolejne lokalne kroki, bez gubienia rytmu treningu.',
              })}
            </Text>
          </View>

          {leaderboardAssignments.assignmentItems.length === 0 ? (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine lokalen Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
                en: 'There are no local tasks yet. Open lessons or complete more practice to build the next plan.',
                pl: 'Nie ma jeszcze lokalnych zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {leaderboardAssignments.assignmentItems.map((item) => (
                <LeaderboardAssignmentRow key={item.assignment.id} item={item} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
