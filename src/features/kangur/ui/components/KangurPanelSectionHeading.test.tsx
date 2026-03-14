/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurPanelSectionHeading } from './KangurPanelSectionHeading';

describe('KangurPanelSectionHeading', () => {
  it('renders the shared subsection heading spacing by default', () => {
    render(<KangurPanelSectionHeading>Ścieżki odznak</KangurPanelSectionHeading>);

    expect(screen.getByText('Ścieżki odznak')).toHaveClass(
      'mb-3',
      '[color:var(--kangur-page-muted-text)]'
    );
  });

  it('keeps tone and class overrides for panel-specific headings', () => {
    render(
      <KangurPanelSectionHeading className='text-xs tracking-wide' tone='slate'>
        Obraz ostatnich dni
      </KangurPanelSectionHeading>
    );

    expect(screen.getByText('Obraz ostatnich dni')).toHaveClass(
      'mb-3',
      'text-xs',
      'tracking-wide',
      '[color:var(--kangur-page-muted-text)]'
    );
  });
});
