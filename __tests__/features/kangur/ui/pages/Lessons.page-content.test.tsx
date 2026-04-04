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
  auth: {
    user: null,
    canAccessParentAssignments: false,
    navigateToLogin: vi.fn(),
    logout: vi.fn(),
  } as any,
  lessons: [] as any[],
  assignments: [] as any[],
  progress: {
    lessonMastery: {},
  } as any,
  lessonDocuments: {} as Record<string, any>,
  activeLessonId: null as string | null,
}));

// --- Simplified Mocks ---
vi.mock('@/features/kangur/ui/pages/lessons/LessonsContext', () => ({
  LessonsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useLessons: () => ({
    auth: lessonsTestHoisted.auth,
    basePath: '/kangur',
    activeLesson: lessonsTestHoisted.lessons.find(l => l.id === lessonsTestHoisted.activeLessonId) || null,
    activeLessonId: lessonsTestHoisted.activeLessonId,
    lessonAssignmentsByComponent: new Map(
      lessonsTestHoisted.assignments
        .filter(a => a.target.type === 'lesson' && a.progress.status !== 'completed')
        .map(a => [a.target.lessonComponentId, a])
    ),
    completedLessonAssignmentsByComponent: new Map(
      lessonsTestHoisted.assignments
        .filter(a => a.target.type === 'lesson' && a.progress.status === 'completed')
        .map(a => [a.target.lessonComponentId, a])
    ),
    orderedLessons: lessonsTestHoisted.lessons,
    isCompleteLessonsCatalogLoaded: true,
    isSecretLessonActive: false,
    progress: lessonsTestHoisted.progress,
    lessonDocuments: lessonsTestHoisted.lessonDocuments,
    isLessonSectionsLoading: false,
    shouldShowLessonsCatalogSkeleton: false,
    lessonDocument: lessonsTestHoisted.activeLessonId ? (lessonsTestHoisted.lessonDocuments[lessonsTestHoisted.activeLessonId] || null) : null,
    activeLessonAssignmentContent: null,
    handleSelectLesson: (id: string | null) => {
      lessonsTestHoisted.activeLessonId = id;
    },
    isDeferredContentReady: true,
    isLessonsPageReady: true,
    handleGoBack: vi.fn(),
    ensureLessonsCatalogLoaded: vi.fn(),
    isLessonsCatalogLoading: false,
    lessonSections: [],
    lessonTemplateMap: new Map(),
    guestPlayerName: '',
    setGuestPlayerName: vi.fn(),
    isActiveLessonComponentReady: true,
    setIsActiveLessonComponentReady: vi.fn(),
    activeLessonNavigationRef: { current: null },
    activeLessonHeaderRef: { current: null },
    activeLessonContentRef: { current: null },
    activeLessonScrollRef: { current: null },
  }),
}));

vi.mock('@/features/kangur/routing/hooks/useKangurRouteTransitionState', () => ({
  useOptionalKangurRouteTransitionState: () => ({
    transitionPhase: 'idle',
    activeTransitionPageKey: 'Lessons',
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionState: () => ({
    transitionPhase: 'idle',
    activeTransitionPageKey: 'Lessons',
  }),
  useOptionalKangurRouteTransitionActions: () => ({
    startTransition: vi.fn(),
    completeTransition: vi.fn(),
    abortTransition: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => false,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  KangurSubjectFocusProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useKangurSubjectFocus: () => ({
    subject: 'maths',
    subjectKey: null,
    setSubject: vi.fn(),
  }),
  useKangurSubjectFocusState: () => ({
    subject: 'maths',
    subjectKey: null,
  }),
  useOptionalKangurSubjectFocusState: () => ({
    subject: 'maths',
    subjectKey: null,
  }),
  useKangurSubjectFocusActions: () => ({
    setSubject: vi.fn(),
  }),
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
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/kangur/lessons',
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <KangurGuestPlayerProvider>
          <Lessons />
        </KangurGuestPlayerProvider>
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
};

// --- Tests ---
describe('Lessons Page Content', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lessonsTestHoisted.lessons = [];
    lessonsTestHoisted.assignments = [];
    lessonsTestHoisted.lessonDocuments = {};
    lessonsTestHoisted.progress = createProgressState();
    lessonsTestHoisted.auth = {
      user: null,
      canAccessParentAssignments: false,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    };
    lessonsTestHoisted.activeLessonId = null;
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
    expect(await screen.findByTestId('lesson-library-footer-assignment-chip')).toBeInTheDocument();
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

    await renderLessonsPage();

    const clockText = await screen.findByText('Nauka zegara');
    fireEvent.click(clockText);
    
    expect(await screen.findByTestId('active-lesson-title')).toHaveTextContent('Nauka zegara');
    expect(await screen.findByText(/Document blocks: 1/i)).toBeInTheDocument();
  });
});
