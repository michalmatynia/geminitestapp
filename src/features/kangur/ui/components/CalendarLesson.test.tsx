/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import plMessages from '@/i18n/messages/pl.json';

const subjectFocusState = vi.hoisted(() => ({ subjectKey: 'learner-1' }));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => ({
    subject: 'maths',
    setSubject: vi.fn(),
    subjectKey: subjectFocusState.subjectKey,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonPanelProgress', async () => {
  const { useLessonHubProgress } =
    await vi.importActual<typeof import('@/features/kangur/ui/hooks/useLessonHubProgress')>(
      '@/features/kangur/ui/hooks/useLessonHubProgress'
    );
  return {
    useKangurLessonPanelProgress: ({
      slideSections,
    }: {
      slideSections: Partial<Record<string, readonly unknown[]>>;
    }) => {
      const { markSectionOpened, markSectionViewedCount, sectionProgress } =
        useLessonHubProgress(slideSections);
      return {
        markSectionOpened,
        markSectionViewedCount,
        recordPanelTime: vi.fn(),
        sectionProgress,
      };
    },
  };
});

import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/lesson-runtime/KangurLessonNavigationWidget';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

import CalendarLesson from '@/features/kangur/ui/components/CalendarLesson';

const renderWithIntl = (element: ReactElement) =>
  render(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {element}
    </NextIntlClientProvider>
  );

const addXpMock = vi.fn();
const loadProgressMock = vi.fn(() => ({
  lessonsCompleted: 0,
  lessonMastery: {},
}));

vi.mock('@/features/kangur/ui/components/KangurLessonActivityInstanceRuntime', () => ({
  __esModule: true,
  default: ({
    gameId,
    instanceId,
    onFinish,
  }: {
    gameId: string;
    instanceId: string;
    onFinish: () => void;
  }): React.JSX.Element => {
    const section =
      instanceId === 'calendar_interactive:instance:calendar-days'
        ? 'dni'
        : instanceId === 'calendar_interactive:instance:calendar-months'
          ? 'miesiace'
          : instanceId === 'calendar_interactive:instance:calendar-dates'
            ? 'data'
            : 'mixed';

    return (
      <div data-testid='mock-calendar-interactive-game'>
        <span data-testid='mock-calendar-interactive-game-id'>{gameId}</span>
        <span data-testid='mock-calendar-interactive-instance-id'>{instanceId}</span>
        <span data-testid='mock-calendar-interactive-section'>{section}</span>
        <button type='button' onClick={onFinish}>
          Finish calendar training
        </button>
      </div>
    );
  },
}));

vi.mock('@/features/kangur/ui/services/progress', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/services/progress')>();
  return {
    ...actual,
    addXp: (...args: unknown[]): unknown => addXpMock(...args),
    loadProgress: (...args: unknown[]): unknown => loadProgressMock(...args),
    createLessonCompletionReward: vi.fn(() => ({
      xp: 28,
      scorePercent: 60,
      progressUpdates: {},
    })),
  };
});

describe('CalendarLesson section hub layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    subjectFocusState.subjectKey = 'learner-1';
  });

  it('renders calendar sections as a lesson hub with dedicated training cards', () => {
    renderWithIntl(<CalendarLesson />);

    expect(screen.getByTestId('lesson-hub-section-intro')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-dni')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-miesiace')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-data')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_days')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_months')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-section-game_dates')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Dni tygodnia')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Miesiące')).toBeInTheDocument();
    expect(screen.getByText('Ćwiczenie: Daty')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-intro')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dni')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-miesiace')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-data')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-game_days')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-hub-progress-dot-game_days-0')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('opens a lesson section and returns to topics', async () => {
    renderWithIntl(<CalendarLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-miesiace'));

    await waitFor(() => {
      expect(screen.getByText('12 miesięcy roku')).toBeInTheDocument();
    });
    expect(screen.getByTestId('lesson-slide-shell')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Ile dni ma miesiąc?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-miesiace')).toBeInTheDocument();
    });
  });

  it('updates hub progress after viewing more slides in a section', async () => {
    renderWithIntl(<CalendarLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-miesiace'));

    await waitFor(() => {
      expect(screen.getByText('12 miesięcy roku')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-slide-indicator-1'));

    await waitFor(() => {
      expect(screen.getByText('Ile dni ma miesiąc?')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Wróć do tematów' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-miesiace')).toBeInTheDocument();
    });

    expect(screen.getByTestId('lesson-hub-progress-dot-miesiace-0')).toHaveClass('bg-emerald-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-miesiace-1')).toHaveClass('bg-emerald-200');
    expect(screen.getByTestId('lesson-hub-progress-dot-dni-0')).toHaveClass(
      'kangur-step-pill-pending'
    );
  });

  it('opens dedicated training cards and passes the selected section into the game', async () => {
    renderWithIntl(<CalendarLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_dates'));

    await waitFor(() => {
      expect(screen.getByTestId('calendar-lesson-game-shell')).toBeInTheDocument();
    });

    expect(
      screen
        .getByRole('button', { name: 'Wróć do tematów' })
        .closest('[data-testid="calendar-lesson-game-shell"]')
    ).toBeNull();
    expect(screen.queryByTestId('lesson-hub-section-game_dates')).toBeNull();
    expect(
      within(screen.getByTestId('calendar-lesson-game-shell')).getByText('Ćwiczenie: Daty')
    ).toBeInTheDocument();
    expect(screen.getByTestId('mock-calendar-interactive-game')).toBeInTheDocument();
    expect(screen.getByTestId('mock-calendar-interactive-game-id')).toHaveTextContent(
      'calendar_interactive'
    );
    expect(screen.getByTestId('mock-calendar-interactive-instance-id')).toHaveTextContent(
      'calendar_interactive:instance:calendar-dates'
    );
    expect(screen.getByTestId('mock-calendar-interactive-section')).toHaveTextContent('data');
    expect(loadProgressMock).toHaveBeenCalledWith({ ownerKey: 'learner-1' });
    expect(addXpMock).toHaveBeenCalledTimes(1);
    expect(addXpMock).toHaveBeenCalledWith(28, {}, { ownerKey: 'learner-1' });
    expect(screen.queryByTestId('calendar-lesson-training-prev-button')).toBeNull();
    expect(screen.queryByTestId('calendar-lesson-training-next-button')).toBeNull();
    expect(screen.queryByTestId('calendar-lesson-training-indicator-2')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Finish calendar training' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_dates')).toBeInTheDocument();
    });
  });

  it('hides lesson-to-lesson navigation while a calendar training game is active', async () => {
    renderWithIntl(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <CalendarLesson />
        <KangurLessonNavigationWidget
          nextLesson={{
            id: 'lesson-clock',
            emoji: '🕐',
            title: 'Nauka zegara',
          }}
          onSelectLesson={vi.fn()}
        />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByRole('button', { name: /Nauka zegara/i })).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_days'));

    await waitFor(() => {
      expect(screen.getByTestId('calendar-lesson-game-shell')).toBeInTheDocument();
    });

    expect(screen.queryByRole('button', { name: /Nauka zegara/i })).not.toBeInTheDocument();
  });

  it('does not award lesson completion xp twice when switching calendar training sections', async () => {
    renderWithIntl(<CalendarLesson />);

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_days'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-calendar-interactive-section')).toHaveTextContent('dni');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Finish calendar training' }));

    await waitFor(() => {
      expect(screen.getByTestId('lesson-hub-section-game_months')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_months'));

    await waitFor(() => {
      expect(screen.getByTestId('mock-calendar-interactive-section')).toHaveTextContent(
        'miesiace'
      );
    });

    expect(addXpMock).toHaveBeenCalledTimes(1);
  });

  it('uses the rerendered learner key when opening a training card', async () => {
    const view = renderWithIntl(<CalendarLesson />);

    subjectFocusState.subjectKey = 'learner-2';
    view.rerender(
      <NextIntlClientProvider locale='pl' messages={plMessages}>
        <CalendarLesson />
      </NextIntlClientProvider>
    );

    fireEvent.click(screen.getByTestId('lesson-hub-section-game_days'));

    await waitFor(() => {
      expect(screen.getByTestId('calendar-lesson-game-shell')).toBeInTheDocument();
    });

    expect(loadProgressMock).toHaveBeenCalledWith({ ownerKey: 'learner-2' });
    expect(addXpMock).toHaveBeenCalledWith(28, {}, { ownerKey: 'learner-2' });
  });
});
