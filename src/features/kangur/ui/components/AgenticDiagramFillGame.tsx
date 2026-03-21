'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurButton,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_ROW_SPACED_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  resolveKangurCanvasPoint,
  syncKangurCanvasContext,
} from '@/features/kangur/ui/services/drawing-canvas';
import { useKangurCanvasRedraw } from '@/features/kangur/ui/hooks/useKangurCanvasRedraw';
import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { KangurMiniGameInformationalFeedback } from '@/features/kangur/ui/types';
import type { Point2d } from '@/shared/contracts/geometry';

export type AgenticDiagramGameId =
  | 'operating_loop_arrow'
  | 'brief_contract_box'
  | 'approval_tiers_chart'
  | 'config_layers_box'
  | 'surfaces_flow_arrow';

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ArrowTarget = {
  kind: 'arrow';
  startZone: Rect;
  endZone: Rect;
  direction: 'right' | 'left' | 'up' | 'down';
  minDistance?: number;
};

type BoxTarget = {
  kind: 'box';
  rect: Rect;
  minCoverage?: number;
  minWidthRatio?: number;
  minHeightRatio?: number;
  centerTolerance?: number;
};

type BarTarget = {
  kind: 'bar';
  rect: Rect;
  minCoverage?: number;
  minWidthRatio?: number;
  minHeightRatio?: number;
  centerTolerance?: number;
};

type DiagramTarget = ArrowTarget | BoxTarget | BarTarget;

type DiagramGameConfig = {
  id: AgenticDiagramGameId;
  title: string;
  prompt: string;
  hint: string;
  success: string;
  accent: KangurAccent;
  stroke: string;
  target: DiagramTarget;
  renderSvg: () => React.JSX.Element;
};

type FeedbackState = KangurMiniGameInformationalFeedback | null;

type AgenticDiagramFillGameProps = {
  gameId: AgenticDiagramGameId;
  accent?: KangurAccent;
};

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 200;
const MIN_POINTS = 12;

const distance = (a: Point2d, b: Point2d): number => Math.hypot(a.x - b.x, a.y - b.y);

const isPointInRect = (point: Point2d, rect: Rect, padding = 0): boolean =>
  point.x >= rect.x - padding &&
  point.x <= rect.x + rect.width + padding &&
  point.y >= rect.y - padding &&
  point.y <= rect.y + rect.height + padding;

const computeBoundingBox = (points: Point2d[]): Rect => {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
};

const rectCenter = (rect: Rect): Point2d => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

const pointsInsideRatio = (points: Point2d[], rect: Rect, padding = 0): number => {
  if (points.length === 0) return 0;
  const inside = points.filter((point) => isPointInRect(point, rect, padding)).length;
  return inside / points.length;
};

const evaluateDiagramDrawing = (target: DiagramTarget, points: Point2d[]): FeedbackState => {
  if (points.length < MIN_POINTS) {
    return {
      kind: 'error',
      text: 'Narysuj wyraźniejszy kształt - potrzebujemy pełnego ruchu.',
    };
  }

  if (target.kind === 'arrow') {
    const start = points[0];
    const end = points[points.length - 1];
    const padding = 12;
    const minDistance = target.minDistance ?? 60;

    if (!start || !end) {
      return {
        kind: 'error',
        text: 'Zacznij rysowanie od wyraźnego punktu startu.',
      };
    }

    if (!isPointInRect(start, target.startZone, padding)) {
      return {
        kind: 'error',
        text: 'Zacznij strzałkę w odpowiednim węźle schematu.',
      };
    }

    if (!isPointInRect(end, target.endZone, padding)) {
      return {
        kind: 'error',
        text: 'Zakończ strzałkę w docelowym węźle.',
      };
    }

    const delta = { x: end.x - start.x, y: end.y - start.y };
    if (target.direction === 'right' && delta.x < minDistance) {
      return {
        kind: 'error',
        text: 'Strzałka powinna iść w prawo i domknąć pętlę.',
      };
    }
    if (target.direction === 'left' && delta.x > -minDistance) {
      return {
        kind: 'error',
        text: 'Strzałka powinna prowadzić w lewo.',
      };
    }
    if (target.direction === 'down' && delta.y < minDistance) {
      return {
        kind: 'error',
        text: 'Strzałka powinna schodzić w dół.',
      };
    }
    if (target.direction === 'up' && delta.y > -minDistance) {
      return {
        kind: 'error',
        text: 'Strzałka powinna iść w górę.',
      };
    }

    return {
      kind: 'success',
      text: 'Świetnie! Strzałka domyka diagram.',
    };
  }

  const box = computeBoundingBox(points);
  const center = rectCenter(box);
  const targetCenter = rectCenter(target.rect);
  const coverage = pointsInsideRatio(points, target.rect, 6);
  const minCoverage = target.minCoverage ?? 0.4;
  const minWidthRatio = target.minWidthRatio ?? 0.6;
  const minHeightRatio = target.minHeightRatio ?? 0.6;
  const centerTolerance = target.centerTolerance ?? 24;

  if (box.width < target.rect.width * minWidthRatio || box.height < target.rect.height * minHeightRatio) {
    return {
      kind: 'error',
      text: 'Ramka jest za mała - rozciągnij ją na cały brakujący obszar.',
    };
  }

  if (distance(center, targetCenter) > centerTolerance) {
    return {
      kind: 'error',
      text: 'Przesuń rysunek w miejsce brakującego bloku.',
    };
  }

  if (coverage < minCoverage) {
    return {
      kind: 'error',
      text: 'Rysuj bliżej środka brakującego elementu.',
    };
  }

  return {
    kind: 'success',
    text: target.kind === 'bar' ? 'Świetnie! Wykres jest kompletny.' : 'Super! Schemat ma pełny blok.',
  };
};

const OperatingLoopSvg = (): React.JSX.Element => (
  <svg
    aria-label='Diagram: pętla plan-exec-verify z brakującą strzałką.'
    className='h-full w-full'
    role='img'
    viewBox='0 0 360 200'
  >
    <style>{`
      .node {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .label {
        font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .arrow {
        stroke: #94a3b8;
        stroke-width: 2.5;
        fill: none;
      }
      .dash {
        stroke: #c7d2fe;
        stroke-width: 2.5;
        fill: none;
        stroke-dasharray: 6 6;
      }
      .pulse-1, .pulse-2, .pulse-3 {
        animation: nodePulse 6s ease-in-out infinite;
      }
      .pulse-2 { animation-delay: 2s; }
      .pulse-3 { animation-delay: 4s; }
      @keyframes nodePulse {
        0%, 18% { fill: #f8fafc; stroke: #e2e8f0; }
        30%, 55% { fill: #eef2ff; stroke: #6366f1; }
        100% { fill: #f8fafc; stroke: #e2e8f0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .pulse-1, .pulse-2, .pulse-3 { animation: none; }
      }
    `}</style>
    <defs>
      <marker id='loop-arrow' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
        <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
      </marker>
    </defs>
    <path className='arrow' d='M90 120 Q140 55 165 60' markerEnd='url(#loop-arrow)' />
    <path className='arrow' d='M270 120 Q190 180 95 145' markerEnd='url(#loop-arrow)' />
    <path className='dash' d='M195 70 Q240 80 265 120' />
    <circle className='node pulse-1' cx='70' cy='140' r='28' />
    <circle className='node pulse-2' cx='180' cy='50' r='28' />
    <circle className='node pulse-3' cx='290' cy='140' r='28' />
    <text className='label' x='52' y='144'>Plan</text>
    <text className='label' x='164' y='54'>Exec</text>
    <text className='label' x='268' y='144'>Verify</text>
  </svg>
);

const BriefContractSvg = (): React.JSX.Element => (
  <svg
    aria-label='Diagram: kontrakt briefu z brakującym blokiem.'
    className='h-full w-full'
    role='img'
    viewBox='0 0 360 200'
  >
    <style>{`
      .card {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .missing {
        fill: none;
        stroke: #c7d2fe;
        stroke-width: 2.5;
        stroke-dasharray: 6 6;
      }
      .label {
        font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .pulse-1, .pulse-2, .pulse-3 {
        animation: cardPulse 6s ease-in-out infinite;
      }
      .pulse-2 { animation-delay: 2s; }
      .pulse-3 { animation-delay: 4s; }
      @keyframes cardPulse {
        0%, 18% { fill: #f8fafc; stroke: #e2e8f0; }
        30%, 55% { fill: #eef2ff; stroke: #6366f1; }
        100% { fill: #f8fafc; stroke: #e2e8f0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .pulse-1, .pulse-2, .pulse-3 { animation: none; }
      }
    `}</style>
    <rect className='card pulse-1' height='60' rx='12' width='150' x='20' y='20' />
    <rect className='card pulse-2' height='60' rx='12' width='150' x='190' y='20' />
    <rect className='card pulse-3' height='60' rx='12' width='150' x='190' y='120' />
    <rect className='missing' height='60' rx='12' width='150' x='20' y='120' />
    <text className='label' x='40' y='55'>Goal</text>
    <text className='label' x='210' y='55'>Context</text>
    <text className='label' x='210' y='155'>Done</text>
  </svg>
);

const ApprovalTiersSvg = (): React.JSX.Element => (
  <svg
    aria-label='Diagram: poziomy dostępu z brakującym słupkiem.'
    className='h-full w-full'
    role='img'
    viewBox='0 0 360 200'
  >
    <style>{`
      .bar {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .missing {
        fill: none;
        stroke: #94a3b8;
        stroke-width: 2.5;
        stroke-dasharray: 6 6;
      }
      .label {
        font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .axis {
        stroke: #cbd5f5;
        stroke-width: 2;
      }
      .pulse-1, .pulse-2 {
        animation: barPulse 5s ease-in-out infinite;
      }
      .pulse-2 { animation-delay: 2.5s; }
      @keyframes barPulse {
        0%, 18% { fill: #f8fafc; stroke: #e2e8f0; }
        35%, 60% { fill: #e2e8f0; stroke: #64748b; }
        100% { fill: #f8fafc; stroke: #e2e8f0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .pulse-1, .pulse-2 { animation: none; }
      }
    `}</style>
    <line className='axis' x1='20' y1='170' x2='340' y2='170' />
    <rect className='bar pulse-1' height='100' rx='12' width='90' x='30' y='60' />
    <rect className='bar pulse-2' height='100' rx='12' width='90' x='240' y='60' />
    <rect className='missing' height='100' rx='12' width='90' x='135' y='60' />
    <text className='label' x='40' y='185'>Read-only</text>
    <text className='label' x='145' y='185'>Workspace</text>
    <text className='label' x='260' y='185'>Full access</text>
  </svg>
);

const ConfigLayersSvg = (): React.JSX.Element => (
  <svg
    aria-label='Diagram: warstwy configu z brakującą ramką.'
    className='h-full w-full'
    role='img'
    viewBox='0 0 360 200'
  >
    <style>{`
      .layer {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .missing {
        fill: none;
        stroke: #94a3b8;
        stroke-width: 2.5;
        stroke-dasharray: 6 6;
      }
      .label {
        font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .arrow {
        stroke: #cbd5f5;
        stroke-width: 2;
        fill: none;
      }
    `}</style>
    <rect className='layer' height='60' rx='12' width='220' x='70' y='25' />
    <rect className='missing' height='60' rx='12' width='220' x='70' y='115' />
    <text className='label' x='110' y='58'>User config</text>
    <text className='label' x='106' y='148'>Project config</text>
    <path className='arrow' d='M180 85 V115' />
  </svg>
);

const SurfacesFlowSvg = (): React.JSX.Element => (
  <svg
    aria-label='Diagram: decyzja o powierzchni pracy z brakującą strzałką.'
    className='h-full w-full'
    role='img'
    viewBox='0 0 360 200'
  >
    <style>{`
      .card {
        fill: #f8fafc;
        stroke: #e2e8f0;
        stroke-width: 2;
      }
      .label {
        font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        fill: #0f172a;
      }
      .arrow {
        stroke: #94a3b8;
        stroke-width: 2.5;
        fill: none;
      }
      .dash {
        stroke: #86efac;
        stroke-width: 2.5;
        fill: none;
        stroke-dasharray: 6 6;
      }
    `}</style>
    <defs>
      <marker id='surface-arrow' markerHeight='8' markerWidth='8' orient='auto' refX='6' refY='3'>
        <path d='M0,0 L0,6 L6,3 z' fill='#94a3b8' />
      </marker>
    </defs>
    <rect className='card' height='60' rx='12' width='110' x='20' y='70' />
    <rect className='card' height='60' rx='12' width='130' x='200' y='25' />
    <rect className='card' height='60' rx='12' width='130' x='200' y='115' />
    <text className='label' x='40' y='105'>Context</text>
    <text className='label' x='220' y='58'>CLI / IDE</text>
    <text className='label' x='215' y='148'>App / Cloud</text>
    <path className='arrow' d='M130 90 L200 55' markerEnd='url(#surface-arrow)' />
    <path className='dash' d='M130 110 L200 145' />
  </svg>
);

const DIAGRAM_GAMES: Record<AgenticDiagramGameId, DiagramGameConfig> = {
  operating_loop_arrow: {
    id: 'operating_loop_arrow',
    title: 'Pętla działania',
    prompt: 'Dorysuj brakującą strzałkę, aby zamknąć pętlę Plan → Exec → Verify.',
    hint: 'Zacznij w węźle Exec i zakończ w Verify.',
    success: 'Pętla operacyjna jest kompletna.',
    accent: 'indigo',
    stroke: '#6366f1',
    target: {
      kind: 'arrow',
      startZone: { x: 150, y: 20, width: 60, height: 60 },
      endZone: { x: 260, y: 110, width: 60, height: 60 },
      direction: 'right',
      minDistance: 60,
    },
    renderSvg: OperatingLoopSvg,
  },
  brief_contract_box: {
    id: 'brief_contract_box',
    title: 'Kontrakt briefu',
    prompt: 'Uzupełnij kontrakt: dorysuj brakującą kartę Constraints.',
    hint: 'Ramka powinna wypełnić pusty blok w lewym dolnym rogu.',
    success: 'Kontrakt briefu ma kompletne 4 bloki.',
    accent: 'indigo',
    stroke: '#6366f1',
    target: {
      kind: 'box',
      rect: { x: 20, y: 120, width: 150, height: 60 },
      minCoverage: 0.45,
      minWidthRatio: 0.65,
      minHeightRatio: 0.65,
      centerTolerance: 26,
    },
    renderSvg: BriefContractSvg,
  },
  approval_tiers_chart: {
    id: 'approval_tiers_chart',
    title: 'Approval ladder',
    prompt: 'Dorysuj środkowy słupek poziomu Workspace-write.',
    hint: 'Słupek ma taki sam rozmiar jak pozostałe i stoi na osi.',
    success: 'Drabina dostępu jest kompletna.',
    accent: 'slate',
    stroke: '#0f172a',
    target: {
      kind: 'bar',
      rect: { x: 135, y: 60, width: 90, height: 100 },
      minCoverage: 0.45,
      minWidthRatio: 0.6,
      minHeightRatio: 0.6,
      centerTolerance: 28,
    },
    renderSvg: ApprovalTiersSvg,
  },
  config_layers_box: {
    id: 'config_layers_box',
    title: 'Config Layers',
    prompt: 'Dorysuj brakującą warstwę Project config.',
    hint: 'Ramka powinna wypełnić dolny blok pod User config.',
    success: 'Warstwy konfiguracji są kompletne.',
    accent: 'slate',
    stroke: '#475569',
    target: {
      kind: 'box',
      rect: { x: 70, y: 115, width: 220, height: 60 },
      minCoverage: 0.45,
      minWidthRatio: 0.65,
      minHeightRatio: 0.65,
      centerTolerance: 26,
    },
    renderSvg: ConfigLayersSvg,
  },
  surfaces_flow_arrow: {
    id: 'surfaces_flow_arrow',
    title: 'Surface Flow',
    prompt: 'Dorysuj brakującą strzałkę do App / Cloud.',
    hint: 'Zacznij w kontekście i poprowadź strzałkę do dolnej karty.',
    success: 'Mapa powierzchni pracy jest gotowa.',
    accent: 'emerald',
    stroke: '#10b981',
    target: {
      kind: 'arrow',
      startZone: { x: 20, y: 70, width: 110, height: 60 },
      endZone: { x: 200, y: 115, width: 130, height: 60 },
      direction: 'right',
      minDistance: 80,
    },
    renderSvg: SurfacesFlowSvg,
  },
};

export function AgenticDiagramFillGame({
  gameId,
  accent,
}: AgenticDiagramFillGameProps): React.JSX.Element {
  const config = DIAGRAM_GAMES[gameId];
  if (!config) {
    return (
      <KangurLessonStack align='start' className='w-full'>
        <KangurLessonLead align='left'>Brak konfiguracji gry diagramu.</KangurLessonLead>
      </KangurLessonStack>
    );
  }
  const resolvedAccent = accent ?? config.accent;
  const isCoarsePointer = useKangurCoarsePointer();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const [strokes, setStrokes] = useState<Point2d[][]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const strokeWidth = isCoarsePointer ? 6 : 4;
  const minPointDistance = isCoarsePointer ? 4 : 2.5;

  const redrawCanvas = useCallback(
    (currentStrokes: Point2d[][]): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = syncKangurCanvasContext(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (!ctx) return;
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = config.stroke;
      ctx.lineWidth = strokeWidth;

      currentStrokes.forEach((stroke) => {
        const firstPoint = stroke[0];
        if (!firstPoint) return;
        ctx.beginPath();
        ctx.moveTo(firstPoint.x, firstPoint.y);
        stroke.slice(1).forEach((point) => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      });
    },
    [config.stroke, strokeWidth]
  );

  useKangurCanvasRedraw({
    canvasRef,
    redraw: () => redrawCanvas(strokes),
  });
  useKangurCanvasTouchLock(canvasRef);

  const updateStrokes = useCallback(
    (updater: (current: Point2d[][]) => Point2d[][]): void => {
      setStrokes((current) => {
        const next = updater(current);
        redrawCanvas(next);
        return next;
      });
    },
    [redrawCanvas]
  );

  const clearDrawing = useCallback((): void => {
    setStrokes([]);
    redrawCanvas([]);
    setFeedback(null);
  }, [redrawCanvas]);

  const resolvePoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): Point2d => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      return resolveKangurCanvasPoint(event, canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    },
    []
  );

  const isSolved = feedback?.kind === 'success';

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (isSolved) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = resolvePoint(event);
    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    setFeedback(null);
    updateStrokes((current) => [...current, [point]]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!isDrawingRef.current || isSolved) return;
    event.preventDefault();
    const point = resolvePoint(event);
    updateStrokes((current) => {
      if (current.length === 0) return current;
      const next = [...current];
      const lastStroke = next[next.length - 1] ?? [];
      const lastPoint = lastStroke[lastStroke.length - 1];
      if (lastPoint && distance(lastPoint, point) < minPointDistance) {
        return current;
      }
      next[next.length - 1] = [...lastStroke, point];
      return next;
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const handleCheck = (): void => {
    const points = strokes.flatMap((stroke) => stroke);
    const result = evaluateDiagramDrawing(config.target, points);
    setFeedback(result);
  };

  const statusText = useMemo(
    () => (isSolved ? config.success : feedback?.text ?? config.hint),
    [config.hint, config.success, feedback?.text, isSolved]
  );

  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonLead align='left'>{config.prompt}</KangurLessonLead>
      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)]`}>
        <div className='rounded-[28px] border border-slate-200/70 bg-white/90 p-4 shadow-sm'>
          <div
            className='relative w-full overflow-hidden rounded-[22px] border border-slate-200 bg-white'
            style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}
          >
            <div className='absolute inset-0'>
              {config.renderSvg()}
            </div>
            <canvas
              ref={canvasRef}
              className='absolute inset-0 h-full w-full cursor-crosshair'
              height={CANVAS_HEIGHT}
              width={CANVAS_WIDTH}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              aria-label='Pole rysowania schematu'
            />
          </div>
          <div className={cn('mt-4 items-center justify-between', KANGUR_WRAP_ROW_SPACED_CLASSNAME)}>
            <KangurButton size='sm' variant='surface' onClick={clearDrawing}>
              Wyczyść
            </KangurButton>
            <KangurButton
              size='sm'
              variant='primary'
              onClick={handleCheck}
              disabled={strokes.length === 0 || isSolved}
            >
              Sprawdź
            </KangurButton>
            {isSolved ? (
              <KangurButton size='sm' variant='success' onClick={clearDrawing}>
                Rysuj ponownie
              </KangurButton>
            ) : null}
          </div>
        </div>
        <div className='flex flex-col gap-3'>
          <KangurLessonCallout accent={resolvedAccent} padding='sm' className='text-left'>
            <KangurLessonCaption className='text-slate-950'>{config.hint}</KangurLessonCaption>
          </KangurLessonCallout>
          <KangurInfoCard
            accent={resolvedAccent}
            tone={feedback?.kind === 'success' ? 'accent' : 'neutral'}
            padding='md'
            className='text-sm'
          >
            <div className='flex flex-col gap-2'>
              <KangurStatusChip accent={resolvedAccent} labelStyle='caps'>
                {config.title}
              </KangurStatusChip>
              <p className='text-sm'>{statusText}</p>
            </div>
          </KangurInfoCard>
        </div>
      </div>
    </KangurLessonStack>
  );
}

export default AgenticDiagramFillGame;
