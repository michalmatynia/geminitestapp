import 'server-only';

import type { Collection, Db, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { createFilemakerAddress, createFilemakerOrganization } from '../filemaker-settings.entities';
import type {
  FilemakerAddress,
  FilemakerAddressOwnerKind,
  FilemakerOrganization,
} from '../types';

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

export type FilemakerAddressMongoDocument = Document & {
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

export type MongoFilemakerOrganizationAddressPatch = {
  addressId: string;
  city: string;
  country?: string;
  countryId?: string;
  countryValueId?: string;
  countryValueLabel?: string;
  isDefault: boolean;
  legacyCountryUuid?: string;
  legacyUuid?: string;
  postalCode: string;
  street: string;
  streetNumber: string;
};

type FilemakerAddressLinkMongoDocument = Document & {
  addressId: string;
  isDefault?: boolean;
  isDisplay?: boolean;
  ownerId: string;
  ownerKind: FilemakerAddressOwnerKind;
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

export const toFilemakerAddress = (document: FilemakerAddressMongoDocument): FilemakerAddress => {
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

const toAddressSetFields = (
  address: MongoFilemakerOrganizationAddressPatch,
  now: string
): Partial<FilemakerAddressMongoDocument> => {
  const countryValueId = optionalMetadataString(address.countryValueId);
  const countryValueLabel = optionalMetadataString(address.countryValueLabel);
  const legacyCountryUuid = optionalMetadataString(address.legacyCountryUuid);
  const legacyUuid = optionalMetadataString(address.legacyUuid);
  return {
    city: address.city,
    country: address.country ?? '',
    countryId: address.countryId ?? '',
    ...(countryValueId !== undefined ? { countryValueId } : {}),
    ...(countryValueLabel !== undefined ? { countryValueLabel } : {}),
    ...(legacyCountryUuid !== undefined ? { legacyCountryUuid } : {}),
    ...(legacyUuid !== undefined ? { legacyUuid } : {}),
    postalCode: address.postalCode,
    street: address.street,
    streetNumber: address.streetNumber,
    updatedAt: now,
  };
};

const normalizeAddressPatches = (
  addresses: MongoFilemakerOrganizationAddressPatch[]
): MongoFilemakerOrganizationAddressPatch[] =>
  addresses.filter(
    (address: MongoFilemakerOrganizationAddressPatch): boolean =>
      address.addressId.trim().length > 0
  );

const upsertMongoFilemakerAddresses = async (
  db: Db,
  addresses: MongoFilemakerOrganizationAddressPatch[],
  now: string
): Promise<void> => {
  if (addresses.length === 0) return;
  await db.collection<FilemakerAddressMongoDocument>(FILEMAKER_ADDRESSES_COLLECTION).bulkWrite(
    addresses.map((address: MongoFilemakerOrganizationAddressPatch) => ({
      updateOne: {
        filter: { id: address.addressId },
        update: {
          $set: {
            ...toAddressSetFields(address, now),
            id: address.addressId,
          },
          $setOnInsert: {
            _id: address.addressId,
            createdAt: now,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
};

const deleteUnlinkedMongoFilemakerAddressLinks = async (
  db: Db,
  organizationId: string,
  addressIds: string[]
): Promise<void> => {
  await db.collection<FilemakerAddressLinkMongoDocument>(FILEMAKER_ADDRESS_LINKS_COLLECTION)
    .deleteMany({
      ownerKind: 'organization',
      ownerId: organizationId,
      ...(addressIds.length > 0 ? { addressId: { $nin: addressIds } } : {}),
    });
};

const upsertMongoFilemakerAddressLinks = async (
  db: Db,
  organizationId: string,
  addresses: MongoFilemakerOrganizationAddressPatch[]
): Promise<void> => {
  if (addresses.length === 0) return;
  await db.collection<FilemakerAddressLinkMongoDocument>(FILEMAKER_ADDRESS_LINKS_COLLECTION)
    .bulkWrite(
      addresses.map((address: MongoFilemakerOrganizationAddressPatch) => ({
        updateOne: {
          filter: {
            ownerKind: 'organization',
            ownerId: organizationId,
            addressId: address.addressId,
          },
          update: {
            $set: {
              addressId: address.addressId,
              isDefault: address.isDefault,
              ownerId: organizationId,
              ownerKind: 'organization',
            },
          },
          upsert: true,
        },
      })),
      { ordered: false }
    );
};

export const updateMongoFilemakerAddressesForOrganization = async (
  organization: FilemakerOrganization,
  addresses: MongoFilemakerOrganizationAddressPatch[]
): Promise<FilemakerAddress[]> => {
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const normalizedAddresses = normalizeAddressPatches(addresses);
  const addressIds = normalizedAddresses.map(
    (address: MongoFilemakerOrganizationAddressPatch): string => address.addressId
  );

  await upsertMongoFilemakerAddresses(db, normalizedAddresses, now);
  await deleteUnlinkedMongoFilemakerAddressLinks(db, organization.id, addressIds);
  await upsertMongoFilemakerAddressLinks(db, organization.id, normalizedAddresses);

  return listMongoFilemakerAddressesForOrganization(organization);
};

export const listMongoFilemakerAddressesForOwner = async (
  ownerKind: FilemakerAddressOwnerKind,
  ownerId: string
): Promise<FilemakerAddress[]> => {
  const db = await getMongoDb();
  const links = await db
    .collection<FilemakerAddressLinkMongoDocument>(FILEMAKER_ADDRESS_LINKS_COLLECTION)
    .find({ ownerKind, ownerId })
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

export const listMongoFilemakerAddressesForOrganization = async (
  organization: FilemakerOrganization
): Promise<FilemakerAddress[]> =>
  listMongoFilemakerAddressesForOwner('organization', organization.id);
