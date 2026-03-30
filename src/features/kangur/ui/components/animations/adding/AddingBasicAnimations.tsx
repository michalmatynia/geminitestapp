import React from 'react';
import { useAddingSurfaceIds, AddingSurface, LabelChip } from './AddingAnimationSurface';

export function AddingSvgAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-basics');

  return (
    <svg aria-label='Animacja dodawania: 2 kropki plus 3 kropki daje 5 kropek.' className='h-auto w-full' data-testid='adding-basics-animation' role='img' viewBox='0 0 420 140'>
      <style>{`
        .adding-basics-dot-a { fill: #f59e0b; filter: drop-shadow(0 6px 10px rgba(245, 158, 11, 0.24)); }
        .adding-basics-dot-b { fill: #60a5fa; filter: drop-shadow(0 6px 10px rgba(96, 165, 250, 0.24)); }
        .adding-basics-dot-sum { fill: #34d399; filter: drop-shadow(0 7px 12px rgba(52, 211, 153, 0.24)); }
        .adding-basics-target { fill: rgba(255, 255, 255, 0.72); stroke: rgba(148, 163, 184, 0.34); stroke-dasharray: 6 6; }
        .adding-basics-group-a, .adding-basics-group-b, .adding-basics-sum { transform-box: fill-box; transform-origin: center; }
        .adding-basics-group-a { animation: addingBasicsMoveA 6s ease-in-out infinite; }
        .adding-basics-group-b { animation: addingBasicsMoveB 6s ease-in-out infinite; }
        .adding-basics-sum { animation: addingBasicsReveal 6s ease-in-out infinite; }
        @keyframes addingBasicsMoveA { 0%, 18% { transform: translateX(0); opacity: 1; } 45% { transform: translateX(110px); opacity: 1; } 60% { transform: translateX(130px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes addingBasicsMoveB { 0%, 28% { transform: translateX(0); opacity: 1; } 52% { transform: translateX(110px); opacity: 1; } 68% { transform: translateX(130px); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
        @keyframes addingBasicsReveal { 0%, 46% { opacity: 0; transform: scale(0.95); } 60%, 100% { opacity: 1; transform: scale(1); } }
        @media (prefers-reduced-motion: reduce) { .adding-basics-group-a, .adding-basics-group-b, .adding-basics-sum { animation: none; } }
      `}</style>
      <AddingSurface accentEnd='#fef3c7' accentStart='#f59e0b' atmosphereA='rgba(245, 158, 11, 0.08)' atmosphereB='rgba(96, 165, 250, 0.08)' ids={surfaceIds} stroke='rgba(245, 158, 11, 0.12)' testIdPrefix='adding-basics' x={12} y={12} width={396} height={116} rx={24} />
      <LabelChip fill='rgba(255,255,255,0.88)' label='2 + 3' stroke='rgba(245,158,11,0.2)' x={26} y={22} />
      <rect className='adding-basics-target' height='54' rx='18' width='170' x='224' y='48' />
      <g className='adding-basics-group-a'><circle className='adding-basics-dot-a' cx='66' cy='56' r='11' /><circle className='adding-basics-dot-a' cx='100' cy='56' r='11' /></g>
      <g className='adding-basics-group-b'><circle className='adding-basics-dot-b' cx='66' cy='94' r='11' /><circle className='adding-basics-dot-b' cx='100' cy='94' r='11' /><circle className='adding-basics-dot-b' cx='134' cy='94' r='11' /></g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='5'><line x1='160' y1='74' x2='188' y2='74' /><line x1='174' y1='60' x2='174' y2='88' /><line x1='202' y1='66' x2='232' y2='66' /><line x1='202' y1='82' x2='232' y2='82' /></g>
      <g className='adding-basics-sum'>{[0, 1, 2, 3, 4].map((index) => (<circle key={`sum-${index}`} className='adding-basics-dot-sum' cx={258 + index * 30} cy='74' r='10' />))}</g>
    </svg>
  );
}

export function AddingCommutativityAnimation(): React.JSX.Element {
  const surfaceIds = useAddingSurfaceIds('adding-commutativity');

  return (
    <svg aria-label='Animacja przemienności: 2+3 daje tyle samo co 3+2.' className='h-auto w-full' data-testid='adding-commutativity-animation' role='img' viewBox='0 0 420 140'>
      <style>{`
        .a { fill: #f59e0b; } .b { fill: #60a5fa; }
        .group { transform-box: fill-box; transform-origin: center; animation: swap 5s ease-in-out infinite; }
        @keyframes swap { 0%, 20% { transform: translateX(0); } 40%, 60% { transform: translateX(120px); } 80%, 100% { transform: translateX(0); } }
        .group-b { animation-name: swapB; }
        @keyframes swapB { 0%, 20% { transform: translateX(0); } 40%, 60% { transform: translateX(-120px); } 80%, 100% { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) { .group { animation: none; } }
      `}</style>
      <AddingSurface accentEnd='#f0f9ff' accentStart='#60a5fa' atmosphereA='rgba(245, 158, 11, 0.06)' atmosphereB='rgba(96, 165, 250, 0.06)' ids={surfaceIds} stroke='rgba(96, 165, 250, 0.12)' testIdPrefix='adding-commutativity' x={12} y={12} width={396} height={116} rx={24} />
      <g className='group'><circle className='a' cx='60' cy='70' r='10' /><circle className='a' cx='90' cy='70' r='10' /><text x='75' y='105' textAnchor='middle' fontSize='12' fontWeight='700' fill='#b45309'>2</text></g>
      <text x='135' y='75' textAnchor='middle' fontSize='20' fontWeight='700' fill='#94a3b8'>+</text>
      <g className='group group-b' transform='translate(120,0)'><circle className='b' cx='60' cy='70' r='10' /><circle className='b' cx='90' cy='70' r='10' /><circle className='b' cx='120' cy='70' r='10' /><text x='90' y='105' textAnchor='middle' fontSize='12' fontWeight='700' fill='#1d4ed8'>3</text></g>
      <text x='300' y='75' textAnchor='middle' fontSize='20' fontWeight='700' fill='#94a3b8'>= 5</text>
    </svg>
  );
}
