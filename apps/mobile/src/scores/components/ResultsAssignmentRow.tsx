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

import { Text, View } from 'react-native';

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

const getPriorityLabel = (priority: string, copy: ReturnType<typeof useKangurMobileI18n>['copy']): string => {
  if (priority === 'high') return copy({ de: 'Hohe Priorität', en: 'High priority', pl: 'Priorytet wysoki' });
  if (priority === 'medium') return copy({ de: 'Mittlere Priorität', en: 'Medium priority', pl: 'Priorytet średni' });
  return copy({ de: 'Niedrige Priorität', en: 'Low priority', pl: 'Priorytet niski' });
};

function PriorityBadge({ priority, copy }: { priority: string; copy: ReturnType<typeof useKangurMobileI18n>['copy'] }) {
  return <Pill label={getPriorityLabel(priority, copy)} tone={getPriorityTone(priority)} />;
}

function AssignmentInfo({ item, copy }: { item: KangurMobileResultsAssignmentItem; copy: ReturnType<typeof useKangurMobileI18n>['copy'] }) {
  return (
    <>
      <Text style={{ color: '#0f172a', fontSize: 15, fontWeight: '800' }}>{item.title}</Text>
      <Text style={{ color: '#475569', fontSize: 14, lineHeight: 20 }}>{item.description}</Text>
      <Text style={{ color: '#64748b', fontSize: 12, lineHeight: 18 }}>
        {copy({ de: `Ziel: ${item.target}`, en: `Goal: ${item.target}`, pl: `Cel: ${item.target}` })}
      </Text>
    </>
  );
}

function AssignmentAction({ item, copy, locale }: { item: KangurMobileResultsAssignmentItem; copy: ReturnType<typeof useKangurMobileI18n>['copy']; locale: string }) {
  const label = translateKangurMobileActionLabel(item.action.label, locale);
  if (item.href) return <LinkButton href={item.href} label={label} tone='primary' />;
  
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
      <PriorityBadge priority={item.priority} copy={copy} />
      <AssignmentInfo item={item} copy={copy} />
      <AssignmentAction item={item} copy={copy} locale={locale} />
    </InsetPanel>
  );
}
