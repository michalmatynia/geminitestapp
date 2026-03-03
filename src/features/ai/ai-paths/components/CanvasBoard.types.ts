'use client';

import React from 'react';
import type {
  AiNode,
  DataContractNodeIssueSummary,
  Edge,
  RuntimeState,
  AiPathRuntimeNodeStatusMap,
  AiPathRuntimeEvent,
} from '@/shared/lib/ai-paths';
import {
  type CanvasRendererMode,
  type SvgConnectorTooltipState,
  type SvgNodeDiagnosticsTooltipState,
  type CanvasBoardConnectorTooltipOverrideInput,
  type CanvasBoardConnectorTooltipOverride,
} from './CanvasBoard.utils';
import { type EdgeRoutingMode, type EdgePath } from '../context/hooks/useEdgePaths';
import type { ConnectorInfo } from './canvas-board-connectors';
import {
  type ViewState,
  type PanState,
  type DragState,
  type ConnectingState,
} from '../context/CanvasContext';

export type RuntimeRunStatus = 'idle' | 'running' | 'paused' | 'stepping' | 'completed' | 'failed';

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
  flowIntensity: import('@/features/ai/ai-paths/lib').PathFlowIntensity | undefined;
  nodeById: Map<string, AiNode>;
  edgePaths: EdgePath[];

  // Runtime State
  runtimeState: RuntimeState;
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeEvents: AiPathRuntimeEvent[] | undefined;
  runtimeRunStatus: RuntimeRunStatus;
  nodeDurations: Record<string, number>;

  // Actions
  fireTrigger: (node: AiNode, event?: React.MouseEvent<HTMLButtonElement>) => Promise<void>;

  // Selection
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  selectionToolMode: 'select' | 'pan';
  selectedNodeIdSet: Set<string>;

  // UI Actions
  selectEdge: (edgeId: string | null) => void;
  setConfigOpen: (open: boolean) => void;
  setEdgeRoutingMode: (mode: EdgeRoutingMode) => void;

  // Event Handlers
  handlePointerDownNode: (nodeId: string, event: React.PointerEvent) => void;
  handlePointerMoveNode: (nodeId: string, event: React.PointerEvent) => void;
  handlePointerUpNode: (nodeId: string, event: React.PointerEvent) => void;
  consumeSuppressedNodeClick: (nodeId: string) => boolean;
  handlePanStart: (event: React.PointerEvent) => void;
  handlePanMove: (event: React.PointerEvent) => void;
  handlePanEnd: (event: React.PointerEvent) => void;
  handleWheel: (event: React.WheelEvent) => void;
  handleRemoveEdge: (edgeId: string) => void;
  handleDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  handleStartConnection: (event: React.PointerEvent<Element>, node: AiNode, port: string) => void;
  handleCompleteConnection: (
    event: React.PointerEvent<Element>,
    node: AiNode,
    port: string
  ) => void;
  handleReconnectInput: (event: React.PointerEvent<Element>, nodeId: string, port: string) => void;
  handleSelectNode: (nodeId: string, options?: { toggle?: boolean }) => void;
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void;
  handleDragOver: (event: React.DragEvent<HTMLDivElement>) => void;

  // Navigation
  zoomTo: (targetScale: number) => void;
  fitToNodes: () => void;
  fitToSelection: () => void;
  resetView: () => void;
  centerOnCanvasPoint: (canvasX: number, canvasY: number) => void;

  // Derived UI State
  selectionMarqueeRect: { left: number; top: number; width: number; height: number } | null;
  touchLongPressIndicator: { x: number; y: number; progress: number } | null;
  ConfirmationModal: React.ComponentType;

  // Local UI State
  hoveredConnectorKey: string | null;
  setHoveredConnectorKey: React.Dispatch<React.SetStateAction<string | null>>;
  pinnedConnectorKey: string | null;
  setPinnedConnectorKey: React.Dispatch<React.SetStateAction<string | null>>;
  svgConnectorTooltip: SvgConnectorTooltipState | null;
  setSvgConnectorTooltip: React.Dispatch<React.SetStateAction<SvgConnectorTooltipState | null>>;
  svgNodeDiagnosticsTooltip: SvgNodeDiagnosticsTooltipState | null;
  setSvgNodeDiagnosticsTooltip: React.Dispatch<
    React.SetStateAction<SvgNodeDiagnosticsTooltipState | null>
  >;
  rendererMode: CanvasRendererMode;
  showMinimap: boolean;
  setShowMinimap: React.Dispatch<React.SetStateAction<boolean>>;
  viewportSize: { width: number; height: number } | null;
  prefersReducedMotion: boolean;
  svgPerf: { fps: number; avgFrameMs: number; slowFrameRatio: number };
  effectiveFlowIntensity: import('@/features/ai/ai-paths/lib').PathFlowIntensity;
  isSvgRenderer: boolean;

  // Helpers
  getConnectorInfo: (direction: 'input' | 'output', nodeId: string, port: string) => ConnectorInfo;
  getPortValue: (direction: 'input' | 'output', nodeId: string, port: string) => unknown;
  activeShapeId: string | null;
  edgeRoutingMode: EdgeRoutingMode;
  nodeDiagnosticsById: Record<string, DataContractNodeIssueSummary>;

  // UI Interaction Overrides
  openNodeConfigOnSingleClick?: boolean;
  onConnectorHover?: (payload: { clientX: number; clientY: number; info: ConnectorInfo }) => void;
  onConnectorLeave?: () => void;
  onNodeDiagnosticsHover?: (payload: {
    clientX: number;
    clientY: number;
    nodeId: string;
    summary: DataContractNodeIssueSummary;
  }) => void;
  onNodeDiagnosticsLeave?: () => void;
  onFocusNodeDiagnostics?: (nodeId: string) => void;
  resolveConnectorTooltip?: (
    input: CanvasBoardConnectorTooltipOverrideInput
  ) => CanvasBoardConnectorTooltipOverride | null | undefined;
}

export interface UseCanvasBoardStateProps {
  confirmNodeSwitch?: ((nodeId: string) => boolean | Promise<boolean>) | undefined;
  nodeDiagnosticsById?: Record<string, DataContractNodeIssueSummary> | undefined;
}
