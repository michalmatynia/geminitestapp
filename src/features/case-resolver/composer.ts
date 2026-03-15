import type {
  CaseResolverCompiledSegment,
  CaseResolverCompileResult,
} from '@/shared/contracts/case-resolver';
import {
  type AiNode,
  type Edge,
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type CaseResolverEdgeMeta,
  type CaseResolverGraph,
  type CaseResolverJoinMode,
  type CaseResolverNodeMeta,
} from '@/shared/contracts/case-resolver';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type CaseResolverPlainTextTransformInput = {
  nodeId: string;
  nodeMeta: CaseResolverNodeMeta;
  output: 'plainText' | 'plaintextContent';
  value: string;
};

export type CaseResolverCompileOptions = {
  transformPlainTextOutput?: (input: CaseResolverPlainTextTransformInput) => string;
};

const JOIN_VALUE_MAP: Record<CaseResolverJoinMode, string> = {
  newline: '\n',
  tab: '\t',
  space: ' ',
  none: '',
};

const DOCUMENT_WYSIWYG_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'wysiwygText';
const DOCUMENT_PLAINTEXT_CONTENT_PORT =
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'plaintextContent';
const DOCUMENT_PLAIN_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';
const DOCUMENT_WYSIWYG_CONTENT_PORT = CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT;

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
  } catch (error) {
    logClientError(error);
    return basicDecoded;
  }
};

const stripHtmlTagsPreserveBreaks = (value: string): string =>
  value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/?[a-z][^>]*>/gi, '');

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

const resolveNodeWysiwygText = (node: AiNode): string => {
  const promptTemplate = node.config?.prompt?.template;
  if (typeof promptTemplate === 'string' && promptTemplate.trim().length > 0) {
    return promptTemplate;
  }
  const noteText = node.config?.notes?.text;
  if (typeof noteText === 'string' && noteText.trim().length > 0) {
    return noteText;
  }
  return '';
};

const wrapByQuoteMode = (value: string, meta: CaseResolverNodeMeta): string => {
  const wrappedValue = wrapByQuoteModeWithoutColor(value, meta);
  if (!wrappedValue) return wrappedValue;
  const canApplyHtmlColorWrapper = meta.role !== 'explanatory';
  const normalizedColor =
    canApplyHtmlColorWrapper &&
    typeof meta.textColor === 'string' &&
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(meta.textColor.trim())
      ? meta.textColor.trim()
      : '';
  if (!normalizedColor) return wrappedValue;
  return `<span style="color: ${normalizedColor};">${wrappedValue}</span>`;
};

const wrapByQuoteModeWithoutColor = (value: string, meta: CaseResolverNodeMeta): string => {
  if (!value) return value;
  const quotedValue =
    meta.quoteMode === 'double' ? `"${value}"` : meta.quoteMode === 'single' ? `'${value}'` : value;
  return `${meta.surroundPrefix}${quotedValue}${meta.surroundSuffix}${
    meta.appendTrailingNewline ? '\n' : ''
  }`;
};

const sortNodeIdsByPosition = (nodes: AiNode[]): string[] =>
  [...nodes]
    .sort((left: AiNode, right: AiNode) => {
      if (left.position.y !== right.position.y) return left.position.y - right.position.y;
      if (left.position.x !== right.position.x) return left.position.x - right.position.x;
      return left.id.localeCompare(right.id);
    })
    .map((node: AiNode) => node.id);

const appendWithJoin = (current: string, value: string, joinMode: CaseResolverJoinMode): string => {
  if (!value) return current;
  if (!current) return value;
  return `${current}${JOIN_VALUE_MAP[joinMode]}${value}`;
};

const sortEdgesBySourcePosition = (edges: Edge[], nodeById: Map<string, AiNode>): Edge[] => {
  return [...edges].sort((left: Edge, right: Edge) => {
    const leftNode = left.source ? nodeById.get(left.source) : undefined;
    const rightNode = right.source ? nodeById.get(right.source) : undefined;
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
  sourceOutputs:
    | {
        wysiwygText: string;
        plaintextContent: string;
        plainText: string;
        wysiwygContent: string;
      }
    | null
    | undefined,
  fromPort: string | null | undefined,
  fallback: 'wysiwygText' | 'plaintextContent' | 'plainText' | 'wysiwygContent'
): string => {
  if (!sourceOutputs) return '';
  if (fromPort === DOCUMENT_WYSIWYG_TEXT_PORT) {
    return sourceOutputs.wysiwygText;
  }
  if (fromPort === DOCUMENT_PLAINTEXT_CONTENT_PORT) {
    return sourceOutputs.plaintextContent;
  }
  if (fromPort === DOCUMENT_PLAIN_TEXT_PORT) {
    return sourceOutputs.plainText;
  }
  if (fromPort === DOCUMENT_WYSIWYG_CONTENT_PORT) {
    return sourceOutputs.wysiwygContent;
  }
  if (fallback === 'plainText') {
    return sourceOutputs.plainText;
  }
  if (fallback === 'wysiwygContent') {
    return sourceOutputs.wysiwygContent;
  }
  return fallback === 'wysiwygText' ? sourceOutputs.wysiwygText : sourceOutputs.plaintextContent;
};

const isWysiwygTextInputPort = (port: string | null | undefined): boolean =>
  port === DOCUMENT_WYSIWYG_TEXT_PORT;

const isPlaintextContentInputPort = (port: string | null | undefined): boolean =>
  port === DOCUMENT_PLAINTEXT_CONTENT_PORT;

const isPlainTextInputPort = (port: string | null | undefined): boolean =>
  port === DOCUMENT_PLAIN_TEXT_PORT;

const isWysiwygContentInputPort = (port: string | null | undefined): boolean =>
  port === DOCUMENT_WYSIWYG_CONTENT_PORT;

export const compileCaseResolverPrompt = (
  graph: CaseResolverGraph,
  selectedNodeId: string | null,
  options: CaseResolverCompileOptions = {}
): CaseResolverCompileResult => {
  try {
    const graphNodes = graph.nodes;
    const graphEdges = graph.edges;
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
      if (!edge.source || !edge.target) return;
      if (!nodeById.has(edge.source) || !nodeById.has(edge.target)) return;
      const outgoing = outgoingByNode.get(edge.source) ?? [];
      outgoing.push(edge);
      outgoingByNode.set(edge.source, outgoing);
      const incoming = incomingByNode.get(edge.target) ?? [];
      incoming.push(edge);
      incomingByNode.set(edge.target, incoming);
      incomingCount.set(edge.target, (incomingCount.get(edge.target) ?? 0) + 1);
    });

    const sortedNodeIds = sortNodeIdsByPosition(graphNodes);
    const rootNodeIds = sortedNodeIds.filter(
      (nodeId: string) => (incomingCount.get(nodeId) ?? 0) === 0
    );

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
        const leftNode = left.target ? nodeById.get(left.target) : undefined;
        const rightNode = right.target ? nodeById.get(right.target) : undefined;
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
        if (!edge.target) return;
        visit(edge.target, edge.id);
      });
    };

    startNodeIds.forEach((nodeId: string) => visit(nodeId, null));
    if (!(selectedNodeId && nodeById.has(selectedNodeId))) {
      sortedNodeIds.forEach((nodeId: string) => visit(nodeId, null));
    }

    const segments: CaseResolverCompiledSegment[] = [];
    const outputsByNode: Record<
      string,
      {
        wysiwygText: string;
        plaintextContent: string;
        plainText: string;
        wysiwygContent: string;
      }
    > = {};
    const visitedNodeIds = new Set<string>(visitOrder.map((entry) => entry.nodeId));

    visitOrder.forEach(({ nodeId }) => {
      const node = nodeById.get(nodeId);
      if (!node) return;
      const meta = resolveNodeMeta(node.id, graph.nodeMeta || {});
      const nodeText = resolveNodeText(node);
      const nodeWysiwygText = resolveNodeWysiwygText(node);
      const incomingEdges = sortEdgesBySourcePosition(incomingByNode.get(node.id) ?? [], nodeById);

      const collectIncoming = (
        type: 'wysiwygText' | 'plaintextContent' | 'plainText' | 'wysiwygContent'
      ): { value: string; firstJoinMode: CaseResolverJoinMode | null } => {
        let value = '';
        let firstJoinMode: CaseResolverJoinMode | null = null;

        incomingEdges.forEach((edge: Edge): void => {
          const acceptsEdge =
            type === 'wysiwygText'
              ? isWysiwygTextInputPort(edge.targetHandle)
              : type === 'plaintextContent'
                ? isPlaintextContentInputPort(edge.targetHandle)
                : type === 'plainText'
                  ? isPlainTextInputPort(edge.targetHandle)
                  : isWysiwygContentInputPort(edge.targetHandle);
          if (!acceptsEdge) return;
          if (!edge.source) return;
          const sourceOutputs = outputsByNode[edge.source];
          const rawSourceValue = resolveSourceOutputValue(sourceOutputs, edge.sourceHandle, type);
          const sourceValue = type === 'plainText' ? stripHtml(rawSourceValue) : rawSourceValue;
          if (!sourceValue) return;
          const edgeJoinMode = resolveEdgeMeta(edge.id, graph.edgeMeta || {}).joinMode ?? 'newline';
          if (!firstJoinMode) firstJoinMode = edgeJoinMode;
          value = appendWithJoin(value, sourceValue, edgeJoinMode);
        });

        return { value, firstJoinMode };
      };

      const incomingWysiwygText = collectIncoming('wysiwygText');
      const incomingPlaintextContent = collectIncoming('plaintextContent');
      const incomingPlainText = collectIncoming('plainText');
      const incomingWysiwygContent = collectIncoming('wysiwygContent');
      const hasIncomingWysiwygText = incomingWysiwygText.value.trim().length > 0;
      const hasIncomingPlaintextContent = incomingPlaintextContent.value.trim().length > 0;
      const hasIncomingPlainText = incomingPlainText.value.trim().length > 0;
      const hasIncomingWysiwygContent = incomingWysiwygContent.value.trim().length > 0;
      const isExplanatoryPlainTextInputFlow = meta.role === 'explanatory' && hasIncomingPlainText;
      const incomingText = hasIncomingWysiwygText
        ? incomingWysiwygText.value
        : hasIncomingPlainText
          ? incomingPlainText.value
          : meta.role === 'explanatory' && hasIncomingPlaintextContent
            ? incomingPlaintextContent.value
            : '';
      const incomingTextJoinMode =
        (hasIncomingWysiwygText
          ? incomingWysiwygText.firstJoinMode
          : hasIncomingPlainText
            ? incomingPlainText.firstJoinMode
            : meta.role === 'explanatory' && hasIncomingPlaintextContent
              ? incomingPlaintextContent.firstJoinMode
              : null) ?? DEFAULT_CASE_RESOLVER_EDGE_META.joinMode;
      const resolvedWysiwygText =
        meta.role === 'explanatory' && incomingText.trim().length > 0 && nodeText.trim().length > 0
          ? appendWithJoin(incomingText, nodeText, incomingTextJoinMode as CaseResolverJoinMode)
          : incomingText.trim().length > 0
            ? incomingText
            : nodeText;
      const hasWysiwygTextOnlyIncoming =
        hasIncomingWysiwygText &&
        !hasIncomingPlaintextContent &&
        !hasIncomingPlainText &&
        !hasIncomingWysiwygContent;
      const secondaryOutputSeed = isExplanatoryPlainTextInputFlow
        ? nodeText
        : hasWysiwygTextOnlyIncoming
          ? nodeText
          : resolvedWysiwygText;
      const wrappedWysiwygTextOutput = wrapByQuoteModeWithoutColor(resolvedWysiwygText, meta);
      const wrappedSecondaryPlainTextSeed = wrapByQuoteModeWithoutColor(secondaryOutputSeed, meta);
      let plainTextOutput = options.transformPlainTextOutput
        ? wrappedSecondaryPlainTextSeed
        : stripHtml(wrappedSecondaryPlainTextSeed);
      const wrappedText = wrapByQuoteMode(resolvedWysiwygText, meta);
      const wrappedSecondaryText = wrapByQuoteMode(secondaryOutputSeed, meta);
      let plaintextContentOutput = isExplanatoryPlainTextInputFlow
        ? incomingPlainText.value
        : incomingPlaintextContent.value;
      if (meta.includeInOutput && wrappedSecondaryText.trim().length > 0) {
        const joinMode: CaseResolverJoinMode =
          (isExplanatoryPlainTextInputFlow
            ? incomingPlainText.firstJoinMode
            : incomingPlaintextContent.firstJoinMode) ||
          (DEFAULT_CASE_RESOLVER_EDGE_META.joinMode ?? 'newline');
        plaintextContentOutput = appendWithJoin(
          plaintextContentOutput,
          wrappedSecondaryText,
          joinMode
        );
      }
      if (meta.role === 'explanatory' && !options.transformPlainTextOutput) {
        plaintextContentOutput = stripHtml(plaintextContentOutput);
      }
      if (options.transformPlainTextOutput) {
        plainTextOutput = options.transformPlainTextOutput({
          nodeId: node.id,
          nodeMeta: meta,
          output: 'plainText',
          value: plainTextOutput,
        });
        if (meta.role === 'explanatory') {
          plaintextContentOutput = options.transformPlainTextOutput({
            nodeId: node.id,
            nodeMeta: meta,
            output: 'plaintextContent',
            value: plaintextContentOutput,
          });
        }
      }
      let wysiwygContentOutput = meta.role === 'explanatory' ? incomingWysiwygContent.value : '';
      if (
        meta.role === 'explanatory' &&
        meta.includeInOutput &&
        nodeWysiwygText.trim().length > 0
      ) {
        const joinMode: CaseResolverJoinMode =
          incomingWysiwygContent.firstJoinMode ||
          DEFAULT_CASE_RESOLVER_EDGE_META.joinMode ||
          'newline';
        wysiwygContentOutput = appendWithJoin(wysiwygContentOutput, nodeWysiwygText, joinMode);
      }

      outputsByNode[node.id] = {
        wysiwygText: wrappedWysiwygTextOutput,
        plaintextContent: plaintextContentOutput,
        plainText: plainTextOutput,
        wysiwygContent: wysiwygContentOutput,
      };

      segments.push({
        id: `seg-${node.id}`,
        nodeId: node.id || null,
        role: meta.role || '',
        content: wrappedText || '',
        title: node.title || '',
        text: wrappedText || '',
        includeInOutput: meta.includeInOutput || false,
        metadata: {
          title: node.title,
          includeInOutput: meta.includeInOutput,
        },
      });
    });

    const flowPrompt = (() => {
      const leafNodeIds = visitOrder
        .map((entry): string => entry.nodeId)
        .filter((nodeId: string): boolean => {
          const outgoing = outgoingByNode.get(nodeId) ?? [];
          return !outgoing.some((edge: Edge): boolean => {
            const targetNodeId = edge.target;
            return typeof targetNodeId === 'string' && visitedNodeIds.has(targetNodeId);
          });
        });
      const dedupedLeafOutputs: string[] = [];
      const seenLeafOutputs = new Set<string>();
      leafNodeIds.forEach((nodeId: string): void => {
        const output = outputsByNode[nodeId]?.plaintextContent?.trim();
        if (!output || seenLeafOutputs.has(output)) return;
        seenLeafOutputs.add(output);
        dedupedLeafOutputs.push(output);
      });
      return dedupedLeafOutputs.join('\n\n').trim();
    })();

    return {
      combinedContent: flowPrompt || '',
      prompt: flowPrompt || '',
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
      warnings: [(error as Error).message || 'Unknown error'],
    };
  }
};
