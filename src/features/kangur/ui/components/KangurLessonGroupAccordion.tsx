'use client';

import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';

import {
  LazyAnimatePresence,
  LazyMotionDiv,
} from '@/features/kangur/ui/components/LazyAnimatePresence';
import {
  kangurPanelVariants,
  KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES,
} from '@/features/kangur/ui/design/primitives/KangurPanel';
import { KANGUR_LESSON_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn } from '@/features/kangur/shared/utils';
import { LESSONS_CARD_TRANSITION } from '@/features/kangur/ui/pages/lessons/Lessons.constants';

type KangurLessonGroupAccordionProps = {
  accordionId: string;
  label: ReactNode;
  typeLabel?: ReactNode;
  fallbackTypeLabel: ReactNode;
  isCoarsePointer?: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  contentProps?: HTMLAttributes<HTMLDivElement>;
};

export function KangurLessonGroupAccordion({
  accordionId,
  label,
  typeLabel: _typeLabel,
  fallbackTypeLabel: _fallbackTypeLabel,
  isCoarsePointer: isCoarsePointerOverride,
  isExpanded,
  onToggle,
  children,
  className,
  contentProps,
}: KangurLessonGroupAccordionProps): React.JSX.Element {
  const isCoarsePointer = isCoarsePointerOverride ?? useKangurCoarsePointer();
  const reactId = useId().replace(/:/g, '');
  const triggerId = `kangur-lesson-group-trigger-${accordionId}-${reactId}`;
  const panelId = `kangur-lesson-group-panel-${accordionId}-${reactId}`;
  const [isPressed, setIsPressed] = useState(false);
  const {
    className: contentClassName,
    ...contentRestProps
  } = contentProps ?? {};

  return (
    <div
      data-state={isExpanded ? 'open' : 'closed'}
      className={cn(
        kangurPanelVariants({ padding: 'lg', variant: 'soft' }),
        KANGUR_GLASS_PANEL_SURFACE_CLASSNAMES.playField,
        'kangur-panel-shell w-full kangur-lesson-group-accordion',
        className
      )}
    >
      <button
        id={triggerId}
        aria-controls={panelId}
        aria-expanded={isExpanded}
        className={cn(
          'kangur-lesson-group-trigger kangur-button-shell kangur-cta-pill surface-cta inline-flex w-full items-center justify-center gap-2 border border-transparent px-4 py-3 text-center font-bold tracking-tight shadow-sm transition-all duration-200',
          isCoarsePointer
            ? 'min-h-12 touch-manipulation select-none active:scale-[0.97]'
            : 'active:scale-[0.985]'
        )}
        data-pressed={isPressed ? 'true' : 'false'}
        data-state={isExpanded ? 'open' : 'closed'}
        type='button'
        onClick={onToggle}
        onPointerCancel={() => setIsPressed(false)}
        onPointerDown={() => setIsPressed(true)}
        onPointerLeave={() => setIsPressed(false)}
        onPointerUp={() => setIsPressed(false)}
      >
        <span className='min-w-0 text-lg font-semibold text-current'>{label}</span>
      </button>

      <LazyAnimatePresence initial={false}>
        {isExpanded ? (
          <LazyMotionDiv
            key={panelId}
            animate={{ height: 'auto', opacity: 1 }}
            className='overflow-hidden'
            exit={{ height: 0, opacity: 0 }}
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            role='region'
            aria-labelledby={triggerId}
            transition={LESSONS_CARD_TRANSITION}
          >
            <div
              className={cn(
                `mt-4 flex w-full flex-col items-center ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`,
                contentClassName
              )}
              {...contentRestProps}
            >
              {children}
            </div>
          </LazyMotionDiv>
        ) : null}
      </LazyAnimatePresence>
    </div>
  );
}
