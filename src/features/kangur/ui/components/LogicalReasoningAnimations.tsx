export function DeductionFlowAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dedukcji: od ogolnej reguly do konkretnego wniosku.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 150'
    >
      <style>{`
        .node { fill: #eef2ff; stroke: #818cf8; stroke-width: 2; }
        .label { font: 700 11px/1 system-ui, sans-serif; fill: #4338ca; }
        .arrow { stroke: #6366f1; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 12 10; animation: flow 4.8s ease-in-out infinite; }
        @keyframes flow {
          0%, 20% { stroke-dashoffset: 22; opacity: 0.35; }
          55%, 80% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 22; opacity: 0.35; }
        }
        @media (prefers-reduced-motion: reduce) {
          .arrow { animation: none; opacity: 1; stroke-dashoffset: 0; }
        }
      `}</style>
      <rect className='node' x='60' y='16' width='200' height='34' rx='14' />
      <text className='label' x='92' y='38'>Ogólna reguła</text>
      <rect className='node' x='90' y='64' width='140' height='30' rx='12' />
      <text className='label' x='128' y='84'>Fakt</text>
      <rect className='node' x='70' y='106' width='180' height='32' rx='12' />
      <text className='label' x='108' y='126'>Wniosek</text>
      <line className='arrow' x1='160' y1='50' x2='160' y2='64' />
      <line className='arrow' x1='160' y1='94' x2='160' y2='106' />
    </svg>
  );
}

export function InductionGatherAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja indukcji: wiele obserwacji prowadzi do reguly.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 150'
    >
      <style>{`
        .dot { fill: #60a5fa; opacity: 0.35; animation: gather 4.8s ease-in-out infinite; }
        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.4s; }
        .dot-3 { animation-delay: 0.8s; }
        .dot-4 { animation-delay: 1.2s; }
        .dot-5 { animation-delay: 1.6s; }
        .rule {
          fill: #bbf7d0;
          stroke: #22c55e;
          stroke-width: 2;
          animation: rulePulse 4.8s ease-in-out infinite;
        }
        .label { font: 700 11px/1 system-ui, sans-serif; fill: #15803d; }
        @keyframes gather {
          0%, 25% { opacity: 0.25; transform: translateY(12px); }
          50%, 80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0.25; transform: translateY(12px); }
        }
        @keyframes rulePulse {
          0%, 35% { opacity: 0.35; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dot, .rule { animation: none; opacity: 1; transform: none; }
        }
      `}</style>
      <circle className='rule' cx='160' cy='40' r='24' />
      <text className='label' x='144' y='44'>Reguła</text>
      <circle className='dot dot-1' cx='70' cy='110' r='8' />
      <circle className='dot dot-2' cx='110' cy='110' r='8' />
      <circle className='dot dot-3' cx='150' cy='110' r='8' />
      <circle className='dot dot-4' cx='190' cy='110' r='8' />
      <circle className='dot dot-5' cx='230' cy='110' r='8' />
      <line x1='70' y1='96' x2='140' y2='58' stroke='#bfdbfe' strokeWidth='2' />
      <line x1='110' y1='96' x2='148' y2='58' stroke='#bfdbfe' strokeWidth='2' />
      <line x1='150' y1='96' x2='156' y2='58' stroke='#bfdbfe' strokeWidth='2' />
      <line x1='190' y1='96' x2='164' y2='58' stroke='#bfdbfe' strokeWidth='2' />
      <line x1='230' y1='96' x2='172' y2='58' stroke='#bfdbfe' strokeWidth='2' />
    </svg>
  );
}

export function IfThenArrowAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja warunku logicznego: jeśli P, to Q.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .node { fill: #e0e7ff; stroke: #6366f1; stroke-width: 2; }
        .label { font: 700 12px/1 system-ui, sans-serif; fill: #4338ca; }
        .arrow { stroke: #6366f1; stroke-width: 3; stroke-linecap: round; animation: blink 4s ease-in-out infinite; }
        @keyframes blink {
          0%, 35% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .arrow { animation: none; opacity: 1; }
        }
      `}</style>
      <circle className='node' cx='70' cy='60' r='24' />
      <text className='label' x='63' y='64'>P</text>
      <circle className='node' cx='250' cy='60' r='24' />
      <text className='label' x='243' y='64'>Q</text>
      <line className='arrow' x1='96' y1='60' x2='224' y2='60' />
      <polygon points='224,54 238,60 224,66' fill='#6366f1' />
      <text className='label' x='58' y='24'>Jeśli</text>
      <text className='label' x='234' y='24'>to</text>
    </svg>
  );
}

export function QuantifierScopeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja kwantyfikatorow: wszyscy, niektorzy, zaden.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .dot { fill: #94a3b8; }
        .scope-all, .scope-some, .scope-none {
          animation: scopePulse 6s ease-in-out infinite;
          opacity: 0;
        }
        .scope-all { animation-delay: 0s; }
        .scope-some { animation-delay: 2s; }
        .scope-none { animation-delay: 4s; }
        .label { font: 700 10px/1 system-ui, sans-serif; fill: #475569; }
        @keyframes scopePulse {
          0%, 20% { opacity: 0; }
          35%, 65% { opacity: 1; }
          100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .scope-all, .scope-some, .scope-none { animation: none; opacity: 1; }
        }
      `}</style>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <circle key={`dot-${index}`} className='dot' cx={70 + index * 32} cy='60' r='8' />
      ))}
      <rect className='scope-all' x='52' y='44' width='212' height='32' rx='16' fill='rgba(16,185,129,0.18)' />
      <rect className='scope-some' x='116' y='44' width='84' height='32' rx='16' fill='rgba(245,158,11,0.22)' />
      <line className='scope-none' x1='52' y1='44' x2='264' y2='76' stroke='#f43f5e' strokeWidth='3' />
      <line className='scope-none' x1='264' y1='44' x2='52' y2='76' stroke='#f43f5e' strokeWidth='3' />
      <text className='label' x='60' y='24'>Wszyscy</text>
      <text className='label' x='136' y='24'>Niektórzy</text>
      <text className='label' x='226' y='24'>Żaden</text>
    </svg>
  );
}

export function EliminationGridAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja eliminacji: odrzucaj niemozliwe opcje.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .cell { fill: #f8fafc; stroke: #cbd5f5; stroke-width: 2; }
        .x {
          stroke: #f43f5e;
          stroke-width: 3;
          stroke-linecap: round;
          opacity: 0;
          animation: xPulse 5s ease-in-out infinite;
        }
        .x-1 { animation-delay: 0s; }
        .x-2 { animation-delay: 0.7s; }
        .x-3 { animation-delay: 1.4s; }
        .x-4 { animation-delay: 2.1s; }
        .keep {
          fill: #bbf7d0;
          stroke: #22c55e;
          stroke-width: 2;
          animation: keepGlow 5s ease-in-out infinite;
        }
        @keyframes xPulse {
          0%, 30% { opacity: 0; }
          45%, 70% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes keepGlow {
          0%, 40% { opacity: 0.35; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .x { animation: none; opacity: 1; }
          .keep { animation: none; opacity: 1; }
        }
      `}</style>
      {[0, 1, 2].map((row) =>
        [0, 1, 2].map((col) => (
          <rect
            key={`cell-${row}-${col}`}
            className='cell'
            x={60 + col * 60}
            y={24 + row * 36}
            width='48'
            height='28'
            rx='8'
          />
        ))
      )}
      <rect className='keep' x='180' y='60' width='48' height='28' rx='8' />
      <line className='x x-1' x1='66' y1='30' x2='102' y2='46' />
      <line className='x x-1' x1='102' y1='30' x2='66' y2='46' />
      <line className='x x-2' x1='126' y1='66' x2='162' y2='82' />
      <line className='x x-2' x1='162' y1='66' x2='126' y2='82' />
      <line className='x x-3' x1='186' y1='102' x2='222' y2='118' />
      <line className='x x-3' x1='222' y1='102' x2='186' y2='118' />
      <line className='x x-4' x1='246' y1='30' x2='282' y2='46' />
      <line className='x x-4' x1='282' y1='30' x2='246' y2='46' />
    </svg>
  );
}
