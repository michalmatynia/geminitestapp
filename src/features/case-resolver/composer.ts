import type { CaseResolverCompiledSegment, CaseResolverCompileResult } from '@/shared/contracts/case-resolver/capture';
import { CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS, CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT, DEFAULT_CASE_RESOLVER_EDGE_META, DEFAULT_CASE_RESOLVER_NODE_META } from '@/shared/contracts/case-resolver/constants';
import { type AiNode, type CaseResolverEdge, type CaseResolverEdgeMeta, type CaseResolverGraph, type CaseResolverJoinMode, type CaseResolverNodeMeta } from '@/shared/contracts/case-resolver';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { stripHtml } from "./utils/text-sanitization";
import type { CompileContext, NodeOutput } from './types/composer';


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

// Refactored helper: resolveNodeMeta
const resolveNodeMeta = (
  nodeId: string,
  nodeMeta: Record<string, CaseResolverNodeMeta>
): CaseResolverNodeMeta => ({
  ...DEFAULT_CASE_RESOLVER_NODE_META,
  ...(nodeMeta[nodeId] ?? {}),
});

const resolveNodeOutput = (ctx: CompileContext): NodeOutput => {
  const { meta, nodeText, nodeWysiwygText, incoming, options } = ctx;
  const isExplanatory = meta.role === 'explanatory';

  // 1. Resolve primary Wysiwyg Text
  const incomingWysiwyg = incoming['wysiwygText'];
  const incomingText = incomingWysiwyg?.value ?? '';
  const resolvedWysiwygText = (isExplanatory && incomingText.trim().length > 0 && nodeText.trim().length > 0)
    ? appendWithJoin(incomingText, nodeText, (incomingWysiwyg?.firstJoinMode ?? 'newline') as CaseResolverJoinMode)
    : incomingText.trim().length > 0
      ? incomingText
      : nodeText;

  // 2. Resolve Secondary Outputs (PlainText / PlainTextContent)
  const wrappedWysiwygText = wrapByQuoteModeWithoutColor(resolvedWysiwygText, meta);
  const plainTextOutput = options.transformPlainTextOutput
    ? wrappedWysiwygText
    : stripHtml(wrappedWysiwygText);

  let plaintextContent = isExplanatory ? incoming.plainText?.value ?? '' : incoming.plaintextContent?.value ?? '';
  
  if (meta.includeInOutput && wrapByQuoteMode(resolvedWysiwygText, meta).trim().length > 0) {
    const joinMode = (isExplanatory ? incoming.plainText?.firstJoinMode : incoming.plaintextContent?.firstJoinMode) || 'newline';
    plaintextContent = appendWithJoin(plaintextContent, wrapByQuoteMode(resolvedWysiwygText, meta), joinMode as CaseResolverJoinMode);
  }

  if (isExplanatory && !options.transformPlainTextOutput) {
    plaintextContent = stripHtml(plaintextContent);
  }

};
const resolveWysiwygText = (ctx: CompileContext): string => {
  const { meta, nodeText, incoming } = ctx;
  const isExplanatory = meta.role === "explanatory";
  const incomingWysiwyg = incoming["wysiwygText"];

  if (!incomingWysiwyg) return nodeText;

  const incomingText = incomingWysiwyg.value;
  
  if (isExplanatory && incomingText.trim().length > 0 && nodeText.trim().length > 0) {
    return appendWithJoin(incomingText, nodeText, (incomingWysiwyg.firstJoinMode ?? "newline") as CaseResolverJoinMode);
  }
  
  return incomingText.trim().length > 0 ? incomingText : nodeText;
};

  ...(nodeMeta[nodeId] ?? {}),
});

// Refactored helper: resolveEdgeMeta
const resolveEdgeMeta = (
  edgeId: string,
  edgeMeta: Record<string, CaseResolverEdgeMeta>
): CaseResolverEdgeMeta => edgeMeta[edgeId] ?? DEFAULT_CASE_RESOLVER_EDGE_META;

// Helper: Node text processing logic
const _getNodeContent = (node: AiNode, output: 'plainText' | 'plaintextContent' | 'wysiwygText'): string => {
  if (output === 'plainText' || output === 'plaintextContent') return resolveNodeText(node);
  return resolveNodeWysiwygText(node);
};

const collectIncoming = ( 
  graph: CaseResolverGraph, 
  edgeMeta: Record<string, CaseResolverEdgeMeta>, 
  outputsByNode: Record<string, CaseResolverCompileResult>, 
  nodeId: string, 
  type: "plainText" | "plaintextContent" | "wysiwygText" | "wysiwygContent" 
) => { /* ... */ };


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

const sortEdgesBySourcePosition = (edges: CaseResolverEdge[], nodeById: Map<string, AiNode>): CaseResolverEdge[] => {
  return [...edges].sort((left: CaseResolverEdge, right: CaseResolverEdge) => {
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
    const outgoingByNode = new Map<string, CaseResolverEdge[]>();
    const incomingByNode = new Map<string, CaseResolverEdge[]>();
    const incomingCount = new Map<string, number>();

    graphNodes.forEach((node: AiNode) => {
      incomingCount.set(node.id, 0);
      outgoingByNode.set(node.id, []);
      incomingByNode.set(node.id, []);
    });

    graphEdges.forEach((edge: CaseResolverEdge) => {
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

      const outgoing = [...(outgoingByNode.get(nodeId) ?? [])].sort((left: CaseResolverEdge, right: CaseResolverEdge) => {
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

      outgoing.forEach((edge: CaseResolverEdge) => {
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

        plainText: collectIncoming("plainText"), 
        wysiwygContent: collectIncoming("wysiwygContent"), 
      }; 
      outputsByNode[node.id] = resolveNodeOutput(meta, nodeText, nodeWysiwygText, incoming, options);
          if (!firstJoinMode) firstJoinMode = edgeJoinMode;
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
          return !outgoing.some((edge: CaseResolverEdge): boolean => {
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
    logSystemEvent({
      level: 'error',
      message: 'Failed to compile Case Resolver prompt',
      source: 'case-resolver-composer',
      context: { error: error instanceof Error ? error.message : String(error) },
    }).catch(() => {});
    return {
      combinedContent: '',
      prompt: '',
      outputsByNode: {},
      segments: [],
      warnings: [(error as Error).message || 'Unknown error'],
    };
  }
};
