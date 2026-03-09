import { motion } from 'framer-motion';
import { KangurLessonProgressDots } from '@/features/kangur/ui/components/KangurLessonProgressDots';
import type { LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';
import {
  KangurIconBadge,
  KangurOptionCardButton,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';

export type HubSection = {
  id: string;
  emoji: string;
  title: string;
  description: string;
  isGame?: boolean;
  locked?: boolean;
  lockedLabel?: string;
  progress?: LessonHubSectionProgress;
};

type LessonHubProps = {
  lessonEmoji: string;
  lessonTitle: string;
  gradientClass: string;
  progressDotClassName?: string;
  sections: HubSection[];
  onSelect: (id: string) => void;
  onBack?: () => void;
};

export default function LessonHub({
  progressDotClassName = 'bg-slate-300',
  sections,
  onSelect,
}: LessonHubProps): React.JSX.Element {
  return (
    <div className='flex w-full max-w-md flex-col items-center'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex w-full flex-col gap-3'
      >
        {sections.map((section, i) => {
          const accent = section.isGame ? 'indigo' : 'slate';
          const resolvedProgress =
            section.progress ?? (section.isGame ? { totalCount: 1, viewedCount: 0 } : undefined);

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
                className='flex w-full items-center gap-4 rounded-[28px] p-4 text-left disabled:cursor-not-allowed disabled:opacity-70'
                data-testid={`lesson-hub-section-${section.id}`}
                disabled={section.locked}
                emphasis={section.isGame ? 'accent' : 'neutral'}
                onClick={() => {
                  if (!section.locked) {
                    onSelect(section.id);
                  }
                }}
                type='button'
              >
                <KangurIconBadge
                  accent={accent}
                  className='shrink-0'
                  data-testid={`lesson-hub-icon-${section.id}`}
                  size='xl'
                >
                  {section.emoji}
                </KangurIconBadge>
                <div className='min-w-0'>
                  <p className='text-base font-extrabold leading-tight text-slate-800'>
                    {section.title}
                  </p>
                  <p className='mt-0.5 text-sm text-slate-500'>{section.description}</p>
                </div>
                <div className='ml-auto flex shrink-0 flex-col items-end gap-2 self-start'>
                  <KangurStatusChip accent={accent} className='uppercase tracking-[0.14em]' size='sm'>
                    {section.locked ? (section.lockedLabel ?? 'Zablokowane') : section.isGame ? 'Gra' : 'Lekcja'}
                  </KangurStatusChip>
                  {resolvedProgress && resolvedProgress.totalCount > 0 ? (
                    <KangurLessonProgressDots
                      activeDotClassName={progressDotClassName}
                      className='self-end'
                      dotTestIdPrefix={`lesson-hub-progress-dot-${section.id}`}
                      srLabel={`Obejrzano ${resolvedProgress.viewedCount} z ${resolvedProgress.totalCount} ekranow sekcji.`}
                      testId={`lesson-hub-progress-${section.id}`}
                      totalCount={resolvedProgress.totalCount}
                      viewedCount={resolvedProgress.viewedCount}
                    />
                  ) : null}
                </div>
              </KangurOptionCardButton>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
