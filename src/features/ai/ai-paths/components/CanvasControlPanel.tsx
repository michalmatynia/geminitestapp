'use client';

import React from 'react';
import {
  Maximize,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Layers,
  Activity,
  Zap,
  Route,
  Map as MapIcon,
} from 'lucide-react';
import { Button, Tooltip, Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { type CanvasRendererMode } from './CanvasBoard.utils';
import { type EdgeRoutingMode } from '../context/hooks/useEdgePaths';

export interface CanvasControlPanelProps {
  rendererMode: CanvasRendererMode;
  onRendererModeChange: (mode: CanvasRendererMode) => void;
  edgeRoutingMode: EdgeRoutingMode;
  onEdgeRoutingModeChange: (mode: EdgeRoutingMode) => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
  selectionToolMode: 'node' | 'marquee';
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToNodes: () => void;
  onFitToSelection: () => void;
  onResetView: () => void;
  viewScale: number;
  svgPerf?: { fps: number; avgFrameMs: number };
  className?: string;
}

export function CanvasControlPanel({
  rendererMode,
  onRendererModeChange,
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
}: CanvasControlPanelProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'absolute bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-xl backdrop-blur-md transition-all duration-300 hover:border-border/80',
        className
      )}
    >
      <div className='flex items-center gap-1 px-1'>
        {/* eslint-disable no-restricted-syntax */}
        <Tooltip content='Zoom In'>
          <Button variant='ghost' size='icon' className='h-8 w-8 rounded-full' onClick={onZoomIn}>
            <ZoomIn className='size-4' />
          </Button>
        </Tooltip>
        <div className='min-w-[42px] text-center text-[11px] font-bold tabular-nums text-foreground/90'>
          {Math.round(viewScale * 100)}%
        </div>
        <Tooltip content='Zoom Out'>
          <Button variant='ghost' size='icon' className='h-8 w-8 rounded-full' onClick={onZoomOut}>
            <ZoomOut className='size-4' />
          </Button>
        </Tooltip>
      </div>

      <div className='h-4 w-px bg-border/40' />

      <div className='flex items-center gap-1'>
        <Tooltip content='Fit all nodes'>
          <Button variant='ghost' size='icon' className='h-8 w-8 rounded-full' onClick={onFitToNodes}>
            <Maximize className='size-4' />
          </Button>
        </Tooltip>
        <Tooltip content='Fit selection'>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={onFitToSelection}
          >
            <Crosshair className='size-4' />
          </Button>
        </Tooltip>
        <Tooltip content='Reset view'>
          <Button variant='ghost' size='icon' className='h-8 w-8 rounded-full' onClick={onResetView}>
            <Activity className='size-4' />
          </Button>
        </Tooltip>
      </div>

      <div className='h-4 w-px bg-border/40' />

      <div className='flex items-center gap-1'>
        <Tooltip content={showMinimap ? 'Hide Minimap' : 'Show Minimap'}>
          <Button
            variant={showMinimap ? 'secondary' : 'ghost'}
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={onToggleMinimap}
          >
            <MapIcon className='size-4' />
          </Button>
        </Tooltip>
        <Tooltip
          content={
            rendererMode === 'svg'
              ? 'Switch to Legacy (DOM) Renderer'
              : 'Switch to Modern (SVG) Renderer'
          }
        >
          <Button
            variant={rendererMode === 'svg' ? 'secondary' : 'ghost'}
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={() => onRendererModeChange(rendererMode === 'svg' ? 'legacy' : 'svg')}
          >
            <Layers className='size-4' />
          </Button>
        </Tooltip>
        <Tooltip content={edgeRoutingMode === 'bezier' ? 'Orthogonal Edges' : 'Bezier Edges'}>
          <Button
            variant='ghost'
            size='icon'
            className='h-8 w-8 rounded-full'
            onClick={() => onEdgeRoutingModeChange(edgeRoutingMode === 'bezier' ? 'orthogonal' : 'bezier')}
          >
            {edgeRoutingMode === 'bezier' ? (
              <Zap className='size-4 text-amber-400/80' />
            ) : (
              <Route className='size-4 text-sky-400/80' />
            )}
          </Button>
        </Tooltip>
        {/* eslint-enable no-restricted-syntax */}
      </div>

      {svgPerf && svgPerf.fps > 0 && rendererMode === 'svg' && (
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
