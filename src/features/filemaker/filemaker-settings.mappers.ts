import type {
  FilemakerAddress,
  FilemakerEmail,
  FilemakerEvent,
  FilemakerOrganization,
  FilemakerPhoneNumber,
  FilemakerPerson,
} from './types';
import { normalizeString } from './filemaker-settings.helpers';

export const createDefaultFilemakerPerson = (id: string, name?: string): FilemakerPerson => {
  const now = new Date().toISOString();
  return {
    id,
    firstName: normalizeString(name),
    lastName: '',
    addressId: '',
    street: '',
    streetNumber: '',
    city: '',
    postalCode: '',
    country: '',
    countryId: '',
    nip: '',
    regon: '',
    phoneNumbers: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerOrganization = (id: string, name?: string): FilemakerOrganization => {
  const now = new Date().toISOString();
  return {
    id,
    name: normalizeString(name),
    addressId: '',
    street: '',
    streetNumber: '',
    city: '',
    postalCode: '',
    country: '',
    countryId: '',
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerAddress = (id: string): FilemakerAddress => {
  const now = new Date().toISOString();
  return {
    id,
    street: '',
    streetNumber: '',
    city: '',
    postalCode: '',
    country: '',
    countryId: '',
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerEmail = (email: string): FilemakerEmail => {
  const now = new Date().toISOString();
  return {
    id: `email-${Math.random().toString(36).substr(2, 9)}`,
    email: email.trim().toLowerCase(),
    status: 'unverified',
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerPhoneNumber = (phoneNumber: string): FilemakerPhoneNumber => {
  const now = new Date().toISOString();
  return {
    id: `phone-${Math.random().toString(36).substr(2, 9)}`,
    phoneNumber: phoneNumber.trim(),
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerEvent = (id: string, title?: string): FilemakerEvent => {
  const now = new Date().toISOString();
  return {
    id,
    eventName: normalizeString(title),
    addressId: '',
    street: '',
    streetNumber: '',
    city: '',
    postalCode: '',
    country: '',
    countryId: '',
    createdAt: now,
    updatedAt: now,
  };
};
