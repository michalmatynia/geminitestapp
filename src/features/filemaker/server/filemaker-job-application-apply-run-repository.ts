import 'server-only';
/* eslint-disable complexity */

import type { Collection, Document } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerJobApplicationApplyRun,
  FilemakerJobApplicationApplyRunArtifacts,
  FilemakerJobApplicationApplyRunMode,
  FilemakerJobApplicationApplyRunStatus,
  FilemakerJobApplicationApplyRunStep,
} from '../filemaker-job-application.types';

export const FILEMAKER_JOB_APPLICATION_APPLY_RUNS_COLLECTION =
  'filemaker_job_application_runs';

export type FilemakerJobApplicationApplyRunMongoDocument = Document & {
  _id: string;
  applicationId?: unknown;
  artifactVersionIds?: unknown;
  completedAt?: unknown;
  confirmationUrl?: unknown;
  connectionId?: unknown;
  createdAt?: unknown;
  error?: unknown;
  id?: unknown;
  integrationId?: unknown;
  integrationSlug?: unknown;
  jobListingId?: unknown;
  mode?: unknown;
  organizationId?: unknown;
  personId?: unknown;
  sourceUrl?: unknown;
  startedAt?: unknown;
  status?: unknown;
  steps?: unknown;
  updatedAt?: unknown;
};

export type CreateMongoFilemakerJobApplicationApplyRunInput = {
  id: string;
  applicationId: string;
  artifactVersionIds: FilemakerJobApplicationApplyRunArtifacts;
  connectionId: string | null;
  integrationId: string | null;
  integrationSlug: string | null;
  jobListingId: string;
  mode: FilemakerJobApplicationApplyRunMode;
  organizationId: string;
  personId: string;
  sourceUrl: string | null;
};

export type UpdateMongoFilemakerJobApplicationApplyRunInput = {
  completedAt?: string | null;
  confirmationUrl?: string | null;
  error?: string | null;
  sourceUrl?: string | null;
  startedAt?: string | null;
  status?: FilemakerJobApplicationApplyRunStatus;
};

const getCollection = async (): Promise<
  Collection<FilemakerJobApplicationApplyRunMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerJobApplicationApplyRunMongoDocument>(
    FILEMAKER_JOB_APPLICATION_APPLY_RUNS_COLLECTION
  );
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: unknown, fallback = ''): string =>
  normalizeString(value) ?? fallback;

const normalizeRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeMode = (value: unknown): FilemakerJobApplicationApplyRunMode =>
  value === 'review' ? 'review' : 'submit';

const normalizeStatus = (value: unknown): FilemakerJobApplicationApplyRunStatus => {
  if (
    value === 'queued' ||
    value === 'running' ||
    value === 'auth_required' ||
    value === 'awaiting_review' ||
    value === 'submitted' ||
    value === 'failed' ||
    value === 'canceled'
  ) {
    return value;
  }
  return 'queued';
};

const normalizeArtifactVersionIds = (
  value: unknown
): FilemakerJobApplicationApplyRunArtifacts => {
  const record = normalizeRecord(value);
  return {
    applicationEmailVersionId: normalizeString(record?.['applicationEmailVersionId']),
    coverLetterVersionId: normalizeString(record?.['coverLetterVersionId']),
    tailoredCvVersionId: normalizeString(record?.['tailoredCvVersionId']),
  };
};

const normalizeStep = (value: unknown): FilemakerJobApplicationApplyRunStep | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  const id = normalizeString(record['id']);
  const label = normalizeString(record['label']);
  const detail = normalizeString(record['detail']) ?? '';
  const createdAt = normalizeString(record['createdAt']);
  const rawStatus = record['status'];
  const status =
    rawStatus === 'ok' || rawStatus === 'failed' || rawStatus === 'pending'
      ? rawStatus
      : 'pending';
  if (id === null || label === null || createdAt === null) return null;
  return {
    id,
    label,
    status,
    detail,
    createdAt,
  };
};

const normalizeSteps = (value: unknown): FilemakerJobApplicationApplyRunStep[] =>
  Array.isArray(value)
    ? value
        .map((entry: unknown): FilemakerJobApplicationApplyRunStep | null =>
          normalizeStep(entry)
        )
        .filter((entry): entry is FilemakerJobApplicationApplyRunStep => entry !== null)
    : [];

const normalizeId = (document: FilemakerJobApplicationApplyRunMongoDocument): string => {
  const id = normalizeString(document.id);
  return id ?? document._id;
};

const toApplyRun = (
  document: FilemakerJobApplicationApplyRunMongoDocument
): FilemakerJobApplicationApplyRun => ({
  id: normalizeId(document),
  applicationId: normalizeRequiredString(document.applicationId),
  artifactVersionIds: normalizeArtifactVersionIds(document.artifactVersionIds),
  completedAt: normalizeString(document.completedAt),
  confirmationUrl: normalizeString(document.confirmationUrl),
  connectionId: normalizeString(document.connectionId),
  createdAt: normalizeRequiredString(document.createdAt),
  error: normalizeString(document.error),
  integrationId: normalizeString(document.integrationId),
  integrationSlug: normalizeString(document.integrationSlug),
  jobListingId: normalizeRequiredString(document.jobListingId),
  mode: normalizeMode(document.mode),
  organizationId: normalizeRequiredString(document.organizationId),
  personId: normalizeRequiredString(document.personId),
  sourceUrl: normalizeString(document.sourceUrl),
  startedAt: normalizeString(document.startedAt),
  status: normalizeStatus(document.status),
  steps: normalizeSteps(document.steps),
  updatedAt: normalizeRequiredString(document.updatedAt),
});

export const createMongoFilemakerJobApplicationApplyRun = async (
  input: CreateMongoFilemakerJobApplicationApplyRunInput
): Promise<FilemakerJobApplicationApplyRun> => {
  const now = new Date().toISOString();
  const document: FilemakerJobApplicationApplyRunMongoDocument = {
    _id: input.id,
    id: input.id,
    applicationId: input.applicationId,
    artifactVersionIds: input.artifactVersionIds,
    completedAt: null,
    confirmationUrl: null,
    connectionId: input.connectionId,
    createdAt: now,
    error: null,
    integrationId: input.integrationId,
    integrationSlug: input.integrationSlug,
    jobListingId: input.jobListingId,
    mode: input.mode,
    organizationId: input.organizationId,
    personId: input.personId,
    sourceUrl: input.sourceUrl,
    startedAt: null,
    status: 'queued',
    steps: [],
    updatedAt: now,
  };
  const collection = await getCollection();
  await collection.insertOne(document);
  return toApplyRun(document);
};

export const getMongoFilemakerJobApplicationApplyRunById = async (
  runId: string
): Promise<FilemakerJobApplicationApplyRun | null> => {
  const collection = await getCollection();
  const document = await collection.findOne({ $or: [{ _id: runId }, { id: runId }] });
  return document !== null ? toApplyRun(document) : null;
};

export const requireMongoFilemakerJobApplicationApplyRunById = async (
  runId: string
): Promise<FilemakerJobApplicationApplyRun> => {
  const run = await getMongoFilemakerJobApplicationApplyRunById(runId);
  if (run === null) throw notFoundError('Filemaker job application apply run was not found.');
  return run;
};

export const getLatestMongoFilemakerJobApplicationApplyRun = async (
  applicationId: string
): Promise<FilemakerJobApplicationApplyRun | null> => {
  const collection = await getCollection();
  const document = await collection
    .find({ applicationId })
    .sort({ createdAt: -1, updatedAt: -1 })
    .limit(1)
    .next();
  return document !== null ? toApplyRun(document) : null;
};

export const updateMongoFilemakerJobApplicationApplyRun = async (
  runId: string,
  input: UpdateMongoFilemakerJobApplicationApplyRunInput
): Promise<FilemakerJobApplicationApplyRun> => {
  const set: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.completedAt !== undefined) set['completedAt'] = input.completedAt;
  if (input.confirmationUrl !== undefined) set['confirmationUrl'] = input.confirmationUrl;
  if (input.error !== undefined) set['error'] = input.error;
  if (input.sourceUrl !== undefined) set['sourceUrl'] = input.sourceUrl;
  if (input.startedAt !== undefined) set['startedAt'] = input.startedAt;
  if (input.status !== undefined) set['status'] = input.status;

  const collection = await getCollection();
  const result = await collection.updateOne(
    { $or: [{ _id: runId }, { id: runId }] },
    { $set: set }
  );
  if (result.matchedCount === 0) {
    throw notFoundError('Filemaker job application apply run was not found.');
  }
  return requireMongoFilemakerJobApplicationApplyRunById(runId);
};

export const appendMongoFilemakerJobApplicationApplyRunStep = async (
  runId: string,
  step: FilemakerJobApplicationApplyRunStep
): Promise<FilemakerJobApplicationApplyRun> => {
  const collection = await getCollection();
  const result = await collection.updateOne(
    { $or: [{ _id: runId }, { id: runId }] },
    {
      $push: { steps: step },
      $set: { updatedAt: new Date().toISOString() },
    }
  );
  if (result.matchedCount === 0) {
    throw notFoundError('Filemaker job application apply run was not found.');
  }
  return requireMongoFilemakerJobApplicationApplyRunById(runId);
};
