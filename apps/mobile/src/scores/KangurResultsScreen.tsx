import { resolveKangurLessonFocusForPracticeOperation } from '@kangur/core';
import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createKangurLessonHref,
  createKangurLessonHrefForPracticeOperation,
} from '../lessons/lessonHref';
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
        {formatKangurMobileScoreOperation(operation.operation)}
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
            Avg {operation.averageAccuracyPercent}%
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
            Sessions {operation.sessions}
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
                Open lesson
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
            <Text style={{ color: '#0f172a', fontWeight: '700' }}>Mode history</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

export function KangurResultsScreen(): React.JSX.Element {
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
  const strongestOperation = results.operationPerformance[0] ?? null;
  const weakestOperation =
    results.operationPerformance.length > 1
      ? results.operationPerformance[results.operationPerformance.length - 1]
      : null;

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
              <Text style={{ color: '#0f172a', fontWeight: '700' }}>Back</Text>
            </Pressable>
          </Link>

          <Card>
            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
              Historia wynikow
            </Text>
            <Text style={{ color: '#0f172a', fontSize: 28, fontWeight: '800' }}>
              Ostatnie sesje mobilne
            </Text>
            <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
              Jeden widok dla ostatnich wynikow, skutecznosci oraz podzialu na sesje
              arytmetyczne, czasowe i logiczne.
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
                  Open daily plan
                </Text>
              </Pressable>
            </Link>
          </Card>

          {results.isLoading ? (
            <Card>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Przywracamy sesje ucznia i historie wynikow.
              </Text>
            </Card>
          ) : !results.isEnabled ? (
            <Card>
              <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                Zaloguj ucznia, aby zobaczyc zsynchronizowana historie wynikow.
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
                    Open auth screen
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
                  label='Sesje'
                  value={`${results.summary.totalSessions}`}
                  description='Widok obejmuje 40 ostatnich podejsc.'
                />
                <Metric
                  label='Srednia'
                  value={`${results.summary.averageAccuracyPercent}%`}
                  description={`Najlepsza skutecznosc: ${results.summary.bestAccuracyPercent}%`}
                />
                <Metric
                  label='Arytmetyka'
                  value={`${results.summary.arithmeticSessions}`}
                  description='Dodawanie, odejmowanie, mnozenie, dzielenie i podobne tryby.'
                />
                <Metric
                  label='Czas'
                  value={`${results.summary.timeSessions}`}
                  description='Zegar i kalendarz.'
                />
                <Metric
                  label='Logika'
                  value={`${results.summary.logicSessions}`}
                  description='Wszystkie dostepne sesje logiczne.'
                />
              </View>

              {results.operationPerformance.length > 0 ? (
                <Card>
                  <View style={{ gap: 4 }}>
                    <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                      Wnioski po trybach
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      Szybki podglad najmocniejszego i najslabszego trybu w aktualnym
                      zakresie filtrowania.
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
                        description={`Najwyzsza srednia skutecznosc. Najlepsza proba ${strongestOperation.bestAccuracyPercent}%.`}
                        lessonHref={(() => {
                          const focus = resolveKangurLessonFocusForPracticeOperation(
                            strongestOperation.operation,
                          );
                          return focus ? createKangurLessonHref(focus) : undefined;
                        })()}
                        operation={strongestOperation}
                        practiceLabel='Keep momentum'
                        title='Najmocniejszy tryb'
                      />
                    ) : null}
                    {weakestOperation ? (
                      <OperationInsightCard
                        description={`Najlepszy kandydat do kolejnej powtorki. Najlepsza proba ${weakestOperation.bestAccuracyPercent}%.`}
                        lessonHref={(() => {
                          const focus = resolveKangurLessonFocusForPracticeOperation(
                            weakestOperation.operation,
                          );
                          return focus ? createKangurLessonHref(focus) : undefined;
                        })()}
                        operation={weakestOperation}
                        practiceLabel='Practice weakest'
                        title='Do powtorki'
                      />
                    ) : null}
                  </View>
                </Card>
              ) : null}

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
                      Pelna lista
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                      Historia korzysta z tego samego learner-scoped zapytania co profil i ekran
                      glowny.
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
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>Refresh</Text>
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
                      label='All sessions'
                    />
                    <FilterPill
                      href={createKangurResultsHref({
                        family: 'arithmetic',
                        operation: null,
                      })}
                      isActive={filterFamily === 'arithmetic' && !filterOperation}
                      label='Arithmetic'
                    />
                    <FilterPill
                      href={createKangurResultsHref({
                        family: 'logic',
                        operation: null,
                      })}
                      isActive={filterFamily === 'logic' && !filterOperation}
                      label='Logic'
                    />
                    <FilterPill
                      href={createKangurResultsHref({
                        family: 'time',
                        operation: null,
                      })}
                      isActive={filterFamily === 'time' && !filterOperation}
                      label='Time'
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
                          label={formatKangurMobileScoreOperation(operation)}
                        />
                      ))}
                    </View>
                  ) : null}
                </View>

                {results.isLoading ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    Pobieramy historie wynikow.
                  </Text>
                ) : results.error ? (
                  <Text style={{ color: '#b91c1c', fontSize: 14, lineHeight: 20 }}>
                    {results.error}
                  </Text>
                ) : results.scores.length === 0 ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    Brak zsynchronizowanych wynikow. Ukoncz jedna sesje treningowa, aby
                    wypelnic ten widok.
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
                                {formatKangurMobileScoreOperation(score.operation)}
                              </Text>
                              <Text style={{ color: '#64748b', fontSize: 13 }}>
                                {formatKangurMobileScoreDateTime(score.created_date)}
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
                                {accuracyPercent}% accuracy
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
                                {formatKangurMobileScoreFamily(operationFamily)}
                              </Text>
                            </View>
                          </View>

                          <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                            {score.correct_answers}/{score.total_questions} poprawnych ·{' '}
                            {formatKangurMobileScoreDuration(score.time_taken)} · wynik{' '}
                            {score.score}
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
                                  Train this mode
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
                                    Open lesson
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
                                    Filter this mode
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
