'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TranslationValues } from 'use-intl';

import type { KangurAssignmentSnapshot } from '@kangur/platform';
import { buildKangurAssignmentDedupeKey } from '@/features/kangur/services/kangur-assignments';
import { withKangurClientError } from '@/features/kangur/observability/client';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  buildKangurAssignmentCatalog,
  buildKangurAssignmentListItems,
  buildRecommendedKangurAssignmentCatalog,
  filterKangurAssignmentCatalog,
} from '@/features/kangur/ui/services/delegated-assignments';

import {
  TIME_LIMIT_MINUTES_MAX,
  TIME_LIMIT_MINUTES_MIN,
  buildTrackerSummary,
  formatTimeLimitValue,
  parseTimeLimitInput,
  type FilterOption,
} from './assignment-manager/KangurAssignmentManager.helpers';
import type {
  KangurAssignmentManagerProps,
  TimeLimitModalContext,
} from './assignment-manager/KangurAssignmentManager.types';

type AssignmentManagerViewState = {
  shouldShowCatalog: boolean;
  shouldShowListTabs: boolean;
  shouldShowLists: boolean;
  shouldShowTracking: boolean;
};

type AssignmentManagerRuntimeLocalizer = {
  locale: string;
  translate: (key: string, values?: TranslationValues) => string;
};

type AssignmentManagerCatalogItem = ReturnType<typeof buildKangurAssignmentCatalog>[number];
type AssignmentManagerSuggestedCatalogItem =
  ReturnType<typeof buildRecommendedKangurAssignmentCatalog>[number];
type AssignmentManagerTimeLimitCatalogItem =
  | AssignmentManagerCatalogItem
  | AssignmentManagerSuggestedCatalogItem;

const resolveAssignmentManagerViewState = (
  view: NonNullable<KangurAssignmentManagerProps['view']>
): AssignmentManagerViewState => {
  const shouldShowCatalog =
    view === 'full' || view === 'catalog' || view === 'catalogWithLists';
  const shouldShowTracking = view === 'full' || view === 'tracking' || view === 'metrics';
  const shouldShowLists = view === 'full' || view === 'tracking' || view === 'catalogWithLists';

  return {
    shouldShowCatalog,
    shouldShowListTabs: shouldShowLists && view === 'catalogWithLists',
    shouldShowLists,
    shouldShowTracking,
  };
};

const shouldEnableAssignmentManagerLessonsQuery = (
  preloadedLessons: KangurAssignmentManagerProps['preloadedLessons'],
  shouldShowCatalog: boolean
): boolean => shouldShowCatalog && preloadedLessons === undefined;

const shouldEnableAssignmentManagerAssignmentsQuery = ({
  preloadedAssignments,
  shouldShowCatalog,
  shouldShowLists,
  shouldShowTracking,
}: {
  preloadedAssignments: KangurAssignmentManagerProps['preloadedAssignments'];
  shouldShowCatalog: boolean;
  shouldShowLists: boolean;
  shouldShowTracking: boolean;
}): boolean =>
  (shouldShowCatalog || shouldShowTracking || shouldShowLists) &&
  preloadedAssignments === undefined;

const createAssignmentRuntimeLocalizer = (
  locale: string,
  translate: (key: string, values?: TranslationValues) => string
): AssignmentManagerRuntimeLocalizer => ({
  locale,
  translate,
});

const buildAssignedAssignmentsByKey = (
  assignments: KangurAssignmentSnapshot[],
  shouldShowCatalog: boolean
): Map<string, KangurAssignmentSnapshot> => {
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
};

const filterAssignmentsForManager = ({
  assignments,
  includeCompleted,
  shouldShowLists,
}: {
  assignments: KangurAssignmentSnapshot[];
  includeCompleted: boolean;
  shouldShowLists: boolean;
}): KangurAssignmentSnapshot[] => {
  if (!shouldShowLists) {
    return [];
  }

  return assignments.filter((assignment) => {
    if (assignment.archived) {
      return false;
    }

    return includeCompleted
      ? assignment.progress.status === 'completed'
      : assignment.progress.status !== 'completed';
  });
};

const resolveFilteredCatalog = (
  catalog: ReturnType<typeof buildKangurAssignmentCatalog>,
  searchTerm: string,
  activeFilter: FilterOption,
  shouldShowCatalog: boolean
): ReturnType<typeof buildKangurAssignmentCatalog> =>
  shouldShowCatalog ? filterKangurAssignmentCatalog(catalog, searchTerm, activeFilter) : [];

const resolveTimeLimitAssignment = ({
  assignments,
  timeLimitModalContext,
}: {
  assignments: KangurAssignmentSnapshot[];
  timeLimitModalContext: TimeLimitModalContext | null;
}): KangurAssignmentSnapshot | null => {
  if (timeLimitModalContext?.mode !== 'update') {
    return null;
  }

  return (
    assignments.find((assignment) => assignment.id === timeLimitModalContext.assignmentId) ?? null
  );
};

const resolveTimeLimitCatalogItem = ({
  catalog,
  suggestedCatalog,
  timeLimitModalContext,
}: {
  catalog: ReturnType<typeof buildKangurAssignmentCatalog>;
  suggestedCatalog: ReturnType<typeof buildRecommendedKangurAssignmentCatalog>;
  timeLimitModalContext: TimeLimitModalContext | null;
}): AssignmentManagerTimeLimitCatalogItem | null => {
  if (timeLimitModalContext?.mode !== 'create') {
    return null;
  }

  return (
    [...catalog, ...suggestedCatalog].find(
      (entry) => entry.id === timeLimitModalContext.catalogItemId
    ) ?? null
  );
};

const resolveTimeLimitParsedError = ({
  timeLimitParsed,
  translations,
}: {
  timeLimitParsed: ReturnType<typeof parseTimeLimitInput>;
  translations: (key: string, values?: Record<string, string | number>) => string;
}): string | null =>
  timeLimitParsed.errorKey
    ? translations(timeLimitParsed.errorKey, {
        minMinutes: TIME_LIMIT_MINUTES_MIN,
        maxMinutes: TIME_LIMIT_MINUTES_MAX,
      })
    : null;

const resolveCurrentTimeLimit = ({
  timeLimitAssignment,
  timeLimitModalContext,
}: {
  timeLimitAssignment: KangurAssignmentSnapshot | null;
  timeLimitModalContext: TimeLimitModalContext | null;
}): number | null =>
  timeLimitModalContext?.mode === 'create' ? null : timeLimitAssignment?.timeLimitMinutes ?? null;

const resolveCanSaveTimeLimit = ({
  currentTimeLimit,
  timeLimitAssignment,
  timeLimitCatalogItem,
  timeLimitModalContext,
  timeLimitParsed,
}: {
  currentTimeLimit: number | null;
  timeLimitAssignment: KangurAssignmentSnapshot | null;
  timeLimitCatalogItem: AssignmentManagerTimeLimitCatalogItem | null;
  timeLimitModalContext: TimeLimitModalContext | null;
  timeLimitParsed: ReturnType<typeof parseTimeLimitInput>;
}): boolean => {
  if (timeLimitParsed.errorKey) {
    return false;
  }

  if (timeLimitModalContext?.mode === 'create') {
    return Boolean(timeLimitCatalogItem);
  }

  return Boolean(timeLimitAssignment) && timeLimitParsed.value !== currentTimeLimit;
};

const resolveTimeLimitSaveLabel = ({
  isSavingTimeLimit,
  timeLimitModalContext,
  translations,
}: {
  isSavingTimeLimit: boolean;
  timeLimitModalContext: TimeLimitModalContext | null;
  translations: (key: string, values?: Record<string, string | number>) => string;
}): string => {
  if (isSavingTimeLimit) {
    return translations('actions.saving');
  }

  return timeLimitModalContext?.mode === 'create'
    ? translations('actions.saveAndAssign')
    : translations('actions.save');
};

function useAssignmentManagerCatalogState({
  ageGroup,
  assignmentRuntimeTranslations,
  locale,
  preloadedLessons,
  progress,
  shouldShowCatalog,
}: {
  ageGroup: ReturnType<typeof useKangurAgeGroupFocus>['ageGroup'];
  assignmentRuntimeTranslations: (key: string, values?: TranslationValues) => string;
  locale: string;
  preloadedLessons: KangurAssignmentManagerProps['preloadedLessons'];
  progress: ReturnType<typeof useKangurProgressState>;
  shouldShowCatalog: boolean;
}) {
  const lessonsQuery = useKangurLessons({
    ageGroup,
    enabled: shouldEnableAssignmentManagerLessonsQuery(preloadedLessons, shouldShowCatalog),
    enabledOnly: true,
  });
  const lessons = useMemo(
    () => preloadedLessons ?? lessonsQuery.data ?? [],
    [lessonsQuery.data, preloadedLessons]
  );
  const assignmentRuntimeLocalizer = useMemo(
    () => createAssignmentRuntimeLocalizer(locale, assignmentRuntimeTranslations),
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

  return {
    assignmentRuntimeLocalizer,
    catalog,
    suggestedCatalog,
  };
}

function useAssignmentManagerAssignmentsState({
  assignmentRuntimeLocalizer,
  basePath,
  preloadedAssignments,
  preloadedAssignmentsError,
  preloadedCreateAssignment,
  preloadedLoading,
  preloadedReassignAssignment,
  preloadedUpdateAssignment,
  shouldShowCatalog,
  shouldShowLists,
  shouldShowTracking,
  suggestedCatalog,
}: {
  assignmentRuntimeLocalizer: AssignmentManagerRuntimeLocalizer;
  basePath: string;
  preloadedAssignments: KangurAssignmentManagerProps['preloadedAssignments'];
  preloadedAssignmentsError: string | null;
  preloadedCreateAssignment: KangurAssignmentManagerProps['preloadedCreateAssignment'];
  preloadedLoading: boolean;
  preloadedReassignAssignment: KangurAssignmentManagerProps['preloadedReassignAssignment'];
  preloadedUpdateAssignment: KangurAssignmentManagerProps['preloadedUpdateAssignment'];
  shouldShowCatalog: boolean;
  shouldShowLists: boolean;
  shouldShowTracking: boolean;
  suggestedCatalog: ReturnType<typeof buildRecommendedKangurAssignmentCatalog>;
}) {
  const assignmentsQuery = useKangurAssignments({
    enabled: shouldEnableAssignmentManagerAssignmentsQuery({
      preloadedAssignments,
      shouldShowCatalog,
      shouldShowLists,
      shouldShowTracking,
    }),
    query: {
      includeArchived: false,
    },
  });
  const assignments = preloadedAssignments ?? assignmentsQuery.assignments;
  const isLoading =
    preloadedAssignments === undefined ? assignmentsQuery.isLoading : preloadedLoading;
  const error =
    preloadedAssignments === undefined ? assignmentsQuery.error : preloadedAssignmentsError;
  const { createAssignment, updateAssignment, reassignAssignment } = assignmentsQuery;
  const resolvedCreateAssignment = preloadedCreateAssignment ?? createAssignment;
  const resolvedUpdateAssignment = preloadedUpdateAssignment ?? updateAssignment;
  const resolvedReassignAssignment = preloadedReassignAssignment ?? reassignAssignment;

  const assignedAssignmentsByKey = useMemo(
    () => buildAssignedAssignmentsByKey(assignments, shouldShowCatalog),
    [assignments, shouldShowCatalog]
  );
  const assignedTargetKeys = useMemo(
    () => new Set<string>(assignedAssignmentsByKey.keys()),
    [assignedAssignmentsByKey]
  );
  const activeAssignments = useMemo(
    () =>
      filterAssignmentsForManager({
        assignments,
        includeCompleted: false,
        shouldShowLists,
      }),
    [assignments, shouldShowLists]
  );
  const completedAssignments = useMemo(
    () =>
      filterAssignmentsForManager({
        assignments,
        includeCompleted: true,
        shouldShowLists,
      }),
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

  return {
    activeAssignmentItems,
    assignments,
    assignedAssignmentsByKey,
    completedAssignmentItems,
    error,
    isLoading,
    recommendedCatalog,
    resolvedCreateAssignment,
    resolvedReassignAssignment,
    resolvedUpdateAssignment,
    trackerSummary,
  };
}

function useAssignmentManagerTimeLimitState({
  assignments,
  catalog,
  isSavingTimeLimit,
  suggestedCatalog,
  timeLimitDraft,
  timeLimitModalContext,
  translations,
}: {
  assignments: KangurAssignmentSnapshot[];
  catalog: ReturnType<typeof buildKangurAssignmentCatalog>;
  isSavingTimeLimit: boolean;
  suggestedCatalog: ReturnType<typeof buildRecommendedKangurAssignmentCatalog>;
  timeLimitDraft: string;
  timeLimitModalContext: TimeLimitModalContext | null;
  translations: (key: string, values?: Record<string, string | number>) => string;
}) {
  const timeLimitAssignment = resolveTimeLimitAssignment({
    assignments,
    timeLimitModalContext,
  });
  const timeLimitCatalogItem = resolveTimeLimitCatalogItem({
    catalog,
    suggestedCatalog,
    timeLimitModalContext,
  });
  const timeLimitTarget = timeLimitAssignment ?? timeLimitCatalogItem;
  const isTimeLimitModalOpen = Boolean(timeLimitModalContext);
  const timeLimitParsed = parseTimeLimitInput(timeLimitDraft);
  const timeLimitParsedError = resolveTimeLimitParsedError({
    timeLimitParsed,
    translations,
  });
  const currentTimeLimit = resolveCurrentTimeLimit({
    timeLimitAssignment,
    timeLimitModalContext,
  });
  const canSaveTimeLimit = resolveCanSaveTimeLimit({
    currentTimeLimit,
    timeLimitAssignment,
    timeLimitCatalogItem,
    timeLimitModalContext,
    timeLimitParsed,
  });
  const isTimeLimitSaveDisabled = isSavingTimeLimit || !canSaveTimeLimit;
  const timeLimitPreview = formatTimeLimitValue(currentTimeLimit, (key, values) =>
    translations(`timeLimit.${key}`, values)
  );
  const timeLimitSaveLabel = resolveTimeLimitSaveLabel({
    isSavingTimeLimit,
    timeLimitModalContext,
    translations,
  });

  return {
    currentTimeLimit,
    isTimeLimitModalOpen,
    isTimeLimitSaveDisabled,
    timeLimitAssignment,
    timeLimitCatalogItem,
    timeLimitParsed,
    timeLimitParsedError,
    timeLimitPreview,
    timeLimitSaveLabel,
    timeLimitTarget,
  };
}

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
  const { shouldShowCatalog, shouldShowTracking, shouldShowLists, shouldShowListTabs } =
    resolveAssignmentManagerViewState(view);
  const { catalog, suggestedCatalog } = useAssignmentManagerCatalogState({
    ageGroup,
    assignmentRuntimeTranslations,
    locale,
    preloadedLessons,
    progress,
    shouldShowCatalog,
  });

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
    activeAssignmentItems,
    assignments,
    assignedAssignmentsByKey,
    completedAssignmentItems,
    error,
    isLoading,
    recommendedCatalog,
    resolvedCreateAssignment,
    resolvedReassignAssignment,
    resolvedUpdateAssignment,
    trackerSummary,
  } = useAssignmentManagerAssignmentsState({
    assignmentRuntimeLocalizer: createAssignmentRuntimeLocalizer(locale, assignmentRuntimeTranslations),
    basePath,
    preloadedAssignments,
    preloadedAssignmentsError,
    preloadedCreateAssignment,
    preloadedLoading,
    preloadedReassignAssignment,
    preloadedUpdateAssignment,
    shouldShowCatalog,
    shouldShowLists,
    shouldShowTracking,
    suggestedCatalog,
  });
  const {
    currentTimeLimit,
    isTimeLimitModalOpen,
    isTimeLimitSaveDisabled,
    timeLimitAssignment,
    timeLimitCatalogItem,
    timeLimitParsed,
    timeLimitParsedError,
    timeLimitPreview,
    timeLimitSaveLabel,
    timeLimitTarget,
  } = useAssignmentManagerTimeLimitState({
    assignments,
    catalog,
    isSavingTimeLimit,
    suggestedCatalog,
    timeLimitDraft,
    timeLimitModalContext,
    translations,
  });

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
    () => resolveFilteredCatalog(catalog, searchTerm, activeFilter, shouldShowCatalog),
    [activeFilter, catalog, searchTerm, shouldShowCatalog]
  );

  const resolveActionErrorMessage = useCallback(
    (error: unknown, fallbackKey: 'feedback.assignError' | 'feedback.reassignError'): string => {
      const status =
        typeof error === 'object' && error !== null && 'status' in error
          ? (error as { status?: unknown }).status
          : null;
      if (status === 409) {
        return translations('feedback.alreadyActive');
      }
      return translations(fallbackKey);
    },
    [translations]
  );

  const assignCatalogItem = useCallback(
    async (item: (typeof catalog)[number]): Promise<void> => {
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
    },
    [catalog, resolveActionErrorMessage, resolvedCreateAssignment, translations]
  );

  const handleAssign = useCallback(
    async (catalogItemId: string): Promise<void> => {
      const item = [...catalog, ...suggestedCatalog].find((entry) => entry.id === catalogItemId);
      if (!item) {
        return;
      }

      await assignCatalogItem(item);
    },
    [assignCatalogItem, catalog, suggestedCatalog]
  );

  const handleArchive = useCallback(
    async (assignmentId: string): Promise<void> => {
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
    },
    [resolvedUpdateAssignment, translations]
  );

  const handleUnassign = useCallback(
    async (assignmentId: string, title?: string): Promise<void> => {
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
    },
    [resolvedUpdateAssignment, translations]
  );

  const handleReassign = useCallback(
    async (assignmentId: string): Promise<void> => {
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
    },
    [assignments, resolveActionErrorMessage, resolvedReassignAssignment, translations]
  );

  const handleOpenTimeLimitModal = useCallback((assignmentId: string): void => {
    setTimeLimitModalContext({ mode: 'update', assignmentId });
  }, []);

  const handleOpenTimeLimitModalForCatalog = useCallback((catalogItemId: string): void => {
    setTimeLimitModalContext({ mode: 'create', catalogItemId });
  }, []);

  const handleCloseTimeLimitModal = useCallback(() => {
    setTimeLimitModalContext(null);
  }, []);

  const saveUpdatedTimeLimit = useCallback(async (nextValue: number | null): Promise<void> => {
    if (!timeLimitAssignment) {
      return;
    }

    if (nextValue === currentTimeLimit) {
      handleCloseTimeLimitModal();
      return;
    }

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
  }, [
    currentTimeLimit,
    handleCloseTimeLimitModal,
    resolvedUpdateAssignment,
    timeLimitAssignment,
    translations,
  ]);

  const saveCatalogTimeLimit = useCallback(async (nextValue: number | null): Promise<void> => {
    if (!timeLimitCatalogItem) {
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
            timeLimitMinutes: nextValue,
          },
        },
        async () => {
          await resolvedCreateAssignment({
            ...timeLimitCatalogItem.createInput,
            timeLimitMinutes: nextValue,
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
            nextValue === null
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
    }
  }, [
    handleCloseTimeLimitModal,
    resolveActionErrorMessage,
    resolvedCreateAssignment,
    timeLimitCatalogItem,
    translations,
  ]);

  const handleSaveTimeLimit = useCallback(async (): Promise<void> => {
    if (!timeLimitModalContext || timeLimitParsed.errorKey) {
      return;
    }

    setIsSavingTimeLimit(true);
    setFeedback(null);

    try {
      if (timeLimitModalContext.mode === 'update') {
        await saveUpdatedTimeLimit(timeLimitParsed.value);
        return;
      }

      await saveCatalogTimeLimit(timeLimitParsed.value);
    } finally {
      setIsSavingTimeLimit(false);
    }
  }, [saveCatalogTimeLimit, saveUpdatedTimeLimit, timeLimitModalContext, timeLimitParsed]);

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
