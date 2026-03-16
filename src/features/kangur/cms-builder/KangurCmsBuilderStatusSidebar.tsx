'use client';

import { useMemo } from 'react';

import { flattenByZonePreorder, usePageBuilderState } from '@/features/cms/public';
import { KangurAdminStatusCard } from '@/features/kangur/admin/components/KangurAdminStatusCard';
import { Badge, StatusBadge } from '@/features/kangur/shared/ui';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';

import { useKangurCmsBuilderRuntimeState } from './KangurCmsBuilderRuntimeContext';
import { serializeKangurCmsSections } from './project';

type KangurCmsBuilderStatusSidebarProps = {
  visible?: boolean;
};

export function KangurCmsBuilderStatusSidebar({
  visible = true,
}: KangurCmsBuilderStatusSidebarProps): React.JSX.Element | null {
  if (!visible) return null;
  const { draftProject, savedProject, activeScreenKey, isSaving } =
    useKangurCmsBuilderRuntimeState();
  const state = usePageBuilderState();

  const orderedSections = useMemo(() => flattenByZonePreorder(state.sections), [state.sections]);
  const draftComponents = useMemo(
    () => serializeKangurCmsSections(orderedSections),
    [orderedSections]
  );
  const activeScreen = draftProject.screens[activeScreenKey];
  const draftSnapshot = useMemo(() => {
    if (!activeScreen) {
      return draftProject;
    }
    return {
      ...draftProject,
      screens: {
        ...draftProject.screens,
        [activeScreenKey]: {
          ...activeScreen,
          components: draftComponents,
        },
      },
    };
  }, [activeScreen, activeScreenKey, draftComponents, draftProject]);
  const isDirty = useMemo(
    () => serializeSetting(draftSnapshot) !== serializeSetting(savedProject),
    [draftSnapshot, savedProject]
  );

  const activeScreenName = activeScreen?.name ?? activeScreenKey;
  const isFocusMode = state.leftPanelCollapsed && state.rightPanelCollapsed;
  const panelLabel = isFocusMode
    ? 'Canvas only'
    : state.leftPanelCollapsed || state.rightPanelCollapsed
      ? 'Mixed panels'
      : 'Panels open';

  return (
    <aside className='hidden h-full w-72 flex-shrink-0 border-l border-border/60 bg-background/40 p-4 2xl:flex'>
      <KangurAdminStatusCard
        title='Status'
        sticky={false}
        statusBadge={
          isSaving ? (
            <StatusBadge status='processing' label='Saving' size='sm' />
          ) : (
            <Badge variant={isDirty ? 'warning' : 'secondary'}>
              {isDirty ? 'Unsaved changes' : 'Saved'}
            </Badge>
          )
        }
        items={[
          {
            label: 'Screen',
            value: <Badge variant='outline'>{activeScreenName}</Badge>,
          },
          {
            label: 'Sections',
            value: <span className='text-foreground font-semibold'>{orderedSections.length}</span>,
          },
          {
            label: 'Panels',
            value: <Badge variant='outline'>{panelLabel}</Badge>,
          },
        ]}
      />
    </aside>
  );
}
