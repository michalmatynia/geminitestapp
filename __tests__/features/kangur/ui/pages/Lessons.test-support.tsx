import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';
import { KANGUR_HELP_SETTINGS_KEY } from '@/features/kangur/settings';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import Lessons from '@/features/kangur/ui/pages/Lessons';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

const lessonsTestHoisted = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  lessonsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  lessonDocumentsState: {
    value: {} as Record<string, unknown>,
  },
  authState: {
    value: {
      user: null,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    },
  },
  assignmentsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  progressState: {
    value: {
      lessonMastery: {},
    },
  },
  routerPushMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

export const settingsStoreMock = lessonsTestHoisted.settingsStoreMock;
export const lessonsState = lessonsTestHoisted.lessonsState;
export const lessonDocumentsState = lessonsTestHoisted.lessonDocumentsState;
export const authState = lessonsTestHoisted.authState;
export const assignmentsState = lessonsTestHoisted.assignmentsState;
export const progressState = lessonsTestHoisted.progressState;
export const routerPushMock = lessonsTestHoisted.routerPushMock;
export const useKangurPageContentEntryMock =
  lessonsTestHoisted.useKangurPageContentEntryMock;

const lessonsFocusHoisted = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));
export const useKangurSubjectFocusMock = lessonsFocusHoisted.useKangurSubjectFocusMock;

const lessonsAgeGroupHoisted = vi.hoisted(() => ({
  useKangurAgeGroupFocusMock: vi.fn(),
}));
export const useKangurAgeGroupFocusMock =
  lessonsAgeGroupHoisted.useKangurAgeGroupFocusMock;

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: lessonsTestHoisted.routerPushMock,
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/kangur/lessons',
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useParams: vi.fn(() => ({})),
  useSelectedLayoutSegment: vi.fn(() => null),
  useSelectedLayoutSegments: vi.fn(() => []),
  redirect: vi.fn(),
  notFound: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock('@/features/kangur/lessons/lesson-ui-registry', async () => {
  const lessonNavigation = await import(
    '@/features/kangur/ui/context/KangurLessonNavigationContext'
  );

  function MockLegacyLesson({
    onReady,
  }: {
    onReady?: () => void;
  }): React.JSX.Element {
    const secretLessonPill = lessonNavigation.useKangurLessonSecretPill();

    React.useEffect(() => {
      onReady?.();
    }, [onReady]);

    return (
      <div data-testid='legacy-lesson'>
        <div>Legacy lesson renderer</div>
        {secretLessonPill?.isUnlocked ? (
          <button type='button' onClick={secretLessonPill.onOpen}>
            Open secret lesson
          </button>
        ) : null}
      </div>
    );
  }

  return {
    LESSON_COMPONENTS: {
      adding: MockLegacyLesson,
      calendar: MockLegacyLesson,
      clock: MockLegacyLesson,
      english_basics: MockLegacyLesson,
      geometry_shapes: MockLegacyLesson,
      logical_patterns: MockLegacyLesson,
    },
  };
});

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    prefetch: _prefetch,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    scroll?: boolean;
    prefetch?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/ui/pages/lessons/LazyActiveLessonView', async () => {
  const actual = await import('@/features/kangur/ui/pages/lessons/Lessons.ActiveLesson');
  const { prefetchActiveLessonView } = await import('@/features/kangur/ui/pages/lessons/LazyActiveLessonView');
  return {
    LazyActiveLessonView: actual.ActiveLessonView,
    prefetchActiveLessonView,
  };
});

vi.mock('@/features/kangur/ui/pages/lessons/LazyLessonsDeferredEnhancements', () => ({
  LazyLessonsDeferredEnhancements: () => null,
}));

vi.mock('@/features/kangur/ui/components/LazyKangurLessonsWordmark', () => ({
  LazyKangurLessonsWordmark: () => <div data-testid='kangur-lessons-heading-art' />,
}));

vi.mock('framer-motion', () => {
  const serializeMotionValue = (value: unknown): string | undefined =>
    value === undefined ? undefined : JSON.stringify(value);

  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) =>
    function MotionTag({
      children,
      initial,
      animate,
      exit,
      transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }): React.JSX.Element {
      return React.createElement(
        tag,
        {
          ...props,
          'data-motion-initial': serializeMotionValue(initial),
          'data-motion-animate': serializeMotionValue(animate),
          'data-motion-exit': serializeMotionValue(exit),
          'data-motion-transition': serializeMotionValue(transition),
        },
        children
      );
    };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useReducedMotion: () => false,
    motion: {
      div: createMotionTag('div'),
      button: createMotionTag('button'),
    },
  };
});

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => lessonsTestHoisted.settingsStoreMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => lessonsTestHoisted.authState.value,
  useOptionalKangurAuth: () => lessonsTestHoisted.authState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => lessonsFocusHoisted.useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => lessonsAgeGroupHoisted.useKangurAgeGroupFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: ({ enabled = true }: { enabled?: boolean } = {}) => ({
    assignments: enabled ? lessonsTestHoisted.assignmentsState.value : [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createAssignment: vi.fn(),
    updateAssignment: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => ({
    data: lessonsTestHoisted.lessonsState.value,
    isLoading: false,
    isPlaceholderData: false,
    error: null,
    refresh: vi.fn(),
    refetch: vi.fn(),
  }),
  useKangurLessonDocuments: () => ({
    data: lessonsTestHoisted.lessonDocumentsState.value,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    refetch: vi.fn(),
  }),
  useKangurLessonDocument: (lessonId: string | null) => ({
    data:
      lessonId && typeof lessonsTestHoisted.lessonDocumentsState.value === 'object'
        ? (lessonsTestHoisted.lessonDocumentsState.value[lessonId] ?? null)
        : null,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonsCatalog', () => ({
  useKangurLessonsCatalog: (
    options: {
      ageGroup?: string;
      enabledOnly?: boolean;
      subject?: string;
    } = {}
  ) => {
    let lessons = lessonsTestHoisted.lessonsState.value;
    if (options.enabledOnly) {
      lessons = lessons.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      lessons = lessons.filter((lesson) => (lesson.subject ?? 'maths') === options.subject);
    }
    if (options.ageGroup) {
      lessons = lessons.filter((lesson) => lesson.ageGroup === options.ageGroup);
    }

    const deduped = new Map<string, Record<string, unknown>>();
    lessons.forEach((lesson) => {
      const componentId = String(lesson.componentId ?? lesson.id ?? '');
      if (!deduped.has(componentId)) {
        deduped.set(componentId, lesson);
      }
    });

    return {
      data: {
        lessons: Array.from(deduped.values()),
        sections: [],
      },
      isLoading: false,
      isPending: false,
      isFetching: false,
      isRefetching: false,
      isPlaceholderData: false,
      error: null,
      refresh: vi.fn(),
      refetch: vi.fn(),
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplates: () => ({
    data: [],
    isLoading: false,
    isPending: false,
    isFetching: false,
    error: null,
  }),
  useKangurLessonTemplate: () => ({
    data: null,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isRefetching: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonSections', () => ({
  useKangurLessonSections: () => ({
    data: [],
    isLoading: false,
    isPending: false,
    isFetching: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => lessonsTestHoisted.progressState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: () => null,
  useOptionalKangurAiTutor: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: () => undefined,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: lessonsTestHoisted.useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/components/KangurProfileMenu', () => ({
  KangurProfileMenu: () => <div data-testid='kangur-profile-menu' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: ({ document }: { document: { blocks: Array<unknown> } }) => (
    <div data-testid='lesson-document-renderer'>Document blocks: {document.blocks.length}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: () => <div data-testid='kangur-lesson-narrator' />,
}));

afterEach(() => {
  cleanup();
});

export const renderLessonsPage = async () => {
  const result = render(
    <KangurGuestPlayerProvider>
      <Lessons />
    </KangurGuestPlayerProvider>
  );
  await screen.findByTestId('lessons-list-transition');
  return result;
};

export const createLesson = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'kangur-lesson-clock',
  componentId: 'clock',
  subject: 'maths',
  ageGroup: DEFAULT_KANGUR_AGE_GROUP,
  contentMode: 'component',
  title: 'Nauka zegara',
  description: 'Odczytuj godziny',
  emoji: '🕐',
  color: 'kangur-gradient-accent-indigo-reverse',
  activeBg: 'bg-indigo-500',
  sortOrder: 1000,
  enabled: true,
  ...overrides,
});

export const createProgressState = (
  overrides: Partial<ReturnType<typeof createDefaultKangurProgressState>> = {}
) => {
  const base = createDefaultKangurProgressState();
  return {
    ...base,
    ...overrides,
    lessonMastery: {
      ...base.lessonMastery,
      ...(overrides.lessonMastery ?? {}),
    },
  };
};

export const setLessonState = ({
  lessons,
  documents,
  helpSettings,
}: {
  lessons: Array<Record<string, unknown>>;
  documents?: Record<string, unknown>;
  helpSettings?: Record<string, unknown>;
}): void => {
  lessonsState.value = lessons;
  lessonDocumentsState.value = documents ?? {};
  settingsStoreMock.get.mockImplementation((key: string) => {
    if (key === KANGUR_HELP_SETTINGS_KEY) {
      return helpSettings ? JSON.stringify(helpSettings) : undefined;
    }

    return undefined;
  });
};

export const resetLessonsTestState = (): void => {
  vi.clearAllMocks();
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
    callback(0);
    return 1;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
  assignmentsState.value = [];
  progressState.value = createProgressState();
  lessonsState.value = [];
  lessonDocumentsState.value = {};
  authState.value = {
    user: null,
    canAccessParentAssignments: false,
    navigateToLogin: vi.fn(),
    logout: vi.fn(),
  };
  useKangurSubjectFocusMock.mockReturnValue({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  });
  useKangurAgeGroupFocusMock.mockReturnValue({
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    setAgeGroup: vi.fn(),
  });
  useKangurPageContentEntryMock.mockImplementation(() => ({
    entry: null,
    data: undefined,
    isLoading: false,
    isError: false,
    error: null,
  }));
};
