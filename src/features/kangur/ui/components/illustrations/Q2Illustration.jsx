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
