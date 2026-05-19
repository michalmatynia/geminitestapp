import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  updateBrainRoutingMutateAsync: vi.fn(),
  updateSettingMutateAsync: vi.fn(),
}));

vi.mock('../context/BrainContext', () => ({
  useBrain: vi.fn(),
}));

vi.mock('../hooks/useBrainQueries', () => ({
  useUpdateBrainRoutingSettings: () => ({
    isPending: false,
    mutateAsync: mocks.updateBrainRoutingMutateAsync,
  }),
  brainKeys: { routing: () => ['brain', 'routing'] },
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    isPending: false,
    mutateAsync: mocks.updateSettingMutateAsync,
  }),
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
        <button type='button' onClick={() => onEdit('image_studio.general')}>
          Edit Image Studio Route
        </button>
      </div>
    );
  },
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
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
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ label }: { label?: string }) => <span>{label ?? ''}</span>,
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    disabled,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
    ariaLabel?: string;
    disabled?: boolean;
  }) => (
    <select
      aria-label={ariaLabel}
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

const buildUseBrainMock = (overrides?: {
  capabilityOverride?: boolean;
  imageStudioRouteApiKey?: string;
}) => {
  const effectiveAssignments = Object.fromEntries(
    BRAIN_FEATURE_KEYS.map((feature) => [feature, { ...defaultBrainAssignment }])
  );
  const imageStudioCapabilityAssignment = {
    ...defaultBrainAssignment,
    modelId: 'gpt-image-2',
    ...(overrides?.imageStudioRouteApiKey !== undefined
      ? { apiKey: overrides.imageStudioRouteApiKey }
      : {}),
  };
  const effectiveCapabilityAssignments = Object.fromEntries(
    BRAIN_CAPABILITY_KEYS.map((capability) => [capability, { ...defaultBrainAssignment }])
  );
  effectiveCapabilityAssignments['image_studio.general'] = imageStudioCapabilityAssignment;

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
      ...(overrides?.imageStudioRouteApiKey !== undefined
        ? {
            'image_studio.general': imageStudioCapabilityAssignment,
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
    modelQuickPicks: [
      { value: 'gpt-image-2', label: 'gpt-image-2', description: 'image generation' },
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'preset' },
    ],
    modelDescriptors: {
      'gpt-image-2': {
        id: 'gpt-image-2',
        family: 'image_generation',
        modality: 'image',
        vendor: 'openai',
        supportsStreaming: false,
        supportsJsonMode: false,
      },
      'gpt-4o-mini': {
        id: 'gpt-4o-mini',
        family: 'chat',
        modality: 'text',
        vendor: 'openai',
        supportsStreaming: true,
        supportsJsonMode: true,
      },
    },
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
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.updateBrainRoutingMutateAsync.mockReset();
    mocks.updateBrainRoutingMutateAsync.mockResolvedValue({});
    mocks.updateSettingMutateAsync.mockReset();
    mocks.updateSettingMutateAsync.mockResolvedValue({});
  });

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

  it('applies modal edits through capability change handler', async () => {
    const { handleCapabilityChange } = buildUseBrainMock();

    render(<RoutingTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Route' }));

    const modal = screen.getByTestId('form-modal');
    fireEvent.click(within(modal).getByLabelText('Use capability-specific override'));
    expect(within(modal).queryByLabelText('Model ID')).not.toBeInTheDocument();
    fireEvent.change(within(modal).getByLabelText('Model preset'), {
      target: { value: 'gpt-4o-mini' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(handleCapabilityChange).toHaveBeenCalledWith(
      'prompt_engine.prompt_exploder',
      expect.objectContaining({ modelId: 'gpt-4o-mini' })
    ));
    expect(mocks.updateBrainRoutingMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        capabilities: expect.objectContaining({
          'prompt_engine.prompt_exploder': expect.objectContaining({
            modelId: 'gpt-4o-mini',
          }),
        }),
      })
    );
  });

  it('retains Image Studio route API key overrides when modal edits are applied', async () => {
    const { handleCapabilityChange } = buildUseBrainMock();

    render(<RoutingTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Image Studio Route' }));

    const modal = screen.getByTestId('form-modal');
    fireEvent.click(within(modal).getByLabelText('Use capability-specific override'));
    expect(within(modal).getByLabelText('Model preset')).toHaveValue('gpt-image-2');
    fireEvent.change(within(modal).getByLabelText('API key override'), {
      target: { value: 'route-openai-key' },
    });
    fireEvent.click(within(modal).getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(handleCapabilityChange).toHaveBeenCalledWith(
      'image_studio.general',
      expect.objectContaining({
        apiKey: 'route-openai-key',
        modelId: 'gpt-image-2',
      })
    ));
    const savedPayload = mocks.updateBrainRoutingMutateAsync.mock.calls[0]?.[0] as typeof defaultBrainSettings;
    expect(savedPayload.capabilities['image_studio.general']).toEqual(
      expect.objectContaining({
        apiKey: 'route-openai-key',
        modelId: 'gpt-image-2',
      })
    );
  });

  it('clears stale Image Studio route API key overrides before saving', async () => {
    const { handleCapabilityChange } = buildUseBrainMock({
      imageStudioRouteApiKey: 'stale-route-key',
    });

    render(<RoutingTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Image Studio Route' }));

    const modal = screen.getByTestId('form-modal');
    expect(
      within(modal).getByText(/Route API key override is active/)
    ).toBeInTheDocument();
    expect(within(modal).getByText(/ending in -key/)).toBeInTheDocument();
    fireEvent.click(within(modal).getByRole('button', { name: 'Clear route API key override' }));
    fireEvent.click(within(modal).getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(handleCapabilityChange).toHaveBeenCalled());
    const nextAssignment = handleCapabilityChange.mock.calls[0]?.[1];
    expect(nextAssignment).toEqual(expect.objectContaining({ modelId: 'gpt-image-2' }));
    expect(nextAssignment?.apiKey).toBeUndefined();

    const savedPayload = mocks.updateBrainRoutingMutateAsync.mock.calls[0]?.[0] as typeof defaultBrainSettings;
    const savedRoute = savedPayload.capabilities['image_studio.general'] as {
      apiKey?: string;
      modelId?: string;
    };
    expect(savedRoute.modelId).toBe('gpt-image-2');
    expect(savedRoute.apiKey).toBeUndefined();
  });

  it('clears override when modal is saved with inheritance mode', async () => {
    const { clearCapabilityOverride } = buildUseBrainMock({ capabilityOverride: true });

    render(<RoutingTab />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit Route' }));

    const modal = screen.getByTestId('form-modal');
    const overrideCheckbox = within(modal).getByLabelText('Use capability-specific override');
    expect(overrideCheckbox).toBeChecked();

    fireEvent.click(overrideCheckbox);
    fireEvent.click(within(modal).getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(clearCapabilityOverride).toHaveBeenCalledWith('prompt_engine.prompt_exploder')
    );
  });
});
