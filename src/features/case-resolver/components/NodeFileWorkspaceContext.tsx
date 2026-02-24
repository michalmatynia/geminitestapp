'use client';

import React, { createContext, useContext } from 'react';
import type { 
  AiNode, 
  CaseResolverNodeMeta, 
  CaseResolverFile, 
  Edge,
  CaseResolverEdgeMeta,
  CaseResolverCompileResult,
} from '@/shared/contracts/case-resolver';
import { 
  NodeFileDocumentSearchScope, 
  NodeFileDocumentSearchRow, 
  NodeFileDocumentFolderTree 
} from './CaseResolverNodeFileUtils';

export type NodeFileWorkspaceContextValue = {
  // State from useNodeFileWorkspaceState
  assetId: string;
  assetName: string;
  nodes: AiNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  configOpen: boolean;
  newNodeType: 'prompt' | 'model' | 'template' | 'database' | 'viewer';
  setNewNodeType: (type: 'prompt' | 'model' | 'template' | 'database' | 'viewer') => void;
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
  selectedSearchFolderPath: string | null;
  setSelectedSearchFolderPath: (path: string | null) => void;
  expandedSearchFolderPaths: Set<string>;
  setExpandedSearchFolderPaths: (paths: Set<string>) => void;
  selectedSearchDocumentId: string;
  setSelectedSearchDocumentId: (id: string) => void;
  isDocumentSearchOpen: boolean;
  setIsDocumentSearchOpen: (open: boolean) => void;
  nodeMetaByNode: Record<string, CaseResolverNodeMeta>;
  edgeMetaByEdge: Record<string, CaseResolverEdgeMeta>;
  
  // Derived / Logic
  filesById: Map<string, CaseResolverFile>;
  caseIdentifierLabelById: Map<string, string>;
  documentSearchRows: NodeFileDocumentSearchRow[];
  folderScopedDocumentSearchRows: NodeFileDocumentSearchRow[];
  visibleDocumentSearchRows: NodeFileDocumentSearchRow[];
  folderTree: NodeFileDocumentFolderTree;
  compiled: CaseResolverCompileResult;
  selectedNode: AiNode | null;
  selectedNodeMeta: CaseResolverNodeMeta | null;
  selectedFile: CaseResolverFile | null;
  
  // Actions
  handleManualSave: () => void;
  selectNode: (nodeId: string | null, options?: { toggle?: boolean }) => void;
  setConfigOpen: (open: boolean) => void;
  addNode: (node: AiNode) => void;
  updateNode: (nodeId: string, patch: Partial<AiNode>) => void;
  setNodes: (nodes: AiNode[]) => void;
  setEdges: (edges: Edge[]) => void;
  setView: (view: { x: number; y: number; scale: number }) => void;
  view: { x: number; y: number; scale: number };
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onSelectFile: (fileId: string) => void;
  documentSearchRef: React.RefObject<HTMLDivElement | null>;

  // Optional additions for CanvasWorkspace / Inspector
  isSidebarReady?: boolean;
  selectedPromptMeta?: any;
  selectedPromptSourceFile?: CaseResolverFile | null;
  selectedPromptTemplate?: string;
  selectedPromptInputText?: string;
  selectedPromptOutputPreview?: {
    textfield: string;
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

const NodeFileWorkspaceContext = createContext<NodeFileWorkspaceContextValue | null>(null);

export function NodeFileWorkspaceProvider({
  value,
  children,
}: {
  value: NodeFileWorkspaceContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <NodeFileWorkspaceContext.Provider value={value}>
      {children}
    </NodeFileWorkspaceContext.Provider>
  );
}

export function useNodeFileWorkspaceContext(): NodeFileWorkspaceContextValue {
  const context = useContext(NodeFileWorkspaceContext);
  if (!context) {
    throw new Error('useNodeFileWorkspaceContext must be used within NodeFileWorkspaceProvider');
  }
  return context;
}
