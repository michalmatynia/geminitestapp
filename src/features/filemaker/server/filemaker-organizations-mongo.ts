import 'server-only';

import type { Collection, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { createFilemakerAddress, createFilemakerOrganization } from '../filemaker-settings.entities';
import type { FilemakerAddress, FilemakerOrganization } from '../types';

const FILEMAKER_ORGANIZATIONS_COLLECTION = 'filemaker_organizations';
const FILEMAKER_ADDRESSES_COLLECTION = 'filemaker_addresses';
const FILEMAKER_ADDRESS_LINKS_COLLECTION = 'filemaker_address_links';

export type FilemakerOrganizationMongoDocument = Document & {
  _id: string;
  addressId?: string;
  city?: string;
  cooperationStatus?: string;
  country?: string;
  countryId?: string;
  createdAt?: string;
  defaultBankAccountId?: string;
  displayAddressId?: string | null;
  displayBankAccountId?: string | null;
  establishedDate?: string | null;
  id: string;
  krs?: string;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyParentUuid?: string;
  legacyUuid?: string;
  name: string;
  parentOrganizationId?: string | null;
  postalCode?: string;
  street?: string;
  streetNumber?: string;
  taxId?: string;
  tradingName?: string;
  updatedAt?: string;
  updatedBy?: string;
};

type FilemakerAddressMongoDocument = Document & {
  _id: string;
  city?: string;
  country?: string;
  countryValueId?: string;
  countryId?: string;
  countryValueLabel?: string;
  createdAt?: string;
  id: string;
  legacyCountryUuid?: string;
  legacyUuid?: string;
  postalCode?: string;
  street?: string;
  streetNumber?: string;
  updatedAt?: string;
};

type FilemakerAddressLinkMongoDocument = Document & {
  addressId: string;
  isDefault?: boolean;
  isDisplay?: boolean;
  ownerId: string;
  ownerKind: 'organization';
};

const optionalMetadataString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

export const getFilemakerOrganizationsCollection = async (): Promise<
  Collection<FilemakerOrganizationMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerOrganizationMongoDocument>(FILEMAKER_ORGANIZATIONS_COLLECTION);
};

export const toFilemakerOrganization = (
  document: FilemakerOrganizationMongoDocument
): FilemakerOrganization =>
  createFilemakerOrganization({
    id: document.id,
    name: document.name,
    addressId: document.addressId,
    street: document.street,
    streetNumber: document.streetNumber,
    city: document.city,
    postalCode: document.postalCode,
    country: document.country,
    countryId: document.countryId,
    taxId: document.taxId,
    krs: document.krs,
    tradingName: document.tradingName,
    cooperationStatus: document.cooperationStatus,
    establishedDate: document.establishedDate,
    parentOrganizationId: document.parentOrganizationId,
    defaultBankAccountId: document.defaultBankAccountId,
    displayAddressId: document.displayAddressId,
    displayBankAccountId: document.displayBankAccountId,
    legacyUuid: document.legacyUuid,
    legacyParentUuid: document.legacyParentUuid,
    legacyDefaultAddressUuid: document.legacyDefaultAddressUuid,
    legacyDisplayAddressUuid: document.legacyDisplayAddressUuid,
    legacyDefaultBankAccountUuid: document.legacyDefaultBankAccountUuid,
    legacyDisplayBankAccountUuid: document.legacyDisplayBankAccountUuid,
    updatedBy: document.updatedBy,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });

const toFilemakerAddress = (document: FilemakerAddressMongoDocument): FilemakerAddress => {
  const countryValueId = optionalMetadataString(document.countryValueId);
  const countryValueLabel = optionalMetadataString(document.countryValueLabel);
  const legacyCountryUuid = optionalMetadataString(document.legacyCountryUuid);
  const legacyUuid = optionalMetadataString(document.legacyUuid);
  return {
    ...createFilemakerAddress({
      id: document.id,
      street: document.street,
      streetNumber: document.streetNumber,
      city: document.city,
      postalCode: document.postalCode,
      country: document.country ?? document.countryValueLabel,
      countryId: document.countryId,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }),
    ...(countryValueId !== undefined ? { countryValueId } : {}),
    ...(countryValueLabel !== undefined ? { countryValueLabel } : {}),
    ...(legacyCountryUuid !== undefined ? { legacyCountryUuid } : {}),
    ...(legacyUuid !== undefined ? { legacyUuid } : {}),
  };
};

export const listMongoFilemakerAddressesForOrganization = async (
  organization: FilemakerOrganization
): Promise<FilemakerAddress[]> => {
  const db = await getMongoDb();
  const links = await db
    .collection<FilemakerAddressLinkMongoDocument>(FILEMAKER_ADDRESS_LINKS_COLLECTION)
    .find({ ownerKind: 'organization', ownerId: organization.id })
    .sort({ isDefault: -1, isDisplay: -1, addressId: 1 })
    .toArray();
  const addressIds = Array.from(new Set(links.map((link) => link.addressId).filter(Boolean)));
  if (addressIds.length === 0) return [];
  const addresses = await db
    .collection<FilemakerAddressMongoDocument>(FILEMAKER_ADDRESSES_COLLECTION)
    .find({ id: { $in: addressIds } })
    .toArray();
  const addressById = new Map(addresses.map((address) => [address.id, address]));
  return links
    .map((link) => addressById.get(link.addressId))
    .filter((address): address is FilemakerAddressMongoDocument => address !== undefined)
    .map(toFilemakerAddress);
};
