/**
 * @vitest-environment jsdom
 */

import { act, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';

const {
  useKangurSubjectFocusMock,
  useKangurAuthMock,
  lessonCardPropsMock,
  tutorSessionSyncPropsMock,
  lessonsState,
} = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  lessonCardPropsMock: vi.fn(),
  tutorSessionSyncPropsMock: vi.fn(),
  lessonsState: {
    value: [] as Array<Record<string, unknown>>,
  },
}));

vi.mock('@/features/kangur/config/routing', () => ({
  appendKangurUrlParams: (href: string) => href,
  getKangurHomeHref: () => '/kangur',
  getKangurInternalQueryParamName: () => 'focus',
  getKangurPageHref: () => '/kangur/lessons',
  readKangurUrlParam: () => null,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  useKangurDocsTooltips: () => ({ enabled: false }),
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/ui/components/KangurActiveLessonHeader', () => ({
  KangurActiveLessonHeader: () => <div data-testid='mock-active-lesson-header' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonLibraryCard', () => ({
  KangurLessonLibraryCard: ({ lesson }: { lesson: { id: string; title: string } }) => {
    lessonCardPropsMock(lesson);
    return (
      <div data-testid={`lesson-card-${lesson.id}`}>{lesson.title}</div>
    );
  },
}));

vi.mock('@/features/kangur/ui/components/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: () => <div data-testid='mock-lesson-document-renderer' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNavigationWidget', () => ({
  KangurLessonNavigationWidget: () => <div data-testid='mock-lesson-navigation' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonsWordmark', () => ({
  KangurLessonsWordmark: () => <div data-testid='mock-lessons-wordmark' />,
}));

vi.mock('@/features/kangur/ui/components/KangurPageIntroCard', () => ({
  KangurPageIntroCard: ({ title }: { title: string }) => (
    <div data-testid='mock-lessons-intro'>{title}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-lessons-layout'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='mock-top-nav' />,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: (props: unknown) => {
    tutorSessionSyncPropsMock(props);
    return null;
  },
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => useKangurAuthMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => ({
    guestPlayerName: '',
    setGuestPlayerName: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLessonNavigationContext', () => ({
  KangurLessonNavigationProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionState: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  KangurButton: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  KangurGlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurStatusChip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurSummaryPanel: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_LESSON_PANEL_GAP_CLASSNAME: 'gap',
  KANGUR_PANEL_GAP_CLASSNAME: 'gap',
  KANGUR_SEGMENTED_CONTROL_CLASSNAME: 'segmented',
  KANGUR_STACK_SPACED_CLASSNAME: 'stack',
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLearnerActivity', () => ({
  useKangurLearnerActivityPing: () => undefined,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: () => ({ assignments: [] }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (options: { subject?: string; enabledOnly?: boolean } = {}) => {
    let data = lessonsState.value;
    if (options.enabledOnly) {
      data = data.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      data = data.filter((lesson) => (lesson.subject ?? 'maths') === options.subject);
    }
    return {
      data,
      isFetching: false,
      refetch: vi.fn(),
    };
  },
  useKangurLessonDocuments: () => ({
    data: {},
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonTemplates', () => ({
  useKangurLessonTemplates: () => ({ data: [] }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonSections', () => ({
  useKangurLessonSections: () => ({ data: [] }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => false,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => ({
    lessonMastery: {},
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({ back: vi.fn() }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: () => undefined,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: () => undefined,
}));

vi.mock('@/features/kangur/ui/motion/page-transition', () => ({
  createKangurPageTransitionMotionProps: () => ({}),
}));

import Lessons from '@/features/kangur/ui/pages/Lessons';

const lessonsFixture = [
  {
    id: 'lesson-maths',
    componentId: 'adding',
    subject: 'maths',
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    enabled: true,
    sortOrder: 1,
    title: 'Dodawanie',
    description: '',
    emoji: '➕',
    color: 'indigo',
    activeBg: 'bg-indigo-50',
    contentMode: 'component',
  },
  {
    id: 'lesson-english',
    componentId: 'english_basics',
    subject: 'english',
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    enabled: true,
    sortOrder: 2,
    title: 'English Basics',
    description: '',
    emoji: '📘',
    color: 'sky',
    activeBg: 'bg-sky-50',
    contentMode: 'component',
  },
];

describe('Lessons page subject filtering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    if (!window.requestAnimationFrame) {
      Object.defineProperty(window, 'requestAnimationFrame', {
        value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(0), 0),
        writable: true,
      });
    }
    if (!window.cancelAnimationFrame) {
      Object.defineProperty(window, 'cancelAnimationFrame', {
        value: (handle: number) => window.clearTimeout(handle),
        writable: true,
      });
    }
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) =>
      window.setTimeout(() => callback(0), 0)
    );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle) => {
      window.clearTimeout(handle);
    });
    lessonsState.value = lessonsFixture;
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'english',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    useKangurAuthMock.mockReturnValue({
      user: {
        actorType: 'learner',
        activeLearner: { id: 'learner-1' },
        canManageLearners: false,
      },
      logout: vi.fn(),
      canAccessParentAssignments: false,
    });
    lessonCardPropsMock.mockClear();
    tutorSessionSyncPropsMock.mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shows only lessons for the active subject', () => {
    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByTestId('lesson-card-lesson-maths')).not.toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();
    expect(lessonCardPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lesson-english', subject: 'english' })
    );
  });

  it('uses the translated page title in the tutor session context when no lesson is active', () => {
    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionContext: expect.objectContaining({
          contentId: 'lesson:list',
          title: 'pageTitle',
        }),
      })
    );
  });
});
