'use client';

import { Focus } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { UnifiedButton } from '@/shared/ui';

import { VersionGraphContextMenu } from './VersionGraphContextMenu';
import { VersionGraphControlsProvider } from './VersionGraphControlsContext';
import { VersionGraphFilterBar } from './VersionGraphFilterBar';
import { VersionGraphInspector } from './VersionGraphInspector';
import { VersionGraphInspectorProvider } from './VersionGraphInspectorContext';
import { VersionGraphToolbar } from './VersionGraphToolbar';
import { VersionNodeMapCanvas, type VersionNodeMapCanvasRef } from './VersionNodeMapCanvas';
import { VersionNodeMapProvider } from './VersionNodeMapContext';
import { VersionNodeMapMinimap } from './VersionNodeMapMinimap';
import { useSlotsActions } from '../context/SlotsContext';
import { useVersionGraphActions, useVersionGraphState } from '../context/VersionGraphContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import { readMeta } from '../utils/metadata';
import { useVersionGraphShortcuts } from '../hooks/useVersionGraphShortcuts';
import { CONTENT_OFFSET_X, CONTENT_OFFSET_Y, exportSvgAsPng } from '../utils/version-graph';

import type { ImageStudioSlotRecord } from '../types';

// ── Component ────────────────────────────────────────────────────────────────

export interface VersionNodeMapPanelProps {
  onSwitchToControls?: (() => void) | undefined;
}

export function VersionNodeMapPanel({ onSwitchToControls }: VersionNodeMapPanelProps): React.JSX.Element {
  const {
    nodes,
    edges,
    allNodes,
    selectedNodeId,
    hoveredNodeId,
    mergeMode,
    mergeSelectedIds,
    collapsedNodeIds,
    filterQuery,
    filterTypes,
    filterHasMask,
    filteredNodeIds,
    filterLeafOnly,
    layoutMode,
    graphStats,
    compositeMode,
    compositeSelectedIds,
    compositeLoading,
    isolatedNodeId,
    isolatedNodeIds,
    compareMode,
    compareNodeIds,
  } = useVersionGraphState();
  const {
    selectNode,
    hoverNode,
    activateNode,
    toggleMergeMode,
    toggleMergeSelection,
    clearMergeSelection,
    executeMerge,
    toggleCollapse,
    expandAll,
    collapseAll,
    toggleCompositeMode,
    toggleCompositeSelection,
    clearCompositeSelection,
    executeComposite,
    reorderCompositeLayer,
    flattenComposite,
    refreshCompositePreview,
    setFilterQuery,
    toggleFilterType,
    setFilterHasMask,
    toggleFilterLeafOnly,
    clearFilters,
    setLayoutMode,
    isolateBranch,
    setAnnotation,
    toggleCompareMode,
    setCompareNodeIds,
  } = useVersionGraphActions();
  const { setWorkingSlotId } = useSlotsActions();

  const canvasRef = useRef<VersionNodeMapCanvasRef>(null);
  const [zoom, setZoom] = useState(1);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [compositeBusy, setCompositeBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [annotationDraft, setAnnotationDraft] = useState('');
  const annotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;

  const getSlotImageSrc = useCallback(
    (slot: ImageStudioSlotRecord) => getImageStudioSlotImageSrc(slot),
    [],
  );

  const handleSetAsSource = useCallback(() => {
    if (!selectedNodeId) return;
    setWorkingSlotId(selectedNodeId);
    onSwitchToControls?.();
  }, [selectedNodeId, setWorkingSlotId, onSwitchToControls]);

  const handleActivateNode = useCallback(
    (id: string) => {
      activateNode(id);
      onSwitchToControls?.();
    },
    [activateNode, onSwitchToControls],
  );

  const handleExecuteMerge = useCallback(async () => {
    if (mergeBusy) return;
    setMergeBusy(true);
    try {
      await executeMerge();
    } finally {
      setMergeBusy(false);
    }
  }, [executeMerge, mergeBusy]);

  const handleExecuteComposite = useCallback(async () => {
    if (compositeBusy) return;
    setCompositeBusy(true);
    try {
      await executeComposite();
    } finally {
      setCompositeBusy(false);
    }
  }, [executeComposite, compositeBusy]);

  const handleFlattenComposite = useCallback(async (slotId: string) => {
    if (compositeBusy) return;
    setCompositeBusy(true);
    try {
      await flattenComposite(slotId);
    } finally {
      setCompositeBusy(false);
    }
  }, [flattenComposite, compositeBusy]);

  const handleExportPng = useCallback(async () => {
    const svg = canvasRef.current?.svgElement;
    if (!svg || exporting) return;
    setExporting(true);
    try {
      await exportSvgAsPng(svg);
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  // Sync annotation draft when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const meta = readMeta(selectedNode.slot);
      setAnnotationDraft(meta.annotation ?? '');
    }
  }, [selectedNode]);

  const handleAnnotationBlur = useCallback(() => {
    if (!selectedNodeId) return;
    if (annotationTimerRef.current) clearTimeout(annotationTimerRef.current);
    annotationTimerRef.current = setTimeout(() => {
      void setAnnotation(selectedNodeId, annotationDraft);
    }, 300);
  }, [selectedNodeId, annotationDraft, setAnnotation]);

  const handleContextMenu = useCallback((nodeId: string, clientX: number, clientY: number) => {
    setContextMenu({ nodeId, x: clientX, y: clientY });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleCtxSetAsSource = useCallback((nodeId: string) => {
    setWorkingSlotId(nodeId);
    onSwitchToControls?.();
  }, [setWorkingSlotId, onSwitchToControls]);

  const handleCtxAddToComposite = useCallback((nodeId: string) => {
    if (!compositeMode) toggleCompositeMode();
    toggleCompositeSelection(nodeId);
  }, [compositeMode, toggleCompositeMode, toggleCompositeSelection]);

  const handleCtxCompareWith = useCallback((nodeId: string) => {
    if (!compareMode) toggleCompareMode();
    setCompareNodeIds([nodeId, '']);
  }, [compareMode, toggleCompareMode, setCompareNodeIds]);

  const handleCtxCopyId = useCallback((nodeId: string) => {
    void navigator.clipboard.writeText(nodeId);
  }, []);

  // Close context menu on Escape key
  useEffect(() => {
    if (!contextMenu) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setContextMenu(null);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [contextMenu]);

  // Cleanup annotation timer on unmount
  useEffect(() => {
    return () => {
      if (annotationTimerRef.current) clearTimeout(annotationTimerRef.current);
    };
  }, []);

  const handleCompareNodeClick = useCallback((nodeId: string) => {
    if (!compareMode) return;
    if (!compareNodeIds) {
      setCompareNodeIds([nodeId, '']);
    } else if (!compareNodeIds[1] || compareNodeIds[0] === nodeId) {
      if (compareNodeIds[0] !== nodeId) {
        setCompareNodeIds([compareNodeIds[0], nodeId]);
      }
    } else {
      setCompareNodeIds([nodeId, '']);
    }
  }, [compareMode, compareNodeIds, setCompareNodeIds]);

  const handleCanvasSelectNode = useCallback((id: string | null) => {
    if (compareMode && id) {
      handleCompareNodeClick(id);
    } else {
      selectNode(id);
    }
    closeContextMenu();
  }, [compareMode, handleCompareNodeClick, selectNode, closeContextMenu]);

  const getSlotAnnotation = useCallback(
    (slot: ImageStudioSlotRecord) => readMeta(slot).annotation,
    [],
  );

  const contextMenuNode = contextMenu
    ? nodes.find((n) => n.id === contextMenu.nodeId) ?? null
    : null;

  const compareNodes = compareNodeIds
    ? [nodes.find((n) => n.id === compareNodeIds[0]) ?? null, nodes.find((n) => n.id === compareNodeIds[1]) ?? null] as const
    : null;

  const handleMinimapPan = useCallback((x: number, y: number) => {
    canvasRef.current?.setPan({ x, y });
  }, []);

  const handleFocusNode = useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const containerW = canvasContainerRef.current?.clientWidth ?? 300;
    const containerH = canvasContainerRef.current?.clientHeight ?? 200;
    // Center canvas on the node (account for content offset)
    const worldX = node.x + CONTENT_OFFSET_X;
    const worldY = node.y + CONTENT_OFFSET_Y;
    canvasRef.current?.setPan({
      x: containerW / 2 - worldX * zoom,
      y: containerH / 2 - worldY * zoom,
    });
  }, [nodes, zoom]);

  const hasActiveFilters = filterQuery || filterTypes.size > 0 || filterHasMask !== null || filterLeafOnly;

  const canvasContextValue = {
    nodes,
    edges,
    selectedNodeId,
    hoveredNodeId,
    mergeMode,
    mergeSelectedIds,
    collapsedNodeIds,
    filteredNodeIds,
    isolatedNodeIds,
    compositeMode,
    compositeSelectedIds,
    compareMode,
    compareNodeIds,
    onSelectNode: handleCanvasSelectNode,
    onHoverNode: hoverNode,
    onActivateNode: handleActivateNode,
    onToggleMergeSelection: toggleMergeSelection,
    onToggleCompositeSelection: toggleCompositeSelection,
    onToggleCollapse: toggleCollapse,
    onReorderCompositeLayer: (slotId: string, from: number, to: number): void => {
      void reorderCompositeLayer(slotId, from, to);
    },
    onContextMenu: handleContextMenu,
    getSlotImageSrc,
    getSlotAnnotation,
    zoom,
    onZoomChange: setZoom,
    pan: canvasRef.current?.getPanZoom().pan ?? { x: 0, y: 0 },
    viewportWidth: canvasContainerRef.current?.clientWidth ?? 0,
    viewportHeight: canvasContainerRef.current?.clientHeight ?? 0,
    onPanTo: handleMinimapPan,
  };
  const inspectorContextValue = {
    selectedNode,
    compositeLoading,
    compositeBusy,
    getSlotImageSrc,
    onSetAsSource: handleSetAsSource,
    onFlattenComposite: (slotId: string): void => {
      void handleFlattenComposite(slotId);
    },
    onRefreshCompositePreview: (slotId: string): void => {
      void refreshCompositePreview(slotId);
    },
    onSelectNode: selectNode,
    onFocusNode: handleFocusNode,
    onIsolateBranch: isolateBranch,
    annotationDraft,
    onAnnotationChange: setAnnotationDraft,
    onAnnotationBlur: handleAnnotationBlur,
  };
  const controlsContextValue = {
    nodeCount: nodes.length,
    allNodeCount: allNodes.length,
    mergeMode,
    mergeSelectedIds,
    mergeBusy,
    onToggleMergeMode: toggleMergeMode,
    onClearMergeSelection: clearMergeSelection,
    onExecuteMerge: () => {
      void handleExecuteMerge();
    },
    compositeMode,
    compositeSelectedIds,
    compositeBusy,
    onToggleCompositeMode: toggleCompositeMode,
    onClearCompositeSelection: clearCompositeSelection,
    onExecuteComposite: () => {
      void handleExecuteComposite();
    },
    onCollapseAll: collapseAll,
    onExpandAll: expandAll,
    layoutMode,
    onSetLayoutMode: setLayoutMode,
    zoom,
    onSetZoom: setZoom,
    onFitToView: () => canvasRef.current?.fitToView(),
    showStats,
    onToggleStats: () => setShowStats((v) => !v),
    compareMode,
    onToggleCompareMode: toggleCompareMode,
    showMinimap,
    onToggleMinimap: () => setShowMinimap((v) => !v),
    showMinimapButton: nodes.length > 8,
    exporting,
    onExportPng: () => {
      void handleExportPng();
    },
    filterQuery,
    filterTypes,
    filterHasMask,
    filterLeafOnly,
    hasActiveFilters: !!hasActiveFilters,
    onSetFilterQuery: setFilterQuery,
    onToggleFilterType: toggleFilterType,
    onSetFilterHasMask: setFilterHasMask,
    onToggleLeafOnly: toggleFilterLeafOnly,
    onClearFilters: clearFilters,
  };

  // ── Keyboard shortcuts ──
  const handleKeyDown = useVersionGraphShortcuts({
    mergeMode,
    compositeMode,
    compareMode,
    isolatedNodeId,
    selectedNodeId,
    nodes,
    toggleMergeMode,
    toggleCompositeMode,
    toggleCompareMode,
    isolateBranch,
    selectNode,
    setAnnotation,
    setAnnotationDraft,
    fitToView: () => canvasRef.current?.fitToView(),
    focusNode: handleFocusNode,
  });

  return (
    <VersionGraphControlsProvider value={controlsContextValue}>
      <div className='flex h-full min-h-0 flex-col' tabIndex={-1} onKeyDown={handleKeyDown}>
        {/* Toolbar */}
        <VersionGraphToolbar />

        {/* Stats row */}
        {showStats ? (
          <div className='border-b border-border/40 px-3 py-1 text-[9px] text-gray-500'>
            {graphStats.totalNodes} nodes · {graphStats.baseCount} base · {graphStats.generationCount} gen · {graphStats.mergeCount} merge{graphStats.compositeCount > 0 ? ` · ${graphStats.compositeCount} comp` : ''} · depth {graphStats.maxDepth} · {graphStats.maskedCount} masked
          </div>
        ) : null}

        {/* Filter bar */}
        <VersionGraphFilterBar />

        {/* Mode banners */}
        {mergeMode ? (
          <div className='border-b border-orange-400/20 bg-orange-500/5 px-3 py-1 text-[10px] text-orange-400'>
          Click nodes to select for merge. Select 2+ nodes, then click Merge.
          </div>
        ) : null}
        {compositeMode ? (
          <div className='border-b border-teal-400/20 bg-teal-500/5 px-3 py-1 text-[10px] text-teal-400'>
          Click nodes to select for compositing. Select 2+ nodes, then click Composite.
          </div>
        ) : null}
        {compareMode ? (
          <div className='border-b border-cyan-400/20 bg-cyan-500/5 px-3 py-1 text-[10px] text-cyan-400'>
            {compareNodeIds?.[0] && !compareNodeIds[1]
              ? 'Now click a second node to compare.'
              : 'Click two nodes to compare side by side.'}
          </div>
        ) : null}
        {isolatedNodeId ? (
          <div className='flex items-center justify-between border-b border-blue-400/20 bg-blue-500/5 px-3 py-1'>
            <span className='text-[10px] text-blue-400'>
              <Focus className='mr-1 inline size-2.5' />
            Branch isolated
            </span>
            <button
              type='button'
              className='text-[10px] text-blue-400 hover:text-blue-300'
              onClick={() => isolateBranch(null)}
            >
            Clear
            </button>
          </div>
        ) : null}

        {/* Canvas */}
        <div ref={canvasContainerRef} className='relative min-h-0 flex-1'>
          <VersionNodeMapProvider value={canvasContextValue}>
            <VersionNodeMapCanvas ref={canvasRef} />

            {/* Minimap overlay */}
            {showMinimap && nodes.length > 8 ? (
              <div className='absolute bottom-2 right-2 z-10'>
                <VersionNodeMapMinimap />
              </div>
            ) : null}
          </VersionNodeMapProvider>
        </div>

        {/* Context menu overlay */}
        {contextMenu && contextMenuNode ? (
          <VersionGraphContextMenu
            menu={contextMenu}
            node={contextMenuNode}
            collapsedNodeIds={collapsedNodeIds}
            compositeMode={compositeMode}
            compareMode={compareMode}
            onClose={closeContextMenu}
            onSetAsSource={handleCtxSetAsSource}
            onIsolateBranch={isolateBranch}
            onToggleCollapse={toggleCollapse}
            onAddToComposite={handleCtxAddToComposite}
            onCompareWith={handleCtxCompareWith}
            onCopyId={handleCtxCopyId}
          />
        ) : null}

        {/* Compare view */}
        {compareMode && compareNodes?.[0] && compareNodes[1] ? (
          <div className='border-t border-border/40 p-3'>
            <div className='flex gap-2'>
              {compareNodes.map((cNode) => cNode ? (
                <div key={cNode.id} className='flex-1 space-y-1'>
                  <div className='truncate text-[10px] font-medium text-gray-300'>{cNode.label}</div>
                  <div className='aspect-square overflow-hidden rounded border border-border/60 bg-card/30'>
                    {getSlotImageSrc(cNode.slot) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getSlotImageSrc(cNode.slot)!}
                        alt={cNode.label}
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>No image</div>
                    )}
                  </div>
                  <div className='text-[9px] text-gray-500'>
                    {cNode.type === 'composite' ? 'Composite' : cNode.type === 'merge' ? 'Merge' : cNode.type === 'generation' ? 'Generation' : 'Base'}
                    {cNode.hasMask ? ' · Mask' : ''}
                  </div>
                  {(() => {
                    const meta = readMeta(cNode.slot);
                    return meta.generationParams?.prompt ? (
                      <div className='truncate text-[9px] text-gray-500' title={meta.generationParams.prompt}>
                        {meta.generationParams.prompt.slice(0, 40)}{meta.generationParams.prompt.length > 40 ? '...' : ''}
                      </div>
                    ) : null;
                  })()}
                </div>
              ) : null)}
            </div>
            <div className='mt-2 flex gap-2'>
              <UnifiedButton
                variant='outline'
                size='sm'
                className='flex-1 text-[10px]'
                onClick={() => {
                  if (compareNodeIds) setCompareNodeIds([compareNodeIds[1], compareNodeIds[0]]);
                }}
              >
              Swap
              </UnifiedButton>
              <UnifiedButton
                variant='outline'
                size='sm'
                className='flex-1 text-[10px]'
                onClick={toggleCompareMode}
              >
              Exit Compare
              </UnifiedButton>
            </div>
          </div>
        ) : null}

        {/* Inspector — always visible */}
        {!compareMode ? (
          <VersionGraphInspectorProvider value={inspectorContextValue}>
            <VersionGraphInspector />
          </VersionGraphInspectorProvider>
        ) : null}
      </div>
    </VersionGraphControlsProvider>
  );
}
