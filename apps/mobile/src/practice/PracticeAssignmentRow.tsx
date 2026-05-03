import React from 'react';
import { Text } from 'react-native';
import { useKangurMobileI18n } from '../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../shared/translateKangurMobileActionLabel';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../shared/KangurMobileUi';
import type { KangurMobilePracticeAssignmentItem } from './useKangurMobilePracticeAssignments';

export function PracticeAssignmentRow({
  item,
}: {
  item: KangurMobilePracticeAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();

  const getPriorityTone = (priority: string): Tone => {
    if (priority === 'high') {
      const tone: Tone = { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
      return tone;
    }
    if (priority === 'medium') {
      const tone: Tone = { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
      return tone;
    }
    const tone: Tone = { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', textColor: '#1d4ed8' };
    return tone;
  };

  const getPriorityLabel = (priority: string): string => {
    if (priority === 'high') return copy({ de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' });
    if (priority === 'medium') return copy({ de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' });
    return copy({ de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' });
  };

  const priorityTone = getPriorityTone(item.priority);
  const priorityLabel = getPriorityLabel(item.priority);
  const actionLabel = translateKangurMobileActionLabel(item.action.label, locale);
  
  let assignmentAction: React.JSX.Element = (
    <MutedActionChip
      compact
      label={`${actionLabel} · ${copy({ de: 'bald', en: 'soon', pl: 'wkrotce' })}`}
    />
  );

  if (item.href !== null) {
    assignmentAction = (
      <LinkButton
        href={item.href}
        label={actionLabel}
        style={{ paddingHorizontal: 12 }}
        tone='primary'
        verticalPadding={9}
      />
    );
  }

  return (
    <InsetPanel gap={8} padding={12} style={{ borderRadius: 18, backgroundColor: '#ffffff' }}>
      <Pill label={priorityLabel} tone={priorityTone} />
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{item.title}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{item.description}</Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({ de: `Ziel: ${item.target}`, en: `Goal: ${item.target}`, pl: `Cel: ${item.target}` })}
      </Text>
      {assignmentAction}
    </InsetPanel>
  );
}
