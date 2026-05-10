/**
 * Party Matching Orchestrator
 *
 * Orchestrates party matching logic for Case Resolver candidates
 * against Filemaker databases.
 */

import type { FilemakerDatabase } from '@/features/filemaker/public';
import type { PromptExploderCaseResolverPartyCandidate } from '@/shared/contracts/prompt-exploder';
import { normalizeCaseResolverComparable } from '@/features/case-resolver/services/party-matching';
import {
  scoreAddressCompatibility,
  scoreOrganizationNameCompatibility,
} from '@/features/case-resolver/services/party-matching/scoring-service';

export type MatchedCaseResolverPartyReference = {
  kind: 'person' | 'organization';
  id: string;
  displayName: string;
};

type CandidatePersonName = {
  firstName: string;
  lastName: string;
};

type BestPartyMatch = {
  id: string;
  score: number;
  name: string;
};

type AddressCompatibilityDeps = {
  normalizePostalCode: (val: string) => string;
  normalizeCountry: (val: string) => string | null;
  isCityCompatible: (candidateCity: string, recordCity: string) => boolean;
};

type PersonCompatibilityDeps = AddressCompatibilityDeps & {
  isPersonLastNameCompatible: (candidateLastName: string, recordLastName: string) => boolean;
};

type FilemakerPersonRecord = FilemakerDatabase['persons'][number];
type FilemakerOrganizationRecord = FilemakerDatabase['organizations'][number];

export const deriveCandidatePersonName = (
  candidate: PromptExploderCaseResolverPartyCandidate
): CandidatePersonName => {
  const displayName = (candidate.displayName ?? '').trim();
  const displayTokens = displayName.length > 0 ? displayName.split(/\s+/) : [];
  const firstName = (candidate.firstName ?? '').trim();
  const lastName = (candidate.lastName ?? '').trim();
  return {
    firstName: firstName.length > 0 ? firstName : displayTokens[0] ?? '',
    lastName: lastName.length > 0 ? lastName : displayTokens.slice(1).join(' ').trim(),
  };
};

const isPersonNameCompatible = ({
  deps,
  person,
  personFirst,
  personLast,
}: {
  deps: PersonCompatibilityDeps;
  person: FilemakerPersonRecord;
  personFirst: string;
  personLast: string;
}): boolean => {
  const first = normalizeCaseResolverComparable(person.firstName);
  const last = normalizeCaseResolverComparable(person.lastName);
  if (personFirst.length > 0 && first !== personFirst) return false;
  return personLast.length === 0 || deps.isPersonLastNameCompatible(personLast, last);
};

const scorePersonMatch = ({
  candidate,
  deps,
  person,
  personFirst,
  personLast,
}: {
  candidate: PromptExploderCaseResolverPartyCandidate;
  deps: PersonCompatibilityDeps;
  person: FilemakerPersonRecord;
  personFirst: string;
  personLast: string;
}): number | null => {
  if (!isPersonNameCompatible({ deps, person, personFirst, personLast })) return null;
  const addressScore = scoreAddressCompatibility(
    candidate,
    person,
    deps.normalizePostalCode,
    deps.normalizeCountry,
    deps.isCityCompatible
  );
  if (addressScore === null) return null;
  const firstNameScore = personFirst.length > 0 ? 3 : 0;
  const lastNameScore = personLast.length > 0 ? 3 : 0;
  return firstNameScore + lastNameScore + addressScore;
};

export const findBestPersonMatch = ({
  candidate,
  database,
  deps,
  personFirst,
  personLast,
}: {
  database: FilemakerDatabase;
  candidate: PromptExploderCaseResolverPartyCandidate;
  personFirst: string;
  personLast: string;
  deps: PersonCompatibilityDeps;
}): BestPartyMatch | null => {
  let best: BestPartyMatch | null = null;
  for (const person of database.persons) {
    const score = scorePersonMatch({ candidate, deps, person, personFirst, personLast });
    if (score === null) continue;
    if (best === null || score > best.score) {
      best = { id: person.id, score, name: `${person.firstName} ${person.lastName}`.trim() };
    }
  }
  return best;
};

const scoreOrganizationMatch = ({
  candidate,
  deps,
  organization,
  organizationName,
}: {
  candidate: PromptExploderCaseResolverPartyCandidate;
  deps: AddressCompatibilityDeps;
  organization: FilemakerOrganizationRecord;
  organizationName: string;
}): number | null => {
  const nameScore = scoreOrganizationNameCompatibility(organizationName, organization.name);
  if (nameScore === 0) return null;
  const addressScore = scoreAddressCompatibility(
    candidate,
    organization,
    deps.normalizePostalCode,
    deps.normalizeCountry,
    deps.isCityCompatible
  );
  return addressScore === null ? null : nameScore + addressScore;
};

export const findBestOrganizationMatch = ({
  candidate,
  database,
  deps,
  organizationName,
}: {
  database: FilemakerDatabase;
  candidate: PromptExploderCaseResolverPartyCandidate;
  organizationName: string;
  deps: AddressCompatibilityDeps;
}): BestPartyMatch | null => {
  let best: BestPartyMatch | null = null;
  for (const organization of database.organizations) {
    const score = scoreOrganizationMatch({ candidate, deps, organization, organizationName });
    if (score === null) continue;
    if (best === null || score > best.score) {
      best = { id: organization.id, score, name: organization.name };
    }
  }
  return best;
};
