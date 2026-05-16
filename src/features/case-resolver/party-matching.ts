/* eslint-disable complexity, max-lines, @typescript-eslint/strict-boolean-expressions -- Party matching heuristics use many optional text signals. */
/**
 * party-matching.ts
 *
 * Fuzzy-matching utilities that resolve a raw party candidate (extracted from
 * a document by the prompt exploder) to an existing Filemaker person or
 * organisation record.
 *
 * Matching is score-based: each compatible field (name, street, street number,
 * postal code, city, country) contributes points. A match is accepted only
 * when the total score reaches the minimum threshold (≥ 4). This avoids false
 * positives from partial name or address overlaps.
 *
 * Also exports `findExistingFilemakerAddressId` for matching a structured
 * address input against the Filemaker address table, and
 * `resolveCountryFromCandidateValue` for normalising a raw country string to
 * a `{ country, countryId }` pair using the app's country list.
 */
import type { FilemakerAddress, FilemakerDatabase } from '@/features/filemaker/public';
import type { FilemakerAddressFields } from '@/shared/contracts/filemaker';
import type { CountryOption } from '@/shared/contracts/internationalization';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';

import {
  normalizeCaseResolverComparable,
  normalizeCaseResolverStreet,
  scoreAddressCompatibility,
  scoreOrganizationNameCompatibility,
  areStreetNumbersCompatible,
} from '@/features/case-resolver/services/party-matching';

export { normalizeCaseResolverComparable };


export type MatchedCaseResolverPartyReference = {
  kind: 'person' | 'organization';
  id: string;
  displayName: string;
};

// Maps common country names / aliases (in several languages) to ISO 3166-1
// alpha-2 codes for normalised comparison.
const COUNTRY_ALIAS_TO_CODE: Record<string, string> = {
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

// Normalises a postal code to the Polish "XX-XXX" format when it contains
// exactly 5 digits; otherwise falls back to generic comparable normalisation.
const normalizeCaseResolverPostalCode = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 5) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return normalizeCaseResolverComparable(value);
};

// Resolves a raw country string to an ISO alpha-2 code via the alias map,
// or returns the uppercased value if it already looks like a 2-letter code.
const normalizeCaseResolverCountry = (value: string): string => {
  const normalized = normalizeCaseResolverComparable(value);
  if (!normalized) return '';
  const aliasCode = COUNTRY_ALIAS_TO_CODE[normalized];
  if (aliasCode) return aliasCode;
  if (/^[a-z]{2}$/.test(normalized)) return normalized.toUpperCase();
  return normalized;
};

const tokenizeComparable = (value: string): string[] =>
  normalizeCaseResolverComparable(value)
    .split(' ')
    .map((token: string): string => token.trim())
    .filter((token: string): boolean => token.length > 0);

// Combines streetNumber and houseNumber from a candidate into the "main/unit"
// format expected by areStreetNumbersCompatible.
export const composeCandidateStreetNumber = (
  candidate: Pick<PromptExploderCaseResolverPartyCandidate, 'streetNumber' | 'houseNumber'>
): string => {
  const streetNumber = (candidate.streetNumber ?? '').trim();
  const houseNumber = (candidate.houseNumber ?? '').trim();
  if (!streetNumber) return '';
  return houseNumber ? `${streetNumber}/${houseNumber}` : streetNumber;
};

const isCityCompatible = (candidateCity: string, currentCity: string): boolean => {
  const left = normalizeCaseResolverComparable(candidateCity);
  const right = normalizeCaseResolverComparable(currentCity);
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
};

// Scores how well a candidate's address fields match a stored address record.
// Returns null (hard reject) when any provided field actively contradicts the
// record; returns a numeric score otherwise (higher = better match).
// Fields not present on the candidate are simply skipped (not penalised).

// Derives first/last name from a candidate, falling back to splitting the
// displayName when dedicated fields are absent.
const deriveCandidatePersonName = (
  candidate: PromptExploderCaseResolverPartyCandidate
): { firstName: string; lastName: string } => {
  const displayTokens = (candidate.displayName ?? '')
    .trim()
    .split(/\s+/)
    .map((token: string): string => token.trim())
    .filter((token: string): boolean => token.length > 0);
  const firstName = (candidate.firstName ?? '').trim() || displayTokens[0] || '';
  const lastName = (candidate.lastName ?? '').trim() || displayTokens.slice(1).join(' ').trim();
  return {
    firstName,
    lastName,
  };
};

// Last-name comparison allows for inflected forms: "Kowalski" matches
// "Kowalska" when the final token of each normalised name is identical.
const isPersonLastNameCompatible = (
  candidateLastName: string,
  currentLastName: string
): boolean => {
  const left = tokenizeComparable(candidateLastName);
  const right = tokenizeComparable(currentLastName);
  if (left.length === 0 || right.length === 0) return false;
  if (left.join(' ') === right.join(' ')) return true;
  const leftTail = left[left.length - 1] ?? '';
  const rightTail = right[right.length - 1] ?? '';
  if (leftTail && rightTail && leftTail === rightTail) return true;
  return false;
};

// Scans all persons in the database and returns the highest-scoring match
// whose name and address are compatible with the candidate. Returns null when
// no person passes the name filter.
const findBestPersonMatch = (
  database: FilemakerDatabase,
  candidate: PromptExploderCaseResolverPartyCandidate,
  personFirst: string,
  personLast: string
): { id: string; score: number; name: string } | null => {
  let bestPerson: { id: string; score: number; name: string } | null = null;
  for (const person of database.persons) {
    const first = normalizeCaseResolverComparable(person.firstName);
    const last = normalizeCaseResolverComparable(person.lastName);
    if (personFirst && first !== personFirst) continue;
    if (personLast && !isPersonLastNameCompatible(personLast, last)) continue;
    
    const addressScore = scoreAddressCompatibility(candidate, {
      street: person.street,
      streetNumber: person.streetNumber,
      city: person.city,
      postalCode: person.postalCode,
      country: person.country,
    }, normalizeCaseResolverPostalCode, normalizeCaseResolverCountry, isCityCompatible);
    if (addressScore === null) continue;
    
    const nameScore = (personFirst ? 3 : 0) + (personLast ? 3 : 0);
    const score = nameScore + addressScore;
    if (!bestPerson || score > bestPerson.score) {
      bestPerson = {
        id: person.id,
        score,
        name: `${person.firstName} ${person.lastName}`.trim(),
      };
    }
  }
  return bestPerson;
};

// Scans all organisations and returns the highest-scoring match whose name
// and address are compatible with the candidate.
const findBestOrganizationMatch = (
  database: FilemakerDatabase,
  candidate: PromptExploderCaseResolverPartyCandidate,
  organizationName: string
): { id: string; score: number; name: string } | null => {
  let bestOrganization: { id: string; score: number; name: string } | null = null;
  for (const organization of database.organizations) {
    const nameScore = scoreOrganizationNameCompatibility(organizationName, organization.name);
    if (nameScore === 0) continue;
    
    const addressScore = scoreAddressCompatibility(candidate, {
      street: organization.street,
      streetNumber: organization.streetNumber,
      city: organization.city,
      postalCode: organization.postalCode,
      country: organization.country,
    }, normalizeCaseResolverPostalCode, normalizeCaseResolverCountry, isCityCompatible);
    if (addressScore === null) continue;
    
    const score = nameScore + addressScore;
    if (!bestOrganization || score > bestOrganization.score) {
      bestOrganization = {
        id: organization.id,
        score,
        name: organization.name,
      };
    }
  }
  return bestOrganization;
};

/**
 * Attempts to resolve a prompt-exploder party candidate to an existing
 * Filemaker person or organisation record.
 *
 * Strategy:
 *  1. If the candidate is not explicitly typed as 'organization' and has name
 *     tokens, try person matching first.
 *  2. If the candidate is not explicitly typed as 'person' and has an
 *     organisation name, try organisation matching.
 *  3. Returns null when no match reaches the minimum score threshold (4).
 */
export const findExistingFilemakerPartyReference = (
  database: FilemakerDatabase,
  candidate: PromptExploderCaseResolverPartyCandidate
): MatchedCaseResolverPartyReference | null => {
  const kindHint = candidate.kind ?? null;
  const personName = deriveCandidatePersonName(candidate);
  const personFirst = normalizeCaseResolverComparable(personName.firstName);
  const personLast = normalizeCaseResolverComparable(personName.lastName);

  if (kindHint !== 'organization' && (personFirst || personLast)) {
    const bestPerson = findBestPersonMatch(
      database,
      candidate,
      personFirst,
      personLast
    );
    if (bestPerson && bestPerson.score >= 4) {
      return {
        kind: 'person',
        id: String(bestPerson.id),
        displayName: bestPerson.name,
      };
    }
  }

  const organizationName =
    (candidate.organizationName ?? '').trim() ||
    (candidate.kind === 'organization' ? (candidate.displayName || '').trim() : '');

  if (kindHint !== 'person' && organizationName) {
    const bestOrganization = findBestOrganizationMatch(
      database,
      candidate,
      organizationName
    );
    if (bestOrganization && bestOrganization.score >= 4) {
      return {
        kind: 'organization',
        id: String(bestOrganization.id),
        displayName: bestOrganization.name,
      };
    }
  }
  return null;
};

type AddressInput = FilemakerAddressFields;

const hasAddressData = (value: AddressInput): boolean =>
  Boolean(
    value.street.trim() ||
    value.streetNumber.trim() ||
    value.city.trim() ||
    value.postalCode.trim() ||
    value.country.trim() ||
    value.countryId.trim()
  );

const scoreAddressInputAgainstAddress = (
  input: AddressInput,
  address: FilemakerAddress
): number | null => {
  if (!hasAddressData(input)) return null;

  let score = 0;
  const inputStreet = normalizeCaseResolverStreet(input.street);
  if (inputStreet) {
    const addressStreet = normalizeCaseResolverStreet(address.street);
    if (!addressStreet) return null;
    if (inputStreet === addressStreet) {
      score += 2;
    } else if (inputStreet.includes(addressStreet) || addressStreet.includes(inputStreet)) {
      score += 1;
    } else {
      return null;
    }
  }

  if (input.streetNumber.trim()) {
    if (!address.streetNumber.trim()) return null;
    if (!areStreetNumbersCompatible(input.streetNumber, address.streetNumber)) return null;
    score += 2;
  }

  const inputPostalCode = normalizeCaseResolverPostalCode(input.postalCode);
  if (inputPostalCode) {
    const addressPostalCode = normalizeCaseResolverPostalCode(address.postalCode);
    if (!addressPostalCode || inputPostalCode !== addressPostalCode) return null;
    score += 2;
  }

  if (input.city.trim()) {
    if (!isCityCompatible(input.city, address.city)) return null;
    score += 1.5;
  }

  const inputCountry = normalizeCaseResolverCountry(input.country);
  if (inputCountry) {
    const addressCountry = normalizeCaseResolverCountry(address.country);
    if (!addressCountry || inputCountry !== addressCountry) return null;
    score += 1;
  }

  if (input.countryId.trim()) {
    if (!address.countryId.trim()) return null;
    if (input.countryId.trim() !== address.countryId.trim()) return null;
    score += 1;
  }

  return score;
};

/**
 * Finds the best-matching Filemaker address record for a structured address
 * input. Returns the address ID when the top match scores ≥ 4, otherwise null.
 */
export const findExistingFilemakerAddressId = (
  database: FilemakerDatabase,
  input: AddressInput
): string | null => {
  if (!hasAddressData(input)) return null;
  let best: { id: string; score: number } | null = null;

  for (const address of database.addresses) {
    const score = scoreAddressInputAgainstAddress(input, address);
    if (score === null) continue;
    if (!best || score > best.score) {
      best = {
        id: address.id,
        score,
      };
    }
  }

  const resolvedBestAddress = best;
  if (!resolvedBestAddress || resolvedBestAddress.score < 4) return null;
  return String(resolvedBestAddress.id);
};

/**
 * Resolves a raw country string (name, alias, or ISO code) to a
 * `{ country, countryId }` pair by looking it up in the app's country list.
 * Falls back to `{ country: raw, countryId: '' }` when no match is found.
 */
export const resolveCountryFromCandidateValue = (
  value: string | null | undefined,
  countries: CountryOption[]
): { country: string; countryId: string } => {
  const raw = (value ?? '').trim();
  if (!raw) return { country: '', countryId: '' };

  const normalized = normalizeCaseResolverComparable(raw);
  const byId = countries.find((country: CountryOption): boolean => country.id === raw);
  if (byId) {
    return {
      country: byId.name.trim(),
      countryId: byId.id,
    };
  }

  const canonicalCode =
    COUNTRY_ALIAS_TO_CODE[normalized] ??
    (/^[a-z]{2}$/i.test(raw.trim()) ? raw.trim().toUpperCase() : '');

  const byCode = canonicalCode
    ? countries.find(
      (country: CountryOption): boolean => country.code.trim().toUpperCase() === canonicalCode
    )
    : null;
  if (byCode) {
    return {
      country: byCode.name.trim(),
      countryId: byCode.id,
    };
  }

  const byName = countries.find((country: CountryOption): boolean => {
    const nameComparable = normalizeCaseResolverComparable(country.name);
    return Boolean(nameComparable) && nameComparable === normalized;
  });
  if (byName) {
    return {
      country: byName.name.trim(),
      countryId: byName.id,
    };
  }

  return {
    country: raw,
    countryId: '',
  };
};
