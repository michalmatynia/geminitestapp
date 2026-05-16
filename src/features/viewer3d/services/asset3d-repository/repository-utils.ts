/**
 * Asset 3D Repository Utilities
 * 
 * Helper functions for MongoDB document handling and normalization.
 * Provides:
 * - Document type definitions and schema mapping
 * - String and array normalization utilities
 * - Date handling and conversion
 * - MongoDB ID filtering and querying
 * - Asset record field extraction and transformation
 */

import { ObjectId, type Document, type Filter } from 'mongodb';
import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

/**
 * MongoDB document type for 3D assets
 * Maps database fields to Asset3DRecord contract
 */
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

/**
 * Normalizes a string value by trimming whitespace
 * Returns null for non-strings or empty strings
 * 
 * @param value - The value to normalize
 * @returns Trimmed string or null if invalid/empty
 */
export const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * Normalizes an array of strings
 * Filters out non-strings, trims whitespace, removes duplicates
 * 
 * @param value - The value to normalize
 * @returns Array of unique trimmed strings
 */
export const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const results: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string') {
      const trimmed = entry.trim();
      if (trimmed.length > 0) results.push(trimmed);
    }
  }
  // Remove duplicates using Set
  return Array.from(new Set(results));
};

/**
 * Normalizes a date value with fallback
 * 
 * @param value - The value to normalize
 * @param fallback - Default date if value is invalid
 * @returns Date object
 */
export const normalizeDate = (value: unknown, fallback: Date): Date =>
  value instanceof Date ? value : fallback;

/**
 * Converts MongoDB ObjectId or string to string ID
 * Handles ObjectId conversion to hex string
 * 
 * @param value - ObjectId or string to convert
 * @param fallback - Default value if conversion fails
 * @returns String ID or fallback
 */
export const toStringId = (value: ObjectId | string | undefined, fallback?: string | null): string => {
  if (fallback !== undefined && fallback !== null) return fallback;
  if (typeof value === 'string') return value;
  if (value instanceof ObjectId) return value.toHexString();
  return '';
};

/**
 * Builds a MongoDB filter for querying by ID
 * Handles both string IDs and ObjectIds with multiple query variants
 * 
 * Process:
 * 1. Create filter for string ID
 * 2. If ID is valid ObjectId format, create ObjectId variant
 * 3. Deduplicate variants
 * 4. Combine with $or operator
 * 
 * @param id - The ID to filter by
 * @returns MongoDB filter object
 */
export const buildIdFilter = (id: string): Filter<Asset3DDocument> => {
  const clauses: Filter<Asset3DDocument>[] = [{ id }];
  const idVariants: Array<ObjectId | string> = [id];
  
  // Try to create ObjectId variant if ID is valid
  if (ObjectId.isValid(id)) {
    idVariants.push(new ObjectId(id));
  }
  
  // Deduplicate variants by string representation
  const dedupedVariants = Array.from(
    new Map(idVariants.map((value: ObjectId | string) => [value.toString(), value])).values()
  );
  
  // Add _id filter for each variant
  dedupedVariants.forEach((value: ObjectId | string): void => {
    clauses.push({ _id: value });
  });
  
  // Return combined filter
  if (clauses.length === 0) return {};
  if (clauses.length === 1) return clauses[0] ?? {};
  return { $or: clauses };
};

/**
 * Extracts the display name from an asset document
 * Falls back to filename if name is not available
 * 
 * @param doc - The asset document
 * @returns Display name or empty string
 */
const getAssetRecordName = (doc: Asset3DDocument): string =>
  normalizeString(doc.name) ?? normalizeString(doc.filename) ?? '';

/**
 * Extracts tags from an asset document
 * Normalizes both tags and tagIds fields
 * 
 * @param doc - The asset document
 * @returns Array of normalized tags
 */
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

const getAssetFilepath = (doc: Asset3DDocument): string | undefined =>
  normalizeString(doc.filepath) ?? normalizeString(doc.fileUrl) ?? undefined;

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
    thumbnailUrl: normalizeString(doc.thumbnailUrl) ?? null,
    filename: normalizeString(doc.filename) ?? undefined,
    filepath: getAssetFilepath(doc),
    mimetype: normalizeString(doc.mimetype) ?? undefined,
    size: getAssetSize(doc),
    fileSize: getAssetSize(doc),
    format: normalizeString(doc.format) ?? undefined,
    isPublic: doc.isPublic ?? false,
    metadata: getMetadata(doc),
    viewerConfig: getViewerConfig(doc),
    createdAt: createdAt.toISOString(),
    updatedAt: normalizeDate(doc.updatedAt, createdAt).toISOString(),
  };
};
