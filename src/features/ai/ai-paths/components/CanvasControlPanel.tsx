'use client';

import React from 'react';
import {
  Maximize,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Activity,
  Zap,
  Route,
  Map as MapIcon,
} from 'lucide-react';
import { DOCUMENTATION_MODULE_IDS, getDocumentationTooltip } from '@/shared/lib/documentation';
import { Button, Tooltip, Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { type EdgeRoutingMode } from '../context/hooks/useEdgePaths';

export interface CanvasControlPanelProps {
  edgeRoutingMode: EdgeRoutingMode;
  onEdgeRoutingModeChange: (mode: EdgeRoutingMode) => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToNodes: () => void;
  onFitToSelection: () => void;
  onResetView: () => void;
  viewScale: number;
  svgPerf?: { fps: number; avgFrameMs: number };
  className?: string;
}

export function CanvasControlPanel(props: CanvasControlPanelProps): React.JSX.Element {
  const {
    edgeRoutingMode,
    onEdgeRoutingModeChange,
    showMinimap,
    onToggleMinimap,
    onZoomIn,
    onZoomOut,
    onFitToNodes,
    onFitToSelection,
    onResetView,
    viewScale,
    svgPerf,
    className,
  } = props;
  const resolveTooltip = React.useCallback(
    (docId: string, fallback: string): string =>
      getDocumentationTooltip(DOCUMENTATION_MODULE_IDS.aiPaths, docId) ?? fallback,
    []
  );
  const zoomInLabel = resolveTooltip('canvas_zoom_in', 'Zoom In');
  const zoomOutLabel = resolveTooltip('canvas_zoom_out', 'Zoom Out');
  const fitNodesLabel = resolveTooltip('canvas_fit_nodes', 'Fit all nodes');
  const fitSelectionLabel = resolveTooltip('canvas_fit_selection', 'Fit selection');
  const resetViewLabel = resolveTooltip('canvas_reset_view', 'Reset view');
  const minimapLabel = showMinimap ? 'Hide Minimap' : 'Show Minimap';
  const edgeRoutingLabel =
    edgeRoutingMode === 'bezier' ? 'Switch to orthogonal edges' : 'Switch to bezier edges';

  return (
    <div
      className={cn(
        'absolute bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-border/80',
        className
      )}
    >
      <div className='flex items-center gap-1 px-1'>
        <Tooltip content={zoomInLabel}>
          <Button
            data-doc-id='canvas_zoom_in'
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={onZoomIn}
            aria-label={zoomInLabel}
            title={zoomInLabel}
          >
            <ZoomIn className='size-4' />
          </Button>
        </Tooltip>
        <div className='min-w-[42px] text-center text-[11px] font-bold tabular-nums text-foreground/90'>
          {Math.round(viewScale * 100)}%
        </div>
        <Tooltip content={zoomOutLabel}>
          <Button
            data-doc-id='canvas_zoom_out'
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={onZoomOut}
            aria-label={zoomOutLabel}
            title={zoomOutLabel}
          >
            <ZoomOut className='size-4' />
          </Button>
        </Tooltip>
      </div>

      <div className='h-4 w-px bg-border/40' />

      <div className='flex items-center gap-1'>
        <Tooltip content={fitNodesLabel}>
          <Button
            data-doc-id='canvas_fit_nodes'
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={onFitToNodes}
            aria-label={fitNodesLabel}
            title={fitNodesLabel}
          >
            <Maximize className='size-4' />
          </Button>
        </Tooltip>
        <Tooltip content={fitSelectionLabel}>
          <Button
            data-doc-id='canvas_fit_selection'
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={onFitToSelection}
            aria-label={fitSelectionLabel}
            title={fitSelectionLabel}
          >
            <Crosshair className='size-4' />
          </Button>
        </Tooltip>
        <Tooltip content={resetViewLabel}>
          <Button
            data-doc-id='canvas_reset_view'
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={onResetView}
            aria-label={resetViewLabel}
            title={resetViewLabel}
          >
            <Activity className='size-4' />
          </Button>
        </Tooltip>
      </div>

      <div className='h-4 w-px bg-border/40' />

      <div className='flex items-center gap-1'>
        <Tooltip content={minimapLabel}>
          <Button
            data-doc-id='canvas_toggle_minimap'
            variant={showMinimap ? 'secondary' : 'ghost'}
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={onToggleMinimap}
            aria-label={minimapLabel}
            title={minimapLabel}
          >
            <MapIcon className='size-4' />
          </Button>
        </Tooltip>
        <Tooltip content={edgeRoutingMode === 'bezier' ? 'Orthogonal Edges' : 'Bezier Edges'}>
          <Button
            data-doc-id='canvas_toggle_edge_routing'
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={() =>
              onEdgeRoutingModeChange(edgeRoutingMode === 'bezier' ? 'orthogonal' : 'bezier')
            }
            aria-label={edgeRoutingLabel}
            title={edgeRoutingLabel}
          >
            {edgeRoutingMode === 'bezier' ? (
              <Zap className='size-4 text-amber-400/80' />
            ) : (
              <Route className='size-4 text-sky-400/80' />
            )}
          </Button>
        </Tooltip>
      </div>

      {svgPerf && svgPerf.fps > 0 && (
        <div className='flex items-center gap-2 pl-2 pr-1'>
          <div className='h-4 w-px bg-border/40' />
          <Badge
            variant='outline'
            className={cn(
              'h-5 px-1.5 text-[9px] font-medium tracking-tight transition-colors',
              svgPerf.fps < 30
                ? 'border-rose-500/40 bg-rose-500/10 text-rose-400'
                : svgPerf.fps < 55
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
            )}
          >
            {svgPerf.fps} FPS
          </Badge>
        </div>
      )}
    </div>
  );
}
