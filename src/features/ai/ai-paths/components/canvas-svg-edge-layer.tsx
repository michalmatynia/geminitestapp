'use client';

import React from 'react';

import { useCanvasBoardUI } from './CanvasBoardUIContext';
import { SignalDots } from './SignalDots';
import { buildConnectingPreviewPath } from './CanvasBoard.utils';

const FLOWING_RUNTIME_NODE_STATUSES = new Set([
  'running',
  'polling',
  'waiting_callback',
  'advance_pending',
  'pending',
  'processing',
]);

const TERMINAL_RUNTIME_NODE_STATUSES = new Set([
  'completed',
  'failed',
  'canceled',
  'cached',
  'blocked',
  'skipped',
  'timeout',
]);

export const CanvasSvgEdgeLayer = React.memo(function CanvasSvgEdgeLayer({
  cullPadding = 160,
}: {
  cullPadding?: number;
}): React.JSX.Element {
  const {
    edgePaths,
    view,
    viewportSize,
    edgeMetaMap,
    edgeRoutingMode,
    connecting,
    connectingPos,
    nodeById,
    selectedEdgeId,
    selectedNodeIdSet,
    activeEdgeIds,
    runtimeNodeStatuses,
    triggerConnected,
    wireFlowEnabled,
    flowingIntensity,
    reduceVisualEffects,
    onRemoveEdge,
    onSelectEdge,
  } = useCanvasBoardUI();

  const worldViewport = React.useMemo(() => {
    if (!viewportSize) return null;
    return {
      minX: -view.x / view.scale - cullPadding,
      minY: -view.y / view.scale - cullPadding,
      maxX: (-view.x + viewportSize.width) / view.scale + cullPadding,
      maxY: (-view.y + viewportSize.height) / view.scale + cullPadding,
    };
  }, [cullPadding, view.scale, view.x, view.y, viewportSize]);

  const renderEdgePaths = React.useMemo(() => {
    return edgePaths.filter((edgePath) => {
      const fromNodeId = edgePath.fromNodeId;
      const toNodeId = edgePath.toNodeId;
      if (selectedEdgeId === edgePath.id) return true;
      if (selectedNodeIdSet.has(fromNodeId) || selectedNodeIdSet.has(toNodeId)) return true;
      if (activeEdgeIds.has(edgePath.id)) return true;
      if (worldViewport) {
        const bounds = edgePath.bounds;
        if (
          bounds.maxX >= worldViewport.minX &&
          bounds.minX <= worldViewport.maxX &&
          bounds.maxY >= worldViewport.minY &&
          bounds.minY <= worldViewport.maxY
        ) {
          return true;
        }
      }
      return false;
    });
  }, [activeEdgeIds, edgePaths, selectedEdgeId, selectedNodeIdSet, worldViewport]);

  const connectingPreviewPath = React.useMemo((): string | null => {
    if (!connecting || !connectingPos) return null;
    const fromX = connecting.start?.x;
    const fromY = connecting.start?.y;
    const toX = connectingPos.x;
    const toY = connectingPos.y;
    if (
      !Number.isFinite(fromX) ||
      !Number.isFinite(fromY) ||
      !Number.isFinite(toX) ||
      !Number.isFinite(toY)
    ) {
      return null;
    }
    return buildConnectingPreviewPath(fromX, fromY, toX, toY, edgeRoutingMode);
  }, [connecting, connectingPos, edgeRoutingMode]);

  return (
    <>
      {renderEdgePaths.map((edge) => {
        const edgeMeta = edgeMetaMap.get(edge.id);
        const fromNodeId = edgeMeta?.from ?? edge.fromNodeId;
        const toNodeId = edgeMeta?.to ?? edge.toNodeId;
        const isNodeSelectionEdge =
          selectedNodeIdSet.size > 0 &&
          selectedNodeIdSet.has(fromNodeId) &&
          selectedNodeIdSet.has(toNodeId);
        const isSelected = selectedEdgeId === edge.id || isNodeSelectionEdge;
        const isManualConnector =
          edgeMeta?.fromPort === 'aiPrompt' || edgeMeta?.toPort === 'queryCallback';
        const fromNode = nodeById.get(fromNodeId);
        const toNode = nodeById.get(toNodeId);
        const isSchemaConnection = fromNode?.type === 'db_schema' && toNode?.type === 'database';
        const fromRuntimeStatus =
          typeof runtimeNodeStatuses[fromNodeId] === 'string'
            ? runtimeNodeStatuses[fromNodeId].trim().toLowerCase()
            : '';
        const toRuntimeStatus =
          typeof runtimeNodeStatuses[toNodeId] === 'string'
            ? runtimeNodeStatuses[toNodeId].trim().toLowerCase()
            : '';
        const fromIsFlowing = FLOWING_RUNTIME_NODE_STATUSES.has(fromRuntimeStatus);
        const toIsFlowing = FLOWING_RUNTIME_NODE_STATUSES.has(toRuntimeStatus);
        const toIsTerminal = TERMINAL_RUNTIME_NODE_STATUSES.has(toRuntimeStatus);
        const isRuntimeActiveEdge =
          toIsFlowing || (fromIsFlowing && !toIsTerminal);
        const isFlowing = activeEdgeIds.has(edge.id) || isRuntimeActiveEdge;
        const isActivePath =
          !isManualConnector &&
          !isSchemaConnection &&
          triggerConnected.has(fromNodeId) &&
          triggerConnected.has(toNodeId);
        const edgeClass = reduceVisualEffects
          ? isSelected
            ? 'text-sky-300'
            : isActivePath || isFlowing
              ? 'text-sky-400/80'
              : 'text-sky-400/55'
          : `transition-all duration-150 ${
            isSelected
              ? 'text-sky-300'
              : isActivePath || isFlowing
                ? 'text-sky-400/80 group-hover:text-sky-300/90'
                : 'text-sky-400/55 group-hover:text-sky-300/80'
          }`;
        const arrowSize = isSelected ? 9 : 8;
        const arrowWidth = isSelected ? 6 : 5;
        const arrowPath = `M 0 0 L -${arrowSize} ${arrowWidth / 2} L -${arrowSize} -${arrowWidth / 2} Z`;
        return (
          <g key={edge.id} className='group cursor-pointer'>
            <path
              data-canvas-edge-hit='true'
              data-edge-id={edge.id}
              d={edge.path}
              stroke='transparent'
              strokeWidth='14'
              fill='none'
              vectorEffect='non-scaling-stroke'
              strokeLinecap='round'
              strokeLinejoin='round'
              style={{ pointerEvents: 'stroke' }}
              onContextMenu={(event) => {
                event.preventDefault();
                onRemoveEdge(edge.id);
              }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onSelectEdge(edge.id);
              }}
            />
            <path
              d={edge.path}
              className={edgeClass}
              strokeWidth={isSelected ? 2.7 : 1.6}
              stroke='currentColor'
              fill='none'
              vectorEffect='non-scaling-stroke'
              strokeLinecap='round'
              strokeLinejoin='round'
              style={{ pointerEvents: 'none' }}
            />
            {isFlowing && wireFlowEnabled ? (
              <>
                <path
                  d={edge.path}
                  className={`${edgeClass} ai-paths-wire-flow`}
                  strokeWidth={isSelected ? 3.4 : 2.2}
                  stroke='currentColor'
                  fill='none'
                  vectorEffect='non-scaling-stroke'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  style={{ pointerEvents: 'none' }}
                />
                {!reduceVisualEffects ? (
                  <SignalDots
                    key={`dots-${edge.id}-${edge.path}`}
                    path={edge.path}
                    intensity={flowingIntensity}
                  />
                ) : null}
              </>
            ) : null}
            {edge.arrow && (!reduceVisualEffects || isSelected) ? (
              <path
                d={arrowPath}
                transform={`translate(${edge.arrow.x} ${edge.arrow.y}) rotate(${edge.arrow.angle})`}
                className={edgeClass}
                fill='currentColor'
                stroke='none'
                style={{ pointerEvents: 'none' }}
              />
            ) : null}
          </g>
        );
      })}
      {connectingPreviewPath ? (
        <g className='pointer-events-none'>
          <path
            data-connecting-preview='true'
            d={connectingPreviewPath}
            stroke='rgba(125, 211, 252, 0.95)'
            strokeWidth='2'
            strokeDasharray='8 6'
            fill='none'
            vectorEffect='non-scaling-stroke'
            strokeLinecap='round'
            strokeLinejoin='round'
            style={{ filter: 'drop-shadow(0 0 4px rgba(56, 189, 248, 0.5))' }}
          />
        </g>
      ) : null}
    </>
  );
});
