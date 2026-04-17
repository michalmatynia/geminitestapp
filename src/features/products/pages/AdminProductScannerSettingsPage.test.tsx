/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/playwright/utils/playwright-settings-baseline';
import {
  PRODUCT_SCANNER_SETTINGS_KEY,
  createDefaultProductScannerAmazonCandidateEvaluator,
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
  brain1688ModelOptionsMock: {
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
  useBrainModelOptions: ({
    capability,
  }: {
    capability?: string;
  }) =>
    capability === 'product.scan.1688_supplier_match'
      ? mocks.brain1688ModelOptionsMock
      : mocks.brainModelOptionsMock,
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
  const defaultAmazonEvaluator = createDefaultProductScannerAmazonCandidateEvaluator();

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
    mocks.brain1688ModelOptionsMock.isLoading = false;
    mocks.brain1688ModelOptionsMock.effectiveModelId = 'gpt-4.1-mini';
    mocks.brain1688ModelOptionsMock.sourceWarnings = [];
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
          amazonImageSearchProvider: 'google_images_url',
          amazonImageSearchPageUrl: 'https://lens.google.com/?hl=en',
          playwrightSettingsOverrides: {
            headless: false,
          },
          amazonCandidateEvaluator: {
            mode: 'brain_default',
            modelId: null,
            threshold: 0.82,
            onlyForAmbiguousCandidates: false,
            candidateSimilarityMode: 'deterministic_then_ai',
            allowedContentLanguage: 'en',
            rejectNonEnglishContent: true,
            languageDetectionMode: 'deterministic_then_ai',
            systemPrompt: null,
          },
          scanner1688: {
            candidateResultLimit: 6,
            minimumCandidateScore: 5,
            maxExtractedImages: 10,
            allowUrlImageSearchFallback: false,
          },
          scanner1688CandidateEvaluator: {
            mode: 'brain_default',
            modelId: null,
            threshold: 0.78,
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
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon image search provider' })
    ).toHaveValue('google_images_url');
    expect(
      screen.getByRole('textbox', { name: 'Amazon image search page URL' })
    ).toHaveValue('https://lens.google.com/?hl=en');
    expect(screen.getByRole('spinbutton', { name: 'Manual verification timeout (ms)' })).toHaveValue(
      180000
    );
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon probe evaluator mode' })
    ).toHaveValue('brain_default');
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon candidate triage mode' })
    ).toHaveValue('disabled');
    expect(
      screen.getByRole('spinbutton', {
        name: 'Amazon probe evaluator confidence threshold',
      })
    ).toHaveValue(0.82);
    expect(
      screen.getByRole('checkbox', { name: 'Only evaluate ambiguous Amazon probe candidates' })
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Reject non-English Amazon content in probe stage' })
    ).toBeChecked();
    expect(
      screen.getByRole('combobox', {
        name: 'Select Amazon probe evaluator similarity decision mode',
      })
    ).toHaveValue('deterministic_then_ai');
    expect(
      screen.getByRole('combobox', {
        name: 'Select Amazon probe evaluator language detection mode',
      })
    ).toHaveValue('deterministic_then_ai');
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon extraction evaluator mode' })
    ).toHaveValue('brain_default');
    expect(
      screen.getByRole('spinbutton', {
        name: 'Amazon extraction evaluator confidence threshold',
      })
    ).toHaveValue(0.82);
    expect(
      screen.getByRole('checkbox', {
        name: 'Only evaluate ambiguous Amazon extraction candidates',
      })
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Reject non-English Amazon content in extraction stage' })
    ).toBeChecked();
    expect(
      screen.getByRole('combobox', {
        name: 'Select Amazon extraction evaluator similarity decision mode',
      })
    ).toHaveValue('deterministic_then_ai');
    expect(
      screen.getByRole('combobox', {
        name: 'Select Amazon extraction evaluator language detection mode',
      })
    ).toHaveValue('deterministic_then_ai');
    expect(screen.getByRole('spinbutton', { name: '1688 candidate result limit' })).toHaveValue(6);
    expect(screen.getByRole('spinbutton', { name: '1688 minimum candidate score' })).toHaveValue(5);
    expect(screen.getByRole('spinbutton', { name: '1688 max extracted images' })).toHaveValue(10);
    expect(screen.getByRole('checkbox', { name: 'Allow 1688 image URL fallback' })).not.toBeChecked();
    expect(
      screen.getByRole('combobox', { name: 'Select 1688 supplier evaluator mode' })
    ).toHaveValue('brain_default');
    expect(
      screen.getByRole('spinbutton', {
        name: '1688 supplier evaluator confidence threshold',
      })
    ).toHaveValue(0.78);
    expect(
      screen.getByRole('checkbox', {
        name: 'Only evaluate ambiguous 1688 supplier candidates',
      })
    ).not.toBeChecked();
    expect(screen.getByText('Headless: false')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'AI review runs on every Amazon candidate after deterministic identifier hints are gathered.'
      )
    ).toHaveLength(2);
    expect(screen.getAllByText('Evaluator Summary')).toHaveLength(3);
    expect(screen.getAllByText('Model source: AI Brain default')).toHaveLength(3);
    expect(screen.getAllByText('Resolved model: gpt-4.1-mini')).toHaveLength(3);
    expect(screen.getAllByText('Trust threshold: 82% confidence')).toHaveLength(2);
    expect(screen.getAllByText('Review scope: Every Amazon candidate')).toHaveLength(2);
    expect(screen.getAllByText('Similarity decision: Deterministic hints, then AI')).toHaveLength(2);
    expect(
      screen.getAllByText('Language gate: English only, probe hints first')
    ).toHaveLength(2);
    expect(
      screen.getAllByText(
        'Deterministic identifier matches can bypass AI review when the candidate is configured as non-ambiguous.'
      )
    ).toHaveLength(2);
    expect(
      screen.getAllByText('Continuation: Try next Amazon candidate after rejection')
    ).toHaveLength(2);
    expect(
      screen.getAllByText(
        'Only English Amazon page content is trusted for scraping into English product fields.'
      )
    ).toHaveLength(2);
    expect(
      screen.getAllByText(
        'The scanner uses probe language hints first and asks AI when page language remains unclear.'
      )
    ).toHaveLength(2);
    expect(
      screen.getAllByText(
        'Matched products on non-English Amazon pages are rejected and the scanner moves to the next candidate when one is available.'
      )
    ).toHaveLength(2);
    expect(screen.getAllByText('Candidates must meet 82% confidence to be trusted.')).toHaveLength(
      2
    );
    expect(
      screen.getAllByText(
        'Rejected candidates continue to the next Amazon candidate when one is available; otherwise the scan finishes as No Match.'
      )
    ).toHaveLength(2);
    expect(
      screen.getAllByText(
        'Evaluator runtime errors fail the scan conservatively instead of trusting the page.'
      )
    ).toHaveLength(2);
    expect(screen.getByText('1688 Runtime Summary')).toBeInTheDocument();
    expect(screen.getByText('Collect up to 6 candidate supplier pages per scan.')).toBeInTheDocument();
    expect(screen.getByText('1688 Evaluator Summary')).toBeInTheDocument();
    expect(screen.getAllByText('Model source: AI Brain default')).toHaveLength(3);
    expect(screen.getAllByText('Resolved model: gpt-4.1-mini')).toHaveLength(3);
    expect(screen.getByText('Trust threshold: 78% confidence')).toBeInTheDocument();
    expect(
      screen.getByText('Review scope: Every strongest 1688 candidate')
    ).toBeInTheDocument();
  });

  it('loads legacy persisted full settings', () => {
    mocks.settingsMapMock.data = new Map<string, string>([
      [
        PRODUCT_SCANNER_SETTINGS_KEY,
        JSON.stringify({
          playwrightPersonaId: 'persona-1',
          playwrightBrowser: 'chrome',
          manualVerificationTimeoutMs: 90000,
          amazonImageSearchProvider: 'google_lens_upload',
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
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon image search provider' })
    ).toHaveValue('google_lens_upload');
    expect(
      screen.getByRole('textbox', { name: 'Amazon image search page URL' })
    ).toHaveValue('');
    expect(screen.getByRole('spinbutton', { name: 'Manual verification timeout (ms)' })).toHaveValue(
      90000
    );
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon probe evaluator mode' })
    ).toHaveValue('disabled');
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon extraction evaluator mode' })
    ).toHaveValue('disabled');
    expect(
      screen.getByRole('combobox', { name: 'Select Amazon candidate triage mode' })
    ).toHaveValue('disabled');
    expect(screen.getByRole('spinbutton', { name: '1688 candidate result limit' })).toHaveValue(8);
    expect(screen.getByRole('spinbutton', { name: '1688 minimum candidate score' })).toHaveValue(4);
    expect(screen.getByRole('spinbutton', { name: '1688 max extracted images' })).toHaveValue(12);
    expect(screen.getByRole('checkbox', { name: 'Allow 1688 image URL fallback' })).toBeChecked();
    expect(
      screen.getByRole('combobox', { name: 'Select 1688 supplier evaluator mode' })
    ).toHaveValue('disabled');
    expect(screen.getByText('Headless: false')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'AI review is disabled. The scanner trusts the Amazon candidate flow without an evaluator gate.'
      )
    ).toHaveLength(3);
    expect(screen.getAllByText('Model: Disabled')).toHaveLength(4);
    expect(
      screen.getAllByText('Trust policy: Amazon pages are trusted without AI review.')
    ).toHaveLength(3);
    expect(screen.getAllByText('Language gate: Inactive')).toHaveLength(3);
    expect(screen.getAllByText('Continuation: No AI rejection recovery path')).toHaveLength(4);
    expect(screen.getByText('1688 Evaluator Summary')).toBeInTheDocument();
    expect(screen.getByText('Trust policy: 1688 supplier candidates are trusted without AI review.')).toBeInTheDocument();
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
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Select Amazon image search provider' }),
      {
        target: { value: 'google_lens_upload' },
      }
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Amazon image search page URL' }), {
      target: { value: 'https://lens.google.com/?hl=en' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Manual verification timeout (ms)' }), {
      target: { value: '180000' },
    });
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Select Amazon probe evaluator mode' }),
      {
        target: { value: 'model_override' },
      }
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Select Amazon probe evaluator model' }),
      {
        target: { value: 'gpt-4.1' },
      }
    );
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Amazon probe evaluator confidence threshold',
      }),
      {
        target: { value: '0.9' },
      }
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Only evaluate ambiguous Amazon probe candidates' })
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Reject non-English Amazon content in probe stage' })
    );
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Select Amazon probe evaluator language detection mode',
      }),
      {
        target: { value: 'ai_only' },
      }
    );
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Select Amazon extraction evaluator mode',
      }),
      {
        target: { value: 'model_override' },
      }
    );
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Select Amazon extraction evaluator model',
      }),
      {
        target: { value: 'gpt-4.1-mini' },
      }
    );
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: 'Amazon extraction evaluator confidence threshold',
      }),
      {
        target: { value: '0.88' },
      }
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Only evaluate ambiguous Amazon extraction candidates',
      })
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Reject non-English Amazon content in extraction stage',
      })
    );
    fireEvent.change(
      screen.getByRole('combobox', {
        name: 'Select Amazon extraction evaluator language detection mode',
      }),
      {
        target: { value: 'ai_only' },
      }
    );
    fireEvent.change(screen.getByRole('spinbutton', { name: '1688 candidate result limit' }), {
      target: { value: '6' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: '1688 minimum candidate score' }), {
      target: { value: '5' },
    });
    fireEvent.change(screen.getByRole('spinbutton', { name: '1688 max extracted images' }), {
      target: { value: '9' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Allow 1688 image URL fallback' }));
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Select 1688 supplier evaluator mode' }),
      {
        target: { value: 'model_override' },
      }
    );
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Select 1688 supplier evaluator model' }),
      {
        target: { value: 'gpt-4.1' },
      }
    );
    fireEvent.change(
      screen.getByRole('spinbutton', {
        name: '1688 supplier evaluator confidence threshold',
      }),
      {
        target: { value: '0.85' },
      }
    );
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Only evaluate ambiguous 1688 supplier candidates',
      })
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
          amazonImageSearchProvider: 'google_lens_upload',
          amazonImageSearchFallbackProvider: null,
          amazonImageSearchPageUrl: 'https://lens.google.com/?hl=en',
          playwrightSettingsOverrides: {},
          amazonCandidateEvaluator: {
            ...defaultAmazonEvaluator,
          },
          amazonCandidateEvaluatorTriage: {
            ...defaultAmazonEvaluator,
          },
          amazonCandidateEvaluatorProbe: {
            ...defaultAmazonEvaluator,
            mode: 'model_override',
            modelId: 'gpt-4.1',
            threshold: 0.9,
            onlyForAmbiguousCandidates: false,
            rejectNonEnglishContent: false,
            languageDetectionMode: 'ai_only',
          },
          amazonCandidateEvaluatorExtraction: {
            ...defaultAmazonEvaluator,
            mode: 'model_override',
            modelId: 'gpt-4.1-mini',
            threshold: 0.88,
            onlyForAmbiguousCandidates: false,
            rejectNonEnglishContent: false,
            languageDetectionMode: 'ai_only',
          },
          scanner1688: {
            candidateResultLimit: 6,
            minimumCandidateScore: 5,
            maxExtractedImages: 9,
            allowUrlImageSearchFallback: false,
          },
          scanner1688CandidateEvaluator: {
            mode: 'model_override',
            modelId: 'gpt-4.1',
            threshold: 0.85,
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
