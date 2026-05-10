/**
 * Node-File Relations Service
 * 
 * Provides utilities for managing and sanitizing the relationships 
 * between case nodes, source documents, and asset files.
 */

import type { CaseResolverAssetFile } from '@/shared/contracts/case-resolver/file';

/**
 * Checks if an asset is a canonical node-file (i.e., not an inline snapshot).
 */
export const isCanonicalNodeFileAsset = (asset: CaseResolverAssetFile): boolean =>
  asset.kind === 'node_file' && !(typeof asset.textContent === 'string' && asset.textContent.trim().length > 0);

/**
 * Helper to add unique values to a map of arrays.
 */
export const addUnique = (target: Record<string, string[]>, key: string, value: string): void => {
  const normalizedKey = key.trim();
  const normalizedValue = value.trim();
  if (normalizedKey.length === 0 || normalizedValue.length === 0) return;
  const current = target[normalizedKey] ?? [];
  if (current.includes(normalizedValue)) return;
  const relationTarget = target;
  relationTarget[normalizedKey] = [...current, normalizedValue];
};

/**
 * Sorts values within a record map.
 */
export const sortRecordValues = (input: Record<string, string[]>): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(input).map(([key, values]) => [
      key,
      [...values].sort((left, right) => left.localeCompare(right)),
    ])
  );

/**
 * Normalizes a record of string-to-string mappings.
 */
export const normalizeRecord = (input: Record<string, string> | undefined): Record<string, string> => {
  if (input === undefined) return {};
  const normalized: Record<string, string> = {};
  Object.entries(input).forEach(([key, value]) => {
    const normalizedKey = key.trim();
    const normalizedValue = typeof value === 'string' ? value.trim() : '';
    if (normalizedKey.length === 0 || normalizedValue.length === 0) return;
    normalized[normalizedKey] = normalizedValue;
  });
  return normalized;
};

/**
 * Compares two string records for equality.
 */
export const recordsEqual = (left: Record<string, string>, right: Record<string, string>): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => left[key] === right[key]);
};

/**
 * Merges a source relation map into a target map.
 */
export const mergeRelationMap = (
  target: Record<string, string[]>,
  source: Record<string, string[]>
): void => {
  Object.entries(source).forEach(([key, values]) => {
    values.forEach((value) => {
      addUnique(target, key, value);
    });
  });
};
