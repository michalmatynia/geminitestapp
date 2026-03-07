'use client';

import { ComponentSettingsPanel } from '@/features/cms/components/page-builder/ComponentSettingsPanel';
import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';
import { SidePanel } from '@/shared/ui';

export function KangurCmsBuilderRightPanel(): React.JSX.Element {
  const { state, selectedBlock, selectedColumn, selectedSection } = usePageBuilder();
  const hasSelection = Boolean(selectedSection || selectedBlock || selectedColumn);

  return (
    <div
      className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
        state.rightPanelCollapsed
          ? 'pointer-events-none w-0 translate-x-2 opacity-0'
          : 'w-80 translate-x-0 opacity-100'
      }`}
    >
      {hasSelection ? (
        <ComponentSettingsPanel />
      ) : (
        <SidePanel
          position='right'
          width={320}
          isFocusMode={!state.currentPage}
          header={
            <div className='border-b border-border px-4 py-3 text-sm font-semibold text-white'>
              Inspector
            </div>
          }
        >
          <div className='space-y-3 p-4 text-sm text-gray-400'>
            <p>Select a section, grid column, or block to edit it.</p>
            <p>
              Screen switching, project save, and preview mode controls live in the builder
              toolbar.
            </p>
          </div>
        </SidePanel>
      )}
    </div>
  );
}
