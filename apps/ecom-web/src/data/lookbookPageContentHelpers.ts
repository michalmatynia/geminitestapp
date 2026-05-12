import type {
  LookbookArchiveContent,
  LookbookCtaContent,
  LookbookMastheadContent,
} from './lookbookPageContent';

const TEXT_LIMITS = {
  short: 120,
  medium: 320,
} as const;

type ReadStringParams = {
  source: Record<string, unknown>;
  key: string;
  fallback: string;
  maxLength: number;
  errors: string[];
  path: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString({
  source,
  key,
  fallback,
  maxLength,
  errors,
  path,
}: ReadStringParams): string {
  const value = source[key];
  if (value === null) return fallback;
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

export function readLookbookHref({
  source,
  key,
  fallback,
  errors,
  path,
}: Omit<ReadStringParams, 'maxLength'>): string {
  const value = readString({
    source,
    key,
    fallback,
    maxLength: TEXT_LIMITS.medium,
    errors,
    path,
  });
  if (value === '') return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

export function buildLookbookMastheadContent(
  source: Record<string, unknown>,
  defaults: LookbookMastheadContent,
  errors: string[],
): LookbookMastheadContent {
  return {
    watermark: readString({
      source,
      key: 'watermark',
      fallback: defaults.watermark,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.masthead.watermark',
    }),
    eyebrow: readString({
      source,
      key: 'eyebrow',
      fallback: defaults.eyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.masthead.eyebrow',
    }),
    title: readString({
      source,
      key: 'title',
      fallback: defaults.title,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.masthead.title',
    }),
    description: readString({
      source,
      key: 'description',
      fallback: defaults.description,
      maxLength: TEXT_LIMITS.medium,
      errors,
      path: 'lookbook.masthead.description',
    }),
    issueRange: readString({
      source,
      key: 'issueRange',
      fallback: defaults.issueRange,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.masthead.issueRange',
    }),
    dateRange: readString({
      source,
      key: 'dateRange',
      fallback: defaults.dateRange,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.masthead.dateRange',
    }),
  };
}

export function buildLookbookCtaContent(
  source: Record<string, unknown>,
  defaults: LookbookCtaContent,
  errors: string[],
): LookbookCtaContent {
  return {
    issueLabel: readString({
      source,
      key: 'issueLabel',
      fallback: defaults.issueLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.cta.issueLabel',
    }),
    titleLine1: readString({
      source,
      key: 'titleLine1',
      fallback: defaults.titleLine1,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.cta.titleLine1',
    }),
    titleLine2: readString({
      source,
      key: 'titleLine2',
      fallback: defaults.titleLine2,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.cta.titleLine2',
    }),
    body: readString({
      source,
      key: 'body',
      fallback: defaults.body,
      maxLength: TEXT_LIMITS.medium,
      errors,
      path: 'lookbook.cta.body',
    }),
    label: readString({
      source,
      key: 'label',
      fallback: defaults.label,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.cta.label',
    }),
    href: readLookbookHref({
      source,
      key: 'href',
      fallback: defaults.href,
      errors,
      path: 'lookbook.cta.href',
    }),
  };
}

export function buildLookbookArchiveContent(
  source: Record<string, unknown>,
  defaults: LookbookArchiveContent,
  errors: string[],
): LookbookArchiveContent {
  return {
    label: readString({
      source,
      key: 'label',
      fallback: defaults.label,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.archive.label',
    }),
    ctaLabel: readString({
      source,
      key: 'ctaLabel',
      fallback: defaults.ctaLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'lookbook.archive.ctaLabel',
    }),
    ctaHref: readLookbookHref({
      source,
      key: 'ctaHref',
      fallback: defaults.ctaHref,
      errors,
      path: 'lookbook.archive.ctaHref',
    }),
  };
}

export { isRecord as isLookbookRecord };
export { TEXT_LIMITS as LOOKBOOK_TEXT_LIMITS };
