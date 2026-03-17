export const normalizeDocQuery = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const looksLikeCaseResolverPrompt = (value: string): boolean => {
  const text = value.trim();
  if (!text) return false;
  let score = 0;
  if (/(^|\n)\s*dotyczy\s*:/imu.test(text)) score += 2;
  if (/(^|\n)\s*uzasadnienie\b/imu.test(text)) score += 2;
  if (/(^|\n)\s*na\s+zakończenie\b/imu.test(text)) score += 1;
  if (/\b\d{2}-\d{3}\s+[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/u.test(text)) score += 1;
  if (
    /(^|\n)\s*[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż][^\n]{1,50}\s+\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/u.test(text)
  ) {
    score += 1;
  }
  return score >= 3;
};
