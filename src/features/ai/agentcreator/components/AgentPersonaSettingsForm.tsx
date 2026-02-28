'use client';

import { useMemo } from 'react';

import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import type { AiBrainCapabilityKey } from '@/shared/lib/ai-brain/settings';
import type { AgentPersonaSettings } from '@/shared/contracts/agents';
import { FormField, Input } from '@/shared/ui';

type ModelField = {
  key: keyof AgentPersonaSettings;
  label: string;
  description: string;
  capability: AiBrainCapabilityKey;
};

const MODEL_FIELDS: ModelField[] = [
  {
    key: 'executorModel',
    label: 'Executor / Main Model',
    description: 'Primary reasoning model that executes steps.',
    capability: 'agent_runtime.default',
  },
  {
    key: 'plannerModel',
    label: 'Planner / Replanner',
    description: 'Creates and updates multi-step plans.',
    capability: 'agent_runtime.planner',
  },
  {
    key: 'selfCheckModel',
    label: 'Self-Questioning / Critique',
    description: 'Challenges assumptions and validates decisions.',
    capability: 'agent_runtime.self_check',
  },
  {
    key: 'extractionValidationModel',
    label: 'Extraction / Validation',
    description: 'Schema checks, evidence validation, and de-duplication.',
    capability: 'agent_runtime.extraction_validation',
  },
  {
    key: 'toolRouterModel',
    label: 'Tool Router',
    description: 'Chooses tools and fallback strategy.',
    capability: 'agent_runtime.tool_router',
  },
  {
    key: 'memoryValidationModel',
    label: 'Memory Validation',
    description: 'Filters and verifies memory updates.',
    capability: 'agent_runtime.memory_validation',
  },
  {
    key: 'memorySummarizationModel',
    label: 'Memory Summarization',
    description: 'Writes structured memory summaries.',
    capability: 'agent_runtime.memory_summarization',
  },
  {
    key: 'loopGuardModel',
    label: 'Loop Guard',
    description: 'Detects stalls and enforces recovery.',
    capability: 'agent_runtime.loop_guard',
  },
  {
    key: 'approvalGateModel',
    label: 'Safety / Approval Gate',
    description: 'Checks risky actions before execution.',
    capability: 'agent_runtime.approval_gate',
  },
  {
    key: 'selectorInferenceModel',
    label: 'DOM / Selector Inference',
    description: 'Infers selectors and UI targets.',
    capability: 'agent_runtime.selector_inference',
  },
  {
    key: 'outputNormalizationModel',
    label: 'Output Normalization',
    description: 'Cleans and normalizes final outputs.',
    capability: 'agent_runtime.output_normalization',
  },
];

function BrainManagedModelField({
  field,
  compatibilityValue,
}: {
  field: ModelField;
  compatibilityValue: unknown;
}): React.JSX.Element {
  const brainModel = useBrainModelOptions({
    capability: field.capability,
  });

  const effectiveModelId = brainModel.effectiveModelId.trim();
  const compatibilityModel =
    typeof compatibilityValue === 'string' ? compatibilityValue.trim() : '';
  const displayValue = effectiveModelId || compatibilityModel || 'Not configured in AI Brain';
  const helperText = useMemo(() => {
    if (effectiveModelId && compatibilityModel && compatibilityModel !== effectiveModelId) {
      return `Brain-managed. Stored compatibility value: ${compatibilityModel}`;
    }
    if (effectiveModelId) {
      return 'Brain-managed. This local field is informational only.';
    }
    if (compatibilityModel) {
      return `Brain not configured. Stored compatibility value: ${compatibilityModel}`;
    }
    return 'Set this capability in AI Brain to make it active.';
  }, [compatibilityModel, effectiveModelId]);

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

type AgentPersonaSettingsFormProps = {
  settings: AgentPersonaSettings;
  onChange: (next: AgentPersonaSettings) => void;
};

export function AgentPersonaSettingsForm({
  settings,
}: AgentPersonaSettingsFormProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='rounded-md border border-border/60 bg-card/35 px-3 py-2 text-xs text-gray-400'>
        Agent runtime model routing is now managed in AI Brain. Persona-level model fields are kept
        only as compatibility snapshots and are no longer runtime-authoritative.
      </div>
      <div className='grid gap-4 md:grid-cols-2'>
        {MODEL_FIELDS.map((field: ModelField) => (
          <BrainManagedModelField
            key={field.key}
            field={field}
            compatibilityValue={settings[field.key]}
          />
        ))}
      </div>
    </div>
  );
}
