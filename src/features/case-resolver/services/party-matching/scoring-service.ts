/* eslint-disable complexity, max-params, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions -- Party matching scoring intentionally evaluates many optional evidence fields. */
/**
 * Party Matching Scoring Service
 * 
 * Provides algorithms for scoring the compatibility of party candidates 
 * against existing Filemaker system records.
 */

import {
  normalizeCaseResolverStreet,
  normalizeOrganizationName,
  normalizeCaseResolverComparable,
} from './party-matching-service';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';

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

/**
 * Validates if two street number strings are compatible.
 */
export const areStreetNumbersCompatible = (a: string, b: string): boolean => {
  const normalizedLeft = parseStreetNumber(a);
  const normalizedRight = parseStreetNumber(b);
  if (!normalizedLeft.main || !normalizedRight.main) return false;
  if (normalizedLeft.main !== normalizedRight.main) return false;
  if (normalizedLeft.unit && normalizedRight.unit && normalizedLeft.unit !== normalizedRight.unit) {
    return false;
  }
  return true;
};

/**
 * Scores the compatibility of a candidate's address fields against a stored address.
 * Returns null if the address explicitly contradicts; otherwise, returns the match score.
 */
export const scoreAddressCompatibility = (
  candidate: Pick<
    PromptExploderCaseResolverPartyCandidate,
    'street' | 'streetNumber' | 'houseNumber' | 'city' | 'postalCode' | 'country'
  >,
  current: {
    street: string;
    streetNumber: string;
    city: string;
    postalCode: string;
    country: string;
  },
  normalizePostalCode: (val: string) => string,
  normalizeCountry: (val: string) => string | null,
  isCityCompatible: (c: string, r: string) => boolean
): number | null => {
  let score = 0;
  
  const candidateStreet = normalizeCaseResolverStreet(candidate.street ?? '');
  if (candidateStreet) {
    const currentStreet = normalizeCaseResolverStreet(current.street);
    if (!currentStreet) return null;
    if (candidateStreet === currentStreet) score += 2;
    else if (candidateStreet.includes(currentStreet) || currentStreet.includes(candidateStreet)) score += 1;
    else return null;
  }

  const candidateStreetNumberMain = (candidate.streetNumber ?? '').trim();
  const candidateHouse = (candidate.houseNumber ?? '').trim();
  const candidateStreetNumber = candidateHouse
    ? `${candidateStreetNumberMain}/${candidateHouse}`
    : candidateStreetNumberMain;
  if (candidateStreetNumber) {
    if (!current.streetNumber.trim()) return null;
    if (!areStreetNumbersCompatible(candidateStreetNumber, current.streetNumber)) return null;
    score += 2;
  }

  const candidatePostalCode = normalizePostalCode(candidate.postalCode ?? '');
  if (candidatePostalCode) {
    const currentPostalCode = normalizePostalCode(current.postalCode);
    if (!currentPostalCode || candidatePostalCode !== currentPostalCode) return null;
    score += 2;
  }

  const candidateCity = (candidate.city ?? '').trim();
  if (candidateCity) {
    if (!isCityCompatible(candidateCity, current.city)) return null;
    score += 1.5;
  }

  const candidateCountry = normalizeCountry(candidate.country ?? '');
  if (candidateCountry) {
    const currentCountry = normalizeCountry(current.country);
    if (!currentCountry || candidateCountry !== currentCountry) return null;
    score += 1;
  }

  return score;
};

/**
 * Scores organisation name similarity.
 */
export const scoreOrganizationNameCompatibility = (candidateName: string, currentName: string): number => {
  const left = normalizeOrganizationName(candidateName);
  const right = normalizeOrganizationName(currentName);
  if (!left || !right) return 0;
  if (left === right) return 6;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) >= 6 ? 4 : 0;
  }
  const leftTokens = left.split(' ').filter(Boolean);
  const rightTokens = new Set(right.split(' ').filter(Boolean));
  if (leftTokens.length === 0 || rightTokens.size === 0) return 0;
  const overlap = leftTokens.filter((token) => rightTokens.has(token)).length;
  const overlapRatio = overlap / Math.max(leftTokens.length, rightTokens.size);
  return overlap >= 2 && overlapRatio >= 0.75 ? 3 : 0;
};
