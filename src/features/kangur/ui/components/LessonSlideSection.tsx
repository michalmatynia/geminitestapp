import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';

export type LessonSlide = {
  title: string;
  content: React.JSX.Element;
};

type LessonSlideSectionProps = {
  slides: LessonSlide[];
  onBack: () => void;
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
  const [slide, setSlide] = useState(0);
  const isLast = slide === slides.length - 1;
  const activeSlide = slides[slide];

  if (!activeSlide) return <div className='text-sm text-gray-500'>Brak slajdu.</div>;

  const handleDone = (): void => {
    onComplete?.();
    onBack();
  };

  return (
    <div className='flex w-full max-w-md flex-col items-center gap-4'>
      {slides.length > 1 && (
        <div className='flex gap-2'>
          {slides.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === slide ? `${dotActiveClass} scale-125` : i < slide ? dotDoneClass : 'bg-gray-200'
              }`}
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
          <KangurPanel className='flex min-h-[260px] flex-col gap-4' padding='xl' variant='soft'>
            <h2 className='text-xl font-extrabold text-slate-800'>{activeSlide.title}</h2>
            <div className='flex-1'>{activeSlide.content}</div>
          </KangurPanel>
        </motion.div>
      </AnimatePresence>

      <div className='flex gap-3 w-full'>
        <KangurButton
          onClick={slide === 0 ? onBack : () => setSlide(slide - 1)}
          size='lg'
          variant='secondary'
        >
          <ChevronLeft className='w-4 h-4' />
          {slide === 0 ? 'Menu' : 'Poprzedni'}
        </KangurButton>

        {isLast ? (
          <KangurButton
            onClick={handleDone}
            className='flex-1'
            size='lg'
            variant='primary'
          >
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
