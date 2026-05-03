'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';

type ProductScan1688ImagesListProps = {
  images: Array<{
    url?: string | null;
    source?: string | null;
  }>;
};

function ImageLink({ url }: { url: string }): React.JSX.Element {
  return (
    <a href={url} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'>
      Open <ExternalLink className='h-3.5 w-3.5' />
    </a>
  );
}

function resolveImageLabel(source: string | null | undefined, index: number): string {
  if (typeof source === 'string' && source !== '') return `${source} image`;
  return `Image ${index + 1}`;
}

export function ProductScan1688ImagesList({ images }: ProductScan1688ImagesListProps): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>Extracted images</p>
      {images.length > 0 ? (
        <ul className='space-y-2 text-sm text-foreground'>
          {images.slice(0, 6).map((img, i) => {
            const label = resolveImageLabel(img.source, i);
            const url = img.url ?? null;
            return (
              <li key={`${url ?? 'image'}-${i}`} className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'>
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <span className='font-medium'>{label}</span>
                  {url !== null && <ImageLink url={url} />}
                </div>
                {url !== null && <p className='mt-1 break-all text-xs text-muted-foreground'>{url}</p>}
              </li>
            );
          })}
        </ul>
      ) : <p className='text-sm text-muted-foreground'>No supplier images were extracted.</p>}
    </div>
  );
}
