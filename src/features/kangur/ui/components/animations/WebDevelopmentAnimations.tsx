import React from 'react';
import {
  type KangurAnimationSurfaceIdsDto,
  type KangurAnimationSurfacePropsDto,
  useKangurAnimationSurfaceIds,
} from './animation-surface-contracts';

type WebDevelopmentSurfaceIds = KangurAnimationSurfaceIdsDto;

type WebDevelopmentSurfaceProps = KangurAnimationSurfacePropsDto;

function useWebDevelopmentSurfaceIds(prefix: string): WebDevelopmentSurfaceIds {
  return useKangurAnimationSurfaceIds(prefix);
}

function WebDevelopmentSurface({
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
}: WebDevelopmentSurfaceProps): React.JSX.Element {
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
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='55%' stopColor='#eff6ff' />
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
        <ellipse cx={x + width * 0.2} cy={y + height * 0.18} fill={atmosphereA} rx={width * 0.22} ry={height * 0.16} />
        <ellipse cx={x + width * 0.84} cy={y + height * 0.88} fill={atmosphereB} rx={width * 0.34} ry={height * 0.22} />
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

export function ReactSuspenseFallbackAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-suspense-fallback');

  return (
    <svg
      aria-label='Animacja: Suspense przełącza fallback na gotową treść.'
      className='h-auto w-full'
      data-testid='webdev-suspense-fallback-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-panel-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-panel-muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-panel-accent { fill: #38bdf8; }
        .webdev-panel-soft { fill: rgba(148, 163, 184, 0.4); }
        .webdev-suspense-fallback-group { animation: webdevFadeOut 4.6s ease-in-out infinite; }
        .webdev-suspense-content-group { animation: webdevFadeIn 4.6s ease-in-out infinite; }
        @keyframes webdevFadeOut {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes webdevFadeIn {
          0%, 55% { opacity: 0; }
          65%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-suspense-fallback-group,
          .webdev-suspense-content-group { animation: none; opacity: 1; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#dbeafe'
        accentStart='#38bdf8'
        atmosphereA='rgba(56, 189, 248, 0.08)'
        atmosphereB='rgba(14, 165, 233, 0.08)'
        ids={surfaceIds}
        stroke='rgba(56, 189, 248, 0.12)'
        testIdPrefix='webdev-suspense-fallback'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-panel-title' x='34' y='42'>Suspense</text>
      <g className='webdev-suspense-fallback-group'>
        <rect className='webdev-panel-accent' height='8' rx='4' width='70' x='34' y='56' />
        <text className='webdev-panel-muted' x='34' y='82'>Loading...</text>
        <rect className='webdev-panel-soft' height='6' rx='3' width='180' x='34' y='96' />
        <rect className='webdev-panel-soft' height='6' rx='3' width='140' x='34' y='108' />
      </g>
      <g className='webdev-suspense-content-group'>
        <rect className='webdev-panel-accent' height='8' rx='4' width='80' x='34' y='56' />
        <text className='webdev-panel-muted' x='34' y='82'>Albums loaded</text>
        <rect className='webdev-panel-soft' height='6' rx='3' width='190' x='34' y='96' />
        <rect className='webdev-panel-soft' height='6' rx='3' width='150' x='34' y='108' />
      </g>
    </svg>
  );
}

export function ReactSuspenseNestedRevealAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-suspense-nested');

  return (
    <svg
      aria-label='Animacja: zagnieżdżone granice Suspense odsłaniają treść stopniowo.'
      className='h-auto w-full'
      data-testid='webdev-suspense-nested-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-suspense-nested-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-suspense-nested-muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-suspense-nested-block { fill: rgba(148, 163, 184, 0.42); }
        .webdev-suspense-nested-primary { animation: webdevRevealPrimary 4.4s ease-in-out infinite; }
        .webdev-suspense-nested-secondary { animation: webdevRevealSecondary 4.4s ease-in-out infinite; }
        .webdev-suspense-nested-fallback { animation: webdevRevealFallback 4.4s ease-in-out infinite; }
        .webdev-suspense-nested-together { animation: webdevRevealTogether 4.4s ease-in-out infinite; }
        @keyframes webdevRevealPrimary {
          0%, 35% { opacity: 0.25; }
          45%, 100% { opacity: 1; }
        }
        @keyframes webdevRevealSecondary {
          0%, 55% { opacity: 0.2; }
          70%, 100% { opacity: 1; }
        }
        @keyframes webdevRevealFallback {
          0%, 45% { opacity: 1; }
          60%, 100% { opacity: 0; }
        }
        @keyframes webdevRevealTogether {
          0%, 45% { opacity: 0.25; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-suspense-nested-primary,
          .webdev-suspense-nested-secondary,
          .webdev-suspense-nested-fallback,
          .webdev-suspense-nested-together { animation: none; opacity: 1; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#e0e7ff'
        accentStart='#818cf8'
        atmosphereA='rgba(129, 140, 248, 0.08)'
        atmosphereB='rgba(56, 189, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(129, 140, 248, 0.12)'
        testIdPrefix='webdev-suspense-nested'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-suspense-nested-title' x='34' y='42'>Suspense</text>
      <text className='webdev-suspense-nested-muted' x='34' y='60'>together</text>
      <text className='webdev-suspense-nested-muted' x='206' y='60'>nested</text>
      <g className='webdev-suspense-nested-together'>
        <rect className='webdev-suspense-nested-block' height='10' rx='5' width='110' x='34' y='74' />
        <rect className='webdev-suspense-nested-block' height='10' rx='5' width='90' x='34' y='90' />
        <rect className='webdev-suspense-nested-block' height='10' rx='5' width='60' x='150' y='74' />
        <rect className='webdev-suspense-nested-block' height='10' rx='5' width='48' x='150' y='90' />
      </g>
      <g className='webdev-suspense-nested-primary'>
        <rect className='webdev-suspense-nested-block' height='10' rx='5' width='110' x='206' y='74' />
        <rect className='webdev-suspense-nested-block' height='10' rx='5' width='90' x='206' y='90' />
      </g>
      <g className='webdev-suspense-nested-secondary'>
        <rect className='webdev-suspense-nested-block' height='10' rx='5' width='60' x='286' y='74' />
        <rect className='webdev-suspense-nested-block' height='10' rx='5' width='48' x='286' y='90' />
      </g>
      <g className='webdev-suspense-nested-fallback'>
        <rect height='18' rx='9' width='58' x='284' y='70' fill='#bae6fd' />
        <text className='webdev-suspense-nested-muted' x='290' y='84'>Load</text>
      </g>
    </svg>
  );
}

export function ReactActivityToggleAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-activity-toggle');

  return (
    <svg
      aria-label='Animacja: Activity ukrywa i przywraca zawartość.'
      className='h-auto w-full'
      data-testid='webdev-activity-toggle-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-activity-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-activity-muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-activity-chip { fill: #bae6fd; }
        .webdev-activity-soft { fill: rgba(148, 163, 184, 0.4); }
        .webdev-activity-visible { animation: webdevActivityVisible 4.4s ease-in-out infinite; }
        .webdev-activity-hidden { animation: webdevActivityHidden 4.4s ease-in-out infinite; }
        @keyframes webdevActivityVisible {
          0%, 40% { opacity: 1; }
          50%, 90% { opacity: 0.25; }
          100% { opacity: 1; }
        }
        @keyframes webdevActivityHidden {
          0%, 40% { opacity: 0; }
          50%, 90% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-activity-visible,
          .webdev-activity-hidden { animation: none; opacity: 1; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#cffafe'
        accentStart='#06b6d4'
        atmosphereA='rgba(6, 182, 212, 0.08)'
        atmosphereB='rgba(56, 189, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(6, 182, 212, 0.12)'
        testIdPrefix='webdev-activity-toggle'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-activity-title' x='34' y='42'>Activity</text>
      <g className='webdev-activity-visible'>
        <rect className='webdev-activity-chip' height='8' rx='4' width='70' x='34' y='56' />
        <text className='webdev-activity-muted' x='34' y='82'>Sidebar visible</text>
        <rect className='webdev-activity-soft' height='6' rx='3' width='170' x='34' y='96' />
        <rect className='webdev-activity-soft' height='6' rx='3' width='120' x='34' y='108' />
      </g>
      <g className='webdev-activity-hidden'>
        <rect className='webdev-activity-chip' height='8' rx='4' width='70' x='34' y='56' />
        <text className='webdev-activity-muted' x='34' y='82'>Sidebar hidden</text>
        <rect className='webdev-activity-soft' height='6' rx='3' width='170' x='34' y='96' />
        <rect className='webdev-activity-soft' height='6' rx='3' width='120' x='34' y='108' />
      </g>
    </svg>
  );
}

export function ReactFragmentGroupAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-fragment-group');

  return (
    <svg
      aria-label='Animacja: Fragment grupuje elementy bez wrappera.'
      className='h-auto w-full'
      data-testid='webdev-fragment-group-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-fragment-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-fragment-muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-fragment-node { fill: rgba(148, 163, 184, 0.4); }
        .webdev-fragment-wrap { fill: rgba(254, 243, 199, 0.9); stroke: #f59e0b; stroke-width: 2; }
        .webdev-fragment-label {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #92400e;
        }
        .webdev-fragment-with-wrapper { animation: webdevFadeOut 4.6s ease-in-out infinite; }
        .webdev-fragment-no-wrapper { animation: webdevFadeIn 4.6s ease-in-out infinite; }
        @keyframes webdevFadeOut {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes webdevFadeIn {
          0%, 55% { opacity: 0; }
          65%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-fragment-with-wrapper,
          .webdev-fragment-no-wrapper { animation: none; opacity: 1; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#fef3c7'
        accentStart='#f59e0b'
        atmosphereA='rgba(245, 158, 11, 0.08)'
        atmosphereB='rgba(56, 189, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(245, 158, 11, 0.12)'
        testIdPrefix='webdev-fragment-group'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-fragment-title' x='34' y='42'>Fragment</text>
      <g className='webdev-fragment-with-wrapper'>
        <text className='webdev-fragment-muted' x='34' y='62'>With wrapper</text>
        <rect className='webdev-fragment-wrap' height='30' rx='12' width='270' x='30' y='70' />
        <text className='webdev-fragment-label' x='42' y='88'>{'<div>'}</text>
        <rect className='webdev-fragment-node' height='12' rx='6' width='60' x='98' y='78' />
        <rect className='webdev-fragment-node' height='12' rx='6' width='60' x='166' y='78' />
        <rect className='webdev-fragment-node' height='12' rx='6' width='60' x='234' y='78' />
      </g>
      <g className='webdev-fragment-no-wrapper'>
        <text className='webdev-fragment-muted' x='34' y='62'>With Fragment</text>
        <rect className='webdev-fragment-node' height='16' rx='8' width='80' x='34' y='78' />
        <rect className='webdev-fragment-node' height='16' rx='8' width='80' x='124' y='78' />
        <rect className='webdev-fragment-node' height='16' rx='8' width='80' x='214' y='78' />
      </g>
    </svg>
  );
}

export function ReactProfilerTimingAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-profiler-timing');

  return (
    <svg
      aria-label='Animacja: Profiler porównuje czasy renderu.'
      className='h-auto w-full'
      data-testid='webdev-profiler-timing-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-profiler-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-profiler-muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-profiler-bar-base {
          fill: #c7d2fe;
          animation: webdevProfilerBase 4.4s ease-in-out infinite;
        }
        .webdev-profiler-bar-actual {
          fill: #38bdf8;
          animation: webdevProfilerActual 4.4s ease-in-out infinite;
        }
        .webdev-profiler-grid { stroke: rgba(226, 232, 240, 0.9); stroke-width: 1; }
        @keyframes webdevProfilerBase {
          0%, 45% { opacity: 0.7; }
          55%, 100% { opacity: 0.95; }
        }
        @keyframes webdevProfilerActual {
          0%, 45% { opacity: 0.95; }
          55%, 100% { opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-profiler-bar-base,
          .webdev-profiler-bar-actual { animation: none; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#e0e7ff'
        accentStart='#818cf8'
        atmosphereA='rgba(129, 140, 248, 0.08)'
        atmosphereB='rgba(56, 189, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(129, 140, 248, 0.12)'
        testIdPrefix='webdev-profiler-timing'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-profiler-title' x='34' y='42'>Profiler</text>
      <text className='webdev-profiler-muted' x='34' y='58'>actualDuration vs baseDuration</text>
      <line className='webdev-profiler-grid' x1='34' y1='102' x2='300' y2='102' />
      <line className='webdev-profiler-grid' x1='34' y1='88' x2='300' y2='88' />
      <line className='webdev-profiler-grid' x1='34' y1='74' x2='300' y2='74' />
      <rect className='webdev-profiler-bar-base' height='34' rx='6' width='48' x='58' y='68' />
      <rect className='webdev-profiler-bar-actual' height='22' rx='6' width='48' x='58' y='80' />
      <rect className='webdev-profiler-bar-base' height='28' rx='6' width='48' x='128' y='74' />
      <rect className='webdev-profiler-bar-actual' height='16' rx='6' width='48' x='128' y='86' />
      <rect className='webdev-profiler-bar-base' height='30' rx='6' width='48' x='198' y='72' />
      <rect className='webdev-profiler-bar-actual' height='18' rx='6' width='48' x='198' y='84' />
      <rect className='webdev-profiler-bar-base' height='26' rx='6' width='48' x='268' y='76' />
      <rect className='webdev-profiler-bar-actual' height='14' rx='6' width='48' x='268' y='88' />
    </svg>
  );
}

export function ReactStrictModeCycleAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-strictmode-cycle');

  return (
    <svg
      aria-label='Animacja: StrictMode uruchamia dodatkowe cykle.'
      className='h-auto w-full'
      data-testid='webdev-strictmode-cycle-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-strictmode-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-strictmode-muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-strictmode-step { fill: #e0f2fe; stroke: #38bdf8; stroke-width: 2; }
        .webdev-strictmode-active { animation: webdevStrictModeGlow 3.8s ease-in-out infinite; }
        @keyframes webdevStrictModeGlow {
          0%, 100% { opacity: 0.4; }
          35% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-strictmode-active { animation: none; opacity: 1; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#cffafe'
        accentStart='#06b6d4'
        atmosphereA='rgba(6, 182, 212, 0.08)'
        atmosphereB='rgba(56, 189, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(6, 182, 212, 0.12)'
        testIdPrefix='webdev-strictmode-cycle'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-strictmode-title' x='34' y='42'>StrictMode</text>
      <text className='webdev-strictmode-muted' x='34' y='58'>setup → cleanup → setup</text>
      <g transform='translate(34, 74)'>
        <rect className='webdev-strictmode-step webdev-strictmode-active' height='18' rx='8' width='76' x='0' y='0' />
        <text className='webdev-strictmode-muted' x='10' y='13'>setup</text>
        <rect className='webdev-strictmode-step webdev-strictmode-active' height='18' rx='8' width='86' x='92' y='0' style={{ animationDelay: '1.2s' }} />
        <text className='webdev-strictmode-muted' x='102' y='13'>cleanup</text>
        <rect className='webdev-strictmode-step webdev-strictmode-active' height='18' rx='8' width='76' x='194' y='0' style={{ animationDelay: '2.4s' }} />
        <text className='webdev-strictmode-muted' x='204' y='13'>setup</text>
      </g>
    </svg>
  );
}

export function ReactStrictModeDoubleRenderAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-strictmode-double-render');

  return (
    <svg
      aria-label='Animacja: StrictMode podwaja render w dev.'
      className='h-auto w-full'
      data-testid='webdev-strictmode-double-render-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-strictmode-double-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-strictmode-double-muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-strictmode-double-card { fill: #eef2ff; stroke: #a5b4fc; stroke-width: 2; }
        .webdev-strictmode-double-a { animation: webdevRenderA 3.6s ease-in-out infinite; }
        .webdev-strictmode-double-b { animation: webdevRenderB 3.6s ease-in-out infinite; }
        .webdev-strictmode-double-warn {
          fill: #fecaca;
          stroke: #f87171;
          stroke-width: 1.5;
          animation: webdevWarnPulse 3.6s ease-in-out infinite;
        }
        .webdev-strictmode-double-warn-text {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #b91c1c;
          animation: webdevWarnPulse 3.6s ease-in-out infinite;
        }
        @keyframes webdevRenderA {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0.35; }
        }
        @keyframes webdevRenderB {
          0%, 55% { opacity: 0.35; }
          65%, 100% { opacity: 1; }
        }
        @keyframes webdevWarnPulse {
          0%, 60% { opacity: 0; transform: translateY(2px); }
          70%, 100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-strictmode-double-a,
          .webdev-strictmode-double-b,
          .webdev-strictmode-double-warn,
          .webdev-strictmode-double-warn-text { animation: none; opacity: 1; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#fde2e8'
        accentStart='#f472b6'
        atmosphereA='rgba(244, 114, 182, 0.08)'
        atmosphereB='rgba(129, 140, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(244, 114, 182, 0.12)'
        testIdPrefix='webdev-strictmode-double-render'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-strictmode-double-title' x='34' y='42'>StrictMode</text>
      <text className='webdev-strictmode-double-muted' x='34' y='58'>double render (dev only)</text>
      <g transform='translate(34, 72)'>
        <rect className='webdev-strictmode-double-card webdev-strictmode-double-a' height='18' rx='8' width='120' />
        <text className='webdev-strictmode-double-muted webdev-strictmode-double-a' x='12' y='13'>render pass 1</text>
        <rect className='webdev-strictmode-double-card webdev-strictmode-double-b' height='18' rx='8' width='120' x='140' />
        <text className='webdev-strictmode-double-muted webdev-strictmode-double-b' x='152' y='13'>render pass 2</text>
      </g>
      <g transform='translate(34, 100)'>
        <rect className='webdev-strictmode-double-warn' height='18' rx='8' width='220' />
        <text className='webdev-strictmode-double-warn-text' x='10' y='13'>Duplicate key warning</text>
      </g>
    </svg>
  );
}

export function ReactFragmentKeyListAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-fragment-key-list');

  return (
    <svg
      aria-label='Animacja: lista Fragmentów z kluczami.'
      className='h-auto w-full'
      data-testid='webdev-fragment-key-list-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-fragment-key-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-fragment-key-muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-fragment-key-row { fill: rgba(148, 163, 184, 0.4); }
        .webdev-fragment-key-chip { fill: #dbeafe; stroke: #60a5fa; stroke-width: 1.5; }
        .webdev-fragment-key-pulse { animation: webdevKeyPulse 3.2s ease-in-out infinite; }
        @keyframes webdevKeyPulse {
          0%, 70% { opacity: 0.6; }
          85%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-fragment-key-pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#dbeafe'
        accentStart='#60a5fa'
        atmosphereA='rgba(96, 165, 250, 0.08)'
        atmosphereB='rgba(129, 140, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(96, 165, 250, 0.12)'
        testIdPrefix='webdev-fragment-key-list'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-fragment-key-title' x='34' y='42'>Fragment</text>
      <text className='webdev-fragment-key-muted' x='34' y='58'>key required in lists</text>
      {[0, 1, 2].map((index) => (
        <g key={`row-${index}`} transform={`translate(34, ${74 + index * 16})`}>
          <rect className='webdev-fragment-key-row' height='10' rx='5' width='150' />
          <rect className='webdev-fragment-key-chip webdev-fragment-key-pulse' height='10' rx='5' width='44' x='168' />
        </g>
      ))}
    </svg>
  );
}

export function ReactProfilerMultiBoundaryAnimation(): React.JSX.Element {
  const surfaceIds = useWebDevelopmentSurfaceIds('webdev-profiler-multi-boundary');

  return (
    <svg
      aria-label='Animacja: wiele profilerów dla różnych sekcji.'
      className='h-auto w-full'
      data-testid='webdev-profiler-multi-boundary-animation'
      role='img'
      viewBox='0 0 360 150'
    >
      <style>{`
        .webdev-profiler-multi-title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .webdev-profiler-multi-muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .webdev-profiler-multi-chip { fill: #ede9fe; stroke: #a78bfa; stroke-width: 1.5; }
        .webdev-profiler-multi-bar { fill: #38bdf8; animation: webdevMultiBar 3.4s ease-in-out infinite; }
        .webdev-profiler-multi-bar-alt {
          fill: #c7d2fe;
          animation: webdevMultiBar 3.4s ease-in-out infinite;
          animation-delay: 1s;
        }
        @keyframes webdevMultiBar {
          0%, 40% { opacity: 0.5; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .webdev-profiler-multi-bar,
          .webdev-profiler-multi-bar-alt { animation: none; opacity: 1; }
        }
      `}</style>
      <WebDevelopmentSurface
        accentEnd='#ede9fe'
        accentStart='#8b5cf6'
        atmosphereA='rgba(139, 92, 246, 0.08)'
        atmosphereB='rgba(56, 189, 248, 0.08)'
        ids={surfaceIds}
        stroke='rgba(139, 92, 246, 0.12)'
        testIdPrefix='webdev-profiler-multi-boundary'
        x={12}
        y={12}
        width={336}
        height={126}
        rx={24}
      />
      <text className='webdev-profiler-multi-title' x='34' y='42'>Profiler</text>
      <text className='webdev-profiler-multi-muted' x='34' y='58'>multiple boundaries</text>
      <g transform='translate(34, 74)'>
        <rect className='webdev-profiler-multi-chip' height='12' rx='6' width='64' />
        <text className='webdev-profiler-multi-muted' x='10' y='10'>Sidebar</text>
        <rect className='webdev-profiler-multi-bar' height='10' rx='5' width='70' x='80' y='1' />
      </g>
      <g transform='translate(34, 96)'>
        <rect className='webdev-profiler-multi-chip' height='12' rx='6' width='64' />
        <text className='webdev-profiler-multi-muted' x='10' y='10'>Content</text>
        <rect className='webdev-profiler-multi-bar-alt' height='10' rx='5' width='110' x='80' y='1' />
      </g>
    </svg>
  );
}
