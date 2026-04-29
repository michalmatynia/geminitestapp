/* eslint-disable max-lines */
import 'server-only';

import type { Filter, Document } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { FilemakerOrganization, FilemakerPerson } from '../types';
import {
  normalizePersonPage,
  resolvePersonListOptions,
  type FilemakerPersonAddressFilter,
  type FilemakerPersonBankFilter,
  type FilemakerPersonOrganizationFilter,
  type FilemakerPersonSortOption,
  type FilemakerPersonsListInput,
  type FilemakerPersonsListOptions,
} from './filemaker-persons-list-options';
import {
  FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION,
  FILEMAKER_PERSONS_COLLECTION,
  getFilemakerPersonsCollection,
  toMongoFilemakerPerson,
  type FilemakerPersonMongoDocument,
  type MongoFilemakerPerson,
} from './filemaker-persons-mongo';

export type FilemakerPersonsListResult = {
  collectionCount: number;
  filters: {
    address: FilemakerPersonAddressFilter;
    bank: FilemakerPersonBankFilter;
    organization: FilemakerPersonOrganizationFilter;
    updatedBy: string;
  };
  limit: number;
  page: number;
  pageSize: number;
  persons: MongoFilemakerPerson[];
  query: string;
  sort: FilemakerPersonSortOption;
  totalCount: number;
  totalCountIsExact: boolean;
  totalPages: number;
};

type PersonAggregationResult = {
  documents?: FilemakerPersonMongoDocument[];
  metadata?: Array<{ totalCount?: number }>;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasFieldValueFilter = (
  field: keyof FilemakerPersonMongoDocument
): Filter<FilemakerPersonMongoDocument> => ({
  [field]: { $exists: true, $nin: ['', null] },
});

const hasNoFieldValueFilter = (
  field: keyof FilemakerPersonMongoDocument
): Filter<FilemakerPersonMongoDocument> => ({
  $or: [{ [field]: { $exists: false } }, { [field]: '' }, { [field]: null }],
});

const buildAddressFilter = (
  filter: FilemakerPersonAddressFilter
): Filter<FilemakerPersonMongoDocument> => {
  if (filter === 'with_address') {
    return {
      $or: [
        hasFieldValueFilter('legacyDefaultAddressUuid'),
        hasFieldValueFilter('legacyDisplayAddressUuid'),
      ],
    };
  }
  if (filter === 'without_address') {
    return {
      $and: [
        hasNoFieldValueFilter('legacyDefaultAddressUuid'),
        hasNoFieldValueFilter('legacyDisplayAddressUuid'),
      ],
    };
  }
  return {};
};

const buildBankFilter = (
  filter: FilemakerPersonBankFilter
): Filter<FilemakerPersonMongoDocument> => {
  if (filter === 'with_bank') return hasFieldValueFilter('legacyDefaultBankAccountUuid');
  if (filter === 'without_bank') return hasNoFieldValueFilter('legacyDefaultBankAccountUuid');
  return {};
};

const buildPersonBaseFilter = (input: {
  addressFilter: FilemakerPersonAddressFilter;
  bankFilter: FilemakerPersonBankFilter;
  query: string;
  updatedBy: string;
}): Filter<FilemakerPersonMongoDocument> => {
  const clauses: Filter<FilemakerPersonMongoDocument>[] = [];
  const { addressFilter, bankFilter, query, updatedBy } = input;
  const normalizedQuery = query.trim();
  if (normalizedQuery.length > 0) {
    const regex = new RegExp(escapeRegex(normalizedQuery), 'i');
    clauses.push({
      $or: [
        { firstName: regex },
        { lastName: regex },
        { fullName: regex },
        { legacyUuid: regex },
        { legacyParentUuid: regex },
        { legacyDefaultAddressUuid: regex },
        { legacyDefaultBankAccountUuid: regex },
        { legacyOrganizationUuids: regex },
      ],
    });
  }
  if (updatedBy.length > 0) {
    clauses.push({ updatedBy: new RegExp(escapeRegex(updatedBy), 'i') });
  }
  clauses.push(buildAddressFilter(addressFilter), buildBankFilter(bankFilter));
  const activeClauses = clauses.filter((clause) => Object.keys(clause).length > 0);
  return activeClauses.length > 0 ? { $and: activeClauses } : {};
};

const buildPersonSort = (sort: FilemakerPersonSortOption): Document => {
  if (sort === 'createdAt_desc') {
    return { createdAt: -1, updatedAt: -1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'createdAt_asc') {
    return { createdAt: 1, updatedAt: 1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'updatedAt_asc') {
    return { updatedAt: 1, createdAt: 1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'organizationLinkCount_desc') {
    return { organizationLinkCount: -1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'organizationLinkCount_asc') {
    return { organizationLinkCount: 1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  }
  if (sort === 'name_desc') return { lastName: -1, firstName: -1, fullName: -1, _id: 1 };
  if (sort === 'name_asc') return { lastName: 1, firstName: 1, fullName: 1, _id: 1 };
  return { updatedAt: -1, createdAt: -1, lastName: 1, firstName: 1, fullName: 1, _id: 1 };
};

const buildAggregationPipeline = (input: {
  filter: Filter<FilemakerPersonMongoDocument>;
  options: FilemakerPersonsListOptions;
  page: number;
}): Document[] => {
  const pipeline: Document[] = [
    { $match: input.filter },
    {
      $lookup: {
        from: FILEMAKER_PERSON_ORGANIZATION_LINKS_COLLECTION,
        localField: 'id',
        foreignField: 'personId',
        as: 'organizationLinks',
      },
    },
  ];
  if (input.options.organizationFilter === 'with_organizations') {
    pipeline.push({ $match: { 'organizationLinks.0': { $exists: true } } });
  }
  if (input.options.organizationFilter === 'without_organizations') {
    pipeline.push({ $match: { organizationLinks: { $size: 0 } } });
  }
  if (input.options.query.length > 0) {
    const regex = new RegExp(escapeRegex(input.options.query), 'i');
    pipeline.push({
      $match: {
        $or: [
          { firstName: regex },
          { lastName: regex },
          { fullName: regex },
          { legacyUuid: regex },
          { legacyOrganizationUuids: regex },
          { 'organizationLinks.organizationName': regex },
          { 'organizationLinks.legacyOrganizationUuid': regex },
        ],
      },
    });
  }
  pipeline.push(
    { $addFields: { organizationLinkCount: { $size: '$organizationLinks' } } },
    { $sort: buildPersonSort(input.options.sort) },
    {
      $facet: {
        metadata: [{ $count: 'totalCount' }],
        documents: [
          { $skip: (input.page - 1) * input.options.pageSize },
          { $limit: input.options.pageSize },
        ],
      },
    }
  );
  return pipeline;
};

const buildListResult = (input: {
  collectionCount: number;
  documents: FilemakerPersonMongoDocument[];
  options: FilemakerPersonsListOptions;
  page: number;
  totalCount: number;
  totalPages: number;
}): FilemakerPersonsListResult => ({
  collectionCount: input.collectionCount,
  filters: {
    address: input.options.addressFilter,
    bank: input.options.bankFilter,
    organization: input.options.organizationFilter,
    updatedBy: input.options.updatedBy,
  },
  limit: input.options.pageSize,
  page: input.page,
  pageSize: input.options.pageSize,
  persons: input.documents.map(toMongoFilemakerPerson),
  query: input.options.query,
  sort: input.options.sort,
  totalCount: input.totalCount,
  totalCountIsExact: true,
  totalPages: input.totalPages,
});

// List queries combine person fields with joined organization-link fields.
// eslint-disable-next-line complexity
export async function listMongoFilemakerPersons(
  input: FilemakerPersonsListInput
): Promise<FilemakerPersonsListResult> {
  const options = resolvePersonListOptions(input);
  const filter = buildPersonBaseFilter({
    addressFilter: options.addressFilter,
    bankFilter: options.bankFilter,
    query: '',
    updatedBy: options.updatedBy,
  });
  const db = await getMongoDb();
  const collection = db.collection<FilemakerPersonMongoDocument>(FILEMAKER_PERSONS_COLLECTION);
  const collectionCount = await collection.estimatedDocumentCount();
  const firstPipeline = buildAggregationPipeline({ filter, options, page: 1 });
  const firstResult = await collection.aggregate<PersonAggregationResult>(firstPipeline).toArray();
  const first = firstResult[0] ?? { documents: [], metadata: [] };
  const totalCount =
    Array.isArray(first.metadata) && typeof first.metadata[0]?.totalCount === 'number'
      ? first.metadata[0].totalCount
      : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / options.pageSize));
  const page = normalizePersonPage(options.requestedPage, totalPages);
  const documents =
    page === 1
      ? (first.documents ?? [])
      : ((await collection
          .aggregate<PersonAggregationResult>(buildAggregationPipeline({ filter, options, page }))
          .toArray())[0]?.documents ?? []);

  return buildListResult({
    collectionCount,
    documents,
    options,
    page,
    totalCount,
    totalPages,
  });
}

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

const normalizePatchLanguageSkills = (
  value: FilemakerPerson['languageSkills'] | undefined
): FilemakerPerson['languageSkills'] | undefined => {
  if (value === undefined) return undefined;
  return value
    .map((skill): NonNullable<FilemakerPerson['languageSkills']>[number] => ({
      ...(skill.id?.trim() ? { id: skill.id.trim() } : {}),
      language: skill.language.trim(),
      level: normalizePatchLanguageSkillLevel(skill.level),
    }))
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
    postalCode: normalizePatchString(patch.postalCode),
    profileEducation: patch.profileEducation,
    profileJobExperience: patch.profileJobExperience,
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
