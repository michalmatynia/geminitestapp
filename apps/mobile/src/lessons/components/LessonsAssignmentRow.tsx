import { Text } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../../shared/translateKangurMobileActionLabel';
import type { KangurMobileLessonsAssignmentItem } from '../useKangurMobileLessonsAssignments';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../../shared/KangurMobileUi';

const resolvePriorityTone = (priority: string): Tone => {
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

const resolvePriorityLabel = (priority: string, copy: (m: Record<string, string>) => string): string => {
  if (priority === 'high') {
    return copy({ de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' });
  }

  if (priority === 'medium') {
    return copy({ de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' });
  }

  return copy({ de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' });
};

export function LessonsAssignmentRow({
  item,
}: {
  item: KangurMobileLessonsAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const assignment = item.assignment as { priority: string; title: string; description: string; target: string; action: { label: string } };
  const priorityTone = resolvePriorityTone(assignment.priority);
  const priorityLabel = resolvePriorityLabel(assignment.priority, copy);
  const actionLabel = translateKangurMobileActionLabel(assignment.action.label, locale);
  const soonLabel = copy({ de: 'bald', en: 'soon', pl: 'wkrotce' });

  const assignmentAction =
    item.href !== null ? (
      <LinkButton href={item.href} label={actionLabel} stretch tone='primary' />
    ) : (
      <MutedActionChip label={`${actionLabel} · ${soonLabel}`} />
    );

  return (
    <InsetPanel gap={8}>
      <Pill label={priorityLabel} tone={priorityTone} />
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
        {assignment.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {assignment.description}
      </Text>
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
