import type { PromptExploderCaseResolverPartyCandidate } from '@/features/prompt-exploder/bridge';
import type { CountryOption } from '@/shared/contracts/internationalization';

import type { FilemakerAddress, FilemakerDatabase } from '@/shared/lib/filemaker/types';

export type MatchedCaseResolverPartyReference = {
  kind: 'person' | 'organization';
  id: string;
  displayName: string;
};

const STREET_PREFIXES = new Set(['ul', 'al', 'aleja', 'os', 'pl']);
const ORGANIZATION_LEGAL_TOKENS = new Set([
  'sp',
  'z',
  'o',
  'oo',
  's',
  'a',
  'sa',
  'llc',
  'inc',
  'corp',
  'company',
  'co',
  'ltd',
]);

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

const stripDiacritics = (value: string): string =>
  value
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'L')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const normalizeCaseResolverComparable = (value: string): string =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeCaseResolverStreet = (value: string): string => {
  const normalized = normalizeCaseResolverComparable(value);
  if (!normalized) return '';
  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 0) return '';
  if (STREET_PREFIXES.has(tokens[0] ?? '')) {
    return tokens.slice(1).join(' ').trim();
  }
  return tokens.join(' ').trim();
};

const normalizeCaseResolverPostalCode = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 5) {
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  }
  return normalizeCaseResolverComparable(value);
};

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

const normalizeOrganizationName = (value: string): string => {
  const tokens = tokenizeComparable(value).filter(
    (token: string): boolean => !ORGANIZATION_LEGAL_TOKENS.has(token)
  );
  return tokens.join(' ').trim();
};

type ParsedStreetNumber = {
  main: string;
  unit: string;
};

const parseStreetNumber = (value: string): ParsedStreetNumber => {
  const compact = normalizeCaseResolverComparable(value).replace(/\s+/g, '');
  if (!compact) return { main: '', unit: '' };
  const [mainRaw, unitRaw = ''] = compact.split('/', 2);
  return {
    main: mainRaw ?? '',
    unit: unitRaw ?? '',
  };
};

const areStreetNumbersCompatible = (left: string, right: string): boolean => {
  const normalizedLeft = parseStreetNumber(left);
  const normalizedRight = parseStreetNumber(right);
  if (!normalizedLeft.main || !normalizedRight.main) return false;
  if (normalizedLeft.main !== normalizedRight.main) return false;
  if (normalizedLeft.unit && normalizedRight.unit && normalizedLeft.unit !== normalizedRight.unit) {
    return false;
  }
  return true;
};

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

const scoreAddressCompatibility = (
  candidate: PromptExploderCaseResolverPartyCandidate,
  current: {
    street: string;
    streetNumber: string;
    city: string;
    postalCode: string;
    country: string;
  }
): number | null => {
  let score = 0;
  const candidateStreet = normalizeCaseResolverStreet(candidate.street ?? '');
  if (candidateStreet) {
    const currentStreet = normalizeCaseResolverStreet(current.street);
    if (!currentStreet) return null;
    if (candidateStreet === currentStreet) {
      score += 2;
    } else if (candidateStreet.includes(currentStreet) || currentStreet.includes(candidateStreet)) {
      score += 1;
    } else {
      return null;
    }
  }

  const candidateStreetNumber = composeCandidateStreetNumber(candidate);
  if (candidateStreetNumber) {
    if (!current.streetNumber.trim()) return null;
    if (!areStreetNumbersCompatible(candidateStreetNumber, current.streetNumber)) return null;
    score += 2;
  }

  const candidatePostalCode = normalizeCaseResolverPostalCode(candidate.postalCode ?? '');
  if (candidatePostalCode) {
    const currentPostalCode = normalizeCaseResolverPostalCode(current.postalCode);
    if (!currentPostalCode || candidatePostalCode !== currentPostalCode) return null;
    score += 2;
  }

  const candidateCity = (candidate.city ?? '').trim();
  if (candidateCity) {
    if (!isCityCompatible(candidateCity, current.city)) return null;
    score += 1.5;
  }

  const candidateCountry = normalizeCaseResolverCountry(candidate.country ?? '');
  if (candidateCountry) {
    const currentCountry = normalizeCaseResolverCountry(current.country);
    if (!currentCountry || candidateCountry !== currentCountry) return null;
    score += 1;
  }

  return score;
};

const scoreOrganizationNameCompatibility = (candidateName: string, currentName: string): number => {
  const left = normalizeOrganizationName(candidateName);
  const right = normalizeOrganizationName(currentName);
  if (!left || !right) return 0;
  if (left === right) return 6;
  if (left.includes(right) || right.includes(left)) {
    const minLength = Math.min(left.length, right.length);
    return minLength >= 6 ? 4 : 0;
  }
  const leftTokens = left.split(' ').filter(Boolean);
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  if (leftTokens.length === 0 || rightTokens.size === 0) return 0;
  const overlap = leftTokens.filter((token: string): boolean => rightTokens.has(token)).length;
  const overlapRatio = overlap / Math.max(leftTokens.length, rightTokens.size);
  if (overlap >= 2 && overlapRatio >= 0.75) return 3;
  return 0;
};

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

export const findExistingFilemakerPartyReference = (
  database: FilemakerDatabase,
  candidate: PromptExploderCaseResolverPartyCandidate
): MatchedCaseResolverPartyReference | null => {
  const kindHint = candidate.kind ?? null;
  const personName = deriveCandidatePersonName(candidate);
  const personFirst = normalizeCaseResolverComparable(personName.firstName);
  const personLast = normalizeCaseResolverComparable(personName.lastName);

  let bestPerson: { id: string; score: number; name: string } | null = null;
  if (kindHint !== 'organization' && (personFirst || personLast)) {
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
      });
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
  }

  if (bestPerson && bestPerson.score >= 4) {
    return {
      kind: 'person',
      id: String(bestPerson.id),
      displayName: bestPerson.name,
    };
  }

  const organizationName =
    (candidate.organizationName ?? '').trim() ||
    (candidate.kind === 'organization' ? (candidate.displayName || '').trim() : '');
  let bestOrganization: { id: string; score: number; name: string } | null = null;
  if (kindHint !== 'person' && organizationName) {
    for (const organization of database.organizations) {
      const nameScore = scoreOrganizationNameCompatibility(organizationName, organization.name);
      if (nameScore === 0) continue;
      const addressScore = scoreAddressCompatibility(candidate, {
        street: organization.street,
        streetNumber: organization.streetNumber,
        city: organization.city,
        postalCode: organization.postalCode,
        country: organization.country,
      });
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
  }

  if (bestOrganization && bestOrganization.score >= 4) {
    return {
      kind: 'organization',
      id: String(bestOrganization.id),
      displayName: bestOrganization.name,
    };
  }
  return null;
};

type AddressInput = {
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
};

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
