import { normalizeString } from '../filemaker-settings.helpers';
import { FILEMAKER_REFERENCE_NONE } from '../settings-constants';
import {
  FilemakerDatabase,
  FilemakerPerson,
  FilemakerOrganization,
  FilemakerPartyReference,
  FilemakerPartyOption,
  FilemakerPartyKind,
} from '../types';

export const getFilemakerPersonById = (
  database: FilemakerDatabase,
  personId: string | null | undefined
): FilemakerPerson | null => {
  const normalizedPersonId = normalizeString(personId);
  if (!normalizedPersonId) return null;
  return (
    database.persons.find((person: FilemakerPerson) => person.id === normalizedPersonId) ?? null
  );
};

export const getFilemakerOrganizationById = (
  database: FilemakerDatabase,
  organizationId: string | null | undefined
): FilemakerOrganization | null => {
  const normalizedOrganizationId = normalizeString(organizationId);
  if (!normalizedOrganizationId) return null;
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
  if (!normalizedId) return null;
  if (kind === 'person') {
    const person = getFilemakerPersonById(database, normalizedId);
    if (!person) return null;
    const label = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return {
      kind: 'person',
      id: person.id,
      name: label || person.id,
    };
  }
  if (kind === 'organization') {
    const organization = getFilemakerOrganizationById(database, normalizedId);
    if (!organization) return null;
    return {
      kind: 'organization',
      id: organization.id,
      name: organization.name || organization.id,
    };
  }
  return null;
};

export const encodeFilemakerPartyReference = (
  referenceOrKind: FilemakerPartyReference | FilemakerPartyKind | null | undefined,
  idArg?: string | null | undefined
): string => {
  const reference =
    referenceOrKind && typeof referenceOrKind === 'object'
      ? referenceOrKind
      : ({ kind: referenceOrKind, id: idArg } as {
          kind: FilemakerPartyKind | null | undefined;
          id: string | null | undefined;
        });
  const kind = reference?.kind;
  const id = reference?.id;
  const normalizedKind = normalizeString(kind);
  const normalizedId = normalizeString(id);
  if (!normalizedKind || !normalizedId) return FILEMAKER_REFERENCE_NONE;
  return `${normalizedKind}:${normalizedId}`;
};

export const decodeFilemakerPartyReference = (
  value: string | null | undefined
): FilemakerPartyReference | null => {
  const normalizedValue = normalizeString(value);
  if (!normalizedValue || normalizedValue === FILEMAKER_REFERENCE_NONE) return null;
  const delimiterIndex = normalizedValue.indexOf(':');
  if (delimiterIndex < 0) return null;
  const kind = normalizedValue.slice(0, delimiterIndex) as 'person' | 'organization';
  const id = normalizedValue.slice(delimiterIndex + 1);
  if (!id) return null;
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
    const name = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    options.push({
      value: encodeFilemakerPartyReference('person', person.id),
      label: name || person.id,
      kind: 'person',
    });
  });

  database.organizations.forEach((organization: FilemakerOrganization) => {
    options.push({
      value: encodeFilemakerPartyReference('organization', organization.id),
      label: organization.name || organization.id,
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
    const label = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
    return label || person.id;
  }
  const organization = getFilemakerOrganizationById(database, reference.id);
  if (!organization) return reference.id;
  return organization.name || organization.id;
};
