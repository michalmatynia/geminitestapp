import 'server-only';
/* eslint-disable max-lines, complexity */

import type { JobScanEvaluation } from '@/shared/contracts/job-board';
import type { JobBoardStructuredSnapshot } from '@/features/job-board/server/providers/job-board-sync';
import {
  isJobBoardOfferUrl,
  type JobBoardProvider,
} from '@/shared/lib/job-board/job-board-providers';

import { extractJobBoardExternalIdFromUrl } from '@/features/job-board/server/providers/job-board-sync';

import type {
  FilemakerJobBoardScrapeRequest,
  FilemakerJobBoardScrapedOffer,
} from '../../filemaker-job-board-scrape-contracts';
import type {
  FilemakerLexiconValidationPattern,
  FilemakerLexiconValidationPatternSourceScope,
} from '../../types';

import { lexiconClassifier } from './offer-from-evaluation/classifier';
import { jobOfferNormalizer } from './offer-from-evaluation/normalizer';

import { type ScrapedOfferPill, type LabeledProfileLine } from "./offer-from-evaluation/types";

import { POSTED_AT_KEYS, EXPIRES_AT_KEYS, POSTED_AT_FACT_KEYWORDS, EXPIRES_AT_FACT_KEYWORDS, COMPANY_NAME_FACT_KEYS, GENERIC_JOB_BOARD_COMPANY_NAME_KEYS } from "./offer-from-evaluation/constants";

const normalizeCompanyNameGuardKey = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const isGenericJobBoardCompanyName = (value: string): boolean => {
  const key = normalizeCompanyNameGuardKey(value);
  return (
    GENERIC_JOB_BOARD_COMPANY_NAME_KEYS.has(key) ||
    key.startsWith('informacje i opinie o pracodawcach') ||
    key.startsWith('odkrywaj najlepsze miejsca pracy') ||
    key.startsWith('pracodawca ') ||
    key.startsWith('pracodawcy ') ||
    key.startsWith('profile pracodawcow')
  );
};

const LOCATION_FACT_KEYWORDS = [
  'city',
  'job location',
  'location',
  'lokalizacja',
  'miejsce pracy',
] as const;

const SALARY_FACT_KEYWORDS = [
  'salary',
  'salary range',
  'compensation',
  'pay',
  'wynagrodzenie',
  'widełki',
  'widelki',
] as const;

const SALARY_CURRENCY_RE = /\b(PLN|EUR|USD|GBP|CHF|CZK|SEK|NOK|DKK)\b|zł|zl|€|£|\$/iu;
const SALARY_TEXT_HINT_RE =
  /salary|compensation|pay|wynagrodzenie|widełki|widelki|PLN|EUR|USD|GBP|CHF|CZK|SEK|NOK|DKK|zł|zl|€|£|\$|netto|brutto|gross|net|\/\s*(?:h|hour|godz|mies|month)|per\s+(?:hour|month|year)/iu;
const SALARY_NUMBER_RE = /\b\d+(?:[ \u00a0.]?\d{3})*(?:[,.]\d+)?\s*k?\b/giu;

const MONTH_NUMBER_BY_TOKEN: Record<string, string> = {
  april: '04',
  apr: '04',
  august: '08',
  aug: '08',
  cze: '06',
  czerwca: '06',
  czerwiec: '06',
  december: '12',
  dec: '12',
  feb: '02',
  february: '02',
  gru: '12',
  grudnia: '12',
  grudzien: '12',
  jan: '01',
  january: '01',
  jul: '07',
  july: '07',
  jun: '06',
  june: '06',
  kwi: '04',
  kwiecien: '04',
  kwietnia: '04',
  lip: '07',
  lipca: '07',
  lipiec: '07',
  lis: '11',
  listopad: '11',
  listopada: '11',
  lut: '02',
  lutego: '02',
  luty: '02',
  maj: '05',
  maja: '05',
  mar: '03',
  march: '03',
  marca: '03',
  marzec: '03',
  may: '05',
  nov: '11',
  november: '11',
  oct: '10',
  october: '10',
  paz: '10',
  pazdziernik: '10',
  pazdziernika: '10',
  sep: '09',
  september: '09',
  sie: '08',
  sierpien: '08',
  sierpnia: '08',
  sty: '01',
  styczen: '01',
  stycznia: '01',
  wrz: '09',
  wrzesien: '09',
  wrzesnia: '09',
};

const COMPANY_PROFILE_FIELDS = [
  {
    factKeywords: ['website', 'strona', 'strona internetowa', 'www'],
    jsonLdKeys: ['url', 'sameAs'],
    key: 'website',
    label: 'Website',
  },
  { factKeywords: ['domain', 'domena'], jsonLdKeys: [], key: 'domain', label: 'Domain' },
  {
    factKeywords: ['industry', 'branza', 'sector', 'sektor'],
    jsonLdKeys: ['industry'],
    key: 'industry',
    label: 'Industry',
  },
  {
    factKeywords: [
      'company size',
      'employees',
      'liczba pracownikow',
      'pracownikow',
      'pracownicy',
      'size',
      'zatrudnienie',
    ],
    jsonLdKeys: ['numberOfEmployees', 'employee'],
    key: 'size',
    label: 'Company size',
  },
  { factKeywords: ['nip'], jsonLdKeys: ['taxID', 'vatID'], key: 'nip', label: 'NIP' },
  { factKeywords: ['krs'], jsonLdKeys: ['krs'], key: 'krs', label: 'KRS' },
  { factKeywords: ['regon'], jsonLdKeys: ['regon'], key: 'regon', label: 'REGON' },
  { factKeywords: ['email', 'e-mail', 'mail'], jsonLdKeys: ['email'], key: 'email', label: 'Email' },
  {
    factKeywords: ['phone', 'telephone', 'telefon', 'tel'],
    jsonLdKeys: ['telephone', 'phone'],
    key: 'phone',
    label: 'Phone',
  },
  { factKeywords: ['logo'], jsonLdKeys: ['logo', 'image'], key: 'logoUrl', label: 'Logo URL' },
] as const;

const COMPANY_PROFILE_TEXT_PATTERNS: Record<string, RegExp[]> = {
  email: [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i],
  industry: [/\b(?:industry|branza|branża|sector|sektor)\s*:?\s*([^.;|]{2,120})/i],
  krs: [/\bKRS\s*:?\s*([0-9][0-9 -]{4,}[0-9])\b/i],
  nip: [/\bNIP\s*:?\s*([0-9][0-9 -]{8,}[0-9])\b/i],
  phone: [/\b(?:phone|telephone|tel\.?|telefon)\s*:?\s*(\+?[0-9][0-9\s().-]{6,}[0-9])/i],
  regon: [/\bREGON\s*:?\s*([0-9][0-9 -]{7,}[0-9])\b/i],
  size: [
    /\b(?:company size|employees|liczba pracownikow|liczba pracowników|zatrudnienie)\s*:?\s*([0-9][0-9 +.,-]*(?:employees|osob|osób|pracownikow|pracowników)?)/i,
  ],
  website: [
    /\b(https?:\/\/[^\s,;|)]+)/i,
    /\b(www\.[^\s,;|)]+)/i,
    /\b(?:website|strona(?: internetowa)?|www)\s*:?\s*((?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s,;|)]*)?)/i,
  ],
};

const COMPANY_ADDRESS_KEYS = [
  'addressLine',
  'address',
  'streetAddress',
  'street',
  'headquarters',
  'headquartersAddress',
  'officeAddress',
] as const;

const COMPANY_CITY_KEYS = ['city', 'addressLocality', 'locality'] as const;
const COMPANY_REGION_KEYS = ['region', 'addressRegion', 'province', 'voivodeship'] as const;
const COMPANY_POSTAL_KEYS = ['postalCode', 'zipCode'] as const;
const COMPANY_COUNTRY_KEYS = ['country', 'addressCountry'] as const;

const ADDRESS_FACT_LABEL_RE =
  /adres|address|siedziba|headquarters|lokalizacja|location|miejsce pracy|office/i;

const TEXT_ADDRESS_RE =
  /(?:^|[^\p{L}0-9])(?:(?:adres(?:\s+siedziby)?|siedziba|address|headquarters|office|biuro|lokalizacja|miejsce pracy)[:\s-]*)?(?:(?:ul\.?|ulica|al\.?|aleja|pl\.?|plac|rondo)\s+)?([\p{L}][\p{L}0-9'. -]{1,70}?)\s+([0-9]+[0-9A-Za-z/-]{0,12})\s*,?\s*([0-9]{2}-[0-9]{3})\s+([\p{L}][\p{L}'. -]{1,50})/giu;

const TEXT_ADDRESS_WITHOUT_POSTAL_RE =
  /(?:^|[^\p{L}0-9])(?:(?:adres(?:\s+siedziby)?|siedziba|address|headquarters|office|biuro|lokalizacja|miejsce pracy)[:\s-]*)?(?:(?:ul\.?|ulica|al\.?|aleja|pl\.?|plac|rondo)\s+)?([\p{L}][\p{L}0-9'. -]{1,70}?)\s+([0-9]+[0-9A-Za-z/-]{0,12})\s*,\s*([\p{L}][\p{L}'. -]{1,60}(?:\([^)]{1,40}\))?)(?:\s*,\s*([\p{L}][\p{L}'. -]{1,60}(?:\([^)]{1,40}\))?))?/giu;

const JOB_DESCRIPTION_SECTION_RE =
  /opis|description|responsibil|obowiaz|obowiąz|wymagania|requirements|kwalifikacje|qualifications|benefits|benefity|oferujemy|zadania|role|scope|zakres/i;

const JOB_REQUIREMENTS_SECTION_RE =
  /wymagania|requirements|kwalifikacje|qualifications|must\s+have|nice\s+to\s+have|oczekujemy|profile\s+kandydata/i;

const JOB_RESPONSIBILITIES_SECTION_RE =
  /responsibil|obowiaz|obowiąz|zadania|role|scope|zakres|what\s+you\s+will\s+do/i;

const JOB_RESPONSIBILITY_ITEM_START_RE =
  /(Tworzenie|Budowanie|Integracja|Wsparcie|Dbanie|Optymalizacja|Debugowanie|Rozw[oó]j|Projektowanie|Implementacja|Utrzymanie|Wsp[oó]łpraca|Przygotowywanie|Prowadzenie|Analiza|Testowanie|Dokumentowanie|Creating|Building|Integrating|Supporting|Maintaining|Designing|Implementing|Optimizing|Debugging|Developing|Updating)\b/giu;

const JOB_RESPONSIBILITY_HEADING_RE =
  /^(tw[oó]j zakres obowi[aą]zk[oó]w|zakres obowi[aą]zk[oó]w|responsibilities|your responsibilities|role responsibilities)\s*/iu;

const SOCIAL_COMPANY_URL_HOSTS = [
  'ashbyhq.com',
  'breezy.hr',
  'erecruiter.pl',
  'facebook.com',
  'greenhouse.io',
  'github.com',
  'gitlab.com',
  'instagram.com',
  'justjoin.it',
  'lever.co',
  'linkedin.com',
  'medium.com',
  'nofluffjobs.com',
  'nofluffjobs.pl',
  'pracuj.pl',
  'smartrecruiters.com',
  'teamtailor.com',
  'tiktok.com',
  'traffit.com',
  'twitter.com',
  'workable.com',
  'x.com',
  'youtube.com',
  'youtu.be',
] as const;

const normalizeProfileValue = (value: unknown): string =>
  normalizeLexiconLabel(toStringValue(value));

const normalizeCompanyUrl = (value: unknown): string | null => {
  const raw = normalizeProfileValue(value).replace(/[),.;]+$/g, '');
  if (raw.length === 0) return null;
  const withProtocol = /^www\./iu.test(raw) ? `https://${raw}` : raw;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    parsed.hash = '';
    if (parsed.pathname === '/') return `${parsed.protocol}//${parsed.host}${parsed.search}`;
    return parsed.toString();
  } catch {
    return null;
  }
};

const companyUrlKey = (value: unknown): string =>
  (normalizeCompanyUrl(value) ?? normalizeProfileValue(value)).replace(/\/$/u, '').toLowerCase();

const isSocialCompanyUrl = (value: string): boolean => {
  try {
    const hostname = new URL(value).hostname.toLowerCase().replace(/^www\./u, '');
    return SOCIAL_COMPANY_URL_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
};

const normalizeDescriptionValue = (value: unknown): string | null => {
  const raw = toStringValue(value);
  if (raw.length === 0) return null;
  const normalized = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return normalized.length > 0 ? clipProfileText(normalized, 20_000) : null;
};

const cleanSnapshotTitle = (value: unknown): string | null => {
  const normalized = normalizeProfileValue(value)
    .replace(/\s*[-|]\s*(oferta pracy|job offer|jobs?|praca|pracuj\.pl|justjoin\.it).*$/i, '')
    .trim();
  return normalized.length > 0 ? normalized : null;
};

const GENERIC_EMPLOYER_DIRECTORY_PATTERNS = [
  /\binformacje i opinie o pracodawc/u,
  /\bprofile? pracodawc/u,
  /\bopinie o pracodawc/u,
  /\bpracodawcy profile pracodawc/u,
];

const COMPANY_DETAILS_LABEL_SUFFIX_RE =
  /\s*(?:[-|:]\s*)?(?:about\s+the\s+company|about\s+company|company\s+details|informacje\s+o\s+firmie|o\s+firmie)\s*$/iu;

const stripCompanyDetailsLabelSuffix = (value: string): string =>
  value.replace(COMPANY_DETAILS_LABEL_SUFFIX_RE, '').trim();

export const isSuspiciousJobBoardCompanyName = (value: unknown): boolean => {
  const normalized = normalizeProfileValue(value);
  if (normalized.length === 0) return true;
  const compactAlphaNumeric = normalized.replace(/[^\p{L}0-9]+/gu, '');
  if (
    /^[\p{L}]{1,2}$/u.test(compactAlphaNumeric) &&
    normalized !== normalized.toLocaleUpperCase()
  ) {
    return true;
  }
  const key = normalizeLexiconKey(normalized);
  if (isGenericJobBoardCompanyName(normalized)) return true;
  if (GENERIC_EMPLOYER_DIRECTORY_PATTERNS.some((pattern) => pattern.test(key))) {
    return true;
  }
  if (
    /^poznan(?: wielkopolskie)? poznan poland$/.test(key) ||
    /^warszawa(?: mazowieckie)? warszawa poland$/.test(key) ||
    /^krakow(?: malopolskie)? krakow poland$/.test(key)
  ) {
    return true;
  }
  return false;
};

const cleanCompanyName = (value: unknown): string | null => {
  const normalized = stripCompanyDetailsLabelSuffix(
    normalizeProfileValue(value)
  )
    .replace(/\s*[-|]\s*(profil pracodawcy|pracodawca|kariera|career|jobs?).*$/i, '')
    .trim();
  if (isSuspiciousJobBoardCompanyName(normalized)) return null;
  return normalized.length > 0 ? normalized : null;
};

const firstCleanCompanyName = (values: readonly unknown[]): string | null => {
  for (const value of values) {
    const cleaned = cleanCompanyName(value);
    if (cleaned !== null) return cleaned;
  }
  return null;
};

const normalizeCompanyIdentityNameKey = (value: unknown): string =>
  normalizeCompanyNameGuardKey(toStringValue(value))
    .replace(/\b(spolka|sp|zoo|z o o|s a|sa|inc|ltd|llc|gmbh)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const companyNamesMatchForIdentity = (left: unknown, right: unknown): boolean => {
  const leftKey = normalizeCompanyIdentityNameKey(left);
  const rightKey = normalizeCompanyIdentityNameKey(right);
  return leftKey.length > 0 && rightKey.length > 0 && leftKey === rightKey;
};

const isReliableScrapedOfferUrl = (value: string, provider: JobBoardProvider): boolean => {
  if (!isJobBoardOfferUrl(value, provider)) return false;
  if (provider !== 'pracuj_pl') return true;
  try {
    return /,oferta,/iu.test(new URL(value).pathname);
  } catch {
    return false;
  }
};

const formatDateParts = (input: {
  day: number;
  month: number;
  year: number;
}): string | null => {
  if (input.year < 1900 || input.year > 2200) return null;
  if (input.month < 1 || input.month > 12) return null;
  if (input.day < 1 || input.day > 31) return null;
  const date = new Date(Date.UTC(input.year, input.month - 1, input.day));
  if (
    date.getUTCFullYear() !== input.year ||
    date.getUTCMonth() !== input.month - 1 ||
    date.getUTCDate() !== input.day
  ) {
    return null;
  }
  return [
    String(input.year).padStart(4, '0'),
    String(input.month).padStart(2, '0'),
    String(input.day).padStart(2, '0'),
  ].join('-');
};

const formatRelativeDate = (daysAgo: number, referenceDate: Date): string | null => {
  if (!Number.isFinite(daysAgo) || daysAgo < 0 || daysAgo > 366) return null;
  const date = new Date(referenceDate);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - Math.floor(daysAgo));
  return formatDateParts({
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  });
};

const monthNumberFromToken = (value: string): number | null => {
  const key = normalizeLexiconKey(value.replace(/\.$/, ''));
  const month = MONTH_NUMBER_BY_TOKEN[key];
  return month === undefined ? null : Number(month);
};

const relativeDateFromText = (value: string, referenceDate: Date): string | null => {
  const key = normalizeLexiconKey(value);
  if (/\b(today|dzis|dzisiaj)\b/.test(key)) return formatRelativeDate(0, referenceDate);
  if (/\b(yesterday|wczoraj)\b/.test(key)) return formatRelativeDate(1, referenceDate);
  if (/\b(hour|hours|godz|godzina|godzin)\b.*\b(ago|temu)\b/.test(key)) {
    return formatRelativeDate(0, referenceDate);
  }
  const daysAgo = key.match(/\b(\d{1,3})\s*(?:day|days|dni|dzien)\s*(?:ago|temu)\b/);
  return daysAgo ? formatRelativeDate(Number(daysAgo[1]), referenceDate) : null;
};

const isoDateFromText = (value: string): string | null => {
  if (/^\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+-]+Z?)?$/.test(value)) return value;
  const embeddedIso = value.match(/\b(\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+-]+Z?)?)\b/);
  const embeddedIsoValue = embeddedIso?.[1] ?? null;
  return embeddedIsoValue !== null && embeddedIsoValue.length > 0 ? embeddedIsoValue : null;
};

const numericDateFromText = (value: string): string | null => {
  const ymd = value.match(/\b((?:19|20|21|22)\d{2})[./](\d{1,2})[./](\d{1,2})\b/);
  if (ymd) return formatDateParts({ day: Number(ymd[3]), month: Number(ymd[2]), year: Number(ymd[1]) });
  const dmy = value.match(/\b(\d{1,2})[./-](\d{1,2})[./-]((?:19|20|21|22)\d{2})\b/);
  return dmy
    ? formatDateParts({ day: Number(dmy[1]), month: Number(dmy[2]), year: Number(dmy[3]) })
    : null;
};

const namedMonthDateFromText = (value: string): string | null => {
  const dayMonthName = value.match(/\b(\d{1,2})\s+([\p{L}.]+)\s+((?:19|20|21|22)\d{2})\b/iu);
  const dayMonth = monthNumberFromToken(dayMonthName?.[2] ?? '');
  if (dayMonthName && dayMonth !== null) {
    return formatDateParts({ day: Number(dayMonthName[1]), month: dayMonth, year: Number(dayMonthName[3]) });
  }
  const monthNameDay = value.match(/\b([\p{L}.]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,]?\s+((?:19|20|21|22)\d{2})\b/iu);
  const monthDay = monthNumberFromToken(monthNameDay?.[1] ?? '');
  return monthNameDay && monthDay !== null
    ? formatDateParts({ day: Number(monthNameDay[2]), month: monthDay, year: Number(monthNameDay[3]) })
    : null;
};

export const normalizeScrapedDateValue = (
  value: string | null,
  referenceDate = new Date()
): string | null => {
  const normalized = normalizeProfileValue(value);
  if (normalized.length === 0) return null;
  const relativeDate = relativeDateFromText(normalized, referenceDate);
  if (relativeDate !== null) return relativeDate;
  const absoluteDate =
    isoDateFromText(normalized) ??
    numericDateFromText(normalized) ??
    namedMonthDateFromText(normalized);
  if (absoluteDate !== null) return absoluteDate;
  return normalized;
};

const recordFirstNullableString = (
  record: Record<string, unknown> | null,
  keys: readonly string[]
): string | null => {
  for (const key of keys) {
    const value = recordNullableString(record, key);
    if (value !== null) return normalizeProfileValue(value);
  }
  return null;
};

const normalizeProfileLines = (lines: LabeledProfileLine[]): string => {
  const seen = new Set<string>();
  const normalized: string[] = [];
  lines.forEach((line) => {
    const label = normalizeLexiconLabel(line.label);
    const value = normalizeLexiconLabel(line.value);
    if (label.length === 0 || value.length === 0) return;
    const key = `${label.toLowerCase()}::${value.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(`${label}: ${value}`);
  });
  return clipProfileText(normalized.join('\n'));
};

const addProfileLine = (
  lines: LabeledProfileLine[],
  label: string,
  value: unknown,
  max = 3_000
): void => {
  const normalized = normalizeProfileValue(value);
  if (normalized.length === 0) return;
  lines.push({
    label,
    value: normalized.length > max ? `${normalized.slice(0, Math.max(0, max - 3))}...` : normalized,
  });
};

const factLines = (
  facts: Array<{ label: string; value: string }> | undefined,
  prefix = ''
): LabeledProfileLine[] =>
  (facts ?? []).flatMap((fact): LabeledProfileLine[] => {
    const label = normalizeProfileValue(fact.label);
    const value = normalizeProfileValue(fact.value);
    if (label.length === 0 || value.length === 0) return [];
    return [{ label: `${prefix}${label}`, value }];
  });

const snapshotCompanyDescription = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null => {
  const profile = snapshot?.companyProfile ?? null;
  if (profile === null) return null;
  const sectionText = profile.sections
    ?.map((section) => {
      const heading = section.heading?.trim() ?? '';
      return normalizeProfileValue(`${heading.length > 0 ? `${heading}: ` : ''}${section.text}`);
    })
    .filter(Boolean)
    .slice(0, 5)
    .join('\n');
  return recordFirstNullableString(
    {
      sectionText,
      plainText: profile.plainText,
    },
    ['sectionText', 'plainText']
  );
};

const firstSnapshotCompanyUrl = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null =>
  recordFirstNullableString(
    {
      profileUrl: snapshot?.companyProfile?.url,
      companyLink: snapshot?.companyLinks?.[0],
      jsonLdUrl: firstJsonLdOrganizationValue(snapshot, ['url', 'sameAs']),
      website: snapshot?.companyProfile?.websiteUrls?.[0],
    },
    ['profileUrl', 'companyLink', 'jsonLdUrl', 'website']
  );

const companyNameFromPracujProfileUrl = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  try {
    const url = new URL(value);
    if (!/pracuj\.pl$/iu.test(url.hostname.replace(/^www\./iu, ''))) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    const employerPathKeys = new Set([
      'firma',
      'firmy',
      'pracodawca',
      'pracodawcy',
      'profil pracodawcy',
      'profil pracodawcow',
      'profile pracodawcy',
      'profile pracodawcow',
    ]);
    const employerIndex = parts.findIndex((part: string): boolean =>
      employerPathKeys.has(normalizeCompanyNameGuardKey(part))
    );
    const slugPart = employerIndex >= 0 ? parts[employerIndex + 1] : null;
    if (slugPart === null || slugPart === undefined) return null;
    const slug = decodeURIComponent(slugPart).split(',')[0] ?? '';
    const normalized = slug
      .replace(/[-_]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (normalized.length < 3 || isSuspiciousJobBoardCompanyName(normalized)) return null;
    return normalized.replace(/\b[^\s]/gu, (letter: string): string => letter.toUpperCase());
  } catch {
    return null;
  }
};

const companyNameFromSnapshotCompanyUrls = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null => {
  const profile = asRecord(snapshot?.companyProfile);
  const rawProfileWebsiteUrls = profile?.['websiteUrls'];
  const profileWebsiteUrls: unknown[] = Array.isArray(rawProfileWebsiteUrls)
    ? rawProfileWebsiteUrls
    : [];
  const companyLinks: unknown[] = snapshot?.companyLinks ?? [];
  const candidates: unknown[] = [
    profile?.['url'],
    ...companyLinks,
    ...profileWebsiteUrls,
  ];
  for (const candidate of candidates) {
    const companyName = companyNameFromPracujProfileUrl(toStringValue(candidate));
    if (companyName !== null) return companyName;
  }
  return null;
};

const COMPANY_PROFILE_NAME_FACT_KEYS = new Set([
  'company',
  'employer',
  'firma',
  'name',
  'nazwa',
  'nazwa firmy',
  'organization',
  'organisation',
  'pracodawca',
]);

const companyNameFactCandidates = (facts: unknown): unknown[] => {
  if (!Array.isArray(facts)) return [];
  return facts.flatMap((fact: unknown): unknown[] => {
    const record = asRecord(fact);
    if (record === null) return [];
    const label = normalizeLexiconKey(toStringValue(record['label']));
    if (!COMPANY_PROFILE_NAME_FACT_KEYS.has(label)) return [];
    return [record['value']];
  });
};

const companyNameFromSnapshotCompanyProfile = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null => {
  const profile = asRecord(snapshot?.companyProfile);
  if (profile === null) return null;
  const rawHeadings = profile['headings'];
  const headings: unknown[] = Array.isArray(rawHeadings) ? rawHeadings : [];
  return firstCleanCompanyName([
    ...companyNameFactCandidates(profile['facts']),
    companyNameFromPracujProfileUrl(toStringValue(profile['url'])),
    ...headings,
    profile['title'],
    profile['ogTitle'],
  ]);
};

const firstSnapshotWebsite = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null => {
  const candidates = [
    ...(snapshot?.companyProfile?.websiteUrls ?? []),
    ...(snapshot?.companyLinks ?? []),
    firstJsonLdOrganizationValue(snapshot, ['url', 'sameAs']),
    firstSnapshotTextProfileValue(snapshot, 'website'),
  ];
  for (const candidate of candidates) {
    const normalized = normalizeCompanyUrl(candidate);
    if (
      normalized !== null &&
      companyNameFromPracujProfileUrl(normalized) === null &&
      !isSocialCompanyUrl(normalized)
    ) {
      return normalized;
    }
  }
  return null;
};

const flattenJsonLdRecords = (value: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(value)) {
    return value.flatMap(flattenJsonLdRecords);
  }
  const record = asRecord(value);
  if (record === null) return [];
  return [
    record,
    ...flattenJsonLdRecords(record['@graph']),
    ...flattenJsonLdRecords(record['itemListElement']),
  ];
};

const jsonLdTypeMatches = (record: Record<string, unknown>, expected: string): boolean => {
  const rawType = record['@type'];
  const values = Array.isArray(rawType) ? rawType : [rawType];
  return values.some((value) => normalizeProfileValue(value).toLowerCase() === expected.toLowerCase());
};

const snapshotJsonLdRecords = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): Array<Record<string, unknown>> =>
  (snapshot?.jsonLd ?? []).flatMap((script) => {
    try {
      return flattenJsonLdRecords(JSON.parse(script));
    } catch {
      return [];
    }
  });

const firstJobPostingValue = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  keys: readonly string[]
): string | null => {
  for (const record of snapshotJobPostingRecords(snapshot)) {
    const value = recordFirstNullableString(record, keys);
    if (value !== null) return value;
  }
  return null;
};

const snapshotJobPostingRecords = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): Array<Record<string, unknown>> =>
  snapshotJsonLdRecords(snapshot).filter((record) => jsonLdTypeMatches(record, 'JobPosting'));

const snapshotFactValue = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  labelKeywords: readonly string[],
  exact = false
): string | null => {
  const facts = [...(snapshot?.facts ?? []), ...(snapshot?.companyProfile?.facts ?? [])];
  for (const fact of facts) {
    const label = normalizeLexiconKey(fact.label);
    const matches = exact
      ? labelKeywords.some((keyword) => label === keyword)
      : labelKeywords.some((keyword) => label.includes(keyword));
    if (!matches) continue;
    const value = normalizeProfileValue(fact.value);
    if (value.length > 0) return value;
  }
  return null;
};

const firstSnapshotListingTitle = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null =>
  cleanSnapshotTitle(firstJobPostingValue(snapshot, ['title', 'name'])) ??
  cleanSnapshotTitle(snapshot?.headings?.[0]) ??
  cleanSnapshotTitle(snapshot?.ogTitle) ??
  cleanSnapshotTitle(snapshot?.title);

const firstSnapshotCompanyName = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null =>
  cleanCompanyName(snapshot?.employerName) ??
  cleanCompanyName(recordFirstNullableString(jsonLdHiringOrganization(snapshot), ['name', 'legalName'])) ??
  cleanCompanyName(snapshotFactValue(snapshot, COMPANY_NAME_FACT_KEYS, true)) ??
  cleanCompanyName(snapshot?.companyProfile?.title) ??
  cleanCompanyName(snapshot?.companyProfile?.headings?.[0]);

const jsonLdHiringOrganization = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): Record<string, unknown> | null => {
  for (const record of snapshotJsonLdRecords(snapshot)) {
    if (!jsonLdTypeMatches(record, 'JobPosting')) continue;
    const hiringOrganization = asRecord(record['hiringOrganization']);
    if (hiringOrganization !== null) return hiringOrganization;
  }
  return null;
};

const jsonLdScalarValue = (value: unknown): string | null => {
  if (typeof value === 'string') return normalizeProfileValue(value);
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = jsonLdScalarValue(item);
      if (normalized !== null && normalized.length > 0) return normalized;
    }
    return null;
  }
  const record = asRecord(value);
  if (record === null) return null;
  return (
    recordFirstNullableString(record, ['name', 'value', 'url', 'sameAs']) ??
    jsonLdScalarValue(record['minValue']) ??
    jsonLdScalarValue(record['maxValue'])
  );
};

const jsonLdOrganizationRecords = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): Array<Record<string, unknown>> => {
  const hiringOrganization = jsonLdHiringOrganization(snapshot);
  return [
    ...(hiringOrganization !== null ? [hiringOrganization] : []),
    ...snapshotJsonLdRecords(snapshot).filter((record) => jsonLdTypeMatches(record, 'Organization')),
  ];
};

const firstJsonLdOrganizationValue = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  keys: readonly string[]
): string | null => {
  for (const record of jsonLdOrganizationRecords(snapshot)) {
    for (const key of keys) {
      const value = jsonLdScalarValue(record[key]);
      if (value !== null && value.length > 0) return value;
    }
  }
  return null;
};

const jsonLdUrlValues = (value: unknown): string[] => {
  const normalized = normalizeCompanyUrl(value);
  if (normalized !== null) return [normalized];
  if (Array.isArray(value)) return value.flatMap(jsonLdUrlValues);
  const record = asRecord(value);
  if (record === null) return [];
  return [...jsonLdUrlValues(record['url']), ...jsonLdUrlValues(record['sameAs'])];
};

const jsonLdOrganizationUrlCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] =>
  uniqueStrings(
    jsonLdOrganizationRecords(snapshot).flatMap((record) => [
      ...jsonLdUrlValues(record['url']),
      ...jsonLdUrlValues(record['sameAs']),
    ])
  );

const companyRelatedUrlCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] =>
  uniqueStrings(
    [
      normalizeCompanyUrl(snapshot?.companyProfile?.url) ?? '',
      ...(snapshot?.companyLinks ?? []).map((url) => normalizeCompanyUrl(url) ?? ''),
      ...(snapshot?.companyProfile?.websiteUrls ?? []).map((url) => normalizeCompanyUrl(url) ?? ''),
      ...jsonLdOrganizationUrlCandidates(snapshot),
      normalizeCompanyUrl(firstSnapshotTextProfileValue(snapshot, 'website')) ?? '',
    ].filter(Boolean)
  ).slice(0, 16);

const addCompanyRelatedUrlLines = (
  lines: LabeledProfileLine[],
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  primaryUrls: Array<string | null>
): void => {
  const primaryKeys = new Set(primaryUrls.filter((url): url is string => url !== null).map(companyUrlKey));
  companyRelatedUrlCandidates(snapshot).forEach((url) => {
    if (primaryKeys.has(companyUrlKey(url))) return;
    addProfileLine(lines, isSocialCompanyUrl(url) ? 'Social URL' : 'Related URL', url);
  });
};

const addressFromRecord = (record: Record<string, unknown> | null): string | null => {
  if (record === null) return null;
  const source = asRecord(record['address']) ?? record;
  const line = recordFirstNullableString(source, COMPANY_ADDRESS_KEYS);
  const city = recordFirstNullableString(source, COMPANY_CITY_KEYS);
  const region = recordFirstNullableString(source, COMPANY_REGION_KEYS);
  const postalCode = recordFirstNullableString(source, COMPANY_POSTAL_KEYS);
  const country = recordFirstNullableString(source, COMPANY_COUNTRY_KEYS);
  if (line === null && postalCode === null) return null;
  const cityLine = uniqueStrings([postalCode ?? '', city ?? '', region ?? '']).join(' ');
  const combined = uniqueStrings([line ?? '', cityLine, country ?? '']).join(', ');
  return combined.length > 0 ? combined : null;
};

const jsonLdJobLocationAddress = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null => {
  for (const record of snapshotJsonLdRecords(snapshot)) {
    if (!jsonLdTypeMatches(record, 'JobPosting')) continue;
    const rawLocation = record['jobLocation'];
    const locations = Array.isArray(rawLocation) ? rawLocation : [rawLocation];
    for (const location of locations) {
      const locationRecord = asRecord(location);
      const address = addressFromRecord(asRecord(locationRecord?.['address']) ?? locationRecord);
      if (address !== null) return address;
    }
  }
  return null;
};

const cleanExtractedAddressStreet = (value: string): string =>
  normalizeLexiconLabel(value).replace(
    /^(?:adres(?: siedziby)?|siedziba|address|headquarters|office|biuro|lokalizacja|miejsce pracy)\s+/i,
    ''
  );

const cleanExtractedAddressCity = (value: string): string =>
  normalizeLexiconLabel(value)
    .replace(/\b(?:polska|poland|nip|krs|regon|tel|telefon|e-mail|email|www|strona|branza|branża|industry)\b.*$/i, '')
    .replace(/[.,;|].*$/, '')
    .trim();

const addressCandidateFromTextMatch = (match: RegExpMatchArray): string | null => {
  const street = cleanExtractedAddressStreet(match[1] ?? '');
  const streetNumber = normalizeProfileValue(match[2]);
  const postalCode = normalizeProfileValue(match[3]);
  const city = cleanExtractedAddressCity(match[4] ?? '');
  if (street.length === 0 || streetNumber.length === 0 || postalCode.length === 0 || city.length === 0) {
    return null;
  }
  return `${street} ${streetNumber}, ${postalCode} ${city}, Poland`;
};

const addressCandidateWithoutPostalFromTextMatch = (
  match: RegExpMatchArray
): string | null => {
  const street = cleanExtractedAddressStreet(match[1] ?? '');
  const streetNumber = normalizeProfileValue(match[2]);
  const district = cleanExtractedAddressCity(match[4] !== undefined ? match[3] ?? '' : '');
  const city = cleanExtractedAddressCity(match[4] ?? match[3] ?? '');
  if (street.length === 0 || streetNumber.length === 0 || city.length === 0) return null;
  return uniqueStrings([`${street} ${streetNumber}`, district, city]).join(', ');
};

const extractAddressCandidatesFromText = (value: unknown): string[] => {
  const normalized = normalizeProfileValue(value);
  return uniqueStrings(
    [
      ...Array.from(normalized.matchAll(TEXT_ADDRESS_RE)).map(addressCandidateFromTextMatch),
      ...Array.from(normalized.matchAll(TEXT_ADDRESS_WITHOUT_POSTAL_RE)).map(
        addressCandidateWithoutPostalFromTextMatch
      ),
    ]
      .filter((candidate): candidate is string => candidate !== null)
  );
};

const snapshotTextValues = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] => {
  const profileSections = snapshot?.companyProfile?.sections ?? [];
  const sections = snapshot?.sections ?? [];
  return [
    snapshot?.companyProfile?.plainText ?? '',
    ...profileSections.map((section) => section.text),
    snapshot?.plainText ?? '',
    ...sections.map((section) => section.text),
  ];
};

const snapshotTextAddressCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] =>
  uniqueStrings(snapshotTextValues(snapshot).flatMap(extractAddressCandidatesFromText)).slice(0, 8);

const normalizeProfileTextCapture = (key: string, value: string): string => {
  const normalized = normalizeProfileValue(value);
  if (key === 'email') return normalized.replace(/[.,;]+$/, '').toLowerCase();
  if (key === 'nip' || key === 'krs' || key === 'regon') return normalized.replace(/\D/g, '');
  if (key === 'phone') return normalized.replace(/[.,;]+$/, '').replace(/\s+/g, ' ');
  if (key === 'website') return normalized.replace(/[.,;]+$/, '');
  if (key === 'industry') {
    return normalized
      .replace(/\b(?:nip|krs|regon|adres|address|strona|website|e-mail|email|telefon|phone)\b.*$/i, '')
      .trim();
  }
  return normalized;
};

const firstSnapshotTextProfileValue = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  key: string
): string | null => {
  const patterns = COMPANY_PROFILE_TEXT_PATTERNS[key] ?? [];
  for (const text of snapshotTextValues(snapshot)) {
    const normalized = normalizeProfileValue(text);
    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      const value = normalizeProfileTextCapture(key, match?.[1] ?? match?.[0] ?? '');
      if (value.length > 0) return value;
    }
  }
  return null;
};

const addressFacts = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] => {
  const profileFacts = snapshot?.companyProfile?.facts ?? [];
  return [...profileFacts, ...(snapshot?.facts ?? [])].flatMap((fact) => {
    if (!ADDRESS_FACT_LABEL_RE.test(fact.label)) return [];
    const value = normalizeProfileValue(fact.value);
    return value.length > 0 ? [value] : [];
  });
};

const companyAddressCandidates = (input: {
  company: Record<string, unknown> | null;
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): string[] =>
  uniqueStrings([
    addressFromRecord(jsonLdHiringOrganization(input.snapshot)) ?? '',
    ...addressFacts(input.snapshot),
    ...snapshotTextAddressCandidates(input.snapshot),
    addressFromRecord(input.company) ?? '',
    addressFromRecord(input.listing) ?? '',
    jsonLdJobLocationAddress(input.snapshot) ?? '',
  ]);

type ScrapedCompanyInformation = Pick<
  FilemakerJobBoardScrapedOffer,
  | 'companyAddress'
  | 'companyCity'
  | 'companyCountry'
  | 'companyEmail'
  | 'companyIndustry'
  | 'companyKrs'
  | 'companyLogoUrl'
  | 'companyPhone'
  | 'companyPostalCode'
  | 'companyRegion'
  | 'companyRegon'
  | 'companySize'
  | 'companyTaxId'
  | 'companyWebsiteUrl'
>;

const companyProfileFieldValue = (
  input: {
    company: Record<string, unknown> | null;
    snapshot?: JobBoardStructuredSnapshot | null;
  },
  key: (typeof COMPANY_PROFILE_FIELDS)[number]['key']
): string | null => {
  const field = COMPANY_PROFILE_FIELDS.find((entry): boolean => entry.key === key);
  if (field === undefined) return null;
  return (
    firstJsonLdOrganizationValue(input.snapshot, field.jsonLdKeys) ??
    snapshotFactValue(input.snapshot, field.factKeywords) ??
    firstSnapshotTextProfileValue(input.snapshot, field.key) ??
    recordFirstNullableString(input.company, [field.key, `company${field.label.replace(/\s+/g, '')}`])
  );
};

const companyInformationFromSources = (input: {
  company: Record<string, unknown> | null;
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): ScrapedCompanyInformation => {
  const explicitWebsite = normalizeCompanyUrl(companyProfileFieldValue(input, 'website'));
  const website =
    explicitWebsite !== null && companyNameFromPracujProfileUrl(explicitWebsite) === null
      ? explicitWebsite
      : normalizeCompanyUrl(firstSnapshotWebsite(input.snapshot));
  const logoUrl = normalizeCompanyUrl(companyProfileFieldValue(input, 'logoUrl'));
  return {
    companyAddress: companyAddressCandidates(input)[0] ?? '',
    companyCity: '',
    companyCountry: '',
    companyEmail: companyProfileFieldValue(input, 'email'),
    companyIndustry: companyProfileFieldValue(input, 'industry') ?? '',
    companyKrs: companyProfileFieldValue(input, 'krs') ?? '',
    companyLogoUrl: logoUrl,
    companyPhone: companyProfileFieldValue(input, 'phone'),
    companyPostalCode: '',
    companyRegion: '',
    companyRegon: companyProfileFieldValue(input, 'regon') ?? '',
    companySize: companyProfileFieldValue(input, 'size') ?? '',
    companyTaxId: companyProfileFieldValue(input, 'nip') ?? '',
    companyWebsiteUrl: website,
  };
};

const profileLinesFromCompany = (input: {
  company: Record<string, unknown> | null;
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): LabeledProfileLine[] => {
  const lines: LabeledProfileLine[] = [];
  addProfileLine(
    lines,
    'Description',
    firstJsonLdOrganizationValue(input.snapshot, ['description']) ??
      snapshotCompanyDescription(input.snapshot) ??
      recordFirstNullableString(input.company, ['description', 'profile', 'about'])
  );
  COMPANY_PROFILE_FIELDS.forEach((field) => {
    addProfileLine(
      lines,
      field.label,
      companyProfileFieldValue(input, field.key)
    );
  });
  const website = firstSnapshotWebsite(input.snapshot) ?? companyProfileFieldValue(input, 'website');
  const profileUrl =
    firstSnapshotCompanyUrl(input.snapshot) ??
    recordFirstNullableString(input.company, ['profileUrl', 'companyProfileUrl']);
  addProfileLine(lines, 'Website', website);
  addProfileLine(lines, 'Profile URL', profileUrl);
  addCompanyRelatedUrlLines(lines, input.snapshot, [website, profileUrl]);
  addProfileLine(lines, 'Address', companyAddressCandidates(input)[0]);
  lines.push(...factLines(input.snapshot?.companyProfile?.facts, 'Profile '));
  lines.push(...factLines(input.snapshot?.facts));
  addProfileLine(lines, 'Profile text', input.snapshot?.companyProfile?.plainText, 4_000);
  return lines;
};

const buildCompanyProfile = (input: {
  company: Record<string, unknown> | null;
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): string => normalizeProfileLines(profileLinesFromCompany(input));

const normalizedRecordValue = (
  record: Record<string, unknown> | null,
  key: string
): string | null => {
  const value = normalizeProfileValue(record?.[key]);
  return value.length > 0 && value !== 'unknown' ? value : null;
};

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  b2b: 'B2B contract',
  contract_of_employment: 'contract of employment',
  employment_contract: 'contract of employment',
  mandate_contract: 'contract of mandate',
};

const WORK_MODE_LABELS: Record<string, string> = {
  hybrid: 'hybrid work',
  office: 'office work',
  onsite: 'office work',
  on_site: 'office work',
  remote: 'remote work',
};

const labelFromLookup = (
  value: string | null,
  labels: Record<string, string>
): string | null => {
  if (value === null) return null;
  const key = normalizeLexiconKey(value).replace(/\s+/g, '_');
  return labels[key] ?? value;
};

const normalizedStringArray = (value: unknown): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return uniqueStrings(
    values
      .flatMap((entry): string[] =>
        typeof entry === 'string' ? entry.split(/[,;|]/).map(normalizeLexiconLabel) : []
      )
      .filter((entry) => entry.length > 0 && entry.length <= 120)
  );
};

const normalizedTextBlockArray = (value: unknown, itemStartPattern?: RegExp): string[] => {
  const values = Array.isArray(value) ? value : [value];
  return uniqueStrings(
    values
      .flatMap((entry): string[] => {
        const normalizedValue = normalizeDescriptionValue(entry);
        const normalized =
          itemStartPattern === undefined
            ? normalizedValue
            : normalizedValue
                ?.replace(JOB_RESPONSIBILITY_HEADING_RE, '')
                .replace(itemStartPattern, '\n$1');
        if (normalized === null || normalized === undefined) return [];
        return normalized
          .split(/\n+|[•●▪]/u)
          .map(normalizeLexiconLabel);
      })
      .filter((entry) => entry.length > 0)
  );
};

const resolveListingFieldPillCategory = (
  fallbackCategory: ScrapedOfferPill['category'],
  label: string,
  sourceScope: FilemakerLexiconValidationPatternSourceScope,
  validationPatterns: readonly FilemakerLexiconValidationPattern[] | null | undefined
): ScrapedOfferPill['category'] =>
  classifyFilemakerLexiconLabelWithPatterns(validationPatterns, {
    label,
    sourceScope,
  })?.typeKey ?? fallbackCategory;

const dedupeOfferPills = (pills: ScrapedOfferPill[]): ScrapedOfferPill[] => {
  const seen = new Set<string>();
  return pills.flatMap((pill): ScrapedOfferPill[] => {
    const key = `${pill.typeKey}:${normalizeLexiconKey(pill.label)}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [pill];
  });
};

// eslint-disable-next-line max-lines-per-function
const listingFieldPillValues = (input: {
  listing: Record<string, unknown> | null;
}): Array<{
  category: ScrapedOfferPill['category'];
  label: string;
  sourceScope: FilemakerLexiconValidationPatternSourceScope;
}> => {
  const contractType = labelFromLookup(
    normalizedRecordValue(input.listing, 'contractType') ??
      normalizedRecordValue(input.listing, 'contract'),
    CONTRACT_TYPE_LABELS
  );
  const employmentType =
    normalizedRecordValue(input.listing, 'employmentType') ??
    normalizedRecordValue(input.listing, 'employment');
  const workMode = labelFromLookup(
    normalizedRecordValue(input.listing, 'workMode') ?? normalizedRecordValue(input.listing, 'mode'),
    WORK_MODE_LABELS
  );
  const experienceLevel =
    normalizedRecordValue(input.listing, 'experienceLevel') ??
    normalizedRecordValue(input.listing, 'seniority');
  const employmentTypePills =
    employmentType !== null
      ? [
          {
            category: 'employment_type' as const,
            label: employmentType,
            sourceScope: 'listing_field_employment' as const,
          },
        ]
      : [];
  return [
    ...(contractType !== null
      ? [
          {
            category: 'contract_type' as const,
            label: contractType,
            sourceScope: 'listing_field_contract' as const,
          },
        ]
      : []),
    ...employmentTypePills,
    ...(experienceLevel !== null
      ? [
          {
            category: 'experience_level' as const,
            label: experienceLevel,
            sourceScope: 'listing_field_experience' as const,
          },
        ]
      : []),
    ...(workMode !== null
      ? [
          {
            category: 'work_mode' as const,
            label: workMode,
            sourceScope: 'listing_field_work_mode' as const,
          },
        ]
      : []),
    ...normalizedStringArray(input.listing?.['technologies'])
      .slice(0, 24)
      .map((label) => ({
        category: 'technology' as const,
        label,
        sourceScope: 'listing_field_technology' as const,
      })),
    ...normalizedStringArray(input.listing?.['benefits'])
      .slice(0, 24)
      .map((label) => ({
        category: 'benefit' as const,
        label,
        sourceScope: 'listing_field_benefit' as const,
      })),
    ...normalizedStringArray(input.listing?.['requirements'])
      .slice(0, 24)
      .map((label) => ({
        category: 'requirement' as const,
        label,
        sourceScope: 'listing_field_requirement' as const,
      })),
    ...normalizedStringArray(input.listing?.['responsibilities'])
      .slice(0, 24)
      .map((label) => ({
        category: 'responsibility' as const,
        label,
        sourceScope: 'listing_field_responsibility' as const,
      })),
    ...normalizedStringArray(input.listing?.['salary'])
      .slice(0, 8)
      .map((label) => ({
        category: 'salary' as const,
        label,
        sourceScope: 'listing_field_salary' as const,
      })),
    ...normalizedStringArray(input.listing?.['salaryText'])
      .slice(0, 8)
      .map((label) => ({
        category: 'salary' as const,
        label,
        sourceScope: 'listing_field_salary' as const,
      })),
    ...normalizedStringArray(input.listing?.['languages'])
      .slice(0, 12)
      .map((label) => ({
        category: 'language' as const,
        label,
        sourceScope: 'listing_field_language' as const,
      })),
  ];
};

const scrapedOfferPillKey = (pill: Pick<ScrapedOfferPill, 'category' | 'label'> & {
  typeKey?: ScrapedOfferPill['typeKey'];
}): string => `${pill.typeKey ?? pill.category}:${normalizeLexiconKey(pill.label)}`;

const buildListingFieldPills = (input: {
  baseOffset: number;
  listing: Record<string, unknown> | null;
  seen: Set<string>;
  sourceSite: string;
  sourceUrl: string;
  validationPatterns?: readonly FilemakerLexiconValidationPattern[] | null;
}): ScrapedOfferPill[] =>
  listingFieldPillValues({ listing: input.listing }).flatMap((candidate, index): ScrapedOfferPill[] => {
    const normalized = normalizeLexiconLabel(candidate.label);
    const category = resolveListingFieldPillCategory(
      candidate.category,
      normalized,
      candidate.sourceScope,
      input.validationPatterns
    );
    if (category === 'address' || category === 'other') return [];
    const key = scrapedOfferPillKey({ category, label: normalized });
    if (normalized.length === 0 || input.seen.has(key)) return [];
    input.seen.add(key);
    return [
      {
        category,
        typeKey: category,
        label: normalized,
        position: input.baseOffset + index,
        sourceSite: input.sourceSite,
        sourceUrl: input.sourceUrl,
      },
    ];
  });

const buildOfferPills = (input: {
  listing: Record<string, unknown> | null;
  provider: JobBoardProvider;
  snapshot: JobBoardStructuredSnapshot | null | undefined;
  sourceSite: string;
  sourceUrl: string;
  validationPatterns?: readonly FilemakerLexiconValidationPattern[] | null;
}): {
  pills: ScrapedOfferPill[];
  unclassifiedPills: FilemakerJobBoardScrapedOffer['unclassifiedPills'];
} => {
  const baseLexicon = buildScrapedOfferLexiconExtraction({
    provider: input.provider,
    snapshot: input.snapshot,
    sourceSite: input.sourceSite,
    sourceUrl: input.sourceUrl,
    validationPatterns: input.validationPatterns,
  });
  const basePills = baseLexicon.pills;
  const seen = new Set(basePills.map(scrapedOfferPillKey));
  const listingPills = buildListingFieldPills({
    baseOffset: basePills.length,
    listing: input.listing,
    seen,
    sourceSite: input.sourceSite,
    sourceUrl: input.sourceUrl,
    validationPatterns: input.validationPatterns,
  });
  return {
    pills: dedupeOfferPills([...basePills, ...listingPills]).slice(0, 100),
    unclassifiedPills: baseLexicon.unclassifiedPills,
  };
};

type SalaryFields = Pick<
  FilemakerJobBoardScrapedOffer,
  'salaryCurrency' | 'salaryMax' | 'salaryMin' | 'salaryPeriod' | 'salaryText'
>;

const emptySalaryFields = (): SalaryFields => ({
  salaryCurrency: null,
  salaryMax: null,
  salaryMin: null,
  salaryPeriod: 'monthly',
  salaryText: '',
});

const hasSalaryValue = (salary: SalaryFields): boolean =>
  salary.salaryCurrency !== null ||
  salary.salaryMax !== null ||
  salary.salaryMin !== null ||
  salary.salaryText.length > 0;

const normalizeSalaryCurrency = (value: unknown): string | null => {
  const normalized = normalizeLexiconLabel(toStringValue(value));
  if (normalized.length === 0) return null;
  if (/^(?:zł|zl)$/iu.test(normalized)) return 'PLN';
  if (normalized === '€') return 'EUR';
  if (normalized === '£') return 'GBP';
  if (normalized === '$') return 'USD';
  return normalized.toUpperCase();
};

const salaryCurrencyFromText = (value: string): string | null => {
  const match = value.match(SALARY_CURRENCY_RE);
  if (match === null) return null;
  return normalizeSalaryCurrency(match[1] ?? match[0]);
};

const salaryNumberFromValue = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null;
  const normalized = normalizeLexiconLabel(toStringValue(value));
  if (normalized.length === 0) return null;
  const multiplier = /\d\s*k\b/iu.test(normalized) ? 1_000 : 1;
  const decimalNormalized = normalized
    .replace(/[ \u00a0.](?=\d{3}\b)/g, '')
    .replace(/,(?=\d{3}\b)/g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  const parsed = Number(decimalNormalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed * multiplier : null;
};

const salaryPeriodFromText = (value: string): FilemakerJobBoardScrapedOffer['salaryPeriod'] => {
  const normalized = normalizeLexiconKey(value);
  if (/\b(hour|hourly|godz|godzina|godzinowo|h)\b/.test(normalized)) return 'hourly';
  if (/\b(year|yearly|annual|annually|rok|rocznie)\b/.test(normalized)) return 'yearly';
  if (/\b(fixed|one time|project|contract)\b/.test(normalized)) return 'fixed';
  return 'monthly';
};

const salaryBoundsFromNumbers = (text: string, numbers: number[]): Pick<SalaryFields, 'salaryMax' | 'salaryMin'> => {
  const first = numbers[0] ?? null;
  const second = numbers[1] ?? null;
  if (first === null) return { salaryMax: null, salaryMin: null };
  if (second !== null) return { salaryMax: second, salaryMin: first };
  const normalized = normalizeLexiconKey(text);
  if (/\b(up to|upto|max|maximum|do)\b/.test(normalized)) return { salaryMax: first, salaryMin: null };
  if (/\b(from|min|minimum|od)\b/.test(normalized)) return { salaryMax: null, salaryMin: first };
  return { salaryMax: first, salaryMin: first };
};

const salaryFromText = (value: unknown): SalaryFields | null => {
  const text = normalizeLexiconLabel(toStringValue(value));
  if (text.length === 0) return null;
  const numbers = Array.from(text.matchAll(SALARY_NUMBER_RE))
    .map((match) => salaryNumberFromValue(match[0]))
    .filter((number): number is number => number !== null);
  if (numbers.length === 0 && salaryCurrencyFromText(text) === null) return null;
  const bounds = salaryBoundsFromNumbers(text, numbers.slice(0, 2));
  return {
    salaryCurrency: salaryCurrencyFromText(text),
    salaryMax: bounds.salaryMax,
    salaryMin: bounds.salaryMin,
    salaryPeriod: salaryPeriodFromText(text),
    salaryText: text,
  };
};

const salaryFromJsonLdValue = (value: unknown): SalaryFields | null => {
  const record = asRecord(value);
  if (record === null) return salaryFromText(value);
  const nestedValue = asRecord(record['value']);
  const source = nestedValue ?? record;
  const min = salaryNumberFromValue(source['minValue'] ?? source['min'] ?? source['value']);
  const max = salaryNumberFromValue(source['maxValue'] ?? source['max'] ?? source['value']);
  const raw = normalizeLexiconLabel(
    uniqueStrings([
      min !== null && max !== null && min !== max ? `${min} - ${max}` : String(min ?? max ?? ''),
      normalizeSalaryCurrency(record['currency'] ?? record['salaryCurrency']) ?? '',
      toStringValue(source['unitText'] ?? source['unitCode']),
    ]).join(' ')
  );
  const salary = {
    salaryCurrency: normalizeSalaryCurrency(record['currency'] ?? record['salaryCurrency']),
    salaryMax: max,
    salaryMin: min,
    salaryPeriod: normalizeSalaryPeriod(source['unitText'] ?? source['unitCode']),
    salaryText: raw,
  };
  return hasSalaryValue(salary) ? salary : null;
};

const firstJsonLdSalary = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): SalaryFields | null => {
  for (const record of snapshotJobPostingRecords(snapshot)) {
    const values = Array.isArray(record['baseSalary'])
      ? record['baseSalary']
      : [record['baseSalary']];
    for (const value of values) {
      const salary = salaryFromJsonLdValue(value);
      if (salary !== null) return salary;
    }
  }
  return null;
};

const firstSnapshotSalaryFact = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): SalaryFields | null => {
  const text = snapshotFactValue(snapshot, SALARY_FACT_KEYWORDS);
  return text === null ? null : salaryFromText(text);
};

const looksLikeSalaryText = (value: unknown): boolean =>
  SALARY_TEXT_HINT_RE.test(normalizeLexiconLabel(toStringValue(value)));

const firstSalaryFromTextCandidates = (candidates: unknown[]): SalaryFields | null => {
  for (const candidate of candidates) {
    if (!looksLikeSalaryText(candidate)) continue;
    const salary = salaryFromText(candidate);
    if (salary !== null) return salary;
  }
  return null;
};

const salarySectionTextCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] =>
  (snapshot?.sections ?? []).flatMap((section): string[] => {
    const heading = normalizeLexiconLabel(section.heading ?? '');
    const text = normalizeLexiconLabel(section.text);
    const combined = `${heading} ${text}`;
    if (!looksLikeSalaryText(combined)) return [];
    return [combined.slice(0, 800)];
  });

const salaryPlainTextCandidates = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] => {
  const raw = toStringValue(snapshot?.plainText);
  if (raw.length === 0 || !looksLikeSalaryText(raw)) return [];
  const normalized = raw.replace(/\u00a0/g, ' ');
  const fragments = normalized
    .split(/\n+|(?<=[.;])\s+/u)
    .map(normalizeLexiconLabel)
    .filter((fragment) => fragment.length > 0 && looksLikeSalaryText(fragment));
  if (fragments.length > 0) return fragments.slice(0, 6).map((fragment) => fragment.slice(0, 800));
  const dense = normalizeLexiconLabel(normalized);
  const salaryIndex = dense.search(SALARY_TEXT_HINT_RE);
  if (salaryIndex < 0) return [];
  return [dense.slice(Math.max(0, salaryIndex - 120), salaryIndex + 220)];
};

const firstVisibleSnapshotSalary = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): SalaryFields | null =>
  firstSalaryFromTextCandidates([
    ...(snapshot?.pills ?? []),
    ...salarySectionTextCandidates(snapshot),
    ...salaryPlainTextCandidates(snapshot),
  ]);

export const salaryFromListing = (
  listing: Record<string, unknown> | null,
  extractSalaries: boolean
): SalaryFields => {
  if (!extractSalaries) return emptySalaryFields();
  const salary = asRecord(listing?.['salary']);
  const salaryRaw = recordString(salary, 'raw');
  const salaryPlainText = recordString(salary, 'text');
  const listingSalaryText = recordString(listing, 'salaryText');
  const listingSalaryRaw = recordString(listing, 'salaryRaw');
  const fallbackSalaryText = salary === null ? recordString(listing, 'salary') : '';
  const salaryText = [
    salaryRaw,
    salaryPlainText,
    listingSalaryText,
    listingSalaryRaw,
    fallbackSalaryText,
  ].find((value) => value.length > 0) ?? '';
  const fields = {
    salaryCurrency: recordNullableString(salary, 'currency'),
    salaryMax: toNullableNumber(salary?.['max']),
    salaryMin: toNullableNumber(salary?.['min']),
    salaryPeriod: normalizeSalaryPeriod(salary?.['period']),
    salaryText,
  };
  if (hasSalaryValue(fields)) {
    if (fields.salaryMin !== null || fields.salaryMax !== null) return fields;
    return salaryFromText(salaryText) ?? fields;
  }
  return salaryFromText(salaryText) ?? emptySalaryFields();
};

const salaryFromSources = (input: {
  extractSalaries: boolean;
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): SalaryFields => {
  if (!input.extractSalaries) return emptySalaryFields();
  const listingSalary = salaryFromListing(input.listing, true);
  if (hasSalaryValue(listingSalary)) return listingSalary;
  return (
    firstJsonLdSalary(input.snapshot) ??
    firstSnapshotSalaryFact(input.snapshot) ??
    firstVisibleSnapshotSalary(input.snapshot) ??
    emptySalaryFields()
  );
};

export const locationFromListing = (listing: Record<string, unknown> | null): string =>
  uniqueStrings([
    recordString(listing, 'city'),
    recordString(listing, 'region'),
    recordString(listing, 'country'),
  ]).join(', ');

const locationFromSources = (input: {
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): string => {
  const listingLocation = locationFromListing(input.listing);
  if (listingLocation.length > 0) return listingLocation;
  const factLocation = snapshotFactValue(input.snapshot, LOCATION_FACT_KEYWORDS);
  if (factLocation !== null) return factLocation;
  return jsonLdJobLocationAddress(input.snapshot) ?? '';
};

const jobSnapshotTextFragments = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string[] =>
  [
    ...(snapshot?.sections ?? []).map((section) => `${section.heading ?? ''} ${section.text}`),
    snapshot?.plainText ?? '',
  ].flatMap((value): string[] =>
    normalizeLexiconLabel(value.replace(/\u00a0/g, ' '))
      .split(/\n+|(?<=[.;])\s+/u)
      .map(normalizeLexiconLabel)
      .filter((fragment) => fragment.length > 0)
  );

const dateTextWindow = (value: string, labelKeywords: readonly string[]): string | null => {
  const normalizedValue = normalizeLexiconKey(value);
  for (const keyword of labelKeywords) {
    const index = normalizedValue.indexOf(normalizeLexiconKey(keyword));
    if (index < 0) continue;
    return value.slice(Math.max(0, index - 20), index + 160);
  }
  return null;
};

const snapshotTextDateValue = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  labelKeywords: readonly string[]
): string | null => {
  for (const fragment of jobSnapshotTextFragments(snapshot)) {
    const window = dateTextWindow(fragment, labelKeywords);
    if (window !== null && normalizeScrapedDateValue(window) !== null) return window;
  }
  return null;
};

const dateRangeFromSources = (input: {
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): Pick<FilemakerJobBoardScrapedOffer, 'expiresAt' | 'postedAt'> => {
  const rawExpiresAt =
    recordFirstNullableString(input.listing, EXPIRES_AT_KEYS) ??
    firstJobPostingValue(input.snapshot, EXPIRES_AT_KEYS) ??
    snapshotFactValue(input.snapshot, EXPIRES_AT_FACT_KEYWORDS) ??
    snapshotTextDateValue(input.snapshot, EXPIRES_AT_FACT_KEYWORDS);
  const rawPostedAt =
    recordFirstNullableString(input.listing, POSTED_AT_KEYS) ??
    firstJobPostingValue(input.snapshot, POSTED_AT_KEYS) ??
    snapshotFactValue(input.snapshot, POSTED_AT_FACT_KEYWORDS) ??
    snapshotTextDateValue(input.snapshot, POSTED_AT_FACT_KEYWORDS);
  return {
    expiresAt: normalizeScrapedDateValue(rawExpiresAt),
    postedAt: normalizeScrapedDateValue(rawPostedAt),
  };
};

const snapshotOfferSectionText = (
  section: { heading?: string | null; text: string }
): string | null => {
  const heading = normalizeLexiconLabel(section.heading ?? '');
  const text = normalizeDescriptionValue(section.text);
  if (text === null) return null;
  return heading.length > 0 ? `${heading}\n${text}` : text;
};

const snapshotOfferDescriptionFromSections = (
  snapshot: JobBoardStructuredSnapshot | null | undefined
): string | null => {
  const sections = snapshot?.sections ?? [];
  const matchingSections = sections
    .filter((section) => JOB_DESCRIPTION_SECTION_RE.test(`${section.heading ?? ''} ${section.text}`))
    .map(snapshotOfferSectionText)
    .filter((sectionText): sectionText is string => sectionText !== null);
  if (matchingSections.length === 0) return null;
  return clipProfileText(uniqueStrings(matchingSections).slice(0, 12).join('\n\n'), 20_000);
};

const snapshotOfferTextFromSections = (
  snapshot: JobBoardStructuredSnapshot | null | undefined,
  headingPattern: RegExp,
  itemStartPattern?: RegExp
): string | null => {
  const matchingSections = (snapshot?.sections ?? [])
    .filter((section) => headingPattern.test(`${section.heading ?? ''} ${section.text}`))
    .map(snapshotOfferSectionText)
    .flatMap((sectionText): string[] =>
      sectionText === null ? [] : normalizedTextBlockArray(sectionText, itemStartPattern)
    );
  if (matchingSections.length === 0) return null;
  return clipProfileText(uniqueStrings(matchingSections).slice(0, 48).join('\n'), 12_000);
};

const listingTextFromFields = (
  listing: Record<string, unknown> | null,
  keys: readonly string[],
  itemStartPattern?: RegExp
): string | null => {
  const values = uniqueStrings(
    keys.flatMap((key: string): string[] =>
      normalizedTextBlockArray(listing?.[key], itemStartPattern)
    )
  );
  if (values.length === 0) return null;
  return clipProfileText(values.slice(0, 48).join('\n'), 12_000);
};

const offerRequirementsFromSources = (input: {
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): string =>
  listingTextFromFields(input.listing, ['requirements', 'qualifications', 'mustHave', 'niceToHave']) ??
  snapshotOfferTextFromSections(input.snapshot, JOB_REQUIREMENTS_SECTION_RE) ??
  '';

const offerResponsibilitiesFromSources = (input: {
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): string =>
  listingTextFromFields(
    input.listing,
    ['responsibilities', 'duties', 'tasks', 'scope'],
    JOB_RESPONSIBILITY_ITEM_START_RE
  ) ??
  snapshotOfferTextFromSections(
    input.snapshot,
    JOB_RESPONSIBILITIES_SECTION_RE,
    JOB_RESPONSIBILITY_ITEM_START_RE
  ) ??
  '';

const offerDescriptionFromSources = (input: {
  extractDescriptions: boolean;
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): string => {
  if (!input.extractDescriptions) return '';
  return (
    normalizeDescriptionValue(recordString(input.listing, 'description')) ??
    snapshotOfferDescriptionFromSections(input.snapshot) ??
    normalizeDescriptionValue(firstJobPostingValue(input.snapshot, ['description'])) ??
    normalizeDescriptionValue(input.snapshot?.plainText) ??
    normalizeDescriptionValue(input.snapshot?.ogDescription) ??
    normalizeDescriptionValue(input.snapshot?.metaDescription) ??
    ''
  );
};

const offerContentFieldsFromSources = (input: {
  listing: Record<string, unknown> | null;
  options: FilemakerJobBoardScrapeRequest;
  snapshot?: JobBoardStructuredSnapshot | null;
}): Pick<
  FilemakerJobBoardScrapedOffer,
  'description' | 'location' | 'requirements' | 'responsibilities'
> => ({
  description: offerDescriptionFromSources({
    extractDescriptions: input.options.extractDescriptions,
    listing: input.listing,
    snapshot: input.snapshot,
  }),
  location: locationFromSources({ listing: input.listing, snapshot: input.snapshot }),
  requirements: offerRequirementsFromSources({
    listing: input.listing,
    snapshot: input.snapshot,
  }),
  responsibilities: offerResponsibilitiesFromSources({
    listing: input.listing,
    snapshot: input.snapshot,
  }),
});

const salaryOfferFields = (
  salary: ReturnType<typeof salaryFromSources>
): Pick<
  FilemakerJobBoardScrapedOffer,
  'salaryCurrency' | 'salaryMax' | 'salaryMin' | 'salaryPeriod' | 'salaryText'
> => ({
  salaryCurrency: salary.salaryCurrency,
  salaryMax: salary.salaryMax,
  salaryMin: salary.salaryMin,
  salaryPeriod: salary.salaryPeriod,
  salaryText: salary.salaryText,
});

type CompanyNameSource = NonNullable<FilemakerJobBoardScrapedOffer['companyNameSource']>;

type CompanyNameCandidate = {
  source: CompanyNameSource;
  value: string | null;
};

const modelCompanyNameFromRecords = (
  company: Record<string, unknown> | null,
  listing: Record<string, unknown> | null
): string | null =>
  firstCleanCompanyName([
    recordFirstNullableString(listing, [
      'companyName',
      'employerName',
      'employer',
      'company',
      'organizationName',
      'hiringOrganizationName',
    ]),
    recordFirstNullableString(company, [
      'name',
      'legalName',
      'displayName',
      'tradingName',
      'organizationName',
    ]),
  ]);

const companyNameCandidatesFromSources = (input: {
  company: Record<string, unknown> | null;
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): CompanyNameCandidate[] => [
  {
    source: 'employer_selector',
    value: cleanCompanyName(input.snapshot?.employerName),
  },
  {
    source: 'page',
    value: firstCleanCompanyName([
      companyNameFromSnapshotCompanyProfile(input.snapshot),
      firstSnapshotCompanyName(input.snapshot),
    ]),
  },
  {
    source: 'profile_url',
    value:
      companyNameFromSnapshotCompanyUrls(input.snapshot) ??
      companyNameFromPracujProfileUrl(firstSnapshotCompanyUrl(input.snapshot)),
  },
  {
    source: 'model',
    value: modelCompanyNameFromRecords(input.company, input.listing),
  },
];

const selectCompanyNameCandidate = (
  candidates: readonly CompanyNameCandidate[]
): CompanyNameCandidate | null =>
  candidates.find((candidate) => candidate.value !== null && candidate.value.length > 0) ??
  null;

const identityFromSources = (input: {
  company: Record<string, unknown> | null;
  listing: Record<string, unknown> | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): { companyName: string; companyNameSource: CompanyNameSource | null; title: string } => {
  const listingTitle = recordString(input.listing, 'title');
  const title =
    listingTitle.length > 0 ? listingTitle : firstSnapshotListingTitle(input.snapshot) ?? '';
  const selected = selectCompanyNameCandidate(companyNameCandidatesFromSources(input));
  const rawCompanyName = selected?.value ?? '';
  const companyName = isGenericJobBoardCompanyName(rawCompanyName) ? '' : rawCompanyName;
  const companyNameSource = companyName.length === 0 ? null : selected?.source ?? null;
  return { companyName, companyNameSource, title };
};

type CompanyProfileUrlResolution = {
  companyProfileUrl: string | null;
  profileCompanyName: string | null;
  snapshotProfileCompanyName: string | null;
};

const resolveCompanyProfileUrlForIdentity = (input: {
  company: Record<string, unknown> | null;
  companyName: string;
  companyNameSource: CompanyNameSource | null;
  snapshot?: JobBoardStructuredSnapshot | null;
}): CompanyProfileUrlResolution => {
  const rawSnapshotCompanyProfileUrl =
    firstSnapshotCompanyUrl(input.snapshot) ??
    recordFirstNullableString(input.company, ['profileUrl', 'companyProfileUrl']);
  const rawProfileCompanyName = companyNameFromPracujProfileUrl(rawSnapshotCompanyProfileUrl);
  const profileConflictsWithEmployerSelector =
    input.companyNameSource === 'employer_selector' &&
    rawProfileCompanyName !== null &&
    !companyNamesMatchForIdentity(input.companyName, rawProfileCompanyName);
  const companyProfileUrl = profileConflictsWithEmployerSelector
    ? null
    : rawSnapshotCompanyProfileUrl;
  return {
    companyProfileUrl,
    profileCompanyName: companyNameFromPracujProfileUrl(companyProfileUrl),
    snapshotProfileCompanyName: rawProfileCompanyName,
  };
};

const shouldRejectModelOnlyCompanyName = (input: {
  companyNameSource: CompanyNameSource | null;
  provider: JobBoardProvider;
  snapshotProfileCompanyName: string | null;
}): boolean =>
  input.provider === 'pracuj_pl' &&
  input.companyNameSource === 'model' &&
  input.snapshotProfileCompanyName === null;

type OfferFromEvaluationInput = {
  evaluation: JobScanEvaluation;
  finalUrl: string;
  options: FilemakerJobBoardScrapeRequest;
  provider: JobBoardProvider;
  snapshot?: JobBoardStructuredSnapshot | null;
  sourceSite: string;
  validationPatterns?: readonly FilemakerLexiconValidationPattern[] | null;
};

export const offerFromEvaluation = (
  input: OfferFromEvaluationInput
): FilemakerJobBoardScrapedOffer | null => {
  const evaluation = input.evaluation;
  const listing = asRecord(evaluation?.listing);
  const company = asRecord(evaluation?.company);
  const sourceUrl = normalizeJobBoardSourceUrl(input.finalUrl);
  if (sourceUrl === null || !isReliableScrapedOfferUrl(sourceUrl, input.provider)) return null;
  const { companyName, companyNameSource, title } = identityFromSources({
    company,
    listing,
    snapshot: input.snapshot,
  });
  const companyInformation = companyInformationFromSources({ company, listing, snapshot: input.snapshot });
  const { companyProfileUrl, profileCompanyName, snapshotProfileCompanyName } =
    resolveCompanyProfileUrlForIdentity({
      company,
      companyName,
      companyNameSource,
      snapshot: input.snapshot,
    });
  const resolvedCompanyName = companyName.length > 0 ? companyName : profileCompanyName;
  if (title.length === 0 || resolvedCompanyName === null) return null;
  if (shouldRejectModelOnlyCompanyName({ companyNameSource, provider: input.provider, snapshotProfileCompanyName })) return null;
  const salary = salaryFromSources({ extractSalaries: input.options.extractSalaries, listing, snapshot: input.snapshot });
  const companyProfile = buildCompanyProfile({ company, listing, snapshot: input.snapshot });
  const dates = dateRangeFromSources({ listing, snapshot: input.snapshot });
  const lexiconExtraction = buildOfferPills({
    listing,
    provider: input.provider,
    snapshot: input.snapshot,
    sourceSite: input.sourceSite,
    sourceUrl,
    validationPatterns: input.validationPatterns,
  });
  return {
    companyName: resolvedCompanyName,
    ...(companyNameSource !== null ? { companyNameSource } : {}),
    companyProfile,
    companyProfileUrl,
    ...companyInformation,
    ...offerContentFieldsFromSources({
      options: input.options,
      listing,
      snapshot: input.snapshot,
    }),
    expiresAt: dates.expiresAt,
    postedAt: dates.postedAt,
    ...salaryOfferFields(salary),
    sourceExternalId: extractJobBoardExternalIdFromUrl(sourceUrl, input.provider),
    sourceSite: input.sourceSite,
    sourceUrl,
    pills: lexiconExtraction.pills,
    title,
    unclassifiedPills: lexiconExtraction.unclassifiedPills,
  };
};
