import 'server-only';

import type { FilemakerLexiconTermCategory } from '@/shared/contracts/filemaker';
import type { JobBoardStructuredSnapshot } from '@/features/job-board/server/providers/job-board-sync';
import type { JobBoardProvider } from '@/shared/lib/job-board/job-board-providers';

import type {
  FilemakerJobBoardScrapedOffer,
} from '../../filemaker-job-board-scrape-contracts';

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
  const normalized = toStringValue(value).toLowerCase();
  return normalized === 'hourly' || normalized === 'yearly' || normalized === 'fixed'
    ? normalized
    : 'monthly';
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

export const normalizeLexiconLabel = (value: string): string =>
  value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

export const normalizeLexiconKey = (value: string): string =>
  normalizeLexiconLabel(value)
    .toLowerCase()
    .replace(/ł/g, 'l')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const looksLikeAddressPill = (value: string): boolean =>
  /\d/.test(value) && value.includes(',') && normalizeLexiconKey(value).split(' ').length >= 3;

export const classifyOfferPill = (
  label: string,
  position: number,
  provider: JobBoardProvider
): FilemakerLexiconTermCategory => {
  const normalized = normalizeLexiconKey(label);
  if (provider === 'pracuj_pl' && position === 0 && looksLikeAddressPill(label)) {
    return 'address';
  }
  if (
    looksLikeAddressPill(label) &&
    /(ul|street|avenue|aleja|warszawa|krakow|wroclaw|poznan|gdansk|lodz)/i.test(normalized)
  ) {
    return 'address';
  }
  if (
    /\bb2b\b|contract of employment|employment contract|umowa o prace|mandate|zlecenie/.test(
      normalized
    )
  ) {
    return 'contract_type';
  }
  if (/full time|part time|pelny etat|czesc etatu|etat/.test(normalized)) {
    return 'employment_type';
  }
  if (/junior|mid|regular|senior|expert|manager|specialist|specjalista/.test(normalized)) {
    return 'experience_level';
  }
  if (/remote|hybrid|office|onsite|zdalna|hybrydowa|biur/.test(normalized)) {
    return 'work_mode';
  }
  if (/immediate|asap|od zaraz|employment|start/.test(normalized)) {
    return 'start_date';
  }
  return 'other';
};

export const snapshotPillValues = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] => {
  const values = snapshot?.pills ?? [];
  return uniqueStrings(values.map(normalizeLexiconLabel)).slice(0, 48);
};

export const buildScrapedOfferPills = (input: {
  provider: JobBoardProvider;
  snapshot: JobBoardStructuredSnapshot | null | undefined;
  sourceSite: string;
  sourceUrl: string;
}): FilemakerJobBoardScrapedOffer['pills'] =>
  snapshotPillValues(input.snapshot).map((label, index) => ({
    category: classifyOfferPill(label, index, input.provider),
    label,
    position: index,
    sourceSite: input.sourceSite,
    sourceUrl: input.sourceUrl,
  }));

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
