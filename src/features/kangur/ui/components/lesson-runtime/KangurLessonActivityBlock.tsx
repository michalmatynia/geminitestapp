'use client';

import { Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import React, { createContext, useContext } from 'react';

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

export type KangurLessonActivityRuntimeContextValue = {
  onFinish: () => void;
};

export const KangurLessonActivityRuntimeContext = createContext<KangurLessonActivityRuntimeContextValue | null>(null);

export function useKangurLessonActivityRuntimeContext(): KangurLessonActivityRuntimeContextValue {
  const context = useContext(KangurLessonActivityRuntimeContext);
  if (!context) {
    throw new Error('useKangurLessonActivityRuntimeContext must be used within KangurLessonActivityBlock');
  }
  return context;
}

type KangurLessonActivityBlockContextValue = {
  activityRuntime: ReturnType<typeof getLocalizedKangurLessonActivityDefinition>['lessonActivityRuntime'];
  blockId: string;
  definitionLabel: string;
  description: string;
  instanceKey: number;
  isCoarsePointer: boolean;
  isCompleted: boolean;
  lessonPrint: ReturnType<typeof useOptionalKangurLessonPrint>;
  printPanelId: string;
  printPanelLabel: string;
  title: string;
};

const KangurLessonActivityBlockContext = createContext<KangurLessonActivityBlockContextValue | null>(null);

function useKangurLessonActivityBlock(): KangurLessonActivityBlockContextValue {
  const context = useContext(KangurLessonActivityBlockContext);
  if (!context) {
    throw new Error('useKangurLessonActivityBlock must be used within KangurLessonActivityBlock');
  }
  return context;
}

export function KangurLessonActivityRuntimeProvider({
  children,
  onFinish,
}: {
  children: React.ReactNode;
  onFinish: () => void;
}): React.JSX.Element {
  return (
    <KangurLessonActivityRuntimeContext.Provider value={{ onFinish }}>
      {children}
    </KangurLessonActivityRuntimeContext.Provider>
  );
}

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

function KangurLessonActivityEditorPreview(): React.JSX.Element {
  const { definitionLabel, description, title } = useKangurLessonActivityBlock();

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

function KangurLessonActivityPrintButton(): React.JSX.Element | null {
  const { isCoarsePointer, lessonPrint, printPanelId, printPanelLabel } = useKangurLessonActivityBlock();
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

function KangurLessonActivityPrintSummary(): React.JSX.Element {
  const { description, isCompleted, title } = useKangurLessonActivityBlock();
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
  onRestart,
}: {
  onRestart: () => void;
}): React.JSX.Element {
  const { isCoarsePointer } = useKangurLessonActivityBlock();

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

function KangurLessonActivityRuntimeState(): React.JSX.Element | null {
  const { activityRuntime, blockId, instanceKey } = useKangurLessonActivityBlock();
  if (!activityRuntime) {
    return null;
  }

  return (
    <div data-kangur-print-exclude='true'>
      <KangurLessonActivityRuntime
        key={`${blockId}-${instanceKey}`}
        runtime={activityRuntime}
      />
    </div>
  );
}

function KangurLessonActivityUnavailableState(): React.JSX.Element | null {
  const { activityRuntime } = useKangurLessonActivityBlock();
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

  const contextValue: KangurLessonActivityBlockContextValue = {
    activityRuntime,
    blockId: block.id,
    definitionLabel: definition.label,
    description,
    instanceKey,
    isCoarsePointer,
    isCompleted,
    lessonPrint,
    printPanelId,
    printPanelLabel,
    title,
  };

  if (renderMode === 'editor') {
    return (
      <KangurLessonActivityBlockContext.Provider value={contextValue}>
        <KangurLessonActivityEditorPreview />
      </KangurLessonActivityBlockContext.Provider>
    );
  }

  return (
    <KangurLessonActivityBlockContext.Provider value={contextValue}>
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
          <KangurLessonActivityPrintButton />
        </div>

        <KangurLessonActivityPrintSummary />

        {isCompleted ? (
          <KangurLessonActivityCompletedState
            onRestart={(): void => {
              setIsCompleted(false);
              setInstanceKey((current) => current + 1);
            }}
          />
        ) : (
          <KangurLessonActivityRuntimeContext.Provider
            value={{
              onFinish: (): void => {
                setIsCompleted(true);
              },
            }}
          >
            <KangurLessonActivityRuntimeState />
            <KangurLessonActivityUnavailableState />
          </KangurLessonActivityRuntimeContext.Provider>
        )}
      </KangurSurfacePanel>
    </KangurLessonActivityBlockContext.Provider>
  );
}
