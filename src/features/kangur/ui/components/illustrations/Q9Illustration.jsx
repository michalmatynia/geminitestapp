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
