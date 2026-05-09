/**
 * Graph Service
 * 
 * Provides utilities for graph sanitation, node metadata validation, 
 * and edge consistency checks for Case Resolver workspaces.
 */

import { 
  DEFAULT_CASE_RESOLVER_NODE_META, 
  DEFAULT_CASE_RESOLVER_EDGE_META 
} from '@/shared/contracts/case-resolver/constants';
import { type CaseResolverNodeMeta, type CaseResolverEdgeMeta } from '@/shared/contracts/case-resolver';

/**
 * Normalizes text color strings (validates hex format).
 */
export const normalizeTextColor = (value: string | undefined): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (normalized.length === 0) return '';
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : undefined;
};

/**
 * Sanitizes node metadata.
 */
export const sanitizeNodeMeta = (
  meta: CaseResolverNodeMeta
): CaseResolverNodeMeta => {
  const role =
    meta.role === 'text_note' || meta.role === 'explanatory' || meta.role === 'ai_prompt'
      ? meta.role
      : DEFAULT_CASE_RESOLVER_NODE_META.role;
  return {
    ...DEFAULT_CASE_RESOLVER_NODE_META,
    ...meta,
    role,
    textColor: normalizeTextColor(meta.textColor) ?? DEFAULT_CASE_RESOLVER_NODE_META.textColor,
  };
};

/**
 * Sanitizes edge metadata.
 */
export const sanitizeEdgeMeta = (
  meta: CaseResolverEdgeMeta | null | undefined
): CaseResolverEdgeMeta => {
  if (!meta || typeof meta !== 'object') return DEFAULT_CASE_RESOLVER_EDGE_META;
  return {
    ...DEFAULT_CASE_RESOLVER_EDGE_META,
    ...meta,
  };
};
