/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  KangurProgressHighlightCardContent,
  KangurProgressHighlightHeader,
  KangurProgressHighlightChip,
  KangurProgressHighlightBar,
} from '@/features/kangur/ui/components/KangurProgressHighlightCardContent';

describe('KangurProgressHighlightCardContent', () => {
  it('renders the shared progress highlight structure', () => {
    render(
      <div data-testid='wrapper'>
        <KangurProgressHighlightCardContent>
          <div className='flex flex-col items-start kangur-panel-gap sm:flex-row sm:justify-between'>
            <KangurProgressHighlightHeader
              description='Jeszcze chwila do kolejnego progu.'
              eyebrow='Następna odznaka'
              title='⭐ Start wyzwan'
            />
            <KangurProgressHighlightChip accent='amber' label='2/4 zadania' />
          </div>
          <KangurProgressHighlightBar
            accent='amber'
            testId='highlight-bar'
            value={50}
          />
        </KangurProgressHighlightCardContent>
      </div>
    );

    expect(screen.getByTestId('wrapper')).toHaveTextContent('Następna odznaka');
    expect(screen.getByTestId('wrapper')).toHaveTextContent('⭐ Start wyzwan');
    expect(screen.getByTestId('wrapper')).toHaveTextContent('Jeszcze chwila do kolejnego progu.');
    expect(screen.getByText('2/4 zadania')).toHaveClass('self-start');
    expect(screen.getByTestId('highlight-bar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('supports styling overrides used by hero milestone surfaces', () => {
    render(
      <KangurProgressHighlightCardContent>
        <div className='flex flex-col items-start kangur-panel-gap sm:flex-row sm:justify-between'>
          <KangurProgressHighlightHeader
            description='Do odznaki Trzymam kierunek: 2/3 rundy'
            descriptionStyle={{ color: 'rgb(1 2 3)' }}
            eyebrow='Polecony kierunek'
            eyebrowStyle={{ color: 'rgb(4 5 6)' }}
            title='2 polecone rundy'
          />
          <KangurProgressHighlightChip
            accent='sky'
            className='text-[11px]'
            label='2/3 rundy'
          />
        </div>
        <KangurProgressHighlightBar
          accent='sky'
          testId='highlight-bar'
          value={67}
        />
      </KangurProgressHighlightCardContent>
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
