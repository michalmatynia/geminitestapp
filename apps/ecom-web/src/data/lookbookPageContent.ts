export interface LookbookMastheadContent {
  watermark: string;
  eyebrow: string;
  title: string;
  description: string;
  issueRange: string;
  dateRange: string;
}

export interface LookbookCtaContent {
  issueLabel: string;
  titleLine1: string;
  titleLine2: string;
  body: string;
  label: string;
  href: string;
}

export interface LookbookArchiveContent {
  label: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface LookbookPageContent {
  emptyTitle: string;
  emptyBody: string;
  viewLabel: string;
  featuredLabel: string;
  masthead: LookbookMastheadContent;
  cta: LookbookCtaContent;
  archive: LookbookArchiveContent;
}

export interface LookbookPageContentValidationResult {
  content: LookbookPageContent;
  errors: string[];
}

export const LOOKBOOK_PAGE_CONTENT_DEFAULTS: LookbookPageContent = {
  emptyTitle: 'Lookbook',
  emptyBody: 'No lookbook entries are published yet.',
  viewLabel: 'View editorial',
  featuredLabel: 'Featured',
  masthead: {
    watermark: 'LOOKBOOK',
    eyebrow: 'STARGATER \u00b7 Visual Archive',
    title: 'Lookbook',
    description: 'Eight seasonal studies. Field photography, maker portraits, and the objects in their natural context.',
    issueRange: 'Issues 01\u201308',
    dateRange: '2024 \u2014 2026',
  },
  cta: {
    issueLabel: 'Issues 01\u201308 Complete',
    titleLine1: 'Every object',
    titleLine2: 'has an origin story',
    body: 'Browse the full collection and find the piece whose story speaks to you.',
    label: 'Read the stories',
    href: '/stories',
  },
  archive: {
    label: 'STARGATER Lookbook Archive \u00b7 Issues 01\u201308',
    ctaLabel: 'Return to shop',
    ctaHref: '/',
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
  const value = readString(source, key, fallback, TEXT_LIMITS.medium, errors, path);
  if (!value) return fallback;
  if (!isAllowedHref(value)) {
    errors.push(`${path} must be an internal path, anchor, or http(s) URL.`);
    return fallback;
  }
  return value;
}

export function validateLookbookPageContent(input: unknown): LookbookPageContentValidationResult {
  const errors: string[] = [];
  const root = isRecord(input) ? input : {};
  const masthead = isRecord(root['masthead']) ? root['masthead'] : {};
  const cta = isRecord(root['cta']) ? root['cta'] : {};
  const archive = isRecord(root['archive']) ? root['archive'] : {};

  const content: LookbookPageContent = {
    emptyTitle: readString(root, 'emptyTitle', LOOKBOOK_PAGE_CONTENT_DEFAULTS.emptyTitle, TEXT_LIMITS.short, errors, 'lookbook.emptyTitle'),
    emptyBody: readString(root, 'emptyBody', LOOKBOOK_PAGE_CONTENT_DEFAULTS.emptyBody, TEXT_LIMITS.medium, errors, 'lookbook.emptyBody'),
    viewLabel: readString(root, 'viewLabel', LOOKBOOK_PAGE_CONTENT_DEFAULTS.viewLabel, TEXT_LIMITS.short, errors, 'lookbook.viewLabel'),
    featuredLabel: readString(root, 'featuredLabel', LOOKBOOK_PAGE_CONTENT_DEFAULTS.featuredLabel, TEXT_LIMITS.short, errors, 'lookbook.featuredLabel'),
    masthead: {
      watermark: readString(masthead, 'watermark', LOOKBOOK_PAGE_CONTENT_DEFAULTS.masthead.watermark, TEXT_LIMITS.short, errors, 'lookbook.masthead.watermark'),
      eyebrow: readString(masthead, 'eyebrow', LOOKBOOK_PAGE_CONTENT_DEFAULTS.masthead.eyebrow, TEXT_LIMITS.short, errors, 'lookbook.masthead.eyebrow'),
      title: readString(masthead, 'title', LOOKBOOK_PAGE_CONTENT_DEFAULTS.masthead.title, TEXT_LIMITS.short, errors, 'lookbook.masthead.title'),
      description: readString(
        masthead,
        'description',
        LOOKBOOK_PAGE_CONTENT_DEFAULTS.masthead.description,
        TEXT_LIMITS.medium,
        errors,
        'lookbook.masthead.description',
      ),
      issueRange: readString(masthead, 'issueRange', LOOKBOOK_PAGE_CONTENT_DEFAULTS.masthead.issueRange, TEXT_LIMITS.short, errors, 'lookbook.masthead.issueRange'),
      dateRange: readString(masthead, 'dateRange', LOOKBOOK_PAGE_CONTENT_DEFAULTS.masthead.dateRange, TEXT_LIMITS.short, errors, 'lookbook.masthead.dateRange'),
    },
    cta: {
      issueLabel: readString(cta, 'issueLabel', LOOKBOOK_PAGE_CONTENT_DEFAULTS.cta.issueLabel, TEXT_LIMITS.short, errors, 'lookbook.cta.issueLabel'),
      titleLine1: readString(cta, 'titleLine1', LOOKBOOK_PAGE_CONTENT_DEFAULTS.cta.titleLine1, TEXT_LIMITS.short, errors, 'lookbook.cta.titleLine1'),
      titleLine2: readString(cta, 'titleLine2', LOOKBOOK_PAGE_CONTENT_DEFAULTS.cta.titleLine2, TEXT_LIMITS.short, errors, 'lookbook.cta.titleLine2'),
      body: readString(cta, 'body', LOOKBOOK_PAGE_CONTENT_DEFAULTS.cta.body, TEXT_LIMITS.medium, errors, 'lookbook.cta.body'),
      label: readString(cta, 'label', LOOKBOOK_PAGE_CONTENT_DEFAULTS.cta.label, TEXT_LIMITS.short, errors, 'lookbook.cta.label'),
      href: readHref(cta, 'href', LOOKBOOK_PAGE_CONTENT_DEFAULTS.cta.href, errors, 'lookbook.cta.href'),
    },
    archive: {
      label: readString(archive, 'label', LOOKBOOK_PAGE_CONTENT_DEFAULTS.archive.label, TEXT_LIMITS.short, errors, 'lookbook.archive.label'),
      ctaLabel: readString(archive, 'ctaLabel', LOOKBOOK_PAGE_CONTENT_DEFAULTS.archive.ctaLabel, TEXT_LIMITS.short, errors, 'lookbook.archive.ctaLabel'),
      ctaHref: readHref(archive, 'ctaHref', LOOKBOOK_PAGE_CONTENT_DEFAULTS.archive.ctaHref, errors, 'lookbook.archive.ctaHref'),
    },
  };

  return { content, errors };
}

export function normalizeLookbookPageContent(input: unknown): LookbookPageContent {
  return validateLookbookPageContent(input).content;
}
