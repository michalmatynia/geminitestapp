'use client';

import {
  ArrowDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Download,
  GitMerge,
  Maximize2,
  Minus,
  MousePointer2,
  Network,
  Plus,
  Search,
  Shield,
  X,
} from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { VersionNodeMapCanvas, type VersionNodeMapCanvasRef } from './VersionNodeMapCanvas';
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
  } = useVersionGraphActions();
  const { setWorkingSlotId } = useSlotsActions();

  const canvasRef = useRef<VersionNodeMapCanvasRef>(null);
  const [zoom, setZoom] = useState(1);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

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
          <Button
            variant={mergeMode ? 'default' : 'ghost'}
            size='icon'
            className={cn('size-6', mergeMode && 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30')}
            title={mergeMode ? 'Exit merge mode' : 'Enter merge mode'}
            onClick={toggleMergeMode}
          >
            <GitMerge className='size-3' />
          </Button>

          {/* Merge execute button */}
          {mergeMode && mergeSelectedIds.length >= 2 ? (
            <Button
              variant='outline'
              size='sm'
              className='h-6 border-orange-400/40 px-2 text-[10px] text-orange-400 hover:bg-orange-500/10'
              disabled={mergeBusy}
              onClick={() => void handleExecuteMerge()}
            >
              Merge ({mergeSelectedIds.length})
            </Button>
          ) : null}

          {/* Clear merge selection */}
          {mergeMode && mergeSelectedIds.length > 0 ? (
            <Button
              variant='ghost'
              size='icon'
              className='size-6 text-gray-400'
              title='Clear selection'
              onClick={clearMergeSelection}
            >
              <X className='size-3' />
            </Button>
          ) : null}

          <div className='mx-1 h-4 w-px bg-border/40' />

          {/* Collapse controls */}
          <Button
            variant='ghost'
            size='icon'
            className='size-6'
            title='Collapse all'
            onClick={collapseAll}
          >
            <ChevronUp className='size-3' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-6'
            title='Expand all'
            onClick={expandAll}
          >
            <ChevronDown className='size-3' />
          </Button>

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
          <Button
            variant='ghost'
            size='icon'
            className='size-6'
            title='Zoom out'
            onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}
          >
            <Minus className='size-3' />
          </Button>
          <span className='min-w-[36px] text-center text-[10px] text-gray-400'>
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant='ghost'
            size='icon'
            className='size-6'
            title='Zoom in'
            onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
          >
            <Plus className='size-3' />
          </Button>
          <Button
            variant='ghost'
            size='icon'
            className='size-6'
            title='Fit to view'
            onClick={() => setZoom(1)}
          >
            <Maximize2 className='size-3' />
          </Button>

          <div className='mx-1 h-4 w-px bg-border/40' />

          {/* Export PNG */}
          <Button
            variant='ghost'
            size='icon'
            className='size-6'
            title='Export as PNG'
            disabled={exporting || nodes.length === 0}
            onClick={() => void handleExportPng()}
          >
            <Download className='size-3' />
          </Button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className='border-b border-border/40 px-3 py-1.5'>
        <div className='flex items-center gap-1.5'>
          <div className='relative flex-1'>
            <Search className='absolute left-1.5 top-1/2 size-3 -translate-y-1/2 text-gray-500' />
            <input
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

      {/* Canvas */}
      <div className='relative min-h-0 flex-1'>
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
          onSelectNode={selectNode}
          onHoverNode={hoverNode}
          onActivateNode={handleActivateNode}
          onToggleMergeSelection={toggleMergeSelection}
          onToggleCollapse={toggleCollapse}
          getSlotImageSrc={getSlotImageSrc}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      </div>

      {/* Inspector */}
      {selectedNode && !mergeMode ? (
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
            <Button
              variant='outline'
              size='sm'
              className='flex-1 text-xs'
              onClick={handleSetAsSource}
            >
              <Crosshair className='mr-1.5 size-3' />
              Set as Source
            </Button>
          </div>
        </div>
      ) : !mergeMode ? (
        <div className='border-t border-border/40 px-3 py-2 text-[10px] text-gray-500'>
          Click a node to inspect. Double-click to set as source.
        </div>
      ) : null}
    </div>
  );
}
