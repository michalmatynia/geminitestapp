'use client';

import { BarChart2, BookOpen, BrainCircuit, ListChecks } from 'lucide-react';
import { useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';

import type { IdLabelOptionDto } from '@/shared/contracts/base';
import {
  type KangurParentDashboardTabId,
  useKangurParentDashboardRuntimeShellActions,
  useKangurParentDashboardRuntimeShellState,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { KangurButton, KangurPanelStack } from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn } from '@/features/kangur/shared/utils';

const TABS: Array<
  IdLabelOptionDto<KangurParentDashboardTabId> & {
    icon: typeof BarChart2;
    docId: string;
  }
> = [
  {
    id: 'progress',
    label: '',
    icon: BarChart2,
    docId: 'parent_progress_tab',
  },
  {
    id: 'assign',
    label: '',
    icon: BookOpen,
    docId: 'parent_assignments_tab',
  },
  {
    id: 'monitoring',
    label: '',
    icon: ListChecks,
    docId: 'parent_monitoring_tab',
  },
  {
    id: 'ai-tutor',
    label: '',
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
  const translations = useTranslations('KangurParentDashboard');
  const { activeTab, canAccessDashboard } = useKangurParentDashboardRuntimeShellState();
  const { setActiveTab } = useKangurParentDashboardRuntimeShellActions();
  const isCoarsePointer = useKangurCoarsePointer();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabs = useMemo(
    () =>
      TABS.map((tab) => ({
        ...tab,
        label: translations(`tabs.${tab.id}`),
        mobileLabel: translations(`tabs.mobile.${tab.id}`),
      })),
    [translations]
  );

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
      if (tabs.length === 0) {
        return;
      }

      let nextIndex = index;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextTab = tabs[nextIndex];
      if (!nextTab) {
        return;
      }
      handleTabChange(nextTab.id);
      requestAnimationFrame(() => focusTabAt(nextIndex));
    },
    [focusTabAt, handleTabChange, tabs]
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

  const tabActionClassName = isCoarsePointer
    ? 'min-h-12 min-w-[5rem] flex-1 justify-center gap-1.5 px-4 text-center text-xs touch-manipulation select-none active:scale-[0.985] sm:flex-none sm:px-4'
    : 'min-w-0 flex-1 justify-center gap-1.5 px-2 text-center sm:px-4';

  return (
    <KangurPanelStack>
      <div
        className={cn(
          KANGUR_SEGMENTED_CONTROL_CLASSNAME,
          'grid grid-cols-2 max-[420px]:grid-cols-1 sm:w-auto sm:grid-cols-none sm:flex'
        )}
        role='tablist'
        aria-orientation='horizontal'
      >
        {tabs.map((tab, index) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isLastOdd = index === tabs.length - 1 && tabs.length % 2 === 1;
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
                tabActionClassName,
                isLastOdd && 'col-span-2 max-[420px]:col-span-1 sm:col-span-1'
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
    </KangurPanelStack>
  );
}
