'use client';

import React from 'react';

import { getKangurLessonActivityDefinition } from '@/features/kangur/lesson-activities';
import {
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import type { KangurLessonActivityBlock as KangurLessonActivityBlockType } from '@/shared/contracts/kangur';

import AddingBallGame from './AddingBallGame';
import CalendarInteractiveGame from './CalendarInteractiveGame';
import ClockTrainingGame from './ClockTrainingGame';
import DivisionGame from './DivisionGame';
import GeometryDrawingGame from './GeometryDrawingGame';
import MultiplicationArrayGame from './MultiplicationArrayGame';
import MultiplicationGame from './MultiplicationGame';
import SubtractingGame from './SubtractingGame';

type KangurLessonActivityBlockProps = {
  block: KangurLessonActivityBlockType;
  renderMode?: 'lesson' | 'editor';
};

type ActivityGameProps = {
  onFinish: () => void;
};

const ACTIVITY_COMPONENTS: Record<
  KangurLessonActivityBlockType['activityId'],
  React.ComponentType<ActivityGameProps>
> = {
  'adding-ball': AddingBallGame,
  'subtracting-game': SubtractingGame,
  'multiplication-array': MultiplicationArrayGame,
  'multiplication-quiz': MultiplicationGame,
  'division-game': DivisionGame,
  'geometry-drawing': GeometryDrawingGame,
  'calendar-interactive': CalendarInteractiveGame,
  'clock-training': ClockTrainingGame,
};

export function KangurLessonActivityBlock(
  props: KangurLessonActivityBlockProps
): React.JSX.Element {
  const { block, renderMode = 'lesson' } = props;
  const definition = getKangurLessonActivityDefinition(block.activityId);
  const [instanceKey, setInstanceKey] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);

  const title = block.title.trim() || definition.title;
  const description = block.description?.trim() || definition.description;
  const ActivityComponent = ACTIVITY_COMPONENTS[block.activityId];

  if (renderMode === 'editor') {
    return (
      <KangurPanel className='border-emerald-200/80 bg-white/95' padding='lg' variant='soft'>
        <div className='mb-3 flex flex-wrap items-center gap-2'>
          <KangurLessonChip accent='emerald' className='text-[10px] uppercase tracking-wide'>
            Activity
          </KangurLessonChip>
          <div className='text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700/80'>
            {definition.label}
          </div>
        </div>
        <h3 className='text-xl font-extrabold text-slate-900'>{title}</h3>
        <p className='mt-2 text-sm leading-6 text-slate-600'>{description}</p>
        <KangurLessonCallout
          accent='emerald'
          className='mt-4 border-dashed text-sm text-emerald-900'
          padding='lg'
        >
          The live game widget is hidden in editor preview. Open the lesson in learner mode to use this activity.
        </KangurLessonCallout>
      </KangurPanel>
    );
  }

  return (
    <KangurPanel className='border-emerald-200/80 bg-white/95' padding='lg' variant='soft'>
      <div className='mb-4 flex flex-wrap items-center gap-2'>
        <KangurLessonChip accent='emerald' className='text-[10px] uppercase tracking-wide'>
          Activity
        </KangurLessonChip>
        <div className='text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700/80'>
          {definition.label}
        </div>
      </div>

      <div className='mb-4'>
        <h3 className='text-xl font-extrabold text-slate-900'>{title}</h3>
        <p className='mt-2 text-sm leading-6 text-slate-600'>{description}</p>
      </div>

      {isCompleted ? (
        <KangurLessonCallout accent='emerald' className='text-sm text-emerald-950' padding='lg'>
          <p className='font-semibold'>Activity completed.</p>
          <p className='mt-2 text-emerald-900'>
            You can restart the activity to practice again without leaving the lesson page.
          </p>
          <KangurButton
            type='button'
            size='sm'
            variant='secondary'
            className='mt-4'
            onClick={(): void => {
              setIsCompleted(false);
              setInstanceKey((current) => current + 1);
            }}
          >
            Restart activity
          </KangurButton>
        </KangurLessonCallout>
      ) : (
        <ActivityComponent
          key={`${block.id}-${instanceKey}`}
          onFinish={(): void => {
            setIsCompleted(true);
          }}
        />
      )}
    </KangurPanel>
  );
}
