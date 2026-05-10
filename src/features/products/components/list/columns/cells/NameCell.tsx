'use client';

import { Archive } from 'lucide-react';
import { memo, useMemo } from 'react';
import type { Row } from '@tanstack/react-table';
import type {
  ProductImportSource,
  ProductWithImages,
} from '@/shared/contracts/products/product';
import {
  useProductListRowActionsContext,
  useProductListRowRuntime,
  useProductListRowVisualsContext,
} from '@/features/products/context/ProductListContext';
import type { ProductListRowRuntimeContextType } from '@/features/products/context/ProductListContext';
import { Badge } from '@/shared/ui/badge';
import { Tooltip } from '@/shared/ui/tooltip';
import {
  getProductListDisplayName,
  hasFilledMarketplaceCopy,
  hasEnglishProductDescription,
  hasEnglishProductTitle,
  hasPolishProductDescription,
  hasPolishProductTitle,
  hasAnyProductImageStorageStatus,
  isUnassignedProductCategoryLabel,
  resolveProductCategoryLabel,
  resolveProductImportSource,
  resolveProductImageStorageStatus,
} from '../product-column-utils';
import { ProductListActivityPill } from '../../ProductListActivityPill';
import { ProductListStatusIcons } from '../../ProductListStatusIcons';

type ShippingInfo = { autoLabel: string, autoRuleLabel: string, conflictLabel: string, manualMissingLabel: string };
type NameCellStatusState = {
  importSource: ProductImportSource | null;
  hasMarketplaceCopy: boolean;
  hasEnglishTitle: boolean;
  hasEnglishDescription: boolean;
  hasPolishTitle: boolean;
  hasPolishDescription: boolean;
  imageStorageStatus: ReturnType<typeof resolveProductImageStorageStatus>;
  hasStatusRow: boolean;
};

function resolveAutoShipping(product: ProductWithImages, categoryNameById: ReadonlyMap<string, string>): { autoLabel: string, autoRuleLabel: string } {
  const isAuto = product.shippingGroupSource === 'category_rule';
  const groupName = product.shippingGroup?.name.trim() ?? '';
  const autoLabel = isAuto ? groupName : '';
  
  const ruleIds = Array.isArray(product.shippingGroupMatchedCategoryRuleIds) ? product.shippingGroupMatchedCategoryRuleIds : [];
  const ruleLabels = isAuto ? ruleIds.map((id) => categoryNameById.get(id) ?? id).filter((l) => l.trim() !== '') : [];
  const autoRuleLabel = ruleLabels.join(', ');

  return { autoLabel, autoRuleLabel };
}

function resolveShippingInfo(product: ProductWithImages, categoryNameById: ReadonlyMap<string, string>): ShippingInfo {
  const auto = resolveAutoShipping(product, categoryNameById);
  
  const conflict = product.shippingGroupResolutionReason === 'multiple_category_rules';
  const conflictLabels = Array.isArray(product.shippingGroupMatchingGroupNames) ? product.shippingGroupMatchingGroupNames : [];
  const conflictLabel = conflict ? conflictLabels.join(', ') : '';
  
  const manualMissing = product.shippingGroupResolutionReason === 'manual_missing';
  const mid = typeof product.shippingGroupId === 'string' ? product.shippingGroupId.trim() : '';
  const manualMissingLabel = (manualMissing && mid !== '') ? mid : '';

  return { ...auto, conflictLabel, manualMissingLabel };
}

function NameCellButton({ name, onClick }: { name: string, onClick: () => void }): React.JSX.Element {
  const display = name !== '' ? name : '—';
  const actionLabel = name !== '' ? `Open ${display}` : 'Open product';
  return (
    <button
      type='button'
      title={display}
      className='inline-block max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap align-top select-text cursor-pointer hover:underline border-0 bg-transparent p-0 text-left text-sm font-normal text-white/90 hover:text-white/80'
      aria-label={actionLabel}
      onClick={(): void => {
        const selection = typeof window !== 'undefined' ? window.getSelection() : null;
        if (selection !== null && selection.toString().trim() !== '') return;
        onClick();
      }}
    >
      {display}
    </button>
  );
}

function NameCellShipping({ ship }: { ship: ShippingInfo }): React.JSX.Element {
  const autoShipTooltip = ship.autoRuleLabel !== '' ? `Auto shipping group: ${ship.autoLabel} via ${ship.autoRuleLabel}` : `Auto shipping group: ${ship.autoLabel}`;
  const conflictTooltip = ship.autoRuleLabel !== '' ? `Shipping rule conflict: ${ship.conflictLabel} via ${ship.autoRuleLabel}` : `Shipping rule conflict: ${ship.conflictLabel}`;
  const missingTooltip = ship.manualMissingLabel !== '' ? `Manual shipping group is missing: ${ship.manualMissingLabel}` : 'Manual shipping group is missing';

  return (
    <>
      {ship.autoLabel !== '' && (
        <>
          <span aria-hidden='true' className='text-gray-600'>|</span>
          <Tooltip content={autoShipTooltip}>
            <button type='button' className='max-w-[12rem] truncate text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1' title={autoShipTooltip}>Auto ship: {ship.autoLabel}</button>
          </Tooltip>
        </>
      )}
      {ship.conflictLabel !== '' && (
        <>
          <span aria-hidden='true' className='text-gray-600'>|</span>
          <Tooltip content={conflictTooltip}>
            <button type='button' className='max-w-[12rem] truncate text-left text-amber-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1' title={conflictTooltip}>Ship conflict</button>
          </Tooltip>
        </>
      )}
      {ship.manualMissingLabel !== '' && (
        <>
          <span aria-hidden='true' className='text-gray-600'>|</span>
          <Tooltip content={missingTooltip}>
            <button type='button' className='max-w-[12rem] truncate text-left text-amber-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1' title={missingTooltip}>Ship missing</button>
          </Tooltip>
        </>
      )}
    </>
  );
}

function NameCellActivity({ runtime }: { runtime: ProductListRowRuntimeContextType }): React.JSX.Element {
  const ai = runtime.productAiRunFeedback;
  const scan = runtime.productScanRunFeedback;

  return (
    <>
      {ai !== null && <ProductListActivityPill config={{ kind: 'trigger-button', label: ai.label, variant: ai.variant, badgeClassName: ai.badgeClassName ?? undefined }} />}
      {scan !== null && <ProductListActivityPill config={{ kind: 'scan', label: scan.label, variant: scan.variant, badgeClassName: scan.badgeClassName ?? undefined }} />}
    </>
  );
}

function NameCellBasicInfo({ product }: { product: ProductWithImages }): React.JSX.Element {
  const sku = (product.sku ?? '').trim();
  const pid = (product.baseProductId ?? product.id).trim();

  return (
    <>
      <span className='max-w-[10rem] truncate select-text cursor-text' title={sku !== '' ? sku : 'No SKU'}>{sku !== '' ? sku : 'No SKU'}</span>
      {typeof product.duplicateSkuCount === 'number' && product.duplicateSkuCount > 1 && (
        <span className='rounded-sm border border-amber-500/40 bg-amber-500/10 px-1 py-0.5 text-[11px] font-medium text-amber-300' title={`SKU used by ${product.duplicateSkuCount} products`}>Duplicate SKU</span>
      )}
      <span aria-hidden='true' className='text-gray-600'>|</span>
      <span className='max-w-[10rem] truncate select-text cursor-text' title={pid}>{pid}</span>
    </>
  );
}

function resolveNameCellStatusState(product: ProductWithImages, runtime: ProductListRowRuntimeContextType): NameCellStatusState {
  const importSource = resolveProductImportSource(product);
  const hasMarketplaceCopy = hasFilledMarketplaceCopy(product);
  const hasEnglishTitle = hasEnglishProductTitle(product);
  const hasEnglishDescription = hasEnglishProductDescription(product);
  const hasPolishTitle = hasPolishProductTitle(product);
  const hasPolishDescription = hasPolishProductDescription(product);
  const imageStorageStatus = resolveProductImageStorageStatus(product);
  const hasStatusIcons = [
    importSource !== null ||
    hasMarketplaceCopy,
    hasEnglishTitle,
    hasEnglishDescription,
    hasPolishTitle,
    hasPolishDescription,
    hasAnyProductImageStorageStatus(imageStorageStatus),
  ].includes(true);
  const hasActivity = runtime.productAiRunFeedback !== null || runtime.productScanRunFeedback !== null;

  return {
    importSource,
    hasMarketplaceCopy,
    hasEnglishTitle,
    hasEnglishDescription,
    hasPolishTitle,
    hasPolishDescription,
    imageStorageStatus,
    hasStatusRow: hasStatusIcons || product.archived === true || hasActivity,
  };
}

function NameCellSecondaryInfo({ product, runtime, categoryLabel, ship }: { product: ProductWithImages, runtime: ProductListRowRuntimeContextType, categoryLabel: string, ship: ShippingInfo }): React.JSX.Element {
  const categoryToneClass = isUnassignedProductCategoryLabel(categoryLabel)
    ? 'text-rose-300/80 hover:text-rose-200/85'
    : '';
  const status = resolveNameCellStatusState(product, runtime);

  return (
    <div className='mt-1 min-w-0 space-y-1'>
      <div data-product-list-summary-row className='flex min-w-0 items-center gap-1.5 text-sm text-gray-500'>
        <NameCellBasicInfo product={product} />
        <span aria-hidden='true' className='text-gray-600'>|</span>
        <Tooltip content={categoryLabel}><button type='button' className={`max-w-[14rem] truncate rounded-sm border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${categoryToneClass}`} aria-label={categoryLabel} title={categoryLabel}>{categoryLabel}</button></Tooltip>
        <NameCellShipping ship={ship} />
      </div>
      {status.hasStatusRow ? (
        <div data-product-list-status-icons className='flex min-h-4 flex-wrap items-center gap-1.5'>
          <ProductListStatusIcons
            importSource={status.importSource}
            hasMarketplaceCopy={status.hasMarketplaceCopy}
            hasEnglishTitle={status.hasEnglishTitle}
            hasEnglishDescription={status.hasEnglishDescription}
            hasPolishTitle={status.hasPolishTitle}
            hasPolishDescription={status.hasPolishDescription}
            imageStorageStatus={status.imageStorageStatus}
          />
          {product.archived === true && <Badge variant='removed' icon={<Archive className='size-3' />}>Archived</Badge>}
          <NameCellActivity runtime={runtime} />
        </div>
      ) : null}
    </div>
  );
}

export const NameCell: React.FC<{ row: Row<ProductWithImages> }> = memo(({ row }) => {
  const product = row.original;
  const actions = useProductListRowActionsContext();
  const visuals = useProductListRowVisualsContext();
  const runtime = useProductListRowRuntime(product.id, product.baseProductId);

  const nameKey = visuals.productNameKey;
  const nameValue = getProductListDisplayName(product, nameKey);
  const categoryLabel = resolveProductCategoryLabel(product, visuals.categoryNameById, nameKey);
  const ship = useMemo(() => resolveShippingInfo(product, visuals.categoryNameById), [product, visuals.categoryNameById]);

  return (
    <div className='min-w-0 cursor-text select-text' onMouseEnter={() => actions.onPrefetchProductDetail(product.id)}>
      <NameCellButton name={nameValue} onClick={() => actions.onProductNameClick(product)} />
      <NameCellSecondaryInfo product={product} runtime={runtime} categoryLabel={categoryLabel} ship={ship} />
    </div>
  );
});

NameCell.displayName = 'NameCell';
