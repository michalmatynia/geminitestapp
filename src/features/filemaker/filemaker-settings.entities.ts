import {
  type FilemakerAddressLink,
  type FilemakerAddressOwnerKind,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEvent,
  type FilemakerEventOrganizationLink,
  type FilemakerPartyKind,
  type FilemakerPhoneNumber,
  type FilemakerPhoneNumberLink,
} from './types';
import {
  normalizeAddressFields,
} from '@/shared/lib/filemaker/entity-builders';
import { normalizeString } from './filemaker-settings.helpers';

export {
  createFilemakerAddress,
  createFilemakerOrganization,
  createFilemakerPerson,
  formatFilemakerAddress,
} from '@/shared/lib/filemaker/entity-builders';

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
