import 'server-only';

/* eslint-disable complexity, @typescript-eslint/strict-boolean-expressions */

import { randomUUID } from 'crypto';

import type { Collection, Document } from 'mongodb';

import { notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { CvBlock } from '../components/cv-builder/cv-block-model';
import { normalizeCvBlocks } from '../components/cv-builder/cv-block-model';
import { compileCvBlocksToHtml, compileCvBlocksToPlainText } from '../components/cv-builder/compile-cv-blocks';
import type { FilemakerCv, FilemakerCvStatus, FilemakerCvTemplate } from '../filemaker-cv.types';

export const FILEMAKER_CVS_COLLECTION = 'filemaker_cvs';

export type FilemakerCvMongoDocument = Document & {
  _id: string;
  bodyBlocks?: CvBlock[] | null;
  bodyHtml?: string | null;
  bodyText?: string | null;
  createdAt: string;
  id: string;
  personId: string;
  personName: string;
  status: FilemakerCvStatus;
  template: FilemakerCvTemplate;
  title: string;
  updatedAt: string;
};

export type CreateMongoFilemakerCvInput = {
  bodyBlocks?: unknown;
  bodyHtml?: string | null;
  bodyText?: string | null;
  personId: string;
  personName: string;
  title?: string | null;
};

export type UpdateMongoFilemakerCvInput = {
  bodyBlocks?: unknown;
  bodyHtml?: string | null;
  bodyText?: string | null;
  status?: FilemakerCvStatus;
  template?: FilemakerCvTemplate;
  title?: string;
};

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

const compileBody = (blocks: CvBlock[]): { bodyHtml: string | null; bodyText: string | null } => {
  if (blocks.length === 0) return { bodyHtml: null, bodyText: null };
  return {
    bodyHtml: compileCvBlocksToHtml(blocks),
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

const toFilemakerCv = (document: FilemakerCvMongoDocument): FilemakerCv => {
  const storedBlocks = normalizeCvBlocks(document.bodyBlocks);
  const blocks =
    storedBlocks.length > 0 ? storedBlocks : buildPlainTextFallbackBlocks(document.bodyText);
  const compiled = blocks.length > 0 ? compileBody(blocks) : { bodyHtml: null, bodyText: null };
  return {
    id: document.id,
    personId: document.personId,
    personName: document.personName,
    title: document.title,
    status: normalizeStatus(document.status, 'draft'),
    template: normalizeTemplate(document.template),
    bodyBlocks: blocks.length > 0 ? blocks : null,
    bodyHtml: document.bodyHtml ?? compiled.bodyHtml,
    bodyText: document.bodyText ?? compiled.bodyText,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
};

const createCvId = (): string => `filemaker-cv-${randomUUID()}`;

export const listMongoFilemakerCvsForPerson = async (personId: string): Promise<FilemakerCv[]> => {
  const collection = await getFilemakerCvsCollection();
  const documents = await collection
    .find({ personId })
    .sort({ updatedAt: -1, createdAt: -1, title: 1 })
    .toArray();
  return documents.map(toFilemakerCv);
};

export const getMongoFilemakerCvById = async (cvId: string): Promise<FilemakerCv | null> => {
  const collection = await getFilemakerCvsCollection();
  const document = await collection.findOne({
    $or: [{ _id: cvId }, { id: cvId }],
  });
  return document ? toFilemakerCv(document) : null;
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
  const compiled = compileBody(blocks);
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
    createdAt: now,
    updatedAt: now,
  };
  document.id = document._id;
  await collection.insertOne(document);
  return toFilemakerCv(document);
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
  if (typeof input.title === 'string') {
    setFields.title = input.title.trim().length > 0 ? input.title.trim() : existing.title;
  }
  if (input.status !== undefined) {
    setFields.status = normalizeStatus(input.status, existing.status);
  }
  if (input.template !== undefined) {
    setFields.template = normalizeTemplate(input.template);
  }
  if (input.bodyBlocks !== undefined) {
    const blocks = normalizeCvBlocks(input.bodyBlocks);
    const compiled = compileBody(blocks);
    setFields.bodyBlocks = blocks.length > 0 ? blocks : null;
    setFields.bodyHtml = compiled.bodyHtml;
    setFields.bodyText = compiled.bodyText;
  } else {
    if (input.bodyHtml !== undefined) setFields.bodyHtml = input.bodyHtml;
    if (input.bodyText !== undefined) setFields.bodyText = input.bodyText;
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
