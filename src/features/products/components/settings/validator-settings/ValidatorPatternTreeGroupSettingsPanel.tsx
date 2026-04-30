'use client';

import React from 'react';

import type { SequenceGroupDraft } from '@/shared/contracts/products/validation';
import { Button } from '@/shared/ui/button';
import { FormField } from '@/shared/ui/form-section';
import { Input } from '@/shared/ui/input';

type ValidatorPatternTreeGroupSettingsPanelProps = {
  groupId: string;
  draft: SequenceGroupDraft;
  setGroupDrafts: React.Dispatch<React.SetStateAction<Record<string, SequenceGroupDraft>>>;
  onSave: () => void;
  onDeleteSequence: () => void;
  isPending: boolean;
};

function GroupLabelField({
  draft,
  groupId,
  isPending,
  setGroupDrafts,
}: Pick<
  ValidatorPatternTreeGroupSettingsPanelProps,
  'draft' | 'groupId' | 'isPending' | 'setGroupDrafts'
>): React.JSX.Element {
  return (
    <FormField label='Group Label' className='min-w-[160px] flex-1'>
      <Input
        className='h-8'
        value={draft.label}
        disabled={isPending}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          setGroupDrafts((previous) => ({
            ...previous,
            [groupId]: { ...draft, label: event.target.value },
          }));
        }}
        placeholder='Sequence / Group'
        aria-label='Sequence / Group'
        title='Sequence / Group'
      />
    </FormField>
  );
}

function GroupDebounceField({
  draft,
  groupId,
  isPending,
  setGroupDrafts,
}: Pick<
  ValidatorPatternTreeGroupSettingsPanelProps,
  'draft' | 'groupId' | 'isPending' | 'setGroupDrafts'
>): React.JSX.Element {
  return (
    <FormField label='Debounce (ms)' className='w-28 shrink-0'>
      <Input
        type='number'
        min={0}
        max={30000}
        className='h-8'
        value={draft.debounceMs}
        disabled={isPending}
        onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
          setGroupDrafts((previous) => ({
            ...previous,
            [groupId]: { ...draft, debounceMs: event.target.value },
          }));
        }}
        aria-label='Debounce (ms)'
        title='Debounce (ms)'
      />
    </FormField>
  );
}

function GroupSettingsActions({
  isPending,
  onDeleteSequence,
  onSave,
}: Pick<
  ValidatorPatternTreeGroupSettingsPanelProps,
  'isPending' | 'onDeleteSequence' | 'onSave'
>): React.JSX.Element {
  return (
    <div className='flex shrink-0 items-end gap-2'>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-8'
        disabled={isPending}
        onClick={onSave}
      >
        Save Group
      </Button>
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-8 border-amber-500/40 text-amber-200 hover:bg-amber-500/10'
        disabled={isPending}
        onClick={onDeleteSequence}
      >
        Delete Sequence
      </Button>
    </div>
  );
}

export function ValidatorPatternTreeGroupSettingsPanel({
  groupId,
  draft,
  setGroupDrafts,
  onSave,
  onDeleteSequence,
  isPending,
}: ValidatorPatternTreeGroupSettingsPanelProps): React.JSX.Element {
  return (
    <div className='mt-2 flex flex-wrap items-end gap-3 rounded-md border border-cyan-500/25 bg-cyan-500/5 px-3 py-2'>
      <GroupLabelField
        groupId={groupId}
        draft={draft}
        setGroupDrafts={setGroupDrafts}
        isPending={isPending}
      />
      <GroupDebounceField
        groupId={groupId}
        draft={draft}
        setGroupDrafts={setGroupDrafts}
        isPending={isPending}
      />
      <GroupSettingsActions
        onSave={onSave}
        onDeleteSequence={onDeleteSequence}
        isPending={isPending}
      />
    </div>
  );
}
