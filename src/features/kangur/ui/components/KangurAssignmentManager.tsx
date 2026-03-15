import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import {
  KANGUR_LESSONS_SETTING_KEY,
  createDefaultKangurLessons,
  parseKangurLessons,
} from '@/features/kangur/settings';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetricCard,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  buildKangurAssignmentCatalog,
  buildKangurAssignmentListItems,
  buildRecommendedKangurAssignmentCatalog,
  filterKangurAssignmentCatalog,
} from '@/features/kangur/ui/services/delegated-assignments';
import { buildKangurAssignmentDedupeKey } from '@/features/kangur/services/kangur-assignments';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

type KangurAssignmentManagerView = 'full' | 'catalog' | 'tracking' | 'metrics';

type KangurAssignmentManagerProps = {
  basePath: string;
  view?: KangurAssignmentManagerView;
};

type KangurAssignmentManagerItemCardProps = {
  accent?: ComponentProps<typeof KangurInfoCard>['accent'];
  children: ReactNode;
  testId: string;
};

function KangurAssignmentManagerItemCard({
  accent,
  children,
  testId,
}: KangurAssignmentManagerItemCardProps): React.JSX.Element {
  const cardAccent = accent;
  const cardTestId = testId;

  return (
    <KangurInfoCard accent={cardAccent} data-testid={cardTestId} padding='lg'>
      {children}
    </KangurInfoCard>
  );
}

function KangurAssignmentManagerCardHeader({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <div className='flex flex-col items-start gap-3 sm:flex-row sm:justify-between'>{children}</div>;
}

function KangurAssignmentManagerCardFooter({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return <div className='mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>{children}</div>;
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'time', label: 'Czas' },
  { value: 'arithmetic', label: 'Arytmetyka' },
  { value: 'geometry', label: 'Geometria' },
  { value: 'logic', label: 'Logika' },
  { value: 'practice', label: 'Trening' },
] as const;

const TIME_LIMIT_MINUTES_MIN = 1;
const TIME_LIMIT_MINUTES_MAX = 240;

type FilterOption = (typeof FILTER_OPTIONS)[number]['value'];

type KangurAssignmentTrackerSummary = {
  activeCount: number;
  notStartedCount: number;
  inProgressCount: number;
  completedCount: number;
  completionRate: number;
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

  return {
    activeCount: activeAssignments.length,
    notStartedCount,
    inProgressCount,
    completedCount,
    completionRate:
      visibleAssignments.length === 0
        ? 0
        : Math.round((completedCount / visibleAssignments.length) * 100),
  };
};

const formatTimeLimitValue = (value: number | null | undefined): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    return null;
  }

  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours} godz. ${minutes} min`;
  }
  if (hours > 0) {
    return `${hours} godz.`;
  }
  return `${rounded} min`;
};

const parseTimeLimitInput = (
  value: string
): { value: number | null; error: string | null } => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return { value: null, error: 'Podaj pełne minuty.' };
  }
  if (parsed < TIME_LIMIT_MINUTES_MIN || parsed > TIME_LIMIT_MINUTES_MAX) {
    return {
      value: null,
      error: `Zakres: ${TIME_LIMIT_MINUTES_MIN}-${TIME_LIMIT_MINUTES_MAX} min.`,
    };
  }

  return { value: parsed, error: null };
};

export function KangurAssignmentManager({
  basePath,
  view = 'full',
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
  const [timeLimitModalAssignmentId, setTimeLimitModalAssignmentId] = useState<string | null>(null);
  const [timeLimitDraft, setTimeLimitDraft] = useState('');
  const [isSavingTimeLimit, setIsSavingTimeLimit] = useState(false);
  const {
    assignments,
    isLoading,
    error,
    createAssignment,
    updateAssignment,
    reassignAssignment,
  } = useKangurAssignments({
    enabled: true,
    query: {
      includeArchived: false,
    },
  });
  const timeLimitAssignment =
    assignments.find((assignment) => assignment.id === timeLimitModalAssignmentId) ?? null;
  const isTimeLimitModalOpen = Boolean(timeLimitModalAssignmentId);

  useEffect(() => {
    if (!isTimeLimitModalOpen) {
      setTimeLimitDraft('');
      return;
    }

    setTimeLimitDraft(
      timeLimitAssignment?.timeLimitMinutes ? String(timeLimitAssignment.timeLimitMinutes) : ''
    );
  }, [isTimeLimitModalOpen, timeLimitAssignment?.id, timeLimitAssignment?.timeLimitMinutes]);

  const filteredCatalog = useMemo(
    () => filterKangurAssignmentCatalog(catalog, searchTerm, activeFilter),
    [activeFilter, catalog, searchTerm]
  );
  const assignedTargetKeys = useMemo(() => {
    const keys = new Set<string>();
    assignments
      .filter((assignment) => !assignment.archived)
      .forEach((assignment) => keys.add(buildKangurAssignmentDedupeKey(assignment.target)));
    return keys;
  }, [assignments]);
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
  const activeAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, activeAssignments),
    [activeAssignments, basePath]
  );
  const completedAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, completedAssignments),
    [basePath, completedAssignments]
  );
  const trackerSummary = useMemo(() => buildTrackerSummary(assignments), [assignments]);
  const recommendedCatalog = useMemo(
    () =>
      suggestedCatalog.filter(
        (item) => !assignedTargetKeys.has(buildKangurAssignmentDedupeKey(item.createInput.target))
      ),
    [assignedTargetKeys, suggestedCatalog]
  );
  const timeLimitParsed = parseTimeLimitInput(timeLimitDraft);
  const currentTimeLimit = timeLimitAssignment?.timeLimitMinutes ?? null;
  const hasTimeLimitChange =
    !timeLimitParsed.error && timeLimitParsed.value !== currentTimeLimit;
  const isTimeLimitSaveDisabled =
    isSavingTimeLimit ||
    !timeLimitAssignment ||
    Boolean(timeLimitParsed.error) ||
    !hasTimeLimitChange;
  const timeLimitPreview = formatTimeLimitValue(currentTimeLimit);

  const resolveActionErrorMessage = (error: unknown, fallback: string): string => {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: unknown }).status
        : null;
    if (status === 409) {
      return 'To zadanie jest już aktywne.';
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
      setFeedback(resolveActionErrorMessage(error, 'Nie udało się przypisać zadania.'));
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
      setFeedback('Nie udało się zarchiwizować zadania.');
    } finally {
      setPendingActionId(null);
    }
  };

  const handleReassign = async (assignmentId: string): Promise<void> => {
    const assignment = assignments.find((entry) => entry.id === assignmentId);
    setPendingActionId(assignmentId);
    setFeedback(null);

    try {
      await reassignAssignment(assignmentId);
      setFeedback(
        assignment?.title
          ? `Przypisano ponownie: ${assignment.title}.`
          : 'Zadanie przypisano ponownie.'
      );
    } catch (error: unknown) {
      setFeedback(resolveActionErrorMessage(error, 'Nie udało się przypisać ponownie zadania.'));
    } finally {
      setPendingActionId(null);
    }
  };

  const handleOpenTimeLimitModal = (assignmentId: string): void => {
    setTimeLimitModalAssignmentId(assignmentId);
  };

  const handleCloseTimeLimitModal = (): void => {
    setTimeLimitModalAssignmentId(null);
  };

  const handleSaveTimeLimit = async (): Promise<void> => {
    if (!timeLimitAssignment) {
      return;
    }

    const parsed = parseTimeLimitInput(timeLimitDraft);
    if (parsed.error) {
      return;
    }

    const nextValue = parsed.value;
    const currentValue = timeLimitAssignment.timeLimitMinutes ?? null;
    if (nextValue === currentValue) {
      handleCloseTimeLimitModal();
      return;
    }

    setIsSavingTimeLimit(true);
    setFeedback(null);

    try {
      await updateAssignment(timeLimitAssignment.id, { timeLimitMinutes: nextValue });
      setFeedback(
        nextValue === null
          ? 'Usunięto czas na wykonanie.'
          : 'Zapisano czas na wykonanie.'
      );
      handleCloseTimeLimitModal();
    } catch {
      setFeedback('Nie udało się zapisać czasu wykonania.');
    } finally {
      setIsSavingTimeLimit(false);
    }
  };

  const shouldShowCatalog = view === 'full' || view === 'catalog';
  const shouldShowTracking = view === 'full' || view === 'tracking' || view === 'metrics';
  const shouldShowLists = view === 'full' || view === 'tracking';

  return (
    <div className='flex flex-col gap-5'>
      <DialogPrimitive.Root open={isTimeLimitModalOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseTimeLimitModal();
        }
      }}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay
            className='fixed inset-0 z-50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
            style={{
              background:
                'color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 16%, rgba(2,6,23,0.7))',
            }}
          />
          <DialogPrimitive.Content
            className='fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),32rem)] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto outline-none'
            data-testid='assignment-time-limit-modal'
            onEscapeKeyDown={handleCloseTimeLimitModal}
            onInteractOutside={handleCloseTimeLimitModal}
            onPointerDownOutside={handleCloseTimeLimitModal}
          >
            <DialogPrimitive.Title className='sr-only'>Czas na wykonanie</DialogPrimitive.Title>
            <DialogPrimitive.Description className='sr-only'>
              Ustaw limit czasu dla zadania lub usuń go pozostawiając pole puste.
            </DialogPrimitive.Description>

            <DialogPrimitive.Close asChild>
              <button
                aria-label='Zamknij ustawienia czasu'
                className='absolute right-4 top-4 z-10 cursor-pointer rounded-full border border-amber-200/80 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] shadow-[0_16px_34px_-26px_rgba(249,115,22,0.5)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white'
                style={{
                  background:
                    'linear-gradient(180deg, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 88%, rgba(254,243,199,0.95)) 0%, color-mix(in srgb, var(--kangur-soft-card-background, #ffffff) 82%, rgba(255,237,213,0.9)) 100%)',
                  color: '#9a5418',
                }}
                type='button'
              >
                Zamknij
              </button>
            </DialogPrimitive.Close>

            <KangurGlassPanel className='flex flex-col gap-4' padding='lg' surface='mistSoft' variant='soft'>
              <div>
                <KangurStatusChip accent='indigo' labelStyle='eyebrow'>
                  Czas na wykonanie
                </KangurStatusChip>
                <KangurCardDescription className='mt-2 text-slate-600' relaxed size='sm'>
                  Ustaw limit czasu dla wybranego zadania. Pozostaw puste, aby usunąć limit.
                </KangurCardDescription>
              </div>

              {timeLimitAssignment ? (
                <div className='rounded-[18px] border border-slate-200/70 bg-white/80 px-4 py-3'>
                  <div className='text-sm font-semibold text-slate-900'>
                    {timeLimitAssignment.title}
                  </div>
                  {timeLimitAssignment.description ? (
                    <div className='mt-1 text-xs text-slate-600'>
                      {timeLimitAssignment.description}
                    </div>
                  ) : null}
                  {timeLimitPreview ? (
                    <div className='mt-2 text-xs text-slate-500'>
                      Aktualnie: {timeLimitPreview}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className='space-y-2'>
                <KangurTextField
                  accent='indigo'
                  aria-label='Czas na wykonanie w minutach'
                  title='Czas na wykonanie (minuty)'
                  inputMode='numeric'
                  min={TIME_LIMIT_MINUTES_MIN}
                  max={TIME_LIMIT_MINUTES_MAX}
                  placeholder={'np. 30'}
                  type='number'
                  value={timeLimitDraft}
                  onChange={(event) => setTimeLimitDraft(event.target.value)}
                />
                <div className='text-xs text-slate-500'>
                  Wpisz liczbę minut ({TIME_LIMIT_MINUTES_MIN}-{TIME_LIMIT_MINUTES_MAX}).
                </div>
                {timeLimitParsed.error ? (
                  <div className='text-xs text-rose-600'>{timeLimitParsed.error}</div>
                ) : null}
              </div>

              <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end'>
                <KangurButton
                  className='w-full sm:w-auto'
                  size='sm'
                  type='button'
                  variant='ghost'
                  onClick={handleCloseTimeLimitModal}
                >
                  Anuluj
                </KangurButton>
                <KangurButton
                  className='w-full sm:w-auto'
                  size='sm'
                  type='button'
                  variant='surface'
                  disabled={isTimeLimitSaveDisabled}
                  onClick={() => void handleSaveTimeLimit()}
                >
                  {isSavingTimeLimit ? 'Zapisywanie...' : 'Zapisz'}
                </KangurButton>
              </div>
            </KangurGlassPanel>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      {shouldShowCatalog ? (
        <KangurGlassPanel
          data-testid='assignment-manager-create-shell'
          padding='lg'
          surface='neutral'
          variant='soft'
        >
          <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
            <div className='max-w-2xl'>
              <KangurStatusChip accent='indigo' labelStyle='eyebrow'>
                Przydziel nowe zadanie
              </KangurStatusChip>
              <KangurCardDescription className='mt-3 text-slate-600' relaxed size='sm'>
                Wyszukaj lekcje i zadania treningowe, a potem przypisz je uczniowi jako priorytet.
              </KangurCardDescription>
            </div>
          </div>

          {recommendedCatalog.length > 0 ? (
            <KangurSummaryPanel
              accent='indigo'
              className='mt-5'
              description='StudiQ podpowiada te zadania na podstawie aktualnych słabszych obszarów i rytmu pracy ucznia.'
              label='Sugestie od StudiQ'
            >
              <div className='mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2'>
                {recommendedCatalog.map((item) => {
                  const isAssigned = assignedTargetKeys.has(
                    buildKangurAssignmentDedupeKey(item.createInput.target)
                  );
                  const isPending = pendingActionId === item.id;

                  return (
                    <KangurAssignmentManagerItemCard
                      key={item.id}
                      testId={`assignment-manager-recommended-card-${item.id}`}
                    >
                      <KangurAssignmentManagerCardHeader>
                        <div className='min-w-0'>
                          <KangurCardTitle className='text-slate-900'>
                            {item.title}
                          </KangurCardTitle>
                          <KangurCardDescription className='mt-1 text-slate-600' relaxed size='sm'>
                            {item.description}
                          </KangurCardDescription>
                        </div>
                        <KangurAssignmentPriorityChip
                          labelStyle='compact'
                          priority={item.createInput.priority}
                        />
                      </KangurAssignmentManagerCardHeader>
                      <KangurAssignmentManagerCardFooter>
                        <KangurStatusChip accent='slate' className='w-fit' labelStyle='compact'>
                          {item.badge}
                        </KangurStatusChip>
                        <KangurButton
                          className='w-full sm:w-auto'
                          type='button'
                          onClick={() => void handleAssign(item.id)}
                          disabled={isAssigned || isPending}
                          size='sm'
                          variant='surface'
                        >
                          {isAssigned
                            ? 'Przypisane'
                            : isPending
                              ? 'Przypisywanie...'
                              : 'Przypisz sugestię'}
                        </KangurButton>
                      </KangurAssignmentManagerCardFooter>
                    </KangurAssignmentManagerItemCard>
                  );
                })}
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
            aria-label='Szukaj zadań'
            title='Szukaj zadań'
          />

          <div
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} mt-4 flex-wrap justify-start sm:w-auto`}
          >
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
                feedback.toLowerCase().includes('nie uda') || feedback.toLowerCase().includes('już')
                  ? 'rose'
                  : 'indigo'
              }
              className='mt-4'
              description={feedback}
              padding='sm'
              tone='accent'
              role='status'
              aria-live='polite'
              aria-atomic='true'
            >
              {null}
            </KangurSummaryPanel>
          ) : null}

          {error ? (
            <KangurSummaryPanel
              accent='rose'
              className='mt-4'
              description={error}
              padding='sm'
              tone='accent'
            >
              {null}
            </KangurSummaryPanel>
          ) : null}

          <div className='mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2'>
            {filteredCatalog.map((item) => {
              const isAssigned = assignedTargetKeys.has(
                buildKangurAssignmentDedupeKey(item.createInput.target)
              );
              const isPending = pendingActionId === item.id;

              return (
                <KangurAssignmentManagerItemCard
                  key={item.id}
                  testId={`assignment-manager-catalog-card-${item.id}`}
                >
                  <KangurAssignmentManagerCardHeader>
                    <div>
                      <KangurCardTitle className='text-slate-900'>{item.title}</KangurCardTitle>
                      <KangurCardDescription className='mt-1 text-slate-600' relaxed size='sm'>
                        {item.description}
                      </KangurCardDescription>
                    </div>
                    <KangurStatusChip
                      accent='slate'
                      className='self-start sm:self-auto'
                      labelStyle='compact'
                    >
                      {item.badge}
                    </KangurStatusChip>
                  </KangurAssignmentManagerCardHeader>

                  <KangurAssignmentManagerCardFooter>
                    <KangurAssignmentPriorityChip
                      className='self-start'
                      labelStyle='compact'
                      priority={item.createInput.priority}
                    />
                    <KangurButton
                      type='button'
                      onClick={() => void handleAssign(item.id)}
                      disabled={isAssigned || isPending}
                      size='sm'
                      variant='surface'
                      className='w-full sm:w-auto'
                    >
                      {isAssigned ? 'Przypisane' : isPending ? 'Przypisywanie...' : 'Przypisz'}
                    </KangurButton>
                  </KangurAssignmentManagerCardFooter>
                </KangurAssignmentManagerItemCard>
              );
            })}
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
      ) : null}

      {!shouldShowCatalog && error ? (
        <KangurSummaryPanel
          accent='rose'
          description={error}
          padding='sm'
          tone='accent'
        >
          {null}
        </KangurSummaryPanel>
      ) : null}

      {shouldShowTracking ? (
        <KangurGlassPanel
          data-testid='assignment-manager-tracking-shell'
          padding='lg'
          surface='neutral'
          variant='soft'
        >
          <div className='flex flex-col gap-1'>
            <KangurStatusChip
              accent='slate'
              className='w-fit'
              labelStyle='eyebrow'
            >
              Monitorowanie zadań
            </KangurStatusChip>
            <KangurCardDescription className='mt-2 text-slate-600' relaxed size='sm'>
              Szybki podgląd tego, co uczeń rozpoczął, zakończył albo nadal odkłada.
            </KangurCardDescription>
          </div>

          <div className='mt-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4'>
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
              label='Ukończone'
              value={trackerSummary.completedCount}
            />
          </div>

          <KangurMetricCard
            accent='slate'
            className='mt-4'
            description='odsetek wszystkich niearchiwalnych zadań, które uczeń ma już zakończone'
            label='Skuteczność wykonania'
            value={`${trackerSummary.completionRate}%`}
          />
        </KangurGlassPanel>
      ) : null}

      {shouldShowLists ? (
        <>
          <KangurAssignmentsList
            items={activeAssignmentItems}
            title='Aktywne zadania'
            emptyLabel='Brak aktywnych zadań dla ucznia.'
            onArchive={(assignmentId) => void handleArchive(assignmentId)}
            onTimeLimitClick={handleOpenTimeLimitModal}
          />

          <KangurAssignmentsList
            items={completedAssignmentItems}
            title='Ukończone zadania'
            emptyLabel='Uczeń nie zakończył jeszcze żadnych przypisanych zadań.'
            onArchive={(assignmentId) => void handleArchive(assignmentId)}
            onTimeLimitClick={handleOpenTimeLimitModal}
            onReassign={(assignmentId) => void handleReassign(assignmentId)}
            reassigningId={pendingActionId}
          />
        </>
      ) : null}
    </div>
  );
}

export default KangurAssignmentManager;
