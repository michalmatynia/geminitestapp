'use client';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import type { KangurThemeMode } from '@/features/kangur/admin/components/KangurThemeSettingsPanel';
import { ComponentSettingsPanel, usePageBuilder } from '@/features/cms/public';
import { SidePanel } from '@/shared/ui';

import { KangurThemePreviewPanel } from './KangurThemePreviewPanel';

type KangurCmsBuilderRightPanelProps = {
  showThemePreview?: boolean;
  themePreviewSection?: string | null;
  themePreviewTheme?: ThemeSettings;
  themePreviewMode?: KangurThemeMode;
};

export function KangurCmsBuilderRightPanel({
  showThemePreview = false,
  themePreviewSection = null,
  themePreviewTheme,
  themePreviewMode = 'daily',
}: KangurCmsBuilderRightPanelProps): React.JSX.Element {
  const { state, selectedBlock, selectedColumn, selectedSection } = usePageBuilder();
  const hasSelection = Boolean(selectedSection || selectedBlock || selectedColumn);
  const previewSection = themePreviewSection;
  const previewTheme = themePreviewTheme;
  const previewMode = themePreviewMode;

  return (
    <div
      className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
        state.rightPanelCollapsed
          ? 'pointer-events-none w-0 translate-x-2 opacity-0'
          : 'w-80 translate-x-0 opacity-100'
      }`}
    >
      {showThemePreview && previewTheme ? (
        <SidePanel position='right' width={320} isFocusMode={!state.currentPage}>
          <KangurThemePreviewPanel
            section={previewSection}
            theme={previewTheme}
            mode={previewMode}
          />
        </SidePanel>
      ) : hasSelection ? (
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
