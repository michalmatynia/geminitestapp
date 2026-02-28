import React from 'react';
import type {
  AiNode,
  DataContractNodeIssueSummary,
  DataContractPreflightIssue,
  PathFlowIntensity,
  Edge,
  RuntimeState,
  SvgDetailLevel,
} from '@/shared/lib/ai-paths';
import { type ConnectorInfo } from './canvas-board-connectors';
import { type EdgeRoutingMode } from '../context/hooks/useEdgePaths';

type RuntimeEvent = Record<string, unknown>;
type NodeProcessingStatus = string;

export const DEFAULT_NODE_NOTE_COLOR = '#f5e7c3';
export const RENDERER_MODE_STORAGE_KEY = 'ai-paths:canvas-renderer-mode';
export const EDGE_ROUTING_MODE_STORAGE_KEY = 'ai-paths:canvas-edge-routing-mode';
export const MINIMAP_VISIBILITY_STORAGE_KEY = 'ai-paths:canvas-minimap-visible';
export const SVG_CULL_PADDING = 260;
export const SVG_EDGE_CULL_PADDING = 160;
export const SVG_PERF_SAMPLE_WINDOW_MS = 1200;

export type CanvasRendererMode = 'legacy' | 'svg';

/**
 * Extension of AiNode with layout and UI properties
 * used during canvas rendering.
 */
export interface CanvasNode extends AiNode {
  width?: number;
  height?: number;
  note?: {
    text?: string;
    color?: string;
  };
}

export type CanvasBoardConnectorTooltipOverrideInput = {
  direction: 'input' | 'output';
  node: AiNode;
  port: string;
};

export type CanvasBoardConnectorTooltipOverride = {
  content: React.ReactNode;
  maxWidth?: string | undefined;
};

export type SvgConnectorTooltipState = {
  clientX: number;
  clientY: number;
  info: ConnectorInfo;
};

export type SvgNodeDiagnosticsTooltipState = {
  clientX: number;
  clientY: number;
  nodeId: string;
  summary: DataContractNodeIssueSummary;
};

export interface CanvasBoardState {
  view: { panX: number; panY: number; scale: number };
  panState: unknown;
  dragState: unknown;
  lastDrop: unknown;
  connecting: { nodeId: string; port: string; direction: 'input' | 'output' } | null;
  connectingPos: { x: number; y: number } | null;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  nodes: AiNode[];
  edges: Edge[];
  flowIntensity: PathFlowIntensity;
  runtimeState: RuntimeState;
  runtimeNodeStatuses: Record<string, NodeProcessingStatus>;
  runtimeEvents: RuntimeEvent[];
  runtimeRunStatus: string;
  nodeDurations: Record<string, number>;
  fireTrigger: (node: AiNode, event: React.MouseEvent | React.PointerEvent) => Promise<void>;
  selectedNodeId: string | null;
  selectedNodeIds: string[];
  selectedEdgeId: string | null;
  selectionToolMode: 'node' | 'marquee' | 'pan';
  selectEdge: (id: string | null) => void;
  setConfigOpen: (open: boolean) => void;
  edgeRoutingMode: EdgeRoutingMode;
  setEdgeRoutingMode: (mode: EdgeRoutingMode) => void;
  edgePaths: Map<string, string>;
  handlePointerDownNode: (id: string, event: React.PointerEvent) => void;
  handlePanStart: (event: React.PointerEvent) => void;
  handlePanMove: (event: React.PointerEvent) => void;
  handlePanEnd: (event: React.PointerEvent) => void;
  handleRemoveEdge: (id: string) => void;
  handleDisconnectPort: (nodeId: string, port: string) => void;
  handleStartConnection: (nodeId: string, port: string, pos: { x: number; y: number }) => void;
  handleCompleteConnection: (nodeId: string, port: string) => Promise<void>;
  handleReconnectInput: (edgeId: string, nodeId: string, port: string) => Promise<void>;
  handleSelectNode: (id: string | null) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleDragOver: (event: React.DragEvent) => void;
  zoomTo: (scale: number) => Promise<void>;
  fitToNodes: () => Promise<void>;
  fitToSelection: () => Promise<void>;
  resetView: () => Promise<void>;
  centerOnCanvasPoint: (pos: { x: number; y: number }) => Promise<void>;
  selectionMarqueeRect: { x: number; y: number; width: number; height: number } | null;
  touchLongPressIndicator: { clientX: number; clientY: number; progress: number } | null;
  ConfirmationModal: React.ComponentType;
  selectedNodeIdSet: Set<string>;
  hoveredConnectorKey: string | null;
  setHoveredConnectorKey: (key: string | null) => void;
  pinnedConnectorKey: string | null;
  setPinnedConnectorKey: (key: string | null) => void;
  svgConnectorTooltip: SvgConnectorTooltipState | null;
  setSvgConnectorTooltip: (tooltip: SvgConnectorTooltipState | null) => void;
  svgNodeDiagnosticsTooltip: SvgNodeDiagnosticsTooltipState | null;
  setSvgNodeDiagnosticsTooltip: (tooltip: SvgNodeDiagnosticsTooltipState | null) => void;
  rendererMode: CanvasRendererMode;
  setRendererMode: (mode: CanvasRendererMode) => void;
  showMinimap: boolean;
  setShowMinimap: (show: boolean) => void;
  viewportSize: { width: number; height: number } | null;
  prefersReducedMotion: boolean;
  svgPerf: { fps: number; avgFrameMs: number; slowFrameRatio: number };
  effectiveFlowIntensity: PathFlowIntensity;
  isSvgRenderer: boolean;
  nodeById: Map<string, AiNode>;
  getConnectorInfo: (direction: 'input' | 'output', nodeId: string, port: string) => ConnectorInfo;
  getPortValue: (direction: 'input' | 'output', nodeId: string, port: string) => unknown;
  isPanning: boolean;
  activeShapeId: string | null;
}

export const formatRuntimeStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((part: string) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(' ');

export const runtimeStatusBadgeClassName = (status: string): string => {
  if (status === 'completed') {
    return 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200';
  }
  if (status === 'cached') {
    return 'border-teal-400/60 bg-teal-500/15 text-teal-200';
  }
  if (status === 'failed' || status === 'canceled' || status === 'timeout') {
    return 'border-rose-500/60 bg-rose-500/15 text-rose-200';
  }
  if (status === 'queued') {
    return 'border-amber-500/60 bg-amber-500/15 text-amber-200';
  }
  if (
    status === 'running' ||
    status === 'polling' ||
    status === 'paused' ||
    status === 'waiting_callback' ||
    status === 'advance_pending'
  ) {
    return 'border-sky-500/60 bg-sky-500/15 text-sky-200';
  }
  return 'border-border bg-card/60 text-gray-200';
};

export const resolveNodeDiagnosticsBadgeStyle = (
  summary: DataContractNodeIssueSummary | undefined
): { label: string; className: string } | null => {
  if (!summary) return null;
  if (summary.errors > 0) {
    return {
      label: `${summary.errors} Error${summary.errors === 1 ? '' : 's'}`,
      className: 'border-rose-500/60 bg-rose-500/15 text-rose-100',
    };
  }
  if (summary.warnings > 0) {
    return {
      label: `${summary.warnings} Warning${summary.warnings === 1 ? '' : 's'}`,
      className: 'border-amber-500/60 bg-amber-500/15 text-amber-100',
    };
  }
  return null;
};

export const renderNodeDiagnosticsTooltipContent = ({
  summary,
  nodeLabel,
}: {
  summary: DataContractNodeIssueSummary;
  nodeLabel: string;
}): React.JSX.Element => {
  const topIssues = summary.issues.slice(0, 6);
  return (
    <div className='space-y-2'>
      <div className='text-[11px] text-gray-300'>{nodeLabel}</div>
      <div className='text-[10px] text-gray-400'>
        Errors: <span className='text-rose-200'>{summary.errors}</span> · Warnings:{' '}
        <span className='text-amber-200'>{summary.warnings}</span>
      </div>
      <div className='max-h-64 space-y-1 overflow-auto pr-1'>
        {topIssues.map((issue: DataContractPreflightIssue) => {
          const scopeParts = [
            issue.port ? `Port: ${issue.port}` : null,
            issue.token ? `Token: {{${issue.token}}}` : null,
          ]
            .filter((part): part is string => Boolean(part))
            .join(' · ');
          return (
            <div
              key={issue.id}
              className='rounded-md border border-border/60 bg-card/70 px-2 py-1 text-[10px]'
            >
              <div
                className={`font-medium ${
                  issue.severity === 'error' ? 'text-rose-200' : 'text-amber-200'
                }`}
              >
                [{issue.severity.toUpperCase()}] {issue.code}
              </div>
              <div className='mt-0.5 text-gray-200'>{issue.message}</div>
              {scopeParts ? <div className='mt-0.5 text-gray-400'>{scopeParts}</div> : null}
              <div className='mt-0.5 text-gray-300'>Fix: {issue.recommendation}</div>
            </div>
          );
        })}
      </div>
      {summary.issues.length > topIssues.length ? (
        <div className='text-[10px] text-gray-500'>
          +{summary.issues.length - topIssues.length} more issue(s)
        </div>
      ) : null}
    </div>
  );
};

export const BLOCKER_PROCESSING_STATUSES = new Set<string>([
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

export const downgradeDetailLevel = (level: SvgDetailLevel): SvgDetailLevel => {
  if (level === 'full') return 'compact';
  if (level === 'compact') return 'skeleton';
  return 'skeleton';
};

export const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const mergeRuntimePayload = (
  current: Record<string, unknown> | undefined,
  historyValue: unknown
): Record<string, unknown> | undefined => {
  const historical = isPlainRecord(historyValue) ? historyValue : undefined;
  if (!historical && !current) return undefined;
  if (!historical) return current;
  if (!current) return historical;
  return {
    ...historical,
    ...current,
  };
};

export const buildConnectingPreviewPath = (
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  routingMode: EdgeRoutingMode
): string => {
  if (routingMode === 'orthogonal') {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    if (absDx < 28) {
      const directionY = dy >= 0 ? 1 : -1;
      const bendY = fromY + (absDy < 56 ? 24 * directionY : dy * 0.5);
      return `M ${fromX} ${fromY} L ${fromX} ${bendY} L ${toX} ${bendY} L ${toX} ${toY}`;
    }
    const directionX = dx >= 0 ? 1 : -1;
    const bendX = fromX + (absDx < 84 ? 34 * directionX : dx * 0.5);
    return `M ${fromX} ${fromY} L ${bendX} ${fromY} L ${bendX} ${toY} L ${toX} ${toY}`;
  }
  const midX = fromX + (toX - fromX) * 0.5;
  return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`;
};
