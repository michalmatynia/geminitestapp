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
