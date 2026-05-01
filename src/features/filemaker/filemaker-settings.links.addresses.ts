import { normalizeFilemakerDatabase } from './filemaker-settings.database';
import { createFilemakerAddressLink } from './filemaker-settings.entities';
import { ensureUniqueId, normalizeString, toIdToken } from './filemaker-settings.helpers';
import type {
  FilemakerAddress,
  FilemakerAddressLink,
  FilemakerAddressOwnerKind,
  FilemakerDatabase,
} from './types';

const linkIdToken = (value: string): string => {
  const token = toIdToken(value);
  return token.length > 0 ? token : 'entry';
};

const defaultAddressLinkIdForValues = (
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string,
  addressId: string
): string => `filemaker-address-link-${linkIdToken(`${ownerKind}-${ownerId}-${addressId}`)}`;

const isAddressOwnerPresentInDatabase = (
  database: FilemakerDatabase,
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string
): boolean => {
  if (ownerKind === 'person') {
    return database.persons.some((person): boolean => person.id === ownerId);
  }
  if (ownerKind === 'organization') {
    return database.organizations.some((organization): boolean => organization.id === ownerId);
  }
  if (ownerKind === 'job_listing') {
    return database.jobListings.some((listing): boolean => listing.id === ownerId);
  }
  return database.events.some((event): boolean => event.id === ownerId);
};

const hasAddressLink = (
  links: FilemakerAddressLink[],
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string,
  addressId: string
): boolean =>
  links.some(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === ownerKind && link.ownerId === ownerId && link.addressId === addressId
  );

const createAddressLinkId = (
  database: FilemakerDatabase,
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string,
  addressId: string
): string => {
  const usedIds = new Set<string>(
    database.addressLinks.map((link: FilemakerAddressLink): string => link.id)
  );
  const baseId = defaultAddressLinkIdForValues(ownerKind, ownerId, addressId);
  return ensureUniqueId(baseId, usedIds, baseId);
};

export const setFilemakerDefaultAddressForOwner = (
  database: FilemakerDatabase,
  input: {
    ownerKind: FilemakerAddressOwnerKind;
    ownerId: string;
    addressId: string;
  }
): FilemakerDatabase => {
  const ownerId = normalizeString(input.ownerId);
  const addressId = normalizeString(input.addressId);
  if (ownerId.length === 0 || addressId.length === 0) return database;

  const hasLink = hasAddressLink(database.addressLinks, input.ownerKind, ownerId, addressId);
  if (!hasLink) return database;

  const nextLinks = database.addressLinks.map(
    (link: FilemakerAddressLink): FilemakerAddressLink => {
      if (link.ownerKind !== input.ownerKind || link.ownerId !== ownerId) return link;
      return {
        ...link,
        isDefault: link.addressId === addressId,
        updatedAt: new Date().toISOString(),
      };
    }
  );

  return normalizeFilemakerDatabase({
    ...database,
    addressLinks: nextLinks,
  });
};

const resolveExistingAddressLinkResult = (
  database: FilemakerDatabase,
  input: {
    ownerKind: FilemakerAddressOwnerKind;
    ownerId: string;
    addressId: string;
    isDefault?: boolean;
  }
): { database: FilemakerDatabase; created: boolean } => {
  if (input.isDefault !== true) return { database, created: false };
  return {
    database: setFilemakerDefaultAddressForOwner(database, input),
    created: false,
  };
};

export const linkFilemakerAddressToOwner = (
  database: FilemakerDatabase,
  input: {
    ownerKind: FilemakerAddressOwnerKind;
    ownerId: string;
    addressId: string;
    isDefault?: boolean;
  }
): { database: FilemakerDatabase; created: boolean } => {
  const ownerId = normalizeString(input.ownerId);
  const addressId = normalizeString(input.addressId);
  if (ownerId.length === 0 || addressId.length === 0) {
    return { database, created: false };
  }
  if (!isAddressOwnerPresentInDatabase(database, input.ownerKind, ownerId)) {
    return { database, created: false };
  }

  const hasAddress = database.addresses.some(
    (address: FilemakerAddress): boolean => address.id === addressId
  );
  if (!hasAddress) return { database, created: false };

  const alreadyLinked = hasAddressLink(database.addressLinks, input.ownerKind, ownerId, addressId);
  if (alreadyLinked) {
    return resolveExistingAddressLinkResult(database, { ...input, ownerId, addressId });
  }

  const hasExistingOwnerLinks = database.addressLinks.some(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === input.ownerKind && link.ownerId === ownerId
  );
  const shouldBeDefault = input.isDefault === true || !hasExistingOwnerLinks;
  const nextDatabase = normalizeFilemakerDatabase({
    ...database,
    addressLinks: [
      ...database.addressLinks,
      createFilemakerAddressLink({
        id: createAddressLinkId(database, input.ownerKind, ownerId, addressId),
        ownerKind: input.ownerKind,
        ownerId,
        addressId,
        isDefault: shouldBeDefault,
      }),
    ],
  });

  if (input.isDefault !== true) return { database: nextDatabase, created: true };
  return {
    database: setFilemakerDefaultAddressForOwner(nextDatabase, {
      ownerKind: input.ownerKind,
      ownerId,
      addressId,
    }),
    created: true,
  };
};

export const unlinkFilemakerAddressFromOwner = (
  database: FilemakerDatabase,
  input: {
    ownerKind: FilemakerAddressOwnerKind;
    ownerId: string;
    addressId: string;
  }
): FilemakerDatabase => {
  const ownerId = normalizeString(input.ownerId);
  const addressId = normalizeString(input.addressId);
  if (ownerId.length === 0 || addressId.length === 0) return database;

  const nextLinks = database.addressLinks.filter(
    (link: FilemakerAddressLink): boolean =>
      !(
        link.ownerKind === input.ownerKind &&
        link.ownerId === ownerId &&
        link.addressId === addressId
      )
  );
  if (nextLinks.length === database.addressLinks.length) return database;

  return normalizeFilemakerDatabase({
    ...database,
    addressLinks: nextLinks,
  });
};
