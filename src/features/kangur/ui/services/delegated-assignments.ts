import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { getKangurSubjectLabel, KANGUR_LESSON_LIBRARY } from '@/features/kangur/lessons/lesson-catalog';
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type {
  KangurAssignmentListItem,
  KangurAssignmentsRuntimeLocalizer,
} from './delegated-assignments/delegated-assignments.types';
import {
  ASSIGNMENT_PRIORITY_ORDER,
  ASSIGNMENT_SUBJECT_ACCENTS,
  MIXED_TRAINING_CATEGORIES,
  PRACTICE_OPERATION_DIFFICULTY,
} from './delegated-assignments/delegated-assignments.constants';
import {
  buildKangurAssignmentCatalog,
  formatKangurAssignmentPriorityLabel,
  resolveKangurAssignmentPriorityAccent,
  resolveKangurAssignmentSubject,
  resolveAssignmentProgressCount,
  formatKangurAssignmentStatusLabel,
  resolveKangurAssignmentStatusAccent,
  resolveKangurAssignmentIcon,
  formatKangurAssignmentLastActivityLabel,
  formatKangurAssignmentTimeLimitLabel,
  resolveKangurAssignmentActionVariant,
  translateAssignmentsRuntimeWithFallback,
  hasKangurAssignmentCountdown,
  resolveKangurAssignmentCountdownStartTimestamp,
  resolveKangurAssignmentCountdownDeadline,
  resolveKangurAssignmentRemainingTimeParts,
  formatKangurAssignmentRemainingTimeLabel,
} from './delegated-assignments/delegated-assignments.logic';

export * from './delegated-assignments/delegated-assignments.types';
export {
  buildKangurAssignmentCatalog,
  buildRecommendedKangurAssignmentCatalog,
  filterKangurAssignmentCatalog,
  formatKangurAssignmentOperationLabel,
  formatKangurAssignmentPriorityLabel,
  getKangurAssignmentActionLabel,
  resolveKangurAssignmentPriorityAccent,
  resolveKangurAssignmentSubject,
} from './delegated-assignments/delegated-assignments.logic';
export const buildKangurAssignmentHref = (
  basePath: string,
  assignment: KangurAssignmentSnapshot
): string => {
  if (assignment.target.type === 'lesson') {
    return appendKangurUrlParams(
      createPageUrl('Lessons', basePath),
      {
        focus: assignment.target.lessonComponentId,
      },
      basePath
    );
  }

  if (assignment.target.operation === 'mixed') {
    return appendKangurUrlParams(
      createPageUrl('Game', basePath),
      {
        quickStart: 'training',
        categories: MIXED_TRAINING_CATEGORIES.join(','),
        count: 10,
        difficulty: 'medium',
      },
      basePath
    );
  }

  return appendKangurUrlParams(
    createPageUrl('Game', basePath),
    {
      quickStart: 'operation',
      operation: assignment.target.operation,
      difficulty: PRACTICE_OPERATION_DIFFICULTY[assignment.target.operation],
    },
    basePath
  );
};

export const buildKangurAssignmentListItem = (
  basePath: string,
  assignment: KangurAssignmentSnapshot,
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentListItem => {
  const subject = resolveKangurAssignmentSubject(assignment);
  const { completed, required } = resolveAssignmentProgressCount(assignment);
  const subjectAccent = ASSIGNMENT_SUBJECT_ACCENTS[subject] ?? 'violet';
  const status = assignment.progress.status;
  const statusLabel = formatKangurAssignmentStatusLabel(status, localizer);
  const icon = resolveKangurAssignmentIcon(assignment);
  const lastActivityLabel = formatKangurAssignmentLastActivityLabel(
    assignment.progress.lastActivityAt,
    localizer
  );

  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description || '',
    icon,
    createdAt: assignment.createdAt || '',
    subject,
    subjectLabel: getKangurSubjectLabel(subject),
    subjectAccent,
    priority: assignment.priority,
    status,
    priorityLabel: formatKangurAssignmentPriorityLabel(assignment.priority, localizer),
    priorityAccent: resolveKangurAssignmentPriorityAccent(assignment.priority),
    statusLabel,
    statusAccent: resolveKangurAssignmentStatusAccent(status),
    progressPercent: assignment.progress.percent ?? 0,
    progressSummary: assignment.progress.summary ?? '',
    progressCountLabel: `${completed}/${required}`,
    lastActivityLabel,
    timeLimitMinutes: assignment.timeLimitMinutes ?? null,
    timeLimitStartsAt: assignment.timeLimitStartsAt ?? null,
    timeLimitLabel: formatKangurAssignmentTimeLimitLabel(
      assignment.timeLimitMinutes,
      localizer
    ),
    actionHref: buildKangurAssignmentHref(basePath, assignment),
    actionLabel:
      assignment.target.type === 'lesson'
        ? translateAssignmentsRuntimeWithFallback(localizer, 'actions.openLesson', 'Otwórz lekcję')
        : translateAssignmentsRuntimeWithFallback(localizer, 'actions.startTraining', 'Uruchom trening'),
    actionVariant: resolveKangurAssignmentActionVariant(assignment),
  };
};

export const resolveKangurAssignmentCountdownLabel = (
  params: {
    createdAt?: string | null;
    now?: number;
    status?: KangurAssignmentSnapshot['progress']['status'] | null;
    timeLimitMinutes?: number | null;
    timeLimitStartsAt?: string | null;
  },
  localizer?: KangurAssignmentsRuntimeLocalizer
): string | null => {
  if (!hasKangurAssignmentCountdown(params)) {
    return null;
  }

  const startTimestamp = resolveKangurAssignmentCountdownStartTimestamp(params);
  if (startTimestamp === null) {
    return null;
  }

  const now = params.now ?? Date.now();
  const deadline = resolveKangurAssignmentCountdownDeadline(
    startTimestamp,
    params.timeLimitMinutes ?? 0
  );
  const remainingMs = deadline - now;

  if (remainingMs <= 0) {
    return translateAssignmentsRuntimeWithFallback(localizer, 'time.expired', 'Czas minął');
  }

  return formatKangurAssignmentRemainingTimeLabel(
    resolveKangurAssignmentRemainingTimeParts(remainingMs),
    localizer
  );
};

export const sortKangurAssignments = (
  assignments: KangurAssignmentSnapshot[]
): KangurAssignmentSnapshot[] => {
  return [...assignments].sort((a, b) => {
    const statusOrder: Record<string, number> = { in_progress: 0, not_started: 1, completed: 2 };
    const aStatus = statusOrder[a.progress.status] ?? 3;
    const bStatus = statusOrder[b.progress.status] ?? 3;
    if (aStatus !== bStatus) return aStatus - bStatus;

    const aPriority = ASSIGNMENT_PRIORITY_ORDER[a.priority] ?? 100;
    const bPriority = ASSIGNMENT_PRIORITY_ORDER[b.priority] ?? 100;
    if (aPriority !== bPriority) return aPriority - bPriority;

    const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '');
    const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '');
    return bTime - aTime;
  });
};

export const buildKangurAssignmentListItems = (
  basePath: string,
  assignments: KangurAssignmentSnapshot[],
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentListItem[] => {
  return assignments.map((assignment) =>
    buildKangurAssignmentListItem(basePath, assignment, localizer)
  );
};

export const filterKangurAssignmentsBySubject = (
  assignments: KangurAssignmentSnapshot[],
  subject: string
): KangurAssignmentSnapshot[] => {
  return assignments.filter((assignment) => {
    if (assignment.target.type === 'lesson') {
      const lesson = KANGUR_LESSON_LIBRARY.find(
        (l) => l.componentId === assignment.target.lessonComponentId
      );
      return lesson?.subject === subject;
    }
    return false;
  });
};

export const selectKangurPriorityAssignments = (
  assignments: KangurAssignmentSnapshot[],
  limit: number
): KangurAssignmentSnapshot[] => {
  return sortKangurAssignments(assignments).slice(0, limit);
};


export const mapKangurPracticeAssignmentsByOperation = (
  assignments: KangurAssignmentSnapshot[]
): Record<string, KangurAssignmentSnapshot[]> => {
  const mapped: Record<string, KangurAssignmentSnapshot[]> = {};

  for (const assignment of assignments) {
    if (assignment.target.type === 'practice') {
      const operation = assignment.target.operation;
      if (!mapped[operation]) {
        mapped[operation] = [];
      }
      mapped[operation].push(assignment);
    }
  }

  return mapped;
};

export const selectKangurPracticeAssignmentForScreen = (
  assignments: KangurAssignmentSnapshot[],
  screen: string | null,
  operation: string | null
): KangurAssignmentSnapshot | null => {
  if (!operation || screen !== 'training') {
    return null;
  }

  const filtered = assignments.filter(
    (a) =>
      a.target.type === 'practice' &&
      a.target.operation === operation &&
      a.progress.status !== 'completed'
  );

  return filtered.length > 0 ? filtered[0] : null;
};

export const selectKangurResultPracticeAssignment = (
  assignments: KangurAssignmentSnapshot[],
  operation: string
): KangurAssignmentSnapshot | null => {
  const filtered = assignments.filter(
    (a) =>
      a.target.type === 'practice' &&
      a.target.operation === operation
  );

  return filtered.length > 0 ? filtered[0] : null;
};

export const parseKangurMixedTrainingQuickStartParams = (
  params: Record<string, string | string[] | undefined>,
  _basePath: string
): { operation: string; quickStart: string } | null => {
  const quickStart = params['quickStart'] as string | undefined;
  
  if (quickStart === 'training') {
    const categories = (params['categories'] as string | undefined)?.split(',');
    if (categories && categories.length > 0) {
      return {
        operation: 'mixed',
        quickStart: 'training',
      };
    }
  }

  return null;
};
