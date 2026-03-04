import { edgeSchema, type Edge } from '@/shared/contracts/ai-paths-core/nodes';
import { validationError } from '@/shared/errors/app-error';

const CANONICAL_CASE_RESOLVER_EDGE_KEYS = new Set([
  'id',
  'source',
  'target',
  'sourceHandle',
  'targetHandle',
  'label',
  'type',
  'data',
  'createdAt',
  'updatedAt',
]);
const LEGACY_CASE_RESOLVER_EDGE_KEYS = new Set(['from', 'to', 'fromPort', 'toPort']);
const LEGACY_CASE_RESOLVER_PORTS = new Set(['textfield', 'content']);

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

export const parseCanonicalCaseResolverEdge = (input: unknown, context: string): Edge => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw buildInvalidCaseResolverEdgeError('Invalid Case Resolver edge payload.', context, {
      reason: 'edge_not_object',
    });
  }

  const record = input as Record<string, unknown>;
  const unsupportedKeys = Object.keys(record).filter(
    (key: string): boolean => !CANONICAL_CASE_RESOLVER_EDGE_KEYS.has(key)
  );
  if (unsupportedKeys.length > 0) {
    const legacyKeys = unsupportedKeys.filter((key: string): boolean =>
      LEGACY_CASE_RESOLVER_EDGE_KEYS.has(key)
    );
    throw buildInvalidCaseResolverEdgeError(
      legacyKeys.length > 0
        ? 'Legacy Case Resolver edge fields are no longer supported.'
        : 'Case Resolver edge payload includes unsupported fields.',
      context,
      legacyKeys.length > 0 ? { legacyKeys } : { unsupportedKeys }
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

  const normalizeHandle = (value: unknown): string | null => {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  };
  const sourceHandle = normalizeHandle(edge.sourceHandle);
  const targetHandle = normalizeHandle(edge.targetHandle);
  if (
    (sourceHandle !== null && LEGACY_CASE_RESOLVER_PORTS.has(sourceHandle)) ||
    (targetHandle !== null && LEGACY_CASE_RESOLVER_PORTS.has(targetHandle))
  ) {
    throw buildInvalidCaseResolverEdgeError(
      'Legacy Case Resolver edge port names are no longer supported.',
      context,
      {
        edgeId: edge.id,
        sourceHandle: sourceHandle ?? null,
        targetHandle: targetHandle ?? null,
      }
    );
  }

  return {
    ...edge,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
    targetHandle: targetHandle ?? null,
  };
};
