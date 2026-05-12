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
  [
    importSource !== null,
    hasMarketplaceCopy,
    hasEnglishTitle,
    hasEnglishDescription,
    hasPolishTitle,
    hasPolishDescription,
    imageStorageStatus.hasFastCometImage,
    imageStorageStatus.hasLocalImage,
    imageStorageStatus.hasExternalLinkImage,
    imageStorageStatus.hasBase64Image,
  ].includes(true);

type ImageStorageKind = 'fastcomet' | 'local' | 'external-link' | 'base64';
type ImageStorageShapeName = 'circle' | 'square' | 'triangle' | 'trapezoid';

const getImageStorageLabels = (status: ProductImageStorageStatus): string[] => {
  const labels: string[] = [];
  if (status.hasLocalImage) labels.push('upload');
  if (status.hasExternalLinkImage) labels.push('link');
  if (status.hasBase64Image) labels.push('base64');
  if (status.hasFastCometImage) labels.push('FastComet');
  return labels;
};

const IMAGE_STORAGE_SHAPE_ACTIVE_CLASSNAME = 'bg-sky-300';

const IMAGE_STORAGE_SHAPE_CLASSNAME: Record<ImageStorageShapeName, string> = {
  circle: 'rounded-full',
  square: 'rounded-[1px]',
  triangle: '[clip-path:polygon(50%_0,100%_100%,0_100%)]',
  trapezoid: '[clip-path:polygon(20%_0,80%_0,100%_100%,0_100%)]',
};

function ImageStorageShape({
  active,
  storage,
  shape,
}: {
  active: boolean;
  storage: ImageStorageKind;
  shape: ImageStorageShapeName;
}): React.JSX.Element {
  return (
    <span
      aria-hidden='true'
      data-active={active ? 'true' : 'false'}
      data-product-image-storage-kind={storage}
      data-product-image-storage-shape={shape}
      className={cn(
        'block size-[5px]',
        IMAGE_STORAGE_SHAPE_CLASSNAME[shape],
        active ? IMAGE_STORAGE_SHAPE_ACTIVE_CLASSNAME : 'invisible'
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
      className='size-4 min-w-4 rounded-[2px] bg-transparent p-0'
    >
      <span
        aria-hidden='true'
        className='grid size-4 grid-cols-2 place-items-center gap-[1px]'
      >
        <ImageStorageShape
          active={status.hasFastCometImage}
          storage='fastcomet'
          shape='circle'
        />
        <ImageStorageShape
          active={status.hasLocalImage}
          storage='local'
          shape='square'
        />
        <ImageStorageShape
          active={status.hasExternalLinkImage}
          storage='external-link'
          shape='triangle'
        />
        <ImageStorageShape
          active={status.hasBase64Image}
          storage='base64'
          shape='trapezoid'
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
