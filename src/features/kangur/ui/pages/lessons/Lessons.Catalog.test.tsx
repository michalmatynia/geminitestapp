/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
  LESSONS_LIBRARY_LIST_CLASSNAME,
} from './Lessons.constants';

const {
  getLessonMasteryPresentationMock,
  lessonCardPropsMock,
  useKangurCoarsePointerMock,
  useLessonsMock,
  useKangurPageContentEntryMock,
} = vi.hoisted(() => ({
  getLessonMasteryPresentationMock: vi.fn(() => ({
    badgeAccent: 'slate',
    statusLabel: 'Nowe',
    summaryLabel: 'Brak postępu',
  })),
  lessonCardPropsMock: vi.fn(),
  useKangurCoarsePointerMock: vi.fn(() => false),
  useLessonsMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(() => ({ entry: null })),
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
          'KangurLessonsWidgets.mastery.noSavedPractice': 'Brak postępu',
        } as const
      )[`${namespace}.${key}`] ?? key,
}));

vi.mock('@/features/kangur/lessons/lesson-catalog-i18n', () => ({
  getLocalizedKangurAgeGroupLabel: () => '6 lat',
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

vi.mock('@/features/kangur/lesson-documents', () => ({
  hasKangurLessonDocumentContent: () => false,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => useKangurCoarsePointerMock(),
}));

vi.mock('@/features/kangur/ui/components/KangurResolvedLessonLibraryCard', () => ({
  KangurResolvedLessonLibraryCard: (props: { lesson: { id: string; title: string } }) => {
    lessonCardPropsMock(props);
    return <div data-testid={`mock-lesson-card-${props.lesson.id}`}>{props.lesson.title}</div>;
  },
}));

vi.mock('@/features/kangur/ui/components/KangurResolvedLessonGroupAccordion', () => ({
  KangurResolvedLessonGroupAccordion: ({
    label,
    typeLabel,
    fallbackTypeLabel,
    isExpanded,
    onToggle,
    children,
  }: {
    label: React.ReactNode;
    typeLabel?: React.ReactNode;
    fallbackTypeLabel: React.ReactNode;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      <button type='button' onClick={onToggle}>
        {typeLabel ?? fallbackTypeLabel}
        {label}
      </button>
      {isExpanded ? children : null}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurResolvedPageIntroCard', () => ({
  KangurResolvedPageIntroCard: ({
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

vi.mock('@/features/kangur/ui/components/LazyKangurLessonsWordmark', () => ({
  LazyKangurLessonsWordmark: ({ label }: { label: string }) => (
    <div data-testid='mock-lessons-wordmark'>{label}</div>
  ),
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
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

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: (...args: unknown[]) => useKangurPageContentEntryMock(...args),
}));

vi.mock('./Lessons.utils', () => ({
  getLessonMasteryPresentation: (...args: unknown[]) => getLessonMasteryPresentationMock(...args),
}));

vi.mock('./LessonsContext', () => ({
  useLessons: () => useLessonsMock(),
}));

import { LessonsCatalog } from './Lessons.Catalog';

const splitClasses = (className: string): string[] => className.trim().split(/\s+/);

describe('LessonsCatalog', () => {
  it('defers page-content hooks until after the first render turn', () => {
    vi.useFakeTimers();
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number =>
        window.setTimeout(() => callback(0), 0)
      );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle: number) => {
      window.clearTimeout(handle);
    });
    useKangurPageContentEntryMock.mockClear();
    getLessonMasteryPresentationMock.mockClear();
    useLessonsMock.mockReturnValue({
      subject: 'music',
      ageGroup: 'six_year_old',
      lessonSections: [],
      orderedLessons: [],
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

    expect(useKangurPageContentEntryMock).not.toHaveBeenCalled();
    expect(getLessonMasteryPresentationMock).not.toHaveBeenCalled();

    act(() => {
      vi.runAllTimers();
    });

    expect(useKangurPageContentEntryMock).toHaveBeenCalledTimes(2);
    expect(getLessonMasteryPresentationMock).not.toHaveBeenCalled();
    expect(useKangurPageContentEntryMock).toHaveBeenNthCalledWith(1, 'lessons-list-intro');
    expect(useKangurPageContentEntryMock).toHaveBeenNthCalledWith(
      2,
      'lessons-list-empty-state'
    );

    requestAnimationFrameSpy.mockRestore();
    vi.useRealTimers();
  });

  it('renders six-year-old icon cues in the intro and grouped lesson headers', () => {
    vi.useFakeTimers();
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback): number =>
        window.setTimeout(() => callback(0), 0)
      );
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle: number) => {
      window.clearTimeout(handle);
    });
    lessonCardPropsMock.mockClear();
    useKangurPageContentEntryMock.mockClear();
    getLessonMasteryPresentationMock.mockClear();
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

    expect(getLessonMasteryPresentationMock).not.toHaveBeenCalled();

    expect(screen.getByTestId('lessons-shell-transition')).toHaveClass(
      ...splitClasses(LESSONS_LIBRARY_LAYOUT_CLASSNAME)
    );
    expect(screen.getByTestId('lessons-list-transition')).toHaveClass(
      ...splitClasses(LESSONS_LIBRARY_LIST_CLASSNAME)
    );
    expect(screen.getByTestId('lessons-intro-description-icon')).toHaveTextContent('🎵');

    fireEvent.click(screen.getByRole('button', { name: /skala/i }));

    expect(screen.getByTestId('lesson-library-motion-lesson-music-diatonic-scale')).toHaveClass(
      'w-full'
    );
    expect(screen.queryByText('Grupa')).not.toBeInTheDocument();
    expect(document.querySelector('.kangur-lesson-group-chevron')).not.toBeInTheDocument();
    expect(screen.getByTestId('lessons-page-group-icon-music_scale')).toHaveTextContent('🧩');
    expect(screen.getByTestId('lessons-page-group-type-icon-music_scale')).toHaveTextContent(
      '🎵'
    );
    expect(
      screen.queryByTestId('lessons-page-subsection-label-music_diatonic_scale')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('lessons-page-subsection-icon-music_diatonic_scale')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Podgrupa')).not.toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });

    expect(getLessonMasteryPresentationMock).toHaveBeenCalled();
    expect(lessonCardPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isCoarsePointer: false,
        isSixYearOld: true,
        locale: 'pl',
      })
    );

    requestAnimationFrameSpy.mockRestore();
    vi.useRealTimers();
  });
});
