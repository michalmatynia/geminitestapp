'use client';

import { useCallback, useMemo } from 'react';
import { useLocale } from 'next-intl';

import KangurAssignmentsList from '@/features/kangur/ui/components/assignments/KangurAssignmentsList';
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
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

type KangurLearnerAssignmentsPanelProps = {
  basePath: string;
  enabled?: boolean;
};

type LearnerAssignmentsFallbackCopy = {
  activeAssignmentsDescription: string;
  activeAssignmentsEmptyLabel: string;
  activeAssignmentsTitle: string;
  activeLabel: string;
  completedAssignmentsDescription: string;
  completedAssignmentsEmptyLabel: string;
  completedAssignmentsTitle: string;
  completedLabel: string;
  completionRateDescription: string;
  completionRateLabel: string;
  disabledDescription: string;
  disabledLabel: string;
  disabledTitle: string;
  errorDescription: string;
  errorLabel: string;
  highPriorityDescription: string;
  highPriorityLabel: string;
  latestCompletedTitle: string;
  latestSuccessDescription: string;
  latestSuccessLabel: string;
  loadingDescription: string;
  loadingTitle: string;
  sectionSummary: string;
  sectionTitle: string;
};

const getLearnerAssignmentsFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): LearnerAssignmentsFallbackCopy => {
  if (locale === 'uk') {
    return {
      activeAssignmentsDescription: 'завдання ще очікують виконання',
      activeAssignmentsEmptyLabel: 'Зараз немає активних підказок від батьків.',
      activeAssignmentsTitle: 'Поточні підказки від батьків',
      activeLabel: 'Активні',
      completedAssignmentsDescription: 'призначення вже завершені',
      completedAssignmentsEmptyLabel: 'У тебе ще немає виконаних підказок від батьків.',
      completedAssignmentsTitle: 'Історія виконаних підказок',
      completedLabel: 'Завершені',
      completionRateDescription: 'виконано з усіх видимих завдань',
      completionRateLabel: 'Результативність',
      disabledDescription:
        'Після входу ти побачиш підказки від батьків і історію їх виконання.',
      disabledLabel: 'Локальний режим',
      disabledTitle: 'Підказки від батьків',
      errorDescription: 'Спробуй ще раз за хвилину або онови профіль учня.',
      errorLabel: 'Помилка призначень',
      highPriorityDescription: 'високі пріоритети від батьків',
      highPriorityLabel: 'Термінові',
      latestCompletedTitle: 'Немає завершених завдань',
      latestSuccessDescription: 'Найновіше завершене завдання з історії призначень.',
      latestSuccessLabel: 'Останній успіх',
      loadingDescription: 'Перевіряємо активні та завершені призначення для цього профілю.',
      loadingTitle: 'Завантаження призначених завдань...',
      sectionSummary:
        'Завдання та підказки від батьків, які варто виконати насамперед.',
      sectionTitle: 'Підказки від батьків',
    };
  }

  if (locale === 'de') {
    return {
      activeAssignmentsDescription: 'Aufgaben stehen noch aus',
      activeAssignmentsEmptyLabel: 'Es gibt aktuell keine Empfehlungen der Eltern.',
      activeAssignmentsTitle: 'Aktuelle Empfehlungen der Eltern',
      activeLabel: 'Aktiv',
      completedAssignmentsDescription: 'Zuweisungen bereits abgeschlossen',
      completedAssignmentsEmptyLabel: 'Du hast noch keine erledigten Empfehlungen der Eltern.',
      completedAssignmentsTitle: 'Verlauf erledigter Empfehlungen',
      completedLabel: 'Erledigt',
      completionRateDescription: 'von allen sichtbaren Aufgaben erledigt',
      completionRateLabel: 'Trefferquote',
      disabledDescription:
        'Nach der Anmeldung siehst du Empfehlungen der Eltern und deren Verlauf.',
      disabledLabel: 'Lokaler Modus',
      disabledTitle: 'Empfehlungen der Eltern',
      errorDescription:
        'Versuche es in einem Moment noch einmal oder aktualisiere das Lernendenprofil.',
      errorLabel: 'Zuweisungsfehler',
      highPriorityDescription: 'hohe Prioritaten von den Eltern',
      highPriorityLabel: 'Dringend',
      latestCompletedTitle: 'Keine abgeschlossenen Aufgaben',
      latestSuccessDescription: 'Die zuletzt abgeschlossene Aufgabe aus dem Zuweisungsverlauf.',
      latestSuccessLabel: 'Letzter Erfolg',
      loadingDescription:
        'Aktive und abgeschlossene Zuweisungen fur dieses Profil werden gepruft.',
      loadingTitle: 'Zugewiesene Aufgaben werden geladen...',
      sectionSummary:
        'Aufgaben und Hinweise der Eltern, die du zuerst erledigen solltest.',
      sectionTitle: 'Empfehlungen der Eltern',
    };
  }

  if (locale === 'en') {
    return {
      activeAssignmentsDescription: 'assignments still waiting to be done',
      activeAssignmentsEmptyLabel: 'There are no current parent suggestions.',
      activeAssignmentsTitle: 'Current parent suggestions',
      activeLabel: 'Active',
      completedAssignmentsDescription: 'assignments already completed',
      completedAssignmentsEmptyLabel: 'You do not have any completed parent suggestions yet.',
      completedAssignmentsTitle: 'History of completed suggestions',
      completedLabel: 'Completed',
      completionRateDescription: 'completed out of all visible assignments',
      completionRateLabel: 'Completion rate',
      disabledDescription:
        'After signing in you will see parent suggestions and the history of completing them.',
      disabledLabel: 'Local mode',
      disabledTitle: 'Parent suggestions',
      errorDescription: 'Try again in a moment or refresh the learner profile.',
      errorLabel: 'Assignment error',
      highPriorityDescription: 'high-priority items from the parent',
      highPriorityLabel: 'Urgent',
      latestCompletedTitle: 'No completed assignments',
      latestSuccessDescription:
        'The most recently completed assignment from the assignment history.',
      latestSuccessLabel: 'Latest success',
      loadingDescription: 'Checking active and completed assignments for this profile.',
      loadingTitle: 'Loading assigned tasks...',
      sectionSummary:
        'Tasks and hints from the parent that are worth completing first.',
      sectionTitle: 'Parent suggestions',
    };
  }

  return {
    activeAssignmentsDescription: 'zadania nadal do wykonania',
    activeAssignmentsEmptyLabel: 'Brak aktualnych sugestii od rodzica.',
    activeAssignmentsTitle: 'Aktualne sugestie od rodzica',
    activeLabel: 'Aktywne',
    completedAssignmentsDescription: 'przydziały już zakończone',
    completedAssignmentsEmptyLabel: 'Nie masz jeszcze wykonanych sugestii od rodzica.',
    completedAssignmentsTitle: 'Historia wykonanych sugestii',
    completedLabel: 'Ukończone',
    completionRateDescription: 'wykonanych z wszystkich widocznych zadań',
    completionRateLabel: 'Skuteczność',
    disabledDescription:
      'Po zalogowaniu zobaczysz sugestie od rodzica oraz historię ich wykonania.',
    disabledLabel: 'Tryb lokalny',
    disabledTitle: 'Sugestie od Rodzica',
    errorDescription: 'Spróbuj ponownie za chwilę albo odśwież profil ucznia.',
    errorLabel: 'Błąd przydziałów',
    highPriorityDescription: 'wysokie priorytety od rodzica',
    highPriorityLabel: 'Pilne',
    latestCompletedTitle: 'Brak ukończonych zadań',
    latestSuccessDescription: 'Najnowsze zakończone zadanie z historii przydziałów.',
    latestSuccessLabel: 'Ostatni sukces',
    loadingDescription: 'Sprawdzamy aktywne i zakończone przydziały dla tego profilu.',
    loadingTitle: 'Ładowanie przydzielonych zadań...',
    sectionSummary:
      'Zadania i wskazówki od rodzica, które warto wykonać w pierwszej kolejności.',
    sectionTitle: 'Sugestie od Rodzica',
  };
};

const getLatestAssignmentTimestamp = (value: string | null, fallback: string): number => {
  const primaryValue = value ? Date.parse(value) : Number.NaN;
  if (!Number.isNaN(primaryValue)) {
    return primaryValue;
  }

  const fallbackValue = Date.parse(fallback);
  return Number.isNaN(fallbackValue) ? 0 : fallbackValue;
};

const resolveKangurCompletedAssignments = (
  subjectAssignments: ReturnType<typeof useKangurAssignments>['assignments']
): ReturnType<typeof useKangurAssignments>['assignments'] =>
  subjectAssignments
    .filter((assignment) => !assignment.archived && assignment.progress.status === 'completed')
    .sort((left, right) => {
      const leftTime = getLatestAssignmentTimestamp(left.progress.completedAt, left.updatedAt);
      const rightTime = getLatestAssignmentTimestamp(right.progress.completedAt, right.updatedAt);
      return rightTime - leftTime;
    });

const countVisibleKangurAssignments = (
  subjectAssignments: ReturnType<typeof useKangurAssignments>['assignments']
): number => subjectAssignments.filter((assignment) => !assignment.archived).length;

const countKangurHighPriorityAssignments = (
  activeAssignments: ReturnType<typeof useKangurAssignments>['assignments']
): number => activeAssignments.filter((assignment) => assignment.priority === 'high').length;

const useKangurLearnerAssignmentCollections = ({
  assignments,
  basePath,
  subject,
}: {
  assignments: ReturnType<typeof useKangurAssignments>['assignments'];
  basePath: string;
  subject: ReturnType<typeof useKangurSubjectFocus>['subject'];
}): {
  activeAssignmentItems: KangurAssignmentListItem[];
  activeAssignments: ReturnType<typeof useKangurAssignments>['assignments'];
  completedAssignmentItems: KangurAssignmentListItem[];
  completedAssignments: ReturnType<typeof useKangurAssignments>['assignments'];
  subjectAssignments: ReturnType<typeof useKangurAssignments>['assignments'];
} => {
  const subjectAssignments = useMemo(
    () => filterKangurAssignmentsBySubject(assignments, subject),
    [assignments, subject]
  );
  const activeAssignments = useMemo(
    () => selectKangurPriorityAssignments(subjectAssignments, subjectAssignments.length),
    [subjectAssignments]
  );
  const completedAssignments = useMemo(
    () => resolveKangurCompletedAssignments(subjectAssignments),
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

  return {
    activeAssignmentItems,
    activeAssignments,
    completedAssignmentItems,
    completedAssignments,
    subjectAssignments,
  };
};

const resolveKangurLearnerAssignmentsSummary = ({
  activeAssignments,
  assignmentsContent,
  completedAssignments,
  fallbackCopy,
  subjectAssignments,
}: {
  activeAssignments: ReturnType<typeof useKangurAssignments>['assignments'];
  assignmentsContent: ReturnType<typeof useKangurPageContentEntry>['entry'];
  completedAssignments: ReturnType<typeof useKangurAssignments>['assignments'];
  fallbackCopy: LearnerAssignmentsFallbackCopy;
  subjectAssignments: ReturnType<typeof useKangurAssignments>['assignments'];
}): {
  completionRate: number;
  highPriorityActiveCount: number;
  latestCompletedTitle: string;
  sectionSummary: string;
  sectionTitle: string;
} => {
  const totalVisibleAssignments = countVisibleKangurAssignments(subjectAssignments);
  return {
    completionRate:
      totalVisibleAssignments === 0
        ? 0
        : Math.round((completedAssignments.length / totalVisibleAssignments) * 100),
    highPriorityActiveCount: countKangurHighPriorityAssignments(activeAssignments),
    latestCompletedTitle: completedAssignments[0]?.title ?? fallbackCopy.latestCompletedTitle,
    sectionSummary: assignmentsContent?.summary ?? fallbackCopy.sectionSummary,
    sectionTitle: assignmentsContent?.title ?? fallbackCopy.sectionTitle,
  };
};

const syncKangurAssignmentPanelSubject = ({
  item,
  setSubject,
  subject,
}: {
  item: KangurAssignmentListItem;
  setSubject: ReturnType<typeof useKangurSubjectFocus>['setSubject'];
  subject: ReturnType<typeof useKangurSubjectFocus>['subject'];
}): void => {
  if (item.subject !== subject) {
    setSubject(item.subject);
  }
};

const renderKangurLearnerAssignmentsUnavailableState = ({
  enabled,
  error,
  fallbackCopy,
  isLoading,
}: {
  enabled: boolean;
  error: string | null;
  fallbackCopy: LearnerAssignmentsFallbackCopy;
  isLoading: boolean;
}): React.JSX.Element | null => {
  if (!enabled) {
    return (
      <KangurSummaryPanel
        accent='slate'
        data-testid='learner-assignments-disabled'
        description={fallbackCopy.disabledDescription}
        label={fallbackCopy.disabledLabel}
        padding='lg'
        title={fallbackCopy.disabledTitle}
      />
    );
  }

  if (isLoading) {
    return (
      <KangurEmptyState
        accent='slate'
        align='center'
        data-testid='learner-assignments-loading'
        description={fallbackCopy.loadingDescription}
        padding='lg'
        title={fallbackCopy.loadingTitle}
        role='status'
        aria-live='polite'
        aria-atomic='true'
      />
    );
  }

  if (!error) {
    return null;
  }

  return (
    <KangurSummaryPanel
      accent='rose'
      data-testid='learner-assignments-error'
      description={fallbackCopy.errorDescription}
      label={fallbackCopy.errorLabel}
      padding='lg'
      title={error}
      tone='accent'
      role='alert'
      aria-live='assertive'
      aria-atomic='true'
    />
  );
};

interface LearnerAssignmentsContextValue {
  fallbackCopy: LearnerAssignmentsFallbackCopy;
  subject: ReturnType<typeof useKangurSubjectFocus>['subject'];
  setSubject: ReturnType<typeof useKangurSubjectFocus>['setSubject'];
}

const LearnerAssignmentsContext = React.createContext<LearnerAssignmentsContextValue | null>(null);

function useLearnerAssignments(): LearnerAssignmentsContextValue {
  const context = React.useContext(LearnerAssignmentsContext);
  if (!context) {
    throw new Error('useLearnerAssignments must be used within KangurLearnerAssignmentsPanel');
  }
  return context;
}

function KangurLearnerAssignmentsMetrics({
  activeAssignmentsCount,
  completedAssignmentsCount,
  metrics,
}: {
  activeAssignmentsCount: number;
  completedAssignmentsCount: number;
  metrics: {
    completionRate: number;
    highPriorityActiveCount: number;
    latestCompletedTitle: string;
    sectionSummary: string;
    sectionTitle: string;
  };
}): React.JSX.Element {
  const { fallbackCopy } = useLearnerAssignments();
  const {
    completionRate,
    highPriorityActiveCount,
    latestCompletedTitle,
    sectionSummary,
    sectionTitle,
  } = metrics;

  return (
    <KangurGlassPanel padding='lg' surface='mistStrong' variant='soft'>
      <KangurPanelIntro description={sectionSummary} eyebrow={sectionTitle} />

      <div className='mt-4 grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-4'>
        <KangurMetricCard
          accent='slate'
          data-testid='learner-assignments-active'
          description={fallbackCopy.activeAssignmentsDescription}
          label={fallbackCopy.activeLabel}
          value={activeAssignmentsCount}
        />

        <KangurMetricCard
          accent='emerald'
          data-testid='learner-assignments-completed'
          description={fallbackCopy.completedAssignmentsDescription}
          label={fallbackCopy.completedLabel}
          value={completedAssignmentsCount}
        />

        <KangurMetricCard
          accent='amber'
          data-testid='learner-assignments-high-priority'
          description={fallbackCopy.highPriorityDescription}
          label={fallbackCopy.highPriorityLabel}
          value={highPriorityActiveCount}
        />

        <KangurMetricCard
          accent='indigo'
          data-testid='learner-assignments-completion-rate'
          description={fallbackCopy.completionRateDescription}
          label={fallbackCopy.completionRateLabel}
          value={`${completionRate}%`}
        />
      </div>

      <KangurSummaryPanel
        accent='indigo'
        className='mt-4'
        description={fallbackCopy.latestSuccessDescription}
        label={fallbackCopy.latestSuccessLabel}
        padding='md'
        title={latestCompletedTitle}
        tone='accent'
      />
    </KangurGlassPanel>
  );
}

export function KangurLearnerAssignmentsPanel({
  basePath,
  enabled = false,
}: KangurLearnerAssignmentsPanelProps): React.JSX.Element {
  const locale = normalizeSiteLocale(useLocale());
  const fallbackCopy = getLearnerAssignmentsFallbackCopy(locale);
  const { entry: assignmentsContent } = useKangurPageContentEntry('learner-profile-assignments');
  const { subject, setSubject } = useKangurSubjectFocus();
  const { assignments, isLoading, error } = useKangurAssignments({
    enabled,
    query: {
      includeArchived: false,
    },
  });
  const {
    activeAssignmentItems,
    activeAssignments,
    completedAssignmentItems,
    completedAssignments,
    subjectAssignments,
  } = useKangurLearnerAssignmentCollections({ assignments, basePath, subject });
  const handleAssignmentOpen = useCallback(
    (item: KangurAssignmentListItem) => {
      syncKangurAssignmentPanelSubject({ item, setSubject, subject });
    },
    [setSubject, subject]
  );
  const metrics = resolveKangurLearnerAssignmentsSummary({
    activeAssignments,
    assignmentsContent,
    completedAssignments,
    fallbackCopy,
    subjectAssignments,
  });
  const unavailableState = renderKangurLearnerAssignmentsUnavailableState({
    enabled,
    error,
    fallbackCopy,
    isLoading,
  });

  if (unavailableState) {
    return unavailableState;
  }

  return (
    <LearnerAssignmentsContext.Provider value={{ fallbackCopy, subject, setSubject }}>
      <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <KangurLearnerAssignmentsMetrics
          activeAssignmentsCount={activeAssignments.length}
          completedAssignmentsCount={completedAssignments.length}
          metrics={metrics}
        />

        <KangurAssignmentsList
          items={activeAssignmentItems}
          title={fallbackCopy.activeAssignmentsTitle}
          emptyLabel={fallbackCopy.activeAssignmentsEmptyLabel}
          compact
          showTimeCountdown
          onItemActionClick={handleAssignmentOpen}
        />

        <KangurAssignmentsList
          items={completedAssignmentItems}
          title={fallbackCopy.completedAssignmentsTitle}
          emptyLabel={fallbackCopy.completedAssignmentsEmptyLabel}
          compact
          onItemActionClick={handleAssignmentOpen}
        />
      </div>
    </LearnerAssignmentsContext.Provider>
  );
}

export default KangurLearnerAssignmentsPanel;
