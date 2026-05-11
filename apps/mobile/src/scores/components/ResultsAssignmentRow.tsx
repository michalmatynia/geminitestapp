import { Text } from 'react-native';

import { useKangurMobileI18n } from '../../i18n/kangurMobileI18n';
import {
  KangurMobileInsetPanel as InsetPanel,
  KangurMobileLinkButton as LinkButton,
  KangurMobileMutedActionChip as MutedActionChip,
  KangurMobilePill as Pill,
  type KangurMobileTone as Tone,
} from '../../shared/KangurMobileUi';
import { translateKangurMobileActionLabel } from '../../shared/translateKangurMobileActionLabel';
import type { KangurMobileResultsAssignmentItem } from '../useKangurMobileResultsAssignments';

const getPriorityTone = (priority: string): Tone => {
  if (priority === 'high') return { backgroundColor: '#fef2f2', borderColor: '#fecaca', textColor: '#b91c1c' };
  if (priority === 'medium') return { backgroundColor: '#fffbeb', borderColor: '#fde68a', textColor: '#b45309' };
  return { backgroundColor: '#eff6ff', borderColor: '#bfdbfe', textColor: '#1d4ed8' };
};

const getPriorityLabel = (
  priority: string,
  copy: ReturnType<typeof useKangurMobileI18n>['copy'],
): string => {
  if (priority === 'high') return copy({ de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' });
  if (priority === 'medium') return copy({ de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' });
  return copy({ de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' });
};

function PriorityBadge({
  item,
  copy,
}: { item: KangurMobileResultsAssignmentItem; copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  const assignment = (item as { assignment?: KangurMobileResultsAssignmentItem }).assignment ?? item;
  const priority = assignment.priority;

  return <Pill label={getPriorityLabel(priority, copy)} tone={getPriorityTone(priority)} />;
}

function AssignmentInfo({ item, copy }: { item: KangurMobileResultsAssignmentItem; copy: ReturnType<typeof useKangurMobileI18n>['copy'] }): React.JSX.Element {
  const assignment = (item as { assignment?: KangurMobileResultsAssignmentItem }).assignment ?? item;
  return (
    <>
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{assignment.title}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{assignment.description}</Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({ de: `Ziel: ${assignment.target}`, en: `Goal: ${assignment.target}`, pl: `Cel: ${assignment.target}` })}
      </Text>
    </>
  );
}

function AssignmentAction({ item, copy, locale }: { item: KangurMobileResultsAssignmentItem; copy: ReturnType<typeof useKangurMobileI18n>['copy']; locale: string }): React.JSX.Element {
  const assignment = (item as { assignment?: KangurMobileResultsAssignmentItem }).assignment ?? item;
  const label = translateKangurMobileActionLabel(assignment.action.label, locale);
  if (item.href !== null && item.href !== '') {
    return <LinkButton href={item.href} label={label} tone='primary' />;
  }
  
  return (
    <MutedActionChip
      compact
      label={`${label} · ${copy({ de: 'bald', en: 'soon', pl: 'wkrotce' })}`}
    />
  );
}

export function ResultsAssignmentRow({
  item,
}: {
  item: KangurMobileResultsAssignmentItem;
}): React.JSX.Element {
  const { copy, locale } = useKangurMobileI18n();
  return (
    <InsetPanel gap={8} padding={12} style={{ borderRadius: 18, backgroundColor: '#ffffff' }}>
      <PriorityBadge item={item} copy={copy} />
      <AssignmentInfo item={item} copy={copy} />
      <AssignmentAction item={item} copy={copy} locale={locale} />
    </InsetPanel>
  );
}
