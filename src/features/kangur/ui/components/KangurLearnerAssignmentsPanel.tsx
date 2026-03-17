'use client';

import { useCallback, useMemo } from 'react';

import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import {
  KangurEmptyState,
  KangurGlassPanel,
  KangurMetricCard,
  KangurPanelIntro,
  KangurSummaryPanel,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import {
  buildKangurAssignmentListItems,
  filterKangurAssignmentsBySubject,
  selectKangurPriorityAssignments,
  type KangurAssignmentListItem,
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
  const { entry: assignmentsContent } = useKangurPageContentEntry('learner-profile-assignments');
  const { subject, setSubject } = useKangurSubjectFocus();
  const { assignments, isLoading, error } = useKangurAssignments({
    enabled,
    query: {
      includeArchived: false,
    },
  });

  const subjectAssignments = useMemo(
    () => filterKangurAssignmentsBySubject(assignments, subject),
    [assignments, subject]
  );
  const activeAssignments = useMemo(
    () => selectKangurPriorityAssignments(subjectAssignments, subjectAssignments.length),
    [subjectAssignments]
  );
  const completedAssignments = useMemo(
    () =>
      subjectAssignments
        .filter((assignment) => !assignment.archived && assignment.progress.status === 'completed')
        .sort((left, right) => {
          const leftTime = getLatestAssignmentTimestamp(left.progress.completedAt, left.updatedAt);
          const rightTime = getLatestAssignmentTimestamp(
            right.progress.completedAt,
            right.updatedAt
          );
          return rightTime - leftTime;
        }),
    [subjectAssignments]
  );
  const activeAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, activeAssignments),
    [activeAssignments, basePath]
  );
  const completedAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, completedAssignments),
    [basePath, completedAssignments]
  );
  const handleAssignmentOpen = useCallback(
    (item: KangurAssignmentListItem) => {
      if (item.subject !== subject) {
        setSubject(item.subject);
      }
    },
    [setSubject, subject]
  );

  const totalVisibleAssignments = subjectAssignments.filter(
    (assignment) => !assignment.archived
  ).length;
  const completionRate =
    totalVisibleAssignments === 0
      ? 0
      : Math.round((completedAssignments.length / totalVisibleAssignments) * 100);
  const highPriorityActiveCount = activeAssignments.filter(
    (assignment) => assignment.priority === 'high'
  ).length;
  const latestCompletedTitle = completedAssignments[0]?.title ?? 'Brak ukończonych zadań';
  const sectionTitle = assignmentsContent?.title ?? 'Sugestie od Rodzica';
  const sectionSummary =
    assignmentsContent?.summary ??
    'Zadania i wskazówki od rodzica, które warto wykonać w pierwszej kolejności.';

  if (!enabled) {
    return (
      <KangurSummaryPanel
        accent='slate'
        data-testid='learner-assignments-disabled'
        description='Po zalogowaniu zobaczysz sugestie od rodzica oraz historię ich wykonania.'
        label='Tryb lokalny'
        padding='lg'
        title='Sugestie od Rodzica'
      />
    );
  }

  if (isLoading) {
    return (
      <KangurEmptyState
        accent='slate'
        align='center'
        data-testid='learner-assignments-loading'
        description='Sprawdzamy aktywne i zakończone przydziały dla tego profilu.'
        padding='lg'
        title='Ładowanie przydzielonych zadań...'
        role='status'
        aria-live='polite'
        aria-atomic='true'
      />
    );
  }

  if (error) {
    return (
      <KangurSummaryPanel
        accent='rose'
        data-testid='learner-assignments-error'
        description='Spróbuj ponownie za chwilę albo odśwież profil ucznia.'
        label='Błąd przydziałów'
        padding='lg'
        title={error}
        tone='accent'
        role='alert'
        aria-live='assertive'
        aria-atomic='true'
      />
    );
  }

  return (
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurGlassPanel padding='lg' surface='mistStrong' variant='soft'>
        <KangurPanelIntro description={sectionSummary} eyebrow={sectionTitle} />

        <div className='mt-4 grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-4'>
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
            description='przydziały już zakończone'
            label='Ukończone'
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
            description='wykonanych z wszystkich widocznych zadań'
            label='Skuteczność'
            value={`${completionRate}%`}
          />
        </div>

        <KangurSummaryPanel
          accent='indigo'
          className='mt-4'
          description='Najnowsze zakończone zadanie z historii przydziałów.'
          label='Ostatni sukces'
          padding='md'
          title={latestCompletedTitle}
          tone='accent'
        />
      </KangurGlassPanel>

      <KangurAssignmentsList
        items={activeAssignmentItems}
        title='Aktualne sugestie od rodzica'
        emptyLabel='Brak aktualnych sugestii od rodzica.'
        compact
        showTimeCountdown
        onItemActionClick={handleAssignmentOpen}
      />

      <KangurAssignmentsList
        items={completedAssignmentItems}
        title='Historia wykonanych sugestii'
        emptyLabel='Nie masz jeszcze wykonanych sugestii od rodzica.'
        compact
        onItemActionClick={handleAssignmentOpen}
      />
    </div>
  );
}

export default KangurLearnerAssignmentsPanel;
