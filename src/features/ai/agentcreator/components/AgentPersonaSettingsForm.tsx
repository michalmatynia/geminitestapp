'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { AgentPersonaMoodEditor } from '@/features/ai/agentcreator/components/AgentPersonaMoodEditor';
import { buildAgentPersonaSettings } from '@/features/ai/agentcreator/utils/personas';
import type { AgentPersona } from '@/shared/contracts/agents';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import type { AiBrainCapabilityKey } from '@/shared/lib/ai-brain/settings';
import { Button, FormField, FormSection, Input, ToggleRow, UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui';

type ModelField = {
  label: string;
  description: string;
  capability: AiBrainCapabilityKey;
};

type AgentPersonaSettingsFormProps = {
  item: Partial<AgentPersona>;
  originalItem?: Partial<AgentPersona> | null;
  onChange: (updates: Partial<AgentPersona>) => void;
};

const MODEL_FIELDS: ModelField[] = [
  {
    label: 'Executor / Main Model',
    description: 'Primary reasoning model that executes steps.',
    capability: 'agent_runtime.default',
  },
  {
    label: 'Planner / Replanner',
    description: 'Creates and updates multi-step plans.',
    capability: 'agent_runtime.planner',
  },
  {
    label: 'Self-Questioning / Critique',
    description: 'Challenges assumptions and validates decisions.',
    capability: 'agent_runtime.self_check',
  },
  {
    label: 'Extraction / Validation',
    description: 'Schema checks, evidence validation, and de-duplication.',
    capability: 'agent_runtime.extraction_validation',
  },
  {
    label: 'Tool Router',
    description: 'Chooses tools and fallback strategy.',
    capability: 'agent_runtime.tool_router',
  },
  {
    label: 'Memory Validation',
    description: 'Filters and verifies memory updates.',
    capability: 'agent_runtime.memory_validation',
  },
  {
    label: 'Memory Summarization',
    description: 'Writes structured memory summaries.',
    capability: 'agent_runtime.memory_summarization',
  },
  {
    label: 'Loop Guard',
    description: 'Detects stalls and enforces recovery.',
    capability: 'agent_runtime.loop_guard',
  },
  {
    label: 'Safety / Approval Gate',
    description: 'Checks risky actions before execution.',
    capability: 'agent_runtime.approval_gate',
  },
  {
    label: 'DOM / Selector Inference',
    description: 'Infers selectors and UI targets.',
    capability: 'agent_runtime.selector_inference',
  },
  {
    label: 'Output Normalization',
    description: 'Cleans and normalizes final outputs.',
    capability: 'agent_runtime.output_normalization',
  },
];

const MODEL_FIELD_BY_CAPABILITY = new Map<AiBrainCapabilityKey, ModelField>(
  MODEL_FIELDS.map((field) => [field.capability, field])
);

function BrainManagedModelField({
  capability,
}: {
  capability: AiBrainCapabilityKey;
}): React.JSX.Element | null {
  const field = MODEL_FIELD_BY_CAPABILITY.get(capability);
  if (!field) return null;

  const brainModel = useBrainAssignment({
    capability,
  });

  const effectiveModelId = brainModel.effectiveModelId.trim();
  const displayValue = effectiveModelId || 'Not configured in AI Brain';
  const helperText = useMemo(() => {
    if (effectiveModelId) {
      return 'Brain-managed.';
    }
    return 'Set this capability in AI Brain to make it active.';
  }, [effectiveModelId]);

  return (
    <FormField label={field.label} description={`${field.description} ${helperText}`}>
      <Input
        value={displayValue}
        readOnly
        disabled
        placeholder='Not configured in AI Brain'
        className='cursor-not-allowed'
       aria-label='Not configured in AI Brain' title='Not configured in AI Brain'/>
    </FormField>
  );
}

export function AgentPersonaSettingsForm({
  item,
  originalItem,
  onChange,
}: AgentPersonaSettingsFormProps): React.JSX.Element {
  const editableMoods = item.moods;
  const baselineMoods = originalItem?.moods;
  const applyPersonaChange = (updates: Partial<AgentPersona>): void => {
    onChange(updates);
  };
  const resolvedSettings = buildAgentPersonaSettings(item.settings ?? originalItem?.settings);
  const resolvedMemorySettings = resolvedSettings.memory ?? {};
  const personaId = item.id ?? originalItem?.id ?? null;

  const updateMemorySettings = (
    updates: Partial<NonNullable<typeof resolvedSettings.memory>>
  ): void => {
    const nextSettings = buildAgentPersonaSettings(item.settings ?? originalItem?.settings);
    applyPersonaChange({
      settings: {
        ...nextSettings,
        memory: {
          ...nextSettings.memory,
          ...updates,
        },
      },
    });
  };

  return (
    <div className='space-y-4'>
      <div className='rounded-md border border-border/60 bg-card/35 px-3 py-2 text-xs text-gray-400'>
        Agent runtime model routing is managed in AI Brain. Persona-level capability overrides are
        no longer stored locally.
      </div>

      <AgentPersonaMoodEditor
        moods={editableMoods}
        originalMoods={baselineMoods}
        personaId={personaId}
        onChange={applyPersonaChange}
      />

      <FormSection
        title='Memory bank'
        description='Each persona owns a searchable memory bank with provenance, chat history, and mood signals.'
        variant='subtle'
        className='p-4'
        actions={
          personaId ? (
            <Button variant='outline' size='sm' asChild>
              <Link href={`/admin/agentcreator/personas/${personaId}/memory`}>Open memory</Link>
            </Button>
          ) : null
        }
      >
        <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 mt-4`}>
          <FormField label='Default search limit'>
            <Input
              type='number'
              min={1}
              max={50}
              value={String(resolvedMemorySettings.defaultSearchLimit ?? 20)}
              onChange={(event) =>
                updateMemorySettings({
                  defaultSearchLimit: Math.min(
                    50,
                    Math.max(1, Number.parseInt(event.target.value || '20', 10) || 20)
                  ),
                })
              }
             aria-label='Default search limit' title='Default search limit'/>
          </FormField>
          <div className='rounded-md border border-border/60 bg-card/25 px-3 py-2 text-xs text-gray-400'>
            Memories preserve source, source time, capture time, tags, topic hints, and mood hints.
            Chat history is stored in the same bank and can be searched alongside durable memories.
          </div>
        </div>
        <div className='mt-4 flex flex-wrap gap-4'>
          <ToggleRow
            label='Memory enabled'
            checked={resolvedMemorySettings.enabled !== false}
            onCheckedChange={(checked) => updateMemorySettings({ enabled: checked })}
            className='border-none bg-transparent hover:bg-transparent p-0'
          />
          <ToggleRow
            label='Include chat history'
            checked={resolvedMemorySettings.includeChatHistory !== false}
            onCheckedChange={(checked) => updateMemorySettings({ includeChatHistory: checked })}
            className='border-none bg-transparent hover:bg-transparent p-0'
          />
          <ToggleRow
            label='Use mood signals'
            checked={resolvedMemorySettings.useMoodSignals !== false}
            onCheckedChange={(checked) => updateMemorySettings({ useMoodSignals: checked })}
            className='border-none bg-transparent hover:bg-transparent p-0'
          />
        </div>
      </FormSection>

      <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
        {MODEL_FIELDS.map((field: ModelField) => (
          <BrainManagedModelField key={field.capability} capability={field.capability} />
        ))}
      </div>
    </div>
  );
}
