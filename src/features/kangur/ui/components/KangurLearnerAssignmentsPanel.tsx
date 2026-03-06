import { useMemo } from 'react';

import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import { KangurPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { selectKangurPriorityAssignments } from '@/features/kangur/ui/services/delegated-assignments';

type KangurLearnerAssignmentsPanelProps = {
  basePath: string;
  enabled?: boolean;
};

const getLatestAssignmentTimestamp = (value: string | null, fallback: string): number => {
  const primaryValue = value ? Date.parse(value) : Number.NaN;
  if (!Number.isNaN(primaryValue)) {
    return primaryValue;
  }

  const fallbackValue = Date.parse(fallback);
  return Number.isNaN(fallbackValue) ? 0 : fallbackValue;
};

export function KangurLearnerAssignmentsPanel({
  basePath,
  enabled = true,
}: KangurLearnerAssignmentsPanelProps): React.JSX.Element {
  const { assignments, isLoading, error } = useKangurAssignments({
    enabled,
    query: {
      includeArchived: false,
    },
  });

  const activeAssignments = useMemo(
    () => selectKangurPriorityAssignments(assignments, assignments.length),
    [assignments]
  );
  const completedAssignments = useMemo(
    () =>
      assignments
        .filter((assignment) => !assignment.archived && assignment.progress.status === 'completed')
        .sort((left, right) => {
          const leftTime = getLatestAssignmentTimestamp(
            left.progress.completedAt,
            left.updatedAt
          );
          const rightTime = getLatestAssignmentTimestamp(
            right.progress.completedAt,
            right.updatedAt
          );
          return rightTime - leftTime;
        }),
    [assignments]
  );

  const totalVisibleAssignments = assignments.filter((assignment) => !assignment.archived).length;
  const completionRate =
    totalVisibleAssignments === 0
      ? 0
      : Math.round((completedAssignments.length / totalVisibleAssignments) * 100);
  const highPriorityActiveCount = activeAssignments.filter(
    (assignment) => assignment.priority === 'high'
  ).length;
  const latestCompletedTitle = completedAssignments[0]?.title ?? 'Brak ukonczonych zadan';

  if (!enabled) {
    return (
      <KangurPanel padding='lg' variant='soft'>
        <div className='text-sm font-bold text-gray-500 uppercase tracking-wide'>
          Przebieg przydzielonych zadan
        </div>
        <div className='mt-2 text-sm text-gray-500'>
          Po zalogowaniu zobaczysz zadania przypisane przez rodzica oraz historie ich wykonania.
        </div>
      </KangurPanel>
    );
  }

  if (isLoading) {
    return (
      <KangurPanel padding='lg' variant='soft' className='text-sm text-slate-400'>
        Ladowanie przydzielonych zadan...
      </KangurPanel>
    );
  }

  if (error) {
    return (
      <KangurPanel padding='lg' variant='soft' className='text-sm text-rose-500'>
        {error}
      </KangurPanel>
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <KangurPanel padding='lg' variant='soft'>
        <div className='text-sm font-bold text-gray-500 uppercase tracking-wide'>
          Przebieg przydzielonych zadan
        </div>
        <div className='mt-1 text-sm text-gray-500'>
          Sprawdz, co jest nadal aktywne, ile zadan masz juz za soba i co bylo ostatnim sukcesem.
        </div>

        <div className='mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'>
          <div className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
            <div className='text-[11px] font-bold uppercase tracking-wide text-slate-400'>
              Aktywne
            </div>
            <div className='mt-1 text-2xl font-extrabold text-slate-800'>
              {activeAssignments.length}
            </div>
            <div className='mt-1 text-xs text-slate-500'>zadania nadal do wykonania</div>
          </div>

          <div className='rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3'>
            <div className='text-[11px] font-bold uppercase tracking-wide text-emerald-500'>
              Ukonczone
            </div>
            <div className='mt-1 text-2xl font-extrabold text-emerald-700'>
              {completedAssignments.length}
            </div>
            <div className='mt-1 text-xs text-emerald-600'>przydzialy juz zakonczone</div>
          </div>

          <div className='rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3'>
            <div className='text-[11px] font-bold uppercase tracking-wide text-amber-500'>
              Pilne
            </div>
            <div className='mt-1 text-2xl font-extrabold text-amber-700'>
              {highPriorityActiveCount}
            </div>
            <div className='mt-1 text-xs text-amber-600'>wysokie priorytety od rodzica</div>
          </div>

          <div className='rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3'>
            <div className='text-[11px] font-bold uppercase tracking-wide text-indigo-500'>
              Skutecznosc
            </div>
            <div className='mt-1 text-2xl font-extrabold text-indigo-700'>{completionRate}%</div>
            <div className='mt-1 text-xs text-indigo-600'>wykonanych z wszystkich widocznych zadan</div>
          </div>
        </div>

        <div className='mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/80 px-4 py-3'>
          <div className='text-[11px] font-bold uppercase tracking-wide text-indigo-500'>
            Ostatni sukces
          </div>
          <div className='mt-1 text-sm font-semibold text-indigo-700'>{latestCompletedTitle}</div>
        </div>
      </KangurPanel>

      <KangurAssignmentsList
        assignments={activeAssignments}
        basePath={basePath}
        title='Aktywne zadania od rodzica'
        emptyLabel='Brak aktywnych zadan przypisanych do tego profilu.'
        compact
      />

      <KangurAssignmentsList
        assignments={completedAssignments}
        basePath={basePath}
        title='Historia ukonczonych zadan'
        emptyLabel='Nie masz jeszcze zakonczonych przydzielonych zadan.'
        compact
      />
    </div>
  );
}

export default KangurLearnerAssignmentsPanel;
