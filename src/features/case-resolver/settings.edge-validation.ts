import { caseResolverEdgeSchema, type CaseResolverEdge } from '@/shared/contracts/case-resolver/graph';
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
const FORBIDDEN_CASE_RESOLVER_EDGE_HANDLE_NAMES = new Set(['textfield', 'content']);

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

const findUnsupportedCaseResolverEdgeKeys = (record: Record<string, unknown>): string[] =>
  Object.keys(record).filter(
    (key: string): boolean => !CANONICAL_CASE_RESOLVER_EDGE_KEYS.has(key)
  );

const parseCaseResolverEdgeRecord = (
  input: unknown,
  context: string
): Record<string, unknown> => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw buildInvalidCaseResolverEdgeError('Invalid Case Resolver edge payload.', context, {
      reason: 'edge_not_object',
    });
  }

  return input as Record<string, unknown>;
};

const assertSupportedCaseResolverEdgeKeys = (
  record: Record<string, unknown>,
  context: string
): void => {
  const unsupportedKeys = findUnsupportedCaseResolverEdgeKeys(record);
  if (unsupportedKeys.length > 0) {
    throw buildInvalidCaseResolverEdgeError(
      'Case Resolver edge payload includes unsupported fields.',
      context,
      { unsupportedKeys }
    );
  }
};

const parseValidatedCaseResolverEdge = (
  record: Record<string, unknown>,
  context: string
): CaseResolverEdge => {
  const validation = caseResolverEdgeSchema.safeParse(record);
  if (validation.success) {
    return validation.data;
  }

  throw buildInvalidCaseResolverEdgeError('Invalid Case Resolver edge payload.', context, {
    issues: validation.error.flatten(),
  });
};

const normalizeCaseResolverEdgeHandle = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const assertCanonicalCaseResolverEdgeEndpoints = (
  edge: CaseResolverEdge,
  context: string
): { source: string; target: string } => {
  const source = typeof edge.source === 'string' ? edge.source.trim() : '';
  const target = typeof edge.target === 'string' ? edge.target.trim() : '';
  if (source && target) {
    return { source, target };
  }

  throw buildInvalidCaseResolverEdgeError(
    'Case Resolver edges must use canonical source/target fields.',
    context,
    {
      edgeId: edge.id,
    }
  );
};

const assertAllowedCaseResolverEdgeHandles = (
  edge: CaseResolverEdge,
  context: string
): { sourceHandle: string | null; targetHandle: string | null } => {
  const sourceHandle = normalizeCaseResolverEdgeHandle(edge.sourceHandle);
  const targetHandle = normalizeCaseResolverEdgeHandle(edge.targetHandle);
  if (
    (sourceHandle !== null && FORBIDDEN_CASE_RESOLVER_EDGE_HANDLE_NAMES.has(sourceHandle)) ||
    (targetHandle !== null && FORBIDDEN_CASE_RESOLVER_EDGE_HANDLE_NAMES.has(targetHandle))
  ) {
    throw buildInvalidCaseResolverEdgeError(
      'Case Resolver edge payload includes unsupported handle names.',
      context,
      {
        edgeId: edge.id,
        sourceHandle: sourceHandle ?? null,
        targetHandle: targetHandle ?? null,
      }
    );
  }

  return { sourceHandle, targetHandle };
};

export const parseCanonicalCaseResolverEdge = (input: unknown, context: string): CaseResolverEdge => {
  const record = parseCaseResolverEdgeRecord(input, context);
  assertSupportedCaseResolverEdgeKeys(record, context);
  const edge = parseValidatedCaseResolverEdge(record, context);
  const { source, target } = assertCanonicalCaseResolverEdgeEndpoints(edge, context);
  const { sourceHandle, targetHandle } = assertAllowedCaseResolverEdgeHandles(edge, context);

  return {
    ...edge,
    source,
    target,
    sourceHandle: sourceHandle ?? null,
    targetHandle: targetHandle ?? null,
  };
};
