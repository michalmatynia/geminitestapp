'use client';

import React from 'react';

import type {
  AiNode,
  Edge,
} from '@/features/ai/ai-paths/lib';
import {
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  PORT_SIZE,
  getPortOffsetY,
} from '@/features/ai/ai-paths/lib';

import {
  buildConnectorInfo,
} from './canvas-board-connectors';
import { useCanvasBoardUI } from './CanvasBoardUIContext';
import { formatPortLabel } from '../utils/ui-utils';

const BLOCKER_PROCESSING_STATUSES = new Set<string>([
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

const INPUT_CONNECTOR_COLORS = {
  fill: 'rgba(56, 189, 248, 0.18)',
  fillConnected: 'rgba(56, 189, 248, 0.34)',
  stroke: 'rgba(125, 211, 252, 0.9)',
};

const OUTPUT_CONNECTOR_COLORS = {
  fill: 'rgba(251, 191, 36, 0.22)',
  stroke: 'rgba(252, 211, 77, 0.9)',
};

const formatRuntimeStatusLabel = (status: string): string =>
  status
    .split('_')
    .map((part: string): string => (part ? `${part[0]!.toUpperCase()}${part.slice(1)}` : part))
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
    case 'fetcher':
      return {
        fill: 'rgba(14, 165, 233, 0.14)',
        stroke: 'rgba(14, 165, 233, 0.7)',
        text: '#e0f2fe',
        accent: '#7dd3fc',
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

export function CanvasSvgNodeLayer({ cullPadding = 260 }: { cullPadding?: number }): React.JSX.Element {
  const {
    detailLevel,
    inputPulseNodes,
    outputPulseNodes,
    triggerConnected,
    enableNodeAnimations,
    connectorHitTargetPx,
    hoveredConnectorKey,
    pinnedConnectorKey,
    setHoveredConnectorKey,
    setPinnedConnectorKey,
    onPointerDownNode,
    onPointerMoveNode,
    onPointerUpNode,
    onSelectNode,
    onOpenNodeConfig,
    openNodeConfigOnSingleClick,
    onStartConnection,
    onCompleteConnection,
    onReconnectInput,
    onDisconnectPort,
    onFireTrigger,
    onConnectorHover,
    onConnectorLeave,
    nodes,
    edges,
    view,
    viewportSize,
    selectedNodeId,
    selectedNodeIdSet,
    runtimeState,
    runtimeNodeStatuses,
    runtimeRunStatus,
  } = useCanvasBoardUI();

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
        (direction === 'input' ? lastEntry?.['inputs'] : lastEntry?.['outputs']);
      return fallbackSource?.[port];
    },
    [runtimeState]
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
        const nodeHistoryEntries = runtimeState.history?.[node.id];
        const canUsePersistedStatusFallback =
          runtimeRunStatus === 'idle' &&
          Array.isArray(nodeHistoryEntries) &&
          nodeHistoryEntries.length > 0;
        const runtimeNodeStatusRaw =
          runtimeNodeStatuses?.[node.id] ??
          (canUsePersistedStatusFallback &&
          typeof runtimeState.outputs?.[node.id]?.['status'] === 'string'
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
        const inputPulse = inputPulseNodes.has(node.id);
        const outputPulse = outputPulseNodes.has(node.id);
        const typeBadge = node.type.toUpperCase();        const typeBadgeWidth = Math.max(54, typeBadge.length * 6 + 12);
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
                const isToggleSelection =
                  event.shiftKey || event.metaKey || event.ctrlKey;
                void onSelectNode(node.id, {
                  toggle: isToggleSelection,
                });
                if (openNodeConfigOnSingleClick && !isToggleSelection) {
                  onOpenNodeConfig();
                }
              }}
            />

            <text
              x={10}
              y={titleY}
              fill={palette.text}
              fontSize={titleFontSize}
              fontWeight='500'
              pointerEvents='none'
              style={{ userSelect: 'none' }}
            >
              {titleText}
            </text>

            {showNodeId && (
              <text
                x={10}
                y={NODE_MIN_HEIGHT - 8}
                fill='rgba(148, 163, 184, 0.85)'
                fontSize='8'
                fontFamily='ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                pointerEvents='none'
                style={{ userSelect: 'none' }}
              >
                {node.id}
              </text>
            )}

            {showFineDetails && (
              <g transform={`translate(10 ${NODE_MIN_HEIGHT - 26})`} pointerEvents='none'>
                <rect
                  width={typeBadgeWidth}
                  height={14}
                  rx={4}
                  fill='rgba(0, 0, 0, 0.25)'
                  stroke={palette.accent}
                  strokeWidth='0.5'
                  strokeOpacity='0.4'
                />
                <text
                  x={typeBadgeWidth / 2}
                  y={10}
                  textAnchor='middle'
                  fill={palette.accent}
                  fontSize='8'
                  fontWeight='600'
                  style={{ userSelect: 'none' }}
                >
                  {typeBadge}
                </text>
              </g>
            )}

            {showRuntimeBadges && runtimeStatusLabel && (
              <g
                transform={`translate(${NODE_WIDTH - runtimeBadgeWidth - 10} ${
                  NODE_MIN_HEIGHT - 26
                })`}
                pointerEvents='none'
              >
                {runtimeStatusColors && (
                  <>
                    <rect
                      width={runtimeBadgeWidth}
                      height={14}
                      rx={4}
                      fill={runtimeStatusColors.fill}
                      stroke={runtimeStatusColors.stroke}
                      strokeWidth='0.5'
                    />
                    <text
                      x={runtimeBadgeWidth / 2}
                      y={10}
                      textAnchor='middle'
                      fill={runtimeStatusColors.text}
                      fontSize='8'
                      fontWeight='600'
                      style={{ userSelect: 'none' }}
                    >
                      {runtimeStatusLabel}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Keep Fire Trigger always available in SVG mode for trigger nodes, regardless zoom/detail. */}
            {node.type === 'trigger' && (
              <g
                transform={`translate(${NODE_WIDTH - 92} 6)`}
                pointerEvents='none'
              >
                <rect
                  data-node-action='fire-trigger'
                  data-node-id={node.id}
                  x={0}
                  y={0}
                  width={82}
                  height={16}
                  rx={5}
                  fill={triggerConnected.has(node.id) ? 'rgba(16, 185, 129, 0.2)' : 'rgba(244, 63, 94, 0.14)'}
                  stroke={triggerConnected.has(node.id) ? '#10b981' : '#f43f5e'}
                  strokeWidth='1'
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                  onPointerDown={(event: React.PointerEvent<SVGRectElement>) => {
                    event.stopPropagation();
                  }}
                  onClick={(event: React.MouseEvent<SVGRectElement>) => {
                    event.stopPropagation();
                    void onFireTrigger(node);
                  }}
                />
                <path
                  d='M0 0L0 7L6 3.5Z'
                  transform='translate(8 4.5)'
                  fill={triggerConnected.has(node.id) ? '#10b981' : '#f43f5e'}
                  pointerEvents='none'
                />
                <text
                  x={46}
                  y={11}
                  textAnchor='middle'
                  fill={triggerConnected.has(node.id) ? '#a7f3d0' : '#fecdd3'}
                  fontSize='8'
                  fontWeight='600'
                  pointerEvents='none'
                  style={{ userSelect: 'none' }}
                >
                  Fire Trigger
                </text>
              </g>
            )}

            {showNodeAnimations && inputPulse && (
              <rect
                x={-2}
                y={-2}
                width={NODE_WIDTH + 4}
                height={NODE_MIN_HEIGHT + 4}
                rx={13}
                ry={13}
                fill='none'
                stroke='#38bdf8'
                strokeWidth='2'
                className='ai-paths-node-pulse-input'
                pointerEvents='none'
              />
            )}
            {showNodeAnimations && outputPulse && (
              <rect
                x={-2}
                y={-2}
                width={NODE_WIDTH + 4}
                height={NODE_MIN_HEIGHT + 4}
                rx={13}
                ry={13}
                fill='none'
                stroke='#10b981'
                strokeWidth='2'
                className='ai-paths-node-pulse-output'
                pointerEvents='none'
              />
            )}

            {showNodePorts && (
              <>
                {node.inputs?.map((port: string, index: number) => {
                  const y = getPortOffsetY(index, node.inputs.length);
                  const isConnected = incomingEdgePortSet.has(`${node.id}:${port}`);
                  const key = buildConnectorKey('input', node.id, port);
                  const isHovered = hoveredConnectorKey === key;
                  const isPinned = pinnedConnectorKey === key;

                  return (
                    <g key={key} transform={`translate(0 ${y})`}>
                      <circle
                        data-port='input'
                        data-node-id={node.id}
                        data-port-name={port}
                        cx={0}
                        cy={0}
                        r={isHovered || isPinned ? PORT_SIZE / 2 + 1.5 : PORT_SIZE / 2}
                        fill={
                          isConnected
                            ? INPUT_CONNECTOR_COLORS.fillConnected
                            : INPUT_CONNECTOR_COLORS.fill
                        }
                        stroke={INPUT_CONNECTOR_COLORS.stroke}
                        strokeWidth={isHovered || isPinned ? 2 : 1}
                        style={{ cursor: 'crosshair' }}
                        onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                          event.stopPropagation();
                          void onReconnectInput(event, node.id, port);
                        }}
                        onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                          event.stopPropagation();
                          onCompleteConnection(event, node, port);
                        }}
                        onContextMenu={(event: React.MouseEvent<SVGCircleElement>) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onDisconnectPort('input', node.id, port);
                        }}
                        onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                          setHoveredConnectorKey(key);
                          onConnectorHover?.({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            info: getConnectorInfo('input', node.id, port),
                          });
                        }}
                        onPointerLeave={() => {
                          setHoveredConnectorKey(null);
                          onConnectorLeave?.();
                        }}
                        onClick={(event: React.MouseEvent<SVGCircleElement>) => {
                          if (event.altKey || event.ctrlKey || event.metaKey) {
                            setPinnedConnectorKey(isPinned ? null : key);
                          }
                        }}
                      />
                      <circle
                        data-port='input'
                        data-node-id={node.id}
                        data-port-name={port}
                        cx={0}
                        cy={0}
                        r={connectorHitRadius}
                        fill='transparent'
                        stroke='none'
                        style={{ cursor: 'crosshair' }}
                        onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                          event.stopPropagation();
                          void onReconnectInput(event, node.id, port);
                        }}
                        onPointerUp={(event: React.PointerEvent<SVGCircleElement>) => {
                          event.stopPropagation();
                          onCompleteConnection(event, node, port);
                        }}
                        onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                          setHoveredConnectorKey(key);
                          onConnectorHover?.({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            info: getConnectorInfo('input', node.id, port),
                          });
                        }}
                        onPointerLeave={() => {
                          setHoveredConnectorKey(null);
                          onConnectorLeave?.();
                        }}
                      />
                      {showPortLabels && (
                        <text
                          x={PORT_SIZE + 4}
                          y={3}
                          fill='rgba(148, 163, 184, 0.7)'
                          fontSize='9'
                          style={{ userSelect: 'none' }}
                        >
                          {formatPortLabel(port)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {node.outputs?.map((port: string, index: number) => {
                  const y = getPortOffsetY(index, node.outputs.length);
                  const key = buildConnectorKey('output', node.id, port);
                  const isHovered = hoveredConnectorKey === key;
                  const isPinned = pinnedConnectorKey === key;

                  return (
                    <g key={key} transform={`translate(${NODE_WIDTH} ${y})`}>
                      <circle
                        data-port='output'
                        data-node-id={node.id}
                        data-port-name={port}
                        cx={0}
                        cy={0}
                        r={isHovered || isPinned ? PORT_SIZE / 2 + 1.5 : PORT_SIZE / 2}
                        fill={OUTPUT_CONNECTOR_COLORS.fill}
                        stroke={OUTPUT_CONNECTOR_COLORS.stroke}
                        strokeWidth={isHovered || isPinned ? 2 : 1}
                        style={{ cursor: 'crosshair' }}
                        onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                          event.stopPropagation();
                          void onStartConnection(event, node, port);
                        }}
                        onContextMenu={(event: React.MouseEvent<SVGCircleElement>) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onDisconnectPort('output', node.id, port);
                        }}
                        onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                          setHoveredConnectorKey(key);
                          onConnectorHover?.({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            info: getConnectorInfo('output', node.id, port),
                          });
                        }}
                        onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                          setHoveredConnectorKey(key);
                          onConnectorHover?.({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            info: getConnectorInfo('output', node.id, port),
                          });
                        }}
                        onPointerLeave={() => {
                          setHoveredConnectorKey(null);
                          onConnectorLeave?.();
                        }}
                        onClick={(event: React.MouseEvent<SVGCircleElement>) => {
                          if (event.altKey || event.ctrlKey || event.metaKey) {
                            setPinnedConnectorKey(isPinned ? null : key);
                          }
                        }}
                      />
                      <circle
                        data-port='output'
                        data-node-id={node.id}
                        data-port-name={port}
                        cx={0}
                        cy={0}
                        r={connectorHitRadius}
                        fill='transparent'
                        stroke='none'
                        style={{ cursor: 'crosshair' }}
                        onPointerDown={(event: React.PointerEvent<SVGCircleElement>) => {
                          event.stopPropagation();
                          void onStartConnection(event, node, port);
                        }}
                        onPointerEnter={(event: React.PointerEvent<SVGCircleElement>) => {
                          setHoveredConnectorKey(key);
                          onConnectorHover?.({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            info: getConnectorInfo('output', node.id, port),
                          });
                        }}
                        onPointerMove={(event: React.PointerEvent<SVGCircleElement>) => {
                          setHoveredConnectorKey(key);
                          onConnectorHover?.({
                            clientX: event.clientX,
                            clientY: event.clientY,
                            info: getConnectorInfo('output', node.id, port),
                          });
                        }}
                        onPointerLeave={() => {
                          setHoveredConnectorKey(null);
                          onConnectorLeave?.();
                        }}
                      />
                      {showPortLabels && (
                        <text
                          x={-PORT_SIZE - 4}
                          y={3}
                          textAnchor='end'
                          fill='rgba(148, 163, 184, 0.7)'
                          fontSize='9'
                          style={{ userSelect: 'none' }}
                        >
                          {formatPortLabel(port)}
                        </text>
                      )}
                    </g>
                  );
                })}
              </>
            )}
          </g>
        );
      })}
    </>
  );
}
