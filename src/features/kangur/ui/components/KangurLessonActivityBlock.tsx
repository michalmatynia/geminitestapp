'use client';

import React from 'react';

import { getKangurLessonActivityDefinition } from '@/features/kangur/lesson-activities';
import {
  KangurButton,
  KangurEmptyState,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurSurfacePanel,
} from '@/features/kangur/ui/design/primitives';
import type { KangurLessonActivityBlock as KangurLessonActivityBlockType } from '@/shared/contracts/kangur';

import AddingBallGame from './AddingBallGame';
import AddingSynthesisGame from './AddingSynthesisGame';
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
  'adding-synthesis': AddingSynthesisGame,
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
      <KangurSurfacePanel
        accent='emerald'
        data-testid='lesson-activity-block-editor-shell'
        padding='lg'
      >
        <div className='mb-3 flex flex-wrap items-center gap-2'>
          <KangurStatusChip accent='emerald' className='text-[10px] uppercase tracking-wide' size='sm'>
            Activity
          </KangurStatusChip>
          <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-wide' size='sm'>
            {definition.label}
          </KangurStatusChip>
        </div>
        <h3 className='text-xl font-extrabold text-slate-900'>{title}</h3>
        <p className='mt-2 text-sm leading-6 text-slate-600'>{description}</p>
        <KangurEmptyState
          accent='emerald'
          align='left'
          className='mt-4 text-sm'
          description='The live game widget is hidden in editor preview. Open the lesson in learner mode to use this activity.'
          padding='lg'
        />
      </KangurSurfacePanel>
    );
  }

  return (
    <KangurSurfacePanel
      accent='emerald'
      data-testid='lesson-activity-block-shell'
      padding='lg'
    >
      <div className='mb-4 flex flex-wrap items-center gap-2'>
        <KangurStatusChip accent='emerald' className='text-[10px] uppercase tracking-wide' size='sm'>
          Activity
        </KangurStatusChip>
        <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-wide' size='sm'>
          {definition.label}
        </KangurStatusChip>
      </div>

      <div className='mb-4'>
        <h3 className='text-xl font-extrabold text-slate-900'>{title}</h3>
        <p className='mt-2 text-sm leading-6 text-slate-600'>{description}</p>
      </div>

      {isCompleted ? (
        <KangurSummaryPanel
          accent='emerald'
          className='text-sm'
          description='You can restart the activity to practice again without leaving the lesson page.'
          padding='lg'
          title='Activity completed.'
          tone='accent'
        >
          <KangurButton
            type='button'
            size='sm'
            variant='surface'
            className='mt-4'
            onClick={(): void => {
              setIsCompleted(false);
              setInstanceKey((current) => current + 1);
            }}
          >
            Restart activity
          </KangurButton>
        </KangurSummaryPanel>
      ) : (
        <ActivityComponent
          key={`${block.id}-${instanceKey}`}
          onFinish={(): void => {
            setIsCompleted(true);
          }}
        />
      )}
    </KangurSurfacePanel>
  );
}
