type LogicalAnimationFrameProps = {
  ariaLabel: string;
  viewBox?: string;
  children: React.ReactNode;
  styles: string;
};

function LogicalAnimationFrame({
  ariaLabel,
  viewBox = '0 0 320 160',
  children,
  styles,
}: LogicalAnimationFrameProps): React.JSX.Element {
  return (
    <svg
      aria-label={ariaLabel}
      className='h-auto w-full'
      role='img'
      viewBox={viewBox}
    >
      <style>{styles}</style>
      {children}
    </svg>
  );
}

export function ClassificationSortByColorAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: przedmioty są grupowane według koloru.'
      styles={`
        .bin { fill: #f8fafc; stroke-width: 2; stroke-dasharray: 6 6; }
        .left-bin { stroke: #ec4899; }
        .right-bin { stroke: #38bdf8; }
        .pink { fill: #f472b6; }
        .blue { fill: #38bdf8; }
        .drop-left { animation: colorLeft 4.8s ease-in-out infinite; }
        .drop-right { animation: colorRight 4.8s ease-in-out infinite; }
        .delay-a { animation-delay: 0.4s; }
        .delay-b { animation-delay: 0.8s; }
        .delay-c { animation-delay: 1.2s; }
        @keyframes colorLeft {
          0%, 20% { transform: translate(80px, 0); opacity: 0.35; }
          55%, 80% { transform: translate(0, 30px); opacity: 1; }
          100% { transform: translate(80px, 0); opacity: 0.35; }
        }
        @keyframes colorRight {
          0%, 20% { transform: translate(-80px, 0); opacity: 0.35; }
          55%, 80% { transform: translate(0, 30px); opacity: 1; }
          100% { transform: translate(-80px, 0); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .drop-left, .drop-right { animation: none; opacity: 1; transform: translateY(30px); }
        }
      `}
    >
      <rect className='bin left-bin bin' x='24' y='64' width='112' height='72' rx='16' />
      <rect className='bin right-bin bin' x='184' y='64' width='112' height='72' rx='16' />
      <circle className='pink drop-left' cx='92' cy='38' r='12' />
      <circle className='pink drop-left delay-a' cx='124' cy='34' r='10' />
      <rect className='blue drop-right' x='194' y='28' width='24' height='24' rx='7' />
      <rect className='blue drop-right delay-b' x='234' y='30' width='20' height='20' rx='6' />
      <circle className='pink drop-left delay-c' cx='108' cy='38' r='8' />
      <rect className='blue drop-right delay-c' x='214' y='34' width='16' height='16' rx='5' />
    </LogicalAnimationFrame>
  );
}

export function ClassificationSortByShapeAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: figury trafiają do grup według kształtu.'
      styles={`
        .bin { fill: #f8fafc; stroke: #a78bfa; stroke-width: 2; stroke-dasharray: 6 6; }
        .circle-shape { fill: #a855f7; }
        .square-shape { fill: #0ea5e9; }
        .circle-flow { animation: shapeLeft 4.6s ease-in-out infinite; }
        .square-flow { animation: shapeRight 4.6s ease-in-out infinite; }
        .late { animation-delay: 0.8s; }
        @keyframes shapeLeft {
          0%, 25% { transform: translate(76px, 0); opacity: 0.35; }
          55%, 80% { transform: translate(0, 28px); opacity: 1; }
          100% { transform: translate(76px, 0); opacity: 0.35; }
        }
        @keyframes shapeRight {
          0%, 25% { transform: translate(-76px, 0); opacity: 0.35; }
          55%, 80% { transform: translate(0, 28px); opacity: 1; }
          100% { transform: translate(-76px, 0); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .circle-flow, .square-flow { animation: none; opacity: 1; transform: translateY(28px); }
        }
      `}
    >
      <rect className='bin' x='24' y='64' width='112' height='72' rx='16' />
      <rect className='bin' x='184' y='64' width='112' height='72' rx='16' />
      <circle className='circle-shape circle-flow' cx='94' cy='36' r='12' />
      <circle className='circle-shape circle-flow late' cx='122' cy='34' r='9' />
      <rect className='square-shape square-flow' x='196' y='26' width='24' height='24' rx='6' />
      <rect
        className='square-shape square-flow late'
        x='232'
        y='28'
        width='18'
        height='18'
        rx='5'
      />
    </LogicalAnimationFrame>
  );
}

export function ClassificationSortBySizeAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: elementy są porządkowane według rozmiaru.'
      styles={`
        .guide { stroke: #cbd5e1; stroke-width: 2; stroke-dasharray: 4 6; }
        .small { fill: #22c55e; animation: growUp 4.2s ease-in-out infinite; }
        .medium { fill: #14b8a6; animation: growUp 4.2s ease-in-out infinite 0.6s; }
        .large { fill: #0ea5e9; animation: growUp 4.2s ease-in-out infinite 1.2s; }
        @keyframes growUp {
          0%, 25% { transform: translateY(10px); opacity: 0.4; }
          55%, 80% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(10px); opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          .small, .medium, .large { animation: none; opacity: 1; transform: none; }
        }
      `}
    >
      <line className='guide' x1='40' x2='280' y1='126' y2='126' />
      <rect className='small' x='56' y='92' width='44' height='34' rx='8' />
      <rect className='medium' x='132' y='70' width='52' height='56' rx='10' />
      <rect className='large' x='218' y='42' width='60' height='84' rx='12' />
    </LogicalAnimationFrame>
  );
}

export function ClassificationCategoryBinsAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: przedmioty trafiają do odpowiednich kategorii.'
      styles={`
        .bin { fill: #fffbeb; stroke: #f59e0b; stroke-width: 2; stroke-dasharray: 6 6; }
        .token { opacity: 0.35; animation: sink 5s ease-in-out infinite; }
        .fruit { fill: #f97316; }
        .veg { fill: #22c55e; animation-delay: 0.6s; }
        .toy { fill: #8b5cf6; animation-delay: 1.2s; }
        @keyframes sink {
          0%, 20% { transform: translateY(-12px); opacity: 0.35; }
          55%, 80% { transform: translateY(16px); opacity: 1; }
          100% { transform: translateY(-12px); opacity: 0.35; }
        }
        .label { fill: #92400e; font: 700 11px/1 system-ui, sans-serif; }
        @media (prefers-reduced-motion: reduce) {
          .token { animation: none; opacity: 1; transform: translateY(16px); }
        }
      `}
    >
      <rect className='bin' x='18' y='62' width='86' height='74' rx='16' />
      <rect className='bin' x='117' y='62' width='86' height='74' rx='16' />
      <rect className='bin' x='216' y='62' width='86' height='74' rx='16' />
      <text className='label' x='61' y='86' textAnchor='middle'>OWOCE</text>
      <text className='label' x='160' y='86' textAnchor='middle'>WARZYWA</text>
      <text className='label' x='259' y='86' textAnchor='middle'>ZABAWKI</text>
      <circle className='token fruit' cx='61' cy='38' r='11' />
      <rect className='token veg' x='148' y='28' width='24' height='18' rx='8' />
      <polygon className='token toy' points='259,24 271,46 247,46' />
    </LogicalAnimationFrame>
  );
}

export function ClassificationTwoCriteriaGridAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: przedmioty układają się w siatce dwóch kryteriów.'
      styles={`
        .cell { fill: #f8fafc; stroke: #2dd4bf; stroke-width: 2; }
        .token {
          fill: #0f766e;
          opacity: 0.35;
          animation: settle 4.8s ease-in-out infinite;
        }
        .d1 { animation-delay: 0.3s; }
        .d2 { animation-delay: 0.6s; }
        .d3 { animation-delay: 0.9s; }
        .axis { fill: #0f766e; font: 700 11px/1 system-ui, sans-serif; }
        @keyframes settle {
          0%, 20% { transform: translateY(-10px); opacity: 0.35; }
          55%, 80% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-10px); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .token { animation: none; opacity: 1; transform: none; }
        }
      `}
    >
      <text className='axis' x='118' y='22'>DUZE</text>
      <text className='axis' x='204' y='22'>MALE</text>
      <text className='axis' x='20' y='66'>CZERWONE</text>
      <text className='axis' x='26' y='116'>NIEBIESKIE</text>
      {[0, 1].flatMap((row) =>
        [0, 1].map((col) => (
          <rect
            key={`cell-${row}-${col}`}
            className='cell'
            x={104 + col * 84}
            y={32 + row * 52}
            width='72'
            height='40'
            rx='10'
          />
        ))
      )}
      <circle className='token' cx='128' cy='52' r='8' />
      <circle className='token d1' cx='212' cy='52' r='6' />
      <rect className='token d2' x='120' y='93' width='18' height='18' rx='5' />
      <rect className='token d3' x='205' y='96' width='14' height='14' rx='4' />
    </LogicalAnimationFrame>
  );
}

export function ClassificationCriteriaAxesAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: osie pomagają czytać dwa kryteria naraz.'
      styles={`
        .axis { stroke: #14b8a6; stroke-width: 3; stroke-linecap: round; }
        .hint { stroke: #99f6e4; stroke-width: 2; stroke-dasharray: 5 5; }
        .label { fill: #0f766e; font: 700 11px/1 system-ui, sans-serif; }
        .dot { fill: #0ea5e9; animation: orbit 4.4s ease-in-out infinite; }
        @keyframes orbit {
          0%, 20% { transform: translate(-8px, 6px); opacity: 0.45; }
          55%, 80% { transform: translate(0, 0); opacity: 1; }
          100% { transform: translate(-8px, 6px); opacity: 0.45; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot { animation: none; opacity: 1; transform: none; }
        }
      `}
    >
      <line className='axis' x1='64' y1='126' x2='256' y2='126' />
      <line className='axis' x1='64' y1='126' x2='64' y2='28' />
      <line className='hint' x1='160' y1='126' x2='160' y2='48' />
      <line className='hint' x1='64' y1='82' x2='236' y2='82' />
      <text className='label' x='246' y='144'>ROZMIAR</text>
      <text className='label' x='16' y='34'>KOLOR</text>
      <circle className='dot' cx='160' cy='82' r='9' />
    </LogicalAnimationFrame>
  );
}

export function ClassificationVennOverlapAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: część wspólna dwóch zbiorów jest podświetlona.'
      styles={`
        .left { fill: rgba(56, 189, 248, 0.32); stroke: #38bdf8; stroke-width: 3; }
        .right { fill: rgba(250, 204, 21, 0.32); stroke: #f59e0b; stroke-width: 3; }
        .overlap { fill: rgba(45, 212, 191, 0.5); animation: vennPulse 4.2s ease-in-out infinite; }
        @keyframes vennPulse {
          0%, 100% { opacity: 0.45; transform: scale(0.96); }
          50% { opacity: 0.95; transform: scale(1); }
        }
        .label { font: 700 11px/1 system-ui, sans-serif; }
        .l1 { fill: #0369a1; }
        .l2 { fill: #b45309; }
        .l3 { fill: #0f766e; }
        @media (prefers-reduced-motion: reduce) {
          .overlap { animation: none; opacity: 0.95; transform: none; }
        }
      `}
    >
      <circle className='left' cx='124' cy='82' r='52' />
      <circle className='right' cx='196' cy='82' r='52' />
      <rect className='overlap' x='144' y='40' width='32' height='84' rx='16' />
      <text className='label l1' x='92' y='30'>SPORT</text>
      <text className='label l2' x='184' y='30'>MUZYKA</text>
      <text className='label l3' x='160' y='148' textAnchor='middle'>WSPOLNE</text>
    </LogicalAnimationFrame>
  );
}

export function ClassificationVennUnionAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: oba zbiory razem tworzą sumę.'
      styles={`
        .shell { fill: rgba(59, 130, 246, 0.08); stroke: #cbd5e1; stroke-width: 2; }
        .left { fill: rgba(96, 165, 250, 0.38); }
        .right { fill: rgba(250, 204, 21, 0.4); }
        .halo { fill: rgba(45, 212, 191, 0.18); animation: unionGlow 4.6s ease-in-out infinite; }
        .label { fill: #0f172a; font: 700 11px/1 system-ui, sans-serif; }
        @keyframes unionGlow {
          0%, 100% { opacity: 0.28; transform: scale(0.97); }
          50% { opacity: 0.65; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .halo { animation: none; opacity: 0.65; transform: none; }
        }
      `}
    >
      <rect className='shell' x='60' y='24' width='200' height='112' rx='28' />
      <circle className='left' cx='128' cy='80' r='44' />
      <circle className='right' cx='192' cy='80' r='44' />
      <rect className='halo' x='74' y='34' width='172' height='92' rx='24' />
      <text className='label' x='160' y='148' textAnchor='middle'>SUMA ZBIOROW</text>
    </LogicalAnimationFrame>
  );
}

export function ClassificationCriteriaSwitchAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: to samo zadanie zmienia aktywne kryterium klasyfikacji.'
      styles={`
        .pill {
          fill: #eef2ff;
          stroke: #818cf8;
          stroke-width: 2;
          opacity: 0.35;
          animation: criterionSwitch 5s ease-in-out infinite;
        }
        .p2 { animation-delay: 1.2s; }
        .p3 { animation-delay: 2.4s; }
        .label { fill: #4338ca; font: 700 12px/1 system-ui, sans-serif; }
        .token { fill: #0f172a; opacity: 0.75; }
        @keyframes criterionSwitch {
          0%, 20% { opacity: 0.3; transform: scale(0.96); }
          35%, 55% { opacity: 1; transform: scale(1); }
          80%, 100% { opacity: 0.3; transform: scale(0.96); }
        }
        @media (prefers-reduced-motion: reduce) {
          .pill { animation: none; opacity: 1; transform: none; }
        }
      `}
    >
      <rect className='pill p1' x='24' y='28' width='84' height='34' rx='17' />
      <rect className='pill p2' x='118' y='28' width='84' height='34' rx='17' />
      <rect className='pill p3' x='212' y='28' width='84' height='34' rx='17' />
      <text className='label' x='66' y='49' textAnchor='middle'>KOLOR</text>
      <text className='label' x='160' y='49' textAnchor='middle'>KSZTALT</text>
      <text className='label' x='254' y='49' textAnchor='middle'>ROZMIAR</text>
      <circle className='token' cx='106' cy='114' r='16' />
      <rect className='token' x='146' y='98' width='28' height='28' rx='8' />
      <polygon className='token' points='234,126 254,92 274,126' />
    </LogicalAnimationFrame>
  );
}

export function ClassificationOddOneOutAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: jeden element odstaje od reszty.'
      styles={`
        .common { fill: #38bdf8; opacity: 0.55; }
        .odd {
          fill: #f43f5e;
          animation: oddPulse 4s ease-in-out infinite;
        }
        @keyframes oddPulse {
          0%, 100% { transform: scale(0.94); opacity: 0.5; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .odd { animation: none; opacity: 1; transform: none; }
        }
      `}
    >
      <circle className='common' cx='56' cy='80' r='16' />
      <circle className='common' cx='120' cy='80' r='16' />
      <circle className='common' cx='184' cy='80' r='16' />
      <rect className='odd' x='236' y='64' width='32' height='32' rx='9' />
    </LogicalAnimationFrame>
  );
}

export function ClassificationHiddenRuleAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: ukryta reguła odsłania poprawne dopasowanie.'
      styles={`
        .card { fill: #fff7ed; stroke: #fb923c; stroke-width: 2; }
        .question { fill: #f97316; font: 700 28px/1 system-ui, sans-serif; }
        .glow {
          fill: rgba(251, 146, 60, 0.22);
          animation: hiddenGlow 4.4s ease-in-out infinite;
        }
        @keyframes hiddenGlow {
          0%, 100% { opacity: 0.2; transform: scale(0.94); }
          50% { opacity: 0.7; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .glow { animation: none; opacity: 0.7; transform: none; }
        }
      `}
    >
      <rect className='card' x='42' y='42' width='64' height='64' rx='16' />
      <rect className='card' x='128' y='42' width='64' height='64' rx='16' />
      <rect className='card' x='214' y='42' width='64' height='64' rx='16' />
      <circle className='glow' cx='246' cy='74' r='38' />
      <text className='question' x='74' y='83' textAnchor='middle'>2</text>
      <text className='question' x='160' y='83' textAnchor='middle'>4</text>
      <text className='question' x='246' y='83' textAnchor='middle'>?</text>
    </LogicalAnimationFrame>
  );
}

export function ClassificationOddOneOutPatternAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: w szeregu wzorców jeden element łamie regułę.'
      styles={`
        .pattern { fill: #c4b5fd; }
        .breaker {
          fill: #fb7185;
          animation: breakPulse 4.4s ease-in-out infinite;
        }
        @keyframes breakPulse {
          0%, 100% { opacity: 0.45; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .breaker { animation: none; opacity: 1; transform: none; }
        }
      `}
    >
      {[0, 1, 2, 4].map((index) => (
        <g key={index} className='pattern'>
          <rect x={34 + index * 54} y='58' width='16' height='16' rx='4' />
          <circle cx={60 + index * 54} cy='66' r='8' />
        </g>
      ))}
      <g className='breaker'>
        <circle cx='228' cy='66' r='8' />
        <circle cx='252' cy='66' r='8' />
      </g>
    </LogicalAnimationFrame>
  );
}

export function ClassificationParityAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: liczby parzyste i nieparzyste rozchodzą się do dwóch grup.'
      styles={`
        .left { fill: #dbeafe; stroke: #3b82f6; stroke-width: 2; }
        .right { fill: #ffe4e6; stroke: #f43f5e; stroke-width: 2; }
        .even { fill: #2563eb; animation: parityLeft 4.6s ease-in-out infinite; }
        .odd { fill: #e11d48; animation: parityRight 4.6s ease-in-out infinite; }
        .d1 { animation-delay: 0.7s; }
        .label { font: 700 12px/1 system-ui, sans-serif; }
        .left-label { fill: #1d4ed8; }
        .right-label { fill: #be123c; }
        @keyframes parityLeft {
          0%, 25% { transform: translate(70px, 0); opacity: 0.35; }
          55%, 80% { transform: translate(0, 22px); opacity: 1; }
          100% { transform: translate(70px, 0); opacity: 0.35; }
        }
        @keyframes parityRight {
          0%, 25% { transform: translate(-70px, 0); opacity: 0.35; }
          55%, 80% { transform: translate(0, 22px); opacity: 1; }
          100% { transform: translate(-70px, 0); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .even, .odd { animation: none; opacity: 1; transform: translateY(22px); }
        }
      `}
    >
      <rect className='left' x='30' y='70' width='110' height='60' rx='14' />
      <rect className='right' x='180' y='70' width='110' height='60' rx='14' />
      <text className='label left-label' x='85' y='92' textAnchor='middle'>PARZYSTE</text>
      <text className='label right-label' x='235' y='92' textAnchor='middle'>NIEPARZYSTE</text>
      <text className='even' x='82' y='48'>2</text>
      <text className='even d1' x='112' y='42'>8</text>
      <text className='odd' x='220' y='48'>3</text>
      <text className='odd d1' x='250' y='42'>7</text>
    </LogicalAnimationFrame>
  );
}

export function ClassificationRecapSequenceAnimation(): React.JSX.Element {
  return (
    <LogicalAnimationFrame
      ariaLabel='Animacja: podsumowanie etapów klasyfikowania.'
      styles={`
        .card {
          fill: #f8fafc;
          stroke: #cbd5e1;
          stroke-width: 2;
          opacity: 0.35;
          animation: recapPulse 6s ease-in-out infinite;
        }
        .c2 { animation-delay: 1s; }
        .c3 { animation-delay: 2s; }
        .c4 { animation-delay: 3s; }
        .label { fill: #334155; font: 700 10px/1 system-ui, sans-serif; }
        .arrow { stroke: #94a3b8; stroke-width: 3; stroke-linecap: round; }
        @keyframes recapPulse {
          0%, 15% { opacity: 0.28; transform: scale(0.96); }
          35%, 55% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.28; transform: scale(0.96); }
        }
        @media (prefers-reduced-motion: reduce) {
          .card { animation: none; opacity: 1; transform: none; }
        }
      `}
    >
      <rect className='card c1' x='12' y='52' width='64' height='40' rx='12' />
      <rect className='card c2' x='88' y='52' width='64' height='40' rx='12' />
      <rect className='card c3' x='164' y='52' width='64' height='40' rx='12' />
      <rect className='card c4' x='240' y='52' width='64' height='40' rx='12' />
      <line className='arrow' x1='76' y1='72' x2='88' y2='72' />
      <line className='arrow' x1='152' y1='72' x2='164' y2='72' />
      <line className='arrow' x1='228' y1='72' x2='240' y2='72' />
      <text className='label' x='44' y='76' textAnchor='middle'>CECHA</text>
      <text className='label' x='120' y='76' textAnchor='middle'>GRUPA</text>
      <text className='label' x='196' y='76' textAnchor='middle'>SPRAWDZ</text>
      <text className='label' x='272' y='76' textAnchor='middle'>WYNIK</text>
    </LogicalAnimationFrame>
  );
}
