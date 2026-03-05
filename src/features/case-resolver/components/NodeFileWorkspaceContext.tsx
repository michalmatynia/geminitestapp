'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type {
  AiNode,
  CaseResolverNodeMeta,
  CaseResolverFile,
  Edge,
  CaseResolverEdgeMeta,
  CaseResolverCompileResult,
  CaseResolverSnapshotNodeMeta as CaseResolverNodeFileMeta,
} from '@/shared/contracts/case-resolver';
import {
  NodeFileDocumentSearchScope,
  NodeFileDocumentSearchRow,
} from './CaseResolverNodeFileUtils';
import type { RelationTreeLookup } from '../relation-search/types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

export type NodeFileWorkspaceContextValue = {
  // State from useNodeFileWorkspaceState
  assetId: string;
  assetName: string;
  nodes: AiNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  configOpen: boolean;
  newNodeType: 'prompt' | 'model' | 'database' | 'viewer';
  setNewNodeType: (type: 'prompt' | 'model' | 'database' | 'viewer') => void;
  isSidePanelVisible: boolean;
  setIsSidePanelVisible: (visible: boolean) => void;
  isNodeInspectorOpen: boolean;
  setIsNodeInspectorOpen: (open: boolean) => void;
  isLinkedPreviewOpen: boolean;
  setIsLinkedPreviewOpen: (open: boolean) => void;
  showNodeSelectorUnderCanvas: boolean;
  setShowNodeSelectorUnderCanvas: (show: boolean) => void;
  documentSearchScope: NodeFileDocumentSearchScope;
  setDocumentSearchScope: (scope: NodeFileDocumentSearchScope) => void;
  documentSearchQuery: string;
  setDocumentSearchQuery: (query: string) => void;
  nodeMetaByNode: Record<string, CaseResolverNodeMeta>;
  edgeMetaByEdge: Record<string, CaseResolverEdgeMeta>;

  // Derived / Logic
  filesById: Map<string, CaseResolverFile>;
  caseIdentifierLabelById: Map<string, string>;
  documentSearchRows: NodeFileDocumentSearchRow[];
  visibleDocumentSearchRows: NodeFileDocumentSearchRow[];
  relationTreeNodes?: MasterTreeNode[] | undefined;
  relationTreeLookup?: RelationTreeLookup | undefined;
  compiled: CaseResolverCompileResult;
  selectedNode: AiNode | null;
  selectedNodeMeta: CaseResolverNodeMeta | null;
  selectedNodeFileMeta: CaseResolverNodeFileMeta | null;
  selectedFile: CaseResolverFile | null;

  // Actions
  handleManualSave: () => void;
  selectNode: (nodeId: string | null, options?: { toggle?: boolean }) => void;
  setConfigOpen: (open: boolean) => void;
  addNode: (node: AiNode) => void;
  updateNode: (nodeId: string, patch: Partial<AiNode>) => void;
  setNodeFileMeta: (nodeId: string, meta: CaseResolverNodeFileMeta) => void;
  setNodes: (nodes: AiNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setView: (view: { x: number; y: number; scale: number }) => void;
  view: { x: number; y: number; scale: number };
  canvasHostRef: React.RefObject<HTMLDivElement | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelectFile: (fileId: string) => void;
  documentSearchRef: React.RefObject<HTMLDivElement | null>;

  // Optional additions for CanvasWorkspace / Inspector
  isSidebarReady?: boolean;
  selectedPromptMeta?: CaseResolverNodeMeta | null;
  selectedPromptSourceFile?: CaseResolverFile | null;
  selectedPromptTemplate?: string;
  selectedPromptInputText?: string;
  selectedPromptOutputPreview?: {
    wysiwygText: string;
    plaintextContent: string;
    plainText: string;
    wysiwygContent: string;
  };
  selectedPromptSecondaryOutputHint?: string;
  updateSelectedPromptTemplate?: (template: string) => void;
  updateSelectedNodeMeta?: (patch: Partial<CaseResolverNodeMeta>) => void;
  selectedEdge?: Edge | null;
  selectedEdgeJoinMode?: string;
  updateSelectedEdgeMeta?: (patch: Partial<CaseResolverEdgeMeta>) => void;
  hasPendingSnapshotChanges?: boolean;
};

type FunctionKey<T> = {
  [K in keyof T]-?: T[K] extends (...args: infer _Args) => infer _Return ? K : never;
}[keyof T];

type NodeFileWorkspaceActionKey = FunctionKey<NodeFileWorkspaceContextValue>;

export type NodeFileWorkspaceActionsValue = Pick<
  NodeFileWorkspaceContextValue,
  NodeFileWorkspaceActionKey
>;
export type NodeFileWorkspaceStateValue = Omit<
  NodeFileWorkspaceContextValue,
  NodeFileWorkspaceActionKey
>;

const NodeFileWorkspaceStateContext = createContext<NodeFileWorkspaceStateValue | null>(null);
const NodeFileWorkspaceActionsContext = createContext<NodeFileWorkspaceActionsValue | null>(null);

export function NodeFileWorkspaceProvider({
  value,
  children,
}: {
  value: NodeFileWorkspaceContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  const stateValue = useMemo(() => value as NodeFileWorkspaceStateValue, [value]);
  const actionsValue = useMemo(() => value as NodeFileWorkspaceActionsValue, [value]);
  return (
    <NodeFileWorkspaceStateContext.Provider value={stateValue}>
      <NodeFileWorkspaceActionsContext.Provider value={actionsValue}>
        {children}
      </NodeFileWorkspaceActionsContext.Provider>
    </NodeFileWorkspaceStateContext.Provider>
  );
}

export function useNodeFileWorkspaceStateContext(): NodeFileWorkspaceStateValue {
  const context = useContext(NodeFileWorkspaceStateContext);
  if (!context) {
    throw new Error(
      'useNodeFileWorkspaceStateContext must be used within NodeFileWorkspaceProvider'
    );
  }
  return context;
}

export function useNodeFileWorkspaceActionsContext(): NodeFileWorkspaceActionsValue {
  const context = useContext(NodeFileWorkspaceActionsContext);
  if (!context) {
    throw new Error(
      'useNodeFileWorkspaceActionsContext must be used within NodeFileWorkspaceProvider'
    );
  }
  return context;
}
