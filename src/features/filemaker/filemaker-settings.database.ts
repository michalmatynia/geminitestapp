 
import {
  type FilemakerAddress,
  type FilemakerAddressLink,
  type FilemakerAddressOwnerKind,
  type FilemakerDatabase,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEvent,
  type FilemakerEventOrganizationLink,
  type FilemakerOrganization,
  type FilemakerPartyKind,
  type FilemakerPhoneNumber,
  type FilemakerPhoneNumberLink,
  type FilemakerPerson,
} from './types';
import {
  ensureUniqueId,
  normalizePhoneNumbers,
  normalizeString,
  toIdToken,
} from './filemaker-settings.helpers';
import {
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerEmail,
  createFilemakerEmailLink,
  createFilemakerEvent,
  createFilemakerEventOrganizationLink,
  createFilemakerOrganization,
  createFilemakerPerson,
  createFilemakerPhoneNumber,
  createFilemakerPhoneNumberLink,
} from './filemaker-settings.entities';
import {
  validateFilemakerPhoneNumber,
} from './filemaker-settings.validation';

const FILEMAKER_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FILEMAKER_EMAIL_STATUSES: Array<'active' | 'inactive' | 'bounced' | 'unverified'> = [
  'active',
  'inactive',
  'bounced',
  'unverified',
];

const isValidEmailAddress = (value: string): boolean =>
  Boolean(value) && FILEMAKER_EMAIL_RE.test(value);

const normalizeEmailStatus = (
  value: unknown,
  fallback: 'active' | 'inactive' | 'bounced' | 'unverified' = 'unverified'
): 'active' | 'inactive' | 'bounced' | 'unverified' => {
  const normalized = normalizeString(value).toLowerCase();
  if (!normalized) return fallback;
  return FILEMAKER_EMAIL_STATUSES.find(
    (status): boolean => status === normalized
  ) ?? fallback;
};

export const createDefaultFilemakerDatabase = (): FilemakerDatabase => ({
  version: 2,
  persons: [],
  organizations: [],
  events: [],
  addresses: [],
  addressLinks: [],
  phoneNumbers: [],
  phoneNumberLinks: [],
  emails: [],
  emailLinks: [],
  eventOrganizationLinks: [],
});

const defaultAddressIdForEntity = (
  kind: 'person' | 'organization' | 'event',
  entityId: string
): string => `${kind}-address-${entityId}`;

const defaultAddressLinkIdForValues = (
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string,
  addressId: string
): string => {
  const joined = `${ownerKind}-${ownerId}-${addressId}`;
  return `filemaker-address-link-${toIdToken(joined) || 'entry'}`;
};

const defaultEmailIdForValue = (email: string): string => {
  const token = toIdToken(email);
  return `filemaker-email-${token || 'entry'}`;
};

const defaultPhoneNumberIdForValue = (phoneNumber: string): string => {
  const token = toIdToken(phoneNumber);
  return `filemaker-phone-number-${token || 'entry'}`;
};

const defaultPhoneNumberLinkIdForValues = (
  phoneNumberId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => {
  const joined = `${phoneNumberId}-${partyKind}-${partyId}`;
  return `filemaker-phone-number-link-${toIdToken(joined) || 'entry'}`;
};

const defaultEmailLinkIdForValues = (
  emailId: string,
  partyKind: FilemakerPartyKind,
  partyId: string
): string => {
  const joined = `${emailId}-${partyKind}-${partyId}`;
  return `filemaker-email-link-${toIdToken(joined) || 'entry'}`;
};

const defaultEventOrganizationLinkIdForValues = (
  eventId: string,
  organizationId: string
): string => {
  const joined = `${eventId}-${organizationId}`;
  return `filemaker-event-organization-link-${toIdToken(joined) || 'entry'}`;
};

const hasAnyAddressData = (value: {
  street?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  countryId?: string | null;
}): boolean =>
  Boolean(
    value.street ||
      value.streetNumber ||
      value.city ||
      value.postalCode ||
      value.country ||
      value.countryId
  );

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

const attachAddressToEvent = (
  event: FilemakerEvent,
  addressesById: Map<string, FilemakerAddress>
): FilemakerEvent => {
  const addressId =
    normalizeString(event.addressId) || defaultAddressIdForEntity('event', event.id);
  const existing = addressesById.get(addressId);
  const fromEvent = createFilemakerAddress({
    id: addressId,
    street: event.street,
    streetNumber: event.streetNumber,
    city: event.city,
    postalCode: event.postalCode,
    country: event.country,
    countryId: event.countryId,
    createdAt: existing?.createdAt ?? event.createdAt,
    updatedAt: event.updatedAt,
  });
  if (hasAnyAddressData(fromEvent)) {
    addressesById.set(addressId, fromEvent);
  }
  const resolvedAddress = addressesById.get(addressId);
  if (!resolvedAddress) {
    return {
      ...event,
      addressId,
    };
  }
  return {
    ...event,
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

const isAddressOwnerPresent = (
  personIds: Set<string>,
  organizationIds: Set<string>,
  eventIds: Set<string>,
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string
): boolean => {
  if (ownerKind === 'person') return personIds.has(ownerId);
  if (ownerKind === 'organization') return organizationIds.has(ownerId);
  return eventIds.has(ownerId);
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

  const rawEvents: unknown[] = Array.isArray(valueRecord['events'])
    ? (valueRecord['events'] as unknown[])
    : [];
  const eventIds = new Set<string>();
  const events: FilemakerEvent[] = rawEvents
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .map((entry: Record<string, unknown>): FilemakerEvent | null => {
      const id = normalizeString(entry['id']);
      if (!id || eventIds.has(id)) return null;
      eventIds.add(id);
      return createFilemakerEvent({
        id,
        eventName: normalizeString(entry['eventName']),
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
    .filter((entry: FilemakerEvent | null): entry is FilemakerEvent => Boolean(entry))
    .map((entry: FilemakerEvent) => attachAddressToEvent(entry, addressesById));

  const legacyAddressLinks: Array<{
    id: string;
    ownerKind: FilemakerAddressOwnerKind;
    ownerId: string;
    addressId: string;
    isDefault: boolean;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
  }> = [];

  persons.forEach((person: FilemakerPerson): void => {
    const addressId = normalizeString(person.addressId);
    if (!addressId || !addressesById.has(addressId)) return;
    legacyAddressLinks.push({
      id: defaultAddressLinkIdForValues('person', person.id, addressId),
      ownerKind: 'person',
      ownerId: person.id,
      addressId,
      isDefault: true,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    });
  });

  organizations.forEach((organization: FilemakerOrganization): void => {
    const addressId = normalizeString(organization.addressId);
    if (!addressId || !addressesById.has(addressId)) return;
    legacyAddressLinks.push({
      id: defaultAddressLinkIdForValues('organization', organization.id, addressId),
      ownerKind: 'organization',
      ownerId: organization.id,
      addressId,
      isDefault: true,
      createdAt: organization.createdAt,
      updatedAt: organization.updatedAt,
    });
  });

  events.forEach((event: FilemakerEvent): void => {
    const addressId = normalizeString(event.addressId);
    if (!addressId || !addressesById.has(addressId)) return;
    legacyAddressLinks.push({
      id: defaultAddressLinkIdForValues('event', event.id, addressId),
      ownerKind: 'event',
      ownerId: event.id,
      addressId,
      isDefault: true,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });
  });

  const rawAddressLinks: unknown[] = Array.isArray(valueRecord['addressLinks'])
    ? (valueRecord['addressLinks'] as unknown[])
    : [];
  const addressLinkIds = new Set<string>();
  const addressRelationKeys = new Set<string>();
  const ownersWithRawLinks = new Set<string>();
  const groupedAddressLinks = new Map<string, FilemakerAddressLink[]>();

  const pushAddressLink = (
    input: {
      id?: unknown;
      ownerKind: unknown;
      ownerId: unknown;
      addressId: unknown;
      isDefault?: unknown;
      createdAt?: string | null | undefined;
      updatedAt?: string | null | undefined;
    },
    source: 'raw' | 'legacy'
  ): void => {
    const ownerKindRaw = normalizeString(input.ownerKind).toLowerCase();
    if (
      ownerKindRaw !== 'person' &&
      ownerKindRaw !== 'organization' &&
      ownerKindRaw !== 'event'
    ) {
      return;
    }
    const ownerKind = ownerKindRaw;
    const ownerId = normalizeString(input.ownerId);
    const addressId = normalizeString(input.addressId);
    if (!ownerId || !addressId) return;
    if (!addressesById.has(addressId)) return;
    if (
      !isAddressOwnerPresent(
        personIds,
        organizationIds,
        eventIds,
        ownerKind,
        ownerId
      )
    ) {
      return;
    }

    const ownerKey = `${ownerKind}:${ownerId}`;
    if (source === 'legacy' && ownersWithRawLinks.has(ownerKey)) return;

    const relationKey = `${ownerKind}:${ownerId}:${addressId}`;
    if (addressRelationKeys.has(relationKey)) return;

    const baseId = defaultAddressLinkIdForValues(ownerKind, ownerId, addressId);
    const id = ensureUniqueId(normalizeString(input.id) || baseId, addressLinkIds, baseId);
    addressLinkIds.add(id);
    addressRelationKeys.add(relationKey);
    if (source === 'raw') {
      ownersWithRawLinks.add(ownerKey);
    }

    const link = createFilemakerAddressLink({
      id,
      ownerKind,
      ownerId,
      addressId,
      isDefault: input.isDefault,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    });
    const list = groupedAddressLinks.get(ownerKey) ?? [];
    list.push(link);
    groupedAddressLinks.set(ownerKey, list);
  };

  rawAddressLinks
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object'
    )
    .forEach((entry: Record<string, unknown>) => {
      pushAddressLink(
        {
          id: entry['id'],
          ownerKind: entry['ownerKind'],
          ownerId: entry['ownerId'],
          addressId: entry['addressId'],
          isDefault: entry['isDefault'],
          createdAt: normalizeString(entry['createdAt']) || undefined,
          updatedAt: normalizeString(entry['updatedAt']) || undefined,
        },
        'raw'
      );
    });

  legacyAddressLinks.forEach((entry) => {
    pushAddressLink(entry, 'legacy');
  });

  const addressLinks: FilemakerAddressLink[] = [];
  groupedAddressLinks.forEach((links: FilemakerAddressLink[]) => {
    if (links.length === 0) return;
    const defaultIndex = links.findIndex((link) => link.isDefault);
    const normalizedDefaultIndex = defaultIndex >= 0 ? defaultIndex : 0;
    links.forEach((link: FilemakerAddressLink, index: number): void => {
      addressLinks.push({
        ...link,
        isDefault: index === normalizedDefaultIndex,
      });
    });
  });

  const defaultAddressIdByOwner = new Map<string, string>();
  addressLinks.forEach((link: FilemakerAddressLink): void => {
    if (!link.isDefault) return;
    defaultAddressIdByOwner.set(`${link.ownerKind}:${link.ownerId}`, link.addressId);
  });

  const resolvedPersons = persons.map((person: FilemakerPerson): FilemakerPerson => {
    const defaultAddressId =
      defaultAddressIdByOwner.get(`person:${person.id}`) ?? normalizeString(person.addressId);
    const resolvedAddress = addressesById.get(defaultAddressId);
    if (!resolvedAddress) {
      return {
        ...person,
        addressId: defaultAddressId,
      };
    }
    return {
      ...person,
      addressId: resolvedAddress.id,
      street: resolvedAddress.street,
      streetNumber: resolvedAddress.streetNumber,
      city: resolvedAddress.city,
      postalCode: resolvedAddress.postalCode,
      country: resolvedAddress.country,
      countryId: resolvedAddress.countryId,
    };
  });

  const resolvedOrganizations = organizations.map(
    (organization: FilemakerOrganization): FilemakerOrganization => {
      const defaultAddressId =
        defaultAddressIdByOwner.get(`organization:${organization.id}`) ??
        normalizeString(organization.addressId);
      const resolvedAddress = addressesById.get(defaultAddressId);
      if (!resolvedAddress) {
        return {
          ...organization,
          addressId: defaultAddressId,
        };
      }
      return {
        ...organization,
        addressId: resolvedAddress.id,
        street: resolvedAddress.street,
        streetNumber: resolvedAddress.streetNumber,
        city: resolvedAddress.city,
        postalCode: resolvedAddress.postalCode,
        country: resolvedAddress.country,
        countryId: resolvedAddress.countryId,
      };
    }
  );

  const resolvedEvents = events.map((event: FilemakerEvent): FilemakerEvent => {
    const defaultAddressId =
      defaultAddressIdByOwner.get(`event:${event.id}`) ?? normalizeString(event.addressId);
    const resolvedAddress = addressesById.get(defaultAddressId);
    if (!resolvedAddress) {
      return {
        ...event,
        addressId: defaultAddressId,
      };
    }
    return {
      ...event,
      addressId: resolvedAddress.id,
      street: resolvedAddress.street,
      streetNumber: resolvedAddress.streetNumber,
      city: resolvedAddress.city,
      postalCode: resolvedAddress.postalCode,
      country: resolvedAddress.country,
      countryId: resolvedAddress.countryId,
    };
  });

  const rawPhoneNumbers: unknown[] = Array.isArray(valueRecord['phoneNumbers'])
    ? (valueRecord['phoneNumbers'] as unknown[])
    : [];
  const phoneNumbers: FilemakerPhoneNumber[] = [];
  const phoneNumberIds = new Set<string>();
  const phoneNumberIdByValue = new Map<string, string>();

  const ensurePhoneNumberId = (input: {
    phoneNumber: unknown;
    id?: unknown;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
  }): string | null => {
    const validation = validateFilemakerPhoneNumber(
      normalizeString(input.phoneNumber)
    );
    if (!validation.isValid) return null;

    const existingId = phoneNumberIdByValue.get(validation.normalizedPhoneNumber);
    if (existingId) return existingId;

    const baseId = defaultPhoneNumberIdForValue(validation.normalizedPhoneNumber);
    const id = ensureUniqueId(
      normalizeString(input.id) || baseId,
      phoneNumberIds,
      baseId
    );
    phoneNumberIds.add(id);
    phoneNumberIdByValue.set(validation.normalizedPhoneNumber, id);
    phoneNumbers.push(
      createFilemakerPhoneNumber({
        id,
        phoneNumber: validation.normalizedPhoneNumber,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      })
    );
    return id;
  };

  rawPhoneNumbers.forEach((entry: unknown): void => {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const record = entry as Record<string, unknown>;
      ensurePhoneNumberId({
        phoneNumber: record['phoneNumber'],
        id: record['id'],
        createdAt: normalizeString(record['createdAt']) || undefined,
        updatedAt: normalizeString(record['updatedAt']) || undefined,
      });
      return;
    }
    ensurePhoneNumberId({ phoneNumber: entry });
  });

  const hasRawPhoneNumberLinks = Array.isArray(valueRecord['phoneNumberLinks']);
  const rawPhoneNumberLinks: unknown[] = hasRawPhoneNumberLinks
    ? (valueRecord['phoneNumberLinks'] as unknown[])
    : [];
  const phoneNumberLinkIds = new Set<string>();
  const phoneNumberRelationKeys = new Set<string>();
  const partiesWithRawPhoneLinks = new Set<string>();
  const phoneNumberLinks: FilemakerPhoneNumberLink[] = [];

  const pushPhoneNumberLink = (input: {
    phoneNumberId: unknown;
    partyKind: unknown;
    partyId: unknown;
    id?: unknown;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
  },
  source: 'raw' | 'legacy'
  ): void => {
    const phoneNumberId = normalizeString(input.phoneNumberId);
    if (!phoneNumberId || !phoneNumberIds.has(phoneNumberId)) return;

    const partyKindRaw = normalizeString(input.partyKind).toLowerCase();
    if (partyKindRaw !== 'person' && partyKindRaw !== 'organization') return;
    const partyKind = partyKindRaw;

    const partyId = normalizeString(input.partyId);
    if (!partyId || !isPartyPresent(personIds, organizationIds, partyKind, partyId)) {
      return;
    }

    const partyKey = `${partyKind}:${partyId}`;
    if (source === 'legacy' && partiesWithRawPhoneLinks.has(partyKey)) return;

    const relationKey = `${phoneNumberId}:${partyKind}:${partyId}`;
    if (phoneNumberRelationKeys.has(relationKey)) return;

    const baseId = defaultPhoneNumberLinkIdForValues(
      phoneNumberId,
      partyKind,
      partyId
    );
    const id = ensureUniqueId(
      normalizeString(input.id) || baseId,
      phoneNumberLinkIds,
      baseId
    );
    phoneNumberLinkIds.add(id);
    phoneNumberRelationKeys.add(relationKey);
    if (source === 'raw') {
      partiesWithRawPhoneLinks.add(partyKey);
    }
    phoneNumberLinks.push(
      createFilemakerPhoneNumberLink({
        id,
        phoneNumberId,
        partyKind,
        partyId,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      })
    );
  };

  rawPhoneNumberLinks
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    .forEach((entry: Record<string, unknown>) => {
      pushPhoneNumberLink({
        phoneNumberId: entry['phoneNumberId'],
        partyKind: entry['partyKind'],
        partyId: entry['partyId'],
        id: entry['id'],
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      }, 'raw');
    });

  if (!hasRawPhoneNumberLinks) {
    resolvedPersons.forEach((person: FilemakerPerson): void => {
      person.phoneNumbers.forEach((legacyPhoneNumber: string): void => {
        const phoneNumberId = ensurePhoneNumberId({
          phoneNumber: legacyPhoneNumber,
          createdAt: person.createdAt,
          updatedAt: person.updatedAt,
        });
        if (!phoneNumberId) return;
        pushPhoneNumberLink({
          phoneNumberId,
          partyKind: 'person',
          partyId: person.id,
        }, 'legacy');
      });
    });

    rawOrganizations
      .filter(
        (entry: unknown): entry is Record<string, unknown> =>
          Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
      )
      .forEach((entry: Record<string, unknown>): void => {
        const organizationId = normalizeString(entry['id']);
        if (!organizationId || !organizationIds.has(organizationId)) return;

        normalizePhoneNumbers(entry['phoneNumbers']).forEach(
          (legacyPhoneNumber: string): void => {
            const phoneNumberId = ensurePhoneNumberId({
              phoneNumber: legacyPhoneNumber,
            });
            if (!phoneNumberId) return;
            pushPhoneNumberLink({
              phoneNumberId,
              partyKind: 'organization',
              partyId: organizationId,
            }, 'legacy');
          }
        );
      });
  }

  const phoneNumberById = new Map<string, string>();
  phoneNumbers.forEach((entry: FilemakerPhoneNumber): void => {
    phoneNumberById.set(entry.id, entry.phoneNumber);
  });

  const phoneNumbersByParty = new Map<string, string[]>();
  phoneNumberLinks.forEach((link: FilemakerPhoneNumberLink): void => {
    const phoneNumber = phoneNumberById.get(link.phoneNumberId);
    if (!phoneNumber) return;
    const partyKey = `${link.partyKind}:${link.partyId}`;
    const existing = phoneNumbersByParty.get(partyKey) ?? [];
    if (!existing.includes(phoneNumber)) {
      existing.push(phoneNumber);
      phoneNumbersByParty.set(partyKey, existing);
    }
  });

  const syncedPersons = resolvedPersons.map(
    (person: FilemakerPerson): FilemakerPerson => ({
      ...person,
      phoneNumbers: phoneNumbersByParty.get(`person:${person.id}`) ?? [],
    })
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
      const normalizedEmail = normalizeString(entry['email']).toLowerCase();
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

  const hasRawEmailLinks = Array.isArray(valueRecord['emailLinks']);
  const rawEmailLinks: unknown[] = hasRawEmailLinks
    ? (valueRecord['emailLinks'] as unknown[])
    : [];
  const emailLinkIds = new Set<string>();
  const emailRelationKeys = new Set<string>();
  const partiesWithRawEmailLinks = new Set<string>();
  const emailLinks: FilemakerEmailLink[] = [];

  const pushEmailLink = (input: {
    emailId: unknown;
    partyKind: unknown;
    partyId: unknown;
    id?: unknown;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
  },
  source: 'raw' | 'legacy'
  ): void => {
    const emailId = normalizeString(input.emailId);
    if (!emailId || !emailIds.has(emailId)) return;

    const partyKindRaw = normalizeString(input.partyKind).toLowerCase();
    if (partyKindRaw !== 'person' && partyKindRaw !== 'organization') return;
    const partyKind = partyKindRaw;

    const partyId = normalizeString(input.partyId);
    if (!partyId || !isPartyPresent(personIds, organizationIds, partyKind, partyId)) {
      return;
    }

    const partyKey = `${partyKind}:${partyId}`;
    if (source === 'legacy' && partiesWithRawEmailLinks.has(partyKey)) return;

    const relationKey = `${emailId}:${partyKind}:${partyId}`;
    if (emailRelationKeys.has(relationKey)) return;

    const baseId = defaultEmailLinkIdForValues(emailId, partyKind, partyId);
    const id = ensureUniqueId(
      normalizeString(input.id) || baseId,
      emailLinkIds,
      baseId
    );
    emailLinkIds.add(id);
    emailRelationKeys.add(relationKey);
    if (source === 'raw') {
      partiesWithRawEmailLinks.add(partyKey);
    }
    emailLinks.push(
      createFilemakerEmailLink({
        id,
        emailId,
        partyKind,
        partyId,
        createdAt: input.createdAt,
        updatedAt: input.updatedAt,
      })
    );
  };

  rawEmailLinks
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    .forEach((entry: Record<string, unknown>) => {
      pushEmailLink({
        emailId: entry['emailId'],
        partyKind: entry['partyKind'],
        partyId: entry['partyId'],
        id: entry['id'],
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      }, 'raw');
    });

  const rawEventOrganizationLinks: unknown[] = Array.isArray(
    valueRecord['eventOrganizationLinks']
  )
    ? (valueRecord['eventOrganizationLinks'] as unknown[])
    : [];
  const eventOrganizationLinkIds = new Set<string>();
  const eventOrganizationRelationKeys = new Set<string>();
  const eventOrganizationLinks: FilemakerEventOrganizationLink[] = [];

  rawEventOrganizationLinks
    .filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    .forEach((entry: Record<string, unknown>) => {
      const eventId = normalizeString(entry['eventId']);
      const organizationId = normalizeString(entry['organizationId']);
      if (!eventId || !organizationId) return;
      if (!eventIds.has(eventId) || !organizationIds.has(organizationId)) return;

      const relationKey = `${eventId}:${organizationId}`;
      if (eventOrganizationRelationKeys.has(relationKey)) return;

      const baseId = defaultEventOrganizationLinkIdForValues(eventId, organizationId);
      const id = ensureUniqueId(
        normalizeString(entry['id']) || baseId,
        eventOrganizationLinkIds,
        baseId
      );
      eventOrganizationLinkIds.add(id);
      eventOrganizationRelationKeys.add(relationKey);
      eventOrganizationLinks.push(
        createFilemakerEventOrganizationLink({
          id,
          eventId,
          organizationId,
          createdAt: normalizeString(entry['createdAt']) || undefined,
          updatedAt: normalizeString(entry['updatedAt']) || undefined,
        })
      );
    });

  const addresses: FilemakerAddress[] = Array.from(addressesById.values());

  return {
    version: 2,
    persons: syncedPersons,
    organizations: resolvedOrganizations,
    events: resolvedEvents,
    addresses,
    addressLinks,
    phoneNumbers,
    phoneNumberLinks,
    emails,
    emailLinks,
    eventOrganizationLinks,
  };
};
