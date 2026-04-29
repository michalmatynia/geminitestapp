import 'server-only';

import type { FilemakerLexiconTermCategory } from '@/shared/contracts/filemaker';
import type { JobBoardStructuredSnapshot } from '@/features/job-board/server/providers/job-board-sync';
import type { JobBoardProvider } from '@/shared/lib/job-board/job-board-providers';

import type {
  FilemakerJobBoardScrapedOffer,
} from '../../filemaker-job-board-scrape-contracts';

type LexiconPillCandidate = {
  category: FilemakerLexiconTermCategory;
  label: string;
};

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
  { category: 'salary', pattern: /salary|wynagrodzenie|widełki|widelki|pln|eur|usd|gbp|chf|czk|sek|nok|dkk|zł|zl|€|£|\$/ },
  {
    category: 'contract_type',
    pattern: /\bb2b\b|contract of employment|employment contract|umowa o prace|mandate|zlecenie/,
  },
  { category: 'employment_type', pattern: /full time|part time|pelny etat|czesc etatu|etat/ },
  { category: 'experience_level', pattern: /junior|mid|regular|senior|expert|manager|specialist|specjalista/ },
  { category: 'work_mode', pattern: /remote|hybrid|office|onsite|zdalna|hybrydowa|biur/ },
  { category: 'language', pattern: /english|angielski|polish|polski|german|niemiecki|french|francuski|spanish|hiszpanski/ },
  { category: 'start_date', pattern: /immediate|asap|od zaraz|employment|start/ },
];

const SECTION_CATEGORY_RULES: Array<{
  category: FilemakerLexiconTermCategory;
  pattern: RegExp;
}> = [
  { category: 'requirement', pattern: /requirements?|wymagania|oczekujemy|must have|nice to have|kwalifikacje|qualifications|profile kandydata/ },
  { category: 'responsibility', pattern: /responsibilit|obowiazki|obowiązki|zadania|zakres obowiazkow|zakres obowiązków|what you will do|role/ },
  { category: 'technology', pattern: /technolog|technologie|technology|technologies|tech stack|stack|narzedzia|narzędzia/ },
  { category: 'benefit', pattern: /benefits?|benefity|oferujemy|we offer|perks|pakiet benefitow|pakiet benefitów/ },
  { category: 'language', pattern: /languages?|jezyki|języki|znajomosc jezykow|znajomość języków/ },
  { category: 'company_attribute', pattern: /about company|about us|o firmie|company|pracodawca|industry|branza|branża/ },
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
  { category: 'address', labels: ['address', 'adres', 'company address', 'headquarters', 'office', 'siedziba'] },
  { category: 'contract_type', labels: ['contract', 'contract type', 'typ umowy', 'umowa'] },
  { category: 'employment_type', labels: ['employment type', 'wymiar pracy', 'etat'] },
  { category: 'experience_level', labels: ['experience', 'experience level', 'level', 'poziom', 'seniority'] },
  { category: 'work_mode', labels: ['mode', 'tryb pracy', 'work mode'] },
  { category: 'technology', labels: ['stack', 'technologies', 'technology', 'technologia', 'technologie'] },
  { category: 'benefit', labels: ['benefit', 'benefits', 'benefity'] },
  { category: 'requirement', labels: ['requirements', 'requirement', 'wymagania', 'kwalifikacje', 'qualifications'] },
  { category: 'responsibility', labels: ['responsibilities', 'responsibility', 'obowiazki', 'obowiązki', 'zadania'] },
  { category: 'language', labels: ['language', 'languages', 'jezyk', 'język', 'jezyki', 'języki'] },
  { category: 'salary', labels: ['salary', 'salary range', 'compensation', 'wynagrodzenie', 'widełki', 'widelki'] },
  { category: 'company_attribute', labels: ['company size', 'industry', 'branza', 'branża', 'sector', 'sektor'] },
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
): LexiconPillCandidate[] => {
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

const categoryForSectionHeading = (
  heading: string | null | undefined
): FilemakerLexiconTermCategory | null => {
  const normalized = normalizeLexiconKey(heading ?? '');
  if (normalized.length === 0) return null;
  return SECTION_CATEGORY_RULES.find((rule) => rule.pattern.test(normalized))?.category ?? null;
};

const normalizeSectionPillLabel = (value: string): string =>
  normalizeLexiconLabel(
    value
      .replace(/^[-*•●▪–—]\s*/u, '')
      .replace(/^\d+[.)]\s*/u, '')
      .replace(/\s+[;,.]$/u, '')
  );

const sectionTermLabels = (text: string, category: FilemakerLexiconTermCategory): string[] => {
  const normalized = text.replace(/\u00a0/g, ' ');
  const separators = category === 'technology' || category === 'benefit'
    ? /\n+|[•●▪]|;|\|/u
    : /\n+|[•●▪]/u;
  return uniqueStrings(
    normalized
      .split(separators)
      .flatMap((part) =>
        category === 'technology'
          ? part.split(/,(?=\s*[A-Za-z0-9+#. -]{2,40}(?:,|$))/u)
          : [part]
      )
      .map(normalizeSectionPillLabel)
      .filter((label) => label.length >= 2 && label.length <= 140)
  ).slice(0, 24);
};

const snapshotSectionPillCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): LexiconPillCandidate[] =>
  (snapshot?.sections ?? []).flatMap((section) => {
    const category = categoryForSectionHeading(section.heading);
    if (category === null) return [];
    return sectionTermLabels(section.text, category).map((label) => ({ category, label }));
  });

const pillKey = (category: FilemakerLexiconTermCategory, label: string): string =>
  `${category}:${normalizeLexiconKey(label)}`;

export const buildScrapedOfferPills = (input: {
  provider: JobBoardProvider;
  snapshot: JobBoardStructuredSnapshot | null | undefined;
  sourceSite: string;
  sourceUrl: string;
}): FilemakerJobBoardScrapedOffer['pills'] => {
  const seen = new Set<string>();
  const snapshotPills = snapshotPillValues(input.snapshot).flatMap((label, index) => {
    const category = classifyOfferPill(label, index, input.provider);
    const key = pillKey(category, label);
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        category,
        typeKey: category,
        label,
        position: index,
        sourceSite: input.sourceSite,
        sourceUrl: input.sourceUrl,
      },
    ];
  });
  const typedCandidates = [
    ...snapshotFactPillCandidates(input.snapshot),
    ...snapshotSectionPillCandidates(input.snapshot),
  ];
  const factPills = typedCandidates.flatMap((candidate, index) => {
    const key = pillKey(candidate.category, candidate.label);
    if (seen.has(key)) return [];
    seen.add(key);
    return [
      {
        category: candidate.category,
        typeKey: candidate.category,
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
