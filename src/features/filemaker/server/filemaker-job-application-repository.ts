import 'server-only';

import type { Collection, Document } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerJobApplication,
  FilemakerJobApplicationCoverLetter,
  FilemakerJobApplicationTailoredCv,
} from '../filemaker-job-application.types';

export const FILEMAKER_JOB_APPLICATIONS_COLLECTION = 'filemaker_job_applications';

export type FilemakerJobApplicationMongoDocument = Document & {
  _id?: unknown;
  applicationNotes?: unknown;
  confidence?: unknown;
  connectionId?: unknown;
  coverLetter?: unknown;
  createdAt?: unknown;
  id?: unknown;
  integrationId?: unknown;
  integrationSlug?: unknown;
  jobListingId?: unknown;
  jobTitle?: unknown;
  missingInformation?: unknown;
  organizationId?: unknown;
  organizationName?: unknown;
  personId?: unknown;
  personName?: unknown;
  source?: unknown;
  sourceApplicationContext?: unknown;
  sourceEntityId?: unknown;
  status?: unknown;
  tailoredCv?: unknown;
  tailoredCvId?: unknown;
  updatedAt?: unknown;
};

export type ListMongoFilemakerJobApplicationsInput = {
  jobListingId?: string | null;
  limit?: number;
  organizationId?: string | null;
  personId?: string | null;
};

const getFilemakerJobApplicationsCollection = async (): Promise<
  Collection<FilemakerJobApplicationMongoDocument>
> => {
  const db = await getMongoDb();
  return db.collection<FilemakerJobApplicationMongoDocument>(
    FILEMAKER_JOB_APPLICATIONS_COLLECTION
  );
};

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRequiredString = (value: unknown, fallback = ''): string =>
  normalizeString(value) ?? fallback;

const normalizeStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value
        .map((entry: unknown): string | null => normalizeString(entry))
        .filter((entry): entry is string => entry !== null)
    : [];

const normalizeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const normalizeRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeId = (document: FilemakerJobApplicationMongoDocument): string => {
  const id = normalizeString(document.id);
  if (id !== null) return id;
  if (document._id !== null && document._id !== undefined) return String(document._id);
  return '';
};

const toTailoredCv = (value: unknown): FilemakerJobApplicationTailoredCv | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  return {
    bodyMarkdown: normalizeString(record['bodyMarkdown']),
    bodyText: normalizeString(record['bodyText']),
    educationHighlights: normalizeStringArray(record['educationHighlights']),
    experienceHighlights: normalizeStringArray(record['experienceHighlights']),
    preferencesMatch: normalizeStringArray(record['preferencesMatch']),
    professionalSummary: normalizeString(record['professionalSummary']),
    skills: normalizeStringArray(record['skills']),
    title: normalizeString(record['title']),
  };
};

const toCoverLetter = (value: unknown): FilemakerJobApplicationCoverLetter | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  return {
    bodyMarkdown: normalizeString(record['bodyMarkdown']),
    subject: normalizeString(record['subject']),
  };
};

const toFilemakerJobApplication = (
  document: FilemakerJobApplicationMongoDocument
): FilemakerJobApplication => ({
  id: normalizeId(document),
  status: normalizeRequiredString(document.status, 'draft'),
  personId: normalizeRequiredString(document.personId),
  personName: normalizeString(document.personName),
  organizationId: normalizeRequiredString(document.organizationId),
  organizationName: normalizeString(document.organizationName),
  jobListingId: normalizeRequiredString(document.jobListingId),
  jobTitle: normalizeString(document.jobTitle),
  integrationId: normalizeString(document.integrationId),
  integrationSlug: normalizeString(document.integrationSlug),
  connectionId: normalizeString(document.connectionId),
  tailoredCvId: normalizeString(document.tailoredCvId),
  tailoredCv: toTailoredCv(document.tailoredCv),
  coverLetter: toCoverLetter(document.coverLetter),
  applicationNotes: normalizeStringArray(document.applicationNotes),
  missingInformation: normalizeStringArray(document.missingInformation),
  confidence: normalizeNumber(document.confidence),
  source: normalizeString(document.source),
  sourceEntityId: normalizeString(document.sourceEntityId),
  sourceApplicationContext: normalizeRecord(document.sourceApplicationContext),
  createdAt: normalizeRequiredString(document.createdAt),
  updatedAt: normalizeRequiredString(document.updatedAt),
});

const normalizeLimit = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return 24;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
};

export const listMongoFilemakerJobApplications = async (
  input: ListMongoFilemakerJobApplicationsInput
): Promise<FilemakerJobApplication[]> => {
  const filter: Record<string, string> = {};
  const organizationId = normalizeString(input.organizationId);
  const jobListingId = normalizeString(input.jobListingId);
  const personId = normalizeString(input.personId);

  if (organizationId !== null) filter.organizationId = organizationId;
  if (jobListingId !== null) filter.jobListingId = jobListingId;
  if (personId !== null) filter.personId = personId;

  if (Object.keys(filter).length === 0) return [];

  const collection = await getFilemakerJobApplicationsCollection();
  const documents = await collection
    .find(filter)
    .sort({ createdAt: -1, updatedAt: -1 })
    .limit(normalizeLimit(input.limit))
    .toArray();
  return documents.map(toFilemakerJobApplication);
};
