/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import KangurRecommendationCard from '@/features/kangur/ui/components/KangurRecommendationCard';

describe('KangurRecommendationCard', () => {
  it('renders the shared recommendation card layout and optional description', () => {
    render(
      <KangurRecommendationCard
        accent='indigo'
        dataTestId='recommendation-card'
        description='To najmocniej podbije dzisiejszy postep.'
        descriptionTestId='recommendation-description'
        label='Mocna passa'
        labelTestId='recommendation-label'
        title='Polecany trening: Dzielenie'
        titleTestId='recommendation-title'
      />
    );

    expect(screen.getByTestId('recommendation-card')).toHaveClass(
      'soft-card',
      'border',
      'rounded-[24px]'
    );
    expect(screen.getByTestId('recommendation-label')).toHaveTextContent('Mocna passa');
    expect(screen.getByTestId('recommendation-title')).toHaveTextContent(
      'Polecany trening: Dzielenie'
    );
    expect(screen.getByTestId('recommendation-description')).toHaveTextContent(
      'To najmocniej podbije dzisiejszy postep.'
    );
  });
});
