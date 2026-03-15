import React from 'react';

export function DivisionEqualGroupsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dzielenia: 12 kropek podzielone na 3 równe grupy.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .dot { fill: #38bdf8; }
        .box {
          fill: none;
          stroke: #e2e8f0;
          stroke-dasharray: 6 6;
        }
        .group {
          animation: groupPulse 4.8s ease-in-out infinite;
        }
        .group-2 { animation-delay: 1.6s; }
        .group-3 { animation-delay: 3.2s; }
        @keyframes groupPulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='box' height='86' rx='12' width='110' x='30' y='26' />
      <rect className='box' height='86' rx='12' width='110' x='155' y='26' />
      <rect className='box' height='86' rx='12' width='110' x='280' y='26' />
      {[0, 1, 2].map((group) => (
        <g key={`group-${group}`} className={`group group-${group + 1}`}>
          {[0, 1, 2, 3].map((index) => (
            <circle
              key={`dot-${group}-${index}`}
              className='dot'
              cx={55 + group * 125 + (index % 2) * 30}
              cy={50 + Math.floor(index / 2) * 30}
              r='8'
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function DivisionInverseAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: mnożenie i dzielenie są odwrotne.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .dot { fill: #22c55e; }
        .row { animation: rowPulse 3.8s ease-in-out infinite; }
        .row-2 { animation-delay: 1.2s; }
        .row-3 { animation-delay: 2.4s; }
        @keyframes rowPulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .row { animation: none; opacity: 1; }
        }
      `}</style>
      <rect
        fill='none'
        height='86'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='170'
        x='30'
        y='26'
      />
      {[0, 1, 2].map((row) => (
        <g key={`row-${row}`} className={`row row-${row + 1}`}>
          {[0, 1, 2, 3].map((col) => (
            <circle
              key={`row-${row}-col-${col}`}
              className='dot'
              cx={55 + col * 30}
              cy={45 + row * 24}
              r='7'
            />
          ))}
        </g>
      ))}
      <g fill='#64748b' fontSize='12' fontWeight='600'>
        <text x='220' y='55'>12 ÷ 3 = 4</text>
        <text x='220' y='80'>4 × 3 = 12</text>
      </g>
    </svg>
  );
}

export function DivisionRemainderAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dzielenia z resztą: 7 podzielone na 2 daje 3 reszta 1.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .dot { fill: #14b8a6; }
        .leftover {
          fill: #f97316;
          animation: leftoverPulse 3.6s ease-in-out infinite;
        }
        @keyframes leftoverPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .leftover { animation: none; opacity: 1; }
        }
      `}</style>
      <rect
        fill='none'
        height='70'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='200'
        x='20'
        y='20'
      />
      {[0, 1, 2].map((group) => (
        <g key={`pair-${group}`}>
          <circle className='dot' cx={45 + group * 55} cy='45' r='7' />
          <circle className='dot' cx={45 + group * 55} cy='70' r='7' />
        </g>
      ))}
      <circle className='leftover' cx='190' cy='45' r='7' />
      <text fill='#64748b' fontSize='12' fontWeight='600' x='235' y='55'>
        reszta 1
      </text>
    </svg>
  );
}

export function MultiplicationGroupsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja mnożenia: 3 grupy po 4 tworzą 12.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .group-a { fill: #f59e0b; }
        .group-b { fill: #60a5fa; }
        .group-c { fill: #34d399; }
        .array-dot { fill: #a855f7; }
        .left-groups { animation: groupsFade 6s ease-in-out infinite; }
        .array { animation: arrayReveal 6s ease-in-out infinite; }
        @keyframes groupsFade {
          0%, 45% { opacity: 1; }
          65%, 100% { opacity: 0.35; }
        }
        @keyframes arrayReveal {
          0%, 45% { opacity: 0; transform: scale(0.98); }
          65%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .left-groups, .array { animation: none; opacity: 1; }
        }
      `}</style>
      <g className='left-groups'>
        {[0, 1, 2, 3].map((index) => (
          <circle key={`a-${index}`} className='group-a' cx={40 + index * 18} cy='30' r='7' />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <circle key={`b-${index}`} className='group-b' cx={40 + index * 18} cy='70' r='7' />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <circle key={`c-${index}`} className='group-c' cx={40 + index * 18} cy='110' r='7' />
        ))}
      </g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='140' x2='190' y1='70' y2='70' />
        <polyline points='178,58 192,70 178,82' />
      </g>
      <rect
        fill='none'
        height='96'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='150'
        x='230'
        y='22'
      />
      <g className='array'>
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle
              key={`array-${row}-${col}`}
              className='array-dot'
              cx={250 + col * 30}
              cy={40 + row * 30}
              r='7'
            />
          ))
        )}
      </g>
    </svg>
  );
}

export function MultiplicationArrayAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja mnożenia: rzędy w tablicy pokazują kolejne sumy.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .row {
          animation: rowPulse 3.6s ease-in-out infinite;
        }
        .row-2 { animation-delay: 1.2s; }
        .row-3 { animation-delay: 2.4s; }
        .dot { fill: #a855f7; }
        @keyframes rowPulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .row { animation: none; opacity: 1; }
        }
      `}</style>
      <rect
        fill='none'
        height='86'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='190'
        x='40'
        y='26'
      />
      {[0, 1, 2].map((row) => (
        <g key={`row-${row}`} className={`row row-${row + 1}`}>
          {[0, 1, 2, 3].map((col) => (
            <circle
              key={`row-${row}-col-${col}`}
              className='dot'
              cx={70 + col * 40}
              cy={45 + row * 25}
              r='7'
            />
          ))}
          <text
            fill='#64748b'
            fontSize='12'
            fontWeight='600'
            x='245'
            y={49 + row * 25}
          >
            {(row + 1) * 4}
          </text>
        </g>
      ))}
      <text fill='#64748b' fontSize='12' fontWeight='600' x='245' y='34'>
        suma
      </text>
    </svg>
  );
}

export function MultiplicationCommutativeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: 3×4 to to samo co 4×3.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .array-a { animation: arrayA 6s ease-in-out infinite; }
        .array-b { animation: arrayB 6s ease-in-out infinite; }
        .dot-a { fill: #60a5fa; }
        .dot-b { fill: #f59e0b; }
        @keyframes arrayA {
          0%, 45% { opacity: 1; }
          60%, 100% { opacity: 0; }
        }
        @keyframes arrayB {
          0%, 45% { opacity: 0; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .array-a, .array-b { animation: none; opacity: 1; }
        }
      `}</style>
      <g className='array-a'>
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle
              key={`a-${row}-${col}`}
              className='dot-a'
              cx={70 + col * 24}
              cy={35 + row * 24}
              r='6'
            />
          ))
        )}
      </g>
      <g className='array-b'>
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2].map((col) => (
            <circle
              key={`b-${row}-${col}`}
              className='dot-b'
              cx={70 + col * 24}
              cy={35 + row * 24}
              r='6'
            />
          ))
        )}
      </g>
      <text fill='#0f172a' fontSize='14' fontWeight='700' x='170' y='64'>
        3×4 = 4×3
      </text>
    </svg>
  );
}

export function MultiplicationIntroPatternAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja mnożenia: powtarzane grupy zamieniają się w tablicę.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .card {
          fill: #fff7ed;
          stroke: #fdba74;
          stroke-width: 2;
        }
        .dot-a { fill: #fb7185; }
        .dot-b { fill: #f97316; }
        .dot-c { fill: #60a5fa; }
        .group-card {
          transform-box: fill-box;
          transform-origin: center;
          animation: groupPulse 6s ease-in-out infinite;
        }
        .group-2 { animation-delay: 0.4s; }
        .group-3 { animation-delay: 0.8s; }
        .groups { animation: groupsFade 6s ease-in-out infinite; }
        .arrow { animation: arrowPulse 6s ease-in-out infinite; }
        .grid {
          transform-box: fill-box;
          transform-origin: center;
          animation: gridReveal 6s ease-in-out infinite;
        }
        .grid-dot { fill: #a855f7; }
        @keyframes groupPulse {
          0%, 35% { transform: translateY(0); opacity: 0.95; }
          50% { transform: translateY(-4px); opacity: 1; }
          70%, 100% { transform: translateY(0); opacity: 0.35; }
        }
        @keyframes groupsFade {
          0%, 45% { opacity: 1; }
          65%, 100% { opacity: 0.25; }
        }
        @keyframes arrowPulse {
          0%, 45% { opacity: 0.25; }
          60%, 100% { opacity: 1; }
        }
        @keyframes gridReveal {
          0%, 45% { opacity: 0; transform: scale(0.95); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-card, .groups, .arrow, .grid { animation: none; opacity: 1; }
        }
      `}</style>
      <g className='groups'>
        {[0, 1, 2].map((group) => (
          <g key={`group-${group}`} className={`group-card group-${group + 1}`}>
            <rect
              className='card'
              height='86'
              rx='14'
              width='64'
              x={18 + group * 74}
              y='24'
            />
            {[0, 1, 2].map((dot) => (
              <circle
                key={`group-${group}-dot-${dot}`}
                className={group === 0 ? 'dot-a' : group === 1 ? 'dot-b' : 'dot-c'}
                cx={50 + group * 74}
                cy={48 + dot * 20}
                r='7'
              />
            ))}
          </g>
        ))}
      </g>
      <g className='arrow' fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='235' x2='255' y1='70' y2='70' />
        <polyline points='248,62 258,70 248,78' />
      </g>
      <g className='grid'>
        <rect
          fill='none'
          height='96'
          rx='14'
          stroke='#e2e8f0'
          strokeDasharray='6 6'
          width='90'
          x='258'
          y='22'
        />
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => (
            <circle
              key={`grid-${row}-${col}`}
              className='grid-dot'
              cx={276 + col * 24}
              cy={44 + row * 24}
              r='6'
            />
          ))
        )}
      </g>
    </svg>
  );
}

export function MultiplicationSkipCountAnimation(): React.JSX.Element {
  const doubles = [0, 2, 4, 6, 8, 10];
  const triples = [0, 3, 6, 9, 12];
  const doubleStart = 44;
  const doubleStep = 45;
  const tripleStart = 44;
  const tripleStep = 55;

  return (
    <svg
      aria-label='Animacja mnożenia: skoki co 2 i co 3 na osi liczbowej.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 160'
    >
      <style>{`
        .line { stroke: #cbd5f5; stroke-width: 4; stroke-linecap: round; }
        .tick { stroke: #94a3b8; stroke-width: 2; }
        .label { fill: #0f172a; font-size: 12px; font-weight: 700; }
        .value { fill: #64748b; font-size: 11px; font-weight: 600; }
        .hop {
          transform-box: fill-box;
          transform-origin: center;
          animation: hopPulse 3.6s ease-in-out infinite;
          opacity: 0.35;
        }
        .hop-two { fill: #60a5fa; }
        .hop-three { fill: #f59e0b; }
        @keyframes hopPulse {
          0%, 100% { transform: translateY(0); opacity: 0.35; }
          40% { transform: translateY(-6px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hop { animation: none; opacity: 1; }
        }
      `}</style>
      <text className='label' x='18' y='46'>
        ×2
      </text>
      <line className='line' x1={doubleStart} x2={doubleStart + doubleStep * (doubles.length - 1)} y1='40' y2='40' />
      {doubles.map((value, index) => {
        const x = doubleStart + doubleStep * index;
        return (
          <g key={`double-${value}`}>
            <line className='tick' x1={x} x2={x} y1='34' y2='46' />
            <circle
              className='hop hop-two'
              cx={x}
              cy='40'
              r='6'
              style={{ animationDelay: `${index * 0.35}s` }}
            />
            <text className='value' x={x - 6} y='60'>
              {value}
            </text>
          </g>
        );
      })}

      <text className='label' x='18' y='120'>
        ×3
      </text>
      <line className='line' x1={tripleStart} x2={tripleStart + tripleStep * (triples.length - 1)} y1='114' y2='114' />
      {triples.map((value, index) => {
        const x = tripleStart + tripleStep * index;
        return (
          <g key={`triple-${value}`}>
            <line className='tick' x1={x} x2={x} y1='108' y2='120' />
            <circle
              className='hop hop-three'
              cx={x}
              cy='114'
              r='6'
              style={{ animationDelay: `${index * 0.45}s` }}
            />
            <text className='value' x={x - 6} y='134'>
              {value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MultiplicationDoubleDoubleAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja mnożenia: razy 4 to podwójnie i jeszcze raz podwójnie.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .frame {
          fill: #ffffff;
          stroke: #e2e8f0;
          stroke-width: 2;
        }
        .frame-a { animation: frameGlow 6s ease-in-out infinite; }
        .frame-b { animation-delay: 2s; }
        .frame-c { animation-delay: 4s; }
        .dot-a { fill: #fb7185; }
        .dot-b { fill: #38bdf8; }
        .dot-c { fill: #22c55e; }
        @keyframes frameGlow {
          0%, 60%, 100% { stroke: #e2e8f0; }
          20%, 40% { stroke: #f97316; }
        }
        @media (prefers-reduced-motion: reduce) {
          .frame-a, .frame-b, .frame-c { animation: none; }
        }
      `}</style>
      <rect className='frame frame-a' height='90' rx='14' width='90' x='20' y='25' />
      <rect className='frame frame-b' height='90' rx='14' width='90' x='135' y='25' />
      <rect className='frame frame-c' height='90' rx='14' width='90' x='250' y='25' />

      {[0, 1, 2].map((index) => (
        <circle key={`a-${index}`} className='dot-a' cx={45 + index * 22} cy='70' r='6' />
      ))}

      {[0, 1].map((row) =>
        [0, 1, 2].map((col) => (
          <circle
            key={`b-${row}-${col}`}
            className='dot-b'
            cx={160 + col * 22}
            cy={55 + row * 20}
            r='5.5'
          />
        ))
      )}

      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle
            key={`c-${row}-${col}`}
            className='dot-c'
            cx={266 + col * 16}
            cy={48 + row * 20}
            r='5'
          />
        ))
      )}

      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='112' x2='132' y1='70' y2='70' />
        <polyline points='124,62 134,70 124,78' />
        <line x1='227' x2='247' y1='70' y2='70' />
        <polyline points='239,62 249,70 239,78' />
      </g>
    </svg>
  );
}

export function MultiplicationFiveRhythmAnimation(): React.JSX.Element {
  const values = [5, 10, 15, 20, 25];
  const startX = 50;
  const step = 55;

  return (
    <svg
      aria-label='Animacja mnożenia: piątki rosną w rytmie 5, 10, 15, 20, 25.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .star { fill: #fbbf24; }
        .pulse {
          fill: none;
          stroke: #f59e0b;
          stroke-width: 2;
          opacity: 0.2;
          animation: pulseRing 3.6s ease-in-out infinite;
        }
        .label { fill: #0f172a; font-size: 12px; font-weight: 700; }
        .value { fill: #64748b; font-size: 11px; font-weight: 600; }
        @keyframes pulseRing {
          0%, 100% { opacity: 0.2; transform: scale(0.9); }
          50% { opacity: 0.9; transform: scale(1.05); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; opacity: 0.6; }
        }
      `}</style>
      <text className='label' x='16' y='34'>
        ×5
      </text>
      {values.map((value, index) => {
        const x = startX + step * index;
        return (
          <g key={`five-${value}`}>
            <circle
              className='pulse'
              cx={x}
              cy='60'
              r='16'
              style={{ animationDelay: `${index * 0.5}s` }}
            />
            <polygon
              className='star'
              points={`${x},44 ${x + 4},56 ${x + 16},56 ${x + 6},64 ${x + 10},76 ${x},68 ${x - 10},76 ${x - 6},64 ${x - 16},56 ${x - 4},56`}
            />
            <text className='value' x={x - 8} y='100'>
              {value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function MultiplicationTenShiftAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja mnożenia: razy 10 dodaje zero na końcu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .base { fill: #0f172a; font-size: 34px; font-weight: 800; }
        .result { fill: #0f172a; font-size: 34px; font-weight: 800; }
        .zero {
          fill: #f97316;
          font-size: 34px;
          font-weight: 800;
          animation: zeroSlide 4.5s ease-in-out infinite;
        }
        .arrow { animation: arrowGlow 4.5s ease-in-out infinite; }
        @keyframes zeroSlide {
          0%, 35% { opacity: 0.2; transform: translateX(-18px); }
          55%, 100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes arrowGlow {
          0%, 35% { opacity: 0.3; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .zero, .arrow { animation: none; opacity: 1; }
        }
      `}</style>
      <text className='base' x='60' y='80'>
        8
      </text>
      <text className='result' x='230' y='80'>
        8
      </text>
      <text className='zero' x='250' y='80'>
        0
      </text>
      <g className='arrow' fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='95' x2='190' y1='70' y2='70' />
        <polyline points='178,62 192,70 178,78' />
      </g>
      <text fill='#64748b' fontSize='12' fontWeight='600' x='50' y='32'>
        ×10
      </text>
      <text fill='#64748b' fontSize='12' fontWeight='600' x='210' y='32'>
        dopisz 0
      </text>
    </svg>
  );
}

export function MultiplicationGamePreviewAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja gry: zaznaczaj grupy kropek, aby zobaczyć mnożenie.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .dot { fill: #a855f7; }
        .focus {
          fill: rgba(167,139,250,0.18);
          stroke: #8b5cf6;
          stroke-width: 2;
          animation: focusMove 4.8s ease-in-out infinite;
        }
        @keyframes focusMove {
          0%, 25% { transform: translate(0, 0); }
          45%, 70% { transform: translate(0, 28px); }
          85%, 100% { transform: translate(0, 56px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .focus { animation: none; }
        }
      `}</style>
      <rect fill='none' height='96' rx='14' stroke='#e2e8f0' strokeDasharray='6 6' width='200' x='70' y='22' />
      <rect className='focus' height='24' rx='10' width='160' x='90' y='36' />
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle
            key={`game-${row}-${col}`}
            className='dot'
            cx={110 + col * 40}
            cy={48 + row * 28}
            r='7'
          />
        ))
      )}
    </svg>
  );
}
