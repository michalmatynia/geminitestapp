import {
  type AiNode,
  type Edge,
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type CaseResolverEdgeMeta,
  type CaseResolverGraph,
  type CaseResolverJoinMode,
  type CaseResolverNodeMeta,
} from './types';
import type {
  CaseResolverCompiledSegmentDto,
  CaseResolverCompileResultDto,
} from '@/shared/contracts/case-resolver';

export type CaseResolverCompiledSegment = CaseResolverCompiledSegmentDto;

export type CaseResolverCompileResult = CaseResolverCompileResultDto;

const JOIN_VALUE_MAP: Record<CaseResolverJoinMode, string> = {
  newline: '\n',
  tab: '\t',
  space: ' ',
  none: '',
};

const DOCUMENT_TEXTFIELD_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'textfield';
const DOCUMENT_CONTENT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'content';
const DOCUMENT_PLAIN_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';

const resolveNodeMeta = (
  nodeId: string,
  nodeMeta: Record<string, CaseResolverNodeMeta>
): CaseResolverNodeMeta => {
  return {
    ...DEFAULT_CASE_RESOLVER_NODE_META,
    ...(nodeMeta[nodeId] ?? {}),
  };
};

const resolveEdgeMeta = (
  edgeId: string,
  edgeMeta: Record<string, CaseResolverEdgeMeta>
): CaseResolverEdgeMeta => {
  return edgeMeta[edgeId] ?? DEFAULT_CASE_RESOLVER_EDGE_META;
};

const decodeBasicHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&apos;|&#39;/gi, '\'')
    .replace(/&quot;/gi, '"')
    .replace(/&gt;/gi, '>')
    .replace(/&lt;/gi, '<')
    .replace(/&amp;/gi, '&');

const decodeHtmlEntity = (value: string): string => {
  const basicDecoded = decodeBasicHtmlEntities(value);
  try {
    if (typeof window === 'undefined') return basicDecoded;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = basicDecoded;
    return decodeBasicHtmlEntities(textarea.value);
  } catch {
    return basicDecoded;
  }
};

const stripHtmlTagsPreserveBreaks = (value: string): string =>
  value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '');

const stripHtml = (html: string): string => {
  // Decode first so escaped HTML tags (e.g. &lt;b&gt;) are stripped as markup, not emitted as text.
  const decoded = decodeHtmlEntity(html);
  const stripped = stripHtmlTagsPreserveBreaks(decoded);
  // Decode once more for any remaining entities and strip again to handle double-encoded wrappers.
  const normalized = stripHtmlTagsPreserveBreaks(decodeHtmlEntity(stripped));
  return normalized
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
  const normalizedColor =
    typeof meta.textColor === 'string' &&
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(meta.textColor.trim())
      ? meta.textColor.trim()
      : '';
  const quotedValue =
    meta.quoteMode === 'double' ? `"${value}"` : meta.quoteMode === 'single' ? `'${value}'` : value;
  const wrappedValue = `${meta.surroundPrefix}${quotedValue}${meta.surroundSuffix}${
    meta.appendTrailingNewline ? '\n' : ''
  }`;
  if (!normalizedColor) return wrappedValue;
  return `<span style="color: ${normalizedColor};">${wrappedValue}</span>`;
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
    const leftFrom = left.from ?? left.source;
    const rightFrom = right.from ?? right.source;
    const leftNode = leftFrom ? nodeById.get(leftFrom) : undefined;
    const rightNode = rightFrom ? nodeById.get(rightFrom) : undefined;
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
  fromPort: string | null | undefined,
  fallback: 'textfield' | 'content' | 'plainText'
): string => {
  if (!sourceOutputs) return '';
  if (fromPort === DOCUMENT_TEXTFIELD_PORT) {
    return sourceOutputs.textfield;
  }
  if (fromPort === DOCUMENT_CONTENT_PORT) {
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

const isTextfieldInputPort = (port: string | null | undefined): boolean =>
  port === DOCUMENT_TEXTFIELD_PORT;

const isContentInputPort = (port: string | null | undefined): boolean =>
  port === DOCUMENT_CONTENT_PORT || !port;

const isPlainTextInputPort = (port: string | null | undefined): boolean =>
  port === DOCUMENT_PLAIN_TEXT_PORT;

export const compileCaseResolverPrompt = (
  graph: CaseResolverGraph,
  selectedNodeId: string | null
): CaseResolverCompileResult => {
  try {
    const graphNodes = graph.nodes as unknown as AiNode[];
    const graphEdges = graph.edges as unknown as Edge[];
    const nodeById = new Map<string, AiNode>(
      graphNodes.map((node: AiNode): [string, AiNode] => [node.id, node])
    );
    const outgoingByNode = new Map<string, Edge[]>();
    const incomingByNode = new Map<string, Edge[]>();
    const incomingCount = new Map<string, number>();

    graphNodes.forEach((node: AiNode) => {
      incomingCount.set(node.id, 0);
      outgoingByNode.set(node.id, []);
      incomingByNode.set(node.id, []);
    });

    graphEdges.forEach((edge: Edge) => {
      const from = edge.from ?? edge.source;
      const to = edge.to ?? edge.target;
      if (!from || !to) return;
      if (!nodeById.has(from) || !nodeById.has(to)) return;
      const outgoing = outgoingByNode.get(from) ?? [];
      outgoing.push(edge);
      outgoingByNode.set(from, outgoing);
      const incoming = incomingByNode.get(to) ?? [];
      incoming.push(edge);
      incomingByNode.set(to, incoming);
      incomingCount.set(to, (incomingCount.get(to) ?? 0) + 1);
    });

    const sortedNodeIds = sortNodeIdsByPosition(graphNodes);
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
        const leftTo = left.to ?? left.target;
        const rightTo = right.to ?? right.target;
        const leftNode = leftTo ? nodeById.get(leftTo) : undefined;
        const rightNode = rightTo ? nodeById.get(rightTo) : undefined;
        if (!leftNode || !rightNode) return left.id.localeCompare(right.id);
        if (leftNode.position.y !== rightNode.position.y) {
          return leftNode.position.y - rightNode.position.y;
        }
        if (leftNode.position.x !== rightNode.position.x) {
          return leftNode.position.x - rightNode.position.x;
        }
        return left.id.localeCompare(right.id);
      });

      outgoing.forEach((edge: Edge) => {
        const to = edge.to ?? edge.target;
        if (!to) return;
        visit(to, edge.id);
      });
    };

    startNodeIds.forEach((nodeId: string) => visit(nodeId, null));
    if (!(selectedNodeId && nodeById.has(selectedNodeId))) {
      sortedNodeIds.forEach((nodeId: string) => visit(nodeId, null));
    }

    const segments: CaseResolverCompiledSegment[] = [];
    const outputsByNode: Record<string, { textfield: string; content: string; plainText: string }> = {};
    const visitedNodeIds = new Set<string>(visitOrder.map((entry) => entry.nodeId));

    visitOrder.forEach(({ nodeId }) => {
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
          const edgeFromNodeId = edge.from ?? edge.source;
          if (!edgeFromNodeId) return;
          const sourceOutputs = outputsByNode[edgeFromNodeId];
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
    });

    const flowPrompt = (() => {
      const leafNodeIds = visitOrder
        .map((entry): string => entry.nodeId)
        .filter((nodeId: string): boolean => {
          const outgoing = outgoingByNode.get(nodeId) ?? [];
          return !outgoing.some((edge: Edge): boolean => {
            const edgeToNodeId = edge.to ?? edge.target;
            if (!edgeToNodeId) return false;
            return visitedNodeIds.has(edgeToNodeId);
          });
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
      prompt: flowPrompt,
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
