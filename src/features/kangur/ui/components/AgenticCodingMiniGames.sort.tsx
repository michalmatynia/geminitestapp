import { useState } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonChip,
  KangurLessonInset,
  KangurLessonStack,
  KangurLessonVisual,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';

import type { SortGameConfig, SortGameItem } from './AgenticCodingMiniGames.types';

export function AgenticSortGame({
  accent,
  config,
}: {
  accent: KangurAccent;
  config: SortGameConfig;
}): React.JSX.Element {
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() => {
    const base: Record<string, string | null> = {};
    config.items.forEach((item) => {
      base[item.id] = null;
    });
    return base;
  });
  const [checked, setChecked] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const poolItems = config.items.filter((item) => assignments[item.id] === null);
  const binsWithItems = config.bins.map((bin) => ({
    ...bin,
    items: config.items.filter((item) => assignments[item.id] === bin.id),
  }));
  const allPlaced = config.items.every((item) => assignments[item.id] !== null);
  const allCorrect = config.items.every((item) => assignments[item.id] === item.binId);

  const handleDrop = (binId: string, event: React.DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('text/plain');
    if (!itemId) return;
    setAssignments((prev) => ({ ...prev, [itemId]: binId === 'pool' ? null : binId }));
    setChecked(false);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <KangurLessonVisual
        accent={accent}
        caption={config.svgLabel}
        maxWidthClassName='max-w-full'
      >
        <SortGameSvg />
      </KangurLessonVisual>
      <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
        <div className='flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent={accent}>{config.title}</KangurLessonChip>
          <span className='text-xs font-semibold text-slate-500'>
            {config.items.length - poolItems.length}/{config.items.length}
          </span>
        </div>
        <KangurLessonCaption className='mt-2 text-left'>{config.prompt}</KangurLessonCaption>
      </KangurLessonCallout>
      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
        {binsWithItems.map((bin) => (
          <div
            key={bin.id}
            className='soft-card border border-slate-200/80 bg-white px-4 py-3'
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(bin.id, event)}
          >
            <p className='text-sm font-semibold text-slate-900'>{bin.label}</p>
            <div className='mt-3 space-y-2'>
              {bin.items.length ? (
                bin.items.map((item) => (
                  <DraggableToken
                    key={item.id}
                    draggingId={draggingId}
                    item={item}
                    onDragStart={setDraggingId}
                    onDragEnd={() => setDraggingId(null)}
                    isCorrect={checked ? item.binId === bin.id : undefined}
                  />
                ))
              ) : (
                <p className='text-xs text-slate-400'>Drop here</p>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-[1.4fr_1fr]`}>
        <div
          className='soft-card border border-slate-200/80 bg-slate-50 px-4 py-3'
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => handleDrop('pool', event)}
        >
          <p className='text-sm font-semibold text-slate-900'>Pool</p>
          <div className='mt-3 flex flex-wrap gap-2'>
            {poolItems.map((item) => (
              <DraggableToken
                key={item.id}
                draggingId={draggingId}
                item={item}
                onDragStart={setDraggingId}
                onDragEnd={() => setDraggingId(null)}
                isCorrect={checked ? false : undefined}
              />
            ))}
            {!poolItems.length ? (
              <p className='text-xs text-slate-400'>Brak kart w puli.</p>
            ) : null}
          </div>
        </div>
        <KangurLessonInset accent={accent} className='flex flex-col gap-3'>
          <KangurLessonCaption className='text-left text-slate-700'>
            Przeciągnij karty, a potem sprawdź wynik.
          </KangurLessonCaption>
          <KangurButton
            variant={allCorrect && checked ? 'success' : 'surface'}
            disabled={!allPlaced}
            onClick={() => setChecked(true)}
          >
            {allCorrect && checked ? 'Gotowe' : 'Sprawdź'}
          </KangurButton>
          {checked && allCorrect ? (
            <KangurLessonCaption className='text-left text-emerald-800'>
              {config.success}
            </KangurLessonCaption>
          ) : null}
          {checked && !allCorrect ? (
            <KangurLessonCaption className='text-left text-rose-700'>
              Sprawdź niepasujące karty i spróbuj ponownie.
            </KangurLessonCaption>
          ) : null}
        </KangurLessonInset>
      </div>
    </KangurLessonStack>
  );
}

function DraggableToken({
  draggingId,
  item,
  onDragEnd,
  onDragStart,
  isCorrect,
}: {
  draggingId: string | null;
  item: SortGameItem;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  isCorrect?: boolean;
}): React.JSX.Element {
  const isDragging = draggingId === item.id;
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        onDragStart(item.id);
      }}
      onDragEnd={onDragEnd}
      className={cn(
        'cursor-grab rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition',
        isDragging ? 'opacity-60' : '',
        isCorrect === undefined
          ? 'border-slate-200/80 bg-white text-slate-900'
          : isCorrect
            ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
            : 'border-rose-200/80 bg-rose-50 text-rose-900'
      )}
      style={{ touchAction: 'none' }}
      aria-label={item.label}
    >
      {item.label}
    </div>
  );
}

function SortGameSvg(): React.JSX.Element {
  return (
    <svg
      aria-label='Animacja: karty wpadają do koszyków.'
      className='h-auto w-full'
      role='img'
      viewBox='0 0 360 120'
    >
      <style>{`
        .bin { fill: #f8fafc; stroke: #e2e8f0; stroke-width: 2; }
        .card { fill: #e0f2fe; animation: drop 3s ease-in-out infinite; }
        .card-2 { animation-delay: 0.8s; }
        @keyframes drop {
          0% { transform: translateY(-10px); opacity: 0.5; }
          50% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-10px); opacity: 0.5; }
        }
        @media (prefers-reduced-motion: reduce) {
          .card { animation: none; }
        }
      `}</style>
      <rect className='bin' height='60' rx='12' width='120' x='30' y='30' />
      <rect className='bin' height='60' rx='12' width='120' x='210' y='30' />
      <rect className='card' height='16' rx='6' width='60' x='60' y='40' />
      <rect className='card card-2' height='16' rx='6' width='60' x='240' y='60' />
    </svg>
  );
}
