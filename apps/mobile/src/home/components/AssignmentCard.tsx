import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../../shared/translateKangurMobileActionLabel';
import type { KangurMobileHomeAssignmentItem } from '../useKangurMobileHomeAssignments';
import { OutlineLink, SummaryChip } from '../homeScreenPrimitives';

function getPriorityConfig(
  priority: string,
  copy: (args: Record<string, string>) => string,
): { accent: 'rose' | 'amber' | 'blue'; label: string } {
  if (priority === 'high') {
    return { accent: 'rose' as const, label: copy({ de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' }) };
  }
  if (priority === 'medium') {
    return { accent: 'amber' as const, label: copy({ de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' }) };
  }
  return { accent: 'blue' as const, label: copy({ de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' }) };
}

export function AssignmentCard({
  item,
}: {
  item: KangurMobileHomeAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const actionLabel = translateKangurMobileActionLabel(item.assignment.action.label, locale);
  const { accent, label } = getPriorityConfig(item.assignment.priority, copy);
  
  const assignmentAction = item.href !== undefined && item.href !== '' ? (
    <OutlineLink href={item.href} hint={item.assignment.description} label={actionLabel} />
  ) : (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: 999,
        backgroundColor: '#e2e8f0',
        paddingHorizontal: 14,
        paddingVertical: 10,
      }}
    >
      <Text style={{ color: '#475569', fontWeight: '700' }}>
        {actionLabel} · {copy({ de: 'bald', en: 'soon', pl: 'wkrotce' })}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: '#f8fafc',
        borderColor: '#e2e8f0',
        borderRadius: 20,
        borderWidth: 1,
        gap: 10,
        padding: 14,
      }}
    >
      <SummaryChip accent={accent} label={label} />
      <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '800' }}>
        {item.assignment.title}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {item.assignment.description}
      </Text>
      <Text style={{ color: '#64748b', lineHeight: 20 }}>
        {copy({ de: `Ziel: ${item.assignment.target}`, en: `Goal: ${item.assignment.target}`, pl: `Cel: ${item.assignment.target}` })}
      </Text>
      {assignmentAction}
    </View>
  );
}
