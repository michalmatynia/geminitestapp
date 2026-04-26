import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  useKangurMobileLessonCheckpoints,
} from '../lessons/useKangurMobileLessonCheckpoints';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobilePendingActionButton,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
} from '../shared/KangurMobileUi';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  AssignmentRow,
  DailyPlanBadgeChip,
  DUELS_ROUTE,
  FocusCard,
  LessonCheckpointRow,
  LESSONS_ROUTE,
  LessonMasteryRow,
  PROFILE_ROUTE,
  RecentResultRow,
  RESULTS_ROUTE,
} from './daily-plan-primitives';
import { useKangurMobileDailyPlanAssignments } from './useKangurMobileDailyPlanAssignments';
import {
  useKangurMobileDailyPlanBadges,
} from './useKangurMobileDailyPlanBadges';
import { useKangurMobileDailyPlanDuels } from './useKangurMobileDailyPlanDuels';
import { useKangurMobileDailyPlan } from './useKangurMobileDailyPlan';
import { useKangurMobileDailyPlanLessonMastery } from './useKangurMobileDailyPlanLessonMastery';

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

  let lessonFocusSummary: string | null = null;
  if (weakestLesson !== null) {
    lessonFocusSummary = copy({
      de: `Fokus für heute: ${weakestLesson.title} braucht noch eine kurze Wiederholung, bevor du wieder Tempo aufnimmst.`,
      en: `Focus for today: ${weakestLesson.title} still needs a short review before you build pace again.`,
      pl: `Fokus na dziś: ${weakestLesson.title} potrzebuje jeszcze krótkiej powtórki, zanim znowu wejdziesz w tempo.`,
    });
  } else if (strongestLesson !== null) {
    lessonFocusSummary = copy({
      de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und eignet sich für einen kurzen sicheren Einstieg.`,
      en: `Stable strength: ${strongestLesson.title} is holding its level and works well for a short confident start.`,
      pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i nadaje się na krótki, pewny start.`,
    });
  }

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
        <View style={{ gap: 14 }}>
          <LinkButton
            href='/'
            label={copy({
              de: 'Zurück',
              en: 'Back',
              pl: 'Wróć',
            })}
          />

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
              <ActionButton
                label={copy({
                  de: 'Plan aktualisieren',
                  en: 'Refresh plan',
                  pl: 'Odśwież plan',
                })}
                onPress={() => refresh()}
                stretch
                tone='secondary'
              />
            </View>

            {(() => {
              if (isLoadingAuth && !isAuthenticated) {
                return (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Die Anmeldung wird wiederhergestellt. Sobald sie bereit ist, lädt der Plan Ergebnisse und Trainingshinweise.',
                      en: 'Restoring sign-in. Once it is ready, the plan will load results and training guidance.',
                      pl: 'Przywracamy logowanie. Gdy będzie gotowe, plan pobierze wyniki i wskazówki treningowe.',
                    })}
                  </Text>
                );
              }
              if (!isAuthenticated) {
                if (supportsLearnerCredentials) {
                  return (
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
                  );
                }
                return (
                  <ActionButton
                    label={copy({
                      de: 'Demo starten',
                      en: 'Start demo',
                      pl: 'Uruchom demo',
                    })}
                    onPress={() => signIn()}
                    tone='brand'
                  />
                );
              }
              return null;
            })()}

            {authError !== null && authError !== '' ? (
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
            {(() => {
              if (isLoading) {
                return (
                  <Text style={{ color: '#475569' }}>
                    {copy({
                      de: 'Der ergebnisbasierte Fokus wird geladen...',
                      en: 'Loading score-based focus...',
                      pl: 'Ładujemy fokus oparty na wynikach...',
                    })}
                  </Text>
                );
              }
              if (scoreError !== null && scoreError !== '') {
                return (
                  <Text style={{ color: '#b91c1c', lineHeight: 20 }}>{scoreError}</Text>
                );
              }
              if (!isAuthenticated) {
                return (
                  <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({
                      de: 'Melde dich an, um Hinweise für den stärksten und schwächsten Modus freizuschalten.',
                      en: 'Sign in to unlock guidance for the strongest and weakest modes.',
                      pl: 'Zaloguj się, aby odblokować wskazówki dla najmocniejszego i najsłabszego trybu.',
                    })}
                  </Text>
                );
              }
              if (weakestFocus === null && strongestFocus === null) {
                return (
                  <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({
                      de: 'Schließe einen Lauf ab, um den ersten Trainingsfokus aufzubauen.',
                      en: 'Finish one run to build the first training focus.',
                      pl: 'Ukończ jedną serię, aby zbudować pierwszy fokus treningowy.',
                    })}
                  </Text>
                );
              }
              return (
                <View style={{ gap: 12 }}>
                  {weakestFocus !== null ? (
                    <FocusCard
                      accentColor='#b91c1c'
                      description={copy({
                        de: 'Das ist aktuell der schwächste Bereich in deinen Ergebnissen. Zacznij od krótkiej celowanej serii, a potem wróć do pasującej lekcji, jeśli będzie trzeba.',
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
                  {strongestFocus !== null ? (
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
              );
            })()}
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
                  duelPlan.currentRank !== null && duelPlan.currentRank !== 0
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

            {(() => {
              if (duelPlan.isRestoringAuth || duelPlan.isLoading) {
                return (
                  <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({
                      de: 'Der heutige Duellstand wird geladen...',
                      en: 'Loading today’s duel standing...',
                      pl: 'Ładujemy dzisiejszy stan pojedynków...',
                    })}
                  </Text>
                );
              }
              if (duelPlan.error !== null && duelPlan.error !== '') {
                return (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                      {duelPlan.error}
                    </Text>
                    <ActionButton
                      label={copy({
                        de: 'Duelle aktualisieren',
                        en: 'Refresh duels',
                        pl: 'Odśwież pojedynki',
                      })}
                      onPress={() => duelPlan.refresh()}
                    />
                  </View>
                );
              }
              if (!duelPlan.isAuthenticated) {
                return (
                  <Text style={{ color: '#475569', lineHeight: 22 }}>
                    {copy({
                      de: 'Melde dich an, um hier deinen Duellstand, letzte Rivalen und schnelle Rückkämpfe zu sehen.',
                      en: 'Sign in to see duel standing, recent rivals, and quick rematches here.',
                      pl: 'Zaloguj się, aby zobaczyć tutaj stan w pojedynkach, ostatnich rywali i szybkie rewanże.',
                    })}
                  </Text>
                );
              }
              return (
                <View style={{ gap: 12 }}>
                  {duelPlan.currentEntry !== null ? (
                    <InsetPanel
                      gap={8}
                      style={{
                        borderColor: '#bfdbfe',
                        backgroundColor: '#eff6ff',
                      }}
                    >
                      <Text
                        style={{
                          color: '#1d4ed8',
                          fontSize: 12,
                          fontWeight: '800',
                        }}
                      >
                        {copy({
                          de: 'DEIN DUELLSTAND',
                          en: 'YOUR DUEL SNAPSHOT',
                          pl: 'TWÓJ WYNIK W POJEDYNKACH',
                        })}
                      </Text>
                      <Text
                        style={{
                          color: '#0f172a',
                          fontSize: 18,
                          fontWeight: '800',
                        }}
                      >
                        #{duelPlan.currentRank} {duelPlan.currentEntry.displayName}
                      </Text>
                      <Text
                        style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}
                      >
                        {copy({
                          de: `Siege ${duelPlan.currentEntry.wins} • Niederlagen ${duelPlan.currentEntry.losses} • Unentschieden ${duelPlan.currentEntry.ties}`,
                          en: `Wins ${duelPlan.currentEntry.wins} • Losses ${duelPlan.currentEntry.losses} • Ties ${duelPlan.currentEntry.ties}`,
                          pl: `Wygrane ${duelPlan.currentEntry.wins} • Porażki ${duelPlan.currentEntry.losses} • Remisy ${duelPlan.currentEntry.ties}`,
                        })}
                      </Text>
                    </InsetPanel>
                  ) : (
                    <Text style={{ color: '#475569', lineHeight: 22 }}>
                      {copy({
                        de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                        en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                        pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
                      })}
                    </Text>
                  )}

                  {duelPlan.actionError !== null && duelPlan.actionError !== '' ? (
                    <Text style={{ color: '#b91c1c', lineHeight: 20 }}>
                      {duelPlan.actionError}
                    </Text>
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
                        <InsetPanel key={opponent.learnerId} gap={8}>
                          <Text
                            style={{
                              color: '#0f172a',
                              fontSize: 16,
                              fontWeight: '800',
                            }}
                          >
                            {opponent.displayName}
                          </Text>
                          <Text
                            style={{
                              color: '#64748b',
                              fontSize: 12,
                              lineHeight: 18,
                            }}
                          >
                            {copy({
                              de: `Letztes Duell ${formatKangurMobileScoreDateTime(
                                opponent.lastPlayedAt,
                                locale,
                              )}`,
                              en: `Last duel ${formatKangurMobileScoreDateTime(
                                opponent.lastPlayedAt,
                                locale,
                              )}`,
                              pl: `Ostatni pojedynek ${formatKangurMobileScoreDateTime(
                                opponent.lastPlayedAt,
                                locale,
                              )}`,
                            })}
                          </Text>
                          <KangurMobilePendingActionButton
                            horizontalPadding={14}
                            label={copy({
                              de: 'Schneller Rückkampf',
                              en: 'Quick rematch',
                              pl: 'Szybki rewanż',
                            })}
                            onPress={() => {
                              void duelPlan
                                .createRematch(opponent.learnerId)
                                .then((sessionId) => {
                                  if (sessionId !== null && sessionId !== '') {
                                    openDuelSession(sessionId);
                                  }
                                });
                            }}
                            pending={
                              duelPlan.pendingOpponentLearnerId ===
                              opponent.learnerId
                            }
                            pendingLabel={copy({
                              de: 'Rückkampf wird gesendet...',
                              en: 'Sending rematch...',
                              pl: 'Wysyłanie rewanżu...',
                            })}
                          />
                        </InsetPanel>
                      ))}
                    </View>
                  )}

                  <View style={{ alignSelf: 'stretch', gap: 10 }}>
                    <ActionButton
                      label={copy({
                        de: 'Duelle aktualisieren',
                        en: 'Refresh duels',
                        pl: 'Odśwież pojedynki',
                      })}
                      onPress={() => duelPlan.refresh()}
                      stretch
                      tone='secondary'
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
                  </View>
                </View>
              );
            })()}
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
    </KangurMobileScrollScreen>
  );
}
