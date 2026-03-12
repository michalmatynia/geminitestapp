/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { KangurAssignmentSnapshot } from '@/features/kangur/services/ports';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    prefetch: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

import KangurPracticeAssignmentBanner from '@/features/kangur/ui/components/KangurPracticeAssignmentBanner';

const assignment: KangurAssignmentSnapshot & { target: { type: 'practice' } } = {
  id: 'assignment-practice-division',
  learnerKey: 'jan@example.com',
  title: 'Praktyka: Dzielenie',
  description: 'Wykonaj jedna sesje dzielenia i osiagnij co najmniej 80% skutecznosci.',
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
    status: 'in_progress',
    percent: 40,
    summary: 'Sesje: 0/1',
    attemptsCompleted: 0,
    attemptsRequired: 1,
    lastActivityAt: null,
    completedAt: null,
  },
};

describe('KangurPracticeAssignmentBanner', () => {
  it('uses shared surface, chip, and card text primitives for assigned practice work', () => {
    render(
      <KangurPracticeAssignmentBanner
        assignment={assignment}
        basePath='/kangur'
        mode='active'
      />
    );

    expect(screen.getByTestId('kangur-practice-assignment-shell')).toHaveClass(
      'glass-panel',
      'border-amber-200/80'
    );
    expect(screen.getByText('Priorytet rodzica')).toHaveClass(
      'text-[11px]',
      'uppercase',
      'tracking-[0.18em]'
    );
    expect(screen.getByText('Priorytet wysoki')).toHaveClass(
      'text-[11px]',
      'uppercase',
      'tracking-[0.16em]'
    );
    expect(screen.getByText('Praktyka: Dzielenie')).toHaveClass(
      'text-base',
      'font-extrabold',
      '[color:var(--kangur-page-text)]'
    );
    expect(
      screen.getByText(/Wykonaj jedna sesje dzielenia i osiagnij co najmniej 80% skutecznosci/i)
    ).toHaveClass('text-sm', 'leading-6', '[color:var(--kangur-page-muted-text)]');
    expect(screen.getByTestId('kangur-practice-assignment-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '40'
    );
    expect(screen.getByRole('link', { name: 'Trenuj teraz' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=operation&operation=division&difficulty=medium'
    );
  });
});
