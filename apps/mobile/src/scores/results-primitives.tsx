import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPracticeHref } from '../practice/practiceHref';
import {
  type KangurMobileOperationPerformance,
  type KangurMobileScoreFamily,
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
} from './mobileScoreSummary';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
} from '../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import { createKangurResultsHref } from './resultsHref';
import type { KangurMobileResultsAssignmentItem } from './useKangurMobileResultsAssignments';
import type { KangurMobileResultsBadgeItem } from './useKangurMobileResultsBadges';
import type { KangurMobileResultsLessonMasteryItem } from './useKangurMobileResultsLessonMastery';

export const getAccuracyTone = (
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

export const getOperationTone = (
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

export const resolveResultsFilterFamily = (
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

export const resolveResultsFilterOperation = (
  value: string | string[] | undefined,
): string | null => {
  const resolved = Array.isArray(value) ? value[0] : value;
  const trimmed = resolved?.trim();
  return trimmed ? trimmed : null;
};

export function OperationInsightCard({
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
    <InsetPanel gap={10} style={{ flexBasis: '48%' }}>
      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: '#0f172a', fontSize: 18, fontWeight: '800' }}>
        {formatKangurMobileScoreOperation(operation.operation, locale)}
      </Text>
      <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18 }}>{description}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <Pill
          label={copy({
            de: `Durchschnitt ${operation.averageAccuracyPercent}%`,
            en: `Average ${operation.averageAccuracyPercent}%`,
            pl: `Średnio ${operation.averageAccuracyPercent}%`,
          })}
          tone={operationTone}
        />
        <Pill
          label={copy({
            de: `Ergebnisse ${operation.sessions}`,
            en: `Results ${operation.sessions}`,
            pl: `Wyniki ${operation.sessions}`,
          })}
          tone={{
            backgroundColor: '#ffffff',
            borderColor: '#cbd5e1',
            textColor: '#475569',
          }}
        />
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        <LinkButton
          href={createKangurPracticeHref(operation.operation)}
          label={practiceLabel}
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
          href={createKangurResultsHref({
            operation: operation.operation,
          })}
          label={copy({
            de: 'Modusverlauf',
            en: 'Mode history',
            pl: 'Historia trybu',
          })}
        />
      </View>
    </InsetPanel>
  );
}

export function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  let practiceAction: React.JSX.Element | null = null;

  if (item.practiceHref) {
    practiceAction = (
      <LinkButton
        href={item.practiceHref}
        label={`${copy({
          de: 'Danach trainieren',
          en: 'Practice after',
          pl: 'Potem trenuj',
        })}: ${item.title}`}
      />
    );
  }

  return (
    <InsetPanel gap={10}>
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
        {practiceAction}
      </View>
    </InsetPanel>
  );
}

export function ResultsBadgeChip({
  item,
}: {
  item: KangurMobileResultsBadgeItem;
}): React.JSX.Element {
  return (
    <Pill
      label={`${item.emoji} ${item.name}`}
      tone={{
        backgroundColor: '#eef2ff',
        borderColor: '#c7d2fe',
        textColor: '#4338ca',
      }}
    />
  );
}

export function ResultsAssignmentRow({
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
    assignmentAction = <LinkButton href={item.href} label={assignmentActionLabel} tone='primary' />;
  } else {
    assignmentAction = (
      <MutedActionChip
        compact
        label={`${assignmentActionLabel} · ${copy({
          de: 'bald',
          en: 'soon',
          pl: 'wkrotce',
        })}`}
      />
    );
  }

  return (
    <InsetPanel gap={8} padding={12} style={{ borderRadius: 18, backgroundColor: '#ffffff' }}>
      <Pill
        label={copy({
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
        tone={priorityTone}
      />
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
    </InsetPanel>
  );
}

export function LessonMasteryRow({
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
    <InsetPanel gap={10}>
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
          style={{ paddingHorizontal: 12 }}
          tone='primary'
          verticalPadding={9}
        />
        {renderResultsPracticeLink({
          href: insight.practiceHref,
          label: copy({
            de: 'Danach trainieren',
            en: 'Practice after',
            pl: 'Potem trenuj',
          }),
        })}
      </View>
    </InsetPanel>
  );
}

export function renderResultsPracticeLink({
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
    <LinkButton
      href={href}
      label={label}
      style={{ paddingHorizontal: 12 }}
      verticalPadding={9}
    />
  );
}
