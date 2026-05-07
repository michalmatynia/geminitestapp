export interface WishlistContent {
  heroEyebrow: string;
  heroTitle: string;
  pieceSingular: string;
  piecePlural: string;
  savedLabel: string;
  refreshingLabel: string;
  emptyTitle: string;
  emptyBody: string;
  emptyCtaLabel: string;
  emptyCtaHref: string;
  currentCatalogLabel: string;
  savedItemsLabel: string;
  moveAllLabel: string;
  moveToBagLabel: string;
  movedToastTitle: string;
  removedToastTitle: string;
  removeItemAriaPrefix: string;
  removeItemAriaSuffix: string;
  liveBadgeLabel: string;
}

export interface WishlistContentValidationResult {
  content: WishlistContent;
  errors: string[];
}

export const WISHLIST_CONTENT_DEFAULTS: WishlistContent = {
  heroEyebrow: 'Saved objects',
  heroTitle: 'Your Wishlist',
  pieceSingular: 'piece',
  piecePlural: 'pieces',
  savedLabel: 'saved',
  refreshingLabel: 'refreshing prices...',
  emptyTitle: 'Nothing saved yet',
  emptyBody: 'Use the heart icon on any product to save it here',
  emptyCtaLabel: 'Explore the collection',
  emptyCtaHref: '/',
  currentCatalogLabel: 'Prices reflect current catalog',
  savedItemsLabel: 'Saved items',
  moveAllLabel: 'Move all to bag',
  moveToBagLabel: 'Move to bag',
  movedToastTitle: 'Moved to bag',
  removedToastTitle: 'Removed from wishlist',
  removeItemAriaPrefix: 'Remove',
  removeItemAriaSuffix: 'from wishlist',
  liveBadgeLabel: 'live',
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
  key: keyof WishlistContent,
  fallback: string,
  maxLength: number,
  errors: string[],
): string {
  const value = source[key];
  if (value == null) return fallback;
  if (typeof value !== 'string') {
    errors.push(`${String(key)} must be text.`);
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    errors.push(`${String(key)} must be ${maxLength} characters or fewer.`);
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
  key: keyof WishlistContent,
  fallback: string,
  errors: string[],
): string {
  const value = readString(source, key, fallback, TEXT_LIMITS.medium, errors);
  if (!value) return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${String(key)} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

export function validateWishlistContent(input: unknown): WishlistContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};

  const content: WishlistContent = {
    heroEyebrow: readString(root, 'heroEyebrow', WISHLIST_CONTENT_DEFAULTS.heroEyebrow, TEXT_LIMITS.short, errors),
    heroTitle: readString(root, 'heroTitle', WISHLIST_CONTENT_DEFAULTS.heroTitle, TEXT_LIMITS.short, errors),
    pieceSingular: readString(root, 'pieceSingular', WISHLIST_CONTENT_DEFAULTS.pieceSingular, TEXT_LIMITS.short, errors),
    piecePlural: readString(root, 'piecePlural', WISHLIST_CONTENT_DEFAULTS.piecePlural, TEXT_LIMITS.short, errors),
    savedLabel: readString(root, 'savedLabel', WISHLIST_CONTENT_DEFAULTS.savedLabel, TEXT_LIMITS.short, errors),
    refreshingLabel: readString(root, 'refreshingLabel', WISHLIST_CONTENT_DEFAULTS.refreshingLabel, TEXT_LIMITS.short, errors),
    emptyTitle: readString(root, 'emptyTitle', WISHLIST_CONTENT_DEFAULTS.emptyTitle, TEXT_LIMITS.short, errors),
    emptyBody: readString(root, 'emptyBody', WISHLIST_CONTENT_DEFAULTS.emptyBody, TEXT_LIMITS.medium, errors),
    emptyCtaLabel: readString(root, 'emptyCtaLabel', WISHLIST_CONTENT_DEFAULTS.emptyCtaLabel, TEXT_LIMITS.short, errors),
    emptyCtaHref: readHref(root, 'emptyCtaHref', WISHLIST_CONTENT_DEFAULTS.emptyCtaHref, errors),
    currentCatalogLabel: readString(
      root,
      'currentCatalogLabel',
      WISHLIST_CONTENT_DEFAULTS.currentCatalogLabel,
      TEXT_LIMITS.short,
      errors,
    ),
    savedItemsLabel: readString(root, 'savedItemsLabel', WISHLIST_CONTENT_DEFAULTS.savedItemsLabel, TEXT_LIMITS.short, errors),
    moveAllLabel: readString(root, 'moveAllLabel', WISHLIST_CONTENT_DEFAULTS.moveAllLabel, TEXT_LIMITS.short, errors),
    moveToBagLabel: readString(root, 'moveToBagLabel', WISHLIST_CONTENT_DEFAULTS.moveToBagLabel, TEXT_LIMITS.short, errors),
    movedToastTitle: readString(root, 'movedToastTitle', WISHLIST_CONTENT_DEFAULTS.movedToastTitle, TEXT_LIMITS.short, errors),
    removedToastTitle: readString(
      root,
      'removedToastTitle',
      WISHLIST_CONTENT_DEFAULTS.removedToastTitle,
      TEXT_LIMITS.short,
      errors,
    ),
    removeItemAriaPrefix: readString(
      root,
      'removeItemAriaPrefix',
      WISHLIST_CONTENT_DEFAULTS.removeItemAriaPrefix,
      TEXT_LIMITS.short,
      errors,
    ),
    removeItemAriaSuffix: readString(
      root,
      'removeItemAriaSuffix',
      WISHLIST_CONTENT_DEFAULTS.removeItemAriaSuffix,
      TEXT_LIMITS.short,
      errors,
    ),
    liveBadgeLabel: readString(root, 'liveBadgeLabel', WISHLIST_CONTENT_DEFAULTS.liveBadgeLabel, TEXT_LIMITS.short, errors),
  };

  return { content, errors };
}

export function normalizeWishlistContent(input: unknown): WishlistContent {
  return validateWishlistContent(input).content;
}
