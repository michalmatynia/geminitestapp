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
} from '@/features/ai/ai-paths/lib';
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
import type { NodeFileSnapshotPersistOptions } from '../components/CaseResolverNodeFileWorkspace';
import { logCaseResolverWorkspaceEvent } from '../workspace-persistence';

export type UseNodeFileWorkspaceStateProps = {
  assetId: string;
  assetName: string;
  snapshot: CaseResolverNodeFileSnapshot;
  onSnapshotChange: (
    updated: CaseResolverNodeFileSnapshot,
    options?: NodeFileSnapshotPersistOptions
  ) => void;
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

  const graphCompileIndex = useMemo(() => {
    const nodesById = new Map<string, AiNode>(
      nodes.map((node: AiNode): [string, AiNode] => [node.id, node]),
    );
    const incomingEdgesByNodeId = new Map<string, typeof edges>();
    edges.forEach((edge): void => {
      const targetNodeId = (edge.to ?? edge.target ?? '').trim();
      if (!targetNodeId) return;
      const incomingEdges = incomingEdgesByNodeId.get(targetNodeId) ?? [];
      incomingEdges.push(edge);
      incomingEdgesByNodeId.set(targetNodeId, incomingEdges);
    });
    const orderedTextNodeIds = nodes
      .filter((node: AiNode): boolean => node.type === 'template' || node.type === 'prompt')
      .sort((left: AiNode, right: AiNode): number => left.position.y - right.position.y)
      .map((node: AiNode): string => node.id);
    return {
      nodesById,
      incomingEdgesByNodeId,
      orderedTextNodeIds,
    };
  }, [edges, nodes]);

  // Compiled graph logic
  const compiled = useMemo((): CaseResolverCompileResult => {
    const nodeResults: Record<string, string> = {};
    const resolvingNodeIds = new Set<string>();

    const resolveNodeValue = (nodeId: string): string => {
      const normalizedNodeId = nodeId.trim();
      if (!normalizedNodeId) return '';
      if (nodeResults[normalizedNodeId] !== undefined) {
        return nodeResults[normalizedNodeId] ?? '';
      }
      if (resolvingNodeIds.has(normalizedNodeId)) {
        return '';
      }

      const node = graphCompileIndex.nodesById.get(normalizedNodeId);
      if (!node) return '';

      if (node.type !== 'template' && node.type !== 'prompt') {
        nodeResults[normalizedNodeId] = '';
        return '';
      }

      resolvingNodeIds.add(normalizedNodeId);
      const template = node.config?.prompt?.template ?? node.config?.template?.template ?? '';
      const incomingEdges = graphCompileIndex.incomingEdgesByNodeId.get(normalizedNodeId) ?? [];
      const variables: Record<string, string> = {};
      incomingEdges.forEach((edge): void => {
        const sourceNodeId = (edge.from || edge.source || '').trim();
        if (!sourceNodeId) return;
        const toPort = edge.toPort || edge.targetHandle;
        if (!toPort) return;
        variables[toPort] = resolveNodeValue(sourceNodeId);
      });
      const result = renderNodeTemplate(template, variables);
      resolvingNodeIds.delete(normalizedNodeId);
      nodeResults[normalizedNodeId] = result;
      return result;
    };

    graphCompileIndex.orderedTextNodeIds.forEach((nodeId: string): void => {
      resolveNodeValue(nodeId);
    });

    const finalResult = graphCompileIndex.orderedTextNodeIds
      .map((nodeId: string): string => nodeResults[nodeId] ?? '')
      .join('\n\n')
      .trim();

    return {
      segments: [],
      combinedContent: finalResult,
      prompt: finalResult,
      outputsByNode: {},
      warnings: [],
    };
  }, [graphCompileIndex]);

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

  const buildCurrentSnapshot = useCallback(
    (): CaseResolverNodeFileSnapshot => ({
      kind: 'case_resolver_node_file_snapshot_v1',
      nodes,
      edges,
      nodeMeta: nodeMetaByNode,
      edgeMeta: edgeMetaByEdge,
      nodeFileMeta: nodeFileMetaRef.current,
    }),
    [nodes, edges, nodeMetaByNode, edgeMetaByEdge]
  );
  const [hasPendingSnapshotChanges, setHasPendingSnapshotChanges] = useState(false);
  const hasInitializedSnapshotTrackingRef = useRef(false);
  const pendingChangesRef = useRef(hasPendingSnapshotChanges);

  useEffect(() => {
    if (!hasInitializedSnapshotTrackingRef.current) {
      hasInitializedSnapshotTrackingRef.current = true;
      return;
    }
    setHasPendingSnapshotChanges((current): boolean => (current ? current : true));
  }, [nodes, edges, nodeMetaByNode, edgeMetaByEdge]);

  useEffect(() => {
    logCaseResolverWorkspaceEvent({
      source: 'node_file_workspace',
      action: 'node_file_snapshot_autosave_skipped',
      message: `asset_id=${assetId}`,
    });
  }, [assetId]);

  useEffect(() => {
    if (pendingChangesRef.current === hasPendingSnapshotChanges) return;
    pendingChangesRef.current = hasPendingSnapshotChanges;
    logCaseResolverWorkspaceEvent({
      source: 'node_file_workspace',
      action: 'node_file_snapshot_pending_changes',
      message: `asset_id=${assetId} pending=${hasPendingSnapshotChanges ? 'true' : 'false'}`,
    });
  }, [assetId, hasPendingSnapshotChanges]);

  const handleManualSave = useCallback(() => {
    if (!hasPendingSnapshotChanges) return;
    onSnapshotChange(buildCurrentSnapshot(), {
      persistNow: true,
      persistToast: 'Node file updated.',
      source: 'node_file_manual_save',
    });
    setHasPendingSnapshotChanges(false);
    logCaseResolverWorkspaceEvent({
      source: 'node_file_workspace',
      action: 'node_file_snapshot_manual_save',
      message: `asset_id=${assetId}`,
    });
  }, [
    assetId,
    buildCurrentSnapshot,
    hasPendingSnapshotChanges,
    onSnapshotChange,
  ]);

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
    hasPendingSnapshotChanges,
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
