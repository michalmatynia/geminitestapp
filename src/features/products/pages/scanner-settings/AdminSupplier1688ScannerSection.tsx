import type { ChangeEvent, JSX } from 'react';

import { FormField, FormSection } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/layout';
import { Input } from '@/shared/ui/primitives.public';

import type { ProductScannerSettingsDraft } from '../../scanner-settings';
import { toPositiveInteger } from './adminProductScannerSettings.copy';
import type { ScannerDraftSetter } from './adminProductScannerSettings.types';

const update1688Settings = (
  setDraft: ScannerDraftSetter,
  patch: Partial<ProductScannerSettingsDraft['scanner1688']>
): void => {
  setDraft((prev) => ({ ...prev, scanner1688: { ...prev.scanner1688, ...patch } }));
};

const clamp1688Integer = (value: string, fallback: number): number =>
  Math.min(20, Math.max(1, toPositiveInteger(value, fallback)));

const NumberField = (props: {
  label: string;
  description: string;
  ariaLabel: string;
  value: number;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}): JSX.Element => (
  <FormField label={props.label} description={props.description}>
    <Input
      type='number'
      min={1}
      max={20}
      step={1}
      value={props.value}
      onChange={props.onChange}
      aria-label={props.ariaLabel}
      title={props.ariaLabel}
    />
  </FormField>
);

export const AdminSupplier1688ScannerSection = (props: {
  draft: ProductScannerSettingsDraft;
  setDraft: ScannerDraftSetter;
}): JSX.Element => (
  <FormSection title='1688 Supplier Scanner' description='Tune candidate collection and extraction breadth for the 1688 reverse-image scanner.' className='p-6'>
    <div className={`${UI_GRID_ROOMY_CLASSNAME} md:grid-cols-2`}>
      <NumberField label='Candidate Result Limit' description='Maximum number of 1688 supplier product candidates collected from one image-search pass.' ariaLabel='1688 candidate result limit' value={props.draft.scanner1688.candidateResultLimit} onChange={(event) => update1688Settings(props.setDraft, { candidateResultLimit: clamp1688Integer(event.target.value, props.draft.scanner1688.candidateResultLimit) })} />
      <NumberField label='Minimum Candidate Score' description='Heuristic score a supplier page must reach before the scan is trusted as a match.' ariaLabel='1688 minimum candidate score' value={props.draft.scanner1688.minimumCandidateScore} onChange={(event) => update1688Settings(props.setDraft, { minimumCandidateScore: clamp1688Integer(event.target.value, props.draft.scanner1688.minimumCandidateScore) })} />
      <NumberField label='Max Extracted Images' description='Cap how many supplier gallery images the scanner stores from the matched 1688 page.' ariaLabel='1688 max extracted images' value={props.draft.scanner1688.maxExtractedImages} onChange={(event) => update1688Settings(props.setDraft, { maxExtractedImages: clamp1688Integer(event.target.value, props.draft.scanner1688.maxExtractedImages) })} />
      <FormField label='Image URL Fallback' description='Allow the scanner to try 1688 URL-based image search when a local product image file is unavailable.'>
        <label className='inline-flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={props.draft.scanner1688.allowUrlImageSearchFallback}
            onChange={(event: ChangeEvent<HTMLInputElement>) => update1688Settings(props.setDraft, { allowUrlImageSearchFallback: event.target.checked })}
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
        <li>Collect up to {props.draft.scanner1688.candidateResultLimit} candidate supplier pages per scan.</li>
        <li>Require a heuristic match score of at least {props.draft.scanner1688.minimumCandidateScore} before trusting the strongest candidate.</li>
        <li>Store up to {props.draft.scanner1688.maxExtractedImages} supplier images from the matched page.</li>
        <li>
          {props.draft.scanner1688.allowUrlImageSearchFallback
            ? 'URL-based 1688 image search fallback is enabled when no local image file is available.'
            : 'URL-based 1688 image search fallback is disabled; scans require a local image file.'}
        </li>
      </ul>
    </div>
  </FormSection>
);
