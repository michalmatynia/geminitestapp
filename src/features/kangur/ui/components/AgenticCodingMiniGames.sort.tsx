'use client';

import React, { useState, createContext, useContext } from 'react';

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
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

import { createAgenticCodingMiniGameComponent } from './AgenticCodingMiniGames.factory';
import type { SortGameConfig, SortGameItem } from './AgenticCodingMiniGames.types';

type AgenticSortGameContextValue = {
  allCorrect: boolean;
  allPlaced: boolean;
  checked: boolean;
  draggingId: string | null;
  isCoarsePointer: boolean;
  selectedItemId: string | null;
  successMessage: string;
  onActivateBin: (binId: string | null) => void;
  onCheck: () => void;
  onDropToBin: (binId: string, event: React.DragEvent<HTMLDivElement>) => void;
  onSelectItem: (id: string | null) => void;
  onStartDragging: (id: string | null) => void;
};

const AgenticSortGameContext = createContext<AgenticSortGameContextValue | null>(null);

function useAgenticSortGame() {
  const context = useContext(AgenticSortGameContext);
  if (!context) {
    throw new Error('useAgenticSortGame must be used within AgenticSortGameContext.Provider');
  }
  return context;
}

type AgenticSortGameProps = {
  accent: KangurAccent;
  config: SortGameConfig;
};

type AgenticSortGameModel = ReturnType<typeof useAgenticSortGameModel>;

function useAgenticSortGameModel(config: SortGameConfig) {
  const isCoarsePointer = useKangurCoarsePointer();
  const [assignments, setAssignments] = useState<Record<string, string | null>>(() => {
    const base: Record<string, string | null> = {};
    config.items.forEach((item) => {
      base[item.id] = null;
    });
    return base;
  });
  const [checked, setChecked] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const poolItems = config.items.filter((item) => assignments[item.id] === null);
  const selectedItem =
    selectedItemId !== null
      ? config.items.find((item) => item.id === selectedItemId) ?? null
      : null;
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
    setSelectedItemId(null);
  };

  const handleAssign = (itemId: string, binId: string | null): void => {
    setAssignments((prev) => ({ ...prev, [itemId]: binId }));
    setChecked(false);
    setSelectedItemId(null);
  };

  const handleBinActivate = (binId: string | null): void => {
    if (!selectedItemId) return;
    handleAssign(selectedItemId, binId);
  };

  const touchHint = selectedItemId
    ? 'Dotknij wybraną kategorię, aby odłożyć kartę.'
    : 'Dotknij kartę, a potem dotknij kategorię.';
  const keyboardHint = selectedItem
    ? `Wybrana karta: ${selectedItem.label}. Przejdź do kategorii i naciśnij Enter albo Spację.`
    : 'Przeciągnij kartę albo wybierz ją klawiaturą i przenieś do kategorii Enterem albo Spacją.';

  return {
    allCorrect,
    allPlaced,
    assignments,
    binsWithItems,
    checked,
    draggingId,
    handleAssign,
    handleBinActivate,
    handleDrop,
    isCoarsePointer,
    keyboardHint,
    poolItems,
    selectedItemId,
    setChecked,
    setDraggingId,
    setSelectedItemId,
    touchHint,
  };
}

function renderAgenticSortGame(
  { accent, config }: AgenticSortGameProps,
  model: AgenticSortGameModel
): React.JSX.Element {
  const {
    allCorrect,
    allPlaced,
    binsWithItems,
    checked,
    draggingId,
    handleBinActivate,
    handleDrop,
    isCoarsePointer,
    keyboardHint,
    poolItems,
    selectedItemId,
    setChecked,
    setDraggingId,
    setSelectedItemId,
    touchHint,
  } = model;

  return (
    <AgenticSortGameContext.Provider
      value={{
        allCorrect,
        allPlaced,
        checked,
        draggingId,
        isCoarsePointer,
        selectedItemId,
        successMessage: config.success,
        onActivateBin: handleBinActivate,
        onCheck: () => setChecked(true),
        onDropToBin: handleDrop,
        onSelectItem: setSelectedItemId,
        onStartDragging: setDraggingId,
      }}
    >
      <KangurLessonStack align='start' className='w-full'>
        <KangurLessonVisual
          accent={accent}
          caption={config.svgLabel}
          maxWidthClassName='max-w-full'
        >
          <SortGameSvg />
        </KangurLessonVisual>
        <AgenticSortGameCallout
          accent={accent}
          config={config}
          isCoarsePointer={isCoarsePointer}
          keyboardHint={keyboardHint}
          placedCount={config.items.length - poolItems.length}
          touchHint={touchHint}
        />
        <AgenticSortBinsGrid binsWithItems={binsWithItems} />
        <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-[1.4fr_1fr]`}>
          <AgenticSortPool poolItems={poolItems} />
          <AgenticSortActionsPanel
            accent={accent}
          />
        </div>
      </KangurLessonStack>
    </AgenticSortGameContext.Provider>
  );
}

export const AgenticSortGame = createAgenticCodingMiniGameComponent({
  displayName: 'AgenticSortGame',
  render: renderAgenticSortGame,
  useModel: useAgenticSortGameModel,
});

type AgenticSortBinRecord = AgenticSortGameModel['binsWithItems'][number];

function resolveAgenticSortHint({
  isCoarsePointer,
  touchHint,
  keyboardHint,
}: {
  isCoarsePointer: boolean;
  touchHint: string;
  keyboardHint: string;
}): { testId: string; text: string } {
  return isCoarsePointer
    ? { testId: 'agentic-sort-touch-hint', text: touchHint }
    : { testId: 'agentic-sort-keyboard-hint', text: keyboardHint };
}

function resolveAgenticSortDropZoneClassName({
  isCoarsePointer,
  selectedItemId,
  tone,
}: {
  isCoarsePointer: boolean;
  selectedItemId: string | null;
  tone: 'surface' | 'pool';
}): string {
  return cn(
    'soft-card border border-slate-200/80 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
    tone === 'pool' ? 'bg-slate-50' : 'bg-white',
    isCoarsePointer ? 'touch-manipulation transition-colors' : null,
    selectedItemId ? 'ring-2 ring-amber-300/70 ring-offset-2 ring-offset-white' : null
  );
}

function shouldActivateSortDropZone(event: React.KeyboardEvent<HTMLDivElement>): boolean {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return false;
  }
  event.preventDefault();
  return true;
}

function resolveAgenticSortResultMessage({
  checked,
  allCorrect,
  successMessage,
}: {
  checked: boolean;
  allCorrect: boolean;
  successMessage: string;
}): { className: string; text: string } | null {
  if (checked && allCorrect) {
    return { className: 'text-left text-emerald-800', text: successMessage };
  }
  if (checked) {
    return {
      className: 'text-left text-rose-700',
      text: 'Sprawdź niepasujące karty i spróbuj ponownie.',
    };
  }
  return null;
}

function resolveAgenticSortActionHint(isCoarsePointer: boolean): string {
  return isCoarsePointer
    ? 'Dotknij kartę, dotknij kategorię i dopiero potem sprawdź wynik.'
    : 'Przeciągnij karty albo wybierz kartę i przenieś ją klawiaturą do kategorii, a potem sprawdź wynik.';
}

function AgenticSortGameCallout({
  accent,
  config,
  isCoarsePointer,
  keyboardHint,
  placedCount,
  touchHint,
}: {
  accent: KangurAccent;
  config: SortGameConfig;
  isCoarsePointer: boolean;
  keyboardHint: string;
  placedCount: number;
  touchHint: string;
}): React.JSX.Element {
  const hint = resolveAgenticSortHint({ isCoarsePointer, touchHint, keyboardHint });

  return (
    <KangurLessonCallout accent={accent} padding='sm' className='text-left'>
      <div className='flex flex-wrap items-center gap-2'>
        <KangurLessonChip accent={accent}>{config.title}</KangurLessonChip>
        <span className='text-xs font-semibold text-slate-500'>
          {placedCount}/{config.items.length}
        </span>
      </div>
      <KangurLessonCaption className='mt-2 text-left'>{config.prompt}</KangurLessonCaption>
      <KangurLessonCaption className='mt-2 text-left' data-testid={hint.testId}>
        {hint.text}
      </KangurLessonCaption>
    </KangurLessonCallout>
  );
}

function AgenticSortBin({
  bin,
}: {
  bin: AgenticSortBinRecord;
}): React.JSX.Element {
  const {
    checked,
    isCoarsePointer,
    onActivateBin,
    onDropToBin,
    selectedItemId,
  } = useAgenticSortGame();

  return (
    <div
      className={resolveAgenticSortDropZoneClassName({
        isCoarsePointer,
        selectedItemId,
        tone: 'surface',
      })}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropToBin(bin.id, event)}
      onClick={() => onActivateBin(bin.id)}
      onKeyDown={(event) => {
        if (!shouldActivateSortDropZone(event)) {
          return;
        }
        onActivateBin(bin.id);
      }}
      data-testid={`agentic-sort-bin-${bin.id}`}
      role='button'
      tabIndex={selectedItemId ? 0 : -1}
      aria-label={`Przenieś wybraną kartę do kategorii ${bin.label}`}
    >
      <p className='text-sm font-semibold text-slate-900'>{bin.label}</p>
      <div className='mt-3 space-y-2'>
        {bin.items.length ? (
          bin.items.map((item) => (
            <DraggableToken
              key={item.id}
              item={item}
              isCorrect={checked ? item.binId === bin.id : undefined}
            />
          ))
        ) : (
          <p className='text-xs text-slate-400'>Drop here</p>
        )}
      </div>
    </div>
  );
}

function AgenticSortBinsGrid({
  binsWithItems,
}: {
  binsWithItems: AgenticSortBinRecord[];
}): React.JSX.Element {
  return (
    <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} sm:grid-cols-2`}>
      {binsWithItems.map((bin) => (
        <AgenticSortBin
          key={bin.id}
          bin={bin}
        />
      ))}
    </div>
  );
}

function AgenticSortPool({
  poolItems,
}: {
  poolItems: SortGameItem[];
}): React.JSX.Element {
  const {
    checked,
    isCoarsePointer,
    onActivateBin,
    onDropToBin,
    selectedItemId,
  } = useAgenticSortGame();

  return (
    <div
      className={resolveAgenticSortDropZoneClassName({
        isCoarsePointer,
        selectedItemId,
        tone: 'pool',
      })}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropToBin('pool', event)}
      onClick={() => onActivateBin(null)}
      onKeyDown={(event) => {
        if (!shouldActivateSortDropZone(event)) {
          return;
        }
        onActivateBin(null);
      }}
      data-testid='agentic-sort-pool'
      role='button'
      tabIndex={selectedItemId ? 0 : -1}
      aria-label='Przenieś wybraną kartę z powrotem do puli'
    >
      <p className='text-sm font-semibold text-slate-900'>Pool</p>
      <div className='mt-3 flex flex-wrap gap-2'>
        {poolItems.map((item) => (
          <DraggableToken
            key={item.id}
            item={item}
            isCorrect={checked ? false : undefined}
          />
        ))}
        {!poolItems.length ? <p className='text-xs text-slate-400'>Brak kart w puli.</p> : null}
      </div>
    </div>
  );
}

function AgenticSortActionsPanel({
  accent,
}: {
  accent: KangurAccent;
}): React.JSX.Element {
  const { allCorrect, allPlaced, checked, isCoarsePointer, onCheck, successMessage } = useAgenticSortGame();
  const result = resolveAgenticSortResultMessage({ checked, allCorrect, successMessage });

  return (
    <KangurLessonInset accent={accent} className='flex flex-col gap-3'>
      <KangurLessonCaption className='text-left text-slate-700'>
        {resolveAgenticSortActionHint(isCoarsePointer)}
      </KangurLessonCaption>
      <KangurButton
        variant={allCorrect && checked ? 'success' : 'surface'}
        disabled={!allPlaced}
        onClick={onCheck}
        className={isCoarsePointer ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]' : undefined}
      >
        {allCorrect && checked ? 'Gotowe' : 'Sprawdź'}
      </KangurButton>
      {result ? <KangurLessonCaption className={result.className}>{result.text}</KangurLessonCaption> : null}
    </KangurLessonInset>
  );
}

function DraggableToken({
  item,
  isCorrect,
}: {
  item: SortGameItem;
  isCorrect?: boolean;
}): React.JSX.Element {
  const {
    draggingId,
    isCoarsePointer,
    selectedItemId,
    onSelectItem,
    onStartDragging,
  } = useAgenticSortGame();

  const isSelected = selectedItemId === item.id;
  const isDragging = draggingId === item.id;
  const stateClassName = cn(
    'rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm transition',
    isDragging ? 'opacity-60' : '',
    isCorrect === undefined
      ? 'border-slate-200/80 bg-white text-slate-900'
      : isCorrect
        ? 'border-emerald-200/80 bg-emerald-50 text-emerald-900'
        : 'border-rose-200/80 bg-rose-50 text-rose-900',
    isSelected ? 'ring-2 ring-amber-300/70 ring-offset-2 ring-offset-white' : null
  );
  if (isCoarsePointer) {
    return (
      <button
        type='button'
        aria-pressed={isSelected}
        onClick={() => onSelectItem(isSelected ? null : item.id)}
        className={cn(
          stateClassName,
          'w-full text-left touch-manipulation select-none min-h-[3.5rem] active:scale-[0.98]'
        )}
      >
        {item.label}
      </button>
    );
  }
  return (
    <button
      type='button'
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData('text/plain', item.id);
        onStartDragging(item.id);
      }}
      onDragEnd={() => onStartDragging(null)}
      onClick={(event) => {
        event.stopPropagation();
        if (isDragging) return;
        onSelectItem(isSelected ? null : item.id);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        if (isDragging) return;
        onSelectItem(isSelected ? null : item.id);
      }}
      className={cn(
        stateClassName,
        'cursor-grab text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white'
      )}
      style={{ touchAction: 'none' }}
      aria-label={item.label}
      aria-pressed={isSelected}
    >
      {item.label}
    </button>
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
