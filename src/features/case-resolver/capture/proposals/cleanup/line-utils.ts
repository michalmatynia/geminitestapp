import { normalizeCaseResolverComparable } from '../../utils';
import { CAPTURE_ORGANIZATION_HINTS } from './constants';
import { lineContainsComparableHint } from './hint-utils';

export const normalizeCaptureWordToken = (token: string): string =>
  token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

export const isLikelyCaptureOrganizationLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  const wordCount = trimmed.split(/\s+/).filter((token: string): boolean => token.length > 0).length;
  if (wordCount === 0 || wordCount > 10) return false;
  return lineContainsComparableHint(trimmed, CAPTURE_ORGANIZATION_HINTS);
};
