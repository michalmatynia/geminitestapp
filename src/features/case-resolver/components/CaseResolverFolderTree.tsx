'use client';

import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileImage,
  FilePlus,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  GripVertical,
  Lock,
  Trash2,
  Unlock,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

import {
  applyInternalMasterTreeDrop,
  isInternalMasterTreeNode,
  MasterFolderTree,
  type MasterFolderTreeProps,
  useMasterFolderTreeInstance,
} from '@/features/foldertree';
import {
  type CaseResolverAssetFile,
  type CaseResolverFile,
  type CaseResolverIdentifier,
  type CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { Button, FolderTreePanel, Switch } from '@/shared/ui';
import {
  DRAG_KEYS,
  resolveVerticalDropPosition,
  setDragData,
} from '@/shared/utils/drag-drop';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  createCaseResolverMasterTreeAdapter,
  type CaseResolverMasterTreeAdapterOperations,
} from '../adapter';
import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  emitCaseResolverDropDocumentToCanvas,
  emitCaseResolverShowDocumentInCanvas,
  type CaseResolverTreeDragPayload,
} from '../drag';
import {
  buildMasterNodesFromCaseResolverWorkspace,
  decodeCaseResolverMasterNodeId,
  fromCaseResolverAssetNodeId,
  fromCaseResolverFileNodeId,
  fromCaseResolverFolderNodeId,
  toCaseResolverAssetNodeId,
  toCaseResolverFileNodeId,
  toCaseResolverFolderNodeId,
} from '../master-tree';
import {
  buildCaseResolverNodeFileRelationIndexFromAssets,
  EMPTY_CASE_RESOLVER_NODE_FILE_RELATION_INDEX,
} from '../nodefile-relations';
import { resolveCaseResolverTreeWorkspace } from './case-resolver-tree-workspace';
import {
  canStartCaseResolverTreeNodeDrag,
  isCaseResolverDraggableFileNode,
  parseNullableNumber,
  parseNullableString,
  parseString,
  resolveAssetKind,
  type FolderCaseFileStats,
} from './CaseResolverFolderTree.helpers';


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

const CHILD_CASE_STRUCTURE_FOLDER_PATH =
  '__case_resolver_children_case_structure__';
const CHILD_CASE_STRUCTURE_NODE_ID = toCaseResolverFolderNodeId(
  CHILD_CASE_STRUCTURE_FOLDER_PATH,
);
const CHILD_CASE_STRUCTURE_METADATA_VALUE = 'children_case_structure';

const isChildCaseStructureFolderPath = (folderPath: string): boolean =>
  folderPath.trim() === CHILD_CASE_STRUCTURE_FOLDER_PATH;

const isChildCaseStructureNode = (
  node: Pick<MasterTreeNode, 'id' | 'metadata'>,
): boolean =>
  isChildCaseStructureFolderPath(fromCaseResolverFolderNodeId(node.id) ?? '') ||
  parseString(node.metadata?.['virtualSection']) ===
    CHILD_CASE_STRUCTURE_METADATA_VALUE;

type PendingNodeCanvasAction = {
  kind: 'drop' | 'show';
  fileId: string;
  name: string;
  folder: string;
  nodeId?: string | null;
  relatedNodeFileAssetIds: string[];
  targetNodeFileAssetId?: string | null;
};

export function CaseResolverFolderTree(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedFileId = searchParams.get('fileId');
  const {
    workspace,
    activeCaseId,
    requestedCaseStatus,
    canCreateInActiveCase,
    selectedFileId,
    selectedAssetId,
    selectedFolderPath,
    activeFile,
    onDeactivateActiveFile,
    onSelectFile,
    onSelectAsset,
    onSelectFolder,
    onCreateFolder,
    onCreateFile,
    onCreateScanFile,
    onCreateNodeFile,
    onMoveFile,
    onMoveAsset,
    onMoveFolder,
    onRenameFile,
    onRenameAsset,
    onRenameFolder,
    onDeleteFolder,
    onToggleFolderLock,
    onDeleteFile,
    onDeleteAsset,
    onToggleFileLock,
    onEditFile,
    caseResolverIdentifiers,
    onLinkRelatedFiles,
  } = useCaseResolverPageContext();
  const { ConfirmationModal } = useConfirm();
  const [highlightedNodeFileAssetIds, setHighlightedNodeFileAssetIds] =
    useState<string[]>([]);
  const [pendingNodeCanvasAction, setPendingNodeCanvasAction] =
    useState<PendingNodeCanvasAction | null>(null);
  const [showChildCaseFolders, setShowChildCaseFolders] = useState(false);
  const dragHandleNodeIdRef = React.useRef<string | null>(null);
  const clearDragHandleArming = React.useCallback((): void => {
    dragHandleNodeIdRef.current = null;
  }, []);

  useEffect((): (() => void) => {
    const events = [
      'dragend',
      'drop',
      'pointerup',
      'pointercancel',
      'mouseup',
      'blur',
    ] as const;
    events.forEach((eventName) => {
      window.addEventListener(eventName, clearDragHandleArming);
    });
    return (): void => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, clearDragHandleArming);
      });
    };
  }, [clearDragHandleArming]);

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

  const masterNodes = useMemo(
    (): MasterTreeNode[] => {
      const baseNodes = buildMasterNodesFromCaseResolverWorkspace(treeWorkspace);
      if (!showChildCaseFolders) return baseNodes;
      const rootCaseId = activeCaseFile?.id ?? null;
      if (!rootCaseId) return baseNodes;

      const childCaseIdSet = new Set<string>();
      treeWorkspace.files.forEach((file: CaseResolverFile): void => {
        if (file.fileType !== 'case') return;
        if (file.id === rootCaseId) return;
        childCaseIdSet.add(file.id);
      });
      if (childCaseIdSet.size === 0) return baseNodes;

      const fileOwnerCaseIdById = new Map<string, string>();
      treeWorkspace.files.forEach((file: CaseResolverFile): void => {
        if (file.fileType === 'case') return;
        const ownerCaseId = file.parentCaseId?.trim() ?? '';
        if (!ownerCaseId) return;
        fileOwnerCaseIdById.set(file.id, ownerCaseId);
      });

      const assetOwnerCaseIdById = new Map<string, string>();
      treeWorkspace.assets.forEach((asset: CaseResolverAssetFile): void => {
        const sourceFileId = asset.sourceFileId?.trim() ?? '';
        if (!sourceFileId) return;
        const ownerCaseId = fileOwnerCaseIdById.get(sourceFileId);
        if (!ownerCaseId) return;
        assetOwnerCaseIdById.set(asset.id, ownerCaseId);
      });

      const folderOwnerCaseIdsByPath = new Map<string, string[]>();
      const folderOwnerSetsByPath = new Map<string, Set<string>>();
      const addFolderOwner = (
        folderPath: string,
        ownerCaseId: string | null | undefined,
      ): void => {
        const normalizedOwnerCaseId = ownerCaseId?.trim() ?? '';
        if (!normalizedOwnerCaseId) return;
        forEachFolderPathAncestor(folderPath, (ancestorPath: string): void => {
          const currentOwners = folderOwnerSetsByPath.get(ancestorPath) ?? new Set<string>();
          currentOwners.add(normalizedOwnerCaseId);
          folderOwnerSetsByPath.set(ancestorPath, currentOwners);
        });
      };
      (treeWorkspace.folderRecords ?? []).forEach((record): void => {
        addFolderOwner(record.path, record.ownerCaseId);
      });
      treeWorkspace.files.forEach((file: CaseResolverFile): void => {
        if (file.fileType === 'case') return;
        addFolderOwner(file.folder, file.parentCaseId);
      });
      treeWorkspace.assets.forEach((asset: CaseResolverAssetFile): void => {
        addFolderOwner(asset.folder, assetOwnerCaseIdById.get(asset.id));
      });
      folderOwnerSetsByPath.forEach((ownerIds: Set<string>, folderPath: string): void => {
        folderOwnerCaseIdsByPath.set(folderPath, Array.from(ownerIds));
      });

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
    [activeCaseFile?.id, showChildCaseFolders, treeWorkspace],
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

  const adapterOperationsRef = React.useRef<CaseResolverMasterTreeAdapterOperations>({
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
    () =>
      createCaseResolverMasterTreeAdapter({
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

  const {
    appearance: { resolveIcon, rootDropUi },
    controller,
  } = useMasterFolderTreeInstance({
    instance: 'case_resolver',
    nodes: masterNodes,
    selectedNodeId: selectedMasterNodeId,
    initiallyExpandedNodeIds: initialExpandedFolderNodeIds,
    adapter,
  });

  const canStartTreeDrag = React.useCallback<
    NonNullable<MasterFolderTreeProps['canStartDrag']>
  >(({ node, event }): boolean => {
    const blockedChildStructureNode = isChildCaseStructureNode(node);
    const eventTarget = event.target;
    const fromEventTargetHandle =
      eventTarget instanceof Element &&
      eventTarget.closest('[data-master-tree-drag-handle="true"]') !== null;
    let fromPointerHandle = false;
    if (typeof document !== 'undefined') {
      const pointerElement = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      fromPointerHandle =
        pointerElement?.closest('[data-master-tree-drag-handle="true"]') !==
        null;
    }
    const fromHandleGesture = fromEventTargetHandle || fromPointerHandle;
    if (fromHandleGesture) {
      dragHandleNodeIdRef.current = node.id;
    }

    return canStartCaseResolverTreeNodeDrag({
      nodeType: node.type,
      nodeId: node.id,
      isChildStructureNode: blockedChildStructureNode,
      fromHandleGesture,
      armedNodeId: dragHandleNodeIdRef.current,
    });
  }, []);

  const armDragHandle = React.useCallback((nodeId: string): void => {
    dragHandleNodeIdRef.current = nodeId;
  }, []);

  const releaseDragHandle = React.useCallback((): void => {
    clearDragHandleArming();
  }, [clearDragHandleArming]);

  const selectedFolderForCreate = useMemo((): string | null => {
    if (!controller.selectedNodeId) return selectedFolderPath;
    const folderPath = fromCaseResolverFolderNodeId(controller.selectedNodeId);
    if (
      folderPath !== null &&
      !isChildCaseStructureFolderPath(folderPath)
    ) {
      return folderPath;
    }
    const selectedNode = controller.nodes.find(
      (node: MasterTreeNode) => node.id === controller.selectedNodeId,
    );
    if (!selectedNode?.parentId) return '';
    const parentFolderPath = fromCaseResolverFolderNodeId(selectedNode.parentId);
    if (
      parentFolderPath !== null &&
      !isChildCaseStructureFolderPath(parentFolderPath)
    ) {
      return parentFolderPath;
    }
    return '';
  }, [controller.nodes, controller.selectedNodeId, selectedFolderPath]);
  const selectedFolderForFolderCreate =
    selectedFolderPath && isChildCaseStructureFolderPath(selectedFolderPath)
      ? ''
      : selectedFolderPath;
  const createContextTooltip = useMemo((): string | null => {
    if (canCreateInActiveCase) return null;
    if (requestedCaseStatus === 'loading') return 'Loading case context...';
    if (requestedCaseStatus === 'missing')
      return 'Case context unavailable. Click to retry.';
    if (!activeCaseId) return 'Select a case first.';
    return 'Case context is not ready.';
  }, [activeCaseId, canCreateInActiveCase, requestedCaseStatus]);
  const disableCreateActions =
    !canCreateInActiveCase && requestedCaseStatus !== 'missing';
  const activeCaseIdentifierLabel = useMemo((): string | null => {
    const identifierId = activeCaseFile?.caseIdentifierId ?? null;
    if (!identifierId) return null;
    const match = caseResolverIdentifiers.find(
      (identifier: CaseResolverIdentifier) => identifier.id === identifierId,
    );
    return match?.name ?? identifierId;
  }, [activeCaseFile?.caseIdentifierId, caseResolverIdentifiers]);
  const activeCaseChildCount = useMemo((): number => {
    const caseId = activeCaseFile?.id ?? '';
    if (!caseId) return 0;
    return workspace.files.filter(
      (file: CaseResolverFile): boolean =>
        file.fileType === 'case' && file.parentCaseId === caseId,
    ).length;
  }, [activeCaseFile?.id, workspace.files]);
  const hasActiveCaseChildren = activeCaseChildCount > 0;
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

  useEffect((): void => {
    setShowChildCaseFolders(false);
  }, [activeCaseFile?.id]);

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

  useEffect(() => {
    if (highlightedFolderAncestorNodeIds.length === 0) return;
    const nextExpandedNodeIds = new Set<string>(
      Array.from(controller.expandedNodeIds).map((nodeId): string =>
        String(nodeId),
      ),
    );
    let changed = false;
    highlightedFolderAncestorNodeIds.forEach((folderNodeId: string): void => {
      if (nextExpandedNodeIds.has(folderNodeId)) return;
      nextExpandedNodeIds.add(folderNodeId);
      changed = true;
    });
    if (!changed) return;
    controller.setExpandedNodeIds(Array.from(nextExpandedNodeIds));
  }, [controller, highlightedFolderAncestorNodeIds]);

  useEffect(() => {
    if (!pendingNodeCanvasAction) return;
    if (!isNodeFileCanvasActive) return;
    if (
      pendingNodeCanvasAction.targetNodeFileAssetId &&
      selectedAssetId !== pendingNodeCanvasAction.targetNodeFileAssetId
    ) {
      return;
    }

    const timeoutId = window.setTimeout((): void => {
      if (pendingNodeCanvasAction.kind === 'drop') {
        emitCaseResolverDropDocumentToCanvas({
          fileId: pendingNodeCanvasAction.fileId,
          name: pendingNodeCanvasAction.name,
          folder: pendingNodeCanvasAction.folder,
        });
      } else {
        setHighlightedNodeFileAssetIds(
          pendingNodeCanvasAction.relatedNodeFileAssetIds,
        );
        emitCaseResolverShowDocumentInCanvas({
          fileId: pendingNodeCanvasAction.fileId,
          nodeId: pendingNodeCanvasAction.nodeId ?? null,
          relatedNodeFileAssetIds:
            pendingNodeCanvasAction.relatedNodeFileAssetIds,
        });
      }
      setPendingNodeCanvasAction(null);
    }, 0);

    return (): void => {
      window.clearTimeout(timeoutId);
    };
  }, [isNodeFileCanvasActive, pendingNodeCanvasAction, selectedAssetId]);

  const {
    FolderClosedIcon,
    FolderOpenIcon,
    DefaultFileIcon,
    ScanCaseFileIcon,
    NodeFileIcon,
    ImageFileIcon,
    PdfFileIcon,
    DragHandleIcon,
  } = useMemo(
    () => ({
      FolderClosedIcon: resolveIcon({
        slot: 'folderClosed',
        kind: 'folder',
        fallback: Folder,
        fallbackId: 'Folder',
      }),
      FolderOpenIcon: resolveIcon({
        slot: 'folderOpen',
        kind: 'folder',
        fallback: FolderOpen,
        fallbackId: 'FolderOpen',
      }),
      DefaultFileIcon: resolveIcon({
        slot: 'file',
        kind: 'case_file',
        fallback: FileText,
        fallbackId: 'FileText',
      }),
      ScanCaseFileIcon: resolveIcon({
        slot: 'file',
        kind: 'case_file_scan',
        fallback: FileImage,
        fallbackId: 'FileImage',
      }),
      NodeFileIcon: resolveIcon({
        slot: 'file',
        kind: 'node_file',
        fallback: FileCode2,
        fallbackId: 'FileCode2',
      }),
      ImageFileIcon: resolveIcon({
        slot: 'file',
        kind: 'asset_image',
        fallback: FileImage,
        fallbackId: 'FileImage',
      }),
      PdfFileIcon: resolveIcon({
        slot: 'file',
        kind: 'asset_pdf',
        fallback: FileText,
        fallbackId: 'FileText',
      }),
      DragHandleIcon: resolveIcon({
        slot: 'dragHandle',
        fallback: GripVertical,
        fallbackId: 'GripVertical',
      }),
    }),
    [resolveIcon],
  );

  return (
    <FolderTreePanel
      className='border-border bg-gray-900'
      bodyClassName='flex min-h-0 flex-1 flex-col'
      header={
        <div className='space-y-2 border-b border-border/60 px-2 py-2'>
          <div className='flex items-start justify-between gap-2'>
            <div className='min-w-0'>
              <div className='truncate text-sm font-semibold text-gray-100'>
                {activeCaseFile?.name ?? 'Case Resolver'}
              </div>
              <div className='mt-0.5 text-xs text-muted-foreground/80'>
                {activeCaseIdentifierLabel
                  ? `Signature ID: ${activeCaseIdentifierLabel}`
                  : 'No signature ID'}
              </div>
            </div>
            <div className='flex shrink-0 items-start gap-1'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50'
                onClick={(): void => {
                  router.push('/admin/case-resolver/cases');
                }}
              >
                ALL CASES
              </Button>
            </div>
          </div>
          {hasActiveCaseChildren ? (
            <div className='flex items-center justify-between rounded border border-border/60 bg-card/35 px-2 py-1.5'>
              <div className='text-[11px] text-gray-300'>
                Show children folders ({activeCaseChildCount})
              </div>
              <Switch
                checked={showChildCaseFolders}
                onCheckedChange={(checked): void => {
                  setShowChildCaseFolders(checked === true);
                }}
                aria-label='Show children case folders'
                className='h-5 w-9'
              />
            </div>
          ) : null}
          {createContextTooltip ? (
            <div className='rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-200'>
              {createContextTooltip}
            </div>
          ) : null}
          <div className='flex flex-wrap items-center gap-1'>
            <Button
              type='button'
              onClick={(): void => {
                onCreateFolder(selectedFolderForFolderCreate);
              }}
              size='sm'
              variant='outline'
              className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
              title={createContextTooltip ?? 'Add folder'}
              disabled={disableCreateActions}
            >
              <FolderPlus className='size-4' />
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                onCreateFile(selectedFolderForCreate);
              }}
              size='sm'
              variant='outline'
              className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
              title={createContextTooltip ?? 'Add case file'}
              disabled={disableCreateActions}
            >
              <FilePlus className='size-4' />
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                onCreateScanFile(selectedFolderForCreate);
              }}
              size='sm'
              variant='outline'
              className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
              title={createContextTooltip ?? 'Create new image file'}
              disabled={disableCreateActions}
            >
              <FileImage className='size-4' />
            </Button>
            <Button
              type='button'
              onClick={(): void => {
                onCreateNodeFile(selectedFolderForCreate);
              }}
              size='sm'
              variant='outline'
              className='h-7 w-7 border p-0 text-gray-300 hover:bg-muted/50'
              title={createContextTooltip ?? 'Add node file'}
              disabled={disableCreateActions}
            >
              <FileCode2 className='size-4' />
            </Button>
          </div>
        </div>
      }
    >
      <div className='min-h-0 flex-1 overflow-auto p-2'>
        <MasterFolderTree
          controller={controller}
          canStartDrag={canStartTreeDrag}
          rootDropUi={rootDropUi}
          canDrop={({
            draggedNodeId,
            targetId,
            position,
            defaultAllowed,
          }): boolean => {
            const draggedNode = controller.nodes.find(
              (candidate: MasterTreeNode): boolean => candidate.id === draggedNodeId,
            );
            if (draggedNode && isChildCaseStructureNode(draggedNode)) return false;
            const targetNode = targetId
              ? controller.nodes.find(
                (candidate: MasterTreeNode): boolean => candidate.id === targetId,
              )
              : null;
            if (targetNode && isChildCaseStructureNode(targetNode)) return false;
            if (defaultAllowed) return true;
            const dragged = decodeCaseResolverMasterNodeId(draggedNodeId);
            if (!dragged) return false;
            if (dragged.entity !== 'file' && dragged.entity !== 'asset')
              return false;

            if (position === 'inside') {
              if (targetId === null) return true;
              if (fromCaseResolverFolderNodeId(targetId) !== null) return true;
              // Allow file-on-file center drop for relation linking
              const targetFileId = fromCaseResolverFileNodeId(targetId);
              const draggedFileId = fromCaseResolverFileNodeId(draggedNodeId);
              return !!(targetFileId && draggedFileId && targetFileId !== draggedFileId);
            }

            return targetId !== null;
          }}
          resolveDropPosition={(event, { draggedNodeId, targetId }, ctlr) => {
            const targetNode = ctlr.nodes.find(
              (candidate: MasterTreeNode): boolean => candidate.id === targetId,
            );
            if (targetNode?.type === 'folder') {
              return 'inside';
            }
            // File-on-file: whole row is a link drop zone
            const draggedFileId = fromCaseResolverFileNodeId(draggedNodeId);
            const targetFileId = fromCaseResolverFileNodeId(targetId);
            if (draggedFileId && targetFileId && draggedFileId !== targetFileId) {
              return 'inside';
            }
            const targetRect = event.currentTarget.getBoundingClientRect();
            const edgePosition = resolveVerticalDropPosition(
              event.clientY,
              targetRect,
              {
                thresholdRatio: 0.34,
              },
            );
            return edgePosition ?? 'after';
          }}
          onNodeDragStart={({ node, event }): void => {
            const metadata = node.metadata;
            if (!metadata || typeof metadata !== 'object') return;

            let payload: CaseResolverTreeDragPayload | null = null;
            if (metadata['entity'] === 'asset') {
              const assetId = parseString(metadata['rawId']);
              if (!assetId) return;
              payload = {
                source: 'case_resolver_tree',
                entity: 'asset',
                assetId,
                assetKind: resolveAssetKind(metadata['assetKind']),
                name: node.name,
                folder: parseString(metadata['folder']),
                filepath: parseNullableString(metadata['filepath']),
                mimeType: parseNullableString(metadata['mimeType']),
                size: parseNullableNumber(metadata['size']),
                textContent: parseString(metadata['textContent']),
                description: parseString(metadata['description']),
              };
            }

            if (metadata['entity'] === 'file') {
              const fileId = parseString(metadata['rawId']);
              if (!fileId) return;
              payload = {
                source: 'case_resolver_tree',
                entity: 'file',
                fileId,
                name: node.name,
                folder: parseString(metadata['folder']),
              };
            }

            if (!payload) return;

            setDragData(
              event.dataTransfer,
              { [DRAG_KEYS.CASE_RESOLVER_ITEM]: JSON.stringify(payload) },
              { text: payload.name, effectAllowed: 'copyMove' },
            );
          }}
          onNodeDrop={async (
            { draggedNodeId, targetId, position, rootDropZone },
            ctlr,
          ): Promise<void> => {
            const isInternal = isInternalMasterTreeNode(
              ctlr.nodes,
              draggedNodeId,
            );
            if (!isInternal) return;

            // File-on-file center drop → link as related documents
            if (position === 'inside' && targetId !== null) {
              const draggedFileId = fromCaseResolverFileNodeId(draggedNodeId);
              const targetFileId = fromCaseResolverFileNodeId(targetId);
              if (draggedFileId && targetFileId) {
                onLinkRelatedFiles(draggedFileId, targetFileId);
                return;
              }
            }

            await applyInternalMasterTreeDrop({
              controller: ctlr,
              draggedNodeId,
              targetId,
              position,
              rootDropZone,
            });
          }}
          renderNode={({
            node,
            depth,
            hasChildren,
            isExpanded,
            isSelected,
            isRenaming,
            isDragging,
            isDropTarget,
            dropPosition,
            select,
            toggleExpand,
            startRename,
          }): React.JSX.Element => {
            const folderPath = fromCaseResolverFolderNodeId(node.id);
            const fileId = fromCaseResolverFileNodeId(node.id);
            const assetId = fromCaseResolverAssetNodeId(node.id);
            const fileType = parseString(node.metadata?.['fileType']);
            const isCaseFileKind = node.kind.startsWith('case_file');
            const isCaseFile =
              Boolean(fileId) &&
              (isCaseFileKind ||
                fileType === 'document' ||
                fileType === 'scanfile');
            const isScanCaseFile =
              Boolean(fileId) &&
              (node.kind === 'case_file_scan' || fileType === 'scanfile');
            const isCanvasCaseFile = Boolean(fileId) && isCaseFile;
            const isNodeFileAsset =
              Boolean(assetId) && node.kind === 'node_file';
            const isChildStructureSectionNode = isChildCaseStructureNode(node);
            const isDraggableFileNode = isCaseResolverDraggableFileNode({
              nodeType: node.type,
              fileType,
              isChildStructureNode: isChildStructureSectionNode,
            });
            const isHighlightedNodeFile = Boolean(
              assetId && highlightedNodeFileAssetIdSet.has(assetId),
            );
            const isFileLocked = fileId
              ? fileLockById.get(fileId) === true
              : false;
            const isFolder = folderPath !== null;
            const folderStats = folderPath
              ? (folderCaseFileStatsByPath.get(folderPath) ?? null)
              : null;
            const folderHasCaseFiles = Boolean(
              folderStats && folderStats.total > 0,
            );
            const folderHasLockedFiles = Boolean(
              folderStats && folderStats.locked > 0,
            );
            const isFolderLocked = Boolean(
              folderStats &&
              folderStats.total > 0 &&
              folderStats.total === folderStats.locked,
            );
            const nodeOwnerCaseIds = (() => {
              if (isChildStructureSectionNode) return [];
              if (folderPath !== null) {
                return folderOwnerCaseIdsByPath.get(folderPath) ?? [];
              }
              if (fileId) {
                const ownerCaseId = fileOwnerCaseIdById.get(fileId);
                return ownerCaseId ? [ownerCaseId] : [];
              }
              if (assetId) {
                const ownerCaseId = assetOwnerCaseIdById.get(assetId);
                return ownerCaseId ? [ownerCaseId] : [];
              }
              return [];
            })();
            const childOwnerCaseIds = nodeOwnerCaseIds.filter((caseId: string): boolean =>
              childCaseIdSet.has(caseId),
            );
            const childOwnerCaseNames = Array.from(
              new Set(
                childOwnerCaseIds.map(
                  (caseId: string): string => caseNameById.get(caseId) ?? caseId,
                ),
              ),
            );
            const isChildOwnedStructureNode = childOwnerCaseNames.length > 0;
            const childStructureHint =
              childOwnerCaseNames.length === 1
                ? `Child case structure: ${childOwnerCaseNames[0]}`
                : `Child case structure: ${childOwnerCaseNames.join(', ')}`;
            const hoverOnlyControlClass = isSelected
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100';
            const canToggle = isFolder && hasChildren;
            const Icon = (() => {
              if (isFolder) {
                return canToggle && isExpanded
                  ? FolderOpenIcon
                  : FolderClosedIcon;
              }
              if (node.kind === 'node_file') {
                return NodeFileIcon;
              }
              if (node.kind === 'case_file_scan') {
                return ScanCaseFileIcon;
              }
              if (isCanvasCaseFile && !isScanCaseFile) {
                return DefaultFileIcon;
              }
              if (node.kind === 'asset_image') {
                return ImageFileIcon;
              }
              if (node.kind === 'asset_pdf') {
                return PdfFileIcon;
              }
              return DefaultFileIcon;
            })();

            const isLinkDropTarget = isDropTarget && dropPosition === 'inside' && fileId !== null;
            const stateClassName = isChildStructureSectionNode
              ? isSelected
                ? 'bg-cyan-600/30 text-cyan-50 ring-1 ring-inset ring-cyan-400/70'
                : 'bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15'
              : isSelected
                ? 'bg-blue-600 text-white'
                : isHighlightedNodeFile
                  ? 'bg-violet-500/15 text-violet-100 ring-1 ring-inset ring-violet-400/60'
                  : isLinkDropTarget
                    ? 'bg-teal-500/20 text-teal-100 ring-2 ring-inset ring-teal-400/70'
                    : dropPosition === 'before'
                      ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-blue-500/60'
                      : dropPosition === 'after'
                        ? 'bg-blue-500/10 text-gray-100 ring-1 ring-inset ring-cyan-400/60'
                        : isDragging
                          ? 'opacity-50 text-gray-200'
                          : isDropTarget
                            ? 'bg-cyan-500/10 text-cyan-100'
                            : 'text-gray-300 hover:bg-muted/50';

            return (
              <div
                className={`group flex cursor-pointer items-center gap-1 rounded px-2 py-1.5 text-sm ${stateClassName}`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                role='button'
                tabIndex={0}
                title={
                  isChildStructureSectionNode
                    ? 'Children cases folder structure'
                    : isNodeFileAsset
                      ? 'Canvas file — click to open'
                      : isCanvasCaseFile
                        ? 'Drag file to canvas'
                        : node.name
                }
                onClick={(): void => {
                  if (!isSelected) {
                    select();
                  }
                  if (isChildStructureSectionNode) return;
                  if (folderPath !== null) {
                    onSelectFolder(folderPath);
                    return;
                  }
                  if (fileId) {
                    if (isSelected && fileType !== 'case') {
                      onDeactivateActiveFile();
                      return;
                    }
                    if (fileType === 'document' || fileType === 'scanfile') {
                      onEditFile(fileId);
                    } else {
                      onSelectFile(fileId);
                    }
                    return;
                  }
                  if (assetId) {
                    onSelectAsset(assetId);
                  }
                }}
                onDoubleClick={(): void => {
                  if (isChildStructureSectionNode) return;
                  startRename();
                }}
                onKeyDown={(
                  event: React.KeyboardEvent<HTMLDivElement>,
                ): void => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    if (!isSelected) {
                      select();
                    }
                    if (isChildStructureSectionNode) return;
                    if (folderPath !== null) {
                      onSelectFolder(folderPath);
                      return;
                    }
                    if (fileId) {
                      if (isSelected && fileType !== 'case') {
                        onDeactivateActiveFile();
                        return;
                      }
                      if (fileType === 'document' || fileType === 'scanfile') {
                        onEditFile(fileId);
                      } else {
                        onSelectFile(fileId);
                      }
                      return;
                    }
                    if (assetId) {
                      onSelectAsset(assetId);
                    }
                  }
                }}
              >
                <span
                  data-master-tree-drag-handle='true'
                  onPointerDown={(): void => {
                    if (!isDraggableFileNode) return;
                    armDragHandle(node.id);
                  }}
                  onPointerUp={releaseDragHandle}
                  onPointerCancel={releaseDragHandle}
                  onMouseDown={(): void => {
                    if (!isDraggableFileNode) return;
                    armDragHandle(node.id);
                  }}
                  onMouseUp={releaseDragHandle}
                  className={`inline-flex size-5 shrink-0 items-center justify-center rounded ${
                    isDraggableFileNode ? `cursor-grab active:cursor-grabbing ${hoverOnlyControlClass}` : 'cursor-default'
                  }`}
                >
                  <DragHandleIcon
                    className={`size-3 ${
                      isDraggableFileNode
                        ? (isNodeFileAsset
                          ? 'text-violet-400/80'
                          : 'text-sky-300/90')
                        : 'text-gray-500'
                    }`}
                  />
                </span>
                {canToggle ? (
                  <button
                    type='button'
                    className='inline-flex size-4 items-center justify-center rounded hover:bg-muted/50'
                    onClick={(event): void => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleExpand();
                    }}
                    aria-label={
                      isExpanded ? 'Collapse folder' : 'Expand folder'
                    }
                  >
                    {isExpanded ? (
                      <ChevronDown className='size-3' />
                    ) : (
                      <ChevronRight className='size-3' />
                    )}
                  </button>
                ) : (
                  <span
                    className={`inline-flex size-4 items-center justify-center text-xs ${
                      isCaseFile && isFileLocked
                        ? 'text-amber-300 opacity-100'
                        : 'opacity-40'
                    }`}
                    title={
                      isCaseFile && isFileLocked
                        ? 'Document is locked'
                        : undefined
                    }
                  >
                    •
                  </span>
                )}
                <Icon className='size-4 shrink-0' />
                {isFolder && isFolderLocked && !isChildStructureSectionNode ? (
                  <Lock
                    className='size-3.5 shrink-0 text-amber-300'
                    aria-hidden='true'
                  />
                ) : null}
                {isChildOwnedStructureNode ? (
                  <span
                    className='inline-flex size-4 shrink-0 items-center justify-center rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-200'
                    title={childStructureHint}
                    aria-label={childStructureHint}
                  >
                    <GitBranch className='size-3' />
                  </span>
                ) : null}
                <div className='min-w-0 flex flex-1 items-center gap-1'>
                  {isRenaming ? (
                    <input
                      autoFocus
                      value={controller.renameDraft}
                      onChange={(
                        event: React.ChangeEvent<HTMLInputElement>,
                      ): void => {
                        controller.updateRenameDraft(event.target.value);
                      }}
                      onBlur={(): void => {
                        void controller.commitRename();
                      }}
                      onKeyDown={(
                        event: React.KeyboardEvent<HTMLInputElement>,
                      ): void => {
                        event.stopPropagation();
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          void controller.commitRename();
                        } else if (event.key === 'Escape') {
                          event.preventDefault();
                          controller.cancelRename();
                        }
                      }}
                      onClick={(
                        event: React.MouseEvent<HTMLInputElement>,
                      ): void => {
                        event.stopPropagation();
                      }}
                      onDoubleClick={(
                        event: React.MouseEvent<HTMLInputElement>,
                      ): void => {
                        event.stopPropagation();
                      }}
                      className='min-w-0 flex-1 rounded border border-blue-500 bg-gray-800 px-1.5 py-0.5 text-sm text-white outline-none'
                    />
                  ) : (
                    <>
                      <span className='min-w-0 flex-1 truncate'>
                        {node.name}
                      </span>
                      {isChildOwnedStructureNode ? (
                        <span
                          className='inline-flex max-w-[140px] shrink-0 items-center truncate rounded border border-cyan-500/30 bg-cyan-500/10 px-1 text-[10px] font-medium text-cyan-200'
                          title={childStructureHint}
                        >
                          {childOwnerCaseNames.length === 1
                            ? childOwnerCaseNames[0]
                            : `${childOwnerCaseNames.length} child cases`}
                        </span>
                      ) : null}
                      {isLinkDropTarget ? (
                        <span className='shrink-0 rounded bg-teal-500/30 px-1 text-[10px] font-medium text-teal-200'>
                          Link →
                        </span>
                      ) : null}
                    </>
                  )}
                </div>
                {!isRenaming &&
                isFolder &&
                folderPath !== null &&
                !isChildStructureSectionNode ? (
                    <div
                      className={`flex shrink-0 items-center gap-1 transition ${
                        hoverOnlyControlClass
                      }`}
                    >
                      <button
                        type='button'
                        className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-gray-300 transition hover:bg-muted/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50'
                        title={
                          !folderHasCaseFiles
                            ? 'No case files in folder'
                            : isFolderLocked
                              ? 'Unlock folder files'
                              : 'Lock folder files'
                        }
                        aria-label={
                          !folderHasCaseFiles
                            ? 'No case files in folder'
                            : isFolderLocked
                              ? 'Unlock folder files'
                              : 'Lock folder files'
                        }
                        disabled={!folderHasCaseFiles}
                        onClick={(event): void => {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleFolderLock(folderPath);
                        }}
                      >
                        {isFolderLocked ? (
                          <Unlock className='size-3.5' />
                        ) : (
                          <Lock className='size-3.5' />
                        )}
                      </button>
                      <button
                        type='button'
                        className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50'
                        title={
                          folderHasLockedFiles
                            ? 'Unlock folder files before removing'
                            : 'Remove folder'
                        }
                        aria-label='Remove folder'
                        disabled={folderHasLockedFiles}
                        onClick={(event): void => {
                          event.preventDefault();
                          event.stopPropagation();
                          onDeleteFolder(folderPath);
                        }}
                      >
                        <Trash2 className='size-3.5' />
                      </button>
                    </div>
                  ) : null}
                {!isRenaming && isCaseFile && fileId ? (
                  <div
                    className={`flex shrink-0 items-center gap-1 transition ${
                      hoverOnlyControlClass
                    }`}
                  >
                    <button
                      type='button'
                      className={`inline-flex size-6 items-center justify-center rounded border transition ${
                        isFileLocked
                          ? 'border-amber-400/50 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 hover:text-amber-100'
                          : 'border-border/60 bg-card/60 text-gray-300 hover:bg-muted/60 hover:text-white'
                      }`}
                      title={isFileLocked ? 'Unlock file' : 'Lock file'}
                      aria-label={isFileLocked ? 'Unlock file' : 'Lock file'}
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onToggleFileLock(fileId);
                      }}
                    >
                      {isFileLocked ? (
                        <Lock className='size-3.5' />
                      ) : (
                        <Unlock className='size-3.5' />
                      )}
                    </button>
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50'
                      title={
                        isFileLocked
                          ? 'Unlock file before removing'
                          : 'Remove file'
                      }
                      aria-label='Remove file'
                      disabled={isFileLocked}
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteFile(fileId);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                ) : null}
                {!isRenaming && isNodeFileAsset && assetId ? (
                  <div
                    className={`flex shrink-0 items-center gap-1 transition ${
                      hoverOnlyControlClass
                    }`}
                  >
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/60 text-red-300 transition hover:bg-red-500/20 hover:text-red-200'
                      title='Remove node file'
                      aria-label='Remove node file'
                      onClick={(event): void => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDeleteAsset(assetId);
                      }}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                ) : null}
              </div>
            );
          }}
        />
      </div>
      <ConfirmationModal />
    </FolderTreePanel>
  );
}
