import type {
  CvTechStackItem,
} from '../components/cv-builder/cv-block-model';
import type {
  FilemakerCvExperienceHighlightPatch,
  FilemakerCvStatus,
  FilemakerCvTailoringPatch,
  FilemakerCvTailoringScope,
  FilemakerCvTemplate,
} from '../filemaker-cv.types';

const TAILORED_CV_ALLOWED_SECTIONS = [
  'Professional Summary',
  'Core Strengths',
  'Selected Technical Environment',
  'Experience Highlights',
];

export const normalizeStatus = (
  value: unknown,
  fallback: FilemakerCvStatus
): FilemakerCvStatus =>
  value === 'published' || value === 'archived' || value === 'draft' ? value : fallback;

export const normalizeTemplate = (value: unknown): FilemakerCvTemplate =>
  value === 'classic' ? value : 'classic';

export const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const normalizeRecord = (value: unknown): Record<string, unknown> | null =>
  isRecord(value) ? value : null;

export const normalizeOptionalStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const values: string[] = [];
  value.forEach((entry: unknown): void => {
    const normalized = normalizeOptionalString(entry);
    if (normalized === null) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    values.push(normalized);
  });
  return values;
};

export const normalizeHighlightTechnologyTerms = (value: unknown): CvTechStackItem[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry: unknown): CvTechStackItem | null => {
      const record = normalizeRecord(entry);
      if (record === null) return null;
      const label = normalizeOptionalString(record['label']);
      if (label === null) return null;
      const key = label.toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        label,
        aliases: normalizeOptionalStringList(record['aliases']),
        iconUrl: normalizeOptionalString(record['iconUrl']) ?? '',
        lexiconTermId: normalizeOptionalString(record['lexiconTermId']) ?? undefined,
        normalizedLabel: normalizeOptionalString(record['normalizedLabel']) ?? undefined,
      };
    })
    .filter((entry: CvTechStackItem | null): entry is CvTechStackItem => entry !== null);
};

const resolveExperienceKey = (
  record: Record<string, unknown>,
  fallbackValues: Array<string | null>,
  highlights: string[]
): string =>
  normalizeOptionalString(record['experienceKey']) ??
  fallbackValues.find((value: string | null): value is string => value !== null) ??
  highlights.join('|');

const buildExperienceHighlightPatch = (
  record: Record<string, unknown>,
  highlights: string[]
): FilemakerCvExperienceHighlightPatch => {
  const experienceId = normalizeOptionalString(record['experienceId']);
  const experienceTitle = normalizeOptionalString(record['experienceTitle']);
  const company = normalizeOptionalString(record['company']);
  const role = normalizeOptionalString(record['role']);
  return {
    experienceKey: resolveExperienceKey(
      record,
      [experienceId, experienceTitle, company, role],
      highlights
    ),
    experienceId,
    experienceTitle,
    company,
    role,
    highlights,
  };
};

const normalizeExperienceHighlightPatchEntry = (
  entry: unknown,
  seen: Set<string>
): FilemakerCvExperienceHighlightPatch | null => {
  const record = normalizeRecord(entry);
  if (record === null) return null;
  const highlights = normalizeOptionalStringList(record['highlights']);
  if (highlights.length === 0) return null;
  const patch = buildExperienceHighlightPatch(record, highlights);
  const dedupeKey = patch.experienceKey.toLowerCase();
  if (seen.has(dedupeKey)) return null;
  seen.add(dedupeKey);
  return patch;
};

export const normalizeExperienceHighlightPatches = (
  value: unknown
): FilemakerCvExperienceHighlightPatch[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry: unknown): FilemakerCvExperienceHighlightPatch | null =>
      normalizeExperienceHighlightPatchEntry(entry, seen)
    )
    .filter(
      (entry: FilemakerCvExperienceHighlightPatch | null): entry is FilemakerCvExperienceHighlightPatch =>
        entry !== null
    );
};

const normalizeBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const normalizeTailoringScope = (
  value: unknown,
  hasTailoredMetadata: boolean
): FilemakerCvTailoringScope | null => {
  if (!hasTailoredMetadata && (value === null || value === undefined)) return null;
  const record = normalizeRecord(value) ?? {};
  const allowedSections = normalizeOptionalStringList(record['allowedSections']);
  return {
    allowedSections: allowedSections.length > 0 ? allowedSections : TAILORED_CV_ALLOWED_SECTIONS,
    canonicalPatchField: normalizeOptionalString(record['canonicalPatchField']) ?? 'tailoringPatch',
    lockedFieldsPreserved: normalizeBoolean(record['lockedFieldsPreserved'], true),
    renderedBodyMode: normalizeOptionalString(record['renderedBodyMode']) ?? 'ai_rendered_full_cv',
  };
};

const normalizeStringListWithFallback = (
  record: Record<string, unknown> | null,
  field: string,
  fallback: string[]
): string[] => {
  const normalized = record !== null ? normalizeOptionalStringList(record[field]) : [];
  return normalized.length > 0 ? normalized : fallback;
};

const normalizeExperiencePatchesWithFallback = (
  record: Record<string, unknown> | null,
  fallback: FilemakerCvExperienceHighlightPatch[]
): FilemakerCvExperienceHighlightPatch[] => {
  const normalized =
    record !== null ? normalizeExperienceHighlightPatches(record['experienceHighlightPatches']) : [];
  return normalized.length > 0 ? normalized : fallback;
};

export const normalizeTailoringPatch = (
  value: unknown,
  fallback: FilemakerCvTailoringPatch
): FilemakerCvTailoringPatch | null => {
  const record = normalizeRecord(value);
  const coreStrengths = normalizeStringListWithFallback(record, 'coreStrengths', fallback.coreStrengths);
  const selectedTechnicalEnvironment = normalizeStringListWithFallback(
    record,
    'selectedTechnicalEnvironment',
    fallback.selectedTechnicalEnvironment
  );
  const experienceHighlightPatches = normalizeExperiencePatchesWithFallback(
    record,
    fallback.experienceHighlightPatches
  );
  const professionalSummary =
    (record !== null ? normalizeOptionalString(record['professionalSummary']) : null) ??
    fallback.professionalSummary;
  if (
    professionalSummary === null &&
    coreStrengths.length === 0 &&
    selectedTechnicalEnvironment.length === 0 &&
    experienceHighlightPatches.length === 0
  ) {
    return null;
  }
  return {
    professionalSummary,
    coreStrengths,
    selectedTechnicalEnvironment,
    experienceHighlightPatches,
  };
};
