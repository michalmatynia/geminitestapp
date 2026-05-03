
import { Badge } from '@/features/kangur/shared/ui';
import { KangurAdminStatusCard } from '../components/KangurAdminStatusCard';
import { useTestSuitesManager } from './test-suites-manager.context';
import { useTestSuitesManagerLogic } from './test-suites-manager.logic';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';

export function LibraryStatusSidebar(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const state = useTestSuitesManager();
  const logic = useTestSuitesManagerLogic(settingsStore);

  return (
    <KangurAdminStatusCard
      title='Status'
      statusBadge={
        <Badge variant={logic.needsAttention ? 'warning' : 'secondary'}>
          {logic.needsAttention ? 'Needs attention' : 'Healthy'}
        </Badge>
      }
      items={[
        {
          label: 'View mode',
          value: <Badge variant='outline'>{state.treeMode === 'catalog' ? 'Catalog' : 'Ordered'}</Badge>,
        },
        {
          label: 'Suites',
          value: (
            <span className='text-foreground font-semibold'>{logic.libraryHealthSummary.suiteCount}</span>
          ),
        },
        {
          label: 'Questions',
          value: (
            <span className='text-foreground font-semibold'>
              {logic.libraryHealthSummary.totalQuestionCount}
            </span>
          ),
        },
        {
          label: 'Needs fixes',
          value: (
            <span className='text-foreground font-semibold'>
              {logic.libraryHealthSummary.suitesNeedingFixCount}
            </span>
          ),
        },
        {
          label: 'Needs review',
          value: (
            <span className='text-foreground font-semibold'>
              {logic.libraryHealthSummary.suitesNeedingReviewCount}
            </span>
          ),
        },
        {
          label: 'Live attention',
          value: (
            <span className='text-foreground font-semibold'>
              {logic.libraryHealthSummary.unstableLiveSuiteCount}
            </span>
          ),
        },
      ]}
    />
  );
}
