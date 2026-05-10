import 'server-only';

import type { Collection, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { createFilemakerOrganization } from '../filemaker-settings.entities';
import type { FilemakerOrganization } from '../types';

const FILEMAKER_ORGANIZATIONS_COLLECTION = 'filemaker_organizations';

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
  jobBoardCompanyProfile?: string;
  jobBoardCompanyProfileScrapedAt?: string | null;
  jobBoardCompanyProfileUrl?: string;
  jobBoardCompanyAddress?: string;
  jobBoardCompanyRegion?: string;
  jobBoardCompanyWebsiteUrl?: string;
  jobBoardCompanyEmail?: string;
  jobBoardCompanyPhone?: string;
  jobBoardCompanyIndustry?: string;
  jobBoardCompanySize?: string;
  jobBoardCompanyLogoUrl?: string;
  jobBoardScrapedAt?: string | null;
  jobBoardSourceLabel?: string;
  jobBoardSourceSite?: string;
  jobBoardSourceUrl?: string;
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
  regon?: string;
  street?: string;
  streetNumber?: string;
  taxId?: string;
  tradingName?: string;
  updatedAt?: string;
  updatedBy?: string;
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
    regon: document.regon,
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
    jobBoardCompanyProfile: document.jobBoardCompanyProfile,
    jobBoardCompanyProfileUrl: document.jobBoardCompanyProfileUrl,
    jobBoardCompanyProfileScrapedAt: document.jobBoardCompanyProfileScrapedAt,
    jobBoardCompanyAddress: document.jobBoardCompanyAddress,
    jobBoardCompanyRegion: document.jobBoardCompanyRegion,
    jobBoardCompanyWebsiteUrl: document.jobBoardCompanyWebsiteUrl,
    jobBoardCompanyEmail: document.jobBoardCompanyEmail,
    jobBoardCompanyPhone: document.jobBoardCompanyPhone,
    jobBoardCompanyIndustry: document.jobBoardCompanyIndustry,
    jobBoardCompanySize: document.jobBoardCompanySize,
    jobBoardCompanyLogoUrl: document.jobBoardCompanyLogoUrl,
    jobBoardScrapedAt: document.jobBoardScrapedAt,
    jobBoardSourceLabel: document.jobBoardSourceLabel,
    jobBoardSourceSite: document.jobBoardSourceSite,
    jobBoardSourceUrl: document.jobBoardSourceUrl,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  });

export {
  listMongoFilemakerAddressesForOrganization,
  listMongoFilemakerAddressesForOwner,
  toFilemakerAddress,
  updateMongoFilemakerAddressesForOrganization,
  updateMongoFilemakerAddressesForOwner,
  type FilemakerAddressMongoDocument,
  type MongoFilemakerAddressPatch,
  type MongoFilemakerOrganizationAddressPatch,
} from './filemaker-addresses-mongo';
