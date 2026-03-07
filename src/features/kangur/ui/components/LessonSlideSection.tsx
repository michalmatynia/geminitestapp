import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurLessonBackAction } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { KANGUR_STEP_PILL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

export type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

type LessonSlideSectionProps = {
  slides: LessonSlide[];
  onBack?: () => void;
  onComplete?: () => void;
  dotActiveClass: string;
  dotDoneClass: string;
  gradientClass: string;
};

export default function LessonSlideSection({
  slides,
  onBack,
  onComplete,
  dotActiveClass,
  dotDoneClass,
}: LessonSlideSectionProps): React.JSX.Element {
  const handleBack = useKangurLessonBackAction(onBack);
  const [slide, setSlide] = useState(0);
  const isLast = slide === slides.length - 1;
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

  const handleDone = (): void => {
    onComplete?.();
    handleBack();
  };

  return (
    <div className='flex w-full max-w-md flex-col items-center gap-4'>
      {slides.length > 1 && (
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
                'h-[14px] min-w-[14px]',
                i === slide
                  ? ['w-8 scale-[1.04]', dotActiveClass]
                  : i < slide
                    ? ['w-6', dotDoneClass]
                    : 'w-[14px] soft-cta opacity-80 hover:opacity-100'
              )}
              data-testid={`lesson-slide-indicator-${i}`}
            />
          ))}
        </div>
      )}

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

      <div className='flex gap-3 w-full'>
        <KangurButton
          onClick={slide === 0 ? handleBack : () => setSlide(slide - 1)}
          size='lg'
          variant='surface'
        >
          <ChevronLeft className='w-4 h-4' />
          {slide === 0 ? 'Menu' : 'Poprzedni'}
        </KangurButton>

        {isLast ? (
          <KangurButton onClick={handleDone} className='flex-1' size='lg' variant='primary'>
            Gotowe!
          </KangurButton>
        ) : (
          <KangurButton
            onClick={() => setSlide(slide + 1)}
            className='flex-1'
            size='lg'
            variant='primary'
          >
            Nastepny <ChevronRight className='w-4 h-4' />
          </KangurButton>
        )}
      </div>
    </div>
  );
}
