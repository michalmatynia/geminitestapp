'use client';

import React from 'react';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';
import { NODE_MIN_HEIGHT, NODE_WIDTH, PORT_SIZE } from '@/shared/lib/ai-paths/core/constants';
import type { DataContractNodeIssueSummary, RuntimeState } from '@/shared/lib/ai-paths';

import {
  resolveNodePalette,
  statusPalette,
  resolveNodeDiagnosticsBadgePalette,
  mergeRuntimePayload,
} from './canvas/node/canvas-svg-node-utils';
import { CanvasSvgNodePorts } from './canvas/node/CanvasSvgNodePorts';
import {
  normalizeRuntimeStatus,
  resolveNodeBlockerProcessing,
  resolveNodeRuntimeStatusLabel,
} from './canvas/signal-flow-visual-state';
import { buildConnectorInfo } from './canvas-board-connectors';
import { useCanvasBoardUI, type CanvasBoardUIContextValue } from './CanvasBoardUIContext';

const EMPTY_TRIGGER_IDS = new Set<string>();

type CanvasSvgNodeProps = {
  node: AiNode;
};

const resolveNodePortHistoryValue = ({
  direction,
  historyEntries,
  port,
}: {
  direction: 'input' | 'output';
  historyEntries: NonNullable<RuntimeState['history']>[string] | undefined;
  port: string;
}): unknown => {
  if (!Array.isArray(historyEntries) || historyEntries.length === 0) {
    return undefined;
  }
  const lastEntry = historyEntries[historyEntries.length - 1] as Record<string, unknown> | undefined;
  const fallbackSourceCandidate =
    direction === 'input' ? lastEntry?.['inputs'] : lastEntry?.['outputs'];
  if (!fallbackSourceCandidate || typeof fallbackSourceCandidate !== 'object') {
    return undefined;
  }
  return (fallbackSourceCandidate as Record<string, unknown>)[port];
};

const resolveNodePortValue = ({
  direction,
  nodeId,
  port,
  runtimeState,
}: {
  direction: 'input' | 'output';
  nodeId: string;
  port: string;
  runtimeState: RuntimeState;
}): unknown => {
  const source = direction === 'input' ? runtimeState.inputs : runtimeState.outputs;
  const nodeValues = source?.[nodeId] ?? {};
  const directValue = nodeValues[port];
  if (directValue !== undefined) {
    return directValue;
  }
  return resolveNodePortHistoryValue({
    direction,
    historyEntries: runtimeState.history?.[nodeId],
    port,
  });
};

const resolveCanvasSvgNodeTriggerPalette = ({
  isTriggerBlocked,
  isTriggerConnected,
  isTriggerLaunching,
}: {
  isTriggerBlocked: boolean;
  isTriggerConnected: boolean;
  isTriggerLaunching: boolean;
}): { fill: string; stroke: string; text: string; label: string } => {
  if (isTriggerLaunching) {
    return {
      fill: 'rgba(14, 165, 233, 0.24)',
      stroke: '#38bdf8',
      text: '#bae6fd',
      label: 'Launching...',
    };
  }
  if (isTriggerBlocked) {
    return {
      fill: 'rgba(245, 158, 11, 0.22)',
      stroke: '#f59e0b',
      text: '#fde68a',
      label: 'Fix Wiring',
    };
  }
  if (isTriggerConnected) {
    return {
      fill: 'rgba(16, 185, 129, 0.2)',
      stroke: '#10b981',
      text: '#a7f3d0',
      label: 'Fire Trigger',
    };
  }
  return {
    fill: 'rgba(244, 63, 94, 0.14)',
    stroke: '#f43f5e',
    text: '#fecdd3',
    label: 'Fire Trigger',
  };
};

function CanvasSvgNodeModelSelectionBadge({
  modelSelectionBadgeWidth,
  modelSelectionLabel,
  nodeId,
  usesBrainDefaultModel,
  visible,
}: {
  modelSelectionBadgeWidth: number;
  modelSelectionLabel: string;
  nodeId: string;
  usesBrainDefaultModel: boolean;
  visible: boolean;
}): React.JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <g
      transform='translate(10 24)'
      data-node-model-selection-badge={nodeId}
      pointerEvents='none'
    >
      <rect
        width={modelSelectionBadgeWidth}
        height={14}
        rx={4}
        fill={usesBrainDefaultModel ? 'rgba(245, 158, 11, 0.14)' : 'rgba(14, 165, 233, 0.14)'}
        stroke={usesBrainDefaultModel ? 'rgba(245, 158, 11, 0.45)' : 'rgba(14, 165, 233, 0.45)'}
        strokeWidth='0.75'
      />
      <text
        x={modelSelectionBadgeWidth / 2}
        y={10}
        textAnchor='middle'
        fill={usesBrainDefaultModel ? '#fcd34d' : '#7dd3fc'}
        fontSize='8'
        fontWeight='600'
        style={{ userSelect: 'none' }}
      >
        {modelSelectionLabel}
      </text>
    </g>
  );
}

function CanvasSvgNodeDiagnosticsBadge({
  badge,
  badgeX,
  nodeId,
  onFocusNodeDiagnostics,
  onNodeDiagnosticsHover,
  onNodeDiagnosticsLeave,
  summary,
}: {
  badge: NonNullable<ReturnType<typeof resolveNodeDiagnosticsBadgePalette>> | null;
  badgeX: number;
  nodeId: string;
  onFocusNodeDiagnostics?: CanvasBoardUIContextValue['onFocusNodeDiagnostics'];
  onNodeDiagnosticsHover?: CanvasBoardUIContextValue['onNodeDiagnosticsHover'];
  onNodeDiagnosticsLeave?: CanvasBoardUIContextValue['onNodeDiagnosticsLeave'];
  summary: DataContractNodeIssueSummary | undefined;
}): React.JSX.Element | null {
  if (!badge || !summary) {
    return null;
  }

  return (
    <g transform={`translate(${badgeX} 6)`} data-node-diagnostics-badge={nodeId}>
      <rect
        x={0}
        y={0}
        width={50}
        height={16}
        rx={5}
        fill={badge.fill}
        stroke={badge.stroke}
        strokeWidth='1'
        style={{ cursor: 'pointer' }}
        onPointerDown={(event: React.PointerEvent<SVGRectElement>) => {
          event.stopPropagation();
        }}
        onPointerEnter={(event: React.PointerEvent<SVGRectElement>) => {
          onNodeDiagnosticsHover?.({
            clientX: event.clientX,
            clientY: event.clientY,
            nodeId,
            summary,
          });
        }}
        onPointerMove={(event: React.PointerEvent<SVGRectElement>) => {
          onNodeDiagnosticsHover?.({
            clientX: event.clientX,
            clientY: event.clientY,
            nodeId,
            summary,
          });
        }}
        onPointerLeave={() => {
          onNodeDiagnosticsLeave?.();
        }}
        onClick={(event: React.MouseEvent<SVGRectElement>) => {
          event.stopPropagation();
          onFocusNodeDiagnostics?.(nodeId);
        }}
      />
      <text
        x={25}
        y={11}
        textAnchor='middle'
        fill={badge.text}
        fontSize='8'
        fontWeight='600'
        pointerEvents='none'
        style={{ userSelect: 'none' }}
      >
        {badge.label}
      </text>
    </g>
  );
}

function CanvasSvgNodeTriggerAction({
  consumeSuppressedNodeClick,
  isTriggerBlocked,
  isTriggerConnected,
  isTriggerLaunching,
  node,
  onFireTrigger,
  triggerBlockedMessage,
}: {
  consumeSuppressedNodeClick: (nodeId: string) => boolean;
  isTriggerBlocked: boolean;
  isTriggerConnected: boolean;
  isTriggerLaunching: boolean;
  node: AiNode;
  onFireTrigger: CanvasBoardUIContextValue['onFireTrigger'];
  triggerBlockedMessage: string | null;
}): React.JSX.Element | null {
  if (node.type !== 'trigger') {
    return null;
  }

  const palette = resolveCanvasSvgNodeTriggerPalette({
    isTriggerBlocked,
    isTriggerConnected,
    isTriggerLaunching,
  });

  return (
    <g transform={`translate(${NODE_WIDTH - 92} 6)`}>
      {isTriggerBlocked && triggerBlockedMessage ? <title>{triggerBlockedMessage}</title> : null}
      <rect
        data-node-action='fire-trigger'
        data-node-id={node.id}
        data-trigger-blocked={isTriggerBlocked ? 'true' : 'false'}
        x={0}
        y={0}
        width={82}
        height={16}
        rx={5}
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth='1'
        style={{ cursor: isTriggerBlocked ? 'help' : 'pointer', pointerEvents: 'all' }}
        onPointerDown={(event: React.PointerEvent<SVGRectElement>) => {
          event.stopPropagation();
        }}
        onClick={(event: React.MouseEvent<SVGRectElement>) => {
          event.stopPropagation();
          if (consumeSuppressedNodeClick(node.id)) {
            event.preventDefault();
            return;
          }
          void onFireTrigger(node, event);
        }}
      />
      <path
        d='M0 0L0 7L6 3.5Z'
        transform='translate(8 4.5)'
        fill={palette.stroke}
        pointerEvents='none'
      />
      <text
        x={46}
        y={11}
        textAnchor='middle'
        fill={palette.text}
        fontSize='8'
        fontWeight='600'
        pointerEvents='none'
        style={{ userSelect: 'none' }}
      >
        {palette.label}
      </text>
    </g>
  );
}

function CanvasSvgNodePulseOverlays({
  inputPulse,
  outputPulse,
  visible,
}: {
  inputPulse: boolean;
  outputPulse: boolean;
  visible: boolean;
}): React.JSX.Element | null {
  if (!visible) {
    return null;
  }

  return (
    <>
      {inputPulse ? (
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
      ) : null}
      {outputPulse ? (
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
      ) : null}
    </>
  );
}

export const CanvasSvgNode = React.memo(function CanvasSvgNode({
  node,
}: CanvasSvgNodeProps): React.JSX.Element {
  const ui = useCanvasBoardUI();
  const {
    detailLevel,
    inputPulseNodes,
    outputPulseNodes,
    triggerConnected,
    triggerPreflightById,
    launchingTriggerIds = EMPTY_TRIGGER_IDS,
    enableNodeAnimations,
    connectorHitTargetPx,
    onPointerDownNode,
    onPointerMoveNode,
    onPointerUpNode,
    consumeSuppressedNodeClick,
    onSelectNode,
    onOpenNodeConfig,
    openNodeConfigOnSingleClick,
    onFireTrigger,
    onNodeDiagnosticsHover,
    onNodeDiagnosticsLeave,
    onFocusNodeDiagnostics,
    nodes,
    edges,
    view,
    selectedNodeId,
    selectedNodeIdSet,
    runtimeState,
    runtimeNodeStatuses,
    runtimeRunStatus,
    nodeDiagnosticsById,
  } = ui;

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
      return resolveNodePortValue({
        direction,
        nodeId,
        port,
        runtimeState,
      });
    },
    [runtimeState]
  );

  const getNodeRuntimeData = React.useCallback(
    (
      nodeId: string
    ): {
      inputs: Record<string, unknown> | undefined;
      outputs: Record<string, unknown> | undefined;
    } => {
      const history = runtimeState.history?.[nodeId];
      const lastEntry =
        Array.isArray(history) && history.length > 0 ? history[history.length - 1] : null;
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

  const showFineDetails = detailLevel === 'full' && view.scale >= 0.72;
  const showPortLabels = detailLevel === 'full' && view.scale >= 0.88;
  const showNodeId = detailLevel !== 'skeleton' && view.scale >= 0.64;
  const showRuntimeBadges = detailLevel !== 'skeleton' && view.scale >= 0.68;
  const showModelSelectionBadge = detailLevel !== 'skeleton' && view.scale >= 0.72;
  const connectorHitRadius = React.useMemo((): number => {
    const scaled = connectorHitTargetPx / Math.max(0.001, view.scale);
    return Math.max(PORT_SIZE / 2 + 1, scaled);
  }, [connectorHitTargetPx, view.scale]);

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
  const runtimeNodeStatus = normalizeRuntimeStatus(runtimeNodeStatusRaw);
  const runtimeStatusColors = statusPalette(runtimeNodeStatus);
  const nodeDiagnosticsSummary = nodeDiagnosticsById[node.id];
  const nodeDiagnosticsBadge = resolveNodeDiagnosticsBadgePalette(nodeDiagnosticsSummary);
  const nodeDiagnosticsBadgeX = node.type === 'trigger' ? NODE_WIDTH - 146 : NODE_WIDTH - 60;
  const isBlockerProcessing = resolveNodeBlockerProcessing({
    nodeType: node.type,
    status: runtimeNodeStatus,
  });
  const runtimeStatusLabel = resolveNodeRuntimeStatusLabel({
    nodeType: node.type,
    status: runtimeNodeStatus,
  });
  const inputPulse = inputPulseNodes.has(node.id);
  const outputPulse = outputPulseNodes.has(node.id);
  const isTriggerConnected = triggerConnected.has(node.id);
  const isTriggerLaunching = launchingTriggerIds.has(node.id);
  const triggerPreflight = triggerPreflightById?.get(node.id);
  const triggerBlockedMessage = triggerPreflight?.blockedMessage ?? null;
  const isTriggerBlocked = Boolean(triggerBlockedMessage);
  const typeBadge = node.type.toUpperCase();
  const typeBadgeWidth = Math.max(54, typeBadge.length * 6 + 12);
  const runtimeBadgeWidth = runtimeStatusLabel
    ? Math.max(64, runtimeStatusLabel.length * 6 + 16)
    : 0;
  const showNodePorts = detailLevel !== 'skeleton' || isSelected || isPrimarySelected;
  const nodeForPorts = node;
  const titleFontSize = detailLevel === 'skeleton' ? 11 : 12;
  const titleY = detailLevel === 'skeleton' ? 17 : 18;
  const titleText =
    (detailLevel === 'skeleton' && (node.title || '').length > 24
      ? `${(node.title || '').slice(0, 23)}...`
      : node.title) || '';
  const selectedModelId =
    node.type === 'model' && typeof node.config?.model?.modelId === 'string'
      ? node.config.model.modelId.trim()
      : '';
  const usesBrainDefaultModel = node.type === 'model' && selectedModelId.length === 0;
  const modelSelectionLabel = usesBrainDefaultModel ? 'BRAIN DEFAULT' : 'NODE MODEL';
  const modelSelectionBadgeWidth = Math.max(76, modelSelectionLabel.length * 6 + 14);
  const showNodeAnimations =
    enableNodeAnimations && (detailLevel !== 'skeleton' || isSelected || isPrimarySelected);
  const isNodeBeingDragged = ui.dragState?.nodeId === node.id;
  const nodeCursor = isNodeBeingDragged ? 'grabbing' : 'grab';
  const handleNodeDoubleClick = (event: React.MouseEvent<SVGRectElement>): void => {
    event.stopPropagation();
    event.preventDefault();
    void onSelectNode(node.id);
    onOpenNodeConfig();
  };

  return (
    <g
      key={node.id}
      data-node-root={node.id}
      transform={`translate(${node.position.x} ${node.position.y})`}
      style={{ cursor: nodeCursor }}
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
        data-node-body={node.id}
        x={0}
        y={0}
        width={NODE_WIDTH}
        height={NODE_MIN_HEIGHT}
        rx={12}
        ry={12}
        fill={palette.fill}
        stroke={isPrimarySelected ? '#bae6fd' : isSelected ? '#7dd3fc' : palette.stroke}
        strokeWidth={isPrimarySelected ? 2.4 : isSelected ? 1.9 : 1.25}
        pointerEvents='all'
        style={{ cursor: nodeCursor }}
        onPointerDown={(event: React.PointerEvent<SVGRectElement>) => {
          void onPointerDownNode(event, node.id);
        }}
        onPointerMove={(event: React.PointerEvent<SVGRectElement>) => {
          onPointerMoveNode(event, node.id);
        }}
        onPointerUp={(event: React.PointerEvent<SVGRectElement>) => {
          onPointerUpNode(event, node.id);
        }}
        onPointerCancel={(event: React.PointerEvent<SVGRectElement>) => {
          onPointerUpNode(event, node.id);
        }}
        onClick={(event: React.MouseEvent<SVGRectElement>) => {
          event.stopPropagation();
          if (consumeSuppressedNodeClick(node.id)) {
            event.preventDefault();
            return;
          }
          const isToggleSelection = event.shiftKey || event.metaKey || event.ctrlKey;
          void onSelectNode(node.id, {
            toggle: isToggleSelection,
          });
          if (openNodeConfigOnSingleClick && !isToggleSelection) {
            onOpenNodeConfig();
          }
        }}
        onDoubleClick={handleNodeDoubleClick}
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

      <CanvasSvgNodeModelSelectionBadge
        modelSelectionBadgeWidth={modelSelectionBadgeWidth}
        modelSelectionLabel={modelSelectionLabel}
        nodeId={node.id}
        usesBrainDefaultModel={usesBrainDefaultModel}
        visible={node.type === 'model' && showModelSelectionBadge}
      />

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
          transform={`translate(${NODE_WIDTH - runtimeBadgeWidth - 10} ${NODE_MIN_HEIGHT - 26})`}
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

      <CanvasSvgNodeDiagnosticsBadge
        badge={nodeDiagnosticsBadge}
        badgeX={nodeDiagnosticsBadgeX}
        nodeId={node.id}
        onFocusNodeDiagnostics={onFocusNodeDiagnostics}
        onNodeDiagnosticsHover={onNodeDiagnosticsHover}
        onNodeDiagnosticsLeave={onNodeDiagnosticsLeave}
        summary={nodeDiagnosticsSummary}
      />
      <CanvasSvgNodeTriggerAction
        consumeSuppressedNodeClick={consumeSuppressedNodeClick}
        isTriggerBlocked={isTriggerBlocked}
        isTriggerConnected={isTriggerConnected}
        isTriggerLaunching={isTriggerLaunching}
        node={node}
        onFireTrigger={onFireTrigger}
        triggerBlockedMessage={triggerBlockedMessage}
      />
      <CanvasSvgNodePulseOverlays
        inputPulse={inputPulse}
        outputPulse={outputPulse}
        visible={showNodeAnimations}
      />

      {showNodePorts && (
        <CanvasSvgNodePorts
          node={nodeForPorts}
          incomingEdgePortSet={incomingEdgePortSet}
          connectorHitRadius={connectorHitRadius}
          showPortLabels={showPortLabels}
          buildConnectorKey={buildConnectorKey}
          getConnectorInfo={getConnectorInfo}
        />
      )}
    </g>
  );
});
