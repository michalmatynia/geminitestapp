/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';

describe('KangurPracticeAssignmentBanner', () => {
  it('renders a direct practice-priority banner with the matching assignment CTA', () => {
    render(
      <KangurPracticeAssignmentBanner
        basePath='/kangur'
        mode='queue'
        assignment={{
          id: 'assignment-division',
          learnerKey: 'jan@example.com',
          title: 'Praktyka: Dzielenie',
          description: 'Skup sie na dzieleniu w tej sesji.',
          priority: 'high',
          archived: false,
          target: {
            type: 'practice',
            operation: 'division',
            requiredAttempts: 1,
            minAccuracyPercent: 80,
          },
          assignedByName: 'Rodzic',
          assignedByEmail: 'rodzic@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:00:00.000Z',
          progress: {
            status: 'not_started',
            percent: 0,
            summary: 'Sesje: 0/1',
            attemptsCompleted: 0,
            attemptsRequired: 1,
            lastActivityAt: null,
            completedAt: null,
          },
        }}
      />
    );

    expect(screen.getByText('Priorytet rodzica')).toBeInTheDocument();
    expect(screen.getByText('Priorytet rodzica')).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByText('Najbliższy priorytet w praktyce: Dzielenie.')).toBeInTheDocument();
    expect(screen.getByText('Praktyka: Dzielenie')).toBeInTheDocument();
    expect(screen.getByText('Priorytet wysoki')).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByText('Postęp').parentElement).toHaveClass('soft-card', 'border-amber-300');
    expect(screen.getByTestId('kangur-practice-assignment-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByRole('link', { name: 'Trenuj teraz' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=operation&operation=division&difficulty=medium'
    );
  });

  it('shows a completion message when the delegated task was finished in the current session', () => {
    render(
      <KangurPracticeAssignmentBanner
        basePath='/kangur'
        mode='completed'
        assignment={{
          id: 'assignment-division',
          learnerKey: 'jan@example.com',
          title: 'Praktyka: Dzielenie',
          description: 'Skup sie na dzieleniu w tej sesji.',
          priority: 'high',
          archived: false,
          target: {
            type: 'practice',
            operation: 'division',
            requiredAttempts: 1,
            minAccuracyPercent: 80,
          },
          assignedByName: 'Rodzic',
          assignedByEmail: 'rodzic@example.com',
          createdAt: '2026-03-06T10:00:00.000Z',
          updatedAt: '2026-03-06T10:10:00.000Z',
          progress: {
            status: 'completed',
            percent: 100,
            summary: 'Sesje: 1/1',
            attemptsCompleted: 1,
            attemptsRequired: 1,
            lastActivityAt: '2026-03-06T10:10:00.000Z',
            completedAt: '2026-03-06T10:10:00.000Z',
          },
        }}
      />
    );

    expect(
      screen.getByText('Zadanie od rodzica zostało ukończone w tej sesji.')
    ).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('100%')).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByTestId('kangur-practice-assignment-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
  });
});
