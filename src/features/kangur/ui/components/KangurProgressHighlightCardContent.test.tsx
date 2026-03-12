/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurProgressHighlightCardContent } from '@/features/kangur/ui/components/KangurProgressHighlightCardContent';

describe('KangurProgressHighlightCardContent', () => {
  it('renders the shared progress highlight structure', () => {
    render(
      <div data-testid='wrapper'>
        <KangurProgressHighlightCardContent
          chipAccent='amber'
          chipLabel='2/4 zadania'
          description='Jeszcze chwila do kolejnego progu.'
          eyebrow='Nastepna odznaka'
          progressAccent='amber'
          progressBarTestId='highlight-bar'
          progressValue={50}
          title='⭐ Start wyzwan'
        />
      </div>
    );

    expect(screen.getByTestId('wrapper')).toHaveTextContent('Nastepna odznaka');
    expect(screen.getByTestId('wrapper')).toHaveTextContent('⭐ Start wyzwan');
    expect(screen.getByTestId('wrapper')).toHaveTextContent('Jeszcze chwila do kolejnego progu.');
    expect(screen.getByText('2/4 zadania')).toHaveClass('rounded-full', 'border');
    expect(screen.getByTestId('highlight-bar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('supports styling overrides used by hero milestone surfaces', () => {
    render(
      <KangurProgressHighlightCardContent
        chipAccent='sky'
        chipClassName='text-[11px]'
        chipLabel='2/3 rundy'
        description='Do odznaki Trzymam kierunek: 2/3 rundy'
        descriptionStyle={{ color: 'rgb(1 2 3)' }}
        eyebrow='Polecony kierunek'
        eyebrowStyle={{ color: 'rgb(4 5 6)' }}
        progressAccent='sky'
        progressBarTestId='highlight-bar'
        progressValue={67}
        title='2 polecone rundy'
      />
    );

    expect(screen.getByText('Polecony kierunek').getAttribute('style')).toContain(
      'rgb(4, 5, 6)'
    );
    expect(
      screen.getByText('Do odznaki Trzymam kierunek: 2/3 rundy').getAttribute('style')
    ).toContain('rgb(1, 2, 3)');
    expect(screen.getByText('2/3 rundy')).toHaveClass('text-[11px]');
  });
});
