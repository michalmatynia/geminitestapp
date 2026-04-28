import { Text } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
} from '../../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../../shared/translateKangurMobileActionLabel';
import type { KangurMobileResultsAssignmentItem } from '../useKangurMobileResultsAssignments';

export function ResultsAssignmentRow({
  item,
}: {
  item: KangurMobileResultsAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  const priorityTone =
    item.priority === 'high'
      ? {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          textColor: '#b91c1c',
        }
      : item.priority === 'medium'
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
  const assignmentActionLabel = translateKangurMobileActionLabel(item.action.label, locale);
  let assignmentAction: React.JSX.Element;

  if (item.href !== null && item.href !== undefined) {
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
            item.priority === 'high'
              ? 'Hohe Priorität'
              : item.priority === 'medium'
                ? 'Mittlere Priorität'
                : 'Niedrige Priorität',
          en:
            item.priority === 'high'
              ? 'High priority'
              : item.priority === 'medium'
                ? 'Medium priority'
                : 'Low priority',
          pl:
            item.priority === 'high'
              ? 'Priorytet wysoki'
              : item.priority === 'medium'
                ? 'Priorytet średni'
                : 'Priorytet niski',
        })}
        tone={priorityTone}
      />
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>
        {item.title}
      </Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>
        {item.description}
      </Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({
          de: `Ziel: ${item.target}`,
          en: `Goal: ${item.target}`,
          pl: `Cel: ${item.target}`,
        })}
      </Text>
      {assignmentAction}
    </InsetPanel>
  );
}
