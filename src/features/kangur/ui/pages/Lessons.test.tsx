/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/__tests__/test-utils';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';
const { settingsStoreMock, authState, assignmentsState, progressState, routerPushMock } = vi.hoisted(() => ({
  settingsStoreMock: {
    get: vi.fn<(key: string) => string | undefined>(),
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
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

vi.mock('next/dynamic', async () => {
  const lessonNavigation = await import(
    '@/features/kangur/ui/context/KangurLessonNavigationContext'
  );

  return {
    default: () =>
      function MockLegacyLesson({ onBack }: { onBack: () => void }): React.JSX.Element {
        const secretLessonPill = lessonNavigation.useKangurLessonSecretPill();

        return (
          <div data-testid='legacy-lesson'>
            <div>Legacy lesson renderer</div>
            {secretLessonPill?.isUnlocked ? (
              <button type='button' onClick={secretLessonPill.onOpen}>
                Open secret lesson
              </button>
            ) : null}
            <button type='button' onClick={onBack}>
              Back
            </button>
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

import { KANGUR_LESSON_DOCUMENTS_SETTING_KEY } from '@/features/kangur/lesson-documents';
import { KANGUR_HELP_SETTINGS_KEY, KANGUR_LESSONS_SETTING_KEY } from '@/features/kangur/settings';
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
  contentMode: 'component',
  title: 'Nauka zegara',
  description: 'Odczytuj godziny',
  emoji: '🕐',
  color: 'from-indigo-400 to-purple-500',
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

const setSettingsStore = ({
  lessons,
  documents,
  helpSettings,
}: {
  lessons: Array<Record<string, unknown>>;
  documents?: Record<string, unknown>;
  helpSettings?: Record<string, unknown>;
}): void => {
  settingsStoreMock.get.mockImplementation((key: string) => {
    if (key === KANGUR_LESSONS_SETTING_KEY) {
      return JSON.stringify(lessons);
    }

    if (key === KANGUR_LESSON_DOCUMENTS_SETTING_KEY) {
      return documents ? JSON.stringify(documents) : undefined;
    }

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
    authState.value = {
      user: null,
      canAccessParentAssignments: false,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    };
  });

  it('renders stored document content when the lesson is explicitly in document mode', () => {
    setSettingsStore({
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
      'soft-card',
      'border-sky-300'
    );
    expect(screen.queryByTestId('legacy-lesson')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });

  it('keeps the secret lesson trigger hidden until every lesson has recorded mastery', () => {
    setSettingsStore({
      lessons: [
        createLesson(),
        createLesson({
          id: 'kangur-lesson-calendar',
          componentId: 'calendar',
          title: 'Nauka kalendarza',
          description: 'Ćwicz dni i miesiące',
          emoji: '📅',
          color: 'from-emerald-400 to-cyan-400',
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
    setSettingsStore({
      lessons: [
        createLesson(),
        createLesson({
          id: 'kangur-lesson-calendar',
          componentId: 'calendar',
          title: 'Nauka kalendarza',
          description: 'Ćwicz dni i miesiące',
          emoji: '📅',
          color: 'from-emerald-400 to-cyan-400',
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
    setSettingsStore({
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
      expect(screen.getByRole('link', { name: 'Strona glowna' })).toHaveAttribute(
        'href',
        '/kangur'
      )
    );
    expect(screen.getByRole('link', { name: 'Strona glowna' })).toHaveAttribute(
      'title',
      'Home Navigation: Returns to the main Kangur practice hub and quick-start home screen.'
    );
    expect(screen.getByRole('button', { name: /nauka zegara/i })).toHaveAttribute(
      'title',
      'Lesson Card: Opens a lesson from the Kangur lesson library and shows its progress state.'
    );
  });

  it('uses app-router navigation when the fallback back action has no browser history entry', () => {
    setSettingsStore({
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
      expect(routerPushMock).toHaveBeenCalledWith('/kangur');
    } finally {
      Object.defineProperty(window.history, 'length', {
        configurable: true,
        value: originalHistoryLength,
      });
      historyBackSpy.mockRestore();
    }
  });

  it('keeps using the legacy component renderer when the lesson stays in component mode', () => {
    setSettingsStore({
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
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const originalHtmlScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoViewMock = vi.fn();

    Element.prototype.scrollIntoView = scrollIntoViewMock;
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    try {
      setSettingsStore({
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

      await waitFor(() =>
        expect(scrollIntoViewMock).toHaveBeenCalledWith({
          behavior: 'auto',
          block: 'start',
        })
      );
      expect(screen.getByTestId('active-lesson-header')).toBeInTheDocument();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
      HTMLElement.prototype.scrollIntoView = originalHtmlScrollIntoView;
    }
  });

  it('returns from an active lesson to the lessons library via the shared header back button', () => {
    setSettingsStore({
      lessons: [createLesson()],
    });

    renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do listy lekcji' }));

    expect(screen.getByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
    expect(screen.queryByTestId('legacy-lesson')).not.toBeInTheDocument();
  });

  it('uses the smoother motion preset for lessons list and active lesson transitions', () => {
    setSettingsStore({
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
    setSettingsStore({
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
      screen.getByText(
        'This lesson is set to use custom document content, but no document blocks have been saved yet.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('lessons-empty-document-summary')).toHaveClass(
      'soft-card',
      'border-amber-300'
    );
    expect(screen.getByText('Lesson document')).toHaveClass('border-amber-200', 'bg-amber-100');
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
        title: 'Powtorz nauke zegara',
        description: 'Skup sie na odczytywaniu godzin.',
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
          summary: 'Powtorki: 0/1',
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

    setSettingsStore({
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

    expect(screen.getByRole('button', { name: /nauka zegara/i })).toHaveClass('soft-card');
    expect(screen.getByTestId('lesson-library-icon-clock-doc')).toHaveClass(
      'h-16',
      'w-16',
      'rounded-[24px]'
    );
    expect(screen.getByText('Wlasna zawartosc')).toHaveClass('border-sky-200', 'bg-sky-100');
    expect(screen.getAllByText('Priorytet rodzica')[0]).toHaveClass('border-rose-200', 'bg-rose-100');
    expect(screen.getByText('Opanowane 92%')).toHaveClass('border-emerald-200', 'bg-emerald-100');
    expect(screen.getByText('Priorytet wysoki')).toHaveClass('border-rose-200', 'bg-rose-100');

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    expect(screen.getByTestId('active-lesson-parent-priority-chip')).toHaveClass(
      'border-rose-200',
      'bg-rose-100'
    );
    expect(screen.getByTestId('active-lesson-parent-priority-chip')).toHaveTextContent(
      'Priorytet Rodzica'
    );
    expect(screen.queryByText('Powtorz nauke zegara')).toBeNull();
    expect(screen.queryByText('Skup sie na odczytywaniu godzin.')).toBeNull();
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
        title: 'Powtorz dodawanie',
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
          summary: 'Powtorki: 1/1',
          attemptsCompleted: 1,
          attemptsRequired: 1,
          lastActivityAt: '2026-03-07T10:00:00.000Z',
          completedAt: '2026-03-07T10:00:00.000Z',
        },
      },
    ];

    setSettingsStore({
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
      'border-emerald-200',
      'bg-emerald-100'
    );
    expect(screen.getByTestId('active-lesson-parent-completed-chip')).toHaveTextContent(
      'Ukonczone dla rodzica'
    );
    expect(screen.queryByText('Powtorz dodawanie')).toBeNull();
    expect(screen.queryByText('Wykonane wczoraj.')).toBeNull();
  });

  it('hides parent assignment markers in local mode even if stale assignment data exists', () => {
    assignmentsState.value = [
      {
        id: 'assignment-priority',
        learnerKey: 'jan@example.com',
        title: 'Powtorz nauke zegara',
        description: 'Skup sie na odczytywaniu godzin.',
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
          summary: 'Powtorki: 0/1',
          attemptsCompleted: 0,
          attemptsRequired: 1,
          lastActivityAt: null,
          completedAt: null,
        },
      },
    ];

    setSettingsStore({
      lessons: [createLesson()],
    });

    renderLessonsPage();

    expect(screen.queryByText('Priorytet rodzica')).toBeNull();
    expect(screen.queryByText('Ukonczone dla rodzica')).toBeNull();
    expect(screen.queryByText('Powtorz nauke zegara')).toBeNull();
  });

  it('uses the shared empty-state surface when no lessons are enabled', () => {
    setSettingsStore({
      lessons: [createLesson({ enabled: false })],
    });

    renderLessonsPage();

    const emptyTitle = screen.getByText(/Brak aktywnych lekcji/i);
    expect(emptyTitle).toBeInTheDocument();
    expect(emptyTitle.parentElement).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
  });
});
it('renders the lessons wordmark without a duplicate visible text heading', () => {
  setSettingsStore({
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
