import 'server-only';

import { randomUUID } from 'crypto';

import type { Collection, Document } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type {
  CvBlock,
  CvTechStackItem,
} from '../components/cv-builder/cv-block-model';
import { normalizeCvBlocks } from '../components/cv-builder/cv-block-model';
import type {
  FilemakerCv,
  FilemakerCvExperienceHighlightPatch,
  FilemakerCvTailoringPatch,
} from '../filemaker-cv.types';

import {
  FILEMAKER_CVS_COLLECTION,
  type CreateMongoFilemakerCvInput,
  type FilemakerCvMongoDocument,
  type UpdateMongoFilemakerCvInput,
} from './filemaker-cv-repository.types';
import {
  normalizeExperienceHighlightPatches,
  normalizeHighlightTechnologyTerms,
  normalizeOptionalString,
  normalizeOptionalStringList,
  normalizeTailoringPatch,
  normalizeTailoringScope,
} from './filemaker-cv-normalizers';
import { compileBody, toFilemakerCvWithDeterministicPatch } from './filemaker-cv-rendering';
import { buildMongoFilemakerCvUpdateFields } from './filemaker-cv-repository-update';

export { FILEMAKER_CVS_COLLECTION } from './filemaker-cv-repository.types';
export type {
  CreateMongoFilemakerCvInput,
  FilemakerCvMongoDocument,
  UpdateMongoFilemakerCvInput,
} from './filemaker-cv-repository.types';

type CreateCvMetadata = {
  blocks: CvBlock[];
  bodyHtml: string | null;
  bodyText: string | null;
  coreStrengths: string[];
  experienceHighlightPatches: FilemakerCvExperienceHighlightPatch[];
  highlightTechnologyTerms: CvTechStackItem[];
  professionalSummary: string | null;
  selectedTechnicalEnvironment: string[];
  tailoringPatch: FilemakerCvTailoringPatch | null;
};

const getFilemakerCvsCollection = async (): Promise<Collection<FilemakerCvMongoDocument>> => {
  const db = await getMongoDb();
  return db.collection<FilemakerCvMongoDocument>(FILEMAKER_CVS_COLLECTION);
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

const buildPersonCvFilter = (
  personIds: Array<string | null | undefined>,
  personNames: Array<string | null | undefined>
): Document | null => {
  const normalizedPersonIds = uniqueNonEmptyStrings(personIds);
  const normalizedPersonNames = uniqueNonEmptyStrings(personNames);
  if (normalizedPersonIds.length === 0 && normalizedPersonNames.length === 0) return null;
  const clauses: Document[] = [
    ...(normalizedPersonIds.length > 0 ? [{ personId: { $in: normalizedPersonIds } }] : []),
    ...(normalizedPersonNames.length > 0 ? [{ personName: { $in: normalizedPersonNames } }] : []),
  ];
  return clauses.length === 1 ? clauses[0] ?? {} : { $or: clauses };
};

const hasCreateTailoredMetadata = (metadata: CreateCvMetadata): boolean =>
  metadata.professionalSummary !== null ||
  metadata.coreStrengths.length > 0 ||
  metadata.selectedTechnicalEnvironment.length > 0 ||
  metadata.experienceHighlightPatches.length > 0 ||
  metadata.tailoringPatch !== null;

const buildCreateCvMetadata = (input: CreateMongoFilemakerCvInput): CreateCvMetadata => {
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
  const compiled = compileBody(blocks, highlightTechnologyTerms);
  return {
    blocks,
    bodyHtml: input.bodyHtml ?? compiled.bodyHtml,
    bodyText: input.bodyText ?? compiled.bodyText,
    coreStrengths,
    experienceHighlightPatches,
    highlightTechnologyTerms,
    professionalSummary,
    selectedTechnicalEnvironment,
    tailoringPatch,
  };
};

const resolveCreateTitle = (input: CreateMongoFilemakerCvInput): string => {
  const normalizedTitle = normalizeOptionalString(input.title);
  if (normalizedTitle !== null) return normalizedTitle;
  const personName = input.personName.trim();
  return `${personName.length > 0 ? personName : 'Person'} CV`;
};

const buildCreateCvDocument = (
  input: CreateMongoFilemakerCvInput,
  metadata: CreateCvMetadata,
  now: string
): FilemakerCvMongoDocument => {
  const id = createCvId();
  return {
    _id: id,
    id,
    personId: input.personId,
    personName: input.personName,
    title: resolveCreateTitle(input),
    status: 'draft',
    template: 'classic',
    bodyBlocks: metadata.blocks.length > 0 ? metadata.blocks : null,
    bodyHtml: metadata.bodyHtml,
    bodyText: metadata.bodyText,
    coreStrengths: metadata.coreStrengths,
    selectedTechnicalEnvironment: metadata.selectedTechnicalEnvironment,
    experienceHighlightPatches: metadata.experienceHighlightPatches,
    professionalSummary: metadata.professionalSummary,
    tailoringPatch: metadata.tailoringPatch,
    tailoringScope: normalizeTailoringScope(input.tailoringScope, hasCreateTailoredMetadata(metadata)),
    sourceCvRecordId: normalizeOptionalString(input.sourceCvRecordId),
    sourceCvTitle: normalizeOptionalString(input.sourceCvTitle),
    highlightTechnologyTerms: metadata.highlightTechnologyTerms,
    jobListingId: normalizeOptionalString(input.jobListingId),
    createdAt: now,
    updatedAt: now,
  };
};

export const listMongoFilemakerCvsForPersonIds = async (
  personIds: Array<string | null | undefined>,
  personNames: Array<string | null | undefined> = []
): Promise<FilemakerCv[]> => {
  const filter = buildPersonCvFilter(personIds, personNames);
  if (filter === null) return [];
  const collection = await getFilemakerCvsCollection();
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
  return document !== null ? toFilemakerCvWithDeterministicPatch(collection, document) : null;
};

export const requireMongoFilemakerCvById = async (cvId: string): Promise<FilemakerCv> => {
  const cv = await getMongoFilemakerCvById(cvId);
  if (cv === null) throw notFoundError('Filemaker CV was not found.');
  return cv;
};

export const createMongoFilemakerCv = async (
  input: CreateMongoFilemakerCvInput
): Promise<FilemakerCv> => {
  const collection = await getFilemakerCvsCollection();
  const document = buildCreateCvDocument(input, buildCreateCvMetadata(input), new Date().toISOString());
  await collection.insertOne(document);
  return toFilemakerCvWithDeterministicPatch(collection, document);
};

export const updateMongoFilemakerCv = async (
  cvId: string,
  input: UpdateMongoFilemakerCvInput
): Promise<FilemakerCv> => {
  const collection = await getFilemakerCvsCollection();
  const existing = await collection.findOne({ $or: [{ _id: cvId }, { id: cvId }] });
  if (existing === null) throw notFoundError('Filemaker CV was not found.');

  const setFields = buildMongoFilemakerCvUpdateFields({ existing, input });
  await collection.updateOne({ _id: existing._id }, { $set: setFields });
  const updated = await getMongoFilemakerCvById(existing.id);
  if (updated === null) throw notFoundError('Filemaker CV was not found after update.');
  return updated;
};

export const deleteMongoFilemakerCv = async (cvId: string): Promise<void> => {
  const collection = await getFilemakerCvsCollection();
  const result = await collection.deleteOne({ $or: [{ _id: cvId }, { id: cvId }] });
  if (result.deletedCount === 0) throw notFoundError('Filemaker CV was not found.');
};
