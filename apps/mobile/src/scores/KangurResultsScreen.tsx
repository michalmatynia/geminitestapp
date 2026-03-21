import { resolveKangurLessonFocusForPracticeOperation } from '@kangur/core';
import { Link, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import {
  createKangurLessonHref,
  createKangurLessonHrefForPracticeOperation,
} from '../lessons/lessonHref';
import {
  useKangurMobileLessonCheckpoints,
  type KangurMobileLessonCheckpointItem,
} from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import {
  type KangurMobileOperationPerformance,
  type KangurMobileScoreFamily,
  formatKangurMobileScoreFamily,
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreDuration,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
  getKangurMobileScoreFamily,
} from './mobileScoreSummary';
import { createKangurPracticeHref } from '../practice/practiceHref';
import { createKangurResultsHref } from './resultsHref';
import { useKangurMobileResults } from './useKangurMobileResults';
import { useKangurMobileResultsDuels } from './useKangurMobileResultsDuels';

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
  description: string;
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View
      style={{
        flexBasis: '48%',
        gap: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: '#0f172a', fontSize: 22, fontWeight: '800' }}>{value}</Text>
      <Text style={{ color: '#475569', fontSize: 12, lineHeight: 18 }}>{description}</Text>
    </View>
  );
}

const getAccuracyTone = (
  accuracyPercent: number,
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
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

const getOperationTone = (
  family: Exclude<KangurMobileScoreFamily, 'all'>,
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
  if (family === 'logic') {
    return {
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        textColor: '#4338ca',
      };
  }
  if (family === 'time') {
    return {
      backgroundColor: '#fff7ed',
      borderColor: '#fdba74',
      textColor: '#c2410c',
    };
  }
  return {
    backgroundColor: '#ecfeff',
    borderColor: '#a5f3fc',
    textColor: '#0f766e',
  };
};

const RESULTS_HOME_ROUTE = '/' as const;
const LESSONS_ROUTE = '/lessons' as Href;
const DUELS_ROUTE = createKangurDuelsHref();

const resolveResultsFilterFamily = (
  value: string | string[] | undefined,
): KangurMobileScoreFamily => {
  const resolved = Array.isArray(value) ? value[0] : value;
  if (
    resolved === 'all' ||
    resolved === 'arithmetic' ||
    resolved === 'logic' ||
    resolved === 'time'
  ) {
    return resolved;
  }

  return 'all';
};

const resolveResultsFilterOperation = (
  value: string | string[] | undefined,
): string | null => {
  const resolved = Array.isArray(value) ? value[0] : value;
  const trimmed = resolved?.trim();
  return trimmed ? trimmed : null;
};

function FilterPill({
  href,
  isActive,
  label,
}: {
  href: Href;
  isActive: boolean;
  label: string;
}): React.JSX.Element {
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole='button'
        style={{
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isActive ? '#4338ca' : '#cbd5e1',
          backgroundColor: isActive ? '#eef2ff' : '#ffffff',
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}
      >
        <Text
          style={{
            color: isActive ? '#4338ca' : '#475569',
            fontSize: 12,
            fontWeight: '700',
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Link>
  );
}

function OperationInsightCard({
  description,
  lessonHref,
  operation,
  practiceLabel,
  title,
}: {
  description: string;
  lessonHref?: Href;
  operation: KangurMobileOperationPerformance;
  practiceLabel: string;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const operationTone = getOperationTone(operation.family);

  return (
    <View
      style={{
        flexBasis: '48%',
        gap: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
        padding: 14,
      }}
    >
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {formatKangurMobileScoreOperation(operation.operation, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{description}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: operationTone.borderColor,
            backgroundColor: operationTone.backgroundColor,
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text
            style={{
              color: operationTone.textColor,
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            {copy({
              de: `Durchschnitt ${operation.averageAccuracyPercent}%`,
              en: `Average ${operation.averageAccuracyPercent}%`,
              pl: `Średnio ${operation.averageAccuracyPercent}%`,
            })}
          </Text>
        </View>
        <View
          style={{
            borderRadius: 999,
            borderWidth: 1,
            borderColor: '#cbd5e1',
            backgroundColor: '#ffffff',
            paddingHorizontal: 12,
            paddingVertical: 7,
          }}
        >
          <Text style={{ color: '#475569', fontSize: 12, fontWeight: '700' }}>
            {copy({
              de: `Sitzungen ${operation.sessions}`,
              en: `Sessions ${operation.sessions}`,
              pl: `Sesje ${operation.sessions}`,
            })}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Link href={createKangurPracticeHref(operation.operation)} asChild>
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
              {practiceLabel}
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
                paddingHorizontal: 12,
                paddingVertical: 9,
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
            operation: operation.operation,
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
              paddingHorizontal: 12,
              paddingVertical: 9,
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
                {`: ${item.title}`}
              </Text>
            </Pressable>
          </Link>
        ) : null}
      </View>
    </View>
  );
}

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
  const lessonCheckpoints = useKangurMobileLessonCheckpoints({ limit: 2 });
  const strongestOperation = results.operationPerformance[0] ?? null;
  const weakestOperation =
    results.operationPerformance.length > 1
      ? results.operationPerformance[results.operationPerformance.length - 1]
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
          <Link href={RESULTS_HOME_ROUTE} asChild>
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
                de: 'Ergebnisverlauf',
                en: 'Score history',
                pl: 'Historia wyników',
              })}
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              {copy({
                de: 'Letzte mobile Sitzungen',
                en: 'Recent mobile sessions',
                pl: 'Ostatnie sesje mobilne',
              })}
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              {copy({
                de: 'Eine Ansicht für letzte Ergebnisse, Genauigkeit und die Aufteilung in arithmetische, zeitbezogene und logische Sitzungen.',
                en: 'One view for recent results, accuracy, and the split across arithmetic, time, and logic sessions.',
                pl: 'Jeden widok dla ostatnich wyników, skuteczności oraz podziału na sesje arytmetyczne, czasowe i logiczne.',
              })}
            </Text>
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

          {results.isLoading ? (
            <Card>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Die Schulersitzung und der Ergebnisverlauf werden wiederhergestellt.',
                  en: 'Restoring the learner session and score history.',
                  pl: 'Przywracamy sesję ucznia i historię wyników.',
                })}
              </Text>
            </Card>
          ) : !results.isEnabled ? (
            <Card>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                {copy({
                  de: 'Melde den Schuler an, um den synchronisierten Ergebnisverlauf zu sehen.',
                  en: 'Sign in the learner to see synchronized score history.',
                  pl: 'Zaloguj ucznia, aby zobaczyć zsynchronizowaną historię wyników.',
                })}
              </Text>
              <Link href={RESULTS_HOME_ROUTE} asChild>
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
                    de: 'Sitzungen',
                    en: 'Sessions',
                    pl: 'Sesje',
                  })}
                  value={`${results.summary.totalSessions}`}
                  description={copy({
                    de: 'Die Ansicht umfasst die letzten 40 Versuche.',
                    en: 'This view includes the latest 40 attempts.',
                    pl: 'Widok obejmuje 40 ostatnich podejść.',
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
                        de: 'Ein schneller Blick auf den stärksten und schwächsten Modus im aktuellen Filterbereich.',
                        en: 'A quick view of the strongest and weakest mode in the current filter scope.',
                        pl: 'Szybki podgląd najmocniejszego i najsłabszego trybu w aktualnym zakresie filtrowania.',
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
                      de: 'Duelle',
                      en: 'Duels',
                      pl: 'Pojedynki',
                    })}
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Nach dem Blick auf die letzten Ergebnisse kannst du hier direkt zu deinen Duellrivalen zurückkehren.',
                      en: 'After reviewing recent scores, you can jump straight back to duel rivals here.',
                      pl: 'Po sprawdzeniu ostatnich wyników możesz tutaj od razu wrócić do rywali z pojedynków.',
                    })}
                  </Text>
                </View>

                {duelResults.isRestoringAuth || duelResults.isLoading ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Die Duellzusammenfassung in den Ergebnissen wird geladen.',
                      en: 'Loading duel summary in results.',
                      pl: 'Pobieramy podsumowanie pojedynków w wynikach.',
                    })}
                  </Text>
                ) : duelResults.error ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                      {duelResults.error}
                    </Text>
                    <Pressable
                      accessibilityRole='button'
                      onPress={() => {
                        void duelResults.refresh();
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
                    {duelResults.currentEntry ? (
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
                          #{duelResults.currentRank} {duelResults.currentEntry.displayName}
                        </Text>
                        <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                          {copy({
                            de: `Siege ${duelResults.currentEntry.wins} • Niederlagen ${duelResults.currentEntry.losses} • Unentschieden ${duelResults.currentEntry.ties}`,
                            en: `Wins ${duelResults.currentEntry.wins} • Losses ${duelResults.currentEntry.losses} • Ties ${duelResults.currentEntry.ties}`,
                            pl: `Wygrane ${duelResults.currentEntry.wins} • Porażki ${duelResults.currentEntry.losses} • Remisy ${duelResults.currentEntry.ties}`,
                          })}
                        </Text>
                        <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
                          {copy({
                            de: `Matches ${duelResults.currentEntry.matches} • Quote ${Math.round(duelResults.currentEntry.winRate * 100)}% • letztes Duell ${formatKangurMobileScoreDateTime(duelResults.currentEntry.lastPlayedAt, locale)}`,
                            en: `Matches ${duelResults.currentEntry.matches} • Win rate ${Math.round(duelResults.currentEntry.winRate * 100)}% • last duel ${formatKangurMobileScoreDateTime(duelResults.currentEntry.lastPlayedAt, locale)}`,
                            pl: `Mecze ${duelResults.currentEntry.matches} • Win rate ${Math.round(duelResults.currentEntry.winRate * 100)}% • ostatni pojedynek ${formatKangurMobileScoreDateTime(duelResults.currentEntry.lastPlayedAt, locale)}`,
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

                    {duelResults.actionError ? (
                      <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                        {duelResults.actionError}
                      </Text>
                    ) : null}

                    {duelResults.opponents.length === 0 ? (
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
                        {duelResults.opponents.map((opponent) => (
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
                              disabled={duelResults.isActionPending}
                              onPress={() => {
                                void duelResults.createRematch(opponent.learnerId).then((sessionId) => {
                                  if (sessionId) {
                                    openDuelSession(sessionId);
                                  }
                                });
                              }}
                              style={{
                                alignSelf: 'flex-start',
                                borderRadius: 999,
                                backgroundColor: duelResults.isActionPending ? '#94a3b8' : '#1d4ed8',
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                              }}
                            >
                              <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                                {duelResults.pendingOpponentLearnerId === opponent.learnerId
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
                      de: 'Nach dem Blick auf die letzten Ergebnisse kannst du direkt zu den zuletzt gespeicherten Lektionen zurückspringen.',
                      en: 'After reviewing the latest results, you can jump straight back to the most recently saved lessons.',
                      pl: 'Po sprawdzeniu ostatnich wyników możesz od razu wrócić do ostatnio zapisanych lekcji.',
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
                          paddingHorizontal: 12,
                          paddingVertical: 9,
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
                        de: 'Der Verlauf nutzt dieselbe auf den Schuler begrenzte Abfrage wie Profil und Startbildschirm.',
                        en: 'History uses the same learner-scoped query as the profile and home screen.',
                        pl: 'Historia korzysta z tego samego zapytania ograniczonego do ucznia co profil i ekran główny.',
                      })}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole='button'
                    onPress={() => {
                      void results.refresh();
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
                        de: 'Aktualisieren',
                        en: 'Refresh',
                        pl: 'Odśwież',
                      })}
                    </Text>
                  </Pressable>
                </View>

                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    <FilterPill
                      href={createKangurResultsHref({
                        family: 'all',
                        operation: null,
                      })}
                      isActive={filterFamily === 'all' && !filterOperation}
                      label={copy({
                        de: 'Alle Sitzungen',
                        en: 'All sessions',
                        pl: 'Wszystkie sesje',
                      })}
                    />
                    <FilterPill
                      href={createKangurResultsHref({
                        family: 'arithmetic',
                        operation: null,
                      })}
                      isActive={filterFamily === 'arithmetic' && !filterOperation}
                      label={copy({
                        de: 'Arithmetik',
                        en: 'Arithmetic',
                        pl: 'Arytmetyka',
                      })}
                    />
                    <FilterPill
                      href={createKangurResultsHref({
                        family: 'logic',
                        operation: null,
                      })}
                      isActive={filterFamily === 'logic' && !filterOperation}
                      label={copy({
                        de: 'Logik',
                        en: 'Logic',
                        pl: 'Logika',
                      })}
                    />
                    <FilterPill
                      href={createKangurResultsHref({
                        family: 'time',
                        operation: null,
                      })}
                      isActive={filterFamily === 'time' && !filterOperation}
                      label={copy({
                        de: 'Zeit',
                        en: 'Time',
                        pl: 'Czas',
                      })}
                    />
                  </View>

                  {results.availableOperations.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {results.availableOperations.map((operation) => (
                        <FilterPill
                          key={operation}
                          href={createKangurResultsHref({
                            family: 'all',
                            operation,
                          })}
                          isActive={filterOperation === operation}
                          label={formatKangurMobileScoreOperation(operation, locale)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>

                {results.isLoading ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Der Ergebnisverlauf wird geladen.',
                      en: 'Loading score history.',
                      pl: 'Pobieramy historię wyników.',
                    })}
                  </Text>
                ) : results.error ? (
                  <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                    {results.error}
                  </Text>
                ) : results.scores.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Es gibt keine synchronisierten Ergebnisse. Schließe eine Trainingseinheit ab, um diese Ansicht zu füllen.',
                      en: 'There are no synchronized results. Complete one practice session to fill this view.',
                      pl: 'Brak zsynchronizowanych wyników. Ukończ jedną sesję treningową, aby wypełnić ten widok.',
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
                        <View
                          key={score.id}
                          style={{
                            gap: 10,
                            borderRadius: 20,
                            borderWidth: 1,
                            borderColor: '#e2e8f0',
                            backgroundColor: '#f8fafc',
                            padding: 14,
                          }}
                        >
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

                            <View
                              style={{
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: accuracyTone.borderColor,
                                backgroundColor: accuracyTone.backgroundColor,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                              }}
                            >
                              <Text
                                style={{
                                  color: accuracyTone.textColor,
                                  fontSize: 12,
                                  fontWeight: '700',
                                }}
                              >
                                {copy({
                                  de: `Trefferquote ${accuracyPercent}%`,
                                  en: `Accuracy ${accuracyPercent}%`,
                                  pl: `Skuteczność ${accuracyPercent}%`,
                                })}
                              </Text>
                            </View>
                          </View>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <View
                              style={{
                                borderRadius: 999,
                                borderWidth: 1,
                                borderColor: operationTone.borderColor,
                                backgroundColor: operationTone.backgroundColor,
                                paddingHorizontal: 12,
                                paddingVertical: 7,
                              }}
                            >
                              <Text
                                style={{
                                  color: operationTone.textColor,
                                  fontSize: 12,
                                  fontWeight: '700',
                                }}
                              >
                                {formatKangurMobileScoreFamily(
                                  operationFamily,
                                  locale,
                                )}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                            {copy({
                              de: `${score.correct_answers}/${score.total_questions} richtig · ${formatKangurMobileScoreDuration(score.time_taken)} · Ergebnis ${score.score}`,
                              en: `${score.correct_answers}/${score.total_questions} correct · ${formatKangurMobileScoreDuration(score.time_taken)} · score ${score.score}`,
                              pl: `${score.correct_answers}/${score.total_questions} poprawnych · ${formatKangurMobileScoreDuration(score.time_taken)} · wynik ${score.score}`,
                            })}
                          </Text>

                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <Link
                              href={createKangurPracticeHref(score.operation)}
                              asChild
                            >
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
                                <Text
                                  style={{ color: '#ffffff', fontWeight: '700' }}
                                >
                                  {copy({
                                    de: 'Diesen Modus trainieren',
                                    en: 'Train this mode',
                                    pl: 'Trenuj ten tryb',
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
                                  <Text
                                    style={{ color: '#0f172a', fontWeight: '700' }}
                                  >
                                    {copy({
                                      de: 'Lektion öffnen',
                                      en: 'Open lesson',
                                      pl: 'Otwórz lekcję',
                                    })}
                                  </Text>
                                </Pressable>
                              </Link>
                            ) : null}

                            {filterOperation !== score.operation ? (
                              <Link
                                href={createKangurResultsHref({
                                  family: 'all',
                                  operation: score.operation,
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
                                  <Text
                                    style={{ color: '#0f172a', fontWeight: '700' }}
                                  >
                                    {copy({
                                      de: 'Diesen Modus filtern',
                                      en: 'Filter this mode',
                                      pl: 'Filtruj ten tryb',
                                    })}
                                  </Text>
                                </Pressable>
                              </Link>
                            ) : null}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
