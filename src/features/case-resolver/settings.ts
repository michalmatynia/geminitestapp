import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS,
  CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS,
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type CaseResolverAssetFile,
  type CaseResolverAssetKind,
  type CaseResolverCategory,
  type CaseResolverDocumentVersion,
  type CaseResolverEdgeMeta,
  type CaseResolverFile,
  type CaseResolverFileType,
  type CaseResolverFolderTimestamp,
  type CaseResolverGraph,
  type CaseResolverNodeMeta,
  type CaseResolverPartyReference,
  type CaseResolverScanSlot,
  type CaseResolverTag,
  type CaseResolverPdfExtractionPresetId,
  type CaseResolverWorkspace,
} from './types';

export const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v1';
export const CASE_RESOLVER_TAGS_KEY = 'case_resolver_tags_v1';
export const CASE_RESOLVER_CATEGORIES_KEY = 'case_resolver_categories_v1';
export const CASE_RESOLVER_SETTINGS_KEY = 'case_resolver_settings_v1';

export type CaseResolverSettings = {
  ocrModel: string;
};

export const DEFAULT_CASE_RESOLVER_SETTINGS: CaseResolverSettings = {
  ocrModel: '',
};

export const normalizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part: string) => part.trim())
    .filter((part: string) => part && part !== '.' && part !== '..')
    .map((part: string) => part.replace(/[^a-zA-Z0-9-_]/g, '_'))
    .filter(Boolean);
  return parts.join('/');
};

export const expandFolderPath = (value: string): string[] => {
  const normalized = normalizeFolderPath(value);
  if (!normalized) return [];
  const parts = normalized.split('/').filter(Boolean);
  return parts.map((_: string, index: number) => parts.slice(0, index + 1).join('/'));
};

export const normalizeFolderPaths = (folders: string[]): string[] => {
  const set = new Set<string>();
  folders
    .flatMap((folder: string) => expandFolderPath(folder))
    .forEach((folder: string) => {
      if (folder) set.add(folder);
    });
  return Array.from(set).sort((left: string, right: string) => left.localeCompare(right));
};

const normalizeTimestamp = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const toTimestampMs = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

const pickEarliestTimestamp = (
  values: Array<string | null | undefined>,
  fallback: string
): string => {
  let best = fallback;
  let bestMs = toTimestampMs(fallback);
  values.forEach((value: string | null | undefined): void => {
    if (typeof value !== 'string') return;
    const valueMs = toTimestampMs(value);
    if (valueMs === null) return;
    if (bestMs === null || valueMs < bestMs) {
      best = value;
      bestMs = valueMs;
    }
  });
  return best;
};

const pickLatestTimestamp = (
  values: Array<string | null | undefined>,
  fallback: string
): string => {
  let best = fallback;
  let bestMs = toTimestampMs(fallback);
  values.forEach((value: string | null | undefined): void => {
    if (typeof value !== 'string') return;
    const valueMs = toTimestampMs(value);
    if (valueMs === null) return;
    if (bestMs === null || valueMs > bestMs) {
      best = value;
      bestMs = valueMs;
    }
  });
  return best;
};

const sanitizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const sanitizeOptionalMimeType = (value: unknown): string | null => {
  const normalized = sanitizeOptionalId(value);
  return normalized ? normalized.toLowerCase() : null;
};

const normalizeHexColor = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(normalized) || /^#[0-9a-fA-F]{3}$/.test(normalized)) {
    return normalized;
  }
  return fallback;
};

const toLocalDateValue = (date: Date): string => {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDocumentDate = (value: unknown): string => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return trimmed.slice(0, 10);
    }
  }
  return toLocalDateValue(new Date());
};

const sanitizeNodeMeta = (
  source: Record<string, CaseResolverNodeMeta> | null | undefined
): Record<string, CaseResolverNodeMeta> => {
  if (!source || typeof source !== 'object') return {};
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

const sanitizePartyReference = (value: unknown): CaseResolverPartyReference | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const kindRaw = typeof record['kind'] === 'string' ? record['kind'].trim() : '';
  const id = typeof record['id'] === 'string' ? record['id'].trim() : '';
  if (!id) return null;
  if (kindRaw !== 'person' && kindRaw !== 'organization') return null;
  const kind: CaseResolverPartyReference['kind'] = kindRaw;
  return {
    kind,
    id,
  };
};

const normalizeCaseResolverFileType = (value: unknown): CaseResolverFileType =>
  value === 'scanfile' ? 'scanfile' : 'document';

const normalizeCaseResolverDocumentVersion = (
  value: unknown
): CaseResolverDocumentVersion => (value === 'exploded' ? 'exploded' : 'original');

const normalizeCaseResolverScanSlots = (input: unknown): CaseResolverScanSlot[] => {
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const slots: CaseResolverScanSlot[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;

    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `scan-slot-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    slots.push({
      id: rawId,
      name: rawName || `Scan ${slots.length + 1}`,
      filepath: sanitizeOptionalId(record['filepath']),
      sourceFileId: sanitizeOptionalId(record['sourceFileId']),
      mimeType: sanitizeOptionalMimeType(record['mimeType']),
      size:
        typeof record['size'] === 'number' &&
          Number.isFinite(record['size']) &&
          record['size'] >= 0
          ? Math.round(record['size'])
          : null,
      ocrText: typeof record['ocrText'] === 'string' ? record['ocrText'] : '',
    });
  });

  return slots;
};

export const normalizeCaseResolverTags = (input: unknown): CaseResolverTag[] => {
  const now = new Date().toISOString();
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const raw: CaseResolverTag[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `tag-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    raw.push({
      id: rawId,
      name: rawName || `Tag ${raw.length + 1}`,
      parentId: sanitizeOptionalId(record['parentId']),
      color: normalizeHexColor(record['color'], '#38bdf8'),
      createdAt: normalizeTimestamp(record['createdAt'], now),
      updatedAt: normalizeTimestamp(record['updatedAt'], now),
    });
  });

  const byId = new Map<string, CaseResolverTag>(
    raw.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const normalizedParents = raw.map((tag: CaseResolverTag): CaseResolverTag => ({
    ...tag,
    parentId: resolveSafeTagParentId(tag.id, tag.parentId, byId),
  }));

  const grouped = new Map<string, CaseResolverTag[]>();
  const getGroupKey = (parentId: string | null): string => parentId ?? '__root__';
  normalizedParents.forEach((tag: CaseResolverTag): void => {
    const key = getGroupKey(tag.parentId);
    const current = grouped.get(key) ?? [];
    current.push(tag);
    grouped.set(key, current);
  });

  const output: CaseResolverTag[] = [];
  const visit = (parentId: string | null): void => {
    const group = grouped.get(getGroupKey(parentId)) ?? [];
    group
      .sort((left: CaseResolverTag, right: CaseResolverTag) => {
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      })
      .forEach((tag: CaseResolverTag): void => {
        output.push(tag);
        visit(tag.id);
      });
  };

  visit(null);
  return output;
};

function resolveSafeTagParentId(
  tagId: string,
  parentId: string | null,
  tagMap: Map<string, CaseResolverTag>
): string | null {
  if (!parentId || !tagMap.has(parentId) || parentId === tagId) return null;
  let current: string | null = parentId;
  const visited = new Set<string>();
  while (current) {
    if (current === tagId || visited.has(current)) return null;
    visited.add(current);
    const parent = tagMap.get(current);
    current = parent?.parentId ?? null;
  }
  return parentId;
}

const resolveSafeCategoryParentId = (
  categoryId: string,
  parentId: string | null,
  categoryMap: Map<string, CaseResolverCategory>
): string | null => {
  if (!parentId || !categoryMap.has(parentId) || parentId === categoryId) return null;
  let current: string | null = parentId;
  while (current) {
    if (current === categoryId) return null;
    const parent = categoryMap.get(current);
    current = parent?.parentId ?? null;
  }
  return parentId;
};

export const normalizeCaseResolverCategories = (input: unknown): CaseResolverCategory[] => {
  const now = new Date().toISOString();
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const raw: CaseResolverCategory[] = [];
  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `category-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    raw.push({
      id: rawId,
      name: rawName || `Category ${raw.length + 1}`,
      parentId: sanitizeOptionalId(record['parentId']),
      sortOrder:
        typeof record['sortOrder'] === 'number' && Number.isFinite(record['sortOrder'])
          ? record['sortOrder']
          : index,
      description: typeof record['description'] === 'string' ? record['description'] : '',
      color: normalizeHexColor(record['color'], '#10b981'),
      createdAt: normalizeTimestamp(record['createdAt'], now),
      updatedAt: normalizeTimestamp(record['updatedAt'], now),
    });
  });

  const byId = new Map<string, CaseResolverCategory>(
    raw.map((category: CaseResolverCategory): [string, CaseResolverCategory] => [category.id, category])
  );
  const normalizedParents = raw.map((category: CaseResolverCategory): CaseResolverCategory => ({
    ...category,
    parentId: resolveSafeCategoryParentId(category.id, category.parentId, byId),
  }));

  const grouped = new Map<string, CaseResolverCategory[]>();
  const getGroupKey = (parentId: string | null): string => parentId ?? '__root__';
  normalizedParents.forEach((category: CaseResolverCategory): void => {
    const key = getGroupKey(category.parentId);
    const current = grouped.get(key) ?? [];
    current.push(category);
    grouped.set(key, current);
  });

  const output: CaseResolverCategory[] = [];
  const visit = (parentId: string | null): void => {
    const key = getGroupKey(parentId);
    const group = grouped.get(key) ?? [];
    group
      .sort((left: CaseResolverCategory, right: CaseResolverCategory) => {
        const sortDelta = left.sortOrder - right.sortOrder;
        if (sortDelta !== 0) return sortDelta;
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      })
      .forEach((category: CaseResolverCategory, index: number): void => {
        output.push({
          ...category,
          sortOrder: index,
        });
        visit(category.id);
      });
  };

  visit(null);
  return output;
};

export type CaseResolverCategoryTreeNode = CaseResolverCategory & {
  children: CaseResolverCategoryTreeNode[];
};

export const buildCaseResolverCategoryTree = (
  categories: CaseResolverCategory[]
): CaseResolverCategoryTreeNode[] => {
  const byId = new Map<string, CaseResolverCategoryTreeNode>();
  categories.forEach((category: CaseResolverCategory): void => {
    byId.set(category.id, { ...category, children: [] });
  });

  const roots: CaseResolverCategoryTreeNode[] = [];
  categories.forEach((category: CaseResolverCategory): void => {
    const current = byId.get(category.id);
    if (!current) return;
    if (!category.parentId) {
      roots.push(current);
      return;
    }
    const parent = byId.get(category.parentId);
    if (!parent) {
      roots.push(current);
      return;
    }
    parent.children.push(current);
  });

  const sortNodes = (nodes: CaseResolverCategoryTreeNode[]): void => {
    nodes.sort((left: CaseResolverCategoryTreeNode, right: CaseResolverCategoryTreeNode) => {
      const sortDelta = left.sortOrder - right.sortOrder;
      if (sortDelta !== 0) return sortDelta;
      const nameDelta = left.name.localeCompare(right.name);
      if (nameDelta !== 0) return nameDelta;
      return left.id.localeCompare(right.id);
    });
    nodes.forEach((node: CaseResolverCategoryTreeNode): void => {
      if (node.children.length > 0) sortNodes(node.children);
    });
  };
  sortNodes(roots);

  return roots;
};

export const parseCaseResolverTags = (raw: string | null | undefined): CaseResolverTag[] =>
  normalizeCaseResolverTags(parseJsonSetting<unknown>(raw, []));

export const parseCaseResolverCategories = (raw: string | null | undefined): CaseResolverCategory[] =>
  normalizeCaseResolverCategories(parseJsonSetting<unknown>(raw, []));

const normalizeCaseResolverSettings = (input: unknown): CaseResolverSettings => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return DEFAULT_CASE_RESOLVER_SETTINGS;
  }
  const record = input as Record<string, unknown>;
  const ocrModel = typeof record['ocrModel'] === 'string' ? record['ocrModel'].trim() : '';
  return {
    ocrModel,
  };
};

export const parseCaseResolverSettings = (raw: string | null | undefined): CaseResolverSettings =>
  normalizeCaseResolverSettings(parseJsonSetting<unknown>(raw, DEFAULT_CASE_RESOLVER_SETTINGS));

const ensureDocumentPromptPorts = (
  nodes: AiNode[],
  nodeMeta: Record<string, CaseResolverNodeMeta>,
  documentSourceFileIdByNode: Record<string, string>
): AiNode[] =>
  nodes.map((node: AiNode): AiNode => {
    if (node.type !== 'prompt') return node;
    const isTextNode =
      nodeMeta[node.id]?.role === 'text_note' || Boolean(documentSourceFileIdByNode[node.id]);
    if (!isTextNode) return node;
    const currentInputs = Array.isArray(node.inputs) ? node.inputs : [];
    const currentOutputs = Array.isArray(node.outputs) ? node.outputs : [];
    const nextInputs = [...CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS];
    const nextOutputs = [...CASE_RESOLVER_DOCUMENT_NODE_OUTPUT_PORTS];
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
  });

const sanitizeTextNodeEdgePorts = (
  edges: Edge[],
  textNodeIds: Set<string>
): Edge[] => {
  if (edges.length === 0 || textNodeIds.size === 0) return edges;
  const textfieldPort = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[0] ?? 'textfield';
  const contentPort = CASE_RESOLVER_DOCUMENT_NODE_INPUT_PORTS[1] ?? 'content';

  const normalizeInputPort = (value: string | undefined): string => {
    if (value === textfieldPort || value === contentPort) return value;
    if (value === 'prompt') return textfieldPort;
    return contentPort;
  };

  const normalizeOutputPort = (value: string | undefined): string => {
    if (value === textfieldPort || value === contentPort) return value;
    if (value === 'prompt') return textfieldPort;
    return contentPort;
  };

  return edges.map((edge: Edge): Edge => {
    let nextFromPort = edge.fromPort;
    let nextToPort = edge.toPort;
    if (textNodeIds.has(edge.from)) {
      const normalized = normalizeOutputPort(edge.fromPort);
      if (normalized !== edge.fromPort) {
        nextFromPort = normalized;
      }
    }
    if (textNodeIds.has(edge.to)) {
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

const sanitizeGraph = (graph: unknown): CaseResolverGraph => {
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
  const sanitizedNodeMeta = sanitizeNodeMeta(
    graphRecord['nodeMeta'] as Record<string, CaseResolverNodeMeta> | null | undefined
  );
  const nodes = ensureDocumentPromptPorts(rawNodes, sanitizedNodeMeta, documentSourceFileIdByNode);
  const textNodeIds = new Set<string>(
    nodes
      .filter((node: AiNode): boolean => {
        if (node.type !== 'prompt') return false;
        return (
          sanitizedNodeMeta[node.id]?.role === 'text_note' || Boolean(documentSourceFileIdByNode[node.id])
        );
      })
      .map((node: AiNode): string => node.id)
  );
  const sanitizedEdges = sanitizeTextNodeEdgePorts(edgesByNodeId, textNodeIds);
  const rawDocumentDropNodeId = graphRecord['documentDropNodeId'];
  const documentDropNodeId =
    typeof rawDocumentDropNodeId === 'string' &&
      rawDocumentDropNodeId.trim().length > 0 &&
      validNodeIds.has(rawDocumentDropNodeId)
      ? rawDocumentDropNodeId
      : null;

  return {
    nodes,
    edges: sanitizedEdges,
    nodeMeta: sanitizedNodeMeta,
    edgeMeta: sanitizeEdgeMeta(
      graphRecord['edgeMeta'] as Record<string, CaseResolverEdgeMeta> | null | undefined
    ),
    pdfExtractionPresetId,
    documentFileLinksByNode,
    documentDropNodeId,
    documentSourceFileIdByNode,
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

export const createCaseResolverFile = (input: {
  id: string;
  fileType?: CaseResolverFileType | null | undefined;
  name: string;
  folder?: string;
  documentDate?: string | null | undefined;
  originalDocumentContent?: string | null | undefined;
  explodedDocumentContent?: string | null | undefined;
  activeDocumentVersion?: CaseResolverDocumentVersion | null | undefined;
  documentContent?: string | null | undefined;
  scanSlots?: CaseResolverScanSlot[] | null | undefined;
  isLocked?: boolean | null | undefined;
  graph?: Partial<CaseResolverGraph> | null;
  addresser?: CaseResolverPartyReference | null | undefined;
  addressee?: CaseResolverPartyReference | null | undefined;
  tagId?: string | null | undefined;
  categoryId?: string | null | undefined;
  createdAt?: string;
  updatedAt?: string;
}): CaseResolverFile => {
  const now = new Date().toISOString();
  const createdAt = normalizeTimestamp(input.createdAt, now);
  const updatedAt = normalizeTimestamp(input.updatedAt, createdAt);
  const fallbackDocumentContent =
    typeof input.documentContent === 'string' ? input.documentContent : '';
  const originalDocumentContent =
    typeof input.originalDocumentContent === 'string'
      ? input.originalDocumentContent
      : fallbackDocumentContent;
  const explodedDocumentContent =
    typeof input.explodedDocumentContent === 'string' ? input.explodedDocumentContent : '';
  const requestedVersion = normalizeCaseResolverDocumentVersion(input.activeDocumentVersion);
  const activeDocumentVersion: CaseResolverDocumentVersion =
    requestedVersion === 'exploded' && explodedDocumentContent.trim().length === 0
      ? 'original'
      : requestedVersion;
  const activeDocumentContent =
    activeDocumentVersion === 'exploded' ? explodedDocumentContent : originalDocumentContent;
  return {
    id: input.id,
    fileType: normalizeCaseResolverFileType(input.fileType),
    name: input.name.trim() || 'Untitled Case',
    folder: normalizeFolderPath(input.folder ?? ''),
    documentDate: normalizeDocumentDate(input.documentDate),
    originalDocumentContent,
    explodedDocumentContent,
    activeDocumentVersion,
    documentContent: activeDocumentContent,
    scanSlots: normalizeCaseResolverScanSlots(input.scanSlots),
    isLocked: input.isLocked === true,
    addresser: sanitizePartyReference(input.addresser),
    addressee: sanitizePartyReference(input.addressee),
    tagId: sanitizeOptionalId(input.tagId),
    categoryId: sanitizeOptionalId(input.categoryId),
    createdAt,
    updatedAt,
    graph: sanitizeGraph({
      nodes: input.graph?.nodes ?? [],
      edges: input.graph?.edges ?? [],
      nodeMeta: input.graph?.nodeMeta ?? {},
      edgeMeta: input.graph?.edgeMeta ?? {},
      pdfExtractionPresetId: input.graph?.pdfExtractionPresetId,
      documentFileLinksByNode: input.graph?.documentFileLinksByNode ?? {},
      documentDropNodeId: input.graph?.documentDropNodeId ?? null,
      documentSourceFileIdByNode: input.graph?.documentSourceFileIdByNode ?? {},
    }),
  };
};

export const inferCaseResolverAssetKind = ({
  kind,
  mimeType,
  name,
}: {
  kind?: string | null | undefined;
  mimeType?: string | null | undefined;
  name?: string | null | undefined;
}): CaseResolverAssetKind => {
  const normalizedKind = (kind ?? '').trim().toLowerCase();
  if (
    normalizedKind === 'node_file' ||
    normalizedKind === 'image' ||
    normalizedKind === 'pdf' ||
    normalizedKind === 'file'
  ) {
    return normalizedKind;
  }

  const normalizedMime = (mimeType ?? '').trim().toLowerCase();
  if (normalizedMime.startsWith('image/')) return 'image';
  if (normalizedMime === 'application/pdf') return 'pdf';

  const normalizedName = (name ?? '').trim().toLowerCase();
  if (
    normalizedName.endsWith('.jpg') ||
    normalizedName.endsWith('.jpeg') ||
    normalizedName.endsWith('.png') ||
    normalizedName.endsWith('.webp') ||
    normalizedName.endsWith('.gif') ||
    normalizedName.endsWith('.bmp') ||
    normalizedName.endsWith('.avif') ||
    normalizedName.endsWith('.heic') ||
    normalizedName.endsWith('.heif') ||
    normalizedName.endsWith('.tif') ||
    normalizedName.endsWith('.tiff') ||
    normalizedName.endsWith('.svg')
  ) {
    return 'image';
  }
  if (normalizedName.endsWith('.pdf')) return 'pdf';
  return 'file';
};

const resolveUploadBucketForAssetKind = (
  kind: CaseResolverAssetKind
): 'images' | 'pdfs' | 'files' => {
  if (kind === 'image') return 'images';
  if (kind === 'pdf') return 'pdfs';
  return 'files';
};

export const resolveCaseResolverUploadFolder = ({
  baseFolder,
  kind,
  mimeType,
  name,
}: {
  baseFolder?: string | null | undefined;
  kind?: string | null | undefined;
  mimeType?: string | null | undefined;
  name?: string | null | undefined;
}): string => {
  const base = normalizeFolderPath(baseFolder ?? '');
  const inferredKind = inferCaseResolverAssetKind({ kind, mimeType, name });

  if (inferredKind === 'node_file') {
    return base;
  }

  const bucket = resolveUploadBucketForAssetKind(inferredKind);
  return normalizeFolderPath(base ? `${base}/${bucket}` : bucket);
};

export const createCaseResolverAssetFile = (input: {
  id: string;
  name: string;
  folder?: string;
  kind?: string | null | undefined;
  filepath?: string | null | undefined;
  sourceFileId?: string | null | undefined;
  mimeType?: string | null | undefined;
  size?: number | null | undefined;
  textContent?: string | null | undefined;
  description?: string | null | undefined;
  createdAt?: string;
  updatedAt?: string;
}): CaseResolverAssetFile => {
  const now = new Date().toISOString();
  const createdAt = normalizeTimestamp(input.createdAt, now);
  const updatedAt = normalizeTimestamp(input.updatedAt, createdAt);
  return {
    id: input.id,
    name: input.name.trim() || 'Untitled File',
    folder: normalizeFolderPath(input.folder ?? ''),
    kind: inferCaseResolverAssetKind({ kind: input.kind, mimeType: input.mimeType, name: input.name }),
    filepath:
      typeof input.filepath === 'string' && input.filepath.trim().length > 0
        ? input.filepath.trim()
        : null,
    sourceFileId:
      typeof input.sourceFileId === 'string' && input.sourceFileId.trim().length > 0
        ? input.sourceFileId.trim()
        : null,
    mimeType:
      typeof input.mimeType === 'string' && input.mimeType.trim().length > 0
        ? input.mimeType.trim().toLowerCase()
        : null,
    size:
      typeof input.size === 'number' && Number.isFinite(input.size) && input.size >= 0
        ? Math.round(input.size)
        : null,
    textContent:
      typeof input.textContent === 'string'
        ? input.textContent
        : '',
    description:
      typeof input.description === 'string'
        ? input.description
        : '',
    createdAt,
    updatedAt,
  };
};

const normalizeCaseResolverFolderTimestamps = ({
  source,
  folders,
  files,
  assets,
  fallbackTimestamp,
}: {
  source: unknown;
  folders: string[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
  fallbackTimestamp: string;
}): Record<string, CaseResolverFolderTimestamp> => {
  const sourceRecord =
    source && typeof source === 'object' && !Array.isArray(source)
      ? (source as Record<string, unknown>)
      : {};

  const contentStatsByFolder = new Map<string, { createdAt: string; updatedAt: string }>();
  const registerContentTimestamps = (folderPath: string, createdAt: string, updatedAt: string): void => {
    const ancestors = expandFolderPath(folderPath);
    ancestors.forEach((ancestor: string): void => {
      const current = contentStatsByFolder.get(ancestor);
      if (!current) {
        contentStatsByFolder.set(ancestor, { createdAt, updatedAt });
        return;
      }
      contentStatsByFolder.set(ancestor, {
        createdAt: pickEarliestTimestamp([current.createdAt, createdAt], current.createdAt),
        updatedAt: pickLatestTimestamp([current.updatedAt, updatedAt], current.updatedAt),
      });
    });
  };

  files.forEach((file: CaseResolverFile): void => {
    registerContentTimestamps(
      file.folder,
      normalizeTimestamp(file.createdAt, fallbackTimestamp),
      normalizeTimestamp(file.updatedAt, normalizeTimestamp(file.createdAt, fallbackTimestamp))
    );
  });
  assets.forEach((asset: CaseResolverAssetFile): void => {
    registerContentTimestamps(
      asset.folder,
      normalizeTimestamp(asset.createdAt, fallbackTimestamp),
      normalizeTimestamp(asset.updatedAt, normalizeTimestamp(asset.createdAt, fallbackTimestamp))
    );
  });

  const folderTimestamps: Record<string, CaseResolverFolderTimestamp> = {};
  folders.forEach((folderPath: string): void => {
    const rawEntry = sourceRecord[folderPath];
    const entryRecord =
      rawEntry && typeof rawEntry === 'object' && !Array.isArray(rawEntry)
        ? (rawEntry as Record<string, unknown>)
        : {};

    const recordedCreatedAt = normalizeTimestamp(entryRecord['createdAt'], fallbackTimestamp);
    const recordedUpdatedAt = normalizeTimestamp(entryRecord['updatedAt'], recordedCreatedAt);
    const contentStats = contentStatsByFolder.get(folderPath);

    const createdAt = pickEarliestTimestamp(
      [recordedCreatedAt, contentStats?.createdAt],
      recordedCreatedAt
    );
    const updatedAt = pickLatestTimestamp(
      [recordedUpdatedAt, contentStats?.updatedAt, createdAt],
      recordedUpdatedAt
    );

    folderTimestamps[folderPath] = {
      createdAt,
      updatedAt,
    };
  });

  return folderTimestamps;
};

export const createDefaultCaseResolverWorkspace = (): CaseResolverWorkspace => {
  const firstFile = createCaseResolverFile({
    id: 'case-file-default',
    name: 'Case 1',
    folder: '',
    graph: createEmptyCaseResolverGraph(),
  });
  return {
    version: 2,
    folders: [],
    folderTimestamps: {},
    files: [firstFile],
    assets: [],
    activeFileId: firstFile.id,
  };
};

export const normalizeCaseResolverWorkspace = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspace => {
  if (!workspace || typeof workspace !== 'object') {
    return createDefaultCaseResolverWorkspace();
  }
  const workspaceRecord = workspace as unknown as Record<string, unknown>;
  const now = new Date().toISOString();

  const rawFiles = Array.isArray(workspace.files) ? workspace.files : [];
  const fileIds = new Set<string>();
  const files = rawFiles
    .filter((file): file is CaseResolverFile => Boolean(file) && typeof file === 'object')
    .map((file: CaseResolverFile): CaseResolverFile | null => {
      const id = typeof file.id === 'string' && file.id.trim() ? file.id : '';
      if (!id || fileIds.has(id)) {
        return null;
      }
      fileIds.add(id);
      return createCaseResolverFile({
        id,
        fileType: file.fileType,
        name: file.name,
        folder: file.folder,
        documentDate: file.documentDate,
        originalDocumentContent: file.originalDocumentContent,
        explodedDocumentContent: file.explodedDocumentContent,
        activeDocumentVersion: file.activeDocumentVersion,
        documentContent: file.documentContent,
        scanSlots: file.scanSlots,
        isLocked: file.isLocked,
        graph: file.graph,
        addresser: file.addresser,
        addressee: file.addressee,
        tagId: file.tagId,
        categoryId: file.categoryId,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      });
    })
    .filter((file: CaseResolverFile | null): file is CaseResolverFile => Boolean(file));

  const normalizedFiles = files.length > 0 ? files : createDefaultCaseResolverWorkspace().files;
  const rawAssets = Array.isArray(workspaceRecord['assets'])
    ? (workspaceRecord['assets'] as CaseResolverAssetFile[])
    : [];
  const assetIds = new Set<string>();
  const assets = rawAssets
    .filter((asset): asset is CaseResolverAssetFile => Boolean(asset) && typeof asset === 'object')
    .map((asset: CaseResolverAssetFile): CaseResolverAssetFile | null => {
      const id = typeof asset.id === 'string' && asset.id.trim() ? asset.id : '';
      if (!id || assetIds.has(id)) {
        return null;
      }
      assetIds.add(id);
      return createCaseResolverAssetFile({
        id,
        name: asset.name,
        folder: asset.folder,
        kind: asset.kind,
        filepath: asset.filepath,
        sourceFileId: asset.sourceFileId,
        mimeType: asset.mimeType,
        size: asset.size,
        textContent: asset.textContent,
        description: asset.description,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      });
    })
    .filter((asset: CaseResolverAssetFile | null): asset is CaseResolverAssetFile => Boolean(asset));

  const folderCandidates = [
    ...(Array.isArray(workspace.folders) ? workspace.folders : []),
    ...normalizedFiles.map((file: CaseResolverFile) => file.folder),
    ...assets.map((asset: CaseResolverAssetFile) => asset.folder),
  ];
  const folders = normalizeFolderPaths(folderCandidates);
  const folderTimestamps = normalizeCaseResolverFolderTimestamps({
    source: workspaceRecord['folderTimestamps'],
    folders,
    files: normalizedFiles,
    assets,
    fallbackTimestamp: now,
  });

  const activeCandidate =
    typeof workspace.activeFileId === 'string' && workspace.activeFileId.trim().length > 0
      ? workspace.activeFileId
      : null;
  const activeFileId =
    activeCandidate && normalizedFiles.some((file: CaseResolverFile) => file.id === activeCandidate)
      ? activeCandidate
      : normalizedFiles[0]?.id ?? null;

  return {
    version: 2,
    folders,
    folderTimestamps,
    files: normalizedFiles,
    assets,
    activeFileId,
  };
};

export const parseCaseResolverWorkspace = (
  raw: string | null | undefined
): CaseResolverWorkspace => {
  const parsed = parseJsonSetting<CaseResolverWorkspace | null>(raw, null);
  return normalizeCaseResolverWorkspace(parsed);
};

export const upsertFileGraph = (
  workspace: CaseResolverWorkspace,
  fileId: string,
  graph: CaseResolverGraph
): CaseResolverWorkspace => {
  const nextFiles = workspace.files.map((file: CaseResolverFile): CaseResolverFile => {
    if (file.id !== fileId) return file;
    return {
      ...file,
      graph: sanitizeGraph(graph),
      updatedAt: new Date().toISOString(),
    };
  });

  return normalizeCaseResolverWorkspace({
    ...workspace,
    files: nextFiles,
  });
};

export const renameFolderPath = (
  value: string,
  sourceFolder: string,
  targetFolder: string
): string => {
  const normalizedValue = normalizeFolderPath(value);
  const normalizedSource = normalizeFolderPath(sourceFolder);
  const normalizedTarget = normalizeFolderPath(targetFolder);
  if (!normalizedSource) return normalizedValue;
  if (normalizedValue === normalizedSource) return normalizedTarget;
  if (normalizedValue.startsWith(`${normalizedSource}/`)) {
    const suffix = normalizedValue.slice(normalizedSource.length + 1);
    if (!normalizedTarget) return suffix;
    return `${normalizedTarget}/${suffix}`;
  }
  return normalizedValue;
};
