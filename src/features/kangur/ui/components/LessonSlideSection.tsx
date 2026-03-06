import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
  gradientClass,
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
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
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
          className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col gap-4 min-h-[260px]'
        >
          <h2 className='text-xl font-extrabold text-gray-800'>{activeSlide.title}</h2>
          <div className='flex-1'>{activeSlide.content}</div>
        </motion.div>
      </AnimatePresence>

      <div className='flex gap-3 w-full'>
        <button
          onClick={slide === 0 ? onBack : () => setSlide(slide - 1)}
          className='flex items-center gap-1 px-4 py-2 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
        >
          <ChevronLeft className='w-4 h-4' />
          {slide === 0 ? 'Menu' : 'Poprzedni'}
        </button>

        {isLast ? (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDone}
            className={`flex-1 py-2 rounded-2xl bg-gradient-to-r ${gradientClass} text-white font-extrabold shadow hover:opacity-90 transition`}
          >
            Gotowe!
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSlide(slide + 1)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-2xl bg-gradient-to-r ${gradientClass} text-white font-extrabold shadow hover:opacity-90 transition`}
          >
            Nastepny <ChevronRight className='w-4 h-4' />
          </motion.button>
        )}
      </div>
    </div>
  );
}
