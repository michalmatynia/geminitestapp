import 'server-only';

import type { FilemakerJobBoardScrapedOffer } from '../../filemaker-job-board-scrape-contracts';
import { normalizeString } from '../../filemaker-settings.helpers';
import {
  createFilemakerAddress,
  createFilemakerAddressLink,
  createFilemakerJobListing,
} from '../../settings';
import type {
  FilemakerAddress,
  FilemakerAddressLink,
  FilemakerDatabase,
  FilemakerJobListing,
} from '../../types';

import {
  addressComparisonKey,
  buildJobBoardAddressId,
  buildJobBoardAddressLinkId,
  findOfferAddressValue,
  parseScrapedAddressPill,
} from './address';
import { listingAddressFieldsEqual } from './dedupe-listings';

export type AddressApplyResult = {
  address: FilemakerAddress | null;
  assignedDefault: boolean;
  changed: boolean;
};

export const ensureAddressRecord = (
  database: FilemakerDatabase,
  ownerId: string,
  parsedAddress: Pick<
    FilemakerAddress,
    'city' | 'country' | 'countryId' | 'postalCode' | 'street' | 'streetNumber'
  >
): { address: FilemakerAddress; created: boolean } => {
  const comparisonKey = addressComparisonKey(parsedAddress);
  const existing = database.addresses.find(
    (address: FilemakerAddress): boolean => addressComparisonKey(address) === comparisonKey
  );
  if (existing !== undefined) return { address: existing, created: false };
  const address = createFilemakerAddress({
    id: buildJobBoardAddressId(ownerId, parsedAddress),
    ...parsedAddress,
  });
  database.addresses.push(address);
  return { address, created: true };
};

export const ensureAddressLink = (
  database: FilemakerDatabase,
  ownerKind: FilemakerAddressLink['ownerKind'],
  ownerId: string,
  addressId: string,
  isDefault: boolean
): boolean => {
  const existingIndex = database.addressLinks.findIndex(
    (link: FilemakerAddressLink): boolean =>
      link.ownerKind === ownerKind &&
      link.ownerId === ownerId &&
      link.addressId === addressId
  );
  if (existingIndex >= 0) {
    const existing = database.addressLinks[existingIndex];
    if (existing === undefined || !isDefault || existing.isDefault) return false;
    database.addressLinks.splice(existingIndex, 1, {
      ...existing,
      isDefault: true,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }
  database.addressLinks.push(
    createFilemakerAddressLink({
      id: buildJobBoardAddressLinkId(ownerKind, ownerId, addressId),
      ownerKind,
      ownerId,
      addressId,
      isDefault,
    })
  );
  return true;
};

export const applyOfferAddressToDatabaseJobListing = (
  database: FilemakerDatabase,
  listingId: string,
  offer: FilemakerJobBoardScrapedOffer
): AddressApplyResult => {
  const addressValue = findOfferAddressValue(offer);
  if (addressValue === null) return { address: null, assignedDefault: false, changed: false };
  const parsedAddress = parseScrapedAddressPill(addressValue);
  if (parsedAddress === null) return { address: null, assignedDefault: false, changed: false };
  const listingIndex = database.jobListings.findIndex(
    (listing: FilemakerJobListing): boolean => listing.id === listingId
  );
  if (listingIndex < 0) return { address: null, assignedDefault: false, changed: false };
  const listing = database.jobListings[listingIndex];
  if (listing === undefined) return { address: null, assignedDefault: false, changed: false };
  const addressRecord = ensureAddressRecord(database, listingId, parsedAddress);
  const shouldSetDefaultAddress = normalizeString(listing.addressId).length === 0;
  const linkChanged = ensureAddressLink(
    database,
    'job_listing',
    listingId,
    addressRecord.address.id,
    shouldSetDefaultAddress
  );
  let listingChanged = false;
  if (shouldSetDefaultAddress) {
    const nextListing = {
      ...createFilemakerJobListing({
        ...listing,
        addressId: addressRecord.address.id,
        city: addressRecord.address.city,
        country: addressRecord.address.country,
        countryId: addressRecord.address.countryId,
        postalCode: addressRecord.address.postalCode,
        street: addressRecord.address.street,
        streetNumber: addressRecord.address.streetNumber,
        updatedAt: new Date().toISOString(),
      }),
      postalCode: addressRecord.address.postalCode,
    };
    listingChanged = !listingAddressFieldsEqual(listing, nextListing);
    if (listingChanged) {
      database.jobListings.splice(listingIndex, 1, nextListing);
    }
  }
  return {
    address: addressRecord.address,
    assignedDefault: shouldSetDefaultAddress,
    changed: addressRecord.created || linkChanged || listingChanged,
  };
};
