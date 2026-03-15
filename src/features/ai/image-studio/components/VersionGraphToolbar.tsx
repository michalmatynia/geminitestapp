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

import {
  getImageStudioDocTooltip,
  type ImageStudioDocKey,
} from '@/features/ai/image-studio/utils/studio-docs';
import type { LayoutMode } from '@/features/ai/image-studio/utils/version-graph';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useVersionGraphControlsContext } from './VersionGraphControlsContext';
import { useSettingsState } from '../context/SettingsContext';


// ── Constants ────────────────────────────────────────────────────────────────

const LAYOUT_MODES: {
  mode: LayoutMode;
  label: string;
  Icon: typeof Network;
  docKey: ImageStudioDocKey;
}[] = [
  { mode: 'dag', label: 'DAG', Icon: Network, docKey: 'version_graph_layout_dag' },
  { mode: 'timeline-h', label: 'H', Icon: ArrowRight, docKey: 'version_graph_layout_timeline_h' },
  { mode: 'timeline-v', label: 'V', Icon: ArrowDown, docKey: 'version_graph_layout_timeline_v' },
];
const ZOOM_BUTTON_STEP = 0.07;

// ── Component ────────────────────────────────────────────────────────────────

export function VersionGraphToolbar(): React.JSX.Element {
  const { studioSettings } = useSettingsState();
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
  const versionGraphTooltipsEnabled = studioSettings.helpTooltips.versionGraphButtonsEnabled;
  const tooltipContent = React.useMemo(
    () => ({
      mergeModeToggle: getImageStudioDocTooltip('version_graph_merge_mode_toggle'),
      mergeExecute: getImageStudioDocTooltip('version_graph_merge_execute'),
      mergeClearSelection: getImageStudioDocTooltip('version_graph_merge_clear_selection'),
      compositeModeToggle: getImageStudioDocTooltip('version_graph_composite_mode_toggle'),
      compositeExecute: getImageStudioDocTooltip('version_graph_composite_execute'),
      compositeClearSelection: getImageStudioDocTooltip('version_graph_composite_clear_selection'),
      compareModeToggle: getImageStudioDocTooltip('version_graph_compare_mode_toggle'),
      collapseAll: getImageStudioDocTooltip('version_graph_collapse_all'),
      expandAll: getImageStudioDocTooltip('version_graph_expand_all'),
      statsToggle: getImageStudioDocTooltip('version_graph_stats_toggle'),
      minimapToggle: getImageStudioDocTooltip('version_graph_minimap_toggle'),
      exportPng: getImageStudioDocTooltip('version_graph_export_png'),
      zoomOut: getImageStudioDocTooltip('version_graph_zoom_out'),
      zoomIn: getImageStudioDocTooltip('version_graph_zoom_in'),
      fitToView: getImageStudioDocTooltip('version_graph_fit_to_view'),
    }),
    []
  );

  return (
    <div className='flex items-center justify-between border-b border-border/40 px-3 py-1.5'>
      <div className='text-[10px] uppercase tracking-wide text-gray-500'>
        Version Graph ({nodeCount}
        {allNodeCount !== nodeCount ? `/${allNodeCount}` : ''})
      </div>
      <div className='flex items-center gap-1'>
        {/* ── Modes group ──────────────────────────────────────── */}

        {/* Merge mode toggle */}
        <Button
          size='xs'
          variant={mergeMode ? 'default' : 'ghost'}
          className={cn(
            'size-6',
            mergeMode && 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
          )}
          title={versionGraphTooltipsEnabled ? tooltipContent.mergeModeToggle : undefined}
          onClick={onToggleMergeMode}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.mergeModeToggle : undefined}>
          <GitMerge className='size-3' />
        </Button>

        {/* Merge execute button */}
        {mergeMode && mergeSelectedIds.length >= 2 ? (
          <Button
            size='xs'
            variant='outline'
            className='h-6 border-orange-400/40 px-2 text-[10px] text-orange-400 hover:bg-orange-500/10'
            disabled={mergeBusy}
            title={versionGraphTooltipsEnabled ? tooltipContent.mergeExecute : undefined}
            onClick={onExecuteMerge}
          >
            Merge ({mergeSelectedIds.length})
          </Button>
        ) : null}

        {/* Clear merge selection */}
        {mergeMode && mergeSelectedIds.length > 0 ? (
          <Button
            size='xs'
            variant='ghost'
            className='size-6 text-gray-400'
            title={versionGraphTooltipsEnabled ? tooltipContent.mergeClearSelection : undefined}
            onClick={onClearMergeSelection}
            aria-label={versionGraphTooltipsEnabled ? tooltipContent.mergeClearSelection : undefined}>
            <X className='size-3' />
          </Button>
        ) : null}

        {/* Composite mode toggle */}
        <Button
          size='xs'
          variant={compositeMode ? 'default' : 'ghost'}
          className={cn(
            'size-6',
            compositeMode && 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'
          )}
          title={versionGraphTooltipsEnabled ? tooltipContent.compositeModeToggle : undefined}
          onClick={onToggleCompositeMode}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.compositeModeToggle : undefined}>
          <Layers className='size-3' />
        </Button>

        {/* Composite execute button */}
        {compositeMode && compositeSelectedIds.length >= 2 ? (
          <Button
            size='xs'
            variant='outline'
            className='h-6 border-teal-400/40 px-2 text-[10px] text-teal-400 hover:bg-teal-500/10'
            disabled={compositeBusy}
            title={versionGraphTooltipsEnabled ? tooltipContent.compositeExecute : undefined}
            onClick={onExecuteComposite}
          >
            Composite ({compositeSelectedIds.length})
          </Button>
        ) : null}

        {/* Clear composite selection */}
        {compositeMode && compositeSelectedIds.length > 0 ? (
          <Button
            size='xs'
            variant='ghost'
            className='size-6 text-gray-400'
            title={versionGraphTooltipsEnabled ? tooltipContent.compositeClearSelection : undefined}
            onClick={onClearCompositeSelection}
            aria-label={versionGraphTooltipsEnabled ? tooltipContent.compositeClearSelection : undefined}>
            <X className='size-3' />
          </Button>
        ) : null}

        {/* Compare mode toggle */}
        <Button
          size='xs'
          variant={compareMode ? 'default' : 'ghost'}
          className={cn(
            'size-6',
            compareMode && 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
          )}
          title={versionGraphTooltipsEnabled ? tooltipContent.compareModeToggle : undefined}
          onClick={onToggleCompareMode}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.compareModeToggle : undefined}>
          <Columns2 className='size-3' />
        </Button>

        <div className='mx-1 h-4 w-px bg-border/40' />

        {/* ── Actions group ────────────────────────────────────── */}

        {/* Collapse controls */}
        <Button
          size='xs'
          variant='ghost'
          className='size-6'
          title={versionGraphTooltipsEnabled ? tooltipContent.collapseAll : undefined}
          onClick={onCollapseAll}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.collapseAll : undefined}>
          <ChevronUp className='size-3' />
        </Button>
        <Button
          size='xs'
          variant='ghost'
          className='size-6'
          title={versionGraphTooltipsEnabled ? tooltipContent.expandAll : undefined}
          onClick={onExpandAll}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.expandAll : undefined}>
          <ChevronDown className='size-3' />
        </Button>

        {/* Stats toggle */}
        <Button
          size='xs'
          variant={showStats ? 'default' : 'ghost'}
          className={cn('size-6', showStats && 'bg-accent')}
          title={versionGraphTooltipsEnabled ? tooltipContent.statsToggle : undefined}
          onClick={onToggleStats}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.statsToggle : undefined}>
          <BarChart3 className='size-3' />
        </Button>

        {/* Minimap toggle */}
        {showMinimapButton ? (
          <Button
            size='xs'
            variant={showMinimap ? 'default' : 'ghost'}
            className={cn('size-6', showMinimap && 'bg-accent')}
            title={versionGraphTooltipsEnabled ? tooltipContent.minimapToggle : undefined}
            onClick={onToggleMinimap}
            aria-label={versionGraphTooltipsEnabled ? tooltipContent.minimapToggle : undefined}>
            <Map className='size-3' />
          </Button>
        ) : null}

        {/* Export PNG */}
        <Button
          size='xs'
          variant='ghost'
          className='size-6'
          title={versionGraphTooltipsEnabled ? tooltipContent.exportPng : undefined}
          disabled={exporting || nodeCount === 0}
          onClick={onExportPng}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.exportPng : undefined}>
          <Download className='size-3' />
        </Button>

        <div className='mx-1 h-4 w-px bg-border/40' />

        {/* ── Navigation group ─────────────────────────────────── */}

        {/* Layout mode selector */}
        <div className='flex items-center rounded border border-border/40'>
          {LAYOUT_MODES.map(({ mode, label, Icon, docKey }) => (
            <button
              key={mode}
              type='button'
              className={cn(
                'flex items-center gap-0.5 px-1.5 py-0.5 text-[9px]',
                layoutMode === mode
                  ? 'bg-accent text-accent-foreground'
                  : 'text-gray-500 hover:text-gray-300'
              )}
              title={versionGraphTooltipsEnabled ? getImageStudioDocTooltip(docKey) : undefined}
              onClick={() => onSetLayoutMode(mode)}
            >
              <Icon className='size-2.5' />
              {label}
            </button>
          ))}
        </div>

        {/* Zoom controls */}
        <Button
          size='xs'
          variant='ghost'
          className='size-6'
          title={versionGraphTooltipsEnabled ? tooltipContent.zoomOut : undefined}
          onClick={() => onSetZoom((z) => Math.max(0.25, z - ZOOM_BUTTON_STEP))}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.zoomOut : undefined}>
          <Minus className='size-3' />
        </Button>
        <span className='min-w-[36px] text-center text-[10px] text-gray-400'>
          {Math.round(zoom * 100)}%
        </span>
        <Button
          size='xs'
          variant='ghost'
          className='size-6'
          title={versionGraphTooltipsEnabled ? tooltipContent.zoomIn : undefined}
          onClick={() => onSetZoom((z) => Math.min(3, z + ZOOM_BUTTON_STEP))}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.zoomIn : undefined}>
          <Plus className='size-3' />
        </Button>
        <Button
          size='xs'
          variant='ghost'
          className='size-6'
          title={versionGraphTooltipsEnabled ? tooltipContent.fitToView : undefined}
          onClick={onFitToView}
          aria-label={versionGraphTooltipsEnabled ? tooltipContent.fitToView : undefined}>
          <Maximize2 className='size-3' />
        </Button>
      </div>
    </div>
  );
}
