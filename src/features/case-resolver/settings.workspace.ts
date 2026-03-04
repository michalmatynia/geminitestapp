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
import { sanitizeCaseResolverGraphNodeFileRelations } from './nodefile-relations';
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

export const getCaseResolverWorkspaceNormalizationDiagnostics = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspaceNormalizationDiagnostics =>
  workspace
    ? (caseResolverWorkspaceNormalizationDiagnosticsByWorkspace.get(workspace) ??
      CASE_RESOLVER_WORKSPACE_NORMALIZATION_DIAGNOSTICS_EMPTY)
    : CASE_RESOLVER_WORKSPACE_NORMALIZATION_DIAGNOSTICS_EMPTY;

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
  const workspaceRecord = workspace as unknown as Record<string, unknown>;
  const now = new Date().toISOString();
  const workspaceRevision = normalizeWorkspaceRevision(workspaceRecord['workspaceRevision']);
  const lastMutationId = sanitizeOptionalId(workspaceRecord['lastMutationId']);
  const lastMutationAt = normalizeOptionalTimestamp(workspaceRecord['lastMutationAt']);
  let droppedDuplicateCount = 0;
  let ownershipRepairedCount = 0;

  const rawFiles = Array.isArray(workspaceRecord['files'])
    ? (workspaceRecord['files'] as CaseResolverFile[])
    : [];
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
      const normalizedFileType: CaseResolverFileType = normalizeCaseResolverFileType(rawFileType);
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
  const normalizedFilesWithCaseRelations = normalizedFilesBase.map(
    (file: CaseResolverFile): CaseResolverFile => {
      const parentCaseId = resolveSafeCaseParentId(
        file.id,
        file.fileType,
        file.parentCaseId ?? null,
        caseFilesById
      );
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

  const sanitizedFiles = normalizedFiles.map((file: CaseResolverFile): CaseResolverFile => {
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
    assets,
    validCaseIds,
  });
  const folders = normalizeFolderPaths([
    ...folderRecords.map((record: CaseResolverFolderRecord): string => record.path),
    ...normalizedFilesWithRelatedLinks.map((file: CaseResolverFile): string => file.folder),
    ...assets.map((asset: CaseResolverAssetFile): string => asset.folder),
  ]);
  const folderTimestamps = normalizeCaseResolverFolderTimestamps({
    source: workspaceRecord['folderTimestamps'],
    folders,
    files: normalizedFilesWithRelatedLinks,
    assets,
    fallbackTimestamp: now,
  });
  let relationGraph: ReturnType<typeof caseResolverRelationGraph.buildCaseResolverRelationGraph>;
  try {
    relationGraph = caseResolverRelationGraph.buildCaseResolverRelationGraph({
      source: workspaceRecord['relationGraph'],
      folders,
      files: normalizedFilesWithRelatedLinks,
      assets,
    });
  } catch {
    relationGraph = caseResolverRelationGraph.buildCaseResolverRelationGraph({
      source: null,
      folders,
      files: normalizedFilesWithRelatedLinks,
      assets,
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
    assets,
    relationGraph,
    activeFileId,
    createdAt: normalizeTimestamp(workspaceRecord['createdAt'], now),
    updatedAt: normalizeOptionalTimestamp(workspaceRecord['updatedAt']),
  };
  const workspaceWithDiagnostics = attachCaseResolverWorkspaceNormalizationDiagnostics(
    normalizedWorkspace,
    diagnostics
  );
  return {
    workspace: workspaceWithDiagnostics,
    diagnostics,
  };
};

export const normalizeCaseResolverWorkspace = (
  workspace: CaseResolverWorkspace | null | undefined
): CaseResolverWorkspace => normalizeCaseResolverWorkspaceWithDiagnostics(workspace).workspace;
