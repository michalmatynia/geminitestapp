'use client';

import { CheckCircle2, Globe2, TriangleAlert } from 'lucide-react';

import type {
  ProductScrapeProfile,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import { Alert } from '@/shared/ui/alert';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { cn } from '@/shared/utils/ui-utils';

import { ProductScrapeProfilesResult } from './ProductScrapeProfilesModal.result';

type ProductScrapeProfilesBodyProps = {
  dryRun: boolean;
  error: Error | null;
  isLoading: boolean;
  isDraftTemplatesLoading: boolean;
  limitError: string | null;
  limitInput: string;
  draftTemplates: ProductDraft[];
  profiles: ProductScrapeProfile[];
  result: ProductScrapeProfileRunResponse | null;
  selectedDraftTemplateId: string;
  selectedProfileId: string;
  onDryRunChange: (value: boolean) => void;
  onDraftTemplateSelect: (draftTemplateId: string) => void;
  onLimitInputChange: (value: string) => void;
  onProfileSelect: (profileId: string) => void;
};

type ProductScrapeProfilesFormProps = {
  dryRun: boolean;
  isDraftTemplatesLoading: boolean;
  limitError: string | null;
  limitInput: string;
  draftTemplates: ProductDraft[];
  profiles: ProductScrapeProfile[];
  selectedDraftTemplateId: string;
  selectedProfileId: string;
  onDryRunChange: (value: boolean) => void;
  onDraftTemplateSelect: (draftTemplateId: string) => void;
  onLimitInputChange: (value: string) => void;
  onProfileSelect: (profileId: string) => void;
};

const NO_DRAFT_TEMPLATE_VALUE = '__no_draft_template__';

type ProductScrapeDraftTemplateOption = {
  value: string;
  label: string;
  description?: string;
};

const profileMeta = (profile: ProductScrapeProfile): string =>
  [
    profile.targetCatalogName,
    profile.maxPages !== null ? `${profile.maxPages} pages` : null,
    profile.defaultLimit !== null ? `${profile.defaultLimit} products` : null,
  ]
    .filter((entry): entry is string => entry !== null)
    .join(' / ');

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

function ProductScrapeProfileButton(props: {
  profile: ProductScrapeProfile;
  selected: boolean;
  onSelect: (profileId: string) => void;
}): React.JSX.Element {
  const { profile, selected, onSelect } = props;
  return (
    <button
      type='button'
      onClick={() => onSelect(profile.id)}
      className={cn(
        'rounded-md border p-3 text-left transition-colors',
        selected ? 'border-blue-400/60 bg-blue-500/10' : 'border-border/60 bg-card/35 hover:bg-card/55'
      )}
      aria-pressed={selected}
    >
      <div className='flex items-start gap-2'>
        <Globe2 className='mt-0.5 size-4 shrink-0 text-blue-300' aria-hidden='true' />
        <div className='min-w-0 flex-1'>
          <div className='truncate text-sm font-medium text-foreground'>{profile.label}</div>
          <div className='mt-1 text-xs text-muted-foreground'>{profile.siteHost}</div>
          <div className='mt-2 text-[11px] text-muted-foreground'>{profileMeta(profile)}</div>
        </div>
        {selected ? (
          <CheckCircle2 className='size-4 shrink-0 text-emerald-300' aria-hidden='true' />
        ) : null}
      </div>
    </button>
  );
}

function ProductScrapeProfilesLimitField({
  limitError,
  limitInput,
  onLimitInputChange,
}: Pick<
  ProductScrapeProfilesFormProps,
  'limitError' | 'limitInput' | 'onLimitInputChange'
>): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='product-scrape-profile-limit'>Limit</Label>
      <Input
        id='product-scrape-profile-limit'
        value={limitInput}
        onChange={(event) => onLimitInputChange(event.target.value)}
        placeholder='All products'
        inputMode='numeric'
        aria-invalid={limitError !== null ? 'true' : undefined}
      />
      {limitError !== null ? (
        <div className='flex items-center gap-1 text-xs text-red-300'>
          <TriangleAlert className='size-3' aria-hidden='true' />
          {limitError}
        </div>
      ) : null}
    </div>
  );
}

function ProductScrapeProfilesDraftTemplateField({
  isDraftTemplatesLoading,
  selectedDraftTemplateId,
  draftTemplateOptions,
  onDraftTemplateSelect,
}: Pick<
  ProductScrapeProfilesFormProps,
  'isDraftTemplatesLoading' | 'selectedDraftTemplateId' | 'onDraftTemplateSelect'
> & {
  draftTemplateOptions: ProductScrapeDraftTemplateOption[];
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='product-scrape-profile-draft-template'>Draft template</Label>
      <SelectSimple
        id='product-scrape-profile-draft-template'
        size='sm'
        options={draftTemplateOptions}
        value={
          selectedDraftTemplateId.length > 0
            ? selectedDraftTemplateId
            : NO_DRAFT_TEMPLATE_VALUE
        }
        onValueChange={(value): void =>
          onDraftTemplateSelect(value === NO_DRAFT_TEMPLATE_VALUE ? '' : value)
        }
        placeholder={isDraftTemplatesLoading ? 'Loading templates...' : 'No template'}
        ariaLabel='Select scrape draft template'
        title='Select scrape draft template'
        disabled={isDraftTemplatesLoading}
      />
    </div>
  );
}

function ProductScrapeProfilesDryRunField({
  dryRun,
  onDryRunChange,
}: Pick<ProductScrapeProfilesFormProps, 'dryRun' | 'onDryRunChange'>): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 self-end pb-2'>
      <Checkbox
        id='product-scrape-profile-dry-run'
        checked={dryRun}
        onCheckedChange={(checked) => onDryRunChange(checked === true)}
      />
      <Label htmlFor='product-scrape-profile-dry-run'>Dry run</Label>
    </div>
  );
}

function ProductScrapeProfilesForm(
  props: ProductScrapeProfilesFormProps
): React.JSX.Element {
  const {
    dryRun,
    isDraftTemplatesLoading,
    limitError,
    limitInput,
    draftTemplates,
    profiles,
    selectedDraftTemplateId,
    selectedProfileId,
    onDryRunChange,
    onDraftTemplateSelect,
    onLimitInputChange,
    onProfileSelect,
  } = props;
  const draftTemplateOptions = buildDraftTemplateOptions(draftTemplates);
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
      <div className='grid gap-4 rounded-md border border-border/60 bg-card/35 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]'>
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
        <ProductScrapeProfilesDryRunField dryRun={dryRun} onDryRunChange={onDryRunChange} />
      </div>
    </>
  );
}

export function ProductScrapeProfilesBody(
  props: ProductScrapeProfilesBodyProps
): React.JSX.Element {
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
