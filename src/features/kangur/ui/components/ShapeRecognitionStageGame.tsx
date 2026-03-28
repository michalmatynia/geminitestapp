'use client';

import { useMemo, useState } from 'react';
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

type ShapeRecognitionStageGameProps = {
  finishLabel?: string;
  onFinish?: () => void;
};

export default function ShapeRecognitionStageGame({
  finishLabel,
  onFinish,
}: ShapeRecognitionStageGameProps): React.JSX.Element {
  const runtimeTemplate = useOptionalKangurLessonTemplate('geometry_shape_recognition');
  const messages = useMessages() as Record<string, unknown>;
  const fallbackTranslate = useMemo<LessonTranslate>(() => {
    const staticLessons = messages['KangurStaticLessons'];
    const lessonMessages =
      staticLessons && typeof staticLessons === 'object' && !Array.isArray(staticLessons)
        ? (((staticLessons as Record<string, unknown>)['geometryShapeRecognition'] as
            | Record<string, unknown>
            | undefined) ??
          {})
        : {};

    return createGeometryShapeRecognitionMessageTranslate(lessonMessages);
  }, [messages]);
  const resolvedContent = useMemo(
    () => resolveGeometryShapeRecognitionLessonContent(runtimeTemplate, fallbackTranslate),
    [fallbackTranslate, runtimeTemplate],
  );
  const translate = useMemo(
    () => createGeometryShapeRecognitionLessonTranslate(resolvedContent),
    [resolvedContent],
  );
  const shapes = useMemo(() => buildGeometryShapeDefinitions(translate), [translate]);
  const shapeLabels = useMemo(
    () =>
      Object.fromEntries(
        shapes.map((shape) => [shape.id, shape.label])
      ) as Record<ShapeId, string>,
    [shapes]
  );
  const isCoarsePointer = useKangurCoarsePointer();
  const [roundIndex, setRoundIndex] = useState(0);
  const [selected, setSelected] = useState<ShapeId | null>(null);
  const [score, setScore] = useState(0);
  const resolvedFinishLabel = finishLabel ?? translate('draw.finishLabel');

  if (SHAPE_ROUNDS.length === 0) {
    return (
      <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
        <div className='text-sm text-slate-500'>{translate('practice.emptyRounds')}</div>
      </KangurGlassPanel>
    );
  }

  const isFinished = roundIndex >= SHAPE_ROUNDS.length;
  const safeIndex = Math.min(roundIndex, SHAPE_ROUNDS.length - 1);
  const round = SHAPE_ROUNDS[safeIndex]!;
  const shape = shapes.find((item) => item.id === round.shape) ?? shapes[0]!;
  const isCorrect = selected === round.correct;
  const correctLabel = shapeLabels[round.correct] ?? round.correct;

  const handleSelect = (option: ShapeId): void => {
    if (selected) return;
    setSelected(option);
    if (option === round.correct) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = (): void => {
    setSelected(null);
    setRoundIndex((prev) => prev + 1);
  };

  const handleRestart = (): void => {
    setSelected(null);
    setRoundIndex(0);
    setScore(0);
  };

  if (isFinished) {
    return (
      <KangurGlassPanel className='w-full text-center' padding='lg' surface='playField'>
        <KangurStatusChip accent='emerald' size='sm'>
          {translate('practice.finished.status')}
        </KangurStatusChip>
        <div className='mt-4 text-xl font-semibold'>
          {translate('practice.finished.title', {
            score,
            total: SHAPE_ROUNDS.length,
          })}
        </div>
        <div className='mt-2 text-sm text-slate-500'>
          {translate('practice.finished.subtitle')}
        </div>
        <div className='mt-5 flex flex-wrap justify-center gap-3'>
          {onFinish ? (
            <KangurButton
              className={
                isCoarsePointer
                  ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]'
                  : undefined
              }
              variant='primary'
              onClick={onFinish}
            >
              {resolvedFinishLabel}
            </KangurButton>
          ) : null}
          <KangurButton
            className={
              isCoarsePointer
                ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]'
                : undefined
            }
            variant={onFinish ? 'surface' : 'primary'}
            onClick={handleRestart}
          >
            {translate('practice.finished.restart')}
          </KangurButton>
        </div>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurGlassPanel className='w-full' padding='lg' surface='playField'>
      <div className='flex items-center justify-between gap-3'>
        <KangurStatusChip accent='emerald' size='sm'>
          {translate('practice.progress.round', {
            current: roundIndex + 1,
            total: SHAPE_ROUNDS.length,
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
        {round.options.map((option) => {
          const variant = selected === option
            ? option === round.correct
              ? 'success'
              : 'warning'
            : 'surface';
          return (
            <KangurButton
              key={option}
              fullWidth
              variant={variant}
              onClick={() => handleSelect(option)}
              className={
                isCoarsePointer
                  ? 'touch-manipulation select-none min-h-[4rem] active:scale-[0.98]'
                  : undefined
              }
            >
              {shapeLabels[option] ?? option}
            </KangurButton>
          );
        })}
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
            onClick={handleNext}
            className={
              isCoarsePointer
                ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]'
                : undefined
            }
          >
            {roundIndex + 1 >= SHAPE_ROUNDS.length
              ? translate('practice.actions.finish')
              : translate('practice.actions.next')}
          </KangurButton>
        </div>
      ) : null}
    </KangurGlassPanel>
  );
}
