export interface StoriesIndexContent {
  eyebrow: string;
  title: string;
  description: string;
  emptyTitle: string;
  emptyBody: string;
  featuredBadge: string;
  readLabel: string;
  categoryFilters: string[];
  cardReadLabel: string;
}

export interface StoriesDetailContent {
  breadcrumbLabel: string;
  issueLabelPrefix: string;
  relatedEyebrow: string;
}

export interface StoriesPageContent {
  index: StoriesIndexContent;
  detail: StoriesDetailContent;
}

export interface StoriesPageContentValidationResult {
  content: StoriesPageContent;
  errors: string[];
}

export const STORIES_PAGE_CONTENT_DEFAULTS: StoriesPageContent = {
  index: {
    eyebrow: 'From the field',
    title: 'Stories',
    description: 'Reports from the workshops, quarries, mills, and fields where our objects are made.',
    emptyTitle: 'Stories',
    emptyBody: 'No stories are published yet.',
    featuredBadge: 'Featured',
    readLabel: 'Read story',
    categoryFilters: ['All', 'Craft', 'Material', 'Maker', 'Object', 'Philosophy'],
    cardReadLabel: 'Read',
  },
  detail: {
    breadcrumbLabel: 'Stories',
    issueLabelPrefix: 'STARGATER Stories',
    relatedEyebrow: 'Continue reading',
  },
};

const TEXT_LIMITS = {
  short: 120,
  medium: 320,
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

function readStringList(
  source: Record<string, unknown>,
  key: string,
  fallback: string[],
  maxItems: number,
  maxItemLength: number,
  errors: string[],
  path: string,
): string[] {
  const value = source[key];
  if (value == null) return fallback;
  if (!Array.isArray(value)) {
    errors.push(`${path} must be a list.`);
    return fallback;
  }

  const items: string[] = [];
  for (const item of value) {
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

export function validateStoriesPageContent(input: unknown): StoriesPageContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const index = isRecord(root['index']) ? root['index'] : {};
  const detail = isRecord(root['detail']) ? root['detail'] : {};

  const content: StoriesPageContent = {
    index: {
      eyebrow: readString(index, 'eyebrow', STORIES_PAGE_CONTENT_DEFAULTS.index.eyebrow, TEXT_LIMITS.short, errors, 'stories.index.eyebrow'),
      title: readString(index, 'title', STORIES_PAGE_CONTENT_DEFAULTS.index.title, TEXT_LIMITS.short, errors, 'stories.index.title'),
      description: readString(
        index,
        'description',
        STORIES_PAGE_CONTENT_DEFAULTS.index.description,
        TEXT_LIMITS.medium,
        errors,
        'stories.index.description',
      ),
      emptyTitle: readString(index, 'emptyTitle', STORIES_PAGE_CONTENT_DEFAULTS.index.emptyTitle, TEXT_LIMITS.short, errors, 'stories.index.emptyTitle'),
      emptyBody: readString(index, 'emptyBody', STORIES_PAGE_CONTENT_DEFAULTS.index.emptyBody, TEXT_LIMITS.medium, errors, 'stories.index.emptyBody'),
      featuredBadge: readString(index, 'featuredBadge', STORIES_PAGE_CONTENT_DEFAULTS.index.featuredBadge, TEXT_LIMITS.short, errors, 'stories.index.featuredBadge'),
      readLabel: readString(index, 'readLabel', STORIES_PAGE_CONTENT_DEFAULTS.index.readLabel, TEXT_LIMITS.short, errors, 'stories.index.readLabel'),
      categoryFilters: readStringList(
        index,
        'categoryFilters',
        STORIES_PAGE_CONTENT_DEFAULTS.index.categoryFilters,
        12,
        TEXT_LIMITS.short,
        errors,
        'stories.index.categoryFilters',
      ),
      cardReadLabel: readString(index, 'cardReadLabel', STORIES_PAGE_CONTENT_DEFAULTS.index.cardReadLabel, TEXT_LIMITS.short, errors, 'stories.index.cardReadLabel'),
    },
    detail: {
      breadcrumbLabel: readString(detail, 'breadcrumbLabel', STORIES_PAGE_CONTENT_DEFAULTS.detail.breadcrumbLabel, TEXT_LIMITS.short, errors, 'stories.detail.breadcrumbLabel'),
      issueLabelPrefix: readString(detail, 'issueLabelPrefix', STORIES_PAGE_CONTENT_DEFAULTS.detail.issueLabelPrefix, TEXT_LIMITS.short, errors, 'stories.detail.issueLabelPrefix'),
      relatedEyebrow: readString(detail, 'relatedEyebrow', STORIES_PAGE_CONTENT_DEFAULTS.detail.relatedEyebrow, TEXT_LIMITS.short, errors, 'stories.detail.relatedEyebrow'),
    },
  };

  return { content, errors };
}

export function normalizeStoriesPageContent(input: unknown): StoriesPageContent {
  return validateStoriesPageContent(input).content;
}
