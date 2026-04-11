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

export function AdminProductScannerSettingsPage(): React.JSX.Element {
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();
  const personasQuery = usePlaywrightPersonas();
  const brainModelOptions = useBrainModelOptions({
    capability: 'product.scan.amazon_candidate_match',
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
  const effectiveAmazonCandidateEvaluatorModel =
    draft.amazonCandidateEvaluator.mode === 'disabled'
      ? 'Disabled'
      : draft.amazonCandidateEvaluator.mode === 'brain_default'
        ? brainModelOptions.effectiveModelId.trim() || 'Not configured in AI Brain'
        : draft.amazonCandidateEvaluator.modelId?.trim() || 'Select a model';
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
          title='Amazon Candidate Evaluator'
          description='Optional AI gate that reviews the Amazon page before trusting extracted data.'
          className='p-6'
        >
          <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
            <FormField
              label='Evaluator Mode'
              description='Choose whether this scanner step uses the AI Brain default model or a scanner-specific override.'
            >
              <SelectSimple
                size='sm'
                value={draft.amazonCandidateEvaluator.mode}
                onValueChange={(value: string): void => {
                  setDraft((prev) => ({
                    ...prev,
                    amazonCandidateEvaluator: {
                      ...prev.amazonCandidateEvaluator,
                      mode:
                        value === 'brain_default' || value === 'model_override'
                          ? value
                          : 'disabled',
                    },
                  }));
                }}
                options={[...PRODUCT_SCANNER_AMAZON_CANDIDATE_EVALUATOR_MODE_OPTIONS]}
                placeholder='Select evaluator mode'
                ariaLabel='Select Amazon candidate evaluator mode'
                title='Select Amazon candidate evaluator mode'
              />
            </FormField>
            <FormField
              label='Resolved Model'
              description='Current effective model for the evaluator checkpoint.'
            >
              <Input
                value={effectiveAmazonCandidateEvaluatorModel}
                readOnly
                aria-label='Resolved Amazon candidate evaluator model'
                title='Resolved Amazon candidate evaluator model'
              />
            </FormField>
            {draft.amazonCandidateEvaluator.mode === 'model_override' ? (
              <FormField
                label='Override Model'
                description='Choose a vision-capable model from the AI Brain catalog.'
              >
                <SelectSimple
                  size='sm'
                  value={draft.amazonCandidateEvaluator.modelId ?? ''}
                  onValueChange={(value: string): void => {
                    setDraft((prev) => ({
                      ...prev,
                      amazonCandidateEvaluator: {
                        ...prev.amazonCandidateEvaluator,
                        modelId: value.trim() || null,
                      },
                    }));
                  }}
                  options={[...amazonCandidateEvaluatorModelOptions]}
                  placeholder='Select evaluator model'
                  ariaLabel='Select Amazon candidate evaluator model'
                  title='Select Amazon candidate evaluator model'
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
                value={draft.amazonCandidateEvaluator.threshold}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                  setDraft((prev) => ({
                    ...prev,
                    amazonCandidateEvaluator: {
                      ...prev.amazonCandidateEvaluator,
                      threshold: toUnitInterval(
                        event.target.value,
                        prev.amazonCandidateEvaluator.threshold
                      ),
                    },
                  }));
                }}
                aria-label='Amazon candidate evaluator confidence threshold'
                title='Amazon candidate evaluator confidence threshold'
              />
            </FormField>
            <FormField
              label='Evaluation Scope'
              description='Run the evaluator only when Amazon candidates are ambiguous.'
            >
              <label className='inline-flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  checked={draft.amazonCandidateEvaluator.onlyForAmbiguousCandidates}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    setDraft((prev) => ({
                      ...prev,
                      amazonCandidateEvaluator: {
                        ...prev.amazonCandidateEvaluator,
                        onlyForAmbiguousCandidates: event.target.checked,
                      },
                    }));
                  }}
                  aria-label='Only evaluate ambiguous Amazon candidates'
                  title='Only evaluate ambiguous Amazon candidates'
                />
                Only evaluate ambiguous candidates
              </label>
            </FormField>
          </div>

          <div className='mt-4 text-xs text-muted-foreground'>
            {brainModelOptions.isLoading
              ? 'Loading AI Brain model options.'
              : brainModelOptions.sourceWarnings[0] ||
                'The evaluator compares the Amazon page image and text against the product in your app before extraction is trusted.'}
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
