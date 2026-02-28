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

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
    SectionHeader: ({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) => (
      <section>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
        {actions}
      </section>
    ),
    FormSection: ({ title, description, actions, children }: { title: string; description?: string; actions?: React.ReactNode; children: React.ReactNode }) => (
      <section>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        {actions}
        {children}
      </section>
    ),
    FormField: ({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) => {
      const child = React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, { 'aria-label': label })
        : children;
      return (
        <label>
          <span>{label}</span>
          {description ? <small>{description}</small> : null}
          {child}
        </label>
      );
    },
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
    SelectSimple: ({
      value,
      onValueChange,
      options,
    }: {
      value: string;
      onValueChange: (value: string) => void;
      options: Array<{ value: string; label: string }>;
    }) => (
      <select value={value} onChange={(event) => onValueChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    ),
    SettingsFieldsRenderer: () => null,
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
      systemPrompt: '',
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

  it('renders Brain-managed AI snapshot fields as read-only while keeping operation mode editable', async () => {
    mockSettingsQuery(
      buildSettings({
        ai: {
          operationMode: 'hybrid',
          provider: 'ollama',
          modelId: 'legacy-model',
          fallbackModelId: 'legacy-fallback',
          temperature: 0.25,
          maxTokens: 800,
        },
      })
    );
    mockUpdateSetting();
    mockBrainOptions({
      models: [{ id: 'gpt-4o-mini', label: 'GPT-4o Mini' }] as BrainOptionsReturn['models'],
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: '',
      },
      effectiveModelId: 'gpt-4o-mini',
    });

    render(<AdminPromptExploderSettingsPage />);

    const operationMode = await screen.findByLabelText('Operation Mode');
    expect(operationMode).toBeEnabled();

    const provider = screen.getByLabelText('Provider Snapshot');
    const primaryModel = screen.getByLabelText('Primary AI Model');
    const fallback = screen.getByLabelText('Fallback Model Snapshot');
    const temperature = screen.getByLabelText('Temperature Snapshot');
    const maxTokens = screen.getByLabelText('Max Tokens Snapshot');

    expect(provider).toBeDisabled();
    expect(primaryModel).toBeDisabled();
    expect(fallback).toBeDisabled();
    expect(temperature).toBeDisabled();
    expect(maxTokens).toBeDisabled();

    expect(provider).toHaveValue('openai');
    expect(primaryModel).toHaveValue('gpt-4o-mini');
    expect(fallback).toHaveValue('legacy-fallback');
    expect(temperature).toHaveValue('0.7');
    expect(maxTokens).toHaveValue('2048');

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
        systemPrompt: '',
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

  it('persists Brain-derived compatibility snapshots and preserves the legacy fallback model', async () => {
    mockSettingsQuery(
      buildSettings({
        ai: {
          operationMode: 'hybrid',
          provider: 'ollama',
          modelId: 'legacy-model',
          fallbackModelId: 'legacy-fallback',
          temperature: 0.25,
          maxTokens: 800,
        },
      })
    );
    const mutateAsync = mockUpdateSetting();
    mockBrainOptions({
      models: [{ id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' }] as BrainOptionsReturn['models'],
      assignment: {
        enabled: true,
        provider: 'model',
        modelId: 'gemini-2.0-flash',
        temperature: 0.8,
        maxTokens: 2222,
        systemPrompt: '',
      },
      effectiveModelId: 'gemini-2.0-flash',
    });

    render(<AdminPromptExploderSettingsPage />);

    fireEvent.click(await screen.findByText('Save Prompt Exploder Settings'));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));

    const payload = mutateAsync.mock.calls[0]?.[0] as { key: string; value: string };
    const saved = JSON.parse(payload.value) as typeof defaultPromptExploderSettings;

    expect(payload.key).toBe(PROMPT_EXPLODER_SETTINGS_KEY);
    expect(saved.ai.provider).toBe('gemini');
    expect(saved.ai.modelId).toBe('gemini-2.0-flash');
    expect(saved.ai.fallbackModelId).toBe('legacy-fallback');
    expect(saved.ai.temperature).toBe(0.8);
    expect(saved.ai.maxTokens).toBe(2222);
  });
});
