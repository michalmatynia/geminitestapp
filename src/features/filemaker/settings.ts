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

type FilemakerAddressFields = {
  street: string;
  city: string;
  postalCode: string;
  country: string;
};

const EMPTY_ADDRESS: FilemakerAddressFields = {
  street: '',
  city: '',
  postalCode: '',
  country: '',
};

const parseLegacyFullAddress = (value: unknown): FilemakerAddressFields => {
  const legacyAddress = normalizeString(value);
  if (!legacyAddress) return EMPTY_ADDRESS;
  const parts = legacyAddress
    .split(',')
    .map((entry: string) => entry.trim())
    .filter(Boolean);
  if (parts.length === 0) return EMPTY_ADDRESS;
  return {
    street: parts[0] ?? '',
    city: parts[1] ?? '',
    postalCode: parts[2] ?? '',
    country: parts.slice(3).join(', ').trim(),
  };
};

const normalizeAddressFields = (value: {
  street?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  fullAddress?: unknown;
}): FilemakerAddressFields => {
  const legacy = parseLegacyFullAddress(value.fullAddress);
  return {
    street: normalizeString(value.street) || legacy.street,
    city: normalizeString(value.city) || legacy.city,
    postalCode: normalizeString(value.postalCode) || legacy.postalCode,
    country: normalizeString(value.country) || legacy.country,
  };
};

export const formatFilemakerAddress = (
  value: Pick<FilemakerAddressFields, 'street' | 'city' | 'postalCode' | 'country'>
): string =>
  [value.street, value.city, value.postalCode, value.country]
    .map((entry: string) => normalizeString(entry))
    .filter(Boolean)
    .join(', ');

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
  firstName: unknown;
  lastName: unknown;
  street?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  fullAddress?: unknown;
  nip?: unknown;
  regon?: unknown;
  phoneNumbers?: unknown;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}): FilemakerPerson => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    fullAddress: input.fullAddress,
  });
  return {
    id: normalizeString(input.id),
    firstName: normalizeString(input.firstName),
    lastName: normalizeString(input.lastName),
    street: address.street,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    nip: normalizeString(input.nip),
    regon: normalizeString(input.regon),
    phoneNumbers: normalizePhoneNumbers(input.phoneNumbers),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerOrganization = (input: {
  id: string;
  name: unknown;
  street?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  fullAddress?: unknown;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}): FilemakerOrganization => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    fullAddress: input.fullAddress,
  });
  return {
    id: normalizeString(input.id),
    name: normalizeString(input.name),
    street: address.street,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
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

  const rawPersons: unknown[] = Array.isArray(value.persons) ? value.persons : [];
  const personIds = new Set<string>();
  const persons: FilemakerPerson[] = rawPersons
    .filter((entry: unknown): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry: Record<string, unknown>): FilemakerPerson | null => {
      const id = normalizeString(entry['id']);
      if (!id || personIds.has(id)) return null;
      personIds.add(id);
      return createFilemakerPerson({
        id,
        firstName: normalizeString(entry['firstName']),
        lastName: normalizeString(entry['lastName']),
        street: normalizeString(entry['street']),
        city: normalizeString(entry['city']),
        postalCode: normalizeString(entry['postalCode']),
        country: normalizeString(entry['country']),
        fullAddress: normalizeString(entry['fullAddress']),
        nip: normalizeString(entry['nip']),
        regon: normalizeString(entry['regon']),
        phoneNumbers: entry['phoneNumbers'],
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      });
    })
    .filter((entry: FilemakerPerson | null): entry is FilemakerPerson => Boolean(entry));

  const rawOrganizations: unknown[] = Array.isArray(value.organizations) ? value.organizations : [];
  const organizationIds = new Set<string>();
  const organizations: FilemakerOrganization[] = rawOrganizations
    .filter((entry: unknown): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .map((entry: Record<string, unknown>): FilemakerOrganization | null => {
      const id = normalizeString(entry['id']);
      if (!id || organizationIds.has(id)) return null;
      organizationIds.add(id);
      return createFilemakerOrganization({
        id,
        name: normalizeString(entry['name']),
        street: normalizeString(entry['street']),
        city: normalizeString(entry['city']),
        postalCode: normalizeString(entry['postalCode']),
        country: normalizeString(entry['country']),
        fullAddress: normalizeString(entry['fullAddress']),
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
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
    const address = formatFilemakerAddress(person);
    const detail: string[] = [];
    if (person.nip) detail.push(`NIP: ${person.nip}`);
    if (person.regon) detail.push(`REGON: ${person.regon}`);
    return {
      value: `person:${person.id}`,
      label,
      description: detail.join(' | ') || address,
    };
  });

  const organizationOptions = database.organizations.map((organization: FilemakerOrganization) => ({
    value: `organization:${organization.id}`,
    label: organization.name || organization.id,
    description: formatFilemakerAddress(organization),
  }));

  return [
    { value: FILEMAKER_REFERENCE_NONE, label: 'None' },
    ...personOptions,
    ...organizationOptions,
  ];
};
