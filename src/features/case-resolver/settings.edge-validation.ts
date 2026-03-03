import { edgeSchema, type Edge } from '@/shared/contracts/ai-paths-core/nodes';
import { CASE_RESOLVER_LEGACY_DOCUMENT_CONTENT_PORT } from '@/shared/contracts/case-resolver';
import { validationError } from '@/shared/errors/app-error';

const LEGACY_CASE_RESOLVER_EDGE_KEYS = new Set(['from', 'to', 'fromPort', 'toPort']);
const LEGACY_CASE_RESOLVER_TEXTFIELD_PORT = 'textfield';

const buildInvalidCaseResolverEdgeError = (
  message: string,
  context: string,
  meta?: Record<string, unknown>
) =>
  validationError(message, {
    source: 'case_resolver.edge_validation',
    context,
    ...(meta ?? {}),
  });

const isLegacyCaseResolverPortValue = (value: unknown): boolean =>
  value === LEGACY_CASE_RESOLVER_TEXTFIELD_PORT ||
  value === CASE_RESOLVER_LEGACY_DOCUMENT_CONTENT_PORT;

export const parseCanonicalCaseResolverEdge = (input: unknown, context: string): Edge => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw buildInvalidCaseResolverEdgeError('Invalid Case Resolver edge payload.', context, {
      reason: 'edge_not_object',
    });
  }

  const record = input as Record<string, unknown>;
  const legacyKeys = Object.keys(record).filter((key: string): boolean =>
    LEGACY_CASE_RESOLVER_EDGE_KEYS.has(key)
  );
  if (legacyKeys.length > 0) {
    throw buildInvalidCaseResolverEdgeError(
      'Legacy Case Resolver edge fields are no longer supported.',
      context,
      { legacyKeys }
    );
  }

  const validation = edgeSchema.safeParse(record);
  if (!validation.success) {
    throw buildInvalidCaseResolverEdgeError('Invalid Case Resolver edge payload.', context, {
      issues: validation.error.flatten(),
    });
  }

  const edge = validation.data;
  const source = typeof edge.source === 'string' ? edge.source.trim() : '';
  const target = typeof edge.target === 'string' ? edge.target.trim() : '';
  if (!source || !target) {
    throw buildInvalidCaseResolverEdgeError(
      'Case Resolver edges must use canonical source/target fields.',
      context,
      {
        edgeId: edge.id,
      }
    );
  }

  if (
    isLegacyCaseResolverPortValue(edge.sourceHandle) ||
    isLegacyCaseResolverPortValue(edge.targetHandle)
  ) {
    throw buildInvalidCaseResolverEdgeError(
      'Legacy Case Resolver edge port names are no longer supported.',
      context,
      {
        edgeId: edge.id,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
      }
    );
  }

  return {
    ...edge,
    source,
    target,
  };
};
