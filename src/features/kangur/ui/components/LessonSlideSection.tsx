import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  useKangurLessonBackAction,
  useKangurRegisterLessonSubsectionNavigation,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

export type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

type LessonSlideSectionProps = {
  slides: LessonSlide[];
  onBack?: () => void;
  onComplete?: () => void;
  onProgressChange?: (viewedCount: number, totalCount: number) => void;
  dotActiveClass: string;
  dotDoneClass: string;
  gradientClass: string;
};

export default function LessonSlideSection({
  slides,
  onBack,
  onComplete,
  onProgressChange,
  dotActiveClass,
  dotDoneClass,
}: LessonSlideSectionProps): React.JSX.Element {
  const handleBack = useKangurLessonBackAction(onBack);
  const registerSubsectionNavigation = useKangurRegisterLessonSubsectionNavigation();
  const [slide, setSlide] = useState(0);
  const completionReportedRef = useRef(false);
  const isLast = slide === slides.length - 1;
  const isFirst = slide === 0;
  const activeSlide = slides[slide];

  if (!activeSlide) {
    return (
      <KangurEmptyState
        accent='slate'
        align='center'
        data-testid='lesson-slide-empty'
        description='Dodaj przynajmniej jeden slajd, aby uruchomic te sekcje lekcji.'
        padding='lg'
        title='Brak slajdu.'
      />
    );
  }

  useEffect(() => {
    onProgressChange?.(slide + 1, slides.length);
  }, [onProgressChange, slide, slides.length]);

  useEffect(() => {
    if (!isLast || completionReportedRef.current) {
      return;
    }

    completionReportedRef.current = true;
    onComplete?.();
  }, [isLast, onComplete]);

  useEffect(() => {
    const unregister = registerSubsectionNavigation();
    return unregister;
  }, [registerSubsectionNavigation]);

  return (
    <div className='flex w-full max-w-md flex-col items-center gap-4'>
      <div className='flex w-full flex-wrap items-center justify-between gap-3'>
        <KangurButton onClick={handleBack} size='sm' variant='surface'>
          <ChevronLeft className='w-4 h-4' />
          Wróć do tematów
        </KangurButton>

        {slides.length > 1 ? (
          <div className='flex gap-2'>
            {slides.map((_, i) => (
              <button
                key={i}
                type='button'
                onClick={() => setSlide(i)}
                aria-label={`Przejdz do slajdu ${i + 1}`}
                aria-current={i === slide ? 'step' : undefined}
                className={cn(
                  KANGUR_STEP_PILL_CLASSNAME,
                  'h-[14px] min-w-[14px] cursor-pointer',
                  i === slide
                    ? ['w-8 scale-[1.04]', dotActiveClass]
                    : i < slide
                      ? ['w-6', dotDoneClass]
                      : KANGUR_PENDING_STEP_PILL_CLASSNAME
                )}
                data-testid={`lesson-slide-indicator-${i}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={slide}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          className='w-full'
        >
          <KangurGlassPanel
            className='flex min-h-[260px] flex-col gap-4'
            data-testid='lesson-slide-shell'
            padding='xl'
            surface='solid'
          >
            <h2 className='text-xl font-extrabold text-slate-800'>{activeSlide.title}</h2>
            <div className='flex-1'>{activeSlide.content}</div>
          </KangurGlassPanel>
        </motion.div>
      </AnimatePresence>

      {slides.length > 1 ? (
        <div className='flex w-full gap-3'>
          {isFirst ? (
            <div className='flex-1' />
          ) : (
            <KangurButton
              onClick={() => setSlide((currentSlide) => Math.max(0, currentSlide - 1))}
              className='flex-1 justify-start'
              data-testid='lesson-slide-prev-button'
              size='lg'
              type='button'
              variant='surface'
            >
              <ChevronLeft className='h-4 w-4 flex-shrink-0' />
              <span>Poprzedni panel</span>
            </KangurButton>
          )}

          {isLast ? (
            <div className='flex-1' />
          ) : (
            <KangurButton
              onClick={() =>
                setSlide((currentSlide) => Math.min(slides.length - 1, currentSlide + 1))
              }
              className='flex-1 justify-end'
              data-testid='lesson-slide-next-button'
              size='lg'
              type='button'
              variant='surface'
            >
              <span>Nastepny panel</span>
              <ChevronRight className='h-4 w-4 flex-shrink-0' />
            </KangurButton>
          )}
        </div>
      ) : null}
    </div>
  );
}
