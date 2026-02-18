import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  getDefaultConfigForType,
  type AiNode,
  type Edge,
  type NodeDefinition,
} from '@/features/ai/ai-paths/lib';

import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type CaseResolverEdgeMeta,
  type CaseResolverFile,
  type CaseResolverNodeMeta,
} from '../types';

export const buildNode = (
  definition: NodeDefinition,
  position: { x: number; y: number },
  id: string,
  title: string
): AiNode => {
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
    title,
    position,
    ...(mergedConfig ? { config: mergedConfig } : {}),
  };
};

export const ensureDocumentPromptPorts = (node: AiNode): AiNode => {
  if (node.type !== 'prompt') return node;
  const nextInputs = [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS];
  const nextOutputs = [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS];
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

export const DOCUMENT_TEXTFIELD_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'textfield';
export const DOCUMENT_CONTENT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'content';
export const DOCUMENT_PLAIN_TEXT_PORT = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[2] ?? 'plainText';

const normalizeTextNodeInputPort = (value: string | undefined): string => {
  if (
    value === DOCUMENT_TEXTFIELD_PORT ||
    value === DOCUMENT_CONTENT_PORT ||
    value === DOCUMENT_PLAIN_TEXT_PORT
  ) {
    return value;
  }
  return DOCUMENT_CONTENT_PORT;
};

const normalizeTextNodeOutputPort = (value: string | undefined): string => {
  if (
    value === DOCUMENT_TEXTFIELD_PORT ||
    value === DOCUMENT_CONTENT_PORT ||
    value === DOCUMENT_PLAIN_TEXT_PORT
  ) {
    return value;
  }
  return DOCUMENT_CONTENT_PORT;
};

export const normalizeEdgesForTextNode = (edges: Edge[], nodeId: string): Edge[] =>
  edges.map((edge: Edge): Edge => {
    let nextFromPort = edge.fromPort;
    let nextToPort = edge.toPort;
    if (edge.from === nodeId) {
      nextFromPort = normalizeTextNodeOutputPort(edge.fromPort);
    }
    if (edge.to === nodeId) {
      nextToPort = normalizeTextNodeInputPort(edge.toPort);
    }
    if (nextFromPort === edge.fromPort && nextToPort === edge.toPort) return edge;
    return {
      ...edge,
      fromPort: nextFromPort,
      toPort: nextToPort,
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
  edges: Edge[],
  existing: Record<string, CaseResolverEdgeMeta>
): Record<string, CaseResolverEdgeMeta> => {
  const edgeIds = new Set(edges.map((edge: Edge) => edge.id));
  const next: Record<string, CaseResolverEdgeMeta> = {};

  Object.entries(existing).forEach(([edgeId, meta]: [string, CaseResolverEdgeMeta]) => {
    if (!edgeIds.has(edgeId)) return;
    next[edgeId] = meta;
  });

  edges.forEach((edge: Edge) => {
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
    const folderLabel = file ? (file.folder || '(root)') : '(unknown)';
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
  const promptTemplate = node.config?.prompt?.template;
  const raw = typeof promptTemplate === 'string' ? promptTemplate : '';
  const plainText = stripHtmlToPlainText(raw);
  if (!plainText) return '';
  const quoted =
    nodeMeta.quoteMode === 'double'
      ? `"${plainText}"`
      : nodeMeta.quoteMode === 'single'
        ? `'${plainText}'`
        : plainText;
  return `${nodeMeta.surroundPrefix}${quoted}${nodeMeta.surroundSuffix}`;
};

export const buildPromptTemplateFromDroppedDocumentFile = (file: CaseResolverFile): string => {
  const sourceHtml = file.documentContentHtml.trim();
  if (sourceHtml.length > 0) {
    return sourceHtml;
  }
  const source = file.documentContent.trim();
  if (source.length > 0) {
    return hasHtmlMarkup(source) ? source : toHtmlParagraph(source);
  }
  return toHtmlParagraph(`Document: ${file.name}`);
};

export const clampCanvasPosition = (position: { x: number; y: number }): { x: number; y: number } => ({
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
