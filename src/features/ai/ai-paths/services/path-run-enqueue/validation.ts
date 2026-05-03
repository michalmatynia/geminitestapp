import { type EnqueueRunInput } from './types';
import { type AiNode, type Edge, type PathConfig } from '@/shared/contracts/ai-paths';
import { validationError } from '@/shared/errors/app-error';
import { findRemovedLegacyAiPathNodes, formatRemovedLegacyAiPathNodesMessage, validateCanonicalPathNodeIdentities, sanitizeEdges, stableStringify } from '@/shared/lib/ai-paths/core/utils';
import { palette } from '@/shared/lib/ai-paths/core/definitions';

const buildRunGraphValidationConfig = (
  input: EnqueueRunInput,
  nodes: AiNode[],
  edges: Edge[]
): PathConfig => ({
  id: input.pathId,
  version: 1,
  name:
    typeof input.pathName === 'string' && input.pathName.trim().length > 0
      ? input.pathName.trim()
      : input.pathId,
  description: '',
  trigger:
    typeof input.triggerEvent === 'string' && input.triggerEvent.trim().length > 0
      ? input.triggerEvent.trim()
      : 'manual',
  nodes,
  edges,
  updatedAt: new Date().toISOString(),
});

export const assertCanonicalRunGraph = ({
  input,
  rawNodes,
  nodes,
  edges,
}: {
  input: EnqueueRunInput;
  rawNodes: AiNode[];
  nodes: AiNode[];
  edges: Edge[];
}): Edge[] => {
  const removedLegacyNodes = findRemovedLegacyAiPathNodes(rawNodes);
  if (removedLegacyNodes.length > 0) {
    throw validationError(formatRemovedLegacyAiPathNodesMessage(removedLegacyNodes, {
      surface: 'run graph',
    }), {
      source: 'ai_paths.run',
      reason: 'removed_legacy_node_type',
      pathId: input.pathId,
      removedNodes: removedLegacyNodes,
    });
  }
  const identityIssues = validateCanonicalPathNodeIdentities(
    buildRunGraphValidationConfig(input, nodes, edges),
    {
      palette,
    }
  );
  if (identityIssues.length > 0) {
    throw validationError('AI Paths run graph contains unsupported node identities.', {
      source: 'ai_paths.run',
      reason: 'unsupported_node_identities',
      pathId: input.pathId,
      issues: identityIssues,
    });
  }

  const canonicalEdges = sanitizeEdges(nodes, edges);
  if (stableStringify(canonicalEdges) !== stableStringify(edges)) {
    throw validationError('AI Paths run graph contains invalid or non-canonical edges.', {
      source: 'ai_paths.run',
      reason: 'invalid_edges',
      pathId: input.pathId,
    });
  }

  return canonicalEdges;
};
