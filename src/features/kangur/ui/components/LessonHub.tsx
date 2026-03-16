import { motion } from 'framer-motion';

import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';
import { KangurLessonProgressDots } from '@/features/kangur/ui/components/KangurLessonProgressDots';
import {
  KangurIconBadge,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { LessonHubSectionProgress } from '@/features/kangur/ui/hooks/useLessonHubProgress';

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
  lessonTitle,
  sections,
  onSelect,
}: LessonHubProps): React.JSX.Element {
  const activeProgressDotClassName = progressDotClassName;
  const hubLabel = lessonTitle ? `Tematy lekcji ${lessonTitle}` : 'Tematy lekcji';
  const handleSectionSelect = (id: string): void => {
    onSelect(id);
  };

  return (
    <div className='flex w-full max-w-md flex-col items-center' role='region' aria-label={hubLabel}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className='flex w-full flex-col kangur-lesson-panel-gap'
        role='list'
      >
        {sections.map((section, i) => {
          const accent = section.isGame ? 'indigo' : 'slate';
          const resolvedProgress =
            section.progress ?? (section.isGame ? { totalCount: 1, viewedCount: 0 } : undefined);
          const sectionKindLabel = section.isGame ? 'Gra' : 'Lekcja';
          const sectionAriaLabel = `${sectionKindLabel}: ${section.title}${
            section.locked ? ' (zablokowane)' : ''
          }`;

          return (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className='w-full'
              role='listitem'
            >
              <KangurIconSummaryOptionCard
                accent={accent}
                buttonClassName='w-full rounded-[28px] p-4 text-left disabled:cursor-not-allowed disabled:opacity-70'
                data-testid={`lesson-hub-section-${section.id}`}
                disabled={section.locked}
                emphasis={section.isGame ? 'accent' : 'neutral'}
                aria-label={sectionAriaLabel}
                onClick={() => {
                  if (!section.locked) {
                    handleSectionSelect(section.id);
                  }
                }}
              >
                <KangurIconSummaryCardContent
                  aside={
                    <div className='flex flex-col items-end gap-2'>
                      <KangurStatusChip accent={accent} className='uppercase tracking-[0.14em]' size='sm'>
                        {section.locked
                          ? (section.lockedLabel ?? 'Zablokowane')
                          : section.isGame
                            ? 'Gra'
                            : 'Lekcja'}
                      </KangurStatusChip>
                      {resolvedProgress && resolvedProgress.totalCount > 0 ? (
                        <KangurLessonProgressDots
                          activeDotClassName={activeProgressDotClassName}
                          className='self-end'
                          dotTestIdPrefix={`lesson-hub-progress-dot-${section.id}`}
                          srLabel={`Obejrzano ${resolvedProgress.viewedCount} z ${resolvedProgress.totalCount} ekranów sekcji.`}
                          testId={`lesson-hub-progress-${section.id}`}
                          totalCount={resolvedProgress.totalCount}
                          viewedCount={resolvedProgress.viewedCount}
                        />
                      ) : null}
                    </div>
                  }
                  asideClassName='ml-auto flex shrink-0 flex-col items-end gap-2 self-start'
                  className='w-full items-center'
                  contentClassName='flex-1'
                  description={section.description}
                  descriptionClassName='text-slate-500'
                  icon={
                    <KangurIconBadge
                      accent={accent}
                      className='shrink-0'
                      data-testid={`lesson-hub-icon-${section.id}`}
                      decorative
                      size='xl'
                    >
                      {section.emoji}
                    </KangurIconBadge>
                  }
                  title={section.title}
                  titleAs='h3'
                  titleClassName='text-slate-800'
                />
              </KangurIconSummaryOptionCard>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
