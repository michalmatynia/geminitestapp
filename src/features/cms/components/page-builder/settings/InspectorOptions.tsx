'use client';

import React, { useCallback } from 'react';
import { ToggleRow } from '@/shared/ui';
import { usePageBuilderState, usePageBuilderDispatch } from '@/features/cms/hooks/usePageBuilderContext';
import type { InspectorSettings } from '@/shared/contracts/cms';

export function InspectorOptions(): React.JSX.Element | null {
  const state = usePageBuilderState();
  const dispatch = usePageBuilderDispatch();
  const inspectorSettings = state.inspectorSettings;

  const updateInspectorSetting = useCallback(
    (patch: Partial<InspectorSettings>): void =>
      dispatch({ type: 'UPDATE_INSPECTOR_SETTINGS', settings: patch }),
    [dispatch]
  );

  if (!state.inspectorEnabled) return null;

  return (
    <div className='border-b border-border px-4 py-3'>
      <div className='text-[10px] uppercase tracking-wider text-gray-400 mb-2'>
        Inspector options
      </div>
      <div className='space-y-2'>
        <ToggleRow
          label='Enable tooltip'
          checked={inspectorSettings.showTooltip}
          onCheckedChange={(v) => updateInspectorSetting({ showTooltip: v })}
          className='p-2'
        />
        <div className='rounded border border-border/40 bg-gray-800/30 p-2 space-y-1'>
          <ToggleRow
            label='Style settings'
            checked={inspectorSettings.showStyleSettings}
            onCheckedChange={(v) => updateInspectorSetting({ showStyleSettings: v })}
            className='border-none bg-transparent p-1'
          />
          <ToggleRow
            label='Structure info'
            checked={inspectorSettings.showStructureInfo}
            onCheckedChange={(v) => updateInspectorSetting({ showStructureInfo: v })}
            className='border-none bg-transparent p-1'
          />
          <ToggleRow
            label='Identifiers'
            checked={inspectorSettings.showIdentifiers}
            onCheckedChange={(v) => updateInspectorSetting({ showIdentifiers: v })}
            className='border-none bg-transparent p-1'
          />
          <ToggleRow
            label='Visibility info'
            checked={inspectorSettings.showVisibilityInfo}
            onCheckedChange={(v) => updateInspectorSetting({ showVisibilityInfo: v })}
            className='border-none bg-transparent p-1'
          />
          <ToggleRow
            label='Connection info'
            checked={inspectorSettings.showConnectionInfo}
            onCheckedChange={(v) => updateInspectorSetting({ showConnectionInfo: v })}
            className='border-none bg-transparent p-1'
          />
        </div>
      </div>
    </div>
  );
}
