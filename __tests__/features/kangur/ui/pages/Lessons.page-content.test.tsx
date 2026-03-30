/**
 * @vitest-environment jsdom
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  assignmentsState,
  authState,
  createLesson,
  createProgressState,
  progressState,
  renderLessonsPage,
  resetLessonsTestState,
  setLessonState,
  useKangurPageContentEntryMock,
} from './Lessons.test-support';

describe('Lessons', () => {
  beforeEach(() => {
    resetLessonsTestState();
  });

  it('uses shared chips for lesson library assignment and mastery states', async () => {
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

    await renderLessonsPage();

    expect(screen.getByRole('button', { name: /nauka zegara/i })).toHaveClass(
      'soft-card',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_92%,var(--kangur-page-background))]'
    );
    expect(screen.getByTestId('lesson-library-icon-clock-doc')).toHaveClass(
      'h-16',
      'w-16',
      'kangur-gradient-icon-tile-lg'
    );
    expect(screen.getByTestId('lesson-library-footer-assignment-chip')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByText('Opanowane 92%')).toHaveClass('rounded-full', 'border');
    expect(screen.getByText('Priorytet wysoki')).toHaveClass('rounded-full', 'border');

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    expect(screen.getByTestId('active-lesson-parent-priority-chip')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('active-lesson-parent-priority-chip')).toHaveTextContent(
      'Priorytet rodzica'
    );
    expect(screen.queryByText('Powtórz naukę zegara')).toBeNull();
    expect(screen.queryByText('Skup się na odczytywaniu godzin.')).toBeNull();
  });

  it('shows a compact completed parent-assignment pill in the active lesson header', async () => {
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

    await renderLessonsPage();

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

  it('hides parent assignment markers in local mode even if stale assignment data exists', async () => {
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

    await renderLessonsPage();

    expect(screen.queryByText('Priorytet rodzica')).toBeNull();
    expect(screen.queryByText('Ukończone dla rodzica')).toBeNull();
    expect(screen.queryByText('Powtórz naukę zegara')).toBeNull();
  });

  it('uses the shared empty-state surface when no lessons are enabled', async () => {
    setLessonState({
      lessons: [createLesson({ enabled: false })],
    });

    await renderLessonsPage();

    const emptyTitle = screen.getByText('Brak aktywnych lekcji', { selector: 'div' });
    expect(emptyTitle).toBeInTheDocument();
    expect(emptyTitle.parentElement).toHaveClass(
      'soft-card',
      'border-dashed',
      'border'
    );
  });

  it('uses Mongo-backed page-content copy for the lessons list intro and empty state when available', async () => {
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

    await renderLessonsPage();

    expect(screen.getByText('Mongo intro do lekcji.')).toBeInTheDocument();
    expect(screen.getByText('Brak gotowych lekcji')).toBeInTheDocument();
    expect(screen.getByText('Mongo pusty stan listy lekcji.')).toBeInTheDocument();
  });

  it('keeps the selected lesson title in the active header while still using Mongo-backed copy for assignment and document sections', async () => {
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

    await renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    const activeHeader = screen.getByTestId('active-lesson-header');
    expect(within(activeHeader).getByText('Nauka zegara', { selector: 'h2' })).toBeInTheDocument();
    expect(
      within(activeHeader).getByText('Odczytuj godziny', { selector: 'p' })
    ).toBeInTheDocument();
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

  it('falls back to the selected lesson title and description when the active header copy is blank', async () => {
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

    await renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));

    const activeHeader = screen.getByTestId('active-lesson-header');
    expect(within(activeHeader).getByText('Nauka zegara', { selector: 'h2' })).toBeInTheDocument();
    expect(
      within(activeHeader).getByText('Odczytuj godziny', { selector: 'p' })
    ).toBeInTheDocument();
  });

  it('uses Mongo-backed page-content copy for the empty active-lesson document state when available', async () => {
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

    await renderLessonsPage();

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

    await renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Open secret lesson' }));

    await waitFor(() => expect(screen.getByTestId('lessons-secret-panel')).toBeInTheDocument());

    expect(screen.getByText('Mongo ukryty final')).toBeInTheDocument();
    expect(screen.getByText('Mongo opis ukrytego zakonczenia lekcji.')).toBeInTheDocument();
  });

  it('renders the lessons wordmark without a duplicate visible text heading', async () => {
    setLessonState({
      lessons: [createLesson()],
    });

    await renderLessonsPage();

    const heading = screen.getByTestId('kangur-lessons-list-heading');
    const introCard = screen.getByTestId('lessons-list-intro-card');

    expect(screen.getByTestId('kangur-lessons-heading-art')).toBeInTheDocument();
    expect(introCard).toHaveClass('text-center');
    expect(heading).toHaveClass('flex', 'justify-center');
    expect(screen.getByRole('heading', { name: 'Lekcje' })).toBe(heading);
    expect(within(heading).getByText('Lekcje', { selector: 'span' })).toHaveClass('sr-only');
  });
});
