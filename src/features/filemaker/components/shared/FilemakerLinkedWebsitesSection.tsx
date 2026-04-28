import { ExternalLink, Globe } from 'lucide-react';
import React from 'react';

import type { MongoFilemakerWebsite } from '../../filemaker-websites.types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';
import { Badge, Button, Card } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

export interface FilemakerLinkedWebsitesSectionProps {
  websites: MongoFilemakerWebsite[];
}

const formatOptionalValue = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

const resolveWebsiteHref = (url: string): string | null => {
  const trimmed = url.trim();
  if (trimmed.length === 0) return null;
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

function FilemakerLinkedWebsiteCard({
  website,
}: {
  website: MongoFilemakerWebsite;
}): React.JSX.Element {
  const href = resolveWebsiteHref(website.url);
  return (
    <Card key={website.id} variant='subtle-compact' className='bg-card/20'>
      <div className='flex items-start justify-between gap-3 p-3'>
        <div className='flex min-w-0 gap-2'>
          <Globe className='mt-0.5 size-3.5 shrink-0 text-cyan-300' />
          <div className='min-w-0'>
            <div className='truncate text-sm font-semibold text-white'>{website.url}</div>
            <div className='truncate text-xs text-gray-300'>
              {formatOptionalValue(website.host)}
            </div>
            <div className='truncate text-[10px] text-gray-600'>
              Legacy UUID: {formatOptionalValue(website.legacyUuid)} | Updated:{' '}
              {formatTimestamp(website.updatedAt)}
            </div>
          </div>
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          {website.websiteKind === 'social' ? (
            <Badge variant='outline' className='h-5 text-[10px]'>
              {website.socialPlatform ?? 'social'}
            </Badge>
          ) : null}
          {website.legacyTypeRaw !== undefined ? (
            <Badge variant='outline' className='h-5 text-[10px]'>
              {website.legacyTypeRaw}
            </Badge>
          ) : null}
          <Button
            type='button'
            variant='outline'
            size='icon'
            className='size-7'
            aria-label={`Open website ${website.url}`}
            title={`Open website ${website.url}`}
            disabled={href === null}
            onClick={(): void => {
              if (href === null) return;
              window.open(href, '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink className='size-3.5' />
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function FilemakerLinkedWebsitesSection({
  websites,
}: FilemakerLinkedWebsitesSectionProps): React.JSX.Element {
  return (
    <FormSection title='Linked Websites' className='space-y-2 p-4'>
      {websites.length === 0 ? (
        <div className='text-xs text-gray-500'>No websites linked yet.</div>
      ) : (
        <div className='grid gap-2 sm:grid-cols-2'>
          {websites.map((website: MongoFilemakerWebsite) => (
            <FilemakerLinkedWebsiteCard key={website.id} website={website} />
          ))}
        </div>
      )}
    </FormSection>
  );
}
