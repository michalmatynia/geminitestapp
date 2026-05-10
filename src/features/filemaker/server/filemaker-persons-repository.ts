import 'server-only';

import type { Document } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { FilemakerOrganization, FilemakerPerson } from '../types';
import {
  FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION,
  FILEMAKER_PERSONS_COLLECTION,
  getFilemakerPersonsCollection,
  toMongoFilemakerPerson,
  type FilemakerPersonMongoDocument,
  type MongoFilemakerPerson,
} from './filemaker-persons-mongo';

export { listMongoFilemakerPersons } from './filemaker-persons-list-repository';
export type { FilemakerPersonsListResult } from './filemaker-persons-list-repository';

export const getMongoFilemakerPersonById = async (
  personId: string
): Promise<MongoFilemakerPerson | null> => {
  const collection = await getFilemakerPersonsCollection();
  const documents = await collection
    .aggregate([
      {
        $match: {
          $or: [{ _id: personId }, { id: personId }, { legacyUuid: personId }],
        },
      },
      { $limit: 1 },
      {
        $lookup: {
          from: FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION,
          localField: 'id',
          foreignField: 'personId',
          as: 'organizationLinks',
        },
      },
    ])
    .toArray();
  const document = documents[0] as FilemakerPersonMongoDocument | undefined;
  return document ? toMongoFilemakerPerson(document) : null;
};

const stripUndefinedFields = <T extends Record<string, unknown>>(input: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(input).filter((entry: [string, unknown]): boolean => entry[1] !== undefined)
  ) as Partial<T>;

const normalizePatchStringList = (value: string[] | undefined): string[] | undefined =>
  value?.map((entry: string): string => entry.trim());

const normalizePatchString = (value: string | undefined): string | undefined => value?.trim();

const normalizePatchLanguageSkillLevel = (value: number): number =>
  Math.min(10, Math.max(1, Math.round(value)));

const normalizePatchLanguageSkillId = (value: string | undefined): string | undefined => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : undefined;
};

const normalizePatchLanguageSkills = (
  value: FilemakerPerson['languageSkills'] | undefined
): FilemakerPerson['languageSkills'] | undefined => {
  if (value === undefined) return undefined;
  return value
    .map((skill): NonNullable<FilemakerPerson['languageSkills']>[number] => {
      const normalizedId = normalizePatchLanguageSkillId(skill.id);
      return {
        ...(normalizedId !== undefined ? { id: normalizedId } : {}),
        language: skill.language.trim(),
        level: normalizePatchLanguageSkillLevel(skill.level),
      };
    })
    .filter((skill): boolean => skill.language.length > 0);
};

const resolvePatchFullName = (
  existing: FilemakerPersonMongoDocument,
  firstName: string | undefined,
  lastName: string | undefined
): string | undefined => {
  if (firstName === undefined && lastName === undefined) return undefined;
  return [firstName ?? existing.firstName, lastName ?? existing.lastName]
    .filter((part: string): boolean => part.length > 0)
    .join(' ');
};

const buildMongoFilemakerPersonUpdate = (
  existing: FilemakerPersonMongoDocument,
  patch: Partial<FilemakerPerson>,
  now: string
): Partial<FilemakerPersonMongoDocument> => {
  const firstName = normalizePatchString(patch.firstName);
  const lastName = normalizePatchString(patch.lastName);
  const fullName = resolvePatchFullName(existing, firstName, lastName);
  return stripUndefinedFields({
    addressId: normalizePatchString(patch.addressId),
    city: normalizePatchString(patch.city),
    country: normalizePatchString(patch.country),
    countryId: normalizePatchString(patch.countryId),
    cvCoreStrengths: normalizePatchStringList(patch.cvCoreStrengths),
    cvHeadline: normalizePatchString(patch.cvHeadline),
    cvProfessionalSummary: normalizePatchString(patch.cvProfessionalSummary),
    cvSelectedTechnicalEnvironment: normalizePatchStringList(
      patch.cvSelectedTechnicalEnvironment
    ),
    firstName,
    fullName,
    githubUrl: normalizePatchString(patch.githubUrl),
    languageSkills: normalizePatchLanguageSkills(patch.languageSkills),
    lastName,
    linkedinUrl: normalizePatchString(patch.linkedinUrl),
    nip: normalizePatchString(patch.nip),
    postalCode: normalizePatchString(patch.postalCode),
    profileEducation: patch.profileEducation,
    profileJobExperience: patch.profileJobExperience,
    regon: normalizePatchString(patch.regon),
    street: normalizePatchString(patch.street),
    streetNumber: normalizePatchString(patch.streetNumber),
    updatedAt: now,
  });
};

export const updateMongoFilemakerPerson = async (
  personId: string,
  patch: Partial<FilemakerPerson>
): Promise<MongoFilemakerPerson> => {
  const collection = await getFilemakerPersonsCollection();
  const existing = await collection.findOne({
    $or: [{ _id: personId }, { id: personId }, { legacyUuid: personId }],
  });
  if (!existing) {
    throw notFoundError('Filemaker person was not found.');
  }
  const now = new Date().toISOString();
  const setFields = buildMongoFilemakerPersonUpdate(existing, patch, now);
  await collection.updateOne({ _id: existing._id }, { $set: setFields });
  const updated = await getMongoFilemakerPersonById(existing._id);
  if (!updated) {
    throw notFoundError('Filemaker person was not found after update.');
  }
  return updated;
};

export const listMongoFilemakerPersonsForOrganization = async (
  organization: FilemakerOrganization
): Promise<MongoFilemakerPerson[]> => {
  const db = await getMongoDb();
  const linkFilter: Document = {
    $or: [
      { organizationId: organization.id },
      ...(organization.legacyUuid !== undefined && organization.legacyUuid.trim().length > 0
        ? [{ legacyOrganizationUuid: organization.legacyUuid }]
        : []),
    ],
  };
  const links = await db
    .collection(FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION)
    .find(linkFilter, { projection: { _id: 0, personId: 1 } })
    .toArray();
  const personIds = Array.from(
    new Set(
      links
        .map((link: Document): string => (typeof link['personId'] === 'string' ? link['personId'] : ''))
        .filter((personId: string): boolean => personId.length > 0)
    )
  );
  if (personIds.length === 0) return [];

  const documents = await db
    .collection<FilemakerPersonMongoDocument>(FILEMAKER_PERSONS_COLLECTION)
    .aggregate<FilemakerPersonMongoDocument>([
      { $match: { id: { $in: personIds } } },
      {
        $lookup: {
          from: FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION,
          localField: 'id',
          foreignField: 'personId',
          as: 'organizationLinks',
        },
      },
      { $sort: { lastName: 1, firstName: 1, fullName: 1, _id: 1 } },
    ])
    .toArray();

  return documents.map(toMongoFilemakerPerson);
};
