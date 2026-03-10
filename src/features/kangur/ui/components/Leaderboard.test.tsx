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

let Leaderboard: typeof import('@/features/kangur/ui/components/Leaderboard').default;

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Ada',
  score: 9,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 9,
  time_taken: 41,
  xp_earned: 24,
  created_date: '2026-03-07T12:00:00.000Z',
  created_by: 'ada@example.com',
  ...overrides,
});

describe('Leaderboard', () => {
  beforeEach(async () => {
    vi.resetModules();
    Leaderboard = (await import('@/features/kangur/ui/components/Leaderboard')).default;
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

  it('uses shared segmented styling for filters and still narrows leaderboard results', async () => {
    const user = userEvent.setup();

    render(<Leaderboard />);

    const allOperationFilter = await screen.findByTestId('leaderboard-operation-filter-all');
    const divisionOperationFilter = screen.getByTestId('leaderboard-operation-filter-division');
    const allUserFilter = screen.getByTestId('leaderboard-user-filter-all');
    const anonymousUserFilter = screen.getByTestId('leaderboard-user-filter-anonymous');
    const operationGroup = screen.getByTestId('leaderboard-operation-filter-group');
    const userGroup = screen.getByTestId('leaderboard-user-filter-group');

    expect(screen.getByTestId('leaderboard-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(operationGroup).toHaveClass('rounded-[28px]', 'backdrop-blur-xl');
    expect(userGroup).toHaveClass('rounded-[28px]', 'backdrop-blur-xl');
    expect(allOperationFilter).toHaveClass('rounded-[18px]', 'text-indigo-700', 'ring-1');
    expect(divisionOperationFilter).toHaveClass('rounded-[18px]', 'text-slate-500');
    expect(allOperationFilter).toHaveAttribute('aria-pressed', 'true');
    expect(divisionOperationFilter).toHaveAttribute('aria-pressed', 'false');
    expect(allUserFilter).toHaveClass('rounded-[18px]', 'text-indigo-700', 'ring-1');
    expect(anonymousUserFilter).toHaveClass('rounded-[18px]', 'text-slate-500');
    expect(await screen.findByTestId('leaderboard-row-score-1')).toHaveClass(
      'soft-card',
      'border-indigo-300'
    );
    expect(screen.getByTestId('leaderboard-current-user-badge-score-1')).toHaveClass(
      'border-indigo-200',
      'bg-indigo-100'
    );
    expect(screen.getByTestId('leaderboard-xp-score-1')).toHaveTextContent('+24 XP');
    expect(screen.getByTestId('leaderboard-row-score-2')).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Bartek')).toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();

    await user.click(divisionOperationFilter);

    expect(divisionOperationFilter).toHaveClass('text-indigo-700', 'ring-1');
    expect(divisionOperationFilter).toHaveAttribute('aria-pressed', 'true');
    expect(allOperationFilter).toHaveClass('text-slate-500');
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    expect(screen.getByText('Bartek')).toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();

    await user.click(anonymousUserFilter);

    expect(anonymousUserFilter).toHaveClass('text-indigo-700', 'ring-1');
    expect(anonymousUserFilter).toHaveAttribute('aria-pressed', 'true');
    expect(allUserFilter).toHaveClass('text-slate-500');
    expect(screen.queryByText('Bartek')).not.toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();
  });

  it('uses the shared empty-state surface when no scores match filters', async () => {
    scoreListMock.mockResolvedValue([]);

    render(<Leaderboard />);

    expect(await screen.findByTestId('leaderboard-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border-slate-200/80'
    );
    expect(screen.getByText('Brak wynikow dla tych filtrow.')).toBeInTheDocument();
  });
});
