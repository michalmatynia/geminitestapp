import {
  KangurCardTitle,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetaText,
  KangurPanelIntro,
  KangurSectionEyebrow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { buildLessonMasteryInsights } from '@/features/kangur/ui/services/profile';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type LessonMasteryInsightsProps = {
  progress: KangurProgressState;
  sectionSummary?: React.ReactNode;
  sectionTitle?: React.ReactNode;
};

const formatCompletedAt = (value: string | null): string => {
  if (!value) {
    return 'brak daty';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'brak daty';
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
              <div className='flex flex-col items-start kangur-panel-gap sm:flex-row sm:justify-between'>
                <div className='min-w-0'>
                  <KangurCardTitle as='div'>
                    {item.emoji} {item.title}
                  </KangurCardTitle>
                  <KangurMetaText as='div' className='mt-1' size='xs'>
                    Próby: {item.attempts} · ostatni wynik {item.lastScorePercent}%
                  </KangurMetaText>
                </div>
                <KangurStatusChip
                  accent={getMasteryTone(item.masteryPercent)}
                  className='self-start sm:self-auto'
                  size='md'
                >
                  {item.masteryPercent}%
                </KangurStatusChip>
              </div>
              <KangurMetaText as='div' className='mt-2' size='xs'>
                Najlepszy wynik: {item.bestScorePercent}% · Ostatnia próba:{' '}
                {formatCompletedAt(item.lastCompletedAt)}
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
  const insights = buildLessonMasteryInsights(progress);
  const resolvedSectionTitle = sectionTitle ?? 'Opanowanie lekcji';
  const resolvedSectionSummary =
    sectionSummary ??
    `Śledzone: ${insights.trackedLessons} · opanowane: ${insights.masteredLessons} · do powtórki: ${insights.lessonsNeedingPractice}`;

  return (
    <KangurGlassPanel padding='lg' surface='mistSoft' variant='soft'>
      <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
        <KangurPanelIntro description={resolvedSectionSummary} eyebrow={resolvedSectionTitle} />
        {insights.trackedLessons > 0 && (
          <KangurStatusChip accent='indigo' size='md'>
            {insights.trackedLessons} lekcji z zapisem
          </KangurStatusChip>
        )}
      </div>

      {insights.trackedLessons === 0 ? (
        <KangurEmptyState
          accent='slate'
          className='mt-4'
          description='Brak zapisanych prób lekcji. Ukończ dowolną lekcję, aby zobaczyć mocne strony i obszary do powtórki.'
          padding='lg'
        />
      ) : (
        <div className='mt-4 grid grid-cols-1 xl:grid-cols-2 kangur-panel-gap'>
          <InsightList
            title='Do powtórki'
            items={insights.weakest}
            emptyState='Wszystkie śledzone lekcje są na bezpiecznym poziomie.'
          />
          <InsightList
            title='Najmocniejsze lekcje'
            items={insights.strongest}
            emptyState='Najpierw ukończ kilka lekcji, aby zobaczyć najmocniejsze obszary.'
          />
        </div>
      )}
    </KangurGlassPanel>
  );
}
