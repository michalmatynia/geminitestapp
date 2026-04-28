import type { KangurAssignmentPlan } from '@kangur/core';
import { type Href } from 'expo-router';
import { Text } from 'react-native';

import { createKangurDuelsHref } from '../duels/duelsHref';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
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

export const LESSONS_ROUTE = '/lessons' as Href;
export const DUELS_ROUTE = createKangurDuelsHref();
export const PROFILE_ROUTE = '/profile' as Href;
export const RESULTS_ROUTE = createKangurResultsHref();

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

export function AssignmentRow({
  assignment,
  href,
}: {
  assignment: KangurAssignmentPlan;
  href: Href | null;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const actionLabel = translateKangurMobileActionLabel(assignment.action.label, locale);
  const assignmentAction = href !== null ? (
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

  const getLabel = (): string => {
    const priority = assignment.priority;
    if (priority === 'high') {
      return copy({ de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' });
    }
    if (priority === 'medium') {
      return copy({ de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' });
    }
    return copy({ de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' });
  };

  return (
    <InsetPanel gap={8}>
      <Pill label={getLabel()} tone={getPriorityTone(assignment.priority)} />
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

export * from './components/FocusCard';
export * from './components/LessonCheckpointRow';
export * from './components/LessonMasteryRow';
export * from './components/RecentResultRow';
