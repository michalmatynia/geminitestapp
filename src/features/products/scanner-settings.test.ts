import { describe, expect, it } from 'vitest';

import { defaultIntegrationConnectionPlaywrightSettings } from '@/features/playwright/utils/playwright-settings-baseline';

import {
  buildPersistedProductScannerSettings,
  createDefaultProductScanner1688CandidateEvaluator,
  buildProductScannerSettingsDraft,
  createDefaultProductScannerAmazonCandidateEvaluator,
  createDefaultProductScannerSettings,
  parseProductScannerSettings,
} from './scanner-settings';

describe('product scanner settings helpers', () => {
  const defaultAmazonEvaluator = createDefaultProductScannerAmazonCandidateEvaluator();
  const default1688Evaluator = createDefaultProductScanner1688CandidateEvaluator();
  const personas = [
    {
      id: 'persona-1',
      settings: {
        ...defaultIntegrationConnectionPlaywrightSettings,
        headless: false,
        slowMo: 25,
      },
    },
  ] as const;

  it('builds an effective draft from persona baseline plus explicit overrides', () => {
    const draft = buildProductScannerSettingsDraft(
      {
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'chrome',
        captchaBehavior: 'auto_show_browser',
        manualVerificationTimeoutMs: 180000,
        amazonImageSearchProvider: 'google_images_upload',
        amazonImageSearchFallbackProvider: null,
        amazonImageSearchPageUrl: null,
        amazonCandidateEvaluator: {
          mode: 'brain_default',
          modelId: null,
          threshold: 0.8,
          onlyForAmbiguousCandidates: false,
          candidateSimilarityMode: 'ai_only',
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
          threshold: 0.76,
          onlyForAmbiguousCandidates: false,
          systemPrompt: null,
        },
        playwrightSettingsOverrides: {
          timeout: 45000,
        },
      },
      personas
    );

    expect(draft).toEqual({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 180000,
      amazonImageSearchProvider: 'google_images_upload',
      amazonImageSearchFallbackProvider: null,
      amazonImageSearchPageUrl: '',
      amazonCandidateEvaluator: {
        mode: 'brain_default',
        modelId: null,
        threshold: 0.8,
        onlyForAmbiguousCandidates: false,
        candidateSimilarityMode: 'ai_only',
        allowedContentLanguage: 'en',
        rejectNonEnglishContent: true,
        languageDetectionMode: 'deterministic_then_ai',
        systemPrompt: null,
      },
      amazonCandidateEvaluatorTriage: defaultAmazonEvaluator,
      amazonCandidateEvaluatorProbe: defaultAmazonEvaluator,
      amazonCandidateEvaluatorExtraction: defaultAmazonEvaluator,
      scanner1688: {
        candidateResultLimit: 6,
        minimumCandidateScore: 5,
        maxExtractedImages: 10,
        allowUrlImageSearchFallback: false,
      },
      scanner1688CandidateEvaluator: {
        mode: 'brain_default',
        modelId: null,
        threshold: 0.76,
        onlyForAmbiguousCandidates: false,
        systemPrompt: null,
      },
      playwrightSettings: expect.objectContaining({
        headless: false,
        slowMo: 25,
        timeout: 45000,
      }),
    });
  });

  it('persists only explicit overrides when the draft matches the selected persona baseline', () => {
    const persisted = buildPersistedProductScannerSettings(
      {
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'brave',
        captchaBehavior: 'fail',
        manualVerificationTimeoutMs: 120000,
        amazonImageSearchProvider: 'google_images_url',
        amazonImageSearchFallbackProvider: null,
        amazonImageSearchPageUrl: 'https://lens.google.com/?hl=en',
        amazonCandidateEvaluator: {
          mode: 'model_override',
          modelId: 'gpt-4.1',
          threshold: 0.9,
          onlyForAmbiguousCandidates: false,
          candidateSimilarityMode: 'ai_only',
          allowedContentLanguage: 'en',
          rejectNonEnglishContent: true,
          languageDetectionMode: 'deterministic_then_ai',
          systemPrompt: null,
        },
        scanner1688: {
          candidateResultLimit: 5,
          minimumCandidateScore: 6,
          maxExtractedImages: 8,
          allowUrlImageSearchFallback: false,
        },
        scanner1688CandidateEvaluator: {
          mode: 'model_override',
          modelId: 'gpt-4.1-mini',
          threshold: 0.88,
          onlyForAmbiguousCandidates: false,
          systemPrompt: 'Supplier match.',
        },
        playwrightSettings: {
          ...defaultIntegrationConnectionPlaywrightSettings,
          headless: false,
          slowMo: 25,
        },
      },
      personas
    );

    expect(persisted).toEqual({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'brave',
      captchaBehavior: 'fail',
      manualVerificationTimeoutMs: 120000,
      amazonImageSearchProvider: 'google_images_url',
      amazonImageSearchFallbackProvider: null,
      amazonImageSearchPageUrl: 'https://lens.google.com/?hl=en',
      playwrightSettingsOverrides: {},
      amazonCandidateEvaluator: {
        mode: 'model_override',
        modelId: 'gpt-4.1',
        threshold: 0.9,
        onlyForAmbiguousCandidates: false,
        candidateSimilarityMode: 'ai_only',
        allowedContentLanguage: 'en',
        rejectNonEnglishContent: true,
        languageDetectionMode: 'deterministic_then_ai',
        systemPrompt: null,
      },
      amazonCandidateEvaluatorTriage: defaultAmazonEvaluator,
      amazonCandidateEvaluatorProbe: defaultAmazonEvaluator,
      amazonCandidateEvaluatorExtraction: defaultAmazonEvaluator,
      scanner1688: {
        candidateResultLimit: 5,
        minimumCandidateScore: 6,
        maxExtractedImages: 8,
        allowUrlImageSearchFallback: false,
      },
      scanner1688CandidateEvaluator: {
        mode: 'model_override',
        modelId: 'gpt-4.1-mini',
        threshold: 0.88,
        onlyForAmbiguousCandidates: false,
        systemPrompt: 'Supplier match.',
      },
    });
  });

  it('migrates legacy persisted full settings into overrides', () => {
    const settings = parseProductScannerSettings(
      JSON.stringify({
        playwrightPersonaId: 'persona-1',
        playwrightBrowser: 'chrome',
        manualVerificationTimeoutMs: 60000,
        amazonImageSearchProvider: 'google_lens_upload',
        playwrightSettings: {
          ...defaultIntegrationConnectionPlaywrightSettings,
          headless: false,
          timeout: 45000,
        },
      })
    );

    expect(settings).toEqual({
      playwrightPersonaId: 'persona-1',
      playwrightBrowser: 'chrome',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 60000,
      amazonImageSearchProvider: 'google_lens_upload',
      amazonImageSearchFallbackProvider: null,
      amazonImageSearchPageUrl: null,
      amazonCandidateEvaluator: {
        mode: 'disabled',
        modelId: null,
        threshold: 0.7,
        onlyForAmbiguousCandidates: false,
        candidateSimilarityMode: 'ai_only',
        allowedContentLanguage: 'en',
        rejectNonEnglishContent: true,
        languageDetectionMode: 'ai_only',
        systemPrompt: null,
      },
      amazonCandidateEvaluatorTriage: defaultAmazonEvaluator,
      amazonCandidateEvaluatorProbe: defaultAmazonEvaluator,
      amazonCandidateEvaluatorExtraction: defaultAmazonEvaluator,
      scanner1688: {
        candidateResultLimit: 8,
        minimumCandidateScore: 4,
        maxExtractedImages: 12,
        allowUrlImageSearchFallback: true,
      },
      scanner1688CandidateEvaluator: default1688Evaluator,
      playwrightSettingsOverrides: expect.objectContaining({
        headless: false,
        timeout: 45000,
      }),
    });

    expect(
      buildProductScannerSettingsDraft(settings, personas).playwrightSettings
    ).toEqual(
      expect.objectContaining({
        headless: false,
        slowMo: 0,
        timeout: 45000,
      })
    );
  });

  it('uses headed Amazon scanner defaults when no persona is selected', () => {
    const draft = buildProductScannerSettingsDraft(createDefaultProductScannerSettings(), null);

    expect(draft.playwrightBrowser).toBe('auto');
    expect(draft.playwrightSettings).toEqual(
      expect.objectContaining({
        headless: false,
        humanizeMouse: true,
        deviceName: 'Desktop Chrome',
      })
    );

    expect(buildPersistedProductScannerSettings(draft, null)).toEqual({
      playwrightPersonaId: null,
      playwrightBrowser: 'auto',
      captchaBehavior: 'auto_show_browser',
      manualVerificationTimeoutMs: 240000,
      amazonImageSearchProvider: 'google_images_upload',
      amazonImageSearchFallbackProvider: null,
      amazonImageSearchPageUrl: null,
      playwrightSettingsOverrides: {},
      amazonCandidateEvaluator: {
        mode: 'disabled',
        modelId: null,
        threshold: 0.7,
        onlyForAmbiguousCandidates: false,
        candidateSimilarityMode: 'ai_only',
        allowedContentLanguage: 'en',
        rejectNonEnglishContent: true,
        languageDetectionMode: 'ai_only',
        systemPrompt: null,
      },
      amazonCandidateEvaluatorTriage: defaultAmazonEvaluator,
      amazonCandidateEvaluatorProbe: defaultAmazonEvaluator,
      amazonCandidateEvaluatorExtraction: defaultAmazonEvaluator,
      scanner1688: {
        candidateResultLimit: 8,
        minimumCandidateScore: 4,
        maxExtractedImages: 12,
        allowUrlImageSearchFallback: true,
      },
      scanner1688CandidateEvaluator: default1688Evaluator,
    });
  });
});
