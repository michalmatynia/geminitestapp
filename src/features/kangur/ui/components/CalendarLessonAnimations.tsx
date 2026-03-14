export function CalendarDaysStripAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: dni tygodnia podświetlają się po kolei.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 90'
    >
      <style>{`
        .day {
          fill: #e2e8f0;
          animation: dayPulse 3.5s ease-in-out infinite;
        }
        .d2 { animation-delay: 0.5s; }
        .d3 { animation-delay: 1s; }
        .d4 { animation-delay: 1.5s; }
        .d5 { animation-delay: 2s; }
        .d6 { animation-delay: 2.5s; }
        .d7 { animation-delay: 3s; }
        @keyframes dayPulse {
          0%, 100% { fill: #e2e8f0; opacity: 0.6; }
          40% { fill: #34d399; opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .day { animation: none; fill: #34d399; opacity: 1; }
        }
      `}</style>
      {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((label, index) => (
        <g key={label}>
          <rect
            className={`day d${index + 1}`}
            x={12 + index * 48}
            y='24'
            width='42'
            height='36'
            rx='12'
          />
          <text
            fill='#0f172a'
            fontSize='12'
            fontWeight='700'
            textAnchor='middle'
            x={33 + index * 48}
            y='47'
          >
            {label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function CalendarWeekendPulseAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: weekend wyróżniony w tygodniu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 90'
    >
      <style>{`
        .day { fill: #e2e8f0; }
        .weekend {
          fill: #fda4af;
          animation: weekendPulse 2.6s ease-in-out infinite;
        }
        @keyframes weekendPulse {
          0%, 100% { opacity: 0.6; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1.06); }
        }
        @media (prefers-reduced-motion: reduce) {
          .weekend { animation: none; opacity: 1; }
        }
      `}</style>
      {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'].map((label, index) => {
        const isWeekend = index >= 5;
        return (
          <g key={label}>
            <rect
              className={isWeekend ? 'weekend' : 'day'}
              x={12 + index * 48}
              y='24'
              width='42'
              height='36'
              rx='12'
            />
            <text
              fill={isWeekend ? '#9f1239' : '#0f172a'}
              fontSize='12'
              fontWeight='700'
              textAnchor='middle'
              x={33 + index * 48}
              y='47'
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function CalendarMonthsLoopAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: miesiące roku krążą w pętli.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 240 180'
    >
      <style>{`
        .ring { fill: none; stroke: #e2e8f0; stroke-dasharray: 6 6; }
        .dot { fill: #cbd5f5; }
        .highlight {
          fill: #6366f1;
          animation: spin 6s linear infinite;
          transform-origin: 120px 90px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .highlight { animation: none; }
        }
      `}</style>
      <circle className='ring' cx='120' cy='90' r='58' />
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((index) => {
        const angle = (index / 12) * Math.PI * 2;
        return (
          <circle
            key={`month-${index}`}
            className='dot'
            cx={120 + Math.cos(angle) * 58}
            cy={90 + Math.sin(angle) * 58}
            r='4'
          />
        );
      })}
      <g className='highlight'>
        <circle cx='120' cy='32' r='6' />
      </g>
    </svg>
  );
}

export function CalendarSeasonsCycleAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: pory roku zmieniają się cyklicznie.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 240 180'
    >
      <style>{`
        .season { opacity: 0.35; animation: seasonPulse 4s ease-in-out infinite; }
        .s2 { animation-delay: 1s; }
        .s3 { animation-delay: 2s; }
        .s4 { animation-delay: 3s; }
        @keyframes seasonPulse {
          0%, 100% { opacity: 0.35; transform: scale(0.98); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .season { animation: none; opacity: 1; }
        }
      `}</style>
      <circle cx='120' cy='90' r='70' fill='#f8fafc' stroke='#e2e8f0' />
      <circle className='season' cx='120' cy='40' r='22' fill='#34d399' />
      <circle className='season s2' cx='170' cy='90' r='22' fill='#f59e0b' />
      <circle className='season s3' cx='120' cy='140' r='22' fill='#f97316' />
      <circle className='season s4' cx='70' cy='90' r='22' fill='#38bdf8' />
      <text fill='#0f172a' fontSize='10' fontWeight='700' x='110' y='16'>Wiosna</text>
      <text fill='#0f172a' fontSize='10' fontWeight='700' x='176' y='94'>Lato</text>
      <text fill='#0f172a' fontSize='10' fontWeight='700' x='110' y='170'>Jesień</text>
      <text fill='#0f172a' fontSize='10' fontWeight='700' x='32' y='94'>Zima</text>
    </svg>
  );
}

export function CalendarDateFormatAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: dzień, miesiąc i rok w zapisie daty.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .box { fill: #eef2ff; stroke: #c7d2fe; stroke-width: 2; }
        .hi { animation: glow 3s ease-in-out infinite; }
        .h2 { animation-delay: 1s; }
        .h3 { animation-delay: 2s; }
        @keyframes glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hi { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='box hi' x='30' y='40' width='70' height='40' rx='12' />
      <rect className='box hi h2' x='120' y='40' width='70' height='40' rx='12' />
      <rect className='box hi h3' x='210' y='40' width='80' height='40' rx='12' />
      <text fill='#3730a3' fontSize='14' fontWeight='700' x='50' y='66'>DD</text>
      <text fill='#3730a3' fontSize='14' fontWeight='700' x='140' y='66'>MM</text>
      <text fill='#3730a3' fontSize='14' fontWeight='700' x='230' y='66'>RRRR</text>
      <text fill='#64748b' fontSize='16' fontWeight='700' x='105' y='66'>/</text>
      <text fill='#64748b' fontSize='16' fontWeight='700' x='195' y='66'>/</text>
    </svg>
  );
}

export function CalendarDateHighlightAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: wybieramy konkretny dzień w kalendarzu.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 240 160'
    >
      <style>{`
        .cell { fill: #e2e8f0; }
        .active {
          fill: #6366f1;
          animation: pick 3.2s ease-in-out infinite;
        }
        @keyframes pick {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .active { animation: none; opacity: 1; }
        }
      `}</style>
      {Array.from({ length: 21 }).map((_, index) => {
        const col = index % 7;
        const row = Math.floor(index / 7);
        const x = 20 + col * 28;
        const y = 30 + row * 28;
        const isActive = index === 10;
        return (
          <rect
            key={`cell-${index}`}
            className={isActive ? 'active' : 'cell'}
            x={x}
            y={y}
            width='22'
            height='22'
            rx='6'
          />
        );
      })}
    </svg>
  );
}

export function CalendarMonthLengthAnimation(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: miesiące mają różną liczbę dni.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 320 120'
    >
      <style>{`
        .bar { fill: #cbd5f5; }
        .long { fill: #6366f1; animation: glow 3s ease-in-out infinite; }
        .mid { fill: #38bdf8; animation: glow 3s ease-in-out infinite 1s; }
        .short { fill: #fda4af; animation: glow 3s ease-in-out infinite 2s; }
        @keyframes glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .long, .mid, .short { animation: none; opacity: 1; }
        }
      `}</style>
      <rect className='bar long' x='30' y='50' width='90' height='20' rx='10' />
      <rect className='bar mid' x='130' y='50' width='70' height='20' rx='10' />
      <rect className='bar short' x='210' y='50' width='50' height='20' rx='10' />
      <text fill='#3730a3' fontSize='12' fontWeight='700' x='55' y='40'>31 dni</text>
      <text fill='#0ea5e9' fontSize='12' fontWeight='700' x='145' y='40'>30 dni</text>
      <text fill='#be123c' fontSize='12' fontWeight='700' x='215' y='40'>28 dni</text>
    </svg>
  );
}
