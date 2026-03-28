import React from 'react';
import {
  type KangurAnimationSurfaceIdsDto,
  type KangurAnimationSurfacePropsDto,
  useKangurAnimationSurfaceIds,
} from './animation-surface-contracts';

type AgenticAnimationSurfaceIds = KangurAnimationSurfaceIdsDto;

type AgenticAnimationSurfaceProps = KangurAnimationSurfacePropsDto;

export function useAgenticAnimationSurfaceIds(
  prefix: string
): AgenticAnimationSurfaceIds {
  return useKangurAnimationSurfaceIds(prefix);
}

export function AgenticAnimationSurface({
  accentEnd,
  accentStart,
  atmosphereA,
  atmosphereB,
  ids,
  stroke,
  testIdPrefix,
  x,
  y,
  width,
  height,
  rx,
}: AgenticAnimationSurfaceProps): React.JSX.Element {
  return (
    <>
      <defs>
        <clipPath id={ids.clipId}>
          <rect height={height} rx={rx} width={width} x={x} y={y} />
        </clipPath>
        <linearGradient
          gradientUnits='userSpaceOnUse'
          id={ids.panelGradientId}
          x1={x}
          x2={x + width}
          y1={y}
          y2={y + height}
        >
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='55%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor={accentEnd} />
        </linearGradient>
        <linearGradient
          gradientUnits='userSpaceOnUse'
          id={ids.frameGradientId}
          x1={x}
          x2={x + width}
          y1={y}
          y2={y}
        >
          <stop offset='0%' stopColor={accentStart} stopOpacity='0.74' />
          <stop offset='100%' stopColor='#ffffff' stopOpacity='0.92' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${ids.clipId})`} data-testid={`${testIdPrefix}-atmosphere`}>
        <rect
          fill={`url(#${ids.panelGradientId})`}
          height={height}
          rx={rx}
          stroke={stroke}
          strokeWidth='2'
          width={width}
          x={x}
          y={y}
        />
        <ellipse
          cx={x + width * 0.2}
          cy={y + height * 0.18}
          fill={atmosphereA}
          rx={width * 0.22}
          ry={height * 0.16}
        />
        <ellipse
          cx={x + width * 0.82}
          cy={y + height * 0.88}
          fill={atmosphereB}
          rx={width * 0.32}
          ry={height * 0.22}
        />
      </g>
      <rect
        data-testid={`${testIdPrefix}-frame`}
        fill='none'
        height={height - 12}
        rx={Math.max(rx - 4, 8)}
        stroke={`url(#${ids.frameGradientId})`}
        strokeWidth='1.5'
        width={width - 12}
        x={x + 6}
        y={y + 6}
      />
    </>
  );
}
