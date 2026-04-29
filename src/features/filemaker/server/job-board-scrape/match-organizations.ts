import 'server-only';

import type { FilemakerOrganization } from '../../types';
import type {
  FilemakerJobBoardOrganizationMatch,
  FilemakerJobBoardScrapedOffer,
} from '../../filemaker-job-board-scrape-contracts';

import { uniqueStrings } from './normalizers';

export type OrganizationCandidate = {
  normalizedNames: string[];
  organization: FilemakerOrganization;
  tokens: string[];
};

export const normalizeNameForMatch = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(spolka|sp|zoo|z o o|s a|sa|inc|ltd|llc|gmbh|fundacja|stowarzyszenie)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

export const scoreCandidate = (
  companyName: string,
  candidate: OrganizationCandidate
): FilemakerJobBoardOrganizationMatch | null => {
  const normalizedCompany = normalizeNameForMatch(companyName);
  if (normalizedCompany.length === 0) return null;
  if (!candidate.normalizedNames.some((name: string): boolean => name === normalizedCompany)) {
    return null;
  }
  return {
    confidence: 100,
    organizationId: candidate.organization.id,
    organizationName: candidate.organization.name,
    reason: 'exact scraped employer name match',
  };
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
