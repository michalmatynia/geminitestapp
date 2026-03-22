/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { selectLessonMock } = vi.hoisted(() => ({
  selectLessonMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations:
    (namespace?: string) =>
    (key: string) =>
      (
        {
          'KangurLessonsPage.emptyTitle': 'No lessons',
          'KangurLessonsPage.groupTypeLabel': 'Group',
          'KangurLessonsPage.subsectionTypeLabel': 'Subsection',
          'KangurLessonsWidgets.emptyDescription': 'No lessons available',
          'KangurLessonsWidgets.mastery.ready': 'Ready',
        } as const
      )[`${namespace}.${key}`] ?? key,
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/lessons/lesson-catalog-i18n', () => ({
  getLocalizedKangurLessonSectionLabel: (_id: string, _locale: string, fallback: string) => fallback,
  getLocalizedKangurLessonSectionTypeLabel: (_locale: string, fallback: string) => fallback,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonLibraryCard', () => ({
  KangurLessonLibraryCard: ({
    lesson,
    onSelect,
  }: {
    lesson: { id: string; title: string };
    onSelect: () => void;
  }) => (
    <button data-testid={`lesson-card-${lesson.id}`} type='button' onClick={onSelect}>
      {lesson.title}
    </button>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurSubjectGroupSection', () => ({
  KangurSubjectGroupSection: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <section aria-label={label}>
      <h2>{label}</h2>
      {children}
    </section>
  ),
}));

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext', () => ({
  useKangurLessonsRuntimeState: () => ({
    orderedLessons: [
      {
        id: 'lesson-english',
        componentId: 'english_basics',
        subject: 'english',
        title: 'English Basics',
      },
    ],
    lessonDocuments: {},
    progress: {},
    activeLessonId: null,
    lessonAssignmentsByComponent: new Map(),
    completedLessonAssignmentsByComponent: new Map(),
  }),
  useKangurLessonsRuntimeActions: () => ({
    selectLesson: selectLessonMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared', () => ({
  getLessonMasteryPresentation: () => null,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
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

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_LESSON_PANEL_GAP_CLASSNAME: 'gap-4',
  KANGUR_PANEL_GAP_CLASSNAME: 'gap-6',
  KANGUR_PANEL_ROW_CLASSNAME: 'panel-row',
}));

vi.mock('@/features/kangur/ui/constants/subject-groups', () => ({
  getKangurSubjectGroups: () => [{ value: 'english', label: 'English' }],
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonSections', () => ({
  useKangurLessonSections: () => ({
    data: [
      {
        id: 'opening-section',
        subject: 'english',
        enabled: true,
        sortOrder: 1,
        label: 'Opening Section',
        typeLabel: 'Featured',
        componentIds: ['english_basics'],
        subsections: [],
      },
    ],
  }),
}));

import { KangurLessonsCatalogWidget } from './KangurLessonsCatalogWidget';

describe('KangurLessonsCatalogWidget', () => {
  it('opens grouped sections on the first click', async () => {
    render(<KangurLessonsCatalogWidget />);

    expect(screen.queryByTestId('lesson-card-lesson-english')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /opening section/i });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-card-lesson-english'));

    expect(selectLessonMock).toHaveBeenCalledWith('lesson-english');

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
  });
});
