/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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
    expect(screen.getByTestId('lesson-library-icon')).toHaveClass('kangur-gradient-icon-tile-lg');
    expect(screen.getByText('Wlasna zawartosc')).toHaveClass('rounded-full', 'border');
    expect(screen.getAllByText('Priorytet rodzica')[0]).toHaveClass('rounded-full', 'border');
    expect(screen.getByText('Priorytet wysoki')).toHaveTextContent('Priorytet wysoki');
    expect(screen.getByText('Skup się na odczytywaniu pełnych godzin.')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('lesson-library-item'));

    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('shows completed parent assignment state when no active assignment remains', () => {
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

    expect(screen.getByText('Ukonczone dla rodzica')).toBeInTheDocument();
    expect(screen.getByText('Zadanie zamkniete')).toBeInTheDocument();
    expect(screen.getByText('Zadanie od rodzica zostalo juz wykonane. Powtórki: 1/1')).toBeInTheDocument();
  });
});
