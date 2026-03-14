export function PatternUnitAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: jednostka wzorca przesuwa się po szeregu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .tile-a { fill: #ec4899; }
        .tile-b { fill: #60a5fa; }
        .highlight {
          fill: #f5d0fe;
          opacity: 0.35;
          transform-box: fill-box;
          transform-origin: left center;
          animation: slide 4.2s ease-in-out infinite;
        }
        @keyframes slide {
          0%, 20% { transform: translateX(0); }
          45%, 65% { transform: translateX(72px); }
          90%, 100% { transform: translateX(144px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .highlight { animation: none; }
        }
      `}</style>
      <rect className='highlight' x='32' y='34' width='88' height='52' rx='14' />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <rect
          key={`tile-${index}`}
          className={index % 2 === 0 ? 'tile-a' : 'tile-b'}
          height='24'
          rx='6'
          width='24'
          x={40 + index * 36}
          y='48'
        />
      ))}
    </svg>
  );
}

export function ArithmeticStepAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: stałe kroki w ciągu arytmetycznym.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .line { stroke: #c7d2fe; stroke-width: 6; stroke-linecap: round; }
        .tick { stroke: #94a3b8; stroke-width: 4; }
        .dot {
          fill: #6366f1;
          transform-box: fill-box;
          transform-origin: center;
          animation: hop 4s ease-in-out infinite;
        }
        .step {
          fill: #4338ca;
          animation: pulse 4s ease-in-out infinite;
        }
        @keyframes hop {
          0%, 15% { transform: translateX(0); }
          40% { transform: translateX(60px); }
          65% { transform: translateX(120px); }
          90%, 100% { transform: translateX(180px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot { animation: none; transform: translateX(180px); }
          .step { animation: none; opacity: 1; }
        }
      `}</style>
      <line className='line' x1='40' x2='280' y1='80' y2='80' />
      {[0, 1, 2, 3, 4].map((index) => (
        <line
          key={`tick-${index}`}
          className='tick'
          x1={40 + index * 60}
          x2={40 + index * 60}
          y1='70'
          y2='90'
        />
      ))}
      <text className='step' fontSize='12' fontWeight='700' x='96' y='52'>+3</text>
      <circle className='dot' cx='40' cy='80' r='9' />
    </svg>
  );
}

export function GeometricGrowthAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: wzrost w ciągu geometrycznym.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 160'
    >
      <style>{`
        .bar {
          fill: #a855f7;
          transform-origin: center bottom;
          animation: grow 4.6s ease-in-out infinite;
        }
        .b2 { animation-delay: 0.6s; }
        .b3 { animation-delay: 1.2s; }
        .b4 { animation-delay: 1.8s; }
        @keyframes grow {
          0%, 20% { transform: scaleY(0.4); opacity: 0.6; }
          60%, 100% { transform: scaleY(1); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bar { animation: none; transform: scaleY(1); opacity: 1; }
        }
      `}</style>
      <rect className='bar b1' height='30' rx='6' width='36' x='40' y='110' />
      <rect className='bar b2' height='50' rx='6' width='36' x='100' y='90' />
      <rect className='bar b3' height='80' rx='6' width='36' x='160' y='60' />
      <rect className='bar b4' height='110' rx='6' width='36' x='220' y='30' />
    </svg>
  );
}

export function FibonacciSumAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: dwie liczby łączą się w kolejny wyraz Fibonacciego.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .node {
          fill: #f59e0b;
          opacity: 0.9;
        }
        .left {
          transform-box: fill-box;
          transform-origin: center;
          animation: moveLeft 4.8s ease-in-out infinite;
        }
        .right {
          transform-box: fill-box;
          transform-origin: center;
          animation: moveRight 4.8s ease-in-out infinite;
        }
        .sum {
          fill: #34d399;
          opacity: 0;
          transform-box: fill-box;
          transform-origin: center;
          animation: sumAppear 4.8s ease-in-out infinite;
        }
        .label { fill: #0f172a; font-size: 12px; font-weight: 700; }
        @keyframes moveLeft {
          0%, 30% { transform: translateX(0); opacity: 1; }
          55%, 100% { transform: translateX(40px); opacity: 0.2; }
        }
        @keyframes moveRight {
          0%, 30% { transform: translateX(0); opacity: 1; }
          55%, 100% { transform: translateX(-40px); opacity: 0.2; }
        }
        @keyframes sumAppear {
          0%, 45% { opacity: 0; transform: scale(0.8); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .left, .right, .sum { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <g className='left'>
        <circle className='node' cx='90' cy='70' r='22' />
        <text className='label' x='84' y='74'>3</text>
      </g>
      <g className='right'>
        <circle className='node' cx='230' cy='70' r='22' />
        <text className='label' x='224' y='74'>5</text>
      </g>
      <g className='sum'>
        <circle cx='160' cy='70' r='26' />
        <text className='label' x='154' y='74'>8</text>
      </g>
    </svg>
  );
}

export function RuleCheckAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: sprawdź różnicę i iloraz.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 160'
    >
      <style>{`
        .num { fill: #475569; font-size: 12px; font-weight: 700; }
        .hint {
          fill: #c7d2fe;
          opacity: 0.25;
          animation: pulse 4s ease-in-out infinite;
        }
        .hint-two { animation-delay: 2s; }
        .label { fill: #4338ca; font-size: 11px; font-weight: 700; }
        @keyframes pulse {
          0%, 40% { opacity: 0.25; }
          60%, 100% { opacity: 0.75; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hint { animation: none; opacity: 0.6; }
        }
      `}</style>
      <rect className='hint' x='38' y='26' width='244' height='38' rx='12' />
      <rect className='hint hint-two' x='38' y='92' width='244' height='38' rx='12' />
      <text className='label' x='50' y='50'>RÓŻNICA +2</text>
      <text className='label' x='50' y='116'>ILORAZ x2</text>
      {[0, 1, 2, 3].map((index) => (
        <text key={`d-${index}`} className='num' x={150 + index * 34} y='50'>
          {2 + index * 2}
        </text>
      ))}
      {[0, 1, 2, 3].map((index) => (
        <text key={`g-${index}`} className='num' x={150 + index * 34} y='116'>
          {2 * Math.pow(2, index)}
        </text>
      ))}
    </svg>
  );
}

export function PatternMissingAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: brakujący element we wzorcu pulsuje, aby podpowiedziec odpowiedz.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .tile-a { fill: #f472b6; }
        .tile-b { fill: #60a5fa; }
        .missing {
          fill: #fef3c7;
          stroke: #f59e0b;
          stroke-width: 2;
          stroke-dasharray: 5 5;
          transform-box: fill-box;
          transform-origin: center;
          animation: pulse 4.4s ease-in-out infinite;
        }
        .question {
          font: 700 16px/1 system-ui, sans-serif;
          fill: #b45309;
          transform-box: fill-box;
          transform-origin: center;
          animation: pulse 4.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 30% { opacity: 0.35; transform: scale(0.92); transform-origin: center; }
          55%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .missing, .question { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      {[
        { x: 40, type: 'a' },
        { x: 76, type: 'a' },
        { x: 112, type: 'b' },
        { x: 148, type: 'a' },
        { x: 184, type: 'a' },
        { x: 220, type: 'b' },
      ].map(({ x, type }) =>
        type === 'a' ? (
          <circle key={`a-${x}`} className='tile-a' cx={x + 12} cy='60' r='12' />
        ) : (
          <rect key={`b-${x}`} className='tile-b' height='24' rx='6' width='24' x={x} y='48' />
        )
      )}
      <rect className='missing' height='26' rx='8' width='26' x='262' y='47' />
      <text className='question' x='271' y='66'>?</text>
    </svg>
  );
}

export function ArithmeticReverseAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: ciag malejacy ze stalym krokiem.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .line { stroke: #c7d2fe; stroke-width: 6; stroke-linecap: round; }
        .tick { stroke: #94a3b8; stroke-width: 4; }
        .dot {
          fill: #0ea5e9;
          transform-box: fill-box;
          transform-origin: center;
          animation: hopBack 4s ease-in-out infinite;
        }
        .label {
          fill: #0f172a;
          font-size: 12px;
          font-weight: 700;
        }
        .step {
          fill: #0284c7;
          font-size: 12px;
          font-weight: 700;
        }
        @keyframes hopBack {
          0%, 15% { transform: translateX(0); }
          40% { transform: translateX(-60px); }
          65% { transform: translateX(-120px); }
          90%, 100% { transform: translateX(-180px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot { animation: none; transform: translateX(-180px); }
        }
      `}</style>
      <line className='line' x1='40' x2='280' y1='80' y2='80' />
      {[0, 1, 2, 3, 4].map((index) => (
        <line
          key={`tick-${index}`}
          className='tick'
          x1={40 + index * 60}
          x2={40 + index * 60}
          y1='70'
          y2='90'
        />
      ))}
      <text className='label' x='36' y='106'>2</text>
      <text className='label' x='96' y='106'>4</text>
      <text className='label' x='156' y='106'>6</text>
      <text className='label' x='216' y='106'>8</text>
      <text className='label' x='272' y='106'>10</text>
      <text className='step' x='128' y='52'>-2</text>
      <circle className='dot' cx='280' cy='80' r='9' />
    </svg>
  );
}

export function GeometricDotsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: podwajanie liczby elementow w ciagu geometrycznym.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .group {
          transform-box: fill-box;
          transform-origin: center;
          animation: groupPulse 5s ease-in-out infinite;
          opacity: 0.25;
        }
        .g2 { animation-delay: 0.6s; }
        .g3 { animation-delay: 1.2s; }
        .g4 { animation-delay: 1.8s; }
        .dot { fill: #34d399; }
        .label { fill: #059669; font-size: 11px; font-weight: 700; }
        @keyframes groupPulse {
          0%, 20% { opacity: 0.25; transform: scale(0.92); }
          50%, 90% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.25; transform: scale(0.92); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <g className='group g1'>
        <circle className='dot' cx='46' cy='60' r='7' />
      </g>
      <text className='label' x='68' y='64'>×2</text>
      <g className='group g2'>
        <circle className='dot' cx='120' cy='52' r='6' />
        <circle className='dot' cx='120' cy='72' r='6' />
      </g>
      <text className='label' x='142' y='64'>×2</text>
      <g className='group g3'>
        <circle className='dot' cx='196' cy='50' r='5' />
        <circle className='dot' cx='212' cy='50' r='5' />
        <circle className='dot' cx='196' cy='70' r='5' />
        <circle className='dot' cx='212' cy='70' r='5' />
      </g>
      <text className='label' x='232' y='64'>×2</text>
      <g className='group g4'>
        {[0, 1, 2, 3].map((col) =>
          [0, 1].map((row) => (
            <circle
              key={`dot-${col}-${row}`}
              className='dot'
              cx={260 + col * 12}
              cy={52 + row * 16}
              r='4'
            />
          ))
        )}
      </g>
    </svg>
  );
}

export function PatternCycleAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: wzorzec trzy-elementowy przesuwa się po szeregu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .tile-a { fill: #f472b6; }
        .tile-b { fill: #38bdf8; }
        .tile-c { fill: #34d399; }
        .highlight {
          fill: #e9d5ff;
          opacity: 0.35;
          transform-box: fill-box;
          transform-origin: left center;
          animation: slide 5s ease-in-out infinite;
        }
        @keyframes slide {
          0%, 20% { transform: translateX(0); }
          45%, 65% { transform: translateX(72px); }
          90%, 100% { transform: translateX(144px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .highlight { animation: none; }
        }
      `}</style>
      <rect className='highlight' x='24' y='32' width='120' height='56' rx='16' />
      <circle className='tile-a' cx='40' cy='60' r='12' />
      <rect className='tile-b' height='24' rx='6' width='24' x='64' y='48' />
      <polygon className='tile-c' points='112,48 124,72 100,72' />
      <circle className='tile-a' cx='148' cy='60' r='12' />
      <rect className='tile-b' height='24' rx='6' width='24' x='172' y='48' />
      <polygon className='tile-c' points='220,48 232,72 208,72' />
      <circle className='tile-a' cx='256' cy='60' r='12' />
    </svg>
  );
}

export function RuleChecklistAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: sprawdź listę kroków i odhacz regule.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .box { fill: #f8fafc; stroke: #cbd5f5; stroke-width: 2; }
        .label { fill: #4338ca; font-size: 11px; font-weight: 700; }
        .check {
          fill: none;
          stroke: #10b981;
          stroke-width: 3;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0;
          animation: checkPulse 4.8s ease-in-out infinite;
        }
        .check-1 { animation-delay: 0s; }
        .check-2 { animation-delay: 0.6s; }
        .check-3 { animation-delay: 1.2s; }
        @keyframes checkPulse {
          0%, 30% { opacity: 0; }
          50%, 80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .check { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='box' x='30' y='28' width='260' height='28' rx='10' />
      <rect className='box' x='30' y='62' width='260' height='28' rx='10' />
      <rect className='box' x='30' y='96' width='260' height='28' rx='10' />
      <text className='label' x='64' y='46'>Sprawdź różnicę</text>
      <text className='label' x='64' y='80'>Sprawdź iloraz</text>
      <text className='label' x='64' y='114'>Sprawdź sumę</text>
      <polyline className='check check-1' points='42,42 48,48 58,36' />
      <polyline className='check check-2' points='42,76 48,82 58,70' />
      <polyline className='check check-3' points='42,110 48,116 58,104' />
    </svg>
  );
}
