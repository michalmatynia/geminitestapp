/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { useLessonsMock } = vi.hoisted(() => ({
  useLessonsMock: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      initial?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => 'pl',
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) =>
      (
        {
          'KangurLessonsPage.pageTitle': 'Lekcje',
          'KangurLessonsPage.introDescription': 'Wybierz lekcję i baw się krok po kroku.',
          'KangurLessonsPage.loadingDescription': 'Ładujemy lekcje.',
          'KangurLessonsPage.loadingSectionsStatus': 'Ładujemy działy',
          'KangurLessonsPage.loadingLessonsStatus': 'Ładujemy lekcje',
          'KangurLessonsPage.loadingSectionsDetails': 'Sekcje już się układają.',
          'KangurLessonsPage.loadingLessonsDetails': 'Lekcje już biegną.',
          'KangurLessonsPage.groupTypeLabel': 'Grupa',
          'KangurLessonsPage.subsectionTypeLabel': 'Podgrupa',
          'KangurLessonsPage.emptyTitle': 'Brak lekcji',
          'KangurLessonsPage.emptyDescription': `Brak lekcji dla ${values?.ageGroup ?? 'tej grupy'}`,
          'KangurLessonsWidgets.mastery.new': 'Nowe',
        } as const
      )[`${namespace}.${key}`] ?? key,
}));

vi.mock('@/features/kangur/lessons/lesson-catalog-i18n', () => ({
  getLocalizedKangurAgeGroupLabel: () => '6 lat',
  getLocalizedKangurLessonSectionLabel: (_id: string, _locale: string, fallback: string) => fallback,
  getLocalizedKangurLessonSectionTypeLabel: (_locale: string, fallback: string) => fallback,
}));

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/ui/components/KangurLessonLibraryCard', () => ({
  KangurLessonLibraryCard: ({ lesson }: { lesson: { id: string; title: string } }) => (
    <div data-testid={`mock-lesson-card-${lesson.id}`}>{lesson.title}</div>
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

vi.mock('@/features/kangur/ui/components/KangurPageIntroCard', () => ({
  KangurPageIntroCard: ({
    title,
    description,
    visualTitle,
    children,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
    visualTitle?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid='mock-lessons-intro-card'>
      <div>{title}</div>
      {description}
      {visualTitle}
      {children}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLessonsWordmark', () => ({
  KangurLessonsWordmark: ({ label }: { label: string }) => (
    <div data-testid='mock-lessons-wordmark'>{label}</div>
  ),
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  KangurEmptyState: ({
    title,
    description,
  }: {
    title: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <div>
      {title}
      {description}
    </div>
  ),
  KangurInfoCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurStatusChip: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) => (
    <div {...props}>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => false,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: () => ({ entry: null }),
}));

vi.mock('./Lessons.utils', () => ({
  getLessonMasteryPresentation: () => ({
    badgeAccent: 'slate',
    statusLabel: 'Nowe',
    summaryLabel: 'Brak postępu',
  }),
}));

vi.mock('./LessonsContext', () => ({
  useLessons: () => useLessonsMock(),
}));

import { LessonsCatalog } from './Lessons.Catalog';

describe('LessonsCatalog', () => {
  it('renders six-year-old icon cues in the intro and grouped lesson headers', () => {
    useLessonsMock.mockReturnValue({
      subject: 'music',
      ageGroup: 'six_year_old',
      lessonSections: [
        {
          id: 'music_scale',
          subject: 'music',
          enabled: true,
          sortOrder: 1,
          label: 'Skala',
          typeLabel: 'Dzial',
          componentIds: [],
          subsections: [
            {
              id: 'music_diatonic_scale',
              enabled: true,
              sortOrder: 1,
              label: 'Skala diatoniczna',
              typeLabel: 'Gra',
              componentIds: ['music_diatonic_scale'],
            },
          ],
        },
      ],
      orderedLessons: [
        {
          id: 'lesson-music-diatonic-scale',
          componentId: 'music_diatonic_scale',
          subject: 'music',
          ageGroup: 'six_year_old',
          title: 'Skala diatoniczna',
          description: 'Poznaj dźwięki',
          emoji: '🎵',
          color: 'kangur-gradient-accent-sky',
          activeBg: 'bg-sky-500',
          sortOrder: 1,
          enabled: true,
        },
      ],
      handleSelectLesson: vi.fn(),
      handleGoBack: vi.fn(),
      progress: { lessonMastery: {} },
      lessonAssignmentsByComponent: new Map(),
      completedLessonAssignmentsByComponent: new Map(),
      lessonDocuments: {},
      activeLessonId: null,
      isLessonsCatalogLoading: false,
      isLessonSectionsLoading: false,
      shouldShowLessonsCatalogSkeleton: false,
    });

    render(<LessonsCatalog />);

    expect(screen.getByTestId('lessons-shell-transition')).toHaveClass(
      'mx-auto',
      'w-full',
      'min-w-0',
      'max-w-lg',
      'items-center'
    );
    expect(screen.getByTestId('lessons-list-transition')).toHaveClass(
      'max-w-lg',
      'items-center'
    );
    expect(screen.getByTestId('lessons-intro-description-icon')).toHaveTextContent('🎵');

    expect(screen.queryByTestId('lesson-library-motion-lesson-music-diatonic-scale')).not.toBeInTheDocument();
    expect(document.querySelector('.kangur-lesson-group-chevron')).not.toBeInTheDocument();

    const trigger = screen.getByRole('button', { name: /skala/i });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region').firstElementChild).toHaveClass('w-full', 'items-center');
    expect(screen.getByTestId('lesson-library-motion-lesson-music-diatonic-scale')).toHaveClass(
      'w-full'
    );
    expect(screen.getByTestId('lessons-page-group-label-music_scale')).toHaveTextContent('Skala');
    expect(screen.getByTestId('lessons-page-group-icon-music_scale')).toHaveTextContent('🧩');
    expect(
      screen.getByTestId('lessons-page-subsection-type-icon-music_diatonic_scale')
    ).toHaveTextContent('🪄');
    expect(screen.getByTestId('lessons-page-subsection-icon-music_diatonic_scale')).toHaveTextContent(
      '🎵'
    );
  });
});
