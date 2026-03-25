/**
 * @vitest-environment jsdom
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';
import {
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
  LESSONS_LIBRARY_LIST_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';

const {
  useKangurSubjectFocusMock,
  useKangurAuthMock,
  useKangurRoutePageReadyMock,
  lessonCardPropsMock,
  lessonDocumentsHookCallsMock,
  lessonsWordmarkPropsMock,
  openLoginModalMock,
  localeState,
  lessonSectionsRetainDataWhileLoadingState,
  lessonsRetainDataWhileLoadingState,
  routeTransitionStateState,
  routeNavigatorBackMock,
  topNavigationPropsMock,
  tutorSessionSyncPropsMock,
  lessonsState,
  lessonsLoadingState,
  lessonsPlaceholderDataState,
  lessonSectionsState,
  lessonSectionsLoadingState,
  lessonSectionsPlaceholderDataState,
} = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
  useKangurAuthMock: vi.fn(),
  useKangurRoutePageReadyMock: vi.fn(),
  lessonCardPropsMock: vi.fn(),
  lessonDocumentsHookCallsMock: vi.fn(),
  lessonsWordmarkPropsMock: vi.fn(),
  openLoginModalMock: vi.fn(),
  localeState: {
    value: 'pl' as 'de' | 'en' | 'pl',
  },
  lessonSectionsRetainDataWhileLoadingState: {
    value: false,
  },
  lessonsRetainDataWhileLoadingState: {
    value: false,
  },
  routeTransitionStateState: {
    value: null as null | Record<string, unknown>,
  },
  routeNavigatorBackMock: vi.fn(),
  topNavigationPropsMock: vi.fn(),
  tutorSessionSyncPropsMock: vi.fn(),
  lessonsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  lessonsLoadingState: {
    value: false,
  },
  lessonsPlaceholderDataState: {
    value: false,
  },
  lessonSectionsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  lessonSectionsLoadingState: {
    value: false,
  },
  lessonSectionsPlaceholderDataState: {
    value: false,
  },
}));

const splitClasses = (className: string): string[] => className.trim().split(/\s+/);

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      (
        {
          'KangurLessonsPage.pageTitle': {
            de: 'Lektionen',
            en: 'Lessons',
            pl: 'Lekcje',
          },
          'KangurLessonsPage.loadingDescription': {
            de: 'Die Lektionen sind gleich bereit.',
            en: 'The lessons will be ready in a moment.',
            pl: 'Lekcje zaraz beda gotowe.',
          },
          'KangurLessonsPage.loadingLessonsStatus': {
            de: 'Lektionen werden geladen',
            en: 'Loading lessons',
            pl: 'Ładowanie lekcji',
          },
          'KangurLessonsPage.loadingLessonsDetails': {
            de: 'Die Lektionsbibliothek wird vorbereitet und an das gewahlte Thema angepasst.',
            en: 'Preparing the lesson library and matching it to the selected topic.',
            pl: 'Przygotowujemy bibliotekę lekcji i dopasowujemy ją do wybranego tematu.',
          },
          'KangurLessonsPage.loadingSectionsStatus': {
            de: 'Abschnitte werden geladen',
            en: 'Loading sections',
            pl: 'Ładowanie sekcji',
          },
          'KangurLessonsPage.loadingSectionsDetails': {
            de: 'Die Lektionsabschnitte werden geordnet, damit die Themenliste gleich angezeigt werden kann.',
            en: 'Organising lesson sections so the full topic list can appear next.',
            pl: 'Porządkujemy sekcje lekcji, aby zaraz pokazać pełną listę tematów.',
          },
          'KangurLessonsPage.introDescription': {
            de: 'Wahle eine Lektion und starte mit dem Lernen.',
            en: 'Choose a lesson and start learning.',
            pl: 'Wybierz lekcje i zacznij nauke.',
          },
          'KangurLessonsPage.emptyTitle': {
            de: 'Keine aktiven Lektionen',
            en: 'No active lessons',
            pl: 'Brak aktywnych lekcji',
          },
        } as const
      )[`${namespace}.${key}`]?.[localeState.value] ?? key,
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
  KangurLessonLibraryCard: ({
    lesson,
    onSelect,
  }: {
    lesson: { id: string; title: string };
    onSelect?: () => void;
  }) => {
    lessonCardPropsMock(lesson);
    return (
      <button data-testid={`lesson-card-${lesson.id}`} onClick={onSelect} type='button'>
        {lesson.title}
      </button>
    );
  },
}));

vi.mock('@/features/kangur/ui/components/KangurLessonGroupAccordion', () => ({
  KangurLessonGroupAccordion: ({
    label,
    isExpanded,
    onToggle,
    children,
  }: {
    label: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div className='w-full'>
      <button type='button' aria-expanded={isExpanded} onClick={onToggle}>
        {label}
      </button>
      {isExpanded ? (
        <div role='region'>
          <div className='w-full items-center'>{children}</div>
        </div>
      ) : null}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonDocumentRenderer', () => ({
  KangurLessonDocumentRenderer: () => <div data-testid='mock-lesson-document-renderer' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonNavigationWidget', () => ({
  KangurLessonNavigationWidget: () => <div data-testid='mock-lesson-navigation' />,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonsWordmark', () => ({
  KangurLessonsWordmark: (props: unknown) => {
    lessonsWordmarkPropsMock(props);
    return <div data-testid='mock-lessons-wordmark' />;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurPageIntroCard', () => ({
  KangurPageIntroCard: ({
    title,
    description,
    onBack,
    visualTitle,
    children,
  }: {
    title: string;
    description?: string;
    onBack?: () => void;
    visualTitle?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid='mock-lessons-intro'>
      <span>{title}</span>
      {description ? <span>{description}</span> : null}
      {onBack ? (
        <button aria-label='mock-lessons-back' onClick={onBack} type='button'>
          Back
        </button>
      ) : null}
      {visualTitle}
      {children}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({
    children,
    navigation,
  }: {
    children: React.ReactNode;
    navigation?: React.ReactNode;
  }) => (
    <div data-testid='mock-lessons-layout'>
      {navigation}
      {children}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: ({ navigation }: { navigation: unknown }) => {
    topNavigationPropsMock(navigation);
    return <div data-testid='mock-top-nav' />;
  },
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
    openLoginModal: openLoginModalMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionState: () => routeTransitionStateState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/lessons/lesson-ui-registry', () => ({
  LESSON_COMPONENTS: {
    adding: () => <div data-testid='mock-lesson-component-adding' />,
    english_basics: () => <div data-testid='mock-lesson-component-english' />,
  },
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  KangurButton: ({ children, ...props }: { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  KangurGlassPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurInfoCard: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
  KangurStatusChip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurSummaryPanel: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_LESSON_PANEL_GAP_CLASSNAME: 'gap',
  KANGUR_PANEL_GAP_CLASSNAME: 'gap',
  KANGUR_STEP_PILL_CLASSNAME: 'step-pill',
  KANGUR_SEGMENTED_CONTROL_CLASSNAME: 'segmented',
  KANGUR_STACK_SPACED_CLASSNAME: 'stack',
  KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX: 72,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME: '--kangur-top-bar-height',
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
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
    const hasRetainedData = lessonsLoadingState.value && lessonsRetainDataWhileLoadingState.value;
    if (options.enabledOnly) {
      data = data.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      data = data.filter((lesson) => (lesson.subject ?? 'maths') === options.subject);
    }
    return {
      data: lessonsLoadingState.value && !hasRetainedData ? undefined : data,
      isFetching: lessonsLoadingState.value,
      isLoading: lessonsLoadingState.value && !hasRetainedData,
      isPending: lessonsLoadingState.value && !hasRetainedData,
      isPlaceholderData: lessonsPlaceholderDataState.value,
      isRefetching: hasRetainedData,
      refetch: vi.fn(),
    };
  },
  useKangurLessonDocument: (
    lessonId: string | null,
    options?: { enabled?: boolean }
  ) => {
    lessonDocumentsHookCallsMock({ lessonId, ...(options ?? {}) });
    return {
      data: {},
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
  useKangurLessonSections: () => {
    const hasRetainedData =
      lessonSectionsLoadingState.value && lessonSectionsRetainDataWhileLoadingState.value;
    return {
      data: lessonSectionsLoadingState.value && !hasRetainedData ? undefined : lessonSectionsState.value,
      isFetching: lessonSectionsLoadingState.value,
      isLoading: lessonSectionsLoadingState.value && !hasRetainedData,
      isPending: lessonSectionsLoadingState.value && !hasRetainedData,
      isPlaceholderData: lessonSectionsPlaceholderDataState.value,
      isRefetching: hasRetainedData,
    };
  },
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
  useKangurRouteNavigator: () => ({ back: routeNavigatorBackMock }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: (input: unknown) => useKangurRoutePageReadyMock(input),
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
    localeState.value = 'pl';
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
    lessonsLoadingState.value = false;
    lessonsPlaceholderDataState.value = false;
    lessonsRetainDataWhileLoadingState.value = false;
    lessonSectionsState.value = [];
    lessonSectionsLoadingState.value = false;
    lessonSectionsPlaceholderDataState.value = false;
    lessonSectionsRetainDataWhileLoadingState.value = false;
    routeTransitionStateState.value = null;
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
    openLoginModalMock.mockClear();
    routeNavigatorBackMock.mockClear();
    topNavigationPropsMock.mockClear();
    tutorSessionSyncPropsMock.mockClear();
    useKangurRoutePageReadyMock.mockClear();
    lessonDocumentsHookCallsMock.mockClear();
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

  it('keeps the catalog intro on the built-in lessons navigation without a back button', () => {
    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByRole('button', { name: 'mock-lessons-back' })).not.toBeInTheDocument();
    expect(routeNavigatorBackMock).not.toHaveBeenCalled();
  });

  it('keeps the lessons library transition waiting until the catalog loading state settles', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionSkeletonVariant: 'lessons-library',
    };
    lessonsLoadingState.value = true;
    lessonSectionsLoadingState.value = true;

    const view = render(<Lessons />);

    expect(useKangurRoutePageReadyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageKey: 'Lessons',
        ready: false,
      })
    );

    lessonsLoadingState.value = false;
    lessonSectionsLoadingState.value = false;

    act(() => {
      vi.runAllTimers();
    });

    expect(useKangurRoutePageReadyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageKey: 'Lessons',
        ready: true,
      })
    );

    view.unmount();
  });

  it('marks the lessons page ready when catalog queries are refetching with retained data', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionSkeletonVariant: 'lessons-library',
    };
    lessonsLoadingState.value = true;
    lessonSectionsLoadingState.value = true;
    lessonsRetainDataWhileLoadingState.value = true;
    lessonSectionsRetainDataWhileLoadingState.value = true;

    render(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(useKangurRoutePageReadyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageKey: 'Lessons',
        ready: true,
      })
    );
    expect(screen.queryByTestId('lessons-catalog-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();
  });

  it('keeps the lessons library transition waiting while placeholder catalog data is still active', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionSkeletonVariant: 'lessons-library',
    };
    lessonsPlaceholderDataState.value = true;
    lessonSectionsPlaceholderDataState.value = true;

    const view = render(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(useKangurRoutePageReadyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageKey: 'Lessons',
        ready: false,
      })
    );
    expect(screen.getByTestId('lessons-catalog-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-card-lesson-english')).not.toBeInTheDocument();

    lessonsPlaceholderDataState.value = false;
    lessonSectionsPlaceholderDataState.value = false;

    view.rerender(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(useKangurRoutePageReadyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageKey: 'Lessons',
        ready: true,
      })
    );
    expect(screen.queryByTestId('lessons-catalog-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();
  });

  it('keeps focused lesson transitions waiting until the lesson surface is ready', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionSkeletonVariant: 'lessons-focus',
    };
    const view = render(<Lessons />);

    expect(useKangurRoutePageReadyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pageKey: 'Lessons',
        ready: false,
      })
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });
    view.unmount();
  });

  it('keeps the live lessons library shell aligned with the transition skeleton layout', () => {
    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId('lessons-shell-transition')).toHaveClass(
      ...splitClasses(LESSONS_LIBRARY_LAYOUT_CLASSNAME)
    );
    expect(screen.getByTestId('lessons-list-transition')).toHaveClass(
      ...splitClasses(LESSONS_LIBRARY_LIST_CLASSNAME)
    );
  });

  it('keeps the lessons list slot mounted and shows the skeleton before deferred content resolves', () => {
    vi.mocked(window.requestAnimationFrame).mockImplementation(() => 0);
    vi.mocked(window.cancelAnimationFrame).mockImplementation(() => undefined);

    render(<Lessons />);

    expect(screen.getByTestId('lessons-intro-loading-state')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-list-transition')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-catalog-skeleton')).toBeInTheDocument();
    expect(screen.getByText('Wybierz lekcje i zacznij nauke.')).toBeInTheDocument();
    expect(screen.getByText('Ładowanie lekcji')).toBeInTheDocument();
    expect(
      screen.getByText('Przygotowujemy bibliotekę lekcji i dopasowujemy ją do wybranego tematu.')
    ).toBeInTheDocument();
  });

  it('shows a lesson-section skeleton while the catalog data is loading', () => {
    lessonsLoadingState.value = true;
    lessonSectionsLoadingState.value = true;

    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId('lessons-catalog-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-intro-loading-state')).toBeInTheDocument();
    expect(screen.getByText('Wybierz lekcje i zacznij nauke.')).toBeInTheDocument();
    expect(screen.getByText('Ładowanie sekcji')).toBeInTheDocument();
    expect(
      screen.getByText('Porządkujemy sekcje lekcji, aby zaraz pokazać pełną listę tematów.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Brak aktywnych lekcji')).not.toBeInTheDocument();
  });

  it('shows the catalog skeleton instead of placeholder lessons until the real catalog arrives', () => {
    lessonsPlaceholderDataState.value = true;
    lessonSectionsPlaceholderDataState.value = true;

    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByTestId('lessons-catalog-skeleton')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-intro-loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-card-lesson-english')).not.toBeInTheDocument();
    expect(screen.queryByText('Brak aktywnych lekcji')).not.toBeInTheDocument();
  });

  it('shows the empty state only after the catalog finishes loading with no lessons', () => {
    lessonsState.value = [];
    lessonSectionsState.value = [];

    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByTestId('lessons-intro-loading-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lessons-catalog-skeleton')).not.toBeInTheDocument();
    expect(screen.getByText('Brak aktywnych lekcji')).toBeInTheDocument();
  });

  it('defers lesson document loading until a lesson is selected', () => {
    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(lessonDocumentsHookCallsMock).toHaveBeenLastCalledWith({
      enabled: false,
      lessonId: null,
    });

    act(() => {
      fireEvent.click(screen.getByTestId('lesson-card-lesson-english'));
    });

    expect(lessonDocumentsHookCallsMock).toHaveBeenLastCalledWith({
      enabled: true,
      lessonId: 'lesson-english',
    });
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
          title: 'Lekcje',
        }),
      })
    );
  });

  it('passes the localized German lessons label into the lessons wordmark', () => {
    localeState.value = 'de';

    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(lessonsWordmarkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Lektionen',
        locale: 'de',
      })
    );
  });

  it('wires the lessons top navigation login action to the shared login modal', () => {
    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    const latestNavigation = topNavigationPropsMock.mock.calls.at(-1)?.[0] as
      | { onLogin?: () => void }
      | undefined;

    expect(latestNavigation?.onLogin).toBe(openLoginModalMock);

    latestNavigation?.onLogin?.();

    expect(openLoginModalMock).toHaveBeenCalledTimes(1);
  });

  it('shows grouped lesson content through centered collapsible menus', async () => {
    lessonSectionsState.value = [
      {
        id: 'opening-section',
        subject: 'english',
        ageGroup: DEFAULT_KANGUR_AGE_GROUP,
        enabled: true,
        sortOrder: 1,
        label: 'Opening Section',
        typeLabel: 'featured',
        componentIds: ['english_basics'],
        subsections: [],
      },
    ];

    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByTestId('lesson-card-lesson-english')).not.toBeInTheDocument();

    const openingSectionButton = screen.getByRole('button', { name: /opening section/i });
    fireEvent.click(openingSectionButton);

    expect(openingSectionButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region').firstElementChild).toHaveClass('w-full', 'items-center');
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();
  });
});
