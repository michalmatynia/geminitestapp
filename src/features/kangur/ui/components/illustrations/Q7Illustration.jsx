export function Q7Illustration() {
  const n = 11;
  const cx = 90,
    cy = 75,
    r = 60;
  /** @type {{ num: number; x: number; y: number }[]} */
  const players = Array.from({ length: n }, (_, i) => {
    // Position player i+1 around circle; player 1 at bottom, going clockwise
    const angle = Math.PI / 2 + (2 * Math.PI * i) / n; // start bottom, go counter-clockwise (left = counter-clockwise when facing center)
    return {
      num: i + 1,
      x: cx + r * Math.cos(angle),
      y: cy - r * Math.sin(angle),
    };
  });

  // Passing sequence: 1→4→7→10→2→5→8→11→3→6→9→1
  /** @type {[number, number][]} */
  const sequence = [];
  let cur = 0; // index of player 1
  for (let step = 0; step < 11; step++) {
    const next = (cur + 3) % n;
    sequence.push([cur, next]);
    cur = next;
  }

  // Highlight first few passes with arrows
  const highlighted = sequence.slice(0, 4);

  return (
    <svg viewBox='-10 0 200 175' className='w-full max-w-xs mx-auto'>
      <defs>
        <marker id='arrow7' markerWidth='6' markerHeight='6' refX='3' refY='3' orient='auto'>
          <path d='M0,0 L6,3 L0,6 Z' fill='#f97316' />
        </marker>
      </defs>
      {/* Circle */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill='none'
        stroke='#e5e7eb'
        strokeWidth='1.5'
        strokeDasharray='4,3'
      />

      {/* Pass arrows */}
      {highlighted.map(([from, to], i) => {
        const p1 = players[from];
        const p2 = players[to];
        const dx = p2.x - p1.x,
          dy = p2.y - p1.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const ux = dx / len,
          uy = dy / len;
        return (
          <line
            key={i}
            x1={p1.x + ux * 9}
            y1={p1.y + uy * 9}
            x2={p2.x - ux * 9}
            y2={p2.y - uy * 9}
            stroke='#f97316'
            strokeWidth='1.5'
            markerEnd='url(#arrow7)'
            opacity={0.8 - i * 0.12}
          />
        );
      })}

      {/* Players */}
      {players.map((p) => (
        <g key={p.num}>
          <circle
            cx={p.x}
            cy={p.y}
            r={9}
            fill={p.num === 1 ? '#f97316' : '#f3f4f6'}
            stroke={p.num === 1 ? '#ea580c' : '#9ca3af'}
            strokeWidth='1.5'
          />
          <text
            x={p.x}
            y={p.y + 4}
            textAnchor='middle'
            fontSize='9'
            fontWeight='bold'
            fill={p.num === 1 ? 'white' : '#374151'}
          >
            {p.num}
          </text>
        </g>
      ))}

      <text x={cx} y={cy + r + 22} textAnchor='middle' fontSize='8' fill='#6b7280'>
        Gracz 1 (pomarańczowy) zaczyna
      </text>
      <text x={cx} y={cy + r + 33} textAnchor='middle' fontSize='8' fill='#6b7280'>
        Sekwencja: 1→4→7→10→2→5→8→11→3→6→9→1
      </text>
    </svg>
  );
}

// Q8: Block construction (current state after 1 block removed) + 5 answer options
// Shows the current construction and labels A-E for the answer options
