export function AnalogyBridgeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: relacja A:B = C:D.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .node { fill: #fbcfe8; stroke: #fb7185; stroke-width: 2; }
        .label { fill: #9f1239; font-size: 14px; font-weight: 700; }
        .link {
          fill: none;
          stroke: #fb7185;
          stroke-width: 4;
          stroke-dasharray: 6 6;
          animation: dash 3s linear infinite;
        }
        .eq { fill: #9f1239; font-size: 16px; font-weight: 700; }
        @keyframes dash {
          to { stroke-dashoffset: -12; }
        }
        @media (prefers-reduced-motion: reduce) {
          .link { animation: none; }
        }
      `}</style>
      <rect className='node' x='26' y='36' width='46' height='46' rx='12' />
      <rect className='node' x='96' y='36' width='46' height='46' rx='12' />
      <rect className='node' x='186' y='36' width='46' height='46' rx='12' />
      <rect className='node' x='256' y='36' width='46' height='46' rx='12' />
      <text className='label' x='44' y='65'>A</text>
      <text className='label' x='114' y='65'>B</text>
      <text className='label' x='204' y='65'>C</text>
      <text className='label' x='274' y='65'>D</text>
      <path className='link' d='M72 59 L96 59' />
      <path className='link' d='M232 59 L256 59' />
      <text className='eq' x='154' y='66'>=</text>
    </svg>
  );
}

export function NumberOperationAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: relacja liczbowa z tą samą operacją.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .num { fill: #9f1239; font-size: 16px; font-weight: 700; }
        .arrow { stroke: #fb7185; stroke-width: 4; stroke-linecap: round; }
        .pulse {
          animation: pulse 2.8s ease-in-out infinite;
        }
        .label { fill: #be123c; font-size: 12px; font-weight: 700; }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <text className='num' x='60' y='52'>2</text>
      <line className='arrow pulse' x1='80' y1='46' x2='130' y2='46' />
      <polygon points='130,46 122,41 122,51' fill='#fb7185' />
      <text className='num' x='150' y='52'>4</text>
      <text className='label' x='92' y='34'>×2</text>

      <text className='num' x='60' y='104'>5</text>
      <line className='arrow pulse' x1='80' y1='98' x2='130' y2='98' />
      <polygon points='130,98 122,93 122,103' fill='#fb7185' />
      <text className='num' x='150' y='104'>10</text>
      <text className='label' x='92' y='86'>×2</text>
    </svg>
  );
}

export function ShapeTransformAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: kształt obraca się według tej samej reguły.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .shape {
          fill: #fbcfe8;
          stroke: #fb7185;
          stroke-width: 3;
        }
        .rot {
          transform-origin: 220px 70px;
          animation: spin 3.6s ease-in-out infinite;
        }
        .arrow { stroke: #fb7185; stroke-width: 4; stroke-linecap: round; }
        @keyframes spin {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(90deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .rot { animation: none; transform: rotate(45deg); }
        }
      `}</style>
      <rect className='shape' x='60' y='40' width='50' height='50' rx='10' />
      <line className='arrow' x1='135' y1='65' x2='185' y2='65' />
      <polygon points='185,65 177,60 177,70' fill='#fb7185' />
      <rect className='shape rot' x='195' y='45' width='50' height='50' rx='10' />
    </svg>
  );
}

export function PartWholeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: części łączą się w całość.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .part {
          fill: #fda4af;
          animation: merge 4s ease-in-out infinite;
        }
        .p2 { animation-delay: 0.4s; }
        .p3 { animation-delay: 0.8s; }
        .whole {
          fill: #fb7185;
          opacity: 0;
          animation: appear 4s ease-in-out infinite;
        }
        @keyframes merge {
          0%, 30% { transform: translateX(0); opacity: 1; }
          60%, 100% { transform: translateX(60px); opacity: 0.2; }
        }
        @keyframes appear {
          0%, 45% { opacity: 0; transform: scale(0.8); }
          70%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .part, .whole { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <circle className='part' cx='70' cy='70' r='16' />
      <circle className='part p2' cx='110' cy='50' r='14' />
      <circle className='part p3' cx='110' cy='90' r='14' />
      <circle className='whole' cx='210' cy='70' r='28' />
    </svg>
  );
}

export function CauseEffectAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: przyczyna prowadzi do skutku.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .cloud { fill: #bae6fd; }
        .drop {
          stroke: #38bdf8;
          stroke-width: 4;
          stroke-linecap: round;
          animation: rain 2.6s ease-in-out infinite;
        }
        .flower { fill: #fb7185; }
        .stem { stroke: #34d399; stroke-width: 4; stroke-linecap: round; }
        @keyframes rain {
          0%, 100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(10px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .drop { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <g>
        <circle className='cloud' cx='70' cy='50' r='18' />
        <circle className='cloud' cx='90' cy='46' r='16' />
        <circle className='cloud' cx='110' cy='52' r='14' />
      </g>
      <line className='drop' x1='78' y1='70' x2='78' y2='88' />
      <line className='drop' x1='94' y1='72' x2='94' y2='90' />
      <line className='drop' x1='108' y1='70' x2='108' y2='88' />
      <line className='stem' x1='230' y1='96' x2='230' y2='118' />
      <circle className='flower' cx='230' cy='88' r='10' />
    </svg>
  );
}
