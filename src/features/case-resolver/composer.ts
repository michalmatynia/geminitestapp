import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';

import {
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type CaseResolverEdgeMeta,
  type CaseResolverGraph,
  type CaseResolverJoinMode,
  type CaseResolverNodeMeta,
} from './types';

export type CaseResolverCompiledSegment = {
  nodeId: string;
  title: string;
  text: string;
  role: CaseResolverNodeMeta['role'];
  includeInOutput: boolean;
};

export type CaseResolverCompileResult = {
  prompt: string;
  segments: CaseResolverCompiledSegment[];
};

const JOIN_VALUE_MAP: Record<CaseResolverJoinMode, string> = {
  newline: '\n',
  tab: '\t',
  space: ' ',
  none: '',
};

const resolveNodeMeta = (
  nodeId: string,
  nodeMeta: Record<string, CaseResolverNodeMeta>
): CaseResolverNodeMeta => {
  return nodeMeta[nodeId] ?? DEFAULT_CASE_RESOLVER_NODE_META;
};

const resolveEdgeMeta = (
  edgeId: string,
  edgeMeta: Record<string, CaseResolverEdgeMeta>
): CaseResolverEdgeMeta => {
  return edgeMeta[edgeId] ?? DEFAULT_CASE_RESOLVER_EDGE_META;
};

const decodeHtmlEntity = (value: string): string => {
  if (typeof window === 'undefined') return value;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
};

const stripHtml = (html: string): string => {
  const normalized = html
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '');
  return decodeHtmlEntity(normalized)
    .split('\n')
    .map((line: string) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

const resolveNodeText = (node: AiNode): string => {
  const promptTemplate = node.config?.prompt?.template;
  if (typeof promptTemplate === 'string' && promptTemplate.trim().length > 0) {
    return stripHtml(promptTemplate);
  }
  const noteText = node.config?.notes?.text;
  if (typeof noteText === 'string' && noteText.trim().length > 0) {
    return stripHtml(noteText);
  }
  return '';
};

const wrapByQuoteMode = (value: string, meta: CaseResolverNodeMeta): string => {
  if (!value) return value;
  const quotedValue =
    meta.quoteMode === 'double' ? `"${value}"` : meta.quoteMode === 'single' ? `'${value}'` : value;
  return `${meta.surroundPrefix}${quotedValue}${meta.surroundSuffix}`;
};

const sortNodeIdsByPosition = (nodes: AiNode[]): string[] =>
  [...nodes]
    .sort((left: AiNode, right: AiNode) => {
      if (left.position.y !== right.position.y) return left.position.y - right.position.y;
      if (left.position.x !== right.position.x) return left.position.x - right.position.x;
      return left.id.localeCompare(right.id);
    })
    .map((node: AiNode) => node.id);

export const compileCaseResolverPrompt = (
  graph: CaseResolverGraph,
  selectedNodeId: string | null
): CaseResolverCompileResult => {
  const nodeById = new Map<string, AiNode>(
    graph.nodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );
  const outgoingByNode = new Map<string, Edge[]>();
  const incomingCount = new Map<string, number>();

  graph.nodes.forEach((node: AiNode) => {
    incomingCount.set(node.id, 0);
    outgoingByNode.set(node.id, []);
  });

  graph.edges.forEach((edge: Edge) => {
    if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) return;
    const outgoing = outgoingByNode.get(edge.from) ?? [];
    outgoing.push(edge);
    outgoingByNode.set(edge.from, outgoing);
    incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
  });

  const sortedNodeIds = sortNodeIdsByPosition(graph.nodes);
  const rootNodeIds = sortedNodeIds.filter((nodeId: string) => (incomingCount.get(nodeId) ?? 0) === 0);

  const startNodeIds =
    selectedNodeId && nodeById.has(selectedNodeId)
      ? [selectedNodeId]
      : rootNodeIds.length > 0
        ? rootNodeIds
        : sortedNodeIds;

  const visitOrder: Array<{ nodeId: string; incomingEdgeId: string | null }> = [];
  const visited = new Set<string>();

  const visit = (nodeId: string, incomingEdgeId: string | null): void => {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    visitOrder.push({ nodeId, incomingEdgeId });

    const outgoing = [...(outgoingByNode.get(nodeId) ?? [])].sort((left: Edge, right: Edge) => {
      const leftNode = nodeById.get(left.to);
      const rightNode = nodeById.get(right.to);
      if (!leftNode || !rightNode) return left.id.localeCompare(right.id);
      if (leftNode.position.y !== rightNode.position.y) {
        return leftNode.position.y - rightNode.position.y;
      }
      if (leftNode.position.x !== rightNode.position.x) {
        return leftNode.position.x - rightNode.position.x;
      }
      return left.id.localeCompare(right.id);
    });

    outgoing.forEach((edge: Edge) => visit(edge.to, edge.id));
  };

  startNodeIds.forEach((nodeId: string) => visit(nodeId, null));
  if (!(selectedNodeId && nodeById.has(selectedNodeId))) {
    sortedNodeIds.forEach((nodeId: string) => visit(nodeId, null));
  }

  const segments: CaseResolverCompiledSegment[] = [];
  const outputParts: string[] = [];

  visitOrder.forEach(({ nodeId, incomingEdgeId }) => {
    const node = nodeById.get(nodeId);
    if (!node) return;
    const meta = resolveNodeMeta(node.id, graph.nodeMeta);
    const resolvedText = wrapByQuoteMode(resolveNodeText(node), meta);

    segments.push({
      nodeId: node.id,
      title: node.title,
      text: resolvedText,
      role: meta.role,
      includeInOutput: meta.includeInOutput,
    });

    if (!meta.includeInOutput || resolvedText.trim().length === 0) return;

    if (outputParts.length === 0) {
      outputParts.push(resolvedText);
      return;
    }

    const joinMode = incomingEdgeId
      ? resolveEdgeMeta(incomingEdgeId, graph.edgeMeta).joinMode
      : DEFAULT_CASE_RESOLVER_EDGE_META.joinMode;
    outputParts.push(`${JOIN_VALUE_MAP[joinMode]}${resolvedText}`);
  });

  return {
    prompt: outputParts.join('').trim(),
    segments,
  };
};
