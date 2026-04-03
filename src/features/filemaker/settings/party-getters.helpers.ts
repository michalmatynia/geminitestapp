import type {
  FilemakerOrganization,
  FilemakerPartyReference,
  FilemakerPerson,
} from '../types';

export const resolveFilemakerPersonLabel = (person: FilemakerPerson): string => {
  const label = [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
  return label || person.id;
};

export const resolveFilemakerOrganizationLabel = (
  organization: FilemakerOrganization
): string => organization.name || organization.id;

export const buildFilemakerPersonReference = (
  person: FilemakerPerson
): FilemakerPartyReference => ({
  kind: 'person',
  id: person.id,
  name: resolveFilemakerPersonLabel(person),
});

export const buildFilemakerOrganizationReference = (
  organization: FilemakerOrganization
): FilemakerPartyReference => ({
  kind: 'organization',
  id: organization.id,
  name: resolveFilemakerOrganizationLabel(organization),
});
