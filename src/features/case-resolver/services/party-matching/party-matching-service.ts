/**
 * Party Matching Service
 * 
 * Provides utilities for fuzzy-matching, normalizing, and scoring
 * Case Resolver party candidates against existing system records.
 */

/**
 * Normalization Constants
 */
export const STREET_PREFIXES = new Set(['ul', 'al', 'aleja', 'os', 'pl']);
export const ORGANIZATION_LEGAL_TOKENS = new Set([
  'sp', 'z', 'o', 'oo', 's', 'a', 'sa', 'llc', 'inc', 'corp', 'company', 'co', 'ltd'
]);

export const COUNTRY_ALIAS_TO_CODE: Record<string, string> = {
  polska: 'PL',
  poland: 'PL',
  niemcy: 'DE',
  germany: 'DE',
  deutschland: 'DE',
  francja: 'FR',
  france: 'FR',
  hiszpania: 'ES',
  spain: 'ES',
  wlochy: 'IT',
  włochy: 'IT',
  italy: 'IT',
  uk: 'GB',
  'united kingdom': 'GB',
  'wielka brytania': 'GB',
  usa: 'US',
  'u.s.a.': 'US',
  'united states': 'US',
  'stany zjednoczone': 'US',
};

// Removes Polish-specific diacritics (ł/Ł) then strips all remaining
// combining marks so comparisons are accent-insensitive.
const stripDiacritics = (value: string): string =>
  value
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Normalizes a comparable string: strips diacritics, lowercases, removes punctuation,
 * and collapses whitespace.
 */
export const normalizeCaseResolverComparable = (value: string): string =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Normalizes a street name by stripping the leading prefix token.
 */
export const normalizeCaseResolverStreet = (value: string): string => {
  const normalized = normalizeCaseResolverComparable(value);
  const parts = normalized.split(' ');
  if (parts.length > 1 && STREET_PREFIXES.has(parts[0] ?? '')) {
    return parts.slice(1).join(' ');
  }
  return normalized;
};

/**
 * Normalizes an organization name by stripping common legal-form tokens.
 */
export const normalizeOrganizationName = (value: string): string => {
  const parts = normalizeCaseResolverComparable(value).split(' ');
  return parts.filter(part => !ORGANIZATION_LEGAL_TOKENS.has(part)).join(' ');
};

/**
 * Normalizes country input to an ISO alpha-2 code.
 */
export const normalizeCountryCode = (value: string): string | null => {
  const normalized = normalizeCaseResolverComparable(value);
  if (normalized.length === 0) return null;
  const aliasCode = COUNTRY_ALIAS_TO_CODE[normalized];
  if (aliasCode !== undefined) return aliasCode;
  if (/^[a-z]{2}$/.test(normalized)) return normalized.toUpperCase();
  return normalized;
};
