const normalizeComparableText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

export const normalizeValidatorCategoryLooseComparableText = (value: unknown): string => {
  const normalized = normalizeComparableText(value);
  if (!normalized) return '';
  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const singularizeComparableToken = (token: string): string => {
  if (token.length <= 2) return token;
  if (token.endsWith('ies') && token.length > 3) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.endsWith('ses') && token.length > 3) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && !token.endsWith('ss')) {
    return token.slice(0, -1);
  }
  return token;
};

export const normalizeValidatorCategorySingularComparableText = (value: unknown): string => {
  const normalized = normalizeValidatorCategoryLooseComparableText(value);
  if (!normalized) return '';
  return normalized
    .split(' ')
    .map((token) => singularizeComparableToken(token))
    .join(' ');
};

export const areValidatorCategoryLabelsEquivalent = (
  left: string | null | undefined,
  right: string | null | undefined
): boolean => {
  const normalizedLeft = normalizeValidatorCategoryLooseComparableText(left);
  const normalizedRight = normalizeValidatorCategoryLooseComparableText(right);
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft === normalizedRight) return true;
  return (
    normalizeValidatorCategorySingularComparableText(left) ===
    normalizeValidatorCategorySingularComparableText(right)
  );
};
