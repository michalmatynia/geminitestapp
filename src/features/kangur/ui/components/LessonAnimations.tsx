export function AddingSvgAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dodawania: 2 kropki plus 3 kropki daje 5 kropek.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 120'
    >
      <style>{`
        .dot-a { fill: #f59e0b; }
        .dot-b { fill: #60a5fa; }
        .dot-sum { fill: #34d399; }
        .group-a, .group-b, .sum-group {
          transform-box: fill-box;
          transform-origin: center;
        }
        .group-a { animation: moveA 6s ease-in-out infinite; }
        .group-b { animation: moveB 6s ease-in-out infinite; }
        .sum-group { animation: sumReveal 6s ease-in-out infinite; }
        @keyframes moveA {
          0%, 20% { transform: translateX(0); opacity: 1; }
          45% { transform: translateX(120px); opacity: 1; }
          60% { transform: translateX(150px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes moveB {
          0%, 30% { transform: translateX(0); opacity: 1; }
          55% { transform: translateX(120px); opacity: 1; }
          70% { transform: translateX(150px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes sumReveal {
          0%, 45% { opacity: 0; transform: scale(0.9); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-a, .group-b, .sum-group { animation: none; }
        }
      `}</style>
      <rect
        fill='none'
        height='46'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='170'
        x='240'
        y='37'
      />
      <g className='group-a'>
        <circle className='dot-a' cx='50' cy='40' r='9' />
        <circle className='dot-a' cx='80' cy='40' r='9' />
      </g>
      <g className='group-b'>
        <circle className='dot-b' cx='50' cy='80' r='9' />
        <circle className='dot-b' cx='80' cy='80' r='9' />
        <circle className='dot-b' cx='110' cy='80' r='9' />
      </g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='5'>
        <line x1='155' x2='185' y1='60' y2='60' />
        <line x1='170' x2='170' y1='45' y2='75' />
        <line x1='210' x2='240' y1='52' y2='52' />
        <line x1='210' x2='240' y1='68' y2='68' />
      </g>
      <g className='sum-group'>
        <circle className='dot-sum' cx='270' cy='60' r='9' />
        <circle className='dot-sum' cx='300' cy='60' r='9' />
        <circle className='dot-sum' cx='330' cy='60' r='9' />
        <circle className='dot-sum' cx='360' cy='60' r='9' />
        <circle className='dot-sum' cx='390' cy='60' r='9' />
      </g>
    </svg>
  );
}

export function AddingCrossTenSvgAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dodawania przez 10: 7 plus 5 dzieli się na 3 i 2, aby dojść do 12.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .dot-base { fill: #f59e0b; }
        .dot-fill { fill: #60a5fa; }
        .dot-rest { fill: #34d399; }
        .row-a, .row-b, .row-c {
          transform-box: fill-box;
          transform-origin: center;
        }
        .row-b { animation: fillTen 7s ease-in-out infinite; }
        .row-c { animation: restMove 7s ease-in-out infinite; }
        .label-ten { animation: tenGlow 7s ease-in-out infinite; }
        @keyframes fillTen {
          0%, 20% { transform: translateX(0); opacity: 1; }
          45% { transform: translateX(120px); opacity: 1; }
          60% { transform: translateX(140px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes restMove {
          0%, 45% { transform: translateX(0); opacity: 0.25; }
          65% { transform: translateX(120px); opacity: 1; }
          80% { transform: translateX(140px); opacity: 1; }
          100% { transform: translateX(0); opacity: 0.25; }
        }
        @keyframes tenGlow {
          0%, 35% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .row-b, .row-c, .label-ten { animation: none; }
        }
      `}</style>
      <rect
        fill='none'
        height='56'
        rx='14'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='210'
        x='190'
        y='40'
      />
      <g className='row-a'>
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <circle
            key={`base-${index}`}
            className='dot-base'
            cx={30 + index * 22}
            cy='50'
            r='8'
          />
        ))}
      </g>
      <g className='row-b'>
        {[0, 1, 2].map((index) => (
          <circle
            key={`fill-${index}`}
            className='dot-fill'
            cx={30 + index * 22}
            cy='90'
            r='8'
          />
        ))}
      </g>
      <g className='row-c'>
        {[0, 1].map((index) => (
          <circle
            key={`rest-${index}`}
            className='dot-rest'
            cx={100 + index * 22}
            cy='90'
            r='8'
          />
        ))}
      </g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='5'>
        <line x1='165' x2='190' y1='70' y2='70' />
        <line x1='165' x2='190' y1='90' y2='90' />
      </g>
      <text className='label-ten' fill='#0f172a' fontSize='14' fontWeight='600' x='230' y='32'>
        10
      </text>
      <g>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
          <circle
            key={`ten-${index}`}
            className='dot-base'
            cx={210 + index * 18}
            cy='68'
            r='7'
          />
        ))}
        {[0, 1].map((index) => (
          <circle
            key={`ten-rest-${index}`}
            className='dot-rest'
            cx={210 + (10 + index) * 18}
            cy='68'
            r='7'
          />
        ))}
      </g>
    </svg>
  );
}

export function AddingNumberLineAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja na osi liczbowej: 8 plus 5 jako skok do 10 i dalej.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 120'
    >
      <style>{`
        .line-base { stroke: #cbd5f5; }
        .tick { stroke: #94a3b8; }
        .jump-one { stroke: #60a5fa; }
        .jump-two { stroke: #34d399; }
        .marker {
          fill: #f59e0b;
          animation: markerMove 7s ease-in-out infinite;
        }
        .label-ten { animation: tenPulse 7s ease-in-out infinite; }
        @keyframes markerMove {
          0%, 20% { transform: translateX(0); }
          45% { transform: translateX(80px); }
          65% { transform: translateX(140px); }
          100% { transform: translateX(0); }
        }
        @keyframes tenPulse {
          0%, 35% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .marker, .label-ten { animation: none; }
        }
      `}</style>
      <line className='line-base' strokeWidth='6' x1='40' x2='380' y1='70' y2='70' />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
        <line
          key={`tick-${index}`}
          className='tick'
          strokeWidth='3'
          x1={60 + index * 40}
          x2={60 + index * 40}
          y1='62'
          y2='78'
        />
      ))}
      <text fill='#475569' fontSize='12' x='52' y='95'>
        8
      </text>
      <text className='label-ten' fill='#0f172a' fontSize='12' fontWeight='600' x='132' y='95'>
        10
      </text>
      <text fill='#475569' fontSize='12' x='212' y='95'>
        12
      </text>
      <text fill='#475569' fontSize='12' x='292' y='95'>
        14
      </text>
      <path className='jump-one' d='M80 60 Q120 20 160 60' fill='none' strokeWidth='4' />
      <path className='jump-two' d='M160 60 Q220 20 280 60' fill='none' strokeWidth='4' />
      <circle className='marker' cx='80' cy='70' r='8' />
    </svg>
  );
}

export function AddingTenFrameAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja ramki dziesiątki: wypełnianie do 10 i dodanie reszty.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .frame { stroke: #e2e8f0; }
        .cell { fill: #f1f5f9; }
        .fill-a { fill: #f59e0b; }
        .fill-b { fill: #60a5fa; animation: fillFrame 6s ease-in-out infinite; }
        .fill-rest { fill: #34d399; animation: restPop 6s ease-in-out infinite; }
        @keyframes fillFrame {
          0%, 25% { opacity: 0; }
          45%, 100% { opacity: 1; }
        }
        @keyframes restPop {
          0%, 45% { opacity: 0; transform: scale(0.8); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fill-b, .fill-rest { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='frame' fill='none' height='80' rx='14' strokeWidth='2' width='220' x='30' y='30' />
      {[0, 1].map((row) =>
        [0, 1, 2, 3, 4].map((col) => (
          <rect
            key={`cell-${row}-${col}`}
            className='cell'
            height='24'
            width='24'
            x={50 + col * 38}
            y={45 + row * 34}
          />
        ))
      )}
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <circle
          key={`base-dot-${index}`}
          className='fill-a'
          cx={62 + (index % 5) * 38}
          cy={57 + Math.floor(index / 5) * 34}
          r='10'
        />
      ))}
      {[0, 1, 2].map((index) => (
        <circle
          key={`fill-dot-${index}`}
          className='fill-b'
          cx={62 + ((7 + index) % 5) * 38}
          cy={57 + Math.floor((7 + index) / 5) * 34}
          r='10'
        />
      ))}
      {[0, 1].map((index) => (
        <circle
          key={`rest-dot-${index}`}
          className='fill-rest'
          cx={310 + index * 32}
          cy='70'
          r='10'
        />
      ))}
      <text fill='#475569' fontSize='12' x='290' y='40'>
        +2
      </text>
      <line stroke='#94a3b8' strokeWidth='3' x1='265' x2='295' y1='70' y2='70' />
    </svg>
  );
}

export function AddingTwoDigitAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dodawania dwucyfrowego: dziesiatki i jednosci łączą się w sumę.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 460 180'
    >
      <style>{`
        .tens-a { fill: #f59e0b; }
        .ones-a { fill: #fbbf24; }
        .tens-b { fill: #60a5fa; }
        .ones-b { fill: #93c5fd; }
        .sum-tens { fill: #10b981; }
        .sum-ones { fill: #34d399; }
        .group-a, .group-b, .sum-group {
          transform-box: fill-box;
          transform-origin: center;
        }
        .group-a { animation: moveA 7s ease-in-out infinite; }
        .group-b { animation: moveB 7s ease-in-out infinite; }
        .sum-group { animation: sumReveal 7s ease-in-out infinite; }
        @keyframes moveA {
          0%, 15% { transform: translateX(0); opacity: 1; }
          40% { transform: translateX(190px); opacity: 1; }
          55% { transform: translateX(210px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes moveB {
          0%, 30% { transform: translateX(0); opacity: 1; }
          55% { transform: translateX(190px); opacity: 1; }
          70% { transform: translateX(210px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes sumReveal {
          0%, 45% { opacity: 0; transform: scale(0.98); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-a, .group-b, .sum-group { animation: none; }
        }
      `}</style>
      <rect
        fill='none'
        height='130'
        rx='16'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='190'
        x='250'
        y='24'
      />
      <g className='group-a'>
        {[0, 1].map((index) => (
          <rect
            key={`a-ten-${index}`}
            className='tens-a'
            height='16'
            rx='7'
            width='34'
            x={30 + index * 42}
            y='32'
          />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <circle
            key={`a-one-${index}`}
            className='ones-a'
            cx={32 + index * 22}
            cy='70'
            r='7'
          />
        ))}
      </g>
      <g className='group-b'>
        <rect className='tens-b' height='16' rx='7' width='34' x='30' y='112' />
        {[0, 1, 2].map((index) => (
          <circle
            key={`b-one-${index}`}
            className='ones-b'
            cx={32 + index * 22}
            cy='150'
            r='7'
          />
        ))}
      </g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='5'>
        <line x1='155' x2='185' y1='88' y2='88' />
        <line x1='170' x2='170' y1='74' y2='102' />
        <line x1='205' x2='235' y1='88' y2='88' />
      </g>
      <g className='sum-group'>
        {[0, 1, 2].map((index) => (
          <rect
            key={`sum-ten-${index}`}
            className='sum-tens'
            height='16'
            rx='7'
            width='34'
            x={270 + index * 42}
            y='56'
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <circle
            key={`sum-one-${index}`}
            className='sum-ones'
            cx={272 + index * 22}
            cy='114'
            r='7'
          />
        ))}
      </g>
    </svg>
  );
}

export function AddingCommutativeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: 3 plus 5 to to samo co 5 plus 3.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .eq-one { animation: showFirst 6s ease-in-out infinite; }
        .eq-two { animation: showSecond 6s ease-in-out infinite; }
        @keyframes showFirst {
          0%, 45% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes showSecond {
          0%, 45% { opacity: 0; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .eq-one { opacity: 1; animation: none; }
          .eq-two { opacity: 1; animation: none; }
        }
      `}</style>
      <text
        className='eq-one'
        fill='#0f172a'
        fontSize='20'
        fontWeight='600'
        textAnchor='middle'
        x='160'
        y='50'
      >
        3 + 5 = 8
      </text>
      <text
        className='eq-two'
        fill='#0f172a'
        fontSize='20'
        fontWeight='600'
        textAnchor='middle'
        x='160'
        y='80'
      >
        5 + 3 = 8
      </text>
      <path
        d='M90 95 C120 105 200 105 230 95'
        fill='none'
        stroke='#cbd5f5'
        strokeLinecap='round'
        strokeWidth='4'
      />
    </svg>
  );
}

export function AddingZeroAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: dodawanie zera nie zmienia wyniku.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .dot { fill: #f59e0b; }
        .zero {
          fill: none;
          stroke: #94a3b8;
          stroke-width: 4;
          transform-box: fill-box;
          transform-origin: center;
          animation: zeroPulse 4s ease-in-out infinite;
        }
        .sum { fill: #34d399; }
        @keyframes zeroPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .zero { animation: none; opacity: 1; }
        }
      `}</style>
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <circle key={`left-${index}`} className='dot' cx={30 + index * 16} cy='55' r='6' />
      ))}
      <text fill='#64748b' fontSize='18' fontWeight='600' x='150' y='60'>
        +
      </text>
      <circle className='zero' cx='180' cy='54' r='10' />
      <text fill='#64748b' fontSize='18' fontWeight='600' x='205' y='60'>
        =
      </text>
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <circle key={`sum-${index}`} className='sum' cx={230 + index * 14} cy='55' r='6' />
      ))}
    </svg>
  );
}

export function AddingMakeTenPairsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: szukaj par do 10, na przykład 6 i 4.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .slot { fill: #e2e8f0; }
        .dot-a { fill: #f59e0b; }
        .dot-b { fill: #60a5fa; }
        .fill-b {
          transform-box: fill-box;
          transform-origin: center;
          animation: fillTen 5.5s ease-in-out infinite;
        }
        .ten-label { animation: tenGlow 5.5s ease-in-out infinite; }
        @keyframes fillTen {
          0%, 25% { transform: translateX(60px); opacity: 0; }
          45% { transform: translateX(20px); opacity: 1; }
          60%, 100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes tenGlow {
          0%, 35% { opacity: 0.35; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .fill-b, .ten-label { animation: none; opacity: 1; }
        }
      `}</style>
      <g>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
          <circle key={`slot-${index}`} className='slot' cx={40 + index * 24} cy='60' r='9' />
        ))}
      </g>
      <g>
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <circle key={`base-${index}`} className='dot-a' cx={40 + index * 24} cy='60' r='9' />
        ))}
      </g>
      <g className='fill-b'>
        {[0, 1, 2, 3].map((index) => (
          <circle
            key={`fill-${index}`}
            className='dot-b'
            cx={40 + (6 + index) * 24}
            cy='60'
            r='9'
          />
        ))}
      </g>
      <text className='ten-label' fill='#0f172a' fontSize='14' fontWeight='600' x='140' y='30'>
        6 + 4 = 10
      </text>
    </svg>
  );
}

export function AddingColumnAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dodawania w kolumnach: dziesiatki i jednosci sumuja się osobno.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 440 190'
    >
      <style>{`
        .col-bg { fill: #f8fafc; }
        .col-stroke { stroke: #e2e8f0; }
        .digit-a { fill: #f59e0b; }
        .digit-b { fill: #60a5fa; }
        .digit-sum { fill: #10b981; }
        .carry { fill: #f97316; }
        .move-a, .move-b, .sum { transform-box: fill-box; transform-origin: center; }
        .move-a { animation: colMoveA 7s ease-in-out infinite; }
        .move-b { animation: colMoveB 7s ease-in-out infinite; }
        .sum { animation: colSum 7s ease-in-out infinite; }
        .carry { animation: colCarry 7s ease-in-out infinite; }
        @keyframes colMoveA {
          0%, 20% { transform: translateY(0); opacity: 1; }
          45% { transform: translateY(22px); opacity: 1; }
          60% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes colMoveB {
          0%, 30% { transform: translateY(0); opacity: 1; }
          55% { transform: translateY(22px); opacity: 1; }
          70% { transform: translateY(30px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes colSum {
          0%, 45% { opacity: 0; transform: scale(0.98); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @keyframes colCarry {
          0%, 50% { opacity: 0; transform: translateY(6px); }
          65%, 100% { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .move-a, .move-b, .sum, .carry { animation: none; }
        }
      `}</style>
      <rect className='col-bg' height='150' rx='18' width='260' x='30' y='20' />
      <rect className='col-bg' height='150' rx='18' width='120' x='300' y='20' />
      <rect className='col-stroke' fill='none' height='150' rx='18' width='260' x='30' y='20' />
      <rect className='col-stroke' fill='none' height='150' rx='18' width='120' x='300' y='20' />
      <line className='col-stroke' strokeWidth='2' x1='160' x2='160' y1='32' y2='158' />
      <line className='col-stroke' strokeWidth='2' x1='300' x2='420' y1='108' y2='108' />
      <text fill='#475569' fontSize='12' fontWeight='600' x='84' y='44'>Dziesiatki</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='188' y='44'>Jednosci</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='326' y='44'>Suma</text>

      <g className='move-a'>
        <rect className='digit-a' height='22' rx='6' width='52' x='70' y='58' />
        <rect className='digit-a' height='22' rx='6' width='52' x='180' y='58' />
      </g>
      <g className='move-b'>
        <rect className='digit-b' height='22' rx='6' width='52' x='70' y='92' />
        <rect className='digit-b' height='22' rx='6' width='52' x='180' y='92' />
      </g>
      <text fill='#0f172a' fontSize='12' fontWeight='600' x='86' y='74'>20</text>
      <text fill='#0f172a' fontSize='12' fontWeight='600' x='196' y='74'>4</text>
      <text fill='#0f172a' fontSize='12' fontWeight='600' x='86' y='108'>10</text>
      <text fill='#0f172a' fontSize='12' fontWeight='600' x='196' y='108'>3</text>

      <text className='carry' fontSize='12' fontWeight='700' x='210' y='60'>+1</text>
      <g className='sum'>
        <rect className='digit-sum' height='26' rx='7' width='64' x='320' y='118' />
        <text fill='#0f172a' fontSize='13' fontWeight='700' x='340' y='136'>37</text>
      </g>
    </svg>
  );
}

export function AddingAbacusAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja liczydla: przesuwanie koralikow dla dziesiatek i jednosci.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 440 190'
    >
      <style>{`
        .frame { stroke: #e2e8f0; }
        .rod { stroke: #cbd5f5; }
        .bead-a { fill: #f59e0b; }
        .bead-b { fill: #60a5fa; }
        .sum-bead { fill: #34d399; }
        .row-a, .row-b, .row-sum {
          transform-box: fill-box;
          transform-origin: center;
        }
        .row-a { animation: abacusMoveA 7s ease-in-out infinite; }
        .row-b { animation: abacusMoveB 7s ease-in-out infinite; }
        .row-sum { animation: abacusSum 7s ease-in-out infinite; }
        @keyframes abacusMoveA {
          0%, 20% { transform: translateX(0); opacity: 1; }
          45% { transform: translateX(120px); opacity: 1; }
          60% { transform: translateX(140px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes abacusMoveB {
          0%, 30% { transform: translateX(0); opacity: 1; }
          55% { transform: translateX(120px); opacity: 1; }
          70% { transform: translateX(140px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes abacusSum {
          0%, 45% { opacity: 0; transform: scale(0.98); }
          60%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .row-a, .row-b, .row-sum { animation: none; }
        }
      `}</style>
      <rect className='frame' fill='none' height='140' rx='18' strokeWidth='2' width='380' x='30' y='24' />
      {[0, 1, 2].map((row) => (
        <line
          key={`rod-${row}`}
          className='rod'
          strokeWidth='6'
          x1='60'
          x2='380'
          y1={60 + row * 40}
          y2={60 + row * 40}
        />
      ))}
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='44'>Dziesiatki</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='84'>Jednosci</text>
      <text fill='#475569' fontSize='12' fontWeight='600' x='36' y='124'>Suma</text>

      <g className='row-a'>
        {[0, 1].map((index) => (
          <circle
            key={`tens-a-${index}`}
            className='bead-a'
            cx={90 + index * 28}
            cy='60'
            r='10'
          />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <circle
            key={`ones-a-${index}`}
            className='bead-a'
            cx={90 + index * 24}
            cy='100'
            r='9'
          />
        ))}
      </g>
      <g className='row-b'>
        <circle className='bead-b' cx='90' cy='60' r='10' />
        {[0, 1, 2].map((index) => (
          <circle
            key={`ones-b-${index}`}
            className='bead-b'
            cx={90 + index * 24}
            cy='100'
            r='9'
          />
        ))}
      </g>
      <g className='row-sum'>
        {[0, 1, 2].map((index) => (
          <circle
            key={`tens-sum-${index}`}
            className='sum-bead'
            cx={210 + index * 26}
            cy='60'
            r='10'
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <circle
            key={`ones-sum-${index}`}
            className='sum-bead'
            cx={210 + index * 22}
            cy='100'
            r='9'
          />
        ))}
      </g>
    </svg>
  );
}

export function AddingAssociativeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: grupowanie liczb nie zmienia sumy.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .chip { fill: #e2e8f0; }
        .group-a { animation: groupA 6s ease-in-out infinite; }
        .group-b { animation: groupB 6s ease-in-out infinite; }
        .bracket-a { stroke: #60a5fa; animation: bracketA 6s ease-in-out infinite; }
        .bracket-b { stroke: #34d399; animation: bracketB 6s ease-in-out infinite; }
        @keyframes groupA {
          0%, 40% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes groupB {
          0%, 40% { opacity: 0; }
          55%, 100% { opacity: 1; }
        }
        @keyframes bracketA {
          0%, 40% { opacity: 1; }
          55%, 100% { opacity: 0; }
        }
        @keyframes bracketB {
          0%, 40% { opacity: 0; }
          55%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group-a, .group-b, .bracket-a, .bracket-b { animation: none; opacity: 1; }
        }
      `}</style>
      <g>
        {[0, 1, 2].map((index) => (
          <rect key={`chip-${index}`} className='chip' height='26' rx='8' width='40' x={40 + index * 46} y='50' />
        ))}
      </g>
      <text fill='#0f172a' fontSize='14' fontWeight='600' x='54' y='68'>
        2
      </text>
      <text fill='#0f172a' fontSize='14' fontWeight='600' x='100' y='68'>
        3
      </text>
      <text fill='#0f172a' fontSize='14' fontWeight='600' x='146' y='68'>
        4
      </text>
      <text fill='#64748b' fontSize='16' fontWeight='600' x='200' y='68'>
        =
      </text>
      <text fill='#0f172a' fontSize='16' fontWeight='700' x='230' y='68'>
        9
      </text>
      <g className='group-a'>
        <path className='bracket-a' d='M38 42 V84 M38 42 H86 M38 84 H86' fill='none' strokeWidth='3' />
        <text fill='#60a5fa' fontSize='12' fontWeight='600' x='52' y='38'>
          (2+3)
        </text>
      </g>
      <g className='group-b'>
        <path className='bracket-b' d='M84 42 V84 M84 42 H132 M84 84 H132' fill='none' strokeWidth='3' />
        <text fill='#34d399' fontSize='12' fontWeight='600' x='96' y='38'>
          (3+4)
        </text>
      </g>
    </svg>
  );
}

export function AddingDoublesAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: podwojenia pomagają w szybkim dodawaniu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .dot { fill: #f59e0b; }
        .dot-right { fill: #60a5fa; }
        .sum { fill: #34d399; animation: sumReveal 5.5s ease-in-out infinite; }
        .mirror { stroke: #cbd5f5; stroke-dasharray: 4 6; }
        @keyframes sumReveal {
          0%, 35% { opacity: 0; transform: scale(0.9); }
          55%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sum { animation: none; opacity: 1; }
        }
      `}</style>
      <line className='mirror' strokeWidth='2' x1='160' x2='160' y1='25' y2='95' />
      {[0, 1, 2, 3, 4].map((index) => (
        <circle key={`left-${index}`} className='dot' cx='80' cy={32 + index * 16} r='6' />
      ))}
      {[0, 1, 2, 3, 4].map((index) => (
        <circle key={`right-${index}`} className='dot-right' cx='240' cy={32 + index * 16} r='6' />
      ))}
      <text fill='#64748b' fontSize='16' fontWeight='600' x='140' y='62'>
        =
      </text>
      <g className='sum'>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
          <circle key={`sum-${index}`} className='sum' cx={120 + (index % 5) * 16} cy={30 + Math.floor(index / 5) * 22} r='5' />
        ))}
      </g>
    </svg>
  );
}

export function AddingCountOnAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: licz w górę od większej liczby.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .step {
          fill: #e2e8f0;
          animation: stepPulse 3.6s ease-in-out infinite;
        }
        @keyframes stepPulse {
          0%, 100% { fill: #e2e8f0; }
          50% { fill: #34d399; }
        }
        @media (prefers-reduced-motion: reduce) {
          .step { animation: none; fill: #34d399; }
        }
      `}</style>
      <path
        d='M55 90 L105 80 L155 70 L205 60'
        fill='none'
        stroke='#cbd5f5'
        strokeLinecap='round'
        strokeWidth='4'
      />
      {[4, 5, 6, 7].map((value, index) => (
        <g key={`step-${value}`}>
          <circle
            className='step'
            cx={60 + index * 50}
            cy={90 - index * 10}
            r='14'
            style={{ animationDelay: `${index * 0.6}s` }}
          />
          <text
            fill='#0f172a'
            fontSize='12'
            fontWeight='600'
            textAnchor='middle'
            x={60 + index * 50}
            y={94 - index * 10}
          >
            {value}
          </text>
        </g>
      ))}
      <text fill='#64748b' fontSize='12' fontWeight='600' x='30' y='108'>
        start
      </text>
      <text fill='#64748b' fontSize='12' fontWeight='600' x='212' y='52'>
        +3
      </text>
    </svg>
  );
}

export function AddingTensOnesAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: dziesiątki i jedności łączą się osobno.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 340 150'
    >
      <style>{`
        .ten-a { fill: #f59e0b; }
        .one-a { fill: #fbbf24; }
        .ten-b { fill: #60a5fa; }
        .one-b { fill: #93c5fd; }
        .addend-b {
          transform-box: fill-box;
          transform-origin: center;
          animation: moveAddend 6s ease-in-out infinite;
        }
        .sum {
          fill: #34d399;
          animation: sumReveal 6s ease-in-out infinite;
        }
        @keyframes moveAddend {
          0%, 25% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(40px); opacity: 1; }
          65% { opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes sumReveal {
          0%, 45% { opacity: 0; }
          65%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .addend-b, .sum { animation: none; opacity: 1; }
        }
      `}</style>
      <text fill='#64748b' fontSize='11' fontWeight='600' x='20' y='20'>
        10
      </text>
      <text fill='#64748b' fontSize='11' fontWeight='600' x='110' y='20'>
        1
      </text>
      <g>
        <rect className='ten-a' height='40' rx='4' width='12' x='30' y='30' />
        <rect className='ten-a' height='40' rx='4' width='12' x='48' y='30' />
        {[0, 1, 2, 3].map((index) => (
          <circle key={`one-a-${index}`} className='one-a' cx={120 + index * 16} cy='50' r='6' />
        ))}
      </g>
      <g className='addend-b'>
        <rect className='ten-b' height='40' rx='4' width='12' x='30' y='80' />
        {[0, 1, 2].map((index) => (
          <circle key={`one-b-${index}`} className='one-b' cx={120 + index * 16} cy='100' r='6' />
        ))}
      </g>
      <text fill='#64748b' fontSize='16' fontWeight='600' x='80' y='92'>
        +
      </text>
      <line stroke='#e2e8f0' strokeWidth='2' x1='20' x2='190' y1='120' y2='120' />
      <g className='sum'>
        {[0, 1, 2].map((index) => (
          <rect
            key={`ten-sum-${index}`}
            className='sum'
            height='38'
            rx='4'
            width='12'
            x={30 + index * 18}
            y='106'
          />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((index) => (
          <circle key={`one-sum-${index}`} className='sum' cx={120 + index * 14} cy='125' r='5' />
        ))}
      </g>
    </svg>
  );
}

export function DivisionEqualGroupsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dzielenia: 12 kropek podzielone na 3 równe grupy.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .dot { fill: #38bdf8; }
        .box {
          fill: none;
          stroke: #e2e8f0;
          stroke-dasharray: 6 6;
        }
        .group {
          animation: groupPulse 4.8s ease-in-out infinite;
        }
        .group-2 { animation-delay: 1.6s; }
        .group-3 { animation-delay: 3.2s; }
        @keyframes groupPulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .group { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='box' height='86' rx='12' width='110' x='30' y='26' />
      <rect className='box' height='86' rx='12' width='110' x='155' y='26' />
      <rect className='box' height='86' rx='12' width='110' x='280' y='26' />
      {[0, 1, 2].map((group) => (
        <g key={`group-${group}`} className={`group group-${group + 1}`}>
          {[0, 1, 2, 3].map((index) => (
            <circle
              key={`dot-${group}-${index}`}
              className='dot'
              cx={55 + group * 125 + (index % 2) * 30}
              cy={50 + Math.floor(index / 2) * 30}
              r='8'
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

export function DivisionInverseAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: mnożenie i dzielenie są odwrotne.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .dot { fill: #22c55e; }
        .row { animation: rowPulse 3.8s ease-in-out infinite; }
        .row-2 { animation-delay: 1.2s; }
        .row-3 { animation-delay: 2.4s; }
        @keyframes rowPulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .row { animation: none; opacity: 1; }
        }
      `}</style>
      <rect
        fill='none'
        height='86'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='170'
        x='30'
        y='26'
      />
      {[0, 1, 2].map((row) => (
        <g key={`row-${row}`} className={`row row-${row + 1}`}>
          {[0, 1, 2, 3].map((col) => (
            <circle
              key={`row-${row}-col-${col}`}
              className='dot'
              cx={55 + col * 30}
              cy={45 + row * 24}
              r='7'
            />
          ))}
        </g>
      ))}
      <g fill='#64748b' fontSize='12' fontWeight='600'>
        <text x='220' y='55'>12 ÷ 3 = 4</text>
        <text x='220' y='80'>4 × 3 = 12</text>
      </g>
    </svg>
  );
}

export function DivisionRemainderAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja dzielenia z resztą: 7 podzielone na 2 daje 3 reszta 1.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .dot { fill: #14b8a6; }
        .leftover {
          fill: #f97316;
          animation: leftoverPulse 3.6s ease-in-out infinite;
        }
        @keyframes leftoverPulse {
          0%, 100% { opacity: 0.4; transform: scale(0.95); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .leftover { animation: none; opacity: 1; }
        }
      `}</style>
      <rect
        fill='none'
        height='70'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='200'
        x='20'
        y='20'
      />
      {[0, 1, 2].map((group) => (
        <g key={`pair-${group}`}>
          <circle className='dot' cx={45 + group * 55} cy='45' r='7' />
          <circle className='dot' cx={45 + group * 55} cy='70' r='7' />
        </g>
      ))}
      <circle className='leftover' cx='190' cy='45' r='7' />
      <text fill='#64748b' fontSize='12' fontWeight='600' x='235' y='55'>
        reszta 1
      </text>
    </svg>
  );
}

export function MultiplicationGroupsAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja mnożenia: 3 grupy po 4 tworzą 12.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 420 140'
    >
      <style>{`
        .group-a { fill: #f59e0b; }
        .group-b { fill: #60a5fa; }
        .group-c { fill: #34d399; }
        .array-dot { fill: #a855f7; }
        .left-groups { animation: groupsFade 6s ease-in-out infinite; }
        .array { animation: arrayReveal 6s ease-in-out infinite; }
        @keyframes groupsFade {
          0%, 45% { opacity: 1; }
          65%, 100% { opacity: 0.35; }
        }
        @keyframes arrayReveal {
          0%, 45% { opacity: 0; transform: scale(0.98); }
          65%, 100% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .left-groups, .array { animation: none; opacity: 1; }
        }
      `}</style>
      <g className='left-groups'>
        {[0, 1, 2, 3].map((index) => (
          <circle key={`a-${index}`} className='group-a' cx={40 + index * 18} cy='30' r='7' />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <circle key={`b-${index}`} className='group-b' cx={40 + index * 18} cy='70' r='7' />
        ))}
        {[0, 1, 2, 3].map((index) => (
          <circle key={`c-${index}`} className='group-c' cx={40 + index * 18} cy='110' r='7' />
        ))}
      </g>
      <g fill='none' stroke='#94a3b8' strokeLinecap='round' strokeWidth='4'>
        <line x1='140' x2='190' y1='70' y2='70' />
        <polyline points='178,58 192,70 178,82' />
      </g>
      <rect
        fill='none'
        height='96'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='150'
        x='230'
        y='22'
      />
      <g className='array'>
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle
              key={`array-${row}-${col}`}
              className='array-dot'
              cx={250 + col * 30}
              cy={40 + row * 30}
              r='7'
            />
          ))
        )}
      </g>
    </svg>
  );
}

export function MultiplicationArrayAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja mnożenia: rzędy w tablicy pokazują kolejne sumy.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 140'
    >
      <style>{`
        .row {
          animation: rowPulse 3.6s ease-in-out infinite;
        }
        .row-2 { animation-delay: 1.2s; }
        .row-3 { animation-delay: 2.4s; }
        .dot { fill: #a855f7; }
        @keyframes rowPulse {
          0%, 100% { opacity: 0.35; }
          45% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .row { animation: none; opacity: 1; }
        }
      `}</style>
      <rect
        fill='none'
        height='86'
        rx='12'
        stroke='#e2e8f0'
        strokeDasharray='6 6'
        width='190'
        x='40'
        y='26'
      />
      {[0, 1, 2].map((row) => (
        <g key={`row-${row}`} className={`row row-${row + 1}`}>
          {[0, 1, 2, 3].map((col) => (
            <circle
              key={`row-${row}-col-${col}`}
              className='dot'
              cx={70 + col * 40}
              cy={45 + row * 25}
              r='7'
            />
          ))}
          <text
            fill='#64748b'
            fontSize='12'
            fontWeight='600'
            x='245'
            y={49 + row * 25}
          >
            {(row + 1) * 4}
          </text>
        </g>
      ))}
      <text fill='#64748b' fontSize='12' fontWeight='600' x='245' y='34'>
        suma
      </text>
    </svg>
  );
}

export function MultiplicationCommutativeAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: 3×4 to to samo co 4×3.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 140'
    >
      <style>{`
        .array-a { animation: arrayA 6s ease-in-out infinite; }
        .array-b { animation: arrayB 6s ease-in-out infinite; }
        .dot-a { fill: #60a5fa; }
        .dot-b { fill: #f59e0b; }
        @keyframes arrayA {
          0%, 45% { opacity: 1; }
          60%, 100% { opacity: 0; }
        }
        @keyframes arrayB {
          0%, 45% { opacity: 0; }
          60%, 100% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .array-a, .array-b { animation: none; opacity: 1; }
        }
      `}</style>
      <g className='array-a'>
        {[0, 1, 2].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle
              key={`a-${row}-${col}`}
              className='dot-a'
              cx={70 + col * 24}
              cy={35 + row * 24}
              r='6'
            />
          ))
        )}
      </g>
      <g className='array-b'>
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2].map((col) => (
            <circle
              key={`b-${row}-${col}`}
              className='dot-b'
              cx={70 + col * 24}
              cy={35 + row * 24}
              r='6'
            />
          ))
        )}
      </g>
      <text fill='#0f172a' fontSize='14' fontWeight='700' x='170' y='64'>
        3×4 = 4×3
      </text>
    </svg>
  );
}
