'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
} from '@/features/kangur/ui/components/KangurDragDropContext';

import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
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
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_STACK_ROW_CLASSNAME,
  type KangurAccent,
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

import type { DropResult } from '@hello-pangea/dnd';

type TileId = 'point' | 'segment' | 'side' | 'angle';

type LabelTile = {
  id: TileId;
  icon: string;
  accent: KangurAccent;
};

type Round = {
  id: string;
  board: TileId;
  correct: TileId;
};

type RoundState = {
  pool: LabelTile[];
  slot: LabelTile | null;
};

const LABEL_TILES: LabelTile[] = [
  { id: 'point', icon: '●', accent: 'sky' },
  { id: 'segment', icon: '—', accent: 'teal' },
  { id: 'side', icon: '▭', accent: 'slate' },
  { id: 'angle', icon: '∟', accent: 'amber' },
];

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

const dragPortal = typeof document === 'undefined' ? null : document.body;

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (): RoundState => ({
  pool: shuffle(LABEL_TILES),
  slot: null,
});

const ringClasses: Record<KangurAccent, string> = {
  indigo: 'ring-indigo-400/70',
  violet: 'ring-violet-400/70',
  emerald: 'ring-emerald-400/70',
  sky: 'ring-sky-400/70',
  amber: 'ring-amber-400/70',
  rose: 'ring-rose-400/70',
  teal: 'ring-teal-400/70',
  slate: 'ring-slate-400/70',
};

const buildTileClassName = ({
  accent,
  isSelected,
  isDragging,
  isDisabled,
  isCoarsePointer,
  isCompact,
}: {
  accent: KangurAccent;
  isSelected: boolean;
  isDragging: boolean;
  isDisabled: boolean;
  isCoarsePointer: boolean;
  isCompact: boolean;
}): string =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
    isCompact ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm',
    isCoarsePointer && (isCompact ? 'min-h-[3rem] min-w-[3rem] active:scale-[0.98] active:shadow-sm' : 'min-h-[4rem] min-w-[4rem] active:scale-[0.98] active:shadow-sm'),
    KANGUR_ACCENT_STYLES[accent].badge,
    !isDisabled && KANGUR_ACCENT_STYLES[accent].hoverCard,
    isSelected && `ring-2 ${ringClasses[accent]} ring-offset-2 ring-offset-white`,
    isDragging && 'scale-[1.03] shadow-[0_18px_40px_-24px_rgba(59,130,246,0.25)]',
    isDisabled ? 'cursor-default opacity-70' : 'cursor-grab active:cursor-grabbing'
  );

const targetPosition: Record<TileId, string> = {
  point: 'top-[16%] left-[18%]',
  segment: 'top-[50%] left-1/2 -translate-x-1/2 -translate-y-1/2',
  side: 'top-[10%] left-1/2 -translate-x-1/2',
  angle: 'bottom-[16%] left-1/2 -translate-x-1/2',
};

function BoardIllustration({ board }: { board: TileId }): React.JSX.Element {
  switch (board) {
    case 'point':
      return (
        <svg viewBox='0 0 320 220' className='h-full w-full text-slate-300' role='img' aria-label='Diagram: point on a coordinate plane'>
          <line x1='40' y1='110' x2='280' y2='110' stroke='currentColor' strokeWidth='2' />
          <line x1='160' y1='30' x2='160' y2='190' stroke='currentColor' strokeWidth='2' />
          <circle cx='90' cy='70' r='6' fill='currentColor' />
          <circle cx='90' cy='70' r='12' fill='none' stroke='currentColor' strokeWidth='2' />
        </svg>
      );
    case 'segment':
      return (
        <svg viewBox='0 0 320 220' className='h-full w-full text-slate-300' role='img' aria-label='Diagram: line segment between two endpoints'>
          <circle cx='80' cy='110' r='6' fill='currentColor' />
          <circle cx='240' cy='110' r='6' fill='currentColor' />
          <line x1='80' y1='110' x2='240' y2='110' stroke='currentColor' strokeWidth='5' />
        </svg>
      );
    case 'side':
      return (
        <svg viewBox='0 0 320 220' className='h-full w-full text-slate-300' role='img' aria-label='Diagram: side of a rectangle highlighted'>
          <rect x='80' y='50' width='160' height='120' fill='none' stroke='currentColor' strokeWidth='4' />
          <line x1='80' y1='50' x2='240' y2='50' stroke='currentColor' strokeWidth='7' />
        </svg>
      );
    case 'angle':
      return (
        <svg viewBox='0 0 320 220' className='h-full w-full text-slate-300' role='img' aria-label='Diagram: right angle formed by two line segments'>
          <line x1='160' y1='150' x2='160' y2='60' stroke='currentColor' strokeWidth='5' />
          <line x1='160' y1='150' x2='250' y2='150' stroke='currentColor' strokeWidth='5' />
          <path
            d='M160 130 A20 20 0 0 1 180 150'
            fill='none'
            stroke='currentColor'
            strokeWidth='4'
          />
        </svg>
      );
    default:
      return <div />;
  }
}

function DraggableTile({
  tile,
  index,
  isSelected,
  isDisabled,
  isCoarsePointer,
  isCompact = false,
  onClick,
}: {
  tile: LabelTile;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  isCoarsePointer: boolean;
  isCompact?: boolean;
  onClick?: () => void;
}): React.ReactElement | React.ReactPortal {
  const translations = useTranslations('KangurMiniGames');
  const tileLabel = getGeometryBasicsTileLabel(translations, tile.id);
  return (
    <Draggable
      draggableId={tile.id}
      index={index}
      isDragDisabled={isDisabled}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => {
        const content = (
          <button
            type='button'
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            className={buildTileClassName({
              accent: tile.accent,
              isSelected,
              isDragging: snapshot.isDragging,
              isDisabled,
              isCoarsePointer,
              isCompact,
            })}
            onClick={(event) => {
              event.preventDefault();
              if (onClick && !snapshot.isDragging) {
                onClick();
              }
            }}
            aria-pressed={isSelected}
            aria-label={translations('geometryBasics.inRound.tileAria', { label: tileLabel })}
          >
            <span className='text-base'>{tile.icon}</span>
            <span>{tileLabel}</span>
          </button>
        );

        if (snapshot.isDragging && dragPortal) {
          return createPortal(content, dragPortal);
        }

        return content;
      }}
    </Draggable>
  );
}

export default function GeometryBasicsWorkshopGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const summaryFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const handleFinish = onFinish;
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
  const correctTile = useMemo(
    () => LABEL_TILES.find((tile) => tile.id === round.correct) ?? LABEL_TILES[0]!,
    [round]
  );
  const selectedTile = selectedTileId
    ? LABEL_TILES.find((tile) => tile.id === selectedTileId) ?? null
    : null;
  const touchHint = selectedTile
    ? translations('geometryBasics.inRound.touch.selected', {
        label: getGeometryBasicsTileLabel(translations, selectedTile.id),
      })
    : translations('geometryBasics.inRound.touch.idle');

  const assignTile = (tileId: TileId): void => {
    setRoundState((prev) => {
      const pool = [...prev.pool];
      const index = pool.findIndex((tile) => tile.id === tileId);
      if (index < 0) return prev;
      const [moved] = pool.splice(index, 1);
      const nextPool = prev.slot ? [...pool, prev.slot] : pool;
      return {
        pool: nextPool,
        slot: moved ?? null,
      };
    });
  };

  const clearSlot = (): void => {
    setRoundState((prev) => {
      if (!prev.slot) return prev;
      return {
        pool: [...prev.pool, prev.slot],
        slot: null,
      };
    });
  };

  const resetRound = (): void => {
    setRoundState(buildRoundState());
    setSelectedTileId(null);
    setChecked(false);
    setFeedback(null);
  };

  const restart = (): void => {
    setRoundIndex(0);
    setRoundState(buildRoundState());
    setSelectedTileId(null);
    setChecked(false);
    setFeedback(null);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  };

  const handleCheck = (): void => {
    if (checked || !roundState.slot) return;
    const isCorrect = roundState.slot.id === round.correct;
    setFeedback({
      kind: isCorrect ? 'success' : 'error',
      text: isCorrect
        ? translations('geometryBasics.inRound.feedback.correct')
        : translations('geometryBasics.inRound.feedback.incorrect', {
            label: getGeometryBasicsTileLabel(translations, correctTile.id),
          }),
    });
    setChecked(true);
    setSelectedTileId(null);
  };

  const goToNextRound = (): void => {
    const isCorrect = roundState.slot?.id === round.correct;
    const nextScore = isCorrect ? score + 1 : score;
    setScore(nextScore);

    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress();
      const reward = createLessonPracticeReward(
        progress,
        'geometry_basics',
        nextScore,
        TOTAL_ROUNDS
      );
      addXp(reward.xp, reward.progressUpdates);
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
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setRoundState((prev) => {
      let pool = [...prev.pool];
      let slot = prev.slot;
      let moved: LabelTile | null = null;

      if (source.droppableId === 'pool') {
        moved = pool.splice(source.index, 1)[0] ?? null;
      } else if (source.droppableId === 'target') {
        moved = slot;
        slot = null;
      }

      if (!moved) return prev;

      if (destination.droppableId === 'pool') {
        pool.splice(destination.index, 0, moved);
      } else if (destination.droppableId === 'target') {
        if (slot) {
          pool = [...pool, slot];
        }
        slot = moved;
      }

      return { pool, slot };
    });
    setSelectedTileId(null);
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='geometry-basics-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          ariaHidden
          dataTestId='geometry-basics-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 75 ? '🌟' : '💪'}
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
          {percent === 100
            ? translations('geometryBasics.summary.perfect')
            : percent >= 75
              ? translations('geometryBasics.summary.good')
              : translations('geometryBasics.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          className={KANGUR_STACK_ROW_CLASSNAME}
          finishButtonClassName='w-full sm:flex-1'
          finishLabel={summaryFinishLabel}
          onFinish={handleFinish}
          onRestart={restart}
          restartLabel={translations('shared.restart')}
          restartButtonClassName='w-full sm:flex-1'
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <KangurDragDropContext
      onDragEnd={onDragEnd}
      onDragStart={() => setSelectedTileId(null)}
    >
      <KangurPracticeGameStage className='mx-auto max-w-3xl'>
        <KangurPracticeGameProgress
          accent='sky'
          currentRound={roundIndex}
          dataTestId='geometry-basics-progress-bar'
          totalRounds={TOTAL_ROUNDS}
        />

        <KangurInfoCard accent='sky' className='w-full' padding='sm' tone='accent'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <p className='text-sm font-bold'>
                {translations('geometryBasics.inRound.missionTitle')}
              </p>
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
                  onClick={() => {
                    if (checked) return;
                    if (selectedTileId) {
                      assignTile(selectedTileId);
                      setSelectedTileId(null);
                    } else if (roundState.slot) {
                      clearSlot();
                    }
                  }}
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
                      if (selectedTileId) {
                        assignTile(selectedTileId);
                        setSelectedTileId(null);
                      } else if (roundState.slot) {
                        clearSlot();
                      }
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
          <p className='text-xs text-sky-700 font-semibold'>
            {getGeometryBasicsRoundHint(translations, round.id)}
          </p>
          {feedback ? (
            <p
              className={cn(
                'text-sm font-semibold',
                feedback.kind === 'success' ? 'text-emerald-600' : 'text-rose-600'
              )}
              role='status'
              aria-live='polite'
              aria-atomic='true'
            >
              {feedback.text}
            </p>
          ) : null}
        </div>

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
                      if (checked) return;
                      setSelectedTileId((current) => (current === tile.id ? null : tile.id));
                    }}
                  />
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <div className='flex w-full flex-wrap items-center justify-between kangur-panel-gap'>
          <KangurButton size='sm' type='button' variant='surface' onClick={resetRound} disabled={checked}>
            {translations('geometryBasics.inRound.clear')}
          </KangurButton>
          {!checked ? (
            <KangurButton
              size='sm'
              type='button'
              variant='primary'
              onClick={handleCheck}
              disabled={!roundState.slot}
            >
              {translations('geometryBasics.inRound.check')}
            </KangurButton>
          ) : (
            <KangurButton size='sm' type='button' variant='primary' onClick={goToNextRound}>
              {roundIndex + 1 >= TOTAL_ROUNDS
                ? translations('geometryBasics.inRound.seeResult')
                : translations('geometryBasics.inRound.next')}
            </KangurButton>
          )}
        </div>
      </KangurPracticeGameStage>
    </KangurDragDropContext>
  );
}
