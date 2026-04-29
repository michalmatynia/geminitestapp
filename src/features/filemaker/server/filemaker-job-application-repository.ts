import 'server-only';

import type { Collection, Document, Filter } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  FilemakerJobApplicationActiveArtifacts,
  FilemakerJobApplicationArtifactKind,
  FilemakerJobApplicationArtifactVersion,
  FilemakerJobApplicationArtifactVersionSet,
  FilemakerJobApplication,
  FilemakerJobApplicationCoverLetter,
  FilemakerJobApplicationEmail,
  FilemakerJobApplicationStatus,
  FilemakerJobApplicationTailoredCv,
} from '../filemaker-job-application.types';

export const FILEMAKER_JOB_APPLICATIONS_COLLECTION = 'filemaker_job_applications';

export type FilemakerJobApplicationMongoDocument = Document & {
  _id: string;
  activeArtifacts?: unknown;
  activeApplicationEmailVersionId?: unknown;
  activeCoverLetterVersionId?: unknown;
  activeTailoredCvVersionId?: unknown;
  applicationEmail?: unknown;
  applicationNotes?: unknown;
  artifactVersions?: unknown;
  artifactKind?: unknown;
  artifactVersionCreatedAt?: unknown;
  artifactVersionId?: unknown;
  canonicalApplicationKey?: unknown;
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
  persistedArtifactVersions?: unknown;
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

export const buildFilemakerJobApplicationCanonicalKey = (input: {
  connectionId?: string | null;
  integrationId?: string | null;
  integrationSlug?: string | null;
  jobListingId: string;
  organizationId: string;
  personId: string;
}): string => {
  const integrationKey =
    input.integrationSlug?.trim() ||
    input.integrationId?.trim() ||
    input.connectionId?.trim() ||
    'default';
  return [
    input.personId.trim(),
    input.organizationId.trim(),
    input.jobListingId.trim(),
    integrationKey,
  ].join('::');
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

const normalizeStatus = (value: unknown): FilemakerJobApplicationStatus => {
  if (
    value === 'ready' ||
    value === 'applied' ||
    value === 'rejected' ||
    value === 'archived' ||
    value === 'draft'
  ) {
    return value;
  }
  return 'draft';
};

const normalizeArtifactKind = (
  value: unknown
): FilemakerJobApplicationArtifactKind | null => {
  if (value === 'application_email' || value === 'cover_letter' || value === 'tailored_cv') {
    return value;
  }
  return null;
};

const normalizeArtifactVersion = (
  value: unknown,
  kind: FilemakerJobApplicationArtifactKind
): FilemakerJobApplicationArtifactVersion | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  const id =
    normalizeString(record['id']) ??
    normalizeString(record['versionId']) ??
    normalizeString(record['artifactVersionId']);
  if (id === null) return null;
  return {
    id,
    applicationNotes: normalizeStringArray(record['applicationNotes']),
    confidence: normalizeNumber(record['confidence']),
    createdAt: normalizeString(record['createdAt']),
    kind,
    linkedRecordId: normalizeString(record['linkedRecordId']),
    missingInformation: normalizeStringArray(record['missingInformation']),
    payload: normalizeRecord(record['payload']),
    sourceRunId: normalizeString(record['sourceRunId']),
    version: normalizeNumber(record['version']),
  };
};

const normalizeArtifactVersionArray = (
  value: unknown,
  kind: FilemakerJobApplicationArtifactKind
): FilemakerJobApplicationArtifactVersion[] =>
  Array.isArray(value)
    ? value
        .map((entry: unknown, index: number): FilemakerJobApplicationArtifactVersion | null => {
          const version = normalizeArtifactVersion(entry, kind);
          return version === null
            ? null
            : {
                ...version,
                version: version.version ?? index + 1,
              };
        })
        .filter((entry): entry is FilemakerJobApplicationArtifactVersion => entry !== null)
    : [];

const normalizePersistedArtifactVersions = (
  value: unknown
): FilemakerJobApplicationArtifactVersionSet | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  const versions: FilemakerJobApplicationArtifactVersionSet = {
    applicationEmail: normalizeArtifactVersionArray(record['applicationEmail'], 'application_email'),
    coverLetter: normalizeArtifactVersionArray(record['coverLetter'], 'cover_letter'),
    tailoredCv: normalizeArtifactVersionArray(record['tailoredCv'], 'tailored_cv'),
  };
  return versions.applicationEmail.length > 0 ||
    versions.coverLetter.length > 0 ||
    versions.tailoredCv.length > 0
    ? versions
    : null;
};

const normalizeActiveArtifacts = (
  value: unknown
): FilemakerJobApplicationActiveArtifacts | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  return {
    applicationEmailVersionId: normalizeString(record['applicationEmailVersionId']),
    coverLetterVersionId: normalizeString(record['coverLetterVersionId']),
    tailoredCvVersionId: normalizeString(record['tailoredCvVersionId']),
  };
};

const normalizeRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeId = (document: FilemakerJobApplicationMongoDocument): string => {
  const id = normalizeString(document.id);
  if (id !== null) return id;
  return document._id;
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

const toApplicationEmail = (value: unknown): FilemakerJobApplicationEmail | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  return {
    bodyMarkdown: normalizeString(record['bodyMarkdown']),
    bodyText: normalizeString(record['bodyText']),
    subject: normalizeString(record['subject']),
  };
};

const toFilemakerJobApplication = (
  document: FilemakerJobApplicationMongoDocument
): FilemakerJobApplication => {
  const personId = normalizeRequiredString(document.personId);
  const organizationId = normalizeRequiredString(document.organizationId);
  const jobListingId = normalizeRequiredString(document.jobListingId);
  const integrationId = normalizeString(document.integrationId);
  const integrationSlug = normalizeString(document.integrationSlug);
  const connectionId = normalizeString(document.connectionId);
  const fallbackCanonicalKey =
    personId.length > 0 && organizationId.length > 0 && jobListingId.length > 0
      ? buildFilemakerJobApplicationCanonicalKey({
          connectionId,
          integrationId,
          integrationSlug,
          jobListingId,
          organizationId,
          personId,
        })
      : null;

  return {
    id: normalizeId(document),
    activeArtifacts: normalizeActiveArtifacts(
      document.activeArtifacts ?? {
        applicationEmailVersionId: document.activeApplicationEmailVersionId,
        coverLetterVersionId: document.activeCoverLetterVersionId,
        tailoredCvVersionId: document.activeTailoredCvVersionId,
      }
    ),
    artifactKind: normalizeArtifactKind(document.artifactKind),
    artifactVersionCreatedAt: normalizeString(document.artifactVersionCreatedAt),
    artifactVersionId: normalizeString(document.artifactVersionId),
    artifactVersions: normalizePersistedArtifactVersions(
      document.artifactVersions ?? document.persistedArtifactVersions
    ),
    persistedArtifactVersions: normalizePersistedArtifactVersions(
      document.persistedArtifactVersions ?? document.artifactVersions
    ),
    canonicalApplicationKey: normalizeString(document.canonicalApplicationKey) ?? fallbackCanonicalKey,
    status: normalizeStatus(document.status),
    personId,
    personName: normalizeString(document.personName),
    organizationId,
    organizationName: normalizeString(document.organizationName),
    jobListingId,
    jobTitle: normalizeString(document.jobTitle),
    integrationId,
    integrationSlug,
    connectionId,
    tailoredCvId: normalizeString(document.tailoredCvId),
    tailoredCv: toTailoredCv(document.tailoredCv),
    coverLetter: toCoverLetter(document.coverLetter),
    applicationEmail: toApplicationEmail(document.applicationEmail),
    applicationNotes: normalizeStringArray(document.applicationNotes),
    missingInformation: normalizeStringArray(document.missingInformation),
    confidence: normalizeNumber(document.confidence),
    source: normalizeString(document.source),
    sourceEntityId: normalizeString(document.sourceEntityId),
    sourceApplicationContext: normalizeRecord(document.sourceApplicationContext),
    createdAt: normalizeRequiredString(document.createdAt),
    updatedAt: normalizeRequiredString(document.updatedAt),
  };
};

export const getMongoFilemakerJobApplicationById = async (
  applicationId: string
): Promise<FilemakerJobApplication | null> => {
  const collection = await getFilemakerJobApplicationsCollection();
  const document = await collection.findOne({
    $or: [{ _id: applicationId }, { id: applicationId }],
  });
  return document !== null ? toFilemakerJobApplication(document) : null;
};

export const requireMongoFilemakerJobApplicationById = async (
  applicationId: string
): Promise<FilemakerJobApplication> => {
  const application = await getMongoFilemakerJobApplicationById(applicationId);
  if (application === null) throw notFoundError('Filemaker job application was not found.');
  return application;
};

const normalizeLimit = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return 24;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
};

export const listMongoFilemakerJobApplications = async (
  input: ListMongoFilemakerJobApplicationsInput
): Promise<FilemakerJobApplication[]> => {
  const filter: Filter<FilemakerJobApplicationMongoDocument> = {};
  const organizationId = normalizeString(input.organizationId);
  const jobListingId = normalizeString(input.jobListingId);
  const personId = normalizeString(input.personId);

  if (organizationId !== null) filter['organizationId'] = organizationId;
  if (jobListingId !== null) filter['jobListingId'] = jobListingId;
  if (personId !== null) filter['personId'] = personId;

  if (Object.keys(filter).length === 0) return [];

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
  status: FilemakerJobApplicationStatus
): Promise<FilemakerJobApplication> => {
  const collection = await getFilemakerJobApplicationsCollection();
  const existing = await collection.findOne({
    $or: [{ _id: applicationId }, { id: applicationId }],
  });
  if (existing === null) throw notFoundError('Filemaker job application was not found.');

  await collection.updateOne(
    { _id: existing._id },
    {
      $set: {
        status,
        updatedAt: new Date().toISOString(),
      },
    }
  );
  return requireMongoFilemakerJobApplicationById(normalizeId(existing));
};

export const updateMongoFilemakerJobApplicationActiveArtifacts = async (
  applicationId: string,
  activeArtifacts: FilemakerJobApplicationActiveArtifacts
): Promise<FilemakerJobApplication> => {
  const collection = await getFilemakerJobApplicationsCollection();
  const existing = await collection.findOne({
    $or: [{ _id: applicationId }, { id: applicationId }],
  });
  if (existing === null) throw notFoundError('Filemaker job application was not found.');

  const persistedVersions =
    normalizePersistedArtifactVersions(existing.artifactVersions ?? existing.persistedArtifactVersions) ??
    {
      applicationEmail: [],
      coverLetter: [],
      tailoredCv: [],
    };
  const nextActiveArtifacts = {
    applicationEmailVersionId: normalizeString(activeArtifacts.applicationEmailVersionId),
    coverLetterVersionId: normalizeString(activeArtifacts.coverLetterVersionId),
    tailoredCvVersionId: normalizeString(activeArtifacts.tailoredCvVersionId),
  };
  const activeApplicationEmail = findArtifactVersionById(
    persistedVersions.applicationEmail,
    nextActiveArtifacts.applicationEmailVersionId
  );
  const activeCoverLetter = findArtifactVersionById(
    persistedVersions.coverLetter,
    nextActiveArtifacts.coverLetterVersionId
  );
  const activeTailoredCv = findArtifactVersionById(
    persistedVersions.tailoredCv,
    nextActiveArtifacts.tailoredCvVersionId
  );
  const allActiveVersions = [
    activeTailoredCv,
    activeCoverLetter,
    activeApplicationEmail,
  ].filter((version): version is FilemakerJobApplicationArtifactVersion => version !== null);

  await collection.updateOne(
    { _id: existing._id },
    {
      $set: {
        activeArtifacts: nextActiveArtifacts,
        activeApplicationEmailVersionId: nextActiveArtifacts.applicationEmailVersionId,
        activeCoverLetterVersionId: nextActiveArtifacts.coverLetterVersionId,
        activeTailoredCvVersionId: nextActiveArtifacts.tailoredCvVersionId,
        applicationEmail: activeApplicationEmail?.payload ?? null,
        applicationNotes: mergeArtifactVersionStrings(allActiveVersions, 'applicationNotes'),
        coverLetter: activeCoverLetter?.payload ?? null,
        confidence:
          activeTailoredCv?.confidence ??
          activeCoverLetter?.confidence ??
          activeApplicationEmail?.confidence ??
          normalizeNumber(existing.confidence),
        missingInformation: mergeArtifactVersionStrings(allActiveVersions, 'missingInformation'),
        tailoredCv: activeTailoredCv?.payload ?? null,
        tailoredCvId: activeTailoredCv?.linkedRecordId ?? null,
        updatedAt: new Date().toISOString(),
      },
    }
  );
  return requireMongoFilemakerJobApplicationById(normalizeId(existing));
};

export const deleteMongoFilemakerJobApplication = async (
  applicationId: string
): Promise<void> => {
  const collection = await getFilemakerJobApplicationsCollection();
  const result = await collection.deleteOne({
    $or: [{ _id: applicationId }, { id: applicationId }],
  });
  if (result.deletedCount === 0) {
    throw notFoundError('Filemaker job application was not found.');
  }
};

export type CollapseLegacyMongoFilemakerJobApplicationsResult = {
  canonicalApplicationsCreated: number;
  canonicalApplicationsUpdated: number;
  legacyApplicationsDeleted: number;
  legacyGroupsSkipped: number;
};

const createArtifactVersionsFromApplication = (
  application: FilemakerJobApplication
): FilemakerJobApplicationArtifactVersion[] => {
  const resolveVersionId = (
    kind: FilemakerJobApplicationArtifactKind,
    fallback: string
  ): string =>
    application.artifactKind === kind
      ? application.artifactVersionId ?? fallback
      : fallback;
  const base = {
    applicationNotes: application.applicationNotes,
    confidence: application.confidence,
    createdAt: application.artifactVersionCreatedAt ?? application.createdAt,
    missingInformation: application.missingInformation,
    sourceRunId: application.sourceEntityId,
    version: application.artifactVersionNumber ?? null,
  };
  const versions: FilemakerJobApplicationArtifactVersion[] = [];
  if (application.tailoredCv !== null || application.tailoredCvId !== null) {
    versions.push({
      ...base,
      id: resolveVersionId('tailored_cv', `legacy-tailored-cv-${application.id}`),
      kind: 'tailored_cv',
      linkedRecordId: application.tailoredCvId,
      payload: normalizeRecord(application.tailoredCv),
    });
  }
  if (application.coverLetter !== null) {
    versions.push({
      ...base,
      id: resolveVersionId('cover_letter', `legacy-cover-letter-${application.id}`),
      kind: 'cover_letter',
      linkedRecordId: null,
      payload: normalizeRecord(application.coverLetter),
    });
  }
  if (application.applicationEmail !== null) {
    versions.push({
      ...base,
      id: resolveVersionId('application_email', `legacy-application-email-${application.id}`),
      kind: 'application_email',
      linkedRecordId: null,
      payload: normalizeRecord(application.applicationEmail),
    });
  }
  return versions;
};

const compareArtifactVersionsByFreshness = (
  left: FilemakerJobApplicationArtifactVersion,
  right: FilemakerJobApplicationArtifactVersion
): number => {
  const dateOrder = normalizeRequiredString(right.createdAt).localeCompare(
    normalizeRequiredString(left.createdAt)
  );
  if (dateOrder !== 0) return dateOrder;
  return (right.version ?? 0) - (left.version ?? 0);
};

const dedupeArtifactVersions = (
  versions: FilemakerJobApplicationArtifactVersion[]
): FilemakerJobApplicationArtifactVersion[] => {
  const seen = new Set<string>();
  return versions.filter((version: FilemakerJobApplicationArtifactVersion): boolean => {
    const id = version.id.trim();
    if (id.length === 0 || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const assignFallbackArtifactVersionNumbers = (
  versions: FilemakerJobApplicationArtifactVersion[]
): FilemakerJobApplicationArtifactVersion[] => {
  const chronological = versions.slice().sort((left, right): number => {
    const dateOrder = normalizeRequiredString(left.createdAt).localeCompare(
      normalizeRequiredString(right.createdAt)
    );
    if (dateOrder !== 0) return dateOrder;
    return (left.version ?? 0) - (right.version ?? 0);
  });
  const numbered = chronological.map(
    (
      version: FilemakerJobApplicationArtifactVersion,
      index: number
    ): FilemakerJobApplicationArtifactVersion => ({
      ...version,
      version: version.version ?? index + 1,
    })
  );
  return numbered.sort(compareArtifactVersionsByFreshness);
};

const mergeArtifactVersionArrays = (
  existing: FilemakerJobApplicationArtifactVersion[],
  legacy: FilemakerJobApplicationArtifactVersion[]
): FilemakerJobApplicationArtifactVersion[] =>
  assignFallbackArtifactVersionNumbers(dedupeArtifactVersions([...existing, ...legacy]));

const selectActiveArtifactVersionId = (
  requestedId: string | null | undefined,
  versions: FilemakerJobApplicationArtifactVersion[]
): string | null => {
  const normalizedRequestedId = normalizeString(requestedId);
  if (
    normalizedRequestedId !== null &&
    versions.some(
      (version: FilemakerJobApplicationArtifactVersion): boolean =>
        version.id === normalizedRequestedId
    )
  ) {
    return normalizedRequestedId;
  }
  return normalizeString(versions[0]?.id) ?? null;
};

const findArtifactVersionById = (
  versions: FilemakerJobApplicationArtifactVersion[],
  versionId: string | null
): FilemakerJobApplicationArtifactVersion | null =>
  versionId === null
    ? null
    : versions.find(
        (version: FilemakerJobApplicationArtifactVersion): boolean => version.id === versionId
      ) ?? null;

const mergeArtifactVersionStrings = (
  versions: FilemakerJobApplicationArtifactVersion[],
  field: 'applicationNotes' | 'missingInformation'
): string[] => {
  const values = new Set<string>();
  versions.forEach((version: FilemakerJobApplicationArtifactVersion): void => {
    version[field].forEach((value: string): void => {
      const normalized = value.trim();
      if (normalized.length > 0) values.add(normalized);
    });
  });
  return Array.from(values);
};

export const collapseLegacyMongoFilemakerJobApplicationsForListing = async (input: {
  jobListingId: string;
  organizationId: string;
  personId?: string | null;
}): Promise<CollapseLegacyMongoFilemakerJobApplicationsResult> => {
  const applications = await listMongoFilemakerJobApplications({
    jobListingId: input.jobListingId,
    limit: 100,
    organizationId: input.organizationId,
    personId: input.personId,
  });
  const legacyApplications = applications.filter(
    (application: FilemakerJobApplication): boolean =>
      application.artifactVersions === null || application.artifactVersions === undefined
  );
  const groups = new Map<string, FilemakerJobApplication[]>();
  legacyApplications.forEach((application: FilemakerJobApplication): void => {
    const canonicalKey = application.canonicalApplicationKey;
    if (canonicalKey === null || canonicalKey.trim().length === 0) return;
    const group = groups.get(canonicalKey) ?? [];
    group.push(application);
    groups.set(canonicalKey, group);
  });

  const collection = await getFilemakerJobApplicationsCollection();
  let canonicalApplicationsCreated = 0;
  let canonicalApplicationsUpdated = 0;
  let legacyApplicationsDeleted = 0;
  let legacyGroupsSkipped = 0;
  for (const [canonicalKey, group] of groups.entries()) {
    const canonicalId = `ai-job-application-${canonicalKey.replace(/::/g, '-')}`;
    const existingContainer = await collection.findOne({
      $or: [
        { canonicalApplicationKey: canonicalKey, artifactVersions: { $exists: true } },
        { _id: canonicalId, artifactVersions: { $exists: true } },
        { id: canonicalId, artifactVersions: { $exists: true } },
      ],
    });
    if (group.length <= 1 && existingContainer === null) {
      legacyGroupsSkipped += 1;
      continue;
    }
    const sorted = group.slice().sort((left, right): number =>
      normalizeRequiredString(right.updatedAt).localeCompare(normalizeRequiredString(left.updatedAt))
    );
    const base = sorted[0];
    if (base === undefined) {
      legacyGroupsSkipped += 1;
      continue;
    }
    const existingVersions =
      normalizePersistedArtifactVersions(
        existingContainer?.artifactVersions ?? existingContainer?.persistedArtifactVersions
      ) ?? {
        applicationEmail: [],
        coverLetter: [],
        tailoredCv: [],
      };
    const legacyVersions = {
      applicationEmail: [] as FilemakerJobApplicationArtifactVersion[],
      coverLetter: [] as FilemakerJobApplicationArtifactVersion[],
      tailoredCv: [] as FilemakerJobApplicationArtifactVersion[],
    };
    sorted.forEach((application: FilemakerJobApplication): void => {
      createArtifactVersionsFromApplication(application).forEach(
        (version: FilemakerJobApplicationArtifactVersion): void => {
          if (version.kind === 'tailored_cv') legacyVersions.tailoredCv.push(version);
          if (version.kind === 'cover_letter') legacyVersions.coverLetter.push(version);
          if (version.kind === 'application_email') legacyVersions.applicationEmail.push(version);
        }
      );
    });
    const artifactVersions = {
      applicationEmail: mergeArtifactVersionArrays(
        existingVersions.applicationEmail,
        legacyVersions.applicationEmail
      ),
      coverLetter: mergeArtifactVersionArrays(
        existingVersions.coverLetter,
        legacyVersions.coverLetter
      ),
      tailoredCv: mergeArtifactVersionArrays(existingVersions.tailoredCv, legacyVersions.tailoredCv),
    };
    const existingActiveArtifacts = normalizeActiveArtifacts(
      existingContainer?.activeArtifacts ?? {
        applicationEmailVersionId: existingContainer?.activeApplicationEmailVersionId,
        coverLetterVersionId: existingContainer?.activeCoverLetterVersionId,
        tailoredCvVersionId: existingContainer?.activeTailoredCvVersionId,
      }
    );
    const activeArtifacts = {
      applicationEmailVersionId: selectActiveArtifactVersionId(
        existingActiveArtifacts?.applicationEmailVersionId,
        artifactVersions.applicationEmail
      ),
      coverLetterVersionId: selectActiveArtifactVersionId(
        existingActiveArtifacts?.coverLetterVersionId,
        artifactVersions.coverLetter
      ),
      tailoredCvVersionId: selectActiveArtifactVersionId(
        existingActiveArtifacts?.tailoredCvVersionId,
        artifactVersions.tailoredCv
      ),
    };
    const activeApplicationEmail = findArtifactVersionById(
      artifactVersions.applicationEmail,
      activeArtifacts.applicationEmailVersionId
    );
    const activeCoverLetter = findArtifactVersionById(
      artifactVersions.coverLetter,
      activeArtifacts.coverLetterVersionId
    );
    const activeTailoredCv = findArtifactVersionById(
      artifactVersions.tailoredCv,
      activeArtifacts.tailoredCvVersionId
    );
    const updateFilter =
      existingContainer !== null
        ? { _id: existingContainer._id }
        : { _id: canonicalId };
    await collection.updateOne(
      updateFilter,
      {
        $setOnInsert: {
          _id: canonicalId,
          id: canonicalId,
          createdAt: base.createdAt,
        },
        $set: {
          activeArtifacts,
          activeApplicationEmailVersionId: activeArtifacts.applicationEmailVersionId,
          activeCoverLetterVersionId: activeArtifacts.coverLetterVersionId,
          activeTailoredCvVersionId: activeArtifacts.tailoredCvVersionId,
          applicationEmail: activeApplicationEmail?.payload ?? null,
          applicationNotes: mergeArtifactVersionStrings(
            [
              ...artifactVersions.tailoredCv,
              ...artifactVersions.coverLetter,
              ...artifactVersions.applicationEmail,
            ],
            'applicationNotes'
          ),
          artifactVersions,
          canonicalApplicationKey: canonicalKey,
          connectionId: base.connectionId,
          coverLetter: activeCoverLetter?.payload ?? null,
          confidence:
            activeTailoredCv?.confidence ??
            activeCoverLetter?.confidence ??
            activeApplicationEmail?.confidence ??
            base.confidence,
          integrationId: base.integrationId,
          integrationSlug: base.integrationSlug,
          jobListingId: base.jobListingId,
          jobTitle: base.jobTitle,
          missingInformation: mergeArtifactVersionStrings(
            [
              ...artifactVersions.tailoredCv,
              ...artifactVersions.coverLetter,
              ...artifactVersions.applicationEmail,
            ],
            'missingInformation'
          ),
          organizationId: base.organizationId,
          organizationName: base.organizationName,
          personId: base.personId,
          personName: base.personName,
          status: base.status,
          tailoredCv: activeTailoredCv?.payload ?? null,
          tailoredCvId: activeTailoredCv?.linkedRecordId ?? null,
          updatedAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    if (existingContainer === null) {
      canonicalApplicationsCreated += 1;
    } else {
      canonicalApplicationsUpdated += 1;
    }
    const legacyIds = sorted
      .map((application: FilemakerJobApplication): string => application.id)
      .filter((applicationId: string): boolean => applicationId !== canonicalId);
    const deleteResult = await collection.deleteMany({
      $or: [{ id: { $in: legacyIds } }, { _id: { $in: legacyIds } }],
    });
    legacyApplicationsDeleted += deleteResult.deletedCount;
  }

  return {
    canonicalApplicationsCreated,
    canonicalApplicationsUpdated,
    legacyApplicationsDeleted,
    legacyGroupsSkipped,
  };
};
