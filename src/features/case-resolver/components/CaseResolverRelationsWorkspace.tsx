'use client';

import { Network } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React from 'react';

import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import {
  AiPathsProvider,
  useGraphActions,
  useGraphState,
  useSelectionActions,
  useSelectionState,
} from '@/features/ai/ai-paths/context';
import {
  EMPTY_RUNTIME_STATE,
  stableStringify,
  typeStyles,
  type AiNode,
  type Edge,
} from '@/shared/lib/ai-paths';
import type {
  CaseResolverAssetFile,
  CaseResolverFile,
  CaseResolverRelationEdgeMeta,
  CaseResolverRelationGraph,
  CaseResolverRelationNodeMeta,
} from '@/shared/contracts/case-resolver';
import { EmptyState } from '@/shared/ui';

import { useCaseResolverPageContext } from '../context/CaseResolverPageContext';
import {
  CaseResolverRelationsWorkspaceProvider,
  useCaseResolverRelationsWorkspaceContext,
} from './CaseResolverRelationsWorkspaceContext';
import {
  buildCaseResolverRelationGraph,
  toCaseResolverRelationCaseNodeId,
} from '../settings-relation-graph';
import { fromCaseResolverCaseNodeId, fromCaseResolverFileNodeId } from '../master-tree';
import { resolveCaseResolverTreeWorkspace } from './case-resolver-tree-workspace';

type CompatEdge = {
  id: string;
  from?: string | null | undefined;
  to?: string | null | undefined;
  source?: string | null | undefined;
  target?: string | null | undefined;
  label?: string | null | undefined;
  fromPort?: string | null | undefined;
  toPort?: string | null | undefined;
  sourceHandle?: string | null | undefined;
  targetHandle?: string | null | undefined;
};

type CaseResolverRelationsWorkspaceProps = {
  focusCaseId?: string | null;
};

import { isObjectRecord } from '@/shared/utils/object';

const isCaseResolverFile = (value: unknown): value is CaseResolverFile =>
  isObjectRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['name'] === 'string' &&
  typeof value['fileType'] === 'string' &&
  typeof value['folder'] === 'string';

const isCaseResolverAssetFile = (value: unknown): value is CaseResolverAssetFile =>
  isObjectRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['name'] === 'string' &&
  typeof value['folder'] === 'string' &&
  typeof value['kind'] === 'string';

const readWorkspaceFolders = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry: unknown): entry is string => typeof entry === 'string')
    : [];

const readWorkspaceFiles = (value: unknown): CaseResolverFile[] =>
  Array.isArray(value) ? value.filter(isCaseResolverFile) : [];

const readWorkspaceAssets = (value: unknown): CaseResolverAssetFile[] =>
  Array.isArray(value) ? value.filter(isCaseResolverAssetFile) : [];

const readWorkspaceSnapshot = (
  workspace: unknown
): {
  relationGraphSource: unknown;
  folders: string[];
  files: CaseResolverFile[];
  assets: CaseResolverAssetFile[];
} => {
  if (!isObjectRecord(workspace)) {
    return {
      relationGraphSource: {},
      folders: [],
      files: [],
      assets: [],
    };
  }
  return {
    relationGraphSource: workspace['relationGraph'],
    folders: readWorkspaceFolders(workspace['folders']),
    files: readWorkspaceFiles(workspace['files']),
    assets: readWorkspaceAssets(workspace['assets']),
  };
};

const hasKnownNodeType = (value: string): value is AiNode['type'] =>
  Object.prototype.hasOwnProperty.call(typeStyles, value);

const toRuntimeNodes = (nodes: CaseResolverRelationGraph['nodes']): AiNode[] =>
  nodes
    .map((node: CaseResolverRelationGraph['nodes'][number]): AiNode | null => {
      if (!isObjectRecord(node)) return null;
      const id = typeof node['id'] === 'string' ? node['id'].trim() : '';
      if (!id) return null;
      const title = typeof node['title'] === 'string' ? node['title'] : id;
      const description = typeof node['description'] === 'string' ? node['description'] : '';
      const rawType = typeof node['type'] === 'string' ? node['type'].trim() : '';
      const type = rawType && hasKnownNodeType(rawType) ? rawType : 'template';
      const positionRecord = isObjectRecord(node['position'])
        ? node['position']
        : ({} as Record<string, unknown>);
      const x =
        typeof positionRecord['x'] === 'number' && Number.isFinite(positionRecord['x'])
          ? positionRecord['x']
          : 0;
      const y =
        typeof positionRecord['y'] === 'number' && Number.isFinite(positionRecord['y'])
          ? positionRecord['y']
          : 0;
      const inputs = Array.isArray(node['inputs'])
        ? node['inputs'].filter(
          (port: unknown): port is string => typeof port === 'string' && port.trim().length > 0
        )
        : [];
      const outputs = Array.isArray(node['outputs'])
        ? node['outputs'].filter(
          (port: unknown): port is string => typeof port === 'string' && port.trim().length > 0
        )
        : [];
      const config =
        node['config'] && typeof node['config'] === 'object' && !Array.isArray(node['config'])
          ? (node['config'] as AiNode['config'])
          : undefined;
      const createdAt =
        (typeof node['createdAt'] === 'string' ? node['createdAt'] : undefined) ??
        new Date().toISOString();
      const updatedAt =
        (typeof node['updatedAt'] === 'string' ? node['updatedAt'] : undefined) ?? createdAt;
      const data =
        node['data'] && typeof node['data'] === 'object' && !Array.isArray(node['data'])
          ? node['data']
          : {};
      return {
        id,
        createdAt,
        updatedAt,
        type,
        title,
        description,
        inputs: inputs.length > 0 ? inputs : ['in'],
        outputs: outputs.length > 0 ? outputs : ['out'],
        position: { x, y },
        data,
        ...(config ? { config } : {}),
      };
    })
    .filter((node): node is AiNode => node !== null);

const toStrictEdges = (inputEdges: Edge[]): CaseResolverRelationGraph['edges'] => {
  return (inputEdges as unknown as CompatEdge[])
    .map((edge: CompatEdge): CaseResolverRelationGraph['edges'][number] | null => {
      const from = edge.from ?? edge.source;
      const to = edge.to ?? edge.target;
      if (!from || !to) return null;
      return {
        id: edge.id,
        from,
        to,
        ...(edge.label ? { label: edge.label } : {}),
        ...((edge.fromPort ?? edge.sourceHandle)
          ? { fromPort: (edge.fromPort ?? edge.sourceHandle) || undefined }
          : {}),
        ...((edge.toPort ?? edge.targetHandle)
          ? { toPort: (edge.toPort ?? edge.targetHandle) || undefined }
          : {}),
      };
    })
    .filter((edge): edge is CaseResolverRelationGraph['edges'][number] => edge !== null);
};

const readRelationNodeMetaMap = (
  graph: CaseResolverRelationGraph
): Record<string, CaseResolverRelationNodeMeta> => {
  const value = (graph as Record<string, unknown>)['nodeMeta'];
  return isObjectRecord(value) ? (value as Record<string, CaseResolverRelationNodeMeta>) : {};
};

const readRelationEdgeMetaMap = (
  graph: CaseResolverRelationGraph
): Record<string, CaseResolverRelationEdgeMeta> => {
  const value = (graph as Record<string, unknown>)['edgeMeta'];
  return isObjectRecord(value) ? (value as Record<string, CaseResolverRelationEdgeMeta>) : {};
};

const isCaseRelationNode = (
  nodeId: string,
  nodeMetaMap: Record<string, CaseResolverRelationNodeMeta>
): boolean => {
  const nodeMeta = nodeMetaMap[nodeId];
  if (nodeMeta && typeof nodeMeta.entityType === 'string') {
    return nodeMeta.entityType === 'case';
  }
  return nodeId.startsWith('case:');
};

const readEdgeEndpoints = (edge: unknown): { id: string; from: string; to: string } | null => {
  if (!isObjectRecord(edge)) return null;
  const id = typeof edge['id'] === 'string' ? edge['id'].trim() : '';
  const from = typeof edge['from'] === 'string' ? edge['from'].trim() : '';
  const to = typeof edge['to'] === 'string' ? edge['to'].trim() : '';
  if (!id || !from || !to) return null;
  return { id, from, to };
};

const projectCaseOnlyRelationGraph = (
  graph: CaseResolverRelationGraph
): CaseResolverRelationGraph => {
  const relationNodeMeta = readRelationNodeMetaMap(graph);
  const caseNodeIds = new Set<string>();

  const caseNodes = graph.nodes.filter((node): boolean => {
    if (!isObjectRecord(node)) return false;
    const nodeId = typeof node['id'] === 'string' ? node['id'].trim() : '';
    if (!nodeId) return false;
    if (!isCaseRelationNode(nodeId, relationNodeMeta)) return false;
    caseNodeIds.add(nodeId);
    return true;
  });

  const caseEdges = toStrictEdges(graph.edges as unknown as Edge[]).filter((edge): boolean => {
    const endpoints = readEdgeEndpoints(edge);
    if (!endpoints) return false;
    return caseNodeIds.has(endpoints.from) && caseNodeIds.has(endpoints.to);
  });

  const caseNodeMeta: Record<string, CaseResolverRelationNodeMeta> = {};
  caseNodeIds.forEach((nodeId: string): void => {
    const meta = relationNodeMeta[nodeId];
    if (meta) {
      caseNodeMeta[nodeId] = meta;
    }
  });

  const relationEdgeMeta = readRelationEdgeMetaMap(graph);
  const caseEdgeIds = new Set<string>();
  caseEdges.forEach((edge: CaseResolverRelationGraph['edges'][number]): void => {
    const endpoints = readEdgeEndpoints(edge);
    if (!endpoints) return;
    caseEdgeIds.add(endpoints.id);
  });
  const caseEdgeMeta: Record<string, CaseResolverRelationEdgeMeta> = {};
  Object.entries(relationEdgeMeta).forEach(
    ([edgeId, meta]: [string, CaseResolverRelationEdgeMeta]): void => {
      if (!caseEdgeIds.has(edgeId)) return;
      caseEdgeMeta[edgeId] = meta;
    }
  );

  return {
    nodes: caseNodes as unknown as CaseResolverRelationGraph['nodes'],
    edges: caseEdges as unknown as CaseResolverRelationGraph['edges'],
    nodeMeta: caseNodeMeta,
    edgeMeta: caseEdgeMeta,
  };
};

function CaseResolverRelationsWorkspaceInner(): React.JSX.Element {
  const { relationGraph, focusCaseId, workspaceSnapshot } =
    useCaseResolverRelationsWorkspaceContext();
  const { selectedFileId, onSelectFile, onRelationGraphChange } = useCaseResolverPageContext();
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
    (): CaseResolverRelationGraph['edges'] =>
      toStrictEdges(relationGraph.edges as unknown as Edge[]),
    [relationGraph.edges]
  );
  const incomingEdges = React.useMemo(
    (): Edge[] => incomingStrictEdges as unknown as Edge[],
    [incomingStrictEdges]
  );
  const strictEdges = React.useMemo(
    (): CaseResolverRelationGraph['edges'] => toStrictEdges(edges as unknown as Edge[]),
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
    const metaRecord = meta as unknown as Record<string, unknown>;
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

export function CaseResolverRelationsWorkspace({
  focusCaseId = null,
}: CaseResolverRelationsWorkspaceProps = {}): React.JSX.Element {
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
  const { workspace, selectedFileId, activeCaseId } = useCaseResolverPageContext();
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

  const initialSelectedNodeId = focusCaseId?.trim()
    ? toCaseResolverRelationCaseNodeId(focusCaseId.trim())
    : undefined;

  return (
    <CaseResolverRelationsWorkspaceProvider
      value={{
        relationGraph,
        focusCaseId,
        workspaceSnapshot,
      }}
    >
      <AiPathsProvider
        initialSelectedNodeId={initialSelectedNodeId}
        initialNodes={toRuntimeNodes(relationGraph.nodes)}
        initialEdges={toStrictEdges(relationGraph.edges as unknown as Edge[]) as unknown as Edge[]}
        initialLoading={false}
        initialRuntimeState={EMPTY_RUNTIME_STATE}
      >
        <CaseResolverRelationsWorkspaceInner />
      </AiPathsProvider>
    </CaseResolverRelationsWorkspaceProvider>
  );
}
