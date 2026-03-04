import {
  type CaseResolverAssetFile,
  type CaseResolverFile,
  type CaseResolverFileType,
  type CaseResolverFolderRecord,
  type CaseResolverWorkspace,
  type CaseResolverWorkspaceNormalizationDiagnostics,
} from '@/shared/contracts/case-resolver';
import { CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP } from './settings.constants';
import {
  normalizeCaseResolverFileType,
  normalizeFolderPaths,
  normalizeOptionalTimestamp,
  normalizeTimestamp,
  normalizeWorkspaceRevision,
  sanitizeOptionalId,
} from './settings.helpers';
import { createCaseResolverFile, normalizeCaseResolverRelatedFileLinks } from './settings.files';
import {
  sanitizeCaseResolverGraphNodeFileRelations,
  sanitizeCaseResolverNodeFileAssetSnapshots,
} from './nodefile-relations';
import {
  buildCaseResolverFolderRecords,
  parseCaseResolverFolderRecords,
} from './settings-folder-records';
import * as caseResolverRelationGraph from './settings-relation-graph';
import {
  createCaseResolverAssetFile,
  normalizeCaseResolverFolderTimestamps,
} from './settings-workspace-helpers';

const CASE_RESOLVER_WORKSPACE_NORMALIZATION_DIAGNOSTICS_EMPTY: CaseResolverWorkspaceNormalizationDiagnostics =
  {
    ownershipRepairedCount: 0,
    ownershipUnresolvedCount: 0,
    droppedDuplicateCount: 0,
  };

const caseResolverWorkspaceNormalizationDiagnosticsByWorkspace = new WeakMap<
  CaseResolverWorkspace,
  CaseResolverWorkspaceNormalizationDiagnostics
>();

export type CaseResolverWorkspaceLegacySanitizationDiagnostics = {
  inlineNodeFileSnapshotStrippedCount: number;
  fileGraphFallbackDropCount: number;
  relationGraphFallbackDropped: boolean;
  orphanParentLinksClearedCount: number;
};

const CASE_RESOLVER_WORKSPACE_LEGACY_SANITIZATION_DIAGNOSTICS_EMPTY: CaseResolverWorkspaceLegacySanitizationDiagnostics =
  {
    inlineNodeFileSnapshotStrippedCount: 0,
    fileGraphFallbackDropCount: 0,
    relationGraphFallbackDropped: false,
    orphanParentLinksClearedCount: 0,
  };

const caseResolverWorkspaceLegacySanitizationDiagnosticsByWorkspace = new WeakMap<
  CaseResolverWorkspace,
  CaseResolverWorkspaceLegacySanitizationDiagnostics
>();

const normalizeCaseResolverWorkspaceDiagnostics = (
  diagnostics: Partial<CaseResolverWorkspaceNormalizationDiagnostics> | null | undefined
): CaseResolverWorkspaceNormalizationDiagnostics => ({
  ownershipRepairedCount: Math.max(0, Math.floor(diagnostics?.ownershipRepairedCount ?? 0)),
  ownershipUnresolvedCount: Math.max(0, Math.floor(diagnostics?.ownershipUnresolvedCount ?? 0)),
  droppedDuplicateCount: Math.max(0, Math.floor(diagnostics?.droppedDuplicateCount ?? 0)),
});

const attachCaseResolverWorkspaceNormalizationDiagnostics = (
  workspace: CaseResolverWorkspace,
  diagnostics: Partial<CaseResolverWorkspaceNormalizationDiagnostics> | null | undefined
): CaseResolverWorkspace => {
  caseResolverWorkspaceNormalizationDiagnosticsByWorkspace.set(
    workspace,
    normalizeCaseResolverWorkspaceDiagnostics(diagnostics)
  );
  return workspace;
};

const normalizeLegacySanitizationDiagnostics = (
  diagnostics: Partial<CaseResolverWorkspaceLegacySanitizationDiagnostics> | null | undefined
): CaseResolverWorkspaceLegacySanitizationDiagnostics => ({
  inlineNodeFileSnapshotStrippedCount: Math.max(
    0,
    Math.floor(diagnostics?.inlineNodeFileSnapshotStrippedCount ?? 0)
  ),
  fileGraphFallbackDropCount: Math.max(0, Math.floor(diagnostics?.fileGraphFallbackDropCount ?? 0)),
  relationGraphFallbackDropped: diagnostics?.relationGraphFallbackDropped === true,
  orphanParentLinksClearedCount: Math.max(
    0,
    Math.floor(diagnostics?.orphanParentLinksClearedCount ?? 0)
  ),
});

const attachCaseResolverWorkspaceLegacySanitizationDiagnostics = (
  workspace: CaseResolverWorkspace,
  diagnostics: Partial<CaseResolverWorkspaceLegacySanitizationDiagnostics> | null | undefined
): CaseResolverWorkspace => {
  caseResolverWorkspaceLegacySanitizationDiagnosticsByWorkspace.set(
    workspace,
    normalizeLegacySanitizationDiagnostics(diagnostics)
  );
  return workspace;
};

export const getCaseResolverWorkspaceNormalizationDiagnostics = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspaceNormalizationDiagnostics =>
  workspace
    ? (caseResolverWorkspaceNormalizationDiagnosticsByWorkspace.get(workspace) ??
      CASE_RESOLVER_WORKSPACE_NORMALIZATION_DIAGNOSTICS_EMPTY)
    : CASE_RESOLVER_WORKSPACE_NORMALIZATION_DIAGNOSTICS_EMPTY;

export const getCaseResolverWorkspaceLegacySanitizationDiagnostics = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspaceLegacySanitizationDiagnostics =>
  workspace
    ? (caseResolverWorkspaceLegacySanitizationDiagnosticsByWorkspace.get(workspace) ??
      CASE_RESOLVER_WORKSPACE_LEGACY_SANITIZATION_DIAGNOSTICS_EMPTY)
    : CASE_RESOLVER_WORKSPACE_LEGACY_SANITIZATION_DIAGNOSTICS_EMPTY;

const resolveSafeCaseParentId = (
  caseId: string,
  caseType: CaseResolverFileType,
  parentCaseId: string | null,
  caseMap: Map<string, CaseResolverFile>
): string | null => {
  if (!parentCaseId || parentCaseId === caseId) return null;
  const parentCase = caseMap.get(parentCaseId);
  if (parentCase?.fileType !== 'case') return null;
  if (caseType !== 'case') return parentCaseId;
  let current: string | null = parentCaseId;
  const visited = new Set<string>();
  while (current) {
    if (current === caseId || visited.has(current)) return null;
    visited.add(current);
    const parent = caseMap.get(current);
    if (parent?.fileType !== 'case') return null;
    current = parent.parentCaseId ?? null;
  }
  return parentCaseId;
};

const CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_METADATA_KEY = 'nodeFileSnapshotStorage';
const CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_KEYED = 'keyed';

export const sanitizeLegacyCaseResolverWorkspacePayload = (
  workspaceRecord: Record<string, unknown>
): {
  workspaceRecord: Record<string, unknown>;
  diagnostics: CaseResolverWorkspaceLegacySanitizationDiagnostics;
} => {
  const diagnostics: CaseResolverWorkspaceLegacySanitizationDiagnostics = {
    ...CASE_RESOLVER_WORKSPACE_LEGACY_SANITIZATION_DIAGNOSTICS_EMPTY,
  };
  const nextWorkspaceRecord: Record<string, unknown> = { ...workspaceRecord };

  if (Array.isArray(nextWorkspaceRecord['assets'])) {
    nextWorkspaceRecord['assets'] = (nextWorkspaceRecord['assets'] as unknown[]).map(
      (assetEntry: unknown): unknown => {
        if (!assetEntry || typeof assetEntry !== 'object' || Array.isArray(assetEntry)) {
          return assetEntry;
        }
        const assetRecord = assetEntry as Record<string, unknown>;
        const kind = typeof assetRecord['kind'] === 'string' ? assetRecord['kind'].trim() : '';
        const textContent =
          typeof assetRecord['textContent'] === 'string' ? assetRecord['textContent'].trim() : '';
        if (kind !== 'node_file' || textContent.length === 0) {
          return assetEntry;
        }
        diagnostics.inlineNodeFileSnapshotStrippedCount += 1;
        const metadata =
          assetRecord['metadata'] &&
          typeof assetRecord['metadata'] === 'object' &&
          !Array.isArray(assetRecord['metadata'])
            ? ({ ...(assetRecord['metadata'] as Record<string, unknown>) } as Record<string, unknown>)
            : {};
        metadata[CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_METADATA_KEY] =
          CASE_RESOLVER_NODE_FILE_SNAPSHOT_STORAGE_KEYED;
        return {
          ...assetRecord,
          textContent: '',
          metadata,
        };
      }
    );
  }

  return {
    workspaceRecord: nextWorkspaceRecord,
    diagnostics,
  };
};

export const createDefaultCaseResolverWorkspace = (): CaseResolverWorkspace => {
  const relationGraph = caseResolverRelationGraph.buildCaseResolverRelationGraph({
    source: null,
    folders: [],
    files: [],
    assets: [],
  });
  return attachCaseResolverWorkspaceNormalizationDiagnostics(
    {
      id: 'empty',
      ownerId: 'system',
      isPublic: false,
      name: 'Default Empty Workspace',
      version: 2,
      workspaceRevision: 0,
      lastMutationId: null,
      lastMutationAt: null,
      folders: [],
      folderRecords: [],
      folderTimestamps: {},
      files: [],
      assets: [],
      relationGraph,
      activeFileId: null,
      createdAt: new Date().toISOString(),
      updatedAt: null,
    },
    CASE_RESOLVER_WORKSPACE_NORMALIZATION_DIAGNOSTICS_EMPTY
  );
};

export const normalizeCaseResolverWorkspaceWithDiagnostics = (
  workspace: CaseResolverWorkspace | null | undefined
): {
  workspace: CaseResolverWorkspace;
  diagnostics: CaseResolverWorkspaceNormalizationDiagnostics;
} => {
  if (!workspace || typeof workspace !== 'object') {
    return {
      workspace: createDefaultCaseResolverWorkspace(),
      diagnostics: CASE_RESOLVER_WORKSPACE_NORMALIZATION_DIAGNOSTICS_EMPTY,
    };
  }
  const rawWorkspaceRecord = workspace as unknown as Record<string, unknown>;
  const sanitizedLegacyPayload = sanitizeLegacyCaseResolverWorkspacePayload(rawWorkspaceRecord);
  const workspaceRecord = sanitizedLegacyPayload.workspaceRecord;
  const legacySanitizationDiagnostics = sanitizedLegacyPayload.diagnostics;
  const now = new Date().toISOString();
  const workspaceRevision = normalizeWorkspaceRevision(workspaceRecord['workspaceRevision']);
  const lastMutationId = sanitizeOptionalId(workspaceRecord['lastMutationId']);
  const lastMutationAt = normalizeOptionalTimestamp(workspaceRecord['lastMutationAt']);
  let droppedDuplicateCount = 0;
  let ownershipRepairedCount = 0;

  const rawFiles = Array.isArray(workspaceRecord['files'])
    ? (workspaceRecord['files'] as CaseResolverFile[])
    : [];
  const rawChildParentIds = new Set<string>();
  rawFiles.forEach((entry: unknown): void => {
    if (!entry || typeof entry !== 'object') return;
    const entryRecord = entry as Record<string, unknown>;
    const parentCaseId = sanitizeOptionalId(entryRecord['parentCaseId']);
    if (parentCaseId) {
      rawChildParentIds.add(parentCaseId);
    }
  });
  const fileIds = new Set<string>();
  const files = rawFiles
    .filter((file): file is CaseResolverFile => Boolean(file) && typeof file === 'object')
    .map((file: CaseResolverFile): CaseResolverFile | null => {
      const id = typeof file.id === 'string' && file.id.trim() ? file.id : '';
      if (!id || fileIds.has(id)) {
        droppedDuplicateCount += 1;
        return null;
      }
      fileIds.add(id);
      const fileRecord = file as unknown as Record<string, unknown>;
      const rawFileType = fileRecord['fileType'];
      const normalizedRawFileType = normalizeCaseResolverFileType(rawFileType);
      const shouldForceCaseType =
        fileRecord['isCaseContainer'] === true || rawChildParentIds.has(id);
      const normalizedFileType: CaseResolverFileType =
        shouldForceCaseType && normalizedRawFileType !== 'scanfile'
          ? 'case'
          : normalizedRawFileType;
      const normalizedCreatedAt = normalizeTimestamp(
        file.createdAt,
        CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP
      );
      const normalizedUpdatedAt = normalizeTimestamp(file.updatedAt, normalizedCreatedAt);
      try {
        return createCaseResolverFile({
          ...file,
          id,
          fileType: normalizedFileType,
          createdAt: normalizedCreatedAt,
          updatedAt: normalizedUpdatedAt,
        });
      } catch {
        legacySanitizationDiagnostics.fileGraphFallbackDropCount += 1;
        return null;
      }
    })
    .filter((file: CaseResolverFile | null): file is CaseResolverFile => Boolean(file));

  const normalizedFilesBase = files;
  const caseFilesById = new Map<string, CaseResolverFile>(
    normalizedFilesBase
      .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      .map((file: CaseResolverFile): [string, CaseResolverFile] => [file.id, file])
  );
  const validReferenceCaseIds = new Set<string>(caseFilesById.keys());
  let orphanParentLinksClearedCount = 0;
  const normalizedFilesWithCaseRelations = normalizedFilesBase.map(
    (file: CaseResolverFile): CaseResolverFile => {
      const parentCaseId = resolveSafeCaseParentId(
        file.id,
        file.fileType,
        file.parentCaseId ?? null,
        caseFilesById
      );
      if ((file.parentCaseId ?? null) !== null && parentCaseId === null) {
        orphanParentLinksClearedCount += 1;
      }
      const referenceCaseIds = file.referenceCaseIds.filter(
        (referenceId: string): boolean =>
          referenceId !== file.id && validReferenceCaseIds.has(referenceId)
      );
      const uniqueReferenceCaseIds = Array.from(new Set(referenceCaseIds));
      return {
        ...file,
        parentCaseId,
        referenceCaseIds: uniqueReferenceCaseIds,
      };
    }
  );
  const normalizedFiles = normalizedFilesWithCaseRelations;
  const rawAssets = Array.isArray(workspaceRecord['assets'])
    ? (workspaceRecord['assets'] as CaseResolverAssetFile[])
    : [];
  const assetIds = new Set<string>();
  const assets = rawAssets
    .filter((asset): asset is CaseResolverAssetFile => Boolean(asset) && typeof asset === 'object')
    .map((asset: CaseResolverAssetFile): CaseResolverAssetFile | null => {
      const id = typeof asset.id === 'string' && asset.id.trim() ? asset.id : '';
      if (!id || assetIds.has(id)) {
        droppedDuplicateCount += 1;
        return null;
      }
      assetIds.add(id);
      const normalizedCreatedAt = normalizeTimestamp(
        asset.createdAt,
        CASE_RESOLVER_NORMALIZATION_FALLBACK_TIMESTAMP
      );
      const normalizedUpdatedAt = normalizeTimestamp(asset.updatedAt, normalizedCreatedAt);
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
        metadata: asset.metadata,
        createdAt: normalizedCreatedAt,
        updatedAt: normalizedUpdatedAt,
      });
    })
    .filter((asset: CaseResolverAssetFile | null): asset is CaseResolverAssetFile =>
      Boolean(asset)
    );

  const filesWithSanitizedGraph = normalizedFiles.map(
    (file: CaseResolverFile): CaseResolverFile => {
      const sanitizedGraph = sanitizeCaseResolverGraphNodeFileRelations({
        graph: file.graph || { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
        assets,
        files: normalizedFiles,
      });
      if (sanitizedGraph === file.graph) return file;
      return {
        ...file,
        graph: sanitizedGraph,
      };
    }
  );
  const sanitizedAssets = sanitizeCaseResolverNodeFileAssetSnapshots({
    assets,
    files: filesWithSanitizedGraph,
  });

  const sanitizedFiles = filesWithSanitizedGraph.map((file: CaseResolverFile): CaseResolverFile => {
    const sanitizedGraph = sanitizeCaseResolverGraphNodeFileRelations({
      graph: file.graph || { nodes: [], edges: [], nodeMeta: {}, edgeMeta: {} },
      assets: sanitizedAssets,
      files: filesWithSanitizedGraph,
    });
    if (sanitizedGraph === file.graph) return file;
    return {
      ...file,
      graph: sanitizedGraph,
    };
  });
  const normalizedFilesWithRelatedLinks = normalizeCaseResolverRelatedFileLinks(sanitizedFiles);
  const validCaseIds = new Set<string>(
    normalizedFilesWithRelatedLinks
      .filter((file: CaseResolverFile): boolean => file.fileType === 'case')
      .map((file: CaseResolverFile): string => file.id)
  );

  const sourceFolderRecords = parseCaseResolverFolderRecords(
    workspaceRecord['folderRecords'],
    validCaseIds
  );
  const folderRecords = buildCaseResolverFolderRecords({
    sourceRecords: sourceFolderRecords,
    files: normalizedFilesWithRelatedLinks,
    assets: sanitizedAssets,
    validCaseIds,
  });
  const folders = normalizeFolderPaths([
    ...folderRecords.map((record: CaseResolverFolderRecord): string => record.path),
    ...normalizedFilesWithRelatedLinks.map((file: CaseResolverFile): string => file.folder),
    ...sanitizedAssets.map((asset: CaseResolverAssetFile): string => asset.folder),
  ]);
  const folderTimestamps = normalizeCaseResolverFolderTimestamps({
    source: workspaceRecord['folderTimestamps'],
    folders,
    files: normalizedFilesWithRelatedLinks,
    assets: sanitizedAssets,
    fallbackTimestamp: now,
  });
  let relationGraph: ReturnType<typeof caseResolverRelationGraph.buildCaseResolverRelationGraph>;
  try {
    relationGraph = caseResolverRelationGraph.buildCaseResolverRelationGraph({
      source: workspaceRecord['relationGraph'],
      folders,
      files: normalizedFilesWithRelatedLinks,
      assets: sanitizedAssets,
    });
  } catch {
    legacySanitizationDiagnostics.relationGraphFallbackDropped = true;
    relationGraph = caseResolverRelationGraph.buildCaseResolverRelationGraph({
      source: null,
      folders,
      files: normalizedFilesWithRelatedLinks,
      assets: sanitizedAssets,
    });
  }

  const activeCandidate =
    typeof workspaceRecord['activeFileId'] === 'string' &&
    workspaceRecord['activeFileId'].trim().length > 0
      ? workspaceRecord['activeFileId'].trim()
      : null;
  const activeFileId =
    activeCandidate &&
    normalizedFilesWithRelatedLinks.some((file: CaseResolverFile) => file.id === activeCandidate)
      ? activeCandidate
      : (normalizedFilesWithRelatedLinks[0]?.id ?? null);

  const ownershipUnresolvedCount = normalizedFilesWithRelatedLinks.filter(
    (file: CaseResolverFile): boolean => file.fileType !== 'case' && !file.parentCaseId
  ).length;
  const diagnostics: CaseResolverWorkspaceNormalizationDiagnostics = {
    ownershipRepairedCount,
    ownershipUnresolvedCount,
    droppedDuplicateCount,
  };
  const normalizedWorkspace: CaseResolverWorkspace = {
    id: typeof workspaceRecord['id'] === 'string' ? workspaceRecord['id'] : 'default',
    ownerId: typeof workspaceRecord['ownerId'] === 'string' ? workspaceRecord['ownerId'] : 'system',
    isPublic: workspaceRecord['isPublic'] === true,
    name: typeof workspaceRecord['name'] === 'string' ? workspaceRecord['name'] : 'Workspace',
    version: 2,
    workspaceRevision,
    lastMutationId,
    lastMutationAt,
    folders,
    folderRecords,
    folderTimestamps,
    files: normalizedFilesWithRelatedLinks,
    assets: sanitizedAssets,
    relationGraph,
    activeFileId,
    createdAt: normalizeTimestamp(workspaceRecord['createdAt'], now),
    updatedAt: normalizeOptionalTimestamp(workspaceRecord['updatedAt']),
  };
  const workspaceWithDiagnostics = attachCaseResolverWorkspaceNormalizationDiagnostics(
    normalizedWorkspace,
    diagnostics
  );
  attachCaseResolverWorkspaceLegacySanitizationDiagnostics(
    workspaceWithDiagnostics,
    {
      ...legacySanitizationDiagnostics,
      orphanParentLinksClearedCount,
    }
  );
  return {
    workspace: workspaceWithDiagnostics,
    diagnostics,
  };
};

export const normalizeCaseResolverWorkspace = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspace => normalizeCaseResolverWorkspaceWithDiagnostics(workspace).workspace;
