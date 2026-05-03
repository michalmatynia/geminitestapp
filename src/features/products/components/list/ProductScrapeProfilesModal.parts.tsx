'use client';

import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfile,
  ProductScrapeProfileRunResponse,
  ProductScrapeSourcePriceCurrencyCode,
} from '@/shared/contracts/products/scrape-profiles';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { Alert } from '@/shared/ui/alert';

import { ProductScrapeProfilesResult } from './ProductScrapeProfilesModal.result';
import { ProductScrapeProfilesSourceCurrencyField } from './ProductScrapeProfilesModal.source-currency';
import { ProductScrapeProfileButton } from './ProductScrapeProfilesModal.profile-button';
import {
  ProductScrapeProfilesLimitField,
  ProductScrapeProfilesDraftTemplateField,
  ProductScrapeProfilesImageModeField,
  ProductScrapeProfilesDryRunField,
  type ProductScrapeDraftTemplateOption,
} from './ProductScrapeProfilesModal.form-fields';

type ProductScrapeProfilesBodyProps = {
  dryRun: boolean;
  error: Error | null;
  isLoading: boolean;
  isDraftTemplatesLoading: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  limitError: string | null;
  limitInput: string;
  draftTemplates: ProductDraft[];
  profiles: ProductScrapeProfile[];
  result: ProductScrapeProfileRunResponse | null;
  selectedDraftTemplateId: string;
  selectedProfileId: string;
  onDryRunChange: (value: boolean) => void;
  onDraftTemplateSelect: (draftTemplateId: string) => void;
  onImageImportModeChange: (mode: ProductScrapeProfileImageImportMode) => void;
  onSourcePriceCurrencyCodeChange: (code: ProductScrapeSourcePriceCurrencyCode) => void;
  onLimitInputChange: (value: string) => void;
  onProfileSelect: (profileId: string) => void;
};

type ProductScrapeProfilesFormProps = {
  dryRun: boolean;
  isDraftTemplatesLoading: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  sourcePriceCurrencyCode: ProductScrapeSourcePriceCurrencyCode;
  limitError: string | null;
  limitInput: string;
  draftTemplates: ProductDraft[];
  profiles: ProductScrapeProfile[];
  selectedDraftTemplateId: string;
  selectedProfileId: string;
  onDryRunChange: (value: boolean) => void;
  onDraftTemplateSelect: (draftTemplateId: string) => void;
  onImageImportModeChange: (mode: ProductScrapeProfileImageImportMode) => void;
  onSourcePriceCurrencyCodeChange: (code: ProductScrapeSourcePriceCurrencyCode) => void;
  onLimitInputChange: (value: string) => void;
  onProfileSelect: (profileId: string) => void;
};

const NO_DRAFT_TEMPLATE_VALUE = '__no_draft_template__';

const hasAssignedScrapeProfile = (draft: ProductDraft): boolean =>
  typeof draft.scrapeProfileId === 'string' && draft.scrapeProfileId.trim().length > 0;

const buildDraftTemplateOptions = (
  draftTemplates: ProductDraft[]
): ProductScrapeDraftTemplateOption[] => [
  { value: NO_DRAFT_TEMPLATE_VALUE, label: 'No template' },
  ...draftTemplates.map((draft) => ({
    value: draft.id,
    label: draft.name,
    description: hasAssignedScrapeProfile(draft) ? 'Profile specific' : 'Any scrape profile',
  })),
];

function ProductScrapeProfilesForm(props: ProductScrapeProfilesFormProps): React.JSX.Element {
  const {
    dryRun,
    isDraftTemplatesLoading,
    imageImportMode,
    sourcePriceCurrencyCode,
    limitError,
    limitInput,
    draftTemplates,
    profiles,
    selectedDraftTemplateId,
    selectedProfileId,
    onDryRunChange,
    onDraftTemplateSelect,
    onImageImportModeChange,
    onSourcePriceCurrencyCodeChange,
    onLimitInputChange,
    onProfileSelect,
  } = props;
  const draftTemplateOptions = buildDraftTemplateOptions(draftTemplates);
  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  return (
    <>
      <div className='grid gap-2 md:grid-cols-2'>
        {profiles.map((profile) => (
          <ProductScrapeProfileButton
            key={profile.id}
            profile={profile}
            selected={profile.id === selectedProfileId}
            onSelect={onProfileSelect}
          />
        ))}
      </div>
      <div className='grid gap-4 rounded-md border border-border/60 bg-card/35 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]'>
        <ProductScrapeProfilesLimitField
          limitError={limitError}
          limitInput={limitInput}
          onLimitInputChange={onLimitInputChange}
        />
        <ProductScrapeProfilesDraftTemplateField
          isDraftTemplatesLoading={isDraftTemplatesLoading}
          selectedDraftTemplateId={selectedDraftTemplateId}
          draftTemplateOptions={draftTemplateOptions}
          onDraftTemplateSelect={onDraftTemplateSelect}
        />
        <ProductScrapeProfilesImageModeField
          imageImportMode={imageImportMode}
          onImageImportModeChange={onImageImportModeChange}
        />
        <ProductScrapeProfilesSourceCurrencyField
          selectedProfile={selectedProfile}
          sourcePriceCurrencyCode={sourcePriceCurrencyCode}
          onSourcePriceCurrencyCodeChange={onSourcePriceCurrencyCodeChange}
        />
        <ProductScrapeProfilesDryRunField dryRun={dryRun} onDryRunChange={onDryRunChange} />
      </div>
    </>
  );
}

export function ProductScrapeProfilesBody(props: ProductScrapeProfilesBodyProps): React.JSX.Element {
  const { error, isLoading, profiles, result, ...formProps } = props;
  let mainContent: React.JSX.Element;
  if (isLoading) {
    mainContent = <div className='text-sm text-muted-foreground'>Loading scrape profiles...</div>;
  } else if (error !== null) {
    mainContent = (
      <Alert variant='error' title='Scrape profiles unavailable' description={error.message} />
    );
  } else if (profiles.length === 0) {
    mainContent = (
      <Alert
        variant='warning'
        title='No scrape profiles'
        description='No product scrape profiles are configured.'
      />
    );
  } else {
    mainContent = <ProductScrapeProfilesForm profiles={profiles} {...formProps} />;
  }

  return (
    <div className='space-y-5'>
      {mainContent}
      {result !== null ? <ProductScrapeProfilesResult result={result} /> : null}
    </div>
  );
}
