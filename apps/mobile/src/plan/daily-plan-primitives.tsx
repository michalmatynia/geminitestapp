import type { KangurAssignmentPlan } from '@kangur/core';
import type { KangurScore } from '@kangur/contracts';
import { type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';
import {
  formatKangurMobileScoreDateTime,
  formatKangurMobileScoreOperation,
  getKangurMobileScoreAccuracyPercent,
} from '../scores/mobileScoreSummary';
import { createKangurResultsHref } from '../scores/resultsHref';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import type { KangurMobileDailyPlanBadgeItem } from './useKangurMobileDailyPlanBadges';
import type { KangurMobileDailyPlanLessonMasteryItem } from './useKangurMobileDailyPlanLessonMastery';

export const LESSONS_ROUTE = '/lessons' as Href;
export const DUELS_ROUTE = createKangurDuelsHref();
export const PROFILE_ROUTE = '/profile' as Href;
export const RESULTS_ROUTE = createKangurResultsHref();

export function FocusCard({
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
  const lessonAction = lessonHref ? (
    <LinkButton
      href={lessonHref}
      label={copy({
        de: 'Lektion öffnen',
        en: 'Open lesson',
        pl: 'Otwórz lekcję',
      })}
    />
  ) : null;

  return (
    <InsetPanel gap={10}>
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
        {lessonAction}
        <LinkButton
          href={historyHref}
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

const getPriorityTone = (
  priority: KangurAssignmentPlan['priority'],
): Tone => {
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

const getPriorityLabel = (priority: KangurAssignmentPlan['priority']): string => priority;

export function AssignmentRow({
  assignment,
  href,
}: {
  assignment: KangurAssignmentPlan;
  href: Href | null;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const actionLabel = translateKangurMobileActionLabel(assignment.action.label, locale);
  const assignmentAction = href ? (
    <LinkButton href={href} label={actionLabel} tone='primary' />
  ) : (
    <MutedActionChip
      label={`${actionLabel} · ${copy({
        de: 'bald',
        en: 'soon',
        pl: 'wkrotce',
      })}`}
    />
  );

  return (
    <InsetPanel gap={8}>
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
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{assignment.title}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{assignment.description}</Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${assignment.target}`,
          en: `Goal: ${assignment.target}`,
          pl: `Cel: ${assignment.target}`,
        })}
      </Text>
      {assignmentAction}
    </InsetPanel>
  );
}

export function RecentResultRow({
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
  const lessonAction = lessonHref ? (
    <LinkButton
      href={lessonHref}
      label={copy({
        de: 'Lektion öffnen',
        en: 'Open lesson',
        pl: 'Otwórz lekcję',
      })}
    />
  ) : null;

  return (
    <InsetPanel gap={8}>
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
        {lessonAction}
        <LinkButton
          href={historyHref}
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
  const practiceAction = item.practiceHref ? (
    <LinkButton
      href={item.practiceHref}
      label={`${copy({
        de: 'Danach trainieren',
        en: 'Practice after',
        pl: 'Potem trenuj',
      })}: ${item.title}`}
    />
  ) : null;

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

const getLessonMasteryTone = (masteryPercent: number): Tone => {
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
}

export function LessonMasteryRow({
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
  const practiceAction = insight.practiceHref ? (
    <LinkButton
      href={insight.practiceHref}
      label={copy({
        de: 'Danach trainieren',
        en: 'Practice after',
        pl: 'Potem trenuj',
      })}
    />
  ) : null;

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
          tone='primary'
        />
        {practiceAction}
      </View>
    </InsetPanel>
  );
}

export function DailyPlanBadgeChip({
  item,
}: {
  item: KangurMobileDailyPlanBadgeItem;
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
