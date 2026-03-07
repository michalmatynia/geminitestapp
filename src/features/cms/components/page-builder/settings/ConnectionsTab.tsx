'use client';

import React from 'react';

import { Input, Label, Checkbox } from '@/shared/ui';

import {
  useComponentSettingsActions,
  useComponentSettingsState,
} from '../context/ComponentSettingsContext';

function ConnectionsTab(): React.ReactNode {
  const { hasSelection, selectedLabel, connectionSettings } = useComponentSettingsState();
  const { updateConnectionSetting } = useComponentSettingsActions();
  const enabledCheckboxId = 'cms-connections-enabled';

  if (!hasSelection) {
    return <div className='text-xs text-gray-500'>Select an element to configure connections.</div>;
  }

  return (
    <div className='space-y-4'>
      <div className='rounded border border-border/40 bg-gray-800/30 px-3 py-2 text-xs text-gray-400'>
        Connection settings for <span className='text-gray-200'>{selectedLabel}</span>
      </div>
      <div className='rounded border border-dashed border-border/30 bg-gray-900/30 px-3 py-2 text-[11px] text-gray-500'>
        Runtime-capable pages can bind blocks to live data. Example: source <code>kangur</code>,
        path <code>game.screen</code> or <code>progress.level</code>. Inside repeater items, use
        source <code>item</code> with paths like <code>title</code> or <code>progressPercent</code>.
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Data source</Label>
        <Input
          value={connectionSettings.source}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            updateConnectionSetting({ source: e.target.value })
          }
          placeholder='e.g. product, collection, hero'
          className='h-8 text-xs'
        />
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Key path</Label>
        <Input
          value={connectionSettings.path}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            updateConnectionSetting({ path: e.target.value })
          }
          placeholder='e.g. title, hero.text'
          className='h-8 text-xs'
        />
      </div>
      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Fallback</Label>
        <Input
          value={connectionSettings.fallback}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
            updateConnectionSetting({ fallback: e.target.value })
          }
          placeholder='Optional fallback text'
          className='h-8 text-xs'
        />
      </div>
      <div className='flex items-center gap-2 text-xs text-gray-400'>
        <Checkbox
          id={enabledCheckboxId}
          checked={connectionSettings.enabled}
          onCheckedChange={(value: boolean | 'indeterminate'): void =>
            updateConnectionSetting({ enabled: value === true })
          }
        />
        <Label htmlFor={enabledCheckboxId} className='cursor-pointer text-xs text-gray-400'>
          Enable data connection
        </Label>
      </div>
    </div>
  );
}

export { ConnectionsTab };
