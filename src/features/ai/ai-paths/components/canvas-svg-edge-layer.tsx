'use client';

import React from 'react';

import type { AiNode, Edge, PathFlowIntensity } from '@/features/ai/ai-paths/lib';

import { SignalDots } from './SignalDots';

import type { EdgePath } from '../context/hooks/useEdgePaths';

type CanvasSvgEdgeLayerProps = {
  edgePaths: EdgePath[];
  edgeMetaMap: Map<string, Edge>;
  nodeById: Map<string, AiNode>;
  viewScale: number;
  selectedEdgeId: string | null;
  selectedNodeIdSet: Set<string>;
  activeEdgeIds: Set<string>;
  triggerConnected: Set<string>;
  wireFlowEnabled: boolean;
  flowingIntensity: Exclude<PathFlowIntensity, 'off'>;
  reduceVisualEffects?: boolean;
  onRemoveEdge: (edgeId: string) => void;
  onSelectEdge: (edgeId: string) => void;
};

export const CanvasSvgEdgeLayer = React.memo(function CanvasSvgEdgeLayer({
  edgePaths,
  edgeMetaMap,
  nodeById,
  viewScale,
  selectedEdgeId,
  selectedNodeIdSet,
  activeEdgeIds,
  triggerConnected,
  wireFlowEnabled,
  flowingIntensity,
  reduceVisualEffects = false,
  onRemoveEdge,
  onSelectEdge,
}: CanvasSvgEdgeLayerProps): React.JSX.Element {
  return (
    <>
      {edgePaths.map((edge: EdgePath): React.JSX.Element => {
        const edgeMeta = edgeMetaMap.get(edge.id);
        const fromNodeId = edgeMeta?.from ?? edge.fromNodeId;
        const toNodeId = edgeMeta?.to ?? edge.toNodeId;
        const isNodeSelectionEdge =
          selectedNodeIdSet.size > 0 &&
          selectedNodeIdSet.has(fromNodeId) &&
          selectedNodeIdSet.has(toNodeId);
        const isSelected = selectedEdgeId === edge.id || isNodeSelectionEdge;
        const isFlowing = activeEdgeIds.has(edge.id);
        const isManualConnector =
          edgeMeta?.fromPort === 'aiPrompt' || edgeMeta?.toPort === 'queryCallback';
        const fromNode = nodeById.get(fromNodeId);
        const toNode = nodeById.get(toNodeId);
        const isSchemaConnection =
          fromNode?.type === 'db_schema' && toNode?.type === 'database';
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
                    viewScale={viewScale}
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
    </>
  );
});
