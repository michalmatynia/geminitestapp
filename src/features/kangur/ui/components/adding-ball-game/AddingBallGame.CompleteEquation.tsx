'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';

import { cn } from '@/features/kangur/shared/utils';
import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';
import { KangurButton, KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

import { DraggableBall, PointerDropZone, SlotZone } from './AddingBallGame.Shared';
import { PointerDragProvider } from './PointerDragProvider';
import type {
  BallItem,
  CompleteEquationRound,
  CompleteEquationState,
  CompleteSlotId,
} from './types';
import {
  BALL_POOL_CLASSNAME,
  createBalls,
  formatAcceptedEquationPair,
  formatSubmittedEquationPair,
  isAcceptedCountSplit,
  isCompleteSlotId,
  moveBetweenLists,
  removeBallById,
  reorderWithinList,
} from './utils';

const COMPLETE_SLOT_A_LABEL = 'Grupa A';
const COMPLETE_SLOT_B_LABEL = 'Grupa B';

type CompleteEquationContextValue = {
  checked: boolean;
  correct: boolean;
  isCoarsePointer: boolean;
  onCheck: () => void;
};

const CompleteEquationContext = createContext<CompleteEquationContextValue | null>(null);

function useCompleteEquation(): CompleteEquationContextValue {
  const context = useContext(CompleteEquationContext);
  if (!context) {
    throw new Error('useCompleteEquation must be used within CompleteEquation');
  }
  return context;
}

type SetCompleteEquationState = React.Dispatch<React.SetStateAction<CompleteEquationState>>;

function useCompleteEquationState(round: CompleteEquationRound) {
  const [state, setState] = useState<CompleteEquationState>(() => ({
    pool: createBalls(round.a + round.b),
    slotA: [],
    slotB: [],
  }));
  const [checked, setChecked] = useState(false);
  const [correct, setCorrect] = useState(false);

  const moveBallTo = useCallback(
    (ballId: string, sourceZoneId: string, destinationId: string): void => {
      if (checked) {
        return;
      }
      if (!isCompleteSlotId(sourceZoneId) || !isCompleteSlotId(destinationId)) {
        return;
      }
      if (sourceZoneId === destinationId) {
        return;
      }

      setState((prev) => {
        const { updated: sourceUpdated, ball } = removeBallById(prev[sourceZoneId], ballId);
        if (!ball) {
          return prev;
        }
        return {
          ...prev,
          [sourceZoneId]: sourceUpdated,
          [destinationId]: [...prev[destinationId], ball],
        };
      });
    },
    [checked]
  );

  const check = useCallback(
    (onResult: (correct: boolean) => void): void => {
      const ok = isAcceptedCountSplit(state.slotA.length, state.slotB.length, round.a, round.b);
      setCorrect(ok);
      setChecked(true);
      setTimeout(() => onResult(ok), 1400);
    },
    [round.a, round.b, state.slotA.length, state.slotB.length]
  );

  return { state, setState, checked, correct, moveBallTo, check };
}

const resolveCompleteEquationHint = (
  round: CompleteEquationRound,
  acceptedEquationPair: string
): string =>
  round.a !== round.b
    ? `Pasuje ${acceptedEquationPair}. Kolejność grup nie ma znaczenia.`
    : `Pasuje ${acceptedEquationPair}.`;

const resolveCompleteEquationResultText = ({
  correct,
  acceptedEquationPair,
  submittedEquationPair,
}: {
  correct: boolean;
  acceptedEquationPair: string;
  submittedEquationPair: string;
}): string =>
  correct
    ? `🎉 Brawo! Pasuje ${acceptedEquationPair}.`
    : `❌ Spróbuj jeszcze raz! Masz ${submittedEquationPair}, a pasuje ${acceptedEquationPair}.`;

const resolveCompleteSelectedBall = (
  state: CompleteEquationState,
  selectedBallId: string | null
): BallItem | null => {
  if (!selectedBallId) {
    return null;
  }
  return [...state.pool, ...state.slotA, ...state.slotB].find((ball) => ball.id === selectedBallId) ?? null;
};

const toggleSelectedBallId = (
  setSelectedBallId: React.Dispatch<React.SetStateAction<string | null>>,
  id: string
): void => {
  setSelectedBallId((current) => (current === id ? null : id));
};

const moveSelectedCompleteBallToDestination = ({
  checked,
  selectedBallId,
  destinationId,
  setState,
  setSelectedBallId,
}: {
  checked: boolean;
  selectedBallId: string | null;
  destinationId: CompleteSlotId;
  setState: SetCompleteEquationState;
  setSelectedBallId: React.Dispatch<React.SetStateAction<string | null>>;
}): void => {
  if (checked || !selectedBallId) {
    return;
  }

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
    if (!moved) {
      return prev;
    }
    nextState[destinationId] = [...nextState[destinationId], moved];
    return nextState;
  });

  setSelectedBallId(null);
};

const applyCompleteEquationDropResult = ({
  result,
  checked,
  setState,
  setSelectedBallId,
}: {
  result: DropResult;
  checked: boolean;
  setState: SetCompleteEquationState;
  setSelectedBallId: React.Dispatch<React.SetStateAction<string | null>>;
}): void => {
  if (checked) {
    return;
  }

  const { source, destination } = result;
  if (!destination) {
    return;
  }
  if (!isCompleteSlotId(source.droppableId) || !isCompleteSlotId(destination.droppableId)) {
    return;
  }
  const sourceSlotId: CompleteSlotId = source.droppableId;
  const destinationSlotId: CompleteSlotId = destination.droppableId;
  if (source.droppableId === destination.droppableId && source.index === destination.index) {
    return;
  }

  setSelectedBallId(null);

  if (source.droppableId === destination.droppableId) {
    setState((prev) => ({
      ...prev,
      [sourceSlotId]: reorderWithinList(prev[sourceSlotId], source.index, destination.index),
    }));
    return;
  }

  setState((prev) => {
    const moved = moveBetweenLists(
      prev[sourceSlotId],
      prev[destinationSlotId],
      source.index,
      destination.index
    );

    return {
      ...prev,
      [sourceSlotId]: moved.source,
      [destinationSlotId]: moved.destination,
    };
  });
};

function CompleteEquationHeader({
  round,
  acceptedEquationPair,
}: {
  round: CompleteEquationRound;
  acceptedEquationPair: string;
}): React.JSX.Element {
  return (
    <>
      <p className='text-lg font-bold [color:var(--kangur-page-text)]'>
        Przeciągnij piłki tak, żeby uzupełnić równanie:
      </p>
      <p
        className='text-sm text-center [color:var(--kangur-page-muted-text)]'
        data-testid='adding-ball-complete-solution-hint'
      >
        {resolveCompleteEquationHint(round, acceptedEquationPair)}
      </p>
      <p
        className='text-xs text-center font-semibold uppercase tracking-[0.18em] text-slate-500'
        data-testid='adding-ball-complete-unit-hint'
      >
        Każda piłka to 1.
      </p>
    </>
  );
}

function CompleteEquationResult({
  acceptedEquationPair,
  submittedEquationPair,
}: {
  acceptedEquationPair: string;
  submittedEquationPair: string;
}): React.JSX.Element | null {
  const { checked, correct } = useCompleteEquation();
  if (!checked) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn('text-xl font-extrabold', correct ? 'text-green-600' : 'text-red-500')}
    >
      {resolveCompleteEquationResultText({ correct, acceptedEquationPair, submittedEquationPair })}
    </motion.div>
  );
}

function CompleteEquationCheckButton({
  hasAnswer,
}: {
  hasAnswer: boolean;
}): React.JSX.Element | null {
  const { checked, onCheck } = useCompleteEquation();
  if (checked) {
    return null;
  }

  return (
    <KangurButton disabled={!hasAnswer} onClick={onCheck} size='lg' variant='primary'>
      Sprawdź ✓
    </KangurButton>
  );
}

function CompleteEquationPool(props: {
  selectedBall: BallItem | null;
  state: CompleteEquationState;
  selectedBallId: string | null;
  onMoveToPool: () => void;
  onSelectBall: (id: string) => void;
}): React.JSX.Element {
  const {
    selectedBall,
    state,
    selectedBallId,
    onMoveToPool,
    onSelectBall,
  } = props;
  const { checked, isCoarsePointer } = useCompleteEquation();

  return (
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
            if (!isCoarsePointer || checked || !selectedBall) {
              return;
            }
            onMoveToPool();
          }}
          {...provided.droppableProps}
        >
          {state.pool.map((ball, index) => (
            <DraggableBall
              key={ball.id}
              ball={ball}
              index={index}
              isDragDisabled={checked}
              isSelected={selectedBallId === ball.id}
              onSelect={() => onSelectBall(ball.id)}
            />
          ))}
          {provided.placeholder}
        </KangurInfoCard>
      )}
    </Droppable>
  );
}

function CompleteEquationSelectionControls(props: {
  selectedBall: BallItem | null;
  onMoveToSlotA: () => void;
  onMoveToSlotB: () => void;
  onMoveToPool: () => void;
}): React.JSX.Element {
  const { selectedBall, onMoveToSlotA, onMoveToSlotB, onMoveToPool } = props;
  const { checked } = useCompleteEquation();

  return (
    <div className='flex flex-wrap items-center justify-center gap-2 text-xs'>
      <span
        data-testid='adding-ball-complete-touch-hint'
        className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
        role='status'
        aria-live='polite'
        aria-atomic='true'
      >
        {selectedBall
          ? `Wybrana piłka: ${selectedBall.num}`
          : 'Wybierz piłkę, aby przenieść ją klawiaturą.'}
      </span>
      <KangurButton size='sm' type='button' variant='surface' onClick={onMoveToSlotA} disabled={!selectedBall || checked}>
        Do {COMPLETE_SLOT_A_LABEL}
      </KangurButton>
      <KangurButton size='sm' type='button' variant='surface' onClick={onMoveToSlotB} disabled={!selectedBall || checked}>
        Do {COMPLETE_SLOT_B_LABEL}
      </KangurButton>
      <KangurButton size='sm' type='button' variant='surface' onClick={onMoveToPool} disabled={!selectedBall || checked}>
        Do puli
      </KangurButton>
    </div>
  );
}

function CompleteEquationMobile({
  round,
  onResult,
}: {
  round: CompleteEquationRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const { state, checked, correct, moveBallTo, check } = useCompleteEquationState(round);
  const acceptedEquationPair = formatAcceptedEquationPair(round.a, round.b);
  const submittedEquationPair = formatSubmittedEquationPair(state.slotA.length, state.slotB.length);

  return (
    <CompleteEquationContext.Provider
      value={{
        checked,
        correct,
        isCoarsePointer: true,
        onCheck: () => check(onResult),
      }}
    >
      <PointerDragProvider onDrop={moveBallTo} disabled={checked}>
        <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          <CompleteEquationHeader round={round} acceptedEquationPair={acceptedEquationPair} />

          <div className='flex items-center kangur-panel-gap flex-wrap justify-center'>
            <PointerDropZone id='slotA' items={state.slotA} label={COMPLETE_SLOT_A_LABEL} checked={checked} correct={correct} small />
            <span className='text-3xl font-extrabold [color:var(--kangur-page-muted-text)]'>+</span>
            <PointerDropZone id='slotB' items={state.slotB} label={COMPLETE_SLOT_B_LABEL} checked={checked} correct={correct} small />
            <span className='text-3xl font-extrabold [color:var(--kangur-page-muted-text)]'>= {round.target}</span>
          </div>

          <PointerDropZone id='pool' items={state.pool} label='Pula' checked={checked} correct={false} />

          <p
            data-testid='adding-ball-complete-touch-hint'
            className='text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500'
          >
            Przeciągnij piłkę do Grupy A, Grupy B albo z powrotem do puli.
          </p>

          <CompleteEquationCheckButton
            hasAnswer={state.slotA.length > 0 && state.slotB.length > 0}
          />
          <CompleteEquationResult
            acceptedEquationPair={acceptedEquationPair}
            submittedEquationPair={submittedEquationPair}
          />
        </div>
      </PointerDragProvider>
    </CompleteEquationContext.Provider>
  );
}

function CompleteEquationDesktop({
  round,
  onResult,
}: {
  round: CompleteEquationRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const { state, setState, checked, correct, check } = useCompleteEquationState(round);
  const [selectedBallId, setSelectedBallId] = useState<string | null>(null);
  const acceptedEquationPair = formatAcceptedEquationPair(round.a, round.b);
  const submittedEquationPair = formatSubmittedEquationPair(state.slotA.length, state.slotB.length);
  const selectedBall = resolveCompleteSelectedBall(state, selectedBallId);

  const handleSelectBall = useCallback((id: string): void => {
    toggleSelectedBallId(setSelectedBallId, id);
  }, []);

  const handleMoveSelectedBallTo = useCallback(
    (destinationId: CompleteSlotId): void => {
      moveSelectedCompleteBallToDestination({
        checked,
        selectedBallId,
        destinationId,
        setState,
        setSelectedBallId,
      });
    },
    [checked, selectedBallId, setState]
  );

  const handleDragEnd = useCallback(
    (result: DropResult): void => {
      applyCompleteEquationDropResult({
        result,
        checked,
        setState,
        setSelectedBallId,
      });
    },
    [checked, setState]
  );

  return (
    <CompleteEquationContext.Provider
      value={{
        checked,
        correct,
        isCoarsePointer,
        onCheck: () => check(onResult),
      }}
    >
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          <CompleteEquationHeader round={round} acceptedEquationPair={acceptedEquationPair} />

          <div className='flex items-center kangur-panel-gap flex-wrap justify-center'>
            <SlotZone
              id='slotA'
              items={state.slotA}
              label={COMPLETE_SLOT_A_LABEL}
              checked={checked}
              correct={correct}
              selectedBallId={selectedBallId}
              onActivateZone={() => handleMoveSelectedBallTo('slotA')}
              onSelectBall={handleSelectBall}
            />
            <span className='text-3xl font-extrabold [color:var(--kangur-page-muted-text)]'>+</span>
            <SlotZone
              id='slotB'
              items={state.slotB}
              label={COMPLETE_SLOT_B_LABEL}
              checked={checked}
              correct={correct}
              selectedBallId={selectedBallId}
              onActivateZone={() => handleMoveSelectedBallTo('slotB')}
              onSelectBall={handleSelectBall}
            />
            <span className='text-3xl font-extrabold [color:var(--kangur-page-muted-text)]'>= {round.target}</span>
          </div>

          <CompleteEquationPool
            selectedBall={selectedBall}
            state={state}
            selectedBallId={selectedBallId}
            onMoveToPool={() => handleMoveSelectedBallTo('pool')}
            onSelectBall={handleSelectBall}
          />

          <CompleteEquationSelectionControls
            selectedBall={selectedBall}
            onMoveToSlotA={() => handleMoveSelectedBallTo('slotA')}
            onMoveToSlotB={() => handleMoveSelectedBallTo('slotB')}
            onMoveToPool={() => handleMoveSelectedBallTo('pool')}
          />

          <CompleteEquationCheckButton
            hasAnswer={state.slotA.length > 0 && state.slotB.length > 0}
          />
          <CompleteEquationResult
            acceptedEquationPair={acceptedEquationPair}
            submittedEquationPair={submittedEquationPair}
          />
        </div>
      </KangurDragDropContext>
    </CompleteEquationContext.Provider>
  );
}

function renderCompleteEquation({
  isCoarsePointer,
  round,
  onResult,
}: {
  isCoarsePointer: boolean;
  round: CompleteEquationRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  if (isCoarsePointer) {
    return <CompleteEquationMobile round={round} onResult={onResult} />;
  }

  return <CompleteEquationDesktop round={round} onResult={onResult} />;
}

export function CompleteEquation({
  round,
  onResult,
}: {
  round: CompleteEquationRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  return renderCompleteEquation({ isCoarsePointer, round, onResult });
}
