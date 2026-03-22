import { forwardRef, useRef, useState } from 'react';

import { cn } from '@/features/kangur/shared/utils';
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

import type { DrawCheckpoint, DrawGameConfig } from './AgenticCodingMiniGames.types';

export function AgenticDrawGame({
  accent,
  config,
}: {
  accent: KangurAccent;
  config: DrawGameConfig;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [visited, setVisited] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    config.checkpoints.forEach((checkpoint) => {
      base[checkpoint.id] = false;
    });
    return base;
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const completedCount = Object.values(visited).filter(Boolean).length;
  const isComplete = completedCount === config.checkpoints.length;
  const viewBox = { width: 360, height: 140 };

  const reset = (): void => {
    setPoints([]);
    setVisited(() => {
      const base: Record<string, boolean> = {};
      config.checkpoints.forEach((checkpoint) => {
        base[checkpoint.id] = false;
      });
      return base;
    });
  };

  const toSvgPoint = (event: React.PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    const node = svgRef.current;
    if (!node) return null;
    const rect = node.getBoundingClientRect();
    const scaleX = viewBox.width / rect.width;
    const scaleY = viewBox.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const markVisited = (point: { x: number; y: number }): void => {
    const radius = 18;
    setVisited((prev) => {
      const next = { ...prev };
      config.checkpoints.forEach((checkpoint) => {
        if (next[checkpoint.id]) return;
        const dx = checkpoint.x - point.x;
        const dy = checkpoint.y - point.y;
        if (Math.hypot(dx, dy) <= radius) {
          next[checkpoint.id] = true;
        }
      });
      return next;
    });
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (isComplete) return;
    const point = toSvgPoint(event);
    if (!point) return;
    svgRef.current?.setPointerCapture(event.pointerId);
    setIsDrawing(true);
    setPoints((prev) => [...prev, point]);
    markVisited(point);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (!isDrawing || isComplete) return;
    const point = toSvgPoint(event);
    if (!point) return;
    setPoints((prev) => [...prev, point]);
    markVisited(point);
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>): void => {
    if (!isDrawing) return;
    svgRef.current?.releasePointerCapture(event.pointerId);
    setIsDrawing(false);
  };

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
          guide={config.guide}
          pathPoints={points}
          visited={visited}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
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

const DrawGameSvg = forwardRef<
  SVGSVGElement,
  {
    checkpoints: DrawCheckpoint[];
    guide: 'loop' | 'line';
    pathPoints: Array<{ x: number; y: number }>;
    visited: Record<string, boolean>;
    onPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void;
    onPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void;
  }
>(function DrawGameSvg(
  { checkpoints, guide, pathPoints, visited, onPointerDown, onPointerMove, onPointerUp },
  ref
): React.JSX.Element {
  const pathD =
    pathPoints.length > 1
      ? pathPoints.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
      : '';
  return (
    <svg
      ref={ref}
      aria-label='Rysuj, aby połączyć checkpointy.'
      className='h-auto w-full'
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
