import type { ReactNode } from 'react';

export function renderEmphasis(title: string, emphasis: string): ReactNode {
  if (!emphasis) return title;
  const idx = title.indexOf(emphasis);
  if (idx === -1) return <>{title}<em>{emphasis}</em></>;
  return (
    <>
      {title.slice(0, idx)}
      <em>{emphasis}</em>
      {title.slice(idx + emphasis.length)}
    </>
  );
}
