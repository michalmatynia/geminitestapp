'use client';

import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import { useMessages } from 'next-intl';

import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useOptionalKangurLessonTemplate } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';

import {
  buildGeometryShapeDefinitions,
  ShapeIcon,
  SHAPE_ROUNDS,
  type ShapeId,
} from './GeometryShapeRecognition.shared';
import {
  createGeometryShapeRecognitionMessageTranslate,
  createGeometryShapeRecognitionLessonTranslate,
  resolveGeometryShapeRecognitionLessonContent,
} from './geometry-shape-recognition-lesson-content';
import type { LessonTranslate } from './lesson-copy';

type ShapeRecognitionGameProps = {
  finishLabel?: string;
  onFinish?: () => void;
};

type ShapeRecognitionGameContextValue = {
  finishLabel: string;
  isCoarsePointer: boolean;
  onFinish?: () => void;
  onRestart: () => void;
  score: number;
  totalRounds: number;
  translate: ReturnType<typeof createGeometryShapeRecognitionLessonTranslate>;
  shapeLabels: Record<ShapeId, string>;
};

const ShapeRecognitionGameContext = createContext<ShapeRecognitionGameContextValue | null>(null);

function useShapeRecognitionGame(): ShapeRecognitionGameContextValue {
  const context = useContext(ShapeRecognitionGameContext);
  if (!context) {
    throw new Error('useShapeRecognitionGame must be used within ShapeRecognitionGame');
  }
  return context;
}

const resolveShapeRecognitionLessonMessages = (
  messages: Record<string, unknown>
): Record<string, unknown> => {
  const staticLessons = messages['KangurStaticLessons'];
  if (!staticLessons || typeof staticLessons !== 'object' || Array.isArray(staticLessons)) {
    return {};
  }

  return (
    ((staticLessons as Record<string, unknown>)['geometryShapeRecognition'] as
      | Record<string, unknown>
      | undefined) ?? {}
  );
};

const resolveShapeRecognitionOptionVariant = ({
  option,
  round,
  selected,
}: {
  option: ShapeId;
  round: (typeof SHAPE_ROUNDS)[number];
  selected: ShapeId | null;
}): 'success' | 'warning' | 'surface' => {
  if (selected !== option) {
    return 'surface';
  }

  return option === round.correct ? 'success' : 'warning';
};

const resolveShapeRecognitionButtonClassName = (
  isCoarsePointer: boolean,
  touchClassName: string
): string | undefined => (isCoarsePointer ? touchClassName : undefined);

function useShapeRecognitionGameContent(): {
  shapeLabels: Record<ShapeId, string>;
  shapes: ReturnType<typeof buildGeometryShapeDefinitions>;
  translate: ReturnType<typeof createGeometryShapeRecognitionLessonTranslate>;
} {
  const runtimeTemplate = useOptionalKangurLessonTemplate('geometry_shape_recognition');
  const messages = useMessages() as Record<string, unknown>;
  const fallbackTranslate = useMemo<LessonTranslate>(() => {
    return createGeometryShapeRecognitionMessageTranslate(
      resolveShapeRecognitionLessonMessages(messages)
    );
  }, [messages]);
  const resolvedContent = useMemo(
    () => resolveGeometryShapeRecognitionLessonContent(runtimeTemplate, fallbackTranslate),
    [fallbackTranslate, runtimeTemplate]
  );
  const translate = useMemo(
    () => createGeometryShapeRecognitionLessonTranslate(resolvedContent),
    [resolvedContent]
  );
  const shapes = useMemo(() => buildGeometryShapeDefinitions(translate), [translate]);
  const shapeLabels = useMemo(
    () => Object.fromEntries(shapes.map((shape) => [shape.id, shape.label])) as Record<ShapeId, string>,
    [shapes]
  );

  return {
    shapeLabels,
    shapes,
    translate,
  };
}

function ShapeRecognitionEmptyState(): React.JSX.Element {
  const { translate } = useShapeRecognitionGame();
  return (
    <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
      <div className='text-sm text-slate-500'>{translate('practice.emptyRounds')}</div>
    </KangurGlassPanel>
  );
}

function ShapeRecognitionFinishedView(): React.JSX.Element {
  const { finishLabel, isCoarsePointer, onFinish, onRestart, score, totalRounds, translate } = useShapeRecognitionGame();
  return (
    <KangurGlassPanel className='w-full text-center' padding='lg' surface='playField'>
      <KangurStatusChip accent='emerald' size='sm'>
        {translate('practice.finished.status')}
      </KangurStatusChip>
      <div className='mt-4 text-xl font-semibold'>
        {translate('practice.finished.title', {
          score,
          total: totalRounds,
        })}
      </div>
      <div className='mt-2 text-sm text-slate-500'>
        {translate('practice.finished.subtitle')}
      </div>
      <div className='mt-5 flex flex-wrap justify-center gap-3'>
        {onFinish ? (
          <KangurButton
            className={resolveShapeRecognitionButtonClassName(
              isCoarsePointer,
              'touch-manipulation select-none min-h-11 active:scale-[0.98]'
            )}
            variant='primary'
            onClick={onFinish}
          >
            {finishLabel}
          </KangurButton>
        ) : null}
        <KangurButton
          className={resolveShapeRecognitionButtonClassName(
            isCoarsePointer,
            'touch-manipulation select-none min-h-11 active:scale-[0.98]'
          )}
          variant={onFinish ? 'surface' : 'primary'}
          onClick={onRestart}
        >
          {translate('practice.finished.restart')}
        </KangurButton>
      </div>
    </KangurGlassPanel>
  );
}

function ShapeRecognitionRoundView({
  correctLabel,
  isCorrect,
  onNext,
  onSelect,
  round,
  roundIndex,
  selected,
  shape,
}: {
  correctLabel: string;
  isCorrect: boolean;
  onNext: () => void;
  onSelect: (option: ShapeId) => void;
  round: (typeof SHAPE_ROUNDS)[number];
  roundIndex: number;
  selected: ShapeId | null;
  shape: ReturnType<typeof buildGeometryShapeDefinitions>[number];
}): React.JSX.Element {
  const { isCoarsePointer, score, shapeLabels, totalRounds, translate } = useShapeRecognitionGame();
  return (
    <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
      <div className='flex items-center justify-between gap-3'>
        <KangurStatusChip accent='emerald' size='sm'>
          {translate('practice.progress.round', {
            current: roundIndex + 1,
            total: totalRounds,
          })}
        </KangurStatusChip>
        <div className='text-xs text-slate-500'>
          {translate('practice.progress.score', { score })}
        </div>
      </div>
      <div className='mt-5 flex flex-col items-center gap-4'>
        <ShapeIcon shape={shape.id} color={shape.color} className='h-28 w-28' />
        <div className='text-center text-lg font-semibold'>{translate('practice.question')}</div>
      </div>
      <div className='mt-5 grid gap-3 sm:grid-cols-2'>
        {round.options.map((option) => (
          <KangurButton
            key={option}
            fullWidth
            variant={resolveShapeRecognitionOptionVariant({ option, round, selected })}
            onClick={() => onSelect(option)}
            className={resolveShapeRecognitionButtonClassName(
              isCoarsePointer,
              'touch-manipulation select-none min-h-[4rem] active:scale-[0.98]'
            )}
          >
            {shapeLabels[option] ?? option}
          </KangurButton>
        ))}
      </div>
      {selected ? (
        <div className='mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
            {isCorrect
              ? translate('practice.feedback.correct')
              : translate('practice.feedback.incorrect', {
                  shape: correctLabel,
                })}
          </KangurStatusChip>
          <KangurButton
            variant='primary'
            onClick={onNext}
            className={resolveShapeRecognitionButtonClassName(
              isCoarsePointer,
              'touch-manipulation select-none min-h-11 active:scale-[0.98]'
            )}
          >
            {roundIndex + 1 >= totalRounds
              ? translate('practice.actions.finish')
              : translate('practice.actions.next')}
          </KangurButton>
        </div>
      ) : null}
    </KangurGlassPanel>
  );
}

export default function ShapeRecognitionGame({
  finishLabel,
  onFinish,
}: ShapeRecognitionGameProps): React.JSX.Element {
  const { shapeLabels, shapes, translate } = useShapeRecognitionGameContent();
  const isCoarsePointer = useKangurCoarsePointer();
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<ShapeId | null>(null);
  const [score, setScore] = useState(0);
  const resolvedFinishLabel = finishLabel ?? translate('draw.finishLabel');

  const handleRestart = useCallback((): void => {
    setSelected(null);
    setRoundIndex(0);
    setScore(0);
  }, []);

  const handleNext = useCallback((): void => {
    setSelected(null);
    setRoundIndex((prev) => prev + 1);
  }, []);

  const handleSelect = useCallback((option: ShapeId, correct: ShapeId): void => {
    if (selected) return;
    setSelected(option);
    if (option === correct) {
      setScore((prev) => prev + 1);
    }
  }, [selected]);

  const contextValue: ShapeRecognitionGameContextValue = useMemo(() => ({
    finishLabel: resolvedFinishLabel,
    isCoarsePointer,
    onFinish,
    onRestart: handleRestart,
    score,
    totalRounds: SHAPE_ROUNDS.length,
    translate,
    shapeLabels,
  }), [resolvedFinishLabel, isCoarsePointer, onFinish, handleRestart, score, translate, shapeLabels]);

  if (SHAPE_ROUNDS.length === 0) {
    return (
      <ShapeRecognitionGameContext.Provider value={contextValue}>
        <ShapeRecognitionEmptyState />
      </ShapeRecognitionGameContext.Provider>
    );
  }

  const isFinished = roundIndex >= SHAPE_ROUNDS.length;
  const safeIndex = Math.min(roundIndex, SHAPE_ROUNDS.length - 1);
  const round = SHAPE_ROUNDS[safeIndex]!;
  const shape = shapes.find((item) => item.id === round.shape) ?? shapes[0]!;
  const isCorrect = selected === round.correct;
  const correctLabel = shapeLabels[round.correct] ?? round.correct;

  if (isFinished) {
    return (
      <ShapeRecognitionGameContext.Provider value={contextValue}>
        <ShapeRecognitionFinishedView />
      </ShapeRecognitionGameContext.Provider>
    );
  }

  return (
    <ShapeRecognitionGameContext.Provider value={contextValue}>
      <ShapeRecognitionRoundView
        correctLabel={correctLabel}
        isCorrect={isCorrect}
        onNext={handleNext}
        onSelect={(option) => handleSelect(option, round.correct)}
        round={round}
        roundIndex={roundIndex}
        selected={selected}
        shape={shape}
      />
    </ShapeRecognitionGameContext.Provider>
  );
}
