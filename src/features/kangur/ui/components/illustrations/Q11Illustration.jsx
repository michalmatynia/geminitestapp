export function Q11Illustration() {
  // Light tiles: 23×11 cm, Dark squares: s×s cm
  // Show a small pattern to illustrate
  const rw = 23,
    rh = 11; // rectangle dims (scaled)
  const sq = 6; // square side
  const scale = 3; // 1cm = 3px
  return (
    <svg
      viewBox={`0 0 ${(rw + sq) * scale + 10} ${(rh + sq) * scale + 20}`}
      className='w-full max-w-xs mx-auto'
    >
      <text x={((rw + sq) * scale + 10) / 2} y={10} textAnchor='middle' fontSize='8' fill='#6b7280'>
        Wzór podłogi (przybliżony)
      </text>
      {/* Row 1: light, dark, light */}
      <rect
        x={2}
        y={14}
        width={rw * scale}
        height={rh * scale}
        fill='#d1d5db'
        stroke='#374151'
        strokeWidth='1'
      />
      <rect
        x={2 + rw * scale}
        y={14}
        width={sq * scale}
        height={sq * scale}
        fill='#374151'
        stroke='#374151'
        strokeWidth='1'
      />
      <rect
        x={2}
        y={14 + rh * scale}
        width={sq * scale}
        height={sq * scale}
        fill='#374151'
        stroke='#374151'
        strokeWidth='1'
      />
      <rect
        x={2 + sq * scale}
        y={14 + rh * scale}
        width={rw * scale}
        height={rh * scale}
        fill='#d1d5db'
        stroke='#374151'
        strokeWidth='1'
      />
      <text
        x={2 + (rw * scale) / 2}
        y={14 + (rh * scale) / 2 + 4}
        textAnchor='middle'
        fontSize='7'
        fill='#374151'
      >
        23×11 cm
      </text>
      <text
        x={2 + rw * scale + (sq * scale) / 2}
        y={14 + (sq * scale) / 2 + 3}
        textAnchor='middle'
        fontSize='7'
        fill='white'
      >
        ?×?
      </text>
    </svg>
  );
}

// Q15 (4pt): 4 overlapping circles with cards 1-7, sum=10 each
