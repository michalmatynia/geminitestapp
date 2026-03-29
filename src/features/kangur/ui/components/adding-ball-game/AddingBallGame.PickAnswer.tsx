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
  getBallSurfaceStyle,
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

  const selectedBall = resolveSelectedBall(balls, selectedBallId);

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

        <PickAnswerSlot
          checked={checked}
          dropped={dropped}
          correctAnswer={round.correct}
          isCoarsePointer={isCoarsePointer}
          selectedBall={selectedBall}
          onApplySelectedBall={applySelectedBall}
        />

        <PickAnswerFeedback checked={checked} dropped={dropped} correctAnswer={round.correct} />

        <PickAnswerSelectionControls
          checked={checked}
          isCoarsePointer={isCoarsePointer}
          selectedBall={selectedBall}
          onApplySelectedBall={applySelectedBall}
        />

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

function resolveSelectedBall(
  balls: BallItem[],
  selectedBallId: string | null
): BallItem | null {
  if (!selectedBallId) {
    return null;
  }
  return balls.find((entry) => entry.id === selectedBallId) ?? null;
}

function resolvePickAnswerSelectionHint({
  selectedBall,
  isCoarsePointer,
}: {
  selectedBall: BallItem | null;
  isCoarsePointer: boolean;
}): string {
  if (selectedBall) {
    return isCoarsePointer
      ? `Wybrana piłka: ${selectedBall.num}. Dotknij pole odpowiedzi, aby ją ustawić.`
      : `Wybrana piłka: ${selectedBall.num}`;
  }
  return isCoarsePointer
    ? 'Dotknij piłkę, a potem pole odpowiedzi.'
    : 'Wybierz piłkę, aby ustawić odpowiedź klawiaturą.';
}

function resolvePickAnswerFeedback(props: {
  dropped: BallItem | null;
  correctAnswer: number;
}): { className: string; text: string } {
  const { dropped, correctAnswer } = props;
  if (dropped?.num === correctAnswer) {
    return { className: 'text-xl font-extrabold text-green-600', text: '🎉 Brawo!' };
  }
  return {
    className: 'text-xl font-extrabold text-red-500',
    text: `❌ Odpowiedź: ${correctAnswer}`,
  };
}

function PickAnswerBallPreview({
  dropped,
}: {
  dropped: BallItem | null;
}): React.JSX.Element {
  if (!dropped) {
    return <span className='text-3xl [color:var(--kangur-page-muted-text)]'>?</span>;
  }

  return (
    <div
      className='relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border text-white'
      style={getBallSurfaceStyle(dropped.color)}
    >
      <span className='pointer-events-none absolute inset-x-[18%] top-[14%] h-[20%] rounded-full bg-white/55 blur-[1px]' />
      <span className='pointer-events-none absolute inset-x-[20%] bottom-[14%] h-[28%] rounded-full bg-black/10 blur-[7px]' />
      <span className='relative z-10 text-xl font-extrabold drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]'>
        {dropped.num}
      </span>
    </div>
  );
}

function PickAnswerSlot(props: {
  checked: boolean;
  dropped: BallItem | null;
  correctAnswer: number;
  isCoarsePointer: boolean;
  selectedBall: BallItem | null;
  onApplySelectedBall: () => void;
}): React.JSX.Element {
  const {
    checked,
    dropped,
    correctAnswer,
    isCoarsePointer,
    selectedBall,
    onApplySelectedBall,
  } = props;

  return (
    <Droppable droppableId='answer-slot'>
      {(provided, snapshot) => {
        const surface = getAnswerSlotSurface({
          isDraggingOver: snapshot.isDraggingOver,
          checked,
          correct: dropped?.num === correctAnswer,
        });
        const handleClick = (): void => {
          if (!isCoarsePointer || checked || dropped || !selectedBall) {
            return;
          }
          onApplySelectedBall();
        };

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
            onClick={handleClick}
            {...provided.droppableProps}
          >
            <PickAnswerBallPreview dropped={dropped} />
            {provided.placeholder}
          </KangurInfoCard>
        );
      }}
    </Droppable>
  );
}

function PickAnswerFeedback(props: {
  checked: boolean;
  dropped: BallItem | null;
  correctAnswer: number;
}): React.JSX.Element | null {
  const { checked, dropped, correctAnswer } = props;

  if (!checked) {
    return null;
  }

  const feedback = resolvePickAnswerFeedback({ dropped, correctAnswer });

  return (
    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={feedback.className}>
      {feedback.text}
    </motion.div>
  );
}

function PickAnswerSelectionControls(props: {
  checked: boolean;
  isCoarsePointer: boolean;
  selectedBall: BallItem | null;
  onApplySelectedBall: () => void;
}): React.JSX.Element {
  const { checked, isCoarsePointer, selectedBall, onApplySelectedBall } = props;

  return (
    <div className='flex flex-wrap items-center justify-center gap-2 text-xs'>
      <span
        data-testid='adding-ball-answer-touch-hint'
        className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
        role='status'
        aria-live='polite'
        aria-atomic='true'
      >
        {resolvePickAnswerSelectionHint({ selectedBall, isCoarsePointer })}
      </span>
      <KangurButton
        size='sm'
        type='button'
        variant='surface'
        onClick={onApplySelectedBall}
        disabled={!selectedBall || checked}
      >
        Ustaw jako odpowiedź
      </KangurButton>
    </div>
  );
}
