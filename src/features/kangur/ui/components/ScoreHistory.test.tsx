/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurScoreRecord } from '@/features/kangur/services/ports';

const { scoreFilterMock, logKangurClientErrorMock } = vi.hoisted(() => ({
  scoreFilterMock: vi.fn(),
  logKangurClientErrorMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      filter: scoreFilterMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: logKangurClientErrorMock,
}));

import ScoreHistory from '@/features/kangur/ui/components/ScoreHistory';

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Jan',
  score: 8,
  operation: 'addition',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 42,
  created_date: '2026-03-06T12:00:00.000Z',
  created_by: 'jan@example.com',
  ...overrides,
});

describe('ScoreHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads learner-scoped results by account and display name without falling back to global history', async () => {
    scoreFilterMock.mockImplementation(
      (criteria: Partial<KangurScoreRecord>): Promise<KangurScoreRecord[]> => {
        if (criteria.created_by) {
          return Promise.resolve([
            createScore({
              id: 'score-1',
              operation: 'addition',
              created_date: '2026-03-05T11:00:00.000Z',
            }),
            createScore({
              id: 'score-2',
              operation: 'multiplication',
              correct_answers: 10,
              score: 10,
              created_date: '2026-03-04T10:00:00.000Z',
            }),
          ]);
        }

        if (criteria.player_name) {
          return Promise.resolve([
            createScore({
              id: 'score-2',
              operation: 'multiplication',
              correct_answers: 10,
              score: 10,
              created_date: '2026-03-04T10:00:00.000Z',
            }),
            createScore({
              id: 'score-3',
              operation: 'division',
              correct_answers: 6,
              score: 6,
              created_date: '2026-03-06T14:00:00.000Z',
            }),
          ]);
        }

        return Promise.resolve([]);
      }
    );

    render(<ScoreHistory playerName='Jan' createdBy='jan@example.com' />);

    await waitFor(() => expect(scoreFilterMock).toHaveBeenCalledTimes(2));
    expect(scoreFilterMock).toHaveBeenCalledWith(
      { created_by: 'jan@example.com' },
      '-created_date',
      30
    );
    expect(scoreFilterMock).toHaveBeenCalledWith({ player_name: 'Jan' }, '-created_date', 30);
    expect(scoreFilterMock).not.toHaveBeenCalledWith({}, '-created_date', 30);

    expect(screen.getByText('Wyniki wg operacji')).toBeInTheDocument();
    expect(screen.getByText('Obraz ostatnich 7 dni')).toBeInTheDocument();
    expect(screen.getByText('Trend tygodnia')).toBeInTheDocument();
    expect(screen.getByText('Ostatnie gry')).toBeInTheDocument();
    expect(screen.getByText('Gier lacznie').previousElementSibling).toHaveTextContent('3');
    expect(screen.getAllByText('Dzielenie').length).toBeGreaterThan(0);
  });

  it('falls back to recent global results when no learner identity is provided', async () => {
    scoreFilterMock.mockResolvedValue([
      createScore({ id: 'score-1' }),
      createScore({
        id: 'score-2',
        operation: 'division',
        created_date: '2026-03-05T12:00:00.000Z',
      }),
    ]);

    render(<ScoreHistory />);

    await waitFor(() => expect(scoreFilterMock).toHaveBeenCalledWith({}, '-created_date', 30));
    expect(scoreFilterMock).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Gier lacznie').previousElementSibling).toHaveTextContent('2');
  });

  it('renders a lesson follow-up link for the weakest tracked operation when a base path is available', async () => {
    scoreFilterMock.mockImplementation(
      (criteria: Partial<KangurScoreRecord>): Promise<KangurScoreRecord[]> => {
        if (criteria.created_by) {
          return Promise.resolve([
            createScore({
              id: 'score-1',
              operation: 'division',
              correct_answers: 4,
              score: 4,
              created_date: '2026-03-06T11:00:00.000Z',
            }),
            createScore({
              id: 'score-2',
              operation: 'multiplication',
              correct_answers: 10,
              score: 10,
              created_date: '2026-03-05T11:00:00.000Z',
            }),
          ]);
        }

        if (criteria.player_name) {
          return Promise.resolve([
            createScore({
              id: 'score-3',
              operation: 'division',
              correct_answers: 5,
              score: 5,
              created_date: '2026-03-04T11:00:00.000Z',
            }),
          ]);
        }

        return Promise.resolve([]);
      }
    );

    render(<ScoreHistory playerName='Jan' createdBy='jan@example.com' basePath='/kangur' />);

    const followUpLink = await screen.findByRole('link', { name: 'Powtorz lekcje' });
    expect(followUpLink).toHaveAttribute('href', '/kangur/lessons?focus=division');
  });
});
