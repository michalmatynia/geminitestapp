import { resolveKangurLessonFocusForPracticeOperation } from '@kangur/core';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  createKangurLessonHref,
  createKangurLessonHrefForPracticeOperation,
} from '../lessons/lessonHref';
import { useKangurMobileLessonCheckpoints } from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import { createKangurPracticeHref } from '../practice/practiceHref';
import {
  formatKangurMobileScoreFamily,
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreDuration,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
  getKangurMobileScoreFamily,
} from './mobileScoreSummary';
import {
  KangurMobileActionButton as ActionButton,
  KangurMobileCard as Card,
  KangurMobileFilterChip,
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMetric as Metric,
  KangurMobilePill as Pill,
  KangurMobileScrollScreen,
  KangurMobileSummaryChip,
} from '../shared/KangurMobileUi';
import { createKangurResultsHref } from './resultsHref';
import { useKangurMobileResults } from './useKangurMobileResults';
import { useKangurMobileResultsAssignments } from './useKangurMobileResultsAssignments';
import { useKangurMobileResultsLessonMastery } from './useKangurMobileResultsLessonMastery';
import { useKangurMobileResultsBadges } from './useKangurMobileResultsBadges';
import { useKangurMobileResultsDuels } from './useKangurMobileResultsDuels';
import { ResultsDuelsCard } from './results-duels-card';
import {
  LessonCheckpointRow,
  LessonMasteryRow,
  OperationInsightCard,
  ResultsAssignmentRow,
  ResultsBadgeChip,
  getAccuracyTone,
  getOperationTone,
  resolveResultsFilterFamily,
  resolveResultsFilterOperation,
} from './results-primitives';

const RESULTS_HOME_ROUTE = '/' as const;
const LESSONS_ROUTE = '/lessons' as Href;
const DUELS_ROUTE = createKangurDuelsHref();
const PROFILE_ROUTE = '/profile' as Href;

export function KangurResultsScreen(): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const router = useRouter();
  const params = useLocalSearchParams<{
    family?: string | string[];
    operation?: string | string[];
  }>();
  const filterFamily = resolveResultsFilterFamily(params.family);
  const filterOperation = resolveResultsFilterOperation(params.operation);
  const results = useKangurMobileResults({
    family: filterOperation ? 'all' : filterFamily,
    operation: filterOperation,
  });
  const duelResults = useKangurMobileResultsDuels();
  const resultsAssignments = useKangurMobileResultsAssignments();
  const lessonMastery = useKangurMobileResultsLessonMastery();
  const resultsBadges = useKangurMobileResultsBadges();
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const strongestOperation = results.operationPerformance[0] ?? null;
  const weakestOperation =
    results.operationPerformance.length > 1
      ? results.operationPerformance[results.operationPerformance.length - 1]
      : null;
  const weakestLesson = lessonMastery.weakest[0] ?? null;
  const strongestLesson = lessonMastery.strongest[0] ?? null;
  const lessonFocusSummary = weakestLesson
    ? copy({
        de: `Fokus nach den Ergebnissen: ${weakestLesson.title} braucht noch eine schnelle Wiederholung, bevor du wieder Tempo aufbaust.`,
        en: `Post-results focus: ${weakestLesson.title} still needs a quick review before you build momentum again.`,
        pl: `Fokus po wynikach: ${weakestLesson.title} potrzebuje jeszcze szybkiej powtórki, zanim znowu wejdziesz w tempo.`,
      })
    : strongestLesson
      ? copy({
          de: `Stabile Stärke: ${strongestLesson.title} hält das Niveau und eignet sich für einen kurzen sicheren Einstieg.`,
          en: `Stable strength: ${strongestLesson.title} is holding its level and works well for a short confidence run.`,
          pl: `Stabilna mocna strona: ${strongestLesson.title} trzyma poziom i nadaje się na krótkie, pewne wejście.`,
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
        <View style={{ gap: 14 }}>
          <LinkButton
            href={RESULTS_HOME_ROUTE}
            label={copy({
              de: 'Zurück',
              en: 'Back',
              pl: 'Wróć',
            })}
          />

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              {copy({
                de: 'In den Ergebnissen',
                en: 'In results',
                pl: 'W wynikach',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {copy({
                de: 'Ergebniszentrale',
                en: 'Results hub',
                pl: 'Centrum wyników',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Ein Ort für letzte Ergebnisse, Trefferquote und die Verteilung auf Arithmetik, Zeit und Logik.',
                en: 'One place for recent results, accuracy, and how they split across arithmetic, time, and logic.',
                pl: 'Jedno miejsce dla ostatnich wyników, skuteczności i tego, jak rozkładają się na arytmetykę, czas i logikę.',
              })}
            </Text>
            <LinkButton
              href={createKangurPlanHref()}
              label={copy({
                de: 'Tagesplan öffnen',
                en: 'Open daily plan',
                pl: 'Otwórz plan dnia',
              })}
              style={{ paddingHorizontal: 16 }}
              verticalPadding={12}
            />
          </Card>

          {results.isLoading ? (
            <Card>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die Anmeldung und die Ergebnisse werden wiederhergestellt.',
                  en: 'Restoring sign-in and results.',
                  pl: 'Przywracamy logowanie i wyniki.',
                })}
              </Text>
            </Card>
          ) : !results.isEnabled ? (
            <Card>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Melde dich an, um Ergebnisse zu sehen.',
                  en: 'Sign in to see results.',
                  pl: 'Zaloguj się, aby zobaczyć wyniki.',
                })}
              </Text>
              <LinkButton
                href={RESULTS_HOME_ROUTE}
                label={copy({
                  de: 'Zum Login',
                  en: 'Go to sign in',
                  pl: 'Przejdź do logowania',
                })}
                style={{ paddingHorizontal: 16 }}
                tone='brand'
                verticalPadding={12}
              />
            </Card>
          ) : (
            <>
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
                    de: 'Ergebnisse',
                    en: 'Results',
                    pl: 'Wyniki',
                  })}
                  value={`${results.summary.totalSessions}`}
                  description={copy({
                    de: 'Dieser Bereich umfasst die letzten 40 Versuche.',
                    en: 'This section includes the latest 40 attempts.',
                    pl: 'Ta sekcja obejmuje 40 ostatnich podejść.',
                  })}
                />
                <Metric
                  label={copy({
                    de: 'Durchschnitt',
                    en: 'Average',
                    pl: 'Średnia',
                  })}
                  value={`${results.summary.averageAccuracyPercent}%`}
                  description={copy({
                    de: `Beste Trefferquote: ${results.summary.bestAccuracyPercent}%`,
                    en: `Best accuracy: ${results.summary.bestAccuracyPercent}%`,
                    pl: `Najlepsza skuteczność: ${results.summary.bestAccuracyPercent}%`,
                  })}
                />
                <Metric
                  label={copy({
                    de: 'Arithmetik',
                    en: 'Arithmetic',
                    pl: 'Arytmetyka',
                  })}
                  value={`${results.summary.arithmeticSessions}`}
                  description={copy({
                    de: 'Addition, Subtraktion, Multiplikation, Division und ähnliche Modi.',
                    en: 'Addition, subtraction, multiplication, division, and similar modes.',
                    pl: 'Dodawanie, odejmowanie, mnożenie, dzielenie i podobne tryby.',
                  })}
                />
                <Metric
                  label={copy({
                    de: 'Zeit',
                    en: 'Time',
                    pl: 'Czas',
                  })}
                  value={`${results.summary.timeSessions}`}
                  description={copy({
                    de: 'Uhr und Kalender.',
                    en: 'Clock and calendar.',
                    pl: 'Zegar i kalendarz.',
                  })}
                />
                <Metric
                  label={copy({
                    de: 'Logik',
                    en: 'Logic',
                    pl: 'Logika',
                  })}
                  value={`${results.summary.logicSessions}`}
                  description={copy({
                    de: 'Alle verfügbaren Logiksitzungen.',
                    en: 'All available logic sessions.',
                    pl: 'Wszystkie dostępne sesje logiczne.',
                  })}
                />
              </View>

              {results.operationPerformance.length > 0 ? (
                <Card>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: 'Einblicke nach Modi',
                        en: 'Mode insights',
                        pl: 'Wnioski po trybach',
                      })}
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Hier siehst du den stärksten und schwächsten Modus im aktuellen Filterbereich auf einen Blick.',
                        en: 'See the strongest and weakest mode in the current filter scope at a glance.',
                        pl: 'Tutaj od razu widać najmocniejszy i najsłabszy tryb w aktualnym zakresie filtrowania.',
                      })}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    {strongestOperation ? (
                      <OperationInsightCard
                        description={copy({
                          de: `Höchste durchschnittliche Trefferquote. Bester Versuch ${strongestOperation.bestAccuracyPercent}%.`,
                          en: `Highest average accuracy. Best attempt ${strongestOperation.bestAccuracyPercent}%.`,
                          pl: `Najwyższa średnia skuteczność. Najlepsza próba ${strongestOperation.bestAccuracyPercent}%.`,
                        })}
                        lessonHref={(() => {
                          const focus = resolveKangurLessonFocusForPracticeOperation(
                            strongestOperation.operation,
                          );
                          return focus ? createKangurLessonHref(focus) : undefined;
                        })()}
                        operation={strongestOperation}
                        practiceLabel={copy({
                          de: 'Tempo halten',
                          en: 'Keep the momentum',
                          pl: 'Utrzymaj tempo',
                        })}
                        title={copy({
                          de: 'Stärkster Modus',
                          en: 'Strongest mode',
                          pl: 'Najmocniejszy tryb',
                        })}
                      />
                    ) : null}
                    {weakestOperation ? (
                      <OperationInsightCard
                        description={copy({
                          de: `Bester Kandidat für die nächste Wiederholung. Bester Versuch ${weakestOperation.bestAccuracyPercent}%.`,
                          en: `Best candidate for the next review. Best attempt ${weakestOperation.bestAccuracyPercent}%.`,
                          pl: `Najlepszy kandydat do kolejnej powtórki. Najlepsza próba ${weakestOperation.bestAccuracyPercent}%.`,
                        })}
                        lessonHref={(() => {
                          const focus = resolveKangurLessonFocusForPracticeOperation(
                            weakestOperation.operation,
                          );
                          return focus ? createKangurLessonHref(focus) : undefined;
                        })()}
                        operation={weakestOperation}
                        practiceLabel={copy({
                          de: 'Schwächsten Modus trainieren',
                          en: 'Practice weakest mode',
                          pl: 'Trenuj najsłabszy tryb',
                        })}
                        title={copy({
                          de: 'Zum Wiederholen',
                          en: 'Needs review',
                          pl: 'Do powtórki',
                        })}
                      />
                    ) : null}
                  </View>
                </Card>
              ) : null}

              <Card>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                    {copy({
                      de: 'Nach den Ergebnissen',
                      en: 'After results',
                      pl: 'Po wynikach',
                    })}
                  </Text>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {copy({
                      de: 'Plan nach den Ergebnissen',
                      en: 'Post-results plan',
                      pl: 'Plan po wynikach',
                    })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Verwandle die letzten Ergebnisse direkt in die nächsten Schritte, ohne den Trainingsfluss zu verlieren.',
                      en: 'Turn the latest results directly into the next steps without losing the training flow.',
                      pl: 'Zamień ostatnie wyniki od razu w kolejne kroki, bez gubienia rytmu treningu.',
                    })}
                  </Text>
                </View>

                {resultsAssignments.assignmentItems.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt noch keine Aufgaben. Öffne Lektionen oder absolviere weitere Trainings, um den nächsten Plan aufzubauen.',
                      en: 'There are no tasks yet. Open lessons or complete more practice to build the next plan.',
                      pl: 'Nie ma jeszcze zadań. Otwórz lekcje albo wykonaj kolejne treningi, aby zbudować następny plan.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {resultsAssignments.assignmentItems.map((item) => (
                      <ResultsAssignmentRow key={item.assignment.id} item={item} />
                    ))}
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
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {copy({
                      de: 'Abzeichen-Zentrale',
                      en: 'Badge hub',
                      pl: 'Centrum odznak',
                    })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Behalte im Blick, was schon freigeschaltet ist und welches Ziel am nächsten an der nächsten Abzeichenstufe liegt.',
                      en: 'Keep track of what is already unlocked and which goal is closest to the next badge threshold.',
                      pl: 'Śledź, co jest już odblokowane i który cel jest najbliżej kolejnego progu odznaki.',
                    })}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <KangurMobileSummaryChip
                    label={copy({
                      de: `Freigeschaltet ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
                      en: `Unlocked ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
                      pl: `Odblokowane ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
                    })}
                  />
                  <KangurMobileSummaryChip
                    label={copy({
                      de: `Offen ${resultsBadges.remainingBadges}`,
                      en: `Remaining ${resultsBadges.remainingBadges}`,
                      pl: `Do zdobycia ${resultsBadges.remainingBadges}`,
                    })}
                    backgroundColor='#fffbeb'
                    borderColor='#fde68a'
                    textColor='#b45309'
                  />
                </View>

                {resultsBadges.recentBadges.length === 0 ? (
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
                      {resultsBadges.recentBadges.map((item) => (
                        <ResultsBadgeChip key={item.id} item={item} />
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
                      de: 'Lektionsbeherrschung',
                      en: 'Lesson mastery',
                      pl: 'Opanowanie lekcji',
                    })}
                  </Text>
                  <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
                    {copy({
                      de: 'Lektionsplan nach den Ergebnissen',
                      en: 'Post-results lesson plan',
                      pl: 'Plan lekcji po wynikach',
                    })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Verbinde die letzten Ergebnisse direkt mit lokal gespeicherten Lektionsständen und entscheide sofort, was wiederholt und was nur gehalten werden soll.',
                      en: 'Connect the latest results directly with saved lesson progress and decide right away what needs review and what only needs maintaining.',
                      pl: 'Połącz ostatnie wyniki z zapisanym opanowaniem lekcji i od razu zdecyduj, co powtórzyć, a co tylko podtrzymać.',
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

              <ResultsDuelsCard
                duelResults={duelResults}
                duelsHref={DUELS_ROUTE}
                openDuelSession={openDuelSession}
              />

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
                      de: 'Springe direkt zu den zuletzt gespeicherten Lektionen zurück, solange die letzte Sitzung noch frisch im Kopf ist.',
                      en: 'Jump back to the most recently saved lessons while the latest session is still fresh in mind.',
                      pl: 'Wróć do ostatnio zapisanych lekcji, dopóki ostatnia sesja jest jeszcze świeża w pamięci.',
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
                    <LinkButton
                      href={LESSONS_ROUTE}
                      label={copy({
                        de: 'Lektionen öffnen',
                        en: 'Open lessons',
                        pl: 'Otwórz lekcje',
                      })}
                      style={{ paddingHorizontal: 12 }}
                      verticalPadding={9}
                    />
                  </View>
                )}
              </Card>

              <Card>
                <View
                  style={{
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                      {copy({
                        de: 'Vollständige Liste',
                        en: 'Full list',
                        pl: 'Pełna lista',
                      })}
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      {copy({
                        de: 'Hier kannst du die gesamte Ergebnisliste aktualisieren und ohne Umwege durch die letzten Einträge gehen.',
                        en: 'Refresh the full results list here and move through the latest entries without leaving this section.',
                        pl: 'Tutaj odświeżysz pełną listę wyników i przejdziesz przez ostatnie wpisy bez wychodzenia z tej sekcji.',
                      })}
                    </Text>
                  </View>
                  <ActionButton
                    label={copy({
                      de: 'Aktualisieren',
                      en: 'Refresh',
                      pl: 'Odśwież',
                    })}
                    onPress={() => results.refresh()}
                  />
                </View>

                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <KangurMobileFilterChip
                      href={createKangurResultsHref({
                        family: 'all',
                        operation: null,
                      })}
                      horizontalPadding={12}
                      idleTextColor='#475569'
                      label={copy({
                        de: 'Alle Ergebnisse',
                        en: 'All results',
                        pl: 'Wszystkie wyniki',
                      })}
                      selected={filterFamily === 'all' && !filterOperation}
                      selectedBackgroundColor='#eef2ff'
                      selectedBorderColor='#4338ca'
                      selectedTextColor='#4338ca'
                      verticalPadding={8}
                    />
                    <KangurMobileFilterChip
                      href={createKangurResultsHref({
                        family: 'arithmetic',
                        operation: null,
                      })}
                      horizontalPadding={12}
                      idleTextColor='#475569'
                      label={copy({
                        de: 'Arithmetik',
                        en: 'Arithmetic',
                        pl: 'Arytmetyka',
                      })}
                      selected={filterFamily === 'arithmetic' && !filterOperation}
                      selectedBackgroundColor='#eef2ff'
                      selectedBorderColor='#4338ca'
                      selectedTextColor='#4338ca'
                      verticalPadding={8}
                    />
                    <KangurMobileFilterChip
                      href={createKangurResultsHref({
                        family: 'logic',
                        operation: null,
                      })}
                      horizontalPadding={12}
                      idleTextColor='#475569'
                      label={copy({
                        de: 'Logik',
                        en: 'Logic',
                        pl: 'Logika',
                      })}
                      selected={filterFamily === 'logic' && !filterOperation}
                      selectedBackgroundColor='#eef2ff'
                      selectedBorderColor='#4338ca'
                      selectedTextColor='#4338ca'
                      verticalPadding={8}
                    />
                    <KangurMobileFilterChip
                      href={createKangurResultsHref({
                        family: 'time',
                        operation: null,
                      })}
                      horizontalPadding={12}
                      idleTextColor='#475569'
                      label={copy({
                        de: 'Zeit',
                        en: 'Time',
                        pl: 'Czas',
                      })}
                      selected={filterFamily === 'time' && !filterOperation}
                      selectedBackgroundColor='#eef2ff'
                      selectedBorderColor='#4338ca'
                      selectedTextColor='#4338ca'
                      verticalPadding={8}
                    />
                  </View>

                  {results.availableOperations.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {results.availableOperations.map((operation) => (
                        <KangurMobileFilterChip
                          key={operation}
                          href={createKangurResultsHref({
                            family: 'all',
                            operation,
                          })}
                          horizontalPadding={12}
                          idleTextColor='#475569'
                          label={formatKangurMobileScoreOperation(operation, locale)}
                          selected={filterOperation === operation}
                          selectedBackgroundColor='#eef2ff'
                          selectedBorderColor='#4338ca'
                          selectedTextColor='#4338ca'
                          verticalPadding={8}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>

                {results.isLoading ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Die Ergebnisse werden geladen.',
                      en: 'Loading results.',
                      pl: 'Pobieramy wyniki.',
                    })}
                  </Text>
                ) : results.error ? (
                  <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                    {results.error}
                  </Text>
                ) : results.scores.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt hier noch keine Ergebnisse. Schließe einen Trainingslauf ab, um diesen Bereich zu füllen.',
                      en: 'There are no results here yet. Finish one practice run to fill this section.',
                      pl: 'Nie ma tu jeszcze wyników. Ukończ jedną serię treningową, aby wypełnić tę sekcję.',
                    })}
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {results.scores.map((score) => {
                      const accuracyPercent =
                        getKangurMobileScoreAccuracyPercent(score);
                      const accuracyTone = getAccuracyTone(accuracyPercent);
                      const operationFamily = getKangurMobileScoreFamily(score);
                      const operationTone = getOperationTone(operationFamily);
                      const lessonHref =
                        createKangurLessonHrefForPracticeOperation(score.operation);

                      return (
                        <InsetPanel key={score.id} gap={10}>
                          <View
                            style={{
                              alignItems: 'center',
                              flexDirection: 'row',
                              flexWrap: 'wrap',
                              gap: 8,
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ gap: 6 }}>
                              <Text
                                style={{
                                  color: '#0f172a',
                                  fontSize: 16,
                                  fontWeight: '800',
                                }}
                              >
                                {formatKangurMobileScoreOperation(
                                  score.operation,
                                  locale,
                                )}
                              </Text>
                              <Text style={{ color: '#64748b', fontSize: 13 }}>
                                {formatKangurMobileScoreDateTime(
                                  score.created_date,
                                  locale,
                                )}
                              </Text>
                            </View>

                            <Pill
                              label={copy({
                                de: `Trefferquote ${accuracyPercent}%`,
                                en: `Accuracy ${accuracyPercent}%`,
                                pl: `Skuteczność ${accuracyPercent}%`,
                              })}
                              tone={accuracyTone}
                            />
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <Pill
                              label={formatKangurMobileScoreFamily(
                                operationFamily,
                                locale,
                              )}
                              tone={operationTone}
                            />
                          </View>

                          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                            {copy({
                              de: `${score.correct_answers}/${score.total_questions} richtig · ${formatKangurMobileScoreDuration(score.time_taken)} · Ergebnis ${score.score}`,
                              en: `${score.correct_answers}/${score.total_questions} correct · ${formatKangurMobileScoreDuration(score.time_taken)} · score ${score.score}`,
                              pl: `${score.correct_answers}/${score.total_questions} poprawnych · ${formatKangurMobileScoreDuration(score.time_taken)} · wynik ${score.score}`,
                            })}
                          </Text>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <LinkButton
                              href={createKangurPracticeHref(score.operation)}
                              label={copy({
                                de: 'Diesen Modus trainieren',
                                en: 'Train this mode',
                                pl: 'Trenuj ten tryb',
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

                            {filterOperation !== score.operation ? (
                              <LinkButton
                                href={createKangurResultsHref({
                                  family: 'all',
                                  operation: score.operation,
                                })}
                                label={copy({
                                  de: 'Diesen Modus filtern',
                                  en: 'Filter this mode',
                                  pl: 'Filtruj ten tryb',
                                })}
                              />
                            ) : null}
                          </View>
                        </InsetPanel>
                      );
                    })}
                  </View>
                )}
              </Card>
            </>
          )}
        </View>
    </KangurMobileScrollScreen>
  );
}
