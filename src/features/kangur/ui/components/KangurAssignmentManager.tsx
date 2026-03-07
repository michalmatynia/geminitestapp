import { useMemo, useState } from 'react';
import Link from 'next/link';

import {
  KANGUR_LESSONS_SETTING_KEY,
  createDefaultKangurLessons,
  parseKangurLessons,
} from '@/features/kangur/settings';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import {
  KangurButton,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetricCard,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  buildKangurAssignmentHref,
  buildKangurAssignmentCatalog,
  buildRecommendedKangurAssignmentCatalog,
  filterKangurAssignmentCatalog,
  getKangurAssignmentActionLabel,
} from '@/features/kangur/ui/services/delegated-assignments';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

type KangurAssignmentManagerProps = {
  basePath: string;
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'time', label: 'Czas' },
  { value: 'arithmetic', label: 'Arytmetyka' },
  { value: 'geometry', label: 'Geometria' },
  { value: 'logic', label: 'Logika' },
  { value: 'practice', label: 'Trening' },
] as const;

type FilterOption = (typeof FILTER_OPTIONS)[number]['value'];

type KangurAssignmentAttentionItem = {
  assignment: KangurAssignmentSnapshot;
  reason: string;
};

type KangurAssignmentTrackerSummary = {
  activeCount: number;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  completionRate: number;
  attentionItems: KangurAssignmentAttentionItem[];
};

const PRIORITY_WEIGHT = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const getPriorityAccentFromLabel = (label: string): 'rose' | 'amber' | 'emerald' => {
  if (label.toLowerCase().includes('wysoki')) {
    return 'rose';
  }
  if (label.toLowerCase().includes('niski')) {
    return 'emerald';
  }
  return 'amber';
};

const buildTrackerSummary = (
  assignments: KangurAssignmentSnapshot[]
): KangurAssignmentTrackerSummary => {
  const visibleAssignments = assignments.filter((assignment) => !assignment.archived);
  const activeAssignments = visibleAssignments.filter(
    (assignment) => assignment.progress.status !== 'completed'
  );
  const notStartedCount = activeAssignments.filter(
    (assignment) => assignment.progress.status === 'not_started'
  ).length;
  const inProgressCount = activeAssignments.filter(
    (assignment) => assignment.progress.status === 'in_progress'
  ).length;
  const completedCount = visibleAssignments.filter(
    (assignment) => assignment.progress.status === 'completed'
  ).length;

  const attentionItems = activeAssignments
    .map((assignment) => {
      if (assignment.progress.status === 'not_started' && assignment.priority === 'high') {
        return {
          assignment,
          reason: 'Wysoki priorytet, ale uczen jeszcze nie rozpoczal tego zadania.',
        };
      }
      if (assignment.progress.status === 'not_started') {
        return {
          assignment,
          reason: 'Zadanie czeka na pierwszy ruch ucznia.',
        };
      }
      if (assignment.progress.status === 'in_progress' && assignment.progress.percent < 50) {
        return {
          assignment,
          reason: 'Postep jest ponizej polowy celu, warto przypomniec o kontynuacji.',
        };
      }
      if (assignment.progress.status === 'in_progress' && !assignment.progress.lastActivityAt) {
        return {
          assignment,
          reason: 'Zadanie jest oznaczone jako rozpoczete, ale brak zapisanej aktywnosci.',
        };
      }

      return null;
    })
    .filter((item): item is KangurAssignmentAttentionItem => item !== null)
    .sort((left, right) => {
      const priorityDelta =
        PRIORITY_WEIGHT[left.assignment.priority] - PRIORITY_WEIGHT[right.assignment.priority];

      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      return left.assignment.progress.percent - right.assignment.progress.percent;
    });

  return {
    activeCount: activeAssignments.length,
    notStartedCount,
    inProgressCount,
    completedCount,
    completionRate:
      visibleAssignments.length === 0
        ? 0
        : Math.round((completedCount / visibleAssignments.length) * 100),
    attentionItems,
  };
};

export function KangurAssignmentManager({
  basePath,
}: KangurAssignmentManagerProps): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const progress = useKangurProgressState();
  const rawLessons = settingsStore.get(KANGUR_LESSONS_SETTING_KEY);
  const lessons = useMemo(() => {
    const parsed = rawLessons ? parseKangurLessons(rawLessons) : createDefaultKangurLessons();
    return parsed.filter((lesson) => lesson.enabled);
  }, [rawLessons]);
  const catalog = useMemo(() => buildKangurAssignmentCatalog(lessons), [lessons]);
  const suggestedCatalog = useMemo(
    () => buildRecommendedKangurAssignmentCatalog(progress),
    [progress]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const { assignments, isLoading, error, createAssignment, updateAssignment, refresh } =
    useKangurAssignments({
      enabled: true,
      query: {
        includeArchived: false,
      },
    });

  const filteredCatalog = useMemo(
    () => filterKangurAssignmentCatalog(catalog, searchTerm, activeFilter),
    [activeFilter, catalog, searchTerm]
  );
  const activeAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => !assignment.archived && assignment.progress.status !== 'completed'
      ),
    [assignments]
  );
  const completedAssignments = useMemo(
    () =>
      assignments.filter(
        (assignment) => !assignment.archived && assignment.progress.status === 'completed'
      ),
    [assignments]
  );
  const trackerSummary = useMemo(() => buildTrackerSummary(assignments), [assignments]);
  const recommendedCatalog = useMemo(
    () =>
      suggestedCatalog.filter((item) => {
        const lessonTarget =
          item.createInput.target.type === 'lesson'
            ? item.createInput.target.lessonComponentId
            : null;

        return !activeAssignments.some((assignment) => {
          if (item.createInput.target.type === 'lesson' && assignment.target.type === 'lesson') {
            return assignment.target.lessonComponentId === lessonTarget;
          }
          if (
            item.createInput.target.type === 'practice' &&
            assignment.target.type === 'practice'
          ) {
            return assignment.target.operation === item.createInput.target.operation;
          }
          return false;
        });
      }),
    [activeAssignments, suggestedCatalog]
  );

  const resolveActionErrorMessage = (error: unknown, fallback: string): string => {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: unknown }).status
        : null;
    if (status === 409) {
      return 'To zadanie jest juz aktywne.';
    }
    return fallback;
  };

  const assignCatalogItem = async (item: (typeof catalog)[number]): Promise<void> => {
    setPendingActionId(item.id);
    setFeedback(null);

    try {
      await createAssignment(item.createInput);
      setFeedback(`Przypisano: ${item.title}.`);
    } catch (error: unknown) {
      setFeedback(resolveActionErrorMessage(error, 'Nie udalo sie przypisac zadania.'));
    } finally {
      setPendingActionId(null);
    }
  };

  const handleAssign = async (catalogItemId: string): Promise<void> => {
    const item = [...catalog, ...suggestedCatalog].find((entry) => entry.id === catalogItemId);
    if (!item) {
      return;
    }

    await assignCatalogItem(item);
  };

  const handleArchive = async (assignmentId: string): Promise<void> => {
    setPendingActionId(assignmentId);
    setFeedback(null);

    try {
      await updateAssignment(assignmentId, { archived: true });
      setFeedback('Zadanie przeniesiono do archiwum.');
    } catch {
      setFeedback('Nie udalo sie zarchiwizowac zadania.');
    } finally {
      setPendingActionId(null);
    }
  };

  return (
    <div className='flex flex-col gap-5'>
      <KangurGlassPanel
        data-testid='assignment-manager-create-shell'
        padding='lg'
        surface='neutral'
        variant='soft'
      >
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='max-w-2xl'>
            <KangurStatusChip accent='indigo' className='text-[11px] uppercase tracking-[0.18em]'>
              Przydziel nowe zadanie
            </KangurStatusChip>
            <div className='mt-3 text-sm leading-6 text-slate-600'>
              Wyszukaj lekcje i zadania treningowe, a potem przypisz je uczniowi jako priorytet.
            </div>
          </div>

          <KangurButton type='button' onClick={() => void refresh()} size='sm' variant='surface'>
            Odśwież postęp
          </KangurButton>
        </div>

        {recommendedCatalog.length > 0 ? (
          <KangurSummaryPanel
            accent='indigo'
            className='mt-5'
            description='Te zadania wynikają z aktualnych słabszych obszarów i rytmu pracy ucznia.'
            label='Podpowiedzi z postępu ucznia'
            padding='lg'
          >
            <div className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2'>
              {recommendedCatalog.map((item) => (
                <KangurInfoCard
                  data-testid={`assignment-manager-recommended-card-${item.id}`}
                  key={item.id}
                  padding='lg'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-bold text-slate-900'>{item.title}</div>
                      <div className='mt-1 text-sm leading-6 text-slate-600'>
                        {item.description}
                      </div>
                    </div>
                    <KangurStatusChip
                      accent={getPriorityAccentFromLabel(item.priorityLabel)}
                      className='text-[11px] uppercase tracking-[0.14em]'
                    >
                      {item.priorityLabel}
                    </KangurStatusChip>
                  </div>
                  <div className='mt-3 flex items-center justify-between gap-3'>
                    <KangurStatusChip accent='slate' className='text-[11px] uppercase tracking-[0.14em]'>
                      {item.badge}
                    </KangurStatusChip>
                    <KangurButton
                      type='button'
                      onClick={() => void handleAssign(item.id)}
                      disabled={pendingActionId === item.id}
                      size='sm'
                      variant='surface'
                    >
                      {pendingActionId === item.id ? 'Przypisywanie...' : 'Przypisz sugestię'}
                    </KangurButton>
                  </div>
                </KangurInfoCard>
              ))}
            </div>
          </KangurSummaryPanel>
        ) : null}

        <KangurTextField
          accent='indigo'
          type='search'
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder='Szukaj po temacie, typie zadania lub słowie kluczowym...'
          className='mt-5'
        />

        <div className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} mt-4 flex-wrap justify-start sm:w-auto`}>
          {FILTER_OPTIONS.map((option) => (
            <KangurButton
              key={option.value}
              type='button'
              onClick={() => setActiveFilter(option.value)}
              aria-pressed={activeFilter === option.value}
              className='min-w-0 flex-none px-3 text-xs'
              data-testid={`assignment-manager-filter-${option.value}`}
              size='sm'
              variant={activeFilter === option.value ? 'segmentActive' : 'segment'}
            >
              {option.label}
            </KangurButton>
          ))}
        </div>

        {feedback ? (
          <KangurSummaryPanel
            accent={
              feedback.toLowerCase().includes('nie uda') || feedback.toLowerCase().includes('juz')
                ? 'rose'
                : 'indigo'
            }
            className='mt-4'
            description={feedback}
            padding='sm'
            tone='accent'
          />
        ) : null}

        {error ? (
          <KangurSummaryPanel
            accent='rose'
            className='mt-4'
            description={error}
            padding='sm'
            tone='accent'
          />
        ) : null}

        <div className='mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2'>
          {filteredCatalog.map((item) => (
            <KangurInfoCard
              data-testid={`assignment-manager-catalog-card-${item.id}`}
              key={item.id}
              padding='lg'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='text-sm font-bold text-slate-900'>{item.title}</div>
                  <div className='mt-1 text-sm leading-6 text-slate-600'>{item.description}</div>
                </div>
                <KangurStatusChip
                  accent='slate'
                  className='text-[11px] uppercase tracking-[0.14em]'
                >
                  {item.badge}
                </KangurStatusChip>
              </div>

              <div className='mt-3 flex items-center justify-between gap-3'>
                <KangurStatusChip
                  accent={getPriorityAccentFromLabel(item.priorityLabel)}
                  className='text-[11px] uppercase tracking-[0.14em]'
                >
                  {item.priorityLabel}
                </KangurStatusChip>
                <KangurButton
                  type='button'
                  onClick={() => void handleAssign(item.id)}
                  disabled={pendingActionId === item.id}
                  size='sm'
                  variant='surface'
                >
                  {pendingActionId === item.id ? 'Przypisywanie...' : 'Przypisz'}
                </KangurButton>
              </div>
            </KangurInfoCard>
          ))}
        </div>

        {!isLoading && filteredCatalog.length === 0 ? (
          <KangurEmptyState
            accent='slate'
            className='mt-4 text-sm'
            description='Brak wyników dla wybranego filtra.'
            padding='lg'
          />
        ) : null}
      </KangurGlassPanel>

      <KangurGlassPanel
        data-testid='assignment-manager-tracking-shell'
        padding='lg'
        surface='neutral'
        variant='soft'
      >
        <div className='flex flex-col gap-1'>
          <KangurStatusChip
            accent='slate'
            className='w-fit text-[11px] uppercase tracking-[0.18em]'
          >
            Monitorowanie zadań
          </KangurStatusChip>
          <div className='mt-2 text-sm leading-6 text-slate-600'>
            Szybki podgląd tego, co uczeń rozpoczął, zakończył albo nadal odkłada.
          </div>
        </div>

        <div className='mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4'>
          <KangurMetricCard
            accent='slate'
            description='zadania wymagające dalszej pracy'
            label='Aktywne'
            value={trackerSummary.activeCount}
          />
          <KangurMetricCard
            accent='amber'
            description='uczeń jeszcze nie ruszył tych zadań'
            label='Do rozpoczecia'
            value={trackerSummary.notStartedCount}
          />
          <KangurMetricCard
            accent='indigo'
            description='zadania, nad którymi uczeń już pracuje'
            label='W trakcie'
            value={trackerSummary.inProgressCount}
          />
          <KangurMetricCard
            accent='emerald'
            description='przydziały zrealizowane przez ucznia'
            label='Ukonczone'
            value={trackerSummary.completedCount}
          />
        </div>

        <KangurMetricCard
          accent='slate'
          className='mt-4'
          description='odsetek wszystkich niearchiwalnych zadań, które uczeń ma już zakończone'
          label='Skutecznosc wykonania'
          value={`${trackerSummary.completionRate}%`}
        />

        <KangurSummaryPanel
          accent='amber'
          className='mt-4'
          description='Te zadania warto przypomnieć uczniowi albo omówić podczas kolejnej nauki.'
          label='Do uwagi'
          padding='lg'
          tone='accent'
        >
          {trackerSummary.attentionItems.length === 0 ? (
            <KangurEmptyState
              accent='emerald'
              align='left'
              className='mt-4'
              data-testid='assignment-manager-attention-empty'
              description='Brak zadań wymagających dodatkowej reakcji.'
              padding='md'
            />
          ) : (
            <div className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2'>
              {trackerSummary.attentionItems.slice(0, 4).map((item) => (
                <KangurInfoCard
                  accent='amber'
                  data-testid={`assignment-manager-attention-card-${item.assignment.id}`}
                  key={item.assignment.id}
                  padding='lg'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-bold text-slate-900'>
                        {item.assignment.title}
                      </div>
                      <div className='mt-1 text-sm leading-6 text-amber-900'>{item.reason}</div>
                    </div>
                    <KangurStatusChip
                      accent='amber'
                      className='text-[11px] uppercase tracking-[0.14em]'
                    >
                      {item.assignment.progress.percent}%
                    </KangurStatusChip>
                  </div>
                  <div className='mt-3 flex items-center justify-between gap-3'>
                    <div className='text-[11px] uppercase tracking-[0.14em] text-slate-500'>
                      {item.assignment.progress.summary}
                    </div>
                    <KangurButton asChild size='sm' variant='warning'>
                      <Link href={buildKangurAssignmentHref(basePath, item.assignment)}>
                        {getKangurAssignmentActionLabel(item.assignment)}
                      </Link>
                    </KangurButton>
                  </div>
                </KangurInfoCard>
              ))}
            </div>
          )}
        </KangurSummaryPanel>
      </KangurGlassPanel>

      <KangurAssignmentsList
        assignments={activeAssignments}
        basePath={basePath}
        title='Aktywne zadania'
        emptyLabel='Brak aktywnych zadań dla ucznia.'
        onArchive={(assignmentId) => void handleArchive(assignmentId)}
      />

      <KangurAssignmentsList
        assignments={completedAssignments}
        basePath={basePath}
        title='Ukończone zadania'
        emptyLabel='Uczeń nie zakończył jeszcze żadnych przypisanych zadań.'
        onArchive={(assignmentId) => void handleArchive(assignmentId)}
      />
    </div>
  );
}

export default KangurAssignmentManager;
