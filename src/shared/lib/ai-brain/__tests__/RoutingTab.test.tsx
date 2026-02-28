import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RoutingTab } from '@/shared/lib/ai-brain/components/RoutingTab';
import { useBrain } from '@/shared/lib/ai-brain/context/BrainContext';
import {
  BRAIN_CAPABILITY_KEYS,
  BRAIN_FEATURE_KEYS,
  defaultBrainAssignment,
  defaultBrainSettings,
} from '@/shared/lib/ai-brain/settings';

vi.mock('@/shared/lib/ai-brain/context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Checkbox: ({
    checked,
    onCheckedChange,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
  SelectSimple: ({
    value,
    onValueChange,
    options,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    disabled?: boolean;
  }) => (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

describe('RoutingTab', () => {
  it('renders the dedicated Prompt Exploder Brain capability as a capability override row', () => {
    const effectiveAssignments = Object.fromEntries(
      BRAIN_FEATURE_KEYS.map((feature) => [feature, { ...defaultBrainAssignment }])
    );
    const effectiveCapabilityAssignments = Object.fromEntries(
      BRAIN_CAPABILITY_KEYS.map((capability) => [capability, { ...defaultBrainAssignment }])
    );

    effectiveAssignments.prompt_engine = {
      ...defaultBrainAssignment,
      modelId: 'feature-fallback-model',
    };
    effectiveCapabilityAssignments['prompt_engine.prompt_exploder'] = {
      ...defaultBrainAssignment,
      modelId: 'prompt-exploder-model',
      temperature: 0.6,
      maxTokens: 2048,
    };

    vi.mocked(useBrain).mockReturnValue({
      settings: {
        ...defaultBrainSettings,
        assignments: {
          ...defaultBrainSettings.assignments,
          prompt_engine: {
            ...defaultBrainAssignment,
            modelId: 'feature-fallback-model',
          },
        },
        capabilities: {
          ...defaultBrainSettings.capabilities,
          'prompt_engine.prompt_exploder': {
            ...defaultBrainAssignment,
            modelId: 'prompt-exploder-model',
            temperature: 0.6,
            maxTokens: 2048,
          },
        },
      },
      overridesEnabled: Object.fromEntries(
        BRAIN_FEATURE_KEYS.map((feature) => [feature, false])
      ),
      effectiveAssignments,
      effectiveCapabilityAssignments,
      modelQuickPicks: [],
      agentQuickPicks: [],
      handleDefaultChange: vi.fn(),
      handleOverrideChange: vi.fn(),
      handleCapabilityChange: vi.fn(),
      toggleOverride: vi.fn(),
      toggleCapabilityOverride: vi.fn(),
      save: vi.fn(),
      reset: vi.fn(),
      isSaving: false,
      hasChanges: false,
      lastSavedAt: null,
      settingsQuery: null,
      providerCatalog: null,
      updateProviderCatalogField: vi.fn(),
    } as unknown as ReturnType<typeof useBrain>);

    render(<RoutingTab />);

    expect(screen.getByText('Prompt Engine')).toBeInTheDocument();
    expect(screen.getByText('Prompt Exploder AI')).toBeInTheDocument();
    expect(screen.getAllByText(/Allowed provider:\s*Model only/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Family:\s*chat/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Source:\s*Capability override/i)).toBeInTheDocument();
    expect(screen.getAllByDisplayValue('prompt-exploder-model').length).toBeGreaterThan(0);
  });
});
