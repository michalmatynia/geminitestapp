/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { render } from '@/__tests__/test-utils';
const { settingsStoreMock, authState, assignmentsState, progressState } = vi.hoisted(() => ({
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
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MockLegacyLesson({ onBack }: { onBack: () => void }): React.JSX.Element {
      return (
        <div data-testid='legacy-lesson'>
          <div>Legacy lesson renderer</div>
          <button type='button' onClick={onBack}>
            Back
          </button>
        </div>
      );
    },
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('framer-motion', () => {
  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) =>
    function MotionTag({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
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
      return React.createElement(tag, props, children);
    };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({ basePath: '/kangur' }),
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: () => ({
    assignments: assignmentsState.value,
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
import Lessons from '@/features/kangur/ui/pages/Lessons';

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
    assignmentsState.value = [];
    progressState.value = {
      lessonMastery: {},
    };
    authState.value = {
      user: null,
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

    render(<Lessons />);

    fireEvent.click(screen.getByRole('button', { name: /shapes with svg/i }));

    expect(screen.getByTestId('lesson-document-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-document-summary')).toHaveClass(
      'soft-card',
      'border-sky-300'
    );
    expect(screen.queryByTestId('legacy-lesson')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wroc do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
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

    render(<Lessons />);

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Strona glowna' })).toHaveAttribute(
        'title',
        'Home Navigation: Returns to the main Kangur practice hub and quick-start home screen.'
      )
    );
    expect(screen.getByRole('button', { name: /nauka zegara/i })).toHaveAttribute(
      'title',
      'Lesson Card: Opens a lesson from the Kangur lesson library and shows its progress state.'
    );
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

    render(<Lessons />);

    fireEvent.click(screen.getByRole('button', { name: /classic clock/i }));

    expect(screen.getByTestId('legacy-lesson')).toBeInTheDocument();
    expect(screen.queryByTestId('lesson-document-renderer')).not.toBeInTheDocument();
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

    render(<Lessons />);

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
    expect(screen.getByRole('button', { name: 'Wroc do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });

  it('uses shared chips for lesson library document and assignment states', () => {
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
    progressState.value = {
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
    };

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

    render(<Lessons />);

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
  });

  it('uses the shared empty-state surface when no lessons are enabled', () => {
    setSettingsStore({
      lessons: [createLesson({ enabled: false })],
    });

    render(<Lessons />);

    const emptyTitle = screen.getByText(/Brak aktywnych lekcji/i);
    expect(emptyTitle).toBeInTheDocument();
    expect(emptyTitle.parentElement).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
  });
});
