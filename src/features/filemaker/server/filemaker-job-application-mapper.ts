import type {
  FilemakerJobApplication,
  FilemakerJobApplicationLogEntry,
  FilemakerJobApplicationLogMethod,
} from '../filemaker-job-application.types';
import { normalizeId as normalizeMongoId } from '@/shared/lib/db/services/sync-utils';
import { buildFilemakerJobApplicationCanonicalKey } from './filemaker-job-application-canonical-key';
import type { FilemakerJobApplicationMongoDocument } from './filemaker-job-application-repository.types';
import {
  normalizeActiveArtifacts,
  normalizePersistedArtifactVersions,
  normalizeTailoredCvSourceFallback,
} from './filemaker-job-application-normalize-artifacts';
import {
  normalizeArtifactKind,
  normalizeMatchAnalysisStatus,
  normalizeNumber,
  normalizeOptionalStatus,
  normalizeRecord,
  normalizeRequiredString,
  normalizeStatus,
  normalizeString,
  normalizeStringArray,
} from './filemaker-job-application-normalize-base';
import {
  toApplicationEmail,
  toCoverLetter,
  toTailoredCv,
} from './filemaker-job-application-normalize-content';
import {
  normalizeMatchAnalysisHistory,
  toMatchAnalysis,
} from './filemaker-job-application-normalize-match';

const normalizeLogMethod = (value: unknown): FilemakerJobApplicationLogMethod => {
  if (value === 'manual' || value === 'apply_script') return value;
  return 'manual';
};

const normalizeLogEntry = (value: unknown): FilemakerJobApplicationLogEntry | null => {
  if (value === null || value === undefined || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const appliedAt = normalizeString(record['appliedAt']);
  if (appliedAt === null) return null;
  return {
    id: normalizeString(record['id']) ?? `log-${appliedAt}`,
    appliedAt,
    method: normalizeLogMethod(record['method']),
    personId: normalizeString(record['personId']),
    personName: normalizeString(record['personName']),
    toStatus: normalizeOptionalStatus(record['toStatus']),
  };
};

const normalizeApplicationLog = (value: unknown): FilemakerJobApplicationLogEntry[] | null => {
  if (!Array.isArray(value)) return null;
  const entries = value
    .map((entry: unknown) => normalizeLogEntry(entry))
    .filter((entry): entry is FilemakerJobApplicationLogEntry => entry !== null);
  return entries.length > 0 ? entries : null;
};

export const normalizeId = (document: FilemakerJobApplicationMongoDocument): string => {
  return normalizeMongoId(document);
};

const buildFallbackCanonicalKey = (input: {
  connectionId: string | null;
  integrationId: string | null;
  integrationSlug: string | null;
  jobListingId: string;
  organizationId: string;
  personId: string;
}): string | null => {
  if (input.personId.length === 0) return null;
  if (input.organizationId.length === 0) return null;
  if (input.jobListingId.length === 0) return null;
  return buildFilemakerJobApplicationCanonicalKey(input);
};

const buildApplicationIdentity = (document: FilemakerJobApplicationMongoDocument): {
  connectionId: string | null;
  integrationId: string | null;
  integrationSlug: string | null;
  jobListingId: string;
  organizationId: string;
  personId: string;
} => ({
  connectionId: normalizeString(document.connectionId),
  integrationId: normalizeString(document.integrationId),
  integrationSlug: normalizeString(document.integrationSlug),
  jobListingId: normalizeRequiredString(document.jobListingId),
  organizationId: normalizeRequiredString(document.organizationId),
  personId: normalizeRequiredString(document.personId),
});

const buildApplicationArtifacts = (
  document: FilemakerJobApplicationMongoDocument,
  sourceApplicationContext: Record<string, unknown> | null
): Pick<
  FilemakerJobApplication,
  'activeArtifacts' | 'artifactVersions' | 'persistedArtifactVersions' | 'tailoredCv'
> => {
  const sourceFallback = normalizeTailoredCvSourceFallback(sourceApplicationContext);
  return {
    activeArtifacts: normalizeActiveArtifacts(
      document.activeArtifacts ?? {
        applicationEmailVersionId: document.activeApplicationEmailVersionId,
        coverLetterVersionId: document.activeCoverLetterVersionId,
        tailoredCvVersionId: document.activeTailoredCvVersionId,
      }
    ),
    artifactVersions: normalizePersistedArtifactVersions(
      document.artifactVersions ?? document.persistedArtifactVersions,
      sourceFallback
    ),
    persistedArtifactVersions: normalizePersistedArtifactVersions(
      document.persistedArtifactVersions ?? document.artifactVersions,
      sourceFallback
    ),
    tailoredCv: toTailoredCv(document.tailoredCv, sourceFallback),
  };
};

const buildApplicationAnalysis = (
  document: FilemakerJobApplicationMongoDocument
): Pick<
  FilemakerJobApplication,
  | 'matchAnalysis'
  | 'matchAnalysisHistory'
  | 'matchAnalysisModelId'
  | 'matchAnalysisSourceEntityId'
  | 'matchAnalysisStatus'
  | 'matchAnalysisUpdatedAt'
> => ({
  matchAnalysis: toMatchAnalysis(document.matchAnalysis),
  matchAnalysisHistory: normalizeMatchAnalysisHistory(document.matchAnalysisHistory),
  matchAnalysisModelId: normalizeString(document.matchAnalysisModelId),
  matchAnalysisSourceEntityId: normalizeString(document.matchAnalysisSourceEntityId),
  matchAnalysisStatus: normalizeMatchAnalysisStatus(document.matchAnalysisStatus),
  matchAnalysisUpdatedAt: normalizeString(document.matchAnalysisUpdatedAt),
});

export const toFilemakerJobApplication = (
  document: FilemakerJobApplicationMongoDocument
): FilemakerJobApplication => {
  const identity = buildApplicationIdentity(document);
  const sourceApplicationContext = normalizeRecord(document.sourceApplicationContext);
  return {
    id: normalizeId(document),
    ...buildApplicationArtifacts(document, sourceApplicationContext),
    artifactKind: normalizeArtifactKind(document.artifactKind),
    artifactVersionCreatedAt: normalizeString(document.artifactVersionCreatedAt),
    artifactVersionId: normalizeString(document.artifactVersionId),
    canonicalApplicationKey:
      normalizeString(document.canonicalApplicationKey) ?? buildFallbackCanonicalKey(identity),
    status: normalizeStatus(document.status),
    personName: normalizeString(document.personName),
    organizationName: normalizeString(document.organizationName),
    jobTitle: normalizeString(document.jobTitle),
    tailoredCvId: normalizeString(document.tailoredCvId),
    coverLetter: toCoverLetter(document.coverLetter),
    applicationEmail: toApplicationEmail(document.applicationEmail),
    ...buildApplicationAnalysis(document),
    applicationNotes: normalizeStringArray(document.applicationNotes),
    missingInformation: normalizeStringArray(document.missingInformation),
    confidence: normalizeNumber(document.confidence),
    source: normalizeString(document.source),
    sourceEntityId: normalizeString(document.sourceEntityId),
    sourceApplicationContext,
    applicationLog: normalizeApplicationLog(document.applicationLog),
    createdAt: normalizeRequiredString(document.createdAt),
    updatedAt: normalizeRequiredString(document.updatedAt),
    ...identity,
  };
};
