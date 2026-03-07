'use client';

import { BarChart2, BookOpen, ClipboardList } from 'lucide-react';

import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import {
  type KangurParentDashboardTabId,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { cn } from '@/shared/utils';

const TABS: Array<{
  id: KangurParentDashboardTabId;
  label: string;
  icon: typeof BarChart2;
  docId: string;
}> = [
  { id: 'progress', label: 'Postep', icon: BarChart2, docId: 'parent_progress_tab' },
  { id: 'scores', label: 'Wyniki gier', icon: ClipboardList, docId: 'parent_scores_tab' },
  { id: 'assign', label: 'Zadania', icon: BookOpen, docId: 'parent_assignments_tab' },
];

export function KangurParentDashboardTabsWidget(): React.JSX.Element | null {
  const { activeTab, canAccessDashboard, setActiveTab } = useKangurParentDashboardRuntime();

  if (!canAccessDashboard) {
    return null;
  }

  return (
    <KangurPanel className='flex gap-2 p-1.5' padding='md' variant='soft'>
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <KangurButton
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn('flex-1 justify-center', activeTab === tab.id ? 'shadow-sm' : '')}
            size='md'
            variant={activeTab === tab.id ? 'primary' : 'secondary'}
            data-doc-id={tab.docId}
          >
            <Icon className='h-4 w-4' />
            <span className='hidden sm:inline'>{tab.label}</span>
          </KangurButton>
        );
      })}
    </KangurPanel>
  );
}
