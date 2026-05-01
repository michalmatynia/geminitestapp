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
  cvCoreStrengths?: string[];
  cvHeadline?: string;
  cvProfessionalSummary?: string;
  cvSelectedTechnicalEnvironment?: string[];
  dateOfBirth?: string;
  displayAddressId?: string | null;
  firstName: string;
  fullName?: string;
  githubUrl?: string;
  id: string;
  languageSkills?: FilemakerPerson['languageSkills'];
  lastName: string;
  legacyDefaultAddressUuid?: string;
  legacyDefaultBankAccountUuid?: string;
  legacyDisplayAddressUuid?: string;
  legacyDisplayBankAccountUuid?: string;
  legacyOrganizationUuids?: string[];
  legacyParentUuid?: string;
  legacyUuid?: string;
  linkedinUrl?: string;
  postalCode?: string;
  profileEducation?: FilemakerPerson['profileEducation'];
  profileJobExperience?: FilemakerPerson['profileJobExperience'];
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

type OptionalPersonMetadataKey =
  | 'dateOfBirth'
  | 'legacyDefaultAddressUuid'
  | 'legacyDefaultBankAccountUuid'
  | 'legacyDisplayAddressUuid'
  | 'legacyDisplayBankAccountUuid'
  | 'legacyParentUuid'
  | 'legacyUuid'
  | 'updatedBy';

const optionalMetadataString = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

const OPTIONAL_PERSON_METADATA_KEYS: OptionalPersonMetadataKey[] = [
  'dateOfBirth',
  'legacyDefaultAddressUuid',
  'legacyDefaultBankAccountUuid',
  'legacyDisplayAddressUuid',
  'legacyDisplayBankAccountUuid',
  'legacyParentUuid',
  'legacyUuid',
  'updatedBy',
];

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

const createMongoPersonBase = (
  document: FilemakerPersonMongoDocument
): FilemakerPerson => createFilemakerPerson({
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
  linkedinUrl: document.linkedinUrl,
  githubUrl: document.githubUrl,
  languageSkills: document.languageSkills,
  profileEducation: document.profileEducation,
  profileJobExperience: document.profileJobExperience,
  cvHeadline: document.cvHeadline,
  cvProfessionalSummary: document.cvProfessionalSummary,
  cvCoreStrengths: document.cvCoreStrengths,
  cvSelectedTechnicalEnvironment: document.cvSelectedTechnicalEnvironment,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
});

const buildPersonLegacyMetadata = (
  document: FilemakerPersonMongoDocument
): Partial<MongoFilemakerPerson> => {
  const metadata: Partial<MongoFilemakerPerson> = {};
  if (document.checked1 !== undefined) metadata.checked1 = document.checked1;
  if (document.checked2 !== undefined) metadata.checked2 = document.checked2;
  for (const key of OPTIONAL_PERSON_METADATA_KEYS) {
    const normalized = optionalMetadataString(document[key]);
    if (normalized !== undefined) metadata[key] = normalized;
  }
  return metadata;
};

export function toMongoFilemakerPerson(
  document: PersonWithLinksDocument
): MongoFilemakerPerson {
  const organizationLinks = document.organizationLinks ?? [];
  return {
    ...createMongoPersonBase(document),
    ...buildPersonLegacyMetadata(document),
    fullName: buildFullName(document),
    legacyOrganizationUuids: document.legacyOrganizationUuids ?? [],
    linkedOrganizations: organizationLinks.map(toOrganizationLink),
    organizationLinkCount: organizationLinks.length,
    unresolvedOrganizationLinkCount: organizationLinks.filter(
      (link: FilemakerPersonOrganizationLinkMongoDocument): boolean =>
        optionalMetadataString(link.organizationId) === undefined
    ).length,
  };
}
