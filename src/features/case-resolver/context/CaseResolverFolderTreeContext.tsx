'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import type {
  CaseResolverFile,
  CaseResolverWorkspace,
  CaseResolverAssetFile,
} from '@/shared/contracts/case-resolver';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { MasterFolderTreeAdapterV3 } from '@/shared/contracts/master-folder-tree';
import { useCaseResolverPageContext } from './CaseResolverPageContext';
import { resolveCaseResolverTreeWorkspace } from '../components/case-resolver-tree-workspace';
import {
  getCachedCaseResolverRuntimeIndexes,
  logCaseResolverDurationMetric,
  useCaseResolverRuntimeSelector,
} from '../runtime';
import {
  buildMasterNodesFromCaseResolverWorkspace,
  buildMasterCaseNodesFromCaseResolverWorkspace,
  fromCaseResolverCaseNodeId,
  toCaseResolverCaseNodeId,
  toCaseResolverFileNodeId,
  toCaseResolverAssetNodeId,
  toCaseResolverFolderNodeId,
  fromCaseResolverFolderNodeId,
  fromCaseResolverFileNodeId,
  fromCaseResolverAssetNodeId,
} from '../master-tree';
import { createMasterFolderTreeAdapterV3 } from '@/features/foldertree/v2';
import { buildCaseResolverNodeFileRelationIndexFromAssets } from '../nodefile-relations';
import {
  type FolderCaseFileStats,
  parseString,
} from '../components/CaseResolverFolderTree.helpers';

const CHILD_CASE_STRUCTURE_FOLDER_PATH = '__case_resolver_children_case_structure__';
const CHILD_CASE_STRUCTURE_NODE_ID = toCaseResolverFolderNodeId(CHILD_CASE_STRUCTURE_FOLDER_PATH);
const CHILD_CASE_STRUCTURE_METADATA_VALUE = 'children_case_structure';
const UNASSIGNED_FOLDER_PATH = '__case_resolver_unassigned__';
const UNASSIGNED_NODE_ID = toCaseResolverFolderNodeId(UNASSIGNED_FOLDER_PATH);
const UNASSIGNED_METADATA_VALUE = 'unassigned';

export const isChildCaseStructureFolderPath = (folderPath: string): boolean =>
  folderPath.trim() === CHILD_CASE_STRUCTURE_FOLDER_PATH;

export const isChildCaseStructureNode = (node: Pick<MasterTreeNode, 'id' | 'metadata'>): boolean =>
  isChildCaseStructureFolderPath(fromCaseResolverFolderNodeId(node.id) ?? '') ||
  parseString(node.metadata?.['virtualSection']) === CHILD_CASE_STRUCTURE_METADATA_VALUE;

export const isUnassignedFolderPath = (folderPath: string): boolean =>
  folderPath.trim() === UNASSIGNED_FOLDER_PATH;

export const isUnassignedNode = (node: Pick<MasterTreeNode, 'id' | 'metadata'>): boolean =>
  isUnassignedFolderPath(fromCaseResolverFolderNodeId(node.id) ?? '') ||
  parseString(node.metadata?.['virtualSection']) === UNASSIGNED_METADATA_VALUE;

export const isCaseResolverVirtualSectionNode = (
  node: Pick<MasterTreeNode, 'id' | 'metadata'>
): boolean => isChildCaseStructureNode(node) || isUnassignedNode(node);

export interface CaseResolverFolderTreeDataContextValue {
  // Tree Data
  masterNodes: MasterTreeNode[];
  treeWorkspace: CaseResolverWorkspace;
  selectedMasterNodeId: string | null;
  initialExpandedFolderNodeIds: string[];
  adapter: MasterFolderTreeAdapterV3;

  // Stats & Indexes
  fileLockById: Map<string, boolean>;
  folderCaseFileStatsByPath: Map<string, FolderCaseFileStats>;
  nodeFileAssetIdsBySourceFileId: Map<string, string[]>;
  caseNameById: Map<string, string>;
  childCaseIdSet: Set<string>;
  fileOwnerCaseIdById: Map<string, string>;
  assetOwnerCaseIdById: Map<string, string>;
  folderOwnerCaseIdsByPath: Map<string, string[]>;

  // Active State
  activeCaseFile: CaseResolverFile | null;
  activeCaseChildCount: number;
  isNodeFileCanvasActive: boolean;

  // Helpers
  selectedFolderForCreate: string | null;
  selectedFolderForFolderCreate: string | null;
}

export interface CaseResolverFolderTreeUiContextValue {
  showChildCaseFolders: boolean;
  setShowChildCaseFolders: React.Dispatch<React.SetStateAction<boolean>>;
  highlightedNodeFileAssetIds: string[];
  setHighlightedNodeFileAssetIds: React.Dispatch<React.SetStateAction<string[]>>;
  highlightedNodeFileAssetIdSet: Set<string>;
  highlightedFolderAncestorNodeIds: string[];
}

export interface CaseResolverFolderTreeContextValue
  extends CaseResolverFolderTreeDataContextValue, CaseResolverFolderTreeUiContextValue {}

const CaseResolverFolderTreeDataContext =
  createContext<CaseResolverFolderTreeDataContextValue | null>(null);
const CaseResolverFolderTreeUiContext = createContext<CaseResolverFolderTreeUiContextValue | null>(
  null
);

export function useCaseResolverFolderTreeDataContext(): CaseResolverFolderTreeDataContextValue {
  const context = useContext(CaseResolverFolderTreeDataContext);
  if (!context) {
    throw new Error(
      'useCaseResolverFolderTreeDataContext must be used within CaseResolverFolderTreeProvider'
    );
  }
  return context;
}

export function useCaseResolverFolderTreeUiContext(): CaseResolverFolderTreeUiContextValue {
  const context = useContext(CaseResolverFolderTreeUiContext);
  if (!context) {
    throw new Error(
      'useCaseResolverFolderTreeUiContext must be used within CaseResolverFolderTreeProvider'
    );
  }
  return context;
}

export function useCaseResolverFolderTreeContext(): CaseResolverFolderTreeContextValue {
  const dataContext = useCaseResolverFolderTreeDataContext();
  const uiContext = useCaseResolverFolderTreeUiContext();
  return useMemo(
    (): CaseResolverFolderTreeContextValue => ({
      ...dataContext,
      ...uiContext,
    }),
    [dataContext, uiContext]
  );
}

const resolveFolderAncestorNodeIds = (folderPath: string): string[] => {
  const normalizedFolder = folderPath.trim();
  if (!normalizedFolder) return [];
  const parts = normalizedFolder.split('/').filter(Boolean);
  return parts.map((_: string, index: number): string =>
    toCaseResolverFolderNodeId(parts.slice(0, index + 1).join('/'))
  );
};

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((value: string, index: number): boolean => value === right[index]);

const nowMs = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();

export const resolveCaseResolverRootTreeNodes = ({
  workspace,
  activeCaseId,
}: {
  workspace: CaseResolverWorkspace;
  activeCaseId: string | null;
}): MasterTreeNode[] => {
  if (activeCaseId?.trim()) {
    return buildMasterNodesFromCaseResolverWorkspace(workspace);
  }
  return buildMasterCaseNodesFromCaseResolverWorkspace(workspace);
};

export function CaseResolverFolderTreeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedFileIdRaw = searchParams.get('fileId');
  const requestedFileId = useMemo((): string | null => {
    const normalizedRequestedFileId = requestedFileIdRaw?.trim() ?? '';
    if (!normalizedRequestedFileId) return null;
    const decodedCaseNodeId = fromCaseResolverCaseNodeId(normalizedRequestedFileId);
    if (decodedCaseNodeId) return decodedCaseNodeId;
    const decodedFileNodeId = fromCaseResolverFileNodeId(normalizedRequestedFileId);
    if (decodedFileNodeId) return decodedFileNodeId;
    return normalizedRequestedFileId;
  }, [requestedFileIdRaw]);
  const {
    activeFile,
    onMoveFile,
    onMoveAsset,
    onMoveFolder,
    onRenameFile,
    onRenameAsset,
    onRenameFolder,
  } = useCaseResolverPageContext();
  const workspace = useCaseResolverRuntimeSelector((snapshot) => snapshot.state.workspace.value);
  const activeCaseId = useCaseResolverRuntimeSelector(
    (snapshot) => snapshot.state.selection.activeCaseId
  );
  const selectedFileId = useCaseResolverRuntimeSelector(
    (snapshot) => snapshot.state.selection.selectedFileId
  );
  const selectedAssetId = useCaseResolverRuntimeSelector(
    (snapshot) => snapshot.state.selection.selectedAssetId
  );
  const selectedFolderPath = useCaseResolverRuntimeSelector(
    (snapshot) => snapshot.state.selection.selectedFolderPath
  );

  const [showChildCaseFolders, setShowChildCaseFolders] = useState(true);
  const [highlightedNodeFileAssetIds, setHighlightedNodeFileAssetIds] = useState<string[]>([]);
  const treeScopeResolveDurationMsRef = React.useRef<number | null>(null);
  const masterNodesBuildDurationMsRef = React.useRef<number | null>(null);
  const loggedFirstTreeReadyCaseIdRef = React.useRef<string | null>(null);
  const caseOpenStartedAtMsRef = React.useRef<number | null>(null);

  const workspaceIndexes = useMemo(
    () => getCachedCaseResolverRuntimeIndexes(workspace),
    [workspace.assets, workspace.files, workspace.folderRecords, workspace.folders]
  );

  // ── Adapter ─────────────────────────────────────────────────────────────────
  const adapterOperationsRef = React.useRef({
    moveFile: onMoveFile,
    moveAsset: onMoveAsset,
    moveFolder: onMoveFolder,
    renameFile: onRenameFile,
    renameAsset: onRenameAsset,
    renameFolder: onRenameFolder,
  });
  adapterOperationsRef.current = {
    moveFile: onMoveFile,
    moveAsset: onMoveAsset,
    moveFolder: onMoveFolder,
    renameFile: onRenameFile,
    renameAsset: onRenameAsset,
    renameFolder: onRenameFolder,
  };

  const adapter = useMemo(
    (): MasterFolderTreeAdapterV3 =>
      createMasterFolderTreeAdapterV3({
        handlers: {
          onMove: async ({ node, targetParent }) => {
            const targetPath = targetParent?.id ?? '';
            if (node.entity === 'file') {
              await adapterOperationsRef.current.moveFile(node.id, targetPath);
            } else if (node.entity === 'asset') {
              await adapterOperationsRef.current.moveAsset(node.id, targetPath);
            } else {
              await adapterOperationsRef.current.moveFolder(node.id, targetPath);
            }
          },
          onRename: async ({ node, nextName }) => {
            if (node.entity === 'file') {
              await adapterOperationsRef.current.renameFile(node.id, nextName);
            } else if (node.entity === 'asset') {
              await adapterOperationsRef.current.renameAsset(node.id, nextName);
            } else {
              await adapterOperationsRef.current.renameFolder(node.id, nextName);
            }
          },
        },
        decodeNodeId: (nodeId: string) => {
          const fileId = fromCaseResolverFileNodeId(nodeId);
          if (fileId) return { entity: 'file', id: fileId, nodeId };
          const assetId = fromCaseResolverAssetNodeId(nodeId);
          if (assetId) return { entity: 'asset', id: assetId, nodeId };
          const caseId = fromCaseResolverCaseNodeId(nodeId);
          if (caseId) return { entity: 'folder', id: caseId, nodeId };
          const folderPath = fromCaseResolverFolderNodeId(nodeId);
          return { entity: 'folder', id: folderPath || nodeId, nodeId };
        },
      }),
    []
  );

  const treeWorkspace = useMemo((): CaseResolverWorkspace => {
    const resolveStartedAtMs = nowMs();
    const scopedWorkspace = resolveCaseResolverTreeWorkspace({
      selectedFileId,
      requestedFileId,
      activeCaseId,
      workspace,
      includeDescendantCaseScope: showChildCaseFolders,
      indexes: workspaceIndexes,
    });
    // If no explicit case context is active, never collapse a non-empty workspace to an empty tree.
    const hasExplicitCaseContext = Boolean(
      (activeCaseId?.trim() ?? '') || (requestedFileId?.trim() ?? '')
    );
    const scopedIsEmpty =
      scopedWorkspace.files.length === 0 &&
      scopedWorkspace.assets.length === 0 &&
      scopedWorkspace.folders.length === 0;
    const sourceHasData =
      workspace.files.length > 0 || workspace.assets.length > 0 || workspace.folders.length > 0;
    if (!hasExplicitCaseContext && scopedIsEmpty && sourceHasData) {
      treeScopeResolveDurationMsRef.current = nowMs() - resolveStartedAtMs;
      return workspace;
    }
    treeScopeResolveDurationMsRef.current = nowMs() - resolveStartedAtMs;
    return scopedWorkspace;
  }, [
    activeCaseId,
    requestedFileId,
    selectedFileId,
    showChildCaseFolders,
    workspace,
    workspaceIndexes,
  ]);

  const treeWorkspaceIndexes = useMemo(
    () => getCachedCaseResolverRuntimeIndexes(treeWorkspace),
    [treeWorkspace.assets, treeWorkspace.files, treeWorkspace.folderRecords, treeWorkspace.folders]
  );

  useEffect((): void => {
    const durationMs = treeScopeResolveDurationMsRef.current;
    if (typeof durationMs !== 'number') return;
    logCaseResolverDurationMetric('tree_scope_resolve_ms', durationMs, {
      source: 'case_tree',
      minDurationMs: 1,
      message: `workspace_revision=${workspaceIndexes.workspaceRevision}`,
    });
  }, [
    activeCaseId,
    requestedFileId,
    selectedFileId,
    showChildCaseFolders,
    workspaceIndexes.workspaceRevision,
  ]);

  const isNodeFileCanvasActive = useMemo(
    (): boolean =>
      Boolean(selectedAssetId) &&
      workspaceIndexes.assetsById.get(selectedAssetId ?? '')?.kind === 'node_file',
    [selectedAssetId, workspaceIndexes.assetsById]
  );

  const activeCaseFile = useMemo(() => {
    if (activeCaseId) {
      const explicitCase = workspaceIndexes.filesById.get(activeCaseId) ?? null;
      if (explicitCase?.fileType === 'case') return explicitCase;
    }
    if (activeFile?.fileType === 'case') return activeFile;
    if (activeFile?.parentCaseId) {
      const parentCase = workspaceIndexes.filesById.get(activeFile.parentCaseId) ?? null;
      if (parentCase?.fileType === 'case') return parentCase;
    }
    return null;
  }, [activeCaseId, activeFile, workspaceIndexes.filesById]);

  const rootActiveCaseId = activeCaseFile?.id?.trim() ?? '';

  const activeCaseChildCount = useMemo((): number => {
    if (!rootActiveCaseId) return 0;
    const subtreeCaseIds = workspaceIndexes.subtreeCaseIdsByCaseId.get(rootActiveCaseId);
    if (!subtreeCaseIds) return 0;
    return Math.max(0, subtreeCaseIds.size - 1);
  }, [rootActiveCaseId, workspaceIndexes.subtreeCaseIdsByCaseId]);

  useEffect((): void => {
    setShowChildCaseFolders(true);
    caseOpenStartedAtMsRef.current = nowMs();
  }, [rootActiveCaseId]);

  const fileDerivations = useMemo(() => {
    const caseNameById = new Map<string, string>();
    const unresolvedFileIdSet = new Set<string>();
    const fileLockById = new Map<string, boolean>();
    const folderCaseFileStatsByPath = new Map<string, FolderCaseFileStats>();
    const fileFolderById = new Map<string, string>();

    treeWorkspace.files.forEach((file: CaseResolverFile): void => {
      const normalizedFolder = file.folder.trim();
      fileFolderById.set(file.id, normalizedFolder);
      fileLockById.set(file.id, file.isLocked ?? false);

      if (file.fileType === 'case') {
        const name = file.name.trim();
        caseNameById.set(file.id, name.length > 0 ? name : file.id);
        return;
      }

      const ownerCaseId = file.parentCaseId?.trim() ?? '';
      if (!ownerCaseId) {
        unresolvedFileIdSet.add(file.id);
      }

      if (!normalizedFolder) return;
      const segments = normalizedFolder.split('/').filter(Boolean);
      for (let index = 0; index < segments.length; index += 1) {
        const path = segments.slice(0, index + 1).join('/');
        const current = folderCaseFileStatsByPath.get(path) ?? { total: 0, locked: 0 };
        folderCaseFileStatsByPath.set(path, {
          total: current.total + 1,
          locked: current.locked + (file.isLocked ? 1 : 0),
        });
      }
    });

    return {
      caseNameById,
      unresolvedFileIdSet,
      fileLockById,
      folderCaseFileStatsByPath,
      fileFolderById,
    };
  }, [treeWorkspace.files]);

  const childCaseIdSet = useMemo((): Set<string> => {
    const set = new Set<string>();
    if (!showChildCaseFolders) return set;
    if (rootActiveCaseId) {
      const subtreeCaseIds = workspaceIndexes.subtreeCaseIdsByCaseId.get(rootActiveCaseId);
      subtreeCaseIds?.forEach((caseId: string): void => {
        if (caseId === rootActiveCaseId) return;
        if (!treeWorkspaceIndexes.caseFilesById.has(caseId)) return;
        set.add(caseId);
      });
      return set;
    }
    treeWorkspaceIndexes.caseFilesById.forEach((_: CaseResolverFile, caseId: string): void => {
      set.add(caseId);
    });
    return set;
  }, [
    rootActiveCaseId,
    showChildCaseFolders,
    treeWorkspaceIndexes.caseFilesById,
    treeWorkspaceIndexes.workspaceRevision,
    workspaceIndexes.subtreeCaseIdsByCaseId,
  ]);

  const caseNameById = fileDerivations.caseNameById;
  const fileOwnerCaseIdById = treeWorkspaceIndexes.ownerCaseIdBySourceFileId;
  const unresolvedFileIdSet = fileDerivations.unresolvedFileIdSet;
  const folderOwnerCaseIdsByPath = treeWorkspaceIndexes.folderOwnerCaseIdsByPath;

  const assetDerivations = useMemo(() => {
    const assetOwnerCaseIdById = new Map<string, string>();
    const unresolvedAssetIdSet = new Set<string>();
    const validNodeFileAssetIdSet = new Set<string>();
    const assetFolderById = new Map<string, string>();
    const nodeFileFolderByAssetId = new Map<string, string>();

    treeWorkspace.assets.forEach((asset: CaseResolverAssetFile): void => {
      const normalizedFolder = asset.folder.trim();
      assetFolderById.set(asset.id, normalizedFolder);
      if (asset.kind === 'node_file') {
        validNodeFileAssetIdSet.add(asset.id);
        nodeFileFolderByAssetId.set(asset.id, normalizedFolder);
      }
      const sourceFileId = asset.sourceFileId?.trim() ?? '';
      if (!sourceFileId) return;
      const ownerCaseId = fileOwnerCaseIdById.get(sourceFileId);
      if (ownerCaseId) {
        assetOwnerCaseIdById.set(asset.id, ownerCaseId);
      }
      if (unresolvedFileIdSet.has(sourceFileId)) {
        unresolvedAssetIdSet.add(asset.id);
      }
    });

    return {
      assetOwnerCaseIdById,
      unresolvedAssetIdSet,
      validNodeFileAssetIdSet,
      assetFolderById,
      nodeFileFolderByAssetId,
    };
  }, [fileOwnerCaseIdById, treeWorkspace.assets, unresolvedFileIdSet]);

  const assetOwnerCaseIdById = assetDerivations.assetOwnerCaseIdById;
  const unresolvedAssetIdSet = assetDerivations.unresolvedAssetIdSet;

  const baseMasterNodes = useMemo(
    (): MasterTreeNode[] =>
      resolveCaseResolverRootTreeNodes({
        workspace: treeWorkspace,
        activeCaseId: rootActiveCaseId || null,
      }),
    [rootActiveCaseId, treeWorkspace]
  );

  const masterNodes = useMemo((): MasterTreeNode[] => {
    const buildStartedAtMs = nowMs();
    const rootCaseId = rootActiveCaseId || null;

    const getNodeOwnerCaseIds = (node: MasterTreeNode): string[] => {
      const folderPath = fromCaseResolverFolderNodeId(node.id);
      if (folderPath !== null) {
        return folderOwnerCaseIdsByPath.get(folderPath) ?? [];
      }
      const fileId = fromCaseResolverFileNodeId(node.id);
      if (fileId) {
        const ownerCaseId = fileOwnerCaseIdById.get(fileId);
        return ownerCaseId ? [ownerCaseId] : [];
      }
      const assetId = fromCaseResolverAssetNodeId(node.id);
      if (assetId) {
        const ownerCaseId = assetOwnerCaseIdById.get(assetId);
        return ownerCaseId ? [ownerCaseId] : [];
      }
      return [];
    };

    const isUnassignedEntityNode = (node: MasterTreeNode): boolean => {
      const fileId = fromCaseResolverFileNodeId(node.id);
      if (fileId && unresolvedFileIdSet.has(fileId)) return true;
      const assetId = fromCaseResolverAssetNodeId(node.id);
      return Boolean(assetId && unresolvedAssetIdSet.has(assetId));
    };

    let hasUnassignedNodes = false;
    let hasChildStructureRoots = false;
    const remappedNodes = baseMasterNodes.map((node: MasterTreeNode): MasterTreeNode => {
      if (isCaseResolverVirtualSectionNode(node)) return node;
      if (isUnassignedEntityNode(node)) {
        hasUnassignedNodes = true;
        return {
          ...node,
          parentId: UNASSIGNED_NODE_ID,
        };
      }

      if (!showChildCaseFolders) return node;
      if (!rootCaseId) return node;
      if (node.parentId !== null) return node;
      const ownerCaseIds = getNodeOwnerCaseIds(node);
      if (ownerCaseIds.length === 0) return node;
      const ownedByRootCase = ownerCaseIds.includes(rootCaseId);
      const ownedByChildCase = ownerCaseIds.some((caseId: string): boolean =>
        childCaseIdSet.has(caseId)
      );
      if (!ownedByChildCase || ownedByRootCase) return node;
      hasChildStructureRoots = true;
      return {
        ...node,
        parentId: CHILD_CASE_STRUCTURE_NODE_ID,
      };
    });
    if (!hasUnassignedNodes && !hasChildStructureRoots) {
      masterNodesBuildDurationMsRef.current = nowMs() - buildStartedAtMs;
      return baseMasterNodes;
    }

    const virtualNodes: MasterTreeNode[] = [];
    if (hasUnassignedNodes) {
      virtualNodes.push({
        id: UNASSIGNED_NODE_ID,
        type: 'folder',
        kind: 'folder',
        parentId: null,
        name: 'Unassigned',
        path: UNASSIGNED_FOLDER_PATH,
        sortOrder: Number.MAX_SAFE_INTEGER - 1,
        metadata: {
          entity: 'folder',
          rawPath: UNASSIGNED_FOLDER_PATH,
          virtualSection: UNASSIGNED_METADATA_VALUE,
          createdAt: null,
          updatedAt: null,
        },
      });
    }
    if (hasChildStructureRoots) {
      virtualNodes.push({
        id: CHILD_CASE_STRUCTURE_NODE_ID,
        type: 'folder',
        kind: 'folder',
        parentId: null,
        name: 'Children Cases',
        path: CHILD_CASE_STRUCTURE_FOLDER_PATH,
        sortOrder: Number.MAX_SAFE_INTEGER,
        metadata: {
          entity: 'folder',
          rawPath: CHILD_CASE_STRUCTURE_FOLDER_PATH,
          virtualSection: CHILD_CASE_STRUCTURE_METADATA_VALUE,
          createdAt: null,
          updatedAt: null,
        },
      });
    }
    const nextNodes = [...remappedNodes, ...virtualNodes];
    masterNodesBuildDurationMsRef.current = nowMs() - buildStartedAtMs;
    return nextNodes;
  }, [
    baseMasterNodes,
    childCaseIdSet,
    fileOwnerCaseIdById,
    assetOwnerCaseIdById,
    folderOwnerCaseIdsByPath,
    rootActiveCaseId,
    showChildCaseFolders,
    unresolvedFileIdSet,
    unresolvedAssetIdSet,
  ]);

  const selectedMasterNodeId = useMemo((): string | null => {
    if (selectedFileId) return toCaseResolverFileNodeId(selectedFileId);
    if (selectedAssetId) return toCaseResolverAssetNodeId(selectedAssetId);
    if (
      selectedFolderPath !== null &&
      !isChildCaseStructureFolderPath(selectedFolderPath) &&
      !isUnassignedFolderPath(selectedFolderPath)
    ) {
      return toCaseResolverFolderNodeId(selectedFolderPath);
    }
    return null;
  }, [selectedAssetId, selectedFileId, selectedFolderPath]);

  const initialExpandedFolderNodeIds = useMemo((): string[] => {
    const expandedNodeIds = new Set<string>();
    const normalizedActiveCaseId = rootActiveCaseId;
    const normalizedSelectedFolderPath = selectedFolderPath?.trim() ?? null;
    if (normalizedActiveCaseId) {
      expandedNodeIds.add(toCaseResolverCaseNodeId(normalizedActiveCaseId));
    }
    if (
      normalizedSelectedFolderPath !== null &&
      !isChildCaseStructureFolderPath(normalizedSelectedFolderPath) &&
      !isUnassignedFolderPath(normalizedSelectedFolderPath)
    ) {
      resolveFolderAncestorNodeIds(normalizedSelectedFolderPath).forEach((nodeId: string): void => {
        expandedNodeIds.add(nodeId);
      });
    }
    if (selectedFileId) {
      const selectedFileFolder = fileDerivations.fileFolderById.get(selectedFileId);
      if (selectedFileFolder) {
        resolveFolderAncestorNodeIds(selectedFileFolder).forEach((nodeId: string): void => {
          expandedNodeIds.add(nodeId);
        });
      }
    }
    if (selectedAssetId) {
      const selectedAssetFolder = assetDerivations.assetFolderById.get(selectedAssetId);
      if (selectedAssetFolder) {
        resolveFolderAncestorNodeIds(selectedAssetFolder).forEach((nodeId: string): void => {
          expandedNodeIds.add(nodeId);
        });
      }
    }
    return Array.from(expandedNodeIds);
  }, [
    assetDerivations.assetFolderById,
    fileDerivations.fileFolderById,
    rootActiveCaseId,
    selectedAssetId,
    selectedFileId,
    selectedFolderPath,
  ]);

  useEffect((): void => {
    const durationMs = masterNodesBuildDurationMsRef.current;
    if (typeof durationMs !== 'number') return;
    logCaseResolverDurationMetric('case_tree_master_nodes_build_ms', durationMs, {
      source: 'case_tree',
      minDurationMs: 1,
      message: `workspace_revision=${workspaceIndexes.workspaceRevision} nodes=${masterNodes.length}`,
    });
  }, [masterNodes.length, workspaceIndexes.workspaceRevision]);

  useEffect((): void => {
    const activeCaseIdValue = activeCaseFile?.id?.trim() ?? '';
    if (!activeCaseIdValue) return;
    const hasTreeData =
      treeWorkspace.files.length > 0 ||
      treeWorkspace.assets.length > 0 ||
      treeWorkspace.folders.length > 0;
    if (!hasTreeData) return;
    if (loggedFirstTreeReadyCaseIdRef.current === activeCaseIdValue) return;
    loggedFirstTreeReadyCaseIdRef.current = activeCaseIdValue;
    const startedAtMs = caseOpenStartedAtMsRef.current;
    const durationMs = typeof startedAtMs === 'number' ? Math.max(0, nowMs() - startedAtMs) : 0;
    logCaseResolverDurationMetric('case_open_first_tree_ready_ms', durationMs, {
      source: 'case_tree',
      minDurationMs: 0,
      message: `case_id=${activeCaseIdValue} workspace_revision=${workspaceIndexes.workspaceRevision}`,
    });
  }, [
    activeCaseFile?.id,
    treeWorkspace.assets.length,
    treeWorkspace.files.length,
    treeWorkspace.folders.length,
    workspaceIndexes.workspaceRevision,
  ]);

  const fileLockById = fileDerivations.fileLockById;
  const folderCaseFileStatsByPath = fileDerivations.folderCaseFileStatsByPath;

  const nodeFileAssetIdsBySourceFileId = useMemo((): Map<string, string[]> => {
    const relations = buildCaseResolverNodeFileRelationIndexFromAssets({
      assets: treeWorkspace.assets,
      files: treeWorkspace.files,
    });
    return new Map<string, string[]>(Object.entries(relations.nodeFileAssetIdsByDocumentFileId));
  }, [treeWorkspace.assets, treeWorkspace.files]);

  useEffect(() => {
    if (!isNodeFileCanvasActive) return;
    const activeNodeFileAssetId = selectedAssetId?.trim() ?? '';
    const relatedNodeFileAssetIds = selectedFileId
      ? (nodeFileAssetIdsBySourceFileId.get(selectedFileId) ?? [])
      : [];
    const stableRelatedNodeFileAssetIds = Array.from(new Set<string>(relatedNodeFileAssetIds)).sort(
      (left: string, right: string): number => left.localeCompare(right)
    );
    const nextHighlighted = [
      ...(activeNodeFileAssetId ? [activeNodeFileAssetId] : []),
      ...stableRelatedNodeFileAssetIds.filter(
        (assetId: string): boolean => assetId !== activeNodeFileAssetId
      ),
    ];
    setHighlightedNodeFileAssetIds((currentHighlighted: string[]): string[] =>
      areStringArraysEqual(currentHighlighted, nextHighlighted)
        ? currentHighlighted
        : nextHighlighted
    );
  }, [isNodeFileCanvasActive, nodeFileAssetIdsBySourceFileId, selectedAssetId, selectedFileId]);

  const highlightedNodeFileAssetIdSet = useMemo(
    () => new Set<string>(highlightedNodeFileAssetIds),
    [highlightedNodeFileAssetIds]
  );

  useEffect(() => {
    if (isNodeFileCanvasActive) return;
    if (highlightedNodeFileAssetIds.length === 0) return;
    setHighlightedNodeFileAssetIds([]);
  }, [highlightedNodeFileAssetIds.length, isNodeFileCanvasActive]);

  useEffect(() => {
    if (highlightedNodeFileAssetIds.length === 0) return;
    const nextHighlighted = highlightedNodeFileAssetIds.filter((assetId: string): boolean =>
      assetDerivations.validNodeFileAssetIdSet.has(assetId)
    );
    if (nextHighlighted.length === highlightedNodeFileAssetIds.length) return;
    setHighlightedNodeFileAssetIds(nextHighlighted);
  }, [assetDerivations.validNodeFileAssetIdSet, highlightedNodeFileAssetIds]);

  const highlightedFolderAncestorNodeIds = useMemo((): string[] => {
    if (highlightedNodeFileAssetIds.length === 0) return [];
    const highlighted = new Set<string>(highlightedNodeFileAssetIds);
    const ancestorNodeIds = new Set<string>();
    assetDerivations.nodeFileFolderByAssetId.forEach(
      (folderPath: string, assetId: string): void => {
        if (!highlighted.has(assetId)) return;
        resolveFolderAncestorNodeIds(folderPath).forEach((folderNodeId: string): void => {
          ancestorNodeIds.add(folderNodeId);
        });
      }
    );
    return Array.from(ancestorNodeIds);
  }, [assetDerivations.nodeFileFolderByAssetId, highlightedNodeFileAssetIds]);

  const selectedFolderForCreate = useMemo((): string | null => {
    return selectedFolderPath;
  }, [selectedFolderPath]);

  const selectedFolderForFolderCreate =
    selectedFolderPath &&
    (isChildCaseStructureFolderPath(selectedFolderPath) ||
      isUnassignedFolderPath(selectedFolderPath))
      ? ''
      : selectedFolderPath;

  const dataValue = useMemo(
    (): CaseResolverFolderTreeDataContextValue => ({
      masterNodes,
      treeWorkspace,
      selectedMasterNodeId,
      initialExpandedFolderNodeIds,
      adapter,
      fileLockById,
      folderCaseFileStatsByPath,
      nodeFileAssetIdsBySourceFileId,
      caseNameById,
      childCaseIdSet,
      fileOwnerCaseIdById,
      assetOwnerCaseIdById,
      folderOwnerCaseIdsByPath,
      activeCaseFile,
      activeCaseChildCount,
      isNodeFileCanvasActive,
      selectedFolderForCreate,
      selectedFolderForFolderCreate,
    }),
    [
      masterNodes,
      treeWorkspace,
      selectedMasterNodeId,
      initialExpandedFolderNodeIds,
      adapter,
      fileLockById,
      folderCaseFileStatsByPath,
      nodeFileAssetIdsBySourceFileId,
      caseNameById,
      childCaseIdSet,
      fileOwnerCaseIdById,
      assetOwnerCaseIdById,
      folderOwnerCaseIdsByPath,
      activeCaseFile,
      activeCaseChildCount,
      isNodeFileCanvasActive,
      selectedFolderForCreate,
      selectedFolderForFolderCreate,
    ]
  );

  const uiValue = useMemo(
    (): CaseResolverFolderTreeUiContextValue => ({
      showChildCaseFolders,
      setShowChildCaseFolders,
      highlightedNodeFileAssetIds,
      setHighlightedNodeFileAssetIds,
      highlightedNodeFileAssetIdSet,
      highlightedFolderAncestorNodeIds,
    }),
    [
      showChildCaseFolders,
      setShowChildCaseFolders,
      highlightedNodeFileAssetIds,
      setHighlightedNodeFileAssetIds,
      highlightedNodeFileAssetIdSet,
      highlightedFolderAncestorNodeIds,
    ]
  );

  return (
    <CaseResolverFolderTreeDataContext.Provider value={dataValue}>
      <CaseResolverFolderTreeUiContext.Provider value={uiValue}>
        {children}
      </CaseResolverFolderTreeUiContext.Provider>
    </CaseResolverFolderTreeDataContext.Provider>
  );
}
