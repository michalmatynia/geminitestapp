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
import { buildKangurAssignments } from './assignments';

export * from './delegated-assignments/delegated-assignments.types';

type KangurPracticeAssignment = KangurAssignmentSnapshot & {
  target: Extract<KangurAssignmentSnapshot['target'], { type: 'practice' }>;
};

const isKangurPracticeAssignment = (
  assignment: KangurAssignmentSnapshot
): assignment is KangurPracticeAssignment => assignment.target.type === 'practice';

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
  progress: KangurProgressState,
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem[] =>
  buildKangurAssignments(progress, 3, localizer)
    .map((assignment): KangurAssignmentCatalogItem | null =>
      buildSuggestedKangurAssignmentCatalogItem(assignment, localizer)
    )
    .filter((item): item is KangurAssignmentCatalogItem => item !== null);

const resolveSuggestedAssignmentBadge = (
  localizer?: KangurAssignmentsRuntimeLocalizer
): string =>
  translateAssignmentsRuntimeWithFallback(localizer, 'suggested.badge', 'Podpowiedź');

const resolveSuggestedAssignmentKeywords = (values: unknown[]): string[] =>
  values.map((value) => String(value).toLowerCase());

const resolveSuggestedLessonGroup = (
  lessonComponentId: KangurLessonComponentId
): KangurAssignmentCatalogItem['group'] => {
  const lessonEntry = KANGUR_LESSON_LIBRARY[lessonComponentId];
  if (lessonComponentId === 'clock' || lessonComponentId === 'calendar') {
    return 'time';
  }
  if (lessonEntry?.subject === 'geometry') {
    return 'geometry';
  }
  if (lessonEntry?.subject === 'maths') {
    return 'arithmetic';
  }
  return 'logic';
};

const buildSuggestedLessonAssignmentCatalogItem = (
  assignment: ReturnType<typeof buildKangurAssignments>[number],
  lessonComponentId: KangurLessonComponentId,
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem => ({
  id: `suggested-${assignment.id}`,
  title: assignment.title,
  description: assignment.description,
  badge: resolveSuggestedAssignmentBadge(localizer),
  group: resolveSuggestedLessonGroup(lessonComponentId),
  priorityLabel: formatKangurAssignmentPriorityLabel(assignment.priority, localizer),
  createInput: {
    title: assignment.title,
    description: assignment.description,
    priority: assignment.priority,
    target: {
      type: 'lesson',
      lessonComponentId,
      requiredCompletions: 1,
    },
  },
  keywords: resolveSuggestedAssignmentKeywords([
    assignment.title,
    assignment.description,
    assignment.target,
    lessonComponentId,
  ]),
});

const buildSuggestedPracticeAssignmentCatalogItem = (
  assignment: ReturnType<typeof buildKangurAssignments>[number],
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem => ({
  id: `suggested-${assignment.id}`,
  title: assignment.title,
  description: assignment.description,
  badge: resolveSuggestedAssignmentBadge(localizer),
  group: 'practice',
  priorityLabel: formatKangurAssignmentPriorityLabel(assignment.priority, localizer),
  createInput: {
    title: assignment.title,
    description: assignment.description,
    priority: assignment.priority,
    target: {
      type: 'practice',
      operation: 'mixed',
      requiredAttempts: 1,
      minAccuracyPercent: assignment.priority === 'high' ? 80 : 70,
    },
  },
  keywords: resolveSuggestedAssignmentKeywords([
    assignment.title,
    assignment.description,
    assignment.target,
    'mixed',
    'practice',
  ]),
});

const buildSuggestedKangurAssignmentCatalogItem = (
  assignment: ReturnType<typeof buildKangurAssignments>[number],
  localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem | null => {
  if (assignment.action.page === 'Lessons' && assignment.action.query?.['focus']) {
    return buildSuggestedLessonAssignmentCatalogItem(
      assignment,
      assignment.action.query['focus'] as KangurLessonComponentId,
      localizer
    );
  }
  if (
    assignment.action.page === 'Game' &&
    assignment.action.query?.['quickStart'] === 'training'
  ) {
    return buildSuggestedPracticeAssignmentCatalogItem(assignment, localizer);
  }
  return null;
};

const TIME_PRACTICE_OPERATIONS = new Set<KangurPracticeAssignmentOperation>(['clock']);
const ARITHMETIC_PRACTICE_OPERATIONS = new Set<KangurPracticeAssignmentOperation>([
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
  'mixed',
]);
const LOGIC_PRACTICE_OPERATIONS = new Set<string>([
  'logical_thinking',
  'logical_patterns',
  'logical_classification',
  'logical_reasoning',
  'logical_analogies',
]);

const isGlobalCatalogFilter = (filter: Parameters<typeof matchesCatalogFilter>[1]): boolean =>
  filter === 'all' || filter === 'assigned' || filter === 'unassigned';

const resolveCatalogTargetInfo = (item: KangurAssignmentCatalogItem): {
  lessonComponentId: KangurLessonComponentId | null;
  operation: KangurPracticeAssignmentOperation | null;
} => ({
  lessonComponentId:
    item.createInput.target.type === 'lesson'
      ? item.createInput.target.lessonComponentId ?? null
      : null,
  operation: item.createInput.target.type === 'practice' ? item.createInput.target.operation : null,
});

const matchesTimeCatalogFilter = (
  lessonComponentId: KangurLessonComponentId | null,
  operation: KangurPracticeAssignmentOperation | null
): boolean =>
  lessonComponentId === 'clock' ||
  lessonComponentId === 'calendar' ||
  (operation !== null && TIME_PRACTICE_OPERATIONS.has(operation));

const matchesArithmeticCatalogFilter = (
  item: KangurAssignmentCatalogItem,
  operation: KangurPracticeAssignmentOperation | null
): boolean =>
  item.group === 'arithmetic' ||
  (operation !== null && ARITHMETIC_PRACTICE_OPERATIONS.has(operation));

const matchesLogicCatalogFilter = (
  item: KangurAssignmentCatalogItem,
  operation: KangurPracticeAssignmentOperation | null
): boolean =>
  item.group === 'logic' || (operation !== null && LOGIC_PRACTICE_OPERATIONS.has(operation));

const matchesCatalogFilter = (
  item: KangurAssignmentCatalogItem,
  filter:
    | 'all'
    | 'unassigned'
    | 'assigned'
    | 'time'
    | 'arithmetic'
    | 'geometry'
    | 'logic'
    | 'practice'
): boolean => {
  if (isGlobalCatalogFilter(filter)) {
    return true;
  }

  const { lessonComponentId, operation } = resolveCatalogTargetInfo(item);

  if (filter === 'practice') {
    return item.group === 'practice';
  }

  if (filter === 'time') {
    return matchesTimeCatalogFilter(lessonComponentId, operation);
  }

  if (filter === 'geometry') {
    return item.group === 'geometry';
  }

  if (filter === 'logic') {
    return matchesLogicCatalogFilter(item, operation);
  }

  if (filter === 'arithmetic') {
    return matchesArithmeticCatalogFilter(item, operation);
  }

  return true;
};

export const filterKangurAssignmentCatalog = (
  catalog: KangurAssignmentCatalogItem[],
  query: string,
  filter:
    | 'all'
    | 'unassigned'
    | 'assigned'
    | 'time'
    | 'arithmetic'
    | 'geometry'
    | 'logic'
    | 'practice'
): KangurAssignmentCatalogItem[] => {
  const normalizedQuery = query.trim().toLowerCase();
  return catalog.filter((item) => {
    if (!matchesCatalogFilter(item, filter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const searchable = [item.title, item.description, item.badge, ...item.keywords]
      .join(' ')
      .toLowerCase();
    if (!searchable.includes(normalizedQuery)) {
      return false;
    }

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
  const durationLabel = formatKangurAssignmentDurationLabel(
    { hours, minutes, roundedMinutes },
    localizer
  );

  return translateAssignmentsRuntimeWithFallback(
    localizer,
    'time.timeLimitLabel',
    'Czas na wykonanie: {label}',
    { label: durationLabel }
  );
};

const formatKangurAssignmentDurationLabel = (
  input: { hours: number; minutes: number; roundedMinutes: number },
  localizer?: KangurAssignmentsRuntimeLocalizer
): string => {
  if (input.hours > 0 && input.minutes > 0) {
    return translateAssignmentsRuntimeWithFallback(
      localizer,
      'time.hoursMinutes',
      '{hours} godz. {minutes} min',
      { hours: input.hours, minutes: input.minutes }
    );
  }
  if (input.hours > 0) {
    return translateAssignmentsRuntimeWithFallback(
      localizer,
      'time.hoursOnly',
      '{hours} godz.',
      { hours: input.hours }
    );
  }
  return translateAssignmentsRuntimeWithFallback(
    localizer,
    'time.minutesOnly',
    '{minutes} min',
    { minutes: input.roundedMinutes }
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
  if (!hasKangurAssignmentCountdown(params)) {
    return null;
  }

  const startTimestamp = Date.parse(params.timeLimitStartsAt ?? params.createdAt ?? '');
  if (!Number.isFinite(startTimestamp)) {
    return null;
  }

  const now = params.now ?? Date.now();
  const timeLimitMinutes = params.timeLimitMinutes ?? 0;
  const deadline = startTimestamp + timeLimitMinutes * 60_000;
  const remainingMs = deadline - now;

  if (remainingMs <= 0) {
    return translateAssignmentsRuntimeWithFallback(localizer, 'time.expired', 'Czas minął');
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return formatKangurAssignmentRemainingTimeLabel(
    { hours, minutes, seconds },
    localizer
  );
};

const hasKangurAssignmentCountdown = (
  params: Parameters<typeof resolveKangurAssignmentCountdownLabel>[0]
): boolean =>
  params.status !== 'completed' &&
  typeof params.timeLimitMinutes === 'number' &&
  Number.isFinite(params.timeLimitMinutes);

const formatKangurAssignmentRemainingTimeLabel = (
  input: { hours: number; minutes: number; seconds: number },
  localizer?: KangurAssignmentsRuntimeLocalizer
): string => {
  if (input.hours > 0) {
    return translateAssignmentsRuntimeWithFallback(
      localizer,
      'time.remainingHoursMinutes',
      'Pozostało: {hours} godz. {minutes} min',
      { hours: input.hours, minutes: input.minutes }
    );
  }
  if (input.minutes > 0) {
    return translateAssignmentsRuntimeWithFallback(
      localizer,
      'time.remainingMinutesSeconds',
      'Pozostało: {minutes} min {seconds} s',
      { minutes: input.minutes, seconds: input.seconds }
    );
  }
  return translateAssignmentsRuntimeWithFallback(
    localizer,
    'time.remainingSeconds',
    'Pozostało: {seconds} s',
    { seconds: input.seconds }
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
  const statusLabel = formatKangurAssignmentStatusLabel(status, localizer);
  const actionLabel = getKangurAssignmentListActionLabel(assignment, localizer);
  const icon = resolveKangurAssignmentIcon(assignment);
  const lastActivityLabel = formatKangurAssignmentLastActivityLabel(
    assignment.progress.lastActivityAt,
    localizer
  );
  const baseFields = resolveKangurAssignmentListBaseFields(assignment);

  return {
    id: assignment.id,
    title: assignment.title,
    description: baseFields.description,
    icon,
    createdAt: baseFields.createdAt,
    subject,
    subjectLabel: getKangurSubjectLabel(subject),
    subjectAccent,
    priority: assignment.priority,
    status,
    priorityLabel: formatKangurAssignmentPriorityLabel(assignment.priority, localizer),
    priorityAccent: resolveKangurAssignmentPriorityAccent(assignment.priority),
    statusLabel,
    statusAccent: resolveKangurAssignmentStatusAccent(status),
    progressPercent: baseFields.progressPercent,
    progressSummary: baseFields.progressSummary,
    progressCountLabel: `${completed}/${required}`,
    lastActivityLabel,
    timeLimitMinutes: baseFields.timeLimitMinutes,
    timeLimitStartsAt: baseFields.timeLimitStartsAt,
    timeLimitLabel: formatKangurAssignmentTimeLimitLabel(
      baseFields.timeLimitMinutes,
      localizer
    ),
    actionHref: buildKangurAssignmentHref(basePath, assignment),
    actionLabel,
    actionVariant: resolveKangurAssignmentActionVariant(assignment),
  };
};

const resolveKangurAssignmentListBaseFields = (
  assignment: KangurAssignmentSnapshot
): {
  createdAt: string;
  description: string;
  progressPercent: number;
  progressSummary: string;
  timeLimitMinutes: number | null;
  timeLimitStartsAt: string | null;
} => ({
  description: assignment.description || '',
  createdAt: assignment.createdAt || '',
  progressPercent: assignment.progress.percent ?? 0,
  progressSummary: assignment.progress.summary ?? '',
  timeLimitMinutes: assignment.timeLimitMinutes ?? null,
  timeLimitStartsAt: assignment.timeLimitStartsAt ?? null,
});

const resolveKangurAssignmentStatusKey = (
  status: KangurAssignmentSnapshot['progress']['status']
): 'new' | 'inProgress' | 'completed' => {
  if (status === 'not_started') {
    return 'new';
  }
  if (status === 'in_progress') {
    return 'inProgress';
  }
  return 'completed';
};

const formatKangurAssignmentStatusLabel = (
  status: KangurAssignmentSnapshot['progress']['status'],
  localizer?: KangurAssignmentsRuntimeLocalizer
): string =>
  translateAssignmentsRuntimeWithFallback(
    localizer,
    `status.${resolveKangurAssignmentStatusKey(status)}`,
    STATUS_FALLBACK_LABELS[status] ?? 'Nowe'
  );

const resolveKangurAssignmentStatusAccent = (
  status: KangurAssignmentSnapshot['progress']['status']
): 'emerald' | 'indigo' | 'slate' => {
  if (status === 'completed') {
    return 'emerald';
  }
  if (status === 'in_progress') {
    return 'indigo';
  }
  return 'slate';
};

const resolveKangurAssignmentIcon = (assignment: KangurAssignmentSnapshot): string => {
  if (assignment.target.type === 'lesson') {
    return '📚';
  }
  if (assignment.target.operation === 'clock') {
    return '🕐';
  }
  return '🎯';
};

const formatKangurAssignmentLastActivityLabel = (
  lastActivityAt: string | null,
  localizer?: KangurAssignmentsRuntimeLocalizer
): string | null =>
  lastActivityAt ? new Date(lastActivityAt).toLocaleDateString(localizer?.locale ?? 'pl') : null;

const getKangurAssignmentListActionLabel = (
  assignment: KangurAssignmentSnapshot,
  localizer?: KangurAssignmentsRuntimeLocalizer
): string =>
  assignment.target.type === 'lesson'
    ? translateAssignmentsRuntimeWithFallback(localizer, 'actions.openLesson', 'Otwórz lekcję')
    : translateAssignmentsRuntimeWithFallback(localizer, 'actions.trainNow', 'Trenuj teraz');

const resolveKangurAssignmentActionVariant = (
  assignment: KangurAssignmentSnapshot
): 'primary' | 'surface' => (assignment.target.type === 'lesson' ? 'primary' : 'surface');

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
): Partial<Record<KangurPracticeAssignmentOperation, KangurPracticeAssignment>> => {
  const mapped: Partial<Record<KangurPracticeAssignmentOperation, KangurPracticeAssignment>> = {};

  for (const assignment of selectKangurPriorityAssignments(assignments)) {
    if (!isKangurPracticeAssignment(assignment)) {
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
): KangurPracticeAssignment | null => {
  const mapped = mapKangurPracticeAssignmentsByOperation(assignments);

  if (screen === 'training') {
    return mapped.mixed ?? null;
  }

  if (isKangurOperationPracticeScreen(screen)) {
    return resolveOperationScreenPracticeAssignment(mapped, assignments, operation);
  }

  if (isKangurActivePracticeScreen(screen) && operation) {
    return mapped[operation] ?? null;
  }

  return null;
};

const isKangurOperationPracticeScreen = (screen: KangurGameScreen): boolean =>
  screen === 'operation';

const isKangurActivePracticeScreen = (screen: KangurGameScreen): boolean =>
  screen === 'playing' || screen === 'result';

const resolveOperationScreenPracticeAssignment = (
  mapped: Partial<Record<KangurPracticeAssignmentOperation, KangurPracticeAssignment>>,
  assignments: KangurAssignmentSnapshot[],
  operation: KangurOperation | null
): KangurPracticeAssignment | null =>
  operation ? mapped[operation] ?? null : selectFallbackOperationPracticeAssignment(assignments);

const selectFallbackOperationPracticeAssignment = (
  assignments: KangurAssignmentSnapshot[]
): KangurPracticeAssignment | null =>
  selectKangurPriorityAssignments(assignments).find(
    (assignment): assignment is KangurPracticeAssignment =>
      isKangurPracticeAssignment(assignment) && assignment.target.operation !== 'mixed'
  ) ?? null;

export const selectKangurResultPracticeAssignment = (
  assignments: KangurAssignmentSnapshot[],
  operation: KangurPracticeAssignmentOperation
): KangurPracticeAssignment | null => {
  const activeAssignment = mapKangurPracticeAssignmentsByOperation(assignments)[operation];
  if (activeAssignment) {
    return activeAssignment;
  }

  return assignments
    .filter(
      (assignment): assignment is KangurPracticeAssignment =>
        isKangurPracticeAssignment(assignment) &&
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
