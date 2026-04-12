'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import { usePlaywrightPersonas } from '@/features/playwright/public';
import { PlaywrightSettingsForm } from '@/features/playwright/ui.public';
import { useUpdateSetting, useSettingsMap } from '@/shared/hooks/use-settings';
import { AdminSettingsPageLayout } from '@/shared/ui/admin.public';
import { Button } from '@/shared/ui/button';
import { FormActions, FormField, FormSection, SelectSimple, Hint } from '@/shared/ui/forms-and-actions.public';
import { Input, useToast } from '@/shared/ui/primitives.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  buildPersistedProductScannerSettings,
  PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_MODE_OPTIONS,
  PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE_OPTIONS,
  buildProductScannerSettingsDraft,
  PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE_OPTIONS,
  PRODUCT_SCANNER_BROWSER_OPTIONS,
  PRODUCT_SCANNER_CAPTCHA_BEHAVIOR_OPTIONS,
  PRODUCT_SCANNER_SETTINGS_KEY,
  parseProductScannerSettings,
  resolveProductScannerSettingsBaseline,
  serializeProductScannerSettings,
  type ProductScannerSettingsDraft,
} from '../scanner-settings';

const CUSTOM_PERSONA_VALUE = 'custom';

const toPositiveInteger = (value: string, fallback: number): number => {
  const normalized = Number.parseInt(value, 10);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
};

const toUnitInterval = (value: string, fallback: number): number => {
  const normalized = Number.parseFloat(value);
  if (!Number.isFinite(normalized)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, normalized));
};

const formatConfidenceThresholdLabel = (value: number): string =>
  `${Math.round(Math.min(1, Math.max(0, value)) * 100)}% confidence`;

type AmazonCandidateEvaluator = Pick<
  ProductScannerSettingsDraft,
  'amazonCandidateEvaluatorProbe' | 'amazonCandidateEvaluatorExtraction'
>[keyof Pick<
  ProductScannerSettingsDraft,
  'amazonCandidateEvaluatorProbe' | 'amazonCandidateEvaluatorExtraction'
>];

const resolveAmazonEvaluatorPolicyLines = (
  evaluator: AmazonCandidateEvaluator
): string[] => {
  if (evaluator.mode === 'disabled') {
    return [
      'AI review is disabled. The scanner trusts the Amazon candidate flow without an evaluator gate.',
    ];
  }

  return [
    evaluator.onlyForAmbiguousCandidates
      ? 'AI review runs only when the Amazon candidate remains ambiguous after deterministic identifier checks.'
      : 'AI review runs on every Amazon candidate before extraction is trusted.',
    evaluator.rejectNonEnglishContent
      ? 'Only English Amazon page content is trusted for scraping into English product fields.'
      : 'Language does not block extraction in the current evaluator policy.',
    evaluator.rejectNonEnglishContent
      ? evaluator.languageDetectionMode === 'ai_only'
        ? 'The evaluator decides page language during every reviewed AI pass.'
        : 'The scanner uses probe language hints first and asks AI when page language remains unclear.'
      : 'Language review is informational only when extraction is not blocked by content language.',
    evaluator.rejectNonEnglishContent
      ? 'Matched products on non-English Amazon pages are rejected and the scanner moves to the next candidate when one is available.'
      : 'Matched products can still be scraped even when page language is not English.',
    `Candidates must meet ${formatConfidenceThresholdLabel(evaluator.threshold)} to be trusted.`,
    'Rejected candidates continue to the next Amazon candidate when one is available; otherwise the scan finishes as No Match.',
    'Evaluator runtime errors fail the scan conservatively instead of trusting the page.',
  ];
};

const resolveAmazonEvaluatorSummaryLines = (
  evaluator: AmazonCandidateEvaluator,
  effectiveModelLabel: string
): string[] => {
  if (evaluator.mode === 'disabled') {
    return [
      'Model: Disabled',
      'Trust policy: Amazon pages are trusted without AI review.',
      'Language gate: Inactive',
      'Continuation: No AI rejection recovery path',
    ];
  }

  return [
    `Model source: ${evaluator.mode === 'brain_default' ? 'AI Brain default' : 'Scanner override'}`,
    `Resolved model: ${effectiveModelLabel}`,
    `Trust threshold: ${formatConfidenceThresholdLabel(evaluator.threshold)}`,
    `Review scope: ${evaluator.onlyForAmbiguousCandidates ? 'Ambiguous candidates only' : 'Every Amazon candidate'}`,
    `Language gate: ${
      evaluator.rejectNonEnglishContent
        ? evaluator.languageDetectionMode === 'ai_only'
          ? 'English only, AI decides language'
          : 'English only, probe hints first'
        : 'Inactive'
    }`,
    'Continuation: Try next Amazon candidate after rejection',
  ];
};

const resolveAmazonEvaluatorModelLabel = (
  evaluator: AmazonCandidateEvaluator,
  brainDefaultModelLabel: string
): string =>
  evaluator.mode === 'disabled'
    ? 'Disabled'
    : evaluator.mode === 'brain_default'
      ? brainDefaultModelLabel.trim() || 'Not configured in AI Brain'
      : evaluator.modelId?.trim() || 'Select a model';

const resolve1688EvaluatorPolicyLines = (
  draft: Pick<ProductScannerSettingsDraft, 'scanner1688CandidateEvaluator'>
): string[] => {
  const evaluator = draft.scanner1688CandidateEvaluator;
  if (evaluator.mode === 'disabled') {
    return [
      'AI review is disabled. The 1688 scanner trusts the strongest heuristic supplier candidate.',
    ];
  }

  return [
    evaluator.onlyForAmbiguousCandidates
      ? 'AI review runs only when the 1688 supplier candidate remains ambiguous after the heuristic probe.'
      : 'AI review runs on every strongest 1688 supplier candidate before the scan is trusted.',
    `Candidates must meet ${formatConfidenceThresholdLabel(evaluator.threshold)} to be approved.`,
    'Approved supplier candidates persist their extracted supplier page, pricing, MOQ, and images.',
    'Rejected supplier candidates finish the scan as No Match while keeping the candidate diagnostics visible.',
    'Evaluator runtime errors fail the scan conservatively instead of trusting the supplier page.',
  ];
};

const resolve1688EvaluatorSummaryLines = (
  draft: Pick<ProductScannerSettingsDraft, 'scanner1688CandidateEvaluator'>,
  effectiveModelLabel: string
): string[] => {
  const evaluator = draft.scanner1688CandidateEvaluator;

  if (evaluator.mode === 'disabled') {
    return [
      'Model: Disabled',
      'Trust policy: 1688 supplier candidates are trusted without AI review.',
      'Review scope: Heuristic-only',
      'Continuation: No AI rejection recovery path',
    ];
  }

  return [
    `Model source: ${evaluator.mode === 'brain_default' ? 'AI Brain default' : 'Scanner override'}`,
    `Resolved model: ${effectiveModelLabel}`,
    `Trust threshold: ${formatConfidenceThresholdLabel(evaluator.threshold)}`,
    `Review scope: ${
      evaluator.onlyForAmbiguousCandidates
        ? 'Ambiguous 1688 candidates only'
        : 'Every strongest 1688 candidate'
    }`,
    'Continuation: Approved candidates complete the scan, rejected candidates finish as No Match',
  ];
};

export function AdminProductScannerSettingsPage(): React.JSX.Element {
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();
  const personasQuery = usePlaywrightPersonas();
  const brainModelOptions = useBrainModelOptions({
    capability: 'product.scan.amazon_candidate_match',
    enabled: settingsQuery.isSuccess,
  });
  const brain1688ModelOptions = useBrainModelOptions({
    capability: 'product.scan.1688_supplier_match',
    enabled: settingsQuery.isSuccess,
  });
  const { toast } = useToast();

  const rawSettings = settingsQuery.data?.get(PRODUCT_SCANNER_SETTINGS_KEY) ?? null;
  const persistedSettings = useMemo(
    () => parseProductScannerSettings(rawSettings),
    [rawSettings]
  );
  const persistedDraft = useMemo(
    () => buildProductScannerSettingsDraft(persistedSettings, personasQuery.data),
    [persistedSettings, personasQuery.data]
  );
  const [draft, setDraft] = useState<ProductScannerSettingsDraft>(persistedDraft);
  const [lastSavedSerialized, setLastSavedSerialized] = useState<string | null>(null);

  useEffect(() => {
    setDraft(persistedDraft);
    setLastSavedSerialized(null);
  }, [persistedDraft]);

  const personaOptions = useMemo(
    () => [
      { value: CUSTOM_PERSONA_VALUE, label: 'Custom overrides only' },
      ...(personasQuery.data ?? []).map((persona) => ({
        value: persona.id,
        label: persona.name,
      })),
    ],
    [personasQuery.data]
  );

  const selectedPersona =
    personasQuery.data?.find((persona) => persona.id === draft.playwrightPersonaId) ?? null;
  const amazonCandidateEvaluatorModelOptions = useMemo(
    () =>
      brainModelOptions.models.map((modelId) => ({
        value: modelId,
        label: modelId,
      })),
    [brainModelOptions.models]
  );
  const supplier1688EvaluatorModelOptions = useMemo(
    () =>
      brain1688ModelOptions.models.map((modelId) => ({
        value: modelId,
        label: modelId,
      })),
    [brain1688ModelOptions.models]
  );
  const effectiveAmazonCandidateEvaluatorProbeModel = resolveAmazonEvaluatorModelLabel(
    draft.amazonCandidateEvaluatorProbe,
    brainModelOptions.effectiveModelId
  );
  const effectiveAmazonCandidateEvaluatorExtractionModel = resolveAmazonEvaluatorModelLabel(
    draft.amazonCandidateEvaluatorExtraction,
    brainModelOptions.effectiveModelId
  );
  const effective1688CandidateEvaluatorModel =
    draft.scanner1688CandidateEvaluator.mode === 'disabled'
      ? 'Disabled'
      : draft.scanner1688CandidateEvaluator.mode === 'brain_default'
        ? brain1688ModelOptions.effectiveModelId.trim() || 'Not configured in AI Brain'
        : draft.scanner1688CandidateEvaluator.modelId?.trim() || 'Select a model';
  const amazonProbeEvaluatorPolicyLines = useMemo(
    () => resolveAmazonEvaluatorPolicyLines(draft.amazonCandidateEvaluatorProbe),
    [draft]
  );
  const amazonExtractionEvaluatorPolicyLines = useMemo(
    () => resolveAmazonEvaluatorPolicyLines(draft.amazonCandidateEvaluatorExtraction),
    [draft]
  );
  const amazonProbeEvaluatorSummaryLines = useMemo(
    () =>
      resolveAmazonEvaluatorSummaryLines(
        draft.amazonCandidateEvaluatorProbe,
        effectiveAmazonCandidateEvaluatorProbeModel
      ),
    [draft, effectiveAmazonCandidateEvaluatorProbeModel]
  );
  const amazonExtractionEvaluatorSummaryLines = useMemo(
    () =>
      resolveAmazonEvaluatorSummaryLines(
        draft.amazonCandidateEvaluatorExtraction,
        effectiveAmazonCandidateEvaluatorExtractionModel
      ),
    [draft, effectiveAmazonCandidateEvaluatorExtractionModel]
  );
  const evaluator1688PolicyLines = useMemo(
    () => resolve1688EvaluatorPolicyLines(draft),
    [draft]
  );
  const evaluator1688SummaryLines = useMemo(
    () => resolve1688EvaluatorSummaryLines(draft, effective1688CandidateEvaluatorModel),
    [draft, effective1688CandidateEvaluatorModel]
  );
  const persistedDraftForSave = useMemo(
    () => buildPersistedProductScannerSettings(draft, personasQuery.data),
    [draft, personasQuery.data]
  );
  const serializedDraft = useMemo(
    () => serializeProductScannerSettings(persistedDraftForSave),
    [persistedDraftForSave]
  );
  const serializedPersistedForComparison = useMemo(
    () =>
      serializeProductScannerSettings(
        buildPersistedProductScannerSettings(persistedDraft, personasQuery.data)
      ),
    [persistedDraft, personasQuery.data]
  );
  const dirty =
    serializedDraft !== (lastSavedSerialized ?? serializedPersistedForComparison);

  const handleSave = async (): Promise<void> => {
    try {
      await updateSetting.mutateAsync({
        key: PRODUCT_SCANNER_SETTINGS_KEY,
        value: serializedDraft,
      });
      setLastSavedSerialized(serializedDraft);
      toast('Scanner settings saved.', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'AdminProductScannerSettingsPage',
        action: 'handleSave',
      });
      const message =
        error instanceof Error ? error.message : 'Failed to save scanner settings.';
      toast(message, { variant: 'error' });
    }
  };

  return (
    <AdminSettingsPageLayout
      title='Scanner Settings'
      current='Scanner Settings'
      description='Configure the global Playwright runtime used by product image scans.'
    >
      <div className='space-y-6'>
        <FormSection
          title='Scanner Runtime'
          description='These settings apply to product scan jobs started from the products workspace.'
          className='p-6'
        >
          <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
            <FormField
              label='Playwright Persona'
              description='Optional shared baseline for headless mode, delays, proxy, and device profile.'
            >
              <SelectSimple
                size='sm'
                value={draft.playwrightPersonaId ?? CUSTOM_PERSONA_VALUE}
                onValueChange={(value: string): void => {
                  const nextPersonaId = value === CUSTOM_PERSONA_VALUE ? null : value;
                  const baseline = resolveProductScannerSettingsBaseline(
                    personasQuery.data,
                    nextPersonaId
                  );
                  setDraft((prev) => ({
                    ...prev,
                    playwrightPersonaId: nextPersonaId,
                    playwrightSettings: baseline,
                  }));
                }}
                options={personaOptions}
                placeholder='Select persona'
                ariaLabel='Select scanner persona'
                title='Select scanner persona'
              />
            </FormField>
            <FormField
              label='Browser'
              description='Which Chromium-based browser the scanner should launch.'
            >
              <SelectSimple
                size='sm'
                value={draft.playwrightBrowser}
                onValueChange={(value: string): void => {
                  setDraft((prev) => ({
                    ...prev,
                    playwrightBrowser:
                      value === 'brave' ||
                      value === 'chrome' ||
                      value === 'chromium'
                        ? value
                        : 'auto',
                  }));
                }}
                options={[...PRODUCT_SCANNER_BROWSER_OPTIONS]}
                placeholder='Select browser'
                ariaLabel='Select scanner browser'
                title='Select scanner browser'
              />
            </FormField>
            <FormField
              label='Captcha Handling'
              description='Choose whether Google Lens captcha pages should reopen in a visible browser and wait for manual resolution.'
            >
              <SelectSimple
                size='sm'
                value={draft.captchaBehavior}
                onValueChange={(value: string): void => {
                  setDraft((prev) => ({
                    ...prev,
                    captchaBehavior: value === 'fail' ? 'fail' : 'auto_show_browser',
                  }));
                }}
                options={[...PRODUCT_SCANNER_CAPTCHA_BEHAVIOR_OPTIONS]}
                placeholder='Select captcha handling'
                ariaLabel='Select scanner captcha handling'
                title='Select scanner captcha handling'
              />
            </FormField>
            <FormField
              label='Manual Verification Timeout (ms)'
              description='How long a visible-browser scan should wait for captcha resolution before failing.'
            >
              <Input
                type='number'
                min={1}
                step={1}
                value={draft.manualVerificationTimeoutMs}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((prev) => ({
                    ...prev,
                    manualVerificationTimeoutMs: toPositiveInteger(
                      event.target.value,
                      prev.manualVerificationTimeoutMs
                    ),
                  }));
                }}
                aria-label='Manual verification timeout (ms)'
                title='Manual verification timeout (ms)'
              />
            </FormField>
          </div>

          <div className='mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
            <span>
              {selectedPersona
                ? `Using persona baseline: ${selectedPersona.name}`
                : 'Using custom scanner settings only.'}
            </span>
            <Button variant='outline' size='sm' asChild>
              <Link href='/admin/settings/playwright'>Manage personas</Link>
            </Button>
          </div>
        </FormSection>

        <FormSection className='p-0'>
          <PlaywrightSettingsForm
            settings={draft.playwrightSettings}
            setSettings={(nextSettings) => {
              setDraft((prev) => ({
                ...prev,
                playwrightSettings:
                  typeof nextSettings === 'function'
                    ? nextSettings(prev.playwrightSettings)
                    : nextSettings,
              }));
            }}
            showSave={false}
            title='Playwright Overrides'
            description='These overrides are applied on top of the selected persona for product scans.'
          />
        </FormSection>

        <FormSection
          title='Amazon Probe Evaluator'
          description='Optional AI gate that reviews each Amazon candidate before extraction is attempted.'
          className='p-6'
        >
          <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
            <FormField
              label='Probe Evaluator Mode'
              description='Choose whether this scanner step uses the AI Brain default model or a scanner-specific override.'
            >
              <SelectSimple
                size='sm'
                value={draft.amazonCandidateEvaluatorProbe.mode}
                onValueChange={(value: string): void => {
                  setDraft((prev) => ({
                    ...prev,
                    amazonCandidateEvaluatorProbe: {
                      ...prev.amazonCandidateEvaluatorProbe,
                      mode:
                        value === 'brain_default' || value === 'model_override'
                          ? value
                          : 'disabled',
                    },
                  }));
                }}
                options={[...PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE_OPTIONS]}
                placeholder='Select evaluator mode'
                ariaLabel='Select Amazon probe evaluator mode'
                title='Select Amazon probe evaluator mode'
              />
            </FormField>
            <FormField
              label='Resolved Model'
              description='Current effective model for the evaluator checkpoint.'
            >
              <Input
                value={effectiveAmazonCandidateEvaluatorProbeModel}
                readOnly
                aria-label='Resolved Amazon probe evaluator model'
                title='Resolved Amazon probe evaluator model'
              />
            </FormField>
            {draft.amazonCandidateEvaluatorProbe.mode === 'model_override' ? (
              <FormField
                label='Override Model'
                description='Choose a vision-capable model from the AI Brain catalog.'
              >
                <SelectSimple
                  size='sm'
                  value={draft.amazonCandidateEvaluatorProbe.modelId ?? ''}
                  onValueChange={(value: string): void => {
                    setDraft((prev) => ({
                      ...prev,
                      amazonCandidateEvaluatorProbe: {
                        ...prev.amazonCandidateEvaluatorProbe,
                        modelId: value.trim() || null,
                      },
                    }));
                  }}
                  options={[...amazonCandidateEvaluatorModelOptions]}
                  placeholder='Select evaluator model'
                  ariaLabel='Select Amazon probe evaluator model'
                  title='Select Amazon probe evaluator model'
                />
              </FormField>
            ) : null}
            <FormField
              label='Confidence Threshold'
              description='Minimum evaluator confidence required before trusting the Amazon page.'
            >
              <Input
                type='number'
                min={0}
                max={1}
                step={0.05}
                value={draft.amazonCandidateEvaluatorProbe.threshold}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((prev) => ({
                    ...prev,
                    amazonCandidateEvaluatorProbe: {
                      ...prev.amazonCandidateEvaluatorProbe,
                      threshold: toUnitInterval(
                        event.target.value,
                        prev.amazonCandidateEvaluatorProbe.threshold
                      ),
                    },
                  }));
                }}
                aria-label='Amazon probe evaluator confidence threshold'
                title='Amazon probe evaluator confidence threshold'
              />
            </FormField>
            <FormField
              label='Evaluation Scope'
              description='Run the evaluator only when Amazon candidates are ambiguous.'
            >
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={draft.amazonCandidateEvaluatorProbe.onlyForAmbiguousCandidates}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraft((prev) => ({
                      ...prev,
                      amazonCandidateEvaluatorProbe: {
                        ...prev.amazonCandidateEvaluatorProbe,
                        onlyForAmbiguousCandidates: event.target.checked,
                      },
                    }));
                  }}
                  aria-label='Only evaluate ambiguous Amazon probe candidates'
                  title='Only evaluate ambiguous Amazon probe candidates'
                />
                Only evaluate ambiguous candidates
              </label>
            </FormField>
            <FormField
              label='Allowed Content Language'
              description='Trusted extraction currently targets English product fields.'
            >
              <Input value='English' readOnly aria-label='Allowed Amazon content language' />
            </FormField>
            <FormField
              label='Language Gate'
              description='Reject matching Amazon pages when their visible content is not English.'
            >
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={draft.amazonCandidateEvaluatorProbe.rejectNonEnglishContent}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraft((prev) => ({
                      ...prev,
                      amazonCandidateEvaluatorProbe: {
                        ...prev.amazonCandidateEvaluatorProbe,
                        rejectNonEnglishContent: event.target.checked,
                      },
                    }));
                  }}
                  aria-label='Reject non-English Amazon content in probe stage'
                  title='Reject non-English Amazon content in probe stage'
                />
                Reject non-English Amazon content
              </label>
            </FormField>
            <FormField
              label='Language Detection'
              description='Choose whether probe hints can reject non-English pages before AI runs.'
            >
              <SelectSimple
                size='sm'
                value={draft.amazonCandidateEvaluatorProbe.languageDetectionMode}
                onValueChange={(value: string): void => {
                  setDraft((prev) => ({
                    ...prev,
                    amazonCandidateEvaluatorProbe: {
                      ...prev.amazonCandidateEvaluatorProbe,
                      languageDetectionMode:
                        value === 'ai_only' ? 'ai_only' : 'deterministic_then_ai',
                    },
                  }));
                }}
                options={[...PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE_OPTIONS]}
                placeholder='Select language detection mode'
                ariaLabel='Select Amazon probe evaluator language detection mode'
                title='Select Amazon probe evaluator language detection mode'
              />
            </FormField>
          </div>

          <div className='mt-4 text-xs text-muted-foreground'>
            {brainModelOptions.isLoading
              ? 'Loading AI Brain model options.'
              : brainModelOptions.sourceWarnings[0] ||
                'The probe evaluator compares the Amazon page image and text before extraction is trusted.'}
          </div>

          <div className='mt-4 space-y-2 rounded-md border border-border/60 bg-background/70 px-3 py-3 text-xs text-muted-foreground'>
            <p className='font-medium uppercase tracking-wide text-foreground'>Evaluator Summary</p>
            <ul className='space-y-1'>
              {amazonProbeEvaluatorSummaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className='mt-4 space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground'>
            <p className='font-medium uppercase tracking-wide text-foreground'>Runtime Policy</p>
            <ul className='space-y-1'>
              {amazonProbeEvaluatorPolicyLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </FormSection>

        <FormSection
          title='Amazon Extraction Evaluator'
          description='AI gate that validates the extracted Amazon product page before ASIN update.'
          className='p-6'
        >
          <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
            <FormField
              label='Extraction Evaluator Mode'
              description='Choose whether this scanner step uses the AI Brain default model or a scanner-specific override.'
            >
              <SelectSimple
                size='sm'
                value={draft.amazonCandidateEvaluatorExtraction.mode}
                onValueChange={(value: string): void => {
                  setDraft((prev) => ({
                    ...prev,
                    amazonCandidateEvaluatorExtraction: {
                      ...prev.amazonCandidateEvaluatorExtraction,
                      mode:
                        value === 'brain_default' || value === 'model_override'
                          ? value
                          : 'disabled',
                    },
                  }));
                }}
                options={[...PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE_OPTIONS]}
                placeholder='Select evaluator mode'
                ariaLabel='Select Amazon extraction evaluator mode'
                title='Select Amazon extraction evaluator mode'
              />
            </FormField>
            <FormField
              label='Resolved Model'
              description='Current effective model for the evaluator checkpoint.'
            >
              <Input
                value={effectiveAmazonCandidateEvaluatorExtractionModel}
                readOnly
                aria-label='Resolved Amazon extraction evaluator model'
                title='Resolved Amazon extraction evaluator model'
              />
            </FormField>
            {draft.amazonCandidateEvaluatorExtraction.mode === 'model_override' ? (
              <FormField
                label='Override Model'
                description='Choose a vision-capable model from the AI Brain catalog.'
              >
                <SelectSimple
                  size='sm'
                  value={draft.amazonCandidateEvaluatorExtraction.modelId ?? ''}
                  onValueChange={(value: string): void => {
                    setDraft((prev) => ({
                      ...prev,
                      amazonCandidateEvaluatorExtraction: {
                        ...prev.amazonCandidateEvaluatorExtraction,
                        modelId: value.trim() || null,
                      },
                    }));
                  }}
                  options={[...amazonCandidateEvaluatorModelOptions]}
                  placeholder='Select evaluator model'
                  ariaLabel='Select Amazon extraction evaluator model'
                  title='Select Amazon extraction evaluator model'
                />
              </FormField>
            ) : null}
            <FormField
              label='Confidence Threshold'
              description='Minimum evaluator confidence required before trusting the Amazon page.'
            >
              <Input
                type='number'
                min={0}
                max={1}
                step={0.05}
                value={draft.amazonCandidateEvaluatorExtraction.threshold}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((prev) => ({
                    ...prev,
                    amazonCandidateEvaluatorExtraction: {
                      ...prev.amazonCandidateEvaluatorExtraction,
                      threshold: toUnitInterval(
                        event.target.value,
                        prev.amazonCandidateEvaluatorExtraction.threshold
                      ),
                    },
                  }));
                }}
                aria-label='Amazon extraction evaluator confidence threshold'
                title='Amazon extraction evaluator confidence threshold'
              />
            </FormField>
            <FormField
              label='Evaluation Scope'
              description='Run the evaluator only when Amazon candidates are ambiguous.'
            >
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={draft.amazonCandidateEvaluatorExtraction.onlyForAmbiguousCandidates}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraft((prev) => ({
                      ...prev,
                      amazonCandidateEvaluatorExtraction: {
                        ...prev.amazonCandidateEvaluatorExtraction,
                        onlyForAmbiguousCandidates: event.target.checked,
                      },
                    }));
                  }}
                  aria-label='Only evaluate ambiguous Amazon extraction candidates'
                  title='Only evaluate ambiguous Amazon extraction candidates'
                />
                Only evaluate ambiguous candidates
              </label>
            </FormField>
            <FormField
              label='Allowed Content Language'
              description='Trusted extraction currently targets English product fields.'
            >
              <Input value='English' readOnly aria-label='Allowed Amazon content language' />
            </FormField>
            <FormField
              label='Language Gate'
              description='Reject matching Amazon pages when their visible content is not English.'
            >
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={draft.amazonCandidateEvaluatorExtraction.rejectNonEnglishContent}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraft((prev) => ({
                      ...prev,
                      amazonCandidateEvaluatorExtraction: {
                        ...prev.amazonCandidateEvaluatorExtraction,
                        rejectNonEnglishContent: event.target.checked,
                      },
                    }));
                  }}
                  aria-label='Reject non-English Amazon content in extraction stage'
                  title='Reject non-English Amazon content in extraction stage'
                />
                Reject non-English Amazon content
              </label>
            </FormField>
            <FormField
              label='Language Detection'
              description='Choose whether probe hints can reject non-English pages before AI runs.'
            >
              <SelectSimple
                size='sm'
                value={draft.amazonCandidateEvaluatorExtraction.languageDetectionMode}
                onValueChange={(value: string): void => {
                  setDraft((prev) => ({
                    ...prev,
                    amazonCandidateEvaluatorExtraction: {
                      ...prev.amazonCandidateEvaluatorExtraction,
                      languageDetectionMode:
                        value === 'ai_only' ? 'ai_only' : 'deterministic_then_ai',
                    },
                  }));
                }}
                options={[...PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_LANGUAGE_DETECTION_MODE_OPTIONS]}
                placeholder='Select language detection mode'
                ariaLabel='Select Amazon extraction evaluator language detection mode'
                title='Select Amazon extraction evaluator language detection mode'
              />
            </FormField>
          </div>

          <div className='mt-4 text-xs text-muted-foreground'>
            {brainModelOptions.isLoading
              ? 'Loading AI Brain model options.'
              : brainModelOptions.sourceWarnings[0] ||
                'The extraction evaluator confirms the same product before updating product data.'}
          </div>

          <div className='mt-4 space-y-2 rounded-md border border-border/60 bg-background/70 px-3 py-3 text-xs text-muted-foreground'>
            <p className='font-medium uppercase tracking-wide text-foreground'>Evaluator Summary</p>
            <ul className='space-y-1'>
              {amazonExtractionEvaluatorSummaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className='mt-4 space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground'>
            <p className='font-medium uppercase tracking-wide text-foreground'>Runtime Policy</p>
            <ul className='space-y-1'>
              {amazonExtractionEvaluatorPolicyLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </FormSection>

        <FormSection
          title='1688 Supplier Scanner'
          description='Tune candidate collection and extraction breadth for the 1688 reverse-image scanner.'
          className='p-6'
        >
          <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
            <FormField
              label='Candidate Result Limit'
              description='Maximum number of 1688 supplier product candidates collected from one image-search pass.'
            >
              <Input
                type='number'
                min={1}
                max={20}
                step={1}
                value={draft.scanner1688.candidateResultLimit}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((prev) => ({
                    ...prev,
                    scanner1688: {
                      ...prev.scanner1688,
                      candidateResultLimit: Math.min(
                        20,
                        Math.max(
                          1,
                          toPositiveInteger(
                            event.target.value,
                            prev.scanner1688.candidateResultLimit
                          )
                        )
                      ),
                    },
                  }));
                }}
                aria-label='1688 candidate result limit'
                title='1688 candidate result limit'
              />
            </FormField>
            <FormField
              label='Minimum Candidate Score'
              description='Heuristic score a supplier page must reach before the scan is trusted as a match.'
            >
              <Input
                type='number'
                min={1}
                max={20}
                step={1}
                value={draft.scanner1688.minimumCandidateScore}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((prev) => ({
                    ...prev,
                    scanner1688: {
                      ...prev.scanner1688,
                      minimumCandidateScore: Math.min(
                        20,
                        Math.max(
                          1,
                          toPositiveInteger(
                            event.target.value,
                            prev.scanner1688.minimumCandidateScore
                          )
                        )
                      ),
                    },
                  }));
                }}
                aria-label='1688 minimum candidate score'
                title='1688 minimum candidate score'
              />
            </FormField>
            <FormField
              label='Max Extracted Images'
              description='Cap how many supplier gallery images the scanner stores from the matched 1688 page.'
            >
              <Input
                type='number'
                min={1}
                max={20}
                step={1}
                value={draft.scanner1688.maxExtractedImages}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((prev) => ({
                    ...prev,
                    scanner1688: {
                      ...prev.scanner1688,
                      maxExtractedImages: Math.min(
                        20,
                        Math.max(
                          1,
                          toPositiveInteger(
                            event.target.value,
                            prev.scanner1688.maxExtractedImages
                          )
                        )
                      ),
                    },
                  }));
                }}
                aria-label='1688 max extracted images'
                title='1688 max extracted images'
              />
            </FormField>
            <FormField
              label='Image URL Fallback'
              description='Allow the scanner to try 1688 URL-based image search when a local product image file is unavailable.'
            >
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={draft.scanner1688.allowUrlImageSearchFallback}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraft((prev) => ({
                      ...prev,
                      scanner1688: {
                        ...prev.scanner1688,
                        allowUrlImageSearchFallback: event.target.checked,
                      },
                    }));
                  }}
                  aria-label='Allow 1688 image URL fallback'
                  title='Allow 1688 image URL fallback'
                />
                Try image URL fallback when no local file is available
              </label>
            </FormField>
          </div>

          <div className='mt-4 space-y-2 rounded-md border border-border/60 bg-background/70 px-3 py-3 text-xs text-muted-foreground'>
            <p className='font-medium uppercase tracking-wide text-foreground'>1688 Runtime Summary</p>
            <ul className='space-y-1'>
              <li>Collect up to {draft.scanner1688.candidateResultLimit} candidate supplier pages per scan.</li>
              <li>Require a heuristic match score of at least {draft.scanner1688.minimumCandidateScore} before trusting the strongest candidate.</li>
              <li>Store up to {draft.scanner1688.maxExtractedImages} supplier images from the matched page.</li>
              <li>
                {draft.scanner1688.allowUrlImageSearchFallback
                  ? 'URL-based 1688 image search fallback is enabled when no local image file is available.'
                  : 'URL-based 1688 image search fallback is disabled; scans require a local image file.'}
              </li>
            </ul>
          </div>
        </FormSection>

        <FormSection
          title='1688 Supplier Evaluator'
          description='Optional AI gate that reviews the strongest 1688 supplier candidate before the scan is trusted.'
          className='p-6'
        >
          <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
            <FormField
              label='Evaluator Mode'
              description='Choose whether the supplier evaluator uses the AI Brain default model or a scanner-specific override.'
            >
              <SelectSimple
                size='sm'
                value={draft.scanner1688CandidateEvaluator.mode}
                onValueChange={(value: string): void => {
                  setDraft((prev) => ({
                    ...prev,
                    scanner1688CandidateEvaluator: {
                      ...prev.scanner1688CandidateEvaluator,
                      mode:
                        value === 'brain_default' || value === 'model_override'
                          ? value
                          : 'disabled',
                    },
                  }));
                }}
                options={[...PRODUCT_SCANNER_1688_CANDIDATE_EVALUATOR_MODE_OPTIONS]}
                placeholder='Select evaluator mode'
                ariaLabel='Select 1688 supplier evaluator mode'
                title='Select 1688 supplier evaluator mode'
              />
            </FormField>
            <FormField
              label='Resolved Model'
              description='Current effective model for the 1688 supplier evaluator.'
            >
              <Input
                value={effective1688CandidateEvaluatorModel}
                readOnly
                aria-label='Resolved 1688 supplier evaluator model'
                title='Resolved 1688 supplier evaluator model'
              />
            </FormField>
            {draft.scanner1688CandidateEvaluator.mode === 'model_override' ? (
              <FormField
                label='Override Model'
                description='Choose a vision-capable model from the AI Brain catalog.'
              >
                <SelectSimple
                  size='sm'
                  value={draft.scanner1688CandidateEvaluator.modelId ?? ''}
                  onValueChange={(value: string): void => {
                    setDraft((prev) => ({
                      ...prev,
                      scanner1688CandidateEvaluator: {
                        ...prev.scanner1688CandidateEvaluator,
                        modelId: value.trim() || null,
                      },
                    }));
                  }}
                  options={[...supplier1688EvaluatorModelOptions]}
                  placeholder='Select evaluator model'
                  ariaLabel='Select 1688 supplier evaluator model'
                  title='Select 1688 supplier evaluator model'
                />
              </FormField>
            ) : null}
            <FormField
              label='Confidence Threshold'
              description='Minimum evaluator confidence required before a supplier candidate is trusted.'
            >
              <Input
                type='number'
                min={0}
                max={1}
                step={0.05}
                value={draft.scanner1688CandidateEvaluator.threshold}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((prev) => ({
                    ...prev,
                    scanner1688CandidateEvaluator: {
                      ...prev.scanner1688CandidateEvaluator,
                      threshold: toUnitInterval(
                        event.target.value,
                        prev.scanner1688CandidateEvaluator.threshold
                      ),
                    },
                  }));
                }}
                aria-label='1688 supplier evaluator confidence threshold'
                title='1688 supplier evaluator confidence threshold'
              />
            </FormField>
            <FormField
              label='Evaluation Scope'
              description='Run the evaluator only when the heuristic supplier match is still ambiguous.'
            >
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={draft.scanner1688CandidateEvaluator.onlyForAmbiguousCandidates}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraft((prev) => ({
                      ...prev,
                      scanner1688CandidateEvaluator: {
                        ...prev.scanner1688CandidateEvaluator,
                        onlyForAmbiguousCandidates: event.target.checked,
                      },
                    }));
                  }}
                  aria-label='Only evaluate ambiguous 1688 supplier candidates'
                  title='Only evaluate ambiguous 1688 supplier candidates'
                />
                Only evaluate ambiguous supplier candidates
              </label>
            </FormField>
          </div>

          <div className='mt-4 text-xs text-muted-foreground'>
            {brain1688ModelOptions.isLoading
              ? 'Loading AI Brain model options.'
              : brain1688ModelOptions.sourceWarnings[0] ||
                'The evaluator compares the source product image and the strongest 1688 supplier page before the scan is trusted.'}
          </div>

          <div className='mt-4 space-y-2 rounded-md border border-border/60 bg-background/70 px-3 py-3 text-xs text-muted-foreground'>
            <p className='font-medium uppercase tracking-wide text-foreground'>
              1688 Evaluator Summary
            </p>
            <ul className='space-y-1'>
              {evaluator1688SummaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <div className='mt-4 space-y-2 rounded-md border border-border/60 bg-muted/20 px-3 py-3 text-xs text-muted-foreground'>
            <p className='font-medium uppercase tracking-wide text-foreground'>
              1688 Evaluator Policy
            </p>
            <ul className='space-y-1'>
              {evaluator1688PolicyLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </FormSection>

        <Hint variant='info' className='rounded-md border border-blue-500/20 bg-blue-500/5 p-4'>
          Product scan settings are global. By default, Amazon scans start in a visible browser on
          the auto browser profile. The shortcut in the product Scans tab links here for
          convenience.
        </Hint>

        <FormActions
          onSave={() => {
            void handleSave();
          }}
          saveText={dirty ? 'Save Settings' : 'Saved'}
          isDisabled={!dirty || updateSetting.isPending}
          isSaving={updateSetting.isPending}
          className='justify-start border-t border-border pt-6'
        />
      </div>
    </AdminSettingsPageLayout>
  );
}
