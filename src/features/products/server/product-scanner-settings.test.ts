import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/shared/lib/ai/server-settings', () => ({
  getSettingValue: vi.fn(),
}));
vi.mock('@/shared/lib/ai-brain/server', () => ({
  resolveBrainExecutionConfigForCapability: vi.fn(),
}));

import { getSettingValue } from '@/shared/lib/ai/server-settings';
import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';

import {
  resolveProductScanner1688CandidateEvaluatorConfig,
  buildProductScannerEngineRequestOptions,
  resolveProductScannerAmazonCandidateEvaluatorConfig,
  resolveProductScannerHeadless,
} from './product-scanner-settings';

describe('product scanner engine request options', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses Amazon scanner defaults when no persona is selected', () => {
    const result = buildProductScannerEngineRequestOptions({
      playwrightPersonaId: null,
      playwrightBrowser: 'chromium',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      playwrightSettingsOverrides: {},
      amazonCandidateEvaluator: {
        mode: 'disabled',
        modelId: null,
        threshold: 0.7,
        onlyForAmbiguousCandidates: true,
        allowedContentLanguage: 'en',
        rejectNonEnglishContent: true,
        languageDetectionMode: 'deterministic_then_ai',
        systemPrompt: null,
      },
    });

    expect(result).toEqual({
      settingsOverrides: expect.objectContaining({
        headless: false,
        slowMo: 0,
        timeout: 30000,
        navigationTimeout: 30000,
        humanizeMouse: true,
      }),
    });
  });

  it('sends only explicit overrides when a persona is selected', () => {
    const result = buildProductScannerEngineRequestOptions({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      playwrightSettingsOverrides: {
        headless: false,
        timeout: 45000,
      },
      amazonCandidateEvaluator: {
        mode: 'disabled',
        modelId: null,
        threshold: 0.7,
        onlyForAmbiguousCandidates: true,
        systemPrompt: null,
      },
    });

    expect(result).toEqual({
      personaId: 'persona-1',
      settingsOverrides: {
        headless: false,
        timeout: 45000,
      },
      launchOptions: {
        channel: 'chrome',
      },
    });
  });

  it('resolves headless from the selected persona baseline when no explicit override exists', async () => {
    vi.mocked(getSettingValue).mockResolvedValueOnce(
      JSON.stringify([
        {
          id: 'persona-1',
          name: 'Headed Persona',
          settings: {
            headless: false,
          },
        },
      ])
    );

    await expect(
      resolveProductScannerHeadless({
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'chromium',
        captchaBehavior: 'auto_show_browser',
        manualVerificationTimeoutMs: 240000,
        playwrightSettingsOverrides: {},
        amazonCandidateEvaluator: {
          mode: 'disabled',
          modelId: null,
          threshold: 0.7,
          onlyForAmbiguousCandidates: true,
          allowedContentLanguage: 'en',
          rejectNonEnglishContent: true,
          languageDetectionMode: 'deterministic_then_ai',
          systemPrompt: null,
        },
      })
    ).resolves.toBe(false);
  });

  it('resolves the Brain default Amazon candidate evaluator config', async () => {
    vi.mocked(resolveBrainExecutionConfigForCapability).mockResolvedValueOnce({
      modelId: 'gpt-4.1-mini',
      systemPrompt: 'Brain prompt',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
        runtimeKind: 'vision',
      },
    } as never);

    await expect(
      resolveProductScannerAmazonCandidateEvaluatorConfig({
        playwrightPersonaId: null,
        playwrightBrowser: 'chromium',
        captchaBehavior: 'auto_show_browser',
        manualVerificationTimeoutMs: 240000,
        playwrightSettingsOverrides: {},
        amazonCandidateEvaluator: {
          mode: 'brain_default',
          modelId: null,
          threshold: 0.82,
          onlyForAmbiguousCandidates: false,
          allowedContentLanguage: 'en',
          rejectNonEnglishContent: true,
          languageDetectionMode: 'deterministic_then_ai',
          systemPrompt: null,
        },
      })
    ).resolves.toEqual({
      enabled: true,
      mode: 'brain_default',
      modelId: 'gpt-4.1-mini',
      threshold: 0.82,
      onlyForAmbiguousCandidates: false,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      systemPrompt: 'Brain prompt',
      brainApplied: {
        capability: 'product.scan.amazon_candidate_match',
        runtimeKind: 'vision',
      },
    });
  });

  it('resolves a scanner override Amazon candidate evaluator model without AI Brain lookup', async () => {
    await expect(
      resolveProductScannerAmazonCandidateEvaluatorConfig({
        playwrightPersonaId: null,
        playwrightBrowser: 'chromium',
        captchaBehavior: 'auto_show_browser',
        manualVerificationTimeoutMs: 240000,
        playwrightSettingsOverrides: {},
        amazonCandidateEvaluator: {
          mode: 'model_override',
          modelId: 'gpt-4.1',
          threshold: 0.9,
          onlyForAmbiguousCandidates: true,
          allowedContentLanguage: 'en',
          rejectNonEnglishContent: true,
          languageDetectionMode: 'deterministic_then_ai',
          systemPrompt: 'Use the scanner override.',
        },
      })
    ).resolves.toEqual({
      enabled: true,
      mode: 'model_override',
      modelId: 'gpt-4.1',
      threshold: 0.9,
      onlyForAmbiguousCandidates: true,
      allowedContentLanguage: 'en',
      rejectNonEnglishContent: true,
      languageDetectionMode: 'deterministic_then_ai',
      systemPrompt: 'Use the scanner override.',
      brainApplied: null,
    });

    expect(resolveBrainExecutionConfigForCapability).not.toHaveBeenCalled();
  });

  it('resolves the Brain default 1688 candidate evaluator config', async () => {
    vi.mocked(resolveBrainExecutionConfigForCapability).mockResolvedValueOnce({
      modelId: 'gpt-4.1-mini',
      systemPrompt: 'Brain supplier prompt',
      brainApplied: {
        capability: 'product.scan.1688_supplier_match',
        runtimeKind: 'vision',
      },
    } as never);

    await expect(
      resolveProductScanner1688CandidateEvaluatorConfig({
        playwrightPersonaId: null,
        playwrightBrowser: 'chromium',
        captchaBehavior: 'auto_show_browser',
        manualVerificationTimeoutMs: 240000,
        playwrightSettingsOverrides: {},
        amazonCandidateEvaluator: {
          mode: 'disabled',
          modelId: null,
          threshold: 0.7,
          onlyForAmbiguousCandidates: true,
          allowedContentLanguage: 'en',
          rejectNonEnglishContent: true,
          languageDetectionMode: 'deterministic_then_ai',
          systemPrompt: null,
        },
        scanner1688CandidateEvaluator: {
          mode: 'brain_default',
          modelId: null,
          threshold: 0.81,
          onlyForAmbiguousCandidates: false,
          systemPrompt: null,
        },
      })
    ).resolves.toEqual({
      enabled: true,
      mode: 'brain_default',
      modelId: 'gpt-4.1-mini',
      threshold: 0.81,
      onlyForAmbiguousCandidates: false,
      systemPrompt: 'Brain supplier prompt',
      brainApplied: {
        capability: 'product.scan.1688_supplier_match',
        runtimeKind: 'vision',
      },
    });
  });

  it('resolves a scanner override 1688 candidate evaluator model without AI Brain lookup', async () => {
    await expect(
      resolveProductScanner1688CandidateEvaluatorConfig({
        playwrightPersonaId: null,
        playwrightBrowser: 'chromium',
        captchaBehavior: 'auto_show_browser',
        manualVerificationTimeoutMs: 240000,
        playwrightSettingsOverrides: {},
        amazonCandidateEvaluator: {
          mode: 'disabled',
          modelId: null,
          threshold: 0.7,
          onlyForAmbiguousCandidates: true,
          allowedContentLanguage: 'en',
          rejectNonEnglishContent: true,
          languageDetectionMode: 'deterministic_then_ai',
          systemPrompt: null,
        },
        scanner1688CandidateEvaluator: {
          mode: 'model_override',
          modelId: 'gpt-4.1',
          threshold: 0.9,
          onlyForAmbiguousCandidates: true,
          systemPrompt: 'Use the scanner supplier override.',
        },
      })
    ).resolves.toEqual({
      enabled: true,
      mode: 'model_override',
      modelId: 'gpt-4.1',
      threshold: 0.9,
      onlyForAmbiguousCandidates: true,
      systemPrompt: 'Use the scanner supplier override.',
      brainApplied: null,
    });

    expect(resolveBrainExecutionConfigForCapability).not.toHaveBeenCalled();
  });
});
