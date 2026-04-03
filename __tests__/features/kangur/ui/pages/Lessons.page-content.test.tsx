/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextIntlClientProvider } from 'next-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import plMessages from '@/i18n/messages/pl.json';

import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import Lessons from '@/features/kangur/ui/pages/Lessons';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

// --- Shared State ---
const lessonsTestHoisted = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
  },
  lessons: [] as any[],
  lessonSections: [] as any[],
  lessonDocuments: {} as Record<string, any>,
  auth: {
    user: null,
    canAccessParentAssignments: false,
    navigateToLogin: vi.fn(),
    logout: vi.fn(),
  } as any,
  assignments: [] as any[],
  progress: {
    lessonMastery: {},
  } as any,
  routerPushMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
  isAssignmentsReady: true,
}));

// --- Mocks ---
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
  function MockLegacyLesson({ onReady }: { onReady?: () => void }): React.JSX.Element {
    React.useEffect(() => {
      onReady?.();
    }, [onReady]);

    return (
      <div data-testid='legacy-lesson'>
        <div>Legacy lesson renderer</div>
        <button type='button' onClick={vi.fn()}>
          Open secret lesson
        </button>
      </div>
    );
  }

  return {
    LESSON_COMPONENTS: {
      adding: MockLegacyLesson,
      clock: MockLegacyLesson,
    },
  };
});

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/ui/pages/lessons/LazyActiveLessonView', () => ({
  LazyActiveLessonView: ({ snapshot }: any) => (
    <div data-testid='active-lesson-view'>
      <h2 data-testid='active-lesson-title'>{snapshot?.activeLesson?.title}</h2>
      {snapshot?.completedActiveLessonAssignment ? (
        <div data-testid='active-lesson-parent-completed-chip'>Ukończone dla rodzica</div>
      ) : null}
      {snapshot?.lessonDocument ? (
        <div data-testid='lesson-document-renderer'>Document blocks: {snapshot.lessonDocument.blocks?.length ?? 0}</div>
      ) : null}
      <div data-testid='mongo-assignment-title'>{snapshot?.activeLessonAssignmentContent?.title}</div>
    </div>
  ),
  prefetchActiveLessonView: vi.fn(),
}));

vi.mock('@/features/kangur/ui/pages/lessons/LazyLessonsDeferredEnhancements', () => ({
  LazyLessonsDeferredEnhancements: () => null,
}));

vi.mock('@/features/kangur/ui/components/LazyKangurLessonsWordmark', () => ({
  LazyKangurLessonsWordmark: (props: any) => (
    <div data-testid={props['data-testid'] || 'kangur-lessons-heading-art'} />
  ),
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, variants, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    button: ({ children, ...props }: any) => {
      const { initial, animate, exit, transition, variants, ...rest } = props;
      return <button {...rest}>{children}</button>;
    },
  },
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => lessonsTestHoisted.settingsStoreMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => false,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => lessonsTestHoisted.auth,
  useOptionalKangurAuth: () => lessonsTestHoisted.auth,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => ({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: 'learner-1',
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    setAgeGroup: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: (options: any) => {
    const enabled = options?.enabled ?? true;
    const assignments = enabled ? lessonsTestHoisted.assignments : [];
    return {
      assignments,
      data: assignments,
      isLoading: false,
      isPending: false,
      isAssignmentsReady: lessonsTestHoisted.isAssignmentsReady,
      error: null,
      refresh: vi.fn(),
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: () => {
    return {
      data: lessonsTestHoisted.lessons,
      isLoading: false,
      isPending: false,
      isFetching: false,
      error: null,
      refresh: vi.fn(),
      refetch: vi.fn(),
    };
  },
  useKangurLessonDocuments: () => ({
    data: lessonsTestHoisted.lessonDocuments,
    isLoading: false,
    error: null,
  }),
  useKangurLessonDocument: (id: string | null) => ({
    data: id ? (lessonsTestHoisted.lessonDocuments[id] ?? null) : null,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonSections', () => ({
  useKangurLessonSections: () => ({
    data: lessonsTestHoisted.lessonSections,
    isLoading: false,
    isPending: false,
    isFetching: false,
    isPlaceholderData: false,
    error: null,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonsCatalog', () => ({
  useKangurLessonsCatalog: () => {
    return {
      data: {
        lessons: lessonsTestHoisted.lessons,
        sections: lessonsTestHoisted.lessonSections,
      },
      isLoading: false,
      isPending: false,
      error: null,
      refresh: vi.fn(),
      refetch: vi.fn(),
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => lessonsTestHoisted.progress,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: (id: string) => lessonsTestHoisted.useKangurPageContentEntryMock(id),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: () => null,
  useOptionalKangurAiTutor: () => null,
  KangurAiTutorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: () => undefined,
}));

vi.mock('@/features/kangur/ui/components/KangurProfileMenu', () => ({
  KangurProfileMenu: () => <div data-testid='kangur-profile-menu' />,
}));

vi.mock('@/features/kangur/ui/components/lesson-runtime/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: ({ document }: any) => (
    <div data-testid='lesson-document-renderer'>Document blocks: {document?.blocks?.length ?? 0}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNarrator', () => ({
  KangurLessonNarrator: () => <div data-testid='kangur-lesson-narrator' />,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplates: () => ({
    data: new Map(),
    isLoading: false,
    error: null,
  }),
  useKangurLessonTemplate: () => ({
    data: null,
    isLoading: false,
    error: null,
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

// --- JSDOM Fixes ---
if (typeof window !== 'undefined') {
  window.requestAnimationFrame = (cb) => {
    cb(performance.now());
    return 1;
  };
  window.cancelAnimationFrame = () => {};
}

// --- Test Support ---
const createLesson = (overrides: any = {}) => ({
  id: 'clock',
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

const createProgressState = (overrides: any = {}) => {
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

const renderLessonsPage = async () => {
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
  return result;
};

// --- Tests ---
describe('Lessons Page Content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lessonsTestHoisted.lessons = [];
    lessonsTestHoisted.lessonSections = [];
    lessonsTestHoisted.assignments = [];
    lessonsTestHoisted.lessonDocuments = {};
    lessonsTestHoisted.progress = createProgressState();
    lessonsTestHoisted.auth = {
      user: null,
      canAccessParentAssignments: false,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    };
    lessonsTestHoisted.isAssignmentsReady = true;
    lessonsTestHoisted.useKangurPageContentEntryMock.mockImplementation(() => ({
      entry: null,
      isLoading: false,
    }));
  });

  afterEach(() => {
    cleanup();
  });

  it('uses shared chips for lesson library assignment and mastery states', async () => {
    lessonsTestHoisted.auth = {
      user: { id: 'parent-1', activeLearner: { id: 'learner-1' } },
      canAccessParentAssignments: true,
    };
    lessonsTestHoisted.lessons = [createLesson({ id: 'clock', componentId: 'clock' })];
    lessonsTestHoisted.assignments = [
      {
        id: 'assignment-1',
        target: { type: 'lesson', lessonComponentId: 'clock' },
        progress: { status: 'in_progress' },
        priority: 'high',
      },
    ];
    lessonsTestHoisted.progress = createProgressState({
      lessonMastery: { clock: { status: 'completed', masteryPercent: 92 } },
    });

    await renderLessonsPage();

    expect(await screen.findByText(/Opanowane 92%/i)).toBeInTheDocument();
    expect(await screen.findByText(/Priorytet rodzica/i)).toBeInTheDocument();
  });

  it('shows a compact completed parent-assignment pill in the active lesson header', async () => {
    lessonsTestHoisted.auth = {
      user: { id: 'parent-1', activeLearner: { id: 'learner-1' } },
      canAccessParentAssignments: true,
    };
    lessonsTestHoisted.lessons = [
      createLesson({ id: 'clock', componentId: 'clock' }),
      createLesson({ id: 'adding', componentId: 'adding', title: 'Dodawanie' }),
    ];
    lessonsTestHoisted.assignments = [
      {
        id: 'assignment-2',
        target: { type: 'lesson', lessonComponentId: 'adding' },
        progress: { status: 'completed' },
        priority: 'medium',
      },
    ];

    await renderLessonsPage();

    const addingText = await screen.findByText('Dodawanie');
    fireEvent.click(addingText);

    expect(await screen.findByTestId('active-lesson-parent-completed-chip')).toBeInTheDocument();
    expect(await screen.findByText(/Ukończone dla rodzica/i)).toBeInTheDocument();
  });

  it('keeps the selected lesson title in the active header while still using Mongo-backed copy', async () => {
    lessonsTestHoisted.auth = {
      user: { id: 'parent-1', activeLearner: { id: 'learner-1' } },
      canAccessParentAssignments: true,
    };
    lessonsTestHoisted.lessons = [
      createLesson({ id: 'clock', title: 'Nauka zegara', contentMode: 'document' }),
    ];
    lessonsTestHoisted.assignments = [
      {
        id: 'assignment-3',
        target: { type: 'lesson', lessonComponentId: 'clock' },
        progress: { status: 'in_progress' },
        priority: 'high',
      },
    ];
    lessonsTestHoisted.lessonDocuments = {
      clock: { version: 1, blocks: [{ id: 't1', type: 'text', html: 'Mongo materiał lekcji' }] },
    };
    lessonsTestHoisted.useKangurPageContentEntryMock.mockImplementation((id: string) => {
      if (id === 'lessons-active-assignment') return { entry: { title: 'Mongo zadanie rodzica' } };
      return { entry: null };
    });

    await renderLessonsPage();

    const clockText = await screen.findByText('Nauka zegara');
    fireEvent.click(clockText);

    expect(await screen.findByTestId('active-lesson-title')).toHaveTextContent('Nauka zegara');
    expect(await screen.findByTestId('lesson-document-renderer')).toHaveTextContent('Document blocks: 1');
  });
});
