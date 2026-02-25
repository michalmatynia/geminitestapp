'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import type { 
  CaseResolverFile, 
  CaseResolverWorkspace,
  CaseResolverAssetFile
} from '@/shared/contracts/case-resolver';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { MasterFolderTreeAdapter } from '@/shared/contracts/master-folder-tree';
import { useCaseResolverPageContext } from './CaseResolverPageContext';
import { resolveCaseResolverTreeWorkspace } from '../components/case-resolver-tree-workspace';
import { 
  buildMasterNodesFromCaseResolverWorkspace,
  toCaseResolverFileNodeId,
  toCaseResolverAssetNodeId,
  toCaseResolverFolderNodeId,
  fromCaseResolverFolderNodeId,
  fromCaseResolverFileNodeId,
  fromCaseResolverAssetNodeId,
} from '../master-tree';
import { 
  buildCaseResolverNodeFileRelationIndexFromAssets,
} from '../nodefile-relations';
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

export const isChildCaseStructureNode = (
  node: Pick<MasterTreeNode, 'id' | 'metadata'>,
): boolean =>
  isChildCaseStructureFolderPath(fromCaseResolverFolderNodeId(node.id) ?? '') ||
  parseString(node.metadata?.['virtualSection']) === CHILD_CASE_STRUCTURE_METADATA_VALUE;

export const isUnassignedFolderPath = (folderPath: string): boolean =>
  folderPath.trim() === UNASSIGNED_FOLDER_PATH;

export const isUnassignedNode = (
  node: Pick<MasterTreeNode, 'id' | 'metadata'>,
): boolean =>
  isUnassignedFolderPath(fromCaseResolverFolderNodeId(node.id) ?? '') ||
  parseString(node.metadata?.['virtualSection']) === UNASSIGNED_METADATA_VALUE;

export const isCaseResolverVirtualSectionNode = (
  node: Pick<MasterTreeNode, 'id' | 'metadata'>,
): boolean =>
  isChildCaseStructureNode(node) || isUnassignedNode(node);

export interface CaseResolverFolderTreeContextValue {
  // Tree Data
  masterNodes: MasterTreeNode[];
  treeWorkspace: CaseResolverWorkspace;
  selectedMasterNodeId: string | null;
  initialExpandedFolderNodeIds: string[];
  adapter: MasterFolderTreeAdapter;
  
  // UI State
  showChildCaseFolders: boolean;
  setShowChildCaseFolders: React.Dispatch<React.SetStateAction<boolean>>;
  highlightedNodeFileAssetIds: string[];
  setHighlightedNodeFileAssetIds: React.Dispatch<React.SetStateAction<string[]>>;
  highlightedNodeFileAssetIdSet: Set<string>;
  highlightedFolderAncestorNodeIds: string[];
  
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

const CaseResolverFolderTreeContext = createContext<CaseResolverFolderTreeContextValue | null>(null);

export function useCaseResolverFolderTreeContext(): CaseResolverFolderTreeContextValue {
  const context = useContext(CaseResolverFolderTreeContext);
  if (!context) {
    throw new Error('useCaseResolverFolderTreeContext must be used within CaseResolverFolderTreeProvider');
  }
  return context;
}

const resolveFolderAncestorNodeIds = (folderPath: string): string[] => {
  const normalizedFolder = folderPath.trim();
  if (!normalizedFolder) return [];
  const parts = normalizedFolder.split('/').filter(Boolean);
  return parts.map((_: string, index: number): string =>
    toCaseResolverFolderNodeId(parts.slice(0, index + 1).join('/')),
  );
};

const forEachFolderPathAncestor = (
  folderPath: string,
  callback: (path: string) => void,
): void => {
  const normalizedFolder = folderPath.trim();
  if (!normalizedFolder) return;
  const parts = normalizedFolder.split('/').filter(Boolean);
  for (let index = 0; index < parts.length; index += 1) {
    callback(parts.slice(0, index + 1).join('/'));
  }
};

const areStringArraysEqual = (left: string[], right: string[]): boolean =>
  left.length === right.length &&
  left.every((value: string, index: number): boolean => value === right[index]);

export function CaseResolverFolderTreeProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const {
    workspace,
    activeCaseId,
    activeFile,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    onMoveFile,
    onMoveAsset,
    onMoveFolder,
    onRenameFile,
    onRenameAsset,
    onRenameFolder,
  } = useCaseResolverPageContext();

  const [showChildCaseFolders, setShowChildCaseFolders] = useState(true);
  const [highlightedNodeFileAssetIds, setHighlightedNodeFileAssetIds] = useState<string[]>([]);

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
    (): MasterFolderTreeAdapter => ({
      moveFile: async (fileId: string, targetFolder: string): Promise<void> => {
        await adapterOperationsRef.current.moveFile(fileId, targetFolder);
      },
      moveAsset: async (assetId: string, targetFolder: string): Promise<void> => {
        await adapterOperationsRef.current.moveAsset(assetId, targetFolder);
      },
      moveFolder: async (folderPath: string, targetFolder: string): Promise<void> => {
        await adapterOperationsRef.current.moveFolder(folderPath, targetFolder);
      },
      renameFile: async (fileId: string, nextName: string): Promise<void> => {
        await adapterOperationsRef.current.renameFile(fileId, nextName);
      },
      renameAsset: async (assetId: string, nextName: string): Promise<void> => {
        await adapterOperationsRef.current.renameAsset(assetId, nextName);
      },
      renameFolder: async (folderPath: string, nextFolderPath: string): Promise<void> => {
        await adapterOperationsRef.current.renameFolder(folderPath, nextFolderPath);
      },
    }),
    [],
  );

  const treeWorkspace = useMemo(
    (): CaseResolverWorkspace =>
      resolveCaseResolverTreeWorkspace({
        selectedFileId,
        requestedFileId,
        workspace,
        includeDescendantCaseScope: showChildCaseFolders,
      }),
    [requestedFileId, selectedFileId, showChildCaseFolders, workspace],
  );

  const isNodeFileCanvasActive = useMemo(
    (): boolean =>
      Boolean(selectedAssetId) &&
      workspace.assets.some(
        (asset: CaseResolverAssetFile) => asset.id === selectedAssetId && asset.kind === 'node_file',
      ),
    [selectedAssetId, workspace.assets],
  );

  const activeCaseFile = useMemo(() => {
    if (activeCaseId) {
      const explicitCase = workspace.files.find(
        (file: CaseResolverFile) => file.id === activeCaseId && file.fileType === 'case',
      );
      if (explicitCase) return explicitCase;
    }
    if (activeFile?.fileType === 'case') return activeFile;
    if (activeFile?.parentCaseId) {
      const parentCase = workspace.files.find(
        (file: CaseResolverFile) =>
          file.id === activeFile.parentCaseId && file.fileType === 'case',
      );
      if (parentCase) return parentCase;
    }
    return null;
  }, [activeCaseId, activeFile, workspace.files]);

  const activeCaseChildCount = useMemo((): number => {
    const rootCaseId = activeCaseFile?.id?.trim() ?? '';
    if (!rootCaseId) return 0;

    const childCaseIdsByParentId = new Map<string, string[]>();
    workspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType !== 'case') return;
      const parentCaseId = file.parentCaseId?.trim() ?? '';
      if (!parentCaseId || parentCaseId === file.id) return;
      const currentChildren = childCaseIdsByParentId.get(parentCaseId) ?? [];
      currentChildren.push(file.id);
      childCaseIdsByParentId.set(parentCaseId, currentChildren);
    });

    let count = 0;
    const visitedCaseIds = new Set<string>();
    const queue = [...(childCaseIdsByParentId.get(rootCaseId) ?? [])];
    while (queue.length > 0) {
      const caseId = queue.shift();
      if (!caseId || visitedCaseIds.has(caseId)) continue;
      visitedCaseIds.add(caseId);
      count += 1;
      const children = childCaseIdsByParentId.get(caseId) ?? [];
      children.forEach((childCaseId: string): void => {
        if (visitedCaseIds.has(childCaseId)) return;
        queue.push(childCaseId);
      });
    }

    return count;
  }, [activeCaseFile?.id, workspace.files]);

  useEffect((): void => {
    setShowChildCaseFolders(true);
  }, [activeCaseFile?.id]);

  const caseNameById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    treeWorkspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType !== 'case') return;
      const name = file.name.trim();
      map.set(file.id, name.length > 0 ? name : file.id);
    });
    return map;
  }, [treeWorkspace.files]);

  const childCaseIdSet = useMemo((): Set<string> => {
    const set = new Set<string>();
    if (!showChildCaseFolders) return set;
    const rootCaseId = activeCaseFile?.id ?? null;
    treeWorkspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType !== 'case') return;
      if (rootCaseId && file.id === rootCaseId) return;
      set.add(file.id);
    });
    return set;
  }, [activeCaseFile?.id, showChildCaseFolders, treeWorkspace.files]);

  const fileOwnerCaseIdById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    treeWorkspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType === 'case') return;
      const ownerCaseId = file.parentCaseId?.trim() ?? '';
      if (!ownerCaseId) return;
      map.set(file.id, ownerCaseId);
    });
    return map;
  }, [treeWorkspace.files]);

  const assetOwnerCaseIdById = useMemo((): Map<string, string> => {
    const map = new Map<string, string>();
    treeWorkspace.assets.forEach((asset: CaseResolverAssetFile): void => {
      const sourceFileId = asset.sourceFileId?.trim() ?? '';
      if (!sourceFileId) return;
      const ownerCaseId = fileOwnerCaseIdById.get(sourceFileId);
      if (!ownerCaseId) return;
      map.set(asset.id, ownerCaseId);
    });
    return map;
  }, [fileOwnerCaseIdById, treeWorkspace.assets]);

  const unresolvedFileIdSet = useMemo((): Set<string> => {
    const set = new Set<string>();
    treeWorkspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType === 'case') return;
      const ownerCaseId = file.parentCaseId?.trim() ?? '';
      if (ownerCaseId) return;
      set.add(file.id);
    });
    return set;
  }, [treeWorkspace.files]);

  const unresolvedAssetIdSet = useMemo((): Set<string> => {
    const set = new Set<string>();
    treeWorkspace.assets.forEach((asset: CaseResolverAssetFile): void => {
      const sourceFileId = asset.sourceFileId?.trim() ?? '';
      if (!sourceFileId || !unresolvedFileIdSet.has(sourceFileId)) return;
      set.add(asset.id);
    });
    return set;
  }, [treeWorkspace.assets, unresolvedFileIdSet]);

  const folderOwnerCaseIdsByPath = useMemo((): Map<string, string[]> => {
    const ownersByPath = new Map<string, Set<string>>();
    const addOwnerForPath = (
      folderPath: string,
      ownerCaseId: string | null | undefined,
    ): void => {
      const normalizedOwnerCaseId = ownerCaseId?.trim() ?? '';
      if (!normalizedOwnerCaseId) return;
      forEachFolderPathAncestor(folderPath, (ancestorPath: string): void => {
        const currentOwners = ownersByPath.get(ancestorPath) ?? new Set<string>();
        currentOwners.add(normalizedOwnerCaseId);
        ownersByPath.set(ancestorPath, currentOwners);
      });
    };

    (treeWorkspace.folderRecords ?? []).forEach((record): void => {
      addOwnerForPath(record.path, record.ownerCaseId);
    });
    treeWorkspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType === 'case') return;
      addOwnerForPath(file.folder, file.parentCaseId);
    });
    treeWorkspace.assets.forEach((asset: CaseResolverAssetFile): void => {
      addOwnerForPath(asset.folder, assetOwnerCaseIdById.get(asset.id));
    });

    const resolved = new Map<string, string[]>();
    ownersByPath.forEach((ownerIds: Set<string>, folderPath: string): void => {
      resolved.set(
        folderPath,
        Array.from(ownerIds).sort((left: string, right: string): number =>
          left.localeCompare(right),
        ),
      );
    });
    return resolved;
  }, [
    assetOwnerCaseIdById,
    treeWorkspace.assets,
    treeWorkspace.files,
    treeWorkspace.folderRecords,
  ]);

  const masterNodes = useMemo(
    (): MasterTreeNode[] => {
      const baseNodes = buildMasterNodesFromCaseResolverWorkspace(treeWorkspace);
      const rootCaseId = activeCaseFile?.id ?? null;

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
      const remappedNodes = baseNodes.map((node: MasterTreeNode): MasterTreeNode => {
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
          childCaseIdSet.has(caseId),
        );
        if (!ownedByChildCase || ownedByRootCase) return node;
        hasChildStructureRoots = true;
        return {
          ...node,
          parentId: CHILD_CASE_STRUCTURE_NODE_ID,
        };
      });
      if (!hasUnassignedNodes && !hasChildStructureRoots) return baseNodes;

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
      return [...remappedNodes, ...virtualNodes];
    },
    [
      activeCaseFile?.id,
      childCaseIdSet,
      fileOwnerCaseIdById,
      assetOwnerCaseIdById,
      folderOwnerCaseIdsByPath,
      showChildCaseFolders,
      treeWorkspace,
      unresolvedFileIdSet,
      unresolvedAssetIdSet,
    ],
  );

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

  const initialExpandedFolderNodeIds = useMemo(
    () =>
      masterNodes
        .filter((node: MasterTreeNode) => node.type === 'folder')
        .map((node: MasterTreeNode) => node.id),
    [masterNodes],
  );

  const fileLockById = useMemo((): Map<string, boolean> => {
    return new Map(
      treeWorkspace.files.map((file: CaseResolverFile): [string, boolean] => [
        file.id,
        file.isLocked ?? false,
      ]),
    );
  }, [treeWorkspace.files]);

  const folderCaseFileStatsByPath = useMemo((): Map<
    string,
    FolderCaseFileStats
  > => {
    const stats = new Map<string, FolderCaseFileStats>();
    treeWorkspace.files.forEach((file: CaseResolverFile): void => {
      if (file.fileType === 'case') return;
      const normalizedFolder = file.folder.trim();
      if (!normalizedFolder) return;
      const segments = normalizedFolder.split('/').filter(Boolean);
      for (let index = 0; index < segments.length; index += 1) {
        const path = segments.slice(0, index + 1).join('/');
        const current = stats.get(path) ?? { total: 0, locked: 0 };
        const next: FolderCaseFileStats = {
          total: current.total + 1,
          locked: current.locked + (file.isLocked ? 1 : 0),
        };
        stats.set(path, next);
      }
    });
    return stats;
  }, [treeWorkspace.files]);

  const nodeFileAssetIdsBySourceFileId = useMemo((): Map<string, string[]> => {
    const relations = buildCaseResolverNodeFileRelationIndexFromAssets({
      assets: treeWorkspace.assets,
      files: treeWorkspace.files,
    });
    return new Map<string, string[]>(
      Object.entries(relations.nodeFileAssetIdsByDocumentFileId),
    );
  }, [treeWorkspace.assets, treeWorkspace.files]);

  useEffect(() => {
    if (!isNodeFileCanvasActive) return;
    const activeNodeFileAssetId = selectedAssetId?.trim() ?? '';
    const relatedNodeFileAssetIds = selectedFileId
      ? (nodeFileAssetIdsBySourceFileId.get(selectedFileId) ?? [])
      : [];
    const stableRelatedNodeFileAssetIds = Array.from(
      new Set<string>(relatedNodeFileAssetIds),
    ).sort((left: string, right: string): number => left.localeCompare(right));
    const nextHighlighted = [
      ...(activeNodeFileAssetId ? [activeNodeFileAssetId] : []),
      ...stableRelatedNodeFileAssetIds.filter(
        (assetId: string): boolean => assetId !== activeNodeFileAssetId,
      ),
    ];
    setHighlightedNodeFileAssetIds((currentHighlighted: string[]): string[] =>
      areStringArraysEqual(currentHighlighted, nextHighlighted)
        ? currentHighlighted
        : nextHighlighted,
    );
  }, [
    isNodeFileCanvasActive,
    nodeFileAssetIdsBySourceFileId,
    selectedAssetId,
    selectedFileId,
  ]);

  const highlightedNodeFileAssetIdSet = useMemo(
    () => new Set<string>(highlightedNodeFileAssetIds),
    [highlightedNodeFileAssetIds],
  );

  useEffect(() => {
    if (isNodeFileCanvasActive) return;
    if (highlightedNodeFileAssetIds.length === 0) return;
    setHighlightedNodeFileAssetIds([]);
  }, [highlightedNodeFileAssetIds.length, isNodeFileCanvasActive]);

  useEffect(() => {
    if (highlightedNodeFileAssetIds.length === 0) return;
    const validNodeFileAssetIds = new Set<string>(
      treeWorkspace.assets
        .filter((asset: CaseResolverAssetFile): boolean => asset.kind === 'node_file')
        .map((asset: CaseResolverAssetFile): string => asset.id),
    );
    const nextHighlighted = highlightedNodeFileAssetIds.filter(
      (assetId: string): boolean => validNodeFileAssetIds.has(assetId),
    );
    if (nextHighlighted.length === highlightedNodeFileAssetIds.length) return;
    setHighlightedNodeFileAssetIds(nextHighlighted);
  }, [highlightedNodeFileAssetIds, treeWorkspace.assets]);

  const highlightedFolderAncestorNodeIds = useMemo((): string[] => {
    if (highlightedNodeFileAssetIds.length === 0) return [];
    const highlighted = new Set<string>(highlightedNodeFileAssetIds);
    const ancestorNodeIds = new Set<string>();
    treeWorkspace.assets.forEach((asset: CaseResolverAssetFile): void => {
      if (asset.kind !== 'node_file') return;
      if (!highlighted.has(asset.id)) return;
      resolveFolderAncestorNodeIds(asset.folder).forEach(
        (folderNodeId: string): void => {
          ancestorNodeIds.add(folderNodeId);
        },
      );
    });
    return Array.from(ancestorNodeIds);
  }, [highlightedNodeFileAssetIds, treeWorkspace.assets]);

  const selectedFolderForCreate = useMemo((): string | null => {
    return selectedFolderPath;
  }, [selectedFolderPath]);

  const selectedFolderForFolderCreate =
    selectedFolderPath &&
      (
        isChildCaseStructureFolderPath(selectedFolderPath) ||
        isUnassignedFolderPath(selectedFolderPath)
      )
      ? ''
      : selectedFolderPath;

  const value = useMemo((): CaseResolverFolderTreeContextValue => ({
    masterNodes,
    treeWorkspace,
    selectedMasterNodeId,
    initialExpandedFolderNodeIds,
    adapter,
    showChildCaseFolders,
    setShowChildCaseFolders,
    highlightedNodeFileAssetIds,
    setHighlightedNodeFileAssetIds,
    highlightedNodeFileAssetIdSet,
    highlightedFolderAncestorNodeIds,
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
  }), [
    masterNodes,
    treeWorkspace,
    selectedMasterNodeId,
    initialExpandedFolderNodeIds,
    adapter,
    showChildCaseFolders,
    highlightedNodeFileAssetIds,
    highlightedNodeFileAssetIdSet,
    highlightedFolderAncestorNodeIds,
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
  ]);

  return (
    <CaseResolverFolderTreeContext.Provider value={value}>
      {children}
    </CaseResolverFolderTreeContext.Provider>
  );
}
