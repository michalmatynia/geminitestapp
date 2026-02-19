'use client';

import React from 'react';

import type {
  AiNode,
  AiPathRuntimeNodeStatusMap,
  Edge,
  RuntimeState,
} from '@/features/ai/ai-paths/lib';
import {
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  PORT_SIZE,
  formatRuntimeValue,
  formatDurationMs,
  getPortOffsetY,
  validateConnection,
} from '@/features/ai/ai-paths/lib';

import {
  buildConnectorInfo,
  type ConnectorInfo,
} from './canvas-board-connectors';
import { formatPortLabel } from '../utils/ui-utils';

type RuntimeRunStatus = 'idle' | 'running' | 'paused' | 'stepping';
type SvgNodeDetailLevel = 'full' | 'compact' | 'skeleton';

type SvgNodeLayerProps = {
  nodes: AiNode[];
  edges: Edge[];
  view: { x: number; y: number; scale: number };
  viewportSize: { width: number; height: number } | null;
  cullPadding?: number;
  detailLevel?: SvgNodeDetailLevel;
  selectedNodeId: string | null;
  selectedNodeIdSet: Set<string>;
  runtimeState: RuntimeState;
  runtimeNodeStatuses: AiPathRuntimeNodeStatusMap;
  runtimeRunStatus: RuntimeRunStatus;
  nodeDurations: Record<string, number>;
  inputPulseNodes: Set<string>;
  outputPulseNodes: Set<string>;
  triggerConnected: Set<string>;
  enableNodeAnimations?: boolean;
  connectorHitTargetPx?: number;
  connecting: { fromNodeId: string; fromPort: string } | null;
  connectingFromNode: AiNode | null;
  hoveredConnectorKey: string | null;
  pinnedConnectorKey: string | null;
  setHoveredConnectorKey: React.Dispatch<React.SetStateAction<string | null>>;
  setPinnedConnectorKey: React.Dispatch<React.SetStateAction<string | null>>;
  onPointerDownNode: (event: React.PointerEvent<Element>, nodeId: string) => void | Promise<void>;
  onPointerMoveNode: (event: React.PointerEvent<Element>, nodeId: string) => void;
  onPointerUpNode: (event: React.PointerEvent<Element>, nodeId: string) => void;
  onSelectNode: (nodeId: string, options?: { toggle?: boolean }) => void | Promise<void>;
  onOpenNodeConfig: () => void;
  onStartConnection: (
    event: React.PointerEvent<Element>,
    node: AiNode,
    port: string
  ) => void | Promise<void>;
  onCompleteConnection: (
    event: React.PointerEvent<Element>,
    node: AiNode,
    port: string
  ) => void;
  onReconnectInput: (
    event: React.PointerEvent<Element>,
    nodeId: string,
    port: string
  ) => void | Promise<void>;
  onDisconnectPort: (direction: 'input' | 'output', nodeId: string, port: string) => void;
  onFireTrigger: (node: AiNode) => void | Promise<void>;
  onConnectorHover?: ((payload: {
    clientX: number;
    clientY: number;
    info: ConnectorInfo;
  }) => void) | undefined;
  onConnectorLeave?: (() => void) | undefined;
};

const BLOCKER_PROCESSING_STATUSES = new Set<string>([
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

const formatRuntimeStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((part: string) => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
    .join(' ');

const resolveNodePalette = (
  nodeType: string
): { fill: string; stroke: string; text: string; accent: string } => {
  switch (nodeType) {
    case 'trigger':
      return {
        fill: 'rgba(16, 185, 129, 0.14)',
        stroke: 'rgba(16, 185, 129, 0.72)',
        text: '#dcfce7',
        accent: '#6ee7b7',
      };
    case 'context':
      return {
        fill: 'rgba(45, 212, 191, 0.14)',
        stroke: 'rgba(45, 212, 191, 0.7)',
        text: '#ccfbf1',
        accent: '#5eead4',
      };
    case 'simulation':
      return {
        fill: 'rgba(6, 182, 212, 0.14)',
        stroke: 'rgba(6, 182, 212, 0.7)',
        text: '#cffafe',
        accent: '#67e8f9',
      };
    case 'database':
      return {
        fill: 'rgba(59, 130, 246, 0.14)',
        stroke: 'rgba(59, 130, 246, 0.7)',
        text: '#dbeafe',
        accent: '#93c5fd',
      };
    case 'viewer':
      return {
        fill: 'rgba(251, 191, 36, 0.12)',
        stroke: 'rgba(251, 191, 36, 0.64)',
        text: '#fef3c7',
        accent: '#fcd34d',
      };
    default:
      return {
        fill: 'rgba(17, 24, 39, 0.88)',
        stroke: 'rgba(148, 163, 184, 0.55)',
        text: '#e5e7eb',
        accent: '#7dd3fc',
      };
  }
};

const statusPalette = (
  status: string | null
): { fill: string; stroke: string; text: string } | null => {
  if (!status) return null;
  if (status === 'completed') {
    return {
      fill: 'rgba(16, 185, 129, 0.16)',
      stroke: 'rgba(16, 185, 129, 0.6)',
      text: '#a7f3d0',
    };
  }
  if (status === 'cached') {
    return {
      fill: 'rgba(20, 184, 166, 0.16)',
      stroke: 'rgba(20, 184, 166, 0.6)',
      text: '#99f6e4',
    };
  }
  if (status === 'failed' || status === 'canceled' || status === 'timeout') {
    return {
      fill: 'rgba(244, 63, 94, 0.18)',
      stroke: 'rgba(244, 63, 94, 0.6)',
      text: '#fecdd3',
    };
  }
  if (status === 'queued') {
    return {
      fill: 'rgba(245, 158, 11, 0.16)',
      stroke: 'rgba(245, 158, 11, 0.6)',
      text: '#fde68a',
    };
  }
  if (
    status === 'running' ||
    status === 'polling' ||
    status === 'paused' ||
    status === 'waiting_callback' ||
    status === 'advance_pending'
  ) {
    return {
      fill: 'rgba(56, 189, 248, 0.16)',
      stroke: 'rgba(56, 189, 248, 0.64)',
      text: '#bae6fd',
    };
  }
  return {
    fill: 'rgba(71, 85, 105, 0.2)',
    stroke: 'rgba(148, 163, 184, 0.45)',
    text: '#e2e8f0',
  };
};

const summarizeTitleValue = (value: unknown): string => {
  if (value === undefined) return 'No data yet.';
  const formatted = formatRuntimeValue(value)
    .replace(/\s+/g, ' ')
    .trim();
  if (!formatted) return 'No data yet.';
  return formatted.length > 220 ? `${formatted.slice(0, 220)}...` : formatted;
};

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const mergeRuntimePayload = (
  current: Record<string, unknown> | undefined,
  historyValue: unknown
): Record<string, unknown> | undefined => {
  const historical = isPlainRecord(historyValue)
    ? historyValue
    : undefined;
  if (!historical && !current) return undefined;
  if (!historical) return current;
  if (!current) return historical;
  return {
    ...historical,
    ...current,
  };
};

const buildConnectorTitle = (info: ConnectorInfo): string => {
  const label = info.direction === 'input' ? 'Input' : 'Output';
  return [
    `${label}: ${formatPortLabel(info.port)}`,
    `Expected: ${info.expectedLabel}`,
    info.actualType ? `Actual: ${info.actualType}` : null,
    info.hasMismatch ? 'Type mismatch detected.' : null,
    '',
    `Port value: ${summarizeTitleValue(info.value)}`,
    `Node inputs: ${summarizeTitleValue(info.nodeInputs)}`,
    `Node outputs: ${summarizeTitleValue(info.nodeOutputs)}`,
    '',
    'Right-click to disconnect.',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
};

export function CanvasSvgNodeLayer({
  nodes,
  edges,
  view,
  viewportSize,
  cullPadding = 260,
  detailLevel = 'full',
  selectedNodeId,
  selectedNodeIdSet,
  runtimeState,
  runtimeNodeStatuses,
  runtimeRunStatus,
  nodeDurations,
  inputPulseNodes,
  outputPulseNodes,
  triggerConnected,
  enableNodeAnimations = true,
  connectorHitTargetPx = 14,
  connecting,
  connectingFromNode,
  hoveredConnectorKey,
  pinnedConnectorKey,
  setHoveredConnectorKey,
  setPinnedConnectorKey,
  onPointerDownNode,
  onPointerMoveNode,
  onPointerUpNode,
  onSelectNode,
  onOpenNodeConfig,
  onStartConnection,
  onCompleteConnection,
  onReconnectInput,
  onDisconnectPort,
  onFireTrigger,
  onConnectorHover,
  onConnectorLeave,
}: SvgNodeLayerProps): React.JSX.Element {
  const buildConnectorKey = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): string =>
      `${direction}:${nodeId}:${port}`,
    []
  );

  const nodeById = React.useMemo(
    () => new Map(nodes.map((node: AiNode) => [node.id, node])),
    [nodes]
  );

  const getPortValue = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string): unknown => {
      const source = direction === 'input' ? runtimeState.inputs : runtimeState.outputs;
      const nodeValues = source?.[nodeId] ?? {};
      const directValue = nodeValues[port];
      if (directValue !== undefined) return directValue;
      const history = runtimeState.history?.[nodeId];
      if (!Array.isArray(history) || history.length === 0) return directValue;
      const lastEntry = history[history.length - 1];
      const fallbackSource =
        (direction === 'input' ? lastEntry?.['inputs'] : lastEntry?.['outputs']) as
          | Record<string, unknown>
          | undefined;
      return fallbackSource?.[port];
    },
    [runtimeState.history, runtimeState.inputs, runtimeState.outputs]
  );

  const getNodeRuntimeData = React.useCallback(
    (nodeId: string): {
      inputs: Record<string, unknown> | undefined;
      outputs: Record<string, unknown> | undefined;
    } => {
      const history = runtimeState.history?.[nodeId];
      const lastEntry =
        Array.isArray(history) && history.length > 0
          ? history[history.length - 1]
          : null;
      return {
        inputs: mergeRuntimePayload(runtimeState.inputs?.[nodeId], lastEntry?.['inputs']),
        outputs: mergeRuntimePayload(runtimeState.outputs?.[nodeId], lastEntry?.['outputs']),
      };
    },
    [runtimeState.history, runtimeState.inputs, runtimeState.outputs]
  );

  const getConnectorInfo = React.useCallback(
    (direction: 'input' | 'output', nodeId: string, port: string) =>
      buildConnectorInfo({
        direction,
        nodeId,
        port,
        edges,
        nodeById,
        getPortValue,
        getNodeRuntimeData,
      }),
    [edges, getNodeRuntimeData, getPortValue, nodeById]
  );

  const incomingEdgePortSet = React.useMemo((): Set<string> => {
    const next = new Set<string>();
    edges.forEach((edge: Edge) => {
      if (!edge.to || !edge.toPort) return;
      next.add(`${edge.to}:${edge.toPort}`);
    });
    return next;
  }, [edges]);

  const worldViewport = React.useMemo(() => {
    if (!viewportSize) return null;
    return {
      minX: (-view.x) / view.scale - cullPadding,
      minY: (-view.y) / view.scale - cullPadding,
      maxX: (-view.x + viewportSize.width) / view.scale + cullPadding,
      maxY: (-view.y + viewportSize.height) / view.scale + cullPadding,
    };
  }, [cullPadding, view.scale, view.x, view.y, viewportSize]);

  const renderNodes = React.useMemo((): AiNode[] => {
    if (!worldViewport) return nodes;
    return nodes.filter((node: AiNode) => {
      const left = node.position.x;
      const top = node.position.y;
      const right = node.position.x + NODE_WIDTH;
      const bottom = node.position.y + NODE_MIN_HEIGHT;
      if (
        right >= worldViewport.minX &&
        left <= worldViewport.maxX &&
        bottom >= worldViewport.minY &&
        top <= worldViewport.maxY
      ) {
        return true;
      }
      if (selectedNodeIdSet.has(node.id)) return true;
      return false;
    });
  }, [nodes, selectedNodeIdSet, worldViewport]);

  const showFineDetails = detailLevel === 'full' && view.scale >= 0.72;
  const showPortLabels = detailLevel === 'full' && view.scale >= 0.88;
  const showNodeId = detailLevel !== 'skeleton' && view.scale >= 0.64;
  const showRuntimeBadges = detailLevel !== 'skeleton' && view.scale >= 0.68;
  const showTriggerButton = detailLevel === 'full' && view.scale >= 0.96;
  const connectorHitRadius = React.useMemo((): number => {
    const scaled = connectorHitTargetPx / Math.max(0.001, view.scale);
    return Math.max(PORT_SIZE / 2 + 1, scaled);
  }, [connectorHitTargetPx, view.scale]);

  return (
    <>
      {renderNodes.map((node: AiNode): React.JSX.Element => {
        const isSelected = selectedNodeIdSet.has(node.id);
        const isPrimarySelected = selectedNodeId === node.id;
        const palette = resolveNodePalette(node.type);
        const runtimeNodeStatusRaw =
          runtimeNodeStatuses?.[node.id] ??
          (runtimeRunStatus !== 'idle' &&
          typeof runtimeState.outputs?.[node.id]?.['status'] ===
            'string'
            ? runtimeState.outputs?.[node.id]?.['status']
            : null);
        const runtimeNodeStatus =
          typeof runtimeNodeStatusRaw === 'string' && runtimeNodeStatusRaw.trim().length > 0
            ? runtimeNodeStatusRaw.trim().toLowerCase()
            : null;
        const runtimeStatusColors = statusPalette(runtimeNodeStatus);
        const runtimeStatusLabel = runtimeNodeStatus
          ? formatRuntimeStatusLabel(runtimeNodeStatus)
          : null;
        const isBlockerProcessing =
          (node.type === 'model' ||
            node.type === 'agent' ||
            node.type === 'learner_agent' ||
            node.type === 'poll' ||
            node.type === 'delay') &&
          Boolean(runtimeNodeStatus && BLOCKER_PROCESSING_STATUSES.has(runtimeNodeStatus));
        const isScheduledTrigger =
          node.type === 'trigger' && node.config?.trigger?.event === 'scheduled_run';
        const inputPulse = inputPulseNodes.has(node.id);
        const outputPulse = outputPulseNodes.has(node.id);
        const typeBadge = node.type.toUpperCase();
        const typeBadgeWidth = Math.max(54, typeBadge.length * 6 + 12);
        const runtimeBadgeWidth = runtimeStatusLabel
          ? Math.max(64, runtimeStatusLabel.length * 6 + 16)
          : 0;
        const showNodePorts =
          detailLevel !== 'skeleton' || isSelected || isPrimarySelected;
        const titleFontSize = detailLevel === 'skeleton' ? 11 : 12;
        const titleY = detailLevel === 'skeleton' ? 17 : 18;
        const titleText =
          detailLevel === 'skeleton' && node.title.length > 24
            ? `${node.title.slice(0, 23)}...`
            : node.title;
        const showNodeAnimations =
          enableNodeAnimations &&
          (detailLevel !== 'skeleton' || isSelected || isPrimarySelected);
        const handleNodeDoubleClick = (
          event: React.MouseEvent<SVGGElement | SVGRectElement>
        ): void => {
          event.stopPropagation();
          void onSelectNode(node.id);
          onOpenNodeConfig();
        };

        return (
          <g
            key={node.id}
            transform={`translate(${node.position.x} ${node.position.y})`}
            style={{ cursor: 'grab' }}
            onDoubleClick={handleNodeDoubleClick}
          >
            {isBlockerProcessing ? (
              <rect
                x={-3}
                y={-3}
                width={NODE_WIDTH + 6}
                height={NODE_MIN_HEIGHT + 6}
                rx={14}
                ry={14}
                className='ai-paths-node-halo'
                fill='none'
                stroke='#38bdf8'
                strokeWidth='1.4'
                pointerEvents='none'
              />
            ) : null}
            <rect
              x={0}
              y={0}
              width={NODE_WIDTH}
              height={NODE_MIN_HEIGHT}
              rx={12}
              ry={12}
              fill={palette.fill}
              stroke={isPrimarySelected ? '#bae6fd' : isSelected ? '#7dd3fc' : palette.stroke}
              strokeWidth={isPrimarySelected ? 2.4 : isSelected ? 1.9 : 1.25}
              onPointerDown={(event: React.PointerEvent<SVGRectElement>) => {
                void onPointerDownNode(event, node.id);
              }}
              onPointerMove={(event: React.PointerEvent<SVGRectElement>) => {
                onPointerMoveNode(event, node.id);
              }}
              onPointerUp={(event: React.PointerEvent<SVGRectElement>) => {
                onPointerUpNode(event, node.id);
              }}
              onClick={(event: React.MouseEvent<SVGRectElement>) => {
                void onSelectNode(node.id, {
                  toggle: event.shiftKey || event.metaKey || event.ctrlKey,
                });
              }}
            />

            <text
              x={10}
              y={titleY}
              fill={palette.text}
              fontSize={titleFontSize}
              fontWeight='700'
            >
              {titleText}
            </text>

            {showNodeId ? (
              <text x={10} y={NODE_MIN_HEIGHT - 8} fill='rgba(148, 163, 184, 0.85)' fontSize='8' fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'>
                {node.id}
              </text>
            ) : null}

            {showFineDetails ? (
              <>
                <rect
                  x={10}
                  y={26}
                  width={typeBadgeWidth}
                  height={14}
                  rx={7}
                  fill='rgba(15, 23, 42, 0.58)'
                  stroke='rgba(148, 163, 184, 0.35)'
                />
                <text x={16} y={35.5} fill='#cbd5e1' fontSize='9' fontWeight='600'>
                  {typeBadge}
                </text>
              </>
            ) : null}

            {showRuntimeBadges && runtimeStatusLabel && runtimeStatusColors ? (
              <>
                <rect
                  x={NODE_WIDTH - runtimeBadgeWidth - 10}
                  y={26}
                  width={runtimeBadgeWidth}
                  height={14}
                  rx={7}
                  fill={runtimeStatusColors.fill}
                  stroke={runtimeStatusColors.stroke}
                />
                <text
                  x={NODE_WIDTH - runtimeBadgeWidth - 4}
                  y={35.5}
                  fill={runtimeStatusColors.text}
                  fontSize='9'
                  fontWeight='600'
                >
                  {runtimeStatusLabel}
                </text>
              </>
            ) : null}

            {showFineDetails && nodeDurations[node.id] != null ? (
              <text
                x={NODE_WIDTH - 10}
                y={16}
                textAnchor='end'
                fill='rgba(148, 163, 184, 0.92)'
                fontSize='9'
              >
                {formatDurationMs(nodeDurations[node.id] ?? null)}
              </text>
            ) : null}

            {showNodeAnimations && inputPulse ? (
              <circle
                cx={NODE_WIDTH - 24}
                cy={13}
                r={3}
                fill='#38bdf8'
                className='ai-paths-port-pulse'
              />
            ) : null}
            {showNodeAnimations && outputPulse ? (
              <circle
                cx={NODE_WIDTH - 14}
                cy={13}
                r={3}
                fill='#f59e0b'
                className='ai-paths-port-pulse'
              />
            ) : null}

            {showFineDetails && node.type === 'viewer' && !triggerConnected.has(node.id) ? (
              <text x={10} y={52} fill='#fcd34d' fontSize='9'>
                Not wired to Trigger
              </text>
            ) : null}
            {showFineDetails && node.type === 'trigger' && isScheduledTrigger ? (
              <text x={10} y={52} fill='#fcd34d' fontSize='9' fontWeight='600'>
                Scheduled Trigger
              </text>
            ) : null}

            {showTriggerButton && node.type === 'trigger' ? (
              <g
                transform={`translate(10 ${NODE_MIN_HEIGHT - 26})`}
                style={{ cursor: 'pointer' }}
                onPointerDown={(event: React.PointerEvent<SVGGElement>) => {
                  event.stopPropagation();
                }}
                onDoubleClick={(event: React.MouseEvent<SVGGElement>) => {
                  event.stopPropagation();
                }}
                onClick={(event: React.MouseEvent<SVGGElement>) => {
                  event.stopPropagation();
                  void onFireTrigger(node);
                }}
              >
                <rect
                  x={0}
                  y={0}
                  width={76}
                  height={18}
                  rx={9}
                  fill='rgba(16, 185, 129, 0.18)'
                  stroke='rgba(16, 185, 129, 0.64)'
                />
                <text x={12} y={12.5} fill='#a7f3d0' fontSize='9' fontWeight='700'>
                  Fire Trigger
                </text>
              </g>
            ) : null}

            {showNodeAnimations && isBlockerProcessing ? (
              <g transform={`translate(${NODE_WIDTH - 34} ${NODE_MIN_HEIGHT - 16})`} pointerEvents='none'>
                {[0, 1, 2].map((index: number) => (
                  <circle
                    key={`processing-dot-${node.id}-${index}`}
                    cx={index * 7}
                    cy={0}
                    r={2}
                    fill='#38bdf8'
                  >
                    <animate
                      attributeName='cy'
                      values='0;-3;0'
                      dur='1.1s'
                      begin={`${index * 0.16}s`}
                      repeatCount='indefinite'
                    />
                    <animate
                      attributeName='opacity'
                      values='0.45;1;0.45'
                      dur='1.1s'
                      begin={`${index * 0.16}s`}
                      repeatCount='indefinite'
                    />
                  </circle>
                ))}
              </g>
            ) : null}

            {showNodePorts
              ? node.inputs.map((input: string, index: number) => {
                const portY = getPortOffsetY(index, node.inputs.length);
                const isConnecting = Boolean(connecting && connectingFromNode);
                const isConnectable = isConnecting
                  ? validateConnection(
                    connectingFromNode as AiNode,
                    node,
                    connecting?.fromPort ?? '',
                    input
                  ).valid
                  : false;
                const connectorInfo = getConnectorInfo('input', node.id, input);
                const hasMismatch = connectorInfo.hasMismatch;
                const hasIncomingEdge = incomingEdgePortSet.has(`${node.id}:${input}`);
                const connectorKey = buildConnectorKey('input', node.id, input);
                const isPinned = pinnedConnectorKey === connectorKey;
                const isHovered = hoveredConnectorKey === connectorKey;
                const connectorStroke = isConnecting
                  ? isConnectable
                    ? '#34d399'
                    : '#475569'
                  : isPinned
                    ? '#fcd34d'
                    : '#38bdf8';
                const connectorFill = isConnecting
                  ? isConnectable
                    ? 'rgba(16, 185, 129, 0.35)'
                    : 'rgba(30, 41, 59, 0.4)'
                  : isPinned || isHovered
                    ? 'rgba(56, 189, 248, 0.38)'
                    : 'rgba(56, 189, 248, 0.2)';

                return (
                  <g key={`svg-input-${node.id}-${input}`} transform={`translate(0 ${portY})`}>
                    <circle
                      cx={-8}
                      cy={0}
                      r={connectorHitRadius}
                      stroke='transparent'
                      strokeWidth={1}
                      fill='transparent'
                      data-port='input'
                      style={{ cursor: 'pointer' }}
                      onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                        onConnectorHover?.({
                          clientX: event.clientX,
                          clientY: event.clientY,
                          info: connectorInfo,
                        });
                      }}
                      onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                        setHoveredConnectorKey(connectorKey);
                        onConnectorHover?.({
                          clientX: event.clientX,
                          clientY: event.clientY,
                          info: connectorInfo,
                        });
                      }}
                      onPointerLeave={() => {
                        setHoveredConnectorKey((prev: string | null) =>
                          prev === connectorKey ? null : prev
                        );
                        onConnectorLeave?.();
                      }}
                      onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                        event.stopPropagation();
                        if (hasIncomingEdge) {
                          void onReconnectInput(event, node.id, input);
                        }
                      }}
                      onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                        event.stopPropagation();
                        if (connecting) {
                          onCompleteConnection(event, node, input);
                        }
                      }}
                      onClick={(event: React.MouseEvent<SVGCircleElement>) => {
                        event.stopPropagation();
                        setPinnedConnectorKey((prev: string | null) =>
                          prev === connectorKey ? null : connectorKey
                        );
                      }}
                      onContextMenu={(event: React.MouseEvent<SVGCircleElement>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDisconnectPort('input', node.id, input);
                      }}
                    >
                      <title>
                        {buildConnectorTitle(connectorInfo)}
                      </title>
                    </circle>
                    <circle
                      cx={-8}
                      cy={0}
                      r={PORT_SIZE / 2 + 1}
                      stroke={connectorStroke}
                      strokeWidth={isPinned ? 2 : 1.2}
                      fill={connectorFill}
                      data-port='input'
                      style={{ pointerEvents: 'none' }}
                    />
                    {showPortLabels ? (
                      <text
                        x={10}
                        y={3}
                        fill={hasMismatch ? '#fecaca' : isConnectable ? '#bbf7d0' : '#93c5fd'}
                        fontSize='8.5'
                        fontWeight='600'
                        pointerEvents='none'
                      >
                        {formatPortLabel(input)}
                      </text>
                    ) : null}
                    {hasMismatch ? <circle cx={-1} cy={-8} r={2} fill='#fb7185' /> : null}
                  </g>
                );
              })
              : null}

            {showNodePorts
              ? node.outputs.map((output: string, index: number) => {
                const portY = getPortOffsetY(index, node.outputs.length);
                const connectorInfo = getConnectorInfo('output', node.id, output);
                const hasMismatch = connectorInfo.hasMismatch;
                const connectorKey = buildConnectorKey('output', node.id, output);
                const isPinned = pinnedConnectorKey === connectorKey;
                const isHovered = hoveredConnectorKey === connectorKey;
                const connectorStroke = isPinned ? '#fcd34d' : '#f59e0b';
                const connectorFill =
                isPinned || isHovered
                  ? 'rgba(251, 191, 36, 0.44)'
                  : 'rgba(251, 191, 36, 0.26)';
                return (
                  <g key={`svg-output-${node.id}-${output}`} transform={`translate(0 ${portY})`}>
                    {showPortLabels ? (
                      <text
                        x={NODE_WIDTH - 10}
                        y={3}
                        fill={hasMismatch ? '#fecaca' : '#fcd34d'}
                        fontSize='8.5'
                        fontWeight='600'
                        textAnchor='end'
                        pointerEvents='none'
                      >
                        {formatPortLabel(output)}
                      </text>
                    ) : null}
                    <circle
                      cx={NODE_WIDTH + 8}
                      cy={0}
                      r={connectorHitRadius}
                      stroke='transparent'
                      strokeWidth={1}
                      fill='transparent'
                      data-port='output'
                      style={{ cursor: 'pointer' }}
                      onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                        onConnectorHover?.({
                          clientX: event.clientX,
                          clientY: event.clientY,
                          info: connectorInfo,
                        });
                      }}
                      onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                        setHoveredConnectorKey(connectorKey);
                        onConnectorHover?.({
                          clientX: event.clientX,
                          clientY: event.clientY,
                          info: connectorInfo,
                        });
                      }}
                      onPointerLeave={() => {
                        setHoveredConnectorKey((prev: string | null) =>
                          prev === connectorKey ? null : prev
                        );
                        onConnectorLeave?.();
                      }}
                      onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                        event.stopPropagation();
                        void onStartConnection(event, node, output);
                      }}
                      onClick={(event: React.MouseEvent<SVGCircleElement>) => {
                        event.stopPropagation();
                        setPinnedConnectorKey((prev: string | null) =>
                          prev === connectorKey ? null : connectorKey
                        );
                      }}
                      onContextMenu={(event: React.MouseEvent<SVGCircleElement>) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onDisconnectPort('output', node.id, output);
                      }}
                    >
                      <title>
                        {buildConnectorTitle(connectorInfo)}
                      </title>
                    </circle>
                    <circle
                      cx={NODE_WIDTH + 8}
                      cy={0}
                      r={PORT_SIZE / 2 + 1}
                      stroke={connectorStroke}
                      strokeWidth={isPinned ? 2 : 1.2}
                      fill={connectorFill}
                      data-port='output'
                      style={{ pointerEvents: 'none' }}
                    />
                    {hasMismatch ? (
                      <circle cx={NODE_WIDTH + 15} cy={-8} r={2} fill='#fb7185' />
                    ) : null}
                  </g>
                );
              })
              : null}
          </g>
        );
      })}
    </>
  );
}
