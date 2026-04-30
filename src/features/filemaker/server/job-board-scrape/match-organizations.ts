import 'server-only';

import type { FilemakerOrganization } from '../../types';
import type {
  FilemakerJobBoardOrganizationMatch,
  FilemakerJobBoardScrapedOffer,
} from '../../filemaker-job-board-scrape-contracts';

import { uniqueStrings } from './normalizers';
import { normalizeNameForMatch } from './dedupe-listings';

export type OrganizationCandidate = {
  normalizedNames: string[];
  organization: FilemakerOrganization;
  tokens: string[];
};

export const tokenizeName = (value: string): string[] =>
  uniqueStrings(normalizeNameForMatch(value).split(' ').filter((token) => token.length >= 3));

export const buildCandidate = (organization: FilemakerOrganization): OrganizationCandidate => {
  const names = uniqueStrings([organization.name, organization.tradingName ?? '']);
  return {
    normalizedNames: names.map(normalizeNameForMatch).filter(Boolean),
    organization,
    tokens: uniqueStrings(names.flatMap(tokenizeName)),
  };
};

const isMeaningfulContainedNameMatch = (left: string, right: string): boolean => {
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  if (shorter.length < 5) return false;
  if (shorter.split(' ').some((token) => token.length >= 3) === false) return false;
  return (
    longer.startsWith(`${shorter} `) ||
    longer.endsWith(` ${shorter}`) ||
    longer.includes(` ${shorter} `)
  );
};

export const scoreCandidate = (
  companyName: string,
  candidate: OrganizationCandidate
): FilemakerJobBoardOrganizationMatch | null => {
  const normalizedCompany = normalizeNameForMatch(companyName);
  if (normalizedCompany.length === 0) return null;
  if (candidate.normalizedNames.some((name: string): boolean => name === normalizedCompany)) {
    return {
      confidence: 100,
      organizationId: candidate.organization.id,
      organizationName: candidate.organization.name,
      reason: 'exact scraped employer name match',
    };
  }
  if (
    candidate.normalizedNames.some((name: string): boolean =>
      isMeaningfulContainedNameMatch(normalizedCompany, name)
    )
  ) {
    return {
      confidence: 90,
      organizationId: candidate.organization.id,
      organizationName: candidate.organization.name,
      reason: 'contained name match',
    };
  }
  return null;
};

export const findBestMatch = (
  offer: FilemakerJobBoardScrapedOffer,
  candidates: OrganizationCandidate[],
  minimumMatchConfidence: number
): FilemakerJobBoardOrganizationMatch | null => {
  const matches = candidates
    .map((candidate: OrganizationCandidate): FilemakerJobBoardOrganizationMatch | null =>
      scoreCandidate(offer.companyName, candidate)
    )
    .filter((match): match is FilemakerJobBoardOrganizationMatch => match !== null)
    .sort((left, right) => right.confidence - left.confidence);
  const best = matches[0] ?? null;
  return best && best.confidence >= minimumMatchConfidence ? best : null;
};
