import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  useKangurMobileLessonCheckpoints,
} from '../lessons/useKangurMobileLessonCheckpoints';
import {
  KangurMobileActionButton,
  KangurMobileCard as Card,
  KangurMobileFilterChip,
  KangurMobileLinkButton as LinkButton,
  KangurMobileScrollScreen,
  KangurMobileSectionTitle,
  KangurMobileSummaryChip,
} from '../shared/KangurMobileUi';
import {
  FILTER_SCROLL_STYLE,
  LeaderboardAssignmentRow,
  LeaderboardBadgeChip,
  LESSONS_ROUTE,
  LessonCheckpointRow,
  LessonMasteryRow,
  PLAN_ROUTE,
  PROFILE_ROUTE,
} from './leaderboard-primitives';
import { useKangurMobileLeaderboard } from './useKangurMobileLeaderboard';
import {
  useKangurMobileLeaderboardAssignments,
} from './useKangurMobileLeaderboardAssignments';
import {
  useKangurMobileLeaderboardLessonMastery,
} from './useKangurMobileLeaderboardLessonMastery';
import {
  useKangurMobileLeaderboardBadges,
} from './useKangurMobileLeaderboardBadges';
import { useKangurMobileLeaderboardDuels } from './useKangurMobileLeaderboardDuels';
import { LeaderboardDuelsSection } from './leaderboard-duels-section';

export function KangurLeaderboardScreen(): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
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
    <KangurMobileScrollScreen
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
          <LinkButton
            href='/'
            label={copy({
              de: 'Zurück',
              en: 'Back',
              pl: 'Wróć',
            })}
          />

          <KangurMobileSectionTitle
            title={copy({
              de: 'Rangliste',
              en: 'Leaderboard',
              pl: 'Ranking',
            })}
            subtitle={copy({
              de: 'Prüfe die letzten Ergebnisse, vergleiche das Duelltempo und springe direkt zurück in die nächsten Lernschritte.',
              en: 'Check the latest results, compare duel momentum, and jump straight back into your next study steps.',
              pl: 'Sprawdź ostatnie wyniki, porównaj tempo w pojedynkach i od razu wróć do kolejnych kroków nauki.',
            })}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <KangurMobileSummaryChip
              label={copy({
                de: `Ergebnisse ${visibleCount}`,
                en: `Results ${visibleCount}`,
                pl: `Wyniki ${visibleCount}`,
              })}
            />
            <KangurMobileSummaryChip
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
            <KangurMobileSummaryChip
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
            <LinkButton
              href={PLAN_ROUTE}
              label={copy({
                de: 'Tagesplan jetzt',
                en: 'Daily plan now',
                pl: 'Plan dnia teraz',
              })}
              stretch
            />

            <LinkButton
              href={createKangurDuelsHref()}
              label={copy({
                de: 'Duell-Lobby öffnen',
                en: 'Open duel lobby',
                pl: 'Otwórz lobby pojedynków',
              })}
              stretch
              tone='primary'
            />
          </View>
        </View>

        <Card gap={14} padding={18}>
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
            <KangurMobileSummaryChip
              label={copy({
                de: `Freigeschaltet ${leaderboardBadges.unlockedBadges}/${leaderboardBadges.totalBadges}`,
                en: `Unlocked ${leaderboardBadges.unlockedBadges}/${leaderboardBadges.totalBadges}`,
                pl: `Odblokowane ${leaderboardBadges.unlockedBadges}/${leaderboardBadges.totalBadges}`,
              })}
            />
            <KangurMobileSummaryChip
              label={copy({
                de: `Offen ${leaderboardBadges.remainingBadges}`,
                en: `Remaining ${leaderboardBadges.remainingBadges}`,
                pl: `Do zdobycia ${leaderboardBadges.remainingBadges}`,
              })}
              backgroundColor='#fffbeb'
              borderColor='#fde68a'
              textColor='#b45309'
            />
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

          <LinkButton
            href={PROFILE_ROUTE}
            label={copy({
              de: 'Profil und Abzeichen öffnen',
              en: 'Open profile and badges',
              pl: 'Otwórz profil i odznaki',
            })}
          />
        </Card>

        <Card gap={14} padding={18}>
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
                <KangurMobileFilterChip
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
                <KangurMobileFilterChip
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
            <KangurMobileActionButton
              label={copy({
                de: 'Aktualisieren',
                en: 'Refresh',
                pl: 'Odśwież',
              })}
              onPress={() => refresh()}
            />
          </View>
        </Card>

        {isLoading ? (
          <Card padding={20}>
            <Text style={{ color: '#334155', fontSize: 15 }}>
              {isRestoringAuth
                ? copy({
                    de: 'Die Anmeldung und die Rangliste werden wiederhergestellt...',
                    en: 'Restoring sign-in and leaderboard...',
                    pl: 'Przywracamy logowanie i ranking...',
                  })
                : copy({
                    de: 'Die Rangliste wird geladen...',
                    en: 'Loading leaderboard...',
                    pl: 'Ładujemy ranking...',
                })}
            </Text>
          </Card>
        ) : error ? (
          <Card gap={8} padding={20}>
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
                de: 'Starte die Kangur-Web-API unter der konfigurierten Adresse und aktualisiere danach die Rangliste.',
                en: 'Start the Kangur web API at the configured address and then refresh the leaderboard.',
                pl: 'Uruchom webowe API Kangura pod skonfigurowanym adresem, a potem odśwież ranking.',
              })}
            </Text>
          </Card>
        ) : items.length === 0 ? (
          <Card padding={20}>
            <Text style={{ color: '#334155', fontSize: 15 }}>
              {copy({
                de: 'Kein Ergebnis passt zu den aktuellen Filtern.',
                en: 'No result matches the current filters.',
                pl: 'Żaden wynik nie pasuje do obecnych filtrów.',
              })}
            </Text>
          </Card>
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

        <LeaderboardDuelsSection
          duelLeaderboard={duelLeaderboard}
          duelTopWinRatePercent={duelTopWinRatePercent}
          openDuelSession={openDuelSession}
        />

        <Card gap={14} padding={18}>
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
            <KangurMobileSummaryChip
              label={copy({
                de: `Verfolgt ${lessonMastery.trackedLessons}`,
                en: `Tracked ${lessonMastery.trackedLessons}`,
                pl: `Śledzone ${lessonMastery.trackedLessons}`,
              })}
            />
            <KangurMobileSummaryChip
              label={copy({
                de: `Beherrscht ${lessonMastery.masteredLessons}`,
                en: `Mastered ${lessonMastery.masteredLessons}`,
                pl: `Opanowane ${lessonMastery.masteredLessons}`,
              })}
              backgroundColor='#ecfdf5'
              borderColor='#a7f3d0'
              textColor='#047857'
            />
            <KangurMobileSummaryChip
              label={copy({
                de: `Zum Wiederholen ${lessonMastery.lessonsNeedingPractice}`,
                en: `Needs review ${lessonMastery.lessonsNeedingPractice}`,
                pl: `Do powtórki ${lessonMastery.lessonsNeedingPractice}`,
              })}
              backgroundColor='#fffbeb'
              borderColor='#fde68a'
              textColor='#b45309'
            />
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

        <Card gap={14} padding={18}>
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

        <Card gap={14} padding={18}>
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
                de: 'Plan nach der Rangliste',
                en: 'Post-leaderboard plan',
                pl: 'Plan po rankingu',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Wandle den Blick auf die Rangliste direkt in die nächsten Schritte um, ohne den Trainingsfluss zu verlieren.',
                en: 'Turn the leaderboard check directly into the next steps without losing the training flow.',
                pl: 'Zamień sprawdzenie rankingu od razu w kolejne kroki, bez gubienia rytmu treningu.',
              })}
            </Text>
          </View>

          {leaderboardAssignments.assignmentItems.length === 0 ? (
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Es gibt noch keine nächsten Schritte. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
                en: 'There are no next steps yet. Open lessons or complete more practice to build the next plan.',
                pl: 'Nie ma jeszcze kolejnych kroków. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
              })}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {leaderboardAssignments.assignmentItems.map((item) => (
                <LeaderboardAssignmentRow key={item.assignment.id} item={item} />
              ))}
            </View>
          )}
        </Card>
    </KangurMobileScrollScreen>
  );
}
