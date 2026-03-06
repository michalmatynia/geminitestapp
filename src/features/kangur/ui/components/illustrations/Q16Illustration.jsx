export function Q16Illustration() {
  return (
    <svg viewBox='0 0 260 80' className='w-full max-w-xs mx-auto'>
      {/* Front side */}
      <text x={30} y={10} textAnchor='middle' fontSize='8' fill='#6b7280'>
        Przód
      </text>
      <rect
        x={5}
        y={14}
        width={50}
        height={56}
        fill='white'
        stroke='#374151'
        strokeWidth='1.5'
        rx='2'
      />
      <line
        x1={30}
        y1={14}
        x2={30}
        y2={70}
        stroke='#374151'
        strokeWidth='1'
        strokeDasharray='3,2'
      />
      <line x1={5} y1={42} x2={55} y2={42} stroke='#374151' strokeWidth='1' />
      {[
        ['1', '2'],
        ['4', '3'],
      ].map((row, r) =>
        row.map((n, c) => (
          <text
            key={`${r}${c}`}
            x={17 + c * 25}
            y={r === 0 ? 32 : 58}
            textAnchor='middle'
            fontSize='12'
            fontWeight='bold'
            fill='#374151'
          >
            {n}
          </text>
        ))
      )}

      {/* Arrow */}
      <text x={80} y={45} textAnchor='middle' fontSize='16' fill='#9ca3af'>
        ↔
      </text>

      {/* Back side (flipped) */}
      <text x={125} y={10} textAnchor='middle' fontSize='8' fill='#6b7280'>
        Tył (odwrócony)
      </text>
      <rect
        x={100}
        y={14}
        width={50}
        height={56}
        fill='#f3f4f6'
        stroke='#374151'
        strokeWidth='1.5'
        rx='2'
      />
      <line
        x1={125}
        y1={14}
        x2={125}
        y2={70}
        stroke='#374151'
        strokeWidth='1'
        strokeDasharray='3,2'
      />
      <line x1={100} y1={42} x2={150} y2={42} stroke='#374151' strokeWidth='1' />
      {[
        ['6', '7'],
        ['8', '5'],
      ].map((row, r) =>
        row.map((n, c) => (
          <text
            key={`${r}${c}`}
            x={112 + c * 25}
            y={r === 0 ? 32 : 58}
            textAnchor='middle'
            fontSize='12'
            fontWeight='bold'
            fill='#374151'
          >
            {n}
          </text>
        ))
      )}

      {/* Result strip */}
      <text x={210} y={10} textAnchor='middle' fontSize='8' fill='#6b7280'>
        Po cięciu (widoczne):
      </text>
      {['?', '5', '?', '6'].map((v, i) => (
        <g key={i}>
          <rect
            x={170 + i * 22}
            y={28}
            width={20}
            height={28}
            rx='3'
            fill={v === '?' ? '#fde68a' : 'white'}
            stroke='#374151'
            strokeWidth='1.5'
          />
          <text
            x={180 + i * 22}
            y={46}
            textAnchor='middle'
            fontSize='12'
            fontWeight='bold'
            fill={v === '?' ? '#92400e' : '#374151'}
          >
            {v}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Q1: Which square was cut along bold lines into two parts of DIFFERENT shapes?
// Answer: A — the L-shaped step cut
// Grid is 4×4 cells, squareSize=60, each cell=15
