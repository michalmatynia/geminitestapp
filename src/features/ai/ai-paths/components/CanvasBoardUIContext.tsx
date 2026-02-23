'use client';

import React, { createContext, useContext } from 'react';

import type {
  AiNode,
  AiPathRuntimeNodeStatusMap,
  Edge,
  PathFlowIntensity,
  RuntimeState,
} from '@/features/ai/ai-paths/lib';

import type { ConnectorInfo } from './canvas-board-connectors';

export type CanvasRendererMode = 'legacy' | 'svg';
export type SvgDetailLevel = 'full' | 'compact' | 'skeleton';
export type RuntimeRunStatus = 'idle' | 'running' | 'paused' | 'stepping';

export interface CanvasBoardUIContextValue {
  // View & Viewport
  view: { x: number; y: number; scale: number };
  viewportSize: { width: number; height: number } | null;
  detailLevel: SvgDetailLevel;
  
  // Graph Data
  nodes: AiNode[];
  edges: Edge[];
  edgeMetaMap: Map<string, Edge>;
  nodeById: Map<string, AiNode>;
  
  // Selection
  selectedNodeId: string | null;
  selectedNodeIdSet: Set<string>;
  selectedEdgeId: string | null;
  
  // Runtime
  runtimeState: RuntimeState;
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeRunStatus: RuntimeRunStatus;
  nodeDurations: Record<string, number>;
  
  // Pulse & Effects
  inputPulseNodes: Set<string>;
  outputPulseNodes: Set<string>;
  activeEdgeIds: Set<string>;
  triggerConnected: Set<string>;
  wireFlowEnabled: boolean;
  flowingIntensity: Exclude<PathFlowIntensity, 'off'>;
  reduceVisualEffects: boolean;
  
  // Interaction Settings
  enableNodeAnimations: boolean;
  connectorHitTargetPx: number;
  openNodeConfigOnSingleClick: boolean;
  
  // Connector Tooltip State
  hoveredConnectorKey: string | null;
  pinnedConnectorKey: string | null;
  setHoveredConnectorKey: (key: string | null) => void;
  setPinnedConnectorKey: (key: string | null) => void;
  onConnectorHover?: (payload: { clientX: number; clientY: number; info: ConnectorInfo }) => void;
  onConnectorLeave?: () => void;

  // Handlers (Interactions)
  onPointerDownNode: (event: React.PointerEvent<Element>, nodeId: string) => void | Promise<void>;
  onPointerMoveNode: (event: React.PointerEvent<Element>, nodeId: string) => void;
  onPointerUpNode: (event: React.PointerEvent<Element>, nodeId: string) => void;
  onSelectNode: (nodeId: string, options?: { toggle?: boolean }) => void | Promise<void>;
  onOpenNodeConfig: () => void;
  onStartConnection: (event: React.PointerEvent<Element>, node: AiNode, port: string) => void | Promise<void>;
  onCompleteConnection: (event: React.PointerEvent<Element>, node: AiNode, port: string) => void;
  onReconnectInput: (event: React.PointerEvent<Element>, nodeId: string, port: string) => void | Promise<void>;
  onDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  onFireTrigger: (node: AiNode) => void | Promise<void>;
  onRemoveEdge: (edgeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
}

const CanvasBoardUIContext = createContext<CanvasBoardUIContextValue | null>(null);

export function CanvasBoardUIProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: CanvasBoardUIContextValue;
}) {
  return (
    <CanvasBoardUIContext.Provider value={value}>
      {children}
    </CanvasBoardUIContext.Provider>
  );
}

export function useCanvasBoardUI() {
  const context = useContext(CanvasBoardUIContext);
  if (!context) {
    throw new Error('useCanvasBoardUI must be used within CanvasBoardUIProvider');
  }
  return context;
}
