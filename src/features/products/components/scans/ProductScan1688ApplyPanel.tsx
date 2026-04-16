'use client';

import type {
  ProductScanRecord,
  ProductScanSupplierPrice,
} from '@/shared/contracts/product-scans';
import { Button } from '@/shared/ui/button';
import { resolveProductScan1688ApplyPolicySummary } from '@/features/products/components/scans/ProductScan1688Details';

type ProductScan1688ApplyField = 'supplierName' | 'supplierLink' | 'priceComment';

export type ProductScan1688FormBindings = {
  getTextFieldValue: (
    field: ProductScan1688ApplyField
  ) => string | null | undefined;
  applyTextField: (field: ProductScan1688ApplyField, value: string) => void;
  imageLinks?: string[] | null;
  imageBase64s?: string[] | null;
  setImageLinkAt?: (index: number, value: string) => void;
  setImageBase64At?: (index: number, value: string) => void;
};

type ProductScan1688ApplyPanelProps = {
  scan: Pick<ProductScanRecord, 'url' | 'supplierDetails' | 'supplierEvaluation'>;
  formBindings: ProductScan1688FormBindings | null;
};

const normalizeComparableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildInlineSummary = (...values: Array<string | null | undefined>): string | null => {
  const entries = values
    .map((value) => normalizeComparableText(value))
    .filter((value): value is string => Boolean(value));

  return entries.length > 0 ? entries.join(' · ') : null;
};

const formatSupplierPriceTier = (price: ProductScanSupplierPrice): string | null =>
  buildInlineSummary(
    price.label,
    price.amount && price.currency ? `${price.amount} ${price.currency}` : price.amount,
    price.rangeStart && price.rangeEnd ? `${price.rangeStart} - ${price.rangeEnd}` : null,
    price.moq ? `MOQ ${price.moq}` : null,
    price.unit
  );

const buildSupplierProductLinkValue = (
  scan: Pick<ProductScanRecord, 'url' | 'supplierDetails'>
): string | null =>
  normalizeComparableText(scan.supplierDetails?.supplierProductUrl) ??
  normalizeComparableText(scan.url);

const buildSupplierStoreLinkValue = (
  scan: Pick<ProductScanRecord, 'supplierDetails'>
): string | null => normalizeComparableText(scan.supplierDetails?.supplierStoreUrl);

const buildSupplierPriceCommentValue = (
  scan: Pick<ProductScanRecord, 'supplierDetails'>
): string | null => {
  const primaryPrice =
    normalizeComparableText(scan.supplierDetails?.priceText) ??
    normalizeComparableText(scan.supplierDetails?.priceRangeText);
  const summary = buildInlineSummary(
    primaryPrice,
    scan.supplierDetails?.moqText
  );
  if (summary) {
    return summary;
  }

  const firstTier = Array.isArray(scan.supplierDetails?.prices)
    ? scan.supplierDetails.prices
        .map((price: ProductScanSupplierPrice) => formatSupplierPriceTier(price))
        .find((value): value is string => Boolean(value))
    : null;

  return firstTier ?? null;
};

const buildSupplierPriceTierValues = (
  scan: Pick<ProductScanRecord, 'supplierDetails'>
): string[] => {
  const seen = new Set<string>();
  const tiers: string[] = [];

  for (const price of Array.isArray(scan.supplierDetails?.prices) ? scan.supplierDetails.prices : []) {
    const formattedTier = formatSupplierPriceTier(price);
    if (!formattedTier || seen.has(formattedTier)) {
      continue;
    }
    seen.add(formattedTier);
    tiers.push(formattedTier);
  }

  return tiers;
};

const buildDetailedSupplierPriceCommentValue = (
  scan: Pick<ProductScanRecord, 'supplierDetails'>
): string | null => {
  const tiers = buildSupplierPriceTierValues(scan);
  if (tiers.length === 0) {
    return null;
  }

  return tiers.join('; ');
};

const normalizeSupplierImageUrls = (
  scan: Pick<ProductScanRecord, 'supplierDetails'>
): string[] => {
  const urls = new Set<string>();

  for (const image of Array.isArray(scan.supplierDetails?.images) ? scan.supplierDetails.images : []) {
    const normalized = normalizeComparableText(image?.url);
    if (!normalized) {
      continue;
    }
    urls.add(normalized);
  }

  return Array.from(urls);
};

const buildReplacedImageSlots = (supplierImageUrls: string[], slotCount: number): string[] => {
  const next = new Array<string>(slotCount).fill('');
  supplierImageUrls.slice(0, slotCount).forEach((url, index) => {
    next[index] = url;
  });
  return next;
};

const buildAppendedImageSlots = (
  supplierImageUrls: string[],
  currentImageLinkSlots: string[]
): string[] => {
  const next = [...currentImageLinkSlots];
  const seenUrls = new Set(currentImageLinkSlots.filter((entry) => entry.length > 0));
  const emptySlotIndexes = next
    .map((entry, index) => (entry.length === 0 ? index : -1))
    .filter((index) => index >= 0);

  let emptySlotPointer = 0;
  for (const supplierUrl of supplierImageUrls) {
    if (seenUrls.has(supplierUrl)) {
      continue;
    }

    const targetIndex = emptySlotIndexes[emptySlotPointer];
    if (targetIndex == null) {
      break;
    }

    next[targetIndex] = supplierUrl;
    seenUrls.add(supplierUrl);
    emptySlotPointer += 1;
  }

  return next;
};

const normalizeSlotArray = (value: string[] | null | undefined, slotCount: number): string[] => {
  const next = new Array<string>(slotCount).fill('');
  if (!Array.isArray(value)) {
    return next;
  }

  value.slice(0, slotCount).forEach((entry, index) => {
    next[index] = normalizeComparableText(entry) ?? '';
  });
  return next;
};

const haveEqualSlots = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

export function ProductScan1688ApplyPanel(
  props: ProductScan1688ApplyPanelProps
): React.JSX.Element | null {
  const { scan, formBindings } = props;

  if (!formBindings) {
    return null;
  }

  const evaluationBanner = resolveProductScan1688ApplyPolicySummary(scan);
  const blockActions = evaluationBanner?.blockActions === true;
  const supplierName = normalizeComparableText(scan.supplierDetails?.supplierName);
  const supplierProductLink = buildSupplierProductLinkValue(scan);
  const supplierStoreLink = buildSupplierStoreLinkValue(scan);
  const supplierLink = supplierProductLink ?? supplierStoreLink;
  const priceComment = buildSupplierPriceCommentValue(scan);
  const detailedPriceComment = buildDetailedSupplierPriceCommentValue(scan);
  const supplierPriceTiers = buildSupplierPriceTierValues(scan);
  const extractedImageUrls = normalizeSupplierImageUrls(scan);

  const currentSupplierName =
    normalizeComparableText(formBindings.getTextFieldValue('supplierName')) ?? null;
  const currentSupplierLink =
    normalizeComparableText(formBindings.getTextFieldValue('supplierLink')) ?? null;
  const currentPriceComment =
    normalizeComparableText(formBindings.getTextFieldValue('priceComment')) ?? null;

  const imageSlotCount = Math.max(
    Array.isArray(formBindings.imageLinks) ? formBindings.imageLinks.length : 0,
    Array.isArray(formBindings.imageBase64s) ? formBindings.imageBase64s.length : 0
  );
  const currentImageLinkSlots = normalizeSlotArray(formBindings.imageLinks, imageSlotCount);
  const currentImageBase64Slots = normalizeSlotArray(formBindings.imageBase64s, imageSlotCount);
  const nextAppendedImageLinkSlots = buildAppendedImageSlots(
    extractedImageUrls,
    currentImageLinkSlots
  );
  const nextReplacedImageLinkSlots = buildReplacedImageSlots(extractedImageUrls, imageSlotCount);
  const hasCurrentImageBase64s = currentImageBase64Slots.some((entry) => entry.length > 0);
  const emptyImageSlotCount = currentImageLinkSlots.filter((entry) => entry.length === 0).length;
  const appendableImageUrlCount = nextAppendedImageLinkSlots.filter(
    (entry, index) => entry !== currentImageLinkSlots[index]
  ).length;
  const canApplySupplierName = Boolean(supplierName && supplierName !== currentSupplierName);
  const canApplySupplierLink = Boolean(supplierLink && supplierLink !== currentSupplierLink);
  const canApplySupplierProductLink = Boolean(
    supplierProductLink &&
      supplierProductLink !== currentSupplierLink
  );
  const canApplySupplierStoreLink = Boolean(
    supplierStoreLink &&
      supplierStoreLink !== supplierProductLink &&
      supplierStoreLink !== currentSupplierLink
  );
  const canApplyPriceComment = Boolean(priceComment && priceComment !== currentPriceComment);
  const canApplyDetailedPriceComment = Boolean(
    detailedPriceComment &&
      detailedPriceComment !== currentPriceComment &&
      detailedPriceComment !== priceComment
  );
  const canAppendImageUrls =
    extractedImageUrls.length > 0 &&
    imageSlotCount > 0 &&
    typeof formBindings.setImageLinkAt === 'function' &&
    (!haveEqualSlots(currentImageLinkSlots, nextAppendedImageLinkSlots) || hasCurrentImageBase64s);
  const canReplaceImageUrls =
    extractedImageUrls.length > 0 &&
    imageSlotCount > 0 &&
    typeof formBindings.setImageLinkAt === 'function' &&
    (!haveEqualSlots(currentImageLinkSlots, nextReplacedImageLinkSlots) || hasCurrentImageBase64s);
  const pendingActionCount = [
    canApplySupplierName,
    canApplySupplierLink,
    canApplyPriceComment,
    canApplyDetailedPriceComment,
    canAppendImageUrls,
    canReplaceImageUrls,
  ].filter(Boolean).length;

  const hasAnyAction = Boolean(
    canApplySupplierName ||
      canApplySupplierLink ||
      canApplyPriceComment ||
      canApplyDetailedPriceComment ||
      canAppendImageUrls ||
      canReplaceImageUrls
  );

  if (!hasAnyAction && !evaluationBanner) {
    return null;
  }

  return (
    <div className='space-y-2 rounded-md border border-border/50 bg-background/70 px-3 py-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='space-y-1'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Apply to product form
          </p>
          <p className='text-xs text-muted-foreground'>
            {blockActions
              ? 'Apply actions blocked by AI rejection'
              : `${pendingActionCount} pending supplier update${pendingActionCount === 1 ? '' : 's'}`}
          </p>
        </div>
        {!blockActions ? (
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              if (canApplySupplierName && supplierName) {
                formBindings.applyTextField('supplierName', supplierName);
              }
              if (canApplySupplierLink && supplierLink) {
                formBindings.applyTextField('supplierLink', supplierLink);
              }
              if (canApplyDetailedPriceComment && detailedPriceComment) {
                formBindings.applyTextField('priceComment', detailedPriceComment);
              } else if (canApplyPriceComment && priceComment) {
                formBindings.applyTextField('priceComment', priceComment);
              }
              if (canAppendImageUrls) {
                nextAppendedImageLinkSlots.forEach((value, index) => {
                  formBindings.setImageLinkAt?.(index, value);
                  if (value !== currentImageLinkSlots[index] || currentImageBase64Slots[index]) {
                    formBindings.setImageBase64At?.(index, '');
                  }
                });
              }
            }}
            className='h-7 px-2 text-xs'
          >
            Apply All Supplier Data
          </Button>
        ) : null}
      </div>

      {evaluationBanner ? (
        <div
          className={`rounded-md border px-3 py-2 text-sm ${
            evaluationBanner.tone === 'destructive'
              ? 'border-destructive/40 bg-destructive/5 text-destructive'
              : 'border-amber-500/40 bg-amber-500/5 text-amber-200'
          }`}
        >
          <p className='font-medium'>{evaluationBanner.label}</p>
          <p className='mt-1 text-xs'>{evaluationBanner.detail}</p>
        </div>
      ) : null}

      {!blockActions && supplierName ? (
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0 space-y-1'>
            <p className='text-sm font-medium text-foreground'>Supplier name</p>
            <p className='text-xs text-muted-foreground'>Current: {currentSupplierName ?? 'Not set'}</p>
            <p className='text-xs text-muted-foreground'>1688: {supplierName}</p>
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={!canApplySupplierName}
            onClick={() => formBindings.applyTextField('supplierName', supplierName)}
            className='h-7 px-2 text-xs'
          >
            Use Supplier Name
          </Button>
        </div>
      ) : null}

      {!blockActions && supplierLink ? (
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0 space-y-1'>
            <p className='text-sm font-medium text-foreground'>Supplier links</p>
            <p className='text-xs text-muted-foreground'>Current: {currentSupplierLink ?? 'Not set'}</p>
            {supplierProductLink ? (
              <p className='break-all text-xs text-muted-foreground'>
                Product page: {supplierProductLink}
              </p>
            ) : null}
            {supplierStoreLink ? (
              <p className='break-all text-xs text-muted-foreground'>
                Store page: {supplierStoreLink}
              </p>
            ) : null}
          </div>
          <div className='flex flex-wrap gap-2'>
            {supplierProductLink ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!canApplySupplierProductLink}
                onClick={() => formBindings.applyTextField('supplierLink', supplierProductLink)}
                className='h-7 px-2 text-xs'
              >
                Use Product Link
              </Button>
            ) : null}
            {supplierStoreLink && supplierStoreLink !== supplierProductLink ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!canApplySupplierStoreLink}
                onClick={() => formBindings.applyTextField('supplierLink', supplierStoreLink)}
                className='h-7 px-2 text-xs'
              >
                Use Store Link
              </Button>
            ) : null}
            {!supplierProductLink && supplierStoreLink ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!canApplySupplierLink}
                onClick={() => formBindings.applyTextField('supplierLink', supplierStoreLink)}
                className='h-7 px-2 text-xs'
              >
                Use Supplier Link
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {!blockActions && (priceComment || supplierPriceTiers.length > 0) ? (
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0 space-y-1'>
            <p className='text-sm font-medium text-foreground'>Price comment</p>
            <p className='text-xs text-muted-foreground'>Current: {currentPriceComment ?? 'Not set'}</p>
            {priceComment ? (
              <p className='text-xs text-muted-foreground'>Summary: {priceComment}</p>
            ) : null}
            {supplierPriceTiers.length > 0 ? (
              <div className='space-y-1 pt-1'>
                <p className='text-xs text-muted-foreground'>Extracted price tiers:</p>
                <ul className='space-y-1 text-xs text-muted-foreground'>
                  {supplierPriceTiers.slice(0, 4).map((tierValue, index) => (
                    <li key={`${tierValue}-${index}`} className='flex flex-wrap items-center gap-2'>
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5'>
                        Tier {index + 1}
                      </span>
                      <span>{tierValue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className='flex flex-wrap gap-2'>
            {priceComment ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!canApplyPriceComment}
                onClick={() => formBindings.applyTextField('priceComment', priceComment)}
                className='h-7 px-2 text-xs'
              >
                Use Price Summary
              </Button>
            ) : null}
            {detailedPriceComment ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                disabled={!canApplyDetailedPriceComment}
                onClick={() => formBindings.applyTextField('priceComment', detailedPriceComment)}
                className='h-7 px-2 text-xs'
              >
                Use Full Price Breakdown
              </Button>
            ) : null}
            {supplierPriceTiers.slice(0, 4).map((tierValue, index) => (
              <Button
                key={`${tierValue}-${index}`}
                type='button'
                variant='outline'
                size='sm'
                disabled={tierValue === currentPriceComment}
                onClick={() => formBindings.applyTextField('priceComment', tierValue)}
                className='h-7 px-2 text-xs'
              >
                Use Tier {index + 1}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {!blockActions && extractedImageUrls.length > 0 && imageSlotCount > 0 ? (
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0 space-y-1'>
            <p className='text-sm font-medium text-foreground'>Image URL slots</p>
            <p className='text-xs text-muted-foreground'>
              Current URLs: {currentImageLinkSlots.filter((entry) => entry.length > 0).length}
            </p>
            <p className='text-xs text-muted-foreground'>
              1688 extracted: {Math.min(extractedImageUrls.length, imageSlotCount)} of {imageSlotCount} slots
            </p>
            <p className='text-xs text-muted-foreground'>
              Empty slots: {emptyImageSlotCount} · Appendable URLs: {appendableImageUrlCount}
            </p>
            <p className='text-xs text-muted-foreground'>
              Append fills empty URL slots first. Replace overwrites URL/base64 slot values. Uploaded file slots stay untouched.
            </p>
          </div>
          <div className='flex flex-wrap gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!canAppendImageUrls}
              onClick={() => {
                nextAppendedImageLinkSlots.forEach((value, index) => {
                  formBindings.setImageLinkAt?.(index, value);
                  if (value !== currentImageLinkSlots[index] || currentImageBase64Slots[index]) {
                    formBindings.setImageBase64At?.(index, '');
                  }
                });
              }}
              className='h-7 px-2 text-xs'
            >
              Append Image URLs
            </Button>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={!canReplaceImageUrls}
              onClick={() => {
                nextReplacedImageLinkSlots.forEach((value, index) => {
                  formBindings.setImageLinkAt?.(index, value);
                  formBindings.setImageBase64At?.(index, '');
                });
              }}
              className='h-7 px-2 text-xs'
            >
              Replace Image URLs
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
