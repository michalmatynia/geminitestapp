'use client';

import React from 'react';
import { useAddingSurfaceIds, AddingSurface, LabelChip } from './AddingAnimationSurface';

export function AddingCrossTenSvgAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-cross-ten');

  return (
    <svg aria-label='Animacja dodawania przez 10: 7 plus 5 dzieli się na 3 i 2, aby dojść do 12.' className='h-auto w-full' data-testid='adding-cross-ten-animation' role='img' viewBox='0 0 420 150'>
      <style>{`
        .adding-cross-ten-base { fill: #f59e0b; }
        .adding-cross-ten-fill { fill: #60a5fa; animation: addingCrossTenFill 6.6s ease-in-out infinite; }
        .adding-cross-ten-rest { fill: #34d399; animation: addingCrossTenRest 6.6s ease-in-out infinite; }
        .adding-cross-ten-label { animation: addingCrossTenPulse 6.6s ease-in-out infinite; }
        @keyframes addingCrossTenFill { 0%, 24% { opacity: 0; transform: translateX(20px); } 44%, 100% { opacity: 1; transform: translateX(0); } }
        @keyframes addingCrossTenRest { 0%, 48% { opacity: 0.2; transform: scale(0.86); } 62%, 100% { opacity: 1; transform: scale(1); } }
        @keyframes addingCrossTenPulse { 0%, 35% { opacity: 0.4; } 52%, 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .adding-cross-ten-fill, .adding-cross-ten-rest, .adding-cross-ten-label { animation: none; opacity: 1; transform: none; } }
      `}</style>
      <AddingSurface accentEnd='#dcfce7' accentStart='#34d399' atmosphereA='rgba(16, 185, 129, 0.08)' atmosphereB='rgba(96, 165, 250, 0.08)' ids={surfaceIds} stroke='rgba(16, 185, 129, 0.12)' testIdPrefix='adding-cross-ten' x={12} y={12} width={396} height={126} rx={24} />
      <LabelChip fill='rgba(255,255,255,0.88)' label='7 + 5' stroke='rgba(52,211,153,0.22)' x={26} y={22} />
      <rect fill='rgba(255,255,255,0.72)' height='62' rx='18' stroke='rgba(148,163,184,0.28)' strokeDasharray='6 6' width='196' x='196' y='44' />
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (<circle key={`base-${index}`} className='adding-cross-ten-base' cx={44 + index * 20} cy={62} r='8.5' />))}
      {[0, 1, 2].map((index) => (<circle key={`fill-${index}`} className='adding-cross-ten-fill' cx={44 + index * 20} cy={98} r='8.5' />))}
      {[0, 1].map((index) => (<circle key={`rest-${index}`} className='adding-cross-ten-rest' cx={230 + index * 24} cy={75} r='10' />))}
      <text className='adding-cross-ten-label' fill='#0f172a' fontSize='12' fontWeight='700' x='210' y='100'>10 + 2 = 12</text>
    </svg>
  );
}

export function AddingTenFrameAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-ten-frame');

  return (
    <svg aria-label='Animacja ramki dziesiątkowej.' className='h-auto w-full' data-testid='adding-ten-frame-animation' role='img' viewBox='0 0 420 140'>
      <style>{`
        .adding-ten-frame-cell { fill: rgba(226, 232, 240, 0.62); stroke: rgba(148, 163, 184, 0.22); stroke-width: 1.5; }
        .adding-ten-frame-base { fill: #f59e0b; }
        .adding-ten-frame-fill { fill: #60a5fa; animation: addingTenFrameFill 6s ease-in-out infinite; }
        .adding-ten-frame-rest { fill: #34d399; animation: addingTenFrameRest 6s ease-in-out infinite; }
        @keyframes addingTenFrameFill { 0%, 25% { opacity: 0; transform: translateX(20px); } 45%, 100% { opacity: 1; transform: translateX(0); } }
        @keyframes addingTenFrameRest { 0%, 48% { opacity: 0.2; transform: scale(0.9); } 62%, 100% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .adding-ten-frame-fill, .adding-ten-frame-rest { animation: none; opacity: 1; } }
      `}</style>
      <AddingSurface accentEnd='#f0f9ff' accentStart='#60a5fa' atmosphereA='rgba(245, 158, 11, 0.08)' atmosphereB='rgba(96, 165, 250, 0.08)' ids={surfaceIds} stroke='rgba(96, 165, 250, 0.12)' testIdPrefix='adding-ten-frame' x={12} y={12} width={396} height={116} rx={24} />
      {[0, 1].map((row) => [0, 1, 2, 3, 4].map((col) => (<rect key={`cell-${row}-${col}`} className='adding-ten-frame-cell' height='24' rx='8' width='28' x={48 + col * 38} y={50 + row * 34} />)))}
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (<circle key={`base-${index}`} className='adding-ten-frame-base' cx={62 + (index % 5) * 38} cy={62 + Math.floor(index / 5) * 34} r='9.5' />))}
      {[0, 1, 2].map((index) => (<circle key={`fill-${index}`} className='adding-ten-frame-fill' cx={62 + ((7 + index) % 5) * 38} cy={62 + Math.floor((7 + index) / 5) * 34} r='9.5' />))}
      {[0, 1].map((index) => (<circle key={`rest-${index}`} className='adding-ten-frame-rest' cx={300 + index * 28} cy={76} r='10' />))}
      <text fill='#475569' fontSize='12' fontWeight='700' x='286' y='42'>+2</text>
      <line stroke='#94a3b8' strokeWidth='3' x1='262' x2='292' y1='76' y2='76' />
    </svg>
  );
}

export function AddingTwoDigitAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-two-digit');

  return (
    <svg aria-label='Animacja dodawania dwucyfrowego: dziesiątki i jedności łączą się w sumę.' className='h-auto w-full' data-testid='adding-two-digit-animation' role='img' viewBox='0 0 460 190'>
      <style>{`
        .adding-two-digit-tens-a { fill: #f59e0b; } .adding-two-digit-ones-a { fill: #fbbf24; }
        .adding-two-digit-tens-b { fill: #60a5fa; } .adding-two-digit-ones-b { fill: #93c5fd; }
        .adding-two-digit-sum-tens { fill: #10b981; } .adding-two-digit-sum-ones { fill: #34d399; }
        .adding-two-digit-group-a, .adding-two-digit-group-b, .adding-two-digit-sum { transform-box: fill-box; transform-origin: center; }
        .adding-two-digit-group-a { animation: addingTwoDigitA 7s ease-in-out infinite; }
        .adding-two-digit-group-b { animation: addingTwoDigitB 7s ease-in-out infinite; }
        .adding-two-digit-sum { animation: addingTwoDigitReveal 7s ease-in-out infinite; }
        @keyframes addingTwoDigitA { 0%, 18% { transform: translateX(0); opacity: 1; } 42% { transform: translateX(176px); opacity: 1; } 56% { transform: translateX(196px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes addingTwoDigitB { 0%, 28% { transform: translateX(0); opacity: 1; } 54% { transform: translateX(176px); opacity: 1; } 68% { transform: translateX(196px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes addingTwoDigitReveal { 0%, 46% { opacity: 0; transform: scale(0.97); } 60%, 100% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .adding-two-digit-group-a, .adding-two-digit-group-b, .adding-two-digit-sum { animation: none; } }
      `}</style>
      <AddingSurface accentEnd='#dcfce7' accentStart='#10b981' atmosphereA='rgba(16, 185, 129, 0.08)' atmosphereB='rgba(245, 158, 11, 0.08)' ids={surfaceIds} stroke='rgba(16, 185, 129, 0.12)' testIdPrefix='adding-two-digit' x={12} y={12} width={436} height={166} rx={28} />
      <LabelChip fill='rgba(255,255,255,0.9)' label='24 + 13' stroke='rgba(16,185,129,0.2)' width={96} x={26} y={22} />
      <rect fill='rgba(255,255,255,0.72)' height='128' rx='20' stroke='rgba(148,163,184,0.28)' strokeDasharray='6 6' width='190' x='246' y='34' />
      <g className='adding-two-digit-group-a'>{[0, 1].map((index) => (<rect key={`tens-a-${index}`} className='adding-two-digit-tens-a' height='18' rx='8' width='38' x={40 + index * 46} y={54} />))}{[0, 1, 2, 3].map((index) => (<circle key={`ones-a-${index}`} className='adding-two-digit-ones-a' cx={46 + index * 22} cy={102} r='7.5' />))}</g>
      <g className='adding-two-digit-group-b'><rect className='adding-two-digit-tens-b' height='18' rx='8' width='38' x='40' y={132} />{[0, 1, 2].map((index) => (<circle key={`ones-b-${index}`} className='adding-two-digit-ones-b' cx={46 + index * 22} cy={160} r='7.5' />))}</g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='5'><line x1='156' x2='184' y1='108' y2='108' /><line x1='170' x2='170' y1='94' y2='122' /><line x1='198' x2='226' y1='108' y2='108' /></g>
      <g className='adding-two-digit-sum'>{[0, 1, 2].map((index) => (<rect key={`sum-tens-${index}`} className='adding-two-digit-sum-tens' height='18' rx='8' width='38' x={270 + index * 46} y={78} />))}{[0, 1, 2, 3, 4, 5, 6].map((index) => (<circle key={`sum-ones-${index}`} className='adding-two-digit-sum-ones' cx={278 + index * 22} cy={126} r='7.5' />))}</g>
    </svg>
  );
}

export function AddingCommutativeAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-commutative');

  return (
    <svg aria-label='Animacja: 3 plus 5 to to samo co 5 plus 3.' className='h-auto w-full' data-testid='adding-commutative-animation' role='img' viewBox='0 0 320 140'>
      <style>{`
        .adding-commutative-first { animation: addingCommutativeFirst 6s ease-in-out infinite; }
        .adding-commutative-second { animation: addingCommutativeSecond 6s ease-in-out infinite; }
        @keyframes addingCommutativeFirst { 0%, 45% { opacity: 1; } 58%, 100% { opacity: 0; } }
        @keyframes addingCommutativeSecond { 0%, 45% { opacity: 0; } 58%, 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .adding-commutative-first, .adding-commutative-second { animation: none; opacity: 1; } }
      `}</style>
      <AddingSurface accentEnd='#fef9c3' accentStart='#facc15' atmosphereA='rgba(250, 204, 21, 0.08)' atmosphereB='rgba(96, 165, 250, 0.08)' ids={surfaceIds} stroke='rgba(250, 204, 21, 0.12)' testIdPrefix='adding-commutative' x={12} y={12} width={296} height={116} rx={24} />
      <LabelChip fill='rgba(255,255,255,0.88)' label='zamień kolejność' stroke='rgba(250,204,21,0.22)' width={128} x={24} y={22} />
      <text className='adding-commutative-first' fill='#0f172a' fontSize='24' fontWeight='700' textAnchor='middle' x='160' y='70'>3 + 5 = 8</text>
      <text className='adding-commutative-second' fill='#0f172a' fontSize='24' fontWeight='700' textAnchor='middle' x='160' y='92'>5 + 3 = 8</text>
      <path d='M78 104 C110 116 210 116 242 104' fill='none' stroke='rgba(148, 163, 184, 0.38)' strokeLinecap='round' strokeWidth='5' />
    </svg>
  );
}

export function AddingZeroAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-zero');

  return (
    <svg aria-label='Animacja: dodawanie zera nie zmienia wyniku.' className='h-auto w-full' data-testid='adding-zero-animation' role='img' viewBox='0 0 320 140'>
      <style>{`
        .adding-zero-dot { fill: #f59e0b; } .adding-zero-sum { fill: #34d399; }
        .adding-zero-ring { fill: none; stroke: #94a3b8; stroke-width: 4; transform-box: fill-box; transform-origin: center; animation: addingZeroPulse 4.4s ease-in-out infinite; }
        @keyframes addingZeroPulse { 0%, 100% { opacity: 0.4; transform: scale(0.92); } 50% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .adding-zero-ring { animation: none; opacity: 1; } }
      `}</style>
      <AddingSurface accentEnd='#dcfce7' accentStart='#22c55e' atmosphereA='rgba(34, 197, 94, 0.08)' atmosphereB='rgba(245, 158, 11, 0.08)' ids={surfaceIds} stroke='rgba(34, 197, 94, 0.12)' testIdPrefix='adding-zero' x={12} y={12} width={296} height={116} rx={24} />
      <LabelChip fill='rgba(255,255,255,0.88)' label='+ 0 = bez zmian' stroke='rgba(34,197,94,0.22)' width={118} x={24} y={22} />
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (<circle key={`left-${index}`} className='adding-zero-dot' cx={44 + index * 18} cy={78} r='6.5' />))}
      <text fill='#64748b' fontSize='20' fontWeight='700' x='154' y='84'>+</text>
      <circle className='adding-zero-ring' cx='184' cy={76} r='11' />
      <text fill='#64748b' fontSize='20' fontWeight='700' x='206' y='84'>=</text>
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (<circle key={`sum-${index}`} className='adding-zero-sum' cx={236 + index * 12} cy={78} r='5.5' />))}
    </svg>
  );
}

export function AddingMakeTenPairsAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-make-ten');

  return (
    <svg aria-label='Animacja: szukaj par do 10, na przykład 6 i 4.' className='h-auto w-full' data-testid='adding-make-ten-animation' role='img' viewBox='0 0 320 140'>
      <style>{`
        .adding-make-ten-slot { fill: rgba(226, 232, 240, 0.88); } .adding-make-ten-base { fill: #f59e0b; }
        .adding-make-ten-fill { fill: #60a5fa; transform-box: fill-box; transform-origin: center; animation: addingMakeTenFill 5.8s ease-in-out infinite; }
        .adding-make-ten-label { animation: addingMakeTenPulse 5.8s ease-in-out infinite; }
        @keyframes addingMakeTenFill { 0%, 28% { transform: translateX(52px); opacity: 0; } 48% { transform: translateX(18px); opacity: 1; } 62%, 100% { transform: translateX(0); opacity: 1; } }
        @keyframes addingMakeTenPulse { 0%, 36% { opacity: 0.4; } 54%, 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .adding-make-ten-fill, .adding-make-ten-label { animation: none; opacity: 1; transform: none; } }
      `}</style>
      <AddingSurface accentEnd='#fef3c7' accentStart='#f59e0b' atmosphereA='rgba(245, 158, 11, 0.08)' atmosphereB='rgba(96, 165, 250, 0.08)' ids={surfaceIds} stroke='rgba(245, 158, 11, 0.12)' testIdPrefix='adding-make-ten' x={12} y={12} width={296} height={116} rx={24} />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (<circle key={`slot-${index}`} className='adding-make-ten-slot' cx={40 + index * 24} cy={82} r='10' />))}
      {[0, 1, 2, 3, 4, 5].map((index) => (<circle key={`base-${index}`} className='adding-make-ten-base' cx={40 + index * 24} cy={82} r='9.5' />))}
      {[0, 1, 2, 3].map((index) => (<circle key={`fill-${index}`} className='adding-make-ten-fill' cx={40 + (6 + index) * 24} cy={82} r='9.5' />))}
      <text className='adding-make-ten-label' fill='#0f172a' fontSize='14' fontWeight='700' textAnchor='middle' x='160' y='42'>6 + 4 = 10</text>
    </svg>
  );
}

export function AddingDoublesAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-doubles');

  return (
    <svg aria-label='Animacja: podwojenia pomagają w szybkim dodawaniu.' className='h-auto w-full' data-testid='adding-doubles-animation' role='img' viewBox='0 0 320 140'>
      <style>{`
        .adding-doubles-left { fill: #f59e0b; } .adding-doubles-right { fill: #60a5fa; }
        .adding-doubles-sum { fill: #34d399; animation: addingDoublesReveal 5.8s ease-in-out infinite; }
        @keyframes addingDoublesReveal { 0%, 36% { opacity: 0; transform: scale(0.9); } 56%, 100% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .adding-doubles-sum { animation: none; opacity: 1; transform: none; } }
      `}</style>
      <AddingSurface accentEnd='#dbeafe' accentStart='#60a5fa' atmosphereA='rgba(96, 165, 250, 0.08)' atmosphereB='rgba(52, 211, 153, 0.08)' ids={surfaceIds} stroke='rgba(96, 165, 250, 0.12)' testIdPrefix='adding-doubles' x={12} y={12} width={296} height={116} rx={24} />
      <line stroke='rgba(148,163,184,0.4)' strokeDasharray='4 6' strokeWidth='2.5' x1='160' x2='160' y1='34' y2='112' />
      {[0, 1, 2, 3, 4].map((index) => (<circle key={`left-${index}`} className='adding-doubles-left' cx='90' cy={40 + index * 14} r='6.5' />))}
      {[0, 1, 2, 3, 4].map((index) => (<circle key={`right-${index}`} className='adding-doubles-right' cx='230' cy={40 + index * 14} r='6.5' />))}
      <text fill='#64748b' fontSize='17' fontWeight='700' x='148' y='76'>=</text>
      <g className='adding-doubles-sum'>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (<circle key={`sum-${index}`} className='adding-doubles-sum' cx={120 + (index % 5) * 16} cy={42 + Math.floor(index / 5) * 22} r='5.5' />))}</g>
    </svg>
  );
}

export function AddingCountOnAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-count-on');

  return (
    <svg aria-label='Animacja: licz w górę od większej liczby.' className='h-auto w-full' data-testid='adding-count-on-animation' role='img' viewBox='0 0 320 140'>
      <style>{`
        .adding-count-on-step { fill: rgba(226, 232, 240, 0.96); animation: addingCountOnStep 3.8s ease-in-out infinite; }
        @keyframes addingCountOnStep { 0%, 100% { fill: rgba(226, 232, 240, 0.96); } 50% { fill: rgba(52, 211, 153, 0.96); } }
        @media (prefers-reduced-motion: reduce) { .adding-count-on-step { animation: none; fill: rgba(52, 211, 153, 0.96); } }
      `}</style>
      <AddingSurface accentEnd='#dcfce7' accentStart='#34d399' atmosphereA='rgba(52, 211, 153, 0.08)' atmosphereB='rgba(245, 158, 11, 0.08)' ids={surfaceIds} stroke='rgba(52, 211, 153, 0.12)' testIdPrefix='adding-count-on' x={12} y={12} width={296} height={116} rx={24} />
      <path d='M52 98 L104 84 L156 70 L208 56' fill='none' stroke='rgba(99, 102, 241, 0.28)' strokeLinecap='round' strokeWidth='5' />
      {[4, 5, 6, 7].map((value, index) => (<g key={`step-${value}`}><circle className='adding-count-on-step' cx={56 + index * 52} cy={96 - index * 14} r='14' style={{ animationDelay: `${index * 0.6}s` }} /><text fill='#0f172a' fontSize='12' fontWeight='700' textAnchor='middle' x={56 + index * 52} y={100 - index * 14}>{value}</text></g>))}
      <text fill='#64748b' fontSize='12' fontWeight='700' x='28' y='118'>start</text>
      <text fill='#64748b' fontSize='12' fontWeight='700' x='220' y='48'>+3</text>
    </svg>
  );
}

export function AddingTensOnesAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-tens-ones');

  return (
    <svg aria-label='Animacja: dziesiątki i jedności łączą się osobno.' className='h-auto w-full' data-testid='adding-tens-ones-animation' role='img' viewBox='0 0 340 160'>
      <style>{`
        .adding-tens-ones-ten-a { fill: #f59e0b; } .adding-tens-ones-one-a { fill: #fbbf24; }
        .adding-tens-ones-ten-b { fill: #60a5fa; } .adding-tens-ones-one-b { fill: #93c5fd; }
        .adding-tens-ones-sum { fill: #34d399; animation: addingTensOnesReveal 6s ease-in-out infinite; }
        .adding-tens-ones-addend-b { transform-box: fill-box; transform-origin: center; animation: addingTensOnesMove 6s ease-in-out infinite; }
        @keyframes addingTensOnesMove { 0%, 25% { transform: translateY(0); opacity: 1; } 50% { transform: translateY(38px); opacity: 1; } 64% { opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes addingTensOnesReveal { 0%, 46% { opacity: 0; } 64%, 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .adding-tens-ones-addend-b, .adding-tens-ones-sum { animation: none; opacity: 1; } }
      `}</style>
      <AddingSurface accentEnd='#fef3c7' accentStart='#f59e0b' atmosphereA='rgba(245, 158, 11, 0.08)' atmosphereB='rgba(96, 165, 250, 0.08)' ids={surfaceIds} stroke='rgba(245, 158, 11, 0.12)' testIdPrefix='adding-tens-ones' x={12} y={12} width={316} height={136} rx={24} />
      <text fill='#64748b' fontSize='11' fontWeight='700' x='28' y='36'>10</text><text fill='#64748b' fontSize='11' fontWeight='700' x='118' y='36'>1</text>
      <g><rect className='adding-tens-ones-ten-a' height='42' rx='5' width='12' x='36' y='44' /><rect className='adding-tens-ones-ten-a' height='42' rx='5' width='12' x='54' y='44' />{[0, 1, 2, 3].map((index) => (<circle key={`one-a-${index}`} className='adding-tens-ones-one-a' cx={128 + index * 16} cy='64' r='6' />))}</g>
      <g className='adding-tens-ones-addend-b'><rect className='adding-tens-ones-ten-b' height='42' rx='5' width='12' x='36' y='94' />{[0, 1, 2].map((index) => (<circle key={`one-b-${index}`} className='adding-tens-ones-one-b' cx={128 + index * 16} cy='114' r='6' />))}</g>
      <text fill='#64748b' fontSize='16' fontWeight='700' x='82' y='108'>+</text>
      <line stroke='rgba(148,163,184,0.4)' strokeWidth='2' x1='28' x2='198' y1='132' y2='132' />
      <g className='adding-tens-ones-sum'>{[0, 1, 2].map((index) => (<rect key={`ten-sum-${index}`} className='adding-tens-ones-sum' height='40' rx='5' width='12' x={222 + index * 18} y='92' />))}{[0, 1, 2, 3, 4, 5, 6].map((index) => (<circle key={`one-sum-${index}`} className='adding-tens-ones-sum' cx={250 + index * 10} cy='118' r='4.6' />))}</g>
    </svg>
  );
}

export function AddingColumnAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-column');

  return (
    <svg aria-label='Animacja dodawania w kolumnach: dziesiątki i jedności sumują się osobno.' className='h-auto w-full' data-testid='adding-column-animation' role='img' viewBox='0 0 440 200'>
      <style>{`
        .adding-column-panel { fill: rgba(255, 255, 255, 0.72); stroke: rgba(148, 163, 184, 0.24); }
        .adding-column-digit-a { fill: #f59e0b; } .adding-column-digit-b { fill: #60a5fa; } .adding-column-digit-sum { fill: #10b981; }
        .adding-column-carry { fill: #f97316; animation: addingColumnCarry 7s ease-in-out infinite; }
        .adding-column-move-a, .adding-column-move-b, .adding-column-sum { transform-box: fill-box; transform-origin: center; }
        .adding-column-move-a { animation: addingColumnMoveA 7s ease-in-out infinite; }
        .adding-column-move-b { animation: addingColumnMoveB 7s ease-in-out infinite; }
        .adding-column-sum { animation: addingColumnReveal 7s ease-in-out infinite; }
        @keyframes addingColumnMoveA { 0%, 20% { transform: translateY(0); opacity: 1; } 45% { transform: translateY(20px); opacity: 1; } 60% { transform: translateY(28px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes addingColumnMoveB { 0%, 30% { transform: translateY(0); opacity: 1; } 56% { transform: translateY(20px); opacity: 1; } 70% { transform: translateY(28px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        @keyframes addingColumnReveal { 0%, 46% { opacity: 0; transform: scale(0.97); } 60%, 100% { opacity: 1; transform: scale(1); } }
        @keyframes addingColumnCarry { 0%, 50% { opacity: 0; transform: translateY(6px); } 65%, 100% { opacity: 1; transform: translateY(0); } }
        @media (prefers-reduced-motion: reduce) { .adding-column-move-a, .adding-column-move-b, .adding-column-sum, .adding-column-carry { animation: none; opacity: 1; } }
      `}</style>
      <AddingSurface accentEnd='#dbeafe' accentStart='#60a5fa' atmosphereA='rgba(96, 165, 250, 0.08)' atmosphereB='rgba(16, 185, 129, 0.08)' ids={surfaceIds} stroke='rgba(96, 165, 250, 0.12)' testIdPrefix='adding-column' x={12} y={12} width={416} height={176} rx={28} />
      <rect className='adding-column-panel' height='146' rx='20' width='250' x='28' y='28' />
      <rect className='adding-column-panel' height='146' rx='20' width='120' x='292' y='28' />
      <line stroke='rgba(148,163,184,0.34)' strokeWidth='2' x1='156' x2='156' y1='40' y2='162' /><line stroke='rgba(148,163,184,0.34)' strokeWidth='2' x1='292' x2='412' y1='116' y2='116' />
      <text fill='#475569' fontSize='12' fontWeight='700' x='80' y='52'>Dziesiątki</text><text fill='#475569' fontSize='12' fontWeight='700' x='184' y='52'>Jedności</text><text fill='#475569' fontSize='12' fontWeight='700' x='318' y='52'>Suma</text>
      <g className='adding-column-move-a'><rect className='adding-column-digit-a' height='22' rx='7' width='54' x='66' y='68' /><rect className='adding-column-digit-a' height='22' rx='7' width='54' x='176' y='68' /></g>
      <g className='adding-column-move-b'><rect className='adding-column-digit-b' height='22' rx='7' width='54' x='66' y='104' /><rect className='adding-column-digit-b' height='22' rx='7' width='54' x='176' y='104' /></g>
      <text fill='#0f172a' fontSize='12' fontWeight='700' x='84' y='84'>20</text><text fill='#0f172a' fontSize='12' fontWeight='700' x='196' y='84'>4</text><text fill='#0f172a' fontSize='12' fontWeight='700' x='84' y='120'>10</text><text fill='#0f172a' fontSize='12' fontWeight='700' x='196' y='120'>3</text>
      <text className='adding-column-carry' fontSize='12' fontWeight='700' x='208' y='70'>+1</text>
      <g className='adding-column-sum'><rect className='adding-column-digit-sum' height='28' rx='8' width='68' x='316' y='126' /><text fill='#0f172a' fontSize='13' fontWeight='700' x='338' y='145'>37</text></g>
    </svg>
  );
}
