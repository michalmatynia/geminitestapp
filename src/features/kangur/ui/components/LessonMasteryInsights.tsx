import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { buildLessonMasteryInsights } from '@/features/kangur/ui/services/profile';
import type { KangurProgressState } from '@/features/kangur/ui/types';

type LessonMasteryInsightsProps = {
  progress: KangurProgressState;
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

const InsightList = ({ emptyState, items, title }: InsightListProps): React.JSX.Element => (
  <KangurInfoCard accent='slate' padding='md' tone='muted'>
    <div className='text-xs font-bold uppercase tracking-wide text-slate-500'>{title}</div>
    {items.length === 0 ? (
      <KangurEmptyState
        accent='slate'
        className='mt-3'
        description={(() => emptyState)()}
        padding='md'
      />
    ) : (
      <div className='mt-3 flex flex-col gap-3'>
        {items.map((item) => (
          <KangurInfoCard
            key={item.componentId}
            accent='slate'
            className='rounded-[22px]'
            padding='md'
          >
            <div className='flex items-start justify-between gap-3'>
              <div>
                <div className='text-sm font-semibold text-slate-700'>
                  {item.emoji} {item.title}
                </div>
                <div className='mt-1 text-xs text-slate-500'>
                  Proby: {item.attempts} · ostatni wynik {item.lastScorePercent}%
                </div>
              </div>
              <KangurStatusChip accent={getMasteryTone(item.masteryPercent)} size='md'>
                {item.masteryPercent}%
              </KangurStatusChip>
            </div>
            <div className='mt-2 text-[11px] text-slate-500'>
              Najlepszy wynik: {item.bestScorePercent}% · Ostatnia proba:{' '}
              {formatCompletedAt(item.lastCompletedAt)}
            </div>
          </KangurInfoCard>
        ))}
      </div>
    )}
  </KangurInfoCard>
);

export default function LessonMasteryInsights({
  progress,
}: LessonMasteryInsightsProps): React.JSX.Element {
  const insights = buildLessonMasteryInsights(progress);

  return (
    <KangurGlassPanel padding='lg' surface='mistSoft' variant='soft'>
      <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500'>
            Opanowanie lekcji
          </div>
          <p className='text-sm text-slate-500'>
            Sledzone: {insights.trackedLessons} · opanowane: {insights.masteredLessons} · do
            powtorki: {insights.lessonsNeedingPractice}
          </p>
        </div>
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
          description='Brak zapisanych prob lekcji. Ukoncz dowolna lekcje, aby zobaczyc mocne strony i obszary do powtorki.'
          padding='lg'
        />
      ) : (
        <div className='mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4'>
          <InsightList
            title='Do powtorki'
            items={insights.weakest}
            emptyState='Wszystkie sledzone lekcje sa na bezpiecznym poziomie.'
          />
          <InsightList
            title='Najmocniejsze lekcje'
            items={insights.strongest}
            emptyState='Najpierw ukoncz kilka lekcji, aby zobaczyc najmocniejsze obszary.'
          />
        </div>
      )}
    </KangurGlassPanel>
  );
}
