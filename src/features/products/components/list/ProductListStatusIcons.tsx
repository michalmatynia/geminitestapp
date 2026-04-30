'use client';

import { Download, Globe2, Store } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ProductImportSource } from '@/shared/contracts/products/product';
import { Tooltip } from '@/shared/ui/tooltip';
import { cn } from '@/shared/utils/ui-utils';

type ProductListStatusIconsProps = {
  importSource: ProductImportSource | null;
  hasMarketplaceCopy: boolean;
  hasEnglishTitle: boolean;
  hasEnglishDescription: boolean;
  hasPolishTitle: boolean;
  hasPolishDescription: boolean;
};

const getLocalizedCopyLabel = ({
  languageName,
  hasTitle,
  hasDescription,
}: {
  languageName: string;
  hasTitle: boolean;
  hasDescription: boolean;
}): string => {
  if (hasTitle && hasDescription) return `${languageName} title and description filled`;
  if (hasDescription) return `${languageName} description filled`;
  return `${languageName} title filled`;
};

function ImportSourceStatusIcon({
  importSource,
}: {
  importSource: ProductImportSource | null;
}): React.JSX.Element | null {
  if (importSource === null) return null;

  if (importSource === 'scrape') {
    return (
      <ProductListStatusIcon
        label='Scraped product'
        tooltip='Scraped product'
        className='text-emerald-300'
      >
        <Globe2 className='size-3' aria-hidden='true' />
      </ProductListStatusIcon>
    );
  }

  return (
    <ProductListStatusIcon
      label='Imported product'
      tooltip='Imported product'
      className='text-blue-400'
    >
      <Download className='size-3' aria-hidden='true' />
    </ProductListStatusIcon>
  );
}

function MarketplaceCopyStatusIcon({ show }: { show: boolean }): React.JSX.Element | null {
  if (!show) return null;

  return (
    <ProductListStatusIcon
      label='Marketplace copy filled'
      tooltip='Marketplace copy filled'
      className='text-blue-400'
    >
      <Store className='size-3' aria-hidden='true' />
    </ProductListStatusIcon>
  );
}

function LocalizedCopyStatusIcon({
  code,
  languageName,
  hasTitle,
  hasDescription,
}: {
  code: string;
  languageName: string;
  hasTitle: boolean;
  hasDescription: boolean;
}): React.JSX.Element | null {
  if (!hasTitle && !hasDescription) return null;

  const label = getLocalizedCopyLabel({ languageName, hasTitle, hasDescription });

  return (
    <ProductListStatusIcon
      label={label}
      tooltip={label}
      className='relative min-w-5 overflow-hidden rounded-[2px] border border-blue-400/70 bg-slate-950 text-slate-950'
    >
      {hasTitle ? (
        <span aria-hidden='true' className='absolute inset-x-0 top-0 h-1/2 bg-blue-400' />
      ) : null}
      {hasDescription ? (
        <span aria-hidden='true' className='absolute inset-x-0 bottom-0 h-1/2 bg-blue-400' />
      ) : null}
      <span className='relative px-0.5'>{code}</span>
    </ProductListStatusIcon>
  );
}

const hasAnyProductListStatusIcon = ({
  importSource,
  hasMarketplaceCopy,
  hasEnglishTitle,
  hasEnglishDescription,
  hasPolishTitle,
  hasPolishDescription,
}: ProductListStatusIconsProps): boolean =>
  importSource !== null ||
  hasMarketplaceCopy ||
  hasEnglishTitle ||
  hasEnglishDescription ||
  hasPolishTitle ||
  hasPolishDescription;

function ProductListStatusIcon({
  label,
  tooltip,
  className,
  children,
}: {
  label: string;
  tooltip: string;
  className: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Tooltip content={tooltip} className='inline-flex h-4 items-center leading-none'>
      <span
        role='img'
        aria-label={label}
        title={tooltip}
        className={cn(
          'flex h-4 min-w-4 shrink-0 items-center justify-center text-[9px] font-black leading-none',
          className
        )}
      >
        {children}
      </span>
    </Tooltip>
  );
}

export function ProductListStatusIcons({
  importSource,
  hasMarketplaceCopy,
  hasEnglishTitle,
  hasEnglishDescription,
  hasPolishTitle,
  hasPolishDescription,
}: ProductListStatusIconsProps): React.JSX.Element | null {
  if (!hasAnyProductListStatusIcon({
    importSource,
    hasMarketplaceCopy,
    hasEnglishTitle,
    hasEnglishDescription,
    hasPolishTitle,
    hasPolishDescription,
  })) return null;

  return (
    <>
      <ImportSourceStatusIcon importSource={importSource} />
      <LocalizedCopyStatusIcon
        code='EN'
        languageName='English'
        hasTitle={hasEnglishTitle}
        hasDescription={hasEnglishDescription}
      />
      <LocalizedCopyStatusIcon
        code='PL'
        languageName='Polish'
        hasTitle={hasPolishTitle}
        hasDescription={hasPolishDescription}
      />
      <MarketplaceCopyStatusIcon show={hasMarketplaceCopy} />
    </>
  );
}
