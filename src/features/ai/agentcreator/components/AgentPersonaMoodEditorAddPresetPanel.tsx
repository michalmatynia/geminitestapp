'use client';

import { Plus } from 'lucide-react';
import React from 'react';

import { buildAgentPersonaMood } from '@/features/ai/agentcreator/utils/personas';
import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';
import { Button } from '@/shared/ui/primitives.public';
import { FormField } from '@/shared/ui/forms-and-actions.public';

type AgentPersonaMoodEditorAddPresetPanelProps = {
  missingMoodPresets: ReadonlyArray<{ id: string; label: string }>;
  nextMoodId: string;
  onNextMoodIdChange: (value: string) => void;
  effectiveMoods: AgentPersonaMood[];
  onEmitMoods: (next: AgentPersonaMood[]) => void;
};

export function AgentPersonaMoodEditorAddPresetPanel({
  missingMoodPresets,
  nextMoodId,
  onNextMoodIdChange,
  effectiveMoods,
  onEmitMoods,
}: AgentPersonaMoodEditorAddPresetPanelProps): React.JSX.Element | null {
  if (missingMoodPresets.length === 0) {
    return null;
  }

  return (
    <div className='rounded-xl border border-dashed border-border/70 bg-card/20 p-4'>
      <div className='flex flex-wrap items-end gap-3'>
        <FormField
          label='Add Mood'
          description='Optional tutor moods that can be used when the tutor is loading or replying.'
          className='min-w-[220px] flex-1'
        >
          <select
            value={nextMoodId}
            onChange={(event) => onNextMoodIdChange(event.target.value)}
            aria-label='Add mood'
            title='Add mood'
            className='h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50'
          >
            {missingMoodPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label}
              </option>
            ))}
          </select>
        </FormField>

        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={nextMoodId.length === 0}
          onClick={() => {
            if (nextMoodId.length === 0) {
              return;
            }

            onEmitMoods([...effectiveMoods, buildAgentPersonaMood(nextMoodId as AgentPersonaMoodId)]);
          }}
        >
          <Plus className='mr-1.5 size-3.5' />
          Add mood
        </Button>
      </div>
    </div>
  );
}
