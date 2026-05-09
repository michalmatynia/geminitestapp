/**
 * Taxonomy Service
 * 
 * Logic for normalizing, validating, and managing Case Resolver taxonomy items
 * including identifiers, tags, and categories.
 */

import {
  type CaseResolverCategory,
  type CaseResolverIdentifier,
  type CaseResolverTag,
} from '@/shared/contracts/case-resolver';

/**
 * Normalizes a timestamp string.
 */
export const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

/**
 * Sanitizes an optional ID string.
 */
export const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

/**
 * Normalizes a hex color string, falling back to a provided value.
 */
export const normalizeHexColor = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(normalized) || /^#[0-9a-fA-F]{3}$/.test(normalized)
    ? normalized
    : fallback;
};

/**
 * Resolves a safe parent ID, checking for circular references.
 */
export const resolveSafeParentId = <T extends { id: string; parentId?: string | null }>(
  itemId: string,
  parentId: string | null,
  map: Map<string, T>
): string | null => {
  if (!parentId || !map.has(parentId) || parentId === itemId) return null;
  let current: string | null = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === itemId || visited.has(current)) return null;
    visited.add(current);
    const parent = map.get(current);
    current = parent?.parentId ?? null;
  }
  return parentId;
};
