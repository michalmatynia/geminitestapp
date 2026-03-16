import { useId } from 'react';

export function EnglishPronounsPulseAnimation(): React.JSX.Element {
  const glowId = useId().replace(/:/g, '');
  const ringId = useId().replace(/:/g, '');
  const highlightId = useId().replace(/:/g, '');
  const ruleGlowId = useId().replace(/:/g, '');

  return (
    <svg
      aria-label='Animated pronoun guide. Pronoun tags float around a message bubble while rule labels highlight the four pronoun roles.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 180'
    >
      <defs>
        <radialGradient id={glowId} cx='50%' cy='50%' r='60%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.9)' />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
        <linearGradient id={ringId} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stopColor='#bae6fd' />
          <stop offset='52%' stopColor='#c7d2fe' />
          <stop offset='100%' stopColor='#fde68a' />
        </linearGradient>
        <linearGradient id={highlightId} x1='0' y1='0' x2='1' y2='0'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.85)' />
          <stop offset='100%' stopColor='rgba(255,255,255,0.2)' />
        </linearGradient>
        <linearGradient id={ruleGlowId} x1='0' y1='0' x2='1' y2='1'>
          <stop offset='0%' stopColor='rgba(45,212,191,0.55)' />
          <stop offset='100%' stopColor='rgba(251,191,36,0.35)' />
        </linearGradient>
      </defs>
      <style>{`
        .bubble { fill: #ffffff; stroke: #e2e8f0; stroke-width: 2; }
        .bubble-glow { fill: url(#${glowId}); opacity: 0.6; animation: bubblePulse 6.2s ease-in-out infinite; }
        .bubble-highlight { fill: url(#${highlightId}); opacity: 0.7; }
        .bubble-tail { fill: #ffffff; stroke: #e2e8f0; stroke-width: 2; }
        .prompt { font: 700 12px/1.1 system-ui, sans-serif; fill: #0f172a; }
        .sub { font: 600 11px/1 system-ui, sans-serif; fill: #64748b; }
        .sub-cycle { opacity: 0; animation: subSwap 8s ease-in-out infinite; }
        .sub-a { animation-delay: 0s; }
        .sub-b { animation-delay: 2s; }
        .sub-c { animation-delay: 4s; }
        .sub-d { animation-delay: 6s; }
        .chip {
          transform-box: fill-box;
          transform-origin: center;
        }
        .chip-a { animation: floatA 7.2s ease-in-out infinite; }
        .chip-b { animation: floatB 6.6s ease-in-out infinite; }
        .chip-c { animation: floatC 7.8s ease-in-out infinite; }
        .chip-d { animation: floatD 6.9s ease-in-out infinite; }
        .chip-text { font: 700 12px/1 system-ui, sans-serif; fill: #0f172a; }
        .ring {
          fill: none;
          stroke: url(#${ringId});
          stroke-width: 2.5;
          stroke-dasharray: 6 10;
          opacity: 0.35;
          animation: ringDrift 12s ease-in-out infinite;
        }
        .spark { fill: #cbd5f5; opacity: 0.4; animation: spark 5.8s ease-in-out infinite; }
        .spark-2 { animation-delay: 1.4s; }
        .spark-3 { animation-delay: 2.6s; }
        .rule-pill { fill: #f8fafc; stroke: #e2e8f0; stroke-width: 1.5; }
        .rule-text { font: 600 9px/1 system-ui, sans-serif; fill: #475569; letter-spacing: 0.02em; }
        .rule-glow { fill: url(#${ruleGlowId}); opacity: 0; animation: rulePulse 8s ease-in-out infinite; }
        .rule-a { animation-delay: 0s; }
        .rule-b { animation-delay: 2s; }
        .rule-c { animation-delay: 4s; }
        .rule-d { animation-delay: 6s; }
        @keyframes bubblePulse {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 0.9; }
        }
        @keyframes ringDrift {
          0%, 100% { stroke-dashoffset: 0; opacity: 0.28; }
          50% { stroke-dashoffset: 18; opacity: 0.5; }
        }
        @keyframes floatA {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-4px, -6px); }
        }
        @keyframes floatB {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(3px, 5px); }
        }
        @keyframes floatC {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(4px, -4px); }
        }
        @keyframes floatD {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(-3px, 5px); }
        }
        @keyframes spark {
          0%, 100% { opacity: 0.2; transform: translateY(0); }
          50% { opacity: 0.6; transform: translateY(-4px); }
        }
        @keyframes subSwap {
          0%, 12% { opacity: 0; transform: translateY(2px); }
          22%, 42% { opacity: 1; transform: translateY(0); }
          52%, 100% { opacity: 0; transform: translateY(-2px); }
        }
        @keyframes rulePulse {
          0%, 18% { opacity: 0; }
          28%, 50% { opacity: 0.8; }
          60%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bubble-glow, .chip-a, .chip-b, .chip-c, .chip-d, .ring, .spark, .sub-cycle, .rule-glow { animation: none; }
          .ring { opacity: 0.25; }
          .bubble-glow { opacity: 0.5; }
          .sub-cycle { opacity: 0; }
          .sub-a { opacity: 1; }
          .rule-glow { opacity: 0; }
        }
      `}</style>
      <circle className='bubble-glow' cx='180' cy='70' r='70' />
      <circle className='ring' cx='180' cy='70' r='62' />

      <rect className='bubble' x='92' y='26' width='176' height='88' rx='40' />
      <rect className='bubble-highlight' x='110' y='34' width='120' height='18' rx='9' />
      <path className='bubble-tail' d='M140 114 L124 126 L150 122 Z' />

      <text className='prompt' x='180' y='68' textAnchor='middle'>Pronoun Remix</text>
      <text className='sub sub-cycle sub-a' x='180' y='88' textAnchor='middle'>Subject</text>
      <text className='sub sub-cycle sub-b' x='180' y='88' textAnchor='middle'>Object</text>
      <text className='sub sub-cycle sub-c' x='180' y='88' textAnchor='middle'>Possessive</text>
      <text className='sub sub-cycle sub-d' x='180' y='88' textAnchor='middle'>Reflexive</text>

      <g className='chip chip-a'>
        <rect x='24' y='20' width='72' height='28' rx='14' fill='#ccfbf1' stroke='#5eead4' strokeWidth='2' />
        <text className='chip-text' x='60' y='39' textAnchor='middle'>they</text>
      </g>
      <g className='chip chip-b'>
        <rect x='260' y='24' width='72' height='28' rx='14' fill='#e0e7ff' stroke='#a5b4fc' strokeWidth='2' />
        <text className='chip-text' x='296' y='43' textAnchor='middle'>her</text>
      </g>
      <g className='chip chip-c'>
        <rect x='30' y='96' width='64' height='26' rx='13' fill='#fef3c7' stroke='#fcd34d' strokeWidth='2' />
        <text className='chip-text' x='62' y='114' textAnchor='middle'>we</text>
      </g>
      <g className='chip chip-d'>
        <rect x='256' y='94' width='76' height='28' rx='14' fill='#ffe4e6' stroke='#fda4af' strokeWidth='2' />
        <text className='chip-text' x='294' y='113' textAnchor='middle'>him</text>
      </g>

      <circle className='spark spark-1' cx='110' cy='18' r='3' />
      <circle className='spark spark-2' cx='250' cy='16' r='3' />
      <circle className='spark spark-3' cx='180' cy='124' r='3' />

      <g aria-hidden='true'>
        <rect className='rule-pill' x='16' y='136' width='74' height='22' rx='11' />
        <rect className='rule-pill' x='98' y='136' width='74' height='22' rx='11' />
        <rect className='rule-pill' x='180' y='136' width='74' height='22' rx='11' />
        <rect className='rule-pill' x='262' y='136' width='74' height='22' rx='11' />

        <rect className='rule-glow rule-a' x='16' y='136' width='74' height='22' rx='11' />
        <rect className='rule-glow rule-b' x='98' y='136' width='74' height='22' rx='11' />
        <rect className='rule-glow rule-c' x='180' y='136' width='74' height='22' rx='11' />
        <rect className='rule-glow rule-d' x='262' y='136' width='74' height='22' rx='11' />

        <text className='rule-text' x='53' y='151' textAnchor='middle'>Subject</text>
        <text className='rule-text' x='135' y='151' textAnchor='middle'>Object</text>
        <text className='rule-text' x='217' y='151' textAnchor='middle'>Possessive</text>
        <text className='rule-text' x='299' y='151' textAnchor='middle'>Reflexive</text>
      </g>
    </svg>
  );
}
