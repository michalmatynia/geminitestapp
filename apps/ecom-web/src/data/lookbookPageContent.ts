import {
  buildLookbookArchiveContent,
  buildLookbookCtaContent,
  buildLookbookMastheadContent,
  isLookbookRecord,
  LOOKBOOK_TEXT_LIMITS,
} from './lookbookPageContentHelpers';

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

function readString(
  { source, key, fallback, maxLength, errors, path }: {
    source: Record<string, unknown>;
    key: string;
    fallback: string;
    maxLength: number;
    errors: string[];
    path: string;
  },
): string {
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

export function validateLookbookPageContent(input: unknown): LookbookPageContentValidationResult {
  const errors: string[] = [];
  const root = isLookbookRecord(input) ? input : {};
  const masthead = isLookbookRecord(root['masthead']) ? root['masthead'] : {};
  const cta = isLookbookRecord(root['cta']) ? root['cta'] : {};
  const archive = isLookbookRecord(root['archive']) ? root['archive'] : {};

  const content: LookbookPageContent = {
    emptyTitle: readString({
      source: root,
      key: 'emptyTitle',
      fallback: LOOKBOOK_PAGE_CONTENT_DEFAULTS.emptyTitle,
      maxLength: LOOKBOOK_TEXT_LIMITS.short,
      errors,
      path: 'lookbook.emptyTitle',
    }),
    emptyBody: readString({
      source: root,
      key: 'emptyBody',
      fallback: LOOKBOOK_PAGE_CONTENT_DEFAULTS.emptyBody,
      maxLength: LOOKBOOK_TEXT_LIMITS.medium,
      errors,
      path: 'lookbook.emptyBody',
    }),
    viewLabel: readString({
      source: root,
      key: 'viewLabel',
      fallback: LOOKBOOK_PAGE_CONTENT_DEFAULTS.viewLabel,
      maxLength: LOOKBOOK_TEXT_LIMITS.short,
      errors,
      path: 'lookbook.viewLabel',
    }),
    featuredLabel: readString({
      source: root,
      key: 'featuredLabel',
      fallback: LOOKBOOK_PAGE_CONTENT_DEFAULTS.featuredLabel,
      maxLength: LOOKBOOK_TEXT_LIMITS.short,
      errors,
      path: 'lookbook.featuredLabel',
    }),
    masthead: buildLookbookMastheadContent(masthead, LOOKBOOK_PAGE_CONTENT_DEFAULTS.masthead, errors),
    cta: buildLookbookCtaContent(cta, LOOKBOOK_PAGE_CONTENT_DEFAULTS.cta, errors),
    archive: buildLookbookArchiveContent(archive, LOOKBOOK_PAGE_CONTENT_DEFAULTS.archive, errors),
  };

  return { content, errors };
}

export function normalizeLookbookPageContent(input: unknown): LookbookPageContent {
  return validateLookbookPageContent(input).content;
}
