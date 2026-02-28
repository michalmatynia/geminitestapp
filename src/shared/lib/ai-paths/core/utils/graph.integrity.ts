import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import type { GraphIntegrityReport, GraphIntegrityIssue } from './graph.types';

const PROCESSING_NODE_TYPES = new Set<string>([
  'fetcher',
  'parser',
  'regex',
  'iterator',
  'mapper',
  'mutator',
  'string_mutator',
  'validator',
  'validation_pattern',
  'constant',
  'math',
  'template',
  'bundle',
  'gate',
  'compare',
  'router',
  'delay',
  'poll',
  'http',
  'api_advanced',
  'playwright',
  'prompt',
  'model',
  'agent',
  'learner_agent',
  'database',
  'db_schema',
]);

export const inspectGraphIntegrity = (nodes: AiNode[], edges: Edge[]): GraphIntegrityReport => {
  const issues: GraphIntegrityIssue[] = [];
  const invalidEdgeCount = edges.filter(
    (edge: Edge): boolean =>
      !nodes.some((node: AiNode) => node.id === edge.from) ||
      !nodes.some((node: AiNode) => node.id === edge.to)
  ).length;
  if (invalidEdgeCount > 0) {
    issues.push({ kind: 'invalid_edge', count: invalidEdgeCount });
  }

  const disconnectedProcessingNodes = nodes
    .filter((node: AiNode) => PROCESSING_NODE_TYPES.has(node.type))
    .filter(
      (node: AiNode) => !edges.some((edge: Edge) => edge.from === node.id || edge.to === node.id)
    )
    .map((node: AiNode) => ({
      nodeId: node.id,
      nodeType: node.type,
      nodeTitle: node.title || node.id,
    }));

  disconnectedProcessingNodes.forEach((node) => {
    issues.push({ kind: 'disconnected_processing_node', ...node });
  });

  return {
    issues,
    invalidEdgeCount,
    disconnectedProcessingNodes,
  };
};
