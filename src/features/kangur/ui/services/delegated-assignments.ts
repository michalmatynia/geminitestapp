import {
  appendKangurUrlParams,
  getKangurPageHref as createPageUrl,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { buildKangurAssignments } from '@/features/kangur/ui/services/assignments';
import type {
  KangurLesson,
  KangurLessonComponentId,
  KangurPracticeAssignmentOperation,
} from '@/shared/contracts/kangur';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentSnapshot,
  KangurProgressState,
} from '@/features/kangur/services/ports';
import type {
  KangurDifficulty,
  KangurGameScreen,
  KangurOperation,
} from '@/features/kangur/ui/types';

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

const ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

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
    description: 'Przypisz przekrojowy trening z roznymi typami pytan.',
    badge: 'Trening',
    group: 'practice',
    priorityLabel: 'Priorytet sredni',
    createInput: {
      title: 'Trening mieszany',
      description: 'Wykonaj mieszany trening i utrzymaj regularnosc pracy.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'mixed',
        requiredAttempts: 1,
        minAccuracyPercent: 70,
      },
    },
    keywords: ['trening', 'mieszany', 'powtorka', 'priorytet'],
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
      description: 'Rozwiaz sesje dodawania i osiagnij co najmniej 80% skutecznosci.',
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
      description: 'Rozwiaz sesje odejmowania i osiagnij co najmniej 80% skutecznosci.',
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
    title: 'Trening: Mnozenie',
    description: 'Jedna sesja mnozenia z celem 80% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet wysoki',
    createInput: {
      title: 'Praktyka: Mnozenie',
      description: 'Rozwiaz sesje mnozenia i osiagnij co najmniej 80% skutecznosci.',
      priority: 'high',
      target: {
        type: 'practice',
        operation: 'multiplication',
        requiredAttempts: 1,
        minAccuracyPercent: 80,
      },
    },
    keywords: ['mnozenie', 'tabliczka', 'arytmetyka', 'trening'],
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
      description: 'Rozwiaz sesje dzielenia i osiagnij co najmniej 80% skutecznosci.',
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
    title: 'Trening: Ulamki',
    description: 'Jedna sesja ulamkow z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet sredni',
    createInput: {
      title: 'Praktyka: Ulamki',
      description: 'Rozwiaz sesje ulamkow i osiagnij co najmniej 75% skutecznosci.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'decimals',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['ulamki', 'dziesietne', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-powers',
    title: 'Trening: Potegi',
    description: 'Jedna sesja poteg z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet sredni',
    createInput: {
      title: 'Praktyka: Potegi',
      description: 'Rozwiaz sesje poteg i osiagnij co najmniej 75% skutecznosci.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'powers',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['potegi', 'wykladniki', 'arytmetyka', 'trening'],
  },
  {
    id: 'practice-roots',
    title: 'Trening: Pierwiastki',
    description: 'Jedna sesja pierwiastkow z celem 75% poprawnych odpowiedzi.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet sredni',
    createInput: {
      title: 'Praktyka: Pierwiastki',
      description: 'Rozwiaz sesje pierwiastkow i osiagnij co najmniej 75% skutecznosci.',
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
    description: 'Sesja cwiczen z odczytywaniem godzin na zegarze.',
    badge: 'Praktyka',
    group: 'practice',
    priorityLabel: 'Priorytet sredni',
    createInput: {
      title: 'Praktyka: Zegar',
      description: 'Wykonaj zegarowy trening i sprawdz odczytywanie godzin.',
      priority: 'medium',
      target: {
        type: 'practice',
        operation: 'clock',
        requiredAttempts: 1,
        minAccuracyPercent: 75,
      },
    },
    keywords: ['zegar', 'czas', 'godziny', 'trening'],
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
  if (priority === 'medium') return 'Priorytet sredni';
  return 'Priorytet niski';
};

export const buildKangurAssignmentCatalog = (
  lessons: KangurLesson[]
): KangurAssignmentCatalogItem[] => {
  const lessonItems = lessons.map((lesson): KangurAssignmentCatalogItem => {
    const group = resolveLessonGroup(lesson.componentId);
    return {
      id: `lesson-${lesson.id}`,
      title: lesson.title,
      description: `${lesson.description}. Przypisz uczniowi jedna swieza powtorke tej lekcji.`,
      badge: resolveLessonBadge(group),
      group,
      priorityLabel: 'Priorytet sredni',
      createInput: {
        title: `${lesson.emoji} ${lesson.title}`,
        description: `Powtorz lekcje "${lesson.title}" i zakoncz jedna dodatkowa sesje.`,
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
          badge: 'Podpowiedz',
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
          badge: 'Podpowiedz',
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
    return 'Otworz lekcje';
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
      return 'Mnozenie';
    case 'division':
      return 'Dzielenie';
    case 'decimals':
      return 'Ulamki';
    case 'powers':
      return 'Potegi';
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
