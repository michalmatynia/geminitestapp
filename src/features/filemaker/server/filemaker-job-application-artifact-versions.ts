import type {
  FilemakerJobApplication,
  FilemakerJobApplicationArtifactKind,
  FilemakerJobApplicationArtifactVersion,
} from '../filemaker-job-application.types';
import {
  compareArtifactVersionsByFreshness,
} from './filemaker-job-application-normalize-artifacts';
import {
  normalizeRecord,
  normalizeRequiredString,
} from './filemaker-job-application-normalize-base';

export const createArtifactVersionsFromApplication = (
  application: FilemakerJobApplication
): FilemakerJobApplicationArtifactVersion[] => {
  const resolveVersionId = (
    kind: FilemakerJobApplicationArtifactKind,
    fallback: string
  ): string => {
    if (application.artifactKind !== kind) return fallback;
    return application.artifactVersionId ?? fallback;
  };
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

export const mergeArtifactVersionArrays = (
  existing: FilemakerJobApplicationArtifactVersion[],
  legacy: FilemakerJobApplicationArtifactVersion[]
): FilemakerJobApplicationArtifactVersion[] =>
  assignFallbackArtifactVersionNumbers(dedupeArtifactVersions([...existing, ...legacy]));

export const selectActiveArtifactVersionId = (
  requestedId: string | null | undefined,
  versions: FilemakerJobApplicationArtifactVersion[]
): string | null => {
  const normalizedRequestedId = requestedId?.trim() ?? null;
  if (
    normalizedRequestedId !== null &&
    versions.some(
      (version: FilemakerJobApplicationArtifactVersion): boolean =>
        version.id === normalizedRequestedId
    )
  ) {
    return normalizedRequestedId;
  }
  return versions[0]?.id.trim() ?? null;
};

export const findArtifactVersionById = (
  versions: FilemakerJobApplicationArtifactVersion[],
  versionId: string | null
): FilemakerJobApplicationArtifactVersion | null => {
  if (versionId === null) return null;
  return versions.find(
    (version: FilemakerJobApplicationArtifactVersion): boolean => version.id === versionId
  ) ?? null;
};

export const mergeArtifactVersionStrings = (
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
