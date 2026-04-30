'use client';

import type React from 'react';

import { ProductImageCell } from '@/features/products/components/cells/ProductImageCell';
import { ActionMenu } from '@/shared/ui/ActionMenu';
import { Checkbox } from '@/shared/ui/checkbox';
import { DropdownMenuItem } from '@/shared/ui/dropdown-menu';

import { getProductDisplayName } from './columns/product-column-utils';
import type { ProductListMobileCardViewProps } from './ProductListMobileCards.types';

type ProductListMobileCardHeaderProps = Pick<
  ProductListMobileCardViewProps,
  'product' | 'isSelected' | 'toggleSelection' | 'rowActions' | 'model'
>;

function ProductSelectionCheckbox({
  productId,
  isSelected,
  selectionLabel,
  toggleSelection,
}: {
  productId: string;
  isSelected: boolean;
  selectionLabel: string;
  toggleSelection: (productId: string, nextChecked: boolean) => void;
}): React.JSX.Element {
  return (
    <Checkbox
      checked={isSelected}
      onCheckedChange={(checked): void => toggleSelection(productId, checked === true)}
      aria-label={`Select ${selectionLabel}`}
      className='cursor-pointer'
    />
  );
}

function ProductCardImage({
  product,
  thumbnailUrl,
}: Pick<ProductListMobileCardHeaderProps, 'product'> & {
  thumbnailUrl: string | null;
}): React.JSX.Element {
  return (
    <div className='shrink-0'>
      <ProductImageCell
        imageUrl={thumbnailUrl}
        productId={product.id}
        productName={getProductDisplayName(product)}
        note={product.notes}
      />
    </div>
  );
}

function ProductCardTitle({
  product,
  model,
  rowActions,
}: Pick<
  ProductListMobileCardHeaderProps,
  'product' | 'model' | 'rowActions'
>): React.JSX.Element {
  return (
    <button
      type='button'
      className='block w-full text-left text-sm font-semibold text-white/90 hover:text-white hover:underline'
      aria-label={`Open ${model.selectionLabel}`}
      onClick={(): void => rowActions.onProductNameClick(product)}
    >
      {model.displayName}
    </button>
  );
}

function DuplicateSkuBadge({
  duplicateSkuCount,
  duplicateSkuTitle,
}: Pick<
  ProductListMobileCardHeaderProps['model'],
  'duplicateSkuCount' | 'duplicateSkuTitle'
>): React.JSX.Element | null {
  if (duplicateSkuCount === null) return null;

  return (
    <span
      className='rounded-sm border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[11px] font-medium text-amber-300'
      title={duplicateSkuTitle ?? undefined}
    >
      Duplicate SKU
    </span>
  );
}

function ProductSkuCategoryLine({
  model,
}: Pick<ProductListMobileCardHeaderProps, 'model'>): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='truncate'>SKU: {model.skuLabel}</span>
      <DuplicateSkuBadge
        duplicateSkuCount={model.duplicateSkuCount}
        duplicateSkuTitle={model.duplicateSkuTitle}
      />
      <span aria-hidden='true' className='text-muted-foreground/60'>
        •
      </span>
      <span className='truncate'>
        Category:{' '}
        <span className={model.categoryIsUnassigned ? 'text-rose-300/80' : undefined}>
          {model.categoryLabel}
        </span>
      </span>
    </div>
  );
}

function ProductShippingLabels({
  model,
}: Pick<ProductListMobileCardHeaderProps, 'model'>): React.JSX.Element {
  return (
    <>
      {model.autoShippingGroupLabel.length > 0 ? (
        <div className='space-y-0.5'>
          <div className='truncate'>Auto shipping: {model.autoShippingGroupLabel}</div>
          {model.autoShippingRuleLabel.length > 0 ? (
            <div className='truncate'>Auto via: {model.autoShippingRuleLabel}</div>
          ) : null}
        </div>
      ) : null}
      {model.shippingRuleConflictLabel.length > 0 ? (
        <div className='space-y-0.5 text-amber-300'>
          <div className='truncate'>Ship conflict</div>
          <div className='truncate'>{model.shippingRuleConflictLabel}</div>
        </div>
      ) : null}
      {model.missingManualShippingLabel.length > 0 ? (
        <div className='space-y-0.5 text-amber-300'>
          <div className='truncate'>Ship missing</div>
          <div className='truncate'>{model.missingManualShippingLabel}</div>
        </div>
      ) : null}
    </>
  );
}

function ProductCardMetadata({
  model,
}: Pick<ProductListMobileCardHeaderProps, 'model'>): React.JSX.Element {
  return (
    <div className='mt-1 space-y-1 text-xs text-muted-foreground'>
      <ProductSkuCategoryLine model={model} />
      <ProductShippingLabels model={model} />
    </div>
  );
}

function ProductCardActionMenu({
  product,
  rowActions,
}: Pick<ProductListMobileCardHeaderProps, 'product' | 'rowActions'>): React.JSX.Element {
  return (
    <ActionMenu ariaLabel='Open product actions'>
      <DropdownMenuItem
        onSelect={(event: Event): void => {
          event.preventDefault();
          rowActions.onProductEditClick(product);
        }}
      >
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(event: Event): void => {
          event.preventDefault();
          rowActions.onDuplicateProduct(product);
        }}
      >
        Duplicate
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(event: Event): void => {
          event.preventDefault();
          rowActions.onIntegrationsClick(product);
        }}
      >
        Integrations
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(event: Event): void => {
          event.preventDefault();
          rowActions.onExportSettingsClick(product);
        }}
      >
        Export Settings
      </DropdownMenuItem>
      <DropdownMenuItem
        className='text-destructive focus:text-destructive'
        onSelect={(event: Event): void => {
          event.preventDefault();
          rowActions.onProductDeleteClick(product);
        }}
      >
        Remove
      </DropdownMenuItem>
    </ActionMenu>
  );
}

export function ProductListMobileCardHeader({
  product,
  isSelected,
  toggleSelection,
  rowActions,
  model,
}: ProductListMobileCardHeaderProps): React.JSX.Element {
  return (
    <div className='flex items-start gap-3'>
      <ProductSelectionCheckbox
        productId={product.id}
        isSelected={isSelected}
        selectionLabel={model.selectionLabel}
        toggleSelection={toggleSelection}
      />
      <ProductCardImage product={product} thumbnailUrl={model.thumbnailUrl} />
      <div className='min-w-0 flex-1'>
        <ProductCardTitle product={product} model={model} rowActions={rowActions} />
        <ProductCardMetadata model={model} />
      </div>
      <ProductCardActionMenu product={product} rowActions={rowActions} />
    </div>
  );
}
