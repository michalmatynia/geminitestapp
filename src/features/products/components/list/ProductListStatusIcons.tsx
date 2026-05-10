'use client';

import { Download, Globe2, Store } from 'lucide-react';
import type { ReactNode } from 'react';

import type { ProductImageStorageStatus } from '@/features/products/components/list/columns/product-column-utils';
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
  imageStorageStatus: ProductImageStorageStatus;
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
  imageStorageStatus,
}: ProductListStatusIconsProps): boolean =>
  importSource !== null ||
  hasMarketplaceCopy ||
  hasEnglishTitle ||
  hasEnglishDescription ||
  hasPolishTitle ||
  hasPolishDescription ||
  imageStorageStatus.hasFastCometImage ||
  imageStorageStatus.hasLocalImage ||
  imageStorageStatus.hasExternalLinkImage;

const getImageStorageLabels = (status: ProductImageStorageStatus): string[] => {
  const labels: string[] = [];
  if (status.hasFastCometImage) labels.push('FastComet');
  if (status.hasLocalImage) labels.push('local');
  if (status.hasExternalLinkImage) labels.push('external link');
  return labels;
};

function ImageStorageSegment({
  active,
  segment,
  activeClassName,
}: {
  active: boolean;
  segment: 'fastcomet' | 'local' | 'external-link';
  activeClassName: string;
}): React.JSX.Element {
  return (
    <span
      aria-hidden='true'
      data-active={active ? 'true' : 'false'}
      data-product-image-storage-segment={segment}
      className={cn(
        'block min-h-0 flex-1 border-b border-slate-950/70 last:border-b-0',
        active ? activeClassName : 'bg-slate-700/45'
      )}
    />
  );
}

function ImageStorageStatusIcon({
  status,
}: {
  status: ProductImageStorageStatus;
}): React.JSX.Element | null {
  const labels = getImageStorageLabels(status);
  if (labels.length === 0) return null;

  const tooltip = `Product image storage: ${labels.join(', ')}`;

  return (
    <ProductListStatusIcon
      label={tooltip}
      tooltip={tooltip}
      className='h-4 w-4 min-w-4 overflow-hidden rounded-[2px] border border-slate-500/70 bg-slate-950 p-0'
    >
      <span aria-hidden='true' className='flex h-full w-full flex-col'>
        <ImageStorageSegment
          active={status.hasFastCometImage}
          segment='fastcomet'
          activeClassName='bg-emerald-400'
        />
        <ImageStorageSegment
          active={status.hasLocalImage}
          segment='local'
          activeClassName='bg-sky-400'
        />
        <ImageStorageSegment
          active={status.hasExternalLinkImage}
          segment='external-link'
          activeClassName='bg-violet-400'
        />
      </span>
    </ProductListStatusIcon>
  );
}

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
  imageStorageStatus,
}: ProductListStatusIconsProps): React.JSX.Element | null {
  if (!hasAnyProductListStatusIcon({
    importSource,
    hasMarketplaceCopy,
    hasEnglishTitle,
    hasEnglishDescription,
    hasPolishTitle,
    hasPolishDescription,
    imageStorageStatus,
  })) return null;

  return (
    <>
      <ImportSourceStatusIcon importSource={importSource} />
      <ImageStorageStatusIcon status={imageStorageStatus} />
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
