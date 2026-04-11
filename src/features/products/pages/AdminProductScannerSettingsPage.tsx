'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';

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

export function AdminProductScannerSettingsPage(): React.JSX.Element {
  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();
  const personasQuery = usePlaywrightPersonas();
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
