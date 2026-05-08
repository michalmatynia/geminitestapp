'use client';

import Link from 'next/link';

import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfile,
  ProductScrapeProfileRuntimeRun,
  ProductScrapeProfileRunQueuedResponse,
  ProductScrapeProfileRunResponse,
  ProductScrapeSourcePriceCurrencyCode,
} from '@/shared/contracts/products/scrape-profiles';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { ToggleRow } from '@/shared/ui/forms-and-actions.public';

import {
  ProductScrapeProfilesRuntimeRun,
  ProductScrapeProfilesQueuedRun,
  ProductScrapeProfilesResult,
} from './ProductScrapeProfilesModal.result';
import { ProductScrapeProfilesSourceCurrencyField } from './ProductScrapeProfilesModal.source-currency';
import { ProductScrapeProfileButton } from './ProductScrapeProfilesModal.profile-button';
import {
  ProductScrapeProfilesLimitField,
  ProductScrapeProfilesDraftTemplateField,
  ProductScrapeProfilesImageModeField,
  ProductScrapeProfilesDryRunField,
  type ProductScrapeDraftTemplateOption,
} from './ProductScrapeProfilesModal.form-fields';
import type { ProductScrapeProfileRuntimeActionSetting } from './useProductScrapeProfileRuntimeActionSetting';

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
  activeRun: ProductScrapeProfileRuntimeRun | null;
  queuedRun: ProductScrapeProfileRunQueuedResponse | null;
  result: ProductScrapeProfileRunResponse | null;
  runtimeAction: ProductScrapeProfileRuntimeActionSetting;
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
  runtimeAction: ProductScrapeProfileRuntimeActionSetting;
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

const formatRuntimeActionUpdatedAt = (value: string): string | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function ProductScrapeProfilesRuntimeActionCard({
  runtimeAction,
}: {
  runtimeAction: ProductScrapeProfileRuntimeActionSetting;
}): React.JSX.Element | null {
  const action = runtimeAction.action;
  if (action === null) return null;
  const actionUpdatedAt = formatRuntimeActionUpdatedAt(action.updatedAt);

  return (
    <div className='rounded-md border border-border/60 bg-muted/10 p-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='min-w-0 space-y-1'>
          <p className='text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'>
            Connected scraping action
          </p>
          <div className='flex flex-wrap items-center gap-2'>
            <Link
              href={resolveStepSequencerActionHref(action.id)}
              className='text-sm font-medium underline-offset-4 hover:underline'
            >
              {action.name}
            </Link>
            <Badge variant='secondary'>{action.runtimeKey}</Badge>
            {action.isSeedFallback ? (
              <Badge variant='outline'>Seed default</Badge>
            ) : (
              <Badge variant='success'>Saved action</Badge>
            )}
          </div>
          {action.description !== null ? (
            <p className='max-w-3xl text-xs text-muted-foreground'>{action.description}</p>
          ) : null}
        </div>
        <Badge variant='secondary'>{action.browserModeLabel}</Badge>
      </div>
      <div className='mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground'>
        <span>Action ID: {action.id}</span>
        <span>
          Steps: {action.enabledStepCount}/{action.totalStepCount}
        </span>
        {actionUpdatedAt !== null ? <span>Updated: {actionUpdatedAt}</span> : null}
      </div>
    </div>
  );
}

function ProductScrapeProfileSelector({
  profiles,
  selectedProfileId,
  onProfileSelect,
}: {
  profiles: ProductScrapeProfile[];
  selectedProfileId: string;
  onProfileSelect: (profileId: string) => void;
}): React.JSX.Element {
  return (
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
  );
}

function ProductScrapeProfilesRuntimeActionToggle({
  runtimeAction,
}: {
  runtimeAction: ProductScrapeProfileRuntimeActionSetting;
}): React.JSX.Element | null {
  if (runtimeAction.action === null) return null;
  return (
    <ToggleRow
      label='Action browser mode'
      description='Mirrors the connected Playwright runtime action settings.'
      checked={runtimeAction.headless}
      onCheckedChange={runtimeAction.setHeadless}
      loading={runtimeAction.isLoading || runtimeAction.isSaving}
      variant='switch'
      toggleOnRowClick
    >
      <div className='pt-1 text-[11px] font-medium text-foreground'>
        Current: {runtimeAction.headless ? 'Headless' : 'Headed'}
      </div>
    </ToggleRow>
  );
}

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
    runtimeAction,
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
      <ProductScrapeProfileSelector
        profiles={profiles}
        selectedProfileId={selectedProfileId}
        onProfileSelect={onProfileSelect}
      />
      <ProductScrapeProfilesRuntimeActionCard runtimeAction={runtimeAction} />
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
      <ProductScrapeProfilesRuntimeActionToggle runtimeAction={runtimeAction} />
    </>
  );
}

export function ProductScrapeProfilesBody(props: ProductScrapeProfilesBodyProps): React.JSX.Element {
  const { activeRun, error, isLoading, profiles, queuedRun, result, ...formProps } = props;
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

  let runtimeContent: React.JSX.Element | null = null;
  if (activeRun !== null) {
    runtimeContent = <ProductScrapeProfilesRuntimeRun run={activeRun} />;
  } else if (queuedRun !== null) {
    runtimeContent = <ProductScrapeProfilesQueuedRun queuedRun={queuedRun} />;
  }

  return (
    <div className='space-y-5'>
      {mainContent}
      {runtimeContent}
      {result !== null ? <ProductScrapeProfilesResult result={result} /> : null}
    </div>
  );
}
