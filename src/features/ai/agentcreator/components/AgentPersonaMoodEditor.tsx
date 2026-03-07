'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Upload } from 'lucide-react';

import type { AgentPersonaMood, AgentPersonaMoodId } from '@/shared/contracts/agents';
import { DEFAULT_AGENT_PERSONA_MOOD_ID } from '@/shared/contracts/agents';
import {
  AGENT_PERSONA_MOOD_PRESETS,
  buildAgentPersonaMood,
  buildDefaultAgentPersonaMoods,
} from '@/features/ai/agentcreator/utils/personas';
import { Button, FormField, Textarea } from '@/shared/ui';

import { AgentPersonaMoodAvatar } from './AgentPersonaMoodAvatar';

type AgentPersonaMoodEditorProps = {
  moods?: AgentPersonaMood[] | null;
  onChange: (updates: {
    moods: AgentPersonaMood[];
    defaultMoodId: AgentPersonaMoodId;
  }) => void;
};

const MOOD_ORDER = new Map<AgentPersonaMoodId, number>(
  AGENT_PERSONA_MOOD_PRESETS.map((preset, index) => [preset.id, index])
);

const sortMoods = (moods: AgentPersonaMood[]): AgentPersonaMood[] =>
  [...moods].sort(
    (left, right) =>
      (MOOD_ORDER.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (MOOD_ORDER.get(right.id) ?? Number.MAX_SAFE_INTEGER)
  );

export function AgentPersonaMoodEditor({
  moods,
  onChange,
}: AgentPersonaMoodEditorProps): React.JSX.Element {
  const effectiveMoods = useMemo(
    () =>
      Array.isArray(moods) && moods.length > 0 ? sortMoods(moods) : buildDefaultAgentPersonaMoods(),
    [moods]
  );
  const missingMoodPresets = useMemo(
    () =>
      AGENT_PERSONA_MOOD_PRESETS.filter(
        (preset) => !effectiveMoods.some((mood) => mood.id === preset.id)
      ),
    [effectiveMoods]
  );
  const [nextMoodId, setNextMoodId] = useState<string>(missingMoodPresets[0]?.id ?? '');

  useEffect(() => {
    setNextMoodId((current) => {
      if (current && missingMoodPresets.some((preset) => preset.id === current)) {
        return current;
      }

      return missingMoodPresets[0]?.id ?? '';
    });
  }, [missingMoodPresets]);

  const emitMoods = (nextMoods: AgentPersonaMood[]): void => {
    onChange({
      moods: sortMoods(nextMoods),
      defaultMoodId: DEFAULT_AGENT_PERSONA_MOOD_ID,
    });
  };

  const handleMoodSvgUpload =
    (moodId: AgentPersonaMoodId) =>
    async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }

      const text = await file.text();
      emitMoods(
        effectiveMoods.map((mood) =>
          mood.id === moodId
            ? {
              ...mood,
              svgContent: text,
            }
            : mood
        )
      );
    };

  return (
    <div className='space-y-4'>
      <FormField
        label='Tutor Mood Avatars'
        description='Neutral is the fixed default mood. Add optional tutor states and assign each one an SVG avatar.'
      >
        <div className='space-y-4'>
          <div className='rounded-md border border-border/60 bg-card/35 px-3 py-2 text-xs text-gray-400'>
            Missing SVG markup falls back to the current Brain icon. Mood avatars are sanitized on
            save and at render time.
          </div>

          {effectiveMoods.map((mood) => (
            <div
              key={mood.id}
              className='space-y-3 rounded-xl border border-border/60 bg-card/35 p-4'
            >
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='flex items-center gap-3'>
                  <AgentPersonaMoodAvatar
                    svgContent={mood.svgContent}
                    label={`${mood.label} avatar preview`}
                    className='h-16 w-16 border border-foreground/10 bg-white/5'
                    fallbackIconClassName='text-gray-300'
                    data-testid={`agent-persona-mood-preview-${mood.id}`}
                  />
                  <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <span className='text-sm font-semibold text-white'>{mood.label}</span>
                      <span className='rounded-full border border-border/60 px-2 py-0.5 text-[10px] uppercase tracking-wide text-gray-400'>
                        {mood.id}
                      </span>
                      {mood.id === DEFAULT_AGENT_PERSONA_MOOD_ID ? (
                        <span className='rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300'>
                          Default
                        </span>
                      ) : null}
                    </div>
                    <p className='mt-1 text-xs leading-relaxed text-gray-400'>{mood.description}</p>
                  </div>
                </div>

                <div className='flex items-center gap-2'>
                  <label>
                    <input
                      type='file'
                      accept='.svg,image/svg+xml'
                      className='sr-only'
                      onChange={handleMoodSvgUpload(mood.id)}
                    />
                    <Button type='button' variant='outline' size='sm' asChild>
                      <span>
                        <Upload className='mr-1.5 size-3.5' />
                        Upload SVG
                      </span>
                    </Button>
                  </label>
                  {mood.id !== DEFAULT_AGENT_PERSONA_MOOD_ID ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() =>
                        emitMoods(effectiveMoods.filter((candidate) => candidate.id !== mood.id))
                      }
                    >
                      <Trash2 className='mr-1.5 size-3.5' />
                      Remove
                    </Button>
                  ) : null}
                </div>
              </div>

              <FormField
                label='SVG Markup'
                description='Paste the full SVG markup for this tutor mood.'
              >
                <Textarea
                  value={mood.svgContent}
                  onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                    emitMoods(
                      effectiveMoods.map((candidate) =>
                        candidate.id === mood.id
                          ? {
                            ...candidate,
                            svgContent: event.target.value,
                          }
                          : candidate
                      )
                    )
                  }
                  placeholder={`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <!-- ${mood.label} avatar -->\n</svg>`}
                  className='min-h-[180px] font-mono text-xs'
                  spellCheck={false}
                />
              </FormField>
            </div>
          ))}

          {missingMoodPresets.length > 0 ? (
            <div className='rounded-xl border border-dashed border-border/70 bg-card/20 p-4'>
              <div className='flex flex-wrap items-end gap-3'>
                <FormField
                  label='Add Mood'
                  description='Optional tutor moods that can be used when the tutor is loading or replying.'
                  className='min-w-[220px] flex-1'
                >
                  <select
                    value={nextMoodId}
                    onChange={(event) => setNextMoodId(event.target.value)}
                    className='h-10 w-full rounded-md border border-foreground/10 bg-transparent px-3 py-2 text-sm text-foreground/90 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:border-foreground/30 disabled:cursor-not-allowed disabled:opacity-50'
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
                  disabled={!nextMoodId}
                  onClick={() => {
                    if (!nextMoodId) {
                      return;
                    }

                    emitMoods([
                      ...effectiveMoods,
                      buildAgentPersonaMood(nextMoodId as AgentPersonaMoodId),
                    ]);
                  }}
                >
                  <Plus className='mr-1.5 size-3.5' />
                  Add mood
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </FormField>
    </div>
  );
}
