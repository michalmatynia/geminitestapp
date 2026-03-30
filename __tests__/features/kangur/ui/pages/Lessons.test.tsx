/**
 * @vitest-environment jsdom
 */

import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createLesson,
  createProgressState,
  progressState,
  renderLessonsPage,
  resetLessonsTestState,
  routerPushMock,
  setLessonState,
} from './Lessons.test-support';

describe('Lessons', () => {
  beforeEach(() => {
    resetLessonsTestState();
  });

  it('renders stored document content when the lesson is explicitly in document mode', async () => {
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

    await renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /shapes with svg/i }));

    const activeLessonView = screen.getByTestId('lessons-active-transition');

    expect(screen.getByTestId('lesson-document-renderer')).toBeInTheDocument();
    expect(screen.getByTestId('lessons-document-summary')).toHaveClass('soft-card');
    expect(within(activeLessonView).queryAllByTestId('legacy-lesson')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Wróć do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });

  it('renders each lesson component only once when persisted settings contain duplicates', async () => {
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

    await renderLessonsPage();

    expect(screen.getAllByRole('button', { name: /nauka zegara/i })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: /nauka zegara duplicate/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /nauka kalendarza/i })).toBeInTheDocument();
  });

  it('keeps only the lesson navigation button at the bottom and constrains its width', async () => {
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

    await renderLessonsPage();

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

  it('keeps the secret lesson trigger hidden until every lesson has recorded mastery', async () => {
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

    await renderLessonsPage();

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

    await renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Open secret lesson' }));

    await waitFor(() => expect(screen.getByTestId('lessons-secret-panel')).toBeInTheDocument());

    expect(
      within(screen.getByTestId('lessons-active-transition')).queryAllByTestId('legacy-lesson')
    ).toHaveLength(0);
    expect(screen.getByTestId('lessons-secret-pill-chip')).toHaveTextContent(
      'Sekret odblokowany'
    );
    expect(screen.getByTestId('lessons-secret-host-label')).toHaveTextContent(
      'Nauka kalendarza'
    );
  });

  it('keeps documentation metadata hooks on lesson navigation controls when tooltips are enabled', async () => {
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

    await renderLessonsPage();

    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Strona główna' })).toHaveAttribute(
        'href',
        '/kangur'
      )
    );
    expect(screen.getByRole('link', { name: 'Strona główna' })).toHaveAttribute(
      'data-doc-id',
      'top_nav_home'
    );
    expect(screen.getByRole('button', { name: /nauka zegara/i })).toHaveAttribute(
      'data-doc-id',
      'lessons_library_entry'
    );
  });

  it('does not render a generic catalog back action on the lessons list surface', async () => {
    setLessonState({
      lessons: [createLesson()],
    });

    await renderLessonsPage();

    expect(screen.queryByTestId('kangur-lesson-back-to-lessons')).toBeNull();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it('keeps using the legacy component renderer when the lesson stays in component mode', async () => {
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

    await renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /classic clock/i }));

    const activeLessonView = screen.getByTestId('lessons-active-transition');
    const headerActions = screen.getByTestId('active-lesson-header-icon-actions');

    expect(screen.getByTestId('active-lesson-header')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-panel-padding-md'
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
    expect(within(activeLessonView).queryAllByTestId('legacy-lesson').length).toBeGreaterThan(0);
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

      await renderLessonsPage();

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

  it('returns from an active lesson to the lessons library via the shared header back button', async () => {
    setLessonState({
      lessons: [createLesson()],
    });

    await renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /nauka zegara/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Wróć do listy lekcji' }));

    await waitFor(() =>
      expect(screen.queryByTestId('lessons-active-transition')).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /nauka zegara/i })).toBeInTheDocument();
  });

  it('keeps the active lesson motion preset while leaving lesson library wrappers static', async () => {
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

    await renderLessonsPage();

    expect(screen.getByTestId('lesson-library-motion-kangur-lesson-clock')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-library-motion-adding-lesson')).toBeInTheDocument();
    expect(screen.getByTestId('lesson-library-motion-kangur-lesson-clock')).not.toHaveAttribute(
      'data-motion-transition'
    );
    expect(screen.getByTestId('lesson-library-motion-adding-lesson')).not.toHaveAttribute(
      'data-motion-transition'
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

  it('shows the empty-document warning when a document-mode lesson has no saved content', async () => {
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

    await renderLessonsPage();

    fireEvent.click(screen.getByRole('button', { name: /patterns draft/i }));

    const activeLessonView = screen.getByTestId('lessons-active-transition');

    expect(
      screen.getByText('Ta lekcja ma włączony tryb dokumentu, ale nie zapisano jeszcze bloków treści.')
    ).toBeInTheDocument();
    expect(screen.getByTestId('lessons-empty-document-summary')).toHaveClass('soft-card');
    expect(screen.getByText('Materiał lekcji')).toHaveClass('rounded-full', 'border');
    expect(within(activeLessonView).queryAllByTestId('legacy-lesson')).toHaveLength(0);
    expect(screen.queryByTestId('lesson-document-renderer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Wróć do listy lekcji' })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
  });
});
