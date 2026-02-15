import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';

import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
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
  outputsByNode: Record<string, { textfield: string; content: string; plainText: string }>;
};

const JOIN_VALUE_MAP: Record<CaseResolverJoinMode, string> = {
  newline: '\n',
  tab: '\t',
  space: ' ',
  none: '',
};

const DOCUMENT_TEXTFIELD_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'textfield';
const DOCUMENT_CONTENT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'content';
const DOCUMENT_PLAIN_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';
const LEGACY_PROMPT_PORT = 'prompt';
const LEGACY_RESULT_PORT = 'result';

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
  try {
    if (typeof window === 'undefined') return value;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  } catch (error) {
    console.error('Failed to decode HTML entity:', error);
    return value;
  }
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

const appendWithJoin = (
  current: string,
  value: string,
  joinMode: CaseResolverJoinMode
): string => {
  if (!value) return current;
  if (!current) return value;
  return `${current}${JOIN_VALUE_MAP[joinMode]}${value}`;
};

const sortEdgesBySourcePosition = (
  edges: Edge[],
  nodeById: Map<string, AiNode>
): Edge[] => {
  return [...edges].sort((left: Edge, right: Edge) => {
    const leftNode = nodeById.get(left.from);
    const rightNode = nodeById.get(right.from);
    if (leftNode && rightNode) {
      if (leftNode.position.y !== rightNode.position.y) {
        return leftNode.position.y - rightNode.position.y;
      }
      if (leftNode.position.x !== rightNode.position.x) {
        return leftNode.position.x - rightNode.position.x;
      }
      if (leftNode.id !== rightNode.id) {
        return leftNode.id.localeCompare(rightNode.id);
      }
    } else if (leftNode || rightNode) {
      return leftNode ? -1 : 1;
    }
    return left.id.localeCompare(right.id);
  });
};

const resolveSourceOutputValue = (
  sourceOutputs: { textfield: string; content: string; plainText: string } | null | undefined,
  fromPort: string | undefined,
  fallback: 'textfield' | 'content' | 'plainText'
): string => {
  if (!sourceOutputs) return '';
  if (fromPort === DOCUMENT_TEXTFIELD_PORT || fromPort === LEGACY_PROMPT_PORT) {
    return sourceOutputs.textfield;
  }
  if (fromPort === DOCUMENT_CONTENT_PORT || fromPort === LEGACY_RESULT_PORT) {
    return sourceOutputs.content;
  }
  if (fromPort === DOCUMENT_PLAIN_TEXT_PORT) {
    return sourceOutputs.plainText;
  }
  if (fallback === 'plainText') {
    return sourceOutputs.plainText;
  }
  return fallback === 'textfield' ? sourceOutputs.textfield : sourceOutputs.content;
};

const isTextfieldInputPort = (port: string | undefined): boolean =>
  port === DOCUMENT_TEXTFIELD_PORT;

const isContentInputPort = (port: string | undefined): boolean =>
  port === DOCUMENT_CONTENT_PORT || port === LEGACY_RESULT_PORT || !port;

const isPlainTextInputPort = (port: string | undefined): boolean =>
  port === DOCUMENT_PLAIN_TEXT_PORT;

const hasDocumentPortFlow = (edges: Edge[]): boolean =>
  edges.some((edge: Edge): boolean =>
    edge.fromPort === DOCUMENT_TEXTFIELD_PORT ||
    edge.fromPort === DOCUMENT_CONTENT_PORT ||
    edge.fromPort === DOCUMENT_PLAIN_TEXT_PORT ||
    edge.toPort === DOCUMENT_TEXTFIELD_PORT ||
    edge.toPort === DOCUMENT_CONTENT_PORT ||
    edge.toPort === DOCUMENT_PLAIN_TEXT_PORT
  );

export const compileCaseResolverPrompt = (
  graph: CaseResolverGraph,
  selectedNodeId: string | null
): CaseResolverCompileResult => {
  try {
    const nodeById = new Map<string, AiNode>(
      graph.nodes.map((node: AiNode): [string, AiNode] => [node.id, node])
    );
    const outgoingByNode = new Map<string, Edge[]>();
    const incomingByNode = new Map<string, Edge[]>();
    const incomingCount = new Map<string, number>();

    graph.nodes.forEach((node: AiNode) => {
      incomingCount.set(node.id, 0);
      outgoingByNode.set(node.id, []);
      incomingByNode.set(node.id, []);
    });

    graph.edges.forEach((edge: Edge) => {
      if (!nodeById.has(edge.from) || !nodeById.has(edge.to)) return;
      const outgoing = outgoingByNode.get(edge.from) ?? [];
      outgoing.push(edge);
      outgoingByNode.set(edge.from, outgoing);
      const incoming = incomingByNode.get(edge.to) ?? [];
      incoming.push(edge);
      incomingByNode.set(edge.to, incoming);
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
    const outputsByNode: Record<string, { textfield: string; content: string; plainText: string }> = {};
    const outputParts: string[] = [];
    const usesDocumentPortFlow = hasDocumentPortFlow(graph.edges);
    const visitedNodeIds = new Set<string>(visitOrder.map((entry) => entry.nodeId));

    visitOrder.forEach(({ nodeId, incomingEdgeId }) => {
      const node = nodeById.get(nodeId);
      if (!node) return;
      const meta = resolveNodeMeta(node.id, graph.nodeMeta);
      const nodeText = resolveNodeText(node);
      const incomingEdges = sortEdgesBySourcePosition(
        incomingByNode.get(node.id) ?? [],
        nodeById
      );

      const collectIncoming = (
        type: 'textfield' | 'content' | 'plainText'
      ): { value: string; firstJoinMode: CaseResolverJoinMode | null } => {
        let value = '';
        let firstJoinMode: CaseResolverJoinMode | null = null;

        incomingEdges.forEach((edge: Edge): void => {
          const acceptsEdge =
            type === 'textfield'
              ? isTextfieldInputPort(edge.toPort)
              : type === 'content'
                ? isContentInputPort(edge.toPort)
                : isPlainTextInputPort(edge.toPort);
          if (!acceptsEdge) return;
          const sourceOutputs = outputsByNode[edge.from];
          const rawSourceValue = resolveSourceOutputValue(sourceOutputs, edge.fromPort, type);
          const sourceValue =
            type === 'plainText' ? stripHtml(rawSourceValue) : rawSourceValue;
          if (!sourceValue) return;
          const edgeJoinMode = resolveEdgeMeta(edge.id, graph.edgeMeta).joinMode;
          if (!firstJoinMode) firstJoinMode = edgeJoinMode;
          value = appendWithJoin(value, sourceValue, edgeJoinMode);
        });

        return { value, firstJoinMode };
      };

      const incomingTextfield = collectIncoming('textfield');
      const incomingContent = collectIncoming('content');
      const incomingPlainText = collectIncoming('plainText');
      const resolvedTextfield =
        incomingTextfield.value.trim().length > 0
          ? incomingTextfield.value
          : incomingPlainText.value.trim().length > 0
            ? incomingPlainText.value
            : nodeText;
      const plainTextOutput = stripHtml(resolvedTextfield);
      const wrappedText = wrapByQuoteMode(resolvedTextfield, meta);
      let contentOutput = incomingContent.value;
      if (meta.includeInOutput && wrappedText.trim().length > 0) {
        const joinMode = incomingContent.firstJoinMode ?? DEFAULT_CASE_RESOLVER_EDGE_META.joinMode;
        contentOutput = appendWithJoin(contentOutput, wrappedText, joinMode);
      }

      outputsByNode[node.id] = {
        textfield: resolvedTextfield,
        content: contentOutput,
        plainText: plainTextOutput,
      };

      segments.push({
        nodeId: node.id,
        title: node.title,
        text: wrappedText,
        role: meta.role,
        includeInOutput: meta.includeInOutput,
      });

      if (!meta.includeInOutput || wrappedText.trim().length === 0) return;

      if (outputParts.length === 0) {
        outputParts.push(wrappedText);
        return;
      }

      const joinMode = incomingEdgeId
        ? resolveEdgeMeta(incomingEdgeId, graph.edgeMeta).joinMode
        : DEFAULT_CASE_RESOLVER_EDGE_META.joinMode;
      outputParts.push(`${JOIN_VALUE_MAP[joinMode]}${wrappedText}`);
    });

    const legacyPrompt = outputParts.join('').trim();
    const flowPrompt = (() => {
      if (!usesDocumentPortFlow) return '';
      const leafNodeIds = visitOrder
        .map((entry): string => entry.nodeId)
        .filter((nodeId: string): boolean => {
          const outgoing = outgoingByNode.get(nodeId) ?? [];
          return !outgoing.some((edge: Edge): boolean => visitedNodeIds.has(edge.to));
        });
      const dedupedLeafOutputs: string[] = [];
      const seenLeafOutputs = new Set<string>();
      leafNodeIds.forEach((nodeId: string): void => {
        const output = outputsByNode[nodeId]?.content?.trim();
        if (!output || seenLeafOutputs.has(output)) return;
        seenLeafOutputs.add(output);
        dedupedLeafOutputs.push(output);
      });
      return dedupedLeafOutputs.join('\n\n').trim();
    })();

    return {
      prompt: flowPrompt || legacyPrompt,
      segments,
      outputsByNode,
    };
  } catch (error) {
    console.error('Failed to compile Case Resolver prompt:', error);
    return {
      prompt: '',
      segments: [],
      outputsByNode: {},
    };
  }
};
