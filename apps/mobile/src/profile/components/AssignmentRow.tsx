import { Text } from 'react-native';
import { KangurMobileInsetPanel as InsetPanel, KangurMobileLinkButton as LinkButton, KangurMobileMutedActionChip as MutedActionChip, KangurMobilePill as Pill } from '../../shared/KangurMobileUi';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../../shared/translateKangurMobileActionLabel';
import { getPriorityLabel, getPriorityTone } from '../profile-primitives';
import type { KangurAssignmentPlan } from '@kangur/core';
import type { Href } from 'expo-router';

export function AssignmentRow({ assignment, href }: { assignment: KangurAssignmentPlan, href: Href | null }): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityTone = getPriorityTone(assignment.priority);
  const actionLabel = translateKangurMobileActionLabel(assignment.action.label, locale);
  
  const assignmentAction = href ? (
    <LinkButton href={href} label={actionLabel} tone='brand' />
  ) : (
    <MutedActionChip label={`${actionLabel} · ${copy({ de: 'bald', en: 'soon', pl: 'wkrotce' })}`} />
  );

  return (
    <InsetPanel gap={8}>
      <Pill label={getPriorityLabel(assignment.priority, locale)} tone={priorityTone} />
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>{assignment.title}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{assignment.description}</Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({ de: `Ziel: ${assignment.target}`, en: `Goal: ${assignment.target}`, pl: `Cel: ${assignment.target}` })}
      </Text>
      {assignmentAction}
    </InsetPanel>
  );
}
