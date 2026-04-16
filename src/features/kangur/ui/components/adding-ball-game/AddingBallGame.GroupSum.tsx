'use client';

import React, { useCallback, useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { motion } from 'framer-motion';

import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';
import { cn } from '@/features/kangur/shared/utils';
import { KangurButton, KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

import { DraggableBall, PointerDropZone } from './AddingBallGame.Shared';
import { PointerDragProvider } from './PointerDragProvider';
import type { BallItem, GroupSlotId, GroupSumRound, GroupSumState } from './types';
import {
  BALL_POOL_CLASSNAME,
  createBalls,
  formatAcceptedGroupPair,
  formatSubmittedGroupPair,
  getRectDropZoneSurface,
  isAcceptedCountSplit,
  isGroupSlotId,
  moveBetweenLists,
  removeBallById,
  reorderWithinList,
} from './utils';

const GROUP_SUM_ZONE_DEFINITIONS = [
  { id: 'group1', label: 'Grupa 1' },
  { id: 'group2', label: 'Grupa 2' },
] as const;

type SetGroupSumState = React.Dispatch<React.SetStateAction<GroupSumState>>;

type GroupSumContextValue = ReturnType<typeof useGroupSumState> & {
  round: GroupSumRound;
  onResult: (correct: boolean) => void;
};

const GroupSumContext = React.createContext<GroupSumContextValue | null>(null);

function useGroupSum(): GroupSumContextValue {
  const context = React.useContext(GroupSumContext);
  if (!context) {
    throw new Error('useGroupSum must be used within GroupSum.');
  }
  return context;
}

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
      if (checked) {
        return;
      }
      if (!isGroupSlotId(sourceZoneId) || !isGroupSlotId(destinationId)) {
        return;
      }
      const sourceId: GroupSlotId = sourceZoneId;
      const targetId: GroupSlotId = destinationId;
      if (sourceZoneId === destinationId) {
        return;
      }

      setState((prev) => {
        const { updated: sourceUpdated, ball } = removeBallById(prev[sourceId], ballId);
        if (!ball) {
          return prev;
        }
        return {
          ...prev,
          [sourceId]: sourceUpdated,
          [targetId]: [...prev[targetId], ball],
        };
      });
    },
    [checked]
  );

  const check = useCallback(
    (onResult: (correct: boolean) => void): void => {
      const ok = isAcceptedCountSplit(state.group1.length, state.group2.length, round.a, round.b);
      setCorrect(ok);
      setChecked(true);
      setTimeout(() => onResult(ok), 1400);
    },
    [round.a, round.b, state.group1.length, state.group2.length]
  );

  return { state, setState, checked, correct, moveBallTo, check, total };
}

const resolveGroupSumHint = (round: GroupSumRound): string =>
  round.a !== round.b
    ? `Kolejność nie ma znaczenia, więc ${round.a} i ${round.b} albo ${round.b} i ${round.a} są poprawne.`
    : `Obie grupy powinny mieć po ${round.a} piłki.`;

const resolveGroupSumMessages = (
  round: GroupSumRound,
  submittedGroupPair: string
): { success: string; retry: string } => ({
  success: `🎉 Brawo! Pasują grupy ${round.a} i ${round.b}${
    round.a !== round.b ? ` albo ${round.b} i ${round.a}` : ''
  }.`,
  retry: `❌ Spróbuj jeszcze raz! Masz grupy ${submittedGroupPair}, a szukamy ${round.a} i ${round.b}${
    round.a !== round.b ? ` albo ${round.b} i ${round.a}` : ''
  }.`,
});

const resolveSelectedGroupBall = (
  state: GroupSumState,
  selectedBallId: string | null
): BallItem | null => {
  if (!selectedBallId) {
    return null;
  }
  return [...state.pool, ...state.group1, ...state.group2].find((ball) => ball.id === selectedBallId) ?? null;
};

const toggleSelectedGroupBallId = (
  setSelectedBallId: React.Dispatch<React.SetStateAction<string | null>>,
  id: string
): void => {
  setSelectedBallId((current) => (current === id ? null : id));
};

const moveSelectedGroupBallToDestination = ({
  checked,
  selectedBallId,
  destinationId,
  setState,
  setSelectedBallId,
}: {
  checked: boolean;
  selectedBallId: string | null;
  destinationId: GroupSlotId;
  setState: SetGroupSumState;
  setSelectedBallId: React.Dispatch<React.SetStateAction<string | null>>;
}): void => {
  if (checked || !selectedBallId) {
    return;
  }

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
    if (!moved) {
      return prev;
    }
    nextState[destinationId] = [...nextState[destinationId], moved];
    return nextState;
  });

  setSelectedBallId(null);
};

const applyGroupSumDropResult = ({
  result,
  checked,
  setState,
  setSelectedBallId,
}: {
  result: DropResult;
  checked: boolean;
  setState: SetGroupSumState;
  setSelectedBallId: React.Dispatch<React.SetStateAction<string | null>>;
}): void => {
  if (checked) {
    return;
  }

  const { source, destination } = result;
  if (!destination) {
    return;
  }
  if (!isGroupSlotId(source.droppableId) || !isGroupSlotId(destination.droppableId)) {
    return;
  }
  const sourceId: GroupSlotId = source.droppableId;
  const destinationId: GroupSlotId = destination.droppableId;

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
    return { ...prev, [sourceId]: moved.source, [destinationId]: moved.destination };
  });
};

function GroupSumHeader(): React.JSX.Element {
  const { round, total } = useGroupSum();
  const acceptedGroupPair = formatAcceptedGroupPair(round.a, round.b);
  return (
    <>
      <p className='text-lg font-bold [color:var(--kangur-page-text)]'>
        Podziel {total} piłek na dwie grupy: <span className='text-orange-500'>{acceptedGroupPair}</span>
      </p>
      <p
        className='text-sm text-center [color:var(--kangur-page-muted-text)]'
        data-testid='adding-ball-group-solution-hint'
      >
        {resolveGroupSumHint(round)}
      </p>
      <p
        className='text-xs text-center font-semibold uppercase tracking-[0.18em] text-slate-500'
        data-testid='adding-ball-group-unit-hint'
      >
        Każda piłka to 1.
      </p>
    </>
  );
}

function GroupSumResult(): React.JSX.Element | null {
  const { checked, correct, round, state } = useGroupSum();
  const submittedGroupPair = formatSubmittedGroupPair(state.group1.length, state.group2.length);
  const { success: successMessage, retry: retryMessage } = resolveGroupSumMessages(
    round,
    submittedGroupPair
  );

  if (!checked) {
    return null;
  }

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn('text-xl font-extrabold', correct ? 'text-green-600' : 'text-red-500')}
    >
      {correct ? successMessage : retryMessage}
    </motion.div>
  );
}

function GroupSumCheckButton(): React.JSX.Element | null {
  const { checked, state, check, onResult } = useGroupSum();
  const hasAnswer = state.group1.length > 0 && state.group2.length > 0;

  if (checked) {
    return null;
  }

  return (
    <KangurButton disabled={!hasAnswer} onClick={() => check(onResult)} size='lg' variant='primary'>
      Sprawdź ✓
    </KangurButton>
  );
}

function GroupSumDesktopZone(props: {
  id: Extract<GroupSlotId, 'group1' | 'group2'>;
  label: string;
  selectedBallId: string | null;
  onSelectBall: (id: string) => void;
}): React.JSX.Element {
  const { id, label, selectedBallId, onSelectBall } = props;
  const { state, checked, correct } = useGroupSum();
  const items = state[id];
  const selectedBall = resolveSelectedGroupBall(state, selectedBallId);

  return (
    <Droppable droppableId={id} direction='horizontal'>
      {(provided, snapshot) => {
        const surface = getRectDropZoneSurface({
          isDraggingOver: snapshot.isDraggingOver,
          checked,
          correct,
        });
        return (
          <div>
            <p className='mb-1 text-center text-xs [color:var(--kangur-page-muted-text)]'>{label}</p>
            <KangurInfoCard
              ref={provided.innerRef}
              accent={surface.accent}
              className={cn(
                surface.className,
                'min-h-[52px] min-w-[80px] w-full max-w-[160px] touch-manipulation select-none transition',
                selectedBall && 'bg-amber-50/60'
              )}
              data-testid={`adding-ball-${id}`}
              padding='sm'
              tone={surface.tone}
              {...provided.droppableProps}
            >
              {items.map((ball, index) => (
                <DraggableBall
                  key={ball.id}
                  ball={ball}
                  index={index}
                  isDragDisabled={checked}
                  small
                  isSelected={selectedBallId === ball.id}
                  onSelect={() => onSelectBall(ball.id)}
                />
              ))}
              {provided.placeholder}
            </KangurInfoCard>
          </div>
        );
      }}
    </Droppable>
  );
}

function GroupSumPool(props: {
  selectedBallId: string | null;
  onSelectBall: (id: string) => void;
}): React.JSX.Element {
  const { selectedBallId, onSelectBall } = props;
  const { checked, state } = useGroupSum();
  const selectedBall = resolveSelectedGroupBall(state, selectedBallId);

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

function GroupSumSelectionControls(props: {
  selectedBall: BallItem | null;
  onMoveToGroup1: () => void;
  onMoveToGroup2: () => void;
  onMoveToPool: () => void;
}): React.JSX.Element {
  const { selectedBall, onMoveToGroup1, onMoveToGroup2, onMoveToPool } = props;
  const { checked } = useGroupSum();

  return (
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
      <KangurButton size='sm' type='button' variant='surface' onClick={onMoveToGroup1} disabled={!selectedBall || checked}>
        Do grupy 1
      </KangurButton>
      <KangurButton size='sm' type='button' variant='surface' onClick={onMoveToGroup2} disabled={!selectedBall || checked}>
        Do grupy 2
      </KangurButton>
      <KangurButton size='sm' type='button' variant='surface' onClick={onMoveToPool} disabled={!selectedBall || checked}>
        Do puli
      </KangurButton>
    </div>
  );
}

function GroupSumMobile(): React.JSX.Element {
  const { state, checked, correct, moveBallTo } = useGroupSum();

  return (
    <PointerDragProvider onDrop={moveBallTo} disabled={checked}>
      <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <GroupSumHeader />

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

        <GroupSumCheckButton />
        <GroupSumResult />
      </div>
    </PointerDragProvider>
  );
}

function GroupSumDesktop(): React.JSX.Element {
  const { state, setState, checked } = useGroupSum();
  const [selectedBallId, setSelectedBallId] = useState<string | null>(null);
  const selectedBall = resolveSelectedGroupBall(state, selectedBallId);

  const handleSelectBall = useCallback((id: string): void => {
    toggleSelectedGroupBallId(setSelectedBallId, id);
  }, []);

  const handleMoveSelectedBallTo = useCallback(
    (destinationId: GroupSlotId): void => {
      moveSelectedGroupBallToDestination({
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
      applyGroupSumDropResult({
        result,
        checked,
        setState,
        setSelectedBallId,
      });
    },
    [checked, setState]
  );

  return (
    <KangurDragDropContext onDragEnd={handleDragEnd}>
      <div className={`flex flex-col items-center w-full ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <GroupSumHeader />

        <div className='flex kangur-panel-gap flex-wrap justify-center'>
          {GROUP_SUM_ZONE_DEFINITIONS.map((group) => (
            <GroupSumDesktopZone
              key={group.id}
              id={group.id}
              label={group.label}
              selectedBallId={selectedBallId}
              onSelectBall={handleSelectBall}
            />
          ))}
        </div>

        <GroupSumPool
          selectedBallId={selectedBallId}
          onSelectBall={handleSelectBall}
        />

        <GroupSumSelectionControls
          selectedBall={selectedBall}
          onMoveToGroup1={() => handleMoveSelectedBallTo('group1')}
          onMoveToGroup2={() => handleMoveSelectedBallTo('group2')}
          onMoveToPool={() => handleMoveSelectedBallTo('pool')}
        />

        <GroupSumCheckButton />
        <GroupSumResult />
      </div>
    </KangurDragDropContext>
  );
}

export function GroupSum({
  round,
  onResult,
}: {
  round: GroupSumRound;
  onResult: (correct: boolean) => void;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const state = useGroupSumState(round);

  return (
    <GroupSumContext.Provider value={{ ...state, round, onResult }}>
      {isCoarsePointer ? <GroupSumMobile /> : <GroupSumDesktop />}
    </GroupSumContext.Provider>
  );
}
