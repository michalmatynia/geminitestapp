/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useKangurLearnerProfileRuntimeMock, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurLearnerProfileRuntimeMock: vi.fn(),
  useKangurPageContentEntryMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext', () => ({
  KANGUR_PROFILE_RECOMMENDATION_ACCENTS: {
    high: 'rose',
    medium: 'amber',
    low: 'sky',
  },
  buildKangurRecommendationHref: (basePath: string, action: { page: string; query?: Record<string, string> }) =>
    `${basePath.toString()}/game?quickStart=${action.query?.quickStart ?? ''}`,
  useKangurLearnerProfileRuntime: useKangurLearnerProfileRuntimeMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
    targetPageKey: _targetPageKey,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    targetPageKey?: string;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { KangurLearnerProfileRecommendationsWidget } from './KangurLearnerProfileRecommendationsWidget';

describe('KangurLearnerProfileRecommendationsWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKangurPageContentEntryMock.mockReturnValue({
      entry: null,
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('uses Mongo-backed recommendations intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      entry: {
        id: 'learner-profile-recommendations',
        title: 'Plan na dziś',
        summary: 'Mongo opis kolejnych kroków dla ucznia.',
      },
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
    });
    useKangurLearnerProfileRuntimeMock.mockReturnValue({
      basePath: '/kangur',
      snapshot: {
        recommendations: [
          {
            id: 'rec-1',
            priority: 'high',
            title: 'Wróć do zegara',
            description: 'Jedna krótka runda pomoże domknąć aktualny poziom.',
            action: {
              label: 'Uruchom trening',
              page: 'Game',
              query: {
                quickStart: 'operation',
              },
            },
          },
        ],
      },
    });

    render(<KangurLearnerProfileRecommendationsWidget />);

    expect(screen.getByTestId('learner-profile-recommendations-intro')).toHaveTextContent(
      'Plan na dziś'
    );
    expect(screen.getByTestId('learner-profile-recommendations-intro')).toHaveTextContent(
      'Mongo opis kolejnych kroków dla ucznia.'
    );
    expect(screen.getByText('Priorytet wysoki')).toBeInTheDocument();
    expect(screen.getByText('Wróć do zegara')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Uruchom trening' })).toHaveAttribute(
      'href',
      '/kangur/game?quickStart=operation'
    );
  });
});
