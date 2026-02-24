'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  useCanvasActions,
  useCanvasRefs,
  useCanvasState,
  useGraphActions,
  useGraphState,
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context';
import {
  stableStringify,
} from '@/features/ai/ai-paths/lib';
import {
  VALIDATOR_PATTERN_LISTS_KEY,
  parseValidatorPatternLists,
} from '@/features/admin/pages/validator-scope';
import {
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
} from '@/features/prompt-engine/settings';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui';
import type { 
  AiNode, 
  CaseResolverNodeMeta, 
  CaseResolverEdgeMeta, 
  CaseResolverFile,
  CaseResolverNodeFileSnapshot,
  CaseResolverIdentifier,
  CaseResolverCompileResult,
  Edge
} from '@/shared/contracts/case-resolver';
import {
  collectScopedCaseIds,
  normalizeFolderPathSegments,
  resolveIdentifierSearchLabel,
  resolvePartyReferenceSearchLabel,
  normalizeSearchText,
  isFolderPathWithinScope,
  NodeFileDocumentSearchScope,
  NodeFileDocumentSearchRow,
  NodeFileDocumentFolderTree,
  NodeFileDocumentFolderNode
} from '../components/CaseResolverNodeFileUtils';
import { compileCaseResolverPrompt } from '../composer';
import { applyCaseResolverPlainTextValidation } from '../plain-text-validation';

export type UseNodeFileWorkspaceStateProps = {
  assetId: string;
  assetName: string;
  snapshot: CaseResolverNodeFileSnapshot;
  onSnapshotChange: (updated: CaseResolverNodeFileSnapshot) => void;
};

export function useNodeFileWorkspaceState({
  assetId,
  assetName,
  snapshot,
  onSnapshotChange,
}: UseNodeFileWorkspaceStateProps) {
  const {
    workspace,
    activeCaseId,
    caseResolverIdentifiers,
    onSelectFile,
  } = useCaseResolverPageContext();
  const { viewportRef, canvasRef } = useCanvasRefs();
  const { view } = useCanvasState();
  const { setView } = useCanvasActions();
  const { nodes, edges } = useGraphState();
  const { addNode, setNodes, updateNode, setEdges } = useGraphActions();
  const { selectedNodeId, selectedEdgeId, configOpen } = useSelectionState();
  const { selectNode, setConfigOpen } = useSelectionActions();
  const { toast } = useToast();
  const settingsMap = useSettingsMap({ scope: 'light' });
  
  const rawPatternLists = settingsMap.data?.get(VALIDATOR_PATTERN_LISTS_KEY) ?? null;
  const validatorPatternLists = useMemo(
    () => parseValidatorPatternLists(rawPatternLists),
    [rawPatternLists]
  );
  const rawPromptEngineSettings = settingsMap.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptEngineSettings),
    [rawPromptEngineSettings]
  );

  const [newNodeType, setNewNodeType] = useState<'prompt' | 'model' | 'template' | 'database' | 'viewer'>('prompt');
  const [isSidePanelVisible, setIsSidePanelVisible] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpen] = useState(false);
  const [isLinkedPreviewOpen, setIsLinkedPreviewOpen] = useState(false);
  const [showNodeSelectorUnderCanvas, setShowNodeSelectorUnderCanvas] = useState(
    () => nodes.length > 0
  );
  const [documentSearchScope, setDocumentSearchScope] =
    useState<NodeFileDocumentSearchScope>('case_scope');
  const [documentSearchQuery, setDocumentSearchQuery] = useState('');
  const [selectedSearchFolderPath, setSelectedSearchFolderPath] = useState<string | null>(
    null
  );
  const [expandedSearchFolderPaths, setExpandedSearchFolderPaths] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedSearchDocumentId, setSelectedSearchDocumentId] = useState('');
  const [isDocumentSearchOpen, setIsDocumentSearchOpen] = useState(false);
  const [nodeMetaByNode, setNodeMetaByNode] = useState<Record<string, CaseResolverNodeMeta>>(
    () => snapshot.nodeMeta ?? {}
  );
  const [edgeMetaByEdge, setEdgeMetaByEdge] = useState<Record<string, CaseResolverEdgeMeta>>(
    () => snapshot.edgeMeta ?? {}
  );

  const nodeFileMetaRef = useRef<Record<string, CaseResolverSnapshotNodeMeta>>(
    snapshot.nodeFileMeta ?? {}
  );
  const documentSearchRef = useRef<HTMLDivElement | null>(null);

  const filesById = useMemo(
    () =>
      new Map<string, CaseResolverFile>(
        workspace.files.map((f: CaseResolverFile): [string, CaseResolverFile] => [f.id, f])
      ),
    [workspace.files]
  );

  const caseIdentifierLabelById = useMemo((): Map<string, string> => {
    const labelsById = new Map<string, string>();
    caseResolverIdentifiers.forEach((identifier: CaseResolverIdentifier): void => {
      const id = identifier.id;
      const resolvedLabel = identifier.label || identifier.name || id;
      labelsById.set(id, resolvedLabel);
    });
    return labelsById;
  }, [caseResolverIdentifiers]);

  const scopedCaseIds = useMemo(
    (): Set<string> | null => collectScopedCaseIds(workspace.files, activeCaseId),
    [activeCaseId, workspace.files]
  );

  const allSearchableFiles = useMemo(
    (): CaseResolverFile[] =>
      workspace.files.filter((file: CaseResolverFile): boolean => file.fileType !== 'case'),
    [workspace.files]
  );

  const caseScopedSearchableFiles = useMemo(
    (): CaseResolverFile[] => {
      if (!activeCaseId || !scopedCaseIds || scopedCaseIds.size === 0) {
        return allSearchableFiles;
      }
      return allSearchableFiles.filter((file: CaseResolverFile): boolean =>
        Boolean(file.parentCaseId && scopedCaseIds.has(file.parentCaseId))
      );
    },
    [activeCaseId, allSearchableFiles, scopedCaseIds]
  );

  const documentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const sourceFiles =
      documentSearchScope === 'all_cases' ? allSearchableFiles : caseScopedSearchableFiles;
    return sourceFiles
      .map((file: CaseResolverFile): NodeFileDocumentSearchRow => {
        const folderPath = typeof file.folder === 'string' ? file.folder.trim() : '';
        const folderSegments = normalizeFolderPathSegments(folderPath);
        const signatureLabel = resolveIdentifierSearchLabel(
          file.caseIdentifierId,
          caseIdentifierLabelById
        );
        const addresserLabel = resolvePartyReferenceSearchLabel(file.addresser);
        const addresseeLabel = resolvePartyReferenceSearchLabel(file.addressee);
        const searchable = normalizeSearchText(
          [
            file.name,
            file.folder,
            signatureLabel,
            addresserLabel,
            addresseeLabel,
          ].join(' ')
        );
        return {
          file,
          signatureLabel,
          addresserLabel,
          addresseeLabel,
          folderPath,
          folderSegments,
          searchable,
        };
      });
  }, [allSearchableFiles, caseIdentifierLabelById, caseScopedSearchableFiles, documentSearchScope]);

  const folderScopedDocumentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    if (selectedSearchFolderPath === null) return documentSearchRows;
    return documentSearchRows.filter((row: NodeFileDocumentSearchRow): boolean =>
      isFolderPathWithinScope(row.folderPath, selectedSearchFolderPath)
    );
  }, [documentSearchRows, selectedSearchFolderPath]);

  const visibleDocumentSearchRows = useMemo((): NodeFileDocumentSearchRow[] => {
    const query = normalizeSearchText(documentSearchQuery);
    if (!query) return folderScopedDocumentSearchRows;
    return folderScopedDocumentSearchRows.filter((row: NodeFileDocumentSearchRow): boolean =>
      row.searchable.includes(query)
    );
  }, [documentSearchQuery, folderScopedDocumentSearchRows]);

  const folderTree = useMemo((): NodeFileDocumentFolderTree => {
    const nodesByPath = new Map<string, NodeFileDocumentFolderNode>();
    const childPathsByParent = new Map<string | null, string[]>();
    let rootFileCount = 0;

    documentSearchRows.forEach((row: NodeFileDocumentSearchRow): void => {
      if (!row.folderPath) {
        rootFileCount += 1;
        return;
      }
      let currentPath = '';
      row.folderSegments.forEach((segment: string, index: number): void => {
        const parentPath = currentPath || null;
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        if (!nodesByPath.has(currentPath)) {
          nodesByPath.set(currentPath, {
            path: currentPath,
            name: segment,
            parentPath,
            depth: index,
            directFileCount: 0,
            descendantFileCount: 0,
          });
          const siblings = childPathsByParent.get(parentPath) ?? [];
          siblings.push(currentPath);
          childPathsByParent.set(parentPath, siblings);
        }
        const node = nodesByPath.get(currentPath)!;
        node.descendantFileCount += 1;
        if (index === row.folderSegments.length - 1) {
          node.directFileCount += 1;
        }
      });
    });

    childPathsByParent.forEach((paths: string[]): void => {
      paths.sort((a: string, b: string): number =>
        nodesByPath.get(a)!.name.localeCompare(nodesByPath.get(b)!.name)
      );
    });

    return { nodesByPath, childPathsByParent, rootFileCount };
  }, [documentSearchRows]);

  // Compiled graph logic
  const compiled = useMemo((): CaseResolverCompileResult => {
    const nodeResults: Record<string, string> = {};
    const textNodes = nodes.filter((n) => n.type === 'template' || n.type === 'prompt');
    const sortedTextNodes = [...textNodes].sort((a, b) => a.position.y - b.position.y);

    const getVariableValue = (nodeId: string): string => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return '';
      if (nodeResults[nodeId] !== undefined) return nodeResults[nodeId]!;

      if (node.type === 'template' || node.type === 'prompt') {
        const meta = nodeMetaByNode[node.id];
        const template = meta?.promptTemplate ?? '';
        const incoming = edges.filter((e) => e.to === node.id);
        const variables: Record<string, string> = {};

        incoming.forEach((edge) => {
          const value = getVariableValue(edge.from);
          if (edge.toPort) {
            variables[edge.toPort] = value;
          }
        });

        const result = compileCaseResolverPrompt(template, variables);
        nodeResults[nodeId] = result;
        return result;
      }

      return '';
    };

    sortedTextNodes.forEach((node) => {
      getVariableValue(node.id);
    });

    const finalResult = sortedTextNodes.map((n) => nodeResults[n.id]).join('\n\n').trim();
    const validation = applyCaseResolverPlainTextValidation(finalResult, validatorPatternLists);

    return {
      content: finalResult,
      validation,
    };
  }, [nodes, edges, nodeMetaByNode, validatorPatternLists]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  );

  const selectedNodeMeta = useMemo(
    () => (selectedNodeId ? nodeMetaByNode[selectedNodeId] ?? null : null),
    [nodeMetaByNode, selectedNodeId]
  );

  const selectedNodeFileMeta = useMemo(
    () => (selectedNodeId ? nodeFileMetaRef.current[selectedNodeId] ?? null : null),
    [selectedNodeId]
  );

  const selectedFile = useMemo(
    () => (selectedNodeFileMeta?.fileId ? filesById.get(selectedNodeFileMeta.fileId) ?? null : null),
    [filesById, selectedNodeFileMeta?.fileId]
  );

  // Persistence
  const skipNextSnapshotEmitRef = useRef(true);
  const lastEmittedSnapshotHashRef = useRef('');

  useEffect(() => {
    const currentSnapshot: CaseResolverNodeFileSnapshot = {
      kind: 'case_resolver_node_file_snapshot_v1',
      nodes,
      edges,
      nodeMeta: nodeMetaByNode,
      edgeMeta: edgeMetaByEdge,
      nodeFileMeta: nodeFileMetaRef.current,
    };
    const hash = stableStringify(currentSnapshot);
    if (hash === lastEmittedSnapshotHashRef.current) return;

    if (skipNextSnapshotEmitRef.current) {
      skipNextSnapshotEmitRef.current = false;
      lastEmittedSnapshotHashRef.current = hash;
      return;
    }

    lastEmittedSnapshotHashRef.current = hash;
    onSnapshotChange(currentSnapshot);
  }, [nodes, edges, nodeMetaByNode, edgeMetaByEdge, onSnapshotChange]);

  const handleManualSave = useCallback(() => {
    const currentSnapshot: CaseResolverNodeFileSnapshot = {
      kind: 'case_resolver_node_file_snapshot_v1',
      nodes,
      edges,
      nodeMeta: nodeMetaByNode,
      edgeMeta: edgeMetaByEdge,
      nodeFileMeta: nodeFileMetaRef.current,
    };
    onSnapshotChange(currentSnapshot);
    toast('Snapshot saved.', { variant: 'success' });
  }, [nodes, edges, nodeMetaByNode, edgeMetaByEdge, onSnapshotChange, toast]);

  // Actions
  const handleAddNode = useCallback((node: AiNode) => {
    addNode(node);
  }, [addNode]);

  const handleUpdateNode = useCallback((nodeId: string, patch: Partial<AiNode>) => {
    updateNode(nodeId, patch);
  }, [updateNode]);

  return {
    assetId,
    assetName,
    workspace,
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    configOpen,
    newNodeType,
    setNewNodeType,
    isSidePanelVisible,
    setIsSidePanelVisible,
    isNodeInspectorOpen,
    setIsNodeInspectorOpen,
    isLinkedPreviewOpen,
    setIsLinkedPreviewOpen,
    showNodeSelectorUnderCanvas,
    setShowNodeSelectorUnderCanvas,
    documentSearchScope,
    setDocumentSearchScope,
    documentSearchQuery,
    setDocumentSearchQuery,
    selectedSearchFolderPath,
    setSelectedSearchFolderPath,
    expandedSearchFolderPaths,
    setExpandedSearchFolderPaths,
    selectedSearchDocumentId,
    setSelectedSearchDocumentId,
    isDocumentSearchOpen,
    setIsDocumentSearchOpen,
    nodeMetaByNode,
    edgeMetaByEdge,
    filesById,
    caseIdentifierLabelById,
    documentSearchRows,
    folderScopedDocumentSearchRows,
    visibleDocumentSearchRows,
    folderTree,
    compiled,
    selectedNode,
    selectedNodeMeta,
    selectedFile,
    handleManualSave,
    selectNode,
    setConfigOpen,
    addNode: handleAddNode,
    updateNode: handleUpdateNode,
    setNodes,
    setEdges,
    setView,
    view,
    viewportRef,
    canvasRef,
    onSelectFile,
    documentSearchRef,
  };
}
