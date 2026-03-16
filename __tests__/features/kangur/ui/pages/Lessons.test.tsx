/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/__tests__/test-utils';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
const {
  settingsStoreMock,
  lessonsState,
  lessonDocumentsState,
  authState,
  assignmentsState,
  progressState,
  routerPushMock,
  useKangurPageContentEntryMock,
} = vi.hoisted(() => ({
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

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
  usePathname: () => '/kangur/lessons',
}));

vi.mock('next/dynamic', async () => {
  const lessonNavigation = await import(
    '@/features/kangur/ui/context/KangurLessonNavigationContext'
  );

  return {
    default: () =>
      function MockLegacyLesson({
        onBack,
        onReady,
      }: {
        onBack?: () => void;
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
            {onBack ? (
              <button type='button' onClick={onBack}>
                Back
              </button>
            ) : null}
          </div>
        );
      },
  };
});

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
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
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => authState.value,
  useOptionalKangurAuth: () => authState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: ({ enabled = true }: { enabled?: boolean } = {}) => ({
    assignments: enabled ? assignmentsState.value : [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    createAssignment: vi.fn(),
    updateAssignment: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (
    options: { subject?: string; enabledOnly?: boolean; enabled?: boolean } = {}
  ) => {
    let data = lessonsState.value;
    if (options.enabledOnly) {
      data = data.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      data = data.filter((lesson) => (lesson.subject ?? 'maths') === options.subject);
    }
    const deduped = new Map<string, Record<string, unknown>>();
    data.forEach((lesson) => {
      const componentId = String(lesson.componentId ?? lesson.id ?? '');
      if (!deduped.has(componentId)) {
        deduped.set(componentId, lesson);
      }
    });
    data = Array.from(deduped.values());
    return {
      data,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      refetch: vi.fn(),
    };
  },
  useKangurLessonDocuments: () => ({
    data: lessonDocumentsState.value,
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    refetch: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: () => progressState.value,
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: () => null,
  useOptionalKangurAiTutor: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: () => undefined,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
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

import { KANGUR_HELP_SETTINGS_KEY } from '@/features/kangur/settings';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import Lessons from '@/features/kangur/ui/pages/Lessons';

const renderLessonsPage = () =>
  render(
    <KangurGuestPlayerProvider>
      <Lessons />
    </KangurGuestPlayerProvider>
  );

const createLesson = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 'kangur-lesson-clock',
  componentId: 'clock',
  subject: 'maths',
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

const createProgressState = (
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

const setLessonState = ({
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

describe('Lessons', () => {
  beforeEach(() => {
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
    useKangurPageContentEntryMock.mockImplementation(() => ({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));
  });

  it('renders stored document content when the lesson is explicitly in document mode', () => {
    setLessonState({
      lessons: [
        createLesson({
          id: 'geometry-doc',
          componentId: 'geometry_shapes',
          contentMode: 'document',
          title: 'Shapes with SVG',
        }),
      ],
      documents: {
        'geometry-doc': {
          version: 1,
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Document lesson</p>',
              align: 'left',
            },
          ],
        },
      },
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /shapes with svg/i }));

    expect(screen.getByTestId('lesson-document-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-document-summary')).toHaveClass(
      'soft-card'
    );
    expect(screen.queryByTestId('legacy-lesson')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });

  it('renders each lesson component only once when persisted settings contain duplicates', () => {
    setLessonState({
      lessons: [
        createLesson({
          id: 'kangur-lesson-clock-primary',
          sortOrder: 1000,
        }),
        createLesson({
          id: 'kangur-lesson-clock-duplicate',
          title: 'Nauka zegara duplicate',
          sortOrder: 2000,
        }),
        createLesson({
          id: 'kangur-lesson-calendar',
          componentId: 'calendar',
          title: 'Nauka kalendarza',
          description: 'Ćwicz dni i miesiące',
          emoji: '📅',
          color: 'kangur-gradient-accent-emerald',
          activeBg: 'bg-emerald-500',
          sortOrder: 3000,
        }),
      ],
    });

    renderLessonsPage();

    expect(screen.getAllByRole('button', { name: /nauka zegara/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /nauka zegara duplicate/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nauka kalendarza/i })).toBeInTheDocument();
  });

  it('keeps only the lesson navigation button at the bottom and constrains its width', () => {
    setLessonState({
      lessons: [
        createLesson(),
        createLesson({
          id: 'kangur-lesson-calendar',
          componentId: 'calendar',
          title: 'Nauka kalendarza',
          description: 'Ćwicz dni i miesiące',
          emoji: '📅',
          color: 'kangur-gradient-accent-emerald',
          activeBg: 'bg-emerald-500',
          sortOrder: 2000,
        }),
      ],
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    const bottomNavigationButton = screen.getByRole('button', {
      name: /nauka kalendarza/i,
    });

    expect(screen.queryByText('Nawigacja lekcji')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Przechodź do poprzedniej lub kolejnej lekcji bez wracania do całej listy.'
      )
    ).not.toBeInTheDocument();
    expect(bottomNavigationButton).toHaveClass('surface-cta');
  });

  it('keeps the secret lesson trigger hidden until every lesson has recorded mastery', () => {
    setLessonState({
      lessons: [
        createLesson(),
        createLesson({
          id: 'kangur-lesson-calendar',
          componentId: 'calendar',
          title: 'Nauka kalendarza',
          description: 'Ćwicz dni i miesiące',
          emoji: '📅',
          color: 'kangur-gradient-accent-emerald',
          activeBg: 'bg-emerald-500',
          sortOrder: 2000,
        }),
      ],
    });
    progressState.value = createProgressState({
      lessonMastery: {
        clock: { completions: 1 },
      },
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    expect(screen.queryByRole('button', { name: 'Open secret lesson' })).toBeNull();
  });

  it('redirects the unlocked secret lesson pill to the final lesson in the queue', async () => {
    setLessonState({
      lessons: [
        createLesson(),
        createLesson({
          id: 'kangur-lesson-calendar',
          componentId: 'calendar',
          title: 'Nauka kalendarza',
          description: 'Ćwicz dni i miesiące',
          emoji: '📅',
          color: 'kangur-gradient-accent-emerald',
          activeBg: 'bg-emerald-500',
          sortOrder: 2000,
        }),
      ],
    });
    progressState.value = createProgressState({
      lessonMastery: {
        clock: { completions: 1 },
        calendar: { completions: 1 },
      },
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Open secret lesson' }));

    await waitFor(() => expect(screen.getByTestId('lessons-secret-panel')).toBeInTheDocument());

    expect(screen.queryByTestId('legacy-lesson')).toBeNull();
    expect(screen.getByTestId('lessons-secret-pill-chip')).toHaveTextContent(
      'Sekret odblokowany'
    );
    expect(screen.getByTestId('lessons-secret-host-label')).toHaveTextContent(
      'Nauka kalendarza'
    );
  });

  it('applies documentation-backed titles to lesson navigation controls when tooltips are enabled', async () => {
    setLessonState({
      lessons: [createLesson()],
      helpSettings: {
        docsTooltips: {
          enabled: true,
          homeEnabled: false,
          lessonsEnabled: true,
          testsEnabled: false,
          profileEnabled: false,
          parentDashboardEnabled: false,
          adminEnabled: false,
        },
      },
    });

    renderLessonsPage();

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Strona główna' })).toHaveAttribute(
        'href',
        '/kangur'
      )
    );
    expect(screen.getByRole('link', { name: 'Strona główna' })).toHaveAttribute(
      'title',
      'Home Navigation: Returns to the main Kangur practice hub and quick-start home screen.'
    );
    expect(screen.getByRole('button', { name: /nauka zegara/i })).toHaveAttribute(
      'title',
      'Lesson Card: Opens a lesson from the Kangur lesson library and shows its progress state.'
    );
  });

  it('uses app-router navigation when the fallback back action has no browser history entry', () => {
    setLessonState({
      lessons: [createLesson()],
    });

    const historyBackSpy = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
    const originalHistoryLength = window.history.length;
    Object.defineProperty(window.history, 'length', {
      configurable: true,
      value: 1,
    });

    try {
      renderLessonsPage();

      fireEvent.click(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' }));

      expect(historyBackSpy).not.toHaveBeenCalled();
      expect(routerPushMock).toHaveBeenCalledWith('/kangur', {
        scroll: false,
      });
    } finally {
      Object.defineProperty(window.history, 'length', {
        configurable: true,
        value: originalHistoryLength,
      });
      historyBackSpy.mockRestore();
    }
  });

  it('keeps using the legacy component renderer when the lesson stays in component mode', () => {
    setLessonState({
      lessons: [
        createLesson({
          id: 'clock-component',
          contentMode: 'component',
          title: 'Classic Clock',
        }),
      ],
      documents: {
        'clock-component': {
          version: 1,
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Should not render</p>',
              align: 'left',
            },
          ],
        },
      },
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /classic clock/i }));

    const headerActions = screen.getByTestId('active-lesson-header-icon-actions');

    expect(screen.getByTestId('active-lesson-header')).toHaveClass(
      'glass-panel',
      'border-white/78',
      'bg-white/68'
    );
    expect(headerActions.firstElementChild).toBe(
      screen.getByRole('button', { name: 'Wróć do listy lekcji' })
    );
    expect(headerActions).toContainElement(screen.getByTestId('active-lesson-icon-clock-component'));
    expect(headerActions).toContainElement(screen.getByTestId('kangur-lesson-narrator'));
    expect(screen.getByRole('button', { name: 'Wróć do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByTestId('legacy-lesson')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-document-renderer')).not.toBeInTheDocument();
  });

  it('scrolls the active lesson header into view when opening a lesson from the library', async () => {
    const originalScrollTo = window.scrollTo;
    const scrollToMock = vi.fn();

    Object.defineProperty(window, 'scrollTo', {
      value: scrollToMock,
      writable: true,
    });

    try {
      setLessonState({
        lessons: [
          createLesson(),
          createLesson({
            id: 'adding-lesson',
            componentId: 'adding',
            title: 'Dodawanie',
            description: 'Jednocyfrowe, dwucyfrowe i gra z pilkami!',
            emoji: '➕',
            sortOrder: 1010,
          }),
        ],
      });

      renderLessonsPage();

      fireEvent.click(screen.getByRole('button', { name: /dodawanie/i }));

      await waitFor(() => expect(scrollToMock).toHaveBeenCalled());
      expect(screen.getByTestId('active-lesson-header')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'scrollTo', {
        value: originalScrollTo,
        writable: true,
      });
    }
  });

  it('returns from an active lesson to the lessons library via the shared header back button', () => {
    setLessonState({
      lessons: [createLesson()],
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do listy lekcji' }));

    expect(screen.getByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-lesson')).not.toBeInTheDocument();
  });

  it('uses the smoother motion preset for lessons list and active lesson transitions', () => {
    setLessonState({
      lessons: [
        createLesson(),
        createLesson({
          id: 'adding-lesson',
          componentId: 'adding',
          title: 'Dodawanie',
          description: 'Licz szybciej',
          emoji: '➕',
          sortOrder: 1010,
        }),
      ],
    });

    renderLessonsPage();

    expect(screen.getByTestId('lesson-library-motion-kangur-lesson-clock')).toHaveAttribute(
      'data-motion-transition',
      JSON.stringify({ duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: 0 })
    );
    expect(screen.getByTestId('lesson-library-motion-adding-lesson')).toHaveAttribute(
      'data-motion-transition',
      JSON.stringify({ duration: 0.26, ease: [0.22, 1, 0.36, 1], delay: 0.06 })
    );

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    expect(screen.getByTestId('lessons-active-transition')).toHaveAttribute(
      'data-motion-initial',
      JSON.stringify({ opacity: 0.92, y: 12 })
    );
    expect(screen.getByTestId('lessons-active-transition')).toHaveAttribute(
      'data-motion-animate',
      JSON.stringify({ opacity: 1, y: 0 })
    );
    expect(screen.getByTestId('lessons-active-transition')).toHaveAttribute(
      'data-motion-exit',
      JSON.stringify({ opacity: 0.98, y: -4 })
    );
    expect(screen.getByTestId('lessons-active-transition')).toHaveAttribute(
      'data-motion-transition',
      JSON.stringify({ duration: 0.32, ease: [0.22, 1, 0.36, 1] })
    );
  });

  it('shows the empty-document warning when a document-mode lesson has no saved content', () => {
    setLessonState({
      lessons: [
        createLesson({
          id: 'doc-empty',
          componentId: 'logical_patterns',
          contentMode: 'document',
          title: 'Patterns Draft',
        }),
      ],
      documents: {
        'doc-empty': {
          version: 1,
          blocks: [
            {
              id: 'text-empty',
              type: 'text',
              html: '<p> </p>',
              align: 'left',
            },
          ],
        },
      },
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /patterns draft/i }));

    expect(
      screen.getByText('Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('lessons-empty-document-summary')).toHaveClass(
      'soft-card'
    );
    expect(screen.getByText('Lesson document')).toHaveClass('rounded-full', 'border');
    expect(screen.queryByTestId('legacy-lesson')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lesson-document-renderer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });

  it('uses shared chips for lesson library document and assignment states', () => {
    authState.value = {
      user: {
        id: 'parent-1',
        activeLearner: {
          id: 'learner-1',
        },
      },
      canAccessParentAssignments: true,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    };
    assignmentsState.value = [
      {
        id: 'assignment-priority',
        learnerKey: 'jan@example.com',
        title: 'Powtórz naukę zegara',
        description: 'Skup się na odczytywaniu godzin.',
        priority: 'high',
        archived: false,
        target: {
          type: 'lesson',
          lessonComponentId: 'clock',
          requiredCompletions: 1,
          baselineCompletions: 0,
        },
        assignedByName: 'Rodzic',
        assignedByEmail: 'rodzic@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
        progress: {
          status: 'in_progress',
          percent: 40,
          summary: 'Powtórki: 0/1',
          attemptsCompleted: 0,
          attemptsRequired: 1,
          lastActivityAt: null,
          completedAt: null,
        },
      },
    ];
    progressState.value = createProgressState({
      lessonMastery: {
        clock: {
          attempts: 2,
          completions: 2,
          masteryPercent: 92,
          bestScorePercent: 100,
          lastScorePercent: 90,
          lastCompletedAt: '2026-03-06T09:00:00.000Z',
        },
      },
    });

    setLessonState({
      lessons: [
        createLesson({
          id: 'clock-doc',
          componentId: 'clock',
          contentMode: 'document',
          title: 'Nauka zegara',
        }),
      ],
      documents: {
        'clock-doc': {
          version: 1,
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Clock lesson</p>',
              align: 'left',
            },
          ],
        },
      },
    });

    renderLessonsPage();

    expect(screen.getByRole('button', { name: /nauka zegara/i })).toHaveClass(
      'soft-card',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_92%,var(--kangur-page-background))]'
    );
    expect(screen.getByTestId('lesson-library-icon-clock-doc')).toHaveClass(
      'h-16',
      'w-16',
      'kangur-gradient-icon-tile-lg'
    );
    expect(screen.getByText('Wlasna zawartosc')).toHaveClass('rounded-full', 'border');
    expect(screen.getAllByText('Priorytet rodzica')[0]).toHaveClass('rounded-full', 'border');
    expect(screen.getByText('Opanowane 92%')).toHaveClass('rounded-full', 'border');
    expect(screen.getByText('Priorytet wysoki')).toHaveClass('rounded-full', 'border');

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    expect(screen.getByTestId('active-lesson-parent-priority-chip')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('active-lesson-parent-priority-chip')).toHaveTextContent(
      'Priorytet Rodzica'
    );
    expect(screen.queryByText('Powtórz naukę zegara')).toBeNull();
    expect(screen.queryByText('Skup się na odczytywaniu godzin.')).toBeNull();
  });

  it('shows a compact completed parent-assignment pill in the active lesson header', () => {
    authState.value = {
      user: {
        id: 'parent-1',
        activeLearner: {
          id: 'learner-1',
        },
      },
      canAccessParentAssignments: true,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    };
    assignmentsState.value = [
      {
        id: 'assignment-completed',
        learnerKey: 'jan@example.com',
        title: 'Powtórz dodawanie',
        description: 'Wykonane wczoraj.',
        priority: 'medium',
        archived: false,
        target: {
          type: 'lesson',
          lessonComponentId: 'adding',
          requiredCompletions: 1,
          baselineCompletions: 1,
        },
        assignedByName: 'Rodzic',
        assignedByEmail: 'rodzic@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-07T10:00:00.000Z',
        progress: {
          status: 'completed',
          percent: 100,
          summary: 'Powtórki: 1/1',
          attemptsCompleted: 1,
          attemptsRequired: 1,
          lastActivityAt: '2026-03-07T10:00:00.000Z',
          completedAt: '2026-03-07T10:00:00.000Z',
        },
      },
    ];

    setLessonState({
      lessons: [
        createLesson({
          id: 'adding-completed',
          componentId: 'adding',
          title: 'Dodawanie',
        }),
      ],
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /dodawanie/i }));

    expect(screen.getByTestId('active-lesson-parent-completed-chip')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('active-lesson-parent-completed-chip')).toHaveTextContent(
      'Ukończone dla rodzica'
    );
    expect(screen.queryByText('Powtórz dodawanie')).toBeNull();
    expect(screen.queryByText('Wykonane wczoraj.')).toBeNull();
  });

  it('hides parent assignment markers in local mode even if stale assignment data exists', () => {
    assignmentsState.value = [
      {
        id: 'assignment-priority',
        learnerKey: 'jan@example.com',
        title: 'Powtórz naukę zegara',
        description: 'Skup się na odczytywaniu godzin.',
        priority: 'high',
        archived: false,
        target: {
          type: 'lesson',
          lessonComponentId: 'clock',
          requiredCompletions: 1,
          baselineCompletions: 0,
        },
        assignedByName: 'Rodzic',
        assignedByEmail: 'rodzic@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
        progress: {
          status: 'in_progress',
          percent: 40,
          summary: 'Powtórki: 0/1',
          attemptsCompleted: 0,
          attemptsRequired: 1,
          lastActivityAt: null,
          completedAt: null,
        },
      },
    ];

    setLessonState({
      lessons: [createLesson()],
    });

    renderLessonsPage();

    expect(screen.queryByText('Priorytet rodzica')).toBeNull();
    expect(screen.queryByText('Ukończone dla rodzica')).toBeNull();
    expect(screen.queryByText('Powtórz naukę zegara')).toBeNull();
  });

  it('uses the shared empty-state surface when no lessons are enabled', () => {
    setLessonState({
      lessons: [createLesson({ enabled: false })],
    });

    renderLessonsPage();

    const emptyTitle = screen.getByText(/Brak aktywnych lekcji/i);
    expect(emptyTitle).toBeInTheDocument();
    expect(emptyTitle.parentElement).toHaveClass(
      'soft-card',
      'border-dashed',
      'border'
    );
  });

  it('uses Mongo-backed page-content copy for the lessons list intro and empty state when available', () => {
    setLessonState({
      lessons: [createLesson({ enabled: false })],
    });
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => {
      if (entryId === 'lessons-list-intro') {
        return {
          entry: {
            id: 'lessons-list-intro',
            title: 'Lekcje',
            summary: 'Mongo intro do lekcji.',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      if (entryId === 'lessons-list-empty-state') {
        return {
          entry: {
            id: 'lessons-list-empty-state',
            title: 'Brak gotowych lekcji',
            summary: 'Mongo pusty stan listy lekcji.',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      return {
        entry: null,
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    renderLessonsPage();

    expect(screen.getByText('Mongo intro do lekcji.')).toBeInTheDocument();
    expect(screen.getByText('Brak gotowych lekcji')).toBeInTheDocument();
    expect(screen.getByText('Mongo pusty stan listy lekcji.')).toBeInTheDocument();
  });

  it('keeps the selected lesson title in the active header while still using Mongo-backed copy for assignment and document sections', () => {
    authState.value = {
      user: {
        id: 'parent-1',
        activeLearner: {
          id: 'learner-1',
        },
      },
      canAccessParentAssignments: true,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    };
    assignmentsState.value = [
      {
        id: 'assignment-priority',
        learnerKey: 'jan@example.com',
        title: 'Powtórz naukę zegara',
        description: 'Skup się na odczytywaniu godzin.',
        priority: 'high',
        archived: false,
        target: {
          type: 'lesson',
          lessonComponentId: 'clock',
          requiredCompletions: 1,
          baselineCompletions: 0,
        },
        assignedByName: 'Rodzic',
        assignedByEmail: 'rodzic@example.com',
        createdAt: '2026-03-06T10:00:00.000Z',
        updatedAt: '2026-03-06T10:00:00.000Z',
        progress: {
          status: 'in_progress',
          percent: 40,
          summary: 'Powtórki: 0/1',
          attemptsCompleted: 0,
          attemptsRequired: 1,
          lastActivityAt: null,
          completedAt: null,
        },
      },
    ];
    setLessonState({
      lessons: [
        createLesson({
          id: 'clock-doc',
          componentId: 'clock',
          contentMode: 'document',
          title: 'Nauka zegara',
        }),
        createLesson({
          id: 'calendar-next',
          componentId: 'calendar',
          title: 'Nauka kalendarza',
          description: 'Ćwicz dni i miesiące',
          emoji: '📅',
          color: 'kangur-gradient-accent-emerald',
          activeBg: 'bg-emerald-500',
          sortOrder: 2000,
        }),
      ],
      documents: {
        'clock-doc': {
          version: 1,
          blocks: [
            {
              id: 'text-1',
              type: 'text',
              html: '<p>Clock lesson</p>',
              align: 'left',
            },
          ],
        },
      },
    });
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => {
      if (entryId === 'lessons-active-header') {
        return {
          entry: {
            id: 'lessons-active-header',
            title: 'Mongo aktywna lekcja',
            summary: 'Mongo nagłówek aktywnej lekcji.',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      if (entryId === 'lessons-active-assignment') {
        return {
          entry: {
            id: 'lessons-active-assignment',
            title: 'Mongo zadanie rodzica',
            summary: 'Mongo opis sekcji zadania dla aktywnej lekcji.',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      if (entryId === 'lessons-active-document') {
        return {
          entry: {
            id: 'lessons-active-document',
            title: 'Mongo materiał lekcji',
            summary: 'Mongo opis dokumentu aktywnej lekcji.',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      if (entryId === 'lessons-active-navigation') {
        return {
          entry: {
            id: 'lessons-active-navigation',
            title: 'Mongo nawigacja lekcji',
            summary: 'Mongo opis przechodzenia między lekcjami.',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      return {
        entry: null,
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    expect(screen.getByText('Nauka zegara')).toBeInTheDocument();
    expect(screen.getByText('Odczytuj godziny')).toBeInTheDocument();
    expect(screen.queryByText('Mongo aktywna lekcja')).not.toBeInTheDocument();
    expect(screen.queryByText('Mongo nagłówek aktywnej lekcji.')).not.toBeInTheDocument();
    expect(screen.getByText('Mongo zadanie rodzica')).toBeInTheDocument();
    expect(screen.getByText('Mongo opis sekcji zadania dla aktywnej lekcji.')).toBeInTheDocument();
    expect(screen.getByText('Mongo materiał lekcji')).toBeInTheDocument();
    expect(screen.getByText('Mongo opis dokumentu aktywnej lekcji.')).toBeInTheDocument();
    expect(useKangurPageContentEntryMock).toHaveBeenCalledWith('lessons-active-navigation');
    expect(screen.queryByText('Mongo nawigacja lekcji')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Mongo opis przechodzenia między lekcjami.')
    ).not.toBeInTheDocument();
  });

  it('falls back to the selected lesson title and description when the active header copy is blank', () => {
    setLessonState({
      lessons: [
        createLesson({
          id: 'clock-component',
          componentId: 'clock',
          contentMode: 'component',
          title: 'Nauka zegara',
          description: 'Odczytuj godziny',
        }),
      ],
    });
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => {
      if (entryId === 'lessons-active-header') {
        return {
          entry: {
            id: 'lessons-active-header',
            title: '   ',
            summary: '   ',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      return {
        entry: null,
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    expect(screen.getByText('Nauka zegara')).toBeInTheDocument();
    expect(screen.getByText('Odczytuj godziny')).toBeInTheDocument();
  });

  it('uses Mongo-backed page-content copy for the empty active-lesson document state when available', () => {
    setLessonState({
      lessons: [
        createLesson({
          id: 'doc-empty',
          componentId: 'logical_patterns',
          contentMode: 'document',
          title: 'Patterns Draft',
        }),
      ],
      documents: {
        'doc-empty': {
          version: 1,
          blocks: [
            {
              id: 'text-empty',
              type: 'text',
              html: '<p> </p>',
              align: 'left',
            },
          ],
        },
      },
    });
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => {
      if (entryId === 'lessons-active-empty-document') {
        return {
          entry: {
            id: 'lessons-active-empty-document',
            title: 'Mongo brak treści lekcji',
            summary: 'Mongo pusty stan aktywnej lekcji.',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      return {
        entry: null,
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /patterns draft/i }));

    expect(screen.getByText('Mongo brak treści lekcji')).toBeInTheDocument();
    expect(screen.getByText('Mongo pusty stan aktywnej lekcji.')).toBeInTheDocument();
  });

  it('uses Mongo-backed page-content copy for the secret lesson panel when available', async () => {
    setLessonState({
      lessons: [
        createLesson(),
        createLesson({
          id: 'kangur-lesson-calendar',
          componentId: 'calendar',
          title: 'Nauka kalendarza',
          description: 'Ćwicz dni i miesiące',
          emoji: '📅',
          color: 'kangur-gradient-accent-emerald',
          activeBg: 'bg-emerald-500',
          sortOrder: 2000,
        }),
      ],
    });
    progressState.value = createProgressState({
      lessonMastery: {
        clock: { completions: 1 },
        calendar: { completions: 1 },
      },
    });
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => {
      if (entryId === 'lessons-active-secret-panel') {
        return {
          entry: {
            id: 'lessons-active-secret-panel',
            title: 'Mongo ukryty final',
            summary: 'Mongo opis ukrytego zakonczenia lekcji.',
          },
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
        };
      }

      return {
        entry: null,
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
      };
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Open secret lesson' }));

    await waitFor(() => expect(screen.getByTestId('lessons-secret-panel')).toBeInTheDocument());

    expect(screen.getByText('Mongo ukryty final')).toBeInTheDocument();
    expect(screen.getByText('Mongo opis ukrytego zakonczenia lekcji.')).toBeInTheDocument();
  });
});
it('renders the lessons wordmark without a duplicate visible text heading', () => {
  setLessonState({
    lessons: [createLesson()],
  });

  renderLessonsPage();

  const heading = screen.getByTestId('kangur-lessons-list-heading');
  const introCard = screen.getByTestId('lessons-list-intro-card');

  expect(screen.getByTestId('kangur-lessons-heading-art')).toBeInTheDocument();
  expect(introCard).toHaveClass('text-center');
  expect(heading).toHaveClass('flex', 'justify-center');
  expect(screen.getByRole('heading', { name: 'Lekcje' })).toBe(heading);
  expect(within(heading).getByText('Lekcje', { selector: 'span' })).toHaveClass('sr-only');
});
