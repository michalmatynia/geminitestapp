'use client';

import { Printer } from 'lucide-react';
import { useTranslations } from 'next-intl';
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
import { KANGUR_WRAP_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useOptionalKangurLessonPrint } from '@/features/kangur/ui/context/KangurLessonPrintContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { KangurLessonActivityBlock as KangurLessonActivityBlockType } from '@/features/kangur/shared/contracts/kangur';
import type { KangurMiniGameFinishActionProps } from '@/features/kangur/ui/types';

import AddingBallGame from './AddingBallGame';
import AddingSynthesisGame from './AddingSynthesisGame';
import CalendarInteractiveGame from './CalendarInteractiveGame';
import ClockTrainingGame from './ClockTrainingGame';
import DivisionGame from './DivisionGame';
import GeometryDrawingGame from './GeometryDrawingGame';
import MultiplicationArrayGame from './MultiplicationArrayGame';
import MultiplicationGame from './MultiplicationGame';
import SubtractingGardenGame from './SubtractingGardenGame';

type KangurLessonActivityBlockProps = {
  block: KangurLessonActivityBlockType;
  renderMode?: 'lesson' | 'editor';
};

const ACTIVITY_COMPONENTS: Record<
  KangurLessonActivityBlockType['activityId'],
  React.ComponentType<KangurMiniGameFinishActionProps>
> = {
  'adding-ball': AddingBallGame,
  'adding-synthesis': AddingSynthesisGame,
  'subtracting-game': SubtractingGardenGame,
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
  const navigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const isCoarsePointer = useKangurCoarsePointer();
  const lessonPrint = useOptionalKangurLessonPrint();
  const definition = getKangurLessonActivityDefinition(block.activityId);
  const [instanceKey, setInstanceKey] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const printPanelId = `lesson-activity-block-${block.id}`;
  const printPanelLabel = navigationTranslations('printPanel');

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
          badgeRowClassName={`mb-3 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME}`}
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
      data-kangur-print-panel='true'
      data-kangur-print-panel-id={printPanelId}
      data-kangur-print-panel-title={title}
      data-testid='lesson-activity-block-shell'
      padding='lg'
    >
      <div data-kangur-print-exclude='true'>
        <KangurLessonActivityHeader
          badgeRowClassName={`mb-4 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME}`}
          description={description}
          label={definition.label}
          title={title}
          wrapperClassName='mb-4'
        />
        {lessonPrint?.onPrintPanel ? (
          <div className='mb-4 flex justify-end'>
            <KangurButton
              type='button'
              size='sm'
              variant='surface'
              className={
                isCoarsePointer
                  ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
                  : 'px-4'
              }
              data-testid='lesson-activity-block-print-button'
              aria-label={printPanelLabel}
              title={printPanelLabel}
              onClick={(): void => {
                lessonPrint.onPrintPanel?.(printPanelId);
              }}
            >
              <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
              <span className='sr-only'>{printPanelLabel}</span>
            </KangurButton>
          </div>
        ) : null}
      </div>

      <div
        className='kangur-print-only space-y-2 border-b border-slate-200 pb-4'
        data-testid='lesson-activity-block-print-summary'
      >
        <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
          Interactive activity
        </div>
        <div className='text-xl font-black text-slate-900'>{title}</div>
        <p className='text-sm text-slate-600'>{description}</p>
        <p className='text-sm text-slate-600'>
          {isCompleted
            ? 'Completed in the live lesson view.'
            : 'Open this lesson on screen to play the interactive task.'}
        </p>
      </div>

      {isCompleted ? (
        <KangurSummaryPanel
          accent='emerald'
          className='text-sm'
          data-kangur-print-exclude='true'
          description='You can restart the activity to practice again without leaving the lesson page.'
          padding='lg'
          title='Activity completed.'
          tone='accent'
        >
          <KangurButton
            type='button'
            size='sm'
            variant='surface'
            className={
              isCoarsePointer
                ? 'mt-4 min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
                : 'mt-4'
            }
            onClick={(): void => {
              setIsCompleted(false);
              setInstanceKey((current) => current + 1);
            }}
          >
            Restart activity
          </KangurButton>
        </KangurSummaryPanel>
      ) : (
        <div data-kangur-print-exclude='true'>
          <ActivityComponent
            key={`${block.id}-${instanceKey}`}
            onFinish={(): void => {
              setIsCompleted(true);
            }}
          />
        </div>
      )}
    </KangurSurfacePanel>
  );
}
