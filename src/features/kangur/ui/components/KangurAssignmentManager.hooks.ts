'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { KangurAssignmentSnapshot } from '@kangur/platform';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  buildKangurAssignmentCatalog,
  buildKangurAssignmentListItems,
  buildRecommendedKangurAssignmentCatalog,
  filterKangurAssignmentCatalog,
} from '@/features/kangur/ui/services/delegated-assignments';
import { buildKangurAssignmentDedupeKey } from '@/features/kangur/services/kangur-assignments';

import {
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

export function useKangurAssignmentManagerState({
  basePath,
  preloadedCreateAssignment,
  preloadedAssignments,
  preloadedAssignmentsError = null,
  preloadedLessons,
  preloadedLoading = false,
  preloadedReassignAssignment,
  preloadedUpdateAssignment,
  view = 'full',
}: KangurAssignmentManagerProps) {
  const locale = useLocale();
  const translations = useTranslations('KangurAssignmentManager');
  const assignmentRuntimeTranslations = useTranslations('KangurAssignmentsRuntime');
  const isCoarsePointer = useKangurCoarsePointer();
  const progress = useKangurProgressState();
  const { ageGroup } = useKangurAgeGroupFocus();
  
  const shouldShowCatalog = view === 'full' || view === 'catalog' || view === 'catalogWithLists';
  const shouldShowTracking = view === 'full' || view === 'tracking' || view === 'metrics';
  const shouldShowLists = view === 'full' || view === 'tracking' || view === 'catalogWithLists';
  const shouldShowListTabs = shouldShowLists && view === 'catalogWithLists';

  const lessonsQuery = useKangurLessons({
    ageGroup,
    enabled: shouldShowCatalog && preloadedLessons === undefined,
    enabledOnly: true,
  });
  const lessons = useMemo(
    () => preloadedLessons ?? lessonsQuery.data ?? [],
    [lessonsQuery.data, preloadedLessons]
  );
  const assignmentRuntimeLocalizer = useMemo(
    () => ({
      locale,
      translate: assignmentRuntimeTranslations,
    }),
    [assignmentRuntimeTranslations, locale]
  );
  const catalog = useMemo(
    () =>
      shouldShowCatalog
        ? buildKangurAssignmentCatalog(lessons, assignmentRuntimeLocalizer)
        : [],
    [assignmentRuntimeLocalizer, lessons, shouldShowCatalog]
  );
  const suggestedCatalog = useMemo(
    () =>
      shouldShowCatalog
        ? buildRecommendedKangurAssignmentCatalog(progress, assignmentRuntimeLocalizer)
        : [],
    [assignmentRuntimeLocalizer, progress, shouldShowCatalog]
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

  const assignmentsQuery = useKangurAssignments({
    enabled:
      (shouldShowCatalog || shouldShowTracking || shouldShowLists) &&
      preloadedAssignments === undefined,
    query: {
      includeArchived: false,
    },
  });
  const assignments = preloadedAssignments ?? assignmentsQuery.assignments;
  const isLoading =
    preloadedAssignments === undefined ? assignmentsQuery.isLoading : preloadedLoading;
  const error =
    preloadedAssignments === undefined ? assignmentsQuery.error : preloadedAssignmentsError;
  const {
    createAssignment,
    updateAssignment,
    reassignAssignment,
  } = assignmentsQuery;
  const resolvedCreateAssignment = preloadedCreateAssignment ?? createAssignment;
  const resolvedUpdateAssignment = preloadedUpdateAssignment ?? updateAssignment;
  const resolvedReassignAssignment = preloadedReassignAssignment ?? reassignAssignment;

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
    () =>
      shouldShowCatalog ? filterKangurAssignmentCatalog(catalog, searchTerm, activeFilter) : [],
    [activeFilter, catalog, searchTerm, shouldShowCatalog]
  );

  const assignedAssignmentsByKey = useMemo(() => {
    if (!shouldShowCatalog) {
      return new Map<string, KangurAssignmentSnapshot>();
    }
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
  }, [assignments, shouldShowCatalog]);

  const assignedTargetKeys = useMemo(
    () => new Set<string>(assignedAssignmentsByKey.keys()),
    [assignedAssignmentsByKey]
  );

  const activeAssignments = useMemo(
    () =>
      shouldShowLists
        ? assignments.filter(
            (assignment) => !assignment.archived && assignment.progress.status !== 'completed'
          )
        : [],
    [assignments, shouldShowLists]
  );
  const completedAssignments = useMemo(
    () =>
      shouldShowLists
        ? assignments.filter(
            (assignment) => !assignment.archived && assignment.progress.status === 'completed'
          )
        : [],
    [assignments, shouldShowLists]
  );
  const activeAssignmentItems = useMemo(
    () =>
      shouldShowLists
        ? buildKangurAssignmentListItems(basePath, activeAssignments, assignmentRuntimeLocalizer)
        : [],
    [activeAssignments, assignmentRuntimeLocalizer, basePath, shouldShowLists]
  );
  const completedAssignmentItems = useMemo(
    () =>
      shouldShowLists
        ? buildKangurAssignmentListItems(
            basePath,
            completedAssignments,
            assignmentRuntimeLocalizer
          )
        : [],
    [assignmentRuntimeLocalizer, basePath, completedAssignments, shouldShowLists]
  );

  const trackerSummary = useMemo(() => buildTrackerSummary(assignments), [assignments]);
  const recommendedCatalog = useMemo(
    () =>
      shouldShowCatalog
        ? suggestedCatalog.filter(
            (item) =>
              !assignedTargetKeys.has(buildKangurAssignmentDedupeKey(item.createInput.target))
          )
        : [],
    [assignedTargetKeys, shouldShowCatalog, suggestedCatalog]
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

  const resolveActionErrorMessage = useCallback((
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
  }, [translations]);

  const assignCatalogItem = useCallback(async (item: (typeof catalog)[number]): Promise<void> => {
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
          await resolvedCreateAssignment(item.createInput);
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
  }, [catalog, resolveActionErrorMessage, resolvedCreateAssignment, translations]);

  const handleAssign = useCallback(async (catalogItemId: string): Promise<void> => {
    const item = [...catalog, ...suggestedCatalog].find((entry) => entry.id === catalogItemId);
    if (!item) {
      return;
    }

    await assignCatalogItem(item);
  }, [assignCatalogItem, catalog, suggestedCatalog]);

  const handleArchive = useCallback(async (assignmentId: string): Promise<void> => {
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
          await resolvedUpdateAssignment(assignmentId, { archived: true });
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
  }, [resolvedUpdateAssignment, translations]);

  const handleUnassign = useCallback(async (assignmentId: string, title?: string): Promise<void> => {
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
          await resolvedUpdateAssignment(assignmentId, { archived: true });
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
  }, [resolvedUpdateAssignment, translations]);

  const handleReassign = useCallback(async (assignmentId: string): Promise<void> => {
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
          await resolvedReassignAssignment(assignmentId);
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
  }, [assignments, resolveActionErrorMessage, resolvedReassignAssignment, translations]);

  const handleOpenTimeLimitModal = useCallback((assignmentId: string): void => {
    setTimeLimitModalContext({ mode: 'update', assignmentId });
  }, []);

  const handleOpenTimeLimitModalForCatalog = useCallback((catalogItemId: string): void => {
    setTimeLimitModalContext({ mode: 'create', catalogItemId });
  }, []);

  const handleCloseTimeLimitModal = useCallback(() => {
    setTimeLimitModalContext(null);
  }, []);

  const handleSaveTimeLimit = useCallback(async (): Promise<void> => {
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
            await resolvedUpdateAssignment(timeLimitAssignment.id, {
              timeLimitMinutes: nextValue,
            });
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
          await resolvedCreateAssignment({
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
  }, [handleCloseTimeLimitModal, resolveActionErrorMessage, resolvedCreateAssignment, resolvedUpdateAssignment, timeLimitAssignment, timeLimitCatalogItem, timeLimitDraft, timeLimitModalContext, translations]);

  return {
    translations,
    isCoarsePointer,
    shouldShowCatalog,
    shouldShowTracking,
    shouldShowLists,
    shouldShowListTabs,
    searchTerm,
    setSearchTerm,
    activeFilter,
    setActiveFilter,
    pendingActionId,
    feedback,
    activeListTab,
    setActiveListTab,
    timeLimitModalContext,
    timeLimitDraft,
    setTimeLimitDraft,
    isSavingTimeLimit,
    isLoading,
    error,
    timeLimitTarget,
    isTimeLimitModalOpen,
    filteredCatalog,
    assignedAssignmentsByKey,
    activeAssignmentItems,
    completedAssignmentItems,
    trackerSummary,
    recommendedCatalog,
    timeLimitParsedError,
    isTimeLimitSaveDisabled,
    timeLimitPreview,
    timeLimitSaveLabel,
    handleAssign,
    handleArchive,
    handleUnassign,
    handleReassign,
    handleOpenTimeLimitModal,
    handleOpenTimeLimitModalForCatalog,
    handleCloseTimeLimitModal,
    handleSaveTimeLimit,
  };
}
