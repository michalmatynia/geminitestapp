'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

import {
  KangurLessonCallout,
  KangurLessonCaption,
  KangurLessonInset,
  KangurLessonLead,
  KangurLessonStack,
} from '@/features/kangur/ui/design/lesson-primitives';
import {
  KangurButton,
  KangurGradientHeading,
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_ROW_SPACED_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { KangurMiniGameFinishActionProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

export type AgenticAssignmentGameOption<OptionId extends string> = {
  id: OptionId;
  label: string;
  description: string;
  colorClass: string;
};

export type AgenticAssignmentGameItem<OptionId extends string> = {
  id: string;
  text: string;
  answer: OptionId;
};

type AgenticAssignmentGameCopy = {
  statusLabel: string;
  heading: string;
  lead: string;
  instructions: string[];
  leftPanelTitle: string;
  leftPanelCaption: {
    coarsePointer: string;
    finePointer: string;
  };
  leftPanelCountLabel: (assignedCount: number, total: number) => string;
  leftPanelGroupLabel: string;
  leftPanelTouchHint: {
    idle: string;
    selected: (itemText: string) => string;
    testId: string;
  };
  rightPanelTitle: string;
  rightPanelCaption: {
    coarsePointer: string;
    finePointer: string;
  };
  rightPanelGroupLabel: string;
  successMessage: string;
  failureMessage: (score: number, total: number) => string;
};

type AgenticAssignmentGameTheme = {
  accent: KangurAccent;
  heroClassName: string;
  heroTopGlowClassName: string;
  heroBottomGlowClassName: string;
  headingGradientClass: string;
  instructionListClassName: string;
  leftPanelGlowClassName: string;
  leftPanelTitleClassName: string;
  leftPanelCaptionClassName: string;
  leftTouchHintClassName: string;
  leftItemFocusRingClassName: string;
  leftItemActiveClassName: string;
  leftItemInactiveClassName: string;
  leftItemCorrectClassName: string;
  leftItemWrongClassName: string;
  leftAssignedBadgeClassName: string;
  rightPanelGlowClassName: string;
  rightPanelTitleClassName: string;
  rightPanelCaptionClassName: string;
  rightOptionFocusRingClassName: string;
  rightOptionDescriptionClassName: string;
};

type AgenticAssignmentGameProps<OptionId extends string> =
  KangurMiniGameFinishActionProps & {
    copy: AgenticAssignmentGameCopy;
    items: AgenticAssignmentGameItem<OptionId>[];
    options: AgenticAssignmentGameOption<OptionId>[];
    theme: AgenticAssignmentGameTheme;
    visual: ReactNode;
  };

export function AgenticAssignmentGame<OptionId extends string>({
  copy,
  items,
  onFinish,
  options,
  theme,
  visual,
}: AgenticAssignmentGameProps<OptionId>): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Record<string, OptionId>>({});
  const [checked, setChecked] = useState(false);

  const assignedCount = Object.keys(assignments).length;
  const progress = Math.round((assignedCount / items.length) * 100);
  const score = items.filter((item) => assignments[item.id] === item.answer).length;
  const isPerfect = score === items.length && assignedCount === items.length;
  const activeItem = activeItemId
    ? items.find((item) => item.id === activeItemId) ?? null
    : null;
  const touchHint = activeItem
    ? copy.leftPanelTouchHint.selected(activeItem.text)
    : copy.leftPanelTouchHint.idle;

  const handleAssign = (optionId: OptionId) => {
    if (!activeItemId) {
      return;
    }

    setAssignments((prev) => ({
      ...prev,
      [activeItemId]: optionId,
    }));
    setActiveItemId(null);
    setChecked(false);
  };

  const handleReset = () => {
    setAssignments({});
    setActiveItemId(null);
    setChecked(false);
  };

  return (
    <KangurLessonStack align='start' className='w-full'>
      <div className={cn('relative w-full overflow-hidden rounded-[28px] p-6', theme.heroClassName)}>
        <div
          className={cn(
            'pointer-events-none absolute h-36 w-36 rounded-full blur-3xl',
            theme.heroTopGlowClassName
          )}
        />
        <div
          className={cn(
            'pointer-events-none absolute h-28 w-28 rounded-full blur-3xl',
            theme.heroBottomGlowClassName
          )}
        />
        <div className='relative flex flex-col gap-4'>
          <KangurStatusChip accent={theme.accent} labelStyle='caps'>
            {copy.statusLabel}
          </KangurStatusChip>
          <KangurGradientHeading gradientClass={theme.headingGradientClass} size='lg'>
            {copy.heading}
          </KangurGradientHeading>
          <KangurLessonLead align='left'>{copy.lead}</KangurLessonLead>
          <KangurLessonCallout accent={theme.accent} className='text-left' padding='sm'>
            <ul className={theme.instructionListClassName}>
              {copy.instructions.map((instruction) => (
                <li key={instruction}>{instruction}</li>
              ))}
            </ul>
          </KangurLessonCallout>
        </div>
      </div>

      <div className={`grid ${KANGUR_PANEL_GAP_CLASSNAME} lg:grid-cols-[1.6fr_1fr]`}>
        <KangurInfoCard
          accent={theme.accent}
          className='relative overflow-hidden'
          tone='accent'
        >
          <div
            className={cn('pointer-events-none absolute inset-0 opacity-40', theme.leftPanelGlowClassName)}
          />
          <div className='relative flex flex-col gap-4'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div>
                <p className={cn('text-sm font-semibold', theme.leftPanelTitleClassName)}>
                  {copy.leftPanelTitle}
                </p>
                <KangurLessonCaption className={theme.leftPanelCaptionClassName}>
                  {isCoarsePointer
                    ? copy.leftPanelCaption.coarsePointer
                    : copy.leftPanelCaption.finePointer}
                </KangurLessonCaption>
              </div>
              <KangurStatusChip accent={theme.accent} size='sm'>
                {copy.leftPanelCountLabel(assignedCount, items.length)}
              </KangurStatusChip>
            </div>
            <KangurProgressBar accent={theme.accent} size='sm' value={progress} />
            {isCoarsePointer ? (
              <div
                aria-live='polite'
                className={cn(
                  'rounded-2xl border bg-white/80 px-4 py-3 text-sm font-semibold shadow-sm',
                  theme.leftTouchHintClassName
                )}
                data-testid={copy.leftPanelTouchHint.testId}
              >
                {touchHint}
              </div>
            ) : null}

            <div
              aria-label={copy.leftPanelGroupLabel}
              className='grid gap-3'
              role='group'
            >
              {items.map((item) => {
                const assignedOptionId = assignments[item.id];
                const assignedOption = assignedOptionId
                  ? options.find((option) => option.id === assignedOptionId) ?? null
                  : null;
                const isActive = activeItemId === item.id;
                const isCorrect = checked && assignedOptionId === item.answer;
                const isWrong =
                  checked &&
                  assignedOptionId !== undefined &&
                  assignedOptionId !== item.answer;

                return (
                  <button
                    key={item.id}
                    aria-pressed={isActive}
                    className={cn(
                      'w-full rounded-2xl border bg-white/80 text-left text-sm font-semibold transition-all touch-manipulation select-none',
                      isCoarsePointer
                        ? 'min-h-[5rem] px-4 py-4 active:scale-[0.99] active:shadow-sm'
                        : 'px-4 py-3 hover:-translate-y-0.5 hover:shadow-md',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white',
                      theme.leftItemFocusRingClassName,
                      isActive && theme.leftItemActiveClassName,
                      !isActive && theme.leftItemInactiveClassName,
                      isCorrect && theme.leftItemCorrectClassName,
                      isWrong && theme.leftItemWrongClassName
                    )}
                    onClick={() => setActiveItemId(item.id)}
                    type='button'
                  >
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <span>{item.text}</span>
                      {assignedOption ? (
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em]',
                            theme.leftAssignedBadgeClassName
                          )}
                        >
                          {assignedOption.label}
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </KangurInfoCard>

        <KangurLessonInset accent={theme.accent} className='relative overflow-hidden'>
          <div
            className={cn('pointer-events-none absolute inset-0 opacity-40', theme.rightPanelGlowClassName)}
          />
          <div className='relative flex h-full flex-col gap-4'>
            <div className='flex items-center justify-between'>
              <div>
                <p className={cn('text-sm font-semibold', theme.rightPanelTitleClassName)}>
                  {copy.rightPanelTitle}
                </p>
                <KangurLessonCaption className={theme.rightPanelCaptionClassName}>
                  {isCoarsePointer
                    ? copy.rightPanelCaption.coarsePointer
                    : copy.rightPanelCaption.finePointer}
                </KangurLessonCaption>
              </div>
              {visual}
            </div>
            <div
              aria-label={copy.rightPanelGroupLabel}
              className={cn('grid gap-3', KANGUR_GRID_TIGHT_CLASSNAME)}
              role='group'
            >
              {options.map((option) => (
                <button
                  key={option.id}
                  aria-disabled={!activeItemId}
                  aria-label={option.label}
                  className={cn(
                    'rounded-2xl border text-left text-sm font-semibold transition-all touch-manipulation select-none',
                    isCoarsePointer
                      ? 'min-h-[5rem] px-4 py-4 active:scale-[0.99] active:shadow-sm'
                      : 'px-4 py-3 hover:-translate-y-0.5 hover:shadow-md',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-white',
                    theme.rightOptionFocusRingClassName,
                    option.colorClass,
                    activeItemId ? 'opacity-100' : 'opacity-60'
                  )}
                  disabled={!activeItemId}
                  onClick={() => handleAssign(option.id)}
                  type='button'
                >
                  <div className='text-xs font-semibold uppercase tracking-[0.2em]'>
                    {option.label}
                  </div>
                  <KangurLessonCaption
                    className={cn('mt-1', theme.rightOptionDescriptionClassName)}
                  >
                    {option.description}
                  </KangurLessonCaption>
                </button>
              ))}
            </div>

            {checked ? (
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-xs font-semibold',
                  isPerfect
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-amber-200 bg-amber-50 text-amber-900'
                )}
              >
                {isPerfect
                  ? copy.successMessage
                  : copy.failureMessage(score, items.length)}
              </div>
            ) : null}

            <div
              className={cn(
                'mt-auto flex flex-wrap items-center gap-2',
                KANGUR_WRAP_ROW_SPACED_CLASSNAME
              )}
            >
              <KangurButton onClick={handleReset} size='sm' type='button' variant='surface'>
                Reset
              </KangurButton>
              <KangurButton
                onClick={() => setChecked(true)}
                size='sm'
                type='button'
                variant='primary'
              >
                Check
              </KangurButton>
              <div className='flex-1' />
              <KangurButton onClick={onFinish} size='sm' type='button' variant='ghost'>
                Back to lesson
              </KangurButton>
            </div>
          </div>
        </KangurLessonInset>
      </div>
    </KangurLessonStack>
  );
}
