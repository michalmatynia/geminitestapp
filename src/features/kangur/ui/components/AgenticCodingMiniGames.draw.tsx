'use client';

import { forwardRef, useMemo, useRef } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import { useKangurPointDrawingEngine } from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingEngine';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { Point2d } from '@/shared/contracts/geometry';

import { createAgenticCodingMiniGameComponent } from './AgenticCodingMiniGames.factory';
import type { DrawCheckpoint, DrawGameConfig } from './AgenticCodingMiniGames.types';

type AgenticDrawGameProps = {
  accent: KangurAccent;
  config: DrawGameConfig;
};

function useAgenticDrawGameModel(config: DrawGameConfig) {
  const isCoarsePointer = useKangurCoarsePointer();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const viewBox = { width: 360, height: 140 };
  const {
    clearStrokes,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerDrawing,
    strokes,
  } = useKangurPointDrawingEngine<SVGSVGElement>({
    canvasRef: svgRef,
    logicalHeight: viewBox.height,
    logicalWidth: viewBox.width,
    minPointDistance: isCoarsePointer ? 4 : 2.5,
    redraw: () => {},
    touchLockEnabled: isCoarsePointer,
  });
  const points = useMemo(() => strokes.flatMap((stroke) => stroke), [strokes]);
  const visited = useMemo(() => {
    const radius = 18;
    const next: Record<string, boolean> = {};
    config.checkpoints.forEach((checkpoint) => {
      next[checkpoint.id] = points.some((point) => {
        const dx = checkpoint.x - point.x;
        const dy = checkpoint.y - point.y;
        return Math.hypot(dx, dy) <= radius;
      });
    });
    return next;
  }, [config.checkpoints, points]);
  const completedCount = Object.values(visited).filter(Boolean).length;
  const isComplete = completedCount === config.checkpoints.length;

  const reset = (): void => {
    clearStrokes();
  };

  return {
    completedCount,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isCoarsePointer,
    isComplete,
    isPointerDrawing,
    points,
    reset,
    svgRef,
    viewBox,
    visited,
  };
}

function renderAgenticDrawGame(
  { accent, config }: AgenticDrawGameProps,
  {
    completedCount,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isCoarsePointer,
    isComplete,
    isPointerDrawing,
    points,
    reset,
    svgRef,
    visited,
  }: ReturnType<typeof useAgenticDrawGameModel>
): React.JSX.Element {
  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonVisual
        accent={accent}
        caption={config.svgLabel}
        maxWidthClassName='max-w-full'
      >
        <DrawGameSvg
          ref={svgRef}
          checkpoints={config.checkpoints}
          isDrawing={isPointerDrawing}
          guide={config.guide}
          pathPoints={points}
          visited={visited}
          onPointerDown={isComplete ? undefined : handlePointerDown}
          onPointerMove={isComplete ? undefined : handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      </KangurLessonVisual>
      <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent={accent}>{config.title}</KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            {completedCount}/{config.checkpoints.length}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>{config.prompt}</KangurLessonCaption>
        {isCoarsePointer ? (
          <KangurLessonCaption className='mt-2 text-left' data-testid='agentic-draw-touch-hint'>
            Prowadź palcem po planszy i zalicz wszystkie punkty kontrolne.
          </KangurLessonCaption>
        ) : null}
      </KangurLessonCallout>
      <KangurLessonInset accent={accent} className='flex flex-col gap-3'>
        <KangurLessonCaption className='text-left text-slate-700'>
          Narysuj linię i dotknij wszystkich punktów.
        </KangurLessonCaption>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurButton
            variant='surface'
            onClick={reset}
            className={isCoarsePointer ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]' : undefined}
          >
            Reset
          </KangurButton>
          {isComplete ? (
            <KangurLessonCaption className='text-left text-emerald-800'>
              {config.success}
            </KangurLessonCaption>
          ) : null}
        </div>
      </KangurLessonInset>
    </KangurLessonStack>
  );
}

export const AgenticDrawGame = createAgenticCodingMiniGameComponent({
  displayName: 'AgenticDrawGame',
  render: renderAgenticDrawGame,
  useModel: useAgenticDrawGameModel,
});

const DrawGameSvg = forwardRef<
  SVGSVGElement,
  {
    checkpoints: DrawCheckpoint[];
    guide: 'loop' | 'line';
    isDrawing: boolean;
    pathPoints: Point2d[];
    visited: Record<string, boolean>;
    onPointerDown?: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove?: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  }
>((
  { checkpoints, guide, isDrawing, pathPoints, visited, onPointerDown, onPointerMove, onPointerUp },
  ref
): React.JSX.Element => {
  const pathD =
    pathPoints.length > 1
      ? pathPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
      : '';
  return (
    <svg
      ref={ref}
      aria-label='Rysuj, aby połączyć checkpointy.'
      className={cn('h-auto w-full', isDrawing && 'drop-shadow-[0_8px_18px_rgba(56,189,248,0.28)]')}
      data-drawing-active={isDrawing ? 'true' : 'false'}
      role='img'
      viewBox='0 0 360 140'
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ touchAction: 'none' }}
    >
      <style>{`
        .guide { stroke: #e2e8f0; stroke-width: 4; stroke-linecap: round; fill: none; }
        .path { stroke: #38bdf8; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .checkpoint { fill: #f8fafc; stroke: #94a3b8; stroke-width: 2; }
        .checkpoint-active { fill: #e0f2fe; stroke: #38bdf8; }
        .label { font: 600 9px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #0f172a; }
        .pulse { animation: pulse 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; }
        }
      `}</style>
      {guide === 'loop' ? (
        <path className='guide' d='M90 90 Q180 10 270 90 Q180 130 90 90' />
      ) : (
        <path className='guide' d='M50 70 L310 70' />
      )}
      {pathD ? <path className='path' d={pathD} /> : null}
      {checkpoints.map((checkpoint) => (
        <g key={checkpoint.id}>
          <circle
            className={cn(
              'checkpoint',
              visited[checkpoint.id] ? 'checkpoint-active' : 'pulse'
            )}
            cx={checkpoint.x}
            cy={checkpoint.y}
            r='12'
          />
          <text className='label' x={checkpoint.x - 16} y={checkpoint.y + 26}>
            {checkpoint.label}
          </text>
        </g>
      ))}
    </svg>
  );
});

DrawGameSvg.displayName = 'DrawGameSvg';
