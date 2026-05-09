/**
 * Node File Snapshot Service
 * 
 * Manages serialization, parsing, and validation of Case Resolver node 
 * file snapshots.
 */
/* eslint-disable complexity -- Snapshot parsing validates the full persisted envelope in one pass. */

import { z } from 'zod';
import { caseResolverNodeFileSnapshotSchema } from '@/shared/contracts/case-resolver/graph';
import { type CaseResolverNodeFileSnapshot } from '@/shared/contracts/case-resolver';
import { validationError } from '@/shared/errors/app-error';
import { parseCanonicalCaseResolverEdge } from '../../settings.edge-validation';

/**
 * Zod schema for the complete snapshot envelope including edges.
 */
export const NodeFileSnapshotEnvelopeSchema = caseResolverNodeFileSnapshotSchema.extend({
  edges: z.array(z.unknown()),
});

/**
 * Creates an empty, default node file snapshot.
 */
export const createEmptyNodeFileSnapshot = (): CaseResolverNodeFileSnapshot => ({
  kind: 'case_resolver_node_file_snapshot_v2',
  source: 'manual',
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  nodeFileMeta: {},
});

/**
 * Parses and validates a JSON string into a CaseResolverNodeFileSnapshot.
 */
export const parseNodeFileSnapshot = (textContent: string): CaseResolverNodeFileSnapshot => {
  const trimmedTextContent = textContent.trim();
  if (trimmedTextContent.length === 0) {
    return createEmptyNodeFileSnapshot();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedTextContent);
  } catch (error) {
    throw validationError('Invalid Case Resolver node-file snapshot payload.', {
      source: 'case_resolver.node_file_snapshot',
      reason: 'invalid_json',
      cause: error instanceof Error ? error.message : 'unknown_error',
    });
  }

  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError('Invalid Case Resolver node-file snapshot payload.', {
      source: 'case_resolver.node_file_snapshot',
      reason: 'snapshot_not_object',
    });
  }

  const record = parsed as Record<string, unknown>;
  const allowedKeys = new Set([
    'kind', 'source', 'nodes', 'edges', 'nodeMeta', 'edgeMeta', 'nodeFileMeta',
  ]);
  const unexpectedKeys = Object.keys(record).filter((key) => !allowedKeys.has(key));
  if (unexpectedKeys.length > 0) {
    throw validationError('Case Resolver node-file snapshot payload includes unsupported fields.', {
      source: 'case_resolver.node_file_snapshot',
      unexpectedKeys,
    });
  }

  const validation = NodeFileSnapshotEnvelopeSchema.safeParse(record);
  if (!validation.success) {
    throw validationError('Invalid Case Resolver node-file snapshot payload.', {
      source: 'case_resolver.node_file_snapshot',
      issues: validation.error.flatten(),
    });
  }

  const snapshot = validation.data;
  const source = record['source'];
  
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

/**
 * Serializes a snapshot into a JSON string.
 */
export const serializeNodeFileSnapshot = (snapshot: CaseResolverNodeFileSnapshot): string => {
  return JSON.stringify(snapshot);
};
