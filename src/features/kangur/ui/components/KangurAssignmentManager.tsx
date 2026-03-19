'use client';

import { Clock } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { KangurAssignmentPriorityChip } from '@/features/kangur/ui/components/KangurAssignmentPriorityChip';
import KangurAssignmentsList from '@/features/kangur/ui/components/KangurAssignmentsList';
import { withKangurClientError } from '@/features/kangur/observability/client';
import {
  KangurButton,
  KangurCardDescription,
  KangurCardTitle,
  KangurEmptyState,
  KangurGlassPanel,
  KangurMetricCard,
  KangurStatusChip,
  KangurSummaryPanel,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_PANEL_ROW_LG_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
  KANGUR_STACK_COMPACT_CLASSNAME,
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

import {
  KangurAssignmentManagerCardFooter,
  KangurAssignmentManagerCardHeader,
  KangurAssignmentManagerItemCard,
} from './KangurAssignmentManager.cards';
import { KangurAssignmentManagerTimeLimitModal } from './KangurAssignmentManagerTimeLimitModal';
import {
  FILTER_OPTION_VALUES,
  TIME_LIMIT_MINUTES_MAX,
  TIME_LIMIT_MINUTES_MIN,
  buildTrackerSummary,
  formatTimeLimitValue,
  parseTimeLimitInput,
  type FilterOption,
} from './KangurAssignmentManager.helpers';
import type {
  KangurAssignmentManagerProps,
  TimeLimitModalContext,
} from './KangurAssignmentManager.types';

export function KangurAssignmentManager({
  basePath,
  view = 'full',
}: KangurAssignmentManagerProps): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurAssignmentManager');
  const assignmentRuntimeTranslations = useTranslations('KangurAssignmentsRuntime');
  const progress = useKangurProgressState();
  const { ageGroup } = useKangurAgeGroupFocus();
  const lessonsQuery = useKangurLessons({ ageGroup, enabledOnly: true });
  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const assignmentRuntimeLocalizer = useMemo(
    () => ({
      locale,
      translate: assignmentRuntimeTranslations,
    }),
    [assignmentRuntimeTranslations, locale]
  );
  const catalog = useMemo(
    () => buildKangurAssignmentCatalog(lessons, assignmentRuntimeLocalizer),
    [assignmentRuntimeLocalizer, lessons]
  );
  const suggestedCatalog = useMemo(
    () => buildRecommendedKangurAssignmentCatalog(progress, assignmentRuntimeLocalizer),
    [assignmentRuntimeLocalizer, progress]
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; tone: 'indigo' | 'rose' } | null>(
    null
  );
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
  const filterOptions = FILTER_OPTION_VALUES.map((value) => ({
    value,
    label: translations(`filters.${value}`),
  }));
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
    () => buildKangurAssignmentListItems(basePath, activeAssignments, assignmentRuntimeLocalizer),
    [activeAssignments, assignmentRuntimeLocalizer, basePath]
  );
  const completedAssignmentItems = useMemo(
    () => buildKangurAssignmentListItems(basePath, completedAssignments, assignmentRuntimeLocalizer),
    [assignmentRuntimeLocalizer, basePath, completedAssignments]
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
  const timeLimitParsedError = timeLimitParsed.errorKey
    ? translations(timeLimitParsed.errorKey, {
        minMinutes: TIME_LIMIT_MINUTES_MIN,
        maxMinutes: TIME_LIMIT_MINUTES_MAX,
      })
    : null;
  const currentTimeLimit = isCreateTimeLimit ? null : timeLimitAssignment?.timeLimitMinutes ?? null;
  const canSaveTimeLimit = isCreateTimeLimit
    ? Boolean(timeLimitCatalogItem) && !timeLimitParsed.errorKey
    : Boolean(timeLimitAssignment) &&
      !timeLimitParsed.errorKey &&
      timeLimitParsed.value !== currentTimeLimit;
  const isTimeLimitSaveDisabled = isSavingTimeLimit || !canSaveTimeLimit;
  const timeLimitPreview = formatTimeLimitValue(currentTimeLimit, (key, values) =>
    translations(`timeLimit.${key}`, values)
  );
  const timeLimitSaveLabel = isSavingTimeLimit
    ? translations('actions.saving')
    : isCreateTimeLimit
      ? translations('actions.saveAndAssign')
      : translations('actions.save');

  const resolveActionErrorMessage = (
    error: unknown,
    fallbackKey: 'feedback.assignError' | 'feedback.reassignError'
  ): string => {
    const status =
      typeof error === 'object' && error !== null && 'status' in error
        ? (error as { status?: unknown }).status
        : null;
    if (status === 409) {
      return translations('feedback.alreadyActive');
    }
    return translations(fallbackKey);
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
            setFeedback({
              message: resolveActionErrorMessage(error, 'feedback.assignError'),
              tone: 'rose',
            });
          },
        }
      );
      if (didAssign) {
        setFeedback({
          message: translations('feedback.assignSuccess', { title: item.title }),
          tone: 'indigo',
        });
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
            setFeedback({ message: translations('feedback.archiveError'), tone: 'rose' });
          },
        }
      );
      if (didArchive) {
        setFeedback({ message: translations('feedback.archiveSuccess'), tone: 'indigo' });
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
            setFeedback({ message: translations('feedback.unassignError'), tone: 'rose' });
          },
        }
      );
      if (didUnassign) {
        setFeedback({
          message: title
            ? translations('feedback.unassignSuccessWithTitle', { title })
            : translations('feedback.unassignSuccess'),
          tone: 'indigo',
        });
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
            setFeedback({
              message: resolveActionErrorMessage(error, 'feedback.reassignError'),
              tone: 'rose',
            });
          },
        }
      );
      if (didReassign) {
        setFeedback({
          message: assignment?.title
            ? translations('feedback.reassignSuccessWithTitle', { title: assignment.title })
            : translations('feedback.reassignSuccess'),
          tone: 'indigo',
        });
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
    if (parsed.errorKey) {
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
              setFeedback({ message: translations('feedback.timeLimitSaveError'), tone: 'rose' });
            },
          }
        );
        if (didUpdate) {
          setFeedback({
            message:
              nextValue === null
                ? translations('feedback.timeLimitRemoved')
                : translations('feedback.timeLimitSaved'),
            tone: 'indigo',
          });
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
            setFeedback({
              message: resolveActionErrorMessage(error, 'feedback.assignError'),
              tone: 'rose',
            });
          },
        }
      );
      if (didAssign) {
        setFeedback({
          message:
            parsed.value === null
              ? translations('feedback.assignSuccess', { title: timeLimitCatalogItem.title })
              : translations('feedback.assignWithTimeLimitSuccess', {
                  title: timeLimitCatalogItem.title,
                }),
          tone: 'indigo',
        });
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
      <KangurAssignmentManagerTimeLimitModal
        isOpen={isTimeLimitModalOpen}
        onClose={handleCloseTimeLimitModal}
        onSave={() => void handleSaveTimeLimit()}
        timeLimitDraft={timeLimitDraft}
        onTimeLimitDraftChange={setTimeLimitDraft}
        timeLimitTarget={timeLimitTarget}
        timeLimitPreview={timeLimitPreview}
        timeLimitParsedError={timeLimitParsedError}
        isSaveDisabled={isTimeLimitSaveDisabled}
        saveLabel={timeLimitSaveLabel}
        minMinutes={TIME_LIMIT_MINUTES_MIN}
        maxMinutes={TIME_LIMIT_MINUTES_MAX}
      />
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
                  {translations('catalog.eyebrow')}
                </KangurStatusChip>
                <KangurCardDescription className='mt-3 text-slate-600' relaxed size='sm'>
                  {translations('catalog.description')}
                </KangurCardDescription>
              </div>
            </div>

          {recommendedCatalog.length > 0 ? (
            <KangurSummaryPanel
              accent='indigo'
              className='mt-5'
              description={translations('suggested.description')}
              label={translations('suggested.label')}
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
                              {isPending
                                ? translations('actions.unassignPending')
                                : translations('actions.unassign')}
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
                              {isPending
                                ? translations('actions.assignPending')
                                : translations('actions.assignSuggested')}
                            </KangurButton>
                          )}
                          <KangurButton
                            aria-label={translations('actions.setTime')}
                            title={translations('actions.setTime')}
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
            placeholder={translations('search.placeholder')}
            className='mt-5'
            aria-label={translations('search.label')}
            title={translations('search.title')}
          />

          <div
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} mt-4 w-full sm:w-auto sm:flex-wrap sm:justify-start`}
          >
            {filterOptions.map((option) => (
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
              accent={feedback.tone}
              className='mt-4'
              description={feedback.message}
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
                          {isPending
                            ? translations('actions.unassignPending')
                            : translations('actions.unassign')}
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
                          {isPending
                            ? translations('actions.assignPending')
                            : translations('actions.assign')}
                        </KangurButton>
                      )}
                      <KangurButton
                        aria-label={translations('actions.setTime')}
                        title={translations('actions.setTime')}
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
              description={translations('empty.filtered')}
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
          <div className={KANGUR_STACK_COMPACT_CLASSNAME}>
            <KangurStatusChip
              accent='slate'
              className='w-fit'
              labelStyle='eyebrow'
            >
              {translations('tracking.eyebrow')}
            </KangurStatusChip>
            <KangurCardDescription className='mt-2 text-slate-600' relaxed size='sm'>
              {translations('tracking.description')}
            </KangurCardDescription>
          </div>

          <div className='mt-5 grid grid-cols-1 kangur-panel-gap min-[420px]:grid-cols-2 xl:grid-cols-4'>
            <KangurMetricCard
              accent='slate'
              description={translations('tracking.metrics.active.description')}
              label={translations('tracking.metrics.active.label')}
              value={trackerSummary.activeCount}
            />
            <KangurMetricCard
              accent='amber'
              description={translations('tracking.metrics.notStarted.description')}
              label={translations('tracking.metrics.notStarted.label')}
              value={trackerSummary.notStartedCount}
            />
            <KangurMetricCard
              accent='indigo'
              description={translations('tracking.metrics.inProgress.description')}
              label={translations('tracking.metrics.inProgress.label')}
              value={trackerSummary.inProgressCount}
            />
            <KangurMetricCard
              accent='emerald'
              description={translations('tracking.metrics.completed.description')}
              label={translations('tracking.metrics.completed.label')}
              value={trackerSummary.completedCount}
            />
          </div>

          <KangurMetricCard
            accent='slate'
            className='mt-4'
            description={translations('tracking.metrics.completionRate.description')}
            label={translations('tracking.metrics.completionRate.label')}
            value={`${trackerSummary.completionRate}%`}
          />
        </KangurGlassPanel>
      ) : null}

      {shouldShowLists ? (
        <>
          {shouldShowListTabs ? (
            <div className='flex flex-col kangur-panel-gap'>
              <KangurStatusChip accent='slate' labelStyle='eyebrow'>
                {translations('lists.eyebrow')}
              </KangurStatusChip>
              <div
                className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full sm:max-w-sm`}
                role='tablist'
                aria-label={translations('lists.ariaLabel')}
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
                  {translations('lists.activeTab', { count: activeAssignmentsCount })}
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
                  {translations('lists.completedTab', { count: completedAssignmentsCount })}
                </KangurButton>
              </div>
            </div>
          ) : null}

          {showActiveAssignmentsList ? (
            <KangurAssignmentsList
              items={activeAssignmentItems}
              title={translations('lists.activeTitle')}
              emptyLabel={translations('lists.activeEmpty')}
              onArchive={(assignmentId) => void handleArchive(assignmentId)}
              onTimeLimitClick={handleOpenTimeLimitModal}
            />
          ) : null}

          {showCompletedAssignmentsList ? (
            <KangurAssignmentsList
              items={completedAssignmentItems}
              title={translations('lists.completedTitle')}
              emptyLabel={translations('lists.completedEmpty')}
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
