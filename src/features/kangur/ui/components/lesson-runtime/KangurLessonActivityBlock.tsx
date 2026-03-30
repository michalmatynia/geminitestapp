'use client';

import { Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React from 'react';

import { getLocalizedKangurLessonActivityDefinition } from '@/features/kangur/lessons/activities';
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
import { KangurLessonActivityRuntime } from '../KangurLessonActivityRuntime';

type KangurLessonActivityBlockProps = {
  block: KangurLessonActivityBlockType;
  renderMode?: 'lesson' | 'editor';
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

const resolveKangurLessonActivityButtonClassName = (
  isCoarsePointer: boolean,
  includeMarginTop = false
): string => {
  const spacing = includeMarginTop ? 'mt-4 ' : '';

  return isCoarsePointer
    ? `${spacing}min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]`
    : `${spacing}px-4`;
};

function KangurLessonActivityEditorPreview({
  definitionLabel,
  description,
  title,
}: {
  definitionLabel: string;
  description: string;
  title: string;
}): React.JSX.Element {
  return (
    <KangurSurfacePanel
      accent='emerald'
      data-testid='lesson-activity-block-editor-shell'
      padding='lg'
    >
      <KangurLessonActivityHeader
        badgeRowClassName={`mb-3 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME}`}
        description={description}
        label={definitionLabel}
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

function KangurLessonActivityPrintButton({
  isCoarsePointer,
  lessonPrint,
  printPanelId,
  printPanelLabel,
}: {
  isCoarsePointer: boolean;
  lessonPrint: ReturnType<typeof useOptionalKangurLessonPrint>;
  printPanelId: string;
  printPanelLabel: string;
}): React.JSX.Element | null {
  if (!lessonPrint?.onPrintPanel) {
    return null;
  }

  return (
    <div className='mb-4 flex justify-end'>
      <KangurButton
        aria-label={printPanelLabel}
        className={resolveKangurLessonActivityButtonClassName(isCoarsePointer)}
        data-testid='lesson-activity-block-print-button'
        size='sm'
        title={printPanelLabel}
        type='button'
        variant='surface'
        onClick={(): void => {
          lessonPrint.onPrintPanel?.(printPanelId);
        }}
      >
        <Printer className='h-4 w-4 flex-shrink-0' aria-hidden='true' />
        <span className='sr-only'>{printPanelLabel}</span>
      </KangurButton>
    </div>
  );
}

function KangurLessonActivityPrintSummary({
  description,
  isCompleted,
  title,
}: {
  description: string;
  isCompleted: boolean;
  title: string;
}): React.JSX.Element {
  const summaryText = isCompleted
    ? 'Completed in the live lesson view.'
    : 'Open this lesson on screen to play the interactive task.';

  return (
    <div
      className='kangur-print-only space-y-2 border-b border-slate-200 pb-4'
      data-testid='lesson-activity-block-print-summary'
    >
      <div className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
        Interactive activity
      </div>
      <div className='text-xl font-black text-slate-900'>{title}</div>
      <p className='text-sm text-slate-600'>{description}</p>
      <p className='text-sm text-slate-600'>{summaryText}</p>
    </div>
  );
}

function KangurLessonActivityCompletedState({
  isCoarsePointer,
  onRestart,
}: {
  isCoarsePointer: boolean;
  onRestart: () => void;
}): React.JSX.Element {
  return (
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
        className={resolveKangurLessonActivityButtonClassName(isCoarsePointer, true)}
        size='sm'
        type='button'
        variant='surface'
        onClick={onRestart}
      >
        Restart activity
      </KangurButton>
    </KangurSummaryPanel>
  );
}

function KangurLessonActivityRuntimeState({
  activityRuntime,
  blockId,
  instanceKey,
  onFinish,
}: {
  activityRuntime: ReturnType<typeof getLocalizedKangurLessonActivityDefinition>['lessonActivityRuntime'];
  blockId: string;
  instanceKey: number;
  onFinish: () => void;
}): React.JSX.Element | null {
  if (!activityRuntime) {
    return null;
  }

  return (
    <div data-kangur-print-exclude='true'>
      <KangurLessonActivityRuntime
        key={`${blockId}-${instanceKey}`}
        runtime={activityRuntime}
        onFinish={onFinish}
      />
    </div>
  );
}

function KangurLessonActivityUnavailableState({
  activityRuntime,
}: {
  activityRuntime: ReturnType<typeof getLocalizedKangurLessonActivityDefinition>['lessonActivityRuntime'];
}): React.JSX.Element | null {
  if (activityRuntime) {
    return null;
  }

  return (
    <KangurEmptyState
      accent='amber'
      align='left'
      className='text-left text-sm'
      data-kangur-print-exclude='true'
      description='The lesson activity runtime could not be resolved from the current Kangur game catalog.'
      padding='lg'
      title='Activity unavailable'
    />
  );
}

export function KangurLessonActivityBlock(
  props: KangurLessonActivityBlockProps
): React.JSX.Element {
  const { block, renderMode = 'lesson' } = props;
  const locale = useLocale();
  const navigationTranslations = useTranslations('KangurLessonsWidgets.navigation');
  const isCoarsePointer = useKangurCoarsePointer();
  const lessonPrint = useOptionalKangurLessonPrint();
  const definition = getLocalizedKangurLessonActivityDefinition(block.activityId, locale);
  const [instanceKey, setInstanceKey] = React.useState(0);
  const [isCompleted, setIsCompleted] = React.useState(false);
  const printPanelId = `lesson-activity-block-${block.id}`;
  const printPanelLabel = navigationTranslations('printPanel');

  const title = block.title.trim() || definition.title;
  const description = block.description?.trim() || definition.description;
  const activityRuntime = definition.lessonActivityRuntime ?? null;

  if (renderMode === 'editor') {
    return (
      <KangurLessonActivityEditorPreview
        definitionLabel={definition.label}
        description={description}
        title={title}
      />
    );
  }

  return (
    <KangurSurfacePanel
      accent='emerald'
      data-kangur-print-panel='true'
      data-kangur-print-paged-panel='true'
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
        <KangurLessonActivityPrintButton
          isCoarsePointer={isCoarsePointer}
          lessonPrint={lessonPrint}
          printPanelId={printPanelId}
          printPanelLabel={printPanelLabel}
        />
      </div>

      <KangurLessonActivityPrintSummary
        description={description}
        isCompleted={isCompleted}
        title={title}
      />

      {isCompleted ? (
        <KangurLessonActivityCompletedState
          isCoarsePointer={isCoarsePointer}
          onRestart={(): void => {
            setIsCompleted(false);
            setInstanceKey((current) => current + 1);
          }}
        />
      ) : (
        <>
          <KangurLessonActivityRuntimeState
            activityRuntime={activityRuntime}
            blockId={block.id}
            instanceKey={instanceKey}
            onFinish={(): void => {
              setIsCompleted(true);
            }}
          />
          <KangurLessonActivityUnavailableState activityRuntime={activityRuntime} />
        </>
      )}
    </KangurSurfacePanel>
  );
}
