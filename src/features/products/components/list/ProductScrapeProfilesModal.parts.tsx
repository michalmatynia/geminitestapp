'use client';

import { CheckCircle2, Globe2, TriangleAlert } from 'lucide-react';

import type {
  ProductScrapeProfile,
  ProductScrapeProfileRunResponse,
} from '@/shared/contracts/products/scrape-profiles';
import { Alert } from '@/shared/ui/alert';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/utils/ui-utils';

type ProductScrapeProfilesBodyProps = {
  dryRun: boolean;
  error: Error | null;
  isLoading: boolean;
  limitError: string | null;
  limitInput: string;
  profiles: ProductScrapeProfile[];
  result: ProductScrapeProfileRunResponse | null;
  selectedProfileId: string;
  onDryRunChange: (value: boolean) => void;
  onLimitInputChange: (value: string) => void;
  onProfileSelect: (profileId: string) => void;
};

type ProductScrapeProfilesFormProps = {
  dryRun: boolean;
  limitError: string | null;
  limitInput: string;
  profiles: ProductScrapeProfile[];
  selectedProfileId: string;
  onDryRunChange: (value: boolean) => void;
  onLimitInputChange: (value: string) => void;
  onProfileSelect: (profileId: string) => void;
};

const RESULT_ROW_LIMIT = 8;

const profileMeta = (profile: ProductScrapeProfile): string =>
  [
    profile.targetCatalogName,
    profile.maxPages !== null ? `${profile.maxPages} pages` : null,
    profile.defaultLimit !== null ? `${profile.defaultLimit} products` : null,
  ]
    .filter((entry): entry is string => entry !== null)
    .join(' / ');

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

function ProductScrapeProfilesForm(
  props: ProductScrapeProfilesFormProps
): React.JSX.Element {
  const {
    dryRun,
    limitError,
    limitInput,
    profiles,
    selectedProfileId,
    onDryRunChange,
    onLimitInputChange,
    onProfileSelect,
  } = props;
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
      <div className='grid gap-4 rounded-md border border-border/60 bg-card/35 p-4 md:grid-cols-[1fr_auto]'>
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
        <div className='flex items-center gap-2 self-end pb-2'>
          <Checkbox
            id='product-scrape-profile-dry-run'
            checked={dryRun}
            onCheckedChange={(checked) => onDryRunChange(checked === true)}
          />
          <Label htmlFor='product-scrape-profile-dry-run'>Dry run</Label>
        </div>
      </div>
    </>
  );
}

function ProductScrapeProfilesResult(props: {
  result: ProductScrapeProfileRunResponse;
}): React.JSX.Element {
  const { result } = props;
  return (
    <div className='space-y-3 rounded-md border border-border/60 bg-card/35 p-4'>
      <div className='grid gap-2 sm:grid-cols-5'>
        {[
          ['Scraped', result.scrapedCount],
          ['Created', result.createdCount],
          ['Updated', result.updatedCount],
          ['Skipped', result.skippedCount],
          ['Failed', result.failedCount],
        ].map(([label, value]) => (
          <div key={label}>
            <div className='text-[10px] uppercase text-muted-foreground'>{label}</div>
            <div className='text-sm font-semibold'>{value}</div>
          </div>
        ))}
      </div>
      <div className='max-h-64 overflow-auto rounded-md border border-white/5'>
        <table className='w-full text-left text-xs'>
          <thead className='sticky top-0 bg-card text-muted-foreground'>
            <tr>
              <th className='px-3 py-2 font-medium'>Status</th>
              <th className='px-3 py-2 font-medium'>SKU</th>
              <th className='px-3 py-2 font-medium'>Product</th>
            </tr>
          </thead>
          <tbody>
            {result.products.slice(0, RESULT_ROW_LIMIT).map((product) => (
              <tr
                key={`${product.index}-${product.sku ?? 'missing'}`}
                className='border-t border-white/5'
              >
                <td className='px-3 py-2 capitalize text-muted-foreground'>
                  {product.status.replace('_', ' ')}
                </td>
                <td className='px-3 py-2 font-mono'>{product.sku ?? '-'}</td>
                <td className='px-3 py-2'>
                  <div className='max-w-[360px] truncate'>{product.title ?? '-'}</div>
                  {product.error !== null ? (
                    <div className='mt-1 text-[11px] text-red-300'>{product.error}</div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
