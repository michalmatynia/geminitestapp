'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useId, useState, type HTMLAttributes, type ReactNode } from 'react';

import { KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { KANGUR_LESSON_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import { LESSONS_CARD_TRANSITION } from '@/features/kangur/ui/pages/lessons/Lessons.constants';

type KangurLessonGroupAccordionProps = {
  accordionId: string;
  label: ReactNode;
  typeLabel?: ReactNode;
  fallbackTypeLabel: ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: ReactNode;
  className?: string;
  contentProps?: HTMLAttributes<HTMLDivElement>;
};

export function KangurLessonGroupAccordion({
  accordionId,
  label,
  typeLabel,
  fallbackTypeLabel,
  isExpanded,
  onToggle,
  children,
  className,
  contentProps,
}: KangurLessonGroupAccordionProps): React.JSX.Element {
  const reactId = useId().replace(/:/g, '');
  const triggerId = `kangur-lesson-group-trigger-${accordionId}-${reactId}`;
  const panelId = `kangur-lesson-group-panel-${accordionId}-${reactId}`;
  const [isPressed, setIsPressed] = useState(false);
  const {
    className: contentClassName,
    ...contentRestProps
  } = contentProps ?? {};

  return (
    <KangurGlassPanel
      className={cn('w-full kangur-lesson-group-accordion', className)}
      data-state={isExpanded ? 'open' : 'closed'}
      padding='lg'
      surface='playField'
    >
      <motion.button
        id={triggerId}
        aria-controls={panelId}
        aria-expanded={isExpanded}
        className='kangur-lesson-group-trigger flex items-center justify-between gap-3 text-left'
        data-pressed={isPressed ? 'true' : 'false'}
        data-state={isExpanded ? 'open' : 'closed'}
        type='button'
        whileTap={{ scale: 0.992 }}
        onClick={onToggle}
        onPointerCancel={() => setIsPressed(false)}
        onPointerDown={() => setIsPressed(true)}
        onPointerLeave={() => setIsPressed(false)}
        onPointerUp={() => setIsPressed(false)}
      >
        <div className='min-w-0'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500'>
            {typeLabel ?? fallbackTypeLabel}
          </div>
          <div className='mt-1 text-lg font-semibold text-slate-900'>{label}</div>
        </div>
        <ChevronDown
          aria-hidden='true'
          className='kangur-lesson-group-chevron h-5 w-5 text-slate-600 transition-transform'
        />
      </motion.button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
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
                `mt-4 flex w-full flex-col ${KANGUR_LESSON_PANEL_GAP_CLASSNAME}`,
                contentClassName
              )}
              {...contentRestProps}
            >
              {children}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </KangurGlassPanel>
  );
}
