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
import { useToast } from '@/shared/ui';
import type {
  AiNode,
  CaseResolverNodeMeta,
  CaseResolverEdgeMeta,
  CaseResolverFile,
  CaseResolverNodeFileSnapshot,
  CaseResolverSnapshotNodeMeta as CaseResolverNodeFileMeta,
  CaseResolverCompileResult,
} from '@/shared/contracts/case-resolver';
import { useDocumentRelationSearch } from '../relation-search/hooks/useDocumentRelationSearch';

export type UseNodeFileWorkspaceStateProps = {
  assetId: string;
  assetName: string;
  snapshot: CaseResolverNodeFileSnapshot;
  onSnapshotChange: (updated: CaseResolverNodeFileSnapshot) => void;
};

const renderNodeTemplate = (
  template: string,
  variables: Record<string, string>
): string =>
  template.replace(
    /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g,
    (_match: string, curlyToken: string | undefined, bracketToken: string | undefined) => {
      const token = (curlyToken ?? bracketToken ?? '').trim();
      if (!token) return '';
      return variables[token] ?? '';
    }
  );

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

  const [newNodeType, setNewNodeType] = useState<'prompt' | 'model' | 'template' | 'database' | 'viewer'>('prompt');
  const [isSidePanelVisible, setIsSidePanelVisible] = useState(false);
  const [isNodeInspectorOpen, setIsNodeInspectorOpen] = useState(false);
  const [isLinkedPreviewOpen, setIsLinkedPreviewOpen] = useState(false);
  const [showNodeSelectorUnderCanvas, setShowNodeSelectorUnderCanvas] = useState(
    () => nodes.length > 0
  );
  const [expandedSearchFolderPaths, setExpandedSearchFolderPaths] = useState<Set<string>>(
    () => new Set()
  );
  const [selectedSearchDocumentId, setSelectedSearchDocumentId] = useState('');
  const [isDocumentSearchOpen, setIsDocumentSearchOpen] = useState(false);
  const [nodeMetaByNode] = useState<Record<string, CaseResolverNodeMeta>>(
    () => snapshot.nodeMeta ?? {}
  );
  const [edgeMetaByEdge] = useState<Record<string, CaseResolverEdgeMeta>>(
    () => snapshot.edgeMeta ?? {}
  );

  const nodeFileMetaRef = useRef<Record<string, CaseResolverNodeFileMeta>>(
    snapshot.nodeFileMeta ?? {}
  );
  const documentSearchRef = useRef<HTMLDivElement | null>(null);

  // ── Document search (delegates to shared relation-search hook) ──────────────
  const {
    documentSearchScope,
    setDocumentSearchScope,
    documentSearchQuery,
    setDocumentSearchQuery,
    selectedSearchFolderPath,
    setSelectedSearchFolderPath,
    caseSearchQuery,
    setCaseSearchQuery,
    selectedDrillCaseId,
    setSelectedDrillCaseId,
    caseIdentifierLabelById,
    documentSearchRows,
    folderScopedDocumentSearchRows,
    visibleDocumentSearchRows,
    folderTree,
    visibleCaseRows,
  } = useDocumentRelationSearch({
    workspace,
    activeCaseId,
    caseResolverIdentifiers,
    excludeFileIds: [],
  });

  const filesById = useMemo(
    () =>
      new Map<string, CaseResolverFile>(
        workspace.files.map((f: CaseResolverFile): [string, CaseResolverFile] => [f.id, f])
      ),
    [workspace.files]
  );

  // Compiled graph logic
  const compiled = useMemo((): CaseResolverCompileResult => {
    const nodeResults: Record<string, string> = {};
    const textNodes = nodes.filter((n) => n.type === 'template' || n.type === 'prompt');
    const sortedTextNodes = [...textNodes].sort((a, b) => a.position.y - b.position.y);

    const getVariableValue = (nodeId: string): string => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return '';
      if (nodeResults[nodeId] !== undefined) return nodeResults[nodeId];

      if (node.type === 'template' || node.type === 'prompt') {
        const template = node.config?.prompt?.template ?? node.config?.template?.template ?? '';
        const incoming = edges.filter((e) => (e.to ?? e.target) === node.id);
        const variables: Record<string, string> = {};

        incoming.forEach((edge) => {
          const value = getVariableValue(edge.from || edge.source || '');
          const toPort = edge.toPort || edge.targetHandle;
          if (toPort) {
            variables[toPort] = value;
          }
        });

        const result = renderNodeTemplate(template, variables);
        nodeResults[nodeId] = result;
        return result;
      }

      return '';
    };

    sortedTextNodes.forEach((node) => {
      getVariableValue(node.id);
    });

    const finalResult = sortedTextNodes.map((n) => nodeResults[n.id]).join('\n\n').trim();

    return {
      segments: [],
      combinedContent: finalResult,
      prompt: finalResult,
      outputsByNode: {},
      warnings: [],
    };
  }, [nodes, edges]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [nodes, selectedNodeId]
  );

  const selectedNodeMeta = useMemo(
    () => (selectedNodeId ? nodeMetaByNode[selectedNodeId] ?? null : null),
    [nodeMetaByNode, selectedNodeId]
  );

  const selectedNodeFileMeta = useMemo(
    (): CaseResolverNodeFileMeta | null => {
      if (!selectedNodeId) return null;
      return (nodeFileMetaRef.current[selectedNodeId] as CaseResolverNodeFileMeta) ?? null;
    },
    [selectedNodeId]
  );

  const selectedFile = useMemo(
    (): CaseResolverFile | null => (selectedNodeFileMeta?.fileId ? filesById.get(selectedNodeFileMeta.fileId) ?? null : null),
    [filesById, selectedNodeFileMeta]
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

  const handleSetNodeFileMeta = useCallback(
    (nodeId: string, meta: CaseResolverNodeFileMeta) => {
      nodeFileMetaRef.current = { ...nodeFileMetaRef.current, [nodeId]: meta };
    },
    []
  );

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
    caseSearchQuery,
    setCaseSearchQuery,
    selectedDrillCaseId,
    setSelectedDrillCaseId,
    visibleCaseRows,
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
    selectedNodeFileMeta,
    selectedFile,
    handleManualSave,
    selectNode,
    setConfigOpen,
    addNode: handleAddNode,
    updateNode: handleUpdateNode,
    setNodeFileMeta: handleSetNodeFileMeta,
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
