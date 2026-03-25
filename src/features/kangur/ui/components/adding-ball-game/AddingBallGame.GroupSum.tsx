'use client';

import React, { useCallback, useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurButton,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  BallItem,
  GroupSlotId,
  GroupSumRound,
  GroupSumState,
} from './types';
import {
  BALL_POOL_CLASSNAME,
  createBalls,
  formatAcceptedGroupPair,
  formatSubmittedGroupPair,
  getRectDropZoneSurface,
  isGroupSlotId,
  isAcceptedCountSplit,
  moveBetweenLists,
  removeBallById,
  reorderWithinList,
} from './utils';
import { DraggableBall, PointerDropZone } from './AddingBallGame.Shared';
import { PointerDragProvider } from './PointerDragProvider';

function useGroupSumState(round: GroupSumRound) {
  const total = round.a + round.b;
  const [state, setState] = useState<GroupSumState>(() => ({
    pool: createBalls(total),
    group1: [],
    group2: [],
  }));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const moveBallTo = useCallback(
    (ballId: string, sourceZoneId: string, destinationId: string): void => {
      if (checked) return;
      if (!isGroupSlotId(sourceZoneId) || !isGroupSlotId(destinationId)) return;
      if (sourceZoneId === destinationId) return;

      setState((prev) => {
        const { updated: sourceUpdated, ball } = removeBallById(prev[sourceZoneId], ballId);
        if (!ball) return prev;
        return {
          ...prev,
          [sourceZoneId]: sourceUpdated,
          [destinationId]: [...prev[destinationId], ball],
        };
      });
    },
    [checked],
  );

  const check = useCallback(
    (onResult: (correct: boolean) => void): void => {
      const ok = isAcceptedCountSplit(state.group1.length, state.group2.length, round.a, round.b);
      setCorrect(ok);
      setChecked(true);
      setTimeout(() => onResult(ok), 1400);
    },
    [round.a, round.b, state.group1.length, state.group2.length],
  );

  return { state, setState, checked, correct, moveBallTo, check, total };
}

// ---------------------------------------------------------------------------
// Shared result banner
// ---------------------------------------------------------------------------

function GroupSumResult({
  round,
  correct,
  submittedGroupPair,
}: {
  round: GroupSumRound;
  correct: boolean;
  submittedGroupPair: string;
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`text-xl font-extrabold ${correct ? 'text-green-600' : 'text-red-500'}`}
    >
      {correct
        ? `🎉 Brawo! Pasują grupy ${round.a} i ${round.b}${round.a !== round.b ? ` albo ${round.b} i ${round.a}` : ''}.`
        : `❌ Spróbuj jeszcze raz! Masz grupy ${submittedGroupPair}, a szukamy ${round.a} i ${round.b}${round.a !== round.b ? ` albo ${round.b} i ${round.a}` : ''}.`}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Mobile (pointer drag) layout
// ---------------------------------------------------------------------------

function GroupSumMobile({
  round,
  onResult,
}: {
  round: GroupSumRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const { state, checked, correct, moveBallTo, check, total } = useGroupSumState(round);
  const acceptedGroupPair = formatAcceptedGroupPair(round.a, round.b);
  const submittedGroupPair = formatSubmittedGroupPair(state.group1.length, state.group2.length);

  return (
    <PointerDragProvider onDrop={moveBallTo} disabled={checked}>
      <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <p className='text-lg font-bold [color:var(--kangur-page-text)]'>
          Podziel {total} piłek na dwie grupy: <span className='text-orange-500'>{acceptedGroupPair}</span>
        </p>
        <p
          className='text-sm text-center [color:var(--kangur-page-muted-text)]'
          data-testid='adding-ball-group-solution-hint'
        >
          {round.a !== round.b
            ? `Kolejność nie ma znaczenia, więc ${round.a} i ${round.b} albo ${round.b} i ${round.a} są poprawne.`
            : `Obie grupy powinny mieć po ${round.a} piłki.`}
        </p>
        <p
          className='text-xs text-center font-semibold uppercase tracking-[0.18em] text-slate-500'
          data-testid='adding-ball-group-unit-hint'
        >
          Każda piłka to 1.
        </p>

        <div className='flex kangur-panel-gap flex-wrap justify-center'>
          <PointerDropZone id='group1' items={state.group1} label='Grupa 1' checked={checked} correct={correct} small />
          <PointerDropZone id='group2' items={state.group2} label='Grupa 2' checked={checked} correct={correct} small />
        </div>

        <PointerDropZone id='pool' items={state.pool} label='Pula' checked={checked} correct={false} />

        <p
          data-testid='adding-ball-group-touch-hint'
          className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
        >
          Przeciągnij piłkę do grupy 1, grupy 2 albo z powrotem do puli.
        </p>

        {!checked && (
          <KangurButton
            disabled={state.group1.length === 0 || state.group2.length === 0}
            onClick={() => check(onResult)}
            size='lg'
            variant='primary'
          >
            Sprawdź ✓
          </KangurButton>
        )}
        {checked && (
          <GroupSumResult round={round} correct={correct} submittedGroupPair={submittedGroupPair} />
        )}
      </div>
    </PointerDragProvider>
  );
}

// ---------------------------------------------------------------------------
// Desktop (hello-pangea/dnd) layout
// ---------------------------------------------------------------------------

function GroupSumDesktop({
  round,
  onResult,
}: {
  round: GroupSumRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const { state, setState, checked, correct, check, total } = useGroupSumState(round);
  const [selectedBallId, setSelectedBallId] = useState<string | null>(null);
  const acceptedGroupPair = formatAcceptedGroupPair(round.a, round.b);
  const submittedGroupPair = formatSubmittedGroupPair(state.group1.length, state.group2.length);

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;
    if (!isGroupSlotId(source.droppableId) || !isGroupSlotId(destination.droppableId)) return;

    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;

    if (sourceId === destinationId) {
      setState((prev) => ({
        ...prev,
        [sourceId]: reorderWithinList(prev[sourceId], source.index, destination.index),
      }));
      return;
    }
    setSelectedBallId(null);
    setState((prev) => {
      const moved = moveBetweenLists(prev[sourceId], prev[destinationId], source.index, destination.index);
      return { ...prev, [sourceId]: moved.source, [destinationId]: moved.destination };
    });
  };

  const selectedBall =
    selectedBallId
      ? [...state.pool, ...state.group1, ...state.group2].find((b) => b.id === selectedBallId) ?? null
      : null;

  const moveSelectedBallTo = (destinationId: GroupSlotId): void => {
    if (checked || !selectedBallId) return;
    setState((prev) => {
      const zones: GroupSlotId[] = ['pool', 'group1', 'group2'];
      let moved: BallItem | null = null;
      const nextState = { ...prev };
      zones.forEach((zone) => {
        const { updated, ball } = removeBallById(prev[zone], selectedBallId);
        nextState[zone] = updated;
        if (ball) moved = ball;
      });
      if (!moved) return prev;
      nextState[destinationId] = [...nextState[destinationId], moved];
      return nextState;
    });
    setSelectedBallId(null);
  };

  return (
    <KangurDragDropContext onDragEnd={onDragEnd}>
      <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <p className='text-lg font-bold [color:var(--kangur-page-text)]'>
          Podziel {total} piłek na dwie grupy: <span className='text-orange-500'>{acceptedGroupPair}</span>
        </p>
        <p
          className='text-sm text-center [color:var(--kangur-page-muted-text)]'
          data-testid='adding-ball-group-solution-hint'
        >
          {round.a !== round.b
            ? `Kolejność nie ma znaczenia, więc ${round.a} i ${round.b} albo ${round.b} i ${round.a} są poprawne.`
            : `Obie grupy powinny mieć po ${round.a} piłki.`}
        </p>
        <p
          className='text-xs text-center font-semibold uppercase tracking-[0.18em] text-slate-500'
          data-testid='adding-ball-group-unit-hint'
        >
          Każda piłka to 1.
        </p>

        <div className='flex kangur-panel-gap flex-wrap justify-center'>
          {(
            [
              { id: 'group1', label: 'Grupa 1' },
              { id: 'group2', label: 'Grupa 2' },
            ] as const
          ).map((group) => (
            <Droppable key={group.id} droppableId={group.id} direction='horizontal'>
              {(provided, snapshot) => {
                const surface = getRectDropZoneSurface({
                  isDraggingOver: snapshot.isDraggingOver,
                  checked,
                  correct,
                });
                return (
                  <div>
                    <p className='mb-1 text-center text-xs [color:var(--kangur-page-muted-text)]'>
                      {group.label}
                    </p>
                    <KangurInfoCard
                      ref={provided.innerRef}
                      accent={surface.accent}
                      className={cn(
                        surface.className,
                        'min-h-[52px] min-w-[80px] w-full max-w-[160px] touch-manipulation select-none transition',
                        selectedBall && 'bg-amber-50/60'
                      )}
                      data-testid={`adding-ball-${group.id}`}
                      padding='sm'
                      tone={surface.tone}
                      {...provided.droppableProps}
                    >
                      {state[group.id].map((ball, i) => (
                        <DraggableBall
                          key={ball.id}
                          ball={ball}
                          index={i}
                          isDragDisabled={checked}
                          small
                          isSelected={selectedBallId === ball.id}
                          onSelect={() =>
                            setSelectedBallId((c) => (c === ball.id ? null : ball.id))
                          }
                        />
                      ))}
                      {provided.placeholder}
                    </KangurInfoCard>
                  </div>
                );
              }}
            </Droppable>
          ))}
        </div>

        <Droppable droppableId='pool' direction='horizontal'>
          {(provided) => (
            <KangurInfoCard
              ref={provided.innerRef}
              accent='slate'
              className={cn(
                BALL_POOL_CLASSNAME,
                'touch-manipulation select-none transition',
                selectedBall && 'border border-amber-200 bg-amber-50/50'
              )}
              data-testid='adding-ball-pool'
              padding='sm'
              tone='neutral'
              {...provided.droppableProps}
            >
              {state.pool.map((ball, i) => (
                <DraggableBall
                  key={ball.id}
                  ball={ball}
                  index={i}
                  isDragDisabled={checked}
                  isSelected={selectedBallId === ball.id}
                  onSelect={() =>
                    setSelectedBallId((c) => (c === ball.id ? null : ball.id))
                  }
                />
              ))}
              {provided.placeholder}
            </KangurInfoCard>
          )}
        </Droppable>

        <div className='flex flex-wrap items-center justify-center gap-2 text-xs'>
          <span
            data-testid='adding-ball-group-touch-hint'
            className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
            role='status'
            aria-live='polite'
            aria-atomic='true'
          >
            {selectedBall
              ? `Wybrana piłka: ${selectedBall.num}`
              : 'Wybierz piłkę, aby przenieść ją klawiaturą.'}
          </span>
          <KangurButton size='sm' type='button' variant='surface' onClick={() => moveSelectedBallTo('group1')} disabled={!selectedBall || checked}>
            Do grupy 1
          </KangurButton>
          <KangurButton size='sm' type='button' variant='surface' onClick={() => moveSelectedBallTo('group2')} disabled={!selectedBall || checked}>
            Do grupy 2
          </KangurButton>
          <KangurButton size='sm' type='button' variant='surface' onClick={() => moveSelectedBallTo('pool')} disabled={!selectedBall || checked}>
            Do puli
          </KangurButton>
        </div>

        {!checked && (
          <KangurButton
            disabled={state.group1.length === 0 || state.group2.length === 0}
            onClick={() => check(onResult)}
            size='lg'
            variant='primary'
          >
            Sprawdź ✓
          </KangurButton>
        )}
        {checked && (
          <GroupSumResult round={round} correct={correct} submittedGroupPair={submittedGroupPair} />
        )}
      </div>
    </KangurDragDropContext>
  );
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function GroupSum({
  round,
  onResult,
}: {
  round: GroupSumRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();

  if (isCoarsePointer) {
    return <GroupSumMobile round={round} onResult={onResult} />;
  }

  return <GroupSumDesktop round={round} onResult={onResult} />;
}
