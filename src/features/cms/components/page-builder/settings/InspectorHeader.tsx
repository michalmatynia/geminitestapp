// @ts-nocheck - Persistent type resolution issues with usePageBuilderState.
'use client';

import React, { useMemo, useCallback } from 'react';
import { MousePointer2, Monitor, Smartphone, PanelRightClose, Paintbrush } from 'lucide-react';
import { Button, SectionHeader, Tooltip } from '@/shared/ui';
import { DOCUMENTATION_MODULE_IDS } from '@/features/documentation';
import { getDocumentationTooltip } from '@/features/tooltip-engine';
import { usePageBuilderState } from '../../../hooks/page-builder/PageStateContext';
import { usePageBuilderDispatch } from '../../../hooks/page-builder/PageDispatchContext';
import { useComponentSettingsContext } from '../context/ComponentSettingsContext';
import type { InspectorSettings } from '../../types/page-builder';

export function InspectorHeader(): React.JSX.Element {
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const { 
    selectedTitle,
    activeTab,
    setActiveTab,
  } = useComponentSettingsContext();

  const inspectorSettings = state.inspectorSettings as InspectorSettings;

  const updateInspectorSetting = useCallback((patch: Partial<InspectorSettings>): void => 
    dispatch({ type: 'UPDATE_INSPECTOR_SETTINGS', settings: patch }), [dispatch]);

  const handleToggleInspector = useCallback((): void => {
    const next = !state.inspectorEnabled; 
    dispatch({ type: 'TOGGLE_INSPECTOR' });
    if (next) setActiveTab('connections'); 
    else if (activeTab === 'connections') setActiveTab('settings');
  }, [activeTab, dispatch, state.inspectorEnabled, setActiveTab]);

  const headerTooltips = useMemo(
    () => ({
      hideRightPanel: getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.cms, 'component_settings_hide_right_panel') ?? 'Hide right panel',
      toggleInspector: getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.cms, 'component_settings_toggle_inspector') ?? 'Toggle inspector',
      desktopPreview: getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.cms, 'component_settings_desktop_preview') ?? 'Desktop preview',
      mobilePreview: getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.cms, 'component_settings_mobile_preview') ?? 'Mobile preview',
      toggleEditorChrome: getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.cms, 'component_settings_toggle_editor_chrome') ?? 'Toggle editor chrome',
    }),
    []
  );

  return (
    <SectionHeader
      title={selectedTitle} 
      size='xs'
      className='p-3 flex-row-reverse' 
      titleClassName='text-right' 
      actionsClassName='justify-start'
      actions={(
        <div className='flex items-center gap-1'>
          <Tooltip content={headerTooltips.hideRightPanel}>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={() => dispatch({ type: 'TOGGLE_RIGHT_PANEL' })}
              className='h-6 w-6 p-0 text-gray-500 hover:text-gray-300'
              aria-label='Hide right panel'
            >
              <PanelRightClose className='size-3.5' />
            </Button>
          </Tooltip>
          <Tooltip content={headerTooltips.toggleInspector}>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={handleToggleInspector}
              className={`h-6 w-6 p-0 ${state.inspectorEnabled ? 'text-blue-300 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
              aria-label='Toggle inspector'
            >
              <MousePointer2 className='size-3.5' />
            </Button>
          </Tooltip>
          <Tooltip content={headerTooltips.desktopPreview}>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', mode: 'desktop' })}
              className={`h-6 w-6 p-0 ${state.previewMode === 'desktop' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
              aria-label='Desktop preview'
            >
              <Monitor className='size-3.5' />
            </Button>
          </Tooltip>
          <Tooltip content={headerTooltips.mobilePreview}>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', mode: 'mobile' })}
              className={`h-6 w-6 p-0 ${state.previewMode === 'mobile' ? 'text-blue-300 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
              aria-label='Mobile preview'
            >
              <Smartphone className='size-3.5' />
            </Button>
          </Tooltip>
          <Tooltip content={headerTooltips.toggleEditorChrome}>
            <Button
              type='button'
              size='icon'
              variant='ghost'
              onClick={() => updateInspectorSetting({ showEditorChrome: !inspectorSettings.showEditorChrome })}
              className={`h-6 w-6 p-0 ${inspectorSettings.showEditorChrome ? 'text-blue-300 bg-blue-500/10' : 'text-gray-500 hover:text-gray-300'}`}
              aria-label='Toggle editor chrome'
            >
              <Paintbrush className='size-3.5' />
            </Button>
          </Tooltip>
        </div>
      )}
    />
  );
}
