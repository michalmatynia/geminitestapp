import type {
  ProductScanSupplierPrice,
} from '@/shared/contracts/product-scans';
import { resolveProductScan1688ApplyPolicySummary } from '@/features/products/components/scans/ProductScan1688Details';
import type {
  ProductScan1688ApplyActions,
  ProductScan1688ApplyImageState,
  ProductScan1688ApplyModel,
  ProductScan1688ApplyScan,
  ProductScan1688FormBindings,
} from './ProductScan1688ApplyPanel.types';

export const normalizeComparableText = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const buildInlineSummary = (...values: Array<string | null | undefined>): string | null => {
  const entries = values
    .map((value) => normalizeComparableText(value))
    .filter((value): value is string => value !== null);

  return entries.length > 0 ? entries.join(' · ') : null;
};

const resolveAmountLabel = (price: ProductScanSupplierPrice): string | null => {
  const amount = normalizeComparableText(price.amount);
  const currency = normalizeComparableText(price.currency);
  if (amount === null) return null;
  return currency === null ? amount : `${amount} ${currency}`;
};

const resolveRangeLabel = (price: ProductScanSupplierPrice): string | null => {
  const rangeStart = normalizeComparableText(price.rangeStart);
  const rangeEnd = normalizeComparableText(price.rangeEnd);
  return rangeStart !== null && rangeEnd !== null ? `${rangeStart} - ${rangeEnd}` : null;
};

const resolveMoqLabel = (price: ProductScanSupplierPrice): string | null => {
  const moq = normalizeComparableText(price.moq);
  return moq === null ? null : `MOQ ${moq}`;
};

const formatSupplierPriceTier = (price: ProductScanSupplierPrice): string | null =>
  buildInlineSummary(
    price.label,
    resolveAmountLabel(price),
    resolveRangeLabel(price),
    resolveMoqLabel(price),
    price.unit
  );

const buildSupplierProductLinkValue = (scan: ProductScan1688ApplyScan): string | null =>
  normalizeComparableText(scan.supplierDetails?.supplierProductUrl) ??
  normalizeComparableText(scan.url);

const buildSupplierStoreLinkValue = (scan: ProductScan1688ApplyScan): string | null =>
  normalizeComparableText(scan.supplierDetails?.supplierStoreUrl);

const buildSupplierPriceCommentValue = (scan: ProductScan1688ApplyScan): string | null => {
  const primaryPrice =
    normalizeComparableText(scan.supplierDetails?.priceText) ??
    normalizeComparableText(scan.supplierDetails?.priceRangeText);
  const summary = buildInlineSummary(primaryPrice, scan.supplierDetails?.moqText);
  if (summary !== null) return summary;

  return buildSupplierPriceTierValues(scan).at(0) ?? null;
};

const buildSupplierPriceTierValues = (scan: ProductScan1688ApplyScan): string[] => {
  const seen = new Set<string>();
  const tiers: string[] = [];

  for (const price of resolveSupplierPrices(scan)) {
    const formattedTier = formatSupplierPriceTier(price);
    if (formattedTier === null || seen.has(formattedTier)) continue;
    seen.add(formattedTier);
    tiers.push(formattedTier);
  }

  return tiers;
};

const resolveSupplierPrices = (scan: ProductScan1688ApplyScan): ProductScanSupplierPrice[] =>
  Array.isArray(scan.supplierDetails?.prices) ? scan.supplierDetails.prices : [];

const buildDetailedSupplierPriceCommentValue = (
  supplierPriceTiers: string[]
): string | null => (supplierPriceTiers.length > 0 ? supplierPriceTiers.join('; ') : null);

const normalizeSupplierImageUrls = (scan: ProductScan1688ApplyScan): string[] => {
  const urls = new Set<string>();

  for (const image of Array.isArray(scan.supplierDetails?.images) ? scan.supplierDetails.images : []) {
    const normalized = normalizeComparableText(image.url);
    if (normalized !== null) urls.add(normalized);
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
  const emptySlotIndexes = resolveEmptySlotIndexes(next);

  let emptySlotPointer = 0;
  for (const supplierUrl of supplierImageUrls) {
    if (seenUrls.has(supplierUrl)) continue;

    const targetIndex = emptySlotIndexes[emptySlotPointer];
    if (targetIndex === undefined) break;

    next[targetIndex] = supplierUrl;
    seenUrls.add(supplierUrl);
    emptySlotPointer += 1;
  }

  return next;
};

const resolveEmptySlotIndexes = (slots: string[]): number[] =>
  slots
    .map((entry, index) => (entry.length === 0 ? index : -1))
    .filter((index) => index >= 0);

const normalizeSlotArray = (value: string[] | null | undefined, slotCount: number): string[] => {
  const next = new Array<string>(slotCount).fill('');
  if (Array.isArray(value) === false) return next;

  value.slice(0, slotCount).forEach((entry, index) => {
    next[index] = normalizeComparableText(entry) ?? '';
  });
  return next;
};

const haveEqualSlots = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

const resolveImageSlotCount = (formBindings: ProductScan1688FormBindings): number =>
  Math.max(
    Array.isArray(formBindings.imageLinks) ? formBindings.imageLinks.length : 0,
    Array.isArray(formBindings.imageBase64s) ? formBindings.imageBase64s.length : 0
  );

const buildImageState = (
  formBindings: ProductScan1688FormBindings,
  extractedImageUrls: string[]
): ProductScan1688ApplyImageState => {
  const imageSlotCount = resolveImageSlotCount(formBindings);
  const currentImageLinkSlots = normalizeSlotArray(formBindings.imageLinks, imageSlotCount);
  const currentImageBase64Slots = normalizeSlotArray(formBindings.imageBase64s, imageSlotCount);
  const nextAppendedImageLinkSlots = buildAppendedImageSlots(
    extractedImageUrls,
    currentImageLinkSlots
  );
  return {
    appendableImageUrlCount: countChangedSlots(nextAppendedImageLinkSlots, currentImageLinkSlots),
    currentImageBase64Slots,
    currentImageLinkSlots,
    emptyImageSlotCount: currentImageLinkSlots.filter((entry) => entry.length === 0).length,
    extractedImageUrls,
    imageSlotCount,
    nextAppendedImageLinkSlots,
    nextReplacedImageLinkSlots: buildReplacedImageSlots(extractedImageUrls, imageSlotCount),
  };
};

const countChangedSlots = (nextSlots: string[], currentSlots: string[]): number =>
  nextSlots.filter((entry, index) => entry !== currentSlots[index]).length;

const hasCurrentImageBase64s = (imageState: ProductScan1688ApplyImageState): boolean =>
  imageState.currentImageBase64Slots.some((entry) => entry.length > 0);

const canApplyValue = (nextValue: string | null, currentValue: string | null): boolean =>
  nextValue !== null && nextValue !== currentValue;

const canApplyImageSlots = (
  formBindings: ProductScan1688FormBindings,
  imageState: ProductScan1688ApplyImageState,
  nextSlots: string[]
): boolean =>
  imageState.extractedImageUrls.length > 0 &&
  imageState.imageSlotCount > 0 &&
  typeof formBindings.setImageLinkAt === 'function' &&
  (haveEqualSlots(imageState.currentImageLinkSlots, nextSlots) === false ||
    hasCurrentImageBase64s(imageState));

const buildActions = (
  formBindings: ProductScan1688FormBindings,
  modelValues: Pick<
    ProductScan1688ApplyModel,
    | 'currentPriceComment'
    | 'currentSupplierLink'
    | 'currentSupplierName'
    | 'detailedPriceComment'
    | 'imageState'
    | 'priceComment'
    | 'supplierLink'
    | 'supplierName'
    | 'supplierProductLink'
    | 'supplierStoreLink'
  >
): ProductScan1688ApplyActions => ({
  canAppendImageUrls: canApplyImageSlots(
    formBindings,
    modelValues.imageState,
    modelValues.imageState.nextAppendedImageLinkSlots
  ),
  canApplyDetailedPriceComment: canApplyDetailedPriceComment(modelValues),
  canApplyPriceComment: canApplyValue(modelValues.priceComment, modelValues.currentPriceComment),
  canApplySupplierLink: canApplyValue(modelValues.supplierLink, modelValues.currentSupplierLink),
  canApplySupplierName: canApplyValue(modelValues.supplierName, modelValues.currentSupplierName),
  canApplySupplierProductLink: canApplyValue(
    modelValues.supplierProductLink,
    modelValues.currentSupplierLink
  ),
  canApplySupplierStoreLink: canApplySupplierStoreLink(modelValues),
  canReplaceImageUrls: canApplyImageSlots(
    formBindings,
    modelValues.imageState,
    modelValues.imageState.nextReplacedImageLinkSlots
  ),
});

const canApplyDetailedPriceComment = (
  values: Pick<
    ProductScan1688ApplyModel,
    'currentPriceComment' | 'detailedPriceComment' | 'priceComment'
  >
): boolean =>
  values.detailedPriceComment !== null &&
  values.detailedPriceComment !== values.currentPriceComment &&
  values.detailedPriceComment !== values.priceComment;

const canApplySupplierStoreLink = (
  values: Pick<
    ProductScan1688ApplyModel,
    'currentSupplierLink' | 'supplierProductLink' | 'supplierStoreLink'
  >
): boolean =>
  values.supplierStoreLink !== null &&
  values.supplierStoreLink !== values.supplierProductLink &&
  values.supplierStoreLink !== values.currentSupplierLink;

const countPendingActions = (actions: ProductScan1688ApplyActions): number =>
  Object.values(actions).filter((enabled) => enabled === true).length;

const hasAnyAction = (actions: ProductScan1688ApplyActions): boolean =>
  Object.values(actions).some((enabled) => enabled === true);

export const resolveProductScan1688ApplyModel = (
  scan: ProductScan1688ApplyScan,
  formBindings: ProductScan1688FormBindings | null
): ProductScan1688ApplyModel | null => {
  if (formBindings === null) return null;

  const supplierPriceTiers = buildSupplierPriceTierValues(scan);
  const modelValues = buildModelValues(scan, formBindings, supplierPriceTiers);
  const actions = buildActions(formBindings, modelValues);
  const evaluationBanner = resolveProductScan1688ApplyPolicySummary(scan);
  if (hasAnyAction(actions) === false && evaluationBanner === null) return null;

  return {
    ...modelValues,
    actions,
    blockActions: evaluationBanner?.blockActions === true,
    evaluationBanner,
    formBindings,
    pendingActionCount: countPendingActions(actions),
    supplierPriceTiers,
  };
};

const buildModelValues = (
  scan: ProductScan1688ApplyScan,
  formBindings: ProductScan1688FormBindings,
  supplierPriceTiers: string[]
): Omit<
  ProductScan1688ApplyModel,
  | 'actions'
  | 'blockActions'
  | 'evaluationBanner'
  | 'formBindings'
  | 'pendingActionCount'
  | 'supplierPriceTiers'
> => {
  const supplierProductLink = buildSupplierProductLinkValue(scan);
  const supplierStoreLink = buildSupplierStoreLinkValue(scan);
  const extractedImageUrls = normalizeSupplierImageUrls(scan);
  return {
    currentPriceComment: normalizeComparableText(formBindings.getTextFieldValue('priceComment')),
    currentSupplierLink: normalizeComparableText(formBindings.getTextFieldValue('supplierLink')),
    currentSupplierName: normalizeComparableText(formBindings.getTextFieldValue('supplierName')),
    detailedPriceComment: buildDetailedSupplierPriceCommentValue(supplierPriceTiers),
    imageState: buildImageState(formBindings, extractedImageUrls),
    priceComment: buildSupplierPriceCommentValue(scan),
    supplierLink: supplierProductLink ?? supplierStoreLink,
    supplierName: normalizeComparableText(scan.supplierDetails?.supplierName),
    supplierProductLink,
    supplierStoreLink,
  };
};
