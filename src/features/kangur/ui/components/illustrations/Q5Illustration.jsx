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
