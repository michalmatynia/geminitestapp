import { ExternalLink } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import { Button } from '@/shared/ui/button';

import {
  AMAZON_IMAGE_SEARCH_PAGE_OPTIONS,
  CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE,
} from './ProductScanModal.constants';
import { resolveAmazonImageSearchPageSelectValue } from './ProductScanModal.helpers';
import type { ProductScanModalProvider } from './ProductScanModal.types';

type AmazonSelectorRegistryQueryState = {
  data?: { profiles?: string[] };
  isError: boolean;
  isLoading: boolean;
};

type AmazonSelectorProfilePanelProps = {
  provider: ProductScanModalProvider;
  isSubmitting: boolean;
  amazonSelectorProfile: string;
  setAmazonSelectorProfile: Dispatch<SetStateAction<string>>;
  amazonSelectorProfileOptions: string[];
  amazonSelectorRegistryQuery: AmazonSelectorRegistryQueryState;
  amazonImageSearchPageUrl: string;
  amazonImageSearchPageDraftUrl: string;
  setAmazonImageSearchPageDraftUrl: Dispatch<SetStateAction<string>>;
  setAmazonImageSearchPageUrl: Dispatch<SetStateAction<string>>;
};

const openAmazonSelectorRegistry = (): void => {
  window.open('/admin/integrations/amazon/selectors', '_blank', 'noopener,noreferrer');
};

const formatSelectorProfileAvailability = (
  isLoading: boolean,
  profileCount: number
): string => {
  if (isLoading) return ' Loading profiles...';
  return ` ${profileCount} profile${profileCount === 1 ? '' : 's'} available.`;
};

const resolveCustomDraftUrl = (current: string): string => {
  if (resolveAmazonImageSearchPageSelectValue(current) === CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE) {
    return current;
  }
  return '';
};

const resolvePresetDraftUrl = (value: string): string => {
  if (AMAZON_IMAGE_SEARCH_PAGE_OPTIONS.some((option) => option.value === value)) {
    return value;
  }
  return '';
};

function AmazonProfileSelect(props: AmazonSelectorProfilePanelProps): React.JSX.Element {
  return (
    <select
      value={props.amazonSelectorProfile}
      onChange={(event): void => {
        props.setAmazonSelectorProfile(event.target.value);
      }}
      disabled={props.isSubmitting === true}
      className='h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none transition focus:border-primary'
    >
      {props.amazonSelectorProfileOptions.map((profileOption) => (
        <option key={profileOption} value={profileOption}>
          {profileOption}
        </option>
      ))}
    </select>
  );
}

function AmazonImageSearchPageControls(
  props: AmazonSelectorProfilePanelProps
): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <div className='space-y-1'>
        <div className='font-medium text-white'>Image search page</div>
        <div>Choose the reverse-image page for this batch. Leave built-in to use the scanner settings page.</div>
      </div>
      <select
        value={resolveAmazonImageSearchPageSelectValue(props.amazonImageSearchPageDraftUrl)}
        onChange={(event): void => {
          const value = event.target.value;
          if (value === CUSTOM_AMAZON_IMAGE_SEARCH_PAGE_VALUE) {
            props.setAmazonImageSearchPageDraftUrl(resolveCustomDraftUrl);
            return;
          }
          props.setAmazonImageSearchPageDraftUrl(resolvePresetDraftUrl(value));
        }}
        disabled={props.isSubmitting === true}
        aria-label='Select Amazon image search page'
        className='h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none transition focus:border-primary'
      >
        {AMAZON_IMAGE_SEARCH_PAGE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <input
        type='url'
        value={props.amazonImageSearchPageDraftUrl}
        onChange={(event): void => {
          props.setAmazonImageSearchPageDraftUrl(event.target.value);
        }}
        disabled={props.isSubmitting === true}
        placeholder='https://lens.google.com/?hl=en'
        aria-label='Amazon image search page URL'
        className='h-8 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none transition focus:border-primary'
      />
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={(): void => {
          props.setAmazonImageSearchPageUrl(props.amazonImageSearchPageDraftUrl.trim());
        }}
        disabled={
          props.isSubmitting === true ||
          props.amazonImageSearchPageDraftUrl.trim() === props.amazonImageSearchPageUrl
        }
        className='h-7 px-2 text-xs'
      >
        Restart search with page
      </Button>
    </div>
  );
}

export function ProductScanAmazonSelectorProfilePanel(
  props: AmazonSelectorProfilePanelProps
): React.JSX.Element | null {
  if (props.provider !== 'amazon') return null;

  return (
    <div className='flex items-start gap-3 rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs text-muted-foreground'>
      <div className='flex-1 space-y-4'>
        <div className='space-y-1'>
          <div className='font-medium text-white'>Amazon selector profile</div>
          <div>
            Used to resolve Mongo-backed Amazon selectors for this batch run.
            {formatSelectorProfileAvailability(
              props.amazonSelectorRegistryQuery.isLoading,
              props.amazonSelectorProfileOptions.length
            )}
          </div>
          {props.amazonSelectorRegistryQuery.isError === true ? (
            <div className='text-destructive'>Failed to load Amazon selector registry profiles.</div>
          ) : null}
        </div>
        <AmazonProfileSelect {...props} />
        <AmazonImageSearchPageControls {...props} />
      </div>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={openAmazonSelectorRegistry}
        disabled={props.isSubmitting === true}
        className='h-7 gap-1 px-2 text-xs'
      >
        <ExternalLink className='h-3 w-3' />
        Open registry
      </Button>
    </div>
  );
}
