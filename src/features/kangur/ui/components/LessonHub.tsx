import { motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';

import {
  KangurButton,
  KangurOptionCardButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurLessonBackAction } from '@/features/kangur/ui/context/KangurLessonNavigationContext';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/shared/utils';

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
  onBack?: () => void;
};

export default function LessonHub({
  lessonEmoji,
  lessonTitle,
  gradientClass,
  sections,
  onSelect,
  onBack,
}: LessonHubProps): React.JSX.Element {
  const handleBack = useKangurLessonBackAction(onBack);

  return (
    <div className='flex w-full max-w-md flex-col items-center gap-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex w-full flex-col gap-3'
      >
        <div className='text-center mb-2'>
          <p className='text-5xl mb-1'>{lessonEmoji}</p>
          <h1
            className={`text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${gradientClass}`}
          >
            {lessonTitle}
          </h1>
          <p className='mt-1 text-sm text-slate-500'>Wybierz temat</p>
        </div>

        {sections.map((section, i) => {
          const accent = section.isGame ? 'indigo' : 'slate';

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className='w-full'
            >
              <KangurOptionCardButton
                accent={accent}
                className='flex w-full items-center gap-4 rounded-[28px] p-4 text-left'
                data-testid={`lesson-hub-section-${section.id}`}
                emphasis={section.isGame ? 'accent' : 'neutral'}
                onClick={() => onSelect(section.id)}
                type='button'
              >
                <span
                  className={cn(
                    'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-3xl shadow-sm',
                    KANGUR_ACCENT_STYLES[accent].icon
                  )}
                >
                  {section.emoji}
                </span>
                <div className='min-w-0'>
                  <p className='text-base font-extrabold leading-tight text-slate-800'>
                    {section.title}
                  </p>
                  <p className='mt-0.5 text-sm text-slate-500'>{section.description}</p>
                </div>
                <KangurStatusChip
                  accent={accent}
                  className='ml-auto uppercase tracking-[0.14em]'
                  size='sm'
                >
                  {section.isGame ? 'Gra' : 'Lekcja'}
                </KangurStatusChip>
              </KangurOptionCardButton>
            </motion.div>
          );
        })}
      </motion.div>

      <KangurButton onClick={handleBack} variant='secondary' size='md'>
        <ChevronLeft className='w-4 h-4' />
        Wróc do listy
      </KangurButton>
    </div>
  );
}
