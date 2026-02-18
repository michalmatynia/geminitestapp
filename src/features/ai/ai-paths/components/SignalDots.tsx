'use client';

import React from 'react';

import type { PathFlowIntensity } from '@/features/ai/ai-paths/lib';

// ---------------------------------------------------------------------------
// Intensity presets — one dot per edge, intensity controls speed/size/glow
// ---------------------------------------------------------------------------

const INTENSITY_CONFIG: Record<
  Exclude<PathFlowIntensity, 'off'>,
  { duration: number; radius: number; opacity: number; count: number }
> = {
  low: { duration: 3, radius: 2.5, opacity: 0.5, count: 1 },
  medium: { duration: 2, radius: 3, opacity: 0.8, count: 2 },
  high: { duration: 1.2, radius: 3.5, opacity: 1, count: 3 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SignalDotsProps {
  /** SVG path data (d attribute) from the edge's computed Bézier curve. */
  path: string;
  /** Flow intensity — controls speed, size, and brightness. */
  intensity: Exclude<PathFlowIntensity, 'off'>;
  /** Current canvas zoom scale to keep particle size stable on screen. */
  viewScale?: number | undefined;
  /** Dot fill colour. Defaults to a sky-blue matching the edge palette. */
  color?: string | undefined;
}

/**
 * Renders a single animated signal dot that travels along an SVG edge path.
 *
 * One dot per edge — represents one data signal value traveling from
 * the output connector to the input connector.
 *
 * Uses native SVG `<animateMotion>` for GPU-accelerated animation.
 */
export const SignalDots = React.memo(function SignalDots({
  path,
  intensity,
  viewScale = 1,
  color = 'rgb(56, 189, 248)',
}: SignalDotsProps): React.JSX.Element {
  const motionPathBaseId = React.useId();
  const motionPathId = React.useMemo(
    (): string => `ai-paths-flow-${motionPathBaseId.replace(/[^a-zA-Z0-9_-]/g, '')}`,
    [motionPathBaseId]
  );
  const { duration, radius, opacity, count } = INTENSITY_CONFIG[intensity];
  const normalizedScale =
    Number.isFinite(viewScale) && viewScale > 0 ? viewScale : 1;
  // Wires use non-scaling strokes; keep particles visually aligned to that width.
  const adjustedRadius = Math.max(1.25, radius / normalizedScale);
  const particleSpacing = duration / Math.max(count, 1);

  return (
    <g className='ai-paths-flow-particles'>
      <path id={motionPathId} d={path} fill='none' stroke='none' />
      {Array.from({ length: count }, (_value, index) => {
        const beginOffset = `-${(index * particleSpacing).toFixed(2)}s`;
        const pulseDuration = Math.max(0.7, duration * 0.75);
        return (
          <circle
            key={`signal-dot-${index}`}
            r={adjustedRadius}
            fill={color}
            opacity={opacity}
            filter='url(#signal-dot-glow)'
            className='ai-paths-flow-particle'
            style={{ pointerEvents: 'none' }}
          >
            <animateMotion dur={`${duration}s`} repeatCount='indefinite' begin={beginOffset}>
              <mpath href={`#${motionPathId}`} />
            </animateMotion>
            <animate
              attributeName='opacity'
              values={`${Math.max(0.2, opacity * 0.25)};${opacity};${Math.max(0.2, opacity * 0.25)}`}
              dur={`${pulseDuration}s`}
              repeatCount='indefinite'
              begin={beginOffset}
            />
          </circle>
        );
      })}
    </g>
  );
});
