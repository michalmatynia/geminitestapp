export function ClassificationSortByColorAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja klasyfikacji według koloru: czerwone elementy idą do lewej grupy, niebieskie do prawej.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .bin { fill: none; stroke: #cbd5f5; stroke-width: 2; stroke-dasharray: 6 6; }
        .label { font: 600 12px/1.1 system-ui, sans-serif; fill: #0f766e; }
        .dot-red { fill: #fb7185; }
        .dot-blue { fill: #60a5fa; }
        .group-left, .group-right {
          transform-box: fill-box;
          transform-origin: center;
        }
        .group-left { animation: classifyColorLeft 6s ease-in-out infinite; }
        .group-right { animation: classifyColorRight 6s ease-in-out infinite; }
        @keyframes classifyColorLeft {
          0%, 20% { transform: translateX(120px); opacity: 0.35; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(120px); opacity: 0.35; }
        }
        @keyframes classifyColorRight {
          0%, 20% { transform: translateX(-120px); opacity: 0.35; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-120px); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-left, .group-right { animation: none; }
        }
      `}</style>
      <rect className='bin' height='80' rx='16' width='140' x='40' y='30' />
      <rect className='bin' height='80' rx='16' width='140' x='240' y='30' />
      <text className='label' x='70' y='26'>Czerwone</text>
      <text className='label' x='270' y='26'>Niebieskie</text>
      <g className='group-left'>
        <circle className='dot-red' cx='80' cy='60' r='10' />
        <circle className='dot-red' cx='115' cy='60' r='10' />
        <circle className='dot-red' cx='100' cy='90' r='10' />
      </g>
      <g className='group-right'>
        <circle className='dot-blue' cx='280' cy='60' r='10' />
        <circle className='dot-blue' cx='315' cy='60' r='10' />
        <circle className='dot-blue' cx='300' cy='90' r='10' />
      </g>
    </svg>
  );
}

export function ClassificationSortBySizeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja klasyfikacji według rozmiaru: duże elementy idą na górę, małe na dół.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .bin { fill: none; stroke: #bae6fd; stroke-width: 2; stroke-dasharray: 6 6; }
        .label { font: 600 12px/1.1 system-ui, sans-serif; fill: #0284c7; }
        .dot-big { fill: #facc15; }
        .dot-small { fill: #38bdf8; }
        .group-top, .group-bottom {
          transform-box: fill-box;
          transform-origin: center;
        }
        .group-top { animation: classifySizeTop 6s ease-in-out infinite; }
        .group-bottom { animation: classifySizeBottom 6s ease-in-out infinite; }
        @keyframes classifySizeTop {
          0%, 20% { transform: translateY(40px); opacity: 0.35; }
          50%, 80% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(40px); opacity: 0.35; }
        }
        @keyframes classifySizeBottom {
          0%, 20% { transform: translateY(-40px); opacity: 0.35; }
          50%, 80% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-40px); opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-top, .group-bottom { animation: none; }
        }
      `}</style>
      <rect className='bin' height='46' rx='14' width='300' x='60' y='20' />
      <rect className='bin' height='46' rx='14' width='300' x='60' y='78' />
      <text className='label' x='70' y='16'>Duże</text>
      <text className='label' x='70' y='74'>Małe</text>
      <g className='group-top'>
        <circle className='dot-big' cx='140' cy='42' r='12' />
        <circle className='dot-big' cx='200' cy='42' r='12' />
        <circle className='dot-big' cx='260' cy='42' r='12' />
      </g>
      <g className='group-bottom'>
        <circle className='dot-small' cx='150' cy='100' r='7' />
        <circle className='dot-small' cx='200' cy='100' r='7' />
        <circle className='dot-small' cx='250' cy='100' r='7' />
      </g>
    </svg>
  );
}

export function ClassificationSortByShapeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja klasyfikacji według kształtu: koła trafiają do lewej grupy, kwadraty do prawej.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .bin { fill: none; stroke: #c4b5fd; stroke-width: 2; stroke-dasharray: 6 6; }
        .label { font: 600 12px/1.1 system-ui, sans-serif; fill: #6d28d9; }
        .shape-circle { fill: #a78bfa; }
        .shape-square { fill: #60a5fa; }
        .group-left, .group-right {
          transform-box: fill-box;
          transform-origin: center;
        }
        .group-left { animation: classifyShapeLeft 6s ease-in-out infinite; }
        .group-right { animation: classifyShapeRight 6s ease-in-out infinite; }
        @keyframes classifyShapeLeft {
          0%, 20% { transform: translateX(110px); opacity: 0.3; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(110px); opacity: 0.3; }
        }
        @keyframes classifyShapeRight {
          0%, 20% { transform: translateX(-110px); opacity: 0.3; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-110px); opacity: 0.3; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-left, .group-right { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='bin' height='80' rx='16' width='150' x='35' y='30' />
      <rect className='bin' height='80' rx='16' width='150' x='235' y='30' />
      <text className='label' x='72' y='26'>Koła</text>
      <text className='label' x='270' y='26'>Kwadraty</text>
      <g className='group-left'>
        <circle className='shape-circle' cx='95' cy='64' r='12' />
        <circle className='shape-circle' cx='130' cy='64' r='10' />
        <circle className='shape-circle' cx='112' cy='92' r='11' />
      </g>
      <g className='group-right'>
        <rect className='shape-square' height='20' rx='4' width='20' x='270' y='52' />
        <rect className='shape-square' height='18' rx='4' width='18' x='302' y='54' />
        <rect className='shape-square' height='22' rx='4' width='22' x='286' y='82' />
      </g>
    </svg>
  );
}

export function ClassificationCategoryBinsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja kategoryzacji: elementy trafiają do koszyków owoców, warzyw i zabawek.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .bin { fill: none; stroke: #fcd34d; stroke-width: 2; stroke-dasharray: 6 6; }
        .label { font: 600 12px/1.1 system-ui, sans-serif; fill: #b45309; }
        .drop {
          transform-box: fill-box;
          transform-origin: center;
          animation: categoryDrop 6s ease-in-out infinite;
          opacity: 0.25;
        }
        .drop-1 { animation-delay: 0s; }
        .drop-2 { animation-delay: 0.6s; }
        .drop-3 { animation-delay: 1.2s; }
        @keyframes categoryDrop {
          0%, 25% { opacity: 0.2; transform: translateY(-18px); }
          45%, 80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0.2; transform: translateY(-18px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .drop { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <rect className='bin' height='76' rx='16' width='110' x='28' y='48' />
      <rect className='bin' height='76' rx='16' width='110' x='155' y='48' />
      <rect className='bin' height='76' rx='16' width='110' x='282' y='48' />
      <text className='label' x='46' y='40'>Owoce</text>
      <text className='label' x='173' y='40'>Warzywa</text>
      <text className='label' x='298' y='40'>Zabawki</text>
      <g className='drop drop-1'>
        <circle cx='72' cy='88' r='10' fill='#fb7185' />
        <circle cx='100' cy='88' r='10' fill='#f97316' />
      </g>
      <g className='drop drop-2'>
        <rect x='182' y='78' width='18' height='20' rx='5' fill='#34d399' />
        <rect x='212' y='78' width='18' height='20' rx='5' fill='#22c55e' />
      </g>
      <g className='drop drop-3'>
        <polygon points='322,78 334,88 322,98 310,88' fill='#60a5fa' />
        <polygon points='352,78 364,88 352,98 340,88' fill='#a78bfa' />
      </g>
    </svg>
  );
}

export function ClassificationParityAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja klasyfikacji parzyste i nieparzyste: liczby wchodza do odpowiednich kolumn.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 130'
    >
      <style>{`
        .bin { fill: none; stroke: #93c5fd; stroke-width: 2; stroke-dasharray: 6 6; }
        .label { font: 600 12px/1.1 system-ui, sans-serif; fill: #1d4ed8; }
        .bubble { fill: #dbeafe; stroke: #60a5fa; stroke-width: 2; }
        .bubble-odd { fill: #fee2e2; stroke: #fb7185; }
        .num { font: 700 12px/1.1 system-ui, sans-serif; fill: #1e3a8a; }
        .num-odd { fill: #9f1239; }
        .even-group, .odd-group {
          transform-box: fill-box;
          transform-origin: center;
        }
        .even-group { animation: parityEven 6s ease-in-out infinite; }
        .odd-group { animation: parityOdd 6s ease-in-out infinite; }
        @keyframes parityEven {
          0%, 20% { transform: translateX(80px); opacity: 0.3; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(80px); opacity: 0.3; }
        }
        @keyframes parityOdd {
          0%, 20% { transform: translateX(-80px); opacity: 0.3; }
          50%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-80px); opacity: 0.3; }
        }
        @media (prefers-reduced-motion: reduce) {
          .even-group, .odd-group { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='bin' height='70' rx='16' width='150' x='40' y='36' />
      <rect className='bin' height='70' rx='16' width='150' x='230' y='36' />
      <text className='label' x='70' y='30'>Parzyste</text>
      <text className='label' x='255' y='30'>Nieparzyste</text>
      <g className='even-group'>
        <circle className='bubble' cx='90' cy='66' r='12' />
        <circle className='bubble' cx='132' cy='66' r='12' />
        <circle className='bubble' cx='111' cy='94' r='12' />
        <text className='num' x='86' y='70'>2</text>
        <text className='num' x='128' y='70'>4</text>
        <text className='num' x='107' y='98'>6</text>
      </g>
      <g className='odd-group'>
        <circle className='bubble bubble-odd' cx='280' cy='66' r='12' />
        <circle className='bubble bubble-odd' cx='322' cy='66' r='12' />
        <circle className='bubble bubble-odd' cx='301' cy='94' r='12' />
        <text className='num num-odd' x='276' y='70'>1</text>
        <text className='num num-odd' x='318' y='70'>3</text>
        <text className='num num-odd' x='297' y='98'>5</text>
      </g>
    </svg>
  );
}

export function ClassificationTwoCriteriaGridAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja klasyfikacji według dwóch cech: elementy trafiają do czterech pól siatki.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .grid { stroke: #a7f3d0; stroke-width: 2; }
        .cell-dot { transform-box: fill-box; transform-origin: center; }
        .cell-a { fill: #34d399; animation: classifyGridPop 6s ease-in-out infinite; animation-delay: 0s; }
        .cell-b { fill: #22d3ee; animation: classifyGridPop 6s ease-in-out infinite; animation-delay: 0.4s; }
        .cell-c { fill: #f59e0b; animation: classifyGridPop 6s ease-in-out infinite; animation-delay: 0.8s; }
        .cell-d { fill: #f97316; animation: classifyGridPop 6s ease-in-out infinite; animation-delay: 1.2s; }
        @keyframes classifyGridPop {
          0%, 20% { opacity: 0.2; transform: scale(0.9); }
          45%, 80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.2; transform: scale(0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cell-a, .cell-b, .cell-c, .cell-d { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <rect className='grid' fill='none' height='104' rx='16' width='260' x='80' y='24' />
      <line className='grid' x1='210' x2='210' y1='24' y2='128' />
      <line className='grid' x1='80' x2='340' y1='76' y2='76' />
      <circle className='cell-dot cell-a' cx='150' cy='52' r='10' />
      <circle className='cell-dot cell-b' cx='270' cy='52' r='10' />
      <circle className='cell-dot cell-c' cx='150' cy='100' r='10' />
      <circle className='cell-dot cell-d' cx='270' cy='100' r='10' />
    </svg>
  );
}

export function ClassificationVennOverlapAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja diagramu Venna: elementy przechodzą do lewej, prawej i wspólnej części.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .ring-left { fill: rgba(125, 211, 252, 0.35); stroke: #38bdf8; stroke-width: 2; }
        .ring-right { fill: rgba(253, 186, 116, 0.35); stroke: #fb923c; stroke-width: 2; }
        .dot-left { fill: #38bdf8; }
        .dot-right { fill: #fb923c; }
        .dot-mid { fill: #34d399; }
        .group-left, .group-right, .group-mid {
          transform-box: fill-box;
          transform-origin: center;
        }
        .group-left { animation: vennLeft 6s ease-in-out infinite; }
        .group-right { animation: vennRight 6s ease-in-out infinite; }
        .group-mid { animation: vennMid 6s ease-in-out infinite; }
        @keyframes vennLeft {
          0%, 25% { transform: translateX(40px); opacity: 0.25; }
          45%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(40px); opacity: 0.25; }
        }
        @keyframes vennRight {
          0%, 25% { transform: translateX(-40px); opacity: 0.25; }
          45%, 80% { transform: translateX(0); opacity: 1; }
          100% { transform: translateX(-40px); opacity: 0.25; }
        }
        @keyframes vennMid {
          0%, 35% { opacity: 0.2; transform: scale(0.9); }
          55%, 80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.2; transform: scale(0.9); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-left, .group-right, .group-mid { animation: none; }
        }
      `}</style>
      <circle className='ring-left' cx='170' cy='80' r='46' />
      <circle className='ring-right' cx='250' cy='80' r='46' />
      <g className='group-left'>
        <circle className='dot-left' cx='150' cy='70' r='8' />
        <circle className='dot-left' cx='140' cy='92' r='8' />
      </g>
      <g className='group-right'>
        <circle className='dot-right' cx='270' cy='70' r='8' />
        <circle className='dot-right' cx='280' cy='92' r='8' />
      </g>
      <g className='group-mid'>
        <circle className='dot-mid' cx='210' cy='80' r='9' />
      </g>
    </svg>
  );
}

export function ClassificationOddOneOutAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja intruza: jeden element wybija się z szeregu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 120'
    >
      <style>{`
        .item { fill: #94a3b8; }
        .intruder { fill: #fb7185; animation: intruderShift 4.5s ease-in-out infinite; }
        @keyframes intruderShift {
          0%, 30% { transform: translateY(0); opacity: 0.6; }
          55% { transform: translateY(16px); opacity: 1; }
          80% { transform: translateY(0); opacity: 0.8; }
          100% { transform: translateY(0); opacity: 0.6; }
        }
        @media (prefers-reduced-motion: reduce) {
          .intruder { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='item' height='26' rx='6' width='26' x='70' y='46' />
      <rect className='item' height='26' rx='6' width='26' x='130' y='46' />
      <rect className='intruder' height='26' rx='6' width='26' x='190' y='46' />
      <rect className='item' height='26' rx='6' width='26' x='250' y='46' />
      <rect className='item' height='26' rx='6' width='26' x='310' y='46' />
    </svg>
  );
}

export function ClassificationOddOneOutPatternAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja intruza w szeregu: jeden element lamie powtarzajacy się wzor.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 120'
    >
      <style>{`
        .item { fill: #94a3b8; }
        .intruder { fill: #f97316; animation: intruderPulse 4.8s ease-in-out infinite; }
        @keyframes intruderPulse {
          0%, 30% { opacity: 0.5; transform: translateY(0) scale(0.95); }
          55% { opacity: 1; transform: translateY(-8px) scale(1.05); }
          85% { opacity: 0.8; transform: translateY(0) scale(1); }
          100% { opacity: 0.5; transform: translateY(0) scale(0.95); }
        }
        @media (prefers-reduced-motion: reduce) {
          .intruder { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <circle className='item' cx='70' cy='64' r='12' />
      <rect className='item' height='24' rx='5' width='24' x='110' y='52' />
      <circle className='item' cx='170' cy='64' r='12' />
      <polygon className='intruder' points='210,50 230,82 190,82' />
      <circle className='item' cx='270' cy='64' r='12' />
      <rect className='item' height='24' rx='5' width='24' x='310' y='52' />
    </svg>
  );
}

export function ClassificationHiddenRuleAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja ukrytej reguły: elementy pasujące do reguły podświetlają się.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 130'
    >
      <style>{`
        .rule { fill: #fef3c7; stroke: #f59e0b; stroke-width: 2; }
        .rule-text { font: 700 12px/1.1 system-ui, sans-serif; fill: #b45309; }
        .item { fill: #cbd5f5; }
        .match { fill: #fbbf24; animation: matchGlow 5s ease-in-out infinite; }
        .hint { animation: rulePulse 5s ease-in-out infinite; }
        @keyframes matchGlow {
          0%, 30% { opacity: 0.4; transform: scale(0.95); }
          55%, 80% { opacity: 1; transform: scale(1); }
          100% { opacity: 0.4; transform: scale(0.95); }
        }
        @keyframes rulePulse {
          0%, 35% { opacity: 0.3; }
          55%, 80% { opacity: 1; }
          100% { opacity: 0.3; }
        }
        @media (prefers-reduced-motion: reduce) {
          .match, .hint { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='rule hint' height='28' rx='10' width='180' x='120' y='12' />
      <text className='rule-text hint' x='150' y='31'>Regula: ma rogi</text>
      <rect className='item' height='30' rx='6' width='30' x='80' y='70' />
      <rect className='match' height='30' rx='6' width='30' x='150' y='70' />
      <rect className='item' height='30' rx='6' width='30' x='220' y='70' />
      <rect className='match' height='30' rx='6' width='30' x='290' y='70' />
    </svg>
  );
}

export function ClassificationRecapSequenceAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja podsumowania: kolejne zasady pojawiaja się po sobie.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 120'
    >
      <style>{`
        .pill { fill: #e0f2fe; stroke: #38bdf8; stroke-width: 2; }
        .label { font: 700 11px/1.1 system-ui, sans-serif; fill: #0f766e; }
        .step { animation: recapStep 6s ease-in-out infinite; opacity: 0.2; }
        .step-1 { animation-delay: 0s; }
        .step-2 { animation-delay: 0.5s; }
        .step-3 { animation-delay: 1s; }
        .step-4 { animation-delay: 1.5s; }
        @keyframes recapStep {
          0%, 15% { opacity: 0.2; transform: translateY(6px); }
          35%, 70% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0.2; transform: translateY(6px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .step { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <g className='step step-1'>
        <rect className='pill' height='26' rx='12' width='110' x='30' y='24' />
        <text className='label' x='45' y='41'>Jedna cecha</text>
      </g>
      <g className='step step-2'>
        <rect className='pill' height='26' rx='12' width='110' x='160' y='24' />
        <text className='label' x='175' y='41'>Wiele cech</text>
      </g>
      <g className='step step-3'>
        <rect className='pill' height='26' rx='12' width='110' x='290' y='24' />
        <text className='label' x='308' y='41'>Venn</text>
      </g>
      <g className='step step-4'>
        <rect className='pill' height='26' rx='12' width='160' x='130' y='66' />
        <text className='label' x='150' y='83'>Intruz i reguła</text>
      </g>
    </svg>
  );
}

export function ClassificationCriteriaAxesAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dwóch kryteriów: oś pozioma to kolor, oś pionowa to rozmiar.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .axis { stroke: #38bdf8; stroke-width: 3; stroke-linecap: round; }
        .axis-label { font: 700 12px/1.1 system-ui, sans-serif; fill: #0f766e; }
        .tick { stroke: #94a3b8; stroke-width: 2; }
        .pulse { animation: axesPulse 5.5s ease-in-out infinite; }
        @keyframes axesPulse {
          0%, 25% { opacity: 0.4; }
          45%, 80% { opacity: 1; }
          100% { opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          .pulse { animation: none; opacity: 1; }
        }
      `}</style>
      <line className='axis' x1='90' x2='330' y1='120' y2='120' />
      <line className='axis' x1='110' x2='110' y1='40' y2='120' />
      <line className='tick' x1='170' x2='170' y1='114' y2='126' />
      <line className='tick' x1='230' x2='230' y1='114' y2='126' />
      <line className='tick' x1='110' x2='98' y1='70' y2='70' />
      <line className='tick' x1='110' x2='98' y1='95' y2='95' />
      <text className='axis-label pulse' x='190' y='142'>Kolor</text>
      <text className='axis-label pulse' x='24' y='84' transform='rotate(-90 24 84)'>Rozmiar</text>
      <circle cx='170' cy='70' r='8' fill='#34d399' />
      <circle cx='230' cy='95' r='8' fill='#f59e0b' />
    </svg>
  );
}

export function ClassificationCriteriaSwitchAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja zmiany kryterium: te same elementy sortujemy najpierw według koloru, potem według kształtu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .badge { fill: #e0f2fe; stroke: #38bdf8; stroke-width: 2; }
        .badge-alt { fill: #ede9fe; stroke: #a78bfa; }
        .badge-text { font: 700 11px/1.1 system-ui, sans-serif; fill: #0f766e; }
        .badge-text-alt { fill: #6d28d9; }
        .badge-color { animation: badgeOn 6s ease-in-out infinite; }
        .badge-shape { animation: badgeOff 6s ease-in-out infinite; }
        .state-color, .state-shape { transform-box: fill-box; transform-origin: center; }
        .state-color { animation: showColor 6s ease-in-out infinite; }
        .state-shape { animation: showShape 6s ease-in-out infinite; }
        @keyframes showColor {
          0%, 45% { opacity: 1; transform: translateY(0); }
          55%, 100% { opacity: 0; transform: translateY(8px); }
        }
        @keyframes showShape {
          0%, 45% { opacity: 0; transform: translateY(-8px); }
          55%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes badgeOn {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0.35; }
        }
        @keyframes badgeOff {
          0%, 45% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .state-color, .state-shape, .badge-color, .badge-shape { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <rect className='badge badge-color' height='24' rx='12' width='140' x='60' y='18' />
      <rect className='badge badge-alt badge-shape' height='24' rx='12' width='140' x='220' y='18' />
      <text className='badge-text badge-color' textAnchor='middle' x='130' y='34'>Kryterium: kolor</text>
      <text className='badge-text badge-text-alt badge-shape' textAnchor='middle' x='290' y='34'>Kryterium: kształt</text>
      <g className='state-color'>
        <circle cx='120' cy='80' r='11' fill='#38bdf8' />
        <circle cx='160' cy='80' r='11' fill='#38bdf8' />
        <circle cx='260' cy='80' r='11' fill='#fb7185' />
        <circle cx='300' cy='80' r='11' fill='#fb7185' />
      </g>
      <g className='state-shape'>
        <circle cx='140' cy='94' r='11' fill='#a78bfa' />
        <rect x='230' y='84' width='22' height='22' rx='5' fill='#facc15' />
        <circle cx='180' cy='110' r='11' fill='#a78bfa' />
        <rect x='270' y='94' width='22' height='22' rx='5' fill='#facc15' />
      </g>
    </svg>
  );
}

export function ClassificationVennUnionAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja zbioru unii: oba koła podświetlają się jako całość.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 150'
    >
      <style>{`
        .ring-left { stroke: #60a5fa; stroke-width: 2; }
        .ring-right { stroke: #f59e0b; stroke-width: 2; }
        .fill-left { fill: rgba(96, 165, 250, 0.22); }
        .fill-right { fill: rgba(245, 158, 11, 0.22); }
        .union { animation: unionGlow 5.5s ease-in-out infinite; }
        @keyframes unionGlow {
          0%, 25% { opacity: 0.35; }
          50%, 80% { opacity: 1; }
          100% { opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .union { animation: none; opacity: 1; }
        }
      `}</style>
      <circle className='fill-left union' cx='170' cy='80' r='48' />
      <circle className='fill-right union' cx='250' cy='80' r='48' />
      <circle className='ring-left' cx='170' cy='80' r='48' fill='none' />
      <circle className='ring-right' cx='250' cy='80' r='48' fill='none' />
      <text x='118' y='30' fontSize='12' fontWeight='700' fill='#2563eb'>Zbior A</text>
      <text x='258' y='30' fontSize='12' fontWeight='700' fill='#b45309'>Zbior B</text>
    </svg>
  );
}
