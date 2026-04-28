import { Text, View } from 'react-native';
import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import { translateKangurMobileActionLabel } from '../../shared/translateKangurMobileActionLabel';
import type { KangurMobileHomeAssignmentItem } from '../useKangurMobileHomeAssignments';
import { OutlineLink, SummaryChip } from '../homeScreenPrimitives';

function getPriorityConfig(
  priority: string | undefined,
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
  const assignment = item.assignment as {
    priority: string | undefined;
    title: string;
    description: string;
    target: string;
    action: { label: unknown };
  };
  const actionLabel = translateKangurMobileActionLabel(assignment.action.label as string, locale);
  const { accent, label } = getPriorityConfig(assignment.priority, copy);
  
  const assignmentAction = item.href !== null ? (
    <OutlineLink href={item.href} hint={assignment.description} label={actionLabel} />
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
        {assignment.title}
      </Text>
      <Text style={{ color: '#475569', lineHeight: 20 }}>
        {assignment.description}
      </Text>
      <Text style={{ color: '#64748b', lineHeight: 20 }}>
        {copy({ de: `Ziel: ${assignment.target}`, en: `Goal: ${assignment.target}`, pl: `Cel: ${assignment.target}` })}
      </Text>
      {assignmentAction}
    </View>
  );
}
