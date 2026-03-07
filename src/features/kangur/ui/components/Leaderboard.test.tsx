/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurScoreRecord, KangurUser } from '@/features/kangur/services/ports';

const { authMeMock, scoreListMock, logKangurClientErrorMock } = vi.hoisted(() => ({
  authMeMock: vi.fn<() => Promise<KangurUser>>(),
  scoreListMock: vi.fn<() => Promise<KangurScoreRecord[]>>(),
  logKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    auth: {
      me: authMeMock,
    },
    score: {
      list: scoreListMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
}));

import Leaderboard from '@/features/kangur/ui/components/Leaderboard';

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Ada',
  score: 9,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 9,
  time_taken: 41,
  created_date: '2026-03-07T12:00:00.000Z',
  created_by: 'ada@example.com',
  ...overrides,
});

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMeMock.mockResolvedValue({
      email: 'ada@example.com',
      role: 'student',
      display_name: 'Ada',
    });
    scoreListMock.mockResolvedValue([
      createScore({
        id: 'score-1',
        player_name: 'Ada',
        operation: 'addition',
        created_by: 'ada@example.com',
      }),
      createScore({
        id: 'score-2',
        player_name: 'Bartek',
        operation: 'division',
        score: 8,
        correct_answers: 8,
        created_by: 'bartek@example.com',
      }),
      createScore({
        id: 'score-3',
        player_name: 'Olek',
        operation: 'division',
        score: 7,
        correct_answers: 7,
        created_by: null,
      }),
    ]);
  });

  it('uses shared pill styling for filters and still narrows leaderboard results', async () => {
    const user = userEvent.setup();

    render(<Leaderboard />);

    const allOperationFilter = await screen.findByTestId('leaderboard-operation-filter-all');
    const divisionOperationFilter = screen.getByTestId('leaderboard-operation-filter-division');
    const allUserFilter = screen.getByTestId('leaderboard-user-filter-all');
    const anonymousUserFilter = screen.getByTestId('leaderboard-user-filter-anonymous');

    expect(allOperationFilter).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(divisionOperationFilter).toHaveClass('kangur-cta-pill', 'soft-cta');
    expect(allOperationFilter).toHaveAttribute('aria-pressed', 'true');
    expect(divisionOperationFilter).toHaveAttribute('aria-pressed', 'false');
    expect(allUserFilter).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(anonymousUserFilter).toHaveClass('kangur-cta-pill', 'soft-cta');

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Bartek')).toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();

    await user.click(divisionOperationFilter);

    expect(divisionOperationFilter).toHaveClass('surface-cta');
    expect(divisionOperationFilter).toHaveAttribute('aria-pressed', 'true');
    expect(allOperationFilter).toHaveClass('soft-cta');
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    expect(screen.getByText('Bartek')).toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();

    await user.click(anonymousUserFilter);

    expect(anonymousUserFilter).toHaveClass('surface-cta');
    expect(anonymousUserFilter).toHaveAttribute('aria-pressed', 'true');
    expect(allUserFilter).toHaveClass('soft-cta');
    expect(screen.queryByText('Bartek')).not.toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();
  });
});
