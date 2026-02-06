'use client';

import type { AgentPersonaSettings } from '@/features/ai/agentcreator/types';
import { Label, UnifiedSelect } from '@/shared/ui';

const DEFAULT_VALUE = '__default__';

const toSelectValue = (value: string | null | undefined): string =>
  value && value.trim().length > 0 ? value : DEFAULT_VALUE;

const fromSelectValue = (value: string): string =>
  value === DEFAULT_VALUE ? '' : value;

type ModelField = {
  key: keyof AgentPersonaSettings;
  label: string;
  description: string;
};

const MODEL_FIELDS: ModelField[] = [
  {
    key: 'executorModel',
    label: 'Executor / Main Model',
    description: 'Primary reasoning model that executes steps.',
  },
  {
    key: 'plannerModel',
    label: 'Planner / Replanner',
    description: 'Creates and updates multi-step plans.',
  },
  {
    key: 'selfCheckModel',
    label: 'Self-Questioning / Critique',
    description: 'Challenges assumptions and validates decisions.',
  },
  {
    key: 'extractionValidationModel',
    label: 'Extraction / Validation',
    description: 'Schema checks, evidence validation, and de-duplication.',
  },
  {
    key: 'toolRouterModel',
    label: 'Tool Router',
    description: 'Chooses tools and fallback strategy.',
  },
  {
    key: 'memoryValidationModel',
    label: 'Memory Validation',
    description: 'Filters and verifies memory updates.',
  },
  {
    key: 'memorySummarizationModel',
    label: 'Memory Summarization',
    description: 'Writes structured memory summaries.',
  },
  {
    key: 'loopGuardModel',
    label: 'Loop Guard',
    description: 'Detects stalls and enforces recovery.',
  },
  {
    key: 'approvalGateModel',
    label: 'Safety / Approval Gate',
    description: 'Checks risky actions before execution.',
  },
  {
    key: 'selectorInferenceModel',
    label: 'DOM / Selector Inference',
    description: 'Infers selectors and UI targets.',
  },
  {
    key: 'outputNormalizationModel',
    label: 'Output Normalization',
    description: 'Cleans and normalizes final outputs.',
  },
];

type AgentPersonaSettingsFormProps = {
  settings: AgentPersonaSettings;
  onChange: (next: AgentPersonaSettings) => void;
  modelOptions: string[];
};

export function AgentPersonaSettingsForm({
  settings,
  onChange,
  modelOptions,
}: AgentPersonaSettingsFormProps): React.JSX.Element {
  const mergedOptions =
    modelOptions && modelOptions.length > 0 ? modelOptions : [];

  const handleUpdate = (key: keyof AgentPersonaSettings, value: string): void => {
    onChange({
      ...settings,
      [key]: fromSelectValue(value),
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {MODEL_FIELDS.map((field: ModelField) => (
          <div key={field.key} className="space-y-2">
            <div>
              <Label className="text-xs text-gray-300">{field.label}</Label>
              <p className="text-[11px] text-gray-500">{field.description}</p>
            </div>
            <UnifiedSelect
              value={toSelectValue(settings[field.key])}
              onValueChange={(value: string): void => handleUpdate(field.key, value)}
              options={[
                { value: DEFAULT_VALUE, label: 'Default (auto)' },
                ...mergedOptions.map((model: string) => ({ value: model, label: model }))
              ]}
              placeholder="Select model"
              triggerClassName="w-full border-border bg-card/70 text-sm text-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
