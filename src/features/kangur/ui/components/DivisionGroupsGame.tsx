'use client';

import { Droppable } from '@hello-pangea/dnd';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { createContext, useContext } from 'react';

import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameShell,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurEquationDisplay,
  KangurHeadline,
  KangurInfoCard,
  KangurPanelRow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { cn } from '@/features/kangur/shared/utils';

import { DraggableToken } from './DivisionGroupsGame.components';
import { useDivisionGroupsGameState } from './DivisionGroupsGame.hooks';
import type {
  DivisionGroupsGameProps,
  TokenItem,
  ZoneId,
} from './DivisionGroupsGame.types';
import { TOTAL_ROUNDS, groupId } from './DivisionGroupsGame.utils';

type DivisionGroupsState = ReturnType<typeof useDivisionGroupsGameState>;
type DivisionGroupsStatus = DivisionGroupsState['status'];
type DivisionGroupsTranslations = DivisionGroupsState['translations'];

type DivisionGroupsContextValue = DivisionGroupsState & {
  onFinish: () => void;
  finishLabel: string;
};

const DivisionGroupsGameContext = createContext<DivisionGroupsContextValue | null>(null);

function useDivisionGroupsGame(): DivisionGroupsContextValue {
  const context = useContext(DivisionGroupsGameContext);
  if (!context) {
    throw new Error('useDivisionGroupsGame must be used within DivisionGroupsGame.');
  }
  return context;
}

const GROUP_ZONE_CLASSNAME =
  'relative flex min-h-[140px] flex-col rounded-[28px] border-2 border-dashed p-4 transition-all touch-manipulation';
const REMAINDER_ZONE_CLASSNAME =
  'relative flex min-h-[120px] flex-col rounded-[28px] border-2 border-dashed p-4 transition-all touch-manipulation';
const POOL_ZONE_CLASSNAME =
  'flex min-h-[100px] flex-wrap items-center justify-center gap-2 rounded-[32px] border-2 border-dashed p-4 transition-all touch-manipulation';

const DIVISION_GROUPS_CHECK_TONES: Record<DivisionGroupsStatus, 'error' | 'success' | null> = {
  correct: 'success',
  idle: null,
  wrong: 'error',
};

const resolveDivisionGroupsSummaryMessage = ({
  percent,
  translations,
}: {
  percent: number;
  translations: DivisionGroupsTranslations;
}): string => {
  if (percent === 100) {
    return translations('division.summary.perfect');
  }

  if (percent >= 70) {
    return translations('division.summary.good');
  }

  return translations('division.summary.retry');
};

const resolveDivisionGroupsSelectedToken = ({
  groups,
  pool,
  remainder,
  selectedTokenId,
}: {
  groups: DivisionGroupsState['groups'];
  pool: DivisionGroupsState['pool'];
  remainder: DivisionGroupsState['remainder'];
  selectedTokenId: string | null;
}): TokenItem | null => {
  if (!selectedTokenId) {
    return null;
  }

  return [...pool, ...remainder, ...groups.flat()].find((token) => token.id === selectedTokenId) ?? null;
};

const resolveDivisionGroupsSelectionHint = ({
  isCoarsePointer,
  selectedToken,
  translations,
}: {
  isCoarsePointer: boolean;
  selectedToken: TokenItem | null;
  translations: DivisionGroupsTranslations;
}): string => {
  if (selectedToken) {
    return translations(
      isCoarsePointer
        ? 'divisionGroups.feedback.touchSelected'
        : 'divisionGroups.feedback.keyboardSelected',
      { emoji: selectedToken.emoji }
    );
  }

  return translations(
    isCoarsePointer
      ? 'divisionGroups.feedback.touchIdle'
      : 'divisionGroups.feedback.keyboardIdle'
  );
};

const resolveDivisionGroupsSourceLocation = ({
  groups,
  pool,
  remainder,
  selectedTokenId,
}: {
  groups: DivisionGroupsState['groups'];
  pool: DivisionGroupsState['pool'];
  remainder: DivisionGroupsState['remainder'];
  selectedTokenId: string;
}): { sourceId: ZoneId; sourceIndex: number } | null => {
  const poolIndex = pool.findIndex((token) => token.id === selectedTokenId);
  if (poolIndex !== -1) {
    return { sourceId: 'pool', sourceIndex: poolIndex };
  }

  const remainderIndex = remainder.findIndex((token) => token.id === selectedTokenId);
  if (remainderIndex !== -1) {
    return { sourceId: 'remainder', sourceIndex: remainderIndex };
  }

  for (const [groupIndex, group] of groups.entries()) {
    const sourceIndex = group.findIndex((token) => token.id === selectedTokenId);
    if (sourceIndex !== -1) {
      return { sourceId: groupId(groupIndex), sourceIndex };
    }
  }

  return null;
};

const moveDivisionGroupsSelectedTokenToZone = ({
  destinationId,
  groups,
  handleDragEnd,
  isLocked,
  pool,
  remainder,
  selectedTokenId,
}: {
  destinationId: ZoneId;
  groups: DivisionGroupsState['groups'];
  handleDragEnd: DivisionGroupsState['handleDragEnd'];
  isLocked: boolean;
  pool: DivisionGroupsState['pool'];
  remainder: DivisionGroupsState['remainder'];
  selectedTokenId: string | null;
}): void => {
  if (isLocked || !selectedTokenId) {
    return;
  }

  const source = resolveDivisionGroupsSourceLocation({
    groups,
    pool,
    remainder,
    selectedTokenId,
  });

  if (!source) {
    return;
  }

  handleDragEnd({
    source: {
      droppableId: source.sourceId,
      index: source.sourceIndex,
    },
    destination: {
      droppableId: destinationId,
      index: 0,
    },
    combine: null,
    draggableId: selectedTokenId,
    mode: 'FLUID',
    reason: 'DROP',
    type: 'DEFAULT',
  });
};

const toggleDivisionGroupsTokenSelection = ({
  isLocked,
  setSelectedTokenId,
  tokenId,
}: {
  isLocked: boolean;
  setSelectedTokenId: DivisionGroupsState['setSelectedTokenId'];
  tokenId: string;
}): void => {
  if (isLocked) {
    return;
  }

  setSelectedTokenId((previous) => (previous === tokenId ? null : tokenId));
};

const handleDivisionGroupsZoneKeyDown = ({
  destination,
  event,
  moveToZone,
}: {
  destination: ZoneId;
  event: React.KeyboardEvent<HTMLElement>;
  moveToZone: (destination: ZoneId) => void;
}): void => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    moveToZone(destination);
  }
};

const resolveDivisionGroupsTokenAriaLabel = (
  translations: DivisionGroupsTranslations,
  token: TokenItem
): string => translations('division.inRound.tokenAria', { emoji: token.emoji });

function DivisionGroupsSummaryView(): React.JSX.Element {
  const { handleRestart, score, translations, xpBreakdown, xpEarned, finishLabel, onFinish } = useDivisionGroupsGame();
  const percent = Math.round((score / TOTAL_ROUNDS) * 100);

  return (
    <KangurPracticeGameSummary
      dataTestId='division-groups-summary-shell'
      wrapperClassName='w-full max-w-3xl'
    >
      <KangurPracticeGameSummaryEmoji
        dataTestId='division-groups-summary-emoji'
        emoji={percent === 100 ? '🥇' : percent >= 70 ? '🥈' : '🥉'}
      />
      <KangurPracticeGameSummaryTitle
        accent='sky'
        title={
          <KangurHeadline data-testid='division-groups-summary-title'>
            {getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
          </KangurHeadline>
        }
      />
      <KangurPracticeGameSummaryXP accent='sky' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='division-groups-summary-breakdown'
        itemDataTestIdPrefix='division-groups-summary-breakdown'
      />
      <KangurPracticeGameSummaryProgress accent='sky' percent={percent} />
      <KangurPracticeGameSummaryMessage>
        {resolveDivisionGroupsSummaryMessage({ percent, translations })}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        finishLabel={finishLabel}
        onFinish={onFinish}
        onRestart={handleRestart}
        restartLabel={translations('shared.restart')}
      />
    </KangurPracticeGameSummary>
  );
}

function DivisionGroupsDropZone({
  ariaLabel,
  baseClassName,
  dataTestId,
  droppableId,
  label,
  ringClassName,
  snapshotClassName,
  tokens,
}: {
  ariaLabel: string;
  baseClassName: string;
  dataTestId: string;
  droppableId: ZoneId;
  label: string;
  ringClassName: string;
  snapshotClassName: string;
  tokens: TokenItem[];
}): React.JSX.Element {
  const {
    groups,
    handleDragEnd,
    isCoarsePointer,
    isLocked,
    pool,
    remainder,
    selectedTokenId,
    setSelectedTokenId,
    translations,
  } = useDivisionGroupsGame();

  const moveToZone = (destinationId: ZoneId): void => {
    moveDivisionGroupsSelectedTokenToZone({
      destinationId,
      groups,
      handleDragEnd,
      isLocked,
      pool,
      remainder,
      selectedTokenId,
    });
  };

  const selectToken = (tokenId: string): void => {
    toggleDivisionGroupsTokenSelection({
      isLocked,
      setSelectedTokenId,
      tokenId,
    });
  };

  return (
    <Droppable droppableId={droppableId} direction='horizontal'>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          aria-disabled={isLocked}
          aria-label={ariaLabel}
          className={cn(
            baseClassName,
            snapshot.isDraggingOver ? snapshotClassName : 'border-slate-200 bg-white/60',
            isCoarsePointer && selectedTokenId && 'ring-2 ring-offset-2',
            isCoarsePointer && selectedTokenId && ringClassName
          )}
          data-testid={dataTestId}
          onClick={() => moveToZone(droppableId)}
          onKeyDown={(event) =>
            handleDivisionGroupsZoneKeyDown({
              destination: droppableId,
              event,
              moveToZone,
            })
          }
          role='button'
          tabIndex={isLocked ? -1 : 0}
        >
          <span className='mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'>
            {label}
          </span>
          <div className='flex flex-wrap items-start justify-center gap-2'>
            {tokens.map((token, tokenIndex) => (
              <DraggableToken
                key={token.id}
                ariaLabel={resolveDivisionGroupsTokenAriaLabel(translations, token)}
                index={tokenIndex}
                isCoarsePointer={isCoarsePointer}
                isDragDisabled={isLocked}
                isSelected={selectedTokenId === token.id}
                onClick={() => selectToken(token.id)}
                onSelect={() => selectToken(token.id)}
                token={token}
              />
            ))}
            {provided.placeholder}
          </div>
        </div>
      )}
    </Droppable>
  );
}

function DivisionGroupsHeader(): React.JSX.Element {
  const { round, roundIndex, translations } = useDivisionGroupsGame();
  return (
    <div className='flex w-full flex-col gap-4 sm:flex-row'>
      <KangurInfoCard accent='sky' className='flex-1' padding='md' tone='accent'>
        <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
          <p className='text-sm font-bold text-sky-800'>
            {translations('division.inRound.prompt')}
          </p>
          <KangurEquationDisplay accent='sky' size='md'>
            {round.dividend} ÷ {round.divisor} = ?
          </KangurEquationDisplay>
        </div>
      </KangurInfoCard>
      <div className='flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end'>
        <KangurStatusChip accent='sky' className='px-3 py-1 font-bold' size='sm'>
          {translations('division.inRound.roundLabel', {
            current: roundIndex + 1,
            total: TOTAL_ROUNDS,
          })}
        </KangurStatusChip>
      </div>
    </div>
  );
}

function DivisionGroupsGroupGrid(): React.JSX.Element {
  const { groups, translations } = useDivisionGroupsGame();

  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      {groups.map((group, groupIndex) => (
        <DivisionGroupsDropZone
          key={groupId(groupIndex)}
          ariaLabel={translations('divisionGroups.aria.group', { group: groupIndex + 1 })}
          baseClassName={GROUP_ZONE_CLASSNAME}
          dataTestId={`division-groups-group-zone-${groupIndex}`}
          droppableId={groupId(groupIndex)}
          label={translations('division.inRound.groupLabel', { index: groupIndex + 1 })}
          ringClassName='ring-sky-300'
          snapshotClassName='border-sky-400 bg-sky-50 shadow-inner'
          tokens={group}
        />
      ))}
    </div>
  );
}

function DivisionGroupsBoard(): React.JSX.Element {
  const { remainder, translations } = useDivisionGroupsGame();

  return (
    <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]'>
      <DivisionGroupsGroupGrid />
      <div className='flex flex-col gap-4'>
        <DivisionGroupsDropZone
          ariaLabel={translations('divisionGroups.aria.remainder')}
          baseClassName={REMAINDER_ZONE_CLASSNAME}
          dataTestId='division-groups-remainder-zone'
          droppableId='remainder'
          label={translations('division.inRound.remainderLabel')}
          ringClassName='ring-amber-300'
          snapshotClassName='border-amber-400 bg-amber-50 shadow-inner'
          tokens={remainder}
        />
      </div>
    </div>
  );
}

function DivisionGroupsPool(): React.JSX.Element {
  const { pool, translations } = useDivisionGroupsGame();

  return (
    <div className='flex flex-col gap-3'>
      <p className='text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-400'>
        {translations('division.inRound.poolLabel')}
      </p>
      <DivisionGroupsDropZone
        ariaLabel={translations('divisionGroups.aria.pool')}
        baseClassName={POOL_ZONE_CLASSNAME}
        dataTestId='division-groups-pool-zone'
        droppableId='pool'
        label={translations('division.inRound.poolLabel')}
        ringClassName='ring-slate-300'
        snapshotClassName='border-sky-300 bg-sky-50/80'
        tokens={pool}
      />
    </div>
  );
}

function DivisionGroupsSelectionHint({
  selectionHint,
}: {
  selectionHint: string;
}): React.JSX.Element {
  return (
    <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
      <p
        aria-atomic='true'
        aria-live='polite'
        className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
        data-testid='division-groups-selection-hint'
        role='status'
      >
        {selectionHint}
      </p>
    </KangurInfoCard>
  );
}

function DivisionGroupsCheckAction(): React.JSX.Element {
  const { handleCheck, isLocked, pool, status, translations } = useDivisionGroupsGame();
  const disabled = pool.length > 0 || isLocked;

  return (
    <KangurPanelRow className='justify-center py-2'>
      <KangurButton
        className={getKangurCheckButtonClassName(undefined, DIVISION_GROUPS_CHECK_TONES[status])}
        disabled={disabled}
        onClick={handleCheck}
        size='lg'
        variant='primary'
      >
        {translations('shared.check')}
      </KangurButton>
    </KangurPanelRow>
  );
}

function DivisionGroupsActiveRound(): React.JSX.Element {
  const {
    translations,
    isCoarsePointer,
    roundIndex,
    pool,
    groups,
    remainder,
    selectedTokenId,
    handleDragEnd,
  } = useDivisionGroupsGame();
  const prefersReducedMotion = useReducedMotion();
  const roundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const selectedToken = resolveDivisionGroupsSelectedToken({
    groups,
    pool,
    remainder,
    selectedTokenId,
  });
  const selectionHint = resolveDivisionGroupsSelectionHint({
    isCoarsePointer,
    selectedToken,
    translations,
  });

  return (
    <KangurPracticeGameShell
      className='mx-auto max-w-4xl'
      data-testid='division-groups-game-shell'
    >
      <KangurPracticeGameProgress
        accent='sky'
        currentRound={roundIndex}
        dataTestId='division-groups-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
          <AnimatePresence mode='wait'>
            <motion.div
              key={roundIndex}
              {...roundMotionProps}
              className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
            >
              <DivisionGroupsHeader />
              <DivisionGroupsBoard />
              <DivisionGroupsPool />
              <DivisionGroupsSelectionHint selectionHint={selectionHint} />
            </motion.div>
          </AnimatePresence>

          <DivisionGroupsCheckAction />
        </div>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}

function DivisionGroupsRoundView(): React.JSX.Element {
  const { done } = useDivisionGroupsGame();

  if (done) {
    return <DivisionGroupsSummaryView />;
  }

  return <DivisionGroupsActiveRound />;
}

export default function DivisionGroupsGame(
  props: DivisionGroupsGameProps
): React.JSX.Element {
  const state = useDivisionGroupsGameState(props);
  const { translations } = state;
  const { finishLabelVariant = 'lesson', onFinish } = props;
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    finishLabelVariant === 'topics' ? 'topics' : 'lesson'
  );

  return (
    <DivisionGroupsGameContext.Provider
      value={{
        ...state,
        onFinish,
        finishLabel,
      }}
    >
      <DivisionGroupsRoundView />
    </DivisionGroupsGameContext.Provider>
  );
}
