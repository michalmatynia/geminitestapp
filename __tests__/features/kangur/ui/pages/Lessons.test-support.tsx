import React from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import plMessages from '@/i18n/messages/pl.json';

import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';
import { KANGUR_HELP_SETTINGS_KEY } from '@/features/kangur/settings';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import Lessons from '@/features/kangur/ui/pages/Lessons';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

const lessonsTestHoisted = vi.hoisted(() => {
  // Mock requestAnimationFrame to execute immediately
  // This prevents race conditions with async state updates in jsdom
  if (typeof window !== "undefined" && !window.requestAnimationFrame) {
    let frameId = 0;
    window.requestAnimationFrame = (callback: FrameRequestCallback) => {
      const id = ++frameId;
      Promise.resolve().then(() => callback(performance.now()));
      return id;
    };
  }

  return {
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
  lessonSectionsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  useKangurRoutingMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurProgressStateMock: vi.fn(),
  useKangurAgeGroupFocusMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  useKangurAssignmentsMock: vi.fn(),
  };
});

export const settingsStoreMock = lessonsTestHoisted.settingsStoreMock;
export const lessonsState = lessonsTestHoisted.lessonsState;
export const useKangurRoutingMock = lessonsTestHoisted.useKangurRoutingMock;
export const useKangurAuthMock = lessonsTestHoisted.useKangurAuthMock;
export const useKangurProgressStateMock = lessonsTestHoisted.useKangurProgressStateMock;
export const useKangurAgeGroupFocusMock = lessonsTestHoisted.useKangurAgeGroupFocusMock;
export const useKangurSubjectFocusMock = lessonsTestHoisted.useKangurSubjectFocusMock;
export const useKangurAssignmentsMock = lessonsTestHoisted.useKangurAssignmentsMock;
export const lessonDocumentsState = lessonsTestHoisted.lessonDocumentsState;
export const authState = lessonsTestHoisted.authState;
export const assignmentsState = lessonsTestHoisted.assignmentsState;
export const progressState = lessonsTestHoisted.progressState;
export const routerPushMock = lessonsTestHoisted.routerPushMock;
export const useKangurPageContentEntryMock =
  lessonsTestHoisted.useKangurPageContentEntryMock;
export const lessonSectionsState = lessonsTestHoisted.lessonSectionsState;

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

const KangurLessonNavigationContext = React.createContext<any>(null);

vi.mock('@/features/kangur/ui/context/KangurLessonNavigationContext', () => ({
  KangurLessonNavigationProvider: ({ children, onBack, secretLessonPill }: any) => (
    <KangurLessonNavigationContext.Provider value={{ onBack, secretLessonPill }}>
      {children}
    </KangurLessonNavigationContext.Provider>
  ),
  KangurLessonNavigationBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKangurLessonBackAction: () => {
    const ctx = React.useContext(KangurLessonNavigationContext);
    return ctx?.onBack ?? vi.fn();
  },
  useKangurLessonSubsectionNavigationActive: () => false,
  useKangurLessonSubsectionSummary: () => null,
  useKangurLessonSecretPill: () => {
    const ctx = React.useContext(KangurLessonNavigationContext);
    // During tests, if not in context, default to unlocked
    return ctx?.secretLessonPill ?? { isUnlocked: true, onOpen: vi.fn() };
  },
  useKangurLessonNavigationState: () => ({
    isSubsectionNavigationActive: false,
    subsectionSummary: null,
    secretLessonPill: null,
  }),
  useKangurLessonNavigationActions: () => ({
    registerSubsectionNavigation: () => () => undefined,
    setSubsectionSummary: vi.fn(),
  }),
  useKangurRegisterLessonSubsectionNavigation: () => () => () => undefined,
  useKangurSyncLessonSubsectionSummary: vi.fn(),
  KangurLessonSubsectionSummarySync: () => null,
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
  LazyKangurLessonsWordmark: (props: any) => (
    <div data-testid={props['data-testid'] || 'kangur-lessons-heading-art'} />
  ),
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
  useKangurAuth: () => lessonsTestHoisted.useKangurAuthMock(),
  useOptionalKangurAuth: () => lessonsTestHoisted.useKangurAuthMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => lessonsTestHoisted.useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => lessonsTestHoisted.useKangurAgeGroupFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => lessonsTestHoisted.useKangurRoutingMock(),
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: (options: { enabled?: boolean } = {}) => lessonsTestHoisted.useKangurAssignmentsMock(options),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (options: {
    enabledOnly?: boolean;
    subject?: string;
    ageGroup?: string;
    enabled?: boolean;
  } = {}) => {
    let lessons = lessonsTestHoisted.lessonsState.value;
    if (options.enabledOnly) {
      lessons = lessons.filter((lesson) => lesson.enabled !== false);
    }
    
    const filteredBySubject = options.subject 
      ? lessons.filter((lesson) => (lesson.subject ?? 'maths') === options.subject)
      : lessons;
      
    const finalLessons = options.ageGroup
      ? filteredBySubject.filter((lesson) => lesson.ageGroup === options.ageGroup)
      : filteredBySubject;

    const resultLessons = finalLessons;

    const deduped = new Map<string, Record<string, unknown>>();
    resultLessons.forEach((lesson) => {
      const componentId = String(lesson.componentId ?? lesson.id ?? '');
      if (!deduped.has(componentId)) {
        deduped.set(componentId, lesson);
      }
    });

    return {
      data: Array.from(deduped.values()),
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
  useKangurLessonDocuments: () => ({
    data: lessonsTestHoisted.lessonDocumentsState.value,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isRefetching: false,
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
    isPending: false,
    isFetching: false,
    isRefetching: false,
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
        sections: lessonsTestHoisted.lessonSectionsState.value,
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
    data: lessonsTestHoisted.lessonSectionsState.value,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isRefetching: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => lessonsTestHoisted.useKangurProgressStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: () => null,
  useOptionalKangurAiTutor: () => null,
  KangurAiTutorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

vi.mock('@/features/kangur/ui/components/lesson-runtime/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: ({ document }: { document: { blocks: Array<unknown> } }) => (
    <div data-testid='lesson-document-renderer'>Document blocks: {document.blocks.length}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: () => <div data-testid='kangur-lesson-narrator' />,
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

beforeEach(() => {
  // Use real timers to allow async effects to work properly
  vi.useRealTimers();
});

export const renderLessonsPage = async () => {
  const result = render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <KangurGuestPlayerProvider>
          <Lessons />
        </KangurGuestPlayerProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
  
  await screen.findByTestId('lessons-list-transition');
  await screen.findByTestId('kangur-lessons-heading-art');
  
  // Wait for microtasks and effects to complete
  // Effects may schedule updates via RAF which we need to wait for
  await act(async () => {
    // Flush multiple promise microtasks to ensure all effects run
    for (let i = 0; i < 20; i++) {
      await Promise.resolve();
    }
  });
  
  // Also wait one macrotask to be safe
  await new Promise(resolve => setTimeout(resolve, 100));
  
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
  sections,
}: {
  lessons: Array<Record<string, unknown>>;
  documents?: Record<string, unknown>;
  helpSettings?: Record<string, unknown>;
  sections?: Array<Record<string, unknown>>;
}): void => {
  lessonsState.value = lessons;
  lessonDocumentsState.value = documents ?? {};
  lessonSectionsState.value = sections ?? [];
  settingsStoreMock.get.mockImplementation((key: string) => {
    if (key === KANGUR_HELP_SETTINGS_KEY) {
      return helpSettings ? JSON.stringify(helpSettings) : undefined;
    }

    return undefined;
  });
};

export const resetLessonsTestState = (): void => {
  vi.clearAllMocks();
  assignmentsState.value = [];
  progressState.value = createProgressState();
  lessonsState.value = [];
  lessonSectionsState.value = [];
  lessonDocumentsState.value = {};
  authState.value = {
    user: null,
    canAccessParentAssignments: false,
    navigateToLogin: vi.fn(),
    logout: vi.fn(),
  };
  useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
  useKangurAuthMock.mockImplementation(() => authState.value);
  useKangurProgressStateMock.mockImplementation(() => progressState.value);
  useKangurSubjectFocusMock.mockImplementation(() => ({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  }));
  useKangurAgeGroupFocusMock.mockImplementation(() => ({
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    setAgeGroup: vi.fn(),
  }));
  useKangurAssignmentsMock.mockImplementation((options: { enabled?: boolean } = {}) => {
    const enabled = options.enabled ?? true;
    const assignments = enabled ? [...assignmentsState.value] : [];
    return {
      assignments,
      data: assignments,
      isLoading: false,
      isPending: false,
      isFetching: false,
      isRefetching: false,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
    };
  });
  useKangurPageContentEntryMock.mockImplementation(() => ({
    entry: null,
    data: undefined,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isRefetching: false,
    isError: false,
    error: null,
  }));
};
