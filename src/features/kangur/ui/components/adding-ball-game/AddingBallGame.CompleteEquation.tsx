'use client';

import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { cn } from '@/features/kangur/shared/utils';
import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';
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
  CompleteEquationRound,
  CompleteEquationState,
  CompleteSlotId,
} from './types';
import {
  BALL_POOL_CLASSNAME,
  createBalls,
  isCompleteSlotId,
  moveBetweenLists,
  removeBallById,
  reorderWithinList,
} from './utils';
import { DraggableBall, SlotZone } from './AddingBallGame.Shared';

export function CompleteEquation({
  round,
  onResult,
}: {
  round: CompleteEquationRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const [state, setState] = useState<CompleteEquationState>(() => ({
    pool: createBalls(round.a + round.b),
    slotA: [],
    slotB: [],
  }));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [selectedBallId, setSelectedBallId] = useState<string | null>(null);
  const slotALabel = `Grupa A (${round.a})`;
  const slotBLabel = `Grupa B (${round.b})`;

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;

    const { source, destination } = result;
    if (!destination) return;
    if (!isCompleteSlotId(source.droppableId) || !isCompleteSlotId(destination.droppableId)) {
      return;
    }
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }
    setSelectedBallId(null);

    const sourceId = source.droppableId;
    const destinationId = destination.droppableId;

    if (sourceId === destinationId) {
      setState((prev) => ({
        ...prev,
        [sourceId]: reorderWithinList(prev[sourceId], source.index, destination.index),
      }));
      return;
    }

    setState((prev) => {
      const moved = moveBetweenLists(
        prev[sourceId],
        prev[destinationId],
        source.index,
        destination.index
      );

      return {
        ...prev,
        [sourceId]: moved.source,
        [destinationId]: moved.destination,
      };
    });
  };

  const check = (): void => {
    const ok = state.slotA.length === round.a && state.slotB.length === round.b;
    setCorrect(ok);
    setChecked(true);
    setSelectedBallId(null);
    setTimeout(() => onResult(ok), 1400);
  };

  const selectedBall =
    selectedBallId
      ? [...state.pool, ...state.slotA, ...state.slotB].find((ball) => ball.id === selectedBallId) ??
        null
      : null;

  const moveSelectedBallTo = (destinationId: CompleteSlotId): void => {
    if (checked || !selectedBallId) return;
    setState((prev) => {
      const zones: CompleteSlotId[] = ['pool', 'slotA', 'slotB'];
      let moved: BallItem | null = null;
      const nextState = { ...prev };
      zones.forEach((zone) => {
        const { updated, ball } = removeBallById(prev[zone], selectedBallId);
        nextState[zone] = updated;
        if (ball) {
          moved = ball;
        }
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
          Przeciągnij piłki tak, żeby uzupełnić równanie:
        </p>
        <div className='flex items-center kangur-panel-gap flex-wrap justify-center'>
          <SlotZone
            id='slotA'
            items={state.slotA}
            label={slotALabel}
            checked={checked}
            correct={correct}
            selectedBallId={selectedBallId}
            onActivateZone={() => moveSelectedBallTo('slotA')}
            onSelectBall={(id) =>
              setSelectedBallId((current) => (current === id ? null : id))
            }
          />
          <span className='text-3xl font-extrabold [color:var(--kangur-page-muted-text)]'>
            +
          </span>
          <SlotZone
            id='slotB'
            items={state.slotB}
            label={slotBLabel}
            checked={checked}
            correct={correct}
            selectedBallId={selectedBallId}
            onActivateZone={() => moveSelectedBallTo('slotB')}
            onSelectBall={(id) =>
              setSelectedBallId((current) => (current === id ? null : id))
            }
          />
          <span className='text-3xl font-extrabold [color:var(--kangur-page-muted-text)]'>
            = {round.target}
          </span>
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
              onClick={() => {
                if (!isCoarsePointer || checked || !selectedBall) return;
                moveSelectedBallTo('pool');
              }}
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
                    setSelectedBallId((current) => (current === ball.id ? null : ball.id))
                  }
                />
              ))}
              {provided.placeholder}
            </KangurInfoCard>
          )}
        </Droppable>
        <div className='flex flex-wrap items-center justify-center gap-2 text-xs'>
          <span
            data-testid='adding-ball-complete-touch-hint'
            className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
            role='status'
            aria-live='polite'
            aria-atomic='true'
          >
            {selectedBall
              ? isCoarsePointer
                ? `Wybrana piłka: ${selectedBall.num}. Dotknij ${slotALabel}, ${slotBLabel} albo pulę.`
                : `Wybrana piłka: ${selectedBall.num}`
              : isCoarsePointer
                ? `Dotknij piłkę, a potem ${slotALabel}, ${slotBLabel} albo pulę.`
                : 'Wybierz piłkę, aby przenieść ją klawiaturą.'}
          </span>
          <KangurButton
            size='sm'
            type='button'
            variant='surface'
            onClick={() => moveSelectedBallTo('slotA')}
            disabled={!selectedBall || checked}
          >
            Do {slotALabel}
          </KangurButton>
          <KangurButton
            size='sm'
            type='button'
            variant='surface'
            onClick={() => moveSelectedBallTo('slotB')}
            disabled={!selectedBall || checked}
          >
            Do {slotBLabel}
          </KangurButton>
          <KangurButton
            size='sm'
            type='button'
            variant='surface'
            onClick={() => moveSelectedBallTo('pool')}
            disabled={!selectedBall || checked}
          >
            Do puli
          </KangurButton>
        </div>

        {!checked && (
          <KangurButton
            disabled={state.slotA.length === 0 || state.slotB.length === 0}
            onClick={check}
            size='lg'
            variant='primary'
          >
            Sprawdź ✓
          </KangurButton>
        )}
        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-xl font-extrabold ${correct ? 'text-green-600' : 'text-red-500'}`}
          >
            {correct ? '🎉 Brawo!' : `❌ Nie tym razem! A=${round.a}, B=${round.b}`}
          </motion.div>
        )}
      </div>
    </KangurDragDropContext>
  );
}
