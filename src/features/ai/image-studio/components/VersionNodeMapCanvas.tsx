'use client';

import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import {
  CONTENT_OFFSET_X,
  CONTENT_OFFSET_Y,
  NODE_HEIGHT,
  NODE_WIDTH,
} from '@/features/ai/image-studio/utils/version-graph';
import { cn } from '@/shared/utils';

import { useVersionNodeMapContext } from './VersionNodeMapContext';
import { useSettingsState } from '../context/SettingsContext';

import type { VersionNode } from '../context/VersionGraphContext';

import {
  LABEL_OFFSET_Y,
  SVG_STYLES,
} from './version-node-map-canvas/VersionNodeMapCanvas.constants';
import {
  buildEdgePath,
  getNodeStrokeClass,
  isActivationKey,
  resolveNodeOperationVisual,
} from './version-node-map-canvas/VersionNodeMapCanvas.utils';
import { SvgDefs } from './version-node-map-canvas/VersionNodeMapCanvas.components';
import { useVersionNodeMapCanvasViewport } from './version-node-map-canvas/VersionNodeMapCanvas.hooks';
import type {
  VersionNodeMapCanvasProps,
  VersionNodeMapCanvasRef,
} from './version-node-map-canvas/VersionNodeMapCanvas.types';

export type { VersionNodeMapCanvasRef } from './version-node-map-canvas/VersionNodeMapCanvas.types';

export const VersionNodeMapCanvas = React.forwardRef<
  VersionNodeMapCanvasRef,
  VersionNodeMapCanvasProps
>(function VersionNodeMapCanvas(_props, ref) {
  useSettingsState();
  const {
    nodes,
    edges,
    selectedNodeId,
    hoveredNodeId,
    mergeMode,
    mergeSelectedIds,
    compositeMode,
    compositeSelectedIds,
    filteredNodeIds,
    isolatedNodeIds,
    compareNodeIds,
    onSelectNode,
    onHoverNode,
    onToggleMergeSelection,
    onToggleCompositeSelection,
    getSlotImageSrc,
    zoom,
    onZoomChange,
  } = useVersionNodeMapContext();

  const svgRef = useRef<SVGSVGElement>(null);
  
  const viewport = useVersionNodeMapCanvasViewport({
    nodes,
    zoom,
    onZoomChange,
    svgRef,
  });

  const {
    pan,
    setPan,
    panRef,
    zoomRef,
    smoothTransition,
    setSmoothTransition,
    fitToView,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  } = viewport;

  useImperativeHandle(
    ref,
    () => ({
      get svgElement() { return svgRef.current; },
      fitToView,
      getPanZoom() { return { pan: panRef.current, zoom: zoomRef.current }; },
      setPan(newPan: { x: number; y: number }) {
        setSmoothTransition(true);
        panRef.current = newPan;
        setPan(newPan);
        setTimeout(() => setSmoothTransition(false), 200);
      },
    }),
    [fitToView, panRef, setPan, setSmoothTransition, zoomRef]
  );

  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const prevEdgeIdsRef = useRef<Set<string>>(new Set());
  const newNodeIdsRef = useRef<Set<string>>(new Set());
  const newEdgeIdsRef = useRef<Set<string>>(new Set());
  const animationsPrimedRef = useRef(false);

  const currentNodeIds = new Set(nodes.map((n) => n.id));
  const currentEdgeIds = new Set(edges.map((e) => e.id));

  if (!animationsPrimedRef.current) {
    newNodeIdsRef.current = new Set();
    newEdgeIdsRef.current = new Set();
  } else {
    newNodeIdsRef.current = new Set([...currentNodeIds].filter((id) => !prevNodeIdsRef.current.has(id)));
    newEdgeIdsRef.current = new Set([...currentEdgeIds].filter((id) => !prevEdgeIdsRef.current.has(id)));
  }

  useEffect(() => {
    if (!animationsPrimedRef.current) {
      prevNodeIdsRef.current = currentNodeIds;
      prevEdgeIdsRef.current = currentEdgeIds;
      animationsPrimedRef.current = true;
      return;
    }
    const timeout = setTimeout(() => {
      prevNodeIdsRef.current = currentNodeIds;
      prevEdgeIdsRef.current = currentEdgeIds;
    }, 600);
    return () => clearTimeout(timeout);
  });

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const mergeSelectedSet = new Set(mergeSelectedIds);
  const compositeSelectedSet = new Set(compositeSelectedIds);

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!(e.target as SVGElement).closest('[data-node-id]')) {
        onSelectNode(null);
      }
    },
    [onSelectNode]
  );

  const activateNode = useCallback(
    (nodeId: string) => {
      if (compositeMode) {
        onToggleCompositeSelection(nodeId);
      } else if (mergeMode) {
        onToggleMergeSelection(nodeId);
      } else {
        onSelectNode(nodeId);
      }
    },
    [compositeMode, mergeMode, onToggleCompositeSelection, onToggleMergeSelection, onSelectNode]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent<SVGGElement>, nodeId: string): void => {
      event.stopPropagation();
      activateNode(nodeId);
    },
    [activateNode]
  );

  const handleNodeKeyDown = useCallback(
    (event: React.KeyboardEvent<SVGGElement>, nodeId: string): void => {
      if (!isActivationKey(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      activateNode(nodeId);
    },
    [activateNode]
  );

  const svgRect = svgRef.current?.getBoundingClientRect();
  const cullMargin = 200;
  const viewBounds = svgRect
    ? {
      minX: -pan.x / zoom - cullMargin - CONTENT_OFFSET_X,
      minY: -pan.y / zoom - cullMargin - CONTENT_OFFSET_Y,
      maxX: (-pan.x + svgRect.width) / zoom + cullMargin - CONTENT_OFFSET_X,
      maxY: (-pan.y + svgRect.height) / zoom + cullMargin - CONTENT_OFFSET_Y,
    }
    : null;

  const isNodeVisible = (node: VersionNode): boolean => {
    if (!viewBounds || nodes.length < 50) return true;
    return (
      node.x + NODE_WIDTH / 2 >= viewBounds.minX &&
      node.x - NODE_WIDTH / 2 <= viewBounds.maxX &&
      node.y + NODE_HEIGHT / 2 >= viewBounds.minY &&
      node.y - NODE_HEIGHT / 2 <= viewBounds.maxY
    );
  };

  if (nodes.length === 0) {
    return (
      <div className='flex h-full items-center justify-center text-xs text-gray-500'>
        No cards in this project yet.
      </div>
    );
  }

  return (
    <svg
      ref={svgRef}
      role='group'
      aria-label={`Interactive version graph with ${nodes.length} nodes and ${edges.length} edges`}
      className='h-full w-full cursor-grab overscroll-none active:cursor-grabbing'
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleBackgroundClick}
    >
      <style>{SVG_STYLES}</style>
      <SvgDefs />
      <g
        transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
        style={smoothTransition ? { transition: 'transform 0.15s ease-out' } : undefined}
      >
        <g transform={`translate(${nodes.length > 0 ? CONTENT_OFFSET_X : 0}, ${CONTENT_OFFSET_Y})`}>
          {edges.map((edge) => {
            const sourceNode = nodeById.get(edge.source);
            const targetNode = nodeById.get(edge.target);
            if (!sourceNode || !targetNode) return null;
            if (!isNodeVisible(sourceNode) && !isNodeVisible(targetNode)) return null;

            const isMergeEdge = edge.type === 'merge';
            const isCompositeEdge = edge.type === 'composite';
            const isNewEdge = newEdgeIdsRef.current.has(edge.id);
            const isEdgeHovered = hoveredEdgeId === edge.id;
            const edgeStroke = isCompositeEdge ? '#14b8a6' : isMergeEdge ? '#a855f7' : '#6b7280';
            const edgeMarker = isCompositeEdge ? 'url(#vgraph-arrow-composite)' : isMergeEdge ? 'url(#vgraph-arrow-merge)' : 'url(#vgraph-arrow)';

            return (
              <React.Fragment key={edge.id}>
                <path d={buildEdgePath(sourceNode, targetNode)} fill='none' stroke='transparent' strokeWidth={10} style={{ cursor: 'pointer' }} onMouseEnter={() => setHoveredEdgeId(edge.id)} onMouseLeave={() => setHoveredEdgeId(null)} />
                <path d={buildEdgePath(sourceNode, targetNode)} fill='none' strokeWidth={isEdgeHovered ? 2.5 : 1.5} markerEnd={edgeMarker} stroke={edgeStroke} strokeOpacity={isEdgeHovered ? 0.9 : isCompositeEdge || isMergeEdge ? 0.6 : 0.5} strokeDasharray={isCompositeEdge ? '6 3' : isMergeEdge ? '4 3' : undefined} style={{ pointerEvents: 'none', transition: 'stroke-width 0.15s ease, stroke-opacity 0.15s ease', ...(isNewEdge ? { strokeDasharray: 1000, strokeDashoffset: 1000, animation: 'vgraph-edge-draw 0.6s ease forwards 0.2s' } : {}) }} />
              </React.Fragment>
            );
          })}

          {nodes.map((node) => {
            if (!isNodeVisible(node)) return null;
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isIsolated = Boolean(isolatedNodeIds?.size) && !isolatedNodeIds?.has(node.id);
            const isFiltered = Boolean(filteredNodeIds?.size) && !filteredNodeIds?.has(node.id);
            const isDimmed = isIsolated || isFiltered;
            const isNewNode = newNodeIdsRef.current.has(node.id);
            
            const isMergeSelected = mergeSelectedSet.has(node.id);
            const isCompositeSelected = compositeSelectedSet.has(node.id);
            const isCompareSelected = compareNodeIds
              ? compareNodeIds[0] === node.id || compareNodeIds[1] === node.id
              : false;
            resolveNodeOperationVisual(node);

            return (
              <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className={cn('vgraph-node-trigger transition-opacity duration-300', isDimmed ? 'opacity-20' : 'opacity-100', isNewNode ? 'animate-[vgraph-fade-in_0.5s_ease_forwards]' : null)} onMouseEnter={() => onHoverNode(node.id)} onMouseLeave={() => onHoverNode(null)} onClick={(e) => handleNodeClick(e, node.id)} onKeyDown={(e) => handleNodeKeyDown(e, node.id)} tabIndex={0} data-node-id={node.id} role='button' aria-pressed={isSelected}>
                <rect x={-NODE_WIDTH / 2} y={-NODE_HEIGHT / 2} width={NODE_WIDTH} height={NODE_HEIGHT} rx={12} className={cn('transition-all duration-200', getNodeStrokeClass(node, isSelected, isMergeSelected, isCompareSelected, isCompositeSelected), isHovered && !isSelected && 'stroke-blue-300')} data-focus-ring='true' />
                <foreignObject x={-NODE_WIDTH / 2 + 4} y={-NODE_HEIGHT / 2 + 4} width={NODE_WIDTH - 8} height={NODE_HEIGHT - 8} className='pointer-events-none'>
                  <div className='flex h-full w-full items-center justify-center overflow-hidden rounded-lg bg-gray-100'>
                    <img src={getSlotImageSrc(node.slot) ?? undefined} alt='' className='h-full w-full object-cover' />
                  </div>
                </foreignObject>
                <text x={0} y={NODE_HEIGHT / 2 + LABEL_OFFSET_Y} textAnchor='middle' fontSize={9} fontWeight={isSelected ? 700 : 500} fill={isSelected ? '#3b82f6' : '#4b5563'}>{node.label || 'Untitled'}</text>
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
});

export default VersionNodeMapCanvas;
