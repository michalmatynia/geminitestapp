'use client';

import { CheckCircle2, Globe2 } from 'lucide-react';
import type { ProductScrapeProfile } from '@/shared/contracts/products/scrape-profiles';
import { cn } from '@/shared/utils/ui-utils';

const profileMeta = (profile: ProductScrapeProfile): string =>
  [
    profile.targetCatalogName,
    profile.maxPages !== null ? `${profile.maxPages} pages` : null,
    profile.defaultLimit !== null ? `${profile.defaultLimit} products` : null,
  ]
    .filter((entry): entry is string => entry !== null)
    .join(' / ');

export function ProductScrapeProfileButton(props: {
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
