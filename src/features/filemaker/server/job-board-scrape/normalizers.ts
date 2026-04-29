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

const PILL_CATEGORY_RULES: Array<{
  category: FilemakerLexiconTermCategory;
  pattern: RegExp;
}> = [
  {
    category: 'contract_type',
    pattern: /\bb2b\b|contract of employment|employment contract|umowa o prace|mandate|zlecenie/,
  },
  { category: 'employment_type', pattern: /full time|part time|pelny etat|czesc etatu|etat/ },
  {
    category: 'experience_level',
    pattern: /junior|mid|regular|senior|expert|manager|specialist|specjalista/,
  },
  { category: 'work_mode', pattern: /remote|hybrid|office|onsite|zdalna|hybrydowa|biur/ },
  { category: 'start_date', pattern: /immediate|asap|od zaraz|employment|start/ },
];

const looksLikeKnownAddressPill = (label: string, normalized: string): boolean =>
  looksLikeAddressPill(label) &&
  /(ul|street|avenue|aleja|warszawa|krakow|wroclaw|poznan|gdansk|lodz)/i.test(normalized);

export const classifyOfferPill = (
  label: string,
  position: number,
  provider: JobBoardProvider
): FilemakerLexiconTermCategory => {
  const normalized = normalizeLexiconKey(label);
  if (provider === 'pracuj_pl' && position === 0 && looksLikeAddressPill(label)) {
    return 'address';
  }
  if (looksLikeKnownAddressPill(label, normalized)) return 'address';
  return PILL_CATEGORY_RULES.find((rule) => rule.pattern.test(normalized))?.category ?? 'other';
};

export const snapshotPillValues = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] => {
  const values = snapshot?.pills ?? [];
  return uniqueStrings(values.map(normalizeLexiconLabel)).slice(0, 48);
};

const SNAPSHOT_FACT_CATEGORY_KEYWORDS: Array<{
  category: FilemakerLexiconTermCategory;
  labels: string[];
}> = [
  {
    category: 'contract_type',
    labels: ['contract', 'contract type', 'typ umowy', 'umowa'],
  },
  {
    category: 'employment_type',
    labels: ['employment type', 'wymiar pracy', 'etat'],
  },
  {
    category: 'experience_level',
    labels: ['experience', 'experience level', 'level', 'poziom', 'seniority'],
  },
  {
    category: 'work_mode',
    labels: ['mode', 'tryb pracy', 'work mode'],
  },
  {
    category: 'technology',
    labels: ['stack', 'technologies', 'technology', 'technologia', 'technologie'],
  },
  {
    category: 'benefit',
    labels: ['benefit', 'benefits', 'benefity'],
  },
];

const normalizeSnapshotFactPillLabel = (value: string): string => {
  const normalized = normalizeLexiconLabel(value.replace(/_/g, ' '));
  const key = normalizeLexiconKey(normalized);
  if (key === 'full time') return 'full-time';
  if (key === 'part time') return 'part-time';
  if (key === 'b2b') return 'B2B contract';
  return /^[A-Z0-9_ -]+$/.test(normalized) ? normalized.toLowerCase() : normalized;
};

const categoryForSnapshotFactLabel = (
  label: string
): FilemakerLexiconTermCategory | null => {
  const normalized = normalizeLexiconKey(label);
  const category = SNAPSHOT_FACT_CATEGORY_KEYWORDS.find((entry) =>
    entry.labels.some((keyword) => normalized.includes(keyword))
  );
  return category?.category ?? null;
};

const snapshotFactPillCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): Array<{ category: FilemakerLexiconTermCategory; label: string }> => {
  const facts = [...(snapshot?.facts ?? []), ...(snapshot?.companyProfile?.facts ?? [])];
  return facts.flatMap((fact) => {
    const category = categoryForSnapshotFactLabel(fact.label);
    if (category === null) return [];
    return normalizeLexiconLabel(fact.value)
      .split(/[,;|]/)
      .map(normalizeSnapshotFactPillLabel)
      .filter((label) => label.length > 0 && label.length <= 120)
      .map((label) => ({ category, label }));
  });
};

export const buildScrapedOfferPills = (input: {
  provider: JobBoardProvider;
  snapshot: JobBoardStructuredSnapshot | null | undefined;
  sourceSite: string;
  sourceUrl: string;
}): FilemakerJobBoardScrapedOffer['pills'] => {
  const seen = new Set<string>();
  const snapshotPills = snapshotPillValues(input.snapshot).flatMap((label, index) => {
    const key = normalizeLexiconKey(label);
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        category: classifyOfferPill(label, index, input.provider),
        label,
        position: index,
        sourceSite: input.sourceSite,
        sourceUrl: input.sourceUrl,
      },
    ];
  });
  const factPills = snapshotFactPillCandidates(input.snapshot).flatMap((candidate, index) => {
    const key = normalizeLexiconKey(candidate.label);
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        category: candidate.category,
        label: candidate.label,
        position: snapshotPills.length + index,
        sourceSite: input.sourceSite,
        sourceUrl: input.sourceUrl,
      },
    ];
  });
  return [...snapshotPills, ...factPills].slice(0, 100);
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
