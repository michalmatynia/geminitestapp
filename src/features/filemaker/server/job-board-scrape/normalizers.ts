import 'server-only';

import type { FilemakerJobBoardScrapedOffer } from '../../filemaker-job-board-scrape-contracts';
import { normalizeLexiconKey } from './lexicon-rules';

export {
  looksLikeAddressPill,
  normalizeLexiconKey,
  normalizeLexiconLabel,
} from './lexicon-rules';
export {
  buildScrapedOfferLexiconExtraction,
  buildScrapedOfferPills,
  classifyOfferPill,
  snapshotPillValues,
} from './normalizers.lexicon';
export type { ScrapedOfferLexiconExtraction } from './normalizers.lexicon';

export const uniqueStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));

export const toStringValue = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

export const toNullableString = (value: unknown): string | null => {
  const normalized = toStringValue(value);
  return normalized.length > 0 ? normalized : null;
};

export const toNullableNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

export const normalizeSalaryPeriod = (
  value: unknown
): FilemakerJobBoardScrapedOffer['salaryPeriod'] => {
  const normalized = normalizeLexiconKey(toStringValue(value));
  if (/^(hour|hours|hourly|h|godz|godzina|godzinowo)$/.test(normalized)) return 'hourly';
  if (/^(year|years|yearly|annual|annually|rok|rocznie)$/.test(normalized)) return 'yearly';
  if (/^(fixed|one time|project|contract)$/.test(normalized)) return 'fixed';
  return 'monthly';
};

export const normalizeJobBoardSourceUrl = (value: unknown): string | null => {
  const raw = toStringValue(value);
  if (raw.length === 0) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

export const clipProfileText = (value: string, max = 8_000): string =>
  value.length > max ? `${value.slice(0, Math.max(0, max - 3))}...` : value;

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;

export const recordString = (record: Record<string, unknown> | null, key: string): string =>
  toStringValue(record?.[key]);

export const recordNullableString = (
  record: Record<string, unknown> | null,
  key: string
): string | null => toNullableString(record?.[key]);
