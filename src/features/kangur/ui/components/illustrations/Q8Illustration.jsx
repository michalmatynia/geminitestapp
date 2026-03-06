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
