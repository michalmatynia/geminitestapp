import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { useBrainRoutingActionsContext } from '../components/BrainRoutingContext';
import { RoutingTab } from '../components/RoutingTab';
import { useBrain } from '../context/BrainContext';
import {
  BRAIN_CAPABILITY_KEYS,
  BRAIN_FEATURE_KEYS,
  defaultBrainAssignment,
  defaultBrainSettings,
} from '@/shared/lib/ai-brain/settings';

vi.mock('../context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

vi.mock('../components/BrainRoutingTree', () => ({
  BrainRoutingTree: () => {
    const { onToggleEnabled, onEdit } = useBrainRoutingActionsContext();
    return (
      <div>
        <div>Mock Routing Tree</div>
        <button
          type='button'
          onClick={() => onToggleEnabled('prompt_engine.prompt_exploder', false)}
        >
          Quick Toggle Route
        </button>
        <button type='button' onClick={() => onEdit('prompt_engine.prompt_exploder')}>
          Edit Route
        </button>
      </div>
    );
  },
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleSection: ({
    title,
    children,
  }: {
    title: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
  Checkbox: ({
    id,
    checked,
    onCheckedChange,
    disabled,
  }: {
    id?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
  }) => (
    <input
      id={id}
      type='checkbox'
      checked={checked}
      disabled={disabled}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  Label: ({
    children,
    htmlFor,
    className,
  }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ),
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...props} />,
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ label }: { label?: string }) => <span>{label ?? ''}</span>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
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
  StatusToggle: ({
    enabled,
    onToggle,
    disabled,
    enabledLabel = 'ON',
    disabledLabel = 'OFF',
  }: {
    enabled: boolean;
    onToggle: (enabled: boolean) => void;
    disabled?: boolean;
    enabledLabel?: string;
    disabledLabel?: string;
  }) => (
    <button type='button' disabled={disabled} onClick={() => onToggle(!enabled)}>
      {enabled ? enabledLabel : disabledLabel}
    </button>
  ),
  FormModal: (props: {
    open?: boolean;
    title: string;
    children: React.ReactNode;
    onSave: () => void;
    saveText?: string;
  }) => {
    const { open, title, children, onSave, saveText } = props;
    return open ? (
      <div data-testid='form-modal'>
        <h2>{title}</h2>
        {children}
        <button type='button' onClick={onSave}>
          {saveText ?? 'Save'}
        </button>
      </div>
    ) : null;
  },
}));

const buildUseBrainMock = (overrides?: { capabilityOverride?: boolean }) => {
  const effectiveAssignments = Object.fromEntries(
    BRAIN_FEATURE_KEYS.map((feature) => [feature, { ...defaultBrainAssignment }])
  );
  const effectiveCapabilityAssignments = Object.fromEntries(
    BRAIN_CAPABILITY_KEYS.map((capability) => [capability, { ...defaultBrainAssignment }])
  );

  const handleDefaultChange = vi.fn();
  const handleOverrideChange = vi.fn();
  const handleCapabilityChange = vi.fn();
  const setFeatureEnabled = vi.fn();
  const setCapabilityEnabled = vi.fn();
  const clearCapabilityOverride = vi.fn();
  const toggleOverride = vi.fn();

  const settings = {
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
      ...(overrides?.capabilityOverride
        ? {
            'prompt_engine.prompt_exploder': {
              ...defaultBrainAssignment,
              modelId: 'override-model',
            },
          }
        : {}),
    },
  };

  vi.mocked(useBrain).mockReturnValue({
    settings,
    saving: false,
    overridesEnabled: Object.fromEntries(BRAIN_FEATURE_KEYS.map((feature) => [feature, false])),
    effectiveAssignments,
    effectiveCapabilityAssignments,
    modelQuickPicks: [],
    agentQuickPicks: [],
    handleDefaultChange,
    handleOverrideChange,
    handleCapabilityChange,
    setFeatureEnabled,
    setCapabilityEnabled,
    clearCapabilityOverride,
    toggleOverride,
  } as unknown as ReturnType<typeof useBrain>);

  return {
    handleCapabilityChange,
    setFeatureEnabled,
    setCapabilityEnabled,
    clearCapabilityOverride,
  };
};

describe('RoutingTab', () => {
  it('renders grouped routing tree labels', () => {
    buildUseBrainMock();

    render(<RoutingTab />);

    expect(screen.getAllByText('Prompt Engine').length).toBeGreaterThan(0);
    expect(screen.getByText('Mock Routing Tree')).toBeInTheDocument();
    expect(screen.getByText('Advanced fallback settings')).toBeInTheDocument();
  });

  it('routes summary feature toggles through the feature enable helper', () => {
    const { setFeatureEnabled } = buildUseBrainMock();

    render(<RoutingTab />);

    const promptEngineChip = screen.getAllByText('Prompt Engine')[0]?.parentElement;
    expect(promptEngineChip).not.toBeNull();
    fireEvent.click(within(promptEngineChip as HTMLElement).getByRole('button', { name: 'ON' }));

    expect(setFeatureEnabled).toHaveBeenCalledWith('prompt_engine', false);
  });

  it('routes quick toggle through capability enable helper', () => {
    const { setCapabilityEnabled } = buildUseBrainMock();

    render(<RoutingTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Quick Toggle Route' }));

    expect(setCapabilityEnabled).toHaveBeenCalledWith('prompt_engine.prompt_exploder', false);
  });

  it('applies modal edits through capability change handler', () => {
    const { handleCapabilityChange } = buildUseBrainMock();

    render(<RoutingTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Route' }));

    const modal = screen.getByTestId('form-modal');
    fireEvent.click(within(modal).getByLabelText('Use capability-specific override'));
    fireEvent.change(within(modal).getByPlaceholderText('gpt-4o-mini'), {
      target: { value: 'modal-updated-model' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Apply' }));

    expect(handleCapabilityChange).toHaveBeenCalledWith(
      'prompt_engine.prompt_exploder',
      expect.objectContaining({ modelId: 'modal-updated-model' })
    );
  });

  it('clears override when modal is saved with inheritance mode', () => {
    const { clearCapabilityOverride } = buildUseBrainMock({ capabilityOverride: true });

    render(<RoutingTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Route' }));

    const modal = screen.getByTestId('form-modal');
    const overrideCheckbox = within(modal).getByLabelText('Use capability-specific override');
    expect(overrideCheckbox).toBeChecked();

    fireEvent.click(overrideCheckbox);
    fireEvent.click(within(modal).getByRole('button', { name: 'Apply' }));

    expect(clearCapabilityOverride).toHaveBeenCalledWith('prompt_engine.prompt_exploder');
  });
});
