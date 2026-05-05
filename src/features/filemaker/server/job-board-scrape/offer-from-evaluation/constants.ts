export const POSTED_AT_KEYS = [
  'postedAt',
  'datePosted',
  'publicationDate',
  'publishedAt',
  'publishedDate',
  'createdAt',
  'listedAt',
] as const;

export const EXPIRES_AT_KEYS = [
  'expiresAt',
  'validThrough',
  'validUntil',
  'validTo',
  'expirationDate',
  'expiryDate',
  'applicationDeadline',
  'deadline',
] as const;

export const POSTED_AT_FACT_KEYWORDS = [
  'date posted',
  'data publikacji',
  'dodano',
  'opublikowano',
  'posted',
  'published',
  'publikacji',
] as const;

export const EXPIRES_AT_FACT_KEYWORDS = [
  'application deadline',
  'aplikuj do',
  'deadline',
  'expires',
  'termin aplikowania',
  'valid through',
  'valid until',
  'valid',
  'wazna do',
  'wazna',
] as const;

export const COMPANY_NAME_FACT_KEYS = [
  'company',
  'employer',
  'firma',
  'nazwa',
  'nazwa firmy',
  'pracodawca',
] as const;

export const GENERIC_JOB_BOARD_COMPANY_NAME_KEYS = new Set([
  'company',
  'company profile',
]);
