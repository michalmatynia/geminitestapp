import type { TranslationValues } from 'use-intl';
import { KANGUR_LESSON_LIBRARY } from '@/features/kangur/lessons/lesson-catalog';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonSubject,
  KangurPracticeAssignmentOperation,
  KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';
import type { KangurAssignmentSnapshot } from '@kangur/platform';

import {
  type KangurAssignmentCatalogItem,
  type KangurAssignmentsRuntimeLocalizer,
} from './delegated-assignments.types';
import {
  PRACTICE_ASSIGNMENT_ITEMS,
  PRACTICE_ASSIGNMENT_RUNTIME_KEYS,
} from './delegated-assignments.constants';

export const interpolateAssignmentTemplate = (
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

export const translateAssignmentsRuntimeWithFallback = (
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

const PRIORITY_FALLBACK_LABELS: Record<KangurAssignmentSnapshot['priority'], string> = {
  high: 'Priorytet wysoki',
  medium: 'Priorytet średni',
  low: 'Priorytet niski',
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

export const formatKangurAssignmentPriorityLabel = (
  priority: KangurAssignmentSnapshot['priority'],
  localizer?: KangurAssignmentsRuntimeLocalizer
): string =>
  translateAssignmentsRuntimeWithFallback(
    localizer,
    `priority.${priority}`,
    PRIORITY_FALLBACK_LABELS[priority]
  );

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

export const resolveSuggestedLessonGroup = (
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

export const resolveAssignmentCreatedAtTimestamp = (assignment: KangurAssignmentSnapshot): number => {
  const value = assignment.updatedAt ?? assignment.createdAt;
  const parsed = Date.parse(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
};

export const resolveAssignmentProgressCount = (
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

export const formatKangurAssignmentDurationLabel = (
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

export const formatKangurAssignmentTimeLimitLabel = (
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

export const hasKangurAssignmentCountdown = (
  params: {
    status?: KangurAssignmentSnapshot['progress']['status'] | null;
    timeLimitMinutes?: number | null;
  }
): boolean =>
  params.status !== 'completed' &&
  typeof params.timeLimitMinutes === 'number' &&
  Number.isFinite(params.timeLimitMinutes);

export const resolveKangurAssignmentCountdownStartTimestamp = (
  params: {
    timeLimitStartsAt?: string | null;
    createdAt?: string | null;
  }
): number | null => {
  const timestamp = Date.parse(params.timeLimitStartsAt ?? params.createdAt ?? '');
  return Number.isFinite(timestamp) ? timestamp : null;
};

export const resolveKangurAssignmentCountdownDeadline = (
  startTimestamp: number,
  timeLimitMinutes: number
): number => startTimestamp + timeLimitMinutes * 60_000;

export const resolveKangurAssignmentRemainingTimeParts = (remainingMs: number) => {
  const totalSeconds = Math.floor(remainingMs / 1000);
  return {
    hours: Math.floor(totalSeconds / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
};

export const formatKangurAssignmentRemainingTimeLabel = (
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

export const resolveKangurAssignmentStatusKey = (
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

const STATUS_FALLBACK_LABELS: Record<string, string> = {
  completed: 'Ukończone',
  in_progress: 'W trakcie',
  not_started: 'Nowe',
};

export const formatKangurAssignmentStatusLabel = (
  status: KangurAssignmentSnapshot['progress']['status'],
  localizer?: KangurAssignmentsRuntimeLocalizer
): string =>
  translateAssignmentsRuntimeWithFallback(
    localizer,
    `status.${resolveKangurAssignmentStatusKey(status)}`,
    STATUS_FALLBACK_LABELS[status] ?? status
  );

export const resolveKangurAssignmentStatusAccent = (
  status: KangurAssignmentSnapshot['progress']['status']
): 'emerald' | 'amber' | 'sky' => {
  if (status === 'completed') {
    return 'emerald';
  }
  if (status === 'in_progress') {
    return 'amber';
  }
  return 'sky';
};

export const resolveKangurAssignmentIcon = (
  assignment: KangurAssignmentSnapshot
): string => {
  if (assignment.target.type === 'lesson') {
    const componentId = assignment.target.lessonComponentId as KangurLessonComponentId | undefined;
    if (componentId === 'clock') return '⏰';
    if (componentId === 'calendar') return '📅';
    const entry = componentId ? KANGUR_LESSON_LIBRARY[componentId] : null;
    if (entry?.subject === 'geometry') return '📐';
    return '📚';
  }
  return '🎮';
};

export const resolveKangurAssignmentActionVariant = (
  assignment: KangurAssignmentSnapshot
): 'primary' | 'surface' | 'ghost' => {
  if (assignment.progress.status === 'completed') {
    return 'ghost';
  }
  if (assignment.progress.status === 'in_progress') {
    return 'primary';
  }
  return 'surface';
};

export const formatKangurAssignmentLastActivityLabel = (
  lastActivityAt: string | null | undefined,
  localizer?: KangurAssignmentsRuntimeLocalizer
): string | null => {
  if (!lastActivityAt) {
    return null;
  }

  const date = new Date(lastActivityAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return translateAssignmentsRuntimeWithFallback(localizer, 'time.today', 'Dzisiaj');
  }
  if (diffDays === 1) {
    return translateAssignmentsRuntimeWithFallback(localizer, 'time.yesterday', 'Wczoraj');
  }
  if (diffDays < 7) {
    return translateAssignmentsRuntimeWithFallback(
      localizer,
      'time.daysAgo',
      '{days} dni temu',
      { days: diffDays }
    );
  }

  return date.toLocaleDateString();
};

export const filterKangurAssignmentCatalog = (
  catalog: KangurAssignmentCatalogItem[],
  searchTerm: string,
  filter: string
): KangurAssignmentCatalogItem[] => {
  return catalog.filter((item) => {
    const matchesSearch =
      !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keywords.some((kw) => kw.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilter = filter === 'all' ? true : item.group === filter;

    return matchesSearch && matchesFilter;
  });
};

export const buildRecommendedKangurAssignmentCatalog = (
  progress: KangurProgressState | null,
  _localizer?: KangurAssignmentsRuntimeLocalizer
): KangurAssignmentCatalogItem[] => {
  if (!progress) return [];

  const recommendedItems: KangurAssignmentCatalogItem[] = [];

  const completedLessons = new Set(
    Object.entries(progress.lessonMastery ?? {})
      .filter(([, lesson]) => lesson?.completions && lesson.completions > 0)
      .map(([lessonId]) => lessonId)
  );

  const suggestedNextLesson = Object.values(KANGUR_LESSON_LIBRARY).find(
    (lesson) => !completedLessons.has(lesson.componentId)
  );

  if (suggestedNextLesson) {
    recommendedItems.push({
      id: `lesson-${suggestedNextLesson.componentId}`,
      title: suggestedNextLesson.title || 'Następna lekcja',
      description: 'Sugerowana lekcja do ukończenia',
      badge: 'Sugerowane',
      group: 'recommended',
      priorityLabel: 'Priorytet wysoki',
      createInput: {
        title: suggestedNextLesson.title || 'Następna lekcja',
        description: 'Sugerowana lekcja do ukończenia',
        priority: 'high',
        target: {
          type: 'lesson',
          lessonComponentId: suggestedNextLesson.componentId || '',
          requiredCompletions: 1,
        },
      },
      keywords: ['sugerowane', 'następne'],
    });
  }

  return recommendedItems;
};
