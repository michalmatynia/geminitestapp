'use client';

import { ExternalLink } from 'lucide-react';
import React from 'react';
import { CopyButton } from '@/shared/ui/copy-button';

type ProductScan1688DetailRowProps = {
  label: string;
  value?: string | null;
  href?: string | null;
};

function DetailRowLink({ value, href }: { value: string, href: string }): React.JSX.Element {
  const display = value !== '' ? value : href;
  return (
    <a href={href} target='_blank' rel='noopener noreferrer' className='inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline'>
      {display}
      <ExternalLink className='h-3.5 w-3.5' />
    </a>
  );
}

function DetailRowValue({ value, href }: { value: string, href: string }): React.JSX.Element {
  if (href !== '') return <DetailRowLink value={value} href={href} />;
  return <span>{value}</span>;
}

export function ProductScan1688DetailRow({ label, value, href }: ProductScan1688DetailRowProps): React.JSX.Element | null {
  const normVal = typeof value === 'string' ? value.trim() : '';
  const normHref = typeof href === 'string' ? href.trim() : '';

  if (normVal === '' && normHref === '') return null;

  const copyVal = normHref !== '' ? normHref : normVal;

  return (
    <div className='space-y-1'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>{label}</p>
      <div className='flex flex-wrap items-center gap-2 text-sm text-foreground'>
        <DetailRowValue value={normVal} href={normHref} />
        <CopyButton value={copyVal} className='h-6 px-2 text-[11px]' />
      </div>
    </div>
  );
}
