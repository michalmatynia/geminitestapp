// SVG illustrations for Kangur 2024 original questions

// Q5: Three consecutive 4-digit numbers with some digits hidden
export function Q5Illustration() {
  const nums = [
    { digits: [null, null, null, '7'] },
    { digits: [null, '8', '9', '8'] },
    { digits: ['4', '8', null, null] },
  ];

  const cw = 18,
    ch = 22,
    gap = 10;
  const totalW = nums.length * (4 * cw + gap) - gap + 10;

  return (
    <svg viewBox={`-5 0 ${totalW + 30} 55`} className='w-full max-w-xs mx-auto'>
      {nums.map((num, ni) => {
        const baseX = ni * (4 * cw + gap) + 10;
        return (
          <g key={ni}>
            {num.digits.map((d, di) => {
              const x = baseX + di * cw;
              return (
                <g key={di}>
                  <rect
                    x={x}
                    y={10}
                    width={cw - 2}
                    height={ch}
                    fill={d === null ? '#d1d5db' : 'white'}
                    stroke='#374151'
                    strokeWidth='1.5'
                    rx='2'
                  />
                  {d !== null && (
                    <text
                      x={x + (cw - 2) / 2}
                      y={10 + ch - 6}
                      textAnchor='middle'
                      fontSize='12'
                      fontWeight='bold'
                      fill='#1f2937'
                    >
                      {d}
                    </text>
                  )}
                  {d === null && (
                    <text
                      x={x + (cw - 2) / 2}
                      y={10 + ch - 6}
                      textAnchor='middle'
                      fontSize='10'
                      fill='#9ca3af'
                    >
                      ?
                    </text>
                  )}
                </g>
              );
            })}
            {ni < nums.length - 1 && (
              <text
                x={baseX + 4 * cw + gap / 2 - 1}
                y={24}
                textAnchor='middle'
                fontSize='12'
                fill='#6b7280'
              >
                ,
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// Q6: Three cakes with price tags summing to 7 zł (different prices)
export function Q6Illustration() {
  const cakes = [
    { emoji: '🍰', price: '1 zł', color: '#fde68a' },
    { emoji: '🧁', price: '2 zł', color: '#fbcfe8' },
    { emoji: '🎂', price: '4 zł', color: '#bbf7d0' },
  ];
  return (
    <svg viewBox='0 0 250 78' className='w-full max-w-xs mx-auto'>
      {cakes.map((c, i) => {
        const x = i * 80 + 10;
        return (
          <g key={i}>
            <rect
              x={x}
              y={8}
              width={60}
              height={50}
              rx='10'
              fill={c.color}
              stroke='#d1d5db'
              strokeWidth='1.5'
            />
            <text x={x + 30} y={34} textAnchor='middle' fontSize='20'>
              {c.emoji}
            </text>
            <text
              x={x + 30}
              y={52}
              textAnchor='middle'
              fontSize='11'
              fontWeight='bold'
              fill='#374151'
            >
              {c.price}
            </text>
          </g>
        );
      })}
      <text x={120} y={68} textAnchor='middle' fontSize='10' fill='#6b7280'>
        Razem: 1 + 2 + 4 = 7 zł
      </text>
    </svg>
  );
}

// Q7: 11 players in a circle, passing every 3rd (left)
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
export function Q8Illustration() {
  // We draw an isometric-style block figure
  // Current state: roughly L-shaped base 3×2 with some stacked blocks
  // Using simple 2D representation

  // Helper: draw one isometric cube at grid position (col, row, layer)
  // Using simple top/left/right face approach
  function Cube({ x, y, size = 18, fill = '#d1d5db', stroke = '#6b7280' }) {
    const s = size;
    const h = s * 0.55; // height of top face
    // top face (parallelogram)
    const topPoints = `${x},${y} ${x + s},${y - h / 2} ${x + s * 2},${y} ${x + s},${y + h / 2}`;
    // left face
    const leftPoints = `${x},${y} ${x + s},${y + h / 2} ${x + s},${y + h / 2 + s * 0.7} ${x},${y + s * 0.7}`;
    // right face
    const rightPoints = `${x + s},${y + h / 2} ${x + s * 2},${y} ${x + s * 2},${y + s * 0.7} ${x + s},${y + h / 2 + s * 0.7}`;
    return (
      <>
        <polygon points={topPoints} fill={fill} stroke={stroke} strokeWidth='1' />
        <polygon
          points={leftPoints}
          fill={fill === '#d1d5db' ? '#9ca3af' : '#b0b0b0'}
          stroke={stroke}
          strokeWidth='1'
        />
        <polygon
          points={rightPoints}
          fill={fill === '#d1d5db' ? '#e5e7eb' : '#c8c8c8'}
          stroke={stroke}
          strokeWidth='1'
        />
      </>
    );
  }

  // Draw the "after" state (cat knocked one block off)
  // Base: 3 wide × 2 deep, plus stack in corner
  // Simplified: draw as labeled diagram
  const s = 14;
  const h = s * 0.55;

  /**
   * @typedef {{ col: number; row: number; layer: number }} StackBlock
   */
  /**
   * @param {number} baseX
   * @param {number} baseY
   * @param {StackBlock[]} layout
   */
  function drawStack(baseX, baseY, layout) {
    // layout: array of {col, row, layer}
    const sorted = [...layout].sort((a, b) => a.layer - b.layer || b.row - a.row || a.col - b.col);
    return sorted.map((blk, i) => {
      const x = baseX + blk.col * s - blk.row * s * 0.5;
      const y = baseY + blk.row * h * 0.9 - blk.layer * (s * 0.7 + h * 0.5);
      return <Cube key={i} x={x} y={y} size={s} />;
    });
  }

  // Current (after) construction — small L-shape with stack
  /** @type {StackBlock[]} */
  const afterBlocks = [
    { col: 0, row: 0, layer: 0 },
    { col: 1, row: 0, layer: 0 },
    { col: 2, row: 0, layer: 0 },
    { col: 0, row: 1, layer: 0 },
    { col: 1, row: 1, layer: 0 },
    { col: 0, row: 0, layer: 1 },
    { col: 1, row: 0, layer: 1 },
    { col: 0, row: 0, layer: 2 },
  ];

  return (
    <svg viewBox='-5 0 360 180' className='w-full max-w-sm mx-auto'>
      {/* Current state label */}
      <text x={60} y={12} textAnchor='middle' fontSize='9' fontWeight='bold' fill='#374151'>
        Stan po strąceniu
      </text>
      <g transform='translate(10, 20)'>{drawStack(30, 65, afterBlocks)}</g>

      {/* Arrow */}
      <text x={130} y={65} textAnchor='middle' fontSize='18' fill='#9ca3af'>
        →
      </text>

      {/* Answer options simplified */}
      {[
        { label: 'A', extra: { col: 0, row: 1, layer: 1 } },
        { label: 'B', extra: { col: 2, row: 0, layer: 1 } },
        { label: 'C', extra: { col: 1, row: 0, layer: 2 }, correct: true },
        { label: 'D', extra: { col: 2, row: 1, layer: 0 } },
        { label: 'E', extra: { col: 1, row: 1, layer: 1 } },
      ].map((opt, oi) => {
        const ox = 155 + (oi % 3) * 62;
        const oy = oi < 3 ? 15 : 88;
        const blocks = [...afterBlocks, opt.extra];
        return (
          <g key={oi}>
            <text
              x={ox + 22}
              y={oy}
              textAnchor='middle'
              fontSize='9'
              fontWeight='bold'
              fill={opt.correct ? '#f97316' : '#374151'}
            >
              {opt.label}){opt.correct ? ' ✓' : ''}
            </text>
            <g transform={`translate(${ox - 5}, ${oy + 2})`}>{drawStack(20, 50, blocks)}</g>
          </g>
        );
      })}
    </svg>
  );
}

// Q9 (4pt): Coin toss board game — START to META track
export function Q9Illustration() {
  const cells = ['START', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'META'];
  const highlighted = ['4', '8'];
  const cw = 22,
    ch = 26;
  const totalW = cells.length * cw + 4;
  return (
    <svg viewBox={`0 0 ${totalW} ${ch + 20}`} className='w-full max-w-sm mx-auto'>
      {cells.map((c, i) => {
        const isHighlighted = highlighted.includes(c);
        const isStart = c === 'START' || c === 'META';
        return (
          <g key={i}>
            <rect
              x={i * cw + 2}
              y={4}
              width={cw - 2}
              height={ch}
              fill={isHighlighted ? '#fde68a' : isStart ? '#e0e7ff' : 'white'}
              stroke='#374151'
              strokeWidth={isHighlighted ? 2 : 1}
              rx='2'
            />
            <text
              x={i * cw + 2 + (cw - 2) / 2}
              y={4 + ch - 7}
              textAnchor='middle'
              fontSize={isStart ? '5' : isHighlighted ? '11' : '9'}
              fontWeight={isHighlighted ? 'bold' : 'normal'}
              fill={isHighlighted ? '#92400e' : '#374151'}
            >
              {c}
            </text>
            {isHighlighted && (
              <circle
                cx={i * cw + 2 + (cw - 2) / 2}
                cy={4 + ch / 2}
                r={10}
                fill='none'
                stroke='#f97316'
                strokeWidth='2'
              />
            )}
          </g>
        );
      })}
      <text x={totalW / 2} y={ch + 18} textAnchor='middle' fontSize='8' fill='#6b7280'>
        Ela: pole 4 (🟡) • Władek: pole 8 (🟡)
      </text>
    </svg>
  );
}

// Q10 (4pt): Fruits on tray — who gets what
export function Q10Illustration() {
  const fruits = [
    { emoji: '🍎', name: 'jabłko' },
    { emoji: '🍐', name: 'gruszka' },
    { emoji: '🍒', name: 'wiśnia' },
    { emoji: '🍓', name: 'truskawka' },
    { emoji: '🍌', name: 'banan' },
  ];
  return (
    <svg viewBox='0 0 280 60' className='w-full max-w-xs mx-auto'>
      <text x={140} y={12} textAnchor='middle' fontSize='9' fontWeight='bold' fill='#374151'>
        Owoce na tacy:
      </text>
      {fruits.map((f, i) => (
        <g key={i}>
          <text x={28 + i * 52} y={38} textAnchor='middle' fontSize='20'>
            {f.emoji}
          </text>
          <text x={28 + i * 52} y={52} textAnchor='middle' fontSize='8' fill='#6b7280'>
            {f.name}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Q11 (4pt): Floor tile pattern — rectangular light + square dark
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
export function Q1Illustration() {
  const S = 60; // square side
  const c = 15; // cell size (S/4)
  const gap = 14;
  const labels = ['A', 'B', 'C', 'D', 'E'];

  // Reading from the actual image carefully (4×4 grid):
  // A) Step cut: right edge at row3 (y=45) going left to col1 (x=15), then down to bottom
  //    → M 0,45  L 15,45  L 15,60  — gives L-shape vs rect (DIFFERENT ✓)
  // B) Diagonal from top-right corner (60,0) to bottom-left corner (0,60)
  // C) Rectangular notch cut: from top, down 2 rows, spanning cols 1–3, back up
  //    → M 15,0  L 15,30  L 45,30  L 45,0
  // D) Diagonal from top-left corner (0,0) to bottom-right corner (60,60) — but shifted
  //    Actually from image: from top edge col1 (15,0) to bottom edge col4 (60,45)?
  //    Looking at image: diagonal goes from top-right area to bottom-left area, roughly (60,15)→(0,60)
  //    → M 60,15  L 0,60
  // E) Two vertical cuts at col1 and col3, creating a narrow center column strip
  //    → M 15,0  L 15,60  and  M 45,0  L 45,60

  const options = [
    {
      cuts: [`M ${1 * c},0 L ${1 * c},${2 * c} L ${3 * c},${2 * c} L ${3 * c},${4 * c}`],
      answer: true,
    },
    { cuts: [`M ${4 * c},0 L 0,${4 * c}`], answer: false },
    {
      cuts: [
        `M ${1 * c},${1 * c} L ${1 * c},${4 * c}`,
        `M ${1 * c},${1 * c} L ${2 * c},${1 * c}`,
        `M ${2 * c},${1 * c} L ${2 * c},${3 * c}`,
        `M ${2 * c},${3 * c} L ${3 * c},${3 * c}`,
        `M ${3 * c},0 L ${3 * c},${3 * c}`,
      ],
      answer: false,
    },
    { cuts: [`M 0,${1 * c} L ${4 * c},${3 * c}`], answer: false },
    {
      cuts: [
        `M ${1 * c},${1 * c} L ${1 * c},${4 * c}`,
        `M ${1 * c},${1 * c} L ${2 * c},${1 * c} L ${2 * c},${3 * c} L ${3 * c},${3 * c}`,
        `M ${3 * c},${1 * c} L ${3 * c},${3 * c}`,
        `M ${3 * c},${1 * c} L ${4 * c},${1 * c}`,
      ],
      answer: false,
    },
  ];

  const totalWidth = options.length * (S + gap) - gap;

  return (
    <svg viewBox={`-5 -22 ${totalWidth + 10} ${S + 34}`} className='w-full max-w-sm mx-auto'>
      {options.map((opt, i) => {
        const x = i * (S + gap);
        return (
          <g key={i} transform={`translate(${x}, 0)`}>
            <text
              x={S / 2}
              y={-8}
              textAnchor='middle'
              fontSize='11'
              fontWeight='bold'
              fill='#374151'
            >
              {labels[i]})
            </text>
            <rect
              x={0}
              y={0}
              width={S}
              height={S}
              fill='white'
              stroke='#374151'
              strokeWidth='1.5'
            />
            {/* 4×4 dashed grid lines */}
            {[1, 2, 3].map((n) => (
              <g key={n}>
                <line
                  x1={n * c}
                  y1={0}
                  x2={n * c}
                  y2={S}
                  stroke='#9ca3af'
                  strokeWidth='0.7'
                  strokeDasharray='3,2'
                />
                <line
                  x1={0}
                  y1={n * c}
                  x2={S}
                  y2={n * c}
                  stroke='#9ca3af'
                  strokeWidth='0.7'
                  strokeDasharray='3,2'
                />
              </g>
            ))}
            {opt.cuts.map((d, ci) => (
              <path
                key={ci}
                d={d}
                fill='none'
                stroke='#1e1b4b'
                strokeWidth='2.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

// Q2: Which sum is greatest? — just a visual math display, no extra illustration needed
// We show the sums in a styled visual
export function Q2Illustration() {
  const sums = [
    { expr: '202 + 4', result: 206 },
    { expr: '20 + 24', result: 44 },
    { expr: '2+0+2+4', result: 8 },
    { expr: '20+2+4', result: 26 },
    { expr: '2+0+24', result: 26 },
  ];
  const labels = ['A', 'B', 'C', 'D', 'E'];
  const maxResult = Math.max(...sums.map((s) => s.result));

  return (
    <svg viewBox='-5 0 340 85' className='w-full max-w-sm mx-auto'>
      {sums.map((s, i) => {
        const x = i * 64;
        const barH = Math.round((s.result / maxResult) * 40);
        const isMax = s.result === maxResult;
        return (
          <g key={i} transform={`translate(${x}, 0)`}>
            <text x={30} y={12} textAnchor='middle' fontSize='9' fontWeight='bold' fill='#6b7280'>
              {labels[i]})
            </text>
            <text x={30} y={26} textAnchor='middle' fontSize='8' fill='#374151'>
              {s.expr}
            </text>
            {/* Bar */}
            <rect
              x={10}
              y={70 - barH}
              width={38}
              height={barH}
              fill={isMax ? '#f97316' : '#e5e7eb'}
              rx='3'
            />
            <text
              x={29}
              y={68}
              textAnchor='middle'
              fontSize='8'
              fontWeight='bold'
              fill={isMax ? '#ea580c' : '#9ca3af'}
            >
              {s.result}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Q3: Table of 28 fields (4 rows × 7 columns), 2 rows and 1 column colored
export function Q3Illustration() {
  const cols = 7,
    rows = 4;
  const cellW = 28,
    cellH = 22;
  const coloredRows = [0, 1]; // first two rows
  const coloredCol = 2; // third column (index 2)
  const w = cols * cellW + 2;
  const h = rows * cellH + 2;

  return (
    <svg viewBox={`0 0 ${w + 60} ${h + 30}`} className='w-full max-w-xs mx-auto'>
      <text
        x={(w + 60) / 2}
        y={14}
        textAnchor='middle'
        fontSize='10'
        fill='#6b7280'
        fontStyle='italic'
      >
        Tabelka 4×7 = 28 pól
      </text>
      <g transform='translate(30, 20)'>
        {Array.from({ length: rows }).map((_, r) =>
          Array.from({ length: cols }).map((_, c) => {
            const inColoredRow = coloredRows.includes(r);
            const inColoredCol = c === coloredCol;
            let fill = 'white';
            if (inColoredRow) fill = '#fbbf24';
            else if (inColoredCol) fill = '#fb923c';
            return (
              <rect
                key={`${r}-${c}`}
                x={c * cellW}
                y={r * cellH}
                width={cellW}
                height={cellH}
                fill={fill}
                stroke='#9ca3af'
                strokeWidth='1'
              />
            );
          })
        )}
        {/* Legend */}
        <rect
          x={0}
          y={rows * cellH + 8}
          width={12}
          height={10}
          fill='#fbbf24'
          stroke='#9ca3af'
          strokeWidth='1'
        />
        <text x={16} y={rows * cellH + 17} fontSize='9' fill='#374151'>
          2 wiersze (zamalowane)
        </text>
        <rect
          x={0}
          y={rows * cellH + 22}
          width={12}
          height={10}
          fill='#fb923c'
          stroke='#9ca3af'
          strokeWidth='1'
        />
        <text x={16} y={rows * cellH + 31} fontSize='9' fill='#374151'>
          dodatkowe pola kolumny
        </text>
      </g>
    </svg>
  );
}

// Q4: Checkerboard wall with a 6×5 rectangle poster on it
export function Q4Illustration() {
  const wallCols = 10,
    wallRows = 7;
  const cellSize = 22;
  const posterStartCol = 2,
    posterStartRow = 1;
  const posterCols = 6,
    posterRows = 5;

  const w = wallCols * cellSize;
  const h = wallRows * cellSize;

  return (
    <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} className='w-full max-w-xs mx-auto'>
      {Array.from({ length: wallRows }).map((_, r) =>
        Array.from({ length: wallCols }).map((_, c) => {
          const isGray = (r + c) % 2 === 1;
          const inPoster =
            c >= posterStartCol &&
            c < posterStartCol + posterCols &&
            r >= posterStartRow &&
            r < posterStartRow + posterRows;
          let fill = isGray ? '#9ca3af' : 'white';
          let opacity = inPoster ? 0.25 : 1;
          return (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill={fill}
              opacity={opacity}
              stroke='#d1d5db'
              strokeWidth='0.5'
            />
          );
        })
      )}
      {/* Poster overlay */}
      <rect
        x={posterStartCol * cellSize}
        y={posterStartRow * cellSize}
        width={posterCols * cellSize}
        height={posterRows * cellSize}
        fill='#fde68a'
        fillOpacity='0.85'
        stroke='#f97316'
        strokeWidth='2.5'
        rx='2'
      />
      <text
        x={posterStartCol * cellSize + (posterCols * cellSize) / 2}
        y={posterStartRow * cellSize + (posterRows * cellSize) / 2 - 8}
        textAnchor='middle'
        fontSize='9'
        fontWeight='bold'
        fill='#92400e'
      >
        Kangur
      </text>
      <text
        x={posterStartCol * cellSize + (posterCols * cellSize) / 2}
        y={posterStartRow * cellSize + (posterRows * cellSize) / 2 + 4}
        textAnchor='middle'
        fontSize='9'
        fontWeight='bold'
        fill='#92400e'
      >
        Matematyczny
      </text>
      <text
        x={posterStartCol * cellSize + (posterCols * cellSize) / 2}
        y={posterStartRow * cellSize + (posterRows * cellSize) / 2 + 16}
        textAnchor='middle'
        fontSize='9'
        fontWeight='bold'
        fill='#92400e'
      >
        2024
      </text>
    </svg>
  );
}
