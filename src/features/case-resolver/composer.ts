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
import { CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT, CASE_RESOLVER_PLAINTEXT_CONTENT_PORT, DEFAULT_CASE_RESOLVER_EDGE_META } from '@/shared/contracts/case-resolver/constants';
import { type AiNode, type CaseResolverEdge, type CaseResolverGraph, type CaseResolverJoinMode, type CaseResolverNodeMeta } from '@/shared/contracts/case-resolver';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { stripHtml } from './utils/text-sanitization';
import {
  appendWithJoin,
  resolveEdgeMeta,
  resolveNodeMeta,
  resolveNodeText,
  resolveNodeWysiwygText,
  resolveSourceOutputValue,
  sortEdgesBySourcePosition,
  sortNodeIdsByPosition,
  wrapByQuoteMode,
  wrapByQuoteModeWithoutColor,
} from './composer-utils';
import { computeNodeOutput } from './composer-compiler';
import { resolveLeafNodePrompt } from './composer-traversal';


export type CaseResolverPlainTextTransformInput = {
  nodeId: string;
  nodeMeta: CaseResolverNodeMeta;
  output: 'plainText' | 'plaintextContent';
  value: string;
};

export type CaseResolverCompileOptions = {
  transformPlainTextOutput?: (input: CaseResolverPlainTextTransformInput) => string;
};

// JOIN_VALUE_MAP, DOCUMENT_*_PORT, resolveNodeMeta, resolveEdgeMeta, resolveNodeText, resolveNodeWysiwygText, wrapByQuoteMode, wrapByQuoteModeWithoutColor, sortNodeIdsByPosition, appendWithJoin, sortEdgesBySourcePosition, resolveSourceOutputValue are now in composer-utils.ts

const isWysiwygTextInputPort = (port: string | null | undefined): boolean =>
  port === 'wysiwygText';

const isPlaintextContentInputPort = (port: string | null | undefined): boolean =>
  port === CASE_RESOLVER_PLAINTEXT_CONTENT_PORT;

const isPlainTextInputPort = (port: string | null | undefined): boolean =>
  port === 'plainText';

const isWysiwygContentInputPort = (port: string | null | undefined): boolean =>
  port === CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT;

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
      resolveNodeWysiwygText(node);
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
      const nodeOutput = computeNodeOutput(
        node,
        meta,
        {
          plainText: {
            value: incomingPlainText.value,
            firstJoinMode: incomingPlainText.firstJoinMode ?? 'newline',
          },
          plaintextContent: {
            value: incomingPlaintextContent.value,
            firstJoinMode: incomingPlaintextContent.firstJoinMode ?? 'newline',
          },
          wysiwygContent: {
            value: incomingWysiwygContent.value,
            firstJoinMode: incomingWysiwygContent.firstJoinMode ?? 'newline',
          },
        },
        options.transformPlainTextOutput
      );

      outputsByNode[node.id] = {
        wysiwygText: wrappedWysiwygTextOutput,
        plaintextContent: nodeOutput.plaintextContent,
        plainText: nodeOutput.plainText,
        wysiwygContent: nodeOutput.wysiwygContent,
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

    const flowPrompt = resolveLeafNodePrompt(
        visitOrder,
        outgoingByNode,
        visitedNodeIds,
        outputsByNode
    );

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
