import React from 'react';
import { useMultiplicationArrayGame } from './context';
import { MultiplicationArrayGroupCard } from './GroupCard';

export function MultiplicationArrayGroups(): React.JSX.Element {
  const { a, isCoarsePointer, translations } = useMultiplicationArrayGame();

  return (
    <div className='grid w-full gap-3 lg:grid-cols-2 xl:grid-cols-3'>
      {isCoarsePointer ? (
        <p
          data-testid='multiplication-array-touch-hint'
          className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)] lg:col-span-2 xl:col-span-3'
        >
          {translations('multiplicationArray.inRound.touchHint', { total: a })}
        </p>
      ) : null}
      {Array.from({ length: a }).map((_, groupIndex) => (
        <MultiplicationArrayGroupCard groupIndex={groupIndex} key={groupIndex} />
      ))}
    </div>
  );
}
