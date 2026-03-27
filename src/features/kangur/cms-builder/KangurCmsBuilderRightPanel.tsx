'use client';

import { useTranslations } from 'next-intl';

import type { ThemeSettings } from '@/shared/contracts/cms-theme';
import { ComponentSettingsPanel, usePageBuilder } from '@/features/cms/public';
import { SidePanel } from '@/features/kangur/shared/ui';
import type { KangurThemeMode } from '@/features/kangur/theme-settings';

import { KangurThemePreviewPanel } from './KangurThemePreviewPanel';

type KangurCmsBuilderRightPanelProps = {
  showThemePreview?: boolean;
  themePreviewSection?: string | null;
  themePreviewTheme?: ThemeSettings;
  themePreviewMode?: KangurThemeMode;
};

type KangurCmsBuilderRightPanelResolvedProps = {
  collapsed: boolean;
  currentPage: unknown;
  showThemePreview: boolean;
  themePreviewSection: string | null;
  themePreviewTheme?: ThemeSettings;
  themePreviewMode: KangurThemeMode;
  hasSelection: boolean;
  title: string;
  emptySelectTargetText: string;
  emptyToolbarHintText: string;
};

const renderKangurCmsBuilderRightPanel = ({
  collapsed,
  currentPage,
  showThemePreview,
  themePreviewSection,
  themePreviewTheme,
  themePreviewMode,
  hasSelection,
  title,
  emptySelectTargetText,
  emptyToolbarHintText,
}: KangurCmsBuilderRightPanelResolvedProps): React.JSX.Element => (
  <div
    className={`relative flex flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
      collapsed
        ? 'pointer-events-none w-0 translate-x-2 opacity-0'
        : 'w-80 translate-x-0 opacity-100'
    }`}
  >
    {showThemePreview && themePreviewTheme ? (
      <SidePanel position='right' width={320} isFocusMode={!currentPage}>
        <KangurThemePreviewPanel
          section={themePreviewSection}
          theme={themePreviewTheme}
          mode={themePreviewMode}
        />
      </SidePanel>
    ) : hasSelection ? (
      <ComponentSettingsPanel />
    ) : (
      <SidePanel
        position='right'
        width={320}
        isFocusMode={!currentPage}
        header={
          <div className='border-b border-border px-4 py-3 text-sm font-semibold text-white'>
            {title}
          </div>
        }
      >
        <div className='space-y-3 p-4 text-sm text-gray-400'>
          <p>{emptySelectTargetText}</p>
          <p>{emptyToolbarHintText}</p>
        </div>
      </SidePanel>
    )}
  </div>
);

export function KangurCmsBuilderRightPanel({
  showThemePreview = false,
  themePreviewSection = null,
  themePreviewTheme,
  themePreviewMode = 'daily',
}: KangurCmsBuilderRightPanelProps): React.JSX.Element {
  const t = useTranslations('KangurCmsBuilder.rightPanel');
  const { state, selectedBlock, selectedColumn, selectedSection } = usePageBuilder();
  const hasSelection = Boolean(selectedSection || selectedBlock || selectedColumn);

  return renderKangurCmsBuilderRightPanel({
    collapsed: state.rightPanelCollapsed,
    currentPage: state.currentPage,
    showThemePreview,
    themePreviewSection,
    themePreviewTheme,
    themePreviewMode,
    hasSelection,
    title: t('title'),
    emptySelectTargetText: t('empty.selectTarget'),
    emptyToolbarHintText: t('empty.toolbarHint'),
  });
}
