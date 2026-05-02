import 'server-only';

import { randomUUID } from 'crypto';

import type {
  FilemakerJobApplication,
  FilemakerJobApplicationArtifactVersionSet,
  FilemakerJobApplicationLogEntry,
} from '../filemaker-job-application.types';
import { buildFilemakerJobApplicationCanonicalKey } from './filemaker-job-application-canonical-key';
import { getFilemakerJobApplicationsCollection } from './filemaker-job-application-collection';
import {
  normalizeId,
} from './filemaker-job-application-mapper';
import {
  normalizeRequiredString,
  normalizeString,
} from './filemaker-job-application-normalize-base';
import {
  requireMongoFilemakerJobApplicationById,
} from './filemaker-job-application-repository';
import type { FilemakerJobApplicationMongoDocument } from './filemaker-job-application-repository.types';

export type UpsertManualAppliedMongoFilemakerJobApplicationInput = {
  jobListingId: string;
  jobTitle?: string | null;
  organizationId: string;
  organizationName?: string | null;
  personId: string;
  personName?: string | null;
  sourceSite?: string | null;
  sourceUrl?: string | null;
};

type ManualAppliedApplicationIdentity = {
  jobListingId: string;
  organizationId: string;
  personId: string;
};

const emptyArtifactVersionSet = (): FilemakerJobApplicationArtifactVersionSet => ({
  applicationEmail: [],
  coverLetter: [],
  tailoredCv: [],
});

const toManualAppliedApplicationId = (canonicalKey: string): string =>
  `manual-job-application-${canonicalKey.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;

const buildManualAppliedSourceApplicationContext = (
  input: UpsertManualAppliedMongoFilemakerJobApplicationInput
): Record<string, unknown> => ({
  version: 1,
  applicationSource: 'manual_applied_marker',
  jobContext: {
    selectedJobListingId: input.jobListingId,
    listing: {
      id: input.jobListingId,
      sourceSite: normalizeString(input.sourceSite),
      sourceUrl: normalizeString(input.sourceUrl),
      title: normalizeString(input.jobTitle),
    },
  },
  organizationContext: {
    selectedOrganizationId: input.organizationId,
    organization: {
      id: input.organizationId,
      name: normalizeString(input.organizationName),
    },
  },
  personContext: {
    selectedPersonId: input.personId,
    person: {
      id: input.personId,
      fullName: normalizeString(input.personName),
    },
  },
  platformContext: {
    source: 'filemaker_manual_applied',
  },
});

const buildManualLogEntry = (
  input: UpsertManualAppliedMongoFilemakerJobApplicationInput,
  now: string
): FilemakerJobApplicationLogEntry => ({
  id: randomUUID(),
  appliedAt: now,
  method: 'manual',
  personId: normalizeString(input.personId),
  personName: normalizeString(input.personName),
  toStatus: 'applied',
});

const buildManualAppliedDocument = (
  input: UpsertManualAppliedMongoFilemakerJobApplicationInput,
  identity: ManualAppliedApplicationIdentity,
  now: string
): FilemakerJobApplicationMongoDocument => {
  const canonicalApplicationKey = buildFilemakerJobApplicationCanonicalKey({
    jobListingId: identity.jobListingId,
    organizationId: identity.organizationId,
    personId: identity.personId,
  });
  const applicationId = toManualAppliedApplicationId(canonicalApplicationKey);
  return {
    _id: applicationId,
    activeArtifacts: {
      applicationEmailVersionId: null,
      coverLetterVersionId: null,
      tailoredCvVersionId: null,
    },
    applicationEmail: null,
    applicationLog: [buildManualLogEntry(input, now)],
    applicationNotes: ['Marked applied manually.'],
    artifactVersions: emptyArtifactVersionSet(),
    canonicalApplicationKey,
    confidence: null,
    connectionId: null,
    coverLetter: null,
    createdAt: now,
    id: applicationId,
    integrationId: null,
    integrationSlug: null,
    jobListingId: identity.jobListingId,
    jobTitle: normalizeString(input.jobTitle),
    missingInformation: [],
    organizationId: identity.organizationId,
    organizationName: normalizeString(input.organizationName),
    personId: identity.personId,
    personName: normalizeString(input.personName),
    source: 'filemaker-manual-applied',
    sourceApplicationContext: buildManualAppliedSourceApplicationContext(input),
    sourceEntityId: `${identity.organizationId}:${identity.jobListingId}:${identity.personId}:manual_applied`,
    status: 'applied',
    tailoredCv: null,
    tailoredCvId: null,
    updatedAt: now,
  };
};

const buildManualAppliedInsertDocument = (
  document: FilemakerJobApplicationMongoDocument
): FilemakerJobApplicationMongoDocument => {
  const insertDocument: FilemakerJobApplicationMongoDocument = { ...document };
  delete insertDocument.status;
  delete insertDocument.updatedAt;
  return insertDocument;
};

export const upsertManualAppliedMongoFilemakerJobApplication = async (
  input: UpsertManualAppliedMongoFilemakerJobApplicationInput
): Promise<FilemakerJobApplication> => {
  const identity: ManualAppliedApplicationIdentity = {
    jobListingId: normalizeRequiredString(input.jobListingId),
    organizationId: normalizeRequiredString(input.organizationId),
    personId: normalizeRequiredString(input.personId),
  };
  const collection = await getFilemakerJobApplicationsCollection();
  const existingDocuments = await collection
    .find(identity)
    .sort({ updatedAt: -1, createdAt: -1 })
    .limit(100)
    .toArray();
  const now = new Date().toISOString();

  if (existingDocuments.length > 0) {
    const logEntry = buildManualLogEntry(input, now);
    await collection.updateMany(
      { _id: { $in: existingDocuments.map((document) => document._id) } },
      { $set: { status: 'applied', updatedAt: now }, $push: { applicationLog: logEntry } }
    );
    return requireMongoFilemakerJobApplicationById(normalizeId(existingDocuments[0]));
  }

  const document = buildManualAppliedDocument(input, identity, now);
  await collection.updateOne(
    { _id: document._id },
    {
      $setOnInsert: buildManualAppliedInsertDocument(document),
      $set: {
        status: 'applied',
        updatedAt: now,
      },
    },
    { upsert: true }
  );
  return requireMongoFilemakerJobApplicationById(document._id);
};
