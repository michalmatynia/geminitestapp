'use client';

import React, { useState } from 'react';
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
  PickAnswerRound,
} from './types';
import {
  BALL_COLORS,
  BALL_POOL_CLASSNAME,
  getAnswerSlotSurface,
} from './utils';
import { DraggableBall } from './AddingBallGame.Shared';

export function PickAnswer({
  round,
  onResult,
}: {
  round: PickAnswerRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const [dropped, setDropped] = useState<BallItem | null>(null);
  const [checked, setChecked] = useState(false);
  const [selectedBallId, setSelectedBallId] = useState<string | null>(null);

  const balls: BallItem[] = round.choices.map((num, i) => ({
    id: `ans-${i}`,
    num,
    color: BALL_COLORS[i % BALL_COLORS.length] ?? BALL_COLORS[0],
  }));

  const onDragEnd = (result: DropResult): void => {
    if (checked) return;
    if (result.destination?.droppableId !== 'answer-slot') return;

    const ball = balls.find((entry) => entry.id === result.draggableId);
    if (!ball) return;

    setDropped(ball);
    const ok = ball.num === round.correct;
    setChecked(true);
    setSelectedBallId(null);
    setTimeout(() => onResult(ok), 1400);
  };

  const selectedBall = selectedBallId
    ? balls.find((entry) => entry.id === selectedBallId) ?? null
    : null;

  const applySelectedBall = (): void => {
    if (checked || !selectedBall) return;
    setDropped(selectedBall);
    const ok = selectedBall.num === round.correct;
    setChecked(true);
    setSelectedBallId(null);
    setTimeout(() => onResult(ok), 1400);
  };

  return (
    <KangurDragDropContext onDragEnd={onDragEnd}>
      <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <p className='text-2xl font-extrabold [color:var(--kangur-page-text)]'>
          {round.a} + {round.b} = <span className='text-orange-400'>?</span>
        </p>
        <p className='text-sm [color:var(--kangur-page-muted-text)]'>
          Przeciągnij piłkę z właściwą odpowiedzią do pola poniżej
        </p>

        <Droppable droppableId='answer-slot'>
          {(provided, snapshot) => {
            const surface = getAnswerSlotSurface({
              isDraggingOver: snapshot.isDraggingOver,
              checked,
              correct: dropped?.num === round.correct,
            });

            return (
              <KangurInfoCard
                ref={provided.innerRef}
                accent={surface.accent}
                className={cn(
                  surface.className,
                  'touch-manipulation select-none transition',
                  isCoarsePointer && 'h-28 w-28',
                  selectedBall && !dropped && 'border-amber-200 bg-amber-50/50'
                )}
                data-testid='adding-ball-answer-slot'
                padding='sm'
                tone={surface.tone}
                onClick={() => {
                  if (!isCoarsePointer || checked || dropped || !selectedBall) return;
                  applySelectedBall();
                }}
                {...provided.droppableProps}
              >
                {dropped ? (
                  <div
                    className={`w-16 h-16 rounded-full ${dropped.color} flex items-center justify-center`}
                  >
                    <span className='text-white font-extrabold text-xl'>{dropped.num}</span>
                  </div>
                ) : (
                  <span className='text-3xl [color:var(--kangur-page-muted-text)]'>?</span>
                )}
                {provided.placeholder}
              </KangurInfoCard>
            );
          }}
        </Droppable>

        {checked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`text-xl font-extrabold ${dropped?.num === round.correct ? 'text-green-600' : 'text-red-500'}`}
          >
            {dropped?.num === round.correct ? '🎉 Brawo!' : `❌ Odpowiedź: ${round.correct}`}
          </motion.div>
        )}

        <div className='flex flex-wrap items-center justify-center gap-2 text-xs'>
          <span
            data-testid='adding-ball-answer-touch-hint'
            className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
            role='status'
            aria-live='polite'
            aria-atomic='true'
          >
            {selectedBall
              ? isCoarsePointer
                ? `Wybrana piłka: ${selectedBall.num}. Dotknij pole odpowiedzi, aby ją ustawić.`
                : `Wybrana piłka: ${selectedBall.num}`
              : isCoarsePointer
                ? 'Dotknij piłkę, a potem pole odpowiedzi.'
                : 'Wybierz piłkę, aby ustawić odpowiedź klawiaturą.'}
          </span>
          <KangurButton
            size='sm'
            type='button'
            variant='surface'
            onClick={applySelectedBall}
            disabled={!selectedBall || checked}
          >
            Ustaw jako odpowiedź
          </KangurButton>
        </div>

        <Droppable droppableId='balls-pool' direction='horizontal'>
          {(provided) => (
            <KangurInfoCard
              ref={provided.innerRef}
              accent='slate'
              className={cn(
                BALL_POOL_CLASSNAME,
                'kangur-panel-gap touch-manipulation select-none transition',
                selectedBall && 'border border-amber-200 bg-amber-50/50'
              )}
              data-testid='adding-ball-balls-pool'
              padding='sm'
              tone='neutral'
              {...provided.droppableProps}
            >
              {balls.map((ball, i) => (
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
      </div>
    </KangurDragDropContext>
  );
}
