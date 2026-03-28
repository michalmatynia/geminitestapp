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
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { createKangurResultsHref } from './resultsHref';
import { useKangurMobileResults } from './useKangurMobileResults';
import {
  useKangurMobileResultsAssignments,
  type KangurMobileResultsAssignmentItem,
} from './useKangurMobileResultsAssignments';
import {
  useKangurMobileResultsLessonMastery,
  type KangurMobileResultsLessonMasteryItem,
} from './useKangurMobileResultsLessonMastery';
import {
  useKangurMobileResultsBadges,
  type KangurMobileResultsBadgeItem,
} from './useKangurMobileResultsBadges';
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
const PROFILE_ROUTE = '/profile' as Href;

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
              de: `Ergebnisse ${operation.sessions}`,
              en: `Results ${operation.sessions}`,
              pl: `Wyniki ${operation.sessions}`,
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
  let practiceAction: React.JSX.Element | null = null;

  if (item.practiceHref) {
    practiceAction = (
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
    );
  }

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
        {practiceAction}
      </View>
    </View>
  );
}

function ResultsBadgeChip({
  item,
}: {
  item: KangurMobileResultsBadgeItem;
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

function ResultsAssignmentRow({
  item,
}: {
  item: KangurMobileResultsAssignmentItem;
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
  const assignmentActionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  let assignmentAction: React.JSX.Element;

  if (item.href) {
    assignmentAction = (
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
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>{assignmentActionLabel}</Text>
        </Pressable>
      </Link>
    );
  } else {
    assignmentAction = (
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
          {assignmentActionLabel} ·{' '}
          {copy({
            de: 'bald',
            en: 'soon',
            pl: 'wkrotce',
          })}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
        padding: 12,
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
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
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
      {assignmentAction}
    </View>
  );
}

function LessonMasteryRow({
  insight,
  title,
}: {
  insight: KangurMobileResultsLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const masteryTone = getAccuracyTone(insight.masteryPercent);
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
        {renderResultsPracticeLink({
          href: insight.practiceHref,
          label: copy({
            de: 'Danach trainieren',
            en: 'Practice after',
            pl: 'Potem trenuj',
          }),
        })}
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
                      de: 'Zum Login',
                      en: 'Go to sign in',
                      pl: 'Przejdź do logowania',
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
                        de: `Freigeschaltet ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
                        en: `Unlocked ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
                        pl: `Odblokowane ${resultsBadges.unlockedBadges}/${resultsBadges.totalBadges}`,
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
                        de: `Offen ${resultsBadges.remainingBadges}`,
                        en: `Remaining ${resultsBadges.remainingBadges}`,
                        pl: `Do zdobycia ${resultsBadges.remainingBadges}`,
                      })}
                    </Text>
                  </View>
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
                            <Text
                              style={{
                                color: '#ffffff',
                                fontWeight: '700',
                                textAlign: 'center',
                              }}
                            >
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
                            <Text
                              style={{
                                color: '#0f172a',
                                fontWeight: '700',
                                textAlign: 'center',
                              }}
                            >
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
              </Card>

              <Card>
                <View style={{ gap: 4 }}>
                  <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>
                    {copy({
                      de: 'Duelle',
                      en: 'Duels',
                      pl: 'Pojedynki',
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
                      de: 'Prüfe den aktuellen Duellstand, sieh die letzten Rivalen und starte einen Rückkampf, ohne Ergebnisse zu verlassen.',
                      en: 'Check the current duel standing, see recent rivals, and jump into a rematch without leaving results.',
                      pl: 'Sprawdź aktualny stan pojedynków, zobacz ostatnich rywali i wejdź w rewanż bez wychodzenia z wyników.',
                    })}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <SummaryChip
                    label={copy({
                      de: `Rivalen ${duelResults.opponents.length}`,
                      en: `Rivals ${duelResults.opponents.length}`,
                      pl: `Rywale ${duelResults.opponents.length}`,
                    })}
                    backgroundColor='#eff6ff'
                    borderColor='#bfdbfe'
                    textColor='#1d4ed8'
                  />
                  <SummaryChip
                    label={
                      duelResults.currentRank
                        ? copy({
                            de: `Deine Position #${duelResults.currentRank}`,
                            en: `Your rank #${duelResults.currentRank}`,
                            pl: `Twoja pozycja #${duelResults.currentRank}`,
                          })
                        : copy({
                            de: 'Wartet auf Sichtbarkeit',
                            en: 'Waiting for visibility',
                            pl: 'Czeka na widoczność',
                          })
                    }
                    backgroundColor='#ecfdf5'
                    borderColor='#a7f3d0'
                    textColor='#047857'
                  />
                </View>

                {duelResults.isRestoringAuth || duelResults.isLoading ? (
                  <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
                    {copy({
                      de: 'Der Duellstand in den Ergebnissen wird geladen.',
                      en: 'Loading the duel standing in results.',
                      pl: 'Pobieramy stan pojedynków w wynikach.',
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
                          de: 'Dein Konto ist in diesem Duellstand noch nicht sichtbar. Schließe ein weiteres Duell ab oder öffne die Lobby, damit deine Position hier erscheint.',
                          en: 'Your account is not visible in this duel standing yet. Finish another duel or open the lobby so your rank appears here.',
                          pl: 'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
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
                          de: 'Es gibt noch keine letzten Rivalen. Das erste beendete Duell füllt hier die Rivalenliste und schaltet schnelle Rückkämpfe frei.',
                          en: 'There are no recent rivals yet. The first completed duel will fill the rival list here and unlock quick rematches.',
                          pl: 'Nie ma jeszcze ostatnich rywali. Pierwszy zakończony pojedynek wypełni tutaj listę rywali i odblokuje szybkie rewanże.',
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

                    <View style={{ alignSelf: 'stretch', gap: 10 }}>
                      <Pressable
                        accessibilityRole='button'
                        onPress={() => {
                          void duelResults.refresh();
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

                      <Link href={DUELS_ROUTE} asChild>
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
                          <Text
                            style={{ color: '#0f172a', fontWeight: '700', textAlign: 'center' }}
                          >
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
                        de: 'Hier kannst du die gesamte Ergebnisliste aktualisieren und ohne Umwege durch die letzten Einträge gehen.',
                        en: 'Refresh the full results list here and move through the latest entries without leaving this section.',
                        pl: 'Tutaj odświeżysz pełną listę wyników i przejdziesz przez ostatnie wpisy bez wychodzenia z tej sekcji.',
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
                        de: 'Alle Ergebnisse',
                        en: 'All results',
                        pl: 'Wszystkie wyniki',
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

function renderResultsPracticeLink({
  href,
  label,
}: {
  href: Href | null;
  label: string;
}): React.JSX.Element | null {
  if (!href) {
    return null;
  }

  return (
    <Link href={href} asChild>
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
        <Text style={{ color: '#0f172a', fontWeight: '700' }}>{label}</Text>
      </Pressable>
    </Link>
  );
}
