import { validationError } from '@/shared/errors/app-error';

import {
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerEmail,
  createFilemakerEmailLink,
  createFilemakerEvent,
  createFilemakerEventOrganizationLink,
  createFilemakerJobListing,
  createFilemakerOrganization,
  createFilemakerOrganizationLegacyDemand,
  createFilemakerPerson,
  createFilemakerPhoneNumber,
  createFilemakerPhoneNumberLink,
  createFilemakerValue,
  createFilemakerValueParameter,
  createFilemakerValueParameterLink,
} from './filemaker-settings.entities';
import {
  ensureUniqueId,
  normalizePhoneNumbers,
  normalizeString,
  toIdToken,
} from './filemaker-settings.helpers';
import { validateFilemakerPhoneNumber } from './filemaker-settings.validation';
import {
  type FilemakerAddress,
  type FilemakerAddressLink,
  type FilemakerAddressOwnerKind,
  type FilemakerDatabase,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEvent,
  type FilemakerEventOrganizationLink,
  type FilemakerJobListing,
  type FilemakerOrganization,
  type FilemakerOrganizationLegacyDemand,
  type FilemakerPartyKind,
  type FilemakerPhoneNumber,
  type FilemakerPhoneNumberLink,
  type FilemakerPerson,
  type FilemakerValue,
  type FilemakerValueParameter,
  type FilemakerValueParameterLink,
} from './types';

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
  values: [],
  valueParameters: [],
  valueParameterLinks: [],
  organizationLegacyDemands: [],
  jobListings: [],
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

const defaultValueParameterLinkIdForValues = (
  valueId: string,
  parameterId: string
): string => {
  const joined = `${valueId}-${parameterId}`;
  return `filemaker-value-parameter-link-${toIdToken(joined) || 'entry'}`;
};

const defaultOrganizationLegacyDemandIdForValues = (
  organizationId: string,
  valueIds: string[]
): string => {
  const joined = `${organizationId}-${valueIds.join('-')}`;
  return `filemaker-organization-legacy-demand-${toIdToken(joined) || 'entry'}`;
};

const defaultJobListingIdForValues = (organizationId: string, title: string): string => {
  const joined = `${organizationId}-${title}`;
  return `filemaker-job-listing-${toIdToken(joined) || 'entry'}`;
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

const hasInlineEmailFields = (value: Record<string, unknown>): boolean => {
  if (normalizeString(value['email'])) return true;
  if (normalizeString(value['emailAddress'])) return true;
  if (normalizeString(value['primaryEmail'])) return true;
  const emails = value['emails'];
  if (typeof emails === 'string') {
    return Boolean(normalizeString(emails));
  }
  if (Array.isArray(emails)) {
    return emails.length > 0;
  }
  return false;
};

const getRecordList = (key: string, value: unknown): Record<string, unknown>[] => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw validationError(`Invalid Filemaker ${key} payload.`, {
      key,
      reason: 'not_array',
    });
  }
  const invalidIndex = value.findIndex(
    (entry: unknown): boolean => !entry || typeof entry !== 'object' || Array.isArray(entry)
  );
  if (invalidIndex >= 0) {
    throw validationError(`Invalid Filemaker ${key} entry payload.`, {
      key,
      index: invalidIndex,
      reason: 'entry_not_object',
    });
  }
  return value as Record<string, unknown>[];
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

export const assertCanonicalFilemakerDatabasePayload = (
  value: FilemakerDatabase | null | undefined
): void => {
  if (!value || typeof value !== 'object') return;
  const valueRecord = value as Record<string, unknown>;
  if (Object.keys(valueRecord).length === 0) return;

  const rawPersons = getRecordList('persons', valueRecord['persons']);
  const rawOrganizations = getRecordList('organizations', valueRecord['organizations']);
  const rawEvents = getRecordList('events', valueRecord['events']);

  if ([...rawPersons, ...rawOrganizations, ...rawEvents].some(hasDeprecatedFullAddress)) {
    throw validationError('Filemaker payload includes unsupported fullAddress fields.');
  }

  if ([...rawPersons, ...rawOrganizations, ...rawEvents].some(hasInlineAddressFields)) {
    throw validationError('Filemaker payload includes unsupported inline address fields.');
  }

  if (rawPersons.some((entry) => normalizePhoneNumbers(entry['phoneNumbers']).length > 0)) {
    throw validationError(
      'Filemaker person payload includes unsupported inline phoneNumbers field.'
    );
  }

  if (rawOrganizations.some((entry) => normalizePhoneNumbers(entry['phoneNumbers']).length > 0)) {
    throw validationError(
      'Filemaker organization payload includes unsupported inline phoneNumbers field.'
    );
  }

  if (rawPersons.some(hasInlineEmailFields)) {
    throw validationError('Filemaker person payload includes unsupported inline email fields.');
  }

  if (rawOrganizations.some(hasInlineEmailFields)) {
    throw validationError(
      'Filemaker organization payload includes unsupported inline email fields.'
    );
  }
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
    throw validationError('Filemaker database payload version is unsupported.', {
      version: valueRecord['version'] ?? null,
    });
  }

  const rawPersons = getRecordList('persons', valueRecord['persons']);
  const rawOrganizations = getRecordList('organizations', valueRecord['organizations']);
  const rawEvents = getRecordList('events', valueRecord['events']);
  const rawAddresses = getRecordList('addresses', valueRecord['addresses']);
  const rawAddressLinks = getRecordList('addressLinks', valueRecord['addressLinks']);
  const rawPhoneNumbers = getRecordList('phoneNumbers', valueRecord['phoneNumbers']);
  const rawPhoneNumberLinks = getRecordList('phoneNumberLinks', valueRecord['phoneNumberLinks']);
  const rawEmails = getRecordList('emails', valueRecord['emails']);
  const rawEmailLinks = getRecordList('emailLinks', valueRecord['emailLinks']);
  const rawValues = getRecordList('values', valueRecord['values']);
  const rawValueParameters = getRecordList('valueParameters', valueRecord['valueParameters']);
  const rawValueParameterLinks = getRecordList(
    'valueParameterLinks',
    valueRecord['valueParameterLinks']
  );
  const rawOrganizationLegacyDemands = getRecordList(
    'organizationLegacyDemands',
    valueRecord['organizationLegacyDemands']
  );
  const rawJobListings = getRecordList('jobListings', valueRecord['jobListings']);
  const rawEventOrganizationLinks = getRecordList(
    'eventOrganizationLinks',
    valueRecord['eventOrganizationLinks']
  );

  const addressesById = new Map<string, FilemakerAddress>();
  rawAddresses.forEach((entry: Record<string, unknown>) => {
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
        countryValueId: normalizeString(entry['countryValueId']),
        countryValueLabel: normalizeString(entry['countryValueLabel']),
        createdAt: normalizeString(entry['createdAt']) || undefined,
        legacyCountryUuid: normalizeString(entry['legacyCountryUuid']),
        legacyUuid: normalizeString(entry['legacyUuid']),
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
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
        nip: normalizeString(entry['nip']),
        regon: normalizeString(entry['regon']),
        phoneNumbers: [],
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
      const legacyUuid = normalizeString(entry['legacyUuid']);
      const legacyParentUuid = normalizeString(entry['legacyParentUuid']);
      const legacyDefaultAddressUuid = normalizeString(entry['legacyDefaultAddressUuid']);
      const legacyDisplayAddressUuid = normalizeString(entry['legacyDisplayAddressUuid']);
      const legacyDefaultBankAccountUuid = normalizeString(entry['legacyDefaultBankAccountUuid']);
      const legacyDisplayBankAccountUuid = normalizeString(entry['legacyDisplayBankAccountUuid']);
      return createFilemakerOrganization({
        id,
        name: normalizeString(entry['name']),
        addressId: normalizeString(entry['addressId']),
        displayAddressId: normalizeString(entry['displayAddressId']),
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
        taxId: normalizeString(entry['taxId']),
        krs: normalizeString(entry['krs']),
        tradingName: normalizeString(entry['tradingName']),
        cooperationStatus: normalizeString(entry['cooperationStatus']),
        establishedDate: normalizeString(entry['establishedDate']),
        parentOrganizationId: normalizeString(entry['parentOrganizationId']),
        defaultBankAccountId: normalizeString(entry['defaultBankAccountId']),
        displayBankAccountId: normalizeString(entry['displayBankAccountId']),
        legacyUuid: legacyUuid.length > 0 ? legacyUuid : undefined,
        legacyParentUuid: legacyParentUuid.length > 0 ? legacyParentUuid : undefined,
        legacyDefaultAddressUuid:
          legacyDefaultAddressUuid.length > 0 ? legacyDefaultAddressUuid : undefined,
        legacyDisplayAddressUuid:
          legacyDisplayAddressUuid.length > 0 ? legacyDisplayAddressUuid : undefined,
        legacyDefaultBankAccountUuid:
          legacyDefaultBankAccountUuid.length > 0 ? legacyDefaultBankAccountUuid : undefined,
        legacyDisplayBankAccountUuid:
          legacyDisplayBankAccountUuid.length > 0 ? legacyDisplayBankAccountUuid : undefined,
        updatedBy: normalizeString(entry['updatedBy']) || undefined,
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      });
    })
    .filter((entry: FilemakerOrganization | null): entry is FilemakerOrganization =>
      Boolean(entry)
    );
  const organizationIdByLegacyUuid = new Map<string, string>(
    organizations
      .map((organization: FilemakerOrganization): [string, string] => [
        normalizeString(organization.legacyUuid),
        organization.id,
      ])
      .filter(([legacyUuid]: [string, string]): boolean => legacyUuid.length > 0)
  );

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
        street: '',
        streetNumber: '',
        city: '',
        postalCode: '',
        country: '',
        countryId: '',
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      });
    })
    .filter((entry: FilemakerEvent | null): entry is FilemakerEvent => Boolean(entry));

  const addressLinkIds = new Set<string>();
  const addressRelationKeys = new Set<string>();
  const groupedAddressLinks = new Map<string, FilemakerAddressLink[]>();

  const pushAddressLink = (input: {
    id?: unknown;
    ownerKind: unknown;
    ownerId: unknown;
    addressId: unknown;
    isDefault?: unknown;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
  }): void => {
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
      const resolvedParentOrganizationId =
        organization.parentOrganizationId ??
        organizationIdByLegacyUuid.get(organization.legacyParentUuid ?? '');
      if (!resolvedAddress) {
        return {
          ...organization,
          addressId: defaultAddressId,
          ...(resolvedParentOrganizationId !== undefined
            ? { parentOrganizationId: resolvedParentOrganizationId }
            : {}),
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
        ...(resolvedParentOrganizationId !== undefined
          ? { parentOrganizationId: resolvedParentOrganizationId }
          : {}),
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

  rawPhoneNumbers.forEach((record: Record<string, unknown>): void => {
    ensurePhoneNumberId({
      phoneNumber: record['phoneNumber'],
      id: record['id'],
      createdAt: normalizeString(record['createdAt']) || undefined,
      updatedAt: normalizeString(record['updatedAt']) || undefined,
    });
  });

  const phoneNumberLinkIds = new Set<string>();
  const phoneNumberRelationKeys = new Set<string>();
  const phoneNumberLinks: FilemakerPhoneNumberLink[] = [];

  const pushPhoneNumberLink = (input: {
    phoneNumberId: unknown;
    partyKind: unknown;
    partyId: unknown;
    id?: unknown;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
  }): void => {
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

  const emailIds = new Set<string>();
  const emailValues = new Set<string>();
  const emails: FilemakerEmail[] = [];

  rawEmails.forEach((entry: Record<string, unknown>) => {
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

  const pushEmailLink = (input: {
    emailId: unknown;
    partyKind: unknown;
    partyId: unknown;
    id?: unknown;
    createdAt?: string | null | undefined;
    updatedAt?: string | null | undefined;
  }): void => {
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

  const eventOrganizationLinkIds = new Set<string>();
  const eventOrganizationRelationKeys = new Set<string>();
  const eventOrganizationLinks: FilemakerEventOrganizationLink[] = [];

  rawEventOrganizationLinks.forEach((entry: Record<string, unknown>) => {
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

  const valueIds = new Set<string>();
  const values: FilemakerValue[] = [];
  rawValues.forEach((entry: Record<string, unknown>) => {
    const id = normalizeString(entry['id']);
    const label = normalizeString(entry['label']);
    const legacyUuid = normalizeString(entry['legacyUuid']);
    if (id.length === 0 || label.length === 0 || valueIds.has(id)) return;
    valueIds.add(id);
    values.push(
      createFilemakerValue({
        id,
        parentId: normalizeString(entry['parentId']) || null,
        label,
        value: normalizeString(entry['value']),
        description: normalizeString(entry['description']) || undefined,
        sortOrder: Number(entry['sortOrder']),
        legacyUuid: legacyUuid.length > 0 ? legacyUuid : undefined,
        legacyParentUuids: Array.isArray(entry['legacyParentUuids'])
          ? entry['legacyParentUuids']
          : [],
        legacyListUuids: Array.isArray(entry['legacyListUuids']) ? entry['legacyListUuids'] : [],
        createdBy: normalizeString(entry['createdBy']) || undefined,
        updatedBy: normalizeString(entry['updatedBy']) || undefined,
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      })
    );
  });

  const normalizedValues = values.map((value: FilemakerValue): FilemakerValue => {
    if (value.parentId === null || valueIds.has(value.parentId)) return value;
    return { ...value, parentId: null };
  });

  const valueParameterIds = new Set<string>();
  const valueParameterLegacyUuidByLabel = new Map<string, string | null>();
  const valueParameters: FilemakerValueParameter[] = [];
  rawValueParameters.forEach((entry: Record<string, unknown>) => {
    const id = normalizeString(entry['id']);
    const label = normalizeString(entry['label']);
    const normalizedLabel = label.toLowerCase();
    const legacyUuid = normalizeString(entry['legacyUuid']);
    const existingLegacyUuid = valueParameterLegacyUuidByLabel.get(normalizedLabel);
    const isDuplicateLabel =
      existingLegacyUuid !== undefined &&
      (legacyUuid.length === 0 || existingLegacyUuid === legacyUuid);
    if (
      id.length === 0 ||
      label.length === 0 ||
      valueParameterIds.has(id) ||
      isDuplicateLabel
    ) {
      return;
    }
    valueParameterIds.add(id);
    valueParameterLegacyUuidByLabel.set(
      normalizedLabel,
      legacyUuid.length > 0 ? legacyUuid : null
    );
    valueParameters.push(
      createFilemakerValueParameter({
        id,
        label,
        description: normalizeString(entry['description']) || undefined,
        legacyUuid: legacyUuid.length > 0 ? legacyUuid : undefined,
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      })
    );
  });

  const valueParameterLinkIds = new Set<string>();
  const valueParameterRelationKeys = new Set<string>();
  const valueParameterLinks: FilemakerValueParameterLink[] = [];
  rawValueParameterLinks.forEach((entry: Record<string, unknown>) => {
    const valueId = normalizeString(entry['valueId']);
    const parameterId = normalizeString(entry['parameterId']);
    const legacyValueUuid = normalizeString(entry['legacyValueUuid']);
    const legacyParameterUuid = normalizeString(entry['legacyParameterUuid']);
    if (valueId.length === 0 || parameterId.length === 0) return;
    if (!valueIds.has(valueId) || !valueParameterIds.has(parameterId)) return;

    const relationKey = `${valueId}:${parameterId}`;
    if (valueParameterRelationKeys.has(relationKey)) return;
    const baseId = defaultValueParameterLinkIdForValues(valueId, parameterId);
    const id = ensureUniqueId(
      normalizeString(entry['id']) || baseId,
      valueParameterLinkIds,
      baseId
    );
    valueParameterLinkIds.add(id);
    valueParameterRelationKeys.add(relationKey);
    valueParameterLinks.push(
      createFilemakerValueParameterLink({
        id,
        valueId,
        parameterId,
        legacyValueUuid: legacyValueUuid.length > 0 ? legacyValueUuid : undefined,
        legacyParameterUuid: legacyParameterUuid.length > 0 ? legacyParameterUuid : undefined,
        createdAt: normalizeString(entry['createdAt']) || undefined,
        updatedAt: normalizeString(entry['updatedAt']) || undefined,
      })
    );
  });

  const valueParentIdById = new Map<string, string | null>(
    normalizedValues.map((normalizedValue: FilemakerValue): [string, string | null] => [
      normalizedValue.id,
      normalizedValue.parentId ?? null,
    ])
  );
  const normalizeOrganizationLegacyDemandValueIds = (input: unknown): string[] => {
    const rawValueIds = Array.isArray(input) ? input : [];
    const normalizedValueIds: string[] = [];
    let expectedParentId: string | null = null;

    for (const rawValueId of rawValueIds.slice(0, 4)) {
      const valueId = normalizeString(rawValueId);
      if (valueId.length === 0 || !valueIds.has(valueId)) break;

      const parentId = valueParentIdById.get(valueId) ?? null;
      if (parentId !== expectedParentId) break;

      normalizedValueIds.push(valueId);
      expectedParentId = valueId;
    }

    return normalizedValueIds;
  };
  const getOrganizationLegacyDemandRawValueIds = (
    entry: Record<string, unknown>
  ): unknown[] => {
    if (Array.isArray(entry['valueIds'])) return entry['valueIds'];
    return [
      entry['level1ValueId'],
      entry['level2ValueId'],
      entry['level3ValueId'],
      entry['level4ValueId'],
    ];
  };
  const organizationLegacyDemandIds = new Set<string>();
  const organizationLegacyDemandRelationKeys = new Set<string>();
  const organizationLegacyDemands: FilemakerOrganizationLegacyDemand[] = [];
  const isKnownOrganizationId = (organizationId: string): boolean =>
    organizationId.length > 0 && organizationIds.has(organizationId);
  rawOrganizationLegacyDemands.forEach((entry: Record<string, unknown>) => {
    const organizationId = normalizeString(entry['organizationId']);
    if (!isKnownOrganizationId(organizationId)) return;

    const demandValueIds = normalizeOrganizationLegacyDemandValueIds(
      getOrganizationLegacyDemandRawValueIds(entry)
    );
    if (demandValueIds.length === 0) return;

    const relationKey = `${organizationId}:${demandValueIds.join('>')}`;
    if (organizationLegacyDemandRelationKeys.has(relationKey)) return;

    const baseId = defaultOrganizationLegacyDemandIdForValues(organizationId, demandValueIds);
    const requestedId = normalizeString(entry['id']);
    const legacyUuid = normalizeString(entry['legacyUuid']);
    const createdAt = normalizeString(entry['createdAt']);
    const updatedAt = normalizeString(entry['updatedAt']);
    const id = ensureUniqueId(
      requestedId.length > 0 ? requestedId : baseId,
      organizationLegacyDemandIds,
      baseId
    );
    organizationLegacyDemandIds.add(id);
    organizationLegacyDemandRelationKeys.add(relationKey);
    organizationLegacyDemands.push(
      createFilemakerOrganizationLegacyDemand({
        id,
        organizationId,
        valueIds: demandValueIds,
        legacyUuid: legacyUuid.length > 0 ? legacyUuid : undefined,
        createdAt: createdAt.length > 0 ? createdAt : undefined,
        updatedAt: updatedAt.length > 0 ? updatedAt : undefined,
      })
    );
  });

  const jobListingIds = new Set<string>();
  const jobListings: FilemakerJobListing[] = [];
  rawJobListings.forEach((entry: Record<string, unknown>): void => {
    const organizationId = normalizeString(entry['organizationId']);
    const title = normalizeString(entry['title']);
    if (organizationId.length === 0 || title.length === 0) return;

    const baseId = defaultJobListingIdForValues(organizationId, title);
    const requestedId = normalizeString(entry['id']);
    const lastTargetedAt = normalizeString(entry['lastTargetedAt']);
    const createdAt = normalizeString(entry['createdAt']);
    const updatedAt = normalizeString(entry['updatedAt']);
    const id = ensureUniqueId(
      requestedId.length > 0 ? requestedId : baseId,
      jobListingIds,
      baseId
    );
    jobListingIds.add(id);
    jobListings.push(
      createFilemakerJobListing({
        id,
        organizationId,
        title,
        description: normalizeString(entry['description']),
        location: normalizeString(entry['location']),
        salaryMin: entry['salaryMin'],
        salaryMax: entry['salaryMax'],
        salaryCurrency: normalizeString(entry['salaryCurrency']),
        salaryPeriod: normalizeString(entry['salaryPeriod']),
        status: normalizeString(entry['status']),
        targetedCampaignIds: entry['targetedCampaignIds'],
        lastTargetedAt: lastTargetedAt.length > 0 ? lastTargetedAt : undefined,
        createdAt: createdAt.length > 0 ? createdAt : undefined,
        updatedAt: updatedAt.length > 0 ? updatedAt : undefined,
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
    values: normalizedValues,
    valueParameters,
    valueParameterLinks,
    organizationLegacyDemands,
    jobListings,
  };
};

const stripCompatibilityFieldsForPersistence = (
  database: FilemakerDatabase
): FilemakerDatabase => ({
  ...database,
  persons: database.persons.map(
    (person: FilemakerPerson): FilemakerPerson => ({
      ...person,
      street: '',
      streetNumber: '',
      city: '',
      postalCode: '',
      country: '',
      countryId: '',
      phoneNumbers: [],
    })
  ),
  organizations: database.organizations.map(
    (organization: FilemakerOrganization): FilemakerOrganization => ({
      ...organization,
      street: '',
      streetNumber: '',
      city: '',
      postalCode: '',
      country: '',
      countryId: '',
    })
  ),
  events: database.events.map(
    (event: FilemakerEvent): FilemakerEvent => ({
      ...event,
      street: '',
      streetNumber: '',
      city: '',
      postalCode: '',
      country: '',
      countryId: '',
    })
  ),
});

export const toPersistedFilemakerDatabase = (
  value: FilemakerDatabase | null | undefined
): FilemakerDatabase => stripCompatibilityFieldsForPersistence(normalizeFilemakerDatabase(value));
