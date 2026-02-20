import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  type AiNode,
  type Edge,
  type CaseResolverEdgeMeta,
  type CaseResolverGraph,
  type CaseResolverNodeMeta,
  type CaseResolverPdfExtractionPresetId,
} from './types';

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
  Object.entries(source as Record<string, unknown>).forEach(([nodeId, rawLinks]: [string, unknown]) => {
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
  });
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
  Object.entries(source as Record<string, unknown>).forEach(([nodeId, rawFileId]: [string, unknown]) => {
    if (!validNodeIds.has(nodeId)) return;
    if (typeof rawFileId !== 'string') return;
    const normalizedFileId = rawFileId.trim();
    if (!normalizedFileId) return;
    result[nodeId] = normalizedFileId;
  });
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
  Object.entries(source as Record<string, unknown>).forEach(([nodeId, rawAssetId]: [string, unknown]) => {
    if (!validNodeIds.has(nodeId)) return;
    if (typeof rawAssetId !== 'string') return;
    const normalizedAssetId = rawAssetId.trim();
    if (!normalizedAssetId) return;
    result[nodeId] = normalizedAssetId;
  });
  return result;
};

const ensureDocumentPromptPorts = (
  nodes: AiNode[],
  nodeMeta: Record<string, CaseResolverNodeMeta>,
  documentSourceFileIdByNode: Record<string, string>
): AiNode[] =>
  nodes.map((node: AiNode): AiNode => {
    const isTextNode =
      nodeMeta[node.id]?.role === 'text_note' ||
      nodeMeta[node.id]?.role === 'explanatory' ||
      Boolean(documentSourceFileIdByNode[node.id]);
    const normalizedNode: AiNode =
      node.type === 'template' && isTextNode
        ? {
          ...node,
          type: 'prompt',
          config: {
            ...(node.config ?? {}),
            prompt: {
              ...(node.config?.prompt ?? {}),
              template:
                typeof node.config?.prompt?.template === 'string'
                  ? node.config.prompt.template
                  : typeof node.config?.template?.template === 'string'
                    ? node.config.template.template
                    : '',
            },
          },
        }
        : node;
    if (normalizedNode.type !== 'prompt' || !isTextNode) return normalizedNode;
    const currentInputs = Array.isArray(normalizedNode.inputs) ? normalizedNode.inputs : [];
    const currentOutputs = Array.isArray(normalizedNode.outputs) ? normalizedNode.outputs : [];
    const nextInputs = [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS];
    const nextOutputs = [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS];
    const sameInputs =
      nextInputs.length === currentInputs.length &&
      nextInputs.every((port: string, index: number): boolean => port === currentInputs[index]);
    const sameOutputs =
      nextOutputs.length === currentOutputs.length &&
      nextOutputs.every((port: string, index: number): boolean => port === currentOutputs[index]);
    if (sameInputs && sameOutputs) return normalizedNode;
    return {
      ...normalizedNode,
      inputs: nextInputs,
      outputs: nextOutputs,
    };
  });

const sanitizeTextNodeEdgePorts = (
  edges: Edge[],
  textNodeIds: Set<string>
): Edge[] => {
  if (edges.length === 0 || textNodeIds.size === 0) return edges;
  const textfieldPort = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'wysiwygText';
  const contentPort = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'content';
  const plainTextPort = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';
  const legacyTextfieldPort = 'textfield';

  const normalizeInputPort = (value: string | null | undefined): string => {
    if (value === legacyTextfieldPort) return textfieldPort;
    if (value === textfieldPort || value === contentPort || value === plainTextPort) return value;
    return contentPort;
  };

  const normalizeOutputPort = (value: string | null | undefined): string => {
    if (value === legacyTextfieldPort) return textfieldPort;
    if (value === textfieldPort || value === contentPort || value === plainTextPort) return value;
    return contentPort;
  };

  return edges.map((edge: Edge): Edge => {
    let nextFromPort = edge.fromPort;
    let nextToPort = edge.toPort;
    const fromNodeId = edge.from ?? edge.source;
    const toNodeId = edge.to ?? edge.target;
    if (fromNodeId && textNodeIds.has(fromNodeId)) {
      const normalized = normalizeOutputPort(edge.fromPort);
      if (normalized !== edge.fromPort) {
        nextFromPort = normalized;
      }
    }
    if (toNodeId && textNodeIds.has(toNodeId)) {
      const normalized = normalizeInputPort(edge.toPort);
      if (normalized !== edge.toPort) {
        nextToPort = normalized;
      }
    }
    if (nextFromPort === edge.fromPort && nextToPort === edge.toPort) return edge;
    return {
      ...edge,
      fromPort: nextFromPort,
      toPort: nextToPort,
    };
  });
};

export const sanitizeGraph = (graph: unknown): CaseResolverGraph => {
  const graphRecord = graph && typeof graph === 'object' ? (graph as Record<string, unknown>) : {};
  const rawNodes = Array.isArray(graphRecord['nodes']) ? (graphRecord['nodes'] as AiNode[]) : [];
  const edges = Array.isArray(graphRecord['edges']) ? (graphRecord['edges'] as Edge[]) : [];
  const validNodeIds = new Set<string>(
    rawNodes
      .map((node: AiNode) => (typeof node?.id === 'string' ? node.id : ''))
      .filter(Boolean)
  );
  const edgesByNodeId = edges.filter(
    (edge: Edge): boolean =>
      typeof edge?.id === 'string' &&
      typeof edge.from === 'string' &&
      typeof edge.to === 'string' &&
      validNodeIds.has(edge.from) &&
      validNodeIds.has(edge.to)
  );

  const presetRaw = graphRecord['pdfExtractionPresetId'];
  const pdfExtractionPresetId: CaseResolverPdfExtractionPresetId =
    presetRaw === 'plain_text' || presetRaw === 'structured_sections' || presetRaw === 'facts_entities'
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
  const nodes = ensureDocumentPromptPorts(rawNodes, sanitizedNodeMeta, documentSourceFileIdByNode);
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
  const sanitizedEdges = sanitizeTextNodeEdgePorts(edgesByNodeId, textNodeIds);
  const strictEdges: CaseResolverGraph['edges'] = (sanitizedEdges)
    .map((edge: Edge): CaseResolverGraph['edges'][number] | null => {
      const from = edge.from ?? edge.source;
      const to = edge.to ?? edge.target;
      if (!from || !to) return null;
      return {
        id: edge.id,
        from,
        to,
        ...(edge.label ? { label: edge.label } : {}),
        ...(edge.fromPort ?? edge.sourceHandle
          ? { fromPort: edge.fromPort ?? edge.sourceHandle ?? undefined }
          : {}),
        ...(edge.toPort ?? edge.targetHandle
          ? { toPort: edge.toPort ?? edge.targetHandle ?? undefined }
          : {}),
      };
    })
    .filter((edge): edge is CaseResolverGraph['edges'][number] => edge !== null);
  const rawDocumentDropNodeId = graphRecord['documentDropNodeId'];
  const documentDropNodeId =
    typeof rawDocumentDropNodeId === 'string' &&
    rawDocumentDropNodeId.trim().length > 0 &&
    validNodeIds.has(rawDocumentDropNodeId)
      ? rawDocumentDropNodeId
      : null;

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
    ...(Object.keys(nodeFileAssetIdByNode).length > 0
      ? { nodeFileAssetIdByNode }
      : {}),
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
