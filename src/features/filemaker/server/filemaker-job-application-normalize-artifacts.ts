import type {
  FilemakerJobApplicationActiveArtifacts,
  FilemakerJobApplicationArtifactKind,
  FilemakerJobApplicationArtifactVersion,
  FilemakerJobApplicationArtifactVersionSet,
  FilemakerJobApplicationExperienceHighlightPatch,
  FilemakerJobApplicationTailoredCv,
} from '../filemaker-job-application.types';
import {
  normalizeNumber,
  normalizeRecord,
  normalizeRequiredString,
  normalizeString,
  normalizeStringArray,
} from './filemaker-job-application-normalize-base';

export type TailoredCvSourceFallback = {
  sourceCvRecordId: string | null;
  sourceCvTitle: string | null;
};

export const TAILORED_CV_ALLOWED_SECTIONS = [
  'Professional Summary',
  'Core Strengths',
  'Selected Technical Environment',
  'Experience Highlights',
];

export const normalizeExperienceHighlightPatches = (
  value: unknown
): FilemakerJobApplicationTailoredCv['experienceHighlightPatches'] => {
  if (!Array.isArray(value)) return [];
  const patches: FilemakerJobApplicationExperienceHighlightPatch[] = [];
  value.forEach((entry: unknown): void => {
    const patch = normalizeRecord(entry);
    if (patch === null) return;
    const highlights = normalizeStringArray(patch['highlights']);
    if (highlights.length === 0) return;
    patches.push({
      experienceKey: normalizeString(patch['experienceKey']),
      experienceId: normalizeString(patch['experienceId']),
      experienceTitle: normalizeString(patch['experienceTitle']),
      company: normalizeString(patch['company']),
      role: normalizeString(patch['role']),
      highlights,
    });
  });
  return patches;
};

export const normalizeTailoredCvSourceFallback = (value: unknown): TailoredCvSourceFallback => {
  const record = normalizeRecord(value);
  if (record === null) return { sourceCvRecordId: null, sourceCvTitle: null };
  return {
    sourceCvRecordId:
      normalizeString(record['preferredSourceCvRecordId']) ?? normalizeString(record['sourceCvRecordId']),
    sourceCvTitle:
      normalizeString(record['preferredSourceCvTitle']) ?? normalizeString(record['sourceCvTitle']),
  };
};

const buildFallbackTailoringPatch = (record: Record<string, unknown>): Record<string, unknown> => ({
  professionalSummary: normalizeString(record['professionalSummary']),
  coreStrengths: normalizeStringArray(record['coreStrengths']),
  selectedTechnicalEnvironment: normalizeStringArray(record['selectedTechnicalEnvironment']),
  experienceHighlightPatches: normalizeExperienceHighlightPatches(record['experienceHighlightPatches']),
});

const applyRootTailoredCvSourceFallback = (input: {
  payload: Record<string, unknown>;
  sourceCvRecordId: string | null;
  sourceCvTitle: string | null;
}): Record<string, unknown> => {
  const tailoringPatch = normalizeRecord(input.payload['tailoringPatch']);
  return {
    ...input.payload,
    sourceCvRecordId: normalizeString(input.payload['sourceCvRecordId']) ?? input.sourceCvRecordId,
    sourceCvTitle: normalizeString(input.payload['sourceCvTitle']) ?? input.sourceCvTitle,
    tailoringPatch: tailoringPatch ?? buildFallbackTailoringPatch(input.payload),
  };
};

const applyNestedTailoredCvSourceFallback = (input: {
  nestedTailoredCv: Record<string, unknown>;
  payload: Record<string, unknown>;
  sourceCvRecordId: string | null;
  sourceCvTitle: string | null;
}): Record<string, unknown> => {
  const nestedTailoringPatch = normalizeRecord(input.nestedTailoredCv['tailoringPatch']);
  return {
    ...input.payload,
    tailoredCv: {
      ...input.nestedTailoredCv,
      sourceCvRecordId:
        normalizeString(input.nestedTailoredCv['sourceCvRecordId']) ?? input.sourceCvRecordId,
      sourceCvTitle:
        normalizeString(input.nestedTailoredCv['sourceCvTitle']) ?? input.sourceCvTitle,
      tailoringPatch: nestedTailoringPatch ?? buildFallbackTailoringPatch(input.nestedTailoredCv),
    },
  };
};

export const applyTailoredCvSourceFallbackToPayload = (
  payload: Record<string, unknown> | null,
  sourceFallback: TailoredCvSourceFallback
): Record<string, unknown> | null => {
  if (payload === null) return null;
  const sourceCvRecordId = normalizeString(sourceFallback.sourceCvRecordId);
  const sourceCvTitle = normalizeString(sourceFallback.sourceCvTitle);
  if (sourceCvRecordId === null && sourceCvTitle === null) return payload;
  const nestedTailoredCv = normalizeRecord(payload['tailoredCv']);
  if (nestedTailoredCv === null) {
    return applyRootTailoredCvSourceFallback({ payload, sourceCvRecordId, sourceCvTitle });
  }
  return applyNestedTailoredCvSourceFallback({
    nestedTailoredCv,
    payload,
    sourceCvRecordId,
    sourceCvTitle,
  });
};

const normalizeArtifactVersion = (
  value: unknown,
  kind: FilemakerJobApplicationArtifactKind,
  sourceFallback: TailoredCvSourceFallback = {
    sourceCvRecordId: null,
    sourceCvTitle: null,
  }
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
    payload:
      kind === 'tailored_cv'
        ? applyTailoredCvSourceFallbackToPayload(normalizeRecord(record['payload']), sourceFallback)
        : normalizeRecord(record['payload']),
    sourceRunId: normalizeString(record['sourceRunId']),
    version: normalizeNumber(record['version']),
  };
};

export const normalizeArtifactVersionArray = (
  value: unknown,
  kind: FilemakerJobApplicationArtifactKind,
  sourceFallback?: TailoredCvSourceFallback
): FilemakerJobApplicationArtifactVersion[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry: unknown, index: number): FilemakerJobApplicationArtifactVersion | null => {
      const version = normalizeArtifactVersion(entry, kind, sourceFallback);
      if (version === null) return null;
      return {
        ...version,
        version: version.version ?? index + 1,
      };
    })
    .filter((entry): entry is FilemakerJobApplicationArtifactVersion => entry !== null);
};

export const normalizePersistedArtifactVersions = (
  value: unknown,
  sourceFallback?: TailoredCvSourceFallback
): FilemakerJobApplicationArtifactVersionSet | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  const versions: FilemakerJobApplicationArtifactVersionSet = {
    applicationEmail: normalizeArtifactVersionArray(record['applicationEmail'], 'application_email'),
    coverLetter: normalizeArtifactVersionArray(record['coverLetter'], 'cover_letter'),
    tailoredCv: normalizeArtifactVersionArray(record['tailoredCv'], 'tailored_cv', sourceFallback),
  };
  const hasVersions =
    versions.applicationEmail.length > 0 ||
    versions.coverLetter.length > 0 ||
    versions.tailoredCv.length > 0;
  return hasVersions ? versions : null;
};

export const normalizeActiveArtifacts = (
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

export const compareArtifactVersionsByFreshness = (
  left: FilemakerJobApplicationArtifactVersion,
  right: FilemakerJobApplicationArtifactVersion
): number => {
  const dateOrder = normalizeRequiredString(right.createdAt).localeCompare(
    normalizeRequiredString(left.createdAt)
  );
  if (dateOrder !== 0) return dateOrder;
  return (right.version ?? 0) - (left.version ?? 0);
};
