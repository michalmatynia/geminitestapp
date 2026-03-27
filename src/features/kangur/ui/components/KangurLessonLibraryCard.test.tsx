/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const {
  ageGroupState,
  ageGroupHookMock,
  coarsePointerMock,
  localeMock,
  useTranslationsMock,
} = vi.hoisted(() => ({
  ageGroupState: {
    value: 'ten_year_old' as 'six_year_old' | 'ten_year_old' | 'grown_ups',
  },
  ageGroupHookMock: vi.fn(),
  coarsePointerMock: vi.fn(() => true),
  localeMock: vi.fn(() => 'pl'),
  useTranslationsMock: vi.fn(),
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeMock(),
  useTranslations: (namespace?: string) => {
    useTranslationsMock(namespace);

    return (key: string, values?: Record<string, string | number>) =>
      (
        {
          'KangurLessonsWidgets.libraryCard.ariaLabel': `Lekcja ${values?.title ?? ''}`.trim(),
          'KangurLessonsWidgets.libraryCard.closedAssignment': 'Zadanie zamkniete',
          'KangurLessonsWidgets.libraryCard.completedAssignmentSummary': `Zadanie od rodzica zostalo juz wykonane. ${values?.summary ?? ''}`.trim(),
          'KangurLessonsWidgets.libraryCard.completedForParent': 'Ukończone dla rodzica',
          'KangurLessonsWidgets.libraryCard.customContent': 'Wlasna zawartosc',
          'KangurLessonsWidgets.libraryCard.parentPriority': 'Priorytet rodzica',
        } as const
      )[`${namespace}.${key}`] ?? key;
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => coarsePointerMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => {
    ageGroupHookMock();
    return {
      ageGroup: ageGroupState.value,
      setAgeGroup: vi.fn(),
    };
  },
}));

import { KangurLessonLibraryCard } from '@/features/kangur/ui/components/KangurLessonLibraryCard';
import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';
import type { LessonMasteryPresentation } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext.shared';
import type { KangurLesson } from '@/features/kangur/shared/contracts/kangur';

const lesson = {
  id: 'clock-doc',
  componentId: 'clock',
  contentMode: 'document',
  subject: 'maths',
  ageGroup: 'ten_year_old',
  title: 'Nauka zegara',
  description: 'Odczytuj godziny i minuty.',
  emoji: '🕐',
  color: 'kangur-gradient-accent-indigo-reverse',
  activeBg: 'bg-indigo-500',
  sortOrder: 1,
  enabled: true,
} as KangurLesson;

const masteryPresentation: LessonMasteryPresentation = {
  badgeAccent: 'emerald',
  statusLabel: 'Opanowane 92%',
  summaryLabel: 'Ukończono 2× · najlepszy wynik 100%',
};

const lessonAssignment = {
  id: 'assignment-1',
  learnerKey: 'jan@example.com',
  title: 'Powtórz zegar',
  description: 'Skup się na odczytywaniu pełnych godzin.',
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
} as KangurAssignmentSnapshot;

describe('KangurLessonLibraryCard', () => {
  it('renders shared lesson state chips and selection handling', () => {
    ageGroupState.value = 'ten_year_old';
    const handleSelect = vi.fn();

    render(
      <KangurLessonLibraryCard
        completedLessonAssignment={null}
        dataDocId='lessons_library_entry'
        emphasis='neutral'
        hasDocumentContent
        iconTestId='lesson-library-icon'
        itemTestId='lesson-library-item'
        lesson={lesson}
        lessonAssignment={lessonAssignment}
        masteryPresentation={masteryPresentation}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByTestId('lesson-library-item')).toHaveClass('soft-card', 'border');
    expect(screen.getByTestId('lesson-library-item')).toHaveClass(
      'min-h-12',
      'px-4',
      'touch-manipulation'
    );
    expect(screen.getByTestId('lesson-library-icon')).toHaveClass('kangur-gradient-icon-tile-lg');
    expect(screen.getByText('Wlasna zawartosc')).toHaveClass('rounded-full', 'border');
    expect(screen.getAllByText('Priorytet rodzica')[0]).toHaveClass('rounded-full', 'border');
    expect(screen.getByText('Priorytet wysoki')).toHaveTextContent('Priorytet wysoki');
    expect(screen.getByText('Skup się na odczytywaniu pełnych godzin.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-library-item'));

    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('shows completed parent assignment state when no active assignment remains', () => {
    ageGroupState.value = 'ten_year_old';
    const completedAssignment = {
      ...lessonAssignment,
      progress: {
        ...lessonAssignment.progress,
        status: 'completed',
        summary: 'Powtórki: 1/1',
        completedAt: '2026-03-07T10:00:00.000Z',
      },
    } as KangurAssignmentSnapshot;

    render(
      <KangurLessonLibraryCard
        completedLessonAssignment={completedAssignment}
        lesson={lesson}
        lessonAssignment={null}
        masteryPresentation={masteryPresentation}
        onSelect={() => undefined}
      />
    );

    expect(screen.getByText('Ukończone dla rodzica')).toBeInTheDocument();
    expect(screen.getByText('Zadanie zamkniete')).toBeInTheDocument();
    expect(screen.getByText('Zadanie od rodzica zostalo juz wykonane. Powtórki: 1/1')).toBeInTheDocument();
  });

  it('uses icon-first state chips for six-year-old learners', () => {
    ageGroupState.value = 'six_year_old';

    render(
      <KangurLessonLibraryCard
        completedLessonAssignment={null}
        hasDocumentContent
        lesson={lesson}
        lessonAssignment={lessonAssignment}
        masteryPresentation={masteryPresentation}
        onSelect={() => undefined}
      />
    );

    expect(screen.getByTestId('lesson-library-mastery-chip')).toHaveAttribute(
      'aria-label',
      'Opanowane 92%'
    );
    expect(screen.getByTestId('lesson-library-mastery-chip-icon')).toHaveTextContent('⭐');
    expect(screen.getByTestId('lesson-library-assignment-chip-icon')).toHaveTextContent('📌');
    expect(screen.getByTestId('lesson-library-custom-content-chip-icon')).toHaveTextContent('📘');
    expect(screen.getByTestId('lesson-library-footer-assignment-chip-icon')).toHaveTextContent(
      '📌'
    );
  });

  it('renders from provided lesson card context without mounting per-card hooks', () => {
    ageGroupState.value = 'six_year_old';
    localeMock.mockClear();
    useTranslationsMock.mockClear();
    coarsePointerMock.mockClear();
    ageGroupHookMock.mockClear();
    const providedTranslationMap = {
      ariaLabel: 'Lekcja Nauka zegara',
      closedAssignment: 'Zadanie zamkniete',
      completedAssignmentSummary: 'Zadanie od rodzica zostalo juz wykonane. Powtórki: 0/1',
      completedForParent: 'Ukończone dla rodzica',
      customContent: 'Wlasna zawartosc',
      parentPriority: 'Priorytet rodzica',
    } as const;
    const providedTranslations = vi.fn(
      (key: string, values?: Record<string, string | number>) =>
        key === 'ariaLabel'
          ? `Lekcja ${values?.title ?? ''}`.trim()
          : key === 'completedAssignmentSummary'
            ? `Zadanie od rodzica zostalo juz wykonane. ${values?.summary ?? ''}`.trim()
            : providedTranslationMap[key as keyof typeof providedTranslationMap]
    );

    render(
      <KangurLessonLibraryCard
        completedLessonAssignment={null}
        hasDocumentContent
        isCoarsePointer
        isSixYearOld={false}
        lesson={lesson}
        lessonAssignment={lessonAssignment}
        locale='pl'
        masteryPresentation={masteryPresentation}
        onSelect={() => undefined}
        translations={providedTranslations}
      />
    );

    expect(ageGroupHookMock).not.toHaveBeenCalled();
    expect(providedTranslations).toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveClass('min-h-12', 'touch-manipulation');
    expect(screen.getByText('Priorytet rodzica')).toBeInTheDocument();
  });
});
