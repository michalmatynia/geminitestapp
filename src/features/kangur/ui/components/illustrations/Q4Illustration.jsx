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
          const fill = isGray ? '#9ca3af' : 'white';
          const opacity = inPoster ? 0.25 : 1;
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
