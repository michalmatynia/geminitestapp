'use client';

import { TriangleAlert } from 'lucide-react';
import type {
  ProductScrapeProfileImageImportMode,
} from '@/shared/contracts/products/scrape-profiles';

import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

const NO_DRAFT_TEMPLATE_VALUE = '__no_draft_template__';

export type ProductScrapeDraftTemplateOption = {
  value: string;
  label: string;
  description?: string;
};

export function ProductScrapeProfilesLimitField({
  limitError,
  limitInput,
  onLimitInputChange,
}: {
  limitError: string | null;
  limitInput: string;
  onLimitInputChange: (value: string) => void;
}): React.JSX.Element {
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

export function ProductScrapeProfilesDraftTemplateField({
  isDraftTemplatesLoading,
  selectedDraftTemplateId,
  draftTemplateOptions,
  onDraftTemplateSelect,
}: {
  isDraftTemplatesLoading: boolean;
  selectedDraftTemplateId: string;
  draftTemplateOptions: ProductScrapeDraftTemplateOption[];
  onDraftTemplateSelect: (draftTemplateId: string) => void;
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

export function ProductScrapeProfilesImageModeField({
  imageImportMode,
  onImageImportModeChange,
}: {
  imageImportMode: ProductScrapeProfileImageImportMode;
  onImageImportModeChange: (mode: ProductScrapeProfileImageImportMode) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <Label htmlFor='product-scrape-profile-image-mode'>Images</Label>
      <SelectSimple
        id='product-scrape-profile-image-mode'
        size='sm'
        options={[
          { value: 'links', label: 'Keep image links' },
          { value: 'files', label: 'Download as files' },
        ]}
        value={imageImportMode}
        onValueChange={(value): void =>
          onImageImportModeChange(value === 'files' ? 'files' : 'links')
        }
        placeholder='Keep image links'
        ariaLabel='Select scrape image import mode'
        title='Select scrape image import mode'
      />
      <p className='text-xs text-muted-foreground'>
        File mode downloads scraped images and attaches them to the product record.
      </p>
    </div>
  );
}

export function ProductScrapeProfilesDryRunField({
  dryRun,
  onDryRunChange,
}: {
  dryRun: boolean;
  onDryRunChange: (value: boolean) => void;
}): React.JSX.Element {
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
