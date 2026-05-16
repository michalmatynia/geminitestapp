import 'server-only';

import { randomUUID } from 'crypto';

import type { Document, Filter } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { toObjectIdMaybe } from '@/shared/lib/db/services/sync-utils';

import type {
  FilemakerJobApplicationActiveArtifacts,
  FilemakerJobApplicationArtifactVersion,
  FilemakerJobApplicationArtifactVersionSet,
  FilemakerJobApplication,
  FilemakerJobApplicationLogEntry,
  FilemakerJobApplicationStatus,
} from '../filemaker-job-application.types';
import {
  findArtifactVersionById,
  mergeArtifactVersionStrings,
} from './filemaker-job-application-artifact-versions';
import { buildFilemakerJobApplicationCanonicalKey } from './filemaker-job-application-canonical-key';
import {
  FILEMAKER_JOB_APPLICATIONS_COLLECTION,
  getFilemakerJobApplicationsCollection,
} from './filemaker-job-application-collection';
import {
  collapseLegacyMongoFilemakerJobApplicationsForListing,
  type CollapseLegacyMongoFilemakerJobApplicationsResult,
} from './filemaker-job-application-collapse';
import {
  normalizeId,
  toFilemakerJobApplication,
} from './filemaker-job-application-mapper';
import {
  normalizePersistedArtifactVersions,
} from './filemaker-job-application-normalize-artifacts';
import {
  normalizeLimit,
  normalizeNumber,
  normalizeString,
} from './filemaker-job-application-normalize-base';
import type {
  FilemakerJobApplicationMongoDocument,
  ListMongoFilemakerJobApplicationsInput,
} from './filemaker-job-application-repository.types';

export { FILEMAKER_JOB_APPLICATIONS_COLLECTION, buildFilemakerJobApplicationCanonicalKey };
export { collapseLegacyMongoFilemakerJobApplicationsForListing };
export type {
  CollapseLegacyMongoFilemakerJobApplicationsResult,
  FilemakerJobApplicationMongoDocument,
  ListMongoFilemakerJobApplicationsInput,
};

const findApplicationDocumentById = async (
  applicationId: string
): Promise<FilemakerJobApplicationMongoDocument | null> => {
  const collection = await getFilemakerJobApplicationsCollection();
  return collection.findOne(resolveApplicationIdFilter(applicationId));
};

export const getMongoFilemakerJobApplicationById = async (
  applicationId: string
): Promise<FilemakerJobApplication | null> => {
  const document = await findApplicationDocumentById(applicationId);
  return document !== null ? toFilemakerJobApplication(document) : null;
};

export const requireMongoFilemakerJobApplicationById = async (
  applicationId: string
): Promise<FilemakerJobApplication> => {
  const application = await getMongoFilemakerJobApplicationById(applicationId);
  if (application === null) throw notFoundError('Filemaker job application was not found.');
  return application;
};

const buildListFilter = (
  input: ListMongoFilemakerJobApplicationsInput
): Filter<FilemakerJobApplicationMongoDocument> | null => {
  const filter: Filter<FilemakerJobApplicationMongoDocument> = {};
  const organizationId = normalizeString(input.organizationId);
  const jobListingId = normalizeString(input.jobListingId);
  const personId = normalizeString(input.personId);
  if (organizationId !== null) filter['organizationId'] = organizationId;
  if (jobListingId !== null) filter['jobListingId'] = jobListingId;
  if (personId !== null) filter['personId'] = personId;
  return Object.keys(filter).length === 0 ? null : filter;
};

export const listMongoFilemakerJobApplications = async (
  input: ListMongoFilemakerJobApplicationsInput
): Promise<FilemakerJobApplication[]> => {
  const filter = buildListFilter(input);
  if (filter === null) return [];
  const collection = await getFilemakerJobApplicationsCollection();
  const documents = await collection
    .find(filter)
    .sort({ createdAt: -1, updatedAt: -1 })
    .limit(normalizeLimit(input.limit))
    .toArray();
  return documents.map(toFilemakerJobApplication);
};

export const updateMongoFilemakerJobApplicationStatus = async (
  applicationId: string,
  status: FilemakerJobApplicationStatus,
  logEntry?: FilemakerJobApplicationLogEntry
): Promise<FilemakerJobApplication> => {
  const collection = await getFilemakerJobApplicationsCollection();
  const existing = await findApplicationDocumentById(applicationId);
  if (existing === null) throw notFoundError('Filemaker job application was not found.');
  const now = new Date().toISOString();
  const entry: FilemakerJobApplicationLogEntry = logEntry ?? {
    id: randomUUID(),
    appliedAt: now,
    method: 'manual',
    personId: normalizeString(existing.personId),
    personName: normalizeString(existing.personName),
    toStatus: status,
  };
  await collection.updateOne(
    { _id: existing._id },
    {
      $set: { status, updatedAt: now },
      $push: { applicationLog: { ...entry, toStatus: entry.toStatus ?? status } },
    } as Document
  );
  return requireMongoFilemakerJobApplicationById(normalizeId(existing));
};

const emptyArtifactVersionSet = (): FilemakerJobApplicationArtifactVersionSet => ({
  applicationEmail: [],
  coverLetter: [],
  tailoredCv: [],
});

const resolvePersistedVersions = (
  existing: FilemakerJobApplicationMongoDocument
): FilemakerJobApplicationArtifactVersionSet =>
  normalizePersistedArtifactVersions(existing.artifactVersions ?? existing.persistedArtifactVersions) ??
  emptyArtifactVersionSet();

const resolveNextActiveArtifacts = (
  activeArtifacts: FilemakerJobApplicationActiveArtifacts
): FilemakerJobApplicationActiveArtifacts => ({
  applicationEmailVersionId: normalizeString(activeArtifacts.applicationEmailVersionId),
  coverLetterVersionId: normalizeString(activeArtifacts.coverLetterVersionId),
  tailoredCvVersionId: normalizeString(activeArtifacts.tailoredCvVersionId),
});

const collectActiveVersions = (input: {
  activeApplicationEmail: FilemakerJobApplicationArtifactVersion | null;
  activeCoverLetter: FilemakerJobApplicationArtifactVersion | null;
  activeTailoredCv: FilemakerJobApplicationArtifactVersion | null;
}): FilemakerJobApplicationArtifactVersion[] =>
  [input.activeTailoredCv, input.activeCoverLetter, input.activeApplicationEmail].filter(
    (version): version is FilemakerJobApplicationArtifactVersion => version !== null
  );

const resolveArtifactPayload = (
  version: FilemakerJobApplicationArtifactVersion | null
): Record<string, unknown> | null => {
  if (version === null) return null;
  return version.payload;
};

const resolveActiveArtifactConfidence = (input: {
  activeApplicationEmail: FilemakerJobApplicationArtifactVersion | null;
  activeCoverLetter: FilemakerJobApplicationArtifactVersion | null;
  activeTailoredCv: FilemakerJobApplicationArtifactVersion | null;
  existing: FilemakerJobApplicationMongoDocument;
}): number | null =>
  input.activeTailoredCv?.confidence ??
  input.activeCoverLetter?.confidence ??
  input.activeApplicationEmail?.confidence ??
  normalizeNumber(input.existing.confidence);

const buildActiveArtifactUpdateSet = (input: {
  activeArtifacts: FilemakerJobApplicationActiveArtifacts;
  existing: FilemakerJobApplicationMongoDocument;
  persistedVersions: FilemakerJobApplicationArtifactVersionSet;
}): Record<string, unknown> => {
  const activeApplicationEmail = findArtifactVersionById(
    input.persistedVersions.applicationEmail,
    input.activeArtifacts.applicationEmailVersionId
  );
  const activeCoverLetter = findArtifactVersionById(
    input.persistedVersions.coverLetter,
    input.activeArtifacts.coverLetterVersionId
  );
  const activeTailoredCv = findArtifactVersionById(
    input.persistedVersions.tailoredCv,
    input.activeArtifacts.tailoredCvVersionId
  );
  const activeVersions = collectActiveVersions({
    activeApplicationEmail,
    activeCoverLetter,
    activeTailoredCv,
  });
  const confidence = resolveActiveArtifactConfidence({
    activeApplicationEmail,
    activeCoverLetter,
    activeTailoredCv,
    existing: input.existing,
  });
  return {
    activeArtifacts: input.activeArtifacts,
    activeApplicationEmailVersionId: input.activeArtifacts.applicationEmailVersionId,
    activeCoverLetterVersionId: input.activeArtifacts.coverLetterVersionId,
    activeTailoredCvVersionId: input.activeArtifacts.tailoredCvVersionId,
    applicationEmail: resolveArtifactPayload(activeApplicationEmail),
    applicationNotes: mergeArtifactVersionStrings(activeVersions, 'applicationNotes'),
    coverLetter: resolveArtifactPayload(activeCoverLetter),
    confidence,
    missingInformation: mergeArtifactVersionStrings(activeVersions, 'missingInformation'),
    tailoredCv: resolveArtifactPayload(activeTailoredCv),
    tailoredCvId: activeTailoredCv?.linkedRecordId ?? null,
    updatedAt: new Date().toISOString(),
  };
};

export const updateMongoFilemakerJobApplicationActiveArtifacts = async (
  applicationId: string,
  activeArtifacts: FilemakerJobApplicationActiveArtifacts
): Promise<FilemakerJobApplication> => {
  const collection = await getFilemakerJobApplicationsCollection();
  const existing = await findApplicationDocumentById(applicationId);
  if (existing === null) throw notFoundError('Filemaker job application was not found.');
  const nextActiveArtifacts = resolveNextActiveArtifacts(activeArtifacts);
  const persistedVersions = resolvePersistedVersions(existing);
  await collection.updateOne(
    { _id: existing._id },
    {
      $set: buildActiveArtifactUpdateSet({
        activeArtifacts: nextActiveArtifacts,
        existing,
        persistedVersions,
      }),
    }
  );
  return requireMongoFilemakerJobApplicationById(normalizeId(existing));
};

export const removeMongoFilemakerJobApplicationLogEntry = async (
  applicationId: string,
  logEntryId: string
): Promise<FilemakerJobApplication> => {
  const collection = await getFilemakerJobApplicationsCollection();
  const existing = await findApplicationDocumentById(applicationId);
  if (existing === null) throw notFoundError('Filemaker job application was not found.');
  await collection.updateOne(
    { _id: existing._id },
    { $pull: { applicationLog: { id: logEntryId } } } as Document
  );
  return requireMongoFilemakerJobApplicationById(normalizeId(existing));
};

export const deleteMongoFilemakerJobApplication = async (
  applicationId: string
): Promise<void> => {
  const collection = await getFilemakerJobApplicationsCollection();
  const result = await collection.deleteOne(resolveApplicationIdFilter(applicationId));
  if (result.deletedCount === 0) {
    throw notFoundError('Filemaker job application was not found.');
  }
};

const resolveApplicationIdFilter = (
  applicationId: string
): Filter<FilemakerJobApplicationMongoDocument> => {
  const objectId = toObjectIdMaybe(applicationId);
  const candidates = [{ _id: applicationId }, { id: applicationId }] as Filter<
    FilemakerJobApplicationMongoDocument
  >[];

  if (objectId === null || (typeof objectId === 'string' && objectId === applicationId)) {
    return { $or: candidates };
  }

  return {
    $or: [{ _id: objectId }, ...candidates],
  } as unknown as Filter<FilemakerJobApplicationMongoDocument>;
};
