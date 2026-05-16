/**
 * Capture Cleanup Service
 * 
 * Provides logic for detecting and cleaning redundant or invalid party candidates
 * in document-capture workflows.
 */

import { lineContainsComparableHint } from '@/features/case-resolver/capture/proposals/cleanup/hint-utils';

/**
 * Common organisation name tokens used to infer capture roles.
 */
export const CAPTURE_ORGANIZATION_HINTS = [
  'zus', 'inspektorat', 'oddzial', 'zaklad', 'urzad', 'sad', 'ministerstwo', 
  'fundacja', 'stowarzyszenie', 'spolka', 'sp z o o', 'sa', 'kancelaria', 
  'office', 'department', 'agency', 'court', 'inc', 'llc', 'corp', 'company', 
  'university', 'uniwersytet',
];

/**
 * Normalizes text line for comparison.
 */
export const normalizeCaptureTextLine = (value: string): string =>
  value
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/[,:;.\s]+$/g, '')
    .trim()
    .toLowerCase();

/**
 * Normalizes a word token (strips leading/trailing non-alphanumeric chars).
 */
export const normalizeCaptureWordToken = (token: string): string =>
  token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

/**
 * Determines if a line is likely a personal name based on capitalization and token count.
 */
export const isLikelyCapturePersonNameLine = (line: string): boolean => {
  const tokens = line
    .split(/\s+/)
    .map((token: string) => normalizeCaptureWordToken(token))
    .filter((token: string) => token.length > 0);
  if (tokens.length < 2 || tokens.length > 4) return false;
  if (tokens.some((token: string) => /\d/.test(token))) return false;

  const letterTokens = tokens.filter((token: string) => /[\p{L}]/u.test(token));
  if (letterTokens.length < 2) return false;
  return letterTokens.every((token: string) => {
    if (!/^[\p{L}][\p{L}'’`-]*$/u.test(token)) return false;
    const first = token.charAt(0);
    if (first !== first.toLocaleUpperCase()) return false;
    const rest = token.slice(1);
    return rest.length === 0 || token === token.toLocaleUpperCase() || rest === rest.toLocaleLowerCase();
  });
};

/**
 * Determines if a line is likely an organization name.
 */
export const isLikelyCaptureOrganizationLine = (line: string): boolean => {
  const trimmed = line.trim();
  if (trimmed.length === 0) return false;
  const wordCount = trimmed.split(/\s+/).filter((token: string) => token.length > 0).length;
  if (wordCount === 0 || wordCount > 10) return false;
  return lineContainsComparableHint(trimmed, CAPTURE_ORGANIZATION_HINTS);
};
