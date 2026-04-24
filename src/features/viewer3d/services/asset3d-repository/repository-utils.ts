import { ObjectId, type Document, type Filter } from 'mongodb';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

export type Asset3DDocument = Document & {
  _id: ObjectId | string;
  id?: string;
  name?: string | null;
  description?: string | null;
  fileId?: string;
  thumbnailId?: string | null;
  categoryId?: string | null;
  category?: string | null;
  tagIds?: string[] | null;
  tags?: string[] | null;
  fileUrl?: string;
  thumbnailUrl?: string | null;
  filename?: string;
  filepath?: string;
  mimetype?: string;
  size?: number;
  fileSize?: number;
  format?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown> | null;
  viewerConfig?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date | null;
};

export const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const results: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      if (trimmed.length > 0) results.push(trimmed);
    }
  }
  return Array.from(new Set(results));
};

export const normalizeDate = (value: unknown, fallback: Date): Date =>
  value instanceof Date ? value : fallback;

export const toStringId = (value: ObjectId | string | undefined, fallback?: string | null): string => {
  if (fallback !== undefined && fallback !== null) return fallback;
  if (typeof value === 'string') return value;
  if (value instanceof ObjectId) return value.toHexString();
  return '';
};

export const buildIdFilter = (id: string): Filter<Asset3DDocument> => {
  const clauses: Filter<Asset3DDocument>[] = [{ id }];
  const idVariants: Array<ObjectId | string> = [id];
  if (ObjectId.isValid(id)) {
    idVariants.push(new ObjectId(id));
  }
  const dedupedVariants = Array.from(
    new Map(idVariants.map((value: ObjectId | string) => [value.toString(), value])).values()
  );
  dedupedVariants.forEach((value: ObjectId | string): void => {
    clauses.push({ _id: value });
  });
  
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
};

const getAssetRecordName = (doc: Asset3DDocument): string =>
  normalizeString(doc.name) ?? normalizeString(doc.filename) ?? '';

const getAssetRecordTags = (doc: Asset3DDocument): string[] =>
  normalizeStringArray(doc.tags ?? doc.tagIds);

const getAssetRecordCategory = (doc: Asset3DDocument): string | null =>
  normalizeString(doc.categoryId ?? doc.category) ?? null;

const getMetadata = (doc: Asset3DDocument): Record<string, unknown> => {
  const meta = doc.metadata;
  return meta && typeof meta === 'object' && !Array.isArray(meta)
    ? (meta)
    : {};
};

const getViewerConfig = (doc: Asset3DDocument): Record<string, unknown> => {
  const config = doc.viewerConfig;
  return config && typeof config === 'object' && !Array.isArray(config)
    ? (config)
    : {};
};

const getAssetFileUrl = (doc: Asset3DDocument): string | undefined =>
  normalizeString(doc.fileUrl) ?? undefined;

const getAssetSize = (doc: Asset3DDocument): number =>
  doc.size ?? doc.fileSize ?? 0;

export const mapDocToRecord = (doc: Asset3DDocument): Asset3DRecord => {
  const createdAt = normalizeDate(doc.createdAt, new Date());

  return {
    id: toStringId(doc._id, normalizeString(doc.id)),
    name: getAssetRecordName(doc),
    description: normalizeString(doc.description) ?? null,
    fileId: normalizeString(doc.fileId) ?? undefined,
    thumbnailId: normalizeString(doc.thumbnailId) ?? null,
    categoryId: getAssetRecordCategory(doc),
    tags: getAssetRecordTags(doc),
    fileUrl: getAssetFileUrl(doc),
    filename: normalizeString(doc.filename) ?? undefined,
    mimetype: normalizeString(doc.mimetype) ?? undefined,
    size: getAssetSize(doc),
    format: normalizeString(doc.format) ?? undefined,
    isPublic: doc.isPublic ?? false,
    metadata: getMetadata(doc),
    viewerConfig: getViewerConfig(doc),
    createdAt,
    updatedAt: normalizeDate(doc.updatedAt, createdAt),
  };
};
