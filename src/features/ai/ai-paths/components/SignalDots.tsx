import React from 'react';

import type { PathFlowIntensity } from '@/shared/lib/ai-paths';

// ---------------------------------------------------------------------------
// Intensity presets — one dot per edge, intensity controls speed/size/glow
// ---------------------------------------------------------------------------

const INTENSITY_CONFIG: Record<
  Exclude<PathFlowIntensity, 'off'>,
  { duration: number; radius: number; opacity: number; count: number }
> = {
  low: { duration: 3, radius: 2.2, opacity: 0.5, count: 1 },
  medium: { duration: 2, radius: 2.5, opacity: 0.8, count: 2 },
  high: { duration: 1.2, radius: 2.8, opacity: 1, count: 3 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SignalDotsProps {
  /** SVG path data (d attribute) from the edge's computed Bézier curve. */
  path: string;
  /** Flow intensity — controls speed, size, and brightness. */
  intensity: Exclude<PathFlowIntensity, 'off'>;
  /** Dot fill colour. Defaults to a sky-blue matching the edge palette. */
  color?: string | undefined;
}

/**
 * Renders animated signal dots locked directly to the SVG edge path.
 *
 * Implemented with SVG animateMotion using the edge `path` directly.
 * Avoids mpath/id references to prevent corner-jump artifacts.
 */
export const SignalDots = React.memo(function SignalDots({
  path,
  intensity,
  color = 'rgb(56, 189, 248)',
}: SignalDotsProps): React.JSX.Element {
  const { duration, opacity, count, radius } = INTENSITY_CONFIG[intensity];
  const particleSpacing = duration / Math.max(count, 1);

  return (
    <g className='ai-paths-flow-particles'>
      {Array.from({ length: count }, (_value, index) => {
        const beginOffset = `${(-index * particleSpacing).toFixed(2)}s`;
        const pulseDuration = Math.max(0.7, duration * 0.75);
        return (
          <circle
            key={`signal-dot-${index}`}
            r={radius}
            fill={color}
            opacity={opacity}
            className='ai-paths-flow-particle'
            style={{ pointerEvents: 'none' }}
          >
            <animate
              attributeName='opacity'
              values={`${Math.max(0.2, opacity * 0.25)};${opacity};${Math.max(0.2, opacity * 0.25)}`}
              dur={`${pulseDuration}s`}
              repeatCount='indefinite'
              begin={beginOffset}
            />
            <animateMotion
              dur={`${duration}s`}
              repeatCount='indefinite'
              begin={beginOffset}
              path={path}
            />
          </circle>
        );
      })}
    </g>
  );
});
