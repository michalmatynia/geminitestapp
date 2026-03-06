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
  KangurLessonCallout,
  KangurLessonChip,
} from '@/features/kangur/ui/design/lesson-primitives';
import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import {
  buildKangurAssignmentHref,
  buildKangurAssignmentCatalog,
  buildRecommendedKangurAssignmentCatalog,
  filterKangurAssignmentCatalog,
  getKangurAssignmentActionLabel,
} from '@/features/kangur/ui/services/delegated-assignments';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn } from '@/shared/utils';

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
  const suggestedCatalog = useMemo(() => buildRecommendedKangurAssignmentCatalog(progress), [progress]);
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
          item.createInput.target.type === 'lesson' ? item.createInput.target.lessonComponentId : null;

        return !activeAssignments.some((assignment) => {
          if (item.createInput.target.type === 'lesson' && assignment.target.type === 'lesson') {
            return assignment.target.lessonComponentId === lessonTarget;
          }
          if (item.createInput.target.type === 'practice' && assignment.target.type === 'practice') {
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
      <KangurPanel className='border-slate-200/70 bg-white/88' padding='lg' variant='soft'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div className='max-w-2xl'>
            <KangurLessonChip accent='indigo' className='text-[11px] uppercase tracking-[0.18em]'>
              Przydziel nowe zadanie
            </KangurLessonChip>
            <div className='mt-3 text-sm leading-6 text-slate-600'>
              Wyszukaj lekcje i zadania treningowe, a potem przypisz je uczniowi jako priorytet.
            </div>
          </div>

          <KangurButton type='button' onClick={() => void refresh()} size='sm' variant='secondary'>
            Odśwież postęp
          </KangurButton>
        </div>

        {recommendedCatalog.length > 0 ? (
          <KangurLessonCallout accent='indigo' className='mt-5' padding='lg'>
            <div className='text-sm font-bold text-indigo-900'>Podpowiedzi z postępu ucznia</div>
            <div className='mt-1 text-sm leading-6 text-indigo-700'>
              Te zadania wynikają z aktualnych słabszych obszarów i rytmu pracy ucznia.
            </div>
            <div className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2'>
              {recommendedCatalog.map((item) => (
                <KangurPanel
                  key={item.id}
                  className='border-white/80 bg-white/95'
                  padding='lg'
                  variant='subtle'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-bold text-slate-900'>{item.title}</div>
                      <div className='mt-1 text-sm leading-6 text-slate-600'>{item.description}</div>
                    </div>
                    <KangurLessonChip accent='indigo' className='text-[11px] uppercase tracking-[0.14em]'>
                      {item.priorityLabel}
                    </KangurLessonChip>
                  </div>
                  <div className='mt-3 flex items-center justify-between gap-3'>
                    <div className='text-[11px] uppercase tracking-[0.14em] text-slate-500'>{item.badge}</div>
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
                </KangurPanel>
              ))}
            </div>
          </KangurLessonCallout>
        ) : null}

        <input
          type='search'
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder='Szukaj po temacie, typie zadania lub słowie kluczowym...'
          className='mt-5 w-full rounded-[22px] border border-slate-200/80 bg-white/92 px-4 py-3 text-sm text-slate-700 shadow-[0_18px_44px_-38px_rgba(15,23,42,0.18)] outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-200/70'
        />

        <div className='mt-4 flex flex-wrap gap-2'>
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type='button'
              onClick={() => setActiveFilter(option.value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                activeFilter === option.value
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
                  : 'border-white/80 bg-white/82 text-slate-600 hover:border-slate-200 hover:bg-white'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {feedback ? (
          <KangurLessonCallout
            accent={
              feedback.toLowerCase().includes('nie uda') || feedback.toLowerCase().includes('juz')
                ? 'rose'
                : 'indigo'
            }
            className='mt-4 text-sm'
            padding='sm'
          >
            {feedback}
          </KangurLessonCallout>
        ) : null}

        {error ? (
          <KangurLessonCallout accent='rose' className='mt-4 text-sm text-rose-700' padding='sm'>
            {error}
          </KangurLessonCallout>
        ) : null}

        <div className='mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2'>
          {filteredCatalog.map((item) => (
            <KangurPanel
              key={item.id}
              className='border-slate-200/80 bg-white/95'
              padding='lg'
              variant='subtle'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='text-sm font-bold text-slate-900'>{item.title}</div>
                  <div className='mt-1 text-sm leading-6 text-slate-600'>{item.description}</div>
                </div>
                <KangurLessonChip accent='slate' className='text-[11px] uppercase tracking-[0.14em]'>
                  {item.badge}
                </KangurLessonChip>
              </div>

              <div className='mt-3 flex items-center justify-between gap-3'>
                <div className='text-[11px] uppercase tracking-[0.14em] text-slate-500'>
                  {item.priorityLabel}
                </div>
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
            </KangurPanel>
          ))}
        </div>

        {!isLoading && filteredCatalog.length === 0 ? (
          <KangurLessonCallout
            accent='slate'
            className='mt-4 border-dashed text-center text-sm text-slate-500'
            padding='lg'
          >
            Brak wyników dla wybranego filtra.
          </KangurLessonCallout>
        ) : null}
      </KangurPanel>

      <KangurPanel className='border-slate-200/70 bg-white/88' padding='lg' variant='soft'>
        <div className='flex flex-col gap-1'>
          <KangurLessonChip accent='slate' className='w-fit text-[11px] uppercase tracking-[0.18em]'>
            Monitorowanie zadań
          </KangurLessonChip>
          <div className='mt-2 text-sm leading-6 text-slate-600'>
            Szybki podgląd tego, co uczeń rozpoczął, zakończył albo nadal odkłada.
          </div>
        </div>

        <div className='mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4'>
          <KangurLessonCallout accent='slate' padding='md'>
            <div className='text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500'>
              Aktywne
            </div>
            <div className='mt-1 text-2xl font-extrabold text-slate-900'>{trackerSummary.activeCount}</div>
            <div className='mt-1 text-xs text-slate-600'>zadania wymagające dalszej pracy</div>
          </KangurLessonCallout>
          <KangurLessonCallout accent='amber' padding='md'>
            <div className='text-[11px] font-bold uppercase tracking-[0.16em] text-amber-700'>
              Do rozpoczecia
            </div>
            <div className='mt-1 text-2xl font-extrabold text-amber-800'>
              {trackerSummary.notStartedCount}
            </div>
            <div className='mt-1 text-xs text-amber-800'>uczeń jeszcze nie ruszył tych zadań</div>
          </KangurLessonCallout>
          <KangurLessonCallout accent='indigo' padding='md'>
            <div className='text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700'>
              W trakcie
            </div>
            <div className='mt-1 text-2xl font-extrabold text-indigo-800'>
              {trackerSummary.inProgressCount}
            </div>
            <div className='mt-1 text-xs text-indigo-800'>zadania, nad którymi uczeń już pracuje</div>
          </KangurLessonCallout>
          <KangurLessonCallout accent='emerald' padding='md'>
            <div className='text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700'>
              Ukonczone
            </div>
            <div className='mt-1 text-2xl font-extrabold text-emerald-800'>
              {trackerSummary.completedCount}
            </div>
            <div className='mt-1 text-xs text-emerald-800'>przydziały zrealizowane przez ucznia</div>
          </KangurLessonCallout>
        </div>

        <KangurLessonCallout accent='slate' className='mt-4' padding='lg'>
          <div className='text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500'>
            Skutecznosc wykonania
          </div>
          <div className='mt-1 text-2xl font-extrabold text-slate-900'>{trackerSummary.completionRate}%</div>
          <div className='mt-1 text-xs text-slate-600'>
            odsetek wszystkich niearchiwalnych zadań, które uczeń ma już zakończone
          </div>
        </KangurLessonCallout>

        <KangurLessonCallout accent='amber' className='mt-4' padding='lg'>
          <div className='text-sm font-bold text-amber-900'>Do uwagi</div>
          <div className='mt-1 text-sm leading-6 text-amber-800'>
            Te zadania warto przypomnieć uczniowi albo omówić podczas kolejnej nauki.
          </div>

          {trackerSummary.attentionItems.length === 0 ? (
            <KangurLessonCallout
              accent='emerald'
              className='mt-4 border-dashed bg-white/80 text-sm text-emerald-800'
              padding='md'
            >
              Brak zadań wymagających dodatkowej reakcji.
            </KangurLessonCallout>
          ) : (
            <div className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2'>
              {trackerSummary.attentionItems.slice(0, 4).map((item) => (
                <KangurPanel
                  key={item.assignment.id}
                  className='border-white/80 bg-white/95'
                  padding='lg'
                  variant='subtle'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-bold text-slate-900'>{item.assignment.title}</div>
                      <div className='mt-1 text-sm leading-6 text-amber-900'>{item.reason}</div>
                    </div>
                    <KangurLessonChip accent='amber' className='text-[11px] uppercase tracking-[0.14em]'>
                      {item.assignment.progress.percent}%
                    </KangurLessonChip>
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
                </KangurPanel>
              ))}
            </div>
          )}
        </KangurLessonCallout>
      </KangurPanel>

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
