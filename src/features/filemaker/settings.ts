import { parseJsonSetting } from '@/shared/utils/settings-json';

import type {
  FilemakerAddress,
  FilemakerDatabase,
  FilemakerEmail,
  FilemakerEmailLink,
  FilemakerEmailStatus,
  FilemakerEntityKind,
  FilemakerOrganization,
  FilemakerPartyKind,
  FilemakerPartyOption,
  FilemakerPartyReference,
  FilemakerPerson,
} from './types';

export const FILEMAKER_DATABASE_KEY = 'filemaker_database_v1';
export const FILEMAKER_REFERENCE_NONE = 'none';

const FILEMAKER_EMAIL_STATUSES: FilemakerEmailStatus[] = [
  'active',
  'inactive',
  'bounced',
  'unverified',
];

const FILEMAKER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const toIdToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/g, '')
    .replace(/-+$/g, '');

const ensureUniqueId = (
  candidate: string,
  usedIds: Set<string>,
  fallbackPrefix: string
): string => {
  const normalizedCandidate = normalizeString(candidate);
  const base = normalizedCandidate || fallbackPrefix;
  if (!usedIds.has(base)) return base;
  let index = 2;
  while (usedIds.has(`${base}-${index}`)) {
    index += 1;
  }
  return `${base}-${index}`;
};

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

const normalizeEmailAddress = (value: unknown): string =>
  normalizeString(value).toLowerCase();

const isValidEmailAddress = (value: string): boolean =>
  Boolean(value) && FILEMAKER_EMAIL_RE.test(value);

const normalizeEmailStatus = (
  value: unknown,
  fallback: FilemakerEmailStatus = 'unverified'
): FilemakerEmailStatus => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return fallback;
  return FILEMAKER_EMAIL_STATUSES.find(
    (status: FilemakerEmailStatus): boolean => status === normalized
  ) ?? fallback;
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
  value: Pick<
    FilemakerAddressFields,
    'street' | 'streetNumber' | 'city' | 'postalCode' | 'country'
  >
): string =>
  [
    [value.street, value.streetNumber]
      .map((entry: string) => normalizeString(entry))
      .filter(Boolean)
      .join(' '),
    value.city,
    value.postalCode,
    value.country,
  ]
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
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
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
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
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
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
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

export const createFilemakerEmail = (input: {
  id: string;
  email: unknown;
  status?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEmail => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    email: normalizeEmailAddress(input.email),
    status: normalizeEmailStatus(input.status),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEmailLink = (input: {
  id: string;
  emailId: unknown;
  partyKind: unknown;
  partyId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEmailLink => {
  const now = new Date().toISOString();
  const rawPartyKind = normalizeString(input.partyKind).toLowerCase();
  const partyKind: FilemakerPartyKind =
    rawPartyKind === 'organization' ? 'organization' : 'person';

  return {
    id: normalizeString(input.id),
    emailId: normalizeString(input.emailId),
    partyKind,
    partyId: normalizeString(input.partyId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerDatabase = (): FilemakerDatabase => ({
  version: 2,
  persons: [],
  organizations: [],
  addresses: [],
  emails: [],
  emailLinks: [],
});

const defaultAddressIdForEntity = (
  kind: 'person' | 'organization',
  entityId: string
): string => `${kind}-address-${entityId}`;

const defaultEmailIdForValue = (email: string): string => {
  const token = toIdToken(email);
  return `filemaker-email-${token || 'entry'}`;
};

const defaultEmailLinkIdForValues = (
  emailId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => {
  const joined = `${emailId}-${partyKind}-${partyId}`;
  return `filemaker-email-link-${toIdToken(joined) || 'entry'}`;
};

const attachAddressToPerson = (
  person: FilemakerPerson,
  addressesById: Map<string, FilemakerAddress>
): FilemakerPerson => {
  const addressId =
    normalizeString(person.addressId) ||
    defaultAddressIdForEntity('person', person.id);
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
  const addressId =
    normalizeString(organization.addressId) ||
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

const isPartyPresent = (
  personIds: Set<string>,
  organizationIds: Set<string>,
  partyKind: FilemakerPartyKind,
  partyId: string
): boolean => {
  if (partyKind === 'person') {
    return personIds.has(partyId);
  }
  return organizationIds.has(partyId);
};

export const normalizeFilemakerDatabase = (
  value: FilemakerDatabase | null | undefined
): FilemakerDatabase => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerDatabase();
  }

  const valueRecord = value as Record<string, unknown>;

  const rawAddresses: unknown[] = Array.isArray(valueRecord['addresses'])
    ? (valueRecord['addresses'] as unknown[])
    : [];
  const addressesById = new Map<string, FilemakerAddress>();
  rawAddresses
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
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

  const rawPersons: unknown[] = Array.isArray(valueRecord['persons'])
    ? (valueRecord['persons'] as unknown[])
    : [];
  const personIds = new Set<string>();
  const persons: FilemakerPerson[] = rawPersons
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
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
    .filter(
      (entry: FilemakerPerson | null): entry is FilemakerPerson => Boolean(entry)
    )
    .map((entry: FilemakerPerson) => attachAddressToPerson(entry, addressesById));

  const rawOrganizations: unknown[] = Array.isArray(valueRecord['organizations'])
    ? (valueRecord['organizations'] as unknown[])
    : [];
  const organizationIds = new Set<string>();
  const organizations: FilemakerOrganization[] = rawOrganizations
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
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
    .filter(
      (entry: FilemakerOrganization | null): entry is FilemakerOrganization =>
        Boolean(entry)
    )
    .map((entry: FilemakerOrganization) =>
      attachAddressToOrganization(entry, addressesById)
    );

  const rawEmails: unknown[] = Array.isArray(valueRecord['emails'])
    ? (valueRecord['emails'] as unknown[])
    : [];
  const emailIds = new Set<string>();
  const emailValues = new Set<string>();
  const emails: FilemakerEmail[] = [];

  rawEmails
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .forEach((entry: Record<string, unknown>) => {
      const normalizedEmail = normalizeEmailAddress(entry['email']);
      if (!isValidEmailAddress(normalizedEmail)) return;
      if (emailValues.has(normalizedEmail)) return;

      const id = ensureUniqueId(
        normalizeString(entry['id']) || defaultEmailIdForValue(normalizedEmail),
        emailIds,
        defaultEmailIdForValue(normalizedEmail)
      );

      emailIds.add(id);
      emailValues.add(normalizedEmail);
      emails.push(
        createFilemakerEmail({
          id,
          email: normalizedEmail,
          status: normalizeEmailStatus(entry['status']),
          createdAt: normalizeString(entry['createdAt']) || undefined,
          updatedAt: normalizeString(entry['updatedAt']) || undefined,
        })
      );
    });

  const rawEmailLinks: unknown[] = Array.isArray(valueRecord['emailLinks'])
    ? (valueRecord['emailLinks'] as unknown[])
    : [];
  const emailLinkIds = new Set<string>();
  const relationKeys = new Set<string>();
  const emailLinks: FilemakerEmailLink[] = [];

  rawEmailLinks
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .forEach((entry: Record<string, unknown>) => {
      const emailId = normalizeString(entry['emailId']);
      if (!emailId || !emailIds.has(emailId)) return;

      const partyKindRaw = normalizeString(entry['partyKind']).toLowerCase();
      if (partyKindRaw !== 'person' && partyKindRaw !== 'organization') return;
      const partyKind = partyKindRaw;

      const partyId = normalizeString(entry['partyId']);
      if (!partyId || !isPartyPresent(personIds, organizationIds, partyKind, partyId)) {
        return;
      }

      const relationKey = `${emailId}:${partyKind}:${partyId}`;
      if (relationKeys.has(relationKey)) return;

      const id = ensureUniqueId(
        normalizeString(entry['id']) ||
          defaultEmailLinkIdForValues(emailId, partyKind, partyId),
        emailLinkIds,
        defaultEmailLinkIdForValues(emailId, partyKind, partyId)
      );

      relationKeys.add(relationKey);
      emailLinkIds.add(id);
      emailLinks.push(
        createFilemakerEmailLink({
          id,
          emailId,
          partyKind,
          partyId,
          createdAt: normalizeString(entry['createdAt']) || undefined,
          updatedAt: normalizeString(entry['updatedAt']) || undefined,
        })
      );
    });

  return {
    version: 2,
    persons,
    organizations,
    addresses: Array.from(addressesById.values()),
    emails,
    emailLinks,
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
  return (
    database.addresses.find(
      (address: FilemakerAddress) => address.id === normalizedAddressId
    ) ?? null
  );
};

export const getFilemakerEmailById = (
  database: FilemakerDatabase,
  emailId: string | null | undefined
): FilemakerEmail | null => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) return null;
  return (
    database.emails.find((email: FilemakerEmail) => email.id === normalizedEmailId) ??
    null
  );
};

export const getFilemakerEmailLinksForParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerEmailLink[] => {
  const normalizedPartyId = normalizeString(partyId);
  if (!normalizedPartyId) return [];
  return database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      link.partyKind === partyKind && link.partyId === normalizedPartyId
  );
};

export const getFilemakerEmailsForParty = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerEmail[] => {
  const emailIds = new Set(
    getFilemakerEmailLinksForParty(database, partyKind, partyId).map(
      (link: FilemakerEmailLink): string => link.emailId
    )
  );
  if (emailIds.size === 0) return [];
  return database.emails.filter((email: FilemakerEmail): boolean => emailIds.has(email.id));
};

export const getFilemakerPartiesForEmail = (
  database: FilemakerDatabase,
  emailId: string
): { persons: FilemakerPerson[]; organizations: FilemakerOrganization[] } => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) {
    return { persons: [], organizations: [] };
  }

  const personIds = new Set<string>();
  const organizationIds = new Set<string>();
  database.emailLinks.forEach((link: FilemakerEmailLink): void => {
    if (link.emailId !== normalizedEmailId) return;
    if (link.partyKind === 'person') {
      personIds.add(link.partyId);
      return;
    }
    organizationIds.add(link.partyId);
  });

  return {
    persons: database.persons.filter((person: FilemakerPerson): boolean =>
      personIds.has(person.id)
    ),
    organizations: database.organizations.filter(
      (organization: FilemakerOrganization): boolean =>
        organizationIds.has(organization.id)
    ),
  };
};

export const linkFilemakerEmailToParty = (
  database: FilemakerDatabase,
  input: {
    emailId: string;
    partyKind: FilemakerPartyKind;
    partyId: string;
  }
): { database: FilemakerDatabase; created: boolean } => {
  const emailId = normalizeString(input.emailId);
  const partyId = normalizeString(input.partyId);
  if (!emailId || !partyId) {
    return { database, created: false };
  }

  const hasEmail = database.emails.some(
    (email: FilemakerEmail): boolean => email.id === emailId
  );
  if (!hasEmail) return { database, created: false };

  const hasParty =
    input.partyKind === 'person'
      ? database.persons.some(
        (person: FilemakerPerson): boolean => person.id === partyId
      )
      : database.organizations.some(
        (organization: FilemakerOrganization): boolean =>
          organization.id === partyId
      );
  if (!hasParty) return { database, created: false };

  const alreadyLinked = database.emailLinks.some(
    (link: FilemakerEmailLink): boolean =>
      link.emailId === emailId &&
      link.partyKind === input.partyKind &&
      link.partyId === partyId
  );
  if (alreadyLinked) {
    return { database, created: false };
  }

  const usedIds = new Set(
    database.emailLinks.map((link: FilemakerEmailLink): string => link.id)
  );
  const id = ensureUniqueId(
    defaultEmailLinkIdForValues(emailId, input.partyKind, partyId),
    usedIds,
    defaultEmailLinkIdForValues(emailId, input.partyKind, partyId)
  );

  const nextDatabase = normalizeFilemakerDatabase({
    ...database,
    emailLinks: [
      ...database.emailLinks,
      createFilemakerEmailLink({
        id,
        emailId,
        partyKind: input.partyKind,
        partyId,
      }),
    ],
  });

  return {
    database: nextDatabase,
    created: true,
  };
};

export const unlinkFilemakerEmailFromParty = (
  database: FilemakerDatabase,
  input: {
    emailId: string;
    partyKind: FilemakerPartyKind;
    partyId: string;
  }
): FilemakerDatabase => {
  const emailId = normalizeString(input.emailId);
  const partyId = normalizeString(input.partyId);

  if (!emailId || !partyId) return database;

  const nextEmailLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      !(
        link.emailId === emailId &&
        link.partyKind === input.partyKind &&
        link.partyId === partyId
      )
  );

  if (nextEmailLinks.length === database.emailLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    emailLinks: nextEmailLinks,
  });
};

export const removeFilemakerEmail = (
  database: FilemakerDatabase,
  emailId: string
): FilemakerDatabase => {
  const normalizedEmailId = normalizeString(emailId);
  if (!normalizedEmailId) return database;

  const nextEmails = database.emails.filter(
    (email: FilemakerEmail): boolean => email.id !== normalizedEmailId
  );
  const nextLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean => link.emailId !== normalizedEmailId
  );

  if (
    nextEmails.length === database.emails.length &&
    nextLinks.length === database.emailLinks.length
  ) {
    return database;
  }

  return normalizeFilemakerDatabase({
    ...database,
    emails: nextEmails,
    emailLinks: nextLinks,
  });
};

export const removeFilemakerPartyEmailLinks = (
  database: FilemakerDatabase,
  partyKind: FilemakerPartyKind,
  partyId: string
): FilemakerDatabase => {
  const normalizedPartyId = normalizeString(partyId);
  if (!normalizedPartyId) return database;

  const nextLinks = database.emailLinks.filter(
    (link: FilemakerEmailLink): boolean =>
      !(link.partyKind === partyKind && link.partyId === normalizedPartyId)
  );
  if (nextLinks.length === database.emailLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    emailLinks: nextLinks,
  });
};

export const encodeFilemakerPartyReference = (
  value: FilemakerPartyReference | null | undefined
): string => {
  const sanitized = sanitizeReference(value);
  if (!sanitized) return FILEMAKER_REFERENCE_NONE;
  return `${sanitized.kind}:${sanitized.id}`;
};

export const decodeFilemakerPartyReference = (
  value: string,
  database?: FilemakerDatabase | null
): FilemakerPartyReference | null => {
  const normalized = normalizeString(value);
  if (!normalized || normalized === FILEMAKER_REFERENCE_NONE) return null;
  const [kindRaw, idRaw] = normalized.split(':', 2);
  const kind = normalizeString(kindRaw) as FilemakerEntityKind;
  const id = normalizeString(idRaw);
  if (!id) return null;
  if (kind !== 'person' && kind !== 'organization') return null;
  
  let name = '';
  if (database) {
    if (kind === 'person') {
      const person = database.persons.find((p) => p.id === id);
      name = person ? `${person.firstName} ${person.lastName}`.trim() : '';
    } else {
      const org = database.organizations.find((o) => o.id === id);
      name = org?.name || '';
    }
  }

  return { kind, id, name: name || id };
};

export const resolveFilemakerPartyLabel = (
  database: FilemakerDatabase,
  reference: FilemakerPartyReference | null | undefined
): string | null => {
  const sanitized = sanitizeReference(reference);
  if (!sanitized) return null;

  if (sanitized.kind === 'person') {
    const person = database.persons.find(
      (entry: FilemakerPerson) => entry.id === sanitized.id
    );
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
      kind: 'person' as const,
      description: detail.join(' | ') || address,
    };
  });

  const organizationOptions = database.organizations.map(
    (organization: FilemakerOrganization) => ({
      value: `organization:${organization.id}`,
      label: organization.name || organization.id,
      kind: 'organization' as const,
      description: formatFilemakerAddress(organization),
    })
  );

  return [
    { value: FILEMAKER_REFERENCE_NONE, label: 'None' },
    ...personOptions,
    ...organizationOptions,
  ];
};
