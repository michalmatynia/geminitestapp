import React from 'react';
import {
  type KangurAnimationSurfaceIdsDto,
  type KangurAnimationSurfacePropsDto,
  useKangurAnimationSurfaceIds,
} from '../animation-surface-contracts';

export type LabelChipProps = {
  fill: string;
  label: string;
  stroke: string;
  textFill?: string;
  width?: number;
  x: number;
  y: number;
};

export function useAddingSurfaceIds(prefix: string): KangurAnimationSurfaceIdsDto {
  return useKangurAnimationSurfaceIds(prefix);
}

export function AddingSurface({
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
}: KangurAnimationSurfacePropsDto): React.JSX.Element {
  return (
    <>
      <defs>
        <clipPath id={ids.clipId}>
          <rect x={x} y={y} width={width} height={height} rx={rx} />
        </clipPath>
        <linearGradient
          id={ids.panelGradientId}
          x1={x}
          x2={x + width}
          y1={y}
          y2={y + height}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='50%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor={accentEnd} />
        </linearGradient>
        <linearGradient
          id={ids.frameGradientId}
          x1={x}
          x2={x + width}
          y1={y}
          y2={y}
          gradientUnits='userSpaceOnUse'
        >
          <stop offset='0%' stopColor={accentStart} stopOpacity='0.72' />
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
          cy={y + height * 0.2}
          fill={atmosphereA}
          rx={width * 0.22}
          ry={height * 0.18}
        />
        <ellipse
          cx={x + width * 0.8}
          cy={y + height * 0.86}
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

export function LabelChip({
  fill,
  label,
  stroke,
  textFill = '#0f172a',
  width = 88,
  x,
  y,
}: LabelChipProps): React.JSX.Element {
  return (
    <g>
      <rect fill={fill} height='26' rx='13' stroke={stroke} strokeWidth='1.5' width={width} x={x} y={y} />
      <text fill={textFill} fontSize='12' fontWeight='700' textAnchor='middle' x={x + width / 2} y={y + 17}>
        {label}
      </text>
    </g>
  );
}
