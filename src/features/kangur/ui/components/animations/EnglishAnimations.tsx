import React from 'react';

import { cn } from '@/features/kangur/shared/utils';

function useEnglishAnimationSurfaceIds(prefix: string): {
  clipId: string;
  panelGradientId: string;
  atmosphereGradientId: string;
  accentGradientId: string;
} {
  const baseId = React.useId().replace(/:/g, '');

  return {
    clipId: `${prefix}-${baseId}-clip`,
    panelGradientId: `${prefix}-${baseId}-panel`,
    atmosphereGradientId: `${prefix}-${baseId}-atmosphere`,
    accentGradientId: `${prefix}-${baseId}-accent`,
  };
}

export function EnglishPronounSwapAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-pronoun-swap');

  return (
    <svg
      aria-label='Animacja: imię zamieniane na zaimek w zdaniu matematycznym.'
      className='h-auto w-full'
      data-testid='english-pronoun-swap-animation'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(125, 211, 252, 0.34);
        }
        .accent {
          fill: url(#${surfaceIds.accentGradientId});
        }
        .line {
          font: 600 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .line-muted {
          fill: #64748b;
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        .swap-a { animation: swapA 4.4s ease-in-out infinite; }
        .swap-b { animation: swapB 4.4s ease-in-out infinite; }
        @keyframes swapA {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes swapB {
          0%, 55% { opacity: 0; }
          65%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .swap-a, .swap-b { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='20' y='20' width='340' height='90' rx='18' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='360' y1='20' y2='110' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='76%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.16)' />
          <stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='40' x2='100' y1='34' y2='42' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#38bdf8' />
          <stop offset='100%' stopColor='#22c55e' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-pronoun-swap-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='90' rx='18' width='340' x='20' y='20' />
        <ellipse cx='86' cy='34' fill='rgba(56, 189, 248, 0.12)' rx='64' ry='18' />
        <ellipse cx='300' cy='108' fill={`url(#${surfaceIds.atmosphereGradientId})`} opacity='0.95' rx='110' ry='24' />
      </g>
      <rect
        className='frame'
        data-testid='english-pronoun-swap-frame'
        x='26'
        y='26'
        width='328'
        height='78'
        rx='14'
      />
      <rect className='accent' height='8' rx='4' width='60' x='40' y='34' />
      <g className='swap-a'>
        <text className='line' x='40' y='68'>Maya solves x + 4 = 10.</text>
        <text className='line-muted' x='40' y='88'>Maya = she</text>
      </g>
      <g className='swap-b'>
        <text className='line' x='40' y='68'>She solves x + 4 = 10.</text>
        <text className='line-muted' x='40' y='88'>he / she / it + -s</text>
      </g>
    </svg>
  );
}

export function EnglishPossessiveAdjectiveAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-possessive-adjective');
  const cards = [
    { label: 'my', noun: 'solution', accent: '#0ea5e9', glow: '#7dd3fc' },
    { label: 'your', noun: 'calculator', accent: '#14b8a6', glow: '#5eead4' },
    { label: 'their', noun: 'graph', accent: '#a855f7', glow: '#d8b4fe' },
  ] as const;

  return (
    <svg
      aria-label='Animacja: my, your, their przed rzeczownikiem.'
      className='h-auto w-full'
      data-testid='english-possessive-adjective-animation'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .noun {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .icon {
          fill: #94a3b8;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
        .pulse { animation: labelPulse 3.6s ease-in-out infinite; }
        .pulse-2 { animation-delay: 1.2s; }
        .pulse-3 { animation-delay: 2.4s; }
        @keyframes labelPulse {
          0%, 100% { opacity: 0.4; transform: translateY(2px); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        {cards.map((item, index) => (
          <linearGradient
            key={`grad-${item.label}`}
            id={`${surfaceIds.panelGradientId}-${item.label}`}
            x1={30 + index * 130}
            x2={140 + index * 130}
            y1='24'
            y2='114'
            gradientUnits='userSpaceOnUse'
          >
            <stop offset='0%' stopColor='#f8fafc' />
            <stop offset='100%' stopColor={item.glow} />
          </linearGradient>
        ))}
      </defs>
      <g data-testid='english-possessive-adjective-atmosphere'>
        {cards.map((item, index) => (
          <ellipse
            key={`atm-${item.label}`}
            cx={82 + index * 130}
            cy='38'
            fill={item.glow}
            opacity='0.12'
            rx='44'
            ry='18'
          />
        ))}
      </g>
      {cards.map((item, index) => (
        <g key={`card-${index}`} transform={`translate(${30 + index * 130}, 24)`}>
          <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-${item.label})`} height='90' rx='16' width='110' />
          <rect
            className='frame'
            data-testid={`english-possessive-adjective-${item.label}-frame`}
            x='4'
            y='4'
            width='102'
            height='82'
            rx='13'
          />
          <rect fill={item.accent} height='14' opacity='0.16' rx='7' width='32' x='12' y='14' />
          <text className={`label pulse pulse-${index + 1}`} fill={item.accent} x='12' y='24'>
            {item.label}
          </text>
          <rect className='icon' height='36' rx='8' width='36' x='12' y='32' />
          <rect className='icon' height='6' rx='3' width='40' x='52' y='40' />
          <rect className='icon' height='6' rx='3' width='30' x='52' y='52' />
          <text className='noun' x='12' y='86'>
            {item.noun}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function EnglishPossessivePronounAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-possessive-pronoun');

  return (
    <svg
      aria-label='Animacja: mine i yours zastępują rzeczownik.'
      className='h-auto w-full'
      data-testid='english-possessive-pronoun-animation'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .tag {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #14b8a6;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
        .pulse { animation: tagGlow 3.8s ease-in-out infinite; }
        .pulse-2 { animation-delay: 1.9s; }
        @keyframes tagGlow {
          0%, 100% { opacity: 0.5; transform: scale(0.98); }
          45% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-mine`} x1='30' x2='160' y1='26' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f0fdfa' />
          <stop offset='100%' stopColor='#ccfbf1' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-yours`} x1='200' x2='330' y1='26' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
      </defs>
      <g transform='translate(30, 26)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-mine)`} height='88' rx='16' width='130' />
        <rect className='frame' data-testid='english-possessive-pronoun-mine-frame' x='4' y='4' width='122' height='80' rx='13' />
        <text className='tag pulse' x='16' y='26'>mine</text>
        <text className='text' x='16' y='52'>Solution A</text>
        <text className='text' x='16' y='70'>x = 4</text>
      </g>
      <g transform='translate(200, 26)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-yours)`} height='88' rx='16' width='130' />
        <rect className='frame' data-testid='english-possessive-pronoun-yours-frame' x='4' y='4' width='122' height='80' rx='13' />
        <text className='tag pulse-2' x='16' y='26'>yours</text>
        <text className='text' x='16' y='52'>Solution B</text>
        <text className='text' x='16' y='70'>x = 6</text>
      </g>
    </svg>
  );
}

export function EnglishAgreementBalanceAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-agreement-balance');

  return (
    <svg
      aria-label='Animacja: zgodność podmiotu i czasownika w Present Simple.'
      className='h-auto w-full'
      data-testid='english-agreement-balance-animation'
      role='img'
      viewBox='0 0 420 160'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(196, 181, 253, 0.34);
        }
        .card {
          stroke-width: 2;
          stroke: rgba(196, 181, 253, 0.54);
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .accent {
          fill: #0d9488;
        }
        .beam {
          stroke: #94a3b8;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        .pulse {
          animation: balancePulse 4s ease-in-out infinite;
        }
        .pulse-2 {
          animation-delay: 2s;
        }
        @keyframes balancePulse {
          0%, 100% { opacity: 0.55; transform: translateY(2px); }
          45% { opacity: 1; transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='14' y='16' width='392' height='128' rx='18' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='14' x2='406' y1='16' y2='144' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f5f3ff' />
          <stop offset='56%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#ecfeff' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-agreement-balance-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='128' rx='18' width='392' x='14' y='16' />
        <ellipse cx='104' cy='34' fill='rgba(129, 140, 248, 0.12)' rx='88' ry='20' />
        <ellipse cx='318' cy='138' fill='rgba(20, 184, 166, 0.1)' rx='126' ry='26' />
      </g>
      <rect className='frame' data-testid='english-agreement-balance-frame' x='20' y='22' width='380' height='116' rx='14' />
      <line className='beam' x1='210' x2='210' y1='38' y2='118' />
      <line className='beam' x1='110' x2='310' y1='64' y2='64' />
      <circle className='accent' cx='210' cy='64' r='6' />
      <g className='pulse' transform='translate(40, 76)'>
        <rect className='card' fill='rgba(255, 255, 255, 0.68)' height='56' rx='12' width='140' />
        <text className='text' x='12' y='22'>Singular subject</text>
        <text className='muted' x='12' y='40'>verb + s</text>
      </g>
      <g className='pulse pulse-2' transform='translate(240, 76)'>
        <rect className='card' fill='rgba(255, 255, 255, 0.68)' height='56' rx='12' width='140' />
        <text className='text' x='12' y='22'>Plural subject</text>
        <text className='muted' x='12' y='40'>base verb</text>
      </g>
    </svg>
  );
}

export function EnglishThirdPersonSAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-third-person-s');

  return (
    <svg
      aria-label='Animacja: he/she/it dodaje końcówkę -s do czasownika.'
      className='h-auto w-full'
      data-testid='english-third-person-s-animation'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(52, 211, 153, 0.32);
        }
        .line {
          font: 600 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .hint {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .accent {
          fill: #0d9488;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        .swap-a { animation: swapFade 4.4s ease-in-out infinite; }
        .swap-b { animation: swapFade 4.4s ease-in-out infinite; animation-delay: 2.2s; }
        @keyframes swapFade {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0.1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .swap-a, .swap-b { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='20' y='20' width='340' height='90' rx='18' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='360' y1='20' y2='110' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#ecfdf5' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-third-person-s-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='90' rx='18' width='340' x='20' y='20' />
        <ellipse cx='86' cy='36' fill='rgba(34, 197, 94, 0.12)' rx='64' ry='18' />
        <ellipse cx='290' cy='108' fill='rgba(56, 189, 248, 0.08)' rx='112' ry='24' />
      </g>
      <rect className='frame' data-testid='english-third-person-s-frame' x='26' y='26' width='328' height='78' rx='14' />
      <g className='swap-a'>
        <text className='line' x='40' y='64'>I play after school.</text>
        <text className='hint' x='40' y='86'>base verb</text>
      </g>
      <g className='swap-b'>
        <text className='line' x='40' y='64'>
          She play<tspan className='accent'>s</tspan> after school.
        </text>
        <text className='hint' x='40' y='86'>he / she / it + s</text>
      </g>
    </svg>
  );
}

export function EnglishBeVerbSwitchAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-be-verb-switch');
  const cards = [
    { label: 'I', verb: 'am', soft: '#bfdbfe' },
    { label: 'He/She', verb: 'is', soft: '#bbf7d0' },
    { label: 'We/They', verb: 'are', soft: '#fbcfe8' },
  ] as const;

  return (
    <svg
      aria-label='Animacja: am/is/are zależnie od podmiotu.'
      className='h-auto w-full'
      data-testid='english-be-verb-switch-animation'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .verb {
          font: 700 14px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0d9488;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
        .pulse { animation: verbPulse 3.6s ease-in-out infinite; }
        .pulse-2 { animation-delay: 1.2s; }
        .pulse-3 { animation-delay: 2.4s; }
        @keyframes verbPulse {
          0%, 100% { opacity: 0.45; transform: translateY(2px); }
          40% { opacity: 1; transform: translateY(-2px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        {cards.map((item, index) => (
          <linearGradient
            key={`grad-${item.label}`}
            id={`${surfaceIds.panelGradientId}-${index}`}
            x1={30 + index * 130}
            x2={140 + index * 130}
            y1='22'
            y2='114'
            gradientUnits='userSpaceOnUse'
          >
            <stop offset='0%' stopColor='#f8fafc' />
            <stop offset='100%' stopColor={item.soft} />
          </linearGradient>
        ))}
      </defs>
      <g data-testid='english-be-verb-switch-atmosphere'>
        {cards.map((item, index) => (
          <ellipse key={`atm-${item.label}`} cx={84 + index * 130} cy='34' fill={item.soft} opacity='0.12' rx='42' ry='18' />
        ))}
      </g>
      {cards.map((item, index) => {
        const pulseClass =
          index === 0 ? 'pulse' : index === 1 ? 'pulse pulse-2' : 'pulse pulse-3';
        return (
        <g key={`card-${index}`} transform={`translate(${30 + index * 130}, 22)`}>
          <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-${index})`} height='92' rx='16' width='110' />
          <rect
            className='frame'
            data-testid={`english-be-verb-switch-card-${index}-frame`}
            x='4'
            y='4'
            width='102'
            height='84'
            rx='13'
          />
          <text className='label' x='14' y='28'>
            {item.label}
          </text>
          <text className={`verb ${pulseClass}`} x='14' y='60'>
            {item.verb}
          </text>
          <text className='label' x='14' y='82'>
            ready
          </text>
        </g>
        );
      })}
    </svg>
  );
}

export function EnglishArticleFocusAnimation(): React.JSX.Element {
  const baseIds = useEnglishAnimationSurfaceIds('english-article-focus');
  const panelAGradientId = `${baseIds.panelGradientId}-a`;
  const panelBGradientId = `${baseIds.panelGradientId}-b`;
  const panelAClipId = `${baseIds.clipId}-a`;
  const panelBClipId = `${baseIds.clipId}-b`;
  const haloGradientId = `${baseIds.accentGradientId}-halo`;
  const locatorGradientId = `${baseIds.accentGradientId}-locator`;

  return (
    <svg
      aria-label='Animacja: a triangle kontra the triangle.'
      className='h-auto w-full'
      data-testid='english-article-focus-animation'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel {
          stroke: rgba(148, 163, 184, 0.34);
          stroke-width: 2;
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #f59e0b;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .triangle {
          fill: url(#${haloGradientId});
        }
        .pulse { animation: focusPulse 4s ease-in-out infinite; }
        .pulse-2 { animation-delay: 2s; }
        .locator {
          fill: url(#${locatorGradientId});
          filter: drop-shadow(0 4px 10px rgba(14, 165, 233, 0.35));
        }
        .focus-ring {
          stroke: rgba(56, 189, 248, 0.92);
          stroke-width: 3;
          fill: none;
          stroke-dasharray: 5 7;
        }
        .shadow {
          fill: rgba(15, 23, 42, 0.12);
        }
        @keyframes focusPulse {
          0%, 100% { opacity: 0.35; }
          40% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={panelAClipId}>
          <rect height='92' rx='16' width='150' x='24' y='24' />
        </clipPath>
        <clipPath id={panelBClipId}>
          <rect height='92' rx='16' width='150' x='206' y='24' />
        </clipPath>
        <linearGradient id={panelAGradientId} x1='24' x2='174' y1='24' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' />
          <stop offset='100%' stopColor='#ffedd5' />
        </linearGradient>
        <linearGradient id={panelBGradientId} x1='206' x2='356' y1='24' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
        <linearGradient id={haloGradientId} x1='40' x2='118' y1='36' y2='82' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fde68a' />
          <stop offset='100%' stopColor='#f59e0b' />
        </linearGradient>
        <radialGradient id={locatorGradientId} cx='50%' cy='50%' r='70%'>
          <stop offset='0%' stopColor='#e0f2fe' />
          <stop offset='100%' stopColor='#0ea5e9' />
        </radialGradient>
      </defs>
      <g data-testid='english-article-focus-atmosphere'>
        <g clipPath={`url(#${panelAClipId})`}>
          <ellipse cx='78' cy='46' fill='rgba(245, 158, 11, 0.18)' rx='54' ry='24' />
          <ellipse cx='146' cy='104' fill='rgba(251, 191, 36, 0.12)' rx='46' ry='18' />
        </g>
        <g clipPath={`url(#${panelBClipId})`}>
          <ellipse cx='248' cy='42' fill='rgba(59, 130, 246, 0.15)' rx='50' ry='22' />
          <ellipse cx='322' cy='104' fill='rgba(56, 189, 248, 0.12)' rx='52' ry='20' />
        </g>
      </g>
      <g transform='translate(24, 24)'>
        <rect className='panel' fill={`url(#${panelAGradientId})`} height='92' rx='16' width='150' />
        <rect
          data-testid='english-article-focus-panel-a-frame'
          fill='none'
          height='84'
          rx='13'
          stroke='rgba(255, 255, 255, 0.72)'
          strokeWidth='1.5'
          width='142'
          x='4'
          y='4'
        />
        <text className='label pulse' x='18' y='26'>a</text>
        <text className='text' x='34' y='26'>triangle</text>
        <ellipse className='shadow' cx='75' cy='82' rx='42' ry='8' />
        <polygon className='triangle' points='40,80 110,80 75,36' />
      </g>
      <g transform='translate(206, 24)'>
        <rect className='panel' fill={`url(#${panelBGradientId})`} height='92' rx='16' width='150' />
        <rect
          data-testid='english-article-focus-panel-the-frame'
          fill='none'
          height='84'
          rx='13'
          stroke='rgba(255, 255, 255, 0.74)'
          strokeWidth='1.5'
          width='142'
          x='4'
          y='4'
        />
        <text className='label pulse-2' x='18' y='26'>the</text>
        <text className='text' x='46' y='26'>triangle</text>
        <ellipse className='shadow' cx='75' cy='82' rx='42' ry='8' />
        <circle
          className='focus-ring pulse-2'
          cx='75'
          cy='58'
          data-testid='english-article-focus-panel-the-focus'
          r='36'
        />
        <polygon className='triangle' points='40,80 110,80 75,36' />
        <circle className='locator' cx='118' cy='36' r='6' />
      </g>
    </svg>
  );
}

export function EnglishArticleVowelAnimation(): React.JSX.Element {
  const baseIds = useEnglishAnimationSurfaceIds('english-article-vowel');
  const cards = [
    { article: 'an', word: 'equation', fill: '#fff7ed', accent: '#f97316', soft: '#fdba74' },
    { article: 'a', word: 'graph', fill: '#eff6ff', accent: '#0ea5e9', soft: '#7dd3fc' },
    { article: 'an', word: 'angle', fill: '#fdf4ff', accent: '#c084fc', soft: '#d8b4fe' },
  ] as const;

  return (
    <svg
      aria-label='Animacja: a/an zależne od dźwięku.'
      className='h-auto w-full'
      data-testid='english-article-vowel-animation'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .tag {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .word {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.7);
          stroke-width: 1.5;
        }
        .pulse { animation: tagPulse 3.6s ease-in-out infinite; }
        .pulse-2 { animation-delay: 1.2s; }
        .pulse-3 { animation-delay: 2.4s; }
        .phoneme-bar {
          filter: drop-shadow(0 6px 12px rgba(15, 23, 42, 0.12));
        }
        @keyframes tagPulse {
          0%, 100% { opacity: 0.4; transform: translateY(1px); }
          40% { opacity: 1; transform: translateY(-1px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        {cards.map((item, index) => {
          const cardGradientId = `${baseIds.panelGradientId}-${item.word}`;
          const cardClipId = `${baseIds.clipId}-${item.word}`;

          return (
            <React.Fragment key={`defs-${item.word}`}>
              <clipPath id={cardClipId}>
                <rect height='92' rx='16' width='120' x={24 + index * 130} y='24' />
              </clipPath>
              <linearGradient
                id={cardGradientId}
                x1={24 + index * 130}
                x2={144 + index * 130}
                y1='24'
                y2='116'
                gradientUnits='userSpaceOnUse'
              >
                <stop offset='0%' stopColor={item.fill} />
                <stop offset='100%' stopColor='#ffffff' />
              </linearGradient>
            </React.Fragment>
          );
        })}
      </defs>
      <g data-testid='english-article-vowel-atmosphere'>
        {cards.map((item, index) => {
          const cardClipId = `${baseIds.clipId}-${item.word}`;

          return (
            <g key={`atm-${item.word}`} clipPath={`url(#${cardClipId})`}>
              <ellipse
                cx={62 + index * 130}
                cy='44'
                fill={item.soft}
                opacity='0.18'
                rx='38'
                ry='18'
              />
              <ellipse
                cx={114 + index * 130}
                cy='102'
                fill={item.soft}
                opacity='0.12'
                rx='36'
                ry='14'
              />
            </g>
          );
        })}
      </g>
      {cards.map((item, index) => (
        <g key={item.word} transform={`translate(${24 + index * 130}, 24)`}>
          <rect
            className='card'
            fill={`url(#${baseIds.panelGradientId}-${item.word})`}
            height='92'
            rx='16'
            width='120'
          />
          <rect
            className='frame'
            data-testid={`english-article-vowel-card-${item.word}-frame`}
            height='84'
            rx='13'
            width='112'
            x='4'
            y='4'
          />
          <rect fill={item.accent} height='16' opacity='0.14' rx='8' width='38' x='14' y='16' />
          <text
            className={`tag pulse pulse-${index + 1}`}
            fill={item.accent}
            x='16'
            y='30'
          >
            {item.article}
          </text>
          <text className='word' x='48' y='30'>
            {item.word}
          </text>
          <rect className='phoneme-bar' fill={item.soft} height='10' rx='5' width='74' x='20' y='50' />
          <rect className='phoneme-bar' fill={item.accent} height='10' opacity='0.82' rx='5' width='56' x='20' y='66' />
          <circle cx='100' cy='54' fill={item.soft} opacity='0.55' r='7' />
          <circle cx='92' cy='72' fill={item.accent} opacity='0.4' r='5' />
        </g>
      ))}
    </svg>
  );
}

export function EnglishZeroArticleAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-zero-article');

  return (
    <svg
      aria-label='Animacja: brak przedimka z math, homework i graphs.'
      className='h-auto w-full'
      data-testid='english-zero-article-animation'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(248, 113, 113, 0.3);
        }
        .word {
          font: 700 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        .strike {
          stroke: #f87171;
          stroke-width: 4;
          stroke-linecap: round;
          animation: strikePulse 3.4s ease-in-out infinite;
        }
        @keyframes strikePulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .strike { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='20' y='24' width='320' height='90' rx='18' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='340' y1='24' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff1f2' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-zero-article-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='90' rx='18' width='320' x='20' y='24' />
        <ellipse cx='88' cy='34' fill='rgba(248, 113, 113, 0.12)' rx='62' ry='16' />
        <ellipse cx='274' cy='110' fill='rgba(251, 146, 60, 0.08)' rx='96' ry='22' />
      </g>
      <rect className='frame' data-testid='english-zero-article-frame' x='26' y='30' width='308' height='78' rx='14' />
      <text className='word' x='40' y='60'>math</text>
      <text className='word' x='120' y='60'>homework</text>
      <text className='word' x='230' y='60'>graphs</text>
      <text className='word' x='40' y='90'>no article</text>
      <line className='strike' x1='40' x2='110' y1='44' y2='44' />
    </svg>
  );
}

export function EnglishAdjectiveRoomAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adjective-room');

  return (
    <svg
      aria-label='Animacja: zwykły pokój zamienia się w pokój opisany przymiotnikami.'
      className='h-auto w-full'
      data-testid='english-adjective-room-animation'
      role='img'
      viewBox='0 0 420 190'
    >
      <style>{`
        .wall {
          stroke-width: 2;
          stroke: rgba(147, 197, 253, 0.34);
        }
        .floor {
          fill: url(#${surfaceIds.accentGradientId});
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #3730a3;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .cupboard {
          animation: cupboardGrow 4.2s ease-in-out infinite;
          transform-origin: 90px 122px;
        }
        .curtains {
          animation: curtainsStretch 4.2s ease-in-out infinite;
          transform-origin: 304px 46px;
        }
        .rug {
          animation: rugWave 4.2s ease-in-out infinite;
          transform-origin: 208px 150px;
        }
        .sparkle {
          animation: sparkleBlink 2.2s ease-in-out infinite;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        @keyframes cupboardGrow {
          0%, 20% { transform: scale(1); fill: #d6b89b; }
          45%, 100% { transform: scale(1.15, 1.08); fill: #facc15; }
        }
        @keyframes curtainsStretch {
          0%, 20% { transform: scaleY(1); fill: #cbd5f5; }
          45%, 100% { transform: scaleY(1.26); fill: #60a5fa; }
        }
        @keyframes rugWave {
          0%, 20% { transform: scaleX(1); }
          45%, 100% { transform: scaleX(1.06); }
        }
        @keyframes sparkleBlink {
          0%, 100% { opacity: 0.3; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cupboard, .curtains, .rug, .sparkle { animation: none; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='19' y='18' width='382' height='140' rx='22' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='19' x2='401' y1='18' y2='158' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eef2ff' />
          <stop offset='58%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='34%' r='78%'>
          <stop offset='0%' stopColor='rgba(99, 102, 241, 0.14)' />
          <stop offset='100%' stopColor='rgba(99, 102, 241, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='19' x2='401' y1='126' y2='168' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#e2e8f0' />
          <stop offset='100%' stopColor='#cbd5e1' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-cupboard`} x1='56' x2='128' y1='74' y2='152' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fcd34d' />
          <stop offset='100%' stopColor='#b45309' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-curtains`} x1='264' x2='344' y1='56' y2='124' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#93c5fd' />
          <stop offset='100%' stopColor='#2563eb' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-rug`} x1='146' x2='266' y1='120' y2='156' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fdba74' />
          <stop offset='100%' stopColor='#f97316' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-adjective-room-atmosphere'>
        <rect className='wall' fill={`url(#${surfaceIds.panelGradientId})`} height='140' rx='22' width='382' x='19' y='18' />
        <ellipse cx='104' cy='40' fill='rgba(99, 102, 241, 0.1)' rx='86' ry='26' />
        <ellipse cx='312' cy='146' fill={`url(#${surfaceIds.atmosphereGradientId})`} opacity='0.95' rx='126' ry='28' />
      </g>
      <rect
        className='frame'
        data-testid='english-adjective-room-frame'
        height='128'
        rx='18'
        width='370'
        x='25'
        y='24'
      />
      <rect className='floor' height='42' rx='16' width='382' x='19' y='126' />

      <text className='label' x='36' y='40'>plain room</text>
      <text className='text' x='36' y='58'>add adjectives and the room changes</text>

      <g className='cupboard'>
        <rect
          data-testid='english-adjective-room-cupboard-surface'
          x='56'
          y='74'
          width='72'
          height='78'
          rx='14'
          fill={`url(#${surfaceIds.panelGradientId}-cupboard)`}
          stroke='#8b5e3c'
          strokeWidth='2'
        />
        <line x1='92' y1='84' x2='92' y2='142' stroke='#78350f' strokeWidth='2' />
      </g>

      <g className='curtains'>
        <rect x='258' y='46' width='92' height='10' rx='5' fill='#94a3b8' />
        <rect
          data-testid='english-adjective-room-curtains-surface'
          x='264'
          y='56'
          width='28'
          height='64'
          rx='10'
          fill={`url(#${surfaceIds.panelGradientId}-curtains)`}
        />
        <rect x='316' y='56' width='28' height='64' rx='10' fill={`url(#${surfaceIds.panelGradientId}-curtains)`} />
      </g>

      <g className='rug'>
        <ellipse cx='206' cy='142' rx='64' ry='18' fill='#cbd5e1' opacity='0.45' />
        <ellipse
          data-testid='english-adjective-room-rug-surface'
          cx='206'
          cy='138'
          rx='60'
          ry='18'
          fill={`url(#${surfaceIds.panelGradientId}-rug)`}
          stroke='#fb923c'
          strokeWidth='2'
        />
      </g>

      <g className='sparkle'>
        <circle cx='144' cy='62' r='5' fill='#f59e0b' />
        <circle cx='338' cy='36' r='4' fill='#a855f7' />
        <circle cx='258' cy='150' r='4' fill='#38bdf8' />
      </g>
    </svg>
  );
}

export function EnglishAdjectiveOrderAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adjective-order');

  return (
    <svg
      aria-label='Animacja: przymiotniki ustawiają się przed rzeczownikiem.'
      className='h-auto w-full'
      data-testid='english-adjective-order-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(147, 197, 253, 0.34);
        }
        .card {
          stroke-width: 2;
        }
        .adj {
          stroke: #818cf8;
          animation: slideAdj 4.4s ease-in-out infinite;
        }
        .adj-2 {
          animation-delay: 0.3s;
        }
        .noun {
          stroke: #f59e0b;
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #1e293b;
        }
        .hint {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .guide {
          fill: rgba(255, 255, 255, 0.58);
          stroke: rgba(255, 255, 255, 0.74);
          stroke-width: 1.4;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        .order-line {
          stroke: rgba(99, 102, 241, 0.42);
          stroke-width: 2;
          stroke-dasharray: 4 6;
        }
        @keyframes slideAdj {
          0%, 18% { transform: translateX(108px); opacity: 0.55; }
          38%, 100% { transform: translateX(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .adj, .adj-2 { animation: none; opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='18' width='388' height='112' rx='20' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='18' y2='130' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eef2ff' />
          <stop offset='56%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='38%' r='78%'>
          <stop offset='0%' stopColor='rgba(99, 102, 241, 0.16)' />
          <stop offset='100%' stopColor='rgba(99, 102, 241, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='48' x2='330' y1='66' y2='100' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#e0e7ff' />
          <stop offset='65%' stopColor='#fef3c7' />
          <stop offset='100%' stopColor='#fde68a' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-small`} x1='48' x2='132' y1='66' y2='100' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eef2ff' />
          <stop offset='100%' stopColor='#c7d2fe' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-blue`} x1='140' x2='220' y1='66' y2='100' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#dbeafe' />
          <stop offset='100%' stopColor='#93c5fd' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-adjective-order-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='112' rx='20' width='388' x='16' y='18' />
        <ellipse cx='98' cy='40' fill='rgba(99, 102, 241, 0.11)' rx='92' ry='24' />
        <ellipse cx='318' cy='126' fill={`url(#${surfaceIds.atmosphereGradientId})`} opacity='0.95' rx='126' ry='26' />
      </g>
      <rect
        className='frame'
        data-testid='english-adjective-order-frame'
        height='100'
        rx='16'
        width='376'
        x='22'
        y='24'
      />
      <text className='hint' x='36' y='42'>Adjectives come before the noun.</text>
      <rect className='guide' x='40' y='54' width='320' height='40' rx='18' />
      <line className='order-line' x1='52' x2='344' y1='86' y2='86' />

      <g transform='translate(48,66)'>
        <g className='adj'>
          <rect
            className='card adj'
            data-testid='english-adjective-order-small-card'
            x='0'
            y='0'
            width='84'
            height='34'
            rx='12'
            fill={`url(#${surfaceIds.panelGradientId}-small)`}
          />
          <text className='label' x='22' y='22'>small</text>
        </g>
        <g className='adj adj-2' transform='translate(92,0)'>
          <rect
            className='card adj'
            data-testid='english-adjective-order-blue-card'
            x='0'
            y='0'
            width='80'
            height='34'
            rx='12'
            fill={`url(#${surfaceIds.panelGradientId}-blue)`}
          />
          <text className='label' x='24' y='22'>blue</text>
        </g>
        <g transform='translate(184,0)'>
          <rect
            className='card noun'
            data-testid='english-adjective-order-noun-card'
            x='0'
            y='0'
            width='98'
            height='34'
            rx='12'
            fill={`url(#${surfaceIds.accentGradientId})`}
          />
          <text className='label' x='25' y='22'>teddy</text>
        </g>
      </g>

      <text className='hint' x='48' y='118'>small blue teddy</text>
    </svg>
  );
}

export function EnglishAdjectiveRepairAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adjective-repair');

  return (
    <svg
      aria-label='Animacja: błędny zapis przymiotnika zamienia się w poprawny.'
      className='h-auto w-full'
      data-testid='english-adjective-repair-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(251, 191, 36, 0.34);
        }
        .bad {
          animation: badFade 4.6s ease-in-out infinite;
        }
        .good {
          animation: goodFade 4.6s ease-in-out infinite;
        }
        .line {
          font: 700 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
        }
        .line-bad {
          fill: #be123c;
        }
        .line-good {
          fill: #15803d;
        }
        .cross {
          stroke: #e11d48;
          stroke-width: 3;
          stroke-linecap: round;
        }
        .hint {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #7c2d12;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        @keyframes badFade {
          0%, 42% { opacity: 1; }
          52%, 100% { opacity: 0; }
        }
        @keyframes goodFade {
          0%, 46% { opacity: 0; }
          56%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bad, .good { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='18' width='388' height='112' rx='20' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='18' y2='130' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' />
          <stop offset='58%' stopColor='#fefce8' />
          <stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='78%'>
          <stop offset='0%' stopColor='rgba(249, 115, 22, 0.16)' />
          <stop offset='100%' stopColor='rgba(249, 115, 22, 0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-adjective-repair-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='112' rx='20' width='388' x='16' y='18' />
        <ellipse cx='104' cy='42' fill='rgba(249, 115, 22, 0.1)' rx='88' ry='24' />
        <ellipse cx='320' cy='126' fill={`url(#${surfaceIds.atmosphereGradientId})`} opacity='0.95' rx='128' ry='26' />
      </g>
      <rect
        className='frame'
        data-testid='english-adjective-repair-frame'
        height='100'
        rx='16'
        width='376'
        x='22'
        y='24'
      />
      <text className='hint' x='34' y='42'>Fix the ending and the order.</text>

      <g className='bad'>
        <text className='line line-bad' x='34' y='78'>two reds shoes</text>
        <line className='cross' x1='30' y1='84' x2='180' y2='58' />
        <text className='line line-bad' x='222' y='78'>a car small</text>
        <line className='cross' x1='218' y1='84' x2='344' y2='58' />
      </g>

      <g className='good'>
        <text className='line line-good' x='34' y='78'>two red shoes</text>
        <text className='line line-good' x='222' y='78'>a small car</text>
      </g>
    </svg>
  );
}

export function EnglishSentenceBlueprintAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-sentence-blueprint');

  return (
    <svg
      aria-label='Animacja: schemat zdania Subject-Verb-Object.'
      className='h-auto w-full'
      data-testid='english-sentence-blueprint-animation'
      role='img'
      viewBox='0 0 440 140'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(196, 181, 253, 0.34);
        }
        .block {
          stroke-width: 2;
          stroke: rgba(196, 181, 253, 0.52);
        }
        .label {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .accent {
          fill: rgba(167, 139, 250, 0.22);
        }
        .pulse-1 { animation: highlight 4.8s ease-in-out infinite; }
        .pulse-2 { animation: highlight 4.8s ease-in-out infinite; animation-delay: 1.6s; }
        .pulse-3 { animation: highlight 4.8s ease-in-out infinite; animation-delay: 3.2s; }
        .arrow {
          stroke: #a78bfa;
          stroke-width: 2;
          fill: none;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.6;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        @keyframes highlight {
          0%, 65% { opacity: 0.2; }
          75%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3 { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='30' y='24' width='380' height='92' rx='18' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='30' x2='410' y1='24' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f5f3ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-sentence-blueprint-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='92' rx='18' width='380' x='30' y='24' />
        <ellipse cx='112' cy='36' fill='rgba(167, 139, 250, 0.12)' rx='82' ry='18' />
        <ellipse cx='330' cy='114' fill='rgba(56, 189, 248, 0.08)' rx='110' ry='20' />
      </g>
      <rect className='frame' data-testid='english-sentence-blueprint-frame' height='80' rx='14' width='368' x='36' y='30' />
      <g transform='translate(50, 44)'>
        <rect className='block' data-testid='english-sentence-blueprint-subject-card' fill='rgba(255, 255, 255, 0.68)' height='52' rx='14' width='90' />
        <rect className='accent pulse-1' height='52' rx='14' width='90' />
        <text className='label' x='18' y='32'>Subject</text>
      </g>
      <g transform='translate(175, 44)'>
        <rect className='block' data-testid='english-sentence-blueprint-verb-card' fill='rgba(255, 255, 255, 0.68)' height='52' rx='14' width='90' />
        <rect className='accent pulse-2' height='52' rx='14' width='90' />
        <text className='label' x='28' y='32'>Verb</text>
      </g>
      <g transform='translate(300, 44)'>
        <rect className='block' data-testid='english-sentence-blueprint-object-card' fill='rgba(255, 255, 255, 0.68)' height='52' rx='14' width='90' />
        <rect className='accent pulse-3' height='52' rx='14' width='90' />
        <text className='label' x='18' y='32'>Object</text>
      </g>
      <path className='arrow' d='M142 70 L168 70' />
      <path className='arrow' d='M267 70 L293 70' />
      <path className='arrow' d='M165 70 L160 65' />
      <path className='arrow' d='M165 70 L160 75' />
      <path className='arrow' d='M292 70 L287 65' />
      <path className='arrow' d='M292 70 L287 75' />
    </svg>
  );
}

export function EnglishQuestionFlipAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-question-flip');

  return (
    <svg
      aria-label='Animacja: zdanie oznajmujące zamienia się w pytanie.'
      className='h-auto w-full'
      data-testid='english-question-flip-animation'
      role='img'
      viewBox='0 0 440 150'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(167, 139, 250, 0.34);
        }
        .line {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          fill: #64748b;
        }
        .swap-a { animation: swapFade 4.6s ease-in-out infinite; }
        .swap-b { animation: swapFade 4.6s ease-in-out infinite; animation-delay: 2.3s; }
        .accent {
          fill: #a78bfa;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        @keyframes swapFade {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0.15; }
        }
        @media (prefers-reduced-motion: reduce) {
          .swap-a, .swap-b { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='30' y='24' width='380' height='100' rx='18' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='30' x2='410' y1='24' y2='124' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f5f3ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#eef2ff' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-question-flip-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='100' rx='18' width='380' x='30' y='24' />
        <ellipse cx='102' cy='36' fill='rgba(167, 139, 250, 0.12)' rx='84' ry='18' />
        <ellipse cx='328' cy='120' fill='rgba(96, 165, 250, 0.08)' rx='112' ry='22' />
      </g>
      <rect className='frame' data-testid='english-question-flip-frame' height='88' rx='14' width='368' x='36' y='30' />
      <circle className='accent' cx='56' cy='50' r='6' />
      <circle className='accent' cx='56' cy='86' r='6' opacity='0.4' />
      <g className='swap-a'>
        <text className='line' x='74' y='54'>You play the guitar.</text>
        <text className='line muted' x='74' y='76'>Statement</text>
      </g>
      <g className='swap-b'>
        <text className='line' x='74' y='54'>Do you play the guitar?</text>
        <text className='line muted' x='74' y='76'>Question with do</text>
      </g>
    </svg>
  );
}

export function EnglishConnectorBridgeAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-connector-bridge');

  return (
    <svg
      aria-label='Animacja: dwa zdania połączone spójnikiem.'
      className='h-auto w-full'
      data-testid='english-connector-bridge-animation'
      role='img'
      viewBox='0 0 440 150'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .connector {
          stroke: #f59e0b;
          stroke-width: 1.5;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
        .pulse { animation: pulse 3.8s ease-in-out infinite; }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.05); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-left`} x1='24' x2='194' y1='30' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#f8fafc' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-right`} x1='246' x2='416' y1='30' y2='116' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='190' x2='250' y1='60' y2='90' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fde68a' />
          <stop offset='100%' stopColor='#f59e0b' />
        </linearGradient>
      </defs>
      <g transform='translate(24, 30)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-left)`} height='86' rx='16' width='170' />
        <rect className='frame' data-testid='english-connector-bridge-left-frame' x='4' y='4' width='162' height='78' rx='13' />
        <text className='text' x='16' y='38'>I finished my essay</text>
        <text className='text' x='16' y='60'>before class.</text>
      </g>
      <g transform='translate(246, 30)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-right)`} height='86' rx='16' width='170' />
        <rect className='frame' data-testid='english-connector-bridge-right-frame' x='4' y='4' width='162' height='78' rx='13' />
        <text className='text' x='16' y='38'>so I helped my</text>
        <text className='text' x='16' y='60'>friend revise.</text>
      </g>
      <g className='pulse' transform='translate(190, 60)'>
        <rect className='connector' fill={`url(#${surfaceIds.accentGradientId})`} height='30' rx='12' width='60' />
        <text className='text' x='18' y='20'>so</text>
      </g>
      <path d='M194 75 L246 75' stroke='#f59e0b' strokeWidth='2' fill='none' opacity='0.6' />
    </svg>
  );
}

export function EnglishPrepositionsTimeAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-prepositions-time');

  return (
    <svg
      aria-label='Animacja: at / on / in na osi czasu.'
      className='h-auto w-full'
      data-testid='english-prepositions-time-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(248, 113, 113, 0.26);
        }
        .label {
          font: 700 11px/1.1 "Space Grotesk", "IBM Plex Sans", sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          fill: #be123c;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
        .pulse {
          animation: cardGlow 5.4s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .pulse-2 { animation-delay: 1.8s; }
        .pulse-3 { animation-delay: 3.6s; }
        @keyframes cardGlow {
          0%, 15% { opacity: 0.4; transform: translateY(6px); }
          35%, 55% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0.4; transform: translateY(6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-at`} x1='20' x2='140' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff1f2' />
          <stop offset='100%' stopColor='#ffe4e6' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-on`} x1='150' x2='270' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-in`} x1='280' x2='400' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#ecfdf5' />
          <stop offset='100%' stopColor='#dcfce7' />
        </linearGradient>
      </defs>
      <g className='pulse' transform='translate(20, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-at)`} height='94' rx='18' width='120' />
        <rect className='frame' data-testid='english-prepositions-time-at-frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='30'>AT</text>
        <text className='text' x='16' y='56'>7:30</text>
        <text className='text' x='16' y='76'>noon</text>
      </g>
      <g className='pulse pulse-2' transform='translate(150, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-on)`} height='94' rx='18' width='120' />
        <rect className='frame' data-testid='english-prepositions-time-on-frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='30'>ON</text>
        <text className='text' x='16' y='56'>Monday</text>
        <text className='text' x='16' y='76'>14 May</text>
      </g>
      <g className='pulse pulse-3' transform='translate(280, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-in)`} height='94' rx='18' width='120' />
        <rect className='frame' data-testid='english-prepositions-time-in-frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='30'>IN</text>
        <text className='text' x='16' y='56'>July</text>
        <text className='text' x='16' y='76'>2026</text>
      </g>
    </svg>
  );
}

export function EnglishPrepositionsTimelineAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-prepositions-timeline');

  return (
    <svg
      aria-label='Animacja: before, during, after na osi czasu.'
      className='h-auto w-full'
      data-testid='english-prepositions-timeline-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .axis {
          stroke: #94a3b8;
          stroke-width: 2;
          stroke-linecap: round;
        }
        .event {
          fill: #fee2e2;
          stroke: #fda4af;
          stroke-width: 2;
        }
        .label {
          font: 700 11px/1.1 "Space Grotesk", "IBM Plex Sans", sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          fill: #be123c;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .dot {
          fill: #f43f5e;
          animation: markerPulse 4.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .dot-2 { animation-delay: 1.6s; }
        .dot-3 { animation-delay: 3.2s; }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        @keyframes markerPulse {
          0%, 15% { opacity: 0.35; transform: scale(0.9); }
          40%, 60% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.35; transform: scale(0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot, .dot-2, .dot-3 { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='20' y='20' width='380' height='110' rx='18' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='20' x2='400' y1='20' y2='130' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-prepositions-timeline-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} height='110' rx='18' width='380' x='20' y='20' />
        <ellipse cx='98' cy='34' fill='rgba(56, 189, 248, 0.1)' rx='84' ry='18' />
        <ellipse cx='320' cy='130' fill='rgba(251, 191, 36, 0.08)' rx='116' ry='22' />
      </g>
      <rect className='frame' data-testid='english-prepositions-timeline-frame' height='98' rx='14' width='368' x='26' y='26' />
      <line className='axis' x1='40' y1='78' x2='380' y2='78' />
      <rect className='event' x='170' y='58' width='80' height='40' rx='12' />
      <text className='text' x='186' y='83'>class</text>
      <circle className='dot' cx='90' cy='78' r='7' />
      <circle className='dot dot-2' cx='210' cy='50' r='7' />
      <circle className='dot dot-3' cx='330' cy='78' r='7' />
      <text className='label' x='68' y='52'>before</text>
      <text className='label' x='188' y='32'>during</text>
      <text className='label' x='308' y='52'>after</text>
    </svg>
  );
}

export function EnglishPrepositionsPlaceAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-prepositions-place');

  return (
    <svg
      aria-label='Animacja: at / in / on w miejscu.'
      className='h-auto w-full'
      data-testid='english-prepositions-place-animation'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .card {
          stroke-width: 2;
          stroke: rgba(248, 113, 113, 0.26);
        }
        .label {
          font: 700 11px/1.1 "Space Grotesk", "IBM Plex Sans", sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          fill: #be123c;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pin {
          fill: #f43f5e;
        }
        .surface {
          fill: #fecdd3;
        }
        .box {
          fill: #fef2f2;
          stroke: #fda4af;
          stroke-width: 2;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
        .pulse {
          animation: placeGlow 5.4s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .pulse-2 { animation-delay: 1.8s; }
        .pulse-3 { animation-delay: 3.6s; }
        @keyframes placeGlow {
          0%, 15% { opacity: 0.4; transform: translateY(6px); }
          35%, 55% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0.4; transform: translateY(6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-at`} x1='20' x2='140' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff1f2' />
          <stop offset='100%' stopColor='#ffe4e6' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-in`} x1='150' x2='270' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-on`} x1='280' x2='400' y1='28' y2='122' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#ecfdf5' />
          <stop offset='100%' stopColor='#dcfce7' />
        </linearGradient>
      </defs>
      <g className='pulse' transform='translate(20, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-at)`} height='94' rx='18' width='120' />
        <rect className='frame' data-testid='english-prepositions-place-at-frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='28'>AT</text>
        <circle className='pin' cx='38' cy='66' r='8' />
        <path className='pin' d='M38 74 L30 92 L46 92 Z' />
        <text className='text' x='60' y='70'>school</text>
      </g>
      <g className='pulse pulse-2' transform='translate(150, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-in)`} height='94' rx='18' width='120' />
        <rect className='frame' data-testid='english-prepositions-place-in-frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='28'>IN</text>
        <rect className='box' x='20' y='46' width='60' height='40' rx='10' />
        <circle className='pin' cx='50' cy='66' r='6' />
        <text className='text' x='86' y='70'>room</text>
      </g>
      <g className='pulse pulse-3' transform='translate(280, 28)'>
        <rect className='card' fill={`url(#${surfaceIds.panelGradientId}-on)`} height='94' rx='18' width='120' />
        <rect className='frame' data-testid='english-prepositions-place-on-frame' x='4' y='4' width='112' height='86' rx='14' />
        <text className='label' x='16' y='28'>ON</text>
        <rect className='surface' x='20' y='56' width='70' height='10' rx='5' />
        <circle className='pin' cx='44' cy='50' r='7' />
        <text className='text' x='86' y='70'>board</text>
      </g>
    </svg>
  );
}

export function EnglishPrepositionsRelationsDiagram(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-prepositions-relations');

  return (
    <svg
      aria-label='Rysunek: between, above, below.'
      className='h-auto w-full'
      data-testid='english-prepositions-relations-animation'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .panel {
          stroke-width: 2;
          stroke: rgba(148, 163, 184, 0.28);
        }
        .label {
          font: 700 11px/1.1 "Space Grotesk", "IBM Plex Sans", sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          fill: #0f172a;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .dot {
          fill: #be123c;
        }
        .muted {
          fill: #64748b;
        }
        .line {
          stroke: #94a3b8;
          stroke-width: 2;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.5;
        }
      `}</style>
      <defs>
        <linearGradient id={`${surfaceIds.panelGradientId}-between`} x1='20' x2='200' y1='26' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='100%' stopColor='#dbeafe' />
        </linearGradient>
        <linearGradient id={`${surfaceIds.panelGradientId}-vertical`} x1='230' x2='400' y1='26' y2='114' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' />
          <stop offset='100%' stopColor='#ffedd5' />
        </linearGradient>
      </defs>
      <g transform='translate(20, 26)'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId}-between)`} height='88' rx='16' width='180' />
        <rect className='frame' data-testid='english-prepositions-relations-between-frame' x='4' y='4' width='172' height='80' rx='13' />
        <text className='label' x='16' y='26'>BETWEEN</text>
        <line className='line' x1='24' y1='56' x2='156' y2='56' />
        <circle className='muted' cx='40' cy='56' r='6' />
        <circle className='muted' cx='140' cy='56' r='6' />
        <circle className='dot' cx='90' cy='56' r='7' />
        <text className='text' x='28' y='78'>A</text>
        <text className='text' x='135' y='78'>B</text>
      </g>
      <g transform='translate(230, 26)'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId}-vertical)`} height='88' rx='16' width='170' />
        <rect className='frame' data-testid='english-prepositions-relations-vertical-frame' x='4' y='4' width='162' height='80' rx='13' />
        <text className='label' x='16' y='26'>ABOVE / BELOW</text>
        <rect x='60' y='48' rx='8' width='50' height='28' fill='#fee2e2' stroke='#fda4af' strokeWidth='2' />
        <circle className='dot' cx='85' cy='40' r='6' />
        <circle className='dot' cx='85' cy='90' r='6' />
        <text className='text' x='22' y='44'>above</text>
        <text className='text' x='22' y='94'>below</text>
      </g>
    </svg>
  );
}

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
        .panel {
          stroke: rgba(125, 211, 252, 0.34);
          stroke-width: 2;
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .hint {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .day {
          fill: #e2e8f0;
          stroke: #cbd5e1;
          stroke-width: 2;
        }
        .lane {
          fill: rgba(255, 255, 255, 0.62);
          stroke: rgba(255, 255, 255, 0.78);
          stroke-width: 1.5;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.68);
          stroke-width: 1.6;
        }
        .active {
          animation: dotPulse 3s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 0.78; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .active { animation: none; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='138' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='154' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='78%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.24)' />
          <stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='30' x2='170' y1='32' y2='32' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#22c55e' />
          <stop offset='50%' stopColor='#38bdf8' />
          <stop offset='100%' stopColor='#f59e0b' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-adverb-frequency-scale-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='138' rx='24' />
        <ellipse cx='92' cy='40' fill='url(#${surfaceIds.accentGradientId})' opacity='0.14' rx='96' ry='28' />
        <ellipse cx='308' cy='132' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='124' ry='34' />
      </g>
      <rect
        className='frame'
        data-testid='english-adverb-frequency-scale-frame'
        x='22'
        y='22'
        width='376'
        height='126'
        rx='20'
      />
      <rect x='32' y='28' width='116' height='12' rx='6' fill={`url(#${surfaceIds.accentGradientId})`} opacity='0.24' />
      {items.map((item, index) => (
        <g key={item.key} transform={`translate(34, ${36 + index * 28})`}>
          <rect className='lane' x='-8' y='-14' width='344' height='24' rx='12' />
          <text className='label' x='0' y='10'>{item.label}</text>
          <text className='hint' x='86' y='10'>{item.count}/7 days</text>
          {Array.from({ length: 7 }).map((_, dayIndex) => (
            <circle
              key={`${item.key}-${dayIndex}`}
              className={dayIndex < item.count ? 'day active' : 'day'}
              cx={168 + dayIndex * 28}
              cy='6'
              r='8'
              fill={dayIndex < item.count ? item.fill : undefined}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function EnglishAdverbRoutineAnimation(): React.JSX.Element {
  const surfaceIds = useEnglishAnimationSurfaceIds('english-adverb-routine');
  const rows = [
    { y: 50, tag: 'always', label: 'go to the cinema', fill: '#22c55e', count: 7, cls: 'always' },
    { y: 92, tag: 'usually', label: 'go with friends', fill: '#38bdf8', count: 6, cls: 'usually' },
    { y: 134, tag: 'never', label: 'eat popcorn', fill: '#fda4af', count: 0, cls: 'never' },
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
        .panel {
          stroke: rgba(251, 191, 36, 0.34);
          stroke-width: 2;
        }
        .label {
          font: 700 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .tag {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #92400e;
          text-transform: uppercase;
          letter-spacing: 0.14em;
        }
        .dot {
          fill: #e2e8f0;
          stroke: #cbd5e1;
          stroke-width: 2;
        }
        .lane {
          fill: rgba(255, 255, 255, 0.66);
          stroke: rgba(255, 255, 255, 0.78);
          stroke-width: 1.5;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        .always { animation: rowPulse 2.8s ease-in-out infinite; }
        .usually { animation: rowPulse 3.2s ease-in-out infinite; }
        .never { animation: rowPulse 3.6s ease-in-out infinite; opacity: 0.55; }
        @keyframes rowPulse {
          0%, 100% { opacity: 0.78; transform: scale(0.94); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .always, .usually, .never { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='148' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='164' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#fff7ed' />
          <stop offset='50%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#eff6ff' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='75%'>
          <stop offset='0%' stopColor='rgba(245, 158, 11, 0.22)' />
          <stop offset='100%' stopColor='rgba(245, 158, 11, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='34' x2='184' y1='36' y2='36' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#22c55e' />
          <stop offset='55%' stopColor='#38bdf8' />
          <stop offset='100%' stopColor='#fda4af' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-adverb-routine-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='148' rx='24' />
        <ellipse cx='92' cy='42' fill='url(#${surfaceIds.accentGradientId})' opacity='0.16' rx='96' ry='26' />
        <ellipse cx='318' cy='144' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='132' ry='30' />
      </g>
      <rect
        className='frame'
        data-testid='english-adverb-routine-frame'
        x='22'
        y='22'
        width='376'
        height='136'
        rx='20'
      />
      <rect x='32' y='28' width='132' height='12' rx='6' fill={`url(#${surfaceIds.accentGradientId})`} opacity='0.24' />
      {rows.map((row) => (
        <g key={row.tag} transform={`translate(34, ${row.y})`}>
          <rect className='lane' x='-10' y='-16' width='352' height='26' rx='13' />
          <text className='tag' x='0' y='0'>{row.tag}</text>
          <text className='label' x='84' y='0'>{row.label}</text>
          {Array.from({ length: 7 }).map((_, index) => (
            <circle
              key={`${row.tag}-${index}`}
              className={cn('dot', index < row.count && row.cls)}
              cx={204 + index * 24}
              cy='-4'
              r='8'
              fill={index < row.count ? row.fill : undefined}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function EnglishAdverbWordOrderAnimation({
  mode = 'mainVerb',
}: {
  mode?: 'mainVerb' | 'beVerb';
}): React.JSX.Element {
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
        .panel {
          stroke: rgba(196, 181, 253, 0.42);
          stroke-width: 2;
        }
        .word {
          font: 700 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .chip {
          stroke-width: 2;
          stroke: rgba(196, 181, 253, 0.8);
        }
        .tag {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #6d28d9;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        .guide {
          fill: rgba(255, 255, 255, 0.58);
          stroke: rgba(255, 255, 255, 0.74);
          stroke-width: 1.4;
        }
        .order-line {
          stroke: rgba(139, 92, 246, 0.46);
          stroke-width: 2;
          stroke-dasharray: 4 6;
        }
        .pulse {
          animation: chipPulse 3s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        @keyframes chipPulse {
          0%, 100% { opacity: 0.78; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='18' y='18' width='364' height='114' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='18' x2='382' y1='18' y2='132' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#f5f3ff' />
          <stop offset='60%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#ede9fe' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='76%'>
          <stop offset='0%' stopColor='rgba(139, 92, 246, 0.2)' />
          <stop offset='100%' stopColor='rgba(139, 92, 246, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#ddd6fe' />
          <stop offset='100%' stopColor='#c4b5fd' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid={`english-adverb-word-order-${mode}-atmosphere`}>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='18' y='18' width='364' height='114' rx='24' />
        <ellipse cx='96' cy='34' fill='rgba(124, 58, 237, 0.12)' rx='88' ry='24' />
        <ellipse cx='300' cy='122' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='126' ry='30' />
      </g>
      <rect
        className='frame'
        data-testid={`english-adverb-word-order-${mode}-frame`}
        x='24'
        y='24'
        width='352'
        height='102'
        rx='20'
      />
      <rect className='guide' x='32' y='52' width='336' height='42' rx='16' />
      <text className='tag' x='34' y='42'>
        {mainVerb ? 'before the main verb' : 'after be'}
      </text>
      <line className='order-line' x1='38' x2='360' y1='72' y2='72' />
      <g transform='translate(34, 72)'>
        <text className='word' x='0' y='0'>{leading}</text>
        <rect
          className='chip pulse'
          fill={`url(#${surfaceIds.accentGradientId})`}
          x={mainVerb ? 54 : 44}
          y='-18'
          rx='12'
          width='74'
          height='30'
        />
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
        .panel {
          stroke: rgba(125, 211, 252, 0.34);
          stroke-width: 2;
        }
        .card {
          stroke-width: 2;
        }
        .wrong-card {
          stroke: #fda4af;
        }
        .right-card {
          stroke: #86efac;
        }
        .word {
          font: 700 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .tag {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .wrong-tag {
          fill: #be123c;
        }
        .right-tag {
          fill: #15803d;
        }
        .chip {
          stroke-width: 2;
        }
        .wrong-chip {
          fill: #ffe4e6;
          stroke: #fda4af;
        }
        .right-chip {
          fill: #dcfce7;
          stroke: #86efac;
        }
        .arrow {
          stroke: #38bdf8;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          fill: none;
        }
        .wrong-line {
          animation: wrongFade 4.6s ease-in-out infinite;
        }
        .right-line {
          animation: rightFade 4.6s ease-in-out infinite;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        @keyframes wrongFade {
          0%, 42% { opacity: 1; }
          55%, 100% { opacity: 0.28; }
        }
        @keyframes rightFade {
          0%, 42% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .wrong-line, .right-line { animation: none; opacity: 1; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='138' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='154' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='50%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='40%' r='74%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.18)' />
          <stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
        <linearGradient id={surfaceIds.accentGradientId} x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0%' stopColor='#ffffff' />
          <stop offset='100%' stopColor='#f8fafc' />
        </linearGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-adverb-sentence-repair-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='138' rx='24' />
        <ellipse cx='96' cy='40' fill='rgba(248, 113, 113, 0.12)' rx='88' ry='24' />
        <ellipse cx='314' cy='136' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='130' ry='28' />
      </g>
      <rect
        className='frame'
        data-testid='english-adverb-sentence-repair-frame'
        x='22'
        y='22'
        width='376'
        height='126'
        rx='20'
      />
      <g className='wrong-line' transform='translate(36, 38)'>
        <rect className='card wrong-card' fill={`url(#${surfaceIds.accentGradientId})`} x='0' y='0' width='154' height='82' rx='18' />
        <rect fill='none' height='74' rx='14' stroke='rgba(255, 255, 255, 0.68)' strokeWidth='1.5' width='146' x='4' y='4' />
        <text className='tag wrong-tag' x='16' y='22'>
          wrong order
        </text>
        <text className='word' x='16' y='50'>I do</text>
        <rect className='chip wrong-chip' x='56' y='32' width='64' height='28' rx='12' />
        <text className='word' x='69' y='50'>always</text>
        <text className='word' x='16' y='70'>my homework.</text>
      </g>
      <path className='arrow' d='M 212 78 C 228 68, 246 68, 262 78' />
      <path className='arrow' d='M 250 66 L 262 78 L 248 88' />
      <g className='right-line' transform='translate(230, 38)'>
        <rect className='card right-card' fill={`url(#${surfaceIds.accentGradientId})`} x='0' y='0' width='154' height='82' rx='18' />
        <rect fill='none' height='74' rx='14' stroke='rgba(255, 255, 255, 0.68)' strokeWidth='1.5' width='146' x='4' y='4' />
        <text className='tag right-tag' x='16' y='22'>
          fix it
        </text>
        <text className='word' x='16' y='50'>I</text>
        <rect className='chip right-chip' x='28' y='32' width='64' height='28' rx='12' />
        <text className='word' x='41' y='50'>always</text>
        <text className='word' x='101' y='50'>do</text>
        <text className='word' x='16' y='70'>my homework.</text>
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
        .panel {
          stroke: rgba(125, 211, 252, 0.34);
          stroke-width: 2;
        }
        .card {
          stroke-width: 1.8;
          stroke: rgba(255, 255, 255, 0.78);
        }
        .tag {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .line {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .muted {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .dot {
          fill: #e2e8f0;
          stroke: #cbd5e1;
          stroke-width: 2;
        }
        .dot-active {
          animation: habitPulse 3s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .badge {
          stroke-width: 2;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        @keyframes habitPulse {
          0%, 100% { opacity: 0.78; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot-active { animation: none; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='152' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='168' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#fff7ed' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='38%' r='78%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.16)' />
          <stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-adverb-habit-card-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='152' rx='24' />
        <ellipse cx='96' cy='40' fill='rgba(34, 197, 94, 0.1)' rx='86' ry='26' />
        <ellipse cx='308' cy='150' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='128' ry='28' />
      </g>
      <rect
        className='frame'
        data-testid='english-adverb-habit-card-frame'
        x='22'
        y='22'
        width='376'
        height='140'
        rx='20'
      />
      {rows.map((row, index) => (
        <g key={row.label} transform={`translate(34, ${40 + index * 40})`}>
          <rect className='card' fill='rgba(255, 255, 255, 0.66)' x='0' y='0' width='352' height='28' rx='14' />
          <rect
            className='badge'
            x='8'
            y='5'
            width='82'
            height='18'
            rx='9'
            fill={row.fill}
            stroke={row.fill}
          />
          <text className='tag' x='20' y='18'>
            {row.label}
          </text>
          <text className='line' x='108' y='18'>
            {row.icon} {row.habit}
          </text>
          {Array.from({ length: 7 }).map((_, dotIndex) => (
            <circle
              key={`${row.label}-${dotIndex}`}
              className={cn('dot', dotIndex < row.count && 'dot-active')}
              cx={266 + dotIndex * 14}
              cy='14'
              r='5'
              fill={dotIndex < row.count ? row.fill : undefined}
              style={
                dotIndex < row.count
                  ? { animationDelay: `${dotIndex * 0.1}s` }
                  : undefined
              }
            />
          ))}
        </g>
      ))}
      <text className='muted' x='34' y='158'>
        Build your own week with always, usually, sometimes, and never.
      </text>
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
        .panel {
          stroke: rgba(125, 211, 252, 0.34);
          stroke-width: 2;
        }
        .card {
          stroke-width: 1.8;
          stroke: rgba(255, 255, 255, 0.78);
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .hint {
          font: 600 11px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .dot {
          fill: #e2e8f0;
          stroke: #cbd5e1;
          stroke-width: 2;
        }
        .dot-active {
          animation: placePulse 3.1s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .week-line {
          stroke: #cbd5e1;
          stroke-width: 2;
          stroke-dasharray: 3 5;
        }
        .frame {
          fill: none;
          stroke: rgba(255, 255, 255, 0.72);
          stroke-width: 1.6;
        }
        @keyframes placePulse {
          0%, 100% { opacity: 0.8; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot-active { animation: none; }
        }
      `}</style>
      <defs>
        <clipPath id={surfaceIds.clipId}>
          <rect x='16' y='16' width='388' height='156' rx='24' />
        </clipPath>
        <linearGradient id={surfaceIds.panelGradientId} x1='16' x2='404' y1='16' y2='172' gradientUnits='userSpaceOnUse'>
          <stop offset='0%' stopColor='#eff6ff' />
          <stop offset='55%' stopColor='#f8fafc' />
          <stop offset='100%' stopColor='#f0fdf4' />
        </linearGradient>
        <radialGradient id={surfaceIds.atmosphereGradientId} cx='50%' cy='38%' r='78%'>
          <stop offset='0%' stopColor='rgba(56, 189, 248, 0.16)' />
          <stop offset='100%' stopColor='rgba(56, 189, 248, 0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${surfaceIds.clipId})`} data-testid='english-adverb-place-routine-atmosphere'>
        <rect className='panel' fill={`url(#${surfaceIds.panelGradientId})`} x='16' y='16' width='388' height='156' rx='24' />
        <ellipse cx='102' cy='40' fill='rgba(56, 189, 248, 0.1)' rx='90' ry='26' />
        <ellipse cx='310' cy='156' fill='url(#${surfaceIds.atmosphereGradientId})' opacity='0.95' rx='132' ry='30' />
      </g>
      <rect
        className='frame'
        data-testid='english-adverb-place-routine-frame'
        x='22'
        y='22'
        width='376'
        height='144'
        rx='20'
      />
      {places.map((place, index) => (
        <g key={place.label} transform={`translate(${34 + index * 122}, 38)`}>
          <rect className='card' fill='rgba(255, 255, 255, 0.68)' x='0' y='0' width='110' height='108' rx='18' />
          <text className='label' x='14' y='24'>
            {place.icon} {place.label}
          </text>
          <text className='hint' x='14' y='42'>
            {place.count === 0 ? 'never' : place.count >= 6 ? 'usually' : 'sometimes'}
          </text>
          <line className='week-line' x1='16' y1='68' x2='94' y2='68' />
          {Array.from({ length: 7 }).map((_, dotIndex) => (
            <circle
              key={`${place.label}-${dotIndex}`}
              className={cn('dot', dotIndex < place.count && 'dot-active')}
              cx={16 + dotIndex * 13}
              cy='68'
              r='5'
              fill={dotIndex < place.count ? place.fill : undefined}
              style={
                dotIndex < place.count
                  ? { animationDelay: `${dotIndex * 0.08}s` }
                  : undefined
              }
            />
          ))}
          <text className='hint' x='14' y='94'>
            {place.count >= 6
              ? 'I usually go here.'
              : place.count >= 1
                ? 'I sometimes go here.'
                : 'I never go here.'}
          </text>
        </g>
      ))}
    </svg>
  );
}
