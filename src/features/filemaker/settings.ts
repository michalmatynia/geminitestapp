import { parseJsonSetting } from '@/shared/utils/settings-json';

import type {
  FilemakerAddress,
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
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
};

const normalizeAddressFields = (value: {
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
}): FilemakerAddressFields => {
  return {
    street: normalizeString(value.street),
    streetNumber: normalizeString(value.streetNumber),
    city: normalizeString(value.city),
    postalCode: normalizeString(value.postalCode),
    country: normalizeString(value.country),
    countryId: normalizeString(value.countryId),
  };
};

export const formatFilemakerAddress = (
  value: Pick<FilemakerAddressFields, 'street' | 'streetNumber' | 'city' | 'postalCode' | 'country'>
): string =>
  [[value.street, value.streetNumber].map((entry: string) => normalizeString(entry)).filter(Boolean).join(' '), value.city, value.postalCode, value.country]
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

const hasAnyAddressData = (value: FilemakerAddressFields): boolean =>
  Boolean(
    value.street ||
      value.streetNumber ||
      value.city ||
      value.postalCode ||
      value.country ||
      value.countryId
  );

export const createFilemakerAddress = (input: {
  id: string;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}): FilemakerAddress => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    streetNumber: input.streetNumber,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    countryId: input.countryId,
  });
  return {
    id: normalizeString(input.id),
    street: address.street,
    streetNumber: address.streetNumber,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    countryId: address.countryId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerPerson = (input: {
  id: string;
  firstName: unknown;
  lastName: unknown;
  addressId?: unknown;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  nip?: unknown;
  regon?: unknown;
  phoneNumbers?: unknown;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}): FilemakerPerson => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    streetNumber: input.streetNumber,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    countryId: input.countryId,
  });
  return {
    id: normalizeString(input.id),
    firstName: normalizeString(input.firstName),
    lastName: normalizeString(input.lastName),
    addressId: normalizeString(input.addressId),
    street: address.street,
    streetNumber: address.streetNumber,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    countryId: address.countryId,
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
  addressId?: unknown;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}): FilemakerOrganization => {
  const now = new Date().toISOString();
  const address = normalizeAddressFields({
    street: input.street,
    streetNumber: input.streetNumber,
    city: input.city,
    postalCode: input.postalCode,
    country: input.country,
    countryId: input.countryId,
  });
  return {
    id: normalizeString(input.id),
    name: normalizeString(input.name),
    addressId: normalizeString(input.addressId),
    street: address.street,
    streetNumber: address.streetNumber,
    city: address.city,
    postalCode: address.postalCode,
    country: address.country,
    countryId: address.countryId,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerDatabase = (): FilemakerDatabase => ({
  version: 2,
  persons: [],
  organizations: [],
  addresses: [],
});

const defaultAddressIdForEntity = (kind: 'person' | 'organization', entityId: string): string =>
  `${kind}-address-${entityId}`;

const attachAddressToPerson = (
  person: FilemakerPerson,
  addressesById: Map<string, FilemakerAddress>
): FilemakerPerson => {
  const addressId = normalizeString(person.addressId) || defaultAddressIdForEntity('person', person.id);
  const existing = addressesById.get(addressId);
  const fromPerson = createFilemakerAddress({
    id: addressId,
    street: person.street,
    streetNumber: person.streetNumber,
    city: person.city,
    postalCode: person.postalCode,
    country: person.country,
    countryId: person.countryId,
    createdAt: existing?.createdAt ?? person.createdAt,
    updatedAt: person.updatedAt,
  });
  if (hasAnyAddressData(fromPerson)) {
    addressesById.set(addressId, fromPerson);
  }
  const resolvedAddress = addressesById.get(addressId);
  if (!resolvedAddress) {
    return {
      ...person,
      addressId,
    };
  }
  return {
    ...person,
    addressId,
    street: resolvedAddress.street,
    streetNumber: resolvedAddress.streetNumber,
    city: resolvedAddress.city,
    postalCode: resolvedAddress.postalCode,
    country: resolvedAddress.country,
    countryId: resolvedAddress.countryId,
  };
};

const attachAddressToOrganization = (
  organization: FilemakerOrganization,
  addressesById: Map<string, FilemakerAddress>
): FilemakerOrganization => {
  const addressId = normalizeString(organization.addressId) ||
    defaultAddressIdForEntity('organization', organization.id);
  const existing = addressesById.get(addressId);
  const fromOrganization = createFilemakerAddress({
    id: addressId,
    street: organization.street,
    streetNumber: organization.streetNumber,
    city: organization.city,
    postalCode: organization.postalCode,
    country: organization.country,
    countryId: organization.countryId,
    createdAt: existing?.createdAt ?? organization.createdAt,
    updatedAt: organization.updatedAt,
  });
  if (hasAnyAddressData(fromOrganization)) {
    addressesById.set(addressId, fromOrganization);
  }
  const resolvedAddress = addressesById.get(addressId);
  if (!resolvedAddress) {
    return {
      ...organization,
      addressId,
    };
  }
  return {
    ...organization,
    addressId,
    street: resolvedAddress.street,
    streetNumber: resolvedAddress.streetNumber,
    city: resolvedAddress.city,
    postalCode: resolvedAddress.postalCode,
    country: resolvedAddress.country,
    countryId: resolvedAddress.countryId,
  };
};

export const normalizeFilemakerDatabase = (
  value: FilemakerDatabase | null | undefined
): FilemakerDatabase => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerDatabase();
  }

  const rawAddresses: unknown[] = Array.isArray((value as { addresses?: unknown[] }).addresses)
    ? (value as { addresses?: unknown[] }).addresses ?? []
    : [];
  const addressesById = new Map<string, FilemakerAddress>();
  rawAddresses
    .filter((entry: unknown): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
    .forEach((entry: Record<string, unknown>) => {
      const id = normalizeString(entry['id']);
      if (!id || addressesById.has(id)) return;
      addressesById.set(
        id,
        createFilemakerAddress({
          id,
          street: normalizeString(entry['street']),
          streetNumber: normalizeString(entry['streetNumber']),
          city: normalizeString(entry['city']),
          postalCode: normalizeString(entry['postalCode']),
          country: normalizeString(entry['country']),
          countryId: normalizeString(entry['countryId']),
          createdAt: normalizeString(entry['createdAt']) || undefined,
          updatedAt: normalizeString(entry['updatedAt']) || undefined,
        })
      );
    });

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
        addressId: normalizeString(entry['addressId']),
        street: normalizeString(entry['street']),
        streetNumber: normalizeString(entry['streetNumber']),
        city: normalizeString(entry['city']),
        postalCode: normalizeString(entry['postalCode']),
        country: normalizeString(entry['country']),
        countryId: normalizeString(entry['countryId']),
        nip: normalizeString(entry['nip']),
        regon: normalizeString(entry['regon']),
        phoneNumbers: entry['phoneNumbers'],
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      });
    })
    .filter((entry: FilemakerPerson | null): entry is FilemakerPerson => Boolean(entry))
    .map((entry: FilemakerPerson) => attachAddressToPerson(entry, addressesById));

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
        addressId: normalizeString(entry['addressId']),
        street: normalizeString(entry['street']),
        streetNumber: normalizeString(entry['streetNumber']),
        city: normalizeString(entry['city']),
        postalCode: normalizeString(entry['postalCode']),
        country: normalizeString(entry['country']),
        countryId: normalizeString(entry['countryId']),
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      });
    })
    .filter((entry: FilemakerOrganization | null): entry is FilemakerOrganization => Boolean(entry))
    .map((entry: FilemakerOrganization) => attachAddressToOrganization(entry, addressesById));

  return {
    version: 2,
    persons,
    organizations,
    addresses: Array.from(addressesById.values()),
  };
};

export const parseFilemakerDatabase = (
  raw: string | null | undefined
): FilemakerDatabase => {
  const parsed = parseJsonSetting<FilemakerDatabase | null>(raw, null);
  return normalizeFilemakerDatabase(parsed);
};

export const getFilemakerAddressById = (
  database: FilemakerDatabase,
  addressId: string | null | undefined
): FilemakerAddress | null => {
  const normalizedAddressId = normalizeString(addressId);
  if (!normalizedAddressId) return null;
  return database.addresses.find((address: FilemakerAddress) => address.id === normalizedAddressId) ?? null;
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
