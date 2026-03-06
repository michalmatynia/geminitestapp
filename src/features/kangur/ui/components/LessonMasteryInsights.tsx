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

const getMasteryTone = (masteryPercent: number): string => {
  if (masteryPercent >= 80) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (masteryPercent >= 60) {
    return 'bg-amber-100 text-amber-700';
  }
  return 'bg-rose-100 text-rose-700';
};

type InsightListProps = {
  emptyState: string;
  items: ReturnType<typeof buildLessonMasteryInsights>['strongest'];
  title: string;
};

const InsightList = ({ emptyState, items, title }: InsightListProps): React.JSX.Element => (
  <div className='rounded-2xl border border-slate-200 bg-slate-50/80 p-4'>
    <div className='text-xs font-bold uppercase tracking-wide text-slate-500'>{title}</div>
    {items.length === 0 ? (
      <div className='mt-3 rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-4 text-sm text-slate-400'>
        {emptyState}
      </div>
    ) : (
      <div className='mt-3 flex flex-col gap-3'>
        {items.map((item) => (
          <div
            key={item.componentId}
            className='rounded-xl border border-white bg-white/90 px-3 py-3 shadow-sm'
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
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-bold ${getMasteryTone(item.masteryPercent)}`}
              >
                {item.masteryPercent}%
              </span>
            </div>
            <div className='mt-2 text-[11px] text-slate-500'>
              Najlepszy wynik: {item.bestScorePercent}% · Ostatnia proba:{' '}
              {formatCompletedAt(item.lastCompletedAt)}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default function LessonMasteryInsights({
  progress,
}: LessonMasteryInsightsProps): React.JSX.Element {
  const insights = buildLessonMasteryInsights(progress);

  return (
    <div className='bg-white/85 backdrop-blur rounded-2xl shadow p-5'>
      <div className='flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <div className='text-sm font-bold uppercase tracking-wide text-slate-500'>
            Opanowanie lekcji
          </div>
          <p className='text-sm text-slate-500'>
            Sledzone: {insights.trackedLessons} · opanowane: {insights.masteredLessons} · do
            powtorki: {insights.lessonsNeedingPractice}
          </p>
        </div>
        {insights.trackedLessons > 0 && (
          <div className='inline-flex w-fit rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700'>
            {insights.trackedLessons} lekcji z zapisem
          </div>
        )}
      </div>

      {insights.trackedLessons === 0 ? (
        <div className='mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-400'>
          Brak zapisanych prob lekcji. Ukoncz dowolna lekcje, aby zobaczyc mocne strony i obszary do
          powtorki.
        </div>
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
    </div>
  );
}
