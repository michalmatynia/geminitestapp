/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/integrations/utils/playwright-connection-settings';
import {
  PRODUCT_SCANNER_SETTINGS_KEY,
  serializeProductScannerSettings,
} from '@/features/products/scanner-settings';

const mocks = vi.hoisted(() => ({
  settingsMapMock: {
    data: new Map<string, string>(),
    isPending: false,
  },
  updateSettingMock: {
    mutateAsync: vi.fn(),
    isPending: false,
  },
  personasQueryMock: {
    data: [],
    isPending: false,
  },
  brainModelOptionsMock: {
    models: ['gpt-4.1-mini', 'gpt-4.1'],
    descriptors: {},
    isLoading: false,
    assignment: {
      enabled: true,
      provider: 'model',
      modelId: 'gpt-4.1-mini',
      agentId: '',
      temperature: 0.2,
      maxTokens: 1200,
      systemPrompt: '',
      notes: null,
    },
    effectiveModelId: 'gpt-4.1-mini',
    sourceWarnings: [],
    refresh: vi.fn(),
  },
  toastMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: () => mocks.settingsMapMock,
  useUpdateSetting: () => mocks.updateSettingMock,
}));

vi.mock('@/features/playwright/public', () => ({
  usePlaywrightPersonas: () => mocks.personasQueryMock,
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: () => mocks.brainModelOptionsMock,
}));

vi.mock('@/features/playwright/ui.public', () => ({
  PlaywrightSettingsForm: ({
    settings,
  }: {
    settings: { headless: boolean };
  }) => <div>Headless: {settings.headless ? 'true' : 'false'}</div>,
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminSettingsPageLayout: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    asChild?: boolean;
  }) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children, props);
    }
    return <button {...props}>{children}</button>;
  },
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormSection: ({
    title,
    children,
    actions,
  }: {
    title?: string;
    children: React.ReactNode;
    actions?: React.ReactNode;
  }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {actions}
      {children}
    </section>
  ),
  FormField: ({
    label,
    children,
  }: {
    label?: string;
    children: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
    title,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
    title?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      title={title}
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
    onSave,
    saveText,
    isDisabled,
    isSaving,
  }: {
    onSave?: () => void;
    saveText?: string;
    isDisabled?: boolean;
    isSaving?: boolean;
  }) => (
    <button type='button' disabled={isDisabled || isSaving} onClick={onSave}>
      {saveText}
    </button>
  ),
  Hint: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  useToast: () => ({
    toast: mocks.toastMock,
  }),
}));

import { AdminProductScannerSettingsPage } from './AdminProductScannerSettingsPage';

describe('AdminProductScannerSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.settingsMapMock.data = new Map<string, string>();
    mocks.settingsMapMock.isPending = false;
    mocks.updateSettingMock.mutateAsync.mockResolvedValue({});
    mocks.updateSettingMock.isPending = false;
    mocks.personasQueryMock.data = [
      {
        id: 'persona-1',
        name: 'Scanner Persona',
        description: null,
        settings: defaultIntegrationConnectionPlaywrightSettings,
        createdAt: '2026-04-11T10:00:00.000Z',
        updatedAt: '2026-04-11T10:00:00.000Z',
      },
    ];
    mocks.personasQueryMock.isPending = false;
    mocks.brainModelOptionsMock.isLoading = false;
    mocks.brainModelOptionsMock.effectiveModelId = 'gpt-4.1-mini';
    mocks.brainModelOptionsMock.sourceWarnings = [];
  });

  it('loads persisted global scanner settings', () => {
    mocks.settingsMapMock.data = new Map<string, string>([
      [
        PRODUCT_SCANNER_SETTINGS_KEY,
        serializeProductScannerSettings({
          playwrightPersonaId: 'persona-1',
          playwrightBrowser: 'chrome',
          captchaBehavior: 'fail',
          manualVerificationTimeoutMs: 180000,
          playwrightSettingsOverrides: {
            headless: false,
          },
          amazonCandidateEvaluator: {
            mode: 'brain_default',
            modelId: null,
            threshold: 0.82,
            onlyForAmbiguousCandidates: false,
            systemPrompt: null,
          },
        }),
      ],
    ]);

    render(<AdminProductScannerSettingsPage />);

    expect(screen.getByRole('heading', { name: 'Scanner Settings' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Select scanner persona' })).toHaveValue(
      'persona-1'
    );
    expect(screen.getByRole('combobox', { name: 'Select scanner browser' })).toHaveValue(
      'chrome'
    );
    expect(screen.getByRole('combobox', { name: 'Select scanner captcha handling' })).toHaveValue(
      'fail'
    );
    expect(screen.getByRole('spinbutton', { name: 'Manual verification timeout (ms)' })).toHaveValue(
      180000
    );
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon candidate evaluator mode' })
    ).toHaveValue('brain_default');
    expect(
      screen.getByRole('spinbutton', {
        name: 'Amazon candidate evaluator confidence threshold',
      })
    ).toHaveValue(0.82);
    expect(
      screen.getByRole('checkbox', { name: 'Only evaluate ambiguous Amazon candidates' })
    ).not.toBeChecked();
    expect(screen.getByText('Headless: false')).toBeInTheDocument();
  });

  it('loads legacy persisted full settings', () => {
    mocks.settingsMapMock.data = new Map<string, string>([
      [
        PRODUCT_SCANNER_SETTINGS_KEY,
        JSON.stringify({
          playwrightPersonaId: 'persona-1',
          playwrightBrowser: 'chrome',
          manualVerificationTimeoutMs: 90000,
          playwrightSettings: {
            ...defaultIntegrationConnectionPlaywrightSettings,
            headless: false,
          },
        }),
      ],
    ]);

    render(<AdminProductScannerSettingsPage />);

    expect(screen.getByRole('combobox', { name: 'Select scanner persona' })).toHaveValue(
      'persona-1'
    );
    expect(screen.getByRole('combobox', { name: 'Select scanner browser' })).toHaveValue(
      'chrome'
    );
    expect(
      screen.getByRole('combobox', { name: 'Select scanner captcha handling' })
    ).toHaveValue('auto_show_browser');
    expect(screen.getByRole('spinbutton', { name: 'Manual verification timeout (ms)' })).toHaveValue(
      90000
    );
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon candidate evaluator mode' })
    ).toHaveValue('disabled');
    expect(screen.getByText('Headless: false')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  it('saves global scanner settings through the settings store', async () => {
    render(<AdminProductScannerSettingsPage />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Select scanner persona' }), {
      target: { value: 'persona-1' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Select scanner browser' }), {
      target: { value: 'brave' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Select scanner captcha handling' }), {
      target: { value: 'fail' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Manual verification timeout (ms)' }), {
      target: { value: '180000' },
    });
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Select Amazon candidate evaluator mode' }),
      {
        target: { value: 'model_override' },
      }
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Select Amazon candidate evaluator model' }),
      {
        target: { value: 'gpt-4.1' },
      }
    );
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Amazon candidate evaluator confidence threshold',
      }),
      {
        target: { value: '0.9' },
      }
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Only evaluate ambiguous Amazon candidates' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));

    await waitFor(() => {
      expect(mocks.updateSettingMock.mutateAsync).toHaveBeenCalledWith({
        key: PRODUCT_SCANNER_SETTINGS_KEY,
        value: serializeProductScannerSettings({
          playwrightPersonaId: 'persona-1',
          playwrightBrowser: 'brave',
          captchaBehavior: 'fail',
          manualVerificationTimeoutMs: 180000,
          playwrightSettingsOverrides: {},
          amazonCandidateEvaluator: {
            mode: 'model_override',
            modelId: 'gpt-4.1',
            threshold: 0.9,
            onlyForAmbiguousCandidates: false,
            systemPrompt: null,
          },
        }),
      });
    });

    expect(mocks.toastMock).toHaveBeenCalledWith('Scanner settings saved.', {
      variant: 'success',
    });
  });
});
