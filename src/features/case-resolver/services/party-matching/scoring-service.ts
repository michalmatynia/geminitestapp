/**
 * Party Matching Scoring Service
 *
 * Provides algorithms for scoring the compatibility of party candidates
 * against existing Filemaker system records.
 */

import {
  normalizeCaseResolverComparable,
  normalizeCaseResolverStreet,
  normalizeOrganizationName,
} from './party-matching-service';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';

type ParsedStreetNumber = {
  main: string;
  unit: string;
};

type CurrentAddressFields = {
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
};

type CandidateAddressFields = Pick<
  PromptExploderCaseResolverPartyCandidate,
  'street' | 'streetNumber' | 'houseNumber' | 'city' | 'postalCode' | 'country'
>;

type ScoreAddressCompatibilityArgs = [
  candidate: CandidateAddressFields,
  current: CurrentAddressFields,
  normalizePostalCode: (val: string) => string,
  normalizeCountry: (val: string) => string | null,
  isCityCompatible: (candidateCity: string, recordCity: string) => boolean,
];

const parseStreetNumber = (value: string): ParsedStreetNumber => {
  const compact = normalizeCaseResolverComparable(value).replace(/\s+/g, '');
  if (compact.length === 0) return { main: '', unit: '' };
  const [mainRaw = '', unitRaw = ''] = compact.split('/', 2);
  return {
    main: mainRaw,
    unit: unitRaw,
  };
};

export const areStreetNumbersCompatible = (a: string, b: string): boolean => {
  const normalizedLeft = parseStreetNumber(a);
  const normalizedRight = parseStreetNumber(b);
  if (normalizedLeft.main.length === 0 || normalizedRight.main.length === 0) return false;
  if (normalizedLeft.main !== normalizedRight.main) return false;
  if (normalizedLeft.unit.length === 0 || normalizedRight.unit.length === 0) return true;
  return normalizedLeft.unit === normalizedRight.unit;
};

const scoreStreetCompatibility = (
  candidateStreet: string,
  currentStreet: string
): number | null => {
  if (candidateStreet.length === 0) return 0;
  const normalizedCurrentStreet = normalizeCaseResolverStreet(currentStreet);
  if (normalizedCurrentStreet.length === 0) return null;
  if (candidateStreet === normalizedCurrentStreet) return 2;
  if (
    candidateStreet.includes(normalizedCurrentStreet) ||
    normalizedCurrentStreet.includes(candidateStreet)
  ) {
    return 1;
  }
  return null;
};

const composeCandidateStreetNumber = (candidate: CandidateAddressFields): string => {
  const candidateStreetNumberMain = (candidate.streetNumber ?? '').trim();
  const candidateHouse = (candidate.houseNumber ?? '').trim();
  return candidateHouse.length > 0
    ? `${candidateStreetNumberMain}/${candidateHouse}`
    : candidateStreetNumberMain;
};

const scoreStreetNumberCompatibility = (
  candidate: CandidateAddressFields,
  currentStreetNumber: string
): number | null => {
  const candidateStreetNumber = composeCandidateStreetNumber(candidate);
  if (candidateStreetNumber.length === 0) return 0;
  if (currentStreetNumber.trim().length === 0) return null;
  return areStreetNumbersCompatible(candidateStreetNumber, currentStreetNumber) ? 2 : null;
};

const scorePostalCodeCompatibility = ({
  candidatePostalCode,
  currentPostalCode,
  normalizePostalCode,
}: {
  candidatePostalCode: string;
  currentPostalCode: string;
  normalizePostalCode: (val: string) => string;
}): number | null => {
  const normalizedCandidatePostalCode = normalizePostalCode(candidatePostalCode);
  if (normalizedCandidatePostalCode.length === 0) return 0;
  const normalizedCurrentPostalCode = normalizePostalCode(currentPostalCode);
  if (normalizedCurrentPostalCode.length === 0) return null;
  return normalizedCandidatePostalCode === normalizedCurrentPostalCode ? 2 : null;
};

const scoreCityCompatibility = ({
  candidateCity,
  currentCity,
  isCityCompatible,
}: {
  candidateCity: string;
  currentCity: string;
  isCityCompatible: (candidateCity: string, recordCity: string) => boolean;
}): number | null => {
  if (candidateCity.trim().length === 0) return 0;
  return isCityCompatible(candidateCity, currentCity) ? 1.5 : null;
};

const scoreCountryCompatibility = ({
  candidateCountry,
  currentCountry,
  normalizeCountry,
}: {
  candidateCountry: string;
  currentCountry: string;
  normalizeCountry: (val: string) => string | null;
}): number | null => {
  const normalizedCandidateCountry = normalizeCountry(candidateCountry);
  if (normalizedCandidateCountry === null) return 0;
  const normalizedCurrentCountry = normalizeCountry(currentCountry);
  if (normalizedCurrentCountry === null) return null;
  return normalizedCandidateCountry === normalizedCurrentCountry ? 1 : null;
};

const sumAddressScores = (scores: Array<number | null>): number | null => {
  if (scores.some((score) => score === null)) return null;
  return scores.reduce((total, score) => total + (score ?? 0), 0);
};

export const scoreAddressCompatibility = (
  ...[
    candidate,
    current,
    normalizePostalCode,
    normalizeCountry,
    isCityCompatible,
  ]: ScoreAddressCompatibilityArgs
): number | null => {
  const candidateStreet = normalizeCaseResolverStreet(candidate.street ?? '');
  return sumAddressScores([
    scoreStreetCompatibility(candidateStreet, current.street),
    scoreStreetNumberCompatibility(candidate, current.streetNumber),
    scorePostalCodeCompatibility({
      candidatePostalCode: candidate.postalCode ?? '',
      currentPostalCode: current.postalCode,
      normalizePostalCode,
    }),
    scoreCityCompatibility({
      candidateCity: candidate.city ?? '',
      currentCity: current.city,
      isCityCompatible,
    }),
    scoreCountryCompatibility({
      candidateCountry: candidate.country ?? '',
      currentCountry: current.country,
      normalizeCountry,
    }),
  ]);
};

const scoreOrganizationTokenOverlap = (left: string, right: string): number => {
  const leftTokens = left.split(' ').filter((token) => token.length > 0);
  const rightTokens = new Set(right.split(' ').filter((token) => token.length > 0));
  if (leftTokens.length === 0 || rightTokens.size === 0) return 0;
  const overlap = leftTokens.filter((token) => rightTokens.has(token)).length;
  const overlapRatio = overlap / Math.max(leftTokens.length, rightTokens.size);
  return overlap >= 2 && overlapRatio >= 0.75 ? 3 : 0;
};

export const scoreOrganizationNameCompatibility = (
  candidateName: string,
  currentName: string
): number => {
  const left = normalizeOrganizationName(candidateName);
  const right = normalizeOrganizationName(currentName);
  if (left.length === 0 || right.length === 0) return 0;
  if (left === right) return 6;
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) >= 6 ? 4 : 0;
  }
  return scoreOrganizationTokenOverlap(left, right);
};
