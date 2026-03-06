export function Q15Illustration() {
  const cx1 = 30,
    cx2 = 65,
    cx3 = 100,
    cx4 = 135;
  const cy = 40,
    r = 25;
  return (
    <svg viewBox='0 0 175 80' className='w-full max-w-xs mx-auto'>
      {[cx1, cx2, cx3, cx4].map((cx, i) => (
        <circle key={i} cx={cx} cy={cy} r={r} fill='none' stroke='#9ca3af' strokeWidth='1.5' />
      ))}
      {/* Known values */}
      <text
        x={cx1 - 10}
        y={cy + 4}
        textAnchor='middle'
        fontSize='13'
        fontWeight='bold'
        fill='#f97316'
      >
        6
      </text>
      <text
        x={cx4 + 10}
        y={cy + 4}
        textAnchor='middle'
        fontSize='13'
        fontWeight='bold'
        fill='#f97316'
      >
        3
      </text>
      {/* Hidden cards in middle */}
      {[cx1 + 18, cx2 + 18, cx3 + 18].map((x, i) => (
        <g key={i}>
          <rect
            x={x - 8}
            y={cy - 10}
            width={16}
            height={20}
            fill='#e5e7eb'
            stroke='#9ca3af'
            strokeWidth='1'
            rx='2'
          />
          <text x={x} y={cy + 4} textAnchor='middle' fontSize='10' fill='#6b7280'>
            ?
          </text>
        </g>
      ))}
      <text x={87} y={72} textAnchor='middle' fontSize='8' fill='#6b7280'>
        Suma w każdym okręgu = 10
      </text>
    </svg>
  );
}

// Q16 (4pt): Card flipped along vertical edge, cut into 4 parts
