/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));

const {
  scoreFilterMock,
  useKangurSubjectFocusMock,
  withKangurClientError,
  withKangurClientErrorSync,
} = vi.hoisted(() => ({
  scoreFilterMock: vi.fn(),
  useKangurSubjectFocusMock: vi.fn(),
  ...globalThis.__kangurClientErrorMocks(),
}));

vi.mock('@/features/kangur/services/kangur-platform', () => ({
  getKangurPlatform: () => ({
    score: {
      filter: scoreFilterMock,
    },
  }),
}));

vi.mock('@/features/kangur/observability/client', () => ({
  logKangurClientError: vi.fn(),
  reportKangurClientError: vi.fn(),
  withKangurClientError,
  withKangurClientErrorSync,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

import enMessages from '@/i18n/messages/en.json';
import type { KangurScoreRecord } from '@kangur/platform';

import ScoreHistory from './ScoreHistory';

const createScore = (overrides: Partial<KangurScoreRecord>): KangurScoreRecord => ({
  id: 'score-1',
  player_name: 'Jan',
  score: 8,
  operation: 'division',
  total_questions: 10,
  correct_answers: 8,
  time_taken: 42,
  xp_earned: 24,
  created_date: '2026-03-06T12:00:00.000Z',
  created_by: 'jan@example.com',
  subject: 'maths',
  ...overrides,
});

describe('ScoreHistory i18n', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
  });

  it('renders English history headings and operation labels', async () => {
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'english',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });

    scoreFilterMock.mockResolvedValue([
      createScore({ id: 'score-1', operation: 'division' }),
      createScore({
        id: 'score-2',
        operation: 'multiplication',
        correct_answers: 10,
        score: 10,
        created_date: '2026-03-05T12:00:00.000Z',
      }),
      createScore({
        id: 'score-3',
        operation: 'english_adjectives',
        subject: 'english',
        created_date: '2026-03-04T12:00:00.000Z',
      }),
    ]);

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <ScoreHistory />
      </NextIntlClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Results by operation')).toBeInTheDocument();
    });

    expect(screen.getByText('Overview of the last 7 days')).toBeInTheDocument();
    expect(screen.getByText('Weekly trend')).toBeInTheDocument();
    expect(screen.getByText('Recent games')).toBeInTheDocument();
    expect(screen.getAllByText('Adjectives').length).toBeGreaterThan(0);
    expect(screen.getByText('Games total')).toBeInTheDocument();
  });
});
