'use client';

import { Focus } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useRightSidebarContext } from './RightSidebarContext';
import { VersionGraphCompareProvider } from './VersionGraphCompareContext';
import { VersionGraphComparePanel } from './VersionGraphComparePanel';
import { VersionGraphContextMenu } from './VersionGraphContextMenu';
import { VersionGraphContextMenuProvider } from './VersionGraphContextMenuContext';
import { VersionGraphControlsProvider } from './VersionGraphControlsContext';
import { VersionGraphFilterBar } from './VersionGraphFilterBar';
import { VersionGraphInspector } from './VersionGraphInspector';
import { VersionGraphInspectorProvider } from './VersionGraphInspectorContext';
import { VersionGraphToolbar } from './VersionGraphToolbar';
import { VersionNodeDetailsModal } from './VersionNodeDetailsModal';
import { VersionNodeMapCanvas, type VersionNodeMapCanvasRef } from './VersionNodeMapCanvas';
import { VersionNodeMapProvider } from './VersionNodeMapContext';
import { VersionNodeMapMinimap } from './VersionNodeMapMinimap';
import { useSlotsActions } from '../context/SlotsContext';
import { useVersionGraphActions, useVersionGraphState } from '../context/VersionGraphContext';
import { useVersionGraphShortcuts } from '../hooks/useVersionGraphShortcuts';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import { readMeta } from '../utils/metadata';
import { CONTENT_OFFSET_X, CONTENT_OFFSET_Y, exportSvgAsPng } from '../utils/version-graph';

import type { ImageStudioSlotRecord } from '../types';

// ── Component ────────────────────────────────────────────────────────────────

export function VersionNodeMapPanel(): React.JSX.Element {
  const { switchToControls } = useRightSidebarContext();
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
  const [detailsNodeId, setDetailsNodeId] = useState<string | null>(null);
  const [annotationDraft, setAnnotationDraft] = useState('');
  const annotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedNode = selectedNodeId
    ? nodes.find((n) => n.id === selectedNodeId) ?? null
    : null;
  const detailsNode = detailsNodeId
    ? allNodes.find((node) => node.id === detailsNodeId) ?? null
    : null;

  const getSlotImageSrc = useCallback(
    (slot: ImageStudioSlotRecord) => getImageStudioSlotImageSrc(slot),
    [],
  );

  const handleSetAsSource = useCallback(() => {
    if (!selectedNodeId) return;
    setWorkingSlotId(selectedNodeId);
    switchToControls();
  }, [selectedNodeId, setWorkingSlotId, switchToControls]);

  const handleActivateNode = useCallback(
    (id: string) => {
      activateNode(id);
      switchToControls();
    },
    [activateNode, switchToControls],
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
    switchToControls();
  }, [setWorkingSlotId, switchToControls]);

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
    } else if (id) {
      selectNode(id);
      setWorkingSlotId(id);
    } else {
      selectNode(id);
    }
    closeContextMenu();
  }, [compareMode, handleCompareNodeClick, selectNode, setWorkingSlotId, closeContextMenu]);

  const handleOpenNodeDetails = useCallback((id: string) => {
    setDetailsNodeId(id);
    closeContextMenu();
  }, [closeContextMenu]);

  const handleCloseNodeDetails = useCallback(() => {
    setDetailsNodeId(null);
  }, []);

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
    onOpenNodeDetails: handleOpenNodeDetails,
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
    onOpenDetails: handleOpenNodeDetails,
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
          <VersionGraphContextMenuProvider
            value={{
              menu: contextMenu,
              node: contextMenuNode,
              collapsedNodeIds,
              onClose: closeContextMenu,
              onSetAsSource: handleCtxSetAsSource,
              onIsolateBranch: isolateBranch,
              onToggleCollapse: toggleCollapse,
              onAddToComposite: handleCtxAddToComposite,
              onCompareWith: handleCtxCompareWith,
              onCopyId: handleCtxCopyId,
            }}
          >
            <VersionGraphContextMenu />
          </VersionGraphContextMenuProvider>
        ) : null}

        {/* Compare view */}
        {compareMode && compareNodes?.[0] && compareNodes[1] ? (
          <VersionGraphCompareProvider
            value={{
              compareNodes: [compareNodes[0], compareNodes[1]],
              getSlotImageSrc,
              onSwap: () => {
                if (compareNodeIds) setCompareNodeIds([compareNodeIds[1], compareNodeIds[0]]);
              },
              onOpenDetails: handleOpenNodeDetails,
              onExit: toggleCompareMode,
            }}
          >
            <VersionGraphComparePanel />
          </VersionGraphCompareProvider>
        ) : null}

        {/* Inspector — always visible */}
        {!compareMode ? (
          <VersionGraphInspectorProvider value={inspectorContextValue}>
            <VersionGraphInspector />
          </VersionGraphInspectorProvider>
        ) : null}

        <VersionNodeDetailsModal
          open={Boolean(detailsNode)}
          node={detailsNode}
          onClose={handleCloseNodeDetails}
          getSlotImageSrc={getSlotImageSrc}
        />
      </div>
    </VersionGraphControlsProvider>
  );
}
