import { render, screen } from '@testing-library/react';

import { KangurDrawingStatusRegions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingStatusRegions';

describe('KangurDrawingStatusRegions', () => {
  it('renders both the live region and keyboard status region', () => {
    render(
      <KangurDrawingStatusRegions
        keyboardStatus='Keyboard drawing finished.'
        keyboardStatusTestId='keyboard-status'
        liveMessage='Round 2 of 4. Draw the square.'
      />
    );

    expect(screen.getByText('Round 2 of 4. Draw the square.')).toHaveClass('sr-only');
    expect(screen.getByTestId('keyboard-status')).toHaveTextContent(
      'Keyboard drawing finished.'
    );
    expect(screen.getByTestId('keyboard-status')).toHaveClass('sr-only');
  });

  it('renders only the keyboard status region when no live message is provided', () => {
    render(
      <KangurDrawingStatusRegions
        keyboardStatus='Board cleared.'
        keyboardStatusTestId='keyboard-status'
      />
    );

    expect(screen.queryByText('Round 2 of 4. Draw the square.')).not.toBeInTheDocument();
    expect(screen.getByTestId('keyboard-status')).toHaveTextContent('Board cleared.');
  });
});
