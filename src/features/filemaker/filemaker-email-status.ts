import { normalizeString } from './filemaker-settings.helpers';
import type { FilemakerEmailStatus } from './types';

const LEGACY_UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export const FILEMAKER_EMAIL_STATUSES = [
  'active',
  'inactive',
  'bounced',
  'unverified',
] as const satisfies readonly FilemakerEmailStatus[];

export type FilemakerEmailStatusOption = {
  description: string;
  label: string;
  value: FilemakerEmailStatus;
};

export const FILEMAKER_EMAIL_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', description: 'Deliverable and in use.' },
  { value: 'inactive', label: 'Inactive', description: 'Known email, not currently used.' },
  { value: 'bounced', label: 'Bounced', description: 'Delivery is failing.' },
  { value: 'unverified', label: 'Unverified', description: 'Not yet verified.' },
] as const satisfies readonly FilemakerEmailStatusOption[];

export type NormalizedFilemakerEmailStatus = {
  legacyStatusRaw?: string;
  legacyStatusUuid?: string;
  status: FilemakerEmailStatus;
};

export const FILEMAKER_LEGACY_EMAIL_STATUS_UUID_TO_MODERN_STATUS: Readonly<
  Record<string, FilemakerEmailStatus>
> = {
  'CA4DA13B-0D51-4E6F-87A0-F90D1190B9D8': 'active',
  '8E808514-6196-4975-82F3-BD73C71A81BA': 'bounced',
  'AE5C43AA-6A1F-46DC-BF20-28C0B6E4DC76': 'bounced',
  '8C31F126-4A4D-4690-9866-185976194B4E': 'bounced',
  'CF4D07AF-1987-4EEC-9D5C-9E72201EB557': 'inactive',
  '14E41083-EE2A-4FB0-ADED-FA6BFA63A362': 'inactive',
  '265BE365-DB0B-4A4B-8690-20B916860163': 'inactive',
};

const EMAIL_STATUS_ALIAS_TO_MODERN_STATUS: Readonly<Record<string, FilemakerEmailStatus>> = {
  active: 'active',
  valid: 'active',
  inactive: 'inactive',
  omit: 'inactive',
  omitted: 'inactive',
  blacklisted: 'inactive',
  blacklist: 'inactive',
  spamtrap: 'inactive',
  'spam trap': 'inactive',
  suppressed: 'inactive',
  unsubscribed: 'inactive',
  bounced: 'bounced',
  bounce: 'bounced',
  'soft bounce': 'bounced',
  'hard bounce': 'bounced',
  'verified hb': 'bounced',
  hb: 'bounced',
  unverified: 'unverified',
  unknown: 'unverified',
};

const normalizeStatusAlias = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\s+/g, ' ');

const normalizeLegacyStatusUuid = (value: string): string => {
  const match = value.match(LEGACY_UUID_PATTERN);
  return match?.[0].toUpperCase() ?? '';
};

export const isFilemakerEmailStatus = (value: unknown): value is FilemakerEmailStatus =>
  typeof value === 'string' && FILEMAKER_EMAIL_STATUSES.includes(value as FilemakerEmailStatus);

const isModernStatusAlias = (value: string): value is FilemakerEmailStatus =>
  FILEMAKER_EMAIL_STATUSES.includes(value as FilemakerEmailStatus);

export const normalizeRecognizedFilemakerEmailStatus = (
  value: unknown
): FilemakerEmailStatus | undefined => {
  const raw = normalizeString(value);
  if (raw.length === 0) return undefined;

  const legacyStatusUuid = normalizeLegacyStatusUuid(raw);
  const alias = normalizeStatusAlias(raw);
  return (
    (legacyStatusUuid.length > 0
      ? FILEMAKER_LEGACY_EMAIL_STATUS_UUID_TO_MODERN_STATUS[legacyStatusUuid]
      : undefined) ?? EMAIL_STATUS_ALIAS_TO_MODERN_STATUS[alias]
  );
};

export const normalizeFilemakerEmailStatusDetails = (
  value: unknown,
  fallback: FilemakerEmailStatus = 'unverified'
): NormalizedFilemakerEmailStatus => {
  const raw = normalizeString(value);
  if (raw.length === 0) return { status: fallback };

  const legacyStatusUuid = normalizeLegacyStatusUuid(raw);
  const alias = normalizeStatusAlias(raw);
  const status = normalizeRecognizedFilemakerEmailStatus(raw) ?? fallback;
  const shouldKeepLegacyFields = legacyStatusUuid.length > 0 || !isModernStatusAlias(alias);

  return {
    ...(shouldKeepLegacyFields ? { legacyStatusRaw: raw } : {}),
    ...(legacyStatusUuid.length > 0 ? { legacyStatusUuid } : {}),
    status,
  };
};

export const normalizeFilemakerEmailStatus = (
  value: unknown,
  fallback: FilemakerEmailStatus = 'unverified'
): FilemakerEmailStatus => normalizeFilemakerEmailStatusDetails(value, fallback).status;
