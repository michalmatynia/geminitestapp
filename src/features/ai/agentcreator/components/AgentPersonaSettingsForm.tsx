'use client';

import { useMemo } from 'react';

import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import type { AiBrainCapabilityKey } from '@/shared/lib/ai-brain/settings';
import { FormField, Input } from '@/shared/ui';

type ModelField = {
  label: string;
  description: string;
  capability: AiBrainCapabilityKey;
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

function BrainManagedModelField({ field }: { field: ModelField }): React.JSX.Element {
  const brainModel = useBrainAssignment({
    capability: field.capability,
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
      />
    </FormField>
  );
}

export function AgentPersonaSettingsForm(): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='rounded-md border border-border/60 bg-card/35 px-3 py-2 text-xs text-gray-400'>
        Agent runtime model routing is managed in AI Brain. Persona-level capability overrides are
        no longer stored locally.
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {MODEL_FIELDS.map((field: ModelField) => (
          <BrainManagedModelField key={field.capability} field={field} />
        ))}
      </div>
    </div>
  );
}
