import React from 'react';

import { getKangurLessonActivityDefinition } from '@/features/kangur/lesson-activities';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
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

const ACTIVITY_CHIP_CLASSNAME = 'text-[10px] uppercase tracking-wide';

type KangurLessonActivityHeaderProps = {
  badgeRowClassName: string;
  label: string;
  title: string;
  description: string;
  wrapperClassName?: string;
};

function KangurLessonActivityHeader({
  badgeRowClassName,
  description,
  label,
  title,
  wrapperClassName,
}: KangurLessonActivityHeaderProps): React.JSX.Element {
  return (
    <div className={wrapperClassName}>
      <div className={badgeRowClassName}>
        <KangurStatusChip accent='emerald' className={ACTIVITY_CHIP_CLASSNAME} size='sm'>
          Activity
        </KangurStatusChip>
        <KangurStatusChip accent='slate' className={ACTIVITY_CHIP_CLASSNAME} size='sm'>
          {label}
        </KangurStatusChip>
      </div>
      <KangurCardTitle as='h3' size='xl'>
        {title}
      </KangurCardTitle>
      <KangurCardDescription as='p' className='mt-2' relaxed>
        {description}
      </KangurCardDescription>
    </div>
  );
}

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
        <KangurLessonActivityHeader
          badgeRowClassName='mb-3 flex flex-wrap items-center gap-2'
          description={description}
          label={definition.label}
          title={title}
        />
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
      <KangurLessonActivityHeader
        badgeRowClassName='mb-4 flex flex-wrap items-center gap-2'
        description={description}
        label={definition.label}
        title={title}
        wrapperClassName='mb-4'
      />

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
