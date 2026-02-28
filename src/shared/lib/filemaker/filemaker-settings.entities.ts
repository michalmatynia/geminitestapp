import {
  type FilemakerAddress,
  type FilemakerAddressLink,
  type FilemakerAddressOwnerKind,
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
import { normalizePhoneNumbers, normalizeString } from './filemaker-settings.helpers';

export type FilemakerAddressFields = {
  street: string;
  streetNumber: string;
  city: string;
  postalCode: string;
  country: string;
  countryId: string;
};

export const normalizeAddressFields = (value: {
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

export const createFilemakerAddressLink = (input: {
  id: string;
  ownerKind: unknown;
  ownerId: unknown;
  addressId: unknown;
  isDefault?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerAddressLink => {
  const now = new Date().toISOString();
  const rawOwnerKind = normalizeString(input.ownerKind).toLowerCase();
  const ownerKind: FilemakerAddressOwnerKind =
    rawOwnerKind === 'person' || rawOwnerKind === 'organization' || rawOwnerKind === 'event'
      ? rawOwnerKind
      : 'person';
  return {
    id: normalizeString(input.id),
    ownerKind,
    ownerId: normalizeString(input.ownerId),
    addressId: normalizeString(input.addressId),
    isDefault: Boolean(input.isDefault),
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

export const createFilemakerEvent = (input: {
  id: string;
  eventName: unknown;
  addressId?: unknown;
  street?: unknown;
  streetNumber?: unknown;
  city?: unknown;
  postalCode?: unknown;
  country?: unknown;
  countryId?: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEvent => {
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
    eventName: normalizeString(input.eventName),
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

export const createFilemakerPhoneNumber = (input: {
  id: string;
  phoneNumber: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerPhoneNumber => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    phoneNumber: normalizeString(input.phoneNumber),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerPhoneNumberLink = (input: {
  id: string;
  phoneNumberId: unknown;
  partyKind: unknown;
  partyId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerPhoneNumberLink => {
  const now = new Date().toISOString();
  const rawPartyKind = normalizeString(input.partyKind).toLowerCase();
  const partyKind: FilemakerPartyKind = rawPartyKind === 'organization' ? 'organization' : 'person';
  return {
    id: normalizeString(input.id),
    phoneNumberId: normalizeString(input.phoneNumberId),
    partyKind,
    partyId: normalizeString(input.partyId),
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
    email: normalizeString(input.email).toLowerCase(),
    status: (normalizeString(input.status).toLowerCase() ||
      'unverified') as FilemakerEmail['status'],
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
  const partyKind: FilemakerPartyKind = rawPartyKind === 'organization' ? 'organization' : 'person';

  return {
    id: normalizeString(input.id),
    emailId: normalizeString(input.emailId),
    partyKind,
    partyId: normalizeString(input.partyId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createFilemakerEventOrganizationLink = (input: {
  id: string;
  eventId: unknown;
  organizationId: unknown;
  createdAt?: string | null | undefined;
  updatedAt?: string | null | undefined;
}): FilemakerEventOrganizationLink => {
  const now = new Date().toISOString();
  return {
    id: normalizeString(input.id),
    eventId: normalizeString(input.eventId),
    organizationId: normalizeString(input.organizationId),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};
