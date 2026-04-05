import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminPromptExploderSettingsPage } from '@/features/prompt-exploder/pages/AdminPromptExploderSettingsPage';
import {
  PROMPT_EXPLODER_SETTINGS_KEY,
  defaultPromptExploderSettings,
} from '@/features/prompt-exploder/settings';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';

const toastMock = vi.fn();

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    ArrowLeft: () => null,
    RefreshCcw: () => null,
    Settings2: () => null,
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(),
  useUpdateSetting: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: vi.fn(),
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: vi.fn(), logClientCatch: vi.fn(),
}));

vi.mock('@/features/prompt-exploder/hooks/usePromptExploderDocsTooltips', () => ({
  usePromptExploderDocsTooltips: () => ({
    docsTooltipsEnabled: false,
    setDocsTooltipsEnabled: vi.fn(),
  }),
}));

vi.mock('@/features/prompt-exploder/components/DocsTooltipEnhancer', () => ({
  DocsTooltipEnhancer: () => null,
}));

vi.mock('@/features/prompt-exploder/components/PromptExploderDocsTooltipSwitch', () => ({
  PromptExploderDocsTooltipSwitch: () => null,
}));

vi.mock('@/shared/ui/templates/SettingsPanelBuilder', () => ({
  SettingsFieldsRenderer: () => null,
}));

vi.mock('@/shared/ui/admin.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/admin.public')>();
  return {
    ...actual,
    AdminAiEyebrow: ({ section }: { section: string }) => <span>{section}</span>,
  };
});

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
    Alert: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
    Button: ({
      children,
      onClick,
      disabled,
      asChild,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      asChild?: boolean;
    }) => {
      if (asChild && React.isValidElement(children)) {
        return children;
      }
      return (
        <button type='button' onClick={onClick} disabled={disabled}>
          {children}
        </button>
      );
    },
  };
});

vi.mock('@/shared/ui/forms-and-actions.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/forms-and-actions.public')>();
  return {
    ...actual,
    FormSection: ({
      title,
      description,
      actions,
      children,
    }: {
      title: string;
      description?: string;
      actions?: React.ReactNode;
      children: React.ReactNode;
    }) => (
      <section>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {actions}
        {children}
      </section>
    ),
    FormField: ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => {
      const child = React.isValidElement<{ 'aria-label'?: string }>(children)
        ? React.cloneElement(children, { 'aria-label': label })
        : children;
      return (
        <label>
          <span>{label}</span>
          {description ? <small>{description}</small> : null}
          {child}
        </label>
      );
    },
    SelectSimple: ({
      value,
      onValueChange,
      options,
      ariaLabel,
      ...props
    }: {
      value: string;
      onValueChange: (value: string) => void;
      options: Array<{ value: string; label: string }>;
      ariaLabel?: string;
    } & React.SelectHTMLAttributes<HTMLSelectElement>) => (
      <select
        {...props}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    FormActions: ({
      children,
      onSave,
      onCancel,
      saveText,
      cancelText,
      isDisabled,
      isSaving,
    }: {
      children?: React.ReactNode;
      onSave?: () => void;
      onCancel?: () => void;
      saveText?: string;
      cancelText?: string;
      isDisabled?: boolean;
      isSaving?: boolean;
    }) => (
      <div>
        <button type='button' onClick={onSave} disabled={isDisabled || isSaving}>
          {saveText ?? 'Save'}
        </button>
        <button type='button' onClick={onCancel}>
          {cancelText ?? 'Cancel'}
        </button>
        {children}
      </div>
    ),
  };
});

vi.mock('@/shared/ui/navigation-and-layout.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/navigation-and-layout.public')>();
  return {
    ...actual,
    SectionHeader: ({
      title,
      description,
      actions,
    }: {
      title: string;
      description?: string;
      actions?: React.ReactNode;
    }) => (
      <section>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {actions}
      </section>
    ),
  };
});

type SettingsMapReturn = ReturnType<typeof useSettingsMap>;
type UpdateSettingReturn = ReturnType<typeof useUpdateSetting>;
type BrainOptionsReturn = ReturnType<typeof useBrainModelOptions>;

const buildSettings = (overrides?: Partial<typeof defaultPromptExploderSettings>) => ({
  ...defaultPromptExploderSettings,
  ...overrides,
  runtime: {
    ...defaultPromptExploderSettings.runtime,
    ...(overrides?.runtime ?? {}),
  },
  learning: {
    ...defaultPromptExploderSettings.learning,
    ...(overrides?.learning ?? {}),
  },
  ai: {
    ...defaultPromptExploderSettings.ai,
    ...(overrides?.ai ?? {}),
  },
});

const mockSettingsQuery = (settings: ReturnType<typeof buildSettings>): void => {
  vi.mocked(useSettingsMap).mockReturnValue({
    data: new Map([[PROMPT_EXPLODER_SETTINGS_KEY, JSON.stringify(settings)]]),
    isSuccess: true,
    isLoading: false,
    refetch: vi.fn(),
  } as unknown as SettingsMapReturn);
};

const mockSettingsQueryRaw = (rawSettings: string): void => {
  vi.mocked(useSettingsMap).mockReturnValue({
    data: new Map([[PROMPT_EXPLODER_SETTINGS_KEY, rawSettings]]),
    isSuccess: true,
    isLoading: false,
    refetch: vi.fn(),
  } as unknown as SettingsMapReturn);
};

const mockUpdateSetting = (mutateAsync = vi.fn().mockResolvedValue(undefined)): ReturnType<typeof vi.fn> => {
  vi.mocked(useUpdateSetting).mockReturnValue({
    isPending: false,
    mutateAsync,
  } as unknown as UpdateSettingReturn);
  return mutateAsync;
};

const mockBrainOptions = (overrides?: Partial<BrainOptionsReturn>): void => {
  vi.mocked(useBrainModelOptions).mockReturnValue({
    models: [],
    isLoading: false,
    assignment: {
      enabled: false,
      provider: 'model',
      modelId: '',
      temperature: 0.2,
      maxTokens: 1200,
      systemPrompt: '', agentId: '', notes: null,
    },
    effectiveModelId: '',
    sourceWarnings: [],
    refresh: vi.fn(),
    ...overrides,
  } as BrainOptionsReturn);
};

describe('AdminPromptExploderSettingsPage', () => {
  beforeEach(() => {
    toastMock.mockReset();
  });

  it('renders Brain-managed AI fields as read-only while keeping operation mode editable', async () => {
    mockSettingsQuery(
      buildSettings({
        ai: {
          operationMode: 'hybrid',
        },
      })
    );
    mockUpdateSetting();
    mockBrainOptions({
      models: ['gpt-4o-mini'],
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: '', agentId: '', notes: null,
      },
      effectiveModelId: 'gpt-4o-mini',
    });

    render(<AdminPromptExploderSettingsPage />);

    const operationMode = await screen.findByLabelText('Operation Mode');
    expect(operationMode).toBeEnabled();

    const brainAssignment = screen.getByLabelText('Brain Assignment');
    expect(brainAssignment).toBeDisabled();
    expect(brainAssignment).toHaveValue('gpt-4o-mini');

    expect(vi.mocked(useBrainModelOptions)).toHaveBeenCalledWith({
      capability: 'prompt_engine.prompt_exploder',
      enabled: true,
    });
  });

  it('blocks save in AI modes when Brain is not configured', async () => {
    mockSettingsQuery(
      buildSettings({
        ai: {
          operationMode: 'hybrid',
        },
      })
    );
    const mutateAsync = mockUpdateSetting();
    mockBrainOptions({
      assignment: {
        enabled: false,
        provider: 'model',
        modelId: '',
        temperature: 0.2,
        maxTokens: 1200,
        systemPrompt: '', agentId: '', notes: null,
      },
      effectiveModelId: '',
    });

    render(<AdminPromptExploderSettingsPage />);

    fireEvent.click(await screen.findByText('Save Prompt Exploder Settings'));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Configure Prompt Exploder AI in AI Brain first.', {
        variant: 'error',
      });
    });
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('allows saving in rules-only mode without persisting deprecated AI snapshot fields', async () => {
    mockSettingsQuery(
      buildSettings({
        ai: {
          operationMode: 'hybrid',
        },
      })
    );
    const mutateAsync = mockUpdateSetting();
    mockBrainOptions({
      assignment: {
        enabled: false,
        provider: 'model',
        modelId: '',
        temperature: 0.2,
        maxTokens: 1200,
        systemPrompt: '', agentId: '', notes: null,
      },
      effectiveModelId: '',
    });

    render(<AdminPromptExploderSettingsPage />);

    fireEvent.change(await screen.findByLabelText('Operation Mode'), {
      target: { value: 'rules_only' },
    });
    fireEvent.click(screen.getByText('Save Prompt Exploder Settings'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    const payload = mutateAsync.mock.calls[0]?.[0] as { key: string; value: string };
    const saved = JSON.parse(payload.value) as typeof defaultPromptExploderSettings;

    expect(saved.ai.operationMode).toBe('rules_only');
    expect(saved.ai).toEqual({
      operationMode: 'rules_only',
    });
  });

  it('saves hybrid mode without persisting Brain-derived AI snapshots', async () => {
    mockSettingsQuery(
      buildSettings({
        ai: {
          operationMode: 'hybrid',
        },
      })
    );
    const mutateAsync = mockUpdateSetting();
    mockBrainOptions({
      models: ['gemini-2.0-flash'],
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'gemini-2.0-flash',
        temperature: 0.8,
        maxTokens: 2222,
        systemPrompt: '', agentId: '', notes: null,
      },
      effectiveModelId: 'gemini-2.0-flash',
    });

    render(<AdminPromptExploderSettingsPage />);

    fireEvent.change(await screen.findByLabelText('Operation Mode'), {
      target: { value: 'ai_assisted' },
    });
    fireEvent.click(await screen.findByText('Save Prompt Exploder Settings'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    const payload = mutateAsync.mock.calls[0]?.[0] as { key: string; value: string };
    const saved = JSON.parse(payload.value) as typeof defaultPromptExploderSettings;

    expect(payload.key).toBe(PROMPT_EXPLODER_SETTINGS_KEY);
    expect(saved.ai).toEqual({
      operationMode: 'ai_assisted',
    });
  });

  it('surfaces non-canonical persisted AI payload keys as an explicit error', async () => {
    mockSettingsQueryRaw(
      JSON.stringify({
        ...defaultPromptExploderSettings,
        ai: {
          operationMode: 'hybrid',
          modelId: 'legacy-model',
          fallbackModelId: 'legacy-fallback',
        },
      })
    );
    mockUpdateSetting();
    mockBrainOptions();

    render(<AdminPromptExploderSettingsPage />);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Prompt Exploder settings payload has invalid shape: ai contains unsupported keys: fallbackModelId, modelId',
        { variant: 'error' }
      );
    });
  });
});
