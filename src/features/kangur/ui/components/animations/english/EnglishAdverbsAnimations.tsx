import React from 'react';
import { useEnglishAnimationSurfaceIds } from './EnglishAnimationSurface';
import { cn } from '@/features/kangur/shared/utils';

export function EnglishAdverbFrequencyScaleAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-frequency-scale');
  const items = [
    { key: 'always', label: 'always', count: 7, fill: '#22c55e' },
    { key: 'usually', label: 'usually', count: 6, fill: '#38bdf8' },
    { key: 'sometimes', label: 'sometimes', count: 3, fill: '#f59e0b' },
    { key: 'never', label: 'never', count: 0, fill: '#fda4af' },
  ] as const;

  return (
    <svg
      aria-label='Animation: adverbs of frequency from always to never.'
      className='h-auto w-full'
      data-testid='english-adverb-frequency-scale-animation'
      role='img'
      viewBox='0 0 420 170'
    >
      <style>{`
        .panel { stroke: rgba(125, 211, 252, 0.34); stroke-width: 2; }
        .label { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .hint { font: 600 11px/1.2 "Space Grotesk", sans-serif; fill: #64748b; }
        .day { fill: #e2e8f0; stroke: #cbd5e1; stroke-width: 2; }
        .lane { fill: rgba(255, 255, 255, 0.62); stroke: rgba(255, 255, 255, 0.78); stroke-width: 1.5; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.68); stroke-width: 1.6; }
        .active { animation: dotPulse 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes dotPulse { 0%, 100% { opacity: 0.78; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .active { animation: none; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='16' width='388' height='138' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='154' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='55%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='78%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.24)' /><stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='30' x2='170' y1='32' y2='32' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#22c55e' /><stop offset='50%' stopColor='#38bdf8' /><stop offset='100%' stopColor='#f59e0b' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='138' rx='24' />
        <g data-testid='english-adverb-frequency-scale-atmosphere'>
          <ellipse cx='92' cy='40' fill='url(#${surfaceIds.accentGradientId})' opacity='0.14' rx='96' ry='28' />
          <ellipse cx='308' cy='132' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='124' ry='34' />
        </g>
      </g>
      <rect className='frame' data-testid='english-adverb-frequency-scale-frame' x='22' y='22' width='376' height='126' rx='20' />
      {items.map((item, index) => (
        <g key={item.key} transform={`translate(34, ${36 + index * 28})`}>
          <rect className='lane' x='-8' y='-14' width='344' height='24' rx='12' />
          <text className='label' x='0' y='10'>{item.label}</text>
          <text className='hint' x='86' y='10'>{item.count}/7 days</text>
          {Array.from({ length: 7 }).map((_, dIdx) => (
            <circle key={`${item.key}-${dIdx}`} className={dIdx < item.count ? 'day active' : 'day'} cx={168 + dIdx * 28} cy='6' r='8' fill={dIdx < item.count ? item.fill : undefined} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function EnglishAdverbRoutineAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-routine');
  const rows = [
    { tag: 'always', label: 'go to the cinema', fill: '#22c55e', count: 7, cls: 'always' },
    { tag: 'usually', label: 'go with friends', fill: '#38bdf8', count: 6, cls: 'usually' },
    { tag: 'never', label: 'eat popcorn', fill: '#fda4af', count: 0, cls: 'never' },
  ] as const;

  return (
    <svg
      aria-label='Animation: a weekly routine with always, usually, and never.'
      className='h-auto w-full'
      data-testid='english-adverb-routine-animation'
      role='img'
      viewBox='0 0 420 180'
    >
      <style>{`
        .panel { stroke: rgba(251, 191, 36, 0.34); stroke-width: 2; }
        .label { font: 700 11px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .tag { font: 700 10px/1.2 "Space Grotesk", sans-serif; fill: #92400e; text-transform: uppercase; letter-spacing: 0.14em; }
        .dot { fill: #e2e8f0; stroke: #cbd5e1; stroke-width: 2; }
        .lane { fill: rgba(255, 255, 255, 0.66); stroke: rgba(255, 255, 255, 0.78); stroke-width: 1.5; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        .always { animation: rowPulse 2.8s ease-in-out infinite; }
        .usually { animation: rowPulse 3.2s ease-in-out infinite; }
        .never { animation: rowPulse 3.6s ease-in-out infinite; opacity: 0.55; }
        @keyframes rowPulse { 0%, 100% { opacity: 0.78; transform: scale(0.94); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .always, .usually, .never { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='16' width='388' height='148' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='164' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' /><stop offset='50%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='75%'>
          <stop offset='0%' stopColor='rgba(245, 158, 11, 0.22)' /><stop offset='100%' stopColor='rgba(245, 158, 11, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='34' x2='184' y1='36' y2='36' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#22c55e' /><stop offset='55%' stopColor='#38bdf8' /><stop offset='100%' stopColor='#fda4af' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='148' rx='24' />
        <g data-testid='english-adverb-routine-atmosphere'>
          <ellipse cx='92' cy='42' fill='url(#${surfaceIds.accentGradientId})' opacity='0.16' rx='96' ry='26' />
          <ellipse cx='318' cy='144' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='132' ry='30' />
        </g>
      </g>
      <rect className='frame' data-testid='english-adverb-routine-frame' x='22' y='22' width='376' height='136' rx='20' />
      {rows.map((row, idx) => (
        <g key={row.tag} transform={`translate(34, ${50 + idx * 42})`}>
          <rect className='lane' x='-10' y='-16' width='352' height='26' rx='13' />
          <text className='tag' x='0' y='0'>{row.tag}</text><text className='label' x='84' y='0'>{row.label}</text>
          {Array.from({ length: 7 }).map((_, dIdx) => (
            <circle key={`${row.tag}-${dIdx}`} className={cn('dot', dIdx < row.count && row.cls)} cx={204 + dIdx * 24} cy='-4' r='8' fill={dIdx < row.count ? row.fill : undefined} />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function EnglishAdverbWordOrderAnimation({ mode = 'mainVerb' }: { mode?: 'mainVerb' | 'beVerb' }): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds(`english-adverb-word-order-${mode}`);
  const mainVerb = mode === 'mainVerb';
  const leading = mainVerb ? 'She' : 'He';
  const adverb = mainVerb ? 'always' : 'never';
  const verb = mainVerb ? 'checks' : 'is';
  const tail = mainVerb ? 'her notes.' : 'late.';

  return (
    <svg
      aria-label='Animation: adverb position before the main verb or after be.'
      className='h-auto w-full'
      data-testid={`english-adverb-word-order-${mode}-animation`}
      role='img'
      viewBox='0 0 400 150'
    >
      <style>{`
        .panel { stroke: rgba(196, 181, 253, 0.42); stroke-width: 2; }
        .word { font: 700 13px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .chip { stroke-width: 2; stroke: rgba(196, 181, 253, 0.8); }
        .tag { font: 700 10px/1.2 "Space Grotesk", sans-serif; fill: #6d28d9; letter-spacing: 0.14em; text-transform: uppercase; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        .guide { fill: rgba(255, 255, 255, 0.58); stroke: rgba(255, 255, 255, 0.74); stroke-width: 1.4; }
        .order-line { stroke: rgba(139, 92, 246, 0.46); stroke-width: 2; stroke-dasharray: 4 6; }
        .pulse { animation: chipPulse 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes chipPulse { 0%, 100% { opacity: 0.78; transform: scale(0.96); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .pulse { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='18' y='18' width='364' height='114' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='18' x2='382' y1='18' y2='132' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f5f3ff' /><stop offset='60%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#ede9fe' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='76%'>
          <stop offset='0%' stopColor='rgba(139, 92, 246, 0.2)' /><stop offset='100%' stopColor='rgba(139, 92, 246, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#ddd6fe' /><stop offset='100%' stopColor='#c4b5fd' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='18' y='18' width='364' height='114' rx='24' />
        <g data-testid={`english-adverb-word-order-${mode}-atmosphere`}>
          <ellipse cx='96' cy='34' fill='rgba(124, 58, 237, 0.12)' rx='88' ry='24' />
          <ellipse cx='300' cy='122' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='126' ry='30' />
        </g>
      </g>
      <rect className='frame' data-testid={`english-adverb-word-order-${mode}-frame`} x='24' y='24' width='352' height='102' rx='20' />
      <rect className='guide' x='32' y='52' width='336' height='42' rx='16' />
      <text className='tag' x='34' y='42'>{mainVerb ? 'before the main verb' : 'after be'}</text>
      <line className='order-line' x1='38' x2='360' y1='72' y2='72' />
      <g transform='translate(34, 72)'>
        <text className='word' x='0' y='0'>{leading}</text>
        <rect className='chip pulse' fill={`url(#${surfaceIds.accentGradientId})`} x={mainVerb ? 54 : 44} y='-18' rx='12' width='74' height='30' />
        <text className='word' x={mainVerb ? 70 : 60} y='0'>{mainVerb ? adverb : verb}</text>
        <text className='word' x={mainVerb ? 142 : 130} y='0'>{mainVerb ? verb : adverb}</text>
        <text className='word' x={mainVerb ? 210 : 208} y='0'>{tail}</text>
      </g>
    </svg>
  );
}

export function EnglishAdverbSentenceRepairAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-sentence-repair');

  return (
    <svg
      aria-label='Animation: fixing adverb position in a sentence.'
      className='h-auto w-full'
      data-testid='english-adverb-sentence-repair-animation'
      role='img'
      viewBox='0 0 420 170'
    >
      <style>{`
        .panel { stroke: rgba(125, 211, 252, 0.34); stroke-width: 2; }
        .card { stroke-width: 2; }
        .wrong-card { stroke: #fda4af; } .right-card { stroke: #86efac; }
        .word { font: 700 13px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .tag { font: 700 10px/1.2 "Space Grotesk", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; }
        .wrong-tag { fill: #be123c; } .right-tag { fill: #15803d; }
        .chip { stroke-width: 2; }
        .wrong-chip { fill: #ffe4e6; stroke: #fda4af; }
        .right-chip { fill: #dcfce7; stroke: #86efac; }
        .arrow { stroke: #38bdf8; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; fill: none; }
        .wrong-line { animation: wrongFade 4.6s ease-in-out infinite; }
        .right-line { animation: rightFade 4.6s ease-in-out infinite; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        @keyframes wrongFade { 0%, 42% { opacity: 1; } 55%, 100% { opacity: 0.28; } }
        @keyframes rightFade { 0%, 42% { opacity: 0.35; } 55%, 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .wrong-line, .right-line { animation: none; opacity: 1; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='16' width='388' height='138' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='154' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='50%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='74%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.18)' /><stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='0' x2='1' y1='0' y2='1'><stop offset='0%' stopColor='#ffffff' /><stop offset='100%' stopColor='#f8fafc' /></linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='138' rx='24' />
        <g data-testid='english-adverb-sentence-repair-atmosphere'>
          <ellipse cx='96' cy='40' fill='rgba(248, 113, 113, 0.12)' rx='88' ry='24' />
          <ellipse cx='314' cy='136' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='130' ry='28' />
        </g>
      </g>
      <rect className='frame' data-testid='english-adverb-sentence-repair-frame' x='22' y='22' width='376' height='126' rx='20' />
      <g className='wrong-line' transform='translate(36, 38)'>
        <rect className='card wrong-card' fill={`url(#${surfaceIds.accentGradientId})`} x='0' y='0' width='154' height='82' rx='18' />
        <rect fill='none' height='74' rx='14' stroke='rgba(255, 255, 255, 0.68)' strokeWidth='1.5' width='146' x='4' y='4' />
        <text className='tag wrong-tag' x='16' y='22'>wrong order</text><text className='word' x='16' y='50'>I do</text>
        <rect className='chip wrong-chip' x='56' y='32' width='64' height='28' rx='12' /><text className='word' x='69' y='50'>always</text><text className='word' x='16' y='70'>my homework.</text>
      </g>
      <path className='arrow' d='M 212 78 C 228 68, 246 68, 262 78' /><path className='arrow' d='M 250 66 L 262 78 L 248 88' />
      <g className='right-line' transform='translate(230, 38)'>
        <rect className='card right-card' fill={`url(#${surfaceIds.accentGradientId})`} x='0' y='0' width='154' height='82' rx='18' />
        <rect fill='none' height='74' rx='14' stroke='rgba(255, 255, 255, 0.68)' strokeWidth='1.5' width='146' x='4' y='4' />
        <text className='tag right-tag' x='16' y='22'>fix it</text><text className='word' x='16' y='50'>I</text>
        <rect className='chip right-chip' x='28' y='32' width='64' height='28' rx='12' /><text className='word' x='41' y='50'>always</text><text className='word' x='101' y='50'>do</text><text className='word' x='16' y='70'>my homework.</text>
      </g>
    </svg>
  );
}

export function EnglishAdverbHabitCardAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-habit-card');
  const rows = [
    { label: 'always', fill: '#22c55e', icon: '📚', habit: 'do homework', count: 7 },
    { label: 'sometimes', fill: '#f59e0b', icon: '🌳', habit: 'go to the park', count: 3 },
    { label: 'never', fill: '#fda4af', icon: '⏰', habit: 'be late', count: 0 },
  ] as const;

  return (
    <svg
      aria-label='Animation: building a weekly habit card with adverbs of frequency.'
      className='h-auto w-full'
      data-testid='english-adverb-habit-card-animation'
      role='img'
      viewBox='0 0 420 184'
    >
      <style>{`
        .panel { stroke: rgba(125, 211, 252, 0.34); stroke-width: 2; }
        .card { stroke-width: 1.8; stroke: rgba(255, 255, 255, 0.78); }
        .tag { font: 700 10px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; letter-spacing: 0.14em; text-transform: uppercase; }
        .line { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .muted { font: 600 11px/1.2 "Space Grotesk", sans-serif; fill: #64748b; }
        .dot { fill: #e2e8f0; stroke: #cbd5e1; stroke-width: 2; }
        .dot-active { animation: habitPulse 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .badge { stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        @keyframes habitPulse { 0%, 100% { opacity: 0.78; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .dot-active { animation: none; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='16' width='388' height='152' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='168' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='55%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='38%' r='78%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.16)' /><stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='152' rx='24' />
        <g data-testid='english-adverb-habit-card-atmosphere'>
          <ellipse cx='96' cy='40' fill='rgba(34, 197, 94, 0.1)' rx='86' ry='26' />
          <ellipse cx='308' cy='150' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='128' ry='28' />
        </g>
      </g>
      <rect className='frame' data-testid='english-adverb-habit-card-frame' x='22' y='22' width='376' height='140' rx='20' />
      {rows.map((row, idx) => (
        <g key={row.label} transform={`translate(34, ${40 + idx * 40})`}>
          <rect className='card' fill='rgba(255, 255, 255, 0.66)' x='0' y='0' width='352' height='28' rx='14' />
          <rect className='badge' x='8' y='5' width='82' height='18' rx='9' fill={row.fill} stroke={row.fill} />
          <text className='tag' x='20' y='18'>{row.label}</text><text className='line' x='108' y='18'>{row.icon} {row.habit}</text>
          {Array.from({ length: 7 }).map((_, dIdx) => (
            <circle key={`${row.label}-${dIdx}`} className={cn('dot', dIdx < row.count && 'dot-active')} cx={266 + dIdx * 14} cy='14' r='5' fill={dIdx < row.count ? row.fill : undefined} style={dIdx < row.count ? { animationDelay: `${dIdx * 0.1}s` } : undefined} />
          ))}
        </g>
      ))}
      <text className='muted' x='34' y='158'>Build your own week with always, usually, sometimes, and never.</text>
    </svg>
  );
}

export function EnglishAdverbPlaceRoutineAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-place-routine');
  const places = [
    { label: 'library', fill: '#38bdf8', icon: '📚', count: 6 },
    { label: 'park', fill: '#22c55e', icon: '🌳', count: 3 },
    { label: 'swimming pool', fill: '#fda4af', icon: '🏊', count: 0 },
  ] as const;

  return (
    <svg
      aria-label='Animation: describing how often you go to different places.'
      className='h-auto w-full'
      data-testid='english-adverb-place-routine-animation'
      role='img'
      viewBox='0 0 420 188'
    >
      <style>{`
        .panel { stroke: rgba(125, 211, 252, 0.34); stroke-width: 2; }
        .card { stroke-width: 1.8; stroke: rgba(255, 255, 255, 0.78); }
        .label { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .hint { font: 600 11px/1.2 "Space Grotesk", sans-serif; fill: #64748b; }
        .dot { fill: #e2e8f0; stroke: #cbd5e1; stroke-width: 2; }
        .dot-active { animation: placePulse 3.1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .week-line { stroke: #cbd5e1; stroke-width: 2; stroke-dasharray: 3 5; }
        .frame { fill: none; stroke: rgba(255, 255, 255, 0.72); stroke-width: 1.6; }
        @keyframes placePulse { 0%, 100% { opacity: 0.8; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .dot-active { animation: none; } }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='16' width='388' height='156' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='172' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' /><stop offset='55%' stopColor='#f8fafc' /><stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='38%' r='78%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.16)' /><stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='156' rx='24' />
        <g data-testid='english-adverb-place-routine-atmosphere'>
          <ellipse cx='102' cy='40' fill='rgba(56, 189, 248, 0.1)' rx='90' ry='26' />
          <ellipse cx='310' cy='156' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='132' ry='30' />
        </g>
      </g>
      <rect className='frame' data-testid='english-adverb-place-routine-frame' x='22' y='22' width='376' height='144' rx='20' />
      {places.map((place, idx) => (
        <g key={place.label} transform={`translate(${34 + idx * 122}, 38)`}>
          <rect className='card' fill='rgba(255, 255, 255, 0.68)' x='0' y='0' width='110' height='108' rx='18' />
          <text className='label' x='14' y='24'>{place.icon} {place.label}</text>
          <text className='hint' x='14' y='42'>{place.count === 0 ? 'never' : place.count >= 6 ? 'usually' : 'sometimes'}</text>
          <line className='week-line' x1='16' y1='68' x2='94' y2='68' />
          {Array.from({ length: 7 }).map((_, dIdx) => (
            <circle key={`${place.label}-${dIdx}`} className={cn('dot', dIdx < place.count && 'dot-active')} cx={16 + dIdx * 13} cy='68' r='5' fill={dIdx < place.count ? place.fill : undefined} style={dIdx < place.count ? { animationDelay: `${dIdx * 0.08}s` } : undefined} />
          ))}
          <text className='hint' x='14' y='94'>{place.count >= 6 ? 'I usually go here.' : place.count >= 1 ? 'I sometimes go here.' : 'I never go here.'}</text>
        </g>
      ))}
    </svg>
  );
}

export function EnglishAdverbActionStyleAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-action-style');

  return (
    <svg
      aria-label='Animation: adverbs describe how an action happens.'
      className='h-auto w-full'
      data-testid='english-adverb-action-style-animation'
      role='img'
      viewBox='0 0 420 190'
    >
      <style>{`
        .panel { stroke: rgba(139, 92, 246, 0.32); stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255,255,255,0.72); stroke-width: 1.6; }
        .card { fill: rgba(255,255,255,0.7); stroke: rgba(255,255,255,0.82); stroke-width: 1.6; }
        .label { font: 700 12px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .hint { font: 600 10px/1.2 "Space Grotesk", sans-serif; fill: #64748b; }
        .runner { animation: runnerDash 1.5s ease-in-out infinite; }
        .care { animation: carefulLift 2.2s ease-in-out infinite; }
        .beauty { animation: beautyFloat 2.4s ease-in-out infinite; }
        .bad { animation: badWobble 1.3s ease-in-out infinite; }
        @keyframes runnerDash { 0%, 100% { transform: translateX(-4px); } 50% { transform: translateX(6px); } }
        @keyframes carefulLift { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes beautyFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        @keyframes badWobble { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(6deg); } }
        @media (prefers-reduced-motion: reduce) {
          .runner, .care, .beauty, .bad { animation: none; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='16' width='388' height='158' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='174' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f5f3ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='38%' r='78%'>
          <stop offset='0%' stopColor='rgba(139, 92, 246, 0.16)' />
          <stop offset='100%' stopColor='rgba(139, 92, 246, 0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='158' rx='24' />
        <g data-testid='english-adverb-action-style-atmosphere'>
          <ellipse cx='94' cy='42' fill='rgba(56, 189, 248, 0.12)' rx='86' ry='24' />
          <ellipse cx='314' cy='156' fill={`url(#${surfaceIds.atmosphereGradientId})`} opacity='0.95' rx='132' ry='30' />
        </g>
      </g>
      <rect className='frame' data-testid='english-adverb-action-style-frame' x='22' y='22' width='376' height='146' rx='20' />
      {[
        { x: 34, y: 42, label: 'run fast', cls: 'runner', fill: '#38bdf8' },
        { x: 220, y: 42, label: 'carry carefully', cls: 'care', fill: '#22c55e' },
        { x: 34, y: 110, label: 'paint beautifully', cls: 'beauty', fill: '#c084fc' },
        { x: 220, y: 110, label: 'play badly', cls: 'bad', fill: '#fb7185' },
      ].map((item, index) => (
        <g key={item.label} transform={`translate(${item.x}, ${item.y})`}>
          <rect className='card' x='0' y='0' width='166' height='52' rx='18' />
          <text className='label' x='16' y='20'>{item.label}</text>
          <g className={item.cls} data-testid={`english-adverb-action-style-card-${index}`}>
            <circle cx='38' cy='34' r='6' fill='#fcd7c0' />
            <line x1='38' y1='40' x2='38' y2='52' stroke='#334155' strokeWidth='3' strokeLinecap='round' />
            <line x1='38' y1='44' x2='28' y2='50' stroke='#334155' strokeWidth='3' strokeLinecap='round' />
            <line x1='38' y1='44' x2='48' y2='50' stroke='#334155' strokeWidth='3' strokeLinecap='round' />
            <line x1='38' y1='52' x2='28' y2='62' stroke='#334155' strokeWidth='3' strokeLinecap='round' />
            <line x1='38' y1='52' x2='48' y2='62' stroke='#334155' strokeWidth='3' strokeLinecap='round' />
            <rect x='88' y='20' width='48' height='20' rx='10' fill={item.fill} opacity='0.18' />
            <text className='hint' x='96' y='33'>{index === 0 ? 'how fast?' : index === 1 ? 'how safe?' : index === 2 ? 'how pretty?' : 'how good?'}</text>
          </g>
        </g>
      ))}
    </svg>
  );
}

export function EnglishAdverbTransformationAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-transformation');

  return (
    <svg
      aria-label='Animation: adjective words change into adverbs.'
      className='h-auto w-full'
      data-testid='english-adverb-transformation-animation'
      role='img'
      viewBox='0 0 420 190'
    >
      <style>{`
        .panel { stroke: rgba(16, 185, 129, 0.32); stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255,255,255,0.72); stroke-width: 1.6; }
        .card { fill: rgba(255,255,255,0.74); stroke: rgba(255,255,255,0.86); stroke-width: 1.6; }
        .label { font: 700 11px/1.2 "Space Grotesk", sans-serif; fill: #64748b; text-transform: uppercase; letter-spacing: 0.14em; }
        .word { font: 700 15px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .arrow { stroke: #10b981; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='16' width='388' height='158' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='174' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#ecfdf5' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='38%' r='78%'>
          <stop offset='0%' stopColor='rgba(16, 185, 129, 0.16)' />
          <stop offset='100%' stopColor='rgba(16, 185, 129, 0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='158' rx='24' />
        <g data-testid='english-adverb-transformation-atmosphere'>
          <ellipse cx='96' cy='42' fill='rgba(16, 185, 129, 0.12)' rx='86' ry='24' />
          <ellipse cx='312' cy='156' fill={`url(#${surfaceIds.atmosphereGradientId})`} opacity='0.95' rx='130' ry='30' />
        </g>
      </g>
      <rect className='frame' data-testid='english-adverb-transformation-frame' x='22' y='22' width='376' height='146' rx='20' />
      {[
        ['careful', 'carefully'],
        ['beautiful', 'beautifully'],
        ['good', 'well'],
        ['fast', 'fast'],
      ].map(([left, right], index) => {
        const x = index % 2 === 0 ? 34 : 220;
        const y = index < 2 ? 42 : 110;
        return (
          <g key={`${left}-${right}`} transform={`translate(${x}, ${y})`}>
            <rect className='card' x='0' y='0' width='166' height='52' rx='18' />
            <text className='label' x='16' y='18'>word pair</text>
            <text className='word' x='16' y='38'>{left}</text>
            <path className='arrow' d='M 74 30 L 100 30' />
            <path className='arrow' d='M 92 22 L 100 30 L 92 38' />
            <text className='word' x='110' y='38'>{right}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function EnglishAdverbRepairAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-repair');

  return (
    <svg
      aria-label='Animation: wrong adverb forms change into the correct words.'
      className='h-auto w-full'
      data-testid='english-adverb-repair-animation'
      role='img'
      viewBox='0 0 420 180'
    >
      <style>{`
        .panel { stroke: rgba(244, 63, 94, 0.32); stroke-width: 2; }
        .frame { fill: none; stroke: rgba(255,255,255,0.72); stroke-width: 1.6; }
        .card { fill: rgba(255,255,255,0.74); stroke-width: 2; }
        .wrong { stroke: #fda4af; }
        .right { stroke: #86efac; }
        .label { font: 700 10px/1.2 "Space Grotesk", sans-serif; letter-spacing: 0.14em; text-transform: uppercase; }
        .word { font: 700 13px/1.2 "Space Grotesk", sans-serif; fill: #0f172a; }
        .arrow { stroke: #38bdf8; stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; fill: none; }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}><rect x='16' y='16' width='388' height='148' rx='24' /></clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='164' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff1f2' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#ecfdf5' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='38%' r='78%'>
          <stop offset='0%' stopColor='rgba(244, 63, 94, 0.16)' />
          <stop offset='100%' stopColor='rgba(244, 63, 94, 0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='148' rx='24' />
        <g data-testid='english-adverb-repair-atmosphere'>
          <ellipse cx='96' cy='42' fill='rgba(248, 113, 113, 0.12)' rx='86' ry='24' />
          <ellipse cx='312' cy='154' fill={`url(#${surfaceIds.atmosphereGradientId})`} opacity='0.95' rx='130' ry='30' />
        </g>
      </g>
      <rect className='frame' data-testid='english-adverb-repair-frame' x='22' y='22' width='376' height='136' rx='20' />
      {[
        ['I play tennis bad.', 'I play tennis badly.'],
        ['He ran very fastly.', 'He ran very fast.'],
        ['Do you speak English good?', 'Do you speak English well?'],
      ].map(([wrong, right], index) => (
        <g key={wrong} transform={`translate(34, ${38 + index * 38})`}>
          <rect className='card wrong' x='0' y='0' width='150' height='28' rx='14' />
          <text className='label' fill='#be123c' x='14' y='18'>wrong</text>
          <text className='word' x='54' y='19'>{wrong}</text>
          <path className='arrow' d='M 164 14 L 190 14' />
          <path className='arrow' d='M 182 6 L 190 14 L 182 22' />
          <rect className='card right' x='204' y='0' width='170' height='28' rx='14' />
          <text className='label' fill='#15803d' x='218' y='18'>right</text>
          <text className='word' x='254' y='19'>{right}</text>
        </g>
      ))}
    </svg>
  );
}
