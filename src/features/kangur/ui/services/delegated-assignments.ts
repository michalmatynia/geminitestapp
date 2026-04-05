import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { getKangurSubjectLabel } from '@/features/kangur/lessons/lesson-catalog';
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type {
  KangurOperation,
  KangurTrainingSelection,
} from '@/features/kangur/ui/types';
import type { KangurPracticeAssignment } from '@/features/kangur/ui/context/KangurGameRuntimeContext.shared';
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
  formatKangurAssignmentPriorityLabel,
  resolveAssignmentCreatedAtTimestamp,
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

const ACTIVE_ASSIGNMENT_STATUS_ORDER: Partial<
  Record<KangurAssignmentSnapshot['progress']['status'], number>
> = {
  in_progress: 0,
  not_started: 1,
};

const isActiveKangurAssignment = (
  assignment: KangurAssignmentSnapshot
): boolean => assignment.progress.status !== 'completed';

const isKangurPracticeAssignment = (
  assignment: KangurAssignmentSnapshot
): assignment is KangurPracticeAssignment => assignment.target.type === 'practice';

const compareKangurActiveAssignments = (
  left: KangurAssignmentSnapshot,
  right: KangurAssignmentSnapshot
): number => {
  const leftPriority = ASSIGNMENT_PRIORITY_ORDER[left.priority] ?? Number.MAX_SAFE_INTEGER;
  const rightPriority = ASSIGNMENT_PRIORITY_ORDER[right.priority] ?? Number.MAX_SAFE_INTEGER;
  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftStatus =
    ACTIVE_ASSIGNMENT_STATUS_ORDER[left.progress.status] ?? Number.MAX_SAFE_INTEGER;
  const rightStatus =
    ACTIVE_ASSIGNMENT_STATUS_ORDER[right.progress.status] ?? Number.MAX_SAFE_INTEGER;
  if (leftStatus !== rightStatus) {
    return leftStatus - rightStatus;
  }

  return resolveAssignmentCreatedAtTimestamp(right) - resolveAssignmentCreatedAtTimestamp(left);
};

const selectBestActiveKangurAssignment = <TAssignment extends KangurAssignmentSnapshot>(
  assignments: TAssignment[]
): TAssignment | null =>
  [...assignments]
    .filter(isActiveKangurAssignment)
    .sort(compareKangurActiveAssignments)[0] ?? null;

export const sortKangurAssignments = <TAssignment extends KangurAssignmentSnapshot>(
  assignments: TAssignment[]
): TAssignment[] => {
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
  return assignments.filter(
    (assignment) => resolveKangurAssignmentSubject(assignment) === subject
  );
};

export const selectKangurPriorityAssignments = (
  assignments: KangurAssignmentSnapshot[],
  limit: number
): KangurAssignmentSnapshot[] => {
  return assignments
    .filter(isActiveKangurAssignment)
    .sort(compareKangurActiveAssignments)
    .slice(0, limit);
};


export const mapKangurPracticeAssignmentsByOperation = (
  assignments: KangurAssignmentSnapshot[]
): Partial<Record<KangurOperation, KangurPracticeAssignment>> => {
  const mapped: Partial<Record<KangurOperation, KangurPracticeAssignment>> = {};

  for (const assignment of assignments
    .filter(isKangurPracticeAssignment)
    .filter(isActiveKangurAssignment)
    .sort(compareKangurActiveAssignments)) {
    const operation = assignment.target.operation;
    if (!mapped[operation]) {
      mapped[operation] = assignment;
    }
  }

  return mapped;
};

export const selectKangurPracticeAssignmentForScreen = (
  assignments: KangurAssignmentSnapshot[],
  screen: string | null,
  operation: KangurOperation | null
): KangurPracticeAssignment | null => {
  if (screen === 'training') {
    return selectBestActiveKangurAssignment(
      assignments
        .filter(isKangurPracticeAssignment)
        .filter((assignment) => assignment.target.operation === 'mixed')
    );
  }

  if (screen === 'operation') {
    return selectBestActiveKangurAssignment(
      assignments
        .filter(isKangurPracticeAssignment)
        .filter((assignment) => assignment.target.operation !== 'mixed')
    );
  }

  if (!operation || screen !== 'playing') {
    return null;
  }

  return selectBestActiveKangurAssignment(
    assignments
      .filter(isKangurPracticeAssignment)
      .filter((assignment) => assignment.target.operation === operation)
  );
};

export const selectKangurResultPracticeAssignment = (
  assignments: KangurAssignmentSnapshot[],
  operation: KangurOperation
): KangurPracticeAssignment | null => {
  const matchingAssignments = assignments
    .filter(isKangurPracticeAssignment)
    .filter((assignment) => assignment.target.operation === operation);

  const activeAssignment = selectBestActiveKangurAssignment(matchingAssignments);
  if (activeAssignment) {
    return activeAssignment;
  }

  return (
    matchingAssignments
      .filter(
        (assignment): assignment is KangurPracticeAssignment =>
          assignment.progress.status === 'completed'
      )
      .sort((left, right) => {
        const leftTime = resolveAssignmentCreatedAtTimestamp({
          ...left,
          updatedAt: left.progress.completedAt ?? left.updatedAt,
        });
        const rightTime = resolveAssignmentCreatedAtTimestamp({
          ...right,
          updatedAt: right.progress.completedAt ?? right.updatedAt,
        });
        return rightTime - leftTime;
      })[0] ?? null
  );
};

export const parseKangurMixedTrainingQuickStartParams = (
  params: URLSearchParams,
  _basePath = ''
): KangurTrainingSelection | null => {
  const readParam = (key: string): string | null => {
    const directValue = params.get(key);
    if (directValue) {
      return directValue;
    }

    for (const [paramKey, value] of params.entries()) {
      if (paramKey.endsWith(`-${key}`)) {
        return value;
      }
    }

    return null;
  };

  const categoriesParam = readParam('categories');
  const countParam = readParam('count');
  const difficultyParam = readParam('difficulty');

  const categories = Array.from(
    new Set(
      (categoriesParam ?? '')
        .split(',')
        .map((category) => category.trim())
        .filter((category): category is (typeof MIXED_TRAINING_CATEGORIES)[number] =>
          MIXED_TRAINING_CATEGORIES.includes(
            category as (typeof MIXED_TRAINING_CATEGORIES)[number]
          )
        )
    )
  );
  const parsedCount = Number.parseInt(countParam ?? '', 10);
  const normalizedDifficulty = (difficultyParam ?? '').trim();

  if (!categoriesParam || categories.length === 0) {
    return null;
  }

  const requestedCategories = categoriesParam
    .split(',')
    .map((category) => category.trim())
    .filter(Boolean);
  if (requestedCategories.length !== categories.length) {
    return null;
  }

  if (!Number.isInteger(parsedCount) || parsedCount <= 0) {
    return null;
  }

  if (
    normalizedDifficulty !== 'easy' &&
    normalizedDifficulty !== 'medium' &&
    normalizedDifficulty !== 'hard'
  ) {
    return null;
  }

  return {
    categories,
    count: parsedCount,
    difficulty: normalizedDifficulty,
  };
};
