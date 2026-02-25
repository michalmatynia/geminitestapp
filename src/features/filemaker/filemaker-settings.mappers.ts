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
    name: normalizeString(name),
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerOrganization = (id: string, name?: string): FilemakerOrganization => {
  const now = new Date().toISOString();
  return {
    id,
    name: normalizeString(name),
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerAddress = (id: string): FilemakerAddress => {
  const now = new Date().toISOString();
  return {
    id,
    rawAddress: '',
    street: null,
    city: null,
    postalCode: null,
    country: null,
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerEmail = (email: string): FilemakerEmail => {
  const now = new Date().toISOString();
  return {
    email: email.trim().toLowerCase(),
    status: 'unverified',
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerPhoneNumber = (phoneNumber: string): FilemakerPhoneNumber => {
  const now = new Date().toISOString();
  return {
    phoneNumber: phoneNumber.trim(),
    isValid: true,
    createdAt: now,
    updatedAt: now,
  };
};

export const createDefaultFilemakerEvent = (id: string, title?: string): FilemakerEvent => {
  const now = new Date().toISOString();
  return {
    id,
    title: normalizeString(title),
    eventDate: null,
    createdAt: now,
    updatedAt: now,
  };
};
