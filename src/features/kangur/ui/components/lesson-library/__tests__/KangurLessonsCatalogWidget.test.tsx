/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LESSONS_LIBRARY_LIST_CLASSNAME } from '@/features/kangur/ui/pages/lessons/Lessons.constants';

const { runtimeState, selectLessonMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  runtimeState: {
    value: {
      orderedLessons: [
        {
          id: 'lesson-english',
          componentId: 'english_basics',
          subject: 'english',
          title: 'English Basics',
        },
      ],
      lessonSections: [
        {
          id: 'opening-section',
          subject: 'english',
          enabled: true,
          sortOrder: 1,
          label: 'Opening Section',
          typeLabel: 'Featured',
          componentIds: [],
          subsections: [
            {
              id: 'opening-subsection',
              enabled: true,
              sortOrder: 1,
              label: 'Sentence structure',
              typeLabel: 'Subsection',
              componentIds: ['english_basics'],
            },
          ],
        },
      ],
      lessonDocuments: {},
      lessonTemplateMap: new Map(),
      progress: {},
      activeLessonId: null,
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
    },
  },
  selectLessonMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(() => ({ entry: null })),
}));

const { ageGroupState } = vi.hoisted(() => ({
  ageGroupState: {
    value: 'ten_year_old' as 'six_year_old' | 'ten_year_old' | 'grown_ups',
  },
}));

function createLessonsCatalogTranslationsMock(namespace?: string) {
  const translations = {
    'KangurLessonsPage.emptyTitle': 'No lessons',
    'KangurLessonsPage.groupTypeLabel': 'Group',
    'KangurLessonsPage.subsectionTypeLabel': 'Subsection',
    'KangurLessonsWidgets.emptyDescription': 'No lessons available',
    'KangurLessonsWidgets.mastery.ready': 'Ready',
  } as const;

  return (key: string) => translations[`${namespace}.${key}` as keyof typeof translations] ?? key;
}

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: createLessonsCatalogTranslationsMock,
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: ageGroupState.value,
    setAgeGroup: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/lessons/lesson-catalog-i18n', () => ({
  getLocalizedKangurLessonDescription: (
    _componentId: string,
    _locale: string,
    fallback: string
  ) => fallback,
  getLocalizedKangurLessonSectionLabel: (_id: string, _locale: string, fallback: string) => fallback,
  getLocalizedKangurLessonSectionTypeLabel: (_locale: string, fallback: string) => fallback,
  getLocalizedKangurLessonTitle: (_componentId: string, _locale: string, fallback: string) =>
    fallback,
}));

vi.mock('../KangurResolvedLessonLibraryCard', () => ({
  KangurResolvedLessonLibraryCard: ({
    lesson,
    localizedTitle,
    onSelect,
  }: {
    lesson: { id: string; title: string };
    localizedTitle?: string;
    onSelect: () => void;
  }) => (
    <button data-testid={`lesson-card-${lesson.id}`} type='button' onClick={onSelect}>
      {localizedTitle ?? lesson.title}
    </button>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurSubjectGroupSection', () => ({
  KangurSubjectGroupSection: ({
    label,
    children,
  }: {
    label: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section aria-label='mock-subject-group'>
      <h2>{label}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  useKangurLessonsRuntimeState: () => runtimeState.value,
  useKangurLessonsRuntimeActions: () => ({
    selectLesson: selectLessonMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared', () => ({
  getLessonMasteryPresentation: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: (...args: unknown[]) => useKangurPageContentEntryMock(...args),
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurEmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  KangurGlassPanel: ({
    children,
    className,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div className={className} {...props}>
      {children}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/design/tokens', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/ui/design/tokens')>();

  return {
    ...actual,
    KANGUR_LESSON_PANEL_GAP_CLASSNAME: 'gap-4',
    KANGUR_PANEL_GAP_CLASSNAME: 'gap-6',
    KANGUR_PANEL_ROW_CLASSNAME: 'panel-row',
  };
});

vi.mock('@/features/kangur/ui/constants/subject-groups', () => ({
  getKangurSubjectGroups: () => [{ value: 'english', label: 'English' }],
}));

import { KangurLessonsCatalogWidget } from '../KangurLessonsCatalogWidget';

const splitClasses = (className: string): string[] => className.trim().split(/\s+/);

describe('KangurLessonsCatalogWidget', () => {
  it('opens grouped sections on the first click', async () => {
    runtimeState.value = {
      orderedLessons: [
        {
          id: 'lesson-english',
          componentId: 'english_basics',
          subject: 'english',
          title: 'English Basics',
        },
      ],
      lessonSections: [
        {
          id: 'opening-section',
          subject: 'english',
          enabled: true,
          sortOrder: 1,
          label: 'Opening Section',
          typeLabel: 'Featured',
          componentIds: [],
          subsections: [
            {
              id: 'opening-subsection',
              enabled: true,
              sortOrder: 1,
              label: 'Sentence structure',
              typeLabel: 'Subsection',
              componentIds: ['english_basics'],
            },
          ],
        },
      ],
      lessonDocuments: {},
      lessonTemplateMap: new Map(),
      progress: {},
      activeLessonId: null,
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
    };
    useKangurPageContentEntryMock.mockClear();
    ageGroupState.value = 'ten_year_old';
    render(<KangurLessonsCatalogWidget />);

    expect(useKangurPageContentEntryMock).not.toHaveBeenCalled();

    expect(screen.getByLabelText('Lista lekcji')).toHaveClass(
      ...splitClasses(LESSONS_LIBRARY_LIST_CLASSNAME)
    );
    expect(screen.queryByTestId('lesson-card-lesson-english')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /opening section/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveClass(
      'kangur-button-shell',
      'kangur-cta-pill',
      'surface-cta',
      'justify-center',
      'text-center'
    );
    expect(trigger.closest('.kangur-lesson-group-accordion')).toHaveClass('kangur-panel-shell');
    expect(screen.queryByText('Group')).not.toBeInTheDocument();
    expect(document.querySelector('.kangur-lesson-group-chevron')).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveClass(
      'kangur-button-shell',
      'kangur-cta-pill',
      'surface-cta',
      'justify-center',
      'text-center'
    );
    const accordionRegion = screen
      .getAllByRole('region')
      .find((region) => region.id.includes('kangur-lesson-group-panel'));
    expect(accordionRegion?.firstElementChild).toHaveClass('w-full', 'items-center');
    expect(
      screen.queryByTestId('lessons-catalog-subsection-label-opening-subsection')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-card-lesson-english'));

    expect(selectLessonMock).toHaveBeenCalledWith('lesson-english');

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('renders icon-first subject and subsection cues for six-year-old learners', async () => {
    runtimeState.value = {
      orderedLessons: [
        {
          id: 'lesson-english',
          componentId: 'english_basics',
          subject: 'english',
          title: 'English Basics',
        },
      ],
      lessonSections: [
        {
          id: 'opening-section',
          subject: 'english',
          enabled: true,
          sortOrder: 1,
          label: 'Opening Section',
          typeLabel: 'Featured',
          componentIds: [],
          subsections: [
            {
              id: 'opening-subsection',
              enabled: true,
              sortOrder: 1,
              label: 'Sentence structure',
              typeLabel: 'Subsection',
              componentIds: ['english_basics'],
            },
          ],
        },
      ],
      lessonDocuments: {},
      lessonTemplateMap: new Map(),
      progress: {},
      activeLessonId: null,
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
    };
    useKangurPageContentEntryMock.mockClear();
    ageGroupState.value = 'six_year_old';

    render(<KangurLessonsCatalogWidget />);

    expect(useKangurPageContentEntryMock).not.toHaveBeenCalled();

    expect(screen.getByTestId('lessons-catalog-subject-icon-english')).toHaveTextContent('🔤');

    const trigger = screen.getByRole('button', { name: /opening section/i });
    fireEvent.click(trigger);

    expect(screen.getByTestId('lessons-catalog-group-icon-english:opening-section')).toHaveTextContent(
      '🧩'
    );
    expect(
      screen.queryByTestId('lessons-catalog-group-type-icon-english:opening-section')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('lessons-catalog-subsection-icon-opening-subsection')
    ).not.toBeInTheDocument();
  });

  it('mounts empty-state page content only when the widget is actually empty', () => {
    runtimeState.value = {
      orderedLessons: [],
      lessonSections: [],
      lessonDocuments: {},
      lessonTemplateMap: new Map(),
      progress: {},
      activeLessonId: null,
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
    };
    useKangurPageContentEntryMock.mockClear();

    render(<KangurLessonsCatalogWidget />);

    expect(useKangurPageContentEntryMock).toHaveBeenCalledTimes(1);
    expect(useKangurPageContentEntryMock).toHaveBeenCalledWith('lessons-list-empty-state');
    expect(screen.getByText('No lessons')).toBeInTheDocument();
  });

  it('prefers lesson copy from the runtime template map', () => {
    runtimeState.value = {
      orderedLessons: [
        {
          id: 'lesson-english',
          componentId: 'english_basics',
          subject: 'english',
          title: 'English Basics',
          description: 'Fallback description',
        },
      ],
      lessonSections: [],
      lessonDocuments: {},
      lessonTemplateMap: new Map([
        [
          'english_basics',
          {
            componentId: 'english_basics',
            subject: 'english',
            label: 'English label from Mongo',
            title: 'English title from Mongo',
            description: 'English description from Mongo',
            emoji: '📘',
            color: 'from-sky-500 to-cyan-400',
            activeBg: 'bg-sky-100',
            sortOrder: 1,
          },
        ],
      ]),
      progress: {},
      activeLessonId: null,
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
    };

    render(<KangurLessonsCatalogWidget />);

    expect(screen.getByTestId('lesson-card-lesson-english')).toHaveTextContent(
      'English title from Mongo'
    );
  });
});
