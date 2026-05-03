import Link from 'next/link';
import type { ChangeEvent, JSX } from 'react';

import { PlaywrightSettingsForm } from '@/features/playwright/ui.public';
import { Button } from '@/shared/ui/button';
import { FormField, FormSection, Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';
import { Input } from '@/shared/ui/primitives.public';

import {
  PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER_OPTIONS,
  PRODUCT_SCANNER_BROWSER_OPTIONS,
  PRODUCT_SCANNER_CAPTCHA_BEHAVIOR_OPTIONS,
  resolveProductScannerSettingsBaseline,
  type ProductScannerSettingsDraft,
} from '../../scanner-settings';
import {
  AMAZON_IMAGE_SEARCH_PAGE_OPTIONS,
  CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE,
  CUSTOM_PERSONA_VALUE,
  resolveAmazonImageSearchPageSelectValue,
  toPositiveInteger,
} from './adminProductScannerSettings.copy';
import type { ScannerDraftSetter, SelectOption } from './adminProductScannerSettings.types';

const AMAZON_IMAGE_SEARCH_FALLBACK_PROVIDER_OPTIONS = [
  { value: '', label: 'Disabled' },
  ...PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER_OPTIONS,
];

const resolveBrowser = (value: string): ProductScannerSettingsDraft['playwrightBrowser'] => {
  if (value === 'brave' || value === 'chrome' || value === 'chromium') return value;
  return 'auto';
};

const resolveAmazonProvider = (
  value: string
): ProductScannerSettingsDraft['amazonImageSearchProvider'] => {
  if (value === 'google_images_url' || value === 'google_lens_upload') return value;
  return 'google_images_upload';
};

const resolveAmazonFallbackProvider = (
  value: string
): ProductScannerSettingsDraft['amazonImageSearchFallbackProvider'] => {
  if (value === 'google_images_upload' || value === 'google_images_url') return value;
  if (value === 'google_lens_upload') return value;
  return null;
};

const RuntimePersonaField = (props: {
  draft: ProductScannerSettingsDraft;
  personaOptions: SelectOption[];
  personas: Parameters<typeof resolveProductScannerSettingsBaseline>[0];
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <FormField label='Playwright Persona' description='Optional shared baseline for headless mode, delays, proxy, and device profile.'>
    <SelectSimple
      size='sm'
      value={props.draft.playwrightPersonaId ?? CUSTOM_PERSONA_VALUE}
      onValueChange={(value: string): void => {
        const nextPersonaId = value === CUSTOM_PERSONA_VALUE ? null : value;
        const baseline = resolveProductScannerSettingsBaseline(props.personas, nextPersonaId);
        props.setDraft((prev) => ({
          ...prev,
          playwrightPersonaId: nextPersonaId,
          playwrightSettings: baseline,
        }));
      }}
      options={props.personaOptions}
      placeholder='Select persona'
      ariaLabel='Select scanner persona'
      title='Select scanner persona'
    />
  </FormField>
);

const RuntimeSelectField = (props: {
  label: string;
  description: string;
  value: string;
  options: SelectOption[];
  ariaLabel: string;
  onValueChange: (value: string) => void;
}): JSX.Element => (
  <FormField label={props.label} description={props.description}>
    <SelectSimple
      size='sm'
      value={props.value}
      onValueChange={props.onValueChange}
      options={props.options}
      placeholder={props.label}
      ariaLabel={props.ariaLabel}
      title={props.ariaLabel}
    />
  </FormField>
);

const AmazonImageSearchPageField = (props: {
  draft: ProductScannerSettingsDraft;
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <FormField label='Image Search Page' description='Choose the reverse-image search page to open for Amazon scans. A scan attempt uses one page; fallback providers start a separate retry.'>
    <div className='space-y-2'>
      <SelectSimple
        size='sm'
        value={resolveAmazonImageSearchPageSelectValue(props.draft.amazonImageSearchPageUrl)}
        onValueChange={(value: string): void => updateAmazonImageSearchPage(props.setDraft, value)}
        options={[...AMAZON_IMAGE_SEARCH_PAGE_OPTIONS]}
        placeholder='Select image search page'
        ariaLabel='Select Amazon image search page'
        title='Select Amazon image search page'
      />
      <Input
        type='url'
        value={props.draft.amazonImageSearchPageUrl}
        onChange={(event: ChangeEvent<HTMLInputElement>): void => {
          props.setDraft((prev) => ({ ...prev, amazonImageSearchPageUrl: event.target.value }));
        }}
        placeholder='https://lens.google.com/?hl=en'
        aria-label='Amazon image search page URL'
        title='Amazon image search page URL'
      />
      <Hint>Presets write the URL above. Editing the URL switches the selection to Custom URL.</Hint>
    </div>
  </FormField>
);

const updateAmazonImageSearchPage = (setDraft: ScannerDraftSetter, value: string): void => {
  setDraft((prev) => {
    if (value === CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE) {
      const current = resolveAmazonImageSearchPageSelectValue(prev.amazonImageSearchPageUrl);
      return { ...prev, amazonImageSearchPageUrl: current === value ? prev.amazonImageSearchPageUrl : '' };
    }
    const preset = AMAZON_IMAGE_SEARCH_PAGE_OPTIONS.some((option) => option.value === value);
    return { ...prev, amazonImageSearchPageUrl: preset ? value : '' };
  });
};

const ManualTimeoutField = (props: {
  draft: ProductScannerSettingsDraft;
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <FormField label='Manual Verification Timeout (ms)' description='How long a visible-browser scan should wait for captcha resolution before failing.'>
    <Input
      type='number'
      min={1}
      step={1}
      value={props.draft.manualVerificationTimeoutMs}
      onChange={(event: ChangeEvent<HTMLInputElement>): void => {
        props.setDraft((prev) => ({
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
);

export const AdminScannerRuntimeSection = (props: {
  draft: ProductScannerSettingsDraft;
  setDraft: ScannerDraftSetter;
  personaOptions: SelectOption[];
  personas: Parameters<typeof resolveProductScannerSettingsBaseline>[0];
  selectedPersona: { name: string } | null;
}): JSX.Element => (
  <>
    <FormSection title='Scanner Runtime' description='These settings apply to product scan jobs started from the products workspace.' className='p-6'>
      <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
        <RuntimePersonaField {...props} />
        <RuntimeSelectField label='Browser' description='Which Chromium-based browser the scanner should launch.' value={props.draft.playwrightBrowser} options={[...PRODUCT_SCANNER_BROWSER_OPTIONS]} ariaLabel='Select scanner browser' onValueChange={(value) => props.setDraft((prev) => ({ ...prev, playwrightBrowser: resolveBrowser(value) }))} />
        <RuntimeSelectField label='Captcha Handling' description='Choose whether Google Lens captcha pages should reopen in a visible browser and wait for manual resolution.' value={props.draft.captchaBehavior} options={[...PRODUCT_SCANNER_CAPTCHA_BEHAVIOR_OPTIONS]} ariaLabel='Select scanner captcha handling' onValueChange={(value) => props.setDraft((prev) => ({ ...prev, captchaBehavior: value === 'fail' ? 'fail' : 'auto_show_browser' }))} />
        <RuntimeSelectField label='Amazon Image Search Provider' description='Choose the upload method Amazon reverse-image scans should use.' value={props.draft.amazonImageSearchProvider} options={[...PRODUCT_SCANNER_AMAZON_IMAGE_SEARCH_PROVIDER_OPTIONS]} ariaLabel='Select Amazon image search provider' onValueChange={(value) => props.setDraft((prev) => ({ ...prev, amazonImageSearchProvider: resolveAmazonProvider(value) }))} />
        <AmazonImageSearchPageField draft={props.draft} setDraft={props.setDraft} />
        <RuntimeSelectField label='Fallback Search Provider' description='Optional backup Google entry flow when AI triage recommends switching providers.' value={props.draft.amazonImageSearchFallbackProvider ?? ''} options={[...AMAZON_IMAGE_SEARCH_FALLBACK_PROVIDER_OPTIONS]} ariaLabel='Select Amazon image search fallback provider' onValueChange={(value) => props.setDraft((prev) => ({ ...prev, amazonImageSearchFallbackProvider: resolveAmazonFallbackProvider(value) }))} />
        <ManualTimeoutField draft={props.draft} setDraft={props.setDraft} />
      </div>
      <div className='mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground'>
        <span>{props.selectedPersona !== null ? `Using persona baseline: ${props.selectedPersona.name}` : 'Using custom scanner settings only.'}</span>
        <Button variant='outline' size='sm' asChild>
          <Link href='/admin/settings/playwright'>Manage personas</Link>
        </Button>
      </div>
    </FormSection>
    <FormSection className='p-0'>
      <PlaywrightSettingsForm
        settings={props.draft.playwrightSettings}
        setSettings={(nextSettings) => {
          props.setDraft((prev) => ({
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
  </>
);
