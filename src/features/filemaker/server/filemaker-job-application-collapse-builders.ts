import type {
  FilemakerJobApplication,
  FilemakerJobApplicationArtifactVersion,
  FilemakerJobApplicationArtifactVersionSet,
} from '../filemaker-job-application.types';
import {
  findArtifactVersionById,
  mergeArtifactVersionStrings,
  selectActiveArtifactVersionId,
} from './filemaker-job-application-artifact-versions';
import {
  normalizeActiveArtifacts,
} from './filemaker-job-application-normalize-artifacts';
import type { FilemakerJobApplicationMongoDocument } from './filemaker-job-application-repository.types';

export type ActiveArtifacts = {
  applicationEmailVersionId: string | null;
  coverLetterVersionId: string | null;
  tailoredCvVersionId: string | null;
};

type ActiveArtifactVersions = {
  activeApplicationEmail: FilemakerJobApplicationArtifactVersion | null;
  activeCoverLetter: FilemakerJobApplicationArtifactVersion | null;
  activeTailoredCv: FilemakerJobApplicationArtifactVersion | null;
};

export const resolveActiveArtifacts = (
  existingContainer: FilemakerJobApplicationMongoDocument | null,
  artifactVersions: FilemakerJobApplicationArtifactVersionSet
): ActiveArtifacts => {
  const existingActiveArtifacts =
    existingContainer === null
      ? null
      : normalizeActiveArtifacts(
          existingContainer.activeArtifacts ?? {
            applicationEmailVersionId: existingContainer.activeApplicationEmailVersionId,
            coverLetterVersionId: existingContainer.activeCoverLetterVersionId,
            tailoredCvVersionId: existingContainer.activeTailoredCvVersionId,
          }
        );
  return {
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
};

const resolveActiveArtifactVersions = (
  activeArtifacts: ActiveArtifacts,
  artifactVersions: FilemakerJobApplicationArtifactVersionSet
): ActiveArtifactVersions => ({
  activeApplicationEmail: findArtifactVersionById(
    artifactVersions.applicationEmail,
    activeArtifacts.applicationEmailVersionId
  ),
  activeCoverLetter: findArtifactVersionById(
    artifactVersions.coverLetter,
    activeArtifacts.coverLetterVersionId
  ),
  activeTailoredCv: findArtifactVersionById(
    artifactVersions.tailoredCv,
    activeArtifacts.tailoredCvVersionId
  ),
});

const resolveArtifactPayload = (
  version: FilemakerJobApplicationArtifactVersion | null
): Record<string, unknown> | null => {
  if (version === null) return null;
  return version.payload;
};

const resolveCanonicalConfidence = (
  activeVersions: ActiveArtifactVersions,
  base: FilemakerJobApplication
): number | null =>
  activeVersions.activeTailoredCv?.confidence ??
  activeVersions.activeCoverLetter?.confidence ??
  activeVersions.activeApplicationEmail?.confidence ??
  base.confidence;

const buildVersionStrings = (
  artifactVersions: FilemakerJobApplicationArtifactVersionSet,
  field: 'applicationNotes' | 'missingInformation'
): string[] =>
  mergeArtifactVersionStrings(
    [
      ...artifactVersions.tailoredCv,
      ...artifactVersions.coverLetter,
      ...artifactVersions.applicationEmail,
    ],
    field
  );

export const buildCanonicalSet = (input: {
  activeArtifacts: ActiveArtifacts;
  artifactVersions: FilemakerJobApplicationArtifactVersionSet;
  base: FilemakerJobApplication;
  canonicalKey: string;
}): Record<string, unknown> => {
  const activeVersions = resolveActiveArtifactVersions(input.activeArtifacts, input.artifactVersions);
  return {
    activeArtifacts: input.activeArtifacts,
    activeApplicationEmailVersionId: input.activeArtifacts.applicationEmailVersionId,
    activeCoverLetterVersionId: input.activeArtifacts.coverLetterVersionId,
    activeTailoredCvVersionId: input.activeArtifacts.tailoredCvVersionId,
    applicationEmail: resolveArtifactPayload(activeVersions.activeApplicationEmail),
    applicationNotes: buildVersionStrings(input.artifactVersions, 'applicationNotes'),
    artifactVersions: input.artifactVersions,
    canonicalApplicationKey: input.canonicalKey,
    connectionId: input.base.connectionId,
    coverLetter: resolveArtifactPayload(activeVersions.activeCoverLetter),
    confidence: resolveCanonicalConfidence(activeVersions, input.base),
    integrationId: input.base.integrationId,
    integrationSlug: input.base.integrationSlug,
    jobListingId: input.base.jobListingId,
    jobTitle: input.base.jobTitle,
    missingInformation: buildVersionStrings(input.artifactVersions, 'missingInformation'),
    organizationId: input.base.organizationId,
    organizationName: input.base.organizationName,
    personId: input.base.personId,
    personName: input.base.personName,
    status: input.base.status,
    tailoredCv: resolveArtifactPayload(activeVersions.activeTailoredCv),
    tailoredCvId: activeVersions.activeTailoredCv?.linkedRecordId ?? null,
    updatedAt: new Date().toISOString(),
  };
};
