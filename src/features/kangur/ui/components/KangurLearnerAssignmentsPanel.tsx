import { useMemo } from 'react';

import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurMetricCard,
  KangurSectionEyebrow,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import {
  buildKangurAssignmentListItems,
  selectKangurPriorityAssignments,
} from '@/features/kangur/ui/services/delegated-assignments';

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
  enabled = false,
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
          const leftTime = getLatestAssignmentTimestamp(left.progress.completedAt, left.updatedAt);
          const rightTime = getLatestAssignmentTimestamp(
            right.progress.completedAt,
            right.updatedAt
          );
          return rightTime - leftTime;
        }),
    [assignments]
  );
  const activeAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, activeAssignments),
    [activeAssignments, basePath]
  );
  const completedAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, completedAssignments),
    [basePath, completedAssignments]
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
      <KangurSummaryPanel
        accent='slate'
        data-testid='learner-assignments-disabled'
        description='Po zalogowaniu zobaczysz zadania przypisane przez rodzica oraz historie ich wykonania.'
        label='Tryb lokalny'
        padding='lg'
        title='Przebieg przydzielonych zadan'
      />
    );
  }

  if (isLoading) {
    return (
      <KangurEmptyState
        accent='slate'
        align='center'
        data-testid='learner-assignments-loading'
        description='Sprawdzamy aktywne i zakonczone przydzialy dla tego profilu.'
        padding='lg'
        title='Ladowanie przydzielonych zadan...'
      />
    );
  }

  if (error) {
    return (
      <KangurSummaryPanel
        accent='rose'
        data-testid='learner-assignments-error'
        description='Sprobuj ponownie za chwile albo odswiez profil ucznia.'
        label='Blad przydzialow'
        padding='lg'
        title={error}
        tone='accent'
      />
    );
  }

  return (
    <div className='flex flex-col gap-4'>
      <KangurGlassPanel padding='lg' surface='mistStrong' variant='soft'>
        <KangurSectionEyebrow>
          Przebieg przydzielonych zadan
        </KangurSectionEyebrow>
        <div className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
          Sprawdz, co jest nadal aktywne, ile zadan masz juz za soba i co bylo ostatnim sukcesem.
        </div>

        <div className='mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3'>
          <KangurMetricCard
            accent='slate'
            data-testid='learner-assignments-active'
            description='zadania nadal do wykonania'
            label='Aktywne'
            value={activeAssignments.length}
          />

          <KangurMetricCard
            accent='emerald'
            data-testid='learner-assignments-completed'
            description='przydzialy juz zakonczone'
            label='Ukonczone'
            value={completedAssignments.length}
          />

          <KangurMetricCard
            accent='amber'
            data-testid='learner-assignments-high-priority'
            description='wysokie priorytety od rodzica'
            label='Pilne'
            value={highPriorityActiveCount}
          />

          <KangurMetricCard
            accent='indigo'
            data-testid='learner-assignments-completion-rate'
            description='wykonanych z wszystkich widocznych zadan'
            label='Skutecznosc'
            value={`${completionRate}%`}
          />
        </div>

        <KangurSummaryPanel
          accent='indigo'
          className='mt-4'
          description='Najnowsze zakonczone zadanie z historii przydzialow.'
          label='Ostatni sukces'
          padding='md'
          title={latestCompletedTitle}
          tone='accent'
        />
      </KangurGlassPanel>

      <KangurAssignmentsList
        items={activeAssignmentItems}
        title='Aktywne zadania od rodzica'
        emptyLabel='Brak aktywnych zadan przypisanych do tego profilu.'
        compact
      />

      <KangurAssignmentsList
        items={completedAssignmentItems}
        title='Historia ukonczonych zadan'
        emptyLabel='Nie masz jeszcze zakonczonych przydzielonych zadan.'
        compact
      />
    </div>
  );
}

export default KangurLearnerAssignmentsPanel;
