import 'server-only';

/* eslint-disable complexity, @typescript-eslint/strict-boolean-expressions */

import { randomUUID } from 'crypto';

import type { Collection, Document } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  CvBlock,
  CvExperienceBlock,
  CvSkillsBlock,
  CvSummaryBlock,
  CvTechStackBlock,
  CvTechStackItem,
} from '../components/cv-builder/cv-block-model';
import { normalizeCvBlocks } from '../components/cv-builder/cv-block-model';
import { compileCvBlocksToHtml, compileCvBlocksToPlainText } from '../components/cv-builder/compile-cv-blocks';
import type {
  FilemakerCv,
  FilemakerCvExperienceHighlightPatch,
  FilemakerCvStatus,
  FilemakerCvTailoringPatch,
  FilemakerCvTailoringScope,
  FilemakerCvTemplate,
} from '../filemaker-cv.types';

export const FILEMAKER_CVS_COLLECTION = 'filemaker_cvs';

export type FilemakerCvMongoDocument = Document & {
  _id: string;
  bodyBlocks?: CvBlock[] | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
  coreStrengths?: unknown;
  createdAt: string;
  experienceHighlightPatches?: unknown;
  highlightTechnologyTerms?: unknown;
  id: string;
  jobListingId?: unknown;
  personId: string;
  personName: string;
  professionalSummary?: unknown;
  selectedTechnicalEnvironment?: unknown;
  sourceCvRecordId?: unknown;
  sourceCvTitle?: unknown;
  status: FilemakerCvStatus;
  tailoringPatch?: unknown;
  tailoringScope?: unknown;
  template: FilemakerCvTemplate;
  title: string;
  updatedAt: string;
};

export type CreateMongoFilemakerCvInput = {
  bodyBlocks?: unknown;
  bodyHtml?: string | null;
  bodyText?: string | null;
  coreStrengths?: unknown;
  experienceHighlightPatches?: unknown;
  highlightTechnologyTerms?: unknown;
  jobListingId?: string | null;
  personId: string;
  personName: string;
  professionalSummary?: string | null;
  selectedTechnicalEnvironment?: unknown;
  sourceCvRecordId?: string | null;
  sourceCvTitle?: string | null;
  tailoringPatch?: unknown;
  tailoringScope?: unknown;
  title?: string | null;
};

export type UpdateMongoFilemakerCvInput = {
  bodyBlocks?: unknown;
  bodyHtml?: string | null;
  bodyText?: string | null;
  coreStrengths?: unknown;
  experienceHighlightPatches?: unknown;
  highlightTechnologyTerms?: unknown;
  jobListingId?: string | null;
  professionalSummary?: string | null;
  selectedTechnicalEnvironment?: unknown;
  sourceCvRecordId?: string | null;
  sourceCvTitle?: string | null;
  status?: FilemakerCvStatus;
  tailoringPatch?: unknown;
  tailoringScope?: unknown;
  template?: FilemakerCvTemplate;
  title?: string;
};

const TAILORED_CV_ALLOWED_SECTIONS = [
  'Professional Summary',
  'Core Strengths',
  'Selected Technical Environment',
  'Experience Highlights',
];

const getFilemakerCvsCollection = async (): Promise<Collection<FilemakerCvMongoDocument>> => {
  const db = await getMongoDb();
  return db.collection<FilemakerCvMongoDocument>(FILEMAKER_CVS_COLLECTION);
};

const normalizeStatus = (value: unknown, fallback: FilemakerCvStatus): FilemakerCvStatus =>
  value === 'published' || value === 'archived' || value === 'draft' ? value : fallback;

const normalizeTemplate = (value: unknown): FilemakerCvTemplate => (value === 'classic' ? value : 'classic');

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && value !== undefined && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeOptionalStringList = (value: unknown): string[] => {
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

const normalizeHighlightTechnologyTerms = (value: unknown): CvTechStackItem[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry: unknown): CvTechStackItem | null => {
      if (entry === null || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
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

const normalizeExperienceHighlightPatches = (
  value: unknown
): FilemakerCvExperienceHighlightPatch[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value
    .map((entry: unknown): FilemakerCvExperienceHighlightPatch | null => {
      if (entry === null || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const highlights = normalizeOptionalStringList(record['highlights']);
      if (highlights.length === 0) return null;
      const experienceId = normalizeOptionalString(record['experienceId']);
      const experienceTitle = normalizeOptionalString(record['experienceTitle']);
      const company = normalizeOptionalString(record['company']);
      const role = normalizeOptionalString(record['role']);
      const experienceKey =
        normalizeOptionalString(record['experienceKey']) ??
        experienceId ??
        experienceTitle ??
        company ??
        role ??
        highlights.join('|');
      const dedupeKey = experienceKey.toLowerCase();
      if (seen.has(dedupeKey)) return null;
      seen.add(dedupeKey);
      return {
        experienceKey,
        experienceId,
        experienceTitle,
        company,
        role,
        highlights,
      };
    })
    .filter(
      (entry: FilemakerCvExperienceHighlightPatch | null): entry is FilemakerCvExperienceHighlightPatch =>
        entry !== null
    );
};

const normalizeTailoringScope = (
  value: unknown,
  hasTailoredMetadata: boolean
): FilemakerCvTailoringScope | null => {
  if (!hasTailoredMetadata && (value === null || value === undefined)) return null;
  const record =
    value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const allowedSections = normalizeOptionalStringList(record['allowedSections']);
  return {
    allowedSections: allowedSections.length > 0 ? allowedSections : TAILORED_CV_ALLOWED_SECTIONS,
    canonicalPatchField: normalizeOptionalString(record['canonicalPatchField']) ?? 'tailoringPatch',
    lockedFieldsPreserved:
      typeof record['lockedFieldsPreserved'] === 'boolean'
        ? record['lockedFieldsPreserved']
        : true,
    renderedBodyMode: normalizeOptionalString(record['renderedBodyMode']) ?? 'ai_rendered_full_cv',
  };
};

const normalizeTailoringPatch = (
  value: unknown,
  fallback: FilemakerCvTailoringPatch
): FilemakerCvTailoringPatch | null => {
  const record = normalizeRecord(value);
  const coreStrengths =
    record !== null && normalizeOptionalStringList(record['coreStrengths']).length > 0
      ? normalizeOptionalStringList(record['coreStrengths'])
      : fallback.coreStrengths;
  const selectedTechnicalEnvironment =
    record !== null && normalizeOptionalStringList(record['selectedTechnicalEnvironment']).length > 0
      ? normalizeOptionalStringList(record['selectedTechnicalEnvironment'])
      : fallback.selectedTechnicalEnvironment;
  const experienceHighlightPatches =
    record !== null && normalizeExperienceHighlightPatches(record['experienceHighlightPatches']).length > 0
      ? normalizeExperienceHighlightPatches(record['experienceHighlightPatches'])
      : fallback.experienceHighlightPatches;
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

const normalizePatchKey = (value: string | null | undefined): string =>
  (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9ąćęłńóśźż]+/gi, ' ')
    .trim();

const keyMatches = (left: string | null | undefined, right: string | null | undefined): boolean => {
  const normalizedLeft = normalizePatchKey(left);
  const normalizedRight = normalizePatchKey(right);
  if (normalizedLeft.length === 0 || normalizedRight.length === 0) return false;
  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
};

const findTechnologyTerm = (label: string, terms: CvTechStackItem[]): CvTechStackItem | null =>
  terms.find((term: CvTechStackItem): boolean => {
    const candidates = [
      term.label,
      term.normalizedLabel,
      ...(Array.isArray(term.aliases) ? term.aliases : []),
    ];
    return candidates.some((candidate: string | undefined): boolean => keyMatches(candidate, label));
  }) ?? null;

const toTechStackItems = (
  labels: string[],
  highlightTechnologyTerms: CvTechStackItem[]
): CvTechStackItem[] =>
  labels.map((label: string): CvTechStackItem => {
    const matched = findTechnologyTerm(label, highlightTechnologyTerms);
    return matched ?? { label, iconUrl: '' };
  });

const isCoreStrengthsBlock = (block: CvSkillsBlock): boolean =>
  keyMatches(block.label, 'Core Strengths') ||
  keyMatches(block.label, 'Strengths') ||
  keyMatches(block.id, 'skills');

const isSelectedTechnicalEnvironmentBlock = (block: CvTechStackBlock): boolean =>
  keyMatches(block.label, 'Selected Technical Environment') ||
  keyMatches(block.label, 'Technical Environment') ||
  keyMatches(block.label, 'Tech stack') ||
  keyMatches(block.id, 'tech');

const experiencePatchMatchesBlock = (
  patch: FilemakerCvExperienceHighlightPatch,
  block: CvExperienceBlock
): boolean => {
  const roleCompany = [block.title, block.organization].filter(Boolean).join(' | ');
  return (
    keyMatches(patch.experienceId, block.id) ||
    keyMatches(patch.experienceKey, block.id) ||
    keyMatches(patch.experienceTitle, block.title) ||
    keyMatches(patch.experienceTitle, roleCompany) ||
    keyMatches(patch.role, block.title) ||
    keyMatches(patch.company, block.organization) ||
    keyMatches(patch.experienceKey, roleCompany)
  );
};

const applyTailoringPatchToCvBlocks = (
  blocks: CvBlock[],
  tailoringPatch: FilemakerCvTailoringPatch | null,
  highlightTechnologyTerms: CvTechStackItem[]
): CvBlock[] => {
  if (tailoringPatch === null) return blocks;
  return blocks.map((block: CvBlock): CvBlock => {
    if (block.kind === 'summary' && tailoringPatch.professionalSummary !== null) {
      return { ...block, text: tailoringPatch.professionalSummary } satisfies CvSummaryBlock;
    }
    if (block.kind === 'skills' && tailoringPatch.coreStrengths.length > 0 && isCoreStrengthsBlock(block)) {
      return { ...block, items: tailoringPatch.coreStrengths } satisfies CvSkillsBlock;
    }
    if (
      block.kind === 'techStack' &&
      tailoringPatch.selectedTechnicalEnvironment.length > 0 &&
      isSelectedTechnicalEnvironmentBlock(block)
    ) {
      return {
        ...block,
        items: toTechStackItems(tailoringPatch.selectedTechnicalEnvironment, highlightTechnologyTerms),
      } satisfies CvTechStackBlock;
    }
    if (block.kind === 'experience') {
      const patch = tailoringPatch.experienceHighlightPatches.find(
        (entry: FilemakerCvExperienceHighlightPatch): boolean => experiencePatchMatchesBlock(entry, block)
      );
      if (patch !== undefined) {
        return { ...block, highlights: patch.highlights } satisfies CvExperienceBlock;
      }
    }
    if ('children' in block && Array.isArray(block.children)) {
      return {
        ...block,
        children: applyTailoringPatchToCvBlocks(
          block.children as CvBlock[],
          tailoringPatch,
          highlightTechnologyTerms
        ),
      } as CvBlock;
    }
    return block;
  });
};

const compileBody = (
  blocks: CvBlock[],
  highlightTechnologyTerms: CvTechStackItem[] = []
): { bodyHtml: string | null; bodyText: string | null } => {
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

const toFilemakerCv = (
  document: FilemakerCvMongoDocument,
  sourceBodyBlocks: CvBlock[] | null = null
): FilemakerCv => {
  const storedBlocks = normalizeCvBlocks(document.bodyBlocks);
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
  const hasTailoredMetadata =
    professionalSummary !== null ||
    coreStrengths.length > 0 ||
    selectedTechnicalEnvironment.length > 0 ||
    experienceHighlightPatches.length > 0 ||
    tailoringPatch !== null;
  const tailoringScope = normalizeTailoringScope(document.tailoringScope, hasTailoredMetadata);
  const sourceCvRecordId = normalizeOptionalString(document.sourceCvRecordId);
  const isScopedTailoredCv =
    tailoringScope !== null || tailoringPatch !== null || sourceCvRecordId !== null;
  const deterministicTailoredBlocks =
    sourceBodyBlocks !== null && sourceBodyBlocks.length > 0 && tailoringPatch !== null
      ? applyTailoringPatchToCvBlocks(sourceBodyBlocks, tailoringPatch, highlightTechnologyTerms)
      : [];
  const renderBlocks =
    deterministicTailoredBlocks.length > 0 ? deterministicTailoredBlocks : storedBlocks;
  const hasDeterministicTailoredRender = deterministicTailoredBlocks.length > 0;
  const blocks =
    renderBlocks.length > 0 ? renderBlocks : buildPlainTextFallbackBlocks(document.bodyText);
  const compiled =
    blocks.length > 0
      ? compileBody(blocks, highlightTechnologyTerms)
      : { bodyHtml: null, bodyText: null };
  const effectiveTailoringScope =
    hasDeterministicTailoredRender && tailoringScope !== null
      ? {
          ...tailoringScope,
          renderedBodyMode: 'deterministic_source_patch',
        }
      : tailoringScope;
  return {
    id: document.id,
    personId: document.personId,
    personName: document.personName,
    title: document.title,
    status: normalizeStatus(document.status, 'draft'),
    template: normalizeTemplate(document.template),
    sourceCvRecordId,
    sourceCvTitle: normalizeOptionalString(document.sourceCvTitle),
    bodyBlocksEditable: !isScopedTailoredCv,
    canonicalEditMode: isScopedTailoredCv ? 'tailoringPatch' : 'bodyBlocks',
    bodyBlocks: blocks.length > 0 ? blocks : null,
    bodyHtml: hasDeterministicTailoredRender
      ? compiled.bodyHtml
      : compiled.bodyHtml ?? document.bodyHtml ?? null,
    bodyText: hasDeterministicTailoredRender
      ? compiled.bodyText
      : document.bodyText ?? compiled.bodyText,
    professionalSummary,
    coreStrengths,
    selectedTechnicalEnvironment,
    experienceHighlightPatches,
    tailoringPatch,
    tailoringScope: effectiveTailoringScope,
    highlightTechnologyTerms,
    jobListingId: normalizeOptionalString(document.jobListingId),
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
};

const createCvId = (): string => `filemaker-cv-${randomUUID()}`;

const uniqueNonEmptyStrings = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  values.forEach((value: string | null | undefined): void => {
    const normalized = value?.trim() ?? '';
    if (normalized.length === 0 || seen.has(normalized)) return;
    seen.add(normalized);
  });
  return Array.from(seen);
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

const toFilemakerCvWithDeterministicPatch = async (
  collection: Collection<FilemakerCvMongoDocument>,
  document: FilemakerCvMongoDocument
): Promise<FilemakerCv> =>
  toFilemakerCv(document, await loadSourceBodyBlocksForTailoredCv(collection, document));

export const listMongoFilemakerCvsForPersonIds = async (
  personIds: Array<string | null | undefined>,
  personNames: Array<string | null | undefined> = []
): Promise<FilemakerCv[]> => {
  const normalizedPersonIds = uniqueNonEmptyStrings(personIds);
  const normalizedPersonNames = uniqueNonEmptyStrings(personNames);
  if (normalizedPersonIds.length === 0 && normalizedPersonNames.length === 0) return [];
  const collection = await getFilemakerCvsCollection();
  const clauses = [
    ...(normalizedPersonIds.length > 0 ? [{ personId: { $in: normalizedPersonIds } }] : []),
    ...(normalizedPersonNames.length > 0 ? [{ personName: { $in: normalizedPersonNames } }] : []),
  ];
  const filter: Document = clauses.length === 1 ? (clauses[0] ?? {}) : { $or: clauses };
  const documents = await collection
    .find(filter)
    .sort({ updatedAt: -1, createdAt: -1, title: 1 })
    .toArray();
  return Promise.all(
    documents.map((document: FilemakerCvMongoDocument): Promise<FilemakerCv> =>
      toFilemakerCvWithDeterministicPatch(collection, document)
    )
  );
};

export const listMongoFilemakerCvsForPerson = async (personId: string): Promise<FilemakerCv[]> =>
  listMongoFilemakerCvsForPersonIds([personId]);

export const getMongoFilemakerCvById = async (cvId: string): Promise<FilemakerCv | null> => {
  const collection = await getFilemakerCvsCollection();
  const document = await collection.findOne({
    $or: [{ _id: cvId }, { id: cvId }],
  });
  return document ? toFilemakerCvWithDeterministicPatch(collection, document) : null;
};

export const requireMongoFilemakerCvById = async (cvId: string): Promise<FilemakerCv> => {
  const cv = await getMongoFilemakerCvById(cvId);
  if (!cv) throw notFoundError('Filemaker CV was not found.');
  return cv;
};

export const createMongoFilemakerCv = async (
  input: CreateMongoFilemakerCvInput
): Promise<FilemakerCv> => {
  const collection = await getFilemakerCvsCollection();
  const now = new Date().toISOString();
  const blocks = normalizeCvBlocks(input.bodyBlocks);
  const highlightTechnologyTerms = normalizeHighlightTechnologyTerms(input.highlightTechnologyTerms);
  const coreStrengths = normalizeOptionalStringList(input.coreStrengths);
  const selectedTechnicalEnvironment = normalizeOptionalStringList(input.selectedTechnicalEnvironment);
  const experienceHighlightPatches = normalizeExperienceHighlightPatches(
    input.experienceHighlightPatches
  );
  const professionalSummary = normalizeOptionalString(input.professionalSummary);
  const tailoringPatch = normalizeTailoringPatch(input.tailoringPatch, {
    professionalSummary,
    coreStrengths,
    selectedTechnicalEnvironment,
    experienceHighlightPatches,
  });
  const hasTailoredMetadata =
    professionalSummary !== null ||
    coreStrengths.length > 0 ||
    selectedTechnicalEnvironment.length > 0 ||
    experienceHighlightPatches.length > 0 ||
    tailoringPatch !== null;
  const compiled = compileBody(blocks, highlightTechnologyTerms);
  const title =
    normalizeOptionalString(input.title) ?? `${input.personName.trim() || 'Person'} CV`;
  const document: FilemakerCvMongoDocument = {
    _id: createCvId(),
    id: '',
    personId: input.personId,
    personName: input.personName,
    title,
    status: 'draft',
    template: 'classic',
    bodyBlocks: blocks.length > 0 ? blocks : null,
    bodyHtml: input.bodyHtml ?? compiled.bodyHtml,
    bodyText: input.bodyText ?? compiled.bodyText,
    coreStrengths,
    selectedTechnicalEnvironment,
    experienceHighlightPatches,
    professionalSummary,
    tailoringPatch,
    tailoringScope: normalizeTailoringScope(input.tailoringScope, hasTailoredMetadata),
    sourceCvRecordId: normalizeOptionalString(input.sourceCvRecordId),
    sourceCvTitle: normalizeOptionalString(input.sourceCvTitle),
    highlightTechnologyTerms,
    jobListingId: normalizeOptionalString(input.jobListingId),
    createdAt: now,
    updatedAt: now,
  };
  document.id = document._id;
  await collection.insertOne(document);
  return toFilemakerCvWithDeterministicPatch(collection, document);
};

export const updateMongoFilemakerCv = async (
  cvId: string,
  input: UpdateMongoFilemakerCvInput
): Promise<FilemakerCv> => {
  const collection = await getFilemakerCvsCollection();
  const existing = await collection.findOne({ $or: [{ _id: cvId }, { id: cvId }] });
  if (!existing) throw notFoundError('Filemaker CV was not found.');

  const setFields: Partial<FilemakerCvMongoDocument> = {
    updatedAt: new Date().toISOString(),
  };
  const nextHighlightTechnologyTerms =
    input.highlightTechnologyTerms !== undefined
      ? normalizeHighlightTechnologyTerms(input.highlightTechnologyTerms)
      : normalizeHighlightTechnologyTerms(existing.highlightTechnologyTerms);
  const existingTailoringPatch = normalizeTailoringPatch(existing.tailoringPatch, {
    professionalSummary: normalizeOptionalString(existing.professionalSummary),
    coreStrengths: normalizeOptionalStringList(existing.coreStrengths),
    selectedTechnicalEnvironment: normalizeOptionalStringList(existing.selectedTechnicalEnvironment),
    experienceHighlightPatches: normalizeExperienceHighlightPatches(
      existing.experienceHighlightPatches
    ),
  });
  const isScopedTailoredCv =
    normalizeTailoringScope(existing.tailoringScope, existingTailoringPatch !== null) !== null ||
    existingTailoringPatch !== null ||
    normalizeOptionalString(existing.sourceCvRecordId) !== null;
  if (typeof input.title === 'string') {
    setFields.title = input.title.trim().length > 0 ? input.title.trim() : existing.title;
  }
  if (input.highlightTechnologyTerms !== undefined) {
    setFields.highlightTechnologyTerms = nextHighlightTechnologyTerms;
  }
  if (input.coreStrengths !== undefined) {
    setFields.coreStrengths = normalizeOptionalStringList(input.coreStrengths);
  }
  if (input.selectedTechnicalEnvironment !== undefined) {
    setFields.selectedTechnicalEnvironment = normalizeOptionalStringList(input.selectedTechnicalEnvironment);
  }
  if (input.experienceHighlightPatches !== undefined) {
    setFields.experienceHighlightPatches = normalizeExperienceHighlightPatches(
      input.experienceHighlightPatches
    );
  }
  if (input.professionalSummary !== undefined) {
    setFields.professionalSummary = normalizeOptionalString(input.professionalSummary);
  }
  if (input.tailoringPatch !== undefined) {
    setFields.tailoringPatch = normalizeTailoringPatch(input.tailoringPatch, {
      professionalSummary:
        input.professionalSummary !== undefined
          ? normalizeOptionalString(input.professionalSummary)
          : normalizeOptionalString(existing.professionalSummary),
      coreStrengths:
        input.coreStrengths !== undefined
          ? normalizeOptionalStringList(input.coreStrengths)
          : normalizeOptionalStringList(existing.coreStrengths),
      selectedTechnicalEnvironment:
        input.selectedTechnicalEnvironment !== undefined
          ? normalizeOptionalStringList(input.selectedTechnicalEnvironment)
          : normalizeOptionalStringList(existing.selectedTechnicalEnvironment),
      experienceHighlightPatches:
        input.experienceHighlightPatches !== undefined
          ? normalizeExperienceHighlightPatches(input.experienceHighlightPatches)
          : normalizeExperienceHighlightPatches(existing.experienceHighlightPatches),
    });
  }
  if (input.tailoringScope !== undefined) {
    const nextCoreStrengths =
      input.coreStrengths !== undefined
        ? normalizeOptionalStringList(input.coreStrengths)
        : normalizeOptionalStringList(existing.coreStrengths);
    const nextSelectedTechnicalEnvironment =
      input.selectedTechnicalEnvironment !== undefined
        ? normalizeOptionalStringList(input.selectedTechnicalEnvironment)
        : normalizeOptionalStringList(existing.selectedTechnicalEnvironment);
    const nextExperienceHighlightPatches =
      input.experienceHighlightPatches !== undefined
        ? normalizeExperienceHighlightPatches(input.experienceHighlightPatches)
        : normalizeExperienceHighlightPatches(existing.experienceHighlightPatches);
    setFields.tailoringScope = normalizeTailoringScope(
      input.tailoringScope,
      nextCoreStrengths.length > 0 ||
        nextSelectedTechnicalEnvironment.length > 0 ||
        nextExperienceHighlightPatches.length > 0
    );
  }
  if (input.jobListingId !== undefined) {
    setFields.jobListingId = normalizeOptionalString(input.jobListingId);
  }
  if (input.sourceCvRecordId !== undefined) {
    setFields.sourceCvRecordId = normalizeOptionalString(input.sourceCvRecordId);
  }
  if (input.sourceCvTitle !== undefined) {
    setFields.sourceCvTitle = normalizeOptionalString(input.sourceCvTitle);
  }
  if (input.status !== undefined) {
    setFields.status = normalizeStatus(input.status, existing.status);
  }
  if (input.template !== undefined) {
    setFields.template = normalizeTemplate(input.template);
  }
  if (input.bodyBlocks !== undefined && !isScopedTailoredCv) {
    const blocks = normalizeCvBlocks(input.bodyBlocks);
    const compiled = compileBody(blocks, nextHighlightTechnologyTerms);
    setFields.bodyBlocks = blocks.length > 0 ? blocks : null;
    setFields.bodyHtml = compiled.bodyHtml;
    setFields.bodyText = compiled.bodyText;
  } else {
    if (input.highlightTechnologyTerms !== undefined) {
      const blocks = normalizeCvBlocks(existing.bodyBlocks);
      if (blocks.length > 0) {
        const compiled = compileBody(blocks, nextHighlightTechnologyTerms);
        setFields.bodyHtml = compiled.bodyHtml;
        setFields.bodyText = compiled.bodyText;
      }
    }
    if (!isScopedTailoredCv) {
      if (input.bodyHtml !== undefined) setFields.bodyHtml = input.bodyHtml;
      if (input.bodyText !== undefined) setFields.bodyText = input.bodyText;
    }
  }

  await collection.updateOne({ _id: existing._id }, { $set: setFields });
  const updated = await getMongoFilemakerCvById(existing.id);
  if (!updated) throw notFoundError('Filemaker CV was not found after update.');
  return updated;
};

export const deleteMongoFilemakerCv = async (cvId: string): Promise<void> => {
  const collection = await getFilemakerCvsCollection();
  const result = await collection.deleteOne({ $or: [{ _id: cvId }, { id: cvId }] });
  if (result.deletedCount === 0) throw notFoundError('Filemaker CV was not found.');
};
