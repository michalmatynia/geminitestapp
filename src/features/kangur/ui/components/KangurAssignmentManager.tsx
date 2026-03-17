'use client';

import { Clock } from 'lucide-react';
import { useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import { KangurDialog } from '@/features/kangur/ui/components/KangurDialog';
import { KangurDialogHeader } from '@/features/kangur/ui/components/KangurDialogHeader';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurEmptyState,
  KangurGlassPanel,
  KangurInfoCard,
  KangurMetricCard,
  KangurPanelRow,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_LG_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  buildKangurAssignmentCatalog,
  buildKangurAssignmentListItems,
  buildRecommendedKangurAssignmentCatalog,
  filterKangurAssignmentCatalog,
} from '@/features/kangur/ui/services/delegated-assignments';
import { buildKangurAssignmentDedupeKey } from '@/features/kangur/services/kangur-assignments';
import { cn } from '@/features/kangur/shared/utils';


type KangurAssignmentManagerView =
  | 'full'
  | 'catalog'
  | 'catalogWithLists'
  | 'tracking'
  | 'metrics';

type KangurAssignmentManagerProps = {
  basePath: string;
  view?: KangurAssignmentManagerView;
};

type KangurAssignmentManagerItemCardProps = {
  accent?: ComponentProps<typeof KangurInfoCard>['accent'];
  children: ReactNode;
  testId: string;
};

type TimeLimitModalContext =
  | {
      mode: 'update';
      assignmentId: string;
    }
  | {
      mode: 'create';
      catalogItemId: string;
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
  return (
    <KangurPanelRow className='items-start sm:justify-between'>
      {children}
    </KangurPanelRow>
  );
}

function KangurAssignmentManagerCardFooter({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  return (
    <KangurPanelRow className='mt-3 sm:items-center sm:justify-between'>
      {children}
    </KangurPanelRow>
  );
}

const FILTER_OPTIONS = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'time', label: 'Czas' },
  { value: 'arithmetic', label: 'Arytmetyka' },
  { value: 'geometry', label: 'Geometria' },
  { value: 'logic', label: 'Logika' },
  { value: 'practice', label: 'Trening' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

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
  const progress = useKangurProgressState();
  const lessonsQuery = useKangurLessons({ enabledOnly: true });
  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const catalog = useMemo(() => buildKangurAssignmentCatalog(lessons), [lessons]);
  const suggestedCatalog = useMemo(
    () => buildRecommendedKangurAssignmentCatalog(progress),
    [progress]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeListTab, setActiveListTab] = useState<'active' | 'completed'>('active');
  const [timeLimitModalContext, setTimeLimitModalContext] = useState<TimeLimitModalContext | null>(
    null
  );
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
    timeLimitModalContext?.mode === 'update'
      ? assignments.find((assignment) => assignment.id === timeLimitModalContext.assignmentId) ??
        null
      : null;
  const timeLimitCatalogItem =
    timeLimitModalContext?.mode === 'create'
      ? [...catalog, ...suggestedCatalog].find(
          (entry) => entry.id === timeLimitModalContext.catalogItemId
        ) ?? null
      : null;
  const timeLimitTarget = timeLimitAssignment ?? timeLimitCatalogItem;
  const isTimeLimitModalOpen = Boolean(timeLimitModalContext);
  const isCreateTimeLimit = timeLimitModalContext?.mode === 'create';

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
  const assignedAssignmentsByKey = useMemo(() => {
    const map = new Map<string, KangurAssignmentSnapshot>();
    assignments
      .filter((assignment) => !assignment.archived)
      .forEach((assignment) => {
        const key = buildKangurAssignmentDedupeKey(assignment.target);
        const existing = map.get(key);
        if (!existing) {
          map.set(key, assignment);
          return;
        }
        const existingTime = Date.parse(existing.updatedAt ?? existing.createdAt ?? '');
        const assignmentTime = Date.parse(assignment.updatedAt ?? assignment.createdAt ?? '');
        if (Number.isNaN(existingTime) || assignmentTime >= existingTime) {
          map.set(key, assignment);
        }
      });
    return map;
  }, [assignments]);
  const assignedTargetKeys = useMemo(
    () => new Set<string>(assignedAssignmentsByKey.keys()),
    [assignedAssignmentsByKey]
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
  const activeAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, activeAssignments),
    [activeAssignments, basePath]
  );
  const completedAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, completedAssignments),
    [basePath, completedAssignments]
  );
  const activeAssignmentsCount = activeAssignmentItems.length;
  const completedAssignmentsCount = completedAssignmentItems.length;
  const trackerSummary = useMemo(() => buildTrackerSummary(assignments), [assignments]);
  const recommendedCatalog = useMemo(
    () =>
      suggestedCatalog.filter(
        (item) => !assignedTargetKeys.has(buildKangurAssignmentDedupeKey(item.createInput.target))
      ),
    [assignedTargetKeys, suggestedCatalog]
  );
  const timeLimitParsed = parseTimeLimitInput(timeLimitDraft);
  const currentTimeLimit = isCreateTimeLimit ? null : timeLimitAssignment?.timeLimitMinutes ?? null;
  const canSaveTimeLimit = isCreateTimeLimit
    ? Boolean(timeLimitCatalogItem) && !timeLimitParsed.error
    : Boolean(timeLimitAssignment) &&
      !timeLimitParsed.error &&
      timeLimitParsed.value !== currentTimeLimit;
  const isTimeLimitSaveDisabled = isSavingTimeLimit || !canSaveTimeLimit;
  const timeLimitPreview = formatTimeLimitValue(currentTimeLimit);
  const timeLimitSaveLabel = isSavingTimeLimit
    ? 'Zapisywanie...'
    : isCreateTimeLimit
      ? 'Zapisz i przypisz'
      : 'Zapisz';

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
      const didAssign = await withKangurClientError(
        {
          source: 'kangur.assignment-manager',
          action: 'assign-catalog-item',
          description: 'Assigns a catalog assignment to the learner.',
          context: {
            catalogItemId: item.id,
            targetType: item.createInput.target.type,
          },
        },
        async () => {
          await createAssignment(item.createInput);
          return true;
        },
        {
          fallback: false,
          onError: (error) => {
            setFeedback(resolveActionErrorMessage(error, 'Nie udało się przypisać zadania.'));
          },
        }
      );
      if (didAssign) {
        setFeedback(`Przypisano: ${item.title}.`);
      }
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
      const didArchive = await withKangurClientError(
        {
          source: 'kangur.assignment-manager',
          action: 'archive-assignment',
          description: 'Archives a learner assignment.',
          context: { assignmentId },
        },
        async () => {
          await updateAssignment(assignmentId, { archived: true });
          return true;
        },
        {
          fallback: false,
          onError: () => {
            setFeedback('Nie udało się zarchiwizować zadania.');
          },
        }
      );
      if (didArchive) {
        setFeedback('Zadanie przeniesiono do archiwum.');
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handleUnassign = async (assignmentId: string, title?: string): Promise<void> => {
    setPendingActionId(assignmentId);
    setFeedback(null);

    try {
      const didUnassign = await withKangurClientError(
        {
          source: 'kangur.assignment-manager',
          action: 'unassign-assignment',
          description: 'Removes a learner assignment from the active list.',
          context: { assignmentId },
        },
        async () => {
          await updateAssignment(assignmentId, { archived: true });
          return true;
        },
        {
          fallback: false,
          onError: () => {
            setFeedback('Nie udało się cofnąć przydziału.');
          },
        }
      );
      if (didUnassign) {
        setFeedback(title ? `Cofnięto przydział: ${title}.` : 'Cofnięto przydział.');
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handleReassign = async (assignmentId: string): Promise<void> => {
    const assignment = assignments.find((entry) => entry.id === assignmentId);
    setPendingActionId(assignmentId);
    setFeedback(null);

    try {
      const didReassign = await withKangurClientError(
        {
          source: 'kangur.assignment-manager',
          action: 'reassign-assignment',
          description: 'Reassigns a learner assignment.',
          context: { assignmentId },
        },
        async () => {
          await reassignAssignment(assignmentId);
          return true;
        },
        {
          fallback: false,
          onError: (error) => {
            setFeedback(
              resolveActionErrorMessage(error, 'Nie udało się przypisać ponownie zadania.')
            );
          },
        }
      );
      if (didReassign) {
        setFeedback(
          assignment?.title
            ? `Przypisano ponownie: ${assignment.title}.`
            : 'Zadanie przypisano ponownie.'
        );
      }
    } finally {
      setPendingActionId(null);
    }
  };

  const handleOpenTimeLimitModal = (assignmentId: string): void => {
    setTimeLimitModalContext({ mode: 'update', assignmentId });
  };

  const handleOpenTimeLimitModalForCatalog = (catalogItemId: string): void => {
    setTimeLimitModalContext({ mode: 'create', catalogItemId });
  };

  const handleCloseTimeLimitModal = (): void => {
    setTimeLimitModalContext(null);
  };

  const handleSaveTimeLimit = async (): Promise<void> => {
    if (!timeLimitModalContext) {
      return;
    }

    const parsed = parseTimeLimitInput(timeLimitDraft);
    if (parsed.error) {
      return;
    }

    setIsSavingTimeLimit(true);
    setFeedback(null);

    if (timeLimitModalContext.mode === 'update') {
      if (!timeLimitAssignment) {
        setIsSavingTimeLimit(false);
        return;
      }

      const nextValue = parsed.value;
      const currentValue = timeLimitAssignment.timeLimitMinutes ?? null;
      if (nextValue === currentValue) {
        setIsSavingTimeLimit(false);
        handleCloseTimeLimitModal();
        return;
      }

      try {
        const didUpdate = await withKangurClientError(
          {
            source: 'kangur.assignment-manager',
            action: 'update-time-limit',
            description: 'Updates the assignment time limit.',
            context: {
              assignmentId: timeLimitAssignment.id,
              timeLimitMinutes: nextValue,
            },
          },
          async () => {
            await updateAssignment(timeLimitAssignment.id, { timeLimitMinutes: nextValue });
            return true;
          },
          {
            fallback: false,
            onError: () => {
              setFeedback('Nie udało się zapisać czasu wykonania.');
            },
          }
        );
        if (didUpdate) {
          setFeedback(
            nextValue === null
              ? 'Usunięto czas na wykonanie.'
              : 'Zapisano czas na wykonanie.'
          );
          handleCloseTimeLimitModal();
        }
      } finally {
        setIsSavingTimeLimit(false);
      }
      return;
    }

    if (!timeLimitCatalogItem) {
      setIsSavingTimeLimit(false);
      return;
    }

    setPendingActionId(timeLimitCatalogItem.id);

    try {
      const didAssign = await withKangurClientError(
        {
          source: 'kangur.assignment-manager',
          action: 'assign-catalog-item-time-limit',
          description: 'Assigns a catalog item with a time limit.',
          context: {
            catalogItemId: timeLimitCatalogItem.id,
            targetType: timeLimitCatalogItem.createInput.target.type,
            timeLimitMinutes: parsed.value,
          },
        },
        async () => {
          await createAssignment({
            ...timeLimitCatalogItem.createInput,
            timeLimitMinutes: parsed.value,
          });
          return true;
        },
        {
          fallback: false,
          onError: (error) => {
            setFeedback(resolveActionErrorMessage(error, 'Nie udało się przypisać zadania.'));
          },
        }
      );
      if (didAssign) {
        setFeedback(
          parsed.value === null
            ? `Przypisano: ${timeLimitCatalogItem.title}.`
            : `Przypisano: ${timeLimitCatalogItem.title} z limitem czasu.`
        );
        handleCloseTimeLimitModal();
      }
    } finally {
      setPendingActionId(null);
      setIsSavingTimeLimit(false);
    }
  };

  const shouldShowCatalog = view === 'full' || view === 'catalog' || view === 'catalogWithLists';
  const shouldShowTracking = view === 'full' || view === 'tracking' || view === 'metrics';
  const shouldShowLists = view === 'full' || view === 'tracking' || view === 'catalogWithLists';
  const shouldShowListTabs = shouldShowLists && view === 'catalogWithLists';
  const showActiveAssignmentsList = !shouldShowListTabs || activeListTab === 'active';
  const showCompletedAssignmentsList = !shouldShowListTabs || activeListTab === 'completed';

  return (
    <div className={`flex flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurDialog
        open={isTimeLimitModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseTimeLimitModal();
          }
        }}
        overlayVariant='standard'
        contentSize='sm'
        contentProps={{
          'data-testid': 'assignment-time-limit-modal',
          onEscapeKeyDown: handleCloseTimeLimitModal,
          onInteractOutside: handleCloseTimeLimitModal,
          onPointerDownOutside: handleCloseTimeLimitModal,
        } as any}
      >
        <KangurDialogHeader
          title='Czas na wykonanie'
          description='Ustaw limit czasu dla zadania. Pozostaw puste, aby przypisać bez limitu.'
          closeAriaLabel='Zamknij ustawienia czasu'
        />

        <KangurGlassPanel
          className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='mistSoft'
          variant='soft'
        >
          <div>
            <KangurStatusChip accent='indigo' labelStyle='eyebrow'>
              Czas na wykonanie
            </KangurStatusChip>
            <KangurCardDescription className='mt-2 text-slate-600' relaxed size='sm'>
              Ustaw limit czasu dla wybranego zadania. Pozostaw puste, aby przypisać bez limitu.
            </KangurCardDescription>
          </div>

          {timeLimitTarget ? (
            <div className='rounded-[18px] border border-slate-200/70 bg-white/80 px-4 py-3'>
              <div className='break-words text-sm font-semibold text-slate-900'>
                {timeLimitTarget.title}
              </div>
              {timeLimitTarget.description ? (
                <div className='mt-1 break-words text-xs text-slate-600'>
                  {timeLimitTarget.description}
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

          <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} sm:items-center sm:justify-end`}>
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
              {timeLimitSaveLabel}
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </KangurDialog>
      {shouldShowCatalog ? (
        <KangurGlassPanel
          data-testid='assignment-manager-create-shell'
          padding='lg'
          surface='neutral'
          variant='soft'
        >
          <div className={`${KANGUR_PANEL_ROW_LG_CLASSNAME} lg:items-start lg:justify-between`}>
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
              <div className='mt-3 grid grid-cols-1 kangur-panel-gap xl:grid-cols-2'>
                {recommendedCatalog.map((item) => {
                  const targetKey = buildKangurAssignmentDedupeKey(item.createInput.target);
                  const assignedAssignment = assignedAssignmentsByKey.get(targetKey) ?? null;
                  const isAssigned = Boolean(assignedAssignment);
                  const isPending =
                    pendingActionId === item.id || pendingActionId === assignedAssignment?.id;

                  return (
                    <KangurAssignmentManagerItemCard
                      key={item.id}
                      testId={`assignment-manager-recommended-card-${item.id}`}
                    >
                      <KangurAssignmentManagerCardHeader>
                        <div className='min-w-0'>
                          <KangurCardTitle className='break-words text-slate-900'>
                            {item.title}
                          </KangurCardTitle>
                          <KangurCardDescription
                            className='mt-1 break-words text-slate-600'
                            relaxed
                            size='sm'
                          >
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
                        <div className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center`}>
                          {isAssigned ? (
                            <KangurButton
                              className='w-full sm:w-auto'
                              type='button'
                              onClick={() => {
                                if (assignedAssignment) {
                                  void handleUnassign(assignedAssignment.id, item.title);
                                }
                              }}
                              disabled={isPending}
                              size='sm'
                              variant='ghost'
                            >
                              {isPending ? 'Cofanie...' : 'Cofnij przydział'}
                            </KangurButton>
                          ) : (
                            <KangurButton
                              className='w-full sm:w-auto'
                              type='button'
                              onClick={() => void handleAssign(item.id)}
                              disabled={isPending}
                              size='sm'
                              variant='surface'
                            >
                              {isPending ? 'Przypisywanie...' : 'Przypisz sugestię'}
                            </KangurButton>
                          )}
                          <KangurButton
                            aria-label='Ustaw czas'
                            title='Ustaw czas'
                            className='w-full sm:w-auto sm:px-3'
                            type='button'
                            onClick={() => handleOpenTimeLimitModalForCatalog(item.id)}
                            disabled={isAssigned || isPending}
                            size='sm'
                            variant='ghost'
                          >
                            <Clock className='h-4 w-4' aria-hidden='true' />
                          </KangurButton>
                        </div>
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
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} mt-4 w-full sm:w-auto sm:flex-wrap sm:justify-start`}
          >
            {FILTER_OPTIONS.map((option) => (
              <KangurButton
                key={option.value}
                type='button'
                onClick={() => setActiveFilter(option.value)}
                aria-pressed={activeFilter === option.value}
                className='min-w-0 flex-1 px-3 text-xs sm:flex-none'
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

          <div className='mt-5 grid grid-cols-1 kangur-panel-gap xl:grid-cols-2'>
            {filteredCatalog.map((item) => {
              const targetKey = buildKangurAssignmentDedupeKey(item.createInput.target);
              const assignedAssignment = assignedAssignmentsByKey.get(targetKey) ?? null;
              const isAssigned = Boolean(assignedAssignment);
              const isPending =
                pendingActionId === item.id || pendingActionId === assignedAssignment?.id;

              return (
                <KangurAssignmentManagerItemCard
                  key={item.id}
                  testId={`assignment-manager-catalog-card-${item.id}`}
                >
                  <KangurAssignmentManagerCardHeader>
                    <div className='min-w-0'>
                      <KangurCardTitle className='break-words text-slate-900'>
                        {item.title}
                      </KangurCardTitle>
                      <KangurCardDescription
                        className='mt-1 break-words text-slate-600'
                        relaxed
                        size='sm'
                      >
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
                    <div className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center`}>
                      {isAssigned ? (
                        <KangurButton
                          type='button'
                          onClick={() => {
                            if (assignedAssignment) {
                              void handleUnassign(assignedAssignment.id, item.title);
                            }
                          }}
                          disabled={isPending}
                          size='sm'
                          variant='ghost'
                          className='w-full sm:w-auto'
                        >
                          {isPending ? 'Cofanie...' : 'Cofnij przydział'}
                        </KangurButton>
                      ) : (
                        <KangurButton
                          type='button'
                          onClick={() => void handleAssign(item.id)}
                          disabled={isPending}
                          size='sm'
                          variant='surface'
                          className='w-full sm:w-auto'
                        >
                          {isPending ? 'Przypisywanie...' : 'Przypisz'}
                        </KangurButton>
                      )}
                      <KangurButton
                        aria-label='Ustaw czas'
                        title='Ustaw czas'
                        className='w-full sm:w-auto sm:px-3'
                        type='button'
                        onClick={() => handleOpenTimeLimitModalForCatalog(item.id)}
                        disabled={isAssigned || isPending}
                        size='sm'
                        variant='ghost'
                      >
                        <Clock className='h-4 w-4' aria-hidden='true' />
                      </KangurButton>
                    </div>
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

          <div className='mt-5 grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-4'>
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
          {shouldShowListTabs ? (
            <div className='flex flex-col kangur-panel-gap'>
              <KangurStatusChip accent='slate' labelStyle='eyebrow'>
                Lista zadań
              </KangurStatusChip>
              <div
                className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:max-w-sm`}
                role='tablist'
                aria-label='Filtrowanie listy zadań'
              >
                <KangurButton
                  type='button'
                  onClick={() => setActiveListTab('active')}
                  aria-pressed={activeListTab === 'active'}
                  aria-selected={activeListTab === 'active'}
                  role='tab'
                  className='min-w-0 flex-1 px-3 text-xs'
                  size='sm'
                  variant={activeListTab === 'active' ? 'segmentActive' : 'segment'}
                >
                  {`Aktywne (${activeAssignmentsCount})`}
                </KangurButton>
                <KangurButton
                  type='button'
                  onClick={() => setActiveListTab('completed')}
                  aria-pressed={activeListTab === 'completed'}
                  aria-selected={activeListTab === 'completed'}
                  role='tab'
                  className='min-w-0 flex-1 px-3 text-xs'
                  size='sm'
                  variant={activeListTab === 'completed' ? 'segmentActive' : 'segment'}
                >
                  {`Ukończone (${completedAssignmentsCount})`}
                </KangurButton>
              </div>
            </div>
          ) : null}

          {showActiveAssignmentsList ? (
            <KangurAssignmentsList
              items={activeAssignmentItems}
              title='Aktywne zadania'
              emptyLabel='Brak aktywnych zadań dla ucznia.'
              onArchive={(assignmentId) => void handleArchive(assignmentId)}
              onTimeLimitClick={handleOpenTimeLimitModal}
            />
          ) : null}

          {showCompletedAssignmentsList ? (
            <KangurAssignmentsList
              items={completedAssignmentItems}
              title='Ukończone zadania'
              emptyLabel='Uczeń nie zakończył jeszcze żadnych przypisanych zadań.'
              onArchive={(assignmentId) => void handleArchive(assignmentId)}
              onTimeLimitClick={handleOpenTimeLimitModal}
              onReassign={(assignmentId) => void handleReassign(assignmentId)}
              reassigningId={pendingActionId}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

export default KangurAssignmentManager;
