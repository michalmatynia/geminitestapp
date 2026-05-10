import { useMemo } from 'react';

import type { FilemakerDatabase, FilemakerEvent, FilemakerOrganization, FilemakerPerson } from '../types';
import { includeQuery } from './filemaker-page-utils';

export type FilemakerListData = {
  events: FilemakerEvent[];
  organizations: FilemakerOrganization[];
  persons: FilemakerPerson[];
};

export type FilemakerListCounts = {
  addresses: number;
  emails: number;
  eventLinks: number;
  events: number;
  organizations: number;
  persons: number;
};

const filterPersons = (persons: FilemakerPerson[], query: string): FilemakerPerson[] =>
  [...persons]
    .filter((person: FilemakerPerson): boolean =>
      includeQuery(
        [
          person.firstName,
          person.lastName,
          person.street,
          person.streetNumber,
          person.city,
          person.postalCode,
          person.country,
          person.countryId,
          person.nip,
          person.regon,
          person.phoneNumbers.join(' '),
        ],
        query
      )
    )
    .sort((left: FilemakerPerson, right: FilemakerPerson): number =>
      `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`)
    );

const filterOrganizations = (
  organizations: FilemakerOrganization[],
  query: string
): FilemakerOrganization[] =>
  [...organizations]
    .filter((organization: FilemakerOrganization): boolean =>
      includeQuery(
        [
          organization.name,
          organization.street,
          organization.streetNumber,
          organization.city,
          organization.postalCode,
          organization.country,
          organization.countryId,
        ],
        query
      )
    )
    .sort((left: FilemakerOrganization, right: FilemakerOrganization): number =>
      left.name.localeCompare(right.name)
    );

const filterEvents = (events: FilemakerEvent[], query: string): FilemakerEvent[] =>
  [...events]
    .filter((event: FilemakerEvent): boolean =>
      includeQuery(
        [
          event.eventName,
          event.street,
          event.streetNumber,
          event.city,
          event.postalCode,
          event.country,
          event.countryId,
        ],
        query
      )
    )
    .sort((left: FilemakerEvent, right: FilemakerEvent): number =>
      left.eventName.localeCompare(right.eventName)
    );

export function useFilemakerListData(
  database: FilemakerDatabase,
  query: string
): FilemakerListData {
  return {
    events: useMemo(() => filterEvents(database.events, query), [database.events, query]),
    organizations: useMemo(
      () => filterOrganizations(database.organizations, query),
      [database.organizations, query]
    ),
    persons: useMemo(() => filterPersons(database.persons, query), [database.persons, query]),
  };
}

export const getFilemakerListCounts = (
  database: FilemakerDatabase,
  data: FilemakerListData
): FilemakerListCounts => ({
  addresses: database.addresses.length,
  emails: database.emails.length,
  eventLinks: database.eventOrganizationLinks.length,
  events: data.events.length,
  organizations: data.organizations.length,
  persons: data.persons.length,
});
