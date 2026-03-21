/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
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
  description: 'Wykonaj jedną sesję dzielenia i osiągnij co najmniej 80% skuteczności.',
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
      'kangur-panel-soft',
      'kangur-surface-panel-accent-amber'
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
    expect(screen.getByText(assignment.description)).toHaveClass(
      'text-sm',
      'leading-6',
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(screen.getByTestId('kangur-practice-assignment-progress-bar')).toHaveAttribute(
      'aria-valuenow',
      '40'
    );
    expect(screen.getByRole('link', { name: 'Trenuj teraz' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=operation&operation=division&difficulty=medium'
    );
  });

  it('shows countdown when time limit is active', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-06T10:30:30.000Z'));

    try {
      render(
        <KangurPracticeAssignmentBanner
          assignment={{
            ...assignment,
            timeLimitMinutes: 60,
            timeLimitStartsAt: '2026-03-06T10:00:00.000Z',
          }}
          basePath='/kangur'
          mode='active'
        />
      );

      expect(screen.getByText('Pozostało: 29 min 30 s')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
