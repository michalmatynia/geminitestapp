import { normalizeCaseResolverComparable } from '../utils';

export const lineContainsComparableHint = (line: string, hints: string[]): boolean => {
  const normalizedLine = normalizeCaseResolverComparable(line);
  if (normalizedLine === null) return false;
  const paddedLine = ` ${normalizedLine} `;
  return hints.some((hint: string): boolean => {
    const normalizedHint = normalizeCaseResolverComparable(hint);
    if (normalizedHint === null) return false;
    return paddedLine.includes(` ${normalizedHint} `);
  });
};
