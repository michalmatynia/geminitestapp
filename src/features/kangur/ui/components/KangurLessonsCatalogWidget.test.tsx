/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { selectLessonMock } = vi.hoisted(() => ({
  selectLessonMock: vi.fn(),
}));

const { ageGroupState } = vi.hoisted(() => ({
  ageGroupState: {
    value: 'ten_year_old' as 'six_year_old' | 'ten_year_old' | 'grown_ups',
  },
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

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: ageGroupState.value,
    setAgeGroup: vi.fn(),
  }),
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

vi.mock('@/features/kangur/ui/components/KangurLessonGroupAccordion', () => ({
  KangurLessonGroupAccordion: ({
    label,
    isExpanded,
    onToggle,
    children,
  }: {
    label: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div className='w-full'>
      <button type='button' aria-expanded={isExpanded} onClick={onToggle}>
        {label}
      </button>
      {isExpanded ? (
        <div role='region'>
          <div className='w-full items-center'>{children}</div>
        </div>
      ) : null}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurSubjectGroupSection', () => ({
  KangurSubjectGroupSection: ({
    className,
    label,
    children,
  }: {
    className?: string;
    label: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section aria-label='mock-subject-group' className={className}>
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
  KangurButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
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

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_LESSON_PANEL_GAP_CLASSNAME: 'gap-4',
  KANGUR_PANEL_GAP_CLASSNAME: 'gap-6',
  KANGUR_PANEL_ROW_CLASSNAME: 'panel-row',
  KANGUR_STEP_PILL_CLASSNAME: 'step-pill',
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
  it('renders grouped sections through centered collapsible menus', () => {
    ageGroupState.value = 'ten_year_old';
    render(<KangurLessonsCatalogWidget />);

    expect(screen.getByLabelText('Lista lekcji')).toHaveClass('max-w-lg', 'items-center');
    expect(screen.getByLabelText('mock-subject-group')).toHaveClass('w-full');
    expect(screen.queryByTestId('lesson-card-lesson-english')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /opening section/i });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const accordionRegion = screen.getByTestId('lesson-card-lesson-english').closest('[role="region"]');
    expect(accordionRegion?.firstElementChild).toHaveClass('w-full', 'items-center');
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-card-lesson-english'));

    expect(selectLessonMock).toHaveBeenCalledWith('lesson-english');
  });

  it('renders icon-first subject and subsection cues for six-year-old learners', async () => {
    ageGroupState.value = 'six_year_old';

    render(<KangurLessonsCatalogWidget />);

    expect(screen.getByTestId('lessons-catalog-subject-icon-english')).toHaveTextContent('🔤');
    fireEvent.click(screen.getByRole('button', { name: /opening section/i }));
    expect(screen.getByTestId('lessons-catalog-group-icon-english:opening-section')).toHaveTextContent(
      '📚'
    );
    expect(screen.getByTestId('lesson-card-lesson-english')).toBeInTheDocument();
  });
});
