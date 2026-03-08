import type {
  KangurAssignmentSnapshot,
  KangurLesson,
  KangurLessonComponentId,
  KangurProgressState,
} from '@kangur/contracts';

export type KangurPortableLesson = Pick<
  KangurLesson,
  'id' | 'componentId' | 'title' | 'description' | 'emoji' | 'sortOrder'
>;

export type KangurLessonMasteryPresentation = {
  statusLabel: string;
  summaryLabel: string;
  badgeAccent: 'slate' | 'emerald' | 'amber' | 'rose';
};

export type KangurLessonAssignmentSnapshot = KangurAssignmentSnapshot & {
  target: { type: 'lesson' };
};

const KANGUR_LESSON_SORT_ORDER_GAP = 1000;

export const KANGUR_PORTABLE_LESSONS: readonly KangurPortableLesson[] = [
  {
    id: 'kangur-lesson-clock',
    componentId: 'clock',
    title: 'Nauka zegara',
    description: 'Odczytuj godziny z zegara analogowego',
    emoji: '🕐',
    sortOrder: 1 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-calendar',
    componentId: 'calendar',
    title: 'Nauka kalendarza',
    description: 'Dni, miesiace, daty i pory roku',
    emoji: '📅',
    sortOrder: 2 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-adding',
    componentId: 'adding',
    title: 'Dodawanie',
    description: 'Jednocyfrowe, dwucyfrowe i gra z pilkami!',
    emoji: '➕',
    sortOrder: 3 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-subtracting',
    componentId: 'subtracting',
    title: 'Odejmowanie',
    description: 'Jednocyfrowe, dwucyfrowe i reszta',
    emoji: '➖',
    sortOrder: 4 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-multiplication',
    componentId: 'multiplication',
    title: 'Mnozenie',
    description: 'Tabliczka mnozenia i algorytmy',
    emoji: '✖️',
    sortOrder: 5 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-division',
    componentId: 'division',
    title: 'Dzielenie',
    description: 'Proste dzielenie i reszta z dzielenia',
    emoji: '➗',
    sortOrder: 6 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-geometry-basics',
    componentId: 'geometry_basics',
    title: 'Podstawy geometrii',
    description: 'Punkt, odcinek, bok i kat',
    emoji: '📐',
    sortOrder: 7 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-geometry-shapes',
    componentId: 'geometry_shapes',
    title: 'Figury geometryczne',
    description: 'Poznaj figury i narysuj je w grze',
    emoji: '🔷',
    sortOrder: 8 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-geometry-symmetry',
    componentId: 'geometry_symmetry',
    title: 'Symetria',
    description: 'Os symetrii i odbicia lustrzane',
    emoji: '🪞',
    sortOrder: 9 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-geometry-perimeter',
    componentId: 'geometry_perimeter',
    title: 'Obwod figur',
    description: 'Liczenie dlugosci bokow krok po kroku',
    emoji: '📏',
    sortOrder: 10 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-logical-thinking',
    componentId: 'logical_thinking',
    title: 'Myslenie logiczne',
    description: 'Wprowadzenie do wzorcow, klasyfikacji i analogii',
    emoji: '🧠',
    sortOrder: 11 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-logical-patterns',
    componentId: 'logical_patterns',
    title: 'Wzorce i ciagi',
    description: 'Odkryj zasady kryjace sie w ciagach i wzorcach',
    emoji: '🔢',
    sortOrder: 12 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-logical-classification',
    componentId: 'logical_classification',
    title: 'Klasyfikacja',
    description: 'Grupuj, sortuj i znajdz intruza',
    emoji: '📦',
    sortOrder: 13 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-logical-reasoning',
    componentId: 'logical_reasoning',
    title: 'Wnioskowanie',
    description: 'Jesli... to... - mysl krok po kroku',
    emoji: '💡',
    sortOrder: 14 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
  {
    id: 'kangur-lesson-logical-analogies',
    componentId: 'logical_analogies',
    title: 'Analogie',
    description: 'Znajdz te sama relacje w nowym kontekscie',
    emoji: '🔗',
    sortOrder: 15 * KANGUR_LESSON_SORT_ORDER_GAP,
  },
] as const;

const KANGUR_LESSON_FOCUS_TO_COMPONENT: Record<string, KangurLessonComponentId> = {
  adding: 'adding',
  addition: 'adding',
  subtracting: 'subtracting',
  subtraction: 'subtracting',
  multiplication: 'multiplication',
  division: 'division',
  clock: 'clock',
  calendar: 'calendar',
  geometry: 'geometry_shapes',
  geometry_basics: 'geometry_basics',
  geometry_shapes: 'geometry_shapes',
  geometry_symmetry: 'geometry_symmetry',
  geometry_perimeter: 'geometry_perimeter',
  logical_thinking: 'logical_thinking',
  thinking: 'logical_thinking',
  logical_patterns: 'logical_patterns',
  patterns: 'logical_patterns',
  logical_classification: 'logical_classification',
  classification: 'logical_classification',
  logical_reasoning: 'logical_reasoning',
  reasoning: 'logical_reasoning',
  logical_analogies: 'logical_analogies',
  analogies: 'logical_analogies',
  logic: 'logical_thinking',
};

const LESSON_ASSIGNMENT_PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
} as const;

const getLessonAssignmentTimestamp = (
  primaryValue: string | null,
  fallbackValue: string,
): number => {
  const primaryTimestamp = primaryValue ? Date.parse(primaryValue) : Number.NaN;
  if (!Number.isNaN(primaryTimestamp)) {
    return primaryTimestamp;
  }

  const fallbackTimestamp = Date.parse(fallbackValue);
  return Number.isNaN(fallbackTimestamp) ? 0 : fallbackTimestamp;
};

export const resolveFocusedKangurLessonId = <
  TLesson extends Pick<KangurLesson, 'id' | 'componentId' | 'title'>,
>(
  focusToken: string,
  lessons: readonly TLesson[],
): string | null => {
  const mappedComponent = KANGUR_LESSON_FOCUS_TO_COMPONENT[focusToken];
  if (mappedComponent) {
    const byComponent = lessons.find((lesson) => lesson.componentId === mappedComponent);
    if (byComponent) {
      return byComponent.id;
    }
  }

  const byId = lessons.find((lesson) => lesson.id.toLowerCase() === focusToken);
  if (byId) {
    return byId.id;
  }

  const byTitle = lessons.find((lesson) => lesson.title.toLowerCase().includes(focusToken));
  return byTitle?.id ?? null;
};

export const getKangurLessonMasteryPresentation = (
  lesson: Pick<KangurLesson, 'componentId'>,
  progress: Pick<KangurProgressState, 'lessonMastery'>,
): KangurLessonMasteryPresentation => {
  const mastery = progress.lessonMastery[lesson.componentId];
  if (!mastery) {
    return {
      statusLabel: 'Nowa',
      summaryLabel: 'Brak zapisanej praktyki',
      badgeAccent: 'slate',
    };
  }

  if (mastery.masteryPercent >= 85) {
    return {
      statusLabel: `Opanowane ${mastery.masteryPercent}%`,
      summaryLabel: `Ukonczono ${mastery.completions}x · najlepszy wynik ${mastery.bestScorePercent}%`,
      badgeAccent: 'emerald',
    };
  }

  if (mastery.masteryPercent >= 60) {
    return {
      statusLabel: `W trakcie ${mastery.masteryPercent}%`,
      summaryLabel: `Ukonczono ${mastery.completions}x · ostatni wynik ${mastery.lastScorePercent}%`,
      badgeAccent: 'amber',
    };
  }

  return {
    statusLabel: `Powtorz ${mastery.masteryPercent}%`,
    summaryLabel: `Ukonczono ${mastery.completions}x · ostatni wynik ${mastery.lastScorePercent}%`,
    badgeAccent: 'rose',
  };
};

export const buildActiveKangurLessonAssignmentsByComponent = (
  assignments: readonly KangurAssignmentSnapshot[],
): Map<KangurLessonComponentId, KangurLessonAssignmentSnapshot> => {
  const nextMap = new Map<KangurLessonComponentId, KangurLessonAssignmentSnapshot>();

  assignments
    .filter((assignment) => !assignment.archived)
    .filter((assignment) => assignment.progress.status !== 'completed')
    .filter(
      (assignment): assignment is KangurLessonAssignmentSnapshot =>
        assignment.target.type === 'lesson',
    )
    .forEach((assignment) => {
      const componentId = assignment.target.lessonComponentId;
      const existing = nextMap.get(componentId);
      if (!existing) {
        nextMap.set(componentId, assignment);
        return;
      }

      if (
        LESSON_ASSIGNMENT_PRIORITY_ORDER[assignment.priority] <
        LESSON_ASSIGNMENT_PRIORITY_ORDER[existing.priority]
      ) {
        nextMap.set(componentId, assignment);
      }
    });

  return nextMap;
};

export const buildCompletedKangurLessonAssignmentsByComponent = (
  assignments: readonly KangurAssignmentSnapshot[],
): Map<KangurLessonComponentId, KangurLessonAssignmentSnapshot> => {
  const nextMap = new Map<KangurLessonComponentId, KangurLessonAssignmentSnapshot>();

  assignments
    .filter((assignment) => !assignment.archived)
    .filter((assignment) => assignment.progress.status === 'completed')
    .filter(
      (assignment): assignment is KangurLessonAssignmentSnapshot =>
        assignment.target.type === 'lesson',
    )
    .forEach((assignment) => {
      const componentId = assignment.target.lessonComponentId;
      const existing = nextMap.get(componentId);
      if (!existing) {
        nextMap.set(componentId, assignment);
        return;
      }

      const assignmentTimestamp = getLessonAssignmentTimestamp(
        assignment.progress.completedAt,
        assignment.updatedAt,
      );
      const existingTimestamp = getLessonAssignmentTimestamp(
        existing.progress.completedAt,
        existing.updatedAt,
      );

      if (assignmentTimestamp > existingTimestamp) {
        nextMap.set(componentId, assignment);
      }
    });

  return nextMap;
};

export const orderKangurLessonsByAssignmentPriority = <
  TLesson extends Pick<KangurLesson, 'componentId' | 'sortOrder'>,
>(
  lessons: readonly TLesson[],
  activeAssignmentsByComponent: ReadonlyMap<KangurLessonComponentId, KangurLessonAssignmentSnapshot>,
): TLesson[] =>
  [...lessons].sort((left, right) => {
    const leftAssignment = activeAssignmentsByComponent.get(left.componentId);
    const rightAssignment = activeAssignmentsByComponent.get(right.componentId);

    if (leftAssignment && !rightAssignment) {
      return -1;
    }
    if (!leftAssignment && rightAssignment) {
      return 1;
    }
    if (leftAssignment && rightAssignment) {
      const priorityDelta =
        LESSON_ASSIGNMENT_PRIORITY_ORDER[leftAssignment.priority] -
        LESSON_ASSIGNMENT_PRIORITY_ORDER[rightAssignment.priority];
      if (priorityDelta !== 0) {
        return priorityDelta;
      }
    }

    return left.sortOrder - right.sortOrder;
  });
