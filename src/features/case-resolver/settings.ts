import type { AiNode, Edge } from '@/features/ai/ai-paths/lib';
import { parseJsonSetting } from '@/shared/utils/settings-json';

import {
  DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
  DEFAULT_CASE_RESOLVER_EDGE_META,
  DEFAULT_CASE_RESOLVER_NODE_META,
  type CaseResolverAssetFile,
  type CaseResolverAssetKind,
  type CaseResolverEdgeMeta,
  type CaseResolverFile,
  type CaseResolverGraph,
  type CaseResolverNodeMeta,
  type CaseResolverPdfExtractionPresetId,
  type CaseResolverWorkspace,
} from './types';

export const CASE_RESOLVER_WORKSPACE_KEY = 'case_resolver_workspace_v1';

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

const sanitizeGraph = (graph: unknown): CaseResolverGraph => {
  const graphRecord = graph && typeof graph === 'object' ? (graph as Record<string, unknown>) : {};
  const nodes = Array.isArray(graphRecord['nodes']) ? (graphRecord['nodes'] as AiNode[]) : [];
  const edges = Array.isArray(graphRecord['edges']) ? (graphRecord['edges'] as Edge[]) : [];
  const validNodeIds = new Set<string>(
    nodes
      .map((node: AiNode) => (typeof node?.id === 'string' ? node.id : ''))
      .filter(Boolean)
  );
  const sanitizedEdges = edges.filter(
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

  return {
    nodes,
    edges: sanitizedEdges,
    nodeMeta: sanitizeNodeMeta(
      graphRecord['nodeMeta'] as Record<string, CaseResolverNodeMeta> | null | undefined
    ),
    edgeMeta: sanitizeEdgeMeta(
      graphRecord['edgeMeta'] as Record<string, CaseResolverEdgeMeta> | null | undefined
    ),
    pdfExtractionPresetId,
  };
};

export const createEmptyCaseResolverGraph = (): CaseResolverGraph => ({
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  pdfExtractionPresetId: DEFAULT_CASE_RESOLVER_PDF_EXTRACTION_PRESET_ID,
});

export const createCaseResolverFile = (input: {
  id: string;
  name: string;
  folder?: string;
  graph?: Partial<CaseResolverGraph> | null;
  createdAt?: string;
  updatedAt?: string;
}): CaseResolverFile => {
  const now = new Date().toISOString();
  return {
    id: input.id,
    name: input.name.trim() || 'Untitled Case',
    folder: normalizeFolderPath(input.folder ?? ''),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    graph: sanitizeGraph({
      nodes: input.graph?.nodes ?? [],
      edges: input.graph?.edges ?? [],
      nodeMeta: input.graph?.nodeMeta ?? {},
      edgeMeta: input.graph?.edgeMeta ?? {},
      pdfExtractionPresetId: input.graph?.pdfExtractionPresetId,
    }),
  };
};

const normalizeAssetKind = (
  kind: string | null | undefined,
  mimeType: string | null | undefined,
  name: string | null | undefined
): CaseResolverAssetKind => {
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
  if (normalizedName.endsWith('.pdf')) return 'pdf';
  return 'file';
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
  return {
    id: input.id,
    name: input.name.trim() || 'Untitled File',
    folder: normalizeFolderPath(input.folder ?? ''),
    kind: normalizeAssetKind(input.kind, input.mimeType, input.name),
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
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
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
        name: file.name,
        folder: file.folder,
        graph: file.graph,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
      });
    })
    .filter((file: CaseResolverFile | null): file is CaseResolverFile => Boolean(file));

  const normalizedFiles = files.length > 0 ? files : createDefaultCaseResolverWorkspace().files;
  const workspaceRecord = workspace as unknown as Record<string, unknown>;
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
