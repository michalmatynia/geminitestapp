import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

export type HubSection = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
};

type LessonHubProps = {
  lessonEmoji: string;
  lessonTitle: string;
  gradientClass: string;
  sections: HubSection[];
  onSelect: (id: string) => void;
  onBack: () => void;
};

export default function LessonHub({
  lessonEmoji,
  lessonTitle,
  gradientClass,
  sections,
  onSelect,
  onBack,
}: LessonHubProps): React.JSX.Element {
  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='w-full flex flex-col gap-3'
      >
        <div className='text-center mb-2'>
          <p className='text-5xl mb-1'>{lessonEmoji}</p>
          <h1
            className={`text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${gradientClass}`}
          >
            {lessonTitle}
          </h1>
          <p className='text-gray-400 text-sm mt-1'>Wybierz temat</p>
        </div>

        {sections.map((section, i) => (
          <motion.button
            key={section.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(section.id)}
            className={
              section.isGame
                ? `w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${gradientClass} text-white shadow-lg text-left`
                : 'w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-gray-200 shadow-sm text-left hover:shadow-md transition-shadow'
            }
          >
            <span className='text-3xl flex-shrink-0'>{section.emoji}</span>
            <div className='min-w-0'>
              <p
                className={`font-extrabold text-base leading-tight ${section.isGame ? 'text-white' : 'text-gray-800'}`}
              >
                {section.title}
              </p>
              <p
                className={`text-sm mt-0.5 ${section.isGame ? 'text-white/80' : 'text-gray-500'}`}
              >
                {section.description}
              </p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <button
        onClick={onBack}
        className='flex items-center gap-1 px-4 py-2 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
      >
        <ChevronLeft className='w-4 h-4' />
        Wróc do listy
      </button>
    </div>
  );
}
