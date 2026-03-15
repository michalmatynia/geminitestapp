import { BarChart2, BookOpen, BrainCircuit, ClipboardList, ListChecks } from 'lucide-react';
import { useCallback, useRef } from 'react';

import {
  type KangurParentDashboardTabId,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurButton, KangurPanelIntro } from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { cn } from '@/shared/utils';

const TABS: Array<{
  id: KangurParentDashboardTabId;
  label: string;
  mobileLabel: string;
  icon: typeof BarChart2;
  docId: string;
}> = [
  {
    id: 'scores',
    label: 'Wyniki',
    mobileLabel: 'Wyniki',
    icon: ClipboardList,
    docId: 'parent_scores_tab',
  },
  {
    id: 'progress',
    label: 'Postęp',
    mobileLabel: 'Postęp',
    icon: BarChart2,
    docId: 'parent_progress_tab',
  },
  {
    id: 'assign',
    label: 'Zadania',
    mobileLabel: 'Zadania',
    icon: BookOpen,
    docId: 'parent_assignments_tab',
  },
  {
    id: 'monitoring',
    label: 'Monitorowanie',
    mobileLabel: 'Monitoring',
    icon: ListChecks,
    docId: 'parent_monitoring_tab',
  },
  {
    id: 'ai-tutor',
    label: 'AI Tutor',
    mobileLabel: 'Tutor AI',
    icon: BrainCircuit,
    docId: 'parent_ai_tutor_tab',
  },
];

export const getParentDashboardTabIds = (
  tabId: KangurParentDashboardTabId
): { tabId: string; panelId: string } => ({
  tabId: `parent-dashboard-tab-${tabId}`,
  panelId: `parent-dashboard-panel-${tabId}`,
});

export function KangurParentDashboardTabsWidget({
  onBeforeTabChange,
}: {
  onBeforeTabChange?: (tabId: KangurParentDashboardTabId) => void;
} = {}): React.JSX.Element | null {
  const { activeTab, canAccessDashboard, setActiveTab } = useKangurParentDashboardRuntime();
  const { entry: tabsContent } = useKangurPageContentEntry('parent-dashboard-tabs');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabChange = useCallback(
    (tabId: KangurParentDashboardTabId): void => {
      onBeforeTabChange?.(tabId);
      setActiveTab(tabId);
    },
    [onBeforeTabChange, setActiveTab]
  );
  const focusTabAt = useCallback((index: number): void => {
    tabRefs.current[index]?.focus();
  }, []);
  const handleTabKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (TABS.length === 0) {
        return;
      }

      let nextIndex = index;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (index + 1) % TABS.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (index - 1 + TABS.length) % TABS.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = TABS.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextTab = TABS[nextIndex];
      if (!nextTab) {
        return;
      }
      handleTabChange(nextTab.id);
      requestAnimationFrame(() => focusTabAt(nextIndex));
    },
    [focusTabAt, handleTabChange]
  );

  const handlePointerTabMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      // Pointer focus makes the tab strip the browser's scroll anchor during tab content swaps.
      // Keep keyboard focus behavior unchanged while avoiding pointer-driven viewport jumps.
      event.preventDefault();
    },
    []
  );

  if (!canAccessDashboard) {
    return null;
  }

  return (
    <div className='flex flex-col gap-3'>
      <KangurPanelIntro
        description={
          tabsContent?.summary ??
          'Przełączaj między wynikami, postępem, zadaniami, monitoringiem i ustawieniami Tutor-AI.'
        }
        title={tabsContent?.title ?? 'Zakładki panelu'}
        titleAs='h2'
        titleClassName='text-lg font-bold tracking-[-0.02em]'
      />
      <div
        className={cn(
          KANGUR_SEGMENTED_CONTROL_CLASSNAME,
          'grid grid-cols-2 sm:w-auto sm:grid-cols-none sm:flex'
        )}
        role='tablist'
        aria-orientation='horizontal'
      >
        {TABS.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isLastOdd = index === TABS.length - 1 && TABS.length % 2 === 1;
          const { tabId, panelId } = getParentDashboardTabIds(tab.id);
          return (
            <KangurButton
              id={tabId}
              key={tab.id}
              onMouseDown={handlePointerTabMouseDown}
              onKeyDown={(event) => handleTabKeyDown(index, event)}
              onClick={() => {
                if (isActive) {
                  return;
                }
                handleTabChange(tab.id);
              }}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              role='tab'
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              className={cn(
                'min-w-0 flex-1 justify-center gap-1.5 px-2 text-center sm:px-4',
                isLastOdd && 'col-span-2 sm:col-span-1'
              )}
              size='sm'
              type='button'
              variant={isActive ? 'segmentActive' : 'segment'}
              data-doc-id={tab.docId}
            >
              <Icon className='h-4 w-4' aria-hidden='true' />
              <span className='text-[11px] font-semibold leading-tight sm:text-sm'>
                <span className='sm:hidden'>{tab.mobileLabel}</span>
                <span className='hidden sm:inline'>{tab.label}</span>
              </span>
            </KangurButton>
          );
        })}
      </div>
    </div>
  );
}
