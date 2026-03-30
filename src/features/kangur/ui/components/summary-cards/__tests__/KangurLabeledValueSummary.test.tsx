/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurLabeledValueSummary } from '../KangurLabeledValueSummary';

describe('KangurLabeledValueSummary', () => {
  it('renders label, value, and optional description with shared text styles', () => {
    render(
      <KangurLabeledValueSummary
        description='Ostatnia analiza nastroju tutora dla tego ucznia.'
        label='Ostatnia aktualizacja'
        value='8 marca, 09:15'
        valueTestId='labeled-value-summary'
      />
    );

    expect(screen.getByText('Ostatnia aktualizacja')).toHaveClass(
      'text-[11px]',
      'uppercase'
    );
    expect(screen.getByTestId('labeled-value-summary')).toHaveTextContent('8 marca, 09:15');
    expect(screen.getByTestId('labeled-value-summary')).toHaveClass(
      '[color:var(--kangur-page-text)]'
    );
    expect(
      screen.getByText('Ostatnia analiza nastroju tutora dla tego ucznia.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });
});
