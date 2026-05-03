 
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
