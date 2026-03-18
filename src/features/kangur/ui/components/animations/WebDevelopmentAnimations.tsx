import React from 'react';

export function ReactSuspenseFallbackAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: Suspense przełącza fallback na gotową treść.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .accent {
          fill: #38bdf8;
        }
        .fallback { animation: fadeOut 4.6s ease-in-out infinite; }
        .content { animation: fadeIn 4.6s ease-in-out infinite; }
        @keyframes fadeOut {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes fadeIn {
          0%, 55% { opacity: 0; }
          65%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fallback, .content { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>Suspense</text>
      <g className='fallback'>
        <rect className='accent' height='8' rx='4' width='70' x='40' y='56' />
        <text className='muted' x='40' y='80'>Loading...</text>
        <rect className='muted' height='6' rx='3' width='180' x='40' y='92' />
        <rect className='muted' height='6' rx='3' width='140' x='40' y='104' />
      </g>
      <g className='content'>
        <rect className='accent' height='8' rx='4' width='80' x='40' y='56' />
        <text className='muted' x='40' y='80'>Albums loaded</text>
        <rect className='muted' height='6' rx='3' width='190' x='40' y='92' />
        <rect className='muted' height='6' rx='3' width='150' x='40' y='104' />
      </g>
    </svg>
  );
}

export function ReactSuspenseNestedRevealAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: zagnieżdżone granice Suspense odsłaniają treść stopniowo.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .block {
          fill: #e2e8f0;
        }
        .primary { animation: revealPrimary 4.4s ease-in-out infinite; }
        .secondary { animation: revealSecondary 4.4s ease-in-out infinite; }
        .fallback { animation: revealFallback 4.4s ease-in-out infinite; }
        .together { animation: revealTogether 4.4s ease-in-out infinite; }
        @keyframes revealPrimary {
          0%, 35% { opacity: 0.25; }
          45%, 100% { opacity: 1; }
        }
        @keyframes revealSecondary {
          0%, 55% { opacity: 0.2; }
          70%, 100% { opacity: 1; }
        }
        @keyframes revealFallback {
          0%, 45% { opacity: 1; }
          60%, 100% { opacity: 0; }
        }
        @keyframes revealTogether {
          0%, 45% { opacity: 0.25; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .primary, .secondary, .fallback, .together { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>Suspense</text>
      <text className='muted' x='40' y='62'>together</text>
      <text className='muted' x='210' y='62'>nested</text>
      <g className='together'>
        <rect className='block' height='10' rx='5' width='110' x='40' y='76' />
        <rect className='block' height='10' rx='5' width='90' x='40' y='92' />
        <rect className='block' height='10' rx='5' width='60' x='155' y='76' />
        <rect className='block' height='10' rx='5' width='48' x='155' y='92' />
      </g>
      <g className='primary'>
        <rect className='block' height='10' rx='5' width='110' x='210' y='76' />
        <rect className='block' height='10' rx='5' width='90' x='210' y='92' />
      </g>
      <g className='secondary'>
        <rect className='block' height='10' rx='5' width='60' x='290' y='76' />
        <rect className='block' height='10' rx='5' width='48' x='290' y='92' />
      </g>
      <g className='fallback'>
        <rect height='18' rx='9' width='58' x='288' y='72' fill='#bae6fd' />
        <text className='muted' x='294' y='85'>Load</text>
      </g>
    </svg>
  );
}

export function ReactActivityToggleAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: Activity ukrywa i przywraca zawartość.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .chip {
          fill: #bae6fd;
        }
        .visible { animation: visibleIn 4.4s ease-in-out infinite; }
        .hidden { animation: hiddenIn 4.4s ease-in-out infinite; }
        @keyframes visibleIn {
          0%, 40% { opacity: 1; }
          50%, 90% { opacity: 0.25; }
          100% { opacity: 1; }
        }
        @keyframes hiddenIn {
          0%, 40% { opacity: 0; }
          50%, 90% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .visible, .hidden { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>Activity</text>
      <g className='visible'>
        <rect className='chip' height='8' rx='4' width='70' x='40' y='56' />
        <text className='muted' x='40' y='78'>Sidebar visible</text>
        <rect className='muted' height='6' rx='3' width='170' x='40' y='92' />
        <rect className='muted' height='6' rx='3' width='120' x='40' y='104' />
      </g>
      <g className='hidden'>
        <rect className='chip' height='8' rx='4' width='70' x='40' y='56' />
        <text className='muted' x='40' y='78'>Sidebar hidden</text>
        <rect className='muted' height='6' rx='3' width='170' x='40' y='92' />
        <rect className='muted' height='6' rx='3' width='120' x='40' y='104' />
      </g>
    </svg>
  );
}

export function ReactFragmentGroupAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: Fragment grupuje elementy bez wrappera.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .node {
          fill: #e2e8f0;
        }
        .wrap {
          fill: #fef3c7;
          stroke: #f59e0b;
          stroke-width: 2;
        }
        .label {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #92400e;
        }
        .with-wrapper { animation: fadeOut 4.6s ease-in-out infinite; }
        .no-wrapper { animation: fadeIn 4.6s ease-in-out infinite; }
        @keyframes fadeOut {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes fadeIn {
          0%, 55% { opacity: 0; }
          65%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .with-wrapper, .no-wrapper { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>Fragment</text>
      <g className='with-wrapper'>
        <text className='muted' x='40' y='62'>With wrapper</text>
        <rect className='wrap' height='30' rx='12' width='270' x='35' y='66' />
        <text className='label' x='44' y='84'>{'<div>'}</text>
        <rect className='node' height='12' rx='6' width='60' x='100' y='74' />
        <rect className='node' height='12' rx='6' width='60' x='168' y='74' />
        <rect className='node' height='12' rx='6' width='60' x='236' y='74' />
      </g>
      <g className='no-wrapper'>
        <text className='muted' x='40' y='62'>With Fragment</text>
        <rect className='node' height='16' rx='8' width='80' x='40' y='74' />
        <rect className='node' height='16' rx='8' width='80' x='130' y='74' />
        <rect className='node' height='16' rx='8' width='80' x='220' y='74' />
      </g>
    </svg>
  );
}

export function ReactProfilerTimingAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: Profiler porównuje czasy renderu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .bar-base {
          fill: #c7d2fe;
          animation: pulseBase 4.4s ease-in-out infinite;
        }
        .bar-actual {
          fill: #38bdf8;
          animation: pulseActual 4.4s ease-in-out infinite;
        }
        .grid {
          stroke: #e2e8f0;
          stroke-width: 1;
        }
        @keyframes pulseBase {
          0%, 45% { opacity: 0.7; }
          55%, 100% { opacity: 0.95; }
        }
        @keyframes pulseActual {
          0%, 45% { opacity: 0.95; }
          55%, 100% { opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bar-base, .bar-actual { animation: none; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>Profiler</text>
      <text className='muted' x='40' y='60'>actualDuration vs baseDuration</text>
      <line className='grid' x1='40' y1='100' x2='300' y2='100' />
      <line className='grid' x1='40' y1='88' x2='300' y2='88' />
      <line className='grid' x1='40' y1='76' x2='300' y2='76' />
      <rect className='bar-base' height='34' rx='6' width='48' x='60' y='66' />
      <rect className='bar-actual' height='22' rx='6' width='48' x='60' y='78' />
      <rect className='bar-base' height='28' rx='6' width='48' x='130' y='72' />
      <rect className='bar-actual' height='16' rx='6' width='48' x='130' y='84' />
      <rect className='bar-base' height='30' rx='6' width='48' x='200' y='70' />
      <rect className='bar-actual' height='18' rx='6' width='48' x='200' y='82' />
      <rect className='bar-base' height='26' rx='6' width='48' x='270' y='74' />
      <rect className='bar-actual' height='14' rx='6' width='48' x='270' y='86' />
    </svg>
  );
}

export function ReactStrictModeCycleAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: StrictMode uruchamia dodatkowe cykle.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .step {
          fill: #e0f2fe;
          stroke: #38bdf8;
          stroke-width: 2;
        }
        .active {
          animation: glow 3.8s ease-in-out infinite;
        }
        @keyframes glow {
          0%, 100% { opacity: 0.4; }
          35% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .active { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>StrictMode</text>
      <text className='muted' x='40' y='62'>setup → cleanup → setup</text>
      <g transform='translate(40, 72)'>
        <rect className='step active' height='18' rx='8' width='76' x='0' y='0' />
        <text className='muted' x='10' y='13'>setup</text>
        <rect className='step active' height='18' rx='8' width='86' x='92' y='0' style={{ animationDelay: '1.2s' }} />
        <text className='muted' x='102' y='13'>cleanup</text>
        <rect className='step active' height='18' rx='8' width='76' x='194' y='0' style={{ animationDelay: '2.4s' }} />
        <text className='muted' x='204' y='13'>setup</text>
      </g>
    </svg>
  );
}

export function ReactStrictModeDoubleRenderAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: StrictMode podwaja render w dev.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .card {
          fill: #eef2ff;
          stroke: #a5b4fc;
          stroke-width: 2;
        }
        .pulse-a { animation: renderA 3.6s ease-in-out infinite; }
        .pulse-b { animation: renderB 3.6s ease-in-out infinite; }
        .warn {
          fill: #fecaca;
          stroke: #f87171;
          stroke-width: 1.5;
          animation: warnPulse 3.6s ease-in-out infinite;
        }
        .warn-text {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #b91c1c;
          animation: warnPulse 3.6s ease-in-out infinite;
        }
        @keyframes renderA {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0.35; }
        }
        @keyframes renderB {
          0%, 55% { opacity: 0.35; }
          65%, 100% { opacity: 1; }
        }
        @keyframes warnPulse {
          0%, 60% { opacity: 0; transform: translateY(2px); }
          70%, 100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-a, .pulse-b, .warn, .warn-text { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>StrictMode</text>
      <text className='muted' x='40' y='62'>double render (dev only)</text>
      <g transform='translate(40, 72)'>
        <rect className='card pulse-a' height='18' rx='8' width='120' />
        <text className='muted pulse-a' x='12' y='13'>render pass 1</text>
        <rect className='card pulse-b' height='18' rx='8' width='120' x='140' />
        <text className='muted pulse-b' x='152' y='13'>render pass 2</text>
      </g>
      <g transform='translate(40, 100)'>
        <rect className='warn' height='18' rx='8' width='210' />
        <text className='warn-text' x='10' y='13'>⚠️ Duplicate key warning</text>
      </g>
    </svg>
  );
}

export function ReactFragmentKeyListAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: lista Fragmentów z kluczami.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .row {
          fill: #e2e8f0;
        }
        .key {
          fill: #dbeafe;
          stroke: #60a5fa;
          stroke-width: 1.5;
        }
        .pulse { animation: keyPulse 3.2s ease-in-out infinite; }
        @keyframes keyPulse {
          0%, 70% { opacity: 0.6; }
          85%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>Fragment</text>
      <text className='muted' x='40' y='62'>key required in lists</text>
      {[0, 1, 2].map((index) => (
        <g key={`row-${index}`} transform={`translate(40, ${72 + index * 16})`}>
          <rect className='row' height='10' rx='5' width='150' />
          <rect className='key pulse' height='10' rx='5' width='44' x='168' />
        </g>
      ))}
    </svg>
  );
}

export function ReactProfilerMultiBoundaryAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: wiele profilerów dla różnych sekcji.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .title {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .chip {
          fill: #ede9fe;
          stroke: #a78bfa;
          stroke-width: 1.5;
        }
        .bar {
          fill: #38bdf8;
          animation: barPulse 3.4s ease-in-out infinite;
        }
        .bar-alt {
          fill: #c7d2fe;
          animation: barPulse 3.4s ease-in-out infinite;
          animation-delay: 1s;
        }
        @keyframes barPulse {
          0%, 40% { opacity: 0.5; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bar, .bar-alt { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='320' x='20' y='20' />
      <text className='title' x='40' y='44'>Profiler</text>
      <text className='muted' x='40' y='62'>multiple boundaries</text>
      <g transform='translate(40, 72)'>
        <rect className='chip' height='12' rx='6' width='64' />
        <text className='muted' x='10' y='10'>Sidebar</text>
        <rect className='bar' height='10' rx='5' width='70' x='80' y='1' />
      </g>
      <g transform='translate(40, 92)'>
        <rect className='chip' height='12' rx='6' width='64' />
        <text className='muted' x='10' y='10'>Content</text>
        <rect className='bar-alt' height='10' rx='5' width='110' x='80' y='1' />
      </g>
    </svg>
  );
}
