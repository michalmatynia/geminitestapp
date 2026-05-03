import { normalizeString } from '../filemaker-settings.helpers';
import { FILEMAKER_REFERENCE_NONE } from '../settings-constants';
import {
  buildFilemakerOrganizationReference,
  buildFilemakerPersonReference,
  resolveFilemakerOrganizationLabel,
  resolveFilemakerPersonLabel,
} from './party-getters.helpers';
import {
  type FilemakerDatabase,
  type FilemakerPerson,
  type FilemakerOrganization,
  type FilemakerPartyReference,
  type FilemakerPartyOption,
  type FilemakerPartyKind,
} from '../types';

type EncodableFilemakerPartyReference = {
  kind: FilemakerPartyKind | null | undefined;
  id: string | null | undefined;
};

const isFilemakerPartyKind = (value: string): value is FilemakerPartyKind =>
  value === 'person' || value === 'organization';

const toEncodableFilemakerPartyReference = (
  referenceOrKind: FilemakerPartyReference | FilemakerPartyKind | null | undefined,
  idArg: string | null | undefined
): EncodableFilemakerPartyReference => {
  if (referenceOrKind !== null && referenceOrKind !== undefined && typeof referenceOrKind === 'object') {
    return referenceOrKind;
  }
  return { kind: referenceOrKind, id: idArg };
};

export const getFilemakerPersonById = (
  database: FilemakerDatabase,
  personId: string | null | undefined
): FilemakerPerson | null => {
  const normalizedPersonId = normalizeString(personId);
  if (normalizedPersonId.length === 0) return null;
  return (
    database.persons.find((person: FilemakerPerson) => person.id === normalizedPersonId) ?? null
  );
};

export const getFilemakerOrganizationById = (
  database: FilemakerDatabase,
  organizationId: string | null | undefined
): FilemakerOrganization | null => {
  const normalizedOrganizationId = normalizeString(organizationId);
  if (normalizedOrganizationId.length === 0) return null;
  return (
    database.organizations.find(
      (organization: FilemakerOrganization) => organization.id === normalizedOrganizationId
    ) ?? null
  );
};

export const getFilemakerPartyReference = (
  database: FilemakerDatabase,
  kind: 'person' | 'organization' | null | undefined,
  id: string | null | undefined
): FilemakerPartyReference | null => {
  const normalizedId = normalizeString(id);
  if (normalizedId.length === 0) return null;
  if (kind === 'person') {
    const person = getFilemakerPersonById(database, normalizedId);
    if (!person) return null;
    return buildFilemakerPersonReference(person);
  }
  if (kind === 'organization') {
    const organization = getFilemakerOrganizationById(database, normalizedId);
    if (!organization) return null;
    return buildFilemakerOrganizationReference(organization);
  }
  return null;
};

export const encodeFilemakerPartyReference = (
  referenceOrKind: FilemakerPartyReference | FilemakerPartyKind | null | undefined,
  idArg?: string | null | undefined
): string => {
  const reference = toEncodableFilemakerPartyReference(referenceOrKind, idArg);
  const kind = reference.kind;
  const id = reference.id;
  const normalizedKind = normalizeString(kind);
  const normalizedId = normalizeString(id);
  if (normalizedKind.length === 0 || normalizedId.length === 0) return FILEMAKER_REFERENCE_NONE;
  return `${normalizedKind}:${normalizedId}`;
};

export const decodeFilemakerPartyReference = (
  value: string | null | undefined
): FilemakerPartyReference | null => {
  const normalizedValue = normalizeString(value);
  if (normalizedValue.length === 0 || normalizedValue === FILEMAKER_REFERENCE_NONE) return null;
  const delimiterIndex = normalizedValue.indexOf(':');
  if (delimiterIndex < 0) return null;
  const kind = normalizedValue.slice(0, delimiterIndex);
  if (!isFilemakerPartyKind(kind)) return null;
  const id = normalizedValue.slice(delimiterIndex + 1);
  if (id.length === 0) return null;
  return { kind, id, name: id };
};

export const resolveFilemakerPartyReference = (
  database: FilemakerDatabase,
  value: string | null | undefined
): FilemakerPartyReference | null => {
  const decoded = decodeFilemakerPartyReference(value);
  if (!decoded) return null;
  return getFilemakerPartyReference(database, decoded.kind, decoded.id);
};

export const listFilemakerPartyOptions = (database: FilemakerDatabase): FilemakerPartyOption[] => {
  const options: FilemakerPartyOption[] = [];

  database.persons.forEach((person: FilemakerPerson) => {
    options.push({
      value: encodeFilemakerPartyReference('person', person.id),
      label: resolveFilemakerPersonLabel(person),
      kind: 'person',
    });
  });

  database.organizations.forEach((organization: FilemakerOrganization) => {
    options.push({
      value: encodeFilemakerPartyReference('organization', organization.id),
      label: resolveFilemakerOrganizationLabel(organization),
      kind: 'organization',
    });
  });

  return options.sort((left, right) => left.label.localeCompare(right.label));
};

export const buildFilemakerPartyOptions = listFilemakerPartyOptions;

export const resolveFilemakerPartyLabel = (
  database: FilemakerDatabase,
  reference: { kind: 'person' | 'organization'; id: string } | null | undefined
): string => {
  if (!reference) return '';
  if (reference.kind === 'person') {
    const person = getFilemakerPersonById(database, reference.id);
    if (!person) return reference.id;
    return resolveFilemakerPersonLabel(person);
  }
  const organization = getFilemakerOrganizationById(database, reference.id);
  if (!organization) return reference.id;
  return resolveFilemakerOrganizationLabel(organization);
};
