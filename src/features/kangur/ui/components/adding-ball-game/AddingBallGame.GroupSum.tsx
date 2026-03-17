'use client';

import React, { useState } from 'react';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurButton,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type {
  BallItem,
  GroupSlotId,
  GroupSumRound,
  GroupSumState,
} from './types';
import {
  BALL_POOL_CLASSNAME,
  createBalls,
  getRectDropZoneSurface,
  isGroupSlotId,
  moveBetweenLists,
  removeBallById,
  reorderWithinList,
} from './utils';
import { DraggableBall } from './AddingBallGame.Shared';

export function GroupSum({
  round,
  onResult,
}: {
  round: GroupSumRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const total = round.a + round.b;
  const [state, setState] = useState<GroupSumState>(() => ({
    pool: createBalls(total),
    group1: [],
    group2: [],
  }));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);
  const [selectedBallId, setSelectedBallId] = useState<string | null>(null);

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;

    const { source, destination } = result;
    if (!destination) return;
    if (!isGroupSlotId(source.droppableId) || !isGroupSlotId(destination.droppableId)) {
      return;
    }

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
    const group1Count = state.group1.length;
    const group2Count = state.group2.length;
    const ok =
      (group1Count === round.a && group2Count === round.b) ||
      (group1Count === round.b && group2Count === round.a);
    setCorrect(ok);
    setChecked(true);
    setSelectedBallId(null);
    setTimeout(() => onResult(ok), 1400);
  };

  const selectedBall =
    selectedBallId
      ? [...state.pool, ...state.group1, ...state.group2].find((ball) => ball.id === selectedBallId) ??
        null
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
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <p className='text-lg font-bold [color:var(--kangur-page-text)]'>
          Podziel {total} piłek na dwie grupy sumujące się do{' '}
          <span className='text-orange-500'>{round.target}</span>
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
                        'min-h-[52px] min-w-[80px] w-full max-w-[160px]'
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
                            setSelectedBallId((current) => (current === ball.id ? null : ball.id))
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
              className={BALL_POOL_CLASSNAME}
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
            className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
            role='status'
            aria-live='polite'
            aria-atomic='true'
          >
            {selectedBall
              ? `Wybrana piłka: ${selectedBall.num}`
              : 'Wybierz piłkę, aby przenieść ją klawiaturą.'}
          </span>
          <KangurButton
            size='sm'
            type='button'
            variant='surface'
            onClick={() => moveSelectedBallTo('group1')}
            disabled={!selectedBall || checked}
          >
            Do grupy 1
          </KangurButton>
          <KangurButton
            size='sm'
            type='button'
            variant='surface'
            onClick={() => moveSelectedBallTo('group2')}
            disabled={!selectedBall || checked}
          >
            Do grupy 2
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
            disabled={state.group1.length === 0 || state.group2.length === 0}
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
            {correct ? '🎉 Brawo!' : `❌ Nie tym razem! (${round.a} i ${round.b})`}
          </motion.div>
        )}
      </div>
    </DragDropContext>
  );
}
