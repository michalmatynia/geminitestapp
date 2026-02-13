'use client';

import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Columns2,
  Copy,
  Crosshair,
  Download,
  Focus,
  GitMerge,
  Map,
  Maximize2,
  Minus,
  MousePointer2,
  BarChart3,
  Network,
  Plus,
  Search,
  Shield,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { UnifiedButton, UnifiedInput } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { VersionNodeMapCanvas, type VersionNodeMapCanvasRef } from './VersionNodeMapCanvas';
import { VersionNodeMapMinimap } from './VersionNodeMapMinimap';
import { useSlotsActions } from '../context/SlotsContext';
import { useVersionGraphActions, useVersionGraphState } from '../context/VersionGraphContext';
import { getImageStudioSlotImageSrc } from '../utils/image-src';
import { exportSvgAsPng, type LayoutMode } from '../utils/version-graph';

import type { SlotGenerationMetadata } from '../types';
import type { ImageStudioSlotRecord } from '../types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function readMeta(slot: ImageStudioSlotRecord): SlotGenerationMetadata {
  if (!slot.metadata || typeof slot.metadata !== 'object') return {};
  return slot.metadata as SlotGenerationMetadata;
}

// ── Layout mode config ──────────────────────────────────────────────────────

const LAYOUT_MODES: { mode: LayoutMode; label: string; Icon: typeof Network }[] = [
  { mode: 'dag', label: 'DAG', Icon: Network },
  { mode: 'timeline-h', label: 'H', Icon: ArrowRight },
  { mode: 'timeline-v', label: 'V', Icon: ArrowDown },
];
const ZOOM_BUTTON_STEP = 0.07;

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
    layoutMode,
    graphStats,
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
    setFilterQuery,
    toggleFilterType,
    setFilterHasMask,
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
      // First node selected — store as first, second is pending
      setCompareNodeIds([nodeId, '']);
    } else if (!compareNodeIds[1] || compareNodeIds[0] === nodeId) {
      // Replace second (or ignore if same as first)
      if (compareNodeIds[0] !== nodeId) {
        setCompareNodeIds([compareNodeIds[0], nodeId]);
      }
    } else {
      // Both filled — start over with new first
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

  const hasActiveFilters = filterQuery || filterTypes.size > 0 || filterHasMask !== null;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      {/* Toolbar */}
      <div className='flex items-center justify-between border-b border-border/40 px-3 py-1.5'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>
          Version Graph ({nodes.length}{allNodes.length !== nodes.length ? `/${allNodes.length}` : ''})
        </div>
        <div className='flex items-center gap-1'>
          {/* Merge mode toggle */}
          <UnifiedButton
            variant={mergeMode ? 'default' : 'ghost'}
            size='icon'
            className={cn('size-6', mergeMode && 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30')}
            title={mergeMode ? 'Exit merge mode' : 'Enter merge mode'}
            onClick={toggleMergeMode}
          >
            <GitMerge className='size-3' />
          </UnifiedButton>

          {/* Merge execute button */}
          {mergeMode && mergeSelectedIds.length >= 2 ? (
            <UnifiedButton
              variant='outline'
              size='sm'
              className='h-6 border-orange-400/40 px-2 text-[10px] text-orange-400 hover:bg-orange-500/10'
              disabled={mergeBusy}
              onClick={() => void handleExecuteMerge()}
            >
              Merge ({mergeSelectedIds.length})
            </UnifiedButton>
          ) : null}

          {/* Clear merge selection */}
          {mergeMode && mergeSelectedIds.length > 0 ? (
            <UnifiedButton
              variant='ghost'
              size='icon'
              className='size-6 text-gray-400'
              title='Clear selection'
              onClick={clearMergeSelection}
            >
              <X className='size-3' />
            </UnifiedButton>
          ) : null}

          <div className='mx-1 h-4 w-px bg-border/40' />

          {/* Collapse controls */}
          <UnifiedButton
            variant='ghost'
            size='icon'
            className='size-6'
            title='Collapse all'
            onClick={collapseAll}
          >
            <ChevronUp className='size-3' />
          </UnifiedButton>
          <UnifiedButton
            variant='ghost'
            size='icon'
            className='size-6'
            title='Expand all'
            onClick={expandAll}
          >
            <ChevronDown className='size-3' />
          </UnifiedButton>

          <div className='mx-1 h-4 w-px bg-border/40' />

          {/* Layout mode selector */}
          <div className='flex items-center rounded border border-border/40'>
            {LAYOUT_MODES.map(({ mode, label, Icon }) => (
              <button
                key={mode}
                type='button'
                className={cn(
                  'flex items-center gap-0.5 px-1.5 py-0.5 text-[9px]',
                  layoutMode === mode
                    ? 'bg-accent text-accent-foreground'
                    : 'text-gray-500 hover:text-gray-300',
                )}
                title={`Layout: ${label}`}
                onClick={() => setLayoutMode(mode)}
              >
                <Icon className='size-2.5' />
                {label}
              </button>
            ))}
          </div>

          <div className='mx-1 h-4 w-px bg-border/40' />

          {/* Zoom controls */}
          <UnifiedButton
            variant='ghost'
            size='icon'
            className='size-6'
            title='Zoom out'
            onClick={() => setZoom((z) => Math.max(0.25, z - ZOOM_BUTTON_STEP))}
          >
            <Minus className='size-3' />
          </UnifiedButton>
          <span className='min-w-[36px] text-center text-[10px] text-gray-400'>
            {Math.round(zoom * 100)}%
          </span>
          <UnifiedButton
            variant='ghost'
            size='icon'
            className='size-6'
            title='Zoom in'
            onClick={() => setZoom((z) => Math.min(3, z + ZOOM_BUTTON_STEP))}
          >
            <Plus className='size-3' />
          </UnifiedButton>
          <UnifiedButton
            variant='ghost'
            size='icon'
            className='size-6'
            title='Fit to view'
            onClick={() => canvasRef.current?.fitToView()}
          >
            <Maximize2 className='size-3' />
          </UnifiedButton>

          <div className='mx-1 h-4 w-px bg-border/40' />

          {/* Stats toggle */}
          <UnifiedButton
            variant={showStats ? 'default' : 'ghost'}
            size='icon'
            className={cn('size-6', showStats && 'bg-accent')}
            title={showStats ? 'Hide stats' : 'Show stats'}
            onClick={() => setShowStats((v) => !v)}
          >
            <BarChart3 className='size-3' />
          </UnifiedButton>

          {/* Compare mode toggle */}
          <UnifiedButton
            variant={compareMode ? 'default' : 'ghost'}
            size='icon'
            className={cn('size-6', compareMode && 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30')}
            title={compareMode ? 'Exit compare mode' : 'Compare two nodes'}
            onClick={toggleCompareMode}
          >
            <Columns2 className='size-3' />
          </UnifiedButton>

          {/* Minimap toggle */}
          {nodes.length > 8 ? (
            <UnifiedButton
              variant={showMinimap ? 'default' : 'ghost'}
              size='icon'
              className={cn('size-6', showMinimap && 'bg-accent')}
              title={showMinimap ? 'Hide minimap' : 'Show minimap'}
              onClick={() => setShowMinimap((v) => !v)}
            >
              <Map className='size-3' />
            </UnifiedButton>
          ) : null}

          {/* Export PNG */}
          <UnifiedButton
            variant='ghost'
            size='icon'
            className='size-6'
            title='Export as PNG'
            disabled={exporting || nodes.length === 0}
            onClick={() => void handleExportPng()}
          >
            <Download className='size-3' />
          </UnifiedButton>
        </div>
      </div>

      {/* Stats row */}
      {showStats ? (
        <div className='border-b border-border/40 px-3 py-1 text-[9px] text-gray-500'>
          {graphStats.totalNodes} nodes · {graphStats.baseCount} base · {graphStats.generationCount} gen · {graphStats.mergeCount} merge · depth {graphStats.maxDepth} · {graphStats.maskedCount} masked
        </div>
      ) : null}

      {/* Search & Filter bar */}
      <div className='border-b border-border/40 px-3 py-1.5'>
        <div className='flex items-center gap-1.5'>
          <div className='relative flex-1'>
            <Search className='absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-gray-500' />
            <UnifiedInput
              type='text'
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder='Search nodes...'
              className='h-6 w-full rounded border border-border/40 bg-transparent pl-5 pr-2 text-[10px] text-gray-300 placeholder:text-gray-600 focus:border-gray-500 focus:outline-none'
            />
          </div>

          {/* Type filter chips */}
          {(['base', 'generation', 'merge'] as const).map((t) => (
            <button
              key={t}
              type='button'
              className={cn(
                'rounded px-1.5 py-0.5 text-[9px] font-medium',
                filterTypes.has(t)
                  ? t === 'base'
                    ? 'bg-blue-500/20 text-blue-400'
                    : t === 'generation'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-purple-500/20 text-purple-400'
                  : 'text-gray-500 hover:text-gray-400',
              )}
              title={`Filter: ${t}`}
              onClick={() => toggleFilterType(t)}
            >
              {t === 'base' ? 'Base' : t === 'generation' ? 'Gen' : 'Merge'}
            </button>
          ))}

          {/* Mask filter */}
          <button
            type='button'
            className={cn(
              'rounded px-1.5 py-0.5 text-[9px] font-medium',
              filterHasMask !== null
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-gray-500 hover:text-gray-400',
            )}
            title={
              filterHasMask === null
                ? 'Filter: masks (any)'
                : filterHasMask
                  ? 'Filter: has mask'
                  : 'Filter: no mask'
            }
            onClick={() => {
              // Cycle: null → true → false → null
              if (filterHasMask === null) setFilterHasMask(true);
              else if (filterHasMask === true) setFilterHasMask(false);
              else setFilterHasMask(null);
            }}
          >
            <Shield className='inline size-2.5' />
          </button>

          {/* Clear filters */}
          {hasActiveFilters ? (
            <button
              type='button'
              className='rounded px-1 py-0.5 text-[9px] text-gray-500 hover:text-gray-400'
              title='Clear all filters'
              onClick={clearFilters}
            >
              <X className='size-3' />
            </button>
          ) : null}
        </div>
      </div>

      {/* Merge mode banner */}
      {mergeMode ? (
        <div className='border-b border-orange-400/20 bg-orange-500/5 px-3 py-1 text-[10px] text-orange-400'>
          Click nodes to select for merge. Select 2+ nodes, then click Merge.
        </div>
      ) : null}

      {/* Compare mode banner */}
      {compareMode ? (
        <div className='border-b border-cyan-400/20 bg-cyan-500/5 px-3 py-1 text-[10px] text-cyan-400'>
          {compareNodeIds?.[0] && !compareNodeIds[1]
            ? 'Now click a second node to compare.'
            : 'Click two nodes to compare side by side.'}
        </div>
      ) : null}

      {/* Isolation banner */}
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
        <VersionNodeMapCanvas
          ref={canvasRef}
          nodes={nodes}
          edges={edges}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          mergeMode={mergeMode}
          mergeSelectedIds={mergeSelectedIds}
          collapsedNodeIds={collapsedNodeIds}
          filteredNodeIds={filteredNodeIds}
          isolatedNodeIds={isolatedNodeIds}
          compareMode={compareMode}
          compareNodeIds={compareNodeIds}
          onSelectNode={handleCanvasSelectNode}
          onHoverNode={hoverNode}
          onActivateNode={handleActivateNode}
          onToggleMergeSelection={toggleMergeSelection}
          onToggleCollapse={toggleCollapse}
          onContextMenu={handleContextMenu}
          getSlotImageSrc={getSlotImageSrc}
          getSlotAnnotation={getSlotAnnotation}
          zoom={zoom}
          onZoomChange={setZoom}
        />

        {/* Minimap overlay */}
        {showMinimap && nodes.length > 8 ? (
          <div className='absolute bottom-2 right-2 z-10'>
            <VersionNodeMapMinimap
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              pan={canvasRef.current?.getPanZoom().pan ?? { x: 0, y: 0 }}
              zoom={zoom}
              viewportWidth={canvasContainerRef.current?.clientWidth ?? 300}
              viewportHeight={canvasContainerRef.current?.clientHeight ?? 200}
              onPanTo={handleMinimapPan}
            />
          </div>
        ) : null}
      </div>

      {/* Context menu overlay */}
      {contextMenu && contextMenuNode ? (
        <>
          {/* Backdrop to close (Escape key handled via useEffect) */}
          <div className='fixed inset-0 z-50' onClick={closeContextMenu} role='presentation' />
          <div
            className='fixed z-50 min-w-[140px] rounded border border-border/60 bg-card py-1 shadow-lg'
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              type='button'
              className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
              onClick={() => {
                setWorkingSlotId(contextMenu.nodeId);
                onSwitchToControls?.();
                closeContextMenu();
              }}
            >
              <Crosshair className='size-3' />
              Set as Source
            </button>
            <button
              type='button'
              className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
              onClick={() => {
                isolateBranch(contextMenu.nodeId);
                closeContextMenu();
              }}
            >
              <Focus className='size-3' />
              Isolate Branch
            </button>
            {contextMenuNode.childIds.length > 0 ? (
              <button
                type='button'
                className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
                onClick={() => {
                  toggleCollapse(contextMenu.nodeId);
                  closeContextMenu();
                }}
              >
                {collapsedNodeIds.has(contextMenu.nodeId) ? (
                  <><ChevronDown className='size-3' /> Expand</>
                ) : (
                  <><ChevronUp className='size-3' /> Collapse</>
                )}
              </button>
            ) : null}
            <button
              type='button'
              className='flex w-full items-center gap-2 px-3 py-1.5 text-left text-[11px] text-gray-300 hover:bg-accent'
              onClick={() => {
                void navigator.clipboard.writeText(contextMenu.nodeId);
                closeContextMenu();
              }}
            >
              <Copy className='size-3' />
              Copy ID
            </button>
          </div>
        </>
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
                  {cNode.type === 'merge' ? 'Merge' : cNode.type === 'generation' ? 'Generation' : 'Base'}
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

      {/* Inspector */}
      {selectedNode && !mergeMode && !compareMode ? (
        <div className='border-t border-border/40 p-3'>
          <div className='flex gap-3'>
            {/* Thumbnail */}
            <div className='size-[72px] flex-shrink-0 overflow-hidden rounded border border-border/60 bg-card/30'>
              {getSlotImageSrc(selectedNode.slot) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={getSlotImageSrc(selectedNode.slot)!}
                  alt={selectedNode.label}
                  className='h-full w-full object-cover'
                />
              ) : (
                <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
                  No image
                </div>
              )}
            </div>

            {/* Details */}
            <div className='min-w-0 flex-1 space-y-1'>
              <div className='truncate text-xs font-medium text-gray-200'>
                {selectedNode.label}
              </div>
              <div className='text-[10px] text-gray-500'>
                {selectedNode.type === 'merge'
                  ? 'Merge'
                  : selectedNode.type === 'generation'
                    ? 'Generation'
                    : 'Base'}{' '}
                {selectedNode.hasMask ? '· Has mask' : ''}
              </div>
              {selectedNode.parentIds.length > 0 ? (
                <div className='text-[10px] text-gray-500'>
                  {selectedNode.parentIds.length} parent{selectedNode.parentIds.length !== 1 ? 's' : ''}
                </div>
              ) : null}
              {selectedNode.childIds.length > 0 ? (
                <div className='text-[10px] text-gray-500'>
                  {selectedNode.childIds.length} child{selectedNode.childIds.length !== 1 ? 'ren' : ''}
                  {selectedNode.descendantCount > selectedNode.childIds.length
                    ? ` (${selectedNode.descendantCount} total)`
                    : ''}
                </div>
              ) : null}
              {(() => {
                const meta = readMeta(selectedNode.slot);
                if (!meta.generationParams?.prompt) return null;
                return (
                  <div className='truncate text-[10px] text-gray-500' title={meta.generationParams.prompt}>
                    Prompt: {meta.generationParams.prompt.slice(0, 60)}
                    {meta.generationParams.prompt.length > 60 ? '...' : ''}
                  </div>
                );
              })()}
              {selectedNode.parentIds.length > 0 ? (
                <button
                  type='button'
                  className='text-[10px] text-blue-400 hover:underline'
                  onClick={() => selectNode(selectedNode.parentIds[0] ?? null)}
                >
                  <MousePointer2 className='mr-0.5 inline size-2.5' />
                  Go to parent
                </button>
              ) : null}
            </div>
          </div>

          <div className='mt-2 flex gap-2'>
            <UnifiedButton
              variant='outline'
              size='sm'
              className='flex-1 text-xs'
              onClick={handleSetAsSource}
            >
              <Crosshair className='mr-1.5 size-3' />
              Set as Source
            </UnifiedButton>
          </div>

          {/* Annotation */}
          <div className='mt-2'>
            <textarea
              value={annotationDraft}
              onChange={(e) => setAnnotationDraft(e.target.value)}
              onBlur={handleAnnotationBlur}
              placeholder='Add note...'
              rows={2}
              className='w-full resize-none rounded border border-border/40 bg-transparent px-2 py-1 text-[10px] text-gray-300 placeholder:text-gray-600 focus:border-gray-500 focus:outline-none'
            />
          </div>
        </div>
      ) : !mergeMode && !compareMode ? (
        <div className='border-t border-border/40 px-3 py-2 text-[10px] text-gray-500'>
          Click a node to inspect. Double-click to set as source.
        </div>
      ) : null}
    </div>
  );
}
