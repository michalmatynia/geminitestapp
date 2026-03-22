/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { act, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import plMessages from '@/i18n/messages/pl.json';
import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';
import { KANGUR_TOP_BAR_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurGuestPlayerProvider } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { createDefaultKangurProgressState } from '@/shared/contracts/kangur';

const {
  useKangurRoutingMock,
  settingsStoreGetMock,
  useKangurProgressStateMock,
  useKangurAuthMock,
  useKangurAssignmentsMock,
  lessonsState,
} = vi.hoisted(() => ({
    useKangurRoutingMock: vi.fn(),
    settingsStoreGetMock: vi.fn(),
    useKangurProgressStateMock: vi.fn(),
    useKangurAuthMock: vi.fn(),
    useKangurAssignmentsMock: vi.fn(),
    lessonsState: {
      value: [] as Array<Record<string, unknown>>,
    },
  }));

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

const { useKangurAgeGroupFocusMock } = vi.hoisted(() => ({
  useKangurAgeGroupFocusMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: useKangurRoutingMock,
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: useKangurAuthMock,
  useOptionalKangurAuth: useKangurAuthMock,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => useKangurAgeGroupFocusMock(),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: settingsStoreGetMock,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurProgressState', () => ({
  useKangurProgressState: useKangurProgressStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurAssignments', () => ({
  useKangurAssignments: useKangurAssignmentsMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessons', () => ({
  useKangurLessons: (options: { subject?: string; enabledOnly?: boolean } = {}) => {
    let data = lessonsState.value;
    if (options.enabledOnly) {
      data = data.filter((lesson) => lesson.enabled !== false);
    }
    if (options.subject) {
      data = data.filter((lesson) => lesson.subject === options.subject);
    }
    return {
      data,
      isLoading: false,
      error: null,
    };
  },
  useKangurLessonDocuments: () => ({
    data: {},
    isLoading: false,
    error: null,
  }),
}));

// Removed manual useKangurLessonSections and useKangurLessonTemplates mocks

// Removed manual useKangurLessonSections and useKangurLessonTemplates mocks

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  KangurAiTutorSessionSync: () => null,
  useOptionalKangurAiTutor: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurTutorAnchor', () => ({
  useKangurTutorAnchor: () => undefined,
}));

import Lessons from '@/features/kangur/ui/pages/Lessons';


const renderWithIntl = (ui: React.ReactElement) =>
  renderWithIntl(
    <NextIntlClientProvider locale='pl' messages={plMessages}>
      {ui}
    </NextIntlClientProvider>
  );

const renderLessonsPage = () =>
  render(
    <KangurGuestPlayerProvider>
      <Lessons />
    </KangurGuestPlayerProvider>
  );

const lessonsSettingsValue = JSON.stringify([
  {
    id: 'kangur-lesson-clock',
    componentId: 'clock',
    subject: 'maths',
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    title: 'Nauka zegara',
    description: 'Odczytuj godziny',
    emoji: '🕐',
    color: 'from-indigo-400 to-purple-500',
    activeBg: 'bg-indigo-500',
    sortOrder: 1000,
    enabled: true,
  },
  {
    id: 'kangur-lesson-geometry-shapes',
    componentId: 'geometry_shapes',
    subject: 'maths',
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    title: 'Figury geometryczne',
    description: 'Poznaj figury',
    emoji: '🔷',
    color: 'from-fuchsia-500 to-violet-500',
    activeBg: 'bg-fuchsia-500',
    sortOrder: 2000,
    enabled: true,
  },
  {
    id: 'kangur-lesson-calendar',
    componentId: 'calendar',
    subject: 'maths',
    ageGroup: DEFAULT_KANGUR_AGE_GROUP,
    title: 'Nauka kalendarza',
    description: 'Dni i miesiące',
    emoji: '📅',
    color: 'from-green-400 to-teal-500',
    activeBg: 'bg-green-500',
    sortOrder: 3000,
    enabled: true,
  },
]);

describe('Lessons page mastery list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback: FrameRequestCallback) => {
      act(() => { callback(0); });
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
    useKangurAuthMock.mockReturnValue({
      user: {
        id: 'parent-ada',
        activeLearner: {
          id: 'learner-ada',
        },
      },
      canAccessParentAssignments: true,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    });
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-ada',
    });
    useKangurAgeGroupFocusMock.mockReturnValue({
      ageGroup: DEFAULT_KANGUR_AGE_GROUP,
      setAgeGroup: vi.fn(),
    });
    lessonsState.value = JSON.parse(lessonsSettingsValue) as Array<Record<string, unknown>>;
    settingsStoreGetMock.mockReturnValue(undefined);
    useKangurAssignmentsMock.mockReturnValue({
      assignments: [
        {
          id: 'assignment-geometry',
          learnerKey: 'ada@example.com',
          title: '🔷 Figury geometryczne',
          description: 'To zadanie ma priorytet od rodzica.',
          priority: 'high',
          archived: false,
          target: {
            type: 'lesson',
            lessonComponentId: 'geometry_shapes',
            requiredCompletions: 1,
            baselineCompletions: 0,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
          progress: {
            status: 'not_started',
            percent: 0,
            summary: 'Powtórki po przydziale: 0/1.',
            attemptsCompleted: 0,
            attemptsRequired: 1,
            lastActivityAt: null,
            completedAt: null,
          },
        },
        {
          id: 'assignment-calendar-completed',
          learnerKey: 'ada@example.com',
          title: '📅 Nauka kalendarza',
          description: 'To zadanie od rodzica zostało zakończone.',
          priority: 'medium',
          archived: false,
          target: {
            type: 'lesson',
            lessonComponentId: 'calendar',
            requiredCompletions: 1,
            baselineCompletions: 0,
          },
          assignedByName: 'Ada',
          assignedByEmail: 'ada@example.com',
          createdAt: '2026-03-06T09:00:00.000Z',
          updatedAt: '2026-03-06T10:30:00.000Z',
          progress: {
            status: 'completed',
            percent: 100,
            summary: 'Powtorki po przydziale: 1/1.',
            attemptsCompleted: 1,
            attemptsRequired: 1,
            lastActivityAt: '2026-03-06T10:30:00.000Z',
            completedAt: '2026-03-06T10:30:00.000Z',
          },
        },
      ],
      isLoading: false,
      error: null,
      createAssignment: vi.fn(),
      updateAssignment: vi.fn(),
      refresh: vi.fn(),
    });
    const baseProgress = createDefaultKangurProgressState();
    useKangurProgressStateMock.mockReturnValue({
      ...baseProgress,
      lessonMastery: {
        ...baseProgress.lessonMastery,
        clock: {
          attempts: 2,
          completions: 2,
          masteryPercent: 92,
          bestScorePercent: 100,
          lastScorePercent: 84,
          lastCompletedAt: '2026-03-06T10:00:00.000Z',
        },
        geometry_shapes: {
          attempts: 1,
          completions: 1,
          masteryPercent: 45,
          bestScorePercent: 45,
          lastScorePercent: 45,
          lastCompletedAt: '2026-03-06T11:00:00.000Z',
        },
      },
    });
  });

  it('shows mastery badges and summaries for each lesson card', async () => {
    renderLessonsPage();

    expect(await screen.findByRole('heading', { name: 'Lekcje' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-lessons-heading-art')).toHaveAttribute('viewBox', '0 0 560 164');
    expect(screen.getByRole('button', { name: 'Wróć do poprzedniej strony' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wszystkie' })).not.toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Strona główna' });
    const topBar = link.closest('div.sticky');
    expect(topBar).toBeInTheDocument();
    expect(topBar?.className).toContain('sticky');
    expect(topBar?.className).toContain('top-0');
    expect(screen.getByText('Opanowane 92%')).toBeInTheDocument();
    expect(screen.getByText('Powtorz 45%')).toBeInTheDocument();
    expect(screen.getByText('Nowa')).toBeInTheDocument();
    expect(screen.getByText('Priorytet rodzica')).toBeInTheDocument();
    expect(screen.getByText('Priorytet wysoki')).toBeInTheDocument();
    expect(screen.getByText('To zadanie ma priorytet od rodzica.')).toBeInTheDocument();
    expect(screen.getByText('Ukończone dla rodzica')).toBeInTheDocument();
    expect(screen.getByText('Zadanie zamkniete')).toBeInTheDocument();
    expect(
      screen.getByText('Zadanie od rodzica zostalo juz wykonane.', { exact: false })
    ).toBeInTheDocument();
    expect(screen.getByText('Powtorki po przydziale: 1/1.', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Ukończono 2× · najlepszy wynik 100%')).toBeInTheDocument();
    expect(screen.getByText('Ukończono 1× · ostatni wynik 45%')).toBeInTheDocument();
    expect(screen.getByText('Brak zapisanej praktyki')).toBeInTheDocument();
    const lessonCards = screen
      .getAllByRole('button')
      .filter((button) =>
        ['Nauka zegara', 'Figury geometryczne', 'Nauka kalendarza'].some((label) =>
          (button.textContent ?? '').includes(label)
        )
      );
    expect(lessonCards[0]).toHaveTextContent('Figury geometryczne');
  });

  it('sticks the header flush to the top inside the admin shell too', async () => {
    useKangurRoutingMock.mockReturnValue({ basePath: '/admin/kangur', pageKey: 'lessons' });

    renderLessonsPage();

    await screen.findByRole('heading', { name: 'Lekcje' });
    const link = screen.getByRole('link', { name: 'Strona główna' });
    expect(link).toHaveAttribute('href', '/admin/kangur');
    const topBar = link.closest('div.sticky');
    expect(topBar).toBeInTheDocument();
    expect(topBar?.className).toContain('sticky');
    expect(topBar?.className).toContain('top-0');
  });

  it('renders top section instantly and then reveals lesson list after deferred content is ready', async () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.mocked(window.requestAnimationFrame).mockImplementation((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });

    window.history.replaceState({}, '', '/kangur/lessons');
    renderLessonsPage();

    expect(screen.getByRole('heading', { name: 'Lekcje' })).toBeInTheDocument();
    expect(screen.getByText('Lekcje zaraz beda gotowe.', { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /nauka zegara/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Ladowanie lekcji...')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lessons-loading-fallback')).not.toBeInTheDocument();

    expect(frameCallbacks).toHaveLength(1);
    act(() => {
      frameCallbacks[0](0);
    });

    expect(await screen.findByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
    expect(screen.queryByText('Lekcje zaraz beda gotowe.', { exact: false })).not.toBeInTheDocument();
  });

  it('keeps loading copy visible until deferred content resolves', async () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.mocked(window.requestAnimationFrame).mockImplementation((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });

    renderLessonsPage();

    const section = screen.getByTestId('lessons-shell-transition');
    expect(section).toBeInTheDocument();
    expect(screen.getByText('Lekcje zaraz beda gotowe.', { exact: false })).toBeInTheDocument();
    expect(
      screen.queryByText('Wybierz temat i przejdz od razu do praktyki lub powtórki.')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('lessons-list-transition')).not.toBeInTheDocument();

    act(() => {
      frameCallbacks[0](0);
    });

    const contentTransitionSection = await screen.findByTestId('lessons-list-transition');
    expect(contentTransitionSection).toBeInTheDocument();
    expect(screen.queryByText('Lekcje zaraz beda gotowe.', { exact: false })).not.toBeInTheDocument();
    const introText = 'Wybierz temat i przejdz od razu do praktyki lub powtórki.';
    expect(
      screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'p' && content.includes('Wybierz temat');
      })
    ).toBeInTheDocument();  });

  it('keeps a stable top section copy between initial and fully rendered states', async () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.mocked(window.requestAnimationFrame).mockImplementation((callback: FrameRequestCallback) => {
      frameCallbacks.push(callback);
      return 1;
    });

    renderLessonsPage();

    expect(screen.getByRole('heading', { name: 'Lekcje' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /strona główna/i })).toHaveLength(1);

    act(() => {
      frameCallbacks[0](0);
    });

    expect(await screen.findByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lekcje' })).toBeInTheDocument();
  });
});
