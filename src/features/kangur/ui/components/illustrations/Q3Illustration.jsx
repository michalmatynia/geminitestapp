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
