import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  type AiNode,
  type Edge,
  type CaseResolverEdgeMeta,
  type CaseResolverGraph,
  type CaseResolverNodeMeta,
  type CaseResolverPdfExtractionPresetId,
} from '@/shared/contracts/case-resolver';
import { validationError } from '@/shared/errors/app-error';

import { parseCanonicalCaseResolverEdge } from './settings.edge-validation';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const sanitizeNodeMeta = (
  source: Record<string, CaseResolverNodeMeta> | null | undefined
): Record<string, CaseResolverNodeMeta> => {
  if (!source || typeof source !== 'object') return {};

  const normalizeTextColor = (value: string | undefined): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    if (!normalized) return '';
    return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized) ? normalized : undefined;
  };

  const next: Record<string, CaseResolverNodeMeta> = {};
  Object.entries(source).forEach(([nodeId, meta]: [string, CaseResolverNodeMeta]) => {
    if (!nodeId || !meta || typeof meta !== 'object') return;
    const role =
      meta.role === 'text_note' || meta.role === 'explanatory' || meta.role === 'ai_prompt'
        ? meta.role
        : DEFAULT_CASE_RESOLVER_NODE_META.role;
    const quoteMode =
      meta.quoteMode === 'none' || meta.quoteMode === 'double' || meta.quoteMode === 'single'
        ? meta.quoteMode
        : DEFAULT_CASE_RESOLVER_NODE_META.quoteMode;
    const textColor = normalizeTextColor(meta.textColor);
    const plainTextValidationStackId =
      typeof meta.plainTextValidationStackId === 'string'
        ? meta.plainTextValidationStackId.trim()
        : DEFAULT_CASE_RESOLVER_NODE_META.plainTextValidationStackId;
    next[nodeId] = {
      role,
      quoteMode,
      includeInOutput:
        typeof meta.includeInOutput === 'boolean'
          ? meta.includeInOutput
          : DEFAULT_CASE_RESOLVER_NODE_META.includeInOutput,
      surroundPrefix:
        typeof meta.surroundPrefix === 'string'
          ? meta.surroundPrefix
          : DEFAULT_CASE_RESOLVER_NODE_META.surroundPrefix,
      surroundSuffix:
        typeof meta.surroundSuffix === 'string'
          ? meta.surroundSuffix
          : DEFAULT_CASE_RESOLVER_NODE_META.surroundSuffix,
      ...(typeof meta.appendTrailingNewline === 'boolean'
        ? { appendTrailingNewline: meta.appendTrailingNewline }
        : {}),
      ...(textColor !== undefined ? { textColor } : {}),
      plainTextValidationEnabled:
        typeof meta.plainTextValidationEnabled === 'boolean'
          ? meta.plainTextValidationEnabled
          : DEFAULT_CASE_RESOLVER_NODE_META.plainTextValidationEnabled,
      plainTextFormatterEnabled:
        typeof meta.plainTextFormatterEnabled === 'boolean'
          ? meta.plainTextFormatterEnabled
          : DEFAULT_CASE_RESOLVER_NODE_META.plainTextFormatterEnabled,
      plainTextValidationStackId: plainTextValidationStackId ?? '',
    };
  });
  return next;
};

const sanitizeEdgeMeta = (
  source: Record<string, CaseResolverEdgeMeta> | null | undefined
): Record<string, CaseResolverEdgeMeta> => {
  if (!source || typeof source !== 'object') return {};
  const next: Record<string, CaseResolverEdgeMeta> = {};
  Object.entries(source).forEach(([edgeId, meta]: [string, CaseResolverEdgeMeta]) => {
    if (!edgeId || !meta || typeof meta !== 'object') return;
    const joinMode =
      meta.joinMode === 'newline' ||
      meta.joinMode === 'tab' ||
      meta.joinMode === 'space' ||
      meta.joinMode === 'none'
        ? meta.joinMode
        : DEFAULT_CASE_RESOLVER_EDGE_META.joinMode;
    next[edgeId] = { joinMode };
  });
  return next;
};

const sanitizeDocumentFileLinksByNode = (
  source: unknown,
  validNodeIds: Set<string>
): Record<string, string[]> => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }
  const result: Record<string, string[]> = {};
  Object.entries(source as Record<string, unknown>).forEach(
    ([nodeId, rawLinks]: [string, unknown]) => {
      if (!validNodeIds.has(nodeId)) return;
      if (!Array.isArray(rawLinks)) return;
      const unique = new Set<string>();
      rawLinks.forEach((entry: unknown) => {
        if (typeof entry !== 'string') return;
        const normalized = entry.trim();
        if (!normalized) return;
        unique.add(normalized);
      });
      result[nodeId] = Array.from(unique);
    }
  );
  return result;
};

const sanitizeDocumentSourceFileIdByNode = (
  source: unknown,
  validNodeIds: Set<string>
): Record<string, string> => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }
  const result: Record<string, string> = {};
  Object.entries(source as Record<string, unknown>).forEach(
    ([nodeId, rawFileId]: [string, unknown]) => {
      if (!validNodeIds.has(nodeId)) return;
      if (typeof rawFileId !== 'string') return;
      const normalizedFileId = rawFileId.trim();
      if (!normalizedFileId) return;
      result[nodeId] = normalizedFileId;
    }
  );
  return result;
};

const sanitizeNodeFileAssetIdByNode = (
  source: unknown,
  validNodeIds: Set<string>
): Record<string, string> => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    return {};
  }
  const result: Record<string, string> = {};
  Object.entries(source as Record<string, unknown>).forEach(
    ([nodeId, rawAssetId]: [string, unknown]) => {
      if (!validNodeIds.has(nodeId)) return;
      if (typeof rawAssetId !== 'string') return;
      const normalizedAssetId = rawAssetId.trim();
      if (!normalizedAssetId) return;
      result[nodeId] = normalizedAssetId;
    }
  );
  return result;
};

const enforceCanonicalDocumentPromptNodes = (
  nodes: AiNode[],
  nodeMeta: Record<string, CaseResolverNodeMeta>,
  documentSourceFileIdByNode: Record<string, string>
): AiNode[] =>
  nodes.map((node: AiNode): AiNode => {
    const isTextNode =
      nodeMeta[node.id]?.role === 'text_note' ||
      nodeMeta[node.id]?.role === 'explanatory' ||
      Boolean(documentSourceFileIdByNode[node.id]);
    if (!isTextNode) return node;
    if (node.type !== 'prompt') {
      throw validationError('Case Resolver text nodes must use prompt node type.', {
        source: 'case_resolver.graph',
        nodeId: node.id,
        nodeType: node.type,
      });
    }
    const isExplanatoryNode = nodeMeta[node.id]?.role === 'explanatory';
    const currentInputs = Array.isArray(node.inputs) ? node.inputs : [];
    const currentOutputs = Array.isArray(node.outputs) ? node.outputs : [];
    const nextInputs = isExplanatoryNode
      ? [...CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS]
      : [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS];
    const nextOutputs = isExplanatoryNode
      ? [...CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS]
      : [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS];
    const sameInputs =
      nextInputs.length === currentInputs.length &&
      nextInputs.every((port: string, index: number): boolean => port === currentInputs[index]);
    const sameOutputs =
      nextOutputs.length === currentOutputs.length &&
      nextOutputs.every((port: string, index: number): boolean => port === currentOutputs[index]);
    if (!sameInputs || !sameOutputs) {
      throw validationError('Case Resolver text nodes must use canonical prompt ports.', {
        source: 'case_resolver.graph',
        nodeId: node.id,
        nodeType: node.type,
        inputs: currentInputs,
        outputs: currentOutputs,
        expectedInputs: nextInputs,
        expectedOutputs: nextOutputs,
      });
    }
    return node;
  });

const validateTextNodeEdgePorts = (
  edges: Edge[],
  textNodeIds: Set<string>,
  explanatoryNodeIds: Set<string>
): Edge[] => {
  if (edges.length === 0 || textNodeIds.size === 0) return edges;
  return edges.filter((edge: Edge): boolean => {
    const sourceNodeId = edge.source?.trim() ?? '';
    const targetNodeId = edge.target?.trim() ?? '';
    const validatePort = (
      port: string | null | undefined,
      nodeId: string,
      direction: 'sourceHandle' | 'targetHandle'
    ): boolean => {
      if (!textNodeIds.has(nodeId)) return true;
      const allowedPorts: readonly string[] = explanatoryNodeIds.has(nodeId)
        ? direction === 'sourceHandle'
          ? CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS
          : CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS
        : direction === 'sourceHandle'
          ? CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS
          : CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS;
      return typeof port === 'string' && allowedPorts.includes(port);
    };

    return (
      validatePort(edge.sourceHandle, sourceNodeId, 'sourceHandle') &&
      validatePort(edge.targetHandle, targetNodeId, 'targetHandle')
    );
  });
};

export const sanitizeGraph = (graph: unknown): CaseResolverGraph => {
  const graphRecord = graph && typeof graph === 'object' ? (graph as Record<string, unknown>) : {};
  const rawNodes = Array.isArray(graphRecord['nodes']) ? (graphRecord['nodes'] as AiNode[]) : [];
  const rawEdges = Array.isArray(graphRecord['edges']) ? graphRecord['edges'] : [];
  const validNodeIds = new Set<string>(
    rawNodes.map((node: AiNode) => (typeof node?.id === 'string' ? node.id : '')).filter(Boolean)
  );
  const parsedEdges: Edge[] = [];
  rawEdges.forEach((edge: unknown, index: number): void => {
    try {
      parsedEdges.push(parseCanonicalCaseResolverEdge(edge, `case_resolver.graph.edges[${index}]`));
    } catch (error) {
      logClientError(error);
    
      // Drop malformed edges during workspace sanitation.
    }
  });
  const edgesByNodeId = parsedEdges.filter(
    (edge: Edge): boolean =>
      validNodeIds.has(edge.source?.trim() ?? '') && validNodeIds.has(edge.target?.trim() ?? '')
  );

  const presetRaw = graphRecord['pdfExtractionPresetId'];
  const pdfExtractionPresetId: CaseResolverPdfExtractionPresetId =
    presetRaw === 'plain_text' || presetRaw === 'structured_sections'
      ? presetRaw
      : DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID;
  const documentFileLinksByNode = sanitizeDocumentFileLinksByNode(
    graphRecord['documentFileLinksByNode'],
    validNodeIds
  );
  const documentSourceFileIdByNode = sanitizeDocumentSourceFileIdByNode(
    graphRecord['documentSourceFileIdByNode'],
    validNodeIds
  );
  const nodeFileAssetIdByNode = sanitizeNodeFileAssetIdByNode(
    graphRecord['nodeFileAssetIdByNode'],
    validNodeIds
  );
  const sanitizedNodeMeta = sanitizeNodeMeta(
    graphRecord['nodeMeta'] as Record<string, CaseResolverNodeMeta> | null | undefined
  );
  const nodes = enforceCanonicalDocumentPromptNodes(
    rawNodes,
    sanitizedNodeMeta,
    documentSourceFileIdByNode
  );
  const nodeById = new Map<string, AiNode>(
    nodes.map((node: AiNode): [string, AiNode] => [node.id, node])
  );
  Object.keys(documentFileLinksByNode).forEach((nodeId: string): void => {
    const node = nodeById.get(nodeId);
    if (!node || node.type === 'prompt') return;
    throw validationError('Case Resolver document-link nodes must use prompt node type.', {
      source: 'case_resolver.graph',
      nodeId,
      nodeType: node.type,
    });
  });
  const textNodeIds = new Set<string>(
    nodes
      .filter((node: AiNode): boolean => {
        if (node.type !== 'prompt') return false;
        return (
          sanitizedNodeMeta[node.id]?.role === 'text_note' ||
          sanitizedNodeMeta[node.id]?.role === 'explanatory' ||
          Boolean(documentSourceFileIdByNode[node.id])
        );
      })
      .map((node: AiNode): string => node.id)
  );
  const explanatoryNodeIds = new Set<string>(
    nodes
      .filter((node: AiNode): boolean => sanitizedNodeMeta[node.id]?.role === 'explanatory')
      .map((node: AiNode): string => node.id)
  );
  const strictEdges = validateTextNodeEdgePorts(edgesByNodeId, textNodeIds, explanatoryNodeIds);
  const rawDocumentDropNodeId = graphRecord['documentDropNodeId'];
  const documentDropNodeId =
    typeof rawDocumentDropNodeId === 'string' &&
    rawDocumentDropNodeId.trim().length > 0 &&
    validNodeIds.has(rawDocumentDropNodeId)
      ? rawDocumentDropNodeId
      : null;
  if (documentDropNodeId) {
    const dropNode = nodeById.get(documentDropNodeId);
    if (dropNode && dropNode.type !== 'prompt') {
      throw validationError('Case Resolver document-drop node must use prompt node type.', {
        source: 'case_resolver.graph',
        nodeId: documentDropNodeId,
        nodeType: dropNode.type,
      });
    }
  }

  return {
    nodes,
    edges: strictEdges,
    nodeMeta: sanitizedNodeMeta,
    edgeMeta: sanitizeEdgeMeta(
      graphRecord['edgeMeta'] as Record<string, CaseResolverEdgeMeta> | null | undefined
    ),
    pdfExtractionPresetId,
    documentFileLinksByNode,
    documentDropNodeId,
    documentSourceFileIdByNode,
    ...(Object.keys(nodeFileAssetIdByNode).length > 0 ? { nodeFileAssetIdByNode } : {}),
  };
};

export const createEmptyCaseResolverGraph = (): CaseResolverGraph => ({
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  pdfExtractionPresetId: DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  documentFileLinksByNode: {},
  documentDropNodeId: null,
  documentSourceFileIdByNode: {},
});
