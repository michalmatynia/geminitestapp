import type { Collection } from 'mongodb';

import type {
  CvBlock,
  CvTechStackItem,
} from '../components/cv-builder/cv-block-model';
import { normalizeCvBlocks } from '../components/cv-builder/cv-block-model';
import { compileCvBlocksToHtml, compileCvBlocksToPlainText } from '../components/cv-builder/compile-cv-blocks';
import type {
  FilemakerCv,
  FilemakerCvExperienceHighlightPatch,
  FilemakerCvTailoringPatch,
  FilemakerCvTailoringScope,
} from '../filemaker-cv.types';

import type { FilemakerCvMongoDocument } from './filemaker-cv-repository.types';
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
import { applyTailoringPatchToCvBlocks } from './filemaker-cv-tailoring';

type CompiledBody = {
  bodyHtml: string | null;
  bodyText: string | null;
};

type TailoringMetadata = {
  coreStrengths: string[];
  experienceHighlightPatches: FilemakerCvExperienceHighlightPatch[];
  highlightTechnologyTerms: CvTechStackItem[];
  professionalSummary: string | null;
  selectedTechnicalEnvironment: string[];
  tailoringPatch: FilemakerCvTailoringPatch | null;
  tailoringScope: FilemakerCvTailoringScope | null;
};

export const compileBody = (
  blocks: CvBlock[],
  highlightTechnologyTerms: CvTechStackItem[] = []
): CompiledBody => {
  if (blocks.length === 0) return { bodyHtml: null, bodyText: null };
  return {
    bodyHtml: compileCvBlocksToHtml(blocks, {
      highlightedTechnologyTerms: highlightTechnologyTerms,
    }),
    bodyText: compileCvBlocksToPlainText(blocks),
  };
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const plainTextToHtml = (value: string): string =>
  value
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0)
    .map((line: string): string => `<p>${escapeHtml(line)}</p>`)
    .join('');

const buildPlainTextFallbackBlocks = (bodyText: string | null | undefined): CvBlock[] => {
  const normalized = bodyText?.trim() ?? '';
  if (normalized.length === 0) return [];
  return [
    {
      id: 'ai-generated-cv-body',
      kind: 'customText',
      label: 'Generated CV',
      html: plainTextToHtml(normalized),
    },
  ];
};

const resolveTailoringMetadata = (document: FilemakerCvMongoDocument): TailoringMetadata => {
  const highlightTechnologyTerms = normalizeHighlightTechnologyTerms(document.highlightTechnologyTerms);
  const coreStrengths = normalizeOptionalStringList(document.coreStrengths);
  const selectedTechnicalEnvironment = normalizeOptionalStringList(document.selectedTechnicalEnvironment);
  const experienceHighlightPatches = normalizeExperienceHighlightPatches(
    document.experienceHighlightPatches
  );
  const professionalSummary = normalizeOptionalString(document.professionalSummary);
  const tailoringPatch = normalizeTailoringPatch(document.tailoringPatch, {
    professionalSummary,
    coreStrengths,
    selectedTechnicalEnvironment,
    experienceHighlightPatches,
  });
  const tailoringScope = normalizeTailoringScope(document.tailoringScope, hasTailoredMetadata({
    coreStrengths,
    experienceHighlightPatches,
    professionalSummary,
    selectedTechnicalEnvironment,
    tailoringPatch,
  }));
  return {
    coreStrengths,
    experienceHighlightPatches,
    highlightTechnologyTerms,
    professionalSummary,
    selectedTechnicalEnvironment,
    tailoringPatch,
    tailoringScope,
  };
};

const hasTailoredMetadata = (
  metadata: Pick<
    TailoringMetadata,
    | 'coreStrengths'
    | 'experienceHighlightPatches'
    | 'professionalSummary'
    | 'selectedTechnicalEnvironment'
    | 'tailoringPatch'
  >
): boolean =>
  metadata.professionalSummary !== null ||
  metadata.coreStrengths.length > 0 ||
  metadata.selectedTechnicalEnvironment.length > 0 ||
  metadata.experienceHighlightPatches.length > 0 ||
  metadata.tailoringPatch !== null;

const resolveDeterministicTailoredBlocks = (input: {
  highlightTechnologyTerms: CvTechStackItem[];
  sourceBodyBlocks: CvBlock[] | null;
  tailoringPatch: FilemakerCvTailoringPatch | null;
}): CvBlock[] => {
  if (
    input.sourceBodyBlocks === null ||
    input.sourceBodyBlocks.length === 0 ||
    input.tailoringPatch === null
  ) {
    return [];
  }
  return applyTailoringPatchToCvBlocks(
    input.sourceBodyBlocks,
    input.tailoringPatch,
    input.highlightTechnologyTerms
  );
};

const resolveEffectiveTailoringScope = (input: {
  hasDeterministicTailoredRender: boolean;
  tailoringScope: FilemakerCvTailoringScope | null;
}): FilemakerCvTailoringScope | null => {
  if (!input.hasDeterministicTailoredRender || input.tailoringScope === null) return input.tailoringScope;
  return {
    ...input.tailoringScope,
    renderedBodyMode: 'deterministic_source_patch',
  };
};

const isScopedTailoredCv = (input: {
  sourceCvRecordId: string | null;
  tailoringPatch: FilemakerCvTailoringPatch | null;
  tailoringScope: FilemakerCvTailoringScope | null;
}): boolean =>
  input.tailoringScope !== null || input.tailoringPatch !== null || input.sourceCvRecordId !== null;

const resolveRenderedBlocks = (input: {
  document: FilemakerCvMongoDocument;
  highlightTechnologyTerms: CvTechStackItem[];
  sourceBodyBlocks: CvBlock[] | null;
  storedBlocks: CvBlock[];
  tailoringPatch: FilemakerCvTailoringPatch | null;
}): {
  blocks: CvBlock[];
  compiled: CompiledBody;
  hasDeterministicTailoredRender: boolean;
} => {
  const deterministicTailoredBlocks = resolveDeterministicTailoredBlocks(input);
  const renderBlocks =
    deterministicTailoredBlocks.length > 0 ? deterministicTailoredBlocks : input.storedBlocks;
  const blocks =
    renderBlocks.length > 0 ? renderBlocks : buildPlainTextFallbackBlocks(input.document.bodyText);
  return {
    blocks,
    compiled: compileBody(blocks, input.highlightTechnologyTerms),
    hasDeterministicTailoredRender: deterministicTailoredBlocks.length > 0,
  };
};

const resolveBodyHtml = (input: {
  compiled: CompiledBody;
  document: FilemakerCvMongoDocument;
  hasDeterministicTailoredRender: boolean;
}): string | null => {
  if (input.hasDeterministicTailoredRender) return input.compiled.bodyHtml;
  return input.compiled.bodyHtml ?? input.document.bodyHtml ?? null;
};

const resolveBodyText = (input: {
  compiled: CompiledBody;
  document: FilemakerCvMongoDocument;
  hasDeterministicTailoredRender: boolean;
}): string | null => {
  if (input.hasDeterministicTailoredRender) return input.compiled.bodyText;
  return input.document.bodyText ?? input.compiled.bodyText;
};

const toFilemakerCv = (
  document: FilemakerCvMongoDocument,
  sourceBodyBlocks: CvBlock[] | null = null
): FilemakerCv => {
  const storedBlocks = normalizeCvBlocks(document.bodyBlocks);
  const metadata = resolveTailoringMetadata(document);
  const sourceCvRecordId = normalizeOptionalString(document.sourceCvRecordId);
  const rendered = resolveRenderedBlocks({
    document,
    highlightTechnologyTerms: metadata.highlightTechnologyTerms,
    sourceBodyBlocks,
    storedBlocks,
    tailoringPatch: metadata.tailoringPatch,
  });
  const effectiveTailoringScope = resolveEffectiveTailoringScope({
    hasDeterministicTailoredRender: rendered.hasDeterministicTailoredRender,
    tailoringScope: metadata.tailoringScope,
  });
  return {
    id: document.id,
    personId: document.personId,
    personName: document.personName,
    title: document.title,
    status: normalizeStatus(document.status, 'draft'),
    template: normalizeTemplate(document.template),
    sourceCvRecordId,
    sourceCvTitle: normalizeOptionalString(document.sourceCvTitle),
    bodyBlocksEditable: !isScopedTailoredCv({
      sourceCvRecordId,
      tailoringPatch: metadata.tailoringPatch,
      tailoringScope: metadata.tailoringScope,
    }),
    canonicalEditMode: isScopedTailoredCv({
      sourceCvRecordId,
      tailoringPatch: metadata.tailoringPatch,
      tailoringScope: metadata.tailoringScope,
    })
      ? 'tailoringPatch'
      : 'bodyBlocks',
    bodyBlocks: rendered.blocks.length > 0 ? rendered.blocks : null,
    bodyHtml: resolveBodyHtml({ document, ...rendered }),
    bodyText: resolveBodyText({ document, ...rendered }),
    professionalSummary: metadata.professionalSummary,
    coreStrengths: metadata.coreStrengths,
    selectedTechnicalEnvironment: metadata.selectedTechnicalEnvironment,
    experienceHighlightPatches: metadata.experienceHighlightPatches,
    tailoringPatch: metadata.tailoringPatch,
    tailoringScope: effectiveTailoringScope,
    highlightTechnologyTerms: metadata.highlightTechnologyTerms,
    jobListingId: normalizeOptionalString(document.jobListingId),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
};

const loadSourceBodyBlocksForTailoredCv = async (
  collection: Collection<FilemakerCvMongoDocument>,
  document: FilemakerCvMongoDocument
): Promise<CvBlock[] | null> => {
  const sourceCvRecordId = normalizeOptionalString(document.sourceCvRecordId);
  if (
    sourceCvRecordId === null ||
    sourceCvRecordId === 'profile-fields-only' ||
    sourceCvRecordId === document.id ||
    sourceCvRecordId === document._id
  ) {
    return null;
  }
  const sourceDocument = await collection.findOne({
    $or: [{ _id: sourceCvRecordId }, { id: sourceCvRecordId }],
  });
  if (sourceDocument === null) return null;
  const sourceBlocks = normalizeCvBlocks(sourceDocument.bodyBlocks);
  return sourceBlocks.length > 0 ? sourceBlocks : null;
};

export const toFilemakerCvWithDeterministicPatch = async (
  collection: Collection<FilemakerCvMongoDocument>,
  document: FilemakerCvMongoDocument
): Promise<FilemakerCv> =>
  toFilemakerCv(document, await loadSourceBodyBlocksForTailoredCv(collection, document));
