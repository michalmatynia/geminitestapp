'use client';

import React from 'react';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { focusOnMount } from '@/shared/utils/focus-on-mount';
import { useAiPathsSettingsPageContext } from '../AiPathsSettingsPageContext';

export function AiPathsCanvasName(): React.JSX.Element | null {
  const {
    activePathId,
    autoSaveLabel,
    autoSaveVariant,
    lastRunAt,
    isPathNameEditing,
    renameDraft,
    setRenameDraft,
    commitPathNameEdit,
    cancelPathNameEdit,
    startPathNameEdit,
    pathName,
    pathSwitchOptions,
    handleSwitchPath,
  } = useAiPathsSettingsPageContext();

  const activePath = activePathId ?? null;
  const switchPath = handleSwitchPath ?? (() => undefined);
  const pathOptions = Array.isArray(pathSwitchOptions) ? pathSwitchOptions : [];

  return (
    <div className='flex items-center justify-end gap-2'>
      {autoSaveLabel ? (
        <StatusBadge
          status={autoSaveLabel}
          variant={autoSaveVariant}
          size='sm'
          className='font-medium'
        />
      ) : null}
      {lastRunAt && (
        <StatusBadge
          status={'Last run: ' + new Date(lastRunAt).toLocaleTimeString()}
          variant='active'
          size='sm'
          className='font-medium'
        />
      )}
      <div className='flex items-center gap-2'>
        {isPathNameEditing ? (
          <input
            ref={focusOnMount}
            data-doc-id='canvas_path_name_field'
            type='text'
            value={renameDraft}
            onChange={(event) => {
              setRenameDraft(event.target.value);
            }}
            aria-label='Path name'
            onBlur={commitPathNameEdit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                event.currentTarget.blur();
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                cancelPathNameEdit();
              }
            }}
            className='h-9 w-[320px] rounded-md border border-border bg-card/60 px-3 text-sm text-white outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            placeholder='Path name'
            disabled={!activePath}
          />
        ) : (
          <button
            data-doc-id='canvas_path_name_field'
            type='button'
            className='h-9 w-[320px] rounded-md border border-border bg-card/60 px-3 text-left text-sm text-gray-200 hover:bg-card/70 disabled:cursor-not-allowed disabled:opacity-60'
            onDoubleClick={startPathNameEdit}
            disabled={!activePath}
            title={
              activePath ? 'Double-click to rename this path' : 'No active path selected'
            }
          >
            <span className='block truncate'>{pathName || 'Untitled path'}</span>
          </button>
        )}
        <SelectSimple
          dataDocId='canvas_path_selector'
          size='sm'
          value={activePath ?? undefined}
          onValueChange={(value: string): void => {
            if (value !== activePath) {
              switchPath(value);
            }
          }}
          options={pathOptions}
          placeholder='Select path'
          ariaLabel='Active path'
          className='w-[240px]'
          triggerClassName='h-9 border-border bg-card/60 px-3 text-xs text-white'
          disabled={pathOptions.length === 0}
          title='Select path'
        />
      </div>
    </div>
  );
}
