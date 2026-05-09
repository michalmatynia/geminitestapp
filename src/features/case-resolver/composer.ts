/**
 * composer.ts
 *
 * Compiles a CaseResolver node graph into a flat prompt string and a set of
 * per-node output segments. The compilation walks the graph in topological
 * order (roots first, then depth-first by canvas position) and propagates
 * text through edges, merging incoming values at each node according to the
 * node's join mode, quote mode, and role.
 *
 * Node roles:
 *  - 'text_note'   – plain content node; its text is the primary output.
 *  - 'explanatory' – appends its own text to incoming text and also
 *                    contributes to the wysiwygContent output channel.
 *  - 'ai_prompt'   – treated like text_note for compilation purposes.
 *
 * Output channels per node:
 *  - wysiwygText        – rich HTML text (used in the editor preview).
 *  - plaintextContent   – stripped plain text for the final prompt.
 *  - plainText          – alias used by explanatory nodes.
 *  - wysiwygContent     – explanatory-only rich content channel.
 *
 * The final `prompt` / `combinedContent` is assembled from the leaf nodes'
 * `plaintextContent` outputs, joined with double newlines.
 */
import type { CaseResolverCompiledSegment, CaseResolverCompileResult } from '@/shared/contracts/case-resolver/capture';
import { CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS, CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT, DEFAULT_CASE_RESOLVER_EDGE_META, DEFAULT_CASE_RESOLVER_NODE_META } from '@/shared/contracts/case-resolver/constants';
import { type AiNode, type CaseResolverEdge, type CaseResolverEdgeMeta, type CaseResolverGraph, type CaseResolverJoinMode, type CaseResolverNodeMeta } from '@/shared/contracts/case-resolver';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { stripHtml } from './utils/text-sanitization';


export type CaseResolverPlainTextTransformInput = {
  nodeId: string;
  nodeMeta: CaseResolverNodeMeta;
  output: 'plainText' | 'plaintextContent';
  value: string;
};

export type CaseResolverCompileOptions = {
  transformPlainTextOutput?: (input: CaseResolverPlainTextTransformInput) => string;
};

// Maps a CaseResolverJoinMode to the literal string inserted between values.
const JOIN_VALUE_MAP: Record<CaseResolverJoinMode, string> = {
  newline: '\n',
  tab: '\t',
  space: ' ',
  none: '',
};

// Named port constants derived from the shared contract so port comparisons
// are centralised and survive contract renames.
const DOCUMENT_WYSIWYG_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'wysiwygText';
const DOCUMENT_PLAINTEXT_CONTENT_PORT =
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'plaintextContent';
const DOCUMENT_PLAIN_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';
const DOCUMENT_WYSIWYG_CONTENT_PORT = CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT;

// Merges DEFAULT_CASE_RESOLVER_NODE_META with any stored overrides for the
// given node, so callers always receive a fully-populated meta object.
const resolveNodeMeta = (
  nodeId: string,
  nodeMeta: Record<string, CaseResolverNodeMeta>
): CaseResolverNodeMeta => ({
  ...DEFAULT_CASE_RESOLVER_NODE_META,
  ...(nodeMeta[nodeId] ?? {}),
});

// Returns the stored edge meta or the default if none exists.
const resolveEdgeMeta = (
  edgeId: string,
  edgeMeta: Record<string, CaseResolverEdgeMeta>
): CaseResolverEdgeMeta => edgeMeta[edgeId] ?? DEFAULT_CASE_RESOLVER_EDGE_META;


// Extracts the plain-text content from a node's config. Prefers the prompt
// template; falls back to the notes text. Returns '' when neither is set.
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

// Same as resolveNodeText but preserves HTML markup (used for wysiwygText).
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

// Applies quote mode, surround prefix/suffix, trailing newline, AND an
// optional HTML color wrapper (skipped for explanatory nodes).
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

// Same as wrapByQuoteMode but without the color <span> wrapper — used when
// producing plain-text output that must not contain HTML.
const wrapByQuoteModeWithoutColor = (value: string, meta: CaseResolverNodeMeta): string => {
  if (!value) return value;
  const quotedValue =
    meta.quoteMode === 'double' ? `"${value}"` : meta.quoteMode === 'single' ? `'${value}'` : value;
  return `${meta.surroundPrefix}${quotedValue}${meta.surroundSuffix}${
    meta.appendTrailingNewline ? '\n' : ''
  }`;
};

// Sorts node IDs top-to-bottom, left-to-right by canvas position so the
// compilation visit order is deterministic and visually intuitive.
const sortNodeIdsByPosition = (nodes: AiNode[]): string[] =>
  [...nodes]
    .sort((left: AiNode, right: AiNode) => {
      if (left.position.y !== right.position.y) return left.position.y - right.position.y;
      if (left.position.x !== right.position.x) return left.position.x - right.position.x;
      return left.id.localeCompare(right.id);
    })
    .map((node: AiNode) => node.id);

// Concatenates `value` onto `current` using the separator for `joinMode`.
// Returns the non-empty side unchanged when the other side is empty.
const appendWithJoin = (current: string, value: string, joinMode: CaseResolverJoinMode): string => {
  if (!value) return current;
  if (!current) return value;
  return `${current}${JOIN_VALUE_MAP[joinMode]}${value}`;
};

// Sorts edges by the canvas position of their source node so that when
// multiple edges arrive at the same target the merge order is predictable.
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

// Picks the correct output string from a source node's compiled outputs based
// on which named port the edge is connected to. Falls back to `fallback` when
// the port name is unrecognised.
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

/**
 * Compiles the CaseResolver node graph into a prompt string.
 *
 * @param graph          - The full graph (nodes, edges, nodeMeta, edgeMeta).
 * @param selectedNodeId - When set, compilation starts from this node instead
 *                         of all root nodes (used for single-node preview).
 * @param options        - Optional `transformPlainTextOutput` hook that lets
 *                         callers post-process plain-text values (e.g. to
 *                         apply validation highlighting).
 *
 * Returns a `CaseResolverCompileResult` with:
 *  - `prompt` / `combinedContent` – the final assembled plain-text prompt.
 *  - `outputsByNode`              – per-node output channels for the editor.
 *  - `segments`                   – ordered list of compiled node segments.
 *  - `warnings`                   – non-fatal issues encountered during compile.
 *
 * On unexpected errors the function returns an empty result with the error
 * message in `warnings` rather than throwing.
 */
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

      const collectIncoming = (
        type: 'wysiwygText' | 'plaintextContent' | 'plainText' | 'wysiwygContent'
      ): { value: string; firstJoinMode: CaseResolverJoinMode | null } => {
        let value = '';
        let firstJoinMode: CaseResolverJoinMode | null = null;

        incomingEdges.forEach((edge: CaseResolverEdge): void => {
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
