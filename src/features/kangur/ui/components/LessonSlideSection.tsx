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
  const totalSlides = slides.length;
  const isLast = slide === totalSlides - 1;
  const isFirst = slide === 0;
  const activeSlide = slides[slide];
  const shouldRenderNavigationPills = totalSlides > 1 || Boolean(secretLessonPill?.isUnlocked);
  const handlePreviousSlide = (): void => {
    setSlide((currentSlide) => Math.max(0, currentSlide - 1));
  };
  const handleNextSlide = (): void => {
    setSlide((currentSlide) => Math.min(totalSlides - 1, currentSlide + 1));
  };

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

  const shouldRenderPanelNavigation = totalSlides > 1;

  return (
    <div className='flex w-full max-w-md flex-col items-center gap-4'>
      <div className='flex w-full flex-wrap items-center gap-3'>
        <KangurButton onClick={handleBack} size='sm' variant='surface'>
          <ChevronLeft className='w-4 h-4' />
          Wróć do tematów
        </KangurButton>

        {shouldRenderPanelNavigation ? (
          <div className='flex items-center gap-2'>
            {isFirst ? null : (
              <KangurButton
                onClick={handlePreviousSlide}
                aria-label='Poprzedni panel'
                className='justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)]'
                data-testid='lesson-slide-prev-button'
                size='sm'
                type='button'
                title='Poprzedni panel'
                variant='surface'
              >
                <ChevronLeft className='h-4 w-4 flex-shrink-0' />
              </KangurButton>
            )}

            {isLast ? null : (
              <KangurButton
                onClick={handleNextSlide}
                aria-label='Nastepny panel'
                className='justify-center px-4 shadow-sm [border-color:var(--kangur-soft-card-border)]'
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

        {shouldRenderNavigationPills ? (
          <div className='ml-auto flex flex-wrap items-center gap-2'>
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
                aria-label='Otwórz sekretny panel'
                className={cn(
                  KANGUR_STEP_PILL_CLASSNAME,
                  'h-[14px] min-w-[40px] cursor-pointer justify-center text-[10px] font-black shadow-sm'
                )}
                style={{
                  background:
                    'linear-gradient(90deg, color-mix(in srgb, rgb(252 211 77) 78%, var(--kangur-soft-card-background)) 0%, color-mix(in srgb, rgb(253 224 71) 84%, var(--kangur-soft-card-background)) 50%, color-mix(in srgb, rgb(245 158 11) 82%, var(--kangur-soft-card-background)) 100%)',
                  color: 'color-mix(in srgb, rgb(120 53 15) 84%, var(--kangur-page-text))',
                  boxShadow: '0 4px 10px -6px rgba(217,119,6,0.4)',
                  borderColor: 'color-mix(in srgb, rgb(251 191 36) 72%, var(--kangur-soft-card-border))',
                }}
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
            <h2 className='text-xl font-extrabold [color:var(--kangur-page-text)]'>
              {activeSlide.title}
            </h2>
            <div className='flex-1'>{activeSlide.content}</div>
          </KangurGlassPanel>
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
