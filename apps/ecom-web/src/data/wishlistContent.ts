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

const STRING_FIELD_SPECS: {
  key: keyof WishlistContent;
  fallback: string;
  maxLength: number;
}[] = [
  { key: 'heroEyebrow', fallback: WISHLIST_CONTENT_DEFAULTS.heroEyebrow, maxLength: TEXT_LIMITS.short },
  { key: 'heroTitle', fallback: WISHLIST_CONTENT_DEFAULTS.heroTitle, maxLength: TEXT_LIMITS.short },
  { key: 'pieceSingular', fallback: WISHLIST_CONTENT_DEFAULTS.pieceSingular, maxLength: TEXT_LIMITS.short },
  { key: 'piecePlural', fallback: WISHLIST_CONTENT_DEFAULTS.piecePlural, maxLength: TEXT_LIMITS.short },
  { key: 'savedLabel', fallback: WISHLIST_CONTENT_DEFAULTS.savedLabel, maxLength: TEXT_LIMITS.short },
  { key: 'refreshingLabel', fallback: WISHLIST_CONTENT_DEFAULTS.refreshingLabel, maxLength: TEXT_LIMITS.short },
  { key: 'emptyTitle', fallback: WISHLIST_CONTENT_DEFAULTS.emptyTitle, maxLength: TEXT_LIMITS.short },
  { key: 'emptyBody', fallback: WISHLIST_CONTENT_DEFAULTS.emptyBody, maxLength: TEXT_LIMITS.medium },
  { key: 'emptyCtaLabel', fallback: WISHLIST_CONTENT_DEFAULTS.emptyCtaLabel, maxLength: TEXT_LIMITS.short },
  { key: 'currentCatalogLabel', fallback: WISHLIST_CONTENT_DEFAULTS.currentCatalogLabel, maxLength: TEXT_LIMITS.short },
  { key: 'savedItemsLabel', fallback: WISHLIST_CONTENT_DEFAULTS.savedItemsLabel, maxLength: TEXT_LIMITS.short },
  { key: 'moveAllLabel', fallback: WISHLIST_CONTENT_DEFAULTS.moveAllLabel, maxLength: TEXT_LIMITS.short },
  { key: 'moveToBagLabel', fallback: WISHLIST_CONTENT_DEFAULTS.moveToBagLabel, maxLength: TEXT_LIMITS.short },
  { key: 'movedToastTitle', fallback: WISHLIST_CONTENT_DEFAULTS.movedToastTitle, maxLength: TEXT_LIMITS.short },
  { key: 'removedToastTitle', fallback: WISHLIST_CONTENT_DEFAULTS.removedToastTitle, maxLength: TEXT_LIMITS.short },
  { key: 'removeItemAriaPrefix', fallback: WISHLIST_CONTENT_DEFAULTS.removeItemAriaPrefix, maxLength: TEXT_LIMITS.short },
  { key: 'removeItemAriaSuffix', fallback: WISHLIST_CONTENT_DEFAULTS.removeItemAriaSuffix, maxLength: TEXT_LIMITS.short },
  { key: 'liveBadgeLabel', fallback: WISHLIST_CONTENT_DEFAULTS.liveBadgeLabel, maxLength: TEXT_LIMITS.short },
];

function buildWishlistContent(
  root: Record<string, unknown>,
  errors: string[],
): WishlistContent {
  const content: WishlistContent = { ...WISHLIST_CONTENT_DEFAULTS };

  for (const spec of STRING_FIELD_SPECS) {
    content[spec.key] = readString({
      source: root,
      key: spec.key,
      fallback: spec.fallback,
      maxLength: spec.maxLength,
      errors,
    });
  }

  content.emptyCtaHref = readHref({
    source: root,
    key: 'emptyCtaHref',
    fallback: WISHLIST_CONTENT_DEFAULTS.emptyCtaHref,
    errors,
  });

  return content;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

type ReadStringParams = {
  source: Record<string, unknown>;
  key: keyof WishlistContent;
  fallback: string;
  maxLength: number;
  errors: string[];
};

function readString(
  { source, key, fallback, maxLength, errors }: ReadStringParams,
): string {
  const value = source[key];
  if (value === null) return fallback;
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
  { source, key, fallback, errors }: Omit<ReadStringParams, 'maxLength'>,
): string {
  const value = readString({
    source,
    key,
    fallback,
    maxLength: TEXT_LIMITS.medium,
    errors,
  });
  if (value === '') return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${String(key)} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

export function validateWishlistContent(input: unknown): WishlistContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const content = buildWishlistContent(root, errors);

  return { content, errors };
}

export function normalizeWishlistContent(input: unknown): WishlistContent {
  return validateWishlistContent(input).content;
}
