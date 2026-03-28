/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
  LESSONS_LIBRARY_LIST_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import {
  DEFAULT_KANGUR_AGE_GROUP,
  emptyPageContentEntryMock,
  focusTokenState,
  lessonAssignmentsHookCallsMock,
  lessonCardPropsMock,
  lessonDocumentsHookCallsMock,
  lessonSectionsLoadingState,
  lessonSectionsPlaceholderDataState,
  lessonSectionsRetainDataWhileLoadingState,
  lessonSectionsState,
  lessonTemplatesHookCallsMock,
  localeState,
  lessonsLoadingState,
  lessonsPlaceholderDataState,
  lessonsRetainDataWhileLoadingState,
  lessonsState,
  lessonsWordmarkPropsMock,
  openLoginModalMock,
  routeNavigatorBackMock,
  routeTransitionStateState,
  setupLessonsPageTest,
  splitClasses,
  standardPageLayoutPropsMock,
  topNavigationPropsMock,
  tutorSessionSyncPropsMock,
  useKangurAuthMock,
  useKangurDocsTooltipsMock,
  useKangurRoutePageReadyMock,
  useKangurSubjectFocusMock,
} from './Lessons.test-support';

describe('Lessons page subject filtering', () => {
  let Lessons: typeof import('@/features/kangur/ui/pages/Lessons').default;

  beforeEach(async () => {
    Lessons = await setupLessonsPageTest();
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

  it('keeps lesson templates disabled on the default lessons route', () => {
    render(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(lessonTemplatesHookCallsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('enables lesson templates when a focused lesson token is present in the URL', () => {
    focusTokenState.value = 'mystery-focus-token';

    render(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(lessonTemplatesHookCallsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    );
  });

  it('defers assignments hydration until after the first deferred render turn for parent access', () => {
    useKangurAuthMock.mockReturnValue({
      user: {
        actorType: 'parent',
        activeLearner: { id: 'learner-1' },
        canManageLearners: true,
      },
      logout: vi.fn(),
      canAccessParentAssignments: true,
    });

    act(() => {
      render(<Lessons />);
    });

    expect(lessonAssignmentsHookCallsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(lessonAssignmentsHookCallsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(lessonAssignmentsHookCallsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        enabled: true,
      })
    );
  });

  it('reveals the lessons library route once the shell is mounted even while catalog data is loading', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: 'Lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
    };
    lessonsLoadingState.value = true;
    lessonSectionsLoadingState.value = true;

    let view!: ReturnType<typeof render>;
    act(() => {
      view = render(<Lessons />);
    });

    expect(useKangurRoutePageReadyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageKey: 'Lessons',
        ready: true,
      })
    );
    expect(screen.getByTestId('lessons-catalog-skeleton')).toBeInTheDocument();

    view.unmount();
  });

  it('marks the lessons page ready when catalog queries are refetching with retained data', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: 'Lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
    };
    lessonsLoadingState.value = true;
    lessonSectionsLoadingState.value = true;
    lessonsRetainDataWhileLoadingState.value = true;
    lessonSectionsRetainDataWhileLoadingState.value = true;

    act(() => {
      render(<Lessons />);
    });

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

  it('reveals the lessons library route while placeholder catalog data is still active', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: 'Lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
    };
    lessonsPlaceholderDataState.value = true;
    lessonSectionsPlaceholderDataState.value = true;

    let view!: ReturnType<typeof render>;
    act(() => {
      view = render(<Lessons />);
    });

    act(() => {
      vi.runAllTimers();
    });

    expect(useKangurRoutePageReadyMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        pageKey: 'Lessons',
        ready: true,
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
      activeTransitionPageKey: 'Lessons',
      activeTransitionSkeletonVariant: 'lessons-focus',
    };
    let view!: ReturnType<typeof render>;
    act(() => {
      view = render(<Lessons />);
    });

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

  it('keeps the lessons list slot mounted without blocking on deferred content', () => {
    vi.mocked(window.requestIdleCallback).mockImplementation(() => 0);
    vi.mocked(window.cancelIdleCallback).mockImplementation(() => undefined);

    act(() => {
      render(<Lessons />);
    });

    expect(screen.getByTestId('lessons-list-transition')).toBeInTheDocument();
    expect(screen.getByText('Wybierz lekcje i zacznij nauke.')).toBeInTheDocument();
    expect(screen.queryByTestId('lessons-intro-loading-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lessons-catalog-skeleton')).not.toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();
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

    expect(lessonDocumentsHookCallsMock).not.toHaveBeenCalled();

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

  it('defers tutor session sync until after the first deferred render turn', () => {
    render(<Lessons />);

    expect(tutorSessionSyncPropsMock).not.toHaveBeenCalled();

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

  it('defers docs tooltip mounting until after the first deferred render turn', () => {
    render(<Lessons />);

    expect(useKangurDocsTooltipsMock).not.toHaveBeenCalled();
    expect(standardPageLayoutPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        docsRootId: undefined,
        docsTooltipsEnabled: false,
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(useKangurDocsTooltipsMock).toHaveBeenCalledWith('lessons');
    expect(standardPageLayoutPropsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        docsRootId: 'kangur-lessons-page',
        docsTooltipsEnabled: false,
      })
    );
  });

  it('keeps deferred lessons enhancements off the library route until the transition is idle', () => {
    routeTransitionStateState.value = {
      transitionPhase: 'waiting_for_ready',
      activeTransitionKind: 'navigation',
      activeTransitionPageKey: 'Lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
    };

    const view = render(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).not.toHaveBeenCalled();
    expect(useKangurDocsTooltipsMock).not.toHaveBeenCalled();

    routeTransitionStateState.value = {
      transitionPhase: 'idle',
    };

    view.rerender(<Lessons />);

    act(() => {
      vi.runAllTimers();
    });

    expect(tutorSessionSyncPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionContext: expect.objectContaining({
          contentId: 'lesson:list',
        }),
      })
    );
    expect(useKangurDocsTooltipsMock).toHaveBeenCalledWith('lessons');
  });

  it('defers the lessons wordmark until after the first deferred render turn', () => {
    render(<Lessons />);

    expect(lessonsWordmarkPropsMock).not.toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });

    expect(lessonsWordmarkPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Lekcje',
        locale: 'pl',
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

  it('shows both adverbs lessons inside the English grammar group', async () => {
    lessonsState.value = [
      {
        id: 'lesson-english-adverbs',
        componentId: 'english_adverbs',
        subject: 'english',
        ageGroup: DEFAULT_KANGUR_AGE_GROUP,
        enabled: true,
        sortOrder: 1,
        title: 'Adverbs',
        description: 'Adverbs of manner',
        emoji: '✨',
        color: 'sky',
        activeBg: 'bg-sky-50',
        contentMode: 'component',
      },
      {
        id: 'lesson-english-adverbs-frequency',
        componentId: 'english_adverbs_frequency',
        subject: 'english',
        ageGroup: DEFAULT_KANGUR_AGE_GROUP,
        enabled: true,
        sortOrder: 2,
        title: 'Adverbs of Frequency',
        description: 'always, usually, sometimes, never',
        emoji: '📆',
        color: 'violet',
        activeBg: 'bg-violet-50',
        contentMode: 'component',
      },
    ];
    lessonSectionsState.value = [
      {
        id: 'english_grammar',
        subject: 'english',
        ageGroup: DEFAULT_KANGUR_AGE_GROUP,
        enabled: true,
        sortOrder: 1,
        label: 'Gramatyka',
        typeLabel: 'featured',
        componentIds: [],
        subsections: [
          {
            id: 'english_grammar_adverbs',
            enabled: true,
            sortOrder: 1,
            label: 'Adverbs',
            typeLabel: 'group',
            componentIds: ['english_adverbs'],
          },
          {
            id: 'english_grammar_adverbs_frequency',
            enabled: true,
            sortOrder: 2,
            label: 'Adverbs of Frequency',
            typeLabel: 'group',
            componentIds: ['english_adverbs_frequency'],
          },
        ],
      },
    ];

    render(<Lessons />);
    act(() => {
      vi.runAllTimers();
    });

    expect(screen.queryByTestId('lesson-card-lesson-english-adverbs')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('lesson-card-lesson-english-adverbs-frequency')
    ).not.toBeInTheDocument();

    const grammarSectionButton = screen.getByRole('button', { name: /gramatyka/i });
    fireEvent.click(grammarSectionButton);

    expect(grammarSectionButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('lesson-card-lesson-english-adverbs')).toBeInTheDocument();
    expect(
      screen.getByTestId('lesson-card-lesson-english-adverbs-frequency')
    ).toBeInTheDocument();
    expect(lessonCardPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'lesson-english-adverbs', componentId: 'english_adverbs' })
    );
    expect(lessonCardPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'lesson-english-adverbs-frequency',
        componentId: 'english_adverbs_frequency',
      })
    );
  });
});
