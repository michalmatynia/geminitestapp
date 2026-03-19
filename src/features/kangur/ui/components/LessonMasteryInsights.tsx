import { useTranslations } from 'next-intl';
import {
  KangurCardTitle,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetaText,
  KangurPanelIntro,
  KangurPanelRow,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_COMPACT_ROW_CLASSNAME, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { buildLessonMasteryInsights } from '@/features/kangur/ui/services/profile';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type LessonMasteryInsightsProps = {
  progress: KangurProgressState;
  sectionSummary?: React.ReactNode;
  sectionTitle?: React.ReactNode;
};

const formatCompletedAt = (
  value: string | null,
  translate: (key: string) => string
): string => {
  if (!value) {
    return translate('dateMissing');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return translate('dateMissing');
  }

  return parsed.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'short',
  });
};

const getMasteryTone = (masteryPercent: number): KangurAccent => {
  if (masteryPercent >= 80) {
    return 'emerald';
  }
  if (masteryPercent >= 60) {
    return 'amber';
  }
  return 'rose';
};

type InsightListProps = {
  emptyState: string;
  items: ReturnType<typeof buildLessonMasteryInsights>['strongest'];
  title: string;
};

const InsightList = ({ emptyState, items, title }: InsightListProps): React.JSX.Element => {
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const emptyStateDescription = emptyState;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='muted'>
      <KangurSectionEyebrow as='div' className='text-xs tracking-wide'>
        {title}
      </KangurSectionEyebrow>
      {items.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-3'
          description={emptyStateDescription}
          padding='md'
        />
      ) : (
        <div className='mt-3 flex flex-col kangur-panel-gap'>
          {items.map((item) => (
            <KangurInfoCard
              key={item.componentId}
              accent='slate'
              className='rounded-[22px]'
              padding='md'
            >
              <KangurPanelRow className='items-start sm:justify-between'>
                <div className='min-w-0'>
                  <KangurCardTitle as='div'>
                    {item.emoji} {item.title}
                  </KangurCardTitle>
                  <KangurMetaText as='div' className='mt-1' size='xs'>
                    {translations('attemptsLine', {
                      attempts: item.attempts,
                      lastScore: item.lastScorePercent,
                    })}
                  </KangurMetaText>
                </div>
                <KangurStatusChip
                  accent={getMasteryTone(item.masteryPercent)}
                  className='self-start sm:self-auto'
                  size='md'
                >
                  {item.masteryPercent}%
                </KangurStatusChip>
              </KangurPanelRow>
              <KangurMetaText as='div' className='mt-2' size='xs'>
                {translations('bestScoreLine', {
                  bestScore: item.bestScorePercent,
                  date: formatCompletedAt(item.lastCompletedAt, translations),
                })}
              </KangurMetaText>
            </KangurInfoCard>
          ))}
        </div>
      )}
    </KangurInfoCard>
  );
};

export default function LessonMasteryInsights({
  progress,
  sectionSummary,
  sectionTitle,
}: LessonMasteryInsightsProps): React.JSX.Element {
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const insights = buildLessonMasteryInsights(progress);
  const resolvedSectionTitle = sectionTitle ?? translations('title');
  const resolvedSectionSummary =
    sectionSummary ??
    translations('trackedSummary', {
      tracked: insights.trackedLessons,
      mastered: insights.masteredLessons,
      review: insights.lessonsNeedingPractice,
    });

  return (
    <KangurGlassPanel padding='lg' surface='mistSoft' variant='soft'>
      <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-end sm:justify-between`}>
        <KangurPanelIntro description={resolvedSectionSummary} eyebrow={resolvedSectionTitle} />
        {insights.trackedLessons > 0 && (
        <KangurStatusChip accent='indigo' size='md'>
            {translations('trackedBadge', { count: insights.trackedLessons })}
        </KangurStatusChip>
      )}
      </div>

      {insights.trackedLessons === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-4'
          description={translations('emptyDescription')}
          padding='lg'
        />
      ) : (
        <div className='mt-4 grid grid-cols-1 xl:grid-cols-2 kangur-panel-gap'>
          <InsightList
            title={translations('reviewTitle')}
            items={insights.weakest}
            emptyState={translations('reviewEmpty')}
          />
          <InsightList
            title={translations('strongestTitle')}
            items={insights.strongest}
            emptyState={translations('strongestEmpty')}
          />
        </div>
      )}
    </KangurGlassPanel>
  );
}
