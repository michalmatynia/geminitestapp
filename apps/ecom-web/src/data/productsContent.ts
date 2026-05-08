export interface ProductsSortOptionContent {
  value: string;
  label: string;
}

export interface ProductsPriceRangeContent {
  label: string;
  min: number;
  max: number | null;
}

export interface ProductsCollectionContent {
  allProductsLabel: string;
  newArrivalsLabel: string;
  searchLabelPrefix: string;
  filtersLabel: string;
  searchPlaceholder: string;
  clearAllLabel: string;
  clearFiltersLabel: string;
  priceLabel: string;
  categoryLabel: string;
  categoryAllLabel: string;
  sizeLabel: string;
  homeBreadcrumbLabel: string;
  collectionsBreadcrumbLabel: string;
  productsCountLabel: string;
  piecesCountLabel: string;
  totalInCollectionLabel: string;
  sortLabel: string;
  comfortableViewAriaLabel: string;
  compactViewAriaLabel: string;
  resultSingular: string;
  resultPlural: string;
  ofLabel: string;
  noResultsTitle: string;
  quickAddLabel: string;
  addedToastTitle: string;
  loadingLabel: string;
  loadMorePrefix: string;
  remainingLabel: string;
  showingLabel: string;
  sortOptions: ProductsSortOptionContent[];
  sizes: string[];
  priceRanges: ProductsPriceRangeContent[];
}

export interface ProductsSizeGuideRowContent {
  size: string;
  chest: string;
  waist: string;
  hips: string;
}

export interface ProductsDetailContent {
  homeBreadcrumbLabel: string;
  imageAriaPrefix: string;
  rotatedBrandLabel: string;
  sizeGuideEyebrow: string;
  sizeGuideTitle: string;
  closeSizeGuideLabel: string;
  sizeGuideBody: string;
  sizeGuideHeaders: string[];
  sizeGuideRows: ProductsSizeGuideRowContent[];
  sizeGuideHelpPrefix: string;
  sizeGuideHelpEmail: string;
  sizeRequiredLabel: string;
  selectSizeLabel: string;
  sizeGuideLabel: string;
  addedButtonLabel: string;
  addToBagLabel: string;
  addedToastTitle: string;
  removedWishlistToastTitle: string;
  savedWishlistToastTitle: string;
  savedWishlistButtonLabel: string;
  saveWishlistButtonLabel: string;
  detailsAccordionLabel: string;
  careAccordionLabel: string;
  shippingReturnsAccordionLabel: string;
  shippingReturnsItems: string[];
  reviewsEyebrow: string;
  reviewsTitle: string;
  reviewSingularLabel: string;
  reviewPluralLabel: string;
  verifiedPurchaseLabel: string;
  writeReviewLabel: string;
  writeReviewHref: string;
  relatedEyebrow: string;
  relatedTitle: string;
}

export interface ProductsContent {
  collection: ProductsCollectionContent;
  detail: ProductsDetailContent;
}

export interface ProductsContentValidationResult {
  content: ProductsContent;
  errors: string[];
}

export const PRODUCTS_CONTENT_DEFAULTS: ProductsContent = {
  collection: {
    allProductsLabel: 'All Products',
    newArrivalsLabel: 'New Arrivals',
    searchLabelPrefix: 'Search',
    filtersLabel: 'Filters',
    searchPlaceholder: 'Search products…',
    clearAllLabel: 'Clear all',
    clearFiltersLabel: 'Clear filters',
    priceLabel: 'Price',
    categoryLabel: 'Category',
    categoryAllLabel: 'All',
    sizeLabel: 'Size',
    homeBreadcrumbLabel: 'Home',
    collectionsBreadcrumbLabel: 'Collections',
    productsCountLabel: 'products',
    piecesCountLabel: 'pieces',
    totalInCollectionLabel: 'total in collection',
    sortLabel: 'Sort:',
    comfortableViewAriaLabel: 'Comfortable view',
    compactViewAriaLabel: 'Compact view',
    resultSingular: 'result',
    resultPlural: 'results',
    ofLabel: 'of',
    noResultsTitle: 'No pieces found',
    quickAddLabel: 'Quick Add',
    addedToastTitle: 'Added to bag',
    loadingLabel: 'Loading...',
    loadMorePrefix: 'Load more',
    remainingLabel: 'remaining',
    showingLabel: 'Showing',
    sortOptions: [
      { value: 'featured', label: 'Featured' },
      { value: 'price-asc', label: 'Price: Low to High' },
      { value: 'price-desc', label: 'Price: High to Low' },
      { value: 'newest', label: 'Newest' },
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', '44', '46', '48', '50', '52'],
    priceRanges: [
      { label: 'Under 200 zł', min: 0, max: 200 },
      { label: '200 zł - 500 zł', min: 200, max: 500 },
      { label: '500 zł - 1,000 zł', min: 500, max: 1000 },
      { label: 'Over 1,000 zł', min: 1000, max: null },
    ],
  },
  detail: {
    homeBreadcrumbLabel: 'Home',
    imageAriaPrefix: 'View image',
    rotatedBrandLabel: 'ARCANA',
    sizeGuideEyebrow: 'Sizing',
    sizeGuideTitle: 'Size Guide',
    closeSizeGuideLabel: 'Close size guide',
    sizeGuideBody: 'All measurements in centimetres. For the best fit, measure over light clothing.',
    sizeGuideHeaders: ['Size', 'Chest', 'Waist', 'Hips'],
    sizeGuideRows: [
      { size: 'XS', chest: '82-86', waist: '66-70', hips: '88-92' },
      { size: 'S', chest: '86-90', waist: '70-74', hips: '92-96' },
      { size: 'M', chest: '90-94', waist: '74-78', hips: '96-100' },
      { size: 'L', chest: '94-98', waist: '78-82', hips: '100-104' },
      { size: 'XL', chest: '98-104', waist: '82-88', hips: '104-110' },
    ],
    sizeGuideHelpPrefix: 'Unsure? Email us at',
    sizeGuideHelpEmail: 'sizing@arcana.com',
    sizeRequiredLabel: 'Please select a size',
    selectSizeLabel: 'Select size',
    sizeGuideLabel: 'Size guide',
    addedButtonLabel: 'Added to bag',
    addToBagLabel: 'Add to Bag',
    addedToastTitle: 'Added to bag',
    removedWishlistToastTitle: 'Removed from wishlist',
    savedWishlistToastTitle: 'Saved to wishlist',
    savedWishlistButtonLabel: 'Saved to Wishlist',
    saveWishlistButtonLabel: 'Save to Wishlist',
    detailsAccordionLabel: 'Object Details',
    careAccordionLabel: 'Care Instructions',
    shippingReturnsAccordionLabel: 'Shipping & Returns',
    shippingReturnsItems: [
      'Complimentary shipping on orders over € 400',
      'Standard delivery: 3-5 business days',
      'Express delivery available at checkout',
      'Free returns within 30 days',
      'Items must be in original condition',
    ],
    reviewsEyebrow: 'Customer reviews',
    reviewsTitle: 'What people say',
    reviewSingularLabel: 'review',
    reviewPluralLabel: 'reviews',
    verifiedPurchaseLabel: 'Verified purchase',
    writeReviewLabel: 'Write a review',
    writeReviewHref: '/contact',
    relatedEyebrow: 'You may also like',
    relatedTitle: 'From the same collection',
  },
};

const TEXT_LIMITS = {
  short: 120,
  medium: 240,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  maxLength: number,
  errors: string[],
  path: string,
): string {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'string') {
    errors.push(`${path} must be text.`);
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push(`${path} must be ${maxLength} characters or fewer.`);
    return fallback;
  }

  return trimmed;
}

function isAllowedHref(value: string): boolean {
  if (value.startsWith('/') && !value.startsWith('//')) return true;
  if (value.startsWith('#')) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function readHref(
  source: Record<string, unknown>,
  key: string,
  fallback: string,
  errors: string[],
  path: string,
): string {
  const value = readString(source, key, fallback, TEXT_LIMITS.short, errors, path);
  if (!value) return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

function readNumber(
  source: Record<string, unknown>,
  key: string,
  fallback: number,
  errors: string[],
  path: string,
): number {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    errors.push(`${path} must be a non-negative number.`);
    return fallback;
  }
  return value;
}

function readNullableNumber(
  source: Record<string, unknown>,
  key: string,
  fallback: number | null,
  errors: string[],
  path: string,
): number | null {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    errors.push(`${path} must be a non-negative number or null.`);
    return fallback;
  }
  return value;
}

function readStringList(
  input: unknown,
  fallback: string[],
  maxItems: number,
  maxItemLength: number,
  errors: string[],
  path: string,
): string[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const items: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') {
      errors.push(`${path} can only contain text items.`);
      return fallback;
    }
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxItemLength) {
      errors.push(`${path} items must be ${maxItemLength} characters or fewer.`);
      return fallback;
    }
    items.push(trimmed);
  }

  if (items.length > maxItems) {
    errors.push(`${path} can contain at most ${maxItems} items.`);
    return fallback;
  }

  return items.length > 0 ? items : fallback;
}

function readSortOptions(input: unknown, fallback: ProductsSortOptionContent[], errors: string[]): ProductsSortOptionContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('collection.sortOptions must be a list.');
    return fallback;
  }

  const items: ProductsSortOptionContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackItem = fallback[index] ?? { value: '', label: '' };
    if (!isRecord(item)) {
      errors.push('collection.sortOptions items must be objects.');
      return fallback;
    }
    items.push({
      value: readString(item, 'value', fallbackItem.value, TEXT_LIMITS.short, errors, `collection.sortOptions.${index}.value`),
      label: readString(item, 'label', fallbackItem.label, TEXT_LIMITS.short, errors, `collection.sortOptions.${index}.label`),
    });
  }

  if (items.length > 8) {
    errors.push('collection.sortOptions can contain at most 8 items.');
    return fallback;
  }

  return items.length > 0 ? items : fallback;
}

function readPriceRanges(input: unknown, fallback: ProductsPriceRangeContent[], errors: string[]): ProductsPriceRangeContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('collection.priceRanges must be a list.');
    return fallback;
  }

  const items: ProductsPriceRangeContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackItem = fallback[index] ?? { label: '', min: 0, max: null };
    if (!isRecord(item)) {
      errors.push('collection.priceRanges items must be objects.');
      return fallback;
    }
    items.push({
      label: readString(item, 'label', fallbackItem.label, TEXT_LIMITS.short, errors, `collection.priceRanges.${index}.label`),
      min: readNumber(item, 'min', fallbackItem.min, errors, `collection.priceRanges.${index}.min`),
      max: readNullableNumber(item, 'max', fallbackItem.max, errors, `collection.priceRanges.${index}.max`),
    });
  }

  if (items.length > 12) {
    errors.push('collection.priceRanges can contain at most 12 items.');
    return fallback;
  }

  return items.length > 0 ? items : fallback;
}

function readSizeGuideRows(input: unknown, fallback: ProductsSizeGuideRowContent[], errors: string[]): ProductsSizeGuideRowContent[] {
  if (input == null) return fallback;
  if (!Array.isArray(input)) {
    errors.push('detail.sizeGuideRows must be a list.');
    return fallback;
  }

  const rows: ProductsSizeGuideRowContent[] = [];
  for (const [index, item] of input.entries()) {
    const fallbackItem = fallback[index] ?? { size: '', chest: '', waist: '', hips: '' };
    if (!isRecord(item)) {
      errors.push('detail.sizeGuideRows items must be objects.');
      return fallback;
    }
    rows.push({
      size: readString(item, 'size', fallbackItem.size, TEXT_LIMITS.short, errors, `detail.sizeGuideRows.${index}.size`),
      chest: readString(item, 'chest', fallbackItem.chest, TEXT_LIMITS.short, errors, `detail.sizeGuideRows.${index}.chest`),
      waist: readString(item, 'waist', fallbackItem.waist, TEXT_LIMITS.short, errors, `detail.sizeGuideRows.${index}.waist`),
      hips: readString(item, 'hips', fallbackItem.hips, TEXT_LIMITS.short, errors, `detail.sizeGuideRows.${index}.hips`),
    });
  }

  if (rows.length > 20) {
    errors.push('detail.sizeGuideRows can contain at most 20 items.');
    return fallback;
  }

  return rows.length > 0 ? rows : fallback;
}

export function validateProductsContent(input: unknown): ProductsContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const collection = isRecord(root['collection']) ? root['collection'] : {};
  const detail = isRecord(root['detail']) ? root['detail'] : {};
  const collectionDefaults = PRODUCTS_CONTENT_DEFAULTS.collection;
  const detailDefaults = PRODUCTS_CONTENT_DEFAULTS.detail;

  const content: ProductsContent = {
    collection: {
      allProductsLabel: readString(collection, 'allProductsLabel', collectionDefaults.allProductsLabel, TEXT_LIMITS.short, errors, 'collection.allProductsLabel'),
      newArrivalsLabel: readString(collection, 'newArrivalsLabel', collectionDefaults.newArrivalsLabel, TEXT_LIMITS.short, errors, 'collection.newArrivalsLabel'),
      searchLabelPrefix: readString(collection, 'searchLabelPrefix', collectionDefaults.searchLabelPrefix, TEXT_LIMITS.short, errors, 'collection.searchLabelPrefix'),
      filtersLabel: readString(collection, 'filtersLabel', collectionDefaults.filtersLabel, TEXT_LIMITS.short, errors, 'collection.filtersLabel'),
      searchPlaceholder: readString(collection, 'searchPlaceholder', collectionDefaults.searchPlaceholder, TEXT_LIMITS.short, errors, 'collection.searchPlaceholder'),
      clearAllLabel: readString(collection, 'clearAllLabel', collectionDefaults.clearAllLabel, TEXT_LIMITS.short, errors, 'collection.clearAllLabel'),
      clearFiltersLabel: readString(collection, 'clearFiltersLabel', collectionDefaults.clearFiltersLabel, TEXT_LIMITS.short, errors, 'collection.clearFiltersLabel'),
      priceLabel: readString(collection, 'priceLabel', collectionDefaults.priceLabel, TEXT_LIMITS.short, errors, 'collection.priceLabel'),
      categoryLabel: readString(collection, 'categoryLabel', collectionDefaults.categoryLabel, TEXT_LIMITS.short, errors, 'collection.categoryLabel'),
      categoryAllLabel: readString(collection, 'categoryAllLabel', collectionDefaults.categoryAllLabel, TEXT_LIMITS.short, errors, 'collection.categoryAllLabel'),
      sizeLabel: readString(collection, 'sizeLabel', collectionDefaults.sizeLabel, TEXT_LIMITS.short, errors, 'collection.sizeLabel'),
      homeBreadcrumbLabel: readString(collection, 'homeBreadcrumbLabel', collectionDefaults.homeBreadcrumbLabel, TEXT_LIMITS.short, errors, 'collection.homeBreadcrumbLabel'),
      collectionsBreadcrumbLabel: readString(collection, 'collectionsBreadcrumbLabel', collectionDefaults.collectionsBreadcrumbLabel, TEXT_LIMITS.short, errors, 'collection.collectionsBreadcrumbLabel'),
      productsCountLabel: readString(collection, 'productsCountLabel', collectionDefaults.productsCountLabel, TEXT_LIMITS.short, errors, 'collection.productsCountLabel'),
      piecesCountLabel: readString(collection, 'piecesCountLabel', collectionDefaults.piecesCountLabel, TEXT_LIMITS.short, errors, 'collection.piecesCountLabel'),
      totalInCollectionLabel: readString(collection, 'totalInCollectionLabel', collectionDefaults.totalInCollectionLabel, TEXT_LIMITS.short, errors, 'collection.totalInCollectionLabel'),
      sortLabel: readString(collection, 'sortLabel', collectionDefaults.sortLabel, TEXT_LIMITS.short, errors, 'collection.sortLabel'),
      comfortableViewAriaLabel: readString(collection, 'comfortableViewAriaLabel', collectionDefaults.comfortableViewAriaLabel, TEXT_LIMITS.short, errors, 'collection.comfortableViewAriaLabel'),
      compactViewAriaLabel: readString(collection, 'compactViewAriaLabel', collectionDefaults.compactViewAriaLabel, TEXT_LIMITS.short, errors, 'collection.compactViewAriaLabel'),
      resultSingular: readString(collection, 'resultSingular', collectionDefaults.resultSingular, TEXT_LIMITS.short, errors, 'collection.resultSingular'),
      resultPlural: readString(collection, 'resultPlural', collectionDefaults.resultPlural, TEXT_LIMITS.short, errors, 'collection.resultPlural'),
      ofLabel: readString(collection, 'ofLabel', collectionDefaults.ofLabel, TEXT_LIMITS.short, errors, 'collection.ofLabel'),
      noResultsTitle: readString(collection, 'noResultsTitle', collectionDefaults.noResultsTitle, TEXT_LIMITS.short, errors, 'collection.noResultsTitle'),
      quickAddLabel: readString(collection, 'quickAddLabel', collectionDefaults.quickAddLabel, TEXT_LIMITS.short, errors, 'collection.quickAddLabel'),
      addedToastTitle: readString(collection, 'addedToastTitle', collectionDefaults.addedToastTitle, TEXT_LIMITS.short, errors, 'collection.addedToastTitle'),
      loadingLabel: readString(collection, 'loadingLabel', collectionDefaults.loadingLabel, TEXT_LIMITS.short, errors, 'collection.loadingLabel'),
      loadMorePrefix: readString(collection, 'loadMorePrefix', collectionDefaults.loadMorePrefix, TEXT_LIMITS.short, errors, 'collection.loadMorePrefix'),
      remainingLabel: readString(collection, 'remainingLabel', collectionDefaults.remainingLabel, TEXT_LIMITS.short, errors, 'collection.remainingLabel'),
      showingLabel: readString(collection, 'showingLabel', collectionDefaults.showingLabel, TEXT_LIMITS.short, errors, 'collection.showingLabel'),
      sortOptions: readSortOptions(collection['sortOptions'], collectionDefaults.sortOptions, errors),
      sizes: readStringList(collection['sizes'], collectionDefaults.sizes, 30, TEXT_LIMITS.short, errors, 'collection.sizes'),
      priceRanges: readPriceRanges(collection['priceRanges'], collectionDefaults.priceRanges, errors),
    },
    detail: {
      homeBreadcrumbLabel: readString(detail, 'homeBreadcrumbLabel', detailDefaults.homeBreadcrumbLabel, TEXT_LIMITS.short, errors, 'detail.homeBreadcrumbLabel'),
      imageAriaPrefix: readString(detail, 'imageAriaPrefix', detailDefaults.imageAriaPrefix, TEXT_LIMITS.short, errors, 'detail.imageAriaPrefix'),
      rotatedBrandLabel: readString(detail, 'rotatedBrandLabel', detailDefaults.rotatedBrandLabel, TEXT_LIMITS.short, errors, 'detail.rotatedBrandLabel'),
      sizeGuideEyebrow: readString(detail, 'sizeGuideEyebrow', detailDefaults.sizeGuideEyebrow, TEXT_LIMITS.short, errors, 'detail.sizeGuideEyebrow'),
      sizeGuideTitle: readString(detail, 'sizeGuideTitle', detailDefaults.sizeGuideTitle, TEXT_LIMITS.short, errors, 'detail.sizeGuideTitle'),
      closeSizeGuideLabel: readString(detail, 'closeSizeGuideLabel', detailDefaults.closeSizeGuideLabel, TEXT_LIMITS.short, errors, 'detail.closeSizeGuideLabel'),
      sizeGuideBody: readString(detail, 'sizeGuideBody', detailDefaults.sizeGuideBody, TEXT_LIMITS.medium, errors, 'detail.sizeGuideBody'),
      sizeGuideHeaders: readStringList(detail['sizeGuideHeaders'], detailDefaults.sizeGuideHeaders, 8, TEXT_LIMITS.short, errors, 'detail.sizeGuideHeaders'),
      sizeGuideRows: readSizeGuideRows(detail['sizeGuideRows'], detailDefaults.sizeGuideRows, errors),
      sizeGuideHelpPrefix: readString(detail, 'sizeGuideHelpPrefix', detailDefaults.sizeGuideHelpPrefix, TEXT_LIMITS.short, errors, 'detail.sizeGuideHelpPrefix'),
      sizeGuideHelpEmail: readString(detail, 'sizeGuideHelpEmail', detailDefaults.sizeGuideHelpEmail, TEXT_LIMITS.short, errors, 'detail.sizeGuideHelpEmail'),
      sizeRequiredLabel: readString(detail, 'sizeRequiredLabel', detailDefaults.sizeRequiredLabel, TEXT_LIMITS.short, errors, 'detail.sizeRequiredLabel'),
      selectSizeLabel: readString(detail, 'selectSizeLabel', detailDefaults.selectSizeLabel, TEXT_LIMITS.short, errors, 'detail.selectSizeLabel'),
      sizeGuideLabel: readString(detail, 'sizeGuideLabel', detailDefaults.sizeGuideLabel, TEXT_LIMITS.short, errors, 'detail.sizeGuideLabel'),
      addedButtonLabel: readString(detail, 'addedButtonLabel', detailDefaults.addedButtonLabel, TEXT_LIMITS.short, errors, 'detail.addedButtonLabel'),
      addToBagLabel: readString(detail, 'addToBagLabel', detailDefaults.addToBagLabel, TEXT_LIMITS.short, errors, 'detail.addToBagLabel'),
      addedToastTitle: readString(detail, 'addedToastTitle', detailDefaults.addedToastTitle, TEXT_LIMITS.short, errors, 'detail.addedToastTitle'),
      removedWishlistToastTitle: readString(detail, 'removedWishlistToastTitle', detailDefaults.removedWishlistToastTitle, TEXT_LIMITS.short, errors, 'detail.removedWishlistToastTitle'),
      savedWishlistToastTitle: readString(detail, 'savedWishlistToastTitle', detailDefaults.savedWishlistToastTitle, TEXT_LIMITS.short, errors, 'detail.savedWishlistToastTitle'),
      savedWishlistButtonLabel: readString(detail, 'savedWishlistButtonLabel', detailDefaults.savedWishlistButtonLabel, TEXT_LIMITS.short, errors, 'detail.savedWishlistButtonLabel'),
      saveWishlistButtonLabel: readString(detail, 'saveWishlistButtonLabel', detailDefaults.saveWishlistButtonLabel, TEXT_LIMITS.short, errors, 'detail.saveWishlistButtonLabel'),
      detailsAccordionLabel: readString(detail, 'detailsAccordionLabel', detailDefaults.detailsAccordionLabel, TEXT_LIMITS.short, errors, 'detail.detailsAccordionLabel'),
      careAccordionLabel: readString(detail, 'careAccordionLabel', detailDefaults.careAccordionLabel, TEXT_LIMITS.short, errors, 'detail.careAccordionLabel'),
      shippingReturnsAccordionLabel: readString(detail, 'shippingReturnsAccordionLabel', detailDefaults.shippingReturnsAccordionLabel, TEXT_LIMITS.short, errors, 'detail.shippingReturnsAccordionLabel'),
      shippingReturnsItems: readStringList(detail['shippingReturnsItems'], detailDefaults.shippingReturnsItems, 12, TEXT_LIMITS.medium, errors, 'detail.shippingReturnsItems'),
      reviewsEyebrow: readString(detail, 'reviewsEyebrow', detailDefaults.reviewsEyebrow, TEXT_LIMITS.short, errors, 'detail.reviewsEyebrow'),
      reviewsTitle: readString(detail, 'reviewsTitle', detailDefaults.reviewsTitle, TEXT_LIMITS.short, errors, 'detail.reviewsTitle'),
      reviewSingularLabel: readString(detail, 'reviewSingularLabel', detailDefaults.reviewSingularLabel, TEXT_LIMITS.short, errors, 'detail.reviewSingularLabel'),
      reviewPluralLabel: readString(detail, 'reviewPluralLabel', detailDefaults.reviewPluralLabel, TEXT_LIMITS.short, errors, 'detail.reviewPluralLabel'),
      verifiedPurchaseLabel: readString(detail, 'verifiedPurchaseLabel', detailDefaults.verifiedPurchaseLabel, TEXT_LIMITS.short, errors, 'detail.verifiedPurchaseLabel'),
      writeReviewLabel: readString(detail, 'writeReviewLabel', detailDefaults.writeReviewLabel, TEXT_LIMITS.short, errors, 'detail.writeReviewLabel'),
      writeReviewHref: readHref(detail, 'writeReviewHref', detailDefaults.writeReviewHref, errors, 'detail.writeReviewHref'),
      relatedEyebrow: readString(detail, 'relatedEyebrow', detailDefaults.relatedEyebrow, TEXT_LIMITS.short, errors, 'detail.relatedEyebrow'),
      relatedTitle: readString(detail, 'relatedTitle', detailDefaults.relatedTitle, TEXT_LIMITS.short, errors, 'detail.relatedTitle'),
    },
  };

  return { content, errors };
}

export function normalizeProductsContent(input: unknown): ProductsContent {
  return validateProductsContent(input).content;
}
