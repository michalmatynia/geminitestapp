import { BarChart2, BookOpen, BrainCircuit, ClipboardList } from 'lucide-react';
import { useCallback } from 'react';

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
    id: 'progress',
    label: 'Postęp',
    mobileLabel: 'Postęp',
    icon: BarChart2,
    docId: 'parent_progress_tab',
  },
  {
    id: 'scores',
    label: 'Wyniki gier',
    mobileLabel: 'Wyniki',
    icon: ClipboardList,
    docId: 'parent_scores_tab',
  },
  {
    id: 'assign',
    label: 'Zadania',
    mobileLabel: 'Zadania',
    icon: BookOpen,
    docId: 'parent_assignments_tab',
  },
  {
    id: 'ai-tutor',
    label: 'AI Tutor',
    mobileLabel: 'Tutor AI',
    icon: BrainCircuit,
    docId: 'parent_ai_tutor_tab',
  },
];

export function KangurParentDashboardTabsWidget({
  onBeforeTabChange,
}: {
  onBeforeTabChange?: (tabId: KangurParentDashboardTabId) => void;
} = {}): React.JSX.Element | null {
  const { activeTab, canAccessDashboard, setActiveTab } = useKangurParentDashboardRuntime();
  const { entry: tabsContent } = useKangurPageContentEntry('parent-dashboard-tabs');
  const handleTabChange = useCallback(
    (tabId: KangurParentDashboardTabId): void => {
      onBeforeTabChange?.(tabId);
      setActiveTab(tabId);
    },
    [onBeforeTabChange, setActiveTab]
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
          'Przełączaj między postępem, wynikami, zadaniami i ustawieniami Tutor-AI.'
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
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <KangurButton
              key={tab.id}
              onMouseDown={handlePointerTabMouseDown}
              onClick={() => {
                if (isActive) {
                  return;
                }
                handleTabChange(tab.id);
              }}
              aria-pressed={isActive}
              className='min-w-0 flex-1 justify-center gap-1.5 px-2 text-center sm:px-4'
              size='sm'
              type='button'
              variant={isActive ? 'segmentActive' : 'segment'}
              data-doc-id={tab.docId}
            >
              <Icon className='h-4 w-4' />
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
