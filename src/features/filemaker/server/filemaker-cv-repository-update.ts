import { normalizeCvBlocks } from '../components/cv-builder/cv-block-model';
import type {
  FilemakerCvExperienceHighlightPatch,
  FilemakerCvTailoringPatch,
} from '../filemaker-cv.types';

import type {
  FilemakerCvMongoDocument,
  UpdateMongoFilemakerCvInput,
} from './filemaker-cv-repository.types';
import {
  normalizeExperienceHighlightPatches,
  normalizeHighlightTechnologyTerms,
  normalizeOptionalString,
  normalizeOptionalStringList,
  normalizeStatus,
  normalizeTailoringPatch,
  normalizeTailoringScope,
  normalizeTemplate,
} from './filemaker-cv-normalizers';
import { compileBody } from './filemaker-cv-rendering';

type UpdateFieldInput = {
  existing: FilemakerCvMongoDocument;
  input: UpdateMongoFilemakerCvInput;
};

type UpdateFieldContext = UpdateFieldInput & {
  isScopedTailoredCv: boolean;
  nextHighlightTechnologyTerms: ReturnType<typeof normalizeHighlightTechnologyTerms>;
};

const buildExistingTailoringPatch = (
  existing: FilemakerCvMongoDocument
): FilemakerCvTailoringPatch | null =>
  normalizeTailoringPatch(existing.tailoringPatch, {
    professionalSummary: normalizeOptionalString(existing.professionalSummary),
    coreStrengths: normalizeOptionalStringList(existing.coreStrengths),
    selectedTechnicalEnvironment: normalizeOptionalStringList(existing.selectedTechnicalEnvironment),
    experienceHighlightPatches: normalizeExperienceHighlightPatches(
      existing.experienceHighlightPatches
    ),
  });

const isScopedTailoredCvDocument = (existing: FilemakerCvMongoDocument): boolean => {
  const existingTailoringPatch = buildExistingTailoringPatch(existing);
  return (
    normalizeTailoringScope(existing.tailoringScope, existingTailoringPatch !== null) !== null ||
    existingTailoringPatch !== null ||
    normalizeOptionalString(existing.sourceCvRecordId) !== null
  );
};

const getNextHighlightTechnologyTerms = ({
  existing,
  input,
}: UpdateFieldInput): ReturnType<typeof normalizeHighlightTechnologyTerms> => {
  if (input.highlightTechnologyTerms !== undefined) {
    return normalizeHighlightTechnologyTerms(input.highlightTechnologyTerms);
  }
  return normalizeHighlightTechnologyTerms(existing.highlightTechnologyTerms);
};

const applySimpleUpdateFields = ({
  existing,
  input,
  nextHighlightTechnologyTerms,
}: UpdateFieldContext): Partial<FilemakerCvMongoDocument> => {
  const fields: Partial<FilemakerCvMongoDocument> = {};
  if (typeof input.title === 'string') {
    const title = input.title.trim();
    fields.title = title.length > 0 ? title : existing.title;
  }
  if (input.highlightTechnologyTerms !== undefined) {
    fields.highlightTechnologyTerms = nextHighlightTechnologyTerms;
  }
  if (input.coreStrengths !== undefined) {
    fields.coreStrengths = normalizeOptionalStringList(input.coreStrengths);
  }
  if (input.selectedTechnicalEnvironment !== undefined) {
    fields.selectedTechnicalEnvironment = normalizeOptionalStringList(input.selectedTechnicalEnvironment);
  }
  if (input.experienceHighlightPatches !== undefined) {
    fields.experienceHighlightPatches = normalizeExperienceHighlightPatches(
      input.experienceHighlightPatches
    );
  }
  if (input.professionalSummary !== undefined) {
    fields.professionalSummary = normalizeOptionalString(input.professionalSummary);
  }
  return fields;
};

const resolveProfessionalSummaryForPatch = ({
  existing,
  input,
}: UpdateFieldInput): string | null =>
  input.professionalSummary !== undefined
    ? normalizeOptionalString(input.professionalSummary)
    : normalizeOptionalString(existing.professionalSummary);

const resolveCoreStrengthsForPatch = ({
  existing,
  input,
}: UpdateFieldInput): string[] =>
  input.coreStrengths !== undefined
    ? normalizeOptionalStringList(input.coreStrengths)
    : normalizeOptionalStringList(existing.coreStrengths);

const resolveTechnicalEnvironmentForPatch = ({
  existing,
  input,
}: UpdateFieldInput): string[] =>
  input.selectedTechnicalEnvironment !== undefined
    ? normalizeOptionalStringList(input.selectedTechnicalEnvironment)
    : normalizeOptionalStringList(existing.selectedTechnicalEnvironment);

const resolveExperiencePatchesForPatch = ({
  existing,
  input,
}: UpdateFieldInput): FilemakerCvExperienceHighlightPatch[] =>
  input.experienceHighlightPatches !== undefined
    ? normalizeExperienceHighlightPatches(input.experienceHighlightPatches)
    : normalizeExperienceHighlightPatches(existing.experienceHighlightPatches);

const buildTailoringPatchFallback = (input: UpdateFieldInput): FilemakerCvTailoringPatch => ({
  professionalSummary: resolveProfessionalSummaryForPatch(input),
  coreStrengths: resolveCoreStrengthsForPatch(input),
  selectedTechnicalEnvironment: resolveTechnicalEnvironmentForPatch(input),
  experienceHighlightPatches: resolveExperiencePatchesForPatch(input),
});

const applyTailoringPatchUpdateField = ({
  input,
  existing,
}: UpdateFieldContext): Partial<FilemakerCvMongoDocument> => {
  if (input.tailoringPatch === undefined) return {};
  return {
    tailoringPatch: normalizeTailoringPatch(
      input.tailoringPatch,
      buildTailoringPatchFallback({ existing, input })
    ),
  };
};

const applyTailoringScopeUpdateField = ({
  existing,
  input,
}: UpdateFieldContext): Partial<FilemakerCvMongoDocument> => {
  if (input.tailoringScope === undefined) return {};
  const nextCoreStrengths = resolveCoreStrengthsForPatch({ existing, input });
  const nextSelectedTechnicalEnvironment = resolveTechnicalEnvironmentForPatch({ existing, input });
  const nextExperienceHighlightPatches = resolveExperiencePatchesForPatch({ existing, input });
  return {
    tailoringScope: normalizeTailoringScope(
      input.tailoringScope,
      nextCoreStrengths.length > 0 ||
        nextSelectedTechnicalEnvironment.length > 0 ||
        nextExperienceHighlightPatches.length > 0
    ),
  };
};

const applyReferenceUpdateFields = ({
  existing,
  input,
}: UpdateFieldContext): Partial<FilemakerCvMongoDocument> => {
  const fields: Partial<FilemakerCvMongoDocument> = {};
  if (input.jobListingId !== undefined) {
    fields.jobListingId = normalizeOptionalString(input.jobListingId);
  }
  if (input.sourceCvRecordId !== undefined) {
    fields.sourceCvRecordId = normalizeOptionalString(input.sourceCvRecordId);
  }
  if (input.sourceCvTitle !== undefined) {
    fields.sourceCvTitle = normalizeOptionalString(input.sourceCvTitle);
  }
  if (input.status !== undefined) {
    fields.status = normalizeStatus(input.status, existing.status);
  }
  if (input.template !== undefined) {
    fields.template = normalizeTemplate(input.template);
  }
  return fields;
};

const applyEditableBodyFields = ({
  input,
  nextHighlightTechnologyTerms,
}: UpdateFieldContext): Partial<FilemakerCvMongoDocument> => {
  const blocks = normalizeCvBlocks(input.bodyBlocks);
  const compiled = compileBody(blocks, nextHighlightTechnologyTerms);
  return {
    bodyBlocks: blocks.length > 0 ? blocks : null,
    bodyHtml: compiled.bodyHtml,
    bodyText: compiled.bodyText,
  };
};

const applyBodyFieldsFromExistingBlocks = ({
  existing,
  nextHighlightTechnologyTerms,
}: UpdateFieldContext): Partial<FilemakerCvMongoDocument> => {
  const blocks = normalizeCvBlocks(existing.bodyBlocks);
  if (blocks.length === 0) return {};
  const compiled = compileBody(blocks, nextHighlightTechnologyTerms);
  return {
    bodyHtml: compiled.bodyHtml,
    bodyText: compiled.bodyText,
  };
};

const applyBodyUpdateFields = (context: UpdateFieldContext): Partial<FilemakerCvMongoDocument> => {
  if (context.input.bodyBlocks !== undefined && !context.isScopedTailoredCv) {
    return applyEditableBodyFields(context);
  }
  const fields: Partial<FilemakerCvMongoDocument> = {};
  if (context.input.highlightTechnologyTerms !== undefined) {
    Object.assign(fields, applyBodyFieldsFromExistingBlocks(context));
  }
  if (context.isScopedTailoredCv) return fields;
  if (context.input.bodyHtml !== undefined) fields.bodyHtml = context.input.bodyHtml;
  if (context.input.bodyText !== undefined) fields.bodyText = context.input.bodyText;
  return fields;
};

export const buildMongoFilemakerCvUpdateFields = (
  input: UpdateFieldInput
): Partial<FilemakerCvMongoDocument> => {
  const context: UpdateFieldContext = {
    ...input,
    isScopedTailoredCv: isScopedTailoredCvDocument(input.existing),
    nextHighlightTechnologyTerms: getNextHighlightTechnologyTerms(input),
  };
  return {
    updatedAt: new Date().toISOString(),
    ...applySimpleUpdateFields(context),
    ...applyTailoringPatchUpdateField(context),
    ...applyTailoringScopeUpdateField(context),
    ...applyReferenceUpdateFields(context),
    ...applyBodyUpdateFields(context),
  };
};
