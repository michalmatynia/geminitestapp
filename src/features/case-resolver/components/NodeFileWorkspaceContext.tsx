'use client';

import React, { createContext, useContext } from 'react';
import type { 
  AiNode, 
  CaseResolverNodeMeta, 
  CaseResolverFile, 
  Edge,
  CaseResolverEdgeMeta
} from '@/shared/contracts/case-resolver';

export type NodeFileWorkspaceContextValue = {
  assetId: string;
  assetName: string;
  handleManualSave: () => void;
  isSidebarReady: boolean;
  selectedNode: AiNode | null;
  selectedPromptMeta: CaseResolverNodeMeta | null;
  selectedPromptSourceFile: CaseResolverFile | null;
  selectedPromptTemplate: string;
  selectedPromptInputText: string;
  selectedPromptOutputPreview: {
    textfield: string;
    plaintextContent: string;
    plainText: string;
    wysiwygContent: string;
  } | null;
  selectedPromptSecondaryOutputHint: boolean;
  updateSelectedPromptTemplate: (template: string) => void;
  updateSelectedNodeMeta: (patch: Partial<CaseResolverNodeMeta>) => void;
  selectedEdge: Edge | unknown | null;
  selectedEdgeJoinMode: CaseResolverEdgeMeta['joinMode'];
  updateSelectedEdgeMeta: (patch: Partial<CaseResolverEdgeMeta>) => void;
  isNodeInspectorOpen: boolean;
  setIsNodeInspectorOpen: (open: boolean) => void;
  hasPendingSnapshotChanges: boolean;
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
