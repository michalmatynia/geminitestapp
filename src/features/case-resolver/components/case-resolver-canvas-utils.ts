import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  getDefaultConfigForType,
} from '@/shared/lib/ai-paths';
import { type EdgeDto as AiEdge } from '@/shared/contracts/ai-paths';
import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS,
  CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT,
  CASE_RESOLVER_LEGACY_DOCUMENT_CONTENT_PORT,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type AiNode,
  type NodeDefinition,
  type CaseResolverEdgeMeta,
  type CaseResolverFile,
  type CaseResolverNodeMeta,
} from '@/shared/contracts/case-resolver';

export const buildNode = (
  definition: NodeDefinition,
  position: { x: number; y: number },
  id: string,
  title: string
): AiNode => {
  const now = new Date().toISOString();
  const defaultConfig = getDefaultConfigForType(
    definition.type,
    definition.outputs,
    definition.inputs
  );
  const mergedConfig = definition.config
    ? {
        ...(defaultConfig ?? {}),
        ...definition.config,
      }
    : defaultConfig;

  return {
    ...definition,
    id,
    createdAt: now,
    updatedAt: now,
    title,
    position,
    data: {},
    ...(mergedConfig ? { config: mergedConfig } : {}),
  };
};

export const ensureDocumentPromptPorts = (
  node: AiNode,
  role: CaseResolverNodeMeta['role'] | null = null
): AiNode => {
  if (node.type !== 'prompt') return node;
  const isExplanatory = role === 'explanatory';
  const nextInputs = isExplanatory
    ? [...CASE_RESOLVER_EXPLANATORY_NODE_INPUT_PORTS]
    : [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS];
  const nextOutputs = isExplanatory
    ? [...CASE_RESOLVER_EXPLANATORY_NODE_OUTPUT_PORTS]
    : [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS];
  const currentInputs = Array.isArray(node.inputs) ? node.inputs : [];
  const currentOutputs = Array.isArray(node.outputs) ? node.outputs : [];
  const sameInputs =
    nextInputs.length === currentInputs.length &&
    nextInputs.every((port: string, index: number): boolean => port === currentInputs[index]);
  const sameOutputs =
    nextOutputs.length === currentOutputs.length &&
    nextOutputs.every((port: string, index: number): boolean => port === currentOutputs[index]);
  if (sameInputs && sameOutputs) return node;
  return {
    ...node,
    inputs: nextInputs,
    outputs: nextOutputs,
  };
};

export const DOCUMENT_TEXTFIELD_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'wysiwygText';
export const DOCUMENT_PLAINTEXT_CONTENT_PORT =
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'plaintextContent';
export const DOCUMENT_PLAIN_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';
export const DOCUMENT_WYSIWYG_CONTENT_PORT = CASE_RESOLVER_EXPLANATORY_WYSIWYG_CONTENT_PORT;
const LEGACY_DOCUMENT_TEXTFIELD_PORT = 'textfield';
const LEGACY_DOCUMENT_CONTENT_PORT = CASE_RESOLVER_LEGACY_DOCUMENT_CONTENT_PORT;

const normalizeTextNodeInputPort = (
  value: string | null | undefined,
  allowWysiwygContentPort: boolean
): string => {
  if (value === LEGACY_DOCUMENT_TEXTFIELD_PORT) {
    return DOCUMENT_TEXTFIELD_PORT;
  }
  if (value === LEGACY_DOCUMENT_CONTENT_PORT) {
    return DOCUMENT_PLAINTEXT_CONTENT_PORT;
  }
  if (
    value === DOCUMENT_TEXTFIELD_PORT ||
    value === DOCUMENT_PLAINTEXT_CONTENT_PORT ||
    value === DOCUMENT_PLAIN_TEXT_PORT ||
    (allowWysiwygContentPort && value === DOCUMENT_WYSIWYG_CONTENT_PORT)
  ) {
    return value;
  }
  return DOCUMENT_PLAINTEXT_CONTENT_PORT;
};

const normalizeTextNodeOutputPort = (
  value: string | null | undefined,
  allowWysiwygContentPort: boolean
): string => {
  if (value === LEGACY_DOCUMENT_TEXTFIELD_PORT) {
    return DOCUMENT_TEXTFIELD_PORT;
  }
  if (value === LEGACY_DOCUMENT_CONTENT_PORT) {
    return DOCUMENT_PLAINTEXT_CONTENT_PORT;
  }
  if (
    value === DOCUMENT_TEXTFIELD_PORT ||
    value === DOCUMENT_PLAINTEXT_CONTENT_PORT ||
    value === DOCUMENT_PLAIN_TEXT_PORT ||
    (allowWysiwygContentPort && value === DOCUMENT_WYSIWYG_CONTENT_PORT)
  ) {
    return value;
  }
  return DOCUMENT_PLAINTEXT_CONTENT_PORT;
};

export const normalizeEdgesForTextNode = (
  edges: AiEdge[],
  nodeId: string,
  isExplanatoryNode = false
): AiEdge[] =>
  edges.map((edge: AiEdge): AiEdge => {
    const legacyEdge = edge as AiEdge & {
      from?: string;
      to?: string;
      fromPort?: string;
      toPort?: string;
    };
    const from = legacyEdge.from ?? edge.source;
    const to = legacyEdge.to ?? edge.target;
    const currentFromPort = legacyEdge.fromPort ?? edge.sourceHandle;
    const currentToPort = legacyEdge.toPort ?? edge.targetHandle;

    let nextFromPort = currentFromPort;
    let nextToPort = currentToPort;
    if (from === nodeId) {
      nextFromPort = normalizeTextNodeOutputPort(currentFromPort, isExplanatoryNode);
    }
    if (to === nodeId) {
      nextToPort = normalizeTextNodeInputPort(currentToPort, isExplanatoryNode);
    }
    if (nextFromPort === currentFromPort && nextToPort === currentToPort) return edge;
    return {
      ...edge,
      sourceHandle: nextFromPort,
      targetHandle: nextToPort,
    };
  });

export const ensureNodeMeta = (
  nodes: AiNode[],
  existing: Record<string, CaseResolverNodeMeta>
): Record<string, CaseResolverNodeMeta> => {
  const nodeIds = new Set(nodes.map((node: AiNode) => node.id));
  const next: Record<string, CaseResolverNodeMeta> = {};

  Object.entries(existing).forEach(([nodeId, meta]: [string, CaseResolverNodeMeta]) => {
    if (!nodeIds.has(nodeId)) return;
    next[nodeId] = meta;
  });

  nodes.forEach((node: AiNode) => {
    if (node.type !== 'prompt') return;
    if (!next[node.id]) {
      next[node.id] = {
        ...DEFAULT_CASE_RESOLVER_NODE_META,
        role: 'ai_prompt',
        includeInOutput: false,
      };
    }
  });

  return next;
};

export const ensureEdgeMeta = (
  edges: Array<{ id: string }>,
  existing: Record<string, CaseResolverEdgeMeta>
): Record<string, CaseResolverEdgeMeta> => {
  const edgeIds = new Set(edges.map((edge) => edge.id));
  const next: Record<string, CaseResolverEdgeMeta> = {};

  Object.entries(existing).forEach(([edgeId, meta]: [string, CaseResolverEdgeMeta]) => {
    if (!edgeIds.has(edgeId)) return;
    next[edgeId] = meta;
  });

  edges.forEach((edge) => {
    if (!next[edge.id]) {
      next[edge.id] = { ...DEFAULT_CASE_RESOLVER_EDGE_META };
    }
  });

  return next;
};

export const ensureDocumentLinksByNode = (
  nodes: AiNode[],
  existing: Record<string, string[]>,
  validFileIds: Set<string>
): Record<string, string[]> => {
  const nodeIds = new Set(nodes.map((node: AiNode) => node.id));
  const next: Record<string, string[]> = {};

  Object.entries(existing).forEach(([nodeId, links]: [string, string[]]) => {
    if (!nodeIds.has(nodeId)) return;
    if (!Array.isArray(links)) return;
    const unique = new Set<string>();
    links.forEach((fileId: string) => {
      if (typeof fileId !== 'string') return;
      const normalized = fileId.trim();
      if (!normalized) return;
      if (!validFileIds.has(normalized)) return;
      unique.add(normalized);
    });
    next[nodeId] = Array.from(unique);
  });

  return next;
};

export const ensureDocumentSourceFileByNode = (
  nodes: AiNode[],
  existing: Record<string, string>,
  validFileIds: Set<string>
): Record<string, string> => {
  const nodeIds = new Set(nodes.map((node: AiNode) => node.id));
  const next: Record<string, string> = {};

  Object.entries(existing).forEach(([nodeId, fileId]: [string, string]) => {
    if (!nodeIds.has(nodeId)) return;
    if (typeof fileId !== 'string') return;
    const normalizedFileId = fileId.trim();
    if (!normalizedFileId || !validFileIds.has(normalizedFileId)) return;
    next[nodeId] = normalizedFileId;
  });

  return next;
};

export const resolveDocumentDropNodeId = (
  candidate: string | null,
  nodes: AiNode[]
): string | null => {
  if (!candidate) return null;
  return nodes.some((node: AiNode) => node.id === candidate) ? candidate : null;
};

export const buildCanvasNodeFileTemplate = (
  linkedFileIds: string[],
  availableFilesById: Map<string, CaseResolverFile>
): string => {
  const lines = ['Canvas Node File', 'Linked Documents:'];
  if (linkedFileIds.length === 0) {
    lines.push('- (none)');
    return lines.join('\n');
  }

  linkedFileIds.forEach((fileId: string, index: number) => {
    const file = availableFilesById.get(fileId);
    const label = file ? file.name : fileId;
    const folderLabel = file ? file.folder || '(root)' : '(unknown)';
    lines.push(`${index + 1}. ${label} [${folderLabel}]`);
  });

  return lines.join('\n');
};

export const resolvePromptConfig = (node: AiNode): { template: string } => {
  const template = node.config?.prompt?.template;
  return {
    template: typeof template === 'string' ? template : '',
  };
};

export const resolveTemplateConfig = (node: AiNode): { template: string } => {
  const template = node.config?.template?.template;
  return {
    template: typeof template === 'string' ? template : '',
  };
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toHtmlParagraph = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return `<p>${escapeHtml(trimmed).replace(/\n/g, '<br/>')}</p>`;
};

const hasHtmlMarkup = (value: string): boolean => /<\/?[a-z][^>]*>/i.test(value);

const decodeBasicHtmlEntities = (value: string): string =>
  value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&apos;|&#39;/gi, "'")
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
    .replace(/<\/?[a-z][^>]*>/gi, '');

export const stripHtmlToPlainText = (html: string): string => {
  const decoded = decodeHtmlEntity(html);
  const stripped = stripHtmlTagsPreserveBreaks(decoded);
  const normalized = stripHtmlTagsPreserveBreaks(decodeHtmlEntity(stripped));
  return normalized
    .split('\n')
    .map((line: string) => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export const renderPromptNodeTextPreview = (
  node: AiNode,
  nodeMeta: CaseResolverNodeMeta
): string => {
  const normalizedNodeMeta: CaseResolverNodeMeta = {
    ...DEFAULT_CASE_RESOLVER_NODE_META,
    ...nodeMeta,
  };
  const promptTemplate = node.config?.prompt?.template;
  const raw = typeof promptTemplate === 'string' ? promptTemplate : '';
  const plainText = stripHtmlToPlainText(raw);
  if (!plainText) return '';
  const quoted =
    normalizedNodeMeta.quoteMode === 'double'
      ? `"${plainText}"`
      : normalizedNodeMeta.quoteMode === 'single'
        ? `'${plainText}'`
        : plainText;
  return `${normalizedNodeMeta.surroundPrefix}${quoted}${normalizedNodeMeta.surroundSuffix}${
    normalizedNodeMeta.appendTrailingNewline ? '\n' : ''
  }`;
};

export const buildPromptTemplateFromDroppedDocumentFile = (file: CaseResolverFile): string => {
  if (file.fileType === 'scanfile') {
    const scanMarkdown = file.documentContentMarkdown.trim();
    if (scanMarkdown.length > 0) {
      return toHtmlParagraph(scanMarkdown);
    }
    const scanPlainText = file.documentContentPlainText.trim();
    if (scanPlainText.length > 0) {
      return toHtmlParagraph(scanPlainText);
    }
    const scanStoredContent = file.documentContent.trim();
    if (scanStoredContent.length > 0) {
      const normalizedScanContent = stripHtmlToPlainText(scanStoredContent) || scanStoredContent;
      return toHtmlParagraph(normalizedScanContent);
    }
    const scanSlotText = file.scanSlots
      .map((slot): string => (slot.ocrText ?? '').trim())
      .filter((value: string): boolean => value.length > 0)
      .join('\n\n');
    if (scanSlotText.length > 0) {
      return toHtmlParagraph(scanSlotText);
    }
    const topLevelOcrText = (file.ocrText ?? '').trim();
    if (topLevelOcrText.length > 0) {
      return toHtmlParagraph(topLevelOcrText);
    }
  }
  const sourceHtml = file.documentContentHtml.trim();
  if (sourceHtml.length > 0) {
    return sourceHtml;
  }
  const sourcePlainText = file.documentContentPlainText.trim();
  if (sourcePlainText.length > 0) {
    return toHtmlParagraph(sourcePlainText);
  }
  const sourceMarkdown = file.documentContentMarkdown.trim();
  if (sourceMarkdown.length > 0) {
    return toHtmlParagraph(sourceMarkdown);
  }
  const sourceContent = file.documentContent.trim();
  if (sourceContent.length > 0) {
    return hasHtmlMarkup(sourceContent) ? sourceContent : toHtmlParagraph(sourceContent);
  }
  return toHtmlParagraph(`Document: ${file.name}`);
};

export const resolvePromptNodeStaticOutputs = (
  node: AiNode,
  nodeMeta: CaseResolverNodeMeta
): {
  textfield: string;
  plaintextContent: string;
  plainText: string;
  wysiwygContent: string;
} => {
  const promptTemplate = resolvePromptConfig(node).template;
  const textfield = stripHtmlToPlainText(promptTemplate);
  const plaintextContent = renderPromptNodeTextPreview(node, nodeMeta) || textfield;
  const plainText = stripHtmlToPlainText(plaintextContent || textfield);
  const wysiwygContent = nodeMeta.role === 'explanatory' ? promptTemplate : '';
  return {
    textfield,
    plaintextContent,
    plainText,
    wysiwygContent,
  };
};

export const clampCanvasPosition = (position: {
  x: number;
  y: number;
}): { x: number; y: number } => ({
  x: Math.min(Math.max(position.x, 16), CANVAS_WIDTH - NODE_WIDTH - 16),
  y: Math.min(Math.max(position.y, 16), CANVAS_HEIGHT - NODE_MIN_HEIGHT - 16),
});

export const createNodeId = (): string => `node-${Math.random().toString(36).slice(2, 10)}`;
export const createEdgeId = (): string => `edge-${Math.random().toString(36).slice(2, 10)}`;

const MAX_PDF_EXTRACT_CHARS = 24_000;

export const normalizeExtractedPdfText = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length <= MAX_PDF_EXTRACT_CHARS) return trimmed;
  return `${trimmed.slice(0, MAX_PDF_EXTRACT_CHARS)}\n\n[TRUNCATED ${trimmed.length - MAX_PDF_EXTRACT_CHARS} chars]`;
};
