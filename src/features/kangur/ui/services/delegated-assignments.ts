'use client';

import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import type { TranslationValues } from 'use-intl';
import { KANGUR_LESSON_LIBRARY, getKangurSubjectLabel } from '@/features/kangur/lessons/lesson-catalog';
import type { KangurAssignmentSnapshot } from '@kangur/platform';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
  KangurTrainingSelection,
} from '@/features/kangur/ui/types';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonSubject,
  KangurPracticeAssignmentOperation,
  KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';

import {
  type KangurAssignmentCatalogItem,
  type KangurAssignmentListItem,
  type KangurAssignmentsRuntimeLocalizer,
} from './delegated-assignments/delegated-assignments.types';
import {
  ASSIGNMENT_PRIORITY_ORDER,
  ASSIGNMENT_SUBJECT_ACCENTS,
  PRACTICE_ASSIGNMENT_ITEMS,
  PRACTICE_ASSIGNMENT_RUNTIME_KEYS,
} from './delegated-assignments/delegated-assignments.constants';

export * from './delegated-assignments/delegated-assignments.types';

const interpolateAssignmentTemplate = (
  template: string,
  values?: TranslationValues
): string => {
  if (!values) {
    return template;
  }

  const interpolationValues: Record<string, unknown> = values;
  return template.replace(/\{(\w+)\}/g, (match: string, key: string) => {
    const value = interpolationValues[key];
    return value === undefined ? match : String(value);
  });
};

const translateAssignmentsRuntimeWithFallback = (
  localizer: KangurAssignmentsRuntimeLocalizer | undefined,
  key: string,
  fallback: string,
  values?: TranslationValues
): string => {
  const translate = localizer?.translate;
  if (!translate) {
    return interpolateAssignmentTemplate(fallback, values);
  }

  const translated = translate(key, values);
  return interpolateAssignmentTemplate(
    translated === key || translated.endsWith(`.${key}`) ? fallback : translated,
    values
  );
};

export const buildKangurAssignmentCatalog = (
  lessons: KangurLesson[],
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem[] => {
  const lessonItems: KangurAssignmentCatalogItem[] = lessons.map((lesson) => ({
    id: `lesson-${lesson.id}`,
    title: lesson.title,
    description: lesson.description || '',
    badge: 'Lekcja',
    group: lesson.subject === 'maths' ? 'arithmetic' : lesson.subject === 'geometry' ? 'geometry' : 'logic',
    priorityLabel: 'Priorytet niski',
    createInput: {
      title: lesson.title,
      description: lesson.description || '',
      priority: 'low',
      target: {
        type: 'lesson',
        lessonComponentId: lesson.componentId,
        requiredCompletions: 1,
      },
    },
    keywords: [lesson.id, lesson.componentId, lesson.subject, ...(lesson.title.toLowerCase().split(/\s+/))],
  }));

  const practiceItems: KangurAssignmentCatalogItem[] = PRACTICE_ASSIGNMENT_ITEMS.map((item) => {
    const runtimeKey = PRACTICE_ASSIGNMENT_RUNTIME_KEYS[item.id];
    if (!runtimeKey) {
      return item;
    }

    return {
      ...item,
      title: translateAssignmentsRuntimeWithFallback(
        localizer,
        `catalog.practice.${runtimeKey}.title`,
        item.title
      ),
      description: translateAssignmentsRuntimeWithFallback(
        localizer,
        `catalog.practice.${runtimeKey}.description`,
        item.description
      ),
      badge: translateAssignmentsRuntimeWithFallback(
        localizer,
        `catalog.practice.${runtimeKey}.badge`,
        item.badge
      ),
      priorityLabel: formatKangurAssignmentPriorityLabel(item.createInput.priority, localizer),
      createInput: {
        ...item.createInput,
        title: translateAssignmentsRuntimeWithFallback(
          localizer,
          `catalog.practice.${runtimeKey}.createTitle`,
          item.createInput.title
        ),
        description: translateAssignmentsRuntimeWithFallback(
          localizer,
          `catalog.practice.${runtimeKey}.createDescription`,
          item.createInput.description ?? ''
        ),
      },
    };
  });

  return [...lessonItems, ...practiceItems];
};

export const buildRecommendedKangurAssignmentCatalog = (
  _progress: KangurProgressState,
  _localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem[] => {
  // Logic to suggest assignments based on progress state
  return [];
};

export const filterKangurAssignmentCatalog = (
  catalog: KangurAssignmentCatalogItem[],
  query: string,
  _filter: 'all' | 'unassigned' | 'assigned'
): KangurAssignmentCatalogItem[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return catalog.filter((item) => {
    if (normalizedQuery && !item.keywords.some((k) => k.includes(normalizedQuery))) return false;
    return true;
  });
};

const MIXED_TRAINING_CATEGORIES: KangurOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
];

const PRACTICE_OPERATION_DIFFICULTY: Record<KangurPracticeAssignmentOperation, KangurDifficulty> = {
  addition: 'medium',
  subtraction: 'medium',
  multiplication: 'hard',
  division: 'medium',
  decimals: 'medium',
  powers: 'hard',
  roots: 'hard',
  clock: 'medium',
  mixed: 'medium',
};

const PRACTICE_OPERATION_FALLBACK_LABELS: Record<KangurPracticeAssignmentOperation, string> = {
  addition: 'Dodawanie',
  subtraction: 'Odejmowanie',
  multiplication: 'Mnożenie',
  division: 'Dzielenie',
  decimals: 'Ułamki',
  powers: 'Potęgi',
  roots: 'Pierwiastki',
  clock: 'Zegar',
  mixed: 'Trening mieszany',
};

const PRIORITY_FALLBACK_LABELS: Record<KangurAssignmentSnapshot['priority'], string> = {
  high: 'Priorytet wysoki',
  medium: 'Priorytet średni',
  low: 'Priorytet niski',
};

const STATUS_FALLBACK_LABELS: Record<string, string> = {
  completed: 'Ukończone',
  in_progress: 'W trakcie',
  not_started: 'Nowe',
};

const STATUS_SORT_ORDER: Record<string, number> = {
  in_progress: 0,
  not_started: 1,
  completed: 2,
};

const resolveAssignmentCreatedAtTimestamp = (assignment: KangurAssignmentSnapshot): number => {
  const value = assignment.updatedAt ?? assignment.createdAt;
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveAssignmentProgressCount = (
  assignment: KangurAssignmentSnapshot
): { completed: number; required: number } => {
  const completed = assignment.progress.attemptsCompleted ?? 0;
  const requiredFromProgress = assignment.progress.attemptsRequired;
  const requiredFromTarget =
    assignment.target.type === 'practice'
      ? assignment.target.requiredAttempts
      : assignment.target.requiredCompletions;

  return {
    completed,
    required: requiredFromProgress ?? requiredFromTarget ?? 1,
  };
};

const formatKangurAssignmentTimeLimitLabel = (
  timeLimitMinutes: number | null | undefined,
  localizer?: KangurAssignmentsRuntimeLocalizer
): string | null => {
  if (typeof timeLimitMinutes !== 'number' || !Number.isFinite(timeLimitMinutes)) {
    return null;
  }

  const roundedMinutes = Math.max(0, Math.round(timeLimitMinutes));
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  const durationLabel =
    hours > 0 && minutes > 0
      ? translateAssignmentsRuntimeWithFallback(
          localizer,
          'time.hoursMinutes',
          '{hours} godz. {minutes} min',
          { hours, minutes }
        )
      : hours > 0
        ? translateAssignmentsRuntimeWithFallback(
            localizer,
            'time.hoursOnly',
            '{hours} godz.',
            { hours }
          )
        : translateAssignmentsRuntimeWithFallback(
            localizer,
            'time.minutesOnly',
            '{minutes} min',
            { minutes: roundedMinutes }
          );

  return translateAssignmentsRuntimeWithFallback(
    localizer,
    'time.timeLimitLabel',
    'Czas na wykonanie: {label}',
    { label: durationLabel }
  );
};

const getKangurLessonSubjectFromAssignment = (
  assignment: KangurAssignmentSnapshot
): KangurLessonSubject => {
  if (assignment.target.type !== 'lesson') {
    return 'maths';
  }

  const componentId = assignment.target.lessonComponentId as KangurLessonComponentId | undefined;

  if (!componentId || !(componentId in KANGUR_LESSON_LIBRARY)) {
    return 'maths';
  }

  return KANGUR_LESSON_LIBRARY[componentId].subject;
};

export const resolveKangurAssignmentSubject = (
  assignment: KangurAssignmentSnapshot
): KangurLessonSubject =>
  assignment.target.type === 'lesson' ? getKangurLessonSubjectFromAssignment(assignment) : 'maths';

export const filterKangurAssignmentsBySubject = (
  assignments: KangurAssignmentSnapshot[],
  subject: KangurLessonSubject
): KangurAssignmentSnapshot[] =>
  assignments.filter((assignment) => resolveKangurAssignmentSubject(assignment) === subject);

export const resolveKangurAssignmentPriorityAccent = (
  priority: KangurAssignmentSnapshot['priority']
): 'rose' | 'amber' | 'emerald' => {
  if (priority === 'high') {
    return 'rose';
  }
  if (priority === 'medium') {
    return 'amber';
  }
  return 'emerald';
};

export const formatKangurAssignmentPriorityLabel = (
  priority: KangurAssignmentSnapshot['priority'],
  localizer?: KangurAssignmentsRuntimeLocalizer
): string =>
  translateAssignmentsRuntimeWithFallback(
    localizer,
    `priority.${priority}`,
    PRIORITY_FALLBACK_LABELS[priority]
  );

export const formatKangurAssignmentOperationLabel = (
  operation: KangurPracticeAssignmentOperation,
  localizer?: KangurAssignmentsRuntimeLocalizer
): string =>
  translateAssignmentsRuntimeWithFallback(
    localizer,
    `operations.${operation}`,
    PRACTICE_OPERATION_FALLBACK_LABELS[operation]
  );

export const getKangurAssignmentActionLabel = (
  assignment: KangurAssignmentSnapshot,
  localizer?: KangurAssignmentsRuntimeLocalizer
): string =>
  assignment.target.type === 'lesson'
    ? translateAssignmentsRuntimeWithFallback(localizer, 'actions.openLesson', 'Otwórz lekcję')
    : translateAssignmentsRuntimeWithFallback(
        localizer,
        'actions.startTraining',
        'Uruchom trening'
      );

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
  if (
    params.status === 'completed' ||
    typeof params.timeLimitMinutes !== 'number' ||
    !Number.isFinite(params.timeLimitMinutes)
  ) {
    return null;
  }

  const startTimestamp = Date.parse(params.timeLimitStartsAt ?? params.createdAt ?? '');
  if (!Number.isFinite(startTimestamp)) {
    return null;
  }

  const now = params.now ?? Date.now();
  const deadline = startTimestamp + params.timeLimitMinutes * 60_000;
  const remainingMs = deadline - now;

  if (remainingMs <= 0) {
    return translateAssignmentsRuntimeWithFallback(localizer, 'time.expired', 'Czas minął');
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return translateAssignmentsRuntimeWithFallback(
      localizer,
      'time.remainingHoursMinutes',
      'Pozostało: {hours} godz. {minutes} min',
      { hours, minutes }
    );
  }

  if (minutes > 0) {
    return translateAssignmentsRuntimeWithFallback(
      localizer,
      'time.remainingMinutesSeconds',
      'Pozostało: {minutes} min {seconds} s',
      { minutes, seconds }
    );
  }

  return translateAssignmentsRuntimeWithFallback(
    localizer,
    'time.remainingSeconds',
    'Pozostało: {seconds} s',
    { seconds }
  );
};

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
  const statusLabel = translateAssignmentsRuntimeWithFallback(
    localizer,
    `status.${status === 'not_started' ? 'new' : status === 'in_progress' ? 'inProgress' : 'completed'}`,
    STATUS_FALLBACK_LABELS[status] ?? 'Nowe'
  );
  const actionLabel =
    assignment.target.type === 'lesson'
      ? translateAssignmentsRuntimeWithFallback(
          localizer,
          'actions.openLesson',
          'Otwórz lekcję'
        )
      : translateAssignmentsRuntimeWithFallback(
          localizer,
          'actions.trainNow',
          'Trenuj teraz'
        );

  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description || '',
    icon:
      assignment.target.type === 'lesson'
        ? '📚'
        : assignment.target.operation === 'clock'
          ? '🕐'
          : '🎯',
    createdAt: assignment.createdAt || '',
    subject,
    subjectLabel: getKangurSubjectLabel(subject),
    subjectAccent,
    priority: assignment.priority,
    status,
    priorityLabel: formatKangurAssignmentPriorityLabel(assignment.priority, localizer),
    priorityAccent: resolveKangurAssignmentPriorityAccent(assignment.priority),
    statusLabel,
    statusAccent:
      status === 'completed' ? 'emerald' : status === 'in_progress' ? 'indigo' : 'slate',
    progressPercent: assignment.progress.percent ?? 0,
    progressSummary: assignment.progress.summary ?? '',
    progressCountLabel: `${completed}/${required}`,
    lastActivityLabel: assignment.progress.lastActivityAt
      ? new Date(assignment.progress.lastActivityAt).toLocaleDateString(localizer?.locale ?? 'pl')
      : null,
    timeLimitMinutes: assignment.timeLimitMinutes ?? null,
    timeLimitStartsAt: assignment.timeLimitStartsAt ?? null,
    timeLimitLabel: formatKangurAssignmentTimeLimitLabel(
      assignment.timeLimitMinutes ?? null,
      localizer
    ),
    actionHref: buildKangurAssignmentHref(basePath, assignment),
    actionLabel,
    actionVariant: assignment.target.type === 'lesson' ? 'primary' : 'surface',
  };
};

export const buildKangurAssignmentListItems = (
  basePath: string,
  assignments: KangurAssignmentSnapshot[],
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentListItem[] =>
  assignments.map((assignment) => buildKangurAssignmentListItem(basePath, assignment, localizer));

export const selectKangurPriorityAssignments = (
  assignments: KangurAssignmentSnapshot[],
  limit = assignments.length
): KangurAssignmentSnapshot[] =>
  assignments
    .filter((assignment) => !assignment.archived && assignment.progress.status !== 'completed')
    .sort((left, right) => {
      const priorityDelta =
        ASSIGNMENT_PRIORITY_ORDER[left.priority] - ASSIGNMENT_PRIORITY_ORDER[right.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const statusDelta =
        (STATUS_SORT_ORDER[left.progress.status] ?? 99) -
        (STATUS_SORT_ORDER[right.progress.status] ?? 99);
      if (statusDelta !== 0) {
        return statusDelta;
      }

      return resolveAssignmentCreatedAtTimestamp(right) - resolveAssignmentCreatedAtTimestamp(left);
    })
    .slice(0, Math.max(0, limit));

export const mapKangurPracticeAssignmentsByOperation = (
  assignments: KangurAssignmentSnapshot[]
): Partial<Record<KangurPracticeAssignmentOperation, KangurAssignmentSnapshot>> => {
  const mapped: Partial<Record<KangurPracticeAssignmentOperation, KangurAssignmentSnapshot>> = {};

  for (const assignment of selectKangurPriorityAssignments(assignments)) {
    if (assignment.target.type !== 'practice') {
      continue;
    }

    if (!mapped[assignment.target.operation]) {
      mapped[assignment.target.operation] = assignment;
    }
  }

  return mapped;
};

export const selectKangurPracticeAssignmentForScreen = (
  assignments: KangurAssignmentSnapshot[],
  screen: KangurGameScreen,
  operation: KangurOperation | null
): KangurAssignmentSnapshot | null => {
  const mapped = mapKangurPracticeAssignmentsByOperation(assignments);

  if (screen === 'training') {
    return mapped.mixed ?? null;
  }

  if (screen === 'operation') {
    if (operation) {
      return mapped[operation] ?? null;
    }

    return (
      selectKangurPriorityAssignments(assignments).find(
        (assignment) =>
          assignment.target.type === 'practice' && assignment.target.operation !== 'mixed'
      ) ?? null
    );
  }

  if ((screen === 'playing' || screen === 'result') && operation) {
    return mapped[operation] ?? null;
  }

  return null;
};

export const selectKangurResultPracticeAssignment = (
  assignments: KangurAssignmentSnapshot[],
  operation: KangurPracticeAssignmentOperation
): KangurAssignmentSnapshot | null => {
  const activeAssignment = mapKangurPracticeAssignmentsByOperation(assignments)[operation];
  if (activeAssignment) {
    return activeAssignment;
  }

  return assignments
    .filter(
      (assignment) =>
        assignment.target.type === 'practice' &&
        assignment.target.operation === operation &&
        assignment.progress.status === 'completed'
    )
    .sort((left, right) => resolveAssignmentCreatedAtTimestamp(right) - resolveAssignmentCreatedAtTimestamp(left))[0] ?? null;
};

export const parseKangurMixedTrainingQuickStartParams = (
  searchParams: URLSearchParams,
  basePath?: string | null
): KangurTrainingSelection | null => {
  const categoriesValue = readKangurUrlParam(searchParams, 'categories', basePath);
  const countValue = readKangurUrlParam(searchParams, 'count', basePath);
  const difficultyValue = readKangurUrlParam(searchParams, 'difficulty', basePath);

  if (!categoriesValue || !countValue || !difficultyValue) {
    return null;
  }

  const categories = categoriesValue
    .split(',')
    .map((value) => value.trim())
    .filter(
      (value): value is KangurOperation =>
        value.length > 0 &&
        value !== 'mixed' &&
        value in PRACTICE_OPERATION_DIFFICULTY
    );
  const count = Number.parseInt(countValue, 10);

  if (
    categories.length === 0 ||
    !Number.isFinite(count) ||
    count <= 0 ||
    !['easy', 'medium', 'hard'].includes(difficultyValue)
  ) {
    return null;
  }

  return {
    categories,
    count,
    difficulty: difficultyValue as KangurDifficulty,
  };
};
