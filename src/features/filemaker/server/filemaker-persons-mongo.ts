import 'server-only';

import type { Collection, Document } from 'mongodb';

import { createFilemakerPerson } from '../filemaker-settings.entities';
import type { FilemakerPerson } from '../types';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

export const FILEMAKER_PERSONS_COLLECTION = 'filemaker_persons';
export const FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION =
  'filemaker_person_organization_links';

export type MongoFilemakerPersonOrganizationLink = {
  id: string;
  legacyOrganizationUuid: string;
  organizationId?: string;
  organizationName?: string;
};

export type MongoFilemakerPerson = FilemakerPerson & {
  checked1?: boolean;
  checked2?: boolean;
  dateOfBirth?: string;
  fullName: string;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyOrganizationUuids: string[];
  legacyParentUuid?: string;
  legacyUuid?: string;
  linkedOrganizations: MongoFilemakerPersonOrganizationLink[];
  organizationLinkCount: number;
  unresolvedOrganizationLinkCount: number;
  updatedBy?: string;
};

export type FilemakerPersonMongoDocument = Document & {
  _id: string;
  addressId?: string;
  checked1?: boolean;
  checked2?: boolean;
  city?: string;
  country?: string;
  countryId?: string;
  createdAt?: string;
  dateOfBirth?: string;
  displayAddressId?: string | null;
  firstName: string;
  fullName?: string;
  id: string;
  lastName: string;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyOrganizationUuids?: string[];
  legacyParentUuid?: string;
  legacyUuid?: string;
  postalCode?: string;
  street?: string;
  streetNumber?: string;
  updatedAt?: string;
  updatedBy?: string;
};

export type FilemakerPersonOrganizationLinkMongoDocument = Document & {
  _id: string;
  id: string;
  legacyOrganizationUuid: string;
  legacyPersonUuid: string;
  organizationId?: string;
  organizationName?: string;
  personId: string;
  personName: string;
};

type PersonWithLinksDocument = FilemakerPersonMongoDocument & {
  organizationLinks?: FilemakerPersonOrganizationLinkMongoDocument[];
};

const optionalMetadataString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

const buildFullName = (document: FilemakerPersonMongoDocument): string => {
  const fullName = document.fullName?.trim() ?? '';
  if (fullName.length > 0) return fullName;
  const name = [document.firstName, document.lastName]
    .map((part: string): string => part.trim())
    .filter((part: string): boolean => part.length > 0)
    .join(' ');
  return name.length > 0 ? name : document.id;
};

export const getFilemakerPersonsCollection = async (): Promise<
  Collection<FilemakerPersonMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerPersonMongoDocument>(FILEMAKER_PERSONS_COLLECTION);
};

const toOrganizationLink = (
  link: FilemakerPersonOrganizationLinkMongoDocument
): MongoFilemakerPersonOrganizationLink => ({
  id: link.id,
  legacyOrganizationUuid: link.legacyOrganizationUuid,
  ...(optionalMetadataString(link.organizationId) !== undefined
    ? { organizationId: optionalMetadataString(link.organizationId) }
    : {}),
  ...(optionalMetadataString(link.organizationName) !== undefined
    ? { organizationName: optionalMetadataString(link.organizationName) }
    : {}),
});

// Imported person records intentionally expose legacy metadata alongside the normalized DTO.
// eslint-disable-next-line complexity
export function toMongoFilemakerPerson(
  document: PersonWithLinksDocument
): MongoFilemakerPerson {
  const organizationLinks = document.organizationLinks ?? [];
  const fullName = buildFullName(document);
  return {
    ...createFilemakerPerson({
      id: document.id,
      firstName: document.firstName,
      lastName: document.lastName,
      addressId: document.addressId,
      street: document.street,
      streetNumber: document.streetNumber,
      city: document.city,
      postalCode: document.postalCode,
      country: document.country,
      countryId: document.countryId,
      nip: '',
      regon: '',
      phoneNumbers: [],
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }),
    fullName,
    ...(document.checked1 !== undefined ? { checked1: document.checked1 } : {}),
    ...(document.checked2 !== undefined ? { checked2: document.checked2 } : {}),
    ...(optionalMetadataString(document.dateOfBirth) !== undefined
      ? { dateOfBirth: optionalMetadataString(document.dateOfBirth) }
      : {}),
    ...(optionalMetadataString(document.legacyDefaultAddressUuid) !== undefined
      ? { legacyDefaultAddressUuid: optionalMetadataString(document.legacyDefaultAddressUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyDefaultBankAccountUuid) !== undefined
      ? { legacyDefaultBankAccountUuid: optionalMetadataString(document.legacyDefaultBankAccountUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyDisplayAddressUuid) !== undefined
      ? { legacyDisplayAddressUuid: optionalMetadataString(document.legacyDisplayAddressUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyDisplayBankAccountUuid) !== undefined
      ? { legacyDisplayBankAccountUuid: optionalMetadataString(document.legacyDisplayBankAccountUuid) }
      : {}),
    legacyOrganizationUuids: document.legacyOrganizationUuids ?? [],
    ...(optionalMetadataString(document.legacyParentUuid) !== undefined
      ? { legacyParentUuid: optionalMetadataString(document.legacyParentUuid) }
      : {}),
    ...(optionalMetadataString(document.legacyUuid) !== undefined
      ? { legacyUuid: optionalMetadataString(document.legacyUuid) }
      : {}),
    linkedOrganizations: organizationLinks.map(toOrganizationLink),
    organizationLinkCount: organizationLinks.length,
    unresolvedOrganizationLinkCount: organizationLinks.filter(
      (link: FilemakerPersonOrganizationLinkMongoDocument): boolean =>
        optionalMetadataString(link.organizationId) === undefined
    ).length,
    ...(optionalMetadataString(document.updatedBy) !== undefined
      ? { updatedBy: optionalMetadataString(document.updatedBy) }
      : {}),
  };
}
