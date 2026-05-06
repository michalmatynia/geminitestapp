import { normalizeCaseResolverComparable } from '@/features/case-resolver/public';

export const lineContainsComparableHint = (line: string, hints: string[]): boolean => {
  const normalizedLine = normalizeCaseResolverComparable(line);
  if (normalizedLine.length === 0) return false;
  const paddedLine = ` ${normalizedLine} `;
  return hints.some((hint: string): boolean => {
    const normalizedHint = normalizeCaseResolverComparable(hint);
    if (normalizedHint.length === 0) return false;
    return paddedLine.includes(` ${normalizedHint} `);
  });
};
