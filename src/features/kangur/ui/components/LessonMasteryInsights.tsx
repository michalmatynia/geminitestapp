import { useLocale, useTranslations } from 'next-intl';
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
import {
  buildLessonMasteryInsights,
  translateKangurLearnerProfileWithFallback,
} from '@/features/kangur/ui/services/profile';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type LessonMasteryInsightsProps = {
  progress: KangurProgressState;
  sectionSummary?: React.ReactNode;
  sectionTitle?: React.ReactNode;
};

const formatCompletedAt = (
  value: string | null,
  translate: (key: string, values?: Record<string, string | number>) => string,
  locale: string
): string => {
  if (!value) {
    return translateLessonMasteryWithFallback(translate, 'dateMissing', 'brak daty');
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return translateLessonMasteryWithFallback(translate, 'dateMissing', 'brak daty');
  }

  return parsed.toLocaleDateString(locale, {
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

const translateLessonMasteryWithFallback = (
  translate: (key: string, values?: Record<string, string | number>) => string,
  key: string,
  fallback: string,
  values?: Record<string, string | number>
): string =>
  translateKangurLearnerProfileWithFallback(
    translate,
    key,
    fallback,
    values
  );

type InsightListProps = {
  emptyState: string;
  items: ReturnType<typeof buildLessonMasteryInsights>['strongest'];
  title: string;
};

const InsightList = ({ emptyState, items, title }: InsightListProps): React.JSX.Element => {
  const locale = useLocale();
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const translateWithFallback = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>
  ): string => translateLessonMasteryWithFallback(translations, key, fallback, values);

  return (
    <KangurInfoCard accent='slate' padding='md' tone='muted'>
      <KangurSectionEyebrow as='div' className='text-xs tracking-wide'>
        {title}
      </KangurSectionEyebrow>
      {items.length === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-3'
          description={emptyState}
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
                    {translateWithFallback(
                      'attemptsLine',
                      `Próby: ${item.attempts} · ostatni wynik ${item.lastScorePercent}%`,
                      {
                        attempts: item.attempts,
                        lastScore: item.lastScorePercent,
                      }
                    )}
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
                {translateWithFallback(
                  'bestScoreLine',
                  `Najlepszy wynik: ${item.bestScorePercent}% · Ostatnia próba: ${formatCompletedAt(
                    item.lastCompletedAt,
                    translations,
                    locale
                  )}`,
                  {
                    bestScore: item.bestScorePercent,
                    date: formatCompletedAt(item.lastCompletedAt, translations, locale),
                  }
                )}
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
  const locale = useLocale();
  const translations = useTranslations('KangurLearnerProfileWidgets.lessonMastery');
  const translateWithFallback = (
    key: string,
    fallback: string,
    values?: Record<string, string | number>
  ): string => translateLessonMasteryWithFallback(translations, key, fallback, values);
  const insights = buildLessonMasteryInsights(progress, 3, locale);
  const resolvedSectionTitle =
    sectionTitle ?? translateWithFallback('title', 'Opanowanie lekcji');
  const resolvedSectionSummary =
    sectionSummary ??
    translateWithFallback(
      'trackedSummary',
      `Śledzone: ${insights.trackedLessons} · opanowane: ${insights.masteredLessons} · do powtórki: ${insights.lessonsNeedingPractice}`,
      {
        tracked: insights.trackedLessons,
        mastered: insights.masteredLessons,
        review: insights.lessonsNeedingPractice,
      }
    );

  return (
    <KangurGlassPanel padding='lg' surface='mistSoft' variant='soft'>
      <div className={`${KANGUR_COMPACT_ROW_CLASSNAME} sm:items-end sm:justify-between`}>
        <KangurPanelIntro description={resolvedSectionSummary} eyebrow={resolvedSectionTitle} />
        {insights.trackedLessons > 0 && (
          <KangurStatusChip accent='indigo' size='md'>
            {translateWithFallback(
              'trackedBadge',
              `${insights.trackedLessons} lekcji z zapisem`,
              { count: insights.trackedLessons }
            )}
          </KangurStatusChip>
        )}
      </div>

      {insights.trackedLessons === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-4'
          description={translateWithFallback(
            'emptyDescription',
            'Brak zapisanych prób lekcji. Ukończ dowolną lekcję, aby zobaczyć mocne strony i obszary do powtórki.'
          )}
          padding='lg'
        />
      ) : (
        <div className='mt-4 grid grid-cols-1 xl:grid-cols-2 kangur-panel-gap'>
          <InsightList
            title={translateWithFallback('reviewTitle', 'Do powtórki')}
            items={insights.weakest}
            emptyState={translateWithFallback(
              'reviewEmpty',
              'Wszystkie śledzone lekcje są na bezpiecznym poziomie.'
            )}
          />
          <InsightList
            title={translateWithFallback('strongestTitle', 'Najmocniejsze lekcje')}
            items={insights.strongest}
            emptyState={translateWithFallback(
              'strongestEmpty',
              'Najpierw ukończ kilka lekcji, aby zobaczyć najmocniejsze obszary.'
            )}
          />
        </div>
      )}
    </KangurGlassPanel>
  );
}
