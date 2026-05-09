/**
 * Edge Validation Service
 * 
 * Logic for validating, normalizing, and parsing Case Resolver graph edges.
 */

import { z } from 'zod';
import { caseResolverEdgeSchema, type CaseResolverEdge } from '@/shared/contracts/case-resolver/graph';
import { validationError } from '@/shared/errors/app-error';

export const CANONICAL_CASE_RESOLVER_EDGE_KEYS = new Set([
  'id', 'source', 'target', 'sourceHandle', 'targetHandle', 
  'label', 'type', 'data', 'createdAt', 'updatedAt',
]);

export const FORBIDDEN_CASE_RESOLVER_EDGE_HANDLE_NAMES = new Set(['textfield', 'content']);

/**
 * Creates a validation error for edge-specific context.
 */
export const buildInvalidCaseResolverEdgeError = (
  message: string,
  context: string,
  meta?: Record<string, unknown>
) =>
  validationError(message, {
    source: 'case_resolver.edge_validation',
    context,
    ...(meta ?? {}),
  });

/**
 * Normalizes an edge handle name.
 */
export const normalizeCaseResolverEdgeHandle = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};
