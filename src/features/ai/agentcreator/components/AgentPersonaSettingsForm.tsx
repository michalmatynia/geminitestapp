'use client';

import Link from 'next/link';
import { useMemo } from 'react';

import { AgentPersonaMoodEditor } from '@/features/ai/agentcreator/components/AgentPersonaMoodEditor';
import { buildAgentPersonaSettings } from '@/features/ai/agentcreator/utils/personas';
import type { AgentPersona } from '@/shared/contracts/agents';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import type { AiBrainCapabilityKey } from '@/shared/lib/ai-brain/settings';
import { Button, Input } from '@/shared/ui/primitives.public';
import { FormField, FormSection, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

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

type AgentPersonaSettings = ReturnType<typeof buildAgentPersonaSettings>;
type AgentPersonaMemorySettings = NonNullable<AgentPersonaSettings['memory']>;

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
  if (field === undefined) {
    return null;
  }

  const brainModel = useBrainAssignment({
    capability,
  });

  const effectiveModelId = brainModel.effectiveModelId.trim();
  const displayValue =
    effectiveModelId.length > 0 ? effectiveModelId : 'Not configured in AI Brain';
  const helperText = useMemo(() => {
    if (effectiveModelId.length > 0) {
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

const parseDefaultSearchLimit = (value: string): number => {
  const source = value.length > 0 ? value : '20';
  const parsed = Number.parseInt(source, 10);
  const fallback = Number.isFinite(parsed) ? parsed : 20;
  return Math.min(50, Math.max(1, fallback));
};

function MemorySearchLimitField({
  settings,
  onUpdate,
}: {
  settings: Partial<AgentPersonaMemorySettings>;
  onUpdate: (updates: Partial<AgentPersonaMemorySettings>) => void;
}): React.JSX.Element {
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2 mt-4`}>
      <FormField label='Default search limit'>
        <Input
          type='number'
          min={1}
          max={50}
          value={String(settings.defaultSearchLimit ?? 20)}
          onChange={(event) =>
            onUpdate({
              defaultSearchLimit: parseDefaultSearchLimit(event.target.value),
            })
          }
          aria-label='Default search limit'
          title='Default search limit'
        />
      </FormField>
      <div className='rounded-md border border-border/60 bg-card/25 px-3 py-2 text-xs text-gray-400'>
        Memories preserve source, source time, capture time, tags, topic hints, and mood hints.
        Chat history is stored in the same bank and can be searched alongside durable memories.
      </div>
    </div>
  );
}

function MemoryToggleControls({
  settings,
  onUpdate,
}: {
  settings: Partial<AgentPersonaMemorySettings>;
  onUpdate: (updates: Partial<AgentPersonaMemorySettings>) => void;
}): React.JSX.Element {
  return (
    <div className='mt-4 flex flex-wrap gap-4'>
      <ToggleRow
        label='Memory enabled'
        checked={settings.enabled !== false}
        onCheckedChange={(checked) => onUpdate({ enabled: checked })}
        className='border-none bg-transparent hover:bg-transparent p-0'
      />
      <ToggleRow
        label='Include chat history'
        checked={settings.includeChatHistory !== false}
        onCheckedChange={(checked) => onUpdate({ includeChatHistory: checked })}
        className='border-none bg-transparent hover:bg-transparent p-0'
      />
      <ToggleRow
        label='Use mood signals'
        checked={settings.useMoodSignals !== false}
        onCheckedChange={(checked) => onUpdate({ useMoodSignals: checked })}
        className='border-none bg-transparent hover:bg-transparent p-0'
      />
    </div>
  );
}

function AgentPersonaMemoryBankSection({
  item,
  originalItem,
  personaId,
  onChange,
}: AgentPersonaSettingsFormProps & {
  personaId: string | null;
}): React.JSX.Element {
  const resolvedSettings = buildAgentPersonaSettings(item.settings ?? originalItem?.settings);
  const resolvedMemorySettings = resolvedSettings.memory ?? {};
  const updateMemorySettings = (updates: Partial<AgentPersonaMemorySettings>): void => {
    const nextSettings = buildAgentPersonaSettings(item.settings ?? originalItem?.settings);
    onChange({
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
    <FormSection
      title='Memory bank'
      description='Each persona owns a searchable memory bank with provenance, chat history, and mood signals.'
      variant='subtle'
      className='p-4'
      actions={
        personaId !== null ? (
          <Button variant='outline' size='sm' asChild>
            <Link href={`/admin/agentcreator/personas/${personaId}/memory`}>Open memory</Link>
          </Button>
        ) : null
      }
    >
      <MemorySearchLimitField settings={resolvedMemorySettings} onUpdate={updateMemorySettings} />
      <MemoryToggleControls settings={resolvedMemorySettings} onUpdate={updateMemorySettings} />
    </FormSection>
  );
}

function AgentPersonaModelRoutingFields(): React.JSX.Element {
  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
      {MODEL_FIELDS.map((field: ModelField) => (
        <BrainManagedModelField key={field.capability} capability={field.capability} />
      ))}
    </div>
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
  const personaId = item.id ?? originalItem?.id ?? null;

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

      <AgentPersonaMemoryBankSection
        item={item}
        originalItem={originalItem}
        personaId={personaId}
        onChange={applyPersonaChange}
      />

      <AgentPersonaModelRoutingFields />
    </div>
  );
}
