import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import {
  useKangurLessonBackAction,
  useKangurLessonSecretPill,
  useKangurRegisterLessonSubsectionNavigation,
  useKangurSyncLessonSubsectionSummary,
  type KangurLessonSubsectionSummary,
} from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PENDING_STEP_PILL_CLASSNAME,
  KANGUR_STEP_PILL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { cn } from '@/shared/utils';

export type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

type LessonSlideSectionProps = {
  slides: LessonSlide[];
  sectionHeader?: KangurLessonSubsectionSummary | null;
  onBack?: () => void;
  onComplete?: () => void;
  onProgressChange?: (viewedCount: number, totalCount: number) => void;
  dotActiveClass: string;
  dotDoneClass: string;
  gradientClass: string;
};

export default function LessonSlideSection({
  slides,
  sectionHeader = null,
  onBack,
  onComplete,
  onProgressChange,
  dotActiveClass,
  dotDoneClass,
}: LessonSlideSectionProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const slideMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const handleBack = useKangurLessonBackAction(onBack);
  const secretLessonPill = useKangurLessonSecretPill();
  const registerSubsectionNavigation = useKangurRegisterLessonSubsectionNavigation();
  useKangurSyncLessonSubsectionSummary(sectionHeader);
  const [slide, setSlide] = useState(0);
  const completionReportedRef = useRef(false);
  const isLast = slide === slides.length - 1;
  const isFirst = slide === 0;
  const activeSlide = slides[slide];
  const shouldRenderNavigationPills = slides.length > 1 || Boolean(secretLessonPill?.isUnlocked);

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

        {shouldRenderNavigationPills ? (
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
            {secretLessonPill?.isUnlocked ? (
              <button
                type='button'
                onClick={secretLessonPill.onOpen}
                aria-label='Otworz sekretny panel'
                className={cn(
                  KANGUR_STEP_PILL_CLASSNAME,
                  'h-[14px] min-w-[40px] cursor-pointer justify-center bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-500 text-[10px] font-black text-amber-950 shadow-sm ring-1 ring-amber-300/90'
                )}
                data-testid='lesson-slide-secret-indicator'
                title='Sekretny panel'
              >
                ★
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={slide}
          {...slideMotionProps}
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
        <div className='flex w-full items-center justify-between gap-3'>
          {isFirst ? (
            <div className='min-w-[72px]' />
          ) : (
            <KangurButton
              onClick={() => setSlide((currentSlide) => Math.max(0, currentSlide - 1))}
              aria-label='Poprzedni panel'
              className='min-w-[72px] justify-center border-slate-300/80 bg-white/92 px-5 shadow-sm'
              data-testid='lesson-slide-prev-button'
              size='sm'
              type='button'
              title='Poprzedni panel'
              variant='surface'
            >
              <ChevronLeft className='h-4 w-4 flex-shrink-0' />
            </KangurButton>
          )}

          {isLast ? (
            <div className='min-w-[72px]' />
          ) : (
            <KangurButton
              onClick={() =>
                setSlide((currentSlide) => Math.min(slides.length - 1, currentSlide + 1))
              }
              aria-label='Nastepny panel'
              className='min-w-[72px] justify-center border-slate-300/80 bg-white/92 px-5 shadow-sm'
              data-testid='lesson-slide-next-button'
              size='sm'
              type='button'
              title='Nastepny panel'
              variant='surface'
            >
              <ChevronRight className='h-4 w-4 flex-shrink-0' />
            </KangurButton>
          )}
        </div>
      ) : null}
    </div>
  );
}
