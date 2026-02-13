'use client';

import {
  ArrowDown,
  ArrowRight,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Columns2,
  Download,
  GitMerge,
  Layers,
  Map,
  Maximize2,
  Minus,
  Network,
  Plus,
  X,
} from 'lucide-react';
import React from 'react';

import { UnifiedButton } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useVersionGraphControlsContext } from './VersionGraphControlsContext';

import type { LayoutMode } from '../utils/version-graph';

// ── Constants ────────────────────────────────────────────────────────────────

const LAYOUT_MODES: { mode: LayoutMode; label: string; Icon: typeof Network }[] = [
  { mode: 'dag', label: 'DAG', Icon: Network },
  { mode: 'timeline-h', label: 'H', Icon: ArrowRight },
  { mode: 'timeline-v', label: 'V', Icon: ArrowDown },
];
const ZOOM_BUTTON_STEP = 0.07;

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphToolbar(): React.JSX.Element {
  const {
    nodeCount,
    allNodeCount,
    mergeMode,
    mergeSelectedIds,
    mergeBusy,
    onToggleMergeMode,
    onClearMergeSelection,
    onExecuteMerge,
    compositeMode,
    compositeSelectedIds,
    compositeBusy,
    onToggleCompositeMode,
    onClearCompositeSelection,
    onExecuteComposite,
    onCollapseAll,
    onExpandAll,
    layoutMode,
    onSetLayoutMode,
    zoom,
    onSetZoom,
    onFitToView,
    showStats,
    onToggleStats,
    compareMode,
    onToggleCompareMode,
    showMinimap,
    onToggleMinimap,
    showMinimapButton,
    exporting,
    onExportPng,
  } = useVersionGraphControlsContext();

  return (
    <div className='flex items-center justify-between border-b border-border/40 px-3 py-1.5'>
      <div className='text-[10px] uppercase tracking-wide text-gray-500'>
        Version Graph ({nodeCount}{allNodeCount !== nodeCount ? `/${allNodeCount}` : ''})
      </div>
      <div className='flex items-center gap-1'>
        {/* ── Modes group ──────────────────────────────────────── */}

        {/* Merge mode toggle */}
        <UnifiedButton
          variant={mergeMode ? 'default' : 'ghost'}
          size='icon'
          className={cn('size-6', mergeMode && 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30')}
          title={mergeMode ? 'Exit merge mode' : 'Enter merge mode'}
          onClick={onToggleMergeMode}
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
            onClick={onExecuteMerge}
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
            onClick={onClearMergeSelection}
          >
            <X className='size-3' />
          </UnifiedButton>
        ) : null}

        {/* Composite mode toggle */}
        <UnifiedButton
          variant={compositeMode ? 'default' : 'ghost'}
          size='icon'
          className={cn('size-6', compositeMode && 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30')}
          title={compositeMode ? 'Exit composite mode' : 'Enter composite mode'}
          onClick={onToggleCompositeMode}
        >
          <Layers className='size-3' />
        </UnifiedButton>

        {/* Composite execute button */}
        {compositeMode && compositeSelectedIds.length >= 2 ? (
          <UnifiedButton
            variant='outline'
            size='sm'
            className='h-6 border-teal-400/40 px-2 text-[10px] text-teal-400 hover:bg-teal-500/10'
            disabled={compositeBusy}
            onClick={onExecuteComposite}
          >
            Composite ({compositeSelectedIds.length})
          </UnifiedButton>
        ) : null}

        {/* Clear composite selection */}
        {compositeMode && compositeSelectedIds.length > 0 ? (
          <UnifiedButton
            variant='ghost'
            size='icon'
            className='size-6 text-gray-400'
            title='Clear selection'
            onClick={onClearCompositeSelection}
          >
            <X className='size-3' />
          </UnifiedButton>
        ) : null}

        {/* Compare mode toggle */}
        <UnifiedButton
          variant={compareMode ? 'default' : 'ghost'}
          size='icon'
          className={cn('size-6', compareMode && 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30')}
          title={compareMode ? 'Exit compare mode' : 'Compare two nodes'}
          onClick={onToggleCompareMode}
        >
          <Columns2 className='size-3' />
        </UnifiedButton>

        <div className='mx-1 h-4 w-px bg-border/40' />

        {/* ── Actions group ────────────────────────────────────── */}

        {/* Collapse controls */}
        <UnifiedButton
          variant='ghost'
          size='icon'
          className='size-6'
          title='Collapse all'
          onClick={onCollapseAll}
        >
          <ChevronUp className='size-3' />
        </UnifiedButton>
        <UnifiedButton
          variant='ghost'
          size='icon'
          className='size-6'
          title='Expand all'
          onClick={onExpandAll}
        >
          <ChevronDown className='size-3' />
        </UnifiedButton>

        {/* Stats toggle */}
        <UnifiedButton
          variant={showStats ? 'default' : 'ghost'}
          size='icon'
          className={cn('size-6', showStats && 'bg-accent')}
          title={showStats ? 'Hide stats' : 'Show stats'}
          onClick={onToggleStats}
        >
          <BarChart3 className='size-3' />
        </UnifiedButton>

        {/* Minimap toggle */}
        {showMinimapButton ? (
          <UnifiedButton
            variant={showMinimap ? 'default' : 'ghost'}
            size='icon'
            className={cn('size-6', showMinimap && 'bg-accent')}
            title={showMinimap ? 'Hide minimap' : 'Show minimap'}
            onClick={onToggleMinimap}
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
          disabled={exporting || nodeCount === 0}
          onClick={onExportPng}
        >
          <Download className='size-3' />
        </UnifiedButton>

        <div className='mx-1 h-4 w-px bg-border/40' />

        {/* ── Navigation group ─────────────────────────────────── */}

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
              onClick={() => onSetLayoutMode(mode)}
            >
              <Icon className='size-2.5' />
              {label}
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <UnifiedButton
          variant='ghost'
          size='icon'
          className='size-6'
          title='Zoom out'
          onClick={() => onSetZoom((z) => Math.max(0.25, z - ZOOM_BUTTON_STEP))}
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
          onClick={() => onSetZoom((z) => Math.min(3, z + ZOOM_BUTTON_STEP))}
        >
          <Plus className='size-3' />
        </UnifiedButton>
        <UnifiedButton
          variant='ghost'
          size='icon'
          className='size-6'
          title='Fit to view'
          onClick={onFitToView}
        >
          <Maximize2 className='size-3' />
        </UnifiedButton>
      </div>
    </div>
  );
}
