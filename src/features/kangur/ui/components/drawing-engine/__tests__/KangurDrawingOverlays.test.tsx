import { render, screen } from '@testing-library/react';

import {
  KangurDrawingEmptyStateOverlay,
  KangurDrawingKeyboardCursorOverlay,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingOverlays';

describe('KangurDrawingOverlays', () => {
  it('renders the keyboard cursor overlay with the expected position and drawing state', () => {
    const { container } = render(
      <div className='relative'>
        <KangurDrawingKeyboardCursorOverlay
          accentClassName='border-sky-400 bg-sky-100'
          cursor={{ x: 80, y: 55 }}
          height={220}
          isCoarsePointer
          isDrawing
          width={320}
        />
      </div>
    );

    const overlay = container.querySelector('[aria-hidden="true"]');

    expect(overlay).toBeTruthy();
    expect(overlay).toHaveClass('h-5', 'w-5', 'scale-110', 'border-sky-400', 'bg-sky-100');
    expect(overlay).toHaveStyle({
      left: '25%',
      top: '25%',
    });
  });

  it('renders the shared empty-state overlay content', () => {
    const { container } = render(
      <div className='relative'>
        <KangurDrawingEmptyStateOverlay>Trace here</KangurDrawingEmptyStateOverlay>
      </div>
    );

    const text = screen.getByText('Trace here');
    const overlay = container.querySelector('.pointer-events-none.absolute.inset-0');

    expect(text).toBeVisible();
    expect(overlay).toHaveClass(
      'pointer-events-none',
      'absolute',
      'inset-0',
      'flex',
      'items-center',
      'justify-center'
    );
  });
});
