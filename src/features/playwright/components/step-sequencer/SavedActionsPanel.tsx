'use client';

import { ChevronDown, ChevronRight, Layers, Play, Trash2, User } from 'lucide-react';
import { memo, useState } from 'react';

import type { PlaywrightAction } from '@/shared/contracts/playwright-steps';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { usePlaywrightPersonas } from '@/features/playwright/hooks/usePlaywrightPersonas';

import { usePlaywrightStepSequencer } from '../../context/PlaywrightStepSequencerContext';

// ---------------------------------------------------------------------------
// Single action row (expandable)
// ---------------------------------------------------------------------------

const SavedActionRow = memo(({
  action,
}: {
  action: PlaywrightAction;
}): React.JSX.Element => {
  const { stepSets, handleDeleteAction } = usePlaywrightStepSequencer();
  const { data: personas = [] } = usePlaywrightPersonas();
  const [expanded, setExpanded] = useState(false);

  const resolvedSets = action.stepSetIds
    .map((id) => stepSets.find((s) => s.id === id))
    .filter(Boolean);

  const totalSteps = resolvedSets.reduce(
    (sum, s) => sum + (s?.stepIds.length ?? 0),
    0
  );

  return (
    <div className='rounded border border-border/40 bg-card/20'>
      {/* Header row */}
      <button
        type='button'
        onClick={() => setExpanded((prev) => !prev)}
        className='flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/20'
      >
        {expanded ? (
          <ChevronDown className='size-3.5 shrink-0 text-muted-foreground' />
        ) : (
          <ChevronRight className='size-3.5 shrink-0 text-muted-foreground' />
        )}

        <Play className='size-3.5 shrink-0 text-sky-400' />

        <span className='min-w-0 flex-1 truncate text-sm font-medium'>{action.name}</span>

        <div className='flex items-center gap-1.5'>
          <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
            {action.stepSetIds.length} set{action.stepSetIds.length !== 1 ? 's' : ''}
          </Badge>
          <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
            {totalSteps} step{totalSteps !== 1 ? 's' : ''}
          </Badge>
          {action.personaId ? (
            <Badge variant='neutral' className='h-5 gap-0.5 px-1.5 text-[10px]'>
              <User className='size-2.5' />
              {personas.find((p) => p.id === action.personaId)?.name ?? 'Persona'}
            </Badge>
          ) : null}
          <Button
            variant='ghost'
            size='sm'
            className='size-6 p-0 text-muted-foreground hover:text-destructive'
            onClick={(e) => {
              e.stopPropagation();
              void handleDeleteAction(action.id);
            }}
            aria-label={`Delete action ${action.name}`}
            title='Delete action'
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded ? (
        <div className='space-y-1 border-t border-border/30 px-4 py-2'>
          {action.description ? (
            <p className='text-xs text-muted-foreground'>{action.description}</p>
          ) : null}
          <ol className='space-y-1'>
            {action.stepSetIds.map((setId, idx) => {
              const set = stepSets.find((s) => s.id === setId);
              return (
                <li
                  key={`${setId}_${idx}`}
                  className={cn(
                    'flex items-center gap-2 rounded px-2 py-1 text-xs',
                    set ? 'text-foreground' : 'text-muted-foreground line-through opacity-50'
                  )}
                >
                  <span className='shrink-0 w-5 text-right font-mono text-[10px] text-muted-foreground'>
                    {idx + 1}.
                  </span>
                  <Layers className='size-3 shrink-0 text-sky-400/70' />
                  <span className='min-w-0 flex-1 truncate'>
                    {set?.name ?? `(deleted: ${setId})`}
                  </span>
                  {set ? (
                    <span className='shrink-0 text-[10px] text-muted-foreground'>
                      {set.stepIds.length} steps
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      ) : null}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function SavedActionsPanel(): React.JSX.Element {
  const { actions } = usePlaywrightStepSequencer();

  if (actions.length === 0) return <></>;

  return (
    <section className='space-y-2'>
      <div className='flex items-center gap-2'>
        <h2 className='text-sm font-semibold'>Saved Actions</h2>
        <Badge variant='neutral' className='h-5 px-1.5 text-[10px]'>
          {actions.length}
        </Badge>
      </div>
      <div className='space-y-1.5'>
        {actions.map((action) => (
          <SavedActionRow key={action.id} action={action} />
        ))}
      </div>
    </section>
  );
}
