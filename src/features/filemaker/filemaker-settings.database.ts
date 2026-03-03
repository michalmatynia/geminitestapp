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
import { validationError } from '@/shared/errors/app-error';
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
import { validateFilemakerPhoneNumber } from './filemaker-settings.validation';

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
  return FILEMAKER_EMAIL_STATUSES.find((status): boolean => status === normalized) ?? fallback;
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

const hasDeprecatedFullAddress = (value: Record<string, unknown>): boolean =>
  Boolean(normalizeString(value['fullAddress']));

const hasInlineAddressFields = (value: Record<string, unknown>): boolean =>
  hasAnyAddressData({
    street: normalizeString(value['street']),
    streetNumber: normalizeString(value['streetNumber']),
    city: normalizeString(value['city']),
    postalCode: normalizeString(value['postalCode']),
    country: normalizeString(value['country']),
    countryId: normalizeString(value['countryId']),
  });

const getRecordList = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value)
    ? value.filter(
      (entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry)
    )
    : [];

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
  if (Object.keys(valueRecord).length === 0) {
    return createDefaultFilemakerDatabase();
  }
  if (valueRecord['version'] !== 2) {
    throw validationError('Legacy Filemaker database payloads are no longer supported.', {
      version: valueRecord['version'] ?? null,
    });
  }

  const rawPersons = getRecordList(valueRecord['persons']);
  const rawOrganizations = getRecordList(valueRecord['organizations']);
  const rawEvents = getRecordList(valueRecord['events']);
  const hasAddressLinksArray = Array.isArray(valueRecord['addressLinks']);
  const hasPhoneNumberLinksArray = Array.isArray(valueRecord['phoneNumberLinks']);
  const rawAddressLinks = getRecordList(valueRecord['addressLinks']);
  const rawPhoneNumberLinks = getRecordList(valueRecord['phoneNumberLinks']);
  const rawEmailLinks = getRecordList(valueRecord['emailLinks']);

  if ([...rawPersons, ...rawOrganizations, ...rawEvents].some(hasDeprecatedFullAddress)) {
    throw validationError('Legacy Filemaker fullAddress payloads are no longer supported.');
  }

  if (
    !hasAddressLinksArray &&
    [...rawPersons, ...rawOrganizations, ...rawEvents].some(hasInlineAddressFields)
  ) {
    throw validationError(
      'Legacy Filemaker inline address payloads are no longer supported without addressLinks.'
    );
  }

  if (
    !hasPhoneNumberLinksArray &&
    rawPersons.some((entry) => normalizePhoneNumbers(entry['phoneNumbers']).length > 0)
  ) {
    throw validationError(
      'Legacy Filemaker inline person phoneNumbers payloads are no longer supported without phoneNumberLinks.'
    );
  }

  if (
    !hasPhoneNumberLinksArray &&
    rawOrganizations.some((entry) => normalizePhoneNumbers(entry['phoneNumbers']).length > 0)
  ) {
    throw validationError(
      'Legacy Filemaker inline organization phoneNumbers payloads are no longer supported without phoneNumberLinks.'
    );
  }

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

  const personIds = new Set<string>();
  const persons: FilemakerPerson[] = rawPersons
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
    .filter((entry: FilemakerPerson | null): entry is FilemakerPerson => Boolean(entry));

  const organizationIds = new Set<string>();
  const organizations: FilemakerOrganization[] = rawOrganizations
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
    .filter((entry: FilemakerOrganization | null): entry is FilemakerOrganization => Boolean(entry));

  const eventIds = new Set<string>();
  const events: FilemakerEvent[] = rawEvents
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
    .filter((entry: FilemakerEvent | null): entry is FilemakerEvent => Boolean(entry));

  const addressLinkIds = new Set<string>();
  const addressRelationKeys = new Set<string>();
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
    }
  ): void => {
    const ownerKindRaw = normalizeString(input.ownerKind).toLowerCase();
    if (ownerKindRaw !== 'person' && ownerKindRaw !== 'organization' && ownerKindRaw !== 'event') {
      return;
    }
    const ownerKind = ownerKindRaw;
    const ownerId = normalizeString(input.ownerId);
    const addressId = normalizeString(input.addressId);
    if (!ownerId || !addressId) return;
    if (!addressesById.has(addressId)) return;
    if (!isAddressOwnerPresent(personIds, organizationIds, eventIds, ownerKind, ownerId)) {
      return;
    }

    const ownerKey = `${ownerKind}:${ownerId}`;
    const relationKey = `${ownerKind}:${ownerId}:${addressId}`;
    if (addressRelationKeys.has(relationKey)) return;

    const baseId = defaultAddressLinkIdForValues(ownerKind, ownerId, addressId);
    const id = ensureUniqueId(normalizeString(input.id) || baseId, addressLinkIds, baseId);
    addressLinkIds.add(id);
    addressRelationKeys.add(relationKey);

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

  rawAddressLinks.forEach((entry: Record<string, unknown>) => {
    pushAddressLink({
      id: entry['id'],
      ownerKind: entry['ownerKind'],
      ownerId: entry['ownerId'],
      addressId: entry['addressId'],
      isDefault: entry['isDefault'],
      createdAt: normalizeString(entry['createdAt']) || undefined,
      updatedAt: normalizeString(entry['updatedAt']) || undefined,
    });
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
    const defaultAddressId = defaultAddressIdByOwner.get(`person:${person.id}`) ?? '';
    const resolvedAddress = addressesById.get(defaultAddressId);
    if (!resolvedAddress) {
      return {
        ...person,
        addressId: defaultAddressId,
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
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
      const defaultAddressId = defaultAddressIdByOwner.get(`organization:${organization.id}`) ?? '';
      const resolvedAddress = addressesById.get(defaultAddressId);
      if (!resolvedAddress) {
        return {
          ...organization,
          addressId: defaultAddressId,
          street: '',
          streetNumber: '',
          city: '',
          postalCode: '',
          country: '',
          countryId: '',
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
    const defaultAddressId = defaultAddressIdByOwner.get(`event:${event.id}`) ?? '';
    const resolvedAddress = addressesById.get(defaultAddressId);
    if (!resolvedAddress) {
      return {
        ...event,
        addressId: defaultAddressId,
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
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
    const validation = validateFilemakerPhoneNumber(normalizeString(input.phoneNumber));
    if (!validation.isValid) return null;

    const existingId = phoneNumberIdByValue.get(validation.normalizedPhoneNumber);
    if (existingId) return existingId;

    const baseId = defaultPhoneNumberIdForValue(validation.normalizedPhoneNumber);
    const id = ensureUniqueId(normalizeString(input.id) || baseId, phoneNumberIds, baseId);
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

  const phoneNumberLinkIds = new Set<string>();
  const phoneNumberRelationKeys = new Set<string>();
  const phoneNumberLinks: FilemakerPhoneNumberLink[] = [];

  const pushPhoneNumberLink = (
    input: {
      phoneNumberId: unknown;
      partyKind: unknown;
      partyId: unknown;
      id?: unknown;
      createdAt?: string | null | undefined;
      updatedAt?: string | null | undefined;
    }
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

    const relationKey = `${phoneNumberId}:${partyKind}:${partyId}`;
    if (phoneNumberRelationKeys.has(relationKey)) return;

    const baseId = defaultPhoneNumberLinkIdForValues(phoneNumberId, partyKind, partyId);
    const id = ensureUniqueId(normalizeString(input.id) || baseId, phoneNumberLinkIds, baseId);
    phoneNumberLinkIds.add(id);
    phoneNumberRelationKeys.add(relationKey);
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

  rawPhoneNumberLinks.forEach((entry: Record<string, unknown>) => {
    pushPhoneNumberLink({
      phoneNumberId: entry['phoneNumberId'],
      partyKind: entry['partyKind'],
      partyId: entry['partyId'],
      id: entry['id'],
      createdAt: normalizeString(entry['createdAt']) || undefined,
      updatedAt: normalizeString(entry['updatedAt']) || undefined,
    });
  });

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

  const emailLinkIds = new Set<string>();
  const emailRelationKeys = new Set<string>();
  const emailLinks: FilemakerEmailLink[] = [];

  const pushEmailLink = (
    input: {
      emailId: unknown;
      partyKind: unknown;
      partyId: unknown;
      id?: unknown;
      createdAt?: string | null | undefined;
      updatedAt?: string | null | undefined;
    }
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

    const relationKey = `${emailId}:${partyKind}:${partyId}`;
    if (emailRelationKeys.has(relationKey)) return;

    const baseId = defaultEmailLinkIdForValues(emailId, partyKind, partyId);
    const id = ensureUniqueId(normalizeString(input.id) || baseId, emailLinkIds, baseId);
    emailLinkIds.add(id);
    emailRelationKeys.add(relationKey);
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

  rawEmailLinks.forEach((entry: Record<string, unknown>) => {
    pushEmailLink({
      emailId: entry['emailId'],
      partyKind: entry['partyKind'],
      partyId: entry['partyId'],
      id: entry['id'],
      createdAt: normalizeString(entry['createdAt']) || undefined,
      updatedAt: normalizeString(entry['updatedAt']) || undefined,
    });
  });

  const rawEventOrganizationLinks: unknown[] = Array.isArray(valueRecord['eventOrganizationLinks'])
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
