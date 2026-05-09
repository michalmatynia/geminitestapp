/* eslint-disable complexity, max-params, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars, @typescript-eslint/strict-boolean-expressions -- Party matching orchestration is a split-out legacy heuristic surface. */
/**
 * Party Matching Orchestrator
 * 
 * Orchestrates party matching logic for Case Resolver candidates
 * against Filemaker databases.
 */

import type { FilemakerDatabase } from '@/features/filemaker/public';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';
import { 
  normalizeCaseResolverComparable,
  normalizeOrganizationName,
} from '@/features/case-resolver/services/party-matching';
import { 
  scoreAddressCompatibility, 
  scoreOrganizationNameCompatibility 
} from '@/features/case-resolver/services/party-matching/scoring-service';

export type MatchedCaseResolverPartyReference = {
  kind: 'person' | 'organization';
  id: string;
  displayName: string;
};

/**
 * Derives person name components.
 */
export const deriveCandidatePersonName = (candidate: PromptExploderCaseResolverPartyCandidate) => {
  const displayTokens = (candidate.displayName ?? '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: (candidate.firstName ?? '').trim() || displayTokens[0] || '',
    lastName: (candidate.lastName ?? '').trim() || displayTokens.slice(1).join(' ').trim(),
  };
};

/**
 * Finds the best matching person in the database.
 */
export const findBestPersonMatch = (
  database: FilemakerDatabase,
  candidate: PromptExploderCaseResolverPartyCandidate,
  personFirst: string,
  personLast: string,
  // Injection for scoring deps
  normalizePostalCode: (val: string) => string,
  normalizeCountry: (val: string) => string | null,
  isCityCompatible: (c: string, r: string) => boolean,
  isPersonLastNameCompatible: (c: string, r: string) => boolean
): { id: string; score: number; name: string } | null => {
  let best: { id: string; score: number; name: string } | null = null;
  for (const person of database.persons) {
    const first = normalizeCaseResolverComparable(person.firstName);
    const last = normalizeCaseResolverComparable(person.lastName);
    if (personFirst && first !== personFirst) continue;
    if (personLast && !isPersonLastNameCompatible(personLast, last)) continue;
    
    const addressScore = scoreAddressCompatibility(candidate, person, normalizePostalCode, normalizeCountry, isCityCompatible);
    if (addressScore === null) continue;
    
    const score = (personFirst ? 3 : 0) + (personLast ? 3 : 0) + addressScore;
    if (!best || score > best.score) {
      best = { id: person.id, score, name: `${person.firstName} ${person.lastName}`.trim() };
    }
  }
  return best;
};

/**
 * Finds the best matching organization in the database.
 */
export const findBestOrganizationMatch = (
  database: FilemakerDatabase,
  candidate: PromptExploderCaseResolverPartyCandidate,
  organizationName: string,
  // Injection for scoring deps
  normalizePostalCode: (val: string) => string,
  normalizeCountry: (val: string) => string | null,
  isCityCompatible: (c: string, r: string) => boolean
): { id: string; score: number; name: string } | null => {
  let best: { id: string; score: number; name: string } | null = null;
  for (const organization of database.organizations) {
    const nameScore = scoreOrganizationNameCompatibility(organizationName, organization.name);
    if (nameScore === 0) continue;
    
    const addressScore = scoreAddressCompatibility(candidate, organization, normalizePostalCode, normalizeCountry, isCityCompatible);
    if (addressScore === null) continue;
    
    const score = nameScore + addressScore;
    if (!best || score > best.score) {
      best = { id: organization.id, score, name: organization.name };
    }
  }
  return best;
};
