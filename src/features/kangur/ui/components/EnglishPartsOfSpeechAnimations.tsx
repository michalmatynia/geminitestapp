export function PartsOfSpeechCardPulseAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: części mowy pojawiają się kolejno na kartach z przykładami matematycznymi.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .card {
          fill: #f8fafc;
          stroke: #bae6fd;
          stroke-width: 2;
        }
        .label {
          font: 700 11px/1.1 system-ui, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          fill: #0ea5e9;
        }
        .word {
          font: 600 13px/1.2 system-ui, sans-serif;
          fill: #0f172a;
        }
        .noun, .verb, .adverb {
          animation: cardPulse 6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .verb { animation-delay: 2s; }
        .adverb { animation-delay: 4s; }
        @keyframes cardPulse {
          0%, 15% { opacity: 0.35; transform: translateY(8px); }
          35%, 55% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0.35; transform: translateY(8px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .noun, .verb, .adverb { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <g className='noun'>
        <rect className='card' x='20' y='24' width='120' height='86' rx='18' />
        <text className='label' x='38' y='46'>NOUN</text>
        <text className='word' x='38' y='70'>function</text>
        <text className='word' x='38' y='90'>triangle</text>
      </g>
      <g className='verb'>
        <rect className='card' x='150' y='24' width='120' height='86' rx='18' />
        <text className='label' x='168' y='46'>VERB</text>
        <text className='word' x='168' y='70'>solve</text>
        <text className='word' x='168' y='90'>rotate</text>
      </g>
      <g className='adverb'>
        <rect className='card' x='280' y='24' width='120' height='86' rx='18' />
        <text className='label' x='298' y='46'>ADVERB</text>
        <text className='word' x='298' y='70'>quickly</text>
        <text className='word' x='298' y='90'>precisely</text>
      </g>
    </svg>
  );
}

export function PartsOfSpeechGraphAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: wykres rośnie, aby pokazać czasowniki i przysłówki w opisie matematycznym.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 160'
    >
      <style>{`
        .axis {
          stroke: #94a3b8;
          stroke-width: 2;
        }
        .line {
          stroke: #38bdf8;
          stroke-width: 3;
          fill: none;
          stroke-dasharray: 180;
          stroke-dashoffset: 180;
          animation: lineDraw 4.5s ease-in-out infinite;
        }
        .dot {
          fill: #0ea5e9;
          animation: dotPulse 2.25s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .label {
          font: 600 11px/1.1 system-ui, sans-serif;
          fill: #0f172a;
        }
        @keyframes lineDraw {
          0% { stroke-dashoffset: 180; opacity: 0.5; }
          45% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 180; opacity: 0.5; }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(0.7); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .line { animation: none; stroke-dashoffset: 0; opacity: 1; }
          .dot { animation: none; opacity: 1; }
        }
      `}</style>
      <line className='axis' x1='40' y1='120' x2='280' y2='120' />
      <line className='axis' x1='40' y1='120' x2='40' y2='24' />
      <path className='line' d='M40 110 L110 90 L190 60 L260 40' />
      <circle className='dot' cx='260' cy='40' r='6' />
      <text className='label' x='52' y='30'>rises steadily</text>
    </svg>
  );
}

export function PartsOfSpeechPrepositionAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: punkt leży pomiędzy A i B, aby pokazać przyimki.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .line {
          stroke: #94a3b8;
          stroke-width: 2;
          stroke-dasharray: 6 6;
          animation: lineGlow 3.8s ease-in-out infinite;
        }
        .point {
          fill: #0f172a;
        }
        .middle {
          fill: #38bdf8;
          animation: middlePulse 2.6s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .label {
          font: 600 12px/1.1 system-ui, sans-serif;
          fill: #0f172a;
        }
        .tag {
          font: 700 10px/1.1 system-ui, sans-serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          fill: #0ea5e9;
        }
        @keyframes lineGlow {
          0%, 100% { stroke: #94a3b8; opacity: 0.5; }
          50% { stroke: #38bdf8; opacity: 1; }
        }
        @keyframes middlePulse {
          0%, 100% { transform: scale(0.7); opacity: 0.5; }
          50% { transform: scale(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .line { animation: none; opacity: 1; }
          .middle { animation: none; opacity: 1; }
        }
      `}</style>
      <text className='tag' x='126' y='18'>PREPOSITION</text>
      <line className='line' x1='40' y1='68' x2='320' y2='68' />
      <circle className='point' cx='60' cy='68' r='6' />
      <circle className='middle' cx='180' cy='68' r='7' />
      <circle className='point' cx='300' cy='68' r='6' />
      <text className='label' x='50' y='92'>A</text>
      <text className='label' x='174' y='92'>P</text>
      <text className='label' x='292' y='92'>B</text>
      <text className='label' x='120' y='44'>between</text>
    </svg>
  );
}
