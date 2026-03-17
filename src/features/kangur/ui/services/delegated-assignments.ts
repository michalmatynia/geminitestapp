import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { KANGUR_LESSON_LIBRARY, getKangurSubjectLabel } from '@/features/kangur/lessons/lesson-catalog';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentSnapshot,
} from '@/features/kangur/services/ports';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import { buildKangurAssignments } from '@/features/kangur/ui/services/assignments';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
} from '@/features/kangur/ui/types';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurLessonSubject,
  KangurPracticeAssignmentOperation,
  KangurProgressState,
} from '@/features/kangur/shared/contracts/kangur';

type KangurAssignmentCatalogGroup = 'time' | 'arithmetic' | 'geometry' | 'logic' | 'practice';

export type KangurAssignmentCatalogItem = {
  id: string;
  title: string;
  description: string;
  badge: string;
  group: KangurAssignmentCatalogGroup;
  priorityLabel: string;
  createInput: KangurAssignmentCreateInput;
  keywords: string[];
};

export type KangurAssignmentListItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  createdAt: string;
  subject: KangurLessonSubject;
  subjectLabel: string;
  subjectAccent: KangurAccent;
  priority: KangurAssignmentSnapshot['priority'];
  status: KangurAssignmentSnapshot['progress']['status'];
  priorityLabel: string;
  priorityAccent: 'rose' | 'amber' | 'emerald';
  statusLabel: string;
  statusAccent: 'slate' | 'indigo' | 'emerald';
  progressPercent: number;
  progressSummary: string;
  progressCountLabel: string;
  lastActivityLabel: string | null;
  timeLimitMinutes: number | null;
  timeLimitStartsAt: string | null;
  timeLimitLabel: string | null;
  actionHref: string;
  actionLabel: string;
  actionVariant: 'primary' | 'surface';
};

const ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const ASSIGNMENT_SUBJECT_ACCENTS: Record<KangurLessonSubject, KangurAccent> = {
  alphabet: 'amber',
  geometry: 'emerald',
  english: 'sky',
  maths: 'violet',
  web_development: 'teal',
};

const MIXED_TRAINING_PRESET_CATEGORIES: KangurOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
  'decimals',
  'powers',
  'roots',
];
const MIXED_TRAINING_PRESET_COUNTS = [5, 10, 15, 20, 30] as const;
const DEFAULT_MIXED_TRAINING_COUNT = 10;
const DEFAULT_MIXED_TRAINING_DIFFICULTY: KangurDifficulty = 'medium';

const PRACTICE_ASSIGNMENT_ITEMS: KangurAssignmentCatalogItem[] = [
  {
    id: 'practice-mixed',
    title: 'Trening mieszany',
    description: 'Przypisz przekrojowy trening z różnymi typami pytań.',
    badge: 'Trening',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Trening mieszany',
      description: 'Wykonaj mieszany trening i utrzymaj regularność pracy.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'mixed',
        requiredAttempts: 1,
        minAccuracyPercent: 70,
      },
    },
    keywords: ['trening', 'mieszany', 'powtórka', 'priorytet'],
  },
  {
    id: 'practice-addition',
    title: 'Trening: Dodawanie',
    description: 'Jedna sesja dodawania z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Dodawanie',
      description: 'Rozwiąż sesję dodawania i osiągnij co najmniej 80% skuteczności.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'addition',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['dodawanie', 'arytmetyka', 'trening', 'plus'],
  },
  {
    id: 'practice-subtraction',
    title: 'Trening: Odejmowanie',
    description: 'Jedna sesja odejmowania z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Odejmowanie',
      description: 'Rozwiąż sesję odejmowania i osiągnij co najmniej 80% skuteczności.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'subtraction',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['odejmowanie', 'arytmetyka', 'trening', 'minus'],
  },
  {
    id: 'practice-multiplication',
    title: 'Trening: Mnożenie',
    description: 'Jedna sesja mnożenia z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Mnożenie',
      description: 'Rozwiąż sesję mnożenia i osiągnij co najmniej 80% skuteczności.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'multiplication',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['mnożenie', 'tabliczka', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-division',
    title: 'Trening: Dzielenie',
    description: 'Jedna sesja dzielenia z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Dzielenie',
      description: 'Rozwiąż sesję dzielenia i osiągnij co najmniej 80% skuteczności.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'division',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['dzielenie', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-decimals',
    title: 'Trening: Ułamki',
    description: 'Jedna sesja ułamków z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Praktyka: Ułamki',
      description: 'Rozwiąż sesję ułamków i osiągnij co najmniej 75% skuteczności.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'decimals',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['ułamki', 'dziesiętne', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-powers',
    title: 'Trening: Potęgi',
    description: 'Jedna sesja potęg z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Praktyka: Potęgi',
      description: 'Rozwiąż sesję potęg i osiągnij co najmniej 75% skuteczności.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'powers',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['potęgi', 'wykładniki', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-roots',
    title: 'Trening: Pierwiastki',
    description: 'Jedna sesja pierwiastków z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Praktyka: Pierwiastki',
      description: 'Rozwiąż sesję pierwiastków i osiągnij co najmniej 75% skuteczności.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'roots',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['pierwiastki', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-clock',
    title: 'Trening: Zegar',
    description: 'Sesja ćwiczeń z godzinami, minutami i pełnym czasem na zegarze.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet średni',
    createInput: {
      title: 'Praktyka: Zegar',
      description: 'Wykonaj zegarowy trening i sprawdź odczytywanie godzin, minut oraz pełnego czasu.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'clock',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['zegar', 'czas', 'godziny', 'minuty', 'pełny czas', 'trening'],
  },
];

const resolveLessonGroup = (componentId: KangurLessonComponentId): KangurAssignmentCatalogGroup => {
  if (componentId === 'clock' || componentId === 'calendar') {
    return 'time';
  }
  if (componentId.startsWith('geometry_')) {
    return 'geometry';
  }
  if (componentId.startsWith('logical_')) {
    return 'logic';
  }
  if (componentId.startsWith('english_')) {
    return 'logic';
  }
  return 'arithmetic';
};

const resolveLessonBadge = (group: KangurAssignmentCatalogGroup): string => {
  if (group === 'time') return 'Czas';
  if (group === 'geometry') return 'Geometria';
  if (group === 'logic') return 'Logika';
  return 'Lekcja';
};

export const formatKangurAssignmentPriorityLabel = (
  priority: KangurAssignmentCreateInput['priority']
): string => {
  if (priority === 'high') return 'Priorytet wysoki';
  if (priority === 'medium') return 'Priorytet średni';
  return 'Priorytet niski';
};

export const formatKangurAssignmentStatusLabel = (
  value: KangurAssignmentSnapshot['progress']['status']
): string => {
  if (value === 'completed') return 'Ukończone';
  if (value === 'in_progress') return 'W trakcie';
  return 'Nowe';
};

const formatKangurAssignmentTimestamp = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const formatKangurAssignmentTimeLimit = (
  value: number | null | undefined
): { minutes: number | null; label: string | null } => {
  if (value === null || value === undefined) {
    return { minutes: null, label: null };
  }

  const rounded = Math.round(value);
  if (!Number.isFinite(rounded) || rounded <= 0) {
    return { minutes: null, label: null };
  }

  const hours = Math.floor(rounded / 60);
  const minutes = rounded % 60;
  const timeLabel =
    hours > 0
      ? minutes > 0
        ? `${hours} godz. ${minutes} min`
        : `${hours} godz.`
      : `${rounded} min`;

  return {
    minutes: rounded,
    label: `Czas na wykonanie: ${timeLabel}`,
  };
};

const formatKangurAssignmentCountdown = (remainingSeconds: number): string => {
  if (remainingSeconds <= 0) {
    return 'Czas minął';
  }

  const normalized = Math.max(0, Math.round(remainingSeconds));
  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;

  if (hours > 0) {
    return `Pozostało: ${hours} godz. ${minutes} min`;
  }
  if (minutes > 0) {
    return `Pozostało: ${minutes} min ${seconds} s`;
  }
  return `Pozostało: ${seconds} s`;
};

export const resolveKangurAssignmentCountdownLabel = (input: {
  timeLimitMinutes?: number | null;
  timeLimitStartsAt?: string | null;
  createdAt: string;
  status?: KangurAssignmentSnapshot['progress']['status'] | null;
  now?: number;
}): string | null => {
  const minutes =
    typeof input.timeLimitMinutes === 'number' && Number.isFinite(input.timeLimitMinutes)
      ? input.timeLimitMinutes
      : null;
  if (!minutes || minutes <= 0) {
    return null;
  }
  if (input.status === 'completed') {
    return null;
  }

  const start = input.timeLimitStartsAt ?? input.createdAt;
  const startMs = Date.parse(start);
  if (Number.isNaN(startMs)) {
    return null;
  }

  const now = input.now ?? Date.now();
  const deadlineMs = startMs + minutes * 60 * 1000;
  const remainingSeconds = Math.ceil((deadlineMs - now) / 1000);
  return formatKangurAssignmentCountdown(remainingSeconds);
};

export const resolveKangurAssignmentPriorityAccent = (
  priority: KangurAssignmentSnapshot['priority']
): 'rose' | 'amber' | 'emerald' => {
  if (priority === 'high') return 'rose';
  if (priority === 'medium') return 'amber';
  return 'emerald';
};

const resolveKangurAssignmentStatusAccent = (
  status: KangurAssignmentSnapshot['progress']['status']
): 'slate' | 'indigo' | 'emerald' => {
  if (status === 'completed') return 'emerald';
  if (status === 'in_progress') return 'indigo';
  return 'slate';
};

export const buildKangurAssignmentListItem = (
  basePath: string,
  assignment: KangurAssignmentSnapshot
): KangurAssignmentListItem => {
  const timeLimit = formatKangurAssignmentTimeLimit(assignment.timeLimitMinutes);
  const subject = resolveKangurAssignmentSubject(assignment);

  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    icon: assignment.target.type === 'lesson' ? '📚' : '🎯',
    createdAt: assignment.createdAt,
    subject,
    subjectLabel: getKangurSubjectLabel(subject),
    subjectAccent: ASSIGNMENT_SUBJECT_ACCENTS[subject],
    priority: assignment.priority,
    status: assignment.progress.status,
    priorityLabel: formatKangurAssignmentPriorityLabel(assignment.priority),
    priorityAccent: resolveKangurAssignmentPriorityAccent(assignment.priority),
    statusLabel: formatKangurAssignmentStatusLabel(assignment.progress.status),
    statusAccent: resolveKangurAssignmentStatusAccent(assignment.progress.status),
    progressPercent: assignment.progress.percent,
    progressSummary: assignment.progress.summary,
    progressCountLabel: `${assignment.progress.attemptsCompleted}/${assignment.progress.attemptsRequired}`,
    lastActivityLabel: formatKangurAssignmentTimestamp(assignment.progress.lastActivityAt),
    timeLimitMinutes: timeLimit.minutes,
    timeLimitStartsAt: assignment.timeLimitStartsAt ?? null,
    timeLimitLabel: timeLimit.label,
    actionHref: buildKangurAssignmentHref(basePath, assignment),
    actionLabel: getKangurAssignmentActionLabel(assignment),
    actionVariant: assignment.target.type === 'lesson' ? 'primary' : 'surface',
  };
};

export const buildKangurAssignmentListItems = (
  basePath: string,
  assignments: KangurAssignmentSnapshot[]
): KangurAssignmentListItem[] =>
  assignments.map((assignment) => buildKangurAssignmentListItem(basePath, assignment));

export const buildKangurAssignmentCatalog = (
  lessons: KangurLesson[]
): KangurAssignmentCatalogItem[] => {
  const lessonItems = lessons.map((lesson): KangurAssignmentCatalogItem => {
    const group = resolveLessonGroup(lesson.componentId);
    return {
      id: `lesson-${lesson.id}`,
      title: lesson.title,
      description: `${lesson.description}. Przypisz uczniowi jedną świeżą powtórkę tej lekcji.`,
      badge: resolveLessonBadge(group),
      group,
      priorityLabel: 'Priorytet średni',
      createInput: {
        title: `${lesson.emoji} ${lesson.title}`,
        description: `Powtórz lekcję "${lesson.title}" i zakończ jedną dodatkową sesję.`,
        priority: 'medium',
        target: {
          type: 'lesson',
          lessonComponentId: lesson.componentId,
          requiredCompletions: 1,
        },
      },
      keywords: [lesson.title, lesson.description, lesson.componentId, lesson.emoji].map((value) =>
        value.toLowerCase()
      ),
    };
  });

  return [...lessonItems, ...PRACTICE_ASSIGNMENT_ITEMS];
};

export const buildRecommendedKangurAssignmentCatalog = (
  progress: KangurProgressState
): KangurAssignmentCatalogItem[] =>
  buildKangurAssignments(progress)
    .map((assignment): KangurAssignmentCatalogItem | null => {
      if (assignment.action.page === 'Lessons' && assignment.action.query?.['focus']) {
        const lessonComponentId = assignment.action.query['focus'] as KangurLessonComponentId;
        const group = resolveLessonGroup(lessonComponentId);
        return {
          id: `suggested-${assignment.id}`,
          title: assignment.title,
          description: assignment.description,
          badge: 'Podpowiedź',
          group,
          priorityLabel: formatKangurAssignmentPriorityLabel(assignment.priority),
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
          keywords: [assignment.title, assignment.description, assignment.target].map((value) =>
            value.toLowerCase()
          ),
        } satisfies KangurAssignmentCatalogItem;
      }

      if (
        assignment.action.page === 'Game' &&
        assignment.action.query?.['quickStart'] === 'training'
      ) {
        return {
          id: `suggested-${assignment.id}`,
          title: assignment.title,
          description: assignment.description,
          badge: 'Podpowiedź',
          group: 'practice',
          priorityLabel: formatKangurAssignmentPriorityLabel(assignment.priority),
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
          keywords: [assignment.title, assignment.description, assignment.target].map((value) =>
            value.toLowerCase()
          ),
        } satisfies KangurAssignmentCatalogItem;
      }

      return null;
    })
    .filter((item): item is KangurAssignmentCatalogItem => item !== null);

export const filterKangurAssignmentCatalog = (
  items: KangurAssignmentCatalogItem[],
  searchTerm: string,
  group: KangurAssignmentCatalogGroup | 'all'
): KangurAssignmentCatalogItem[] => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return items.filter((item) => {
    if (group !== 'all' && item.group !== group) {
      return false;
    }
    if (!normalizedSearch) {
      return true;
    }

    return [item.title, item.description, item.badge, ...item.keywords].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    );
  });
};

export const resolveKangurAssignmentSubject = (
  assignment: Pick<KangurAssignmentSnapshot, 'target'>
): KangurLessonSubject => {
  if (assignment.target.type === 'practice') {
    return 'maths';
  }

  const componentId = assignment.target.lessonComponentId;
  const lessonTemplate = KANGUR_LESSON_LIBRARY[componentId];
  if (lessonTemplate?.subject) {
    return lessonTemplate.subject;
  }

  if (componentId.startsWith('english_')) {
    return 'english';
  }

  return 'maths';
};

export const filterKangurAssignmentsBySubject = (
  assignments: KangurAssignmentSnapshot[],
  subject: KangurLessonSubject
): KangurAssignmentSnapshot[] =>
  assignments.filter((assignment) => resolveKangurAssignmentSubject(assignment) === subject);

export const selectKangurPriorityAssignments = (
  assignments: KangurAssignmentSnapshot[],
  limit = 3
): KangurAssignmentSnapshot[] =>
  assignments
    .filter((assignment) => !assignment.archived && assignment.progress.status !== 'completed')
    .sort((left, right) => {
      const priorityDelta =
        ASSIGNMENT_PRIORITY_ORDER[left.priority] - ASSIGNMENT_PRIORITY_ORDER[right.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const percentDelta = right.progress.percent - left.progress.percent;
      if (percentDelta !== 0) {
        return percentDelta;
      }

      return Date.parse(right.createdAt) - Date.parse(left.createdAt);
    })
    .slice(0, Math.max(1, Math.floor(limit)));

export const selectKangurPracticeAssignmentForScreen = (
  assignments: KangurAssignmentSnapshot[],
  screen: KangurGameScreen,
  operation: KangurOperation | null
): (KangurAssignmentSnapshot & { target: { type: 'practice' } }) | null => {
  const practiceAssignments = selectKangurPriorityAssignments(
    assignments,
    assignments.length
  ).filter(
    (assignment): assignment is KangurAssignmentSnapshot & { target: { type: 'practice' } } =>
      assignment.target.type === 'practice'
  );

  if (screen === 'training') {
    return (
      practiceAssignments.find((assignment) => assignment.target.operation === 'mixed') ?? null
    );
  }

  if (screen === 'operation') {
    return (
      practiceAssignments.find((assignment) => assignment.target.operation !== 'mixed') ?? null
    );
  }

  if ((screen === 'playing' || screen === 'result') && operation) {
    return (
      practiceAssignments.find((assignment) => assignment.target.operation === operation) ?? null
    );
  }

  return null;
};

export const mapKangurPracticeAssignmentsByOperation = (
  assignments: KangurAssignmentSnapshot[]
): Partial<Record<KangurOperation, KangurAssignmentSnapshot & { target: { type: 'practice' } }>> =>
  selectKangurPriorityAssignments(assignments, assignments.length)
    .filter(
      (assignment): assignment is KangurAssignmentSnapshot & { target: { type: 'practice' } } =>
        assignment.target.type === 'practice'
    )
    .reduce<
      Partial<Record<KangurOperation, KangurAssignmentSnapshot & { target: { type: 'practice' } }>>
    >((accumulator, assignment) => {
      if (!accumulator[assignment.target.operation]) {
        accumulator[assignment.target.operation] = assignment;
      }
      return accumulator;
    }, {});

export const selectKangurResultPracticeAssignment = (
  assignments: KangurAssignmentSnapshot[],
  operation: KangurOperation | null
): (KangurAssignmentSnapshot & { target: { type: 'practice' } }) | null => {
  if (!operation) {
    return null;
  }

  const matchingAssignments = assignments
    .filter((assignment) => !assignment.archived)
    .filter(
      (assignment): assignment is KangurAssignmentSnapshot & { target: { type: 'practice' } } =>
        assignment.target.type === 'practice' && assignment.target.operation === operation
    )
    .sort((left, right) => {
      const leftActive = left.progress.status === 'completed' ? 1 : 0;
      const rightActive = right.progress.status === 'completed' ? 1 : 0;
      if (leftActive !== rightActive) {
        return leftActive - rightActive;
      }

      const priorityDelta =
        ASSIGNMENT_PRIORITY_ORDER[left.priority] - ASSIGNMENT_PRIORITY_ORDER[right.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }

      const leftTimestamp =
        left.progress.status === 'completed'
          ? Date.parse(left.progress.completedAt ?? left.updatedAt)
          : Date.parse(left.updatedAt);
      const rightTimestamp =
        right.progress.status === 'completed'
          ? Date.parse(right.progress.completedAt ?? right.updatedAt)
          : Date.parse(right.updatedAt);

      return rightTimestamp - leftTimestamp;
    });

  if (matchingAssignments.length === 0) {
    return null;
  }

  const activeAssignment = matchingAssignments.find(
    (assignment) => assignment.progress.status !== 'completed'
  );
  if (activeAssignment) {
    return activeAssignment;
  }

  return matchingAssignments[0] ?? null;
};

export const buildKangurMixedTrainingQuickStartParams = (): URLSearchParams =>
  new URLSearchParams({
    quickStart: 'training',
    categories: MIXED_TRAINING_PRESET_CATEGORIES.join(','),
    count: `${DEFAULT_MIXED_TRAINING_COUNT}`,
    difficulty: DEFAULT_MIXED_TRAINING_DIFFICULTY,
  });

export const parseKangurMixedTrainingQuickStartParams = (
  searchParams: URLSearchParams,
  basePath?: string | null
): {
  categories: KangurOperation[];
  count: number;
  difficulty: KangurDifficulty;
} | null => {
  const rawCategories = readKangurUrlParam(searchParams, 'categories', basePath);
  const rawCount = readKangurUrlParam(searchParams, 'count', basePath);
  const rawDifficulty = readKangurUrlParam(searchParams, 'difficulty', basePath);

  if (!rawCategories || !rawCount || !rawDifficulty) {
    return null;
  }

  if (rawDifficulty !== 'easy' && rawDifficulty !== 'medium' && rawDifficulty !== 'hard') {
    return null;
  }

  const count = Number.parseInt(rawCount, 10);
  if (
    !MIXED_TRAINING_PRESET_COUNTS.includes(count as (typeof MIXED_TRAINING_PRESET_COUNTS)[number])
  ) {
    return null;
  }

  const categories = rawCategories
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is KangurOperation =>
      MIXED_TRAINING_PRESET_CATEGORIES.includes(value as KangurOperation)
    );

  if (categories.length === 0) {
    return null;
  }

  return {
    categories: Array.from(new Set(categories)),
    count,
    difficulty: rawDifficulty,
  };
};

export const buildKangurAssignmentHref = (
  basePath: string,
  assignment: Pick<KangurAssignmentSnapshot, 'target'>
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
      Object.fromEntries(buildKangurMixedTrainingQuickStartParams()),
      basePath
    );
  }

  return appendKangurUrlParams(
    createPageUrl('Game', basePath),
    {
      quickStart: 'operation',
      operation: assignment.target.operation,
      difficulty: 'medium',
    },
    basePath
  );
};

export const getKangurAssignmentActionLabel = (
  assignment: Pick<KangurAssignmentSnapshot, 'target'>
): string => {
  if (assignment.target.type === 'lesson') {
    return 'Otwórz lekcję';
  }
  if (assignment.target.operation === 'mixed') {
    return 'Uruchom trening';
  }
  return 'Trenuj teraz';
};

export const formatKangurAssignmentOperationLabel = (
  operation: KangurPracticeAssignmentOperation
): string => {
  switch (operation) {
    case 'addition':
      return 'Dodawanie';
    case 'subtraction':
      return 'Odejmowanie';
    case 'multiplication':
      return 'Mnożenie';
    case 'division':
      return 'Dzielenie';
    case 'decimals':
      return 'Ułamki';
    case 'powers':
      return 'Potęgi';
    case 'roots':
      return 'Pierwiastki';
    case 'clock':
      return 'Zegar';
    case 'mixed':
      return 'Trening mieszany';
    default:
      return operation;
  }
};
