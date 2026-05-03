'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { Droppable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import {
  KangurDragDropContext,
} from '@/features/kangur/ui/components/KangurDragDropContext';

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
import {
  KangurButton,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';
import {
  KANGUR_STACK_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameAccuracyText,
  getKangurMiniGameScoreLabel,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFeedbackState,
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';
import type { SingleSlotRoundStateDto } from './round-state-contracts';
import { BoardIllustration, DraggableTile, LABEL_TILES, type LabelTile, type TileId } from './GeometryBasicsWorkshopGame.tiles';

import type { DropResult } from '@hello-pangea/dnd';

type GeometryBasicsTranslations = ReturnType<typeof useTranslations>;

type Round = {
  id: string;
  board: TileId;
  correct: TileId;
};

type RoundState = SingleSlotRoundStateDto<LabelTile>;

const ROUNDS: Round[] = [
  {
    id: 'round-point',
    board: 'point',
    correct: 'point',
  },
  {
    id: 'round-segment',
    board: 'segment',
    correct: 'segment',
  },
  {
    id: 'round-side',
    board: 'side',
    correct: 'side',
  },
  {
    id: 'round-angle',
    board: 'angle',
    correct: 'angle',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;

const getGeometryBasicsTileLabel = (
  translate: KangurMiniGameTranslate,
  tileId: TileId
): string => translate(`geometryBasics.inRound.tiles.${tileId}`);

const getGeometryBasicsRoundTitle = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`geometryBasics.inRound.rounds.${roundId}.title`);

const getGeometryBasicsRoundPrompt = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`geometryBasics.inRound.rounds.${roundId}.prompt`);

const getGeometryBasicsRoundHint = (
  translate: KangurMiniGameTranslate,
  roundId: Round['id']
): string => translate(`geometryBasics.inRound.rounds.${roundId}.hint`);

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (): RoundState => ({
  pool: shuffle(LABEL_TILES),
  slot: null,
});

const findGeometryBasicsTile = (tileId: TileId): LabelTile | null =>
  LABEL_TILES.find((tile) => tile.id === tileId) ?? null;

const resolveGeometryBasicsCorrectTile = (round: Round): LabelTile =>
  findGeometryBasicsTile(round.correct) ?? LABEL_TILES[0]!;

const resolveGeometryBasicsSelectedTile = (selectedTileId: TileId | null): LabelTile | null =>
  selectedTileId ? findGeometryBasicsTile(selectedTileId) : null;

const resolveGeometryBasicsTouchHint = ({
  selectedTile,
  translations,
}: {
  selectedTile: LabelTile | null;
  translations: GeometryBasicsTranslations;
}): string =>
  selectedTile
    ? translations('geometryBasics.inRound.touch.selected', {
        label: getGeometryBasicsTileLabel(translations, selectedTile.id),
      })
    : translations('geometryBasics.inRound.touch.idle');

const assignGeometryBasicsTileToSlot = (
  current: RoundState,
  tileId: TileId
): RoundState => {
  const pool = [...current.pool];
  const index = pool.findIndex((tile) => tile.id === tileId);
  if (index < 0) {
    return current;
  }

  const [moved] = pool.splice(index, 1);
  return {
    pool: current.slot ? [...pool, current.slot] : pool,
    slot: moved ?? null,
  };
};

const clearGeometryBasicsSlot = (current: RoundState): RoundState =>
  current.slot
    ? {
        pool: [...current.pool, current.slot],
        slot: null,
      }
    : current;

const buildGeometryBasicsFeedback = ({
  correctTile,
  isCorrect,
  translations,
}: {
  correctTile: LabelTile;
  isCorrect: boolean;
  translations: GeometryBasicsTranslations;
}): KangurMiniGameFeedbackState => ({
  kind: isCorrect ? 'success' : 'error',
  text: isCorrect
    ? translations('geometryBasics.inRound.feedback.correct')
    : translations('geometryBasics.inRound.feedback.incorrect', {
        label: getGeometryBasicsTileLabel(translations, correctTile.id),
      }),
});

const resolveGeometryBasicsDraggedTile = ({
  current,
  source,
}: {
  current: RoundState;
  source: DropResult['source'];
}): {
  moved: LabelTile | null;
  pool: LabelTile[];
  slot: LabelTile | null;
} => {
  const pool = [...current.pool];
  const slot = current.slot;

  if (source.droppableId === 'pool') {
    return {
      moved: pool.splice(source.index, 1)[0] ?? null,
      pool,
      slot,
    };
  }

  if (source.droppableId === 'target') {
    return {
      moved: slot,
      pool,
      slot: null,
    };
  }

  return {
    moved: null,
    pool,
    slot,
  };
};

const applyGeometryBasicsDropDestination = ({
  destination,
  moved,
  pool,
  slot,
}: {
  destination: NonNullable<DropResult['destination']>;
  moved: LabelTile;
  pool: LabelTile[];
  slot: LabelTile | null;
}): RoundState => {
  if (destination.droppableId === 'pool') {
    const nextPool = [...pool];
    nextPool.splice(destination.index, 0, moved);
    return { pool: nextPool, slot };
  }

  if (destination.droppableId === 'target') {
    return {
      pool: slot ? [...pool, slot] : pool,
      slot: moved,
    };
  }

  return { pool, slot };
};

const reduceGeometryBasicsDragEnd = (
  current: RoundState,
  result: DropResult
): RoundState => {
  const { source, destination } = result;
  if (!destination) {
    return current;
  }
  if (source.droppableId === destination.droppableId && source.index === destination.index) {
    return current;
  }

  const { moved, pool, slot } = resolveGeometryBasicsDraggedTile({
    current,
    source,
  });

  return moved
    ? applyGeometryBasicsDropDestination({
        destination,
        moved,
        pool,
        slot,
      })
    : current;
};

const resolveGeometryBasicsSummaryPercent = (score: number): number =>
  Math.round((score / TOTAL_ROUNDS) * 100);

const resolveGeometryBasicsSummaryEmoji = (percent: number): string =>
  percent === 100 ? '🏆' : percent >= 75 ? '🌟' : '💪';

const resolveGeometryBasicsSummaryMessage = ({
  percent,
  translations,
}: {
  percent: number;
  translations: GeometryBasicsTranslations;
}): string =>
  percent === 100
    ? translations('geometryBasics.summary.perfect')
    : percent >= 75
      ? translations('geometryBasics.summary.good')
      : translations('geometryBasics.summary.retry');

const resolveGeometryBasicsContinueLabel = ({
  roundIndex,
  translations,
}: {
  roundIndex: number;
  translations: GeometryBasicsTranslations;
}): string =>
  roundIndex + 1 >= TOTAL_ROUNDS
    ? translations('geometryBasics.inRound.seeResult')
    : translations('geometryBasics.inRound.next');

const handleGeometryBasicsTargetInteraction = ({
  checked,
  clearSlot,
  roundState,
  selectedTileId,
  setSelectedTileId,
  assignTile,
}: {
  assignTile: (tileId: TileId) => void;
  checked: boolean;
  clearSlot: () => void;
  roundState: RoundState;
  selectedTileId: TileId | null;
  setSelectedTileId: (tileId: TileId | null) => void;
}): void => {
  if (checked) {
    return;
  }

  if (selectedTileId) {
    assignTile(selectedTileId);
    setSelectedTileId(null);
    return;
  }

  if (roundState.slot) {
    clearSlot();
  }
};

const targetPosition: Record<TileId, string> = {
  point: 'top-[16%] left-[18%]',
  segment: 'top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2',
  side: 'top-[10%] left-1/2 -translate-x-1/2',
  angle: 'bottom-[16%] left-1/2 -translate-x-1/2',
};

function useGeometryBasicsWorkshopRuntime(input: {
  ownerKey: string;
  translations: GeometryBasicsTranslations;
}): {
  checked: boolean;
  correctTile: LabelTile;
  done: boolean;
  feedback: KangurMiniGameFeedbackState;
  goToNextRound: () => void;
  onDragEnd: (result: DropResult) => void;
  resetRound: () => void;
  restart: () => void;
  round: Round;
  roundIndex: number;
  roundState: RoundState;
  score: number;
  selectedTileId: TileId | null;
  setSelectedTileId: (value: React.SetStateAction<TileId | null>) => void;
  touchHint: string;
  xpBreakdown: KangurRewardBreakdownEntry[];
  xpEarned: number;
  handleCheck: () => void;
  assignTile: (tileId: TileId) => void;
  clearSlot: () => void;
} {
  const { ownerKey, translations } = input;
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() => buildRoundState());
  const [selectedTileId, setSelectedTileId] = useState<TileId | null>(null);
  const [checked, setChecked] = useState(false);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;
  const correctTile = useMemo(() => resolveGeometryBasicsCorrectTile(round), [round]);
  const selectedTile = resolveGeometryBasicsSelectedTile(selectedTileId);
  const touchHint = resolveGeometryBasicsTouchHint({
    selectedTile,
    translations,
  });

  const assignTile = (tileId: TileId): void => {
    setRoundState((current) => assignGeometryBasicsTileToSlot(current, tileId));
  };

  const clearSlot = (): void => {
    setRoundState((current) => clearGeometryBasicsSlot(current));
  };

  const resetRound = (): void => {
    setRoundState(buildRoundState());
    setSelectedTileId(null);
    setChecked(false);
    setFeedback(null);
  };

  const restart = (): void => {
    setRoundIndex(0);
    resetRound();
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  };

  const handleCheck = (): void => {
    if (checked || !roundState.slot) {
      return;
    }

    setFeedback(
      buildGeometryBasicsFeedback({
        correctTile,
        isCorrect: roundState.slot.id === round.correct,
        translations,
      })
    );
    setChecked(true);
    setSelectedTileId(null);
  };

  const goToNextRound = (): void => {
    const nextScore = roundState.slot?.id === round.correct ? score + 1 : score;
    setScore(nextScore);

    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(
        progress,
        'geometry_basics',
        nextScore,
        TOTAL_ROUNDS
      );
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'geometry_basics',
        score: nextScore,
        totalQuestions: TOTAL_ROUNDS,
        correctAnswers: nextScore,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      return;
    }

    setRoundIndex((current) => current + 1);
    resetRound();
  };

  const onDragEnd = (result: DropResult): void => {
    if (checked) {
      return;
    }

    setRoundState((current) => reduceGeometryBasicsDragEnd(current, result));
    setSelectedTileId(null);
  };

  return {
    assignTile,
    checked,
    clearSlot,
    correctTile,
    done,
    feedback,
    goToNextRound,
    handleCheck,
    onDragEnd,
    resetRound,
    restart,
    round,
    roundIndex,
    roundState,
    score,
    selectedTileId,
    setSelectedTileId,
    touchHint,
    xpBreakdown,
    xpEarned,
  };
}

function GeometryBasicsWorkshopSummary(props: {
  finishLabel: string;
  handleFinish: KangurMiniGameFinishProps['onFinish'];
  restart: () => void;
  score: number;
  translations: GeometryBasicsTranslations;
  xpBreakdown: KangurRewardBreakdownEntry[];
  xpEarned: number;
}): React.JSX.Element {
  const { finishLabel, handleFinish, restart, score, translations, xpBreakdown, xpEarned } = props;
  const percent = resolveGeometryBasicsSummaryPercent(score);

  return (
    <KangurPracticeGameSummary dataTestId='geometry-basics-summary-shell'>
      <KangurPracticeGameSummaryEmoji
        ariaHidden
        dataTestId='geometry-basics-summary-emoji'
        emoji={resolveGeometryBasicsSummaryEmoji(percent)}
      />
      <KangurPracticeGameSummaryTitle
        accent='sky'
        dataTestId='geometry-basics-summary-title'
        title={getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
      />
      <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='geometry-basics-summary-breakdown'
        itemDataTestIdPrefix='geometry-basics-summary-breakdown'
      />
      <KangurPracticeGameSummaryProgress
        accent='sky'
        ariaLabel={translations('geometryBasics.progressAriaLabel')}
        ariaValueText={getKangurMiniGameAccuracyText(translations, percent)}
        dataTestId='geometry-basics-summary-progress-bar'
        percent={percent}
      />
      <KangurPracticeGameSummaryMessage>
        {resolveGeometryBasicsSummaryMessage({
          percent,
          translations,
        })}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        className={KANGUR_STACK_ROW_CLASSNAME}
        finishButtonClassName='w-full sm:flex-1'
        finishLabel={finishLabel}
        onFinish={handleFinish}
        onRestart={restart}
        restartLabel={translations('shared.restart')}
        restartButtonClassName='w-full sm:flex-1'
      />
    </KangurPracticeGameSummary>
  );
}

function GeometryBasicsWorkshopMissionCard(props: {
  isCoarsePointer: boolean;
  round: Round;
  roundIndex: number;
  touchHint: string;
  translations: GeometryBasicsTranslations;
}): React.JSX.Element {
  const { isCoarsePointer, round, roundIndex, touchHint, translations } = props;

  return (
    <KangurInfoCard accent='sky' className='w-full' padding='sm' tone='accent'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div>
          <p className='text-sm font-bold'>{translations('geometryBasics.inRound.missionTitle')}</p>
          <p className='text-xs [color:var(--kangur-page-muted-text)]'>
            {getGeometryBasicsRoundPrompt(translations, round.id)}
          </p>
        </div>
        <KangurStatusChip accent='sky' size='sm'>
          {translations('geometryBasics.inRound.roundLabel', {
            current: roundIndex + 1,
            total: TOTAL_ROUNDS,
          })}
        </KangurStatusChip>
      </div>
      <p className='mt-2 text-[11px] [color:var(--kangur-page-muted-text)]'>
        {translations('geometryBasics.inRound.instruction')}
      </p>
      {isCoarsePointer ? (
        <div
          aria-live='polite'
          className='mt-3 rounded-2xl border border-sky-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-sky-950 shadow-sm'
          data-testid='geometry-basics-touch-hint'
        >
          {touchHint}
        </div>
      ) : null}
    </KangurInfoCard>
  );
}

function GeometryBasicsWorkshopBoard(props: {
  assignTile: (tileId: TileId) => void;
  checked: boolean;
  clearSlot: () => void;
  isCoarsePointer: boolean;
  round: Round;
  roundState: RoundState;
  selectedTileId: TileId | null;
  setSelectedTileId: (tileId: TileId | null) => void;
  translations: GeometryBasicsTranslations;
}): React.JSX.Element {
  const {
    assignTile,
    checked,
    clearSlot,
    isCoarsePointer,
    round,
    roundState,
    selectedTileId,
    setSelectedTileId,
    translations,
  } = props;

  return (
    <div className='flex w-full flex-col kangur-panel-gap'>
      <div className='flex items-center justify-between'>
        <p className='text-xs font-semibold uppercase tracking-[0.16em] text-sky-700'>
          {translations('geometryBasics.inRound.boardLabel')}
        </p>
        <KangurStatusChip accent='slate' size='sm'>
          {getGeometryBasicsRoundTitle(translations, round.id)}
        </KangurStatusChip>
      </div>
      <div className='relative w-full overflow-hidden rounded-[26px] border border-sky-100/80 bg-white/80 p-4'>
        <div className='mx-auto h-[220px] w-full max-w-xl'>
          <BoardIllustration board={round.board} />
        </div>
        <Droppable droppableId='target'>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={cn(
                'absolute flex items-center justify-center rounded-[18px] border border-dashed bg-white/80 px-3 py-2 text-xs font-semibold text-sky-700 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                isCoarsePointer ? 'min-h-[3.75rem] min-w-[11rem]' : 'min-h-[48px] min-w-[150px]',
                targetPosition[round.board],
                snapshot.isDraggingOver && 'border-sky-300 bg-sky-50/80',
                isCoarsePointer && selectedTileId && 'ring-2 ring-sky-300/80 ring-offset-2 ring-offset-white'
              )}
              data-testid='geometry-basics-target'
              onClick={() =>
                handleGeometryBasicsTargetInteraction({
                  assignTile,
                  checked,
                  clearSlot,
                  roundState,
                  selectedTileId,
                  setSelectedTileId,
                })
              }
              role='button'
              tabIndex={checked ? -1 : 0}
              aria-disabled={checked}
              aria-label={
                roundState.slot
                  ? translations('geometryBasics.inRound.boardFilledAria', {
                      label: getGeometryBasicsTileLabel(translations, roundState.slot.id),
                    })
                  : translations('geometryBasics.inRound.boardEmptyAria')
              }
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleGeometryBasicsTargetInteraction({
                    assignTile,
                    checked,
                    clearSlot,
                    roundState,
                    selectedTileId,
                    setSelectedTileId,
                  });
                }
              }}
            >
              {roundState.slot ? (
                <DraggableTile
                  tile={roundState.slot}
                  index={0}
                  isSelected={false}
                  isDisabled={checked}
                  isCoarsePointer={isCoarsePointer}
                  isCompact
                />
              ) : (
                <span>{translations('geometryBasics.inRound.dropLabel')}</span>
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
      <p className='text-xs font-semibold text-sky-700'>
        {getGeometryBasicsRoundHint(translations, round.id)}
      </p>
    </div>
  );
}

function GeometryBasicsWorkshopPool(props: {
  checked: boolean;
  isCoarsePointer: boolean;
  roundState: RoundState;
  selectedTileId: TileId | null;
  setSelectedTileId: React.Dispatch<React.SetStateAction<TileId | null>>;
  translations: GeometryBasicsTranslations;
}): React.JSX.Element {
  const { checked, isCoarsePointer, roundState, selectedTileId, setSelectedTileId, translations } =
    props;

  return (
    <div className='flex w-full flex-col kangur-panel-gap'>
      <div className='flex items-center justify-between'>
        <p className='text-xs font-semibold uppercase tracking-[0.16em] text-sky-700'>
          {translations('geometryBasics.inRound.labelsTitle')}
        </p>
        <KangurStatusChip accent='slate' size='sm'>
          {translations('geometryBasics.inRound.poolLabel', { count: roundState.pool.length })}
        </KangurStatusChip>
      </div>
      <Droppable droppableId='pool' direction='horizontal'>
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              'flex min-h-[72px] flex-wrap items-center justify-center gap-2 rounded-[22px] border border-dashed px-3 py-3 text-center text-xs touch-manipulation',
              roundState.pool.length === 0
                ? 'text-sky-500/70'
                : '[color:var(--kangur-page-muted-text)]',
              isCoarsePointer && selectedTileId && 'ring-2 ring-sky-200/80 ring-offset-2 ring-offset-white'
            )}
            data-testid='geometry-basics-pool'
          >
            {roundState.pool.length === 0 ? (
              <span>{translations('geometryBasics.inRound.poolEmpty')}</span>
            ) : null}
            {roundState.pool.map((tile, index) => (
              <DraggableTile
                key={tile.id}
                tile={tile}
                index={index}
                isSelected={selectedTileId === tile.id}
                isDisabled={checked}
                isCoarsePointer={isCoarsePointer}
                onClick={() => {
                  if (checked) {
                    return;
                  }
                  setSelectedTileId((current) => (current === tile.id ? null : tile.id));
                }}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

function GeometryBasicsWorkshopActions(props: {
  checked: boolean;
  feedback: KangurMiniGameFeedbackState;
  goToNextRound: () => void;
  handleCheck: () => void;
  resetRound: () => void;
  roundIndex: number;
  roundState: RoundState;
  translations: GeometryBasicsTranslations;
}): React.JSX.Element {
  const {
    checked,
    feedback,
    goToNextRound,
    handleCheck,
    resetRound,
    roundIndex,
    roundState,
    translations,
  } = props;

  return (
    <div className='flex w-full flex-wrap items-center justify-between kangur-panel-gap'>
      <KangurButton size='sm' type='button' variant='surface' onClick={resetRound} disabled={checked}>
        {translations('geometryBasics.inRound.clear')}
      </KangurButton>
      <KangurButton
        size='sm'
        type='button'
        variant='primary'
        onClick={handleCheck}
        disabled={checked || !roundState.slot}
        className={getKangurCheckButtonClassName(
          undefined,
          feedback?.kind === 'success' ? 'success' : feedback?.kind === 'error' ? 'error' : null
        )}
      >
        {translations('geometryBasics.inRound.check')}
      </KangurButton>
      {checked ? (
        <KangurButton size='sm' type='button' variant='primary' onClick={goToNextRound}>
          {resolveGeometryBasicsContinueLabel({
            roundIndex,
            translations,
          })}
        </KangurButton>
      ) : null}
    </div>
  );
}

function GeometryBasicsWorkshopRoundView(props: {
  assignTile: (tileId: TileId) => void;
  checked: boolean;
  clearSlot: () => void;
  feedback: KangurMiniGameFeedbackState;
  goToNextRound: () => void;
  handleCheck: () => void;
  isCoarsePointer: boolean;
  onDragEnd: (result: DropResult) => void;
  resetRound: () => void;
  round: Round;
  roundIndex: number;
  roundState: RoundState;
  selectedTileId: TileId | null;
  setSelectedTileId: React.Dispatch<React.SetStateAction<TileId | null>>;
  touchHint: string;
  translations: GeometryBasicsTranslations;
}): React.JSX.Element {
  const {
    assignTile,
    checked,
    clearSlot,
    feedback,
    goToNextRound,
    handleCheck,
    isCoarsePointer,
    onDragEnd,
    resetRound,
    round,
    roundIndex,
    roundState,
    selectedTileId,
    setSelectedTileId,
    touchHint,
    translations,
  } = props;

  return (
    <KangurDragDropContext onDragEnd={onDragEnd} onDragStart={() => setSelectedTileId(null)}>
      <KangurPracticeGameShell className='mx-auto max-w-3xl'>
        <KangurPracticeGameProgress
          accent='sky'
          currentRound={roundIndex}
          dataTestId='geometry-basics-progress-bar'
          totalRounds={TOTAL_ROUNDS}
        />
        <GeometryBasicsWorkshopMissionCard
          isCoarsePointer={isCoarsePointer}
          round={round}
          roundIndex={roundIndex}
          touchHint={touchHint}
          translations={translations}
        />
        <GeometryBasicsWorkshopBoard
          assignTile={assignTile}
          checked={checked}
          clearSlot={clearSlot}
          isCoarsePointer={isCoarsePointer}
          round={round}
          roundState={roundState}
          selectedTileId={selectedTileId}
          setSelectedTileId={setSelectedTileId}
          translations={translations}
        />
        <GeometryBasicsWorkshopPool
          checked={checked}
          isCoarsePointer={isCoarsePointer}
          roundState={roundState}
          selectedTileId={selectedTileId}
          setSelectedTileId={setSelectedTileId}
          translations={translations}
        />
        <GeometryBasicsWorkshopActions
          checked={checked}
          feedback={feedback}
          goToNextRound={goToNextRound}
          handleCheck={handleCheck}
          resetRound={resetRound}
          roundIndex={roundIndex}
          roundState={roundState}
          translations={translations}
        />
      </KangurPracticeGameShell>
    </KangurDragDropContext>
  );
}

export default function GeometryBasicsWorkshopGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const summaryFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const handleFinish = onFinish;
  const {
    assignTile,
    checked,
    clearSlot,
    done,
    feedback,
    goToNextRound,
    handleCheck,
    onDragEnd,
    resetRound,
    restart,
    round,
    roundIndex,
    roundState,
    score,
    selectedTileId,
    setSelectedTileId,
    touchHint,
    xpBreakdown,
    xpEarned,
  } = useGeometryBasicsWorkshopRuntime({
    ownerKey: ownerKey ?? '',
    translations,
  });

  if (done) {
    return (
      <GeometryBasicsWorkshopSummary
        finishLabel={summaryFinishLabel}
        handleFinish={handleFinish}
        restart={restart}
        score={score}
        translations={translations}
        xpBreakdown={xpBreakdown}
        xpEarned={xpEarned}
      />
    );
  }

  return (
    <GeometryBasicsWorkshopRoundView
      assignTile={assignTile}
      checked={checked}
      clearSlot={clearSlot}
      feedback={feedback}
      goToNextRound={goToNextRound}
      handleCheck={handleCheck}
      isCoarsePointer={isCoarsePointer}
      onDragEnd={onDragEnd}
      resetRound={resetRound}
      round={round}
      roundIndex={roundIndex}
      roundState={roundState}
      selectedTileId={selectedTileId}
      setSelectedTileId={setSelectedTileId}
      touchHint={touchHint}
      translations={translations}
    />
  );
}
