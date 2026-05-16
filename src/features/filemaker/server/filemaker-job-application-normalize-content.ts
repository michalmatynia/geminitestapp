/**
 * Filemaker Job Application Content Normalization
 * 
 * Content normalization utilities for job application documents.
 * Provides:
 * - Cover letter content normalization
 * - Email content formatting and validation
 * - Tailored CV content processing
 * - Experience highlight patch normalization
 * - Content validation and sanitization
 */

import type {
  FilemakerJobApplicationCoverLetter,
  FilemakerJobApplicationEmail,
  FilemakerJobApplicationTailoredCv,
} from '../filemaker-job-application.types';
import {
  normalizeExperienceHighlightPatches,
  TAILORED_CV_ALLOWED_SECTIONS,
  type TailoredCvSourceFallback,
} from './filemaker-job-application-normalize-artifacts';
import {
  normalizeRecord,
  normalizeString,
  normalizeStringArray,
} from './filemaker-job-application-normalize-base';

type TailoringPatchInput = {
  coreStrengths: string[];
  experienceHighlightPatches: FilemakerJobApplicationTailoredCv['experienceHighlightPatches'];
  explicitTailoringPatch: Record<string, unknown> | null;
  professionalSummary: string | null;
  selectedTechnicalEnvironment: string[];
};

const chooseNonEmptyArray = <Value,>(preferred: Value[], fallback: Value[]): Value[] => {
  if (preferred.length > 0) return preferred;
  return fallback;
};

const buildTailoringPatch = (
  input: TailoringPatchInput
): NonNullable<FilemakerJobApplicationTailoredCv['tailoringPatch']> => {
  const patchExperienceHighlightPatches = normalizeExperienceHighlightPatches(
    input.explicitTailoringPatch?.['experienceHighlightPatches']
  ) ?? [];
  const patchCoreStrengths =
    input.explicitTailoringPatch === null
      ? []
      : normalizeStringArray(input.explicitTailoringPatch['coreStrengths']);
  const patchSelectedTechnicalEnvironment =
    input.explicitTailoringPatch === null
      ? []
      : normalizeStringArray(input.explicitTailoringPatch['selectedTechnicalEnvironment']);
  const patchProfessionalSummary =
    input.explicitTailoringPatch === null
      ? null
      : normalizeString(input.explicitTailoringPatch['professionalSummary']);
  return {
    professionalSummary: patchProfessionalSummary ?? input.professionalSummary,
    coreStrengths: chooseNonEmptyArray(patchCoreStrengths, input.coreStrengths),
    selectedTechnicalEnvironment: chooseNonEmptyArray(
      patchSelectedTechnicalEnvironment,
      input.selectedTechnicalEnvironment
    ),
    experienceHighlightPatches: chooseNonEmptyArray(
      patchExperienceHighlightPatches,
      input.experienceHighlightPatches ?? []
    ),
  };
};

const resolveAllowedSections = (tailoringScope: Record<string, unknown> | null): string[] => {
  if (tailoringScope === null) return TAILORED_CV_ALLOWED_SECTIONS;
  const allowedSections = normalizeStringArray(tailoringScope['allowedSections']);
  if (allowedSections.length === 0) return TAILORED_CV_ALLOWED_SECTIONS;
  return allowedSections;
};

const resolveLockedFieldsPreserved = (tailoringScope: Record<string, unknown> | null): boolean => {
  if (tailoringScope === null) return true;
  const value = tailoringScope['lockedFieldsPreserved'];
  return typeof value === 'boolean' ? value : true;
};

const buildTailoringScope = (
  tailoringScope: Record<string, unknown> | null
): NonNullable<FilemakerJobApplicationTailoredCv['tailoringScope']> => ({
  allowedSections: resolveAllowedSections(tailoringScope),
  canonicalPatchField:
    tailoringScope === null
      ? 'tailoringPatch'
      : normalizeString(tailoringScope['canonicalPatchField']) ?? 'tailoringPatch',
  lockedFieldsPreserved: resolveLockedFieldsPreserved(tailoringScope),
  renderedBodyMode:
    tailoringScope === null
      ? 'ai_rendered_full_cv'
      : normalizeString(tailoringScope['renderedBodyMode']) ?? 'ai_rendered_full_cv',
});

export const toTailoredCv = (
  value: unknown,
  sourceFallback: TailoredCvSourceFallback = {
    sourceCvRecordId: null,
    sourceCvTitle: null,
  }
): FilemakerJobApplicationTailoredCv | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  const coreStrengths = normalizeStringArray(record['coreStrengths']);
  const selectedTechnicalEnvironment = normalizeStringArray(record['selectedTechnicalEnvironment']);
  const professionalSummary = normalizeString(record['professionalSummary']);
  const experienceHighlightPatches = normalizeExperienceHighlightPatches(
    record['experienceHighlightPatches']
  );
  const explicitTailoringPatch = normalizeRecord(record['tailoringPatch']);
  return {
    bodyMarkdown: normalizeString(record['bodyMarkdown']),
    bodyText: normalizeString(record['bodyText']),
    coreStrengths,
    educationHighlights: normalizeStringArray(record['educationHighlights']),
    experienceHighlightPatches,
    experienceHighlights: normalizeStringArray(record['experienceHighlights']),
    preferencesMatch: normalizeStringArray(record['preferencesMatch']),
    professionalSummary,
    selectedTechnicalEnvironment,
    skills: normalizeStringArray(record['skills']),
    sourceCvRecordId: normalizeString(record['sourceCvRecordId']) ?? sourceFallback.sourceCvRecordId,
    sourceCvTitle: normalizeString(record['sourceCvTitle']) ?? sourceFallback.sourceCvTitle,
    tailoringPatch: buildTailoringPatch({
      coreStrengths,
      experienceHighlightPatches,
      explicitTailoringPatch,
      professionalSummary,
      selectedTechnicalEnvironment,
    }),
    tailoringScope: buildTailoringScope(normalizeRecord(record['tailoringScope'])),
    title: normalizeString(record['title']),
  };
};

export const toCoverLetter = (value: unknown): FilemakerJobApplicationCoverLetter | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  return {
    bodyMarkdown: normalizeString(record['bodyMarkdown']),
    subject: normalizeString(record['subject']),
  };
};

export const toApplicationEmail = (value: unknown): FilemakerJobApplicationEmail | null => {
  const record = normalizeRecord(value);
  if (record === null) return null;
  return {
    bodyMarkdown: normalizeString(record['bodyMarkdown']),
    bodyText: normalizeString(record['bodyText']),
    subject: normalizeString(record['subject']),
  };
};
