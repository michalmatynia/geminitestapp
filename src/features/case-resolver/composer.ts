/**
 * composer.ts
 *
 * Compiles a CaseResolver node graph into a flat prompt string and a set of
 * per-node output segments.
 */
import type { CaseResolverCompiledSegment, CaseResolverCompileResult } from '@/shared/contracts/case-resolver/capture';
import { type CaseResolverGraph } from '@/shared/contracts/case-resolver';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { resolveLeafNodePrompt } from './composer-traversal';
import {
  type NodeOutputs,
  buildGraphContext,
  resolveStartNodeIds,
  computeVisitOrder,
} from './composer-graph';
import {
  type CaseResolverCompileOptions,
  processNode,
} from './composer-node';

export const compileCaseResolverPrompt = (
  graph: CaseResolverGraph,
  selectedNodeId: string | null,
  options: CaseResolverCompileOptions = {}
): CaseResolverCompileResult => {
  try {
    const context = buildGraphContext(graph);
    const startNodeIds = resolveStartNodeIds(graph, context, selectedNodeId);
    const visitOrder = computeVisitOrder(graph, context, startNodeIds, selectedNodeId);

    const outputsByNode: Record<string, NodeOutputs> = {};
    const segments: CaseResolverCompiledSegment[] = [];

    visitOrder.forEach(({ nodeId }) => {
      const node = context.nodeById.get(nodeId);
      if (node === undefined) return;
      const result = processNode(node, graph, context, outputsByNode, options);
      outputsByNode[nodeId] = result.output;
      segments.push(result.segment);
    });


    const visitedNodeIds = new Set<string>(visitOrder.map((entry) => entry.nodeId));
    const flowPrompt = resolveLeafNodePrompt(
      visitOrder,
      context.outgoingByNode,
      visitedNodeIds,
      outputsByNode
    );

    return {
      combinedContent: flowPrompt,
      prompt: flowPrompt,
      outputsByNode,
      segments,
      warnings: [],
    };
  } catch (error) {
    logClientError(error);
    void logSystemEvent({
      level: 'error',
      message: 'Failed to compile Case Resolver prompt',
      source: 'case-resolver-composer',
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return {
      combinedContent: '',
      prompt: '',
      outputsByNode: {},
      segments: [],
      warnings: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
};
