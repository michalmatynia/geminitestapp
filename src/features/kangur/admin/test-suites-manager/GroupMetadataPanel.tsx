import React from 'react';
import { Button, Input } from '@/shared/ui';
import { useTestSuitesManager } from './test-suites-manager.context';
import { useTestSuitesManagerLogic } from './test-suites-manager.logic';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { normalizeKangurTestGroupTitle, resolveKangurTestSuiteGroupTitle } from '../../test-suites';

export function GroupMetadataPanel() {
  const settingsStore = useSettingsStore();
  const state = useTestSuitesManager();
  const logic = useTestSuitesManagerLogic(settingsStore);

  if (!state.editingGroupOriginalTitle) return null;

  const activeGroupSuiteCount = logic.suites.filter(
    (suite: any) =>
      normalizeKangurTestGroupTitle(resolveKangurTestSuiteGroupTitle(suite, logic.groupById)).toLowerCase() ===
        normalizeKangurTestGroupTitle(state.editingGroupOriginalTitle!).toLowerCase()
  ).length;

  const isGroupSaveDisabled = !state.groupTitle.trim() || logic.isUpdating;

  return (
    <div className='rounded-[28px] border border-border/60 bg-card/20 p-5 sm:p-6'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-2'>
          <div className='text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
            Group metadata
          </div>
          <div className='text-lg font-semibold text-white'>Test group metadata</div>
          <div className='text-xs text-muted-foreground'>
            Edit the group name and description without leaving the suite library.
          </div>
        </div>
        <div className='rounded-full border border-border/50 bg-background/30 px-3 py-1 text-[11px] text-muted-foreground'>
          {activeGroupSuiteCount} suite{activeGroupSuiteCount === 1 ? '' : 's'} in this group
        </div>
      </div>

      <div className='mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'>
        <Input
          value={state.groupTitle}
          onChange={(event): void => state.setGroupTitle(event.target.value)}
          placeholder='e.g. Olympiad 2024'
          className='h-10'
          aria-label='e.g. Olympiad 2024'
          title='e.g. Olympiad 2024'
        />
        <textarea
          value={state.groupDescription}
          onChange={(event): void => state.setGroupDescription(event.target.value)}
          placeholder='Description for editors using this group'
          className='min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm'
        />
      </div>

      <div className='mt-4 flex flex-wrap items-center gap-2'>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-8 border px-3 text-xs font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
          onClick={(): void => {
            // void logic.handleSaveGroup();
          }}
          disabled={isGroupSaveDisabled}
        >
          Save group
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-8 border px-3 text-xs font-semibold tracking-wide text-rose-200 hover:bg-rose-900/30'
          onClick={(): void => state.setGroupToDeleteTitle(state.editingGroupOriginalTitle)}
          disabled={logic.isUpdating || activeGroupSuiteCount > 0}
        >
          Delete group
        </Button>
        <Button
          type='button'
          size='sm'
          variant='outline'
          className='h-8 border px-3 text-xs font-semibold tracking-wide text-slate-200 hover:bg-slate-800/40'
          onClick={() => {
            state.setEditingGroupOriginalTitle(null);
            state.setGroupTitle('');
            state.setGroupDescription('');
          }}
          disabled={logic.isUpdating}
        >
          Close
        </Button>
      </div>

      {activeGroupSuiteCount > 0 ? (
        <div className='mt-3 text-xs text-muted-foreground'>
          Move suites out of this group before deleting it.
        </div>
      ) : null}
    </div>
  );
}
