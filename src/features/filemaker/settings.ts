import { parseJsonSetting } from '@/shared/utils/settings-json';

import type {
  FilemakerDatabase,
  FilemakerEntityKind,
  FilemakerOrganization,
  FilemakerPartyOption,
  FilemakerPartyReference,
  FilemakerPerson,
} from './types';

export const FILEMAKER_DATABASE_KEY = 'filemaker_database_v1';
export const FILEMAKER_REFERENCE_NONE = 'none';

const normalizeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const normalizePhoneNumbers = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    const unique = new Set<string>();
    value.forEach((entry: unknown) => {
      const normalized = normalizeString(entry);
      if (!normalized) return;
      unique.add(normalized);
    });
    return Array.from(unique);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry: string) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

const sanitizeReference = (value: unknown): FilemakerPartyReference | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const kind = normalizeString(record['kind']) as FilemakerEntityKind;
  if (kind !== 'person' && kind !== 'organization') return null;
  const id = normalizeString(record['id']);
  if (!id) return null;
  return { kind, id };
};

export const createFilemakerPerson = (input: {
  id: string;
  firstName: string;
  lastName: string;
  fullAddress: string;
  nip?: string | null | undefined;
  regon?: string | null | undefined;
  phoneNumbers?: string[] | string | null | undefined;
  createdAt?: string;
  updatedAt?: string;
}): FilemakerPerson => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    firstName: normalizeString(input.firstName),
    lastName: normalizeString(input.lastName),
    fullAddress: normalizeString(input.fullAddress),
    nip: normalizeString(input.nip),
    regon: normalizeString(input.regon),
    phoneNumbers: normalizePhoneNumbers(input.phoneNumbers),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerOrganization = (input: {
  id: string;
  name: string;
  fullAddress: string;
  createdAt?: string;
  updatedAt?: string;
}): FilemakerOrganization => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    name: normalizeString(input.name),
    fullAddress: normalizeString(input.fullAddress),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerDatabase = (): FilemakerDatabase => ({
  version: 1,
  persons: [],
  organizations: [],
});

export const normalizeFilemakerDatabase = (
  value: FilemakerDatabase | null | undefined
): FilemakerDatabase => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerDatabase();
  }

  const rawPersons = Array.isArray(value.persons) ? value.persons : [];
  const personIds = new Set<string>();
  const persons: FilemakerPerson[] = rawPersons
    .filter((entry): entry is FilemakerPerson => Boolean(entry) && typeof entry === 'object')
    .map((entry: FilemakerPerson): FilemakerPerson | null => {
      const id = normalizeString(entry.id);
      if (!id || personIds.has(id)) return null;
      personIds.add(id);
      return createFilemakerPerson({
        id,
        firstName: entry.firstName,
        lastName: entry.lastName,
        fullAddress: entry.fullAddress,
        nip: entry.nip,
        regon: entry.regon,
        phoneNumbers: entry.phoneNumbers,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    })
    .filter((entry: FilemakerPerson | null): entry is FilemakerPerson => Boolean(entry));

  const rawOrganizations = Array.isArray(value.organizations) ? value.organizations : [];
  const organizationIds = new Set<string>();
  const organizations: FilemakerOrganization[] = rawOrganizations
    .filter((entry): entry is FilemakerOrganization => Boolean(entry) && typeof entry === 'object')
    .map((entry: FilemakerOrganization): FilemakerOrganization | null => {
      const id = normalizeString(entry.id);
      if (!id || organizationIds.has(id)) return null;
      organizationIds.add(id);
      return createFilemakerOrganization({
        id,
        name: entry.name,
        fullAddress: entry.fullAddress,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    })
    .filter((entry: FilemakerOrganization | null): entry is FilemakerOrganization => Boolean(entry));

  return {
    version: 1,
    persons,
    organizations,
  };
};

export const parseFilemakerDatabase = (
  raw: string | null | undefined
): FilemakerDatabase => {
  const parsed = parseJsonSetting<FilemakerDatabase | null>(raw, null);
  return normalizeFilemakerDatabase(parsed);
};

export const encodeFilemakerPartyReference = (
  value: FilemakerPartyReference | null | undefined
): string => {
  const sanitized = sanitizeReference(value);
  if (!sanitized) return FILEMAKER_REFERENCE_NONE;
  return `${sanitized.kind}:${sanitized.id}`;
};

export const decodeFilemakerPartyReference = (
  value: string
): FilemakerPartyReference | null => {
  const normalized = normalizeString(value);
  if (!normalized || normalized === FILEMAKER_REFERENCE_NONE) return null;
  const [kindRaw, idRaw] = normalized.split(':', 2);
  const kind = normalizeString(kindRaw) as FilemakerEntityKind;
  const id = normalizeString(idRaw);
  if (!id) return null;
  if (kind !== 'person' && kind !== 'organization') return null;
  return { kind, id };
};

export const resolveFilemakerPartyLabel = (
  database: FilemakerDatabase,
  reference: FilemakerPartyReference | null | undefined
): string | null => {
  const sanitized = sanitizeReference(reference);
  if (!sanitized) return null;

  if (sanitized.kind === 'person') {
    const person = database.persons.find((entry: FilemakerPerson) => entry.id === sanitized.id);
    if (!person) return null;
    const name = `${person.firstName} ${person.lastName}`.trim();
    return name || person.id;
  }

  const organization = database.organizations.find(
    (entry: FilemakerOrganization) => entry.id === sanitized.id
  );
  if (!organization) return null;
  return organization.name || organization.id;
};

export const buildFilemakerPartyOptions = (
  database: FilemakerDatabase
): FilemakerPartyOption[] => {
  const personOptions = database.persons.map((person: FilemakerPerson) => {
    const label = `${person.firstName} ${person.lastName}`.trim() || person.id;
    const detail: string[] = [];
    if (person.nip) detail.push(`NIP: ${person.nip}`);
    if (person.regon) detail.push(`REGON: ${person.regon}`);
    return {
      value: `person:${person.id}`,
      label,
      description: detail.join(' | ') || person.fullAddress,
    };
  });

  const organizationOptions = database.organizations.map((organization: FilemakerOrganization) => ({
    value: `organization:${organization.id}`,
    label: organization.name || organization.id,
    description: organization.fullAddress,
  }));

  return [
    { value: FILEMAKER_REFERENCE_NONE, label: 'None' },
    ...personOptions,
    ...organizationOptions,
  ];
};
