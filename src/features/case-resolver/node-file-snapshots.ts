import {
  type CaseResolverNodeFileSnapshot,
  caseResolverNodeFileSnapshotSchema,
} from '@/shared/contracts/case-resolver';
import { validationError } from '@/shared/errors/app-error';
import { z } from 'zod';

import { parseCanonicalCaseResolverEdge } from './settings.edge-validation';

const caseResolverNodeFileSnapshotEnvelopeSchema = caseResolverNodeFileSnapshotSchema.extend({
  edges: z.array(z.unknown()),
});

export const createEmptyNodeFileSnapshot = (): CaseResolverNodeFileSnapshot => ({
  kind: 'case_resolver_node_file_snapshot_v2',
  source: 'manual',
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  nodeFileMeta: {},
});

export const parseNodeFileSnapshot = (textContent: string): CaseResolverNodeFileSnapshot => {
  const trimmedTextContent = textContent.trim();
  if (!trimmedTextContent) {
    return createEmptyNodeFileSnapshot();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedTextContent) as unknown;
  } catch (error: unknown) {
    throw validationError('Invalid Case Resolver node-file snapshot payload.', {
      source: 'case_resolver.node_file_snapshot',
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid Case Resolver node-file snapshot payload.', {
      source: 'case_resolver.node_file_snapshot',
      reason: 'snapshot_not_object',
    });
  }

  const record = parsed as Record<string, unknown>;
  const allowedKeys = new Set([
    'kind',
    'source',
    'nodes',
    'edges',
    'nodeMeta',
    'edgeMeta',
    'nodeFileMeta',
  ]);
  const unexpectedKeys = Object.keys(record).filter(
    (key: string): boolean => !allowedKeys.has(key)
  );
  if (unexpectedKeys.length > 0) {
    throw validationError('Case Resolver node-file snapshot payload includes unsupported fields.', {
      source: 'case_resolver.node_file_snapshot',
      unexpectedKeys,
    });
  }

  const { source: _source, ...snapshotRecord } = record;
  const validation = caseResolverNodeFileSnapshotEnvelopeSchema.safeParse(snapshotRecord);
  if (!validation.success) {
    throw validationError('Invalid Case Resolver node-file snapshot payload.', {
      source: 'case_resolver.node_file_snapshot',
      issues: validation.error.flatten(),
    });
  }

  const snapshot = validation.data;
  const source = record['source'];
  if (source !== undefined && source !== 'manual' && source !== 'auto') {
    throw validationError('Invalid Case Resolver node-file snapshot source.', {
      source: 'case_resolver.node_file_snapshot',
      value: source,
    });
  }

  return {
    kind: 'case_resolver_node_file_snapshot_v2',
    source: source === 'auto' ? 'auto' : 'manual',
    nodes: [...snapshot.nodes],
    edges: snapshot.edges.map((edge) =>
      parseCanonicalCaseResolverEdge(edge, 'case_resolver_node_file_snapshot')
    ),
    nodeMeta: { ...(snapshot.nodeMeta ?? {}) },
    edgeMeta: { ...(snapshot.edgeMeta ?? {}) },
    nodeFileMeta: { ...snapshot.nodeFileMeta },
  };
};

export const serializeNodeFileSnapshot = (snapshot: CaseResolverNodeFileSnapshot): string => {
  return JSON.stringify(snapshot);
};
