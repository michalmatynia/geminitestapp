/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KangurScoreRecord, KangurUser } from '@kangur/platform';

const { logKangurClientErrorMock, withKangurClientError, withKangurClientErrorSync } =
  globalThis.__kangurClientErrorMocks();
const authMeMock = vi.fn<() => Promise<KangurUser>>();
const scoreFilterMock = vi.fn<() => Promise<KangurScoreRecord[]>>();
const useKangurPageContentEntryMock = vi.fn();
const useKangurSubjectFocusMock = vi.fn();

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    auth: {
      me: (...args: Parameters<typeof authMeMock>) => authMeMock(...args),
    },
    score: {
      filter: (...args: Parameters<typeof scoreFilterMock>) => scoreFilterMock(...args),
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  ...(() => {
    const { logKangurClientErrorMock, withKangurClientError, withKangurClientErrorSync } =
      globalThis.__kangurClientErrorMocks();
    return {
      logKangurClientError: logKangurClientErrorMock,
      withKangurClientError,
      withKangurClientErrorSync,
    };
  })(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: (...args: Parameters<typeof useKangurPageContentEntryMock>) =>
    useKangurPageContentEntryMock(...args),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: () => ({
    user: {
      email: 'ada@example.com',
      role: 'student',
      display_name: 'Ada',
    },
  }),
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
  subject: 'maths',
  ...overrides,
});

describe('Leaderboard', () => {
  beforeEach(async () => {
    vi.resetModules();
    Leaderboard = (await import('@/features/kangur/ui/components/Leaderboard')).default;
    vi.clearAllMocks();
    useKangurPageContentEntryMock.mockImplementation(() => ({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));
    authMeMock.mockResolvedValue({
      email: 'ada@example.com',
      role: 'student',
      display_name: 'Ada',
    });
    scoreFilterMock.mockResolvedValue([
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
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
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
      'kangur-panel-soft'
    );
    expect(operationGroup).toHaveClass('kangur-segmented-control', 'rounded-[28px]', 'border');
    expect(userGroup).toHaveClass('kangur-segmented-control', 'rounded-[28px]', 'border');
    expect(allOperationFilter).toHaveClass(
      'kangur-segmented-control-item',
      'kangur-segmented-control-item-active',
      'rounded-[18px]'
    );
    expect(divisionOperationFilter).toHaveClass('kangur-segmented-control-item', 'rounded-[18px]');
    expect(divisionOperationFilter).not.toHaveClass('kangur-segmented-control-item-active');
    expect(allOperationFilter).toHaveAttribute('aria-pressed', 'true');
    expect(divisionOperationFilter).toHaveAttribute('aria-pressed', 'false');
    expect(allUserFilter).toHaveClass(
      'kangur-segmented-control-item',
      'kangur-segmented-control-item-active',
      'rounded-[18px]'
    );
    expect(anonymousUserFilter).toHaveClass('kangur-segmented-control-item', 'rounded-[18px]');
    expect(anonymousUserFilter).not.toHaveClass('kangur-segmented-control-item-active');
    expect(await screen.findByTestId('leaderboard-row-score-1')).toHaveClass(
      'soft-card'
    );
    expect(screen.getByTestId('leaderboard-current-user-badge-score-1')).toHaveClass(
      'rounded-full',
      'border'
    );
    expect(screen.getByTestId('leaderboard-xp-score-1')).toHaveTextContent('+24 XP');
    expect(screen.getByTestId('leaderboard-row-score-2')).toHaveClass(
      'soft-card',
      'border'
    );

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Bartek')).toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();

    await user.click(divisionOperationFilter);

    expect(divisionOperationFilter).toHaveClass('kangur-segmented-control-item-active');
    expect(divisionOperationFilter).toHaveAttribute('aria-pressed', 'true');
    expect(allOperationFilter).not.toHaveClass('kangur-segmented-control-item-active');
    expect(screen.queryByText('Ada')).not.toBeInTheDocument();
    expect(screen.getByText('Bartek')).toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();

    await user.click(anonymousUserFilter);

    expect(anonymousUserFilter).toHaveClass('kangur-segmented-control-item-active');
    expect(anonymousUserFilter).toHaveAttribute('aria-pressed', 'true');
    expect(allUserFilter).not.toHaveClass('kangur-segmented-control-item-active');
    expect(screen.queryByText('Bartek')).not.toBeInTheDocument();
    expect(screen.getByText('Olek')).toBeInTheDocument();
  });

  it('uses the shared empty-state surface when no scores match filters', async () => {
    scoreFilterMock.mockResolvedValue([]);

    render(<Leaderboard />);

    expect(await screen.findByTestId('leaderboard-empty')).toHaveClass(
      'soft-card',
      'border-dashed',
      'border'
    );
    expect(screen.getByText('Brak wynikow dla tych filtrow.')).toBeInTheDocument();
  });

  it('uses Mongo-backed page-content titles when available', async () => {
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => ({
      entry:
        entryId === 'game-home-leaderboard'
          ? {
            id: 'game-home-leaderboard',
            title: 'Ranking mistrzow',
            summary: 'Mongo tytuł sekcji rankingu.',
          }
          : null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    }));

    render(<Leaderboard />);

    expect(await screen.findByRole('heading', { name: 'Ranking mistrzow' })).toBeInTheDocument();
  });
});
