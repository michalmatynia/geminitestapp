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
        description='To najmocniej podbije dzisiejszy postęp.'
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
      'kangur-card-surface',
      'kangur-card-padding-md'
    );
    expect(screen.getByTestId('recommendation-label')).toHaveTextContent('Mocna passa');
    expect(screen.getByTestId('recommendation-title')).toHaveTextContent(
      'Polecany trening: Dzielenie'
    );
    expect(screen.getByTestId('recommendation-description')).toHaveTextContent(
      'To najmocniej podbije dzisiejszy postęp.'
    );
  });

  it('supports header extras and trailing actions for richer recommendation cards', () => {
    render(
      <KangurRecommendationCard
        accent='amber'
        action={<button type='button'>Uruchom trening</button>}
        dataTestId='rich-recommendation-card'
        description='Ta sesja przybliża kolejną odznakę.'
        descriptionClassName='mt-1'
        descriptionSize='sm'
        descriptionTestId='rich-recommendation-description'
        headerExtras={<span>Tempo: 36 XP / grę</span>}
        label='Polecony kierunek'
        labelSize='sm'
        labelStyle='caps'
        labelTestId='rich-recommendation-label'
        title='Dopnij polecany kierunek'
        titleClassName='mt-3'
        titleSize='md'
        titleTestId='rich-recommendation-title'
      />
    );

    expect(screen.getByTestId('rich-recommendation-label')).toHaveTextContent(
      'Polecony kierunek'
    );
    expect(screen.getByText('Tempo: 36 XP / grę')).toBeInTheDocument();
    expect(screen.getByTestId('rich-recommendation-title')).toHaveTextContent(
      'Dopnij polecany kierunek'
    );
    expect(screen.getByRole('button', { name: 'Uruchom trening' })).toBeInTheDocument();
  });

  it('renders a custom label slot when provided', () => {
    render(
      <KangurRecommendationCard
        accent='rose'
        dataTestId='custom-label-recommendation-card'
        description='Najkrótszy krok do odzyskania tempa.'
        descriptionTestId='custom-label-recommendation-description'
        labelContent={<span data-testid='custom-label-slot'>Priorytet wysoki</span>}
        title='Wróć do zegara'
        titleTestId='custom-label-recommendation-title'
      />
    );

    expect(screen.getByTestId('custom-label-slot')).toHaveTextContent('Priorytet wysoki');
    expect(screen.getByTestId('custom-label-recommendation-title')).toHaveTextContent(
      'Wróć do zegara'
    );
    expect(screen.getByTestId('custom-label-recommendation-description')).toHaveTextContent(
      'Najkrótszy krok do odzyskania tempa.'
    );
  });
});
