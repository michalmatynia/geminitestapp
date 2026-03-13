'use client';

import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/ui';
import { Button, SelectSimple, EmptyState } from '@/shared/ui';
import { DetailModal } from '@/shared/ui/templates/modals/DetailModal';

export type PlaceholderTarget = 'query' | 'aiPrompt' | 'prompt' | 'template';

export type PlaceholderTargetOption = LabeledOptionDto<PlaceholderTarget>;

export type PlaceholderEntry = {
  id: string;
  label: string;
  placeholder: string;
  resolvesTo: string;
  description?: string;
  dynamic?: boolean;
};

export type PlaceholderGroup = {
  id: string;
  title: string;
  description?: string;
  entries: PlaceholderEntry[];
};

type PlaceholderMatrixDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: PlaceholderGroup[];
  target: PlaceholderTarget;
  onTargetChange: (target: PlaceholderTarget) => void;
  onInsert: (placeholder: string, target: PlaceholderTarget) => void;
  targetOptions?: PlaceholderTargetOption[];
  onSync?: (() => void) | undefined;
  syncing?: boolean | undefined;
};

export function PlaceholderMatrixDialog(props: PlaceholderMatrixDialogProps): React.JSX.Element {
  const {
    open,
    onOpenChange,
    groups,
    target,
    onTargetChange,
    onInsert,
    targetOptions,
    onSync,
    syncing = false,
  } = props;

  const visibleGroups = groups.filter((group: PlaceholderGroup) => group.entries.length > 0);
  const resolvedTargets: PlaceholderTargetOption[] = targetOptions?.length
    ? targetOptions
    : [
      { value: 'query', label: 'Query template' },
      { value: 'aiPrompt', label: 'AI prompt' },
    ];
  const hasMultipleTargets = resolvedTargets.length > 1;
  const selectedTarget = resolvedTargets.find(
    (option: PlaceholderTargetOption) => option.value === target
  );

  return (
    <DetailModal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title='Placeholder Matrix'
      size='lg'
    >
      <div className='flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3'>
        <div className='flex items-center gap-2 text-xs text-gray-400'>
          <span>Insert into</span>
          {hasMultipleTargets ? (
            <SelectSimple
              size='xs'
              value={target}
              onValueChange={(value: string) => onTargetChange(value as PlaceholderTarget)}
              options={resolvedTargets}
              placeholder='Pick target'
              ariaLabel='Insert target'
              triggerClassName='h-7 w-[160px] border-border bg-card/70 text-xs text-white'
            />
          ) : (
            <div className='rounded-md border border-border bg-card/70 px-2 py-1 text-[10px] text-gray-200'>
              {selectedTarget?.label ?? 'Target'}
            </div>
          )}
        </div>
        {onSync ? (
          <Button
            type='button'
            className='h-7 rounded-md border border-sky-500/40 px-3 text-[11px] text-sky-200 hover:bg-sky-500/10 disabled:opacity-50'
            onClick={onSync}
            disabled={syncing}
          >
            {syncing ? 'Syncing…' : 'Sync placeholders'}
          </Button>
        ) : null}
      </div>
      <div className='mt-4 space-y-4'>
        {visibleGroups.length === 0 ? (
          <EmptyState
            title='No placeholders'
            description='No placeholders available yet. Connect inputs to surface placeholders (or sync schema placeholders where available).'
            variant='compact'
            className='bg-card/40 border-dashed border-border/70 py-4'
          />
        ) : (
          visibleGroups.map((group: PlaceholderGroup) => (
            <div key={group.id} className='space-y-2'>
              <div className='flex flex-wrap items-baseline justify-between gap-2'>
                <div>
                  <div className='text-xs font-semibold text-gray-200'>{group.title}</div>
                  {group.description ? (
                    <div className='text-[11px] text-gray-400'>{group.description}</div>
                  ) : null}
                </div>
                <div className='text-[10px] text-gray-500'>{group.entries.length} placeholders</div>
              </div>
              <div className='grid grid-cols-1 gap-2'>
                {group.entries.map((entry: PlaceholderEntry) => (
                  <div key={entry.id} className='rounded-md border border-border/70 bg-card/60 p-3'>
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='space-y-1'>
                        <div className='text-xs font-medium text-gray-100'>{entry.label}</div>
                        <div className='font-mono text-[10px] text-emerald-200'>
                          {entry.placeholder}
                        </div>
                        {entry.description ? (
                          <div className='text-[10px] text-gray-400'>{entry.description}</div>
                        ) : null}
                      </div>
                      <Button
                        type='button'
                        className='h-7 rounded-md border border-emerald-500/40 px-2 text-[10px] text-emerald-100 hover:bg-emerald-500/10'
                        onClick={(): void => onInsert(entry.placeholder, target)}
                      >
                        Insert
                      </Button>
                    </div>
                    <div className='mt-2 text-[10px] text-gray-400'>
                      Resolves to{entry.dynamic ? ' (dynamic)' : ''}:
                    </div>
                    <pre className='mt-1 max-h-32 overflow-auto whitespace-pre-wrap rounded-md bg-black/40 p-2 text-[10px] text-gray-200'>
                      {entry.resolvesTo || '—'}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </DetailModal>
  );
}
