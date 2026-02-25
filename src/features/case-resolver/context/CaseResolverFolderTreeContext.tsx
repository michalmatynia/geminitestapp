'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

import type { 
  CaseResolverFile, 
  CaseResolverWorkspace,
  CaseResolverAssetFile
} from '@/shared/contracts/case-resolver';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
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
  EMPTY_CASE_RESOLVER_NODE_FILE_RELATION_INDEX
} from '../nodefile-relations';
import { 
  type FolderCaseFileStats,
  parseString,
} from '../components/CaseResolverFolderTree.helpers';

const CHILD_CASE_STRUCTURE_FOLDER_PATH = '__case_resolver_children_case_structure__';
const CHILD_CASE_STRUCTURE_NODE_ID = toCaseResolverFolderNodeId(CHILD_CASE_STRUCTURE_FOLDER_PATH);
const CHILD_CASE_STRUCTURE_METADATA_VALUE = 'children_case_structure';

export const isChildCaseStructureFolderPath = (folderPath: string): boolean =>
  folderPath.trim() === CHILD_CASE_STRUCTURE_FOLDER_PATH;

export const isChildCaseStructureNode = (
  node: Pick<MasterTreeNode, 'id' | 'metadata'>,
): boolean =>
  isChildCaseStructureFolderPath(fromCaseResolverFolderNodeId(node.id) ?? '') ||
  parseString(node.metadata?.['virtualSection']) === CHILD_CASE_STRUCTURE_METADATA_VALUE;

export interface CaseResolverFolderTreeContextValue {
  // Tree Data
  masterNodes: MasterTreeNode[];
  treeWorkspace: CaseResolverWorkspace;
  selectedMasterNodeId: string | null;
  initialExpandedFolderNodeIds: string[];
  adapter: any; // Using any for adapter for now, but will type if possible
  
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
    () => ({
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
      if (!showChildCaseFolders) return baseNodes;
      const rootCaseId = activeCaseFile?.id ?? null;
      if (!rootCaseId) return baseNodes;

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

      let hasChildStructureRoots = false;
      const remappedNodes = baseNodes.map((node: MasterTreeNode): MasterTreeNode => {
        if (node.parentId !== null) return node;
        if (isChildCaseStructureNode(node)) return node;
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
      if (!hasChildStructureRoots) return baseNodes;

      return [
        ...remappedNodes,
        {
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
        },
      ];
    },
    [activeCaseFile?.id, childCaseIdSet, fileOwnerCaseIdById, assetOwnerCaseIdById, folderOwnerCaseIdsByPath, showChildCaseFolders, treeWorkspace],
  );

  const selectedMasterNodeId = useMemo((): string | null => {
    if (selectedFileId) return toCaseResolverFileNodeId(selectedFileId);
    if (selectedAssetId) return toCaseResolverAssetNodeId(selectedAssetId);
    if (
      selectedFolderPath !== null &&
      !isChildCaseStructureFolderPath(selectedFolderPath)
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

  const nodeFileRelations = useMemo(() => {
    if (treeWorkspace.assets.length === 0) {
      return EMPTY_CASE_RESOLVER_NODE_FILE_RELATION_INDEX;
    }
    return buildCaseResolverNodeFileRelationIndexFromAssets({
      assets: treeWorkspace.assets,
      files: treeWorkspace.files,
    });
  }, [treeWorkspace.assets, treeWorkspace.files]);

  const nodeFileAssetIdsBySourceFileId = useMemo((): Map<string, string[]> => {
    return new Map<string, string[]>(
      Object.entries(nodeFileRelations.nodeFileAssetIdsByDocumentFileId),
    );
  }, [nodeFileRelations.nodeFileAssetIdsByDocumentFileId]);

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
    // This part requires access to controller.selectedNodeId which is not available yet.
    // I'll handle it by passing a placeholder or using a ref if needed, but for now
    // let's just use selectedFolderPath from page context as fallback.
    return selectedFolderPath;
  }, [selectedFolderPath]);

  const selectedFolderForFolderCreate =
    selectedFolderPath && isChildCaseStructureFolderPath(selectedFolderPath)
      ? ''
      : selectedFolderPath;

  const value = useMemo((): CaseResolverFolderTreeContextValue => ({
    masterNodes,
    treeWorkspace,
    selectedMasterNodeId,
    initialExpandedFolderNodeIds,
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
    isNodeFileCanvasActive,
    selectedFolderForCreate,
    selectedFolderForFolderCreate,
  }), [
    masterNodes,
    treeWorkspace,
    selectedMasterNodeId,
    initialExpandedFolderNodeIds,
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
