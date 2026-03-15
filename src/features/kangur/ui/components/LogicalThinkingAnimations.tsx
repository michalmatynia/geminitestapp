export function LogicalThinkingIntroAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: kroki logicznego myślenia połączone strzałkami.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .node { fill: #a78bfa; opacity: 0.4; animation: introPulse 4.2s ease-in-out infinite; }
        .n2 { animation-delay: 0.7s; }
        .n3 { animation-delay: 1.4s; }
        .link { stroke: #7c3aed; stroke-width: 4; stroke-linecap: round; }
        @keyframes introPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .node { animation: none; opacity: 1; }
        }
      `}</style>
      <line className='link' x1='80' x2='160' y1='60' y2='60' />
      <line className='link' x1='200' x2='280' y1='60' y2='60' />
      <circle className='node n1' cx='60' cy='60' r='16' />
      <circle className='node n2' cx='180' cy='60' r='16' />
      <circle className='node n3' cx='300' cy='60' r='16' />
    </svg>
  );
}

export function LogicalThinkingStepsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: trzy kroki logiki podświetlane po kolei.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .step {
          fill: #ede9fe;
          stroke: #a78bfa;
          stroke-width: 2;
          opacity: 0.35;
          transform-box: fill-box;
          transform-origin: center;
          animation: stepGlow 4.6s ease-in-out infinite;
        }
        .s2 { animation-delay: 0.8s; }
        .s3 { animation-delay: 1.6s; }
        .label { font: 700 13px/1.1 system-ui, sans-serif; fill: #6d28d9; }
        .arrow { stroke: #a78bfa; stroke-width: 3; stroke-linecap: round; }
        @keyframes stepGlow {
          0%, 100% { opacity: 0.35; transform: scale(0.96); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .step { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='step s1' x='20' y='38' width='100' height='44' rx='14' />
      <rect className='step s2' x='130' y='38' width='100' height='44' rx='14' />
      <rect className='step s3' x='240' y='38' width='100' height='44' rx='14' />
      <line className='arrow' x1='120' y1='60' x2='130' y2='60' />
      <line className='arrow' x1='230' y1='60' x2='240' y2='60' />
      <text className='label' x='70' y='66' textAnchor='middle'>OBSERWUJ</text>
      <text className='label' x='180' y='66' textAnchor='middle'>ŁĄCZ</text>
      <text className='label' x='290' y='66' textAnchor='middle'>WNIOSEK</text>
    </svg>
  );
}

export function LogicalPatternAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: wzorzec powtarza się w rytmie.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .item { fill: #38bdf8; opacity: 0.3; }
        .hi { fill: #0ea5e9; animation: patternGlow 3.8s ease-in-out infinite; }
        @keyframes patternGlow {
          0%, 100% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hi { animation: none; opacity: 1; }
        }
      `}</style>
      <circle className='item' cx='60' cy='60' r='12' />
      <circle className='hi' cx='120' cy='60' r='12' />
      <circle className='item' cx='180' cy='60' r='12' />
      <circle className='hi' cx='240' cy='60' r='12' />
      <circle className='item' cx='300' cy='60' r='12' />
    </svg>
  );
}

export function LogicalPatternGrowthAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: wzorzec rośnie krok po kroku.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .bar {
          fill: #bae6fd;
          opacity: 0.4;
          transform-box: fill-box;
          transform-origin: bottom;
          animation: barPulse 4s ease-in-out infinite;
        }
        .b2 { animation-delay: 0.5s; }
        .b3 { animation-delay: 1s; }
        .b4 { animation-delay: 1.5s; }
        .guide { stroke: #0ea5e9; stroke-width: 2; stroke-dasharray: 6 6; opacity: 0.6; }
        @keyframes barPulse {
          0%, 100% { opacity: 0.35; transform: scaleY(0.92); }
          50% { opacity: 1; transform: scaleY(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .bar { animation: none; opacity: 1; }
        }
      `}</style>
      <line className='guide' x1='50' y1='90' x2='310' y2='90' />
      <rect className='bar b1' x='60' y='58' width='36' height='32' rx='6' />
      <rect className='bar b2' x='120' y='48' width='36' height='42' rx='6' />
      <rect className='bar b3' x='180' y='38' width='36' height='52' rx='6' />
      <rect className='bar b4' x='240' y='28' width='36' height='62' rx='6' />
    </svg>
  );
}

export function LogicalClassificationAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: elementy trafiają do dwóch grup.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .box { fill: none; stroke: #34d399; stroke-width: 2; stroke-dasharray: 6 6; }
        .dot-a { fill: #10b981; }
        .dot-b { fill: #f59e0b; }
        .group-a { animation: classifyA 5s ease-in-out infinite; }
        .group-b { animation: classifyB 5s ease-in-out infinite; }
        @keyframes classifyA {
          0%, 20% { transform: translateX(90px); opacity: 0.35; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(90px); opacity: 0.35; }
        }
        @keyframes classifyB {
          0%, 20% { transform: translateX(-90px); opacity: 0.35; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-90px); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-a, .group-b { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='box' x='30' y='30' width='120' height='80' rx='14' />
      <rect className='box' x='210' y='30' width='120' height='80' rx='14' />
      <g className='group-a'>
        <circle className='dot-a' cx='70' cy='60' r='9' />
        <circle className='dot-a' cx='105' cy='82' r='9' />
      </g>
      <g className='group-b'>
        <circle className='dot-b' cx='250' cy='60' r='9' />
        <circle className='dot-b' cx='285' cy='82' r='9' />
      </g>
    </svg>
  );
}

export function LogicalClassificationKeyAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: cecha kieruje elementy do odpowiednich grup.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .tag { fill: #ecfdf5; stroke: #34d399; stroke-width: 2; }
        .tag-label { font: 700 13px/1.1 system-ui, sans-serif; fill: #047857; }
        .bin { fill: #f0fdf4; stroke: #34d399; stroke-width: 2; }
        .branch { stroke: #34d399; stroke-width: 3; stroke-linecap: round; }
        .dot {
          fill: #10b981;
          opacity: 0.35;
          transform-box: fill-box;
          transform-origin: center;
          animation: sortDot 4.8s ease-in-out infinite;
        }
        .dot-b { fill: #f59e0b; animation-delay: 0.8s; }
        @keyframes sortDot {
          0%, 20% { transform: translate(0, 0); opacity: 0.35; }
          55%, 80% { transform: translate(-70px, 36px); opacity: 1; }
          100% { transform: translate(0, 0); opacity: 0.35; }
        }
        .dot-b {
          animation-name: sortDotRight;
        }
        @keyframes sortDotRight {
          0%, 20% { transform: translate(0, 0); opacity: 0.35; }
          55%, 80% { transform: translate(70px, 36px); opacity: 1; }
          100% { transform: translate(0, 0); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot, .dot-b { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='tag' x='120' y='8' width='120' height='32' rx='14' />
      <text className='tag-label' x='180' y='30' textAnchor='middle'>CECHA</text>
      <line className='branch' x1='180' y1='40' x2='85' y2='64' />
      <line className='branch' x1='180' y1='40' x2='275' y2='64' />
      <rect className='bin' x='20' y='64' width='130' height='48' rx='14' />
      <rect className='bin' x='210' y='64' width='130' height='48' rx='14' />
      <circle className='dot' cx='180' cy='54' r='8' />
      <circle className='dot dot-b' cx='180' cy='54' r='8' />
    </svg>
  );
}

export function LogicalReasoningAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: jeśli to prowadzi do wtedy.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .box { fill: #eef2ff; stroke: #6366f1; stroke-width: 2; }
        .arrow { stroke: #6366f1; stroke-width: 4; stroke-linecap: round; animation: arrowPulse 3.8s ease-in-out infinite; }
        .label { font: 700 14px/1.1 system-ui, sans-serif; fill: #4338ca; }
        @keyframes arrowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .arrow { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='box' x='30' y='36' width='110' height='48' rx='12' />
      <rect className='box' x='220' y='36' width='110' height='48' rx='12' />
      <text className='label' x='85' y='66' textAnchor='middle'>JEŚLI</text>
      <text className='label' x='275' y='66' textAnchor='middle'>WTEDY</text>
      <line className='arrow' x1='150' y1='60' x2='210' y2='60' />
      <polyline className='arrow' points='200,52 210,60 200,68' fill='none' />
    </svg>
  );
}

export function LogicalAnalogiesAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: analogia łączy dwie pary.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .pair { fill: #f3e8ff; stroke: #a855f7; stroke-width: 2; }
        .link { stroke: #a855f7; stroke-width: 3; stroke-linecap: round; animation: linkPulse 3.6s ease-in-out infinite; }
        @keyframes linkPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .link { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='pair' x='40' y='35' width='80' height='50' rx='12' />
      <rect className='pair' x='240' y='35' width='80' height='50' rx='12' />
      <line className='link' x1='120' y1='60' x2='240' y2='60' />
      <circle cx='70' cy='60' r='8' fill='#a855f7' />
      <circle cx='90' cy='60' r='8' fill='#c084fc' />
      <circle cx='270' cy='60' r='8' fill='#a855f7' />
      <circle cx='290' cy='60' r='8' fill='#c084fc' />
    </svg>
  );
}

export function LogicalAnalogyMapAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: relacja przenosi się z jednej pary na drugą.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 130'
    >
      <style>{`
        .cell { fill: #faf5ff; stroke: #c084fc; stroke-width: 2; }
        .label { font: 700 12px/1.1 system-ui, sans-serif; fill: #7e22ce; }
        .pair-link { stroke: #c084fc; stroke-width: 3; stroke-linecap: round; }
        .map-link {
          stroke: #a855f7;
          stroke-width: 3;
          stroke-linecap: round;
          opacity: 0.4;
          animation: mapPulse 3.6s ease-in-out infinite;
        }
        @keyframes mapPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .map-link { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='cell' x='40' y='22' width='60' height='34' rx='10' />
      <rect className='cell' x='130' y='22' width='60' height='34' rx='10' />
      <rect className='cell' x='40' y='74' width='60' height='34' rx='10' />
      <rect className='cell' x='130' y='74' width='60' height='34' rx='10' />
      <text className='label' x='63' y='44'>A</text>
      <text className='label' x='153' y='44'>B</text>
      <text className='label' x='63' y='96'>C</text>
      <text className='label' x='153' y='96'>D</text>
      <line className='pair-link' x1='100' y1='39' x2='130' y2='39' />
      <line className='pair-link' x1='100' y1='91' x2='130' y2='91' />
      <line className='map-link' x1='210' y1='39' x2='300' y2='91' />
      <line className='map-link' x1='210' y1='91' x2='300' y2='39' />
      <circle cx='315' cy='65' r='8' fill='#a855f7' />
    </svg>
  );
}

export function LogicalSummaryAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: podsumowanie kroków logicznego myślenia.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .pill { fill: #fef3c7; stroke: #f59e0b; stroke-width: 2; opacity: 0.3; animation: summaryPop 4.4s ease-in-out infinite; }
        .p2 { animation-delay: 0.6s; }
        .p3 { animation-delay: 1.2s; }
        .label { font: 700 11px/1.1 system-ui, sans-serif; fill: #b45309; }
        @keyframes summaryPop {
          0%, 100% { opacity: 0.3; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pill { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='pill p1' x='30' y='40' width='90' height='30' rx='12' />
      <rect className='pill p2' x='135' y='40' width='90' height='30' rx='12' />
      <rect className='pill p3' x='240' y='40' width='90' height='30' rx='12' />
      <text className='label' x='48' y='60'>WZORCE</text>
      <text className='label' x='146' y='60'>WNIOSKI</text>
      <text className='label' x='248' y='60'>ANALOGIE</text>
    </svg>
  );
}
