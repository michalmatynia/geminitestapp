import React from 'react';
import type {
  AiNode,
  PathFlowIntensity,
  Edge,
  RuntimeState,
  AiPathRuntimeNodeStatusMap,
  AiPathRuntimeEvent,
  DataContractNodeIssueSummary,
} from '@/features/ai/ai-paths/lib';
import type { EdgeRoutingMode, EdgePath } from '../context/hooks/useEdgePaths';
import {
  type CanvasRendererMode,
  type SvgConnectorTooltipState,
  type SvgNodeDiagnosticsTooltipState,
} from './CanvasBoard.utils';
import { type ConnectorInfo } from './canvas-board-connectors';
import { type ViewState, type PanState, type DragState, type ConnectingState } from '../context/CanvasContext';

export interface CanvasBoardState {
  // View State
  view: ViewState;
  panState: PanState | null;
  dragState: DragState | null;
  lastDrop: { x: number; y: number } | null;
  connecting: ConnectingState | null;
  connectingPos: { x: number; y: number } | null;
  isPanning: boolean;
  isDraggingNode: boolean;
  isConnecting: boolean;
  
  // Refs
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  
  // Graph Data
  nodes: AiNode[];
  edges: Edge[];
  flowIntensity: PathFlowIntensity | undefined;
  nodeById: Map<string, AiNode>;
  edgePaths: EdgePath[];
  
  // Runtime State
  runtimeState: RuntimeState;
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeEvents: AiPathRuntimeEvent[] | undefined;
  runtimeRunStatus: string;
  nodeDurations: Record<string, number>;
  
  // Actions
  fireTrigger: (node: AiNode, event?: React.MouseEvent | React.PointerEvent) => Promise<void>;
  
  // Selection
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  selectionToolMode: 'select' | 'pan';
  selectedNodeIdSet: Set<string>;
  
  // UI Actions
  selectEdge: (edgeId: string | null) => void;
  setConfigOpen: (open: boolean) => void;
  setEdgeRoutingMode: React.Dispatch<React.SetStateAction<EdgeRoutingMode>>;
  
  // Event Handlers
  handlePointerDownNode: (nodeId: string, event: React.PointerEvent) => void;
  handlePointerMoveNode: (nodeId: string, event: React.PointerEvent) => void;
  handlePointerUpNode: (nodeId: string, event: React.PointerEvent) => void;
  handlePanStart: (event: React.PointerEvent) => void;
  handlePanMove: (event: React.PointerEvent) => void;
  handlePanEnd: (event: React.PointerEvent) => void;
  handleRemoveEdge: (edgeId: string) => void;
  handleDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  handleStartConnection: (nodeId: string, port: string, pos: { x: number; y: number }) => void;
  handleCompleteConnection: (nodeId: string, port: string) => void;
  handleReconnectInput: (edgeId: string, nodeId: string, port: string) => void;
  handleSelectNode: (nodeId: string, options?: { toggle?: boolean }) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
  
  // Navigation
  zoomTo: (targetScale: number) => void;
  fitToNodes: () => void;
  fitToSelection: () => void;
  resetView: () => void;
  centerOnCanvasPoint: (canvasX: number, canvasY: number) => void;
  
  // Derived UI State
  selectionMarqueeRect: { x: number; y: number; width: number; height: number } | null;
  touchLongPressIndicator: { x: number; y: number; progress: number; phase: 'pending' | 'activated' } | null;
  ConfirmationModal: React.ComponentType;
  
  // Local UI State
  hoveredConnectorKey: string | null;
  setHoveredConnectorKey: React.Dispatch<React.SetStateAction<string | null>>;
  pinnedConnectorKey: string | null;
  setPinnedConnectorKey: React.Dispatch<React.SetStateAction<string | null>>;
  svgConnectorTooltip: SvgConnectorTooltipState | null;
  setSvgConnectorTooltip: React.Dispatch<React.SetStateAction<SvgConnectorTooltipState | null>>;
  svgNodeDiagnosticsTooltip: SvgNodeDiagnosticsTooltipState | null;
  setSvgNodeDiagnosticsTooltip: React.Dispatch<React.SetStateAction<SvgNodeDiagnosticsTooltipState | null>>;
  rendererMode: CanvasRendererMode;
  setRendererMode: React.Dispatch<React.SetStateAction<CanvasRendererMode>>;
  showMinimap: boolean;
  setShowMinimap: React.Dispatch<React.SetStateAction<boolean>>;
  viewportSize: { width: number; height: number } | null;
  prefersReducedMotion: boolean;
  svgPerf: { fps: number; avgFrameMs: number; slowFrameRatio: number };
  effectiveFlowIntensity: PathFlowIntensity;
  isSvgRenderer: boolean;
  
  // Helpers
  getConnectorInfo: (direction: 'input' | 'output', nodeId: string, port: string) => ConnectorInfo;
  getPortValue: (direction: 'input' | 'output', nodeId: string, port: string) => unknown;
  activeShapeId: string | null;
  edgeRoutingMode: EdgeRoutingMode;
}

export interface UseCanvasBoardStateProps {
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
  nodeDiagnosticsById?: Record<string, DataContractNodeIssueSummary> | undefined;
}
