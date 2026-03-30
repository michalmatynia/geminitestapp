import React from 'react';

export function SvgDefs(): React.JSX.Element {
  return (
    <defs>
      <marker
        id='vgraph-arrow'
        viewBox='0 0 10 10'
        refX='10'
        refY='5'
        markerWidth='6'
        markerHeight='6'
        orient='auto-start-reverse'
      >
        <path d='M 0 0 L 10 5 L 0 10 z' fill='#6b7280' />
      </marker>
      <marker
        id='vgraph-arrow-merge'
        viewBox='0 0 10 10'
        refX='10'
        refY='5'
        markerWidth='6'
        markerHeight='6'
        orient='auto-start-reverse'
      >
        <path d='M 0 0 L 10 5 L 0 10 z' fill='#a855f7' />
      </marker>
      <marker
        id='vgraph-arrow-composite'
        viewBox='0 0 10 10'
        refX='10'
        refY='5'
        markerWidth='6'
        markerHeight='6'
        orient='auto-start-reverse'
      >
        <path d='M 0 0 L 10 5 L 0 10 z' fill='#14b8a6' />
      </marker>
    </defs>
  );
}
