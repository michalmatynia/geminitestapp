'use client';

import React from 'react';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { focusOnMount } from '@/shared/utils/focus-on-mount';
import {
  useAiPathsSettingsPageCanvasInteractionsContext,
  useAiPathsSettingsPagePathActionsContext,
  useAiPathsSettingsPagePersistenceContext,
  useAiPathsSettingsPageRuntimeContext,
} from '../AiPathsSettingsPageContext';

export function AiPathsCanvasName(): React.JSX.Element | null {
  const {
    activePathId,
    isPathActive,
    isPathLocked,
    isPathNameEditing,
    paths,
    renameDraft,
    setRenameDraft,
    commitPathNameEdit,
    cancelPathNameEdit,
    startPathNameEdit,
    pathName,
    pathSwitchOptions,
    handleSwitchPath,
  } = useAiPathsSettingsPagePathActionsContext();
  const { autoSaveLabel, autoSaveVariant } = useAiPathsSettingsPagePersistenceContext();
  const { nodes, edges } = useAiPathsSettingsPageCanvasInteractionsContext();
  const { lastRunAt, runtimeRunStatus } = useAiPathsSettingsPageRuntimeContext();

  const activePath = activePathId ?? null;
  const switchPath = handleSwitchPath ?? (() => undefined);
  const pathOptions = Array.isArray(pathSwitchOptions) ? pathSwitchOptions : [];
  const nodeCount = Array.isArray(nodes) ? nodes.length : 0;
  const edgeCount = Array.isArray(edges) ? edges.length : 0;
  const pathCount = Array.isArray(paths) ? paths.length : pathOptions.length;
  const runtimeStatusLabel =
    runtimeRunStatus === 'idle'
      ? 'Runtime idle'
      : runtimeRunStatus === 'running'
        ? 'Runtime running'
        : runtimeRunStatus === 'paused'
          ? 'Runtime paused'
        : runtimeRunStatus === 'completed'
            ? 'Runtime completed'
            : runtimeRunStatus === 'failed'
              ? 'Runtime failed'
              : runtimeRunStatus === 'stepping'
                ? 'Runtime stepping'
                : 'Runtime idle';
  const runtimeStatusVariant =
    runtimeRunStatus === 'failed'
      ? 'error'
      : runtimeRunStatus === 'running' || runtimeRunStatus === 'stepping'
        ? 'processing'
        : runtimeRunStatus === 'completed'
          ? 'success'
          : runtimeRunStatus === 'paused'
            ? 'warning'
            : 'neutral';
  const pathSummaryLabel =
    pathCount === 1 ? '1 saved path in this workspace' : `${pathCount} saved paths in this workspace`;

  return (
    <div className='grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]'>
      <div className='min-w-0 rounded-2xl border border-border/60 bg-background/20 p-4'>
        <div className='space-y-3'>
          <div className='space-y-1'>
            <div className='text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400'>
              Active Path
            </div>
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
                className='h-12 w-full rounded-xl border border-border/70 bg-card/70 px-4 text-lg font-semibold text-white outline-none ring-offset-background placeholder:text-gray-500 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:max-w-[560px]'
                placeholder='Path name'
                disabled={!activePath}
              />
            ) : (
              <button
                data-doc-id='canvas_path_name_field'
                type='button'
                className='h-12 w-full rounded-xl border border-border/70 bg-card/70 px-4 text-left text-lg font-semibold text-gray-100 hover:bg-card/80 disabled:cursor-not-allowed disabled:opacity-60 lg:max-w-[560px]'
                onDoubleClick={startPathNameEdit}
                disabled={!activePath}
                title={
                  activePath ? 'Double-click to rename this path' : 'No active path selected'
                }
              >
                <span className='block truncate'>{pathName || 'Untitled path'}</span>
              </button>
            )}
            <p className='text-xs text-muted-foreground'>
              {activePath
                ? 'Double-click the title to rename the active workflow path. Status and runtime context stay visible below.'
                : 'Select a saved path to review its structure, runtime state, and validation status.'}
            </p>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            {autoSaveLabel ? (
              <StatusBadge
                status={autoSaveLabel}
                variant={autoSaveVariant}
                size='sm'
                className='font-medium'
              />
            ) : null}
            {lastRunAt ? (
              <StatusBadge
                status={`Last run: ${  new Date(lastRunAt).toLocaleTimeString()}`}
                variant='active'
                size='sm'
                className='font-medium'
              />
            ) : null}
            <StatusBadge
              status={isPathActive ? 'Runs active' : 'Runs paused'}
              variant={isPathActive ? 'success' : 'warning'}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={isPathLocked ? 'Path locked' : 'Path editable'}
              variant={isPathLocked ? 'warning' : 'neutral'}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={runtimeStatusLabel}
              variant={runtimeStatusVariant}
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={`${nodeCount} node${nodeCount === 1 ? '' : 's'}`}
              variant='neutral'
              size='sm'
              className='font-medium'
            />
            <StatusBadge
              status={`${edgeCount} connection${edgeCount === 1 ? '' : 's'}`}
              variant='neutral'
              size='sm'
              className='font-medium'
            />
          </div>
        </div>
      </div>

      <div className='rounded-2xl border border-border/60 bg-background/20 p-4'>
        <div className='space-y-3'>
          <div className='space-y-1'>
            <div className='text-[11px] font-medium uppercase tracking-[0.2em] text-gray-400'>
              Switch Path
            </div>
            <p className='text-xs text-muted-foreground'>{pathSummaryLabel}</p>
          </div>
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
            className='w-full'
            triggerClassName='h-12 rounded-xl border-border/70 bg-card/70 px-3 text-sm text-white'
            disabled={pathOptions.length === 0}
            title='Select path'
          />
          <p className='text-xs text-muted-foreground'>
            Use the selector to move between saved canvases without leaving the workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
