'use client';

import { Network } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React from 'react';

import { CanvasBoard } from '@/features/ai/public';
import {
  AiPathsProvider,
  useGraphActions,
  useGraphState,
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/public';
import type { AiNode, CaseResolverEdge } from '@/shared/contracts/case-resolver';
import type {
  CaseResolverFile,
  CaseResolverRelationEdgeMeta,
  CaseResolverRelationGraph,
  CaseResolverRelationNodeMeta,
} from '@/shared/contracts/case-resolver';
import { EMPTY_RUNTIME_STATE } from '@/shared/lib/ai-paths/core/constants';
import { stableStringify } from '@/shared/lib/ai-paths/core/utils/runtime';
import { EmptyState } from '@/shared/ui';

import {
  CaseResolverRelationsWorkspaceProvider,
  useCaseResolverRelationsWorkspaceContext,
} from './CaseResolverRelationsWorkspaceContext';
import {
  projectCaseOnlyRelationGraph,
  readRelationEdgeMetaMap,
  readRelationNodeMetaMap,
  readWorkspaceSnapshot,
  resolveFocusedCaseId,
  toRuntimeNodes,
  toStrictEdges,
} from './CaseResolverRelationsWorkspace.helpers';
import {
  useCaseResolverPageActions,
  useCaseResolverPageState,
} from '../context/CaseResolverPageContext';
import { fromCaseResolverCaseNodeId, fromCaseResolverFileNodeId } from '../master-tree';
import {
  buildCaseResolverRelationGraph,
  toCaseResolverRelationCaseNodeId,
} from '../settings-relation-graph';
import { resolveCaseResolverTreeWorkspace } from './case-resolver-tree-workspace';

function CaseResolverRelationsWorkspaceInner(): React.JSX.Element {
  const { relationGraph, workspaceSnapshot } = useCaseResolverRelationsWorkspaceContext();
  const { activeCaseId, activeFile, selectedFileId } = useCaseResolverPageState();
  const { onSelectFile, onRelationGraphChange } = useCaseResolverPageActions();
  const { nodes, edges } = useGraphState();
  const { setNodes, setEdges } = useGraphActions();
  const { selectedNodeId } = useSelectionState();
  const { selectNode, setConfigOpen } = useSelectionActions();

  const relationNodeMeta = React.useMemo(
    (): Record<string, CaseResolverRelationNodeMeta> => readRelationNodeMetaMap(relationGraph),
    [relationGraph]
  );
  const relationEdgeMeta = React.useMemo(
    (): Record<string, CaseResolverRelationEdgeMeta> => readRelationEdgeMetaMap(relationGraph),
    [relationGraph]
  );

  const incomingNodes = React.useMemo(
    (): AiNode[] => toRuntimeNodes(relationGraph.nodes),
    [relationGraph.nodes]
  );
  const incomingStrictEdges = React.useMemo(
    (): CaseResolverRelationGraph['edges'] => toStrictEdges(relationGraph.edges),
    [relationGraph.edges]
  );
  const incomingEdges = React.useMemo(
    (): CaseResolverEdge[] => incomingStrictEdges,
    [incomingStrictEdges]
  );
  const strictEdges = React.useMemo(
    (): CaseResolverRelationGraph['edges'] => toStrictEdges(edges),
    [edges]
  );

  const localGraphHash = React.useMemo(
    (): string =>
      stableStringify({
        nodes,
        edges: strictEdges,
      }),
    [nodes, strictEdges]
  );
  const incomingGraphHash = React.useMemo(
    (): string =>
      stableStringify({
        nodes: incomingNodes,
        edges: incomingStrictEdges,
      }),
    [incomingNodes, incomingStrictEdges]
  );

  const skipNextGraphEmitRef = React.useRef<boolean>(true);
  const lastEmittedGraphHashRef = React.useRef<string>('');

  React.useEffect(() => {
    if (incomingGraphHash === localGraphHash) return;
    skipNextGraphEmitRef.current = true;
    setNodes(incomingNodes);
    setEdges(incomingEdges);
  }, [incomingEdges, incomingGraphHash, incomingNodes, localGraphHash, setEdges, setNodes]);

  const nextGraph = React.useMemo(
    (): CaseResolverRelationGraph =>
      buildCaseResolverRelationGraph({
        source: {
          nodes,
          edges: strictEdges,
          nodeMeta: relationNodeMeta,
          edgeMeta: relationEdgeMeta,
        },
        folders: workspaceSnapshot.folders,
        files: workspaceSnapshot.files,
        assets: workspaceSnapshot.assets,
      }),
    [
      nodes,
      relationEdgeMeta,
      relationNodeMeta,
      strictEdges,
      workspaceSnapshot.assets,
      workspaceSnapshot.files,
      workspaceSnapshot.folders,
    ]
  );
  const nextCaseOnlyGraph = React.useMemo(
    (): CaseResolverRelationGraph => projectCaseOnlyRelationGraph(nextGraph),
    [nextGraph]
  );
  const nextGraphHash = React.useMemo(
    (): string => stableStringify(nextCaseOnlyGraph),
    [nextCaseOnlyGraph]
  );

  React.useEffect(() => {
    if (skipNextGraphEmitRef.current) {
      skipNextGraphEmitRef.current = false;
      lastEmittedGraphHashRef.current = nextGraphHash;
      return;
    }
    if (lastEmittedGraphHashRef.current === nextGraphHash) return;
    lastEmittedGraphHashRef.current = nextGraphHash;
    onRelationGraphChange(nextCaseOnlyGraph);
  }, [nextCaseOnlyGraph, nextGraphHash, onRelationGraphChange]);

  const focusCaseId = resolveFocusedCaseId(activeFile?.id, activeCaseId);

  const focusNodeId = React.useMemo((): string | null => {
    const normalizedCaseId = focusCaseId?.trim() ?? '';
    if (!normalizedCaseId) return null;
    const nodeId = toCaseResolverRelationCaseNodeId(normalizedCaseId);
    return nodes.some((node: AiNode): boolean => node.id === nodeId) ? nodeId : null;
  }, [focusCaseId, nodes]);

  React.useEffect(() => {
    if (!focusNodeId || selectedNodeId === focusNodeId) return;
    selectNode(focusNodeId);
    setConfigOpen(false);
  }, [focusNodeId, selectNode, selectedNodeId, setConfigOpen]);

  React.useEffect(() => {
    if (!selectedNodeId) return;
    const meta = relationNodeMeta[selectedNodeId];
    if (!meta) return;
    const metaRecord = meta as Record<string, unknown>;
    const entityType = typeof metaRecord['entityType'] === 'string' ? metaRecord['entityType'] : '';
    const sourceFileId =
      typeof metaRecord['sourceFileId'] === 'string' ? metaRecord['sourceFileId'].trim() : '';
    if (entityType !== 'case' || !sourceFileId || sourceFileId === selectedFileId) return;
    onSelectFile(sourceFileId);
  }, [onSelectFile, relationNodeMeta, selectedFileId, selectedNodeId]);

  return (
    <div className='h-full min-h-0'>
      <CanvasBoard />
    </div>
  );
}

export function CaseResolverRelationsWorkspace(): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedFileIdRaw = searchParams.get('fileId');
  const requestedFileId = React.useMemo((): string | null => {
    const normalizedRequestedFileId = requestedFileIdRaw?.trim() ?? '';
    if (!normalizedRequestedFileId) return null;
    const decodedCaseNodeId = fromCaseResolverCaseNodeId(normalizedRequestedFileId);
    if (decodedCaseNodeId) return decodedCaseNodeId;
    const decodedFileNodeId = fromCaseResolverFileNodeId(normalizedRequestedFileId);
    if (decodedFileNodeId) return decodedFileNodeId;
    return normalizedRequestedFileId;
  }, [requestedFileIdRaw]);
  const { workspace, selectedFileId, activeCaseId, activeFile } = useCaseResolverPageState();
  const scopedWorkspace = React.useMemo(
    () =>
      resolveCaseResolverTreeWorkspace({
        selectedFileId,
        requestedFileId,
        activeCaseId,
        workspace,
      }),
    [activeCaseId, requestedFileId, selectedFileId, workspace]
  );
  const workspaceSnapshot = React.useMemo(
    () => readWorkspaceSnapshot(scopedWorkspace),
    [scopedWorkspace]
  );

  const caseFiles = React.useMemo(
    (): CaseResolverFile[] =>
      workspaceSnapshot.files.filter((file: CaseResolverFile): boolean => file.fileType === 'case'),
    [workspaceSnapshot.files]
  );

  const relationGraph = React.useMemo((): CaseResolverRelationGraph => {
    const nextGraph = buildCaseResolverRelationGraph({
      source: workspaceSnapshot.relationGraphSource,
      folders: workspaceSnapshot.folders,
      files: workspaceSnapshot.files,
      assets: workspaceSnapshot.assets,
    });
    return projectCaseOnlyRelationGraph(nextGraph);
  }, [
    workspaceSnapshot.assets,
    workspaceSnapshot.files,
    workspaceSnapshot.folders,
    workspaceSnapshot.relationGraphSource,
  ]);

  if (caseFiles.length === 0) {
    return (
      <EmptyState
        title='No cases to visualize'
        description='Create a case to see relation segments.'
        icon={<Network className='mx-auto size-12 opacity-60' />}
        className='h-full'
      />
    );
  }

  const focusCaseId = resolveFocusedCaseId(activeFile?.id, activeCaseId);

  const initialSelectedNodeId = focusCaseId?.trim()
    ? toCaseResolverRelationCaseNodeId(focusCaseId.trim())
    : undefined;
  const relationsWorkspaceValue = React.useMemo(
    () => ({
      relationGraph,
      workspaceSnapshot,
    }),
    [relationGraph, workspaceSnapshot]
  );

  return (
    <CaseResolverRelationsWorkspaceProvider value={relationsWorkspaceValue}>
      <AiPathsProvider
        initialSelectedNodeId={initialSelectedNodeId}
        initialNodes={toRuntimeNodes(relationGraph.nodes)}
        initialEdges={toStrictEdges(relationGraph.edges)}
        initialLoading={false}
        initialRuntimeState={EMPTY_RUNTIME_STATE}
      >
        <CaseResolverRelationsWorkspaceInner />
      </AiPathsProvider>
    </CaseResolverRelationsWorkspaceProvider>
  );
}
