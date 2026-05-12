import type {
  ValuesContent,
  ValuesHeroContent,
  ValuesClosingContent,
} from './valuesContent';
import { readCommitments, readMaterials, readStats } from './valuesContentArrayHelpers';

export const TEXT_LIMITS = {
  short: 120,
  medium: 300,
  long: 1000,
} as const;

type ReadStringParams = {
  source: Record<string, unknown>;
  key: string;
  fallback: string;
  maxLength: number;
  errors: string[];
  path: string;
};

export function isValuesRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readValuesString({
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

function readValuesHref({
  source,
  key,
  fallback,
  errors,
  path,
}: Omit<ReadStringParams, 'maxLength'>): string {
  const value = readValuesString({
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

function buildValuesHero(
  source: Record<string, unknown>,
  defaults: ValuesHeroContent,
  errors: string[],
): ValuesHeroContent {
  return {
    watermark: readValuesString({
      source,
      key: 'watermark',
      fallback: defaults.watermark,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.hero.watermark',
    }),
    eyebrow: readValuesString({
      source,
      key: 'eyebrow',
      fallback: defaults.eyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.hero.eyebrow',
    }),
      titleLine1: readValuesString({
      source,
      key: 'titleLine1',
      fallback: defaults.titleLine1,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.hero.titleLine1',
    }),
    titleLine2: readValuesString({
      source,
      key: 'titleLine2',
      fallback: defaults.titleLine2,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.hero.titleLine2',
    }),
    body: readValuesString({
      source,
      key: 'body',
      fallback: defaults.body,
      maxLength: TEXT_LIMITS.long,
      errors,
      path: 'values.hero.body',
    }),
  };
}

function buildValuesClosing(
  source: Record<string, unknown>,
  defaults: ValuesClosingContent,
  errors: string[],
): ValuesClosingContent {
  return {
    quote: readValuesString({
      source,
      key: 'quote',
      fallback: defaults.quote,
      maxLength: TEXT_LIMITS.long,
      errors,
      path: 'values.closing.quote',
    }),
    primaryCtaLabel: readValuesString({
      source,
      key: 'primaryCtaLabel',
      fallback: defaults.primaryCtaLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.closing.primaryCtaLabel',
    }),
      primaryCtaHref: readValuesHref({
      source,
      key: 'primaryCtaHref',
      fallback: defaults.primaryCtaHref,
      errors,
      path: 'values.closing.primaryCtaHref',
    }),
    secondaryCtaLabel: readValuesString({
      source,
      key: 'secondaryCtaLabel',
      fallback: defaults.secondaryCtaLabel,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.closing.secondaryCtaLabel',
    }),
    secondaryCtaHref: readValuesHref({
      source,
      key: 'secondaryCtaHref',
      fallback: defaults.secondaryCtaHref,
      errors,
      path: 'values.closing.secondaryCtaHref',
    }),
  };
}

export function buildValuesContent(
  root: Record<string, unknown>,
  defaults: ValuesContent,
  errors: string[],
): ValuesContent {
  const hero = isValuesRecord(root['hero']) ? root['hero'] : {};
  const closing = isValuesRecord(root['closing']) ? root['closing'] : {};

  return {
    hero: buildValuesHero(hero, defaults.hero, errors),
    stats: readStats(root, 'stats', defaults.stats, errors),
    materialsEyebrow: readValuesString({
      source: root,
      key: 'materialsEyebrow',
      fallback: defaults.materialsEyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.materialsEyebrow',
    }),
    materialsTitle: readValuesString({
      source: root,
      key: 'materialsTitle',
      fallback: defaults.materialsTitle,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.materialsTitle',
    }),
    materials: readMaterials(root, 'materials', defaults.materials, errors),
    commitmentsEyebrow: readValuesString({
      source: root,
      key: 'commitmentsEyebrow',
      fallback: defaults.commitmentsEyebrow,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.commitmentsEyebrow',
    }),
    commitmentsTitle: readValuesString({
      source: root,
      key: 'commitmentsTitle',
      fallback: defaults.commitmentsTitle,
      maxLength: TEXT_LIMITS.short,
      errors,
      path: 'values.commitmentsTitle',
    }),
    commitments: readCommitments(root, 'commitments', defaults.commitments, errors),
    closing: buildValuesClosing(closing, defaults.closing, errors),
  };
}
