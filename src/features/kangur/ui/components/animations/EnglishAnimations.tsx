import React from 'react';

import { cn } from '@/features/kangur/shared/utils';

export function EnglishPronounSwapAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: imię zamieniane na zaimek w zdaniu matematycznym.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .accent {
          fill: #38bdf8;
        }
        .line {
          font: 600 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .line-muted {
          fill: #64748b;
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
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
      <rect className='panel' height='90' rx='18' width='340' x='20' y='20' />
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
  return (
    <svg
      aria-label='Animacja: my, your, their przed rzeczownikiem.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0ea5e9;
        }
        .noun {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .icon {
          fill: #94a3b8;
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
      {[0, 1, 2].map((index) => (
        <g key={`card-${index}`} transform={`translate(${30 + index * 130}, 24)`}>
          <rect className='card' height='90' rx='16' width='110' />
          <text className={`label pulse pulse-${index + 1}`} x='12' y='24'>
            {index === 0 ? 'my' : index === 1 ? 'your' : 'their'}
          </text>
          <rect className='icon' height='36' rx='8' width='36' x='12' y='32' />
          <rect className='icon' height='6' rx='3' width='40' x='52' y='40' />
          <rect className='icon' height='6' rx='3' width='30' x='52' y='52' />
          <text className='noun' x='12' y='86'>
            {index === 0 ? 'solution' : index === 1 ? 'calculator' : 'graph'}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function EnglishPossessivePronounAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: mine i yours zastępują rzeczownik.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .tag {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #14b8a6;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
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
      <g transform='translate(30, 26)'>
        <rect className='card' height='88' rx='16' width='130' />
        <text className='tag pulse' x='16' y='26'>mine</text>
        <text className='text' x='16' y='52'>Solution A</text>
        <text className='text' x='16' y='70'>x = 4</text>
      </g>
      <g transform='translate(200, 26)'>
        <rect className='card' height='88' rx='16' width='130' />
        <text className='tag pulse-2' x='16' y='26'>yours</text>
        <text className='text' x='16' y='52'>Solution B</text>
        <text className='text' x='16' y='70'>x = 6</text>
      </g>
    </svg>
  );
}

export function EnglishAgreementBalanceAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: zgodność podmiotu i czasownika w Present Simple.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 160'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .card {
          fill: #ffffff;
          stroke: #cbd5f5;
          stroke-width: 2;
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
      <rect className='panel' height='128' rx='18' width='392' x='14' y='16' />
      <line className='beam' x1='210' x2='210' y1='38' y2='118' />
      <line className='beam' x1='110' x2='310' y1='64' y2='64' />
      <circle className='accent' cx='210' cy='64' r='6' />
      <g className='pulse' transform='translate(40, 76)'>
        <rect className='card' height='56' rx='12' width='140' />
        <text className='text' x='12' y='22'>Singular subject</text>
        <text className='muted' x='12' y='40'>verb + s</text>
      </g>
      <g className='pulse pulse-2' transform='translate(240, 76)'>
        <rect className='card' height='56' rx='12' width='140' />
        <text className='text' x='12' y='22'>Plural subject</text>
        <text className='muted' x='12' y='40'>base verb</text>
      </g>
    </svg>
  );
}

export function EnglishThirdPersonSAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: he/she/it dodaje końcówkę -s do czasownika.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
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
      <rect className='panel' height='90' rx='18' width='340' x='20' y='20' />
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
  return (
    <svg
      aria-label='Animacja: am/is/are zależnie od podmiotu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .verb {
          font: 700 14px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0d9488;
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
      {[0, 1, 2].map((index) => {
        const pulseClass =
          index === 0 ? 'pulse' : index === 1 ? 'pulse pulse-2' : 'pulse pulse-3';
        return (
        <g key={`card-${index}`} transform={`translate(${30 + index * 130}, 22)`}>
          <rect className='card' height='92' rx='16' width='110' />
          <text className='label' x='14' y='28'>
            {index === 0 ? 'I' : index === 1 ? 'He/She' : 'We/They'}
          </text>
          <text className={`verb ${pulseClass}`} x='14' y='60'>
            {index === 0 ? 'am' : index === 1 ? 'is' : 'are'}
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
  return (
    <svg
      aria-label='Animacja: a triangle kontra the triangle.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 380 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
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
          fill: #fbbf24;
        }
        .pulse { animation: focusPulse 4s ease-in-out infinite; }
        .pulse-2 { animation-delay: 2s; }
        @keyframes focusPulse {
          0%, 100% { opacity: 0.35; }
          40% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2 { animation: none; opacity: 1; }
        }
      `}</style>
      <g transform='translate(24, 24)'>
        <rect className='panel' height='92' rx='16' width='150' />
        <text className='label pulse' x='18' y='26'>a</text>
        <text className='text' x='34' y='26'>triangle</text>
        <polygon className='triangle' points='40,80 110,80 75,36' />
      </g>
      <g transform='translate(206, 24)'>
        <rect className='panel' height='92' rx='16' width='150' />
        <text className='label pulse-2' x='18' y='26'>the</text>
        <text className='text' x='46' y='26'>triangle</text>
        <polygon className='triangle' points='40,80 110,80 75,36' />
        <circle cx='118' cy='36' fill='#38bdf8' r='6' />
      </g>
    </svg>
  );
}

export function EnglishArticleVowelAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: a/an zależne od dźwięku.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card {
          fill: #fff7ed;
          stroke: #fed7aa;
          stroke-width: 2;
        }
        .tag {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #f97316;
        }
        .word {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .pulse { animation: tagPulse 3.6s ease-in-out infinite; }
        .pulse-2 { animation-delay: 1.2s; }
        .pulse-3 { animation-delay: 2.4s; }
        @keyframes tagPulse {
          0%, 100% { opacity: 0.4; transform: translateY(1px); }
          40% { opacity: 1; transform: translateY(-1px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse, .pulse-2, .pulse-3 { animation: none; opacity: 1; }
        }
      `}</style>
      {[
        { article: 'an', word: 'equation' },
        { article: 'a', word: 'graph' },
        { article: 'an', word: 'angle' },
      ].map((item, index) => (
        <g key={item.word} transform={`translate(${24 + index * 130}, 24)`}>
          <rect className='card' height='92' rx='16' width='120' />
          <text className={`tag pulse pulse-${index + 1}`} x='16' y='30'>
            {item.article}
          </text>
          <text className='word' x='48' y='30'>
            {item.word}
          </text>
          <rect fill='#fdba74' height='10' rx='5' width='70' x='20' y='50' />
          <rect fill='#fb923c' height='10' rx='5' width='50' x='20' y='66' />
        </g>
      ))}
    </svg>
  );
}

export function EnglishZeroArticleAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: brak przedimka z math, homework i graphs.'
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
        .word {
          font: 700 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
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
      <rect className='panel' height='90' rx='18' width='320' x='20' y='24' />
      <text className='word' x='40' y='60'>math</text>
      <text className='word' x='120' y='60'>homework</text>
      <text className='word' x='230' y='60'>graphs</text>
      <text className='word' x='40' y='90'>no article</text>
      <line className='strike' x1='40' x2='110' y1='44' y2='44' />
    </svg>
  );
}

export function EnglishAdjectiveRoomAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: zwykły pokój zamienia się w pokój opisany przymiotnikami.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 190'
    >
      <style>{`
        .wall {
          fill: #f8fafc;
          stroke: #dbeafe;
          stroke-width: 2;
        }
        .floor {
          fill: #e2e8f0;
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
      <rect className='wall' height='140' rx='22' width='382' x='19' y='18' />
      <rect className='floor' height='42' rx='16' width='382' x='19' y='126' />

      <text className='label' x='36' y='40'>plain room</text>
      <text className='text' x='36' y='58'>add adjectives and the room changes</text>

      <g className='cupboard'>
        <rect x='56' y='74' width='72' height='78' rx='14' fill='#d6b89b' stroke='#8b5e3c' strokeWidth='2' />
        <line x1='92' y1='84' x2='92' y2='142' stroke='#78350f' strokeWidth='2' />
      </g>

      <g className='curtains'>
        <rect x='258' y='46' width='92' height='10' rx='5' fill='#94a3b8' />
        <rect x='264' y='56' width='28' height='64' rx='10' fill='#cbd5f5' />
        <rect x='316' y='56' width='28' height='64' rx='10' fill='#cbd5f5' />
      </g>

      <g className='rug'>
        <ellipse cx='206' cy='142' rx='64' ry='18' fill='#cbd5e1' opacity='0.45' />
        <ellipse cx='206' cy='138' rx='60' ry='18' fill='#fed7aa' stroke='#fb923c' strokeWidth='2' />
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
  return (
    <svg
      aria-label='Animacja: przymiotniki ustawiają się przed rzeczownikiem.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #dbeafe;
          stroke-width: 2;
        }
        .card {
          stroke-width: 2;
        }
        .adj {
          fill: #e0e7ff;
          stroke: #818cf8;
          animation: slideAdj 4.4s ease-in-out infinite;
        }
        .adj-2 {
          animation-delay: 0.3s;
        }
        .noun {
          fill: #fef3c7;
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
        @keyframes slideAdj {
          0%, 18% { transform: translateX(108px); opacity: 0.55; }
          38%, 100% { transform: translateX(0); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .adj, .adj-2 { animation: none; opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <rect className='panel' height='112' rx='20' width='388' x='16' y='18' />
      <text className='hint' x='36' y='42'>Adjectives come before the noun.</text>

      <g transform='translate(48,66)'>
        <g className='adj'>
          <rect className='card adj' x='0' y='0' width='84' height='34' rx='12' />
          <text className='label' x='22' y='22'>small</text>
        </g>
        <g className='adj adj-2' transform='translate(92,0)'>
          <rect className='card adj' x='0' y='0' width='80' height='34' rx='12' />
          <text className='label' x='24' y='22'>blue</text>
        </g>
        <g transform='translate(184,0)'>
          <rect className='card noun' x='0' y='0' width='98' height='34' rx='12' />
          <text className='label' x='25' y='22'>teddy</text>
        </g>
      </g>

      <text className='hint' x='48' y='118'>small blue teddy</text>
    </svg>
  );
}

export function EnglishAdjectiveRepairAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: błędny zapis przymiotnika zamienia się w poprawny.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel {
          fill: #fff7ed;
          stroke: #fdba74;
          stroke-width: 2;
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
      <rect className='panel' height='112' rx='20' width='388' x='16' y='18' />
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
  return (
    <svg
      aria-label='Animacja: schemat zdania Subject-Verb-Object.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 440 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .block {
          fill: #ffffff;
          stroke: #ddd6fe;
          stroke-width: 2;
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
        @keyframes highlight {
          0%, 65% { opacity: 0.2; }
          75%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse-1, .pulse-2, .pulse-3 { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='92' rx='18' width='380' x='30' y='24' />
      <g transform='translate(50, 44)'>
        <rect className='block' height='52' rx='14' width='90' />
        <rect className='accent pulse-1' height='52' rx='14' width='90' />
        <text className='label' x='18' y='32'>Subject</text>
      </g>
      <g transform='translate(175, 44)'>
        <rect className='block' height='52' rx='14' width='90' />
        <rect className='accent pulse-2' height='52' rx='14' width='90' />
        <text className='label' x='28' y='32'>Verb</text>
      </g>
      <g transform='translate(300, 44)'>
        <rect className='block' height='52' rx='14' width='90' />
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
  return (
    <svg
      aria-label='Animacja: zdanie oznajmujące zamienia się w pytanie.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 440 150'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
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
        @keyframes swapFade {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0.15; }
        }
        @media (prefers-reduced-motion: reduce) {
          .swap-a, .swap-b { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='panel' height='100' rx='18' width='380' x='30' y='24' />
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
  return (
    <svg
      aria-label='Animacja: dwa zdania połączone spójnikiem.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 440 150'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .connector {
          fill: #fde68a;
          stroke: #f59e0b;
          stroke-width: 1.5;
        }
        .text {
          font: 600 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
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
      <g transform='translate(24, 30)'>
        <rect className='card' height='86' rx='16' width='170' />
        <text className='text' x='16' y='38'>I finished my essay</text>
        <text className='text' x='16' y='60'>before class.</text>
      </g>
      <g transform='translate(246, 30)'>
        <rect className='card' height='86' rx='16' width='170' />
        <text className='text' x='16' y='38'>so I helped my</text>
        <text className='text' x='16' y='60'>friend revise.</text>
      </g>
      <g className='pulse' transform='translate(190, 60)'>
        <rect className='connector' height='30' rx='12' width='60' />
        <text className='text' x='18' y='20'>so</text>
      </g>
      <path d='M194 75 L246 75' stroke='#f59e0b' stroke-width='2' fill='none' opacity='0.6' />
    </svg>
  );
}

export function EnglishPrepositionsTimeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: at / on / in na osi czasu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
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
      <g className='pulse' transform='translate(20, 28)'>
        <rect className='card' height='94' rx='18' width='120' />
        <text className='label' x='16' y='30'>AT</text>
        <text className='text' x='16' y='56'>7:30</text>
        <text className='text' x='16' y='76'>noon</text>
      </g>
      <g className='pulse pulse-2' transform='translate(150, 28)'>
        <rect className='card' height='94' rx='18' width='120' />
        <text className='label' x='16' y='30'>ON</text>
        <text className='text' x='16' y='56'>Monday</text>
        <text className='text' x='16' y='76'>14 May</text>
      </g>
      <g className='pulse pulse-3' transform='translate(280, 28)'>
        <rect className='card' height='94' rx='18' width='120' />
        <text className='label' x='16' y='30'>IN</text>
        <text className='text' x='16' y='56'>July</text>
        <text className='text' x='16' y='76'>2026</text>
      </g>
    </svg>
  );
}

export function EnglishPrepositionsTimelineAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: before, during, after na osi czasu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
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
        @keyframes markerPulse {
          0%, 15% { opacity: 0.35; transform: scale(0.9); }
          40%, 60% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.35; transform: scale(0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot, .dot-2, .dot-3 { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <rect className='panel' height='110' rx='18' width='380' x='20' y='20' />
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
  return (
    <svg
      aria-label='Animacja: at / in / on w miejscu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #e2e8f0;
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
      <g className='pulse' transform='translate(20, 28)'>
        <rect className='card' height='94' rx='18' width='120' />
        <text className='label' x='16' y='28'>AT</text>
        <circle className='pin' cx='38' cy='66' r='8' />
        <path className='pin' d='M38 74 L30 92 L46 92 Z' />
        <text className='text' x='60' y='70'>school</text>
      </g>
      <g className='pulse pulse-2' transform='translate(150, 28)'>
        <rect className='card' height='94' rx='18' width='120' />
        <text className='label' x='16' y='28'>IN</text>
        <rect className='box' x='20' y='46' width='60' height='40' rx='10' />
        <circle className='pin' cx='50' cy='66' r='6' />
        <text className='text' x='86' y='70'>room</text>
      </g>
      <g className='pulse pulse-3' transform='translate(280, 28)'>
        <rect className='card' height='94' rx='18' width='120' />
        <text className='label' x='16' y='28'>ON</text>
        <rect className='surface' x='20' y='56' width='70' height='10' rx='5' />
        <circle className='pin' cx='44' cy='50' r='7' />
        <text className='text' x='86' y='70'>board</text>
      </g>
    </svg>
  );
}

export function EnglishPrepositionsRelationsDiagram(): React.JSX.Element {
  return (
    <svg
      aria-label='Rysunek: between, above, below.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 2;
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
      `}</style>
      <g transform='translate(20, 26)'>
        <rect className='panel' height='88' rx='16' width='180' />
        <text className='label' x='16' y='26'>BETWEEN</text>
        <line className='line' x1='24' y1='56' x2='156' y2='56' />
        <circle className='muted' cx='40' cy='56' r='6' />
        <circle className='muted' cx='140' cy='56' r='6' />
        <circle className='dot' cx='90' cy='56' r='7' />
        <text className='text' x='28' y='78'>A</text>
        <text className='text' x='135' y='78'>B</text>
      </g>
      <g transform='translate(230, 26)'>
        <rect className='panel' height='88' rx='16' width='170' />
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
      role='img'
      viewBox='0 0 420 170'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #dbeafe;
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
      <rect className='panel' x='16' y='16' width='388' height='138' rx='24' />
      {items.map((item, index) => (
        <g key={item.key} transform={`translate(34, ${36 + index * 28})`}>
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
  return (
    <svg
      aria-label='Animation: a weekly routine with always, usually, and never.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 180'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #fde68a;
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
      <rect className='panel' x='16' y='16' width='388' height='148' rx='24' />
      {[
        { y: 50, tag: 'always', label: 'go to the cinema', fill: '#22c55e', count: 7, cls: 'always' },
        { y: 92, tag: 'usually', label: 'go with friends', fill: '#38bdf8', count: 6, cls: 'usually' },
        { y: 134, tag: 'never', label: 'eat popcorn', fill: '#fda4af', count: 0, cls: 'never' },
      ].map((row) => (
        <g key={row.tag} transform={`translate(34, ${row.y})`}>
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
  const mainVerb = mode === 'mainVerb';
  const leading = mainVerb ? 'She' : 'He';
  const adverb = mainVerb ? 'always' : 'never';
  const verb = mainVerb ? 'checks' : 'is';
  const tail = mainVerb ? 'her notes.' : 'late.';

  return (
    <svg
      aria-label='Animation: adverb position before the main verb or after be.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 400 150'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #ddd6fe;
          stroke-width: 2;
        }
        .word {
          font: 700 13px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        .chip {
          fill: #ede9fe;
          stroke: #c4b5fd;
          stroke-width: 2;
        }
        .tag {
          font: 700 10px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #6d28d9;
          letter-spacing: 0.14em;
          text-transform: uppercase;
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
      <rect className='panel' x='18' y='18' width='364' height='114' rx='24' />
      <text className='tag' x='34' y='42'>
        {mainVerb ? 'before the main verb' : 'after be'}
      </text>
      <g transform='translate(34, 72)'>
        <text className='word' x='0' y='0'>{leading}</text>
        <rect className='chip pulse' x={mainVerb ? 54 : 44} y='-18' rx='12' width='74' height='30' />
        <text className='word' x={mainVerb ? 70 : 60} y='0'>{mainVerb ? adverb : verb}</text>
        <text className='word' x={mainVerb ? 142 : 130} y='0'>{mainVerb ? verb : adverb}</text>
        <text className='word' x={mainVerb ? 210 : 208} y='0'>{tail}</text>
      </g>
    </svg>
  );
}

export function EnglishAdverbSentenceRepairAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animation: fixing adverb position in a sentence.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 170'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #dbeafe;
          stroke-width: 2;
        }
        .card {
          fill: #ffffff;
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
      <rect className='panel' x='16' y='16' width='388' height='138' rx='24' />
      <g className='wrong-line' transform='translate(36, 38)'>
        <rect className='card wrong-card' x='0' y='0' width='154' height='82' rx='18' />
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
        <rect className='card right-card' x='0' y='0' width='154' height='82' rx='18' />
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
  const rows = [
    { label: 'always', fill: '#22c55e', icon: '📚', habit: 'do homework', count: 7 },
    { label: 'sometimes', fill: '#f59e0b', icon: '🌳', habit: 'go to the park', count: 3 },
    { label: 'never', fill: '#fda4af', icon: '⏰', habit: 'be late', count: 0 },
  ] as const;

  return (
    <svg
      aria-label='Animation: building a weekly habit card with adverbs of frequency.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 184'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #dbeafe;
          stroke-width: 2;
        }
        .card {
          fill: #ffffff;
          stroke: #e2e8f0;
          stroke-width: 2;
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
        @keyframes habitPulse {
          0%, 100% { opacity: 0.78; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot-active { animation: none; }
        }
      `}</style>
      <rect className='panel' x='16' y='16' width='388' height='152' rx='24' />
      {rows.map((row, index) => (
        <g key={row.label} transform={`translate(34, ${40 + index * 40})`}>
          <rect className='card' x='0' y='0' width='352' height='28' rx='14' />
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
  const places = [
    { label: 'library', fill: '#38bdf8', icon: '📚', count: 6 },
    { label: 'park', fill: '#22c55e', icon: '🌳', count: 3 },
    { label: 'swimming pool', fill: '#fda4af', icon: '🏊', count: 0 },
  ] as const;

  return (
    <svg
      aria-label='Animation: describing how often you go to different places.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 188'
    >
      <style>{`
        .panel {
          fill: #f8fafc;
          stroke: #dbeafe;
          stroke-width: 2;
        }
        .card {
          fill: #ffffff;
          stroke: #e2e8f0;
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
        @keyframes placePulse {
          0%, 100% { opacity: 0.8; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot-active { animation: none; }
        }
      `}</style>
      <rect className='panel' x='16' y='16' width='388' height='156' rx='24' />
      {places.map((place, index) => (
        <g key={place.label} transform={`translate(${34 + index * 122}, 38)`}>
          <rect className='card' x='0' y='0' width='110' height='108' rx='18' />
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
