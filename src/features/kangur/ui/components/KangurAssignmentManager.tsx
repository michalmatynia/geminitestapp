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
      <section className='bg-white rounded-2xl shadow p-4 flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <div className='text-sm font-bold text-gray-500 uppercase tracking-wide'>
            Przydziel nowe zadanie
          </div>
          <div className='text-sm text-gray-500'>
            Wyszukaj lekcje i zadania treningowe, a potem przypisz je uczniowi jako priorytet.
          </div>
        </div>

        <div className='flex justify-end'>
          <button
            type='button'
            onClick={() => void refresh()}
            className='rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition'
          >
            Odswiez postep
          </button>
        </div>

        {recommendedCatalog.length > 0 ? (
          <div className='rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4'>
            <div className='text-sm font-bold text-indigo-700'>Podpowiedzi z postepu ucznia</div>
            <div className='mt-1 text-sm text-indigo-600'>
              Te zadania wynikaja z aktualnych slabszych obszarow i rytmu pracy ucznia.
            </div>
            <div className='mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3'>
              {recommendedCatalog.map((item) => (
                <article
                  key={item.id}
                  className='rounded-2xl border border-indigo-100 bg-white/90 px-4 py-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-bold text-slate-800'>{item.title}</div>
                      <div className='mt-1 text-xs text-slate-500'>{item.description}</div>
                    </div>
                    <span className='rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-600'>
                      {item.priorityLabel}
                    </span>
                  </div>
                  <div className='mt-3 flex items-center justify-between gap-3'>
                    <div className='text-[11px] text-slate-400'>{item.badge}</div>
                    <button
                      type='button'
                      onClick={() => void handleAssign(item.id)}
                      disabled={pendingActionId === item.id}
                      className='inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition'
                    >
                      {pendingActionId === item.id ? 'Przypisywanie...' : 'Przypisz sugestie'}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        <input
          type='search'
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder='Szukaj po temacie, typie zadania lub slowie kluczowym...'
          className='w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-indigo-400'
        />

        <div className='flex flex-wrap gap-2'>
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option.value}
              type='button'
              onClick={() => setActiveFilter(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === option.value
                  ? 'bg-indigo-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {feedback ? (
          <div className='rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-sm text-indigo-700'>
            {feedback}
          </div>
        ) : null}

        {error ? <div className='text-sm text-rose-500'>{error}</div> : null}

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-3'>
          {filteredCatalog.map((item) => (
            <article
              key={item.id}
              className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='text-sm font-bold text-slate-800'>{item.title}</div>
                  <div className='mt-1 text-xs text-slate-500'>{item.description}</div>
                </div>
                <span className='rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500'>
                  {item.badge}
                </span>
              </div>

              <div className='mt-3 flex items-center justify-between gap-3'>
                <div className='text-[11px] text-slate-400'>{item.priorityLabel}</div>
                <button
                  type='button'
                  onClick={() => void handleAssign(item.id)}
                  disabled={pendingActionId === item.id}
                  className='inline-flex items-center rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 transition'
                >
                  {pendingActionId === item.id ? 'Przypisywanie...' : 'Przypisz'}
                </button>
              </div>
            </article>
          ))}
        </div>

        {!isLoading && filteredCatalog.length === 0 ? (
          <div className='rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-400'>
            Brak wynikow dla wybranego filtra.
          </div>
        ) : null}
      </section>

      <section className='bg-white/85 backdrop-blur rounded-2xl shadow p-5'>
        <div className='flex flex-col gap-1'>
          <div className='text-sm font-bold text-gray-500 uppercase tracking-wide'>
            Monitorowanie zadan
          </div>
          <div className='text-sm text-gray-500'>
            Szybki podglad tego, co uczen rozpoczal, zakonczyl albo nadal odklada.
          </div>
        </div>

        <div className='mt-4 grid grid-cols-2 xl:grid-cols-4 gap-3'>
          <div className='rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
            <div className='text-[11px] font-bold uppercase tracking-wide text-slate-400'>
              Aktywne
            </div>
            <div className='mt-1 text-2xl font-extrabold text-slate-800'>
              {trackerSummary.activeCount}
            </div>
            <div className='mt-1 text-xs text-slate-500'>zadania wymagajace dalszej pracy</div>
          </div>
          <div className='rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3'>
            <div className='text-[11px] font-bold uppercase tracking-wide text-amber-500'>
              Do rozpoczecia
            </div>
            <div className='mt-1 text-2xl font-extrabold text-amber-700'>
              {trackerSummary.notStartedCount}
            </div>
            <div className='mt-1 text-xs text-amber-600'>uczen jeszcze nie ruszyl tych zadan</div>
          </div>
          <div className='rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3'>
            <div className='text-[11px] font-bold uppercase tracking-wide text-indigo-500'>
              W trakcie
            </div>
            <div className='mt-1 text-2xl font-extrabold text-indigo-700'>
              {trackerSummary.inProgressCount}
            </div>
            <div className='mt-1 text-xs text-indigo-600'>zadania, nad ktorymi uczen juz pracuje</div>
          </div>
          <div className='rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3'>
            <div className='text-[11px] font-bold uppercase tracking-wide text-emerald-500'>
              Ukonczone
            </div>
            <div className='mt-1 text-2xl font-extrabold text-emerald-700'>
              {trackerSummary.completedCount}
            </div>
            <div className='mt-1 text-xs text-emerald-600'>przydzialy zrealizowane przez ucznia</div>
          </div>
        </div>

        <div className='mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3'>
          <div className='text-[11px] font-bold uppercase tracking-wide text-slate-400'>
            Skutecznosc wykonania
          </div>
          <div className='mt-1 text-2xl font-extrabold text-slate-800'>
            {trackerSummary.completionRate}%
          </div>
          <div className='mt-1 text-xs text-slate-500'>
            odsetek wszystkich niearchiwalnych zadan, ktore uczen ma juz zakonczone
          </div>
        </div>

        <div className='mt-4 rounded-2xl border border-amber-100 bg-amber-50/80 p-4'>
          <div className='text-sm font-bold text-amber-700'>Do uwagi</div>
          <div className='mt-1 text-sm text-amber-600'>
            Te zadania warto przypomniec uczniowi albo omowic podczas kolejnej nauki.
          </div>

          {trackerSummary.attentionItems.length === 0 ? (
            <div className='mt-3 rounded-xl border border-dashed border-emerald-200 bg-white/80 px-3 py-4 text-sm text-emerald-600'>
              Brak zadan wymagajacych dodatkowej reakcji.
            </div>
          ) : (
            <div className='mt-3 grid grid-cols-1 xl:grid-cols-2 gap-3'>
              {trackerSummary.attentionItems.slice(0, 4).map((item) => (
                <article
                  key={item.assignment.id}
                  className='rounded-2xl border border-amber-100 bg-white/90 px-4 py-3'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-bold text-slate-800'>
                        {item.assignment.title}
                      </div>
                      <div className='mt-1 text-xs text-amber-700'>{item.reason}</div>
                    </div>
                    <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700'>
                      {item.assignment.progress.percent}%
                    </span>
                  </div>
                  <div className='mt-3 flex items-center justify-between gap-3'>
                    <div className='text-[11px] text-slate-400'>
                      {item.assignment.progress.summary}
                    </div>
                    <Link
                      href={buildKangurAssignmentHref(basePath, item.assignment)}
                      className='inline-flex items-center rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition'
                    >
                      {getKangurAssignmentActionLabel(item.assignment)}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <KangurAssignmentsList
        assignments={activeAssignments}
        basePath={basePath}
        title='Aktywne zadania'
        emptyLabel='Brak aktywnych zadan dla ucznia.'
        onArchive={(assignmentId) => void handleArchive(assignmentId)}
      />

      <KangurAssignmentsList
        assignments={completedAssignments}
        basePath={basePath}
        title='Ukonczone zadania'
        emptyLabel='Uczen nie zakonczyl jeszcze zadnych przypisanych zadan.'
        onArchive={(assignmentId) => void handleArchive(assignmentId)}
      />
    </div>
  );
}

export default KangurAssignmentManager;
