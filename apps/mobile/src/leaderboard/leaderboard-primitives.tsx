import { type Href } from 'expo-router';
import { Text, View } from 'react-native';

import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import type { KangurMobileLessonCheckpointItem } from '../lessons/useKangurMobileLessonCheckpoints';
import { createKangurPlanHref } from '../plan/planHref';
import { formatKangurMobileScoreDateTime } from '../scores/mobileScoreSummary';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  type KangurMobileLeaderboardAssignmentItem,
} from './useKangurMobileLeaderboardAssignments';
import {
  type KangurMobileLeaderboardLessonMasteryItem,
} from './useKangurMobileLeaderboardLessonMastery';
import {
  type KangurMobileLeaderboardBadgeItem,
} from './useKangurMobileLeaderboardBadges';

export const FILTER_SCROLL_STYLE = {
  gap: 8,
  paddingBottom: 4,
} as const;

export const LESSONS_ROUTE = '/lessons' as Href;
export const PLAN_ROUTE = createKangurPlanHref();
export const PROFILE_ROUTE = '/profile' as Href;

function PracticeAction({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element | null {
  const { copy } = useKangurMobileI18n();
  const href = item.practiceHref;
  if (!href) {
    return null;
  }
  return (
    <LinkButton
      href={href}
      label={`${copy({
        de: 'Danach trainieren',
        en: 'Practice after',
        pl: 'Potem trenuj',
      })}: ${item.title}`}
    />
  );
}

export function LessonCheckpointRow({
  item,
}: {
  item: KangurMobileLessonCheckpointItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

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
        <PracticeAction item={item} />
      </View>
    </InsetPanel>
  );
}

const getPriorityTone = (priority: 'high' | 'medium' | 'low'): Tone => {
  switch (priority) {
    case 'high':
      return {
        backgroundColor: '#fef2f2',
        borderColor: '#fecaca',
        textColor: '#b91c1c',
      };
    case 'medium':
      return {
        backgroundColor: '#fffbeb',
        borderColor: '#fde68a',
        textColor: '#b45309',
      };
    default:
      return {
        backgroundColor: '#eff6ff',
        borderColor: '#bfdbfe',
        textColor: '#1d4ed8',
      };
  }
};

const getPriorityLabel = (
  priority: 'high' | 'medium' | 'low',
  copy: (labels: { de: string; en: string; pl: string }) => string
): string => {
  const labels = {
    high: { de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' },
    medium: { de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' },
    low: { de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' },
  };
  return copy(labels[priority]);
};

export function LeaderboardAssignmentRow({
  item,
}: {
  item: KangurMobileLeaderboardAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priority = item.assignment.priority || 'low';
  const priorityTone = getPriorityTone(priority);
  const priorityLabel = getPriorityLabel(priority, copy);
  const assignmentActionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  const assignmentAction = item.href ? (
    <LinkButton href={item.href} label={assignmentActionLabel} tone='primary' />
  ) : (
    <MutedActionChip
      compact
      label={`${assignmentActionLabel} · ${copy({
        de: 'bald',
        en: 'soon',
        pl: 'wkrotce',
      })}`}
    />
  );

  return (
    <InsetPanel gap={8}>
      <Pill label={priorityLabel} tone={priorityTone} />

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

      {assignmentAction}
    </InsetPanel>
  );
}

export function LeaderboardBadgeChip({
  item,
}: {
  item: KangurMobileLeaderboardBadgeItem;
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

const getMasteryTone = (masteryPercent: number): Tone => {
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

function MasteryInfo({
  insight,
  title,
}: {
  insight: KangurMobileLeaderboardLessonMasteryItem;
  title: string;
}): React.JSX.Element {
  const { copy } = useKangurMobileI18n();
  return (
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
  );
}

export function LessonMasteryRow({
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
    : copy({ de: 'kein Datum', en: 'no date', pl: 'brak daty' });

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
        <MasteryInfo insight={insight} title={title} />
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
          label={copy({ de: 'Lektion öffnen', en: 'Open lesson', pl: 'Otwórz lekcję' })}
          tone='primary'
        />
        {insight.practiceHref ? (
          <LinkButton
            href={insight.practiceHref}
            label={copy({ de: 'Danach trainieren', en: 'Practice after', pl: 'Potem trenuj' })}
          />
        ) : null}
      </View>
    </InsetPanel>
  );
}
