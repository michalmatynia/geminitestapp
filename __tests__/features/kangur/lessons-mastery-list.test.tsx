/**
 * @vitest-environment jsdom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';

import { DEFAULT_KANGUR_AGE_GROUP } from '@/features/kangur/lessons/lesson-catalog';

import {
  lessonsState,
  renderLessonsPage,
  resetLessonsTestState,
  useKangurRoutingMock,
  useKangurAuthMock,
  useKangurProgressStateMock,
  useKangurAgeGroupFocusMock,
  useKangurSubjectFocusMock,
  useKangurAssignmentsMock,
} from './ui/pages/Lessons.test-support';

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
    resetLessonsTestState();
    vi.clearAllMocks();
    
    useKangurRoutingMock.mockReturnValue({ basePath: '/kangur' });
    
    useKangurAuthMock.mockImplementation(() => ({
      user: {
        id: 'parent-ada',
        activeLearner: {
          id: 'learner-ada',
        },
      },
      canAccessParentAssignments: true,
      navigateToLogin: vi.fn(),
      logout: vi.fn(),
    }));

    useKangurSubjectFocusMock.mockImplementation(() => ({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-ada',
    }));

    useKangurAgeGroupFocusMock.mockImplementation(() => ({
      ageGroup: DEFAULT_KANGUR_AGE_GROUP,
      setAgeGroup: vi.fn(),
    }));

    lessonsState.value = JSON.parse(lessonsSettingsValue) as Array<Record<string, unknown>>;

    useKangurAssignmentsMock.mockImplementation(() => ({
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
    }));

    useKangurProgressStateMock.mockImplementation(() => ({
      lessonMastery: {
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
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows mastery badges and summaries for each lesson card', async () => {
    await renderLessonsPage();

    expect(await screen.findByTestId('kangur-lessons-list-heading')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
    expect(await screen.findByTestId('kangur-lessons-heading-art')).toBeInTheDocument();
    
    expect(await screen.findByText('Opanowane 92%')).toBeInTheDocument();
    expect(await screen.findByText('Powtorz 45%')).toBeInTheDocument();
    expect(await screen.findByText('Nowa')).toBeInTheDocument();
    
    expect(await screen.findByText('Ukończono 2× · najlepszy wynik 100%')).toBeInTheDocument();
    expect(await screen.findByText('Ukończono 1× · ostatni wynik 45%')).toBeInTheDocument();
    expect(await screen.findByText('Brak zapisanej praktyki')).toBeInTheDocument();
    
    const lessonCards = screen
      .getAllByRole('button')
      .filter((button) =>
        ['Nauka zegara', 'Figury geometryczne', 'Nauka kalendarza'].some((label) =>
          (button.textContent ?? '').includes(label)
        )
      );
    expect(lessonCards).toHaveLength(3);
  });

  it('sticks the header flush to the top inside the admin shell too', async () => {
    useKangurRoutingMock.mockReturnValue({ basePath: '/admin/kangur', pageKey: 'lessons' });

    await renderLessonsPage();

    expect(await screen.findByTestId('kangur-lessons-list-heading')).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Strona główna' });
    expect(link).toHaveAttribute('href', '/admin/kangur');
    const topBar = link.closest('div.sticky');
    expect(topBar).toBeInTheDocument();
    expect(topBar?.className).toContain('sticky');
    expect(topBar?.className).toContain('top-0');
  });

  it('renders the top section instantly and then settles on the lesson list', async () => {
    window.history.replaceState({}, '', '/kangur/lessons');
    await renderLessonsPage();

    expect(await screen.findByTestId('kangur-lessons-list-heading')).toBeInTheDocument();
    expect(await screen.findByText(/Wybierz temat/i)).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
    expect(screen.queryByTestId('lessons-intro-loading-state')).not.toBeInTheDocument();
  });

  it('keeps the lessons shell mounted while the catalog becomes interactive', async () => {
    await renderLessonsPage();

    expect(await screen.findByTestId('lessons-shell-transition')).toBeInTheDocument();
    expect(await screen.findByTestId('lessons-list-transition')).toBeInTheDocument();
    expect(await screen.findByText(/Wybierz temat/i)).toBeInTheDocument();

    expect(screen.queryByTestId('lessons-intro-loading-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('lessons-catalog-skeleton')).not.toBeInTheDocument();
  });

  it('keeps a stable top section copy between initial and fully rendered states', async () => {
    await renderLessonsPage();

    expect(await screen.findByTestId('kangur-lessons-list-heading')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /strona główna/i })).toBeInTheDocument();

    expect(await screen.findByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-lessons-list-heading')).toBeInTheDocument();
  });
});
