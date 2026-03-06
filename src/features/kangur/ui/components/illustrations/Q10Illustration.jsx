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
