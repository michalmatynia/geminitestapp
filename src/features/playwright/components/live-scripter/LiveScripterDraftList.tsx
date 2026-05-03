'use client';

import { ArrowDown, ArrowUp, Save, Trash2 } from 'lucide-react';

import { Button, Input } from '@/shared/ui/primitives.public';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';

type DraftStepRowProps = {
  index: number;
  total: number;
  name: string;
  type: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

function LiveScripterDraftStepRow({
  index,
  total,
  name,
  type,
  onMoveUp,
  onMoveDown,
  onRemove,
}: DraftStepRowProps): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-3 rounded-md border border-white/10 bg-black/20 p-3'>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium'>{name}</div>
        <div className='truncate text-xs text-muted-foreground'>{type}</div>
      </div>
      <div className='flex items-center gap-1'>
        <Button type='button' size='icon' variant='outline' onClick={onMoveUp} disabled={index === 0}>
          <ArrowUp className='size-4' />
        </Button>
        <Button
          type='button'
          size='icon'
          variant='outline'
          onClick={onMoveDown}
          disabled={index === total - 1}
        >
          <ArrowDown className='size-4' />
        </Button>
        <Button type='button' size='icon' variant='outline' onClick={onRemove}>
          <Trash2 className='size-4' />
        </Button>
      </div>
    </div>
  );
}

function LiveScripterDraftActions({
  hasSteps,
  isSaving,
  onSave,
  onClear,
}: {
  hasSteps: boolean;
  isSaving: boolean;
  onSave: () => void;
  onClear: () => void;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <Button type='button' onClick={onSave} disabled={!hasSteps || isSaving}>
        <Save className='mr-2 size-4' />
        Save Step Set
      </Button>
      <Button type='button' variant='outline' onClick={onClear} disabled={!hasSteps}>
        Clear Draft
      </Button>
    </div>
  );
}

export function LiveScripterDraftList(): React.JSX.Element {
  const {
    draftStepSetName,
    draftStepSetSteps,
    setDraftStepSetName,
    removeDraftStep,
    moveDraftStep,
    clearDraftStepSet,
    commitDraftStepSet,
    isSaving,
  } = usePlaywrightStepSequencer();

  return (
    <div className='space-y-3 rounded-lg border border-white/10 bg-black/10 p-4'>
      <div className='space-y-1'>
        <h2 className='text-sm font-semibold'>Draft Step Set</h2>
        <p className='text-xs text-muted-foreground'>
          Steps appended from the live scripter stay in memory until you save the step set.
        </p>
      </div>

      <Input
        value={draftStepSetName}
        onChange={(event) => setDraftStepSetName(event.target.value)}
        placeholder='Step set name'
      />

      <div className='space-y-2'>
        {draftStepSetSteps.length === 0 ? (
          <div className='rounded-md border border-dashed border-white/10 p-3 text-sm text-muted-foreground'>
            No draft steps yet.
          </div>
        ) : (
          draftStepSetSteps.map((step, index) => (
            <LiveScripterDraftStepRow
              key={step.id}
              index={index}
              total={draftStepSetSteps.length}
              name={step.name}
              type={step.type}
              onMoveUp={() => moveDraftStep(index, Math.max(0, index - 1))}
              onMoveDown={() =>
                moveDraftStep(index, Math.min(draftStepSetSteps.length - 1, index + 1))
              }
              onRemove={() => removeDraftStep(index)}
            />
          ))
        )}
      </div>

      <LiveScripterDraftActions
        hasSteps={draftStepSetSteps.length > 0}
        isSaving={isSaving}
        onSave={() => {
          commitDraftStepSet().catch(() => undefined);
        }}
        onClear={clearDraftStepSet}
      />
    </div>
  );
}
