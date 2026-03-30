import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurDrawingSnapshotActions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingSnapshotActions';

describe('KangurDrawingSnapshotActions', () => {
  it('renders the shared export action and forwards clicks', () => {
    const onExport = vi.fn();

    render(<KangurDrawingSnapshotActions exportLabel='Eksportuj PNG' onExport={onExport} />);

    fireEvent.click(screen.getByRole('button', { name: 'Eksportuj PNG' }));

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('applies coarse-pointer sizing and disabled state', () => {
    render(
      <KangurDrawingSnapshotActions
        exportDisabled
        exportLabel='Eksportuj PNG'
        isCoarsePointer
        onExport={() => undefined}
      />
    );

    expect(screen.getByRole('button', { name: 'Eksportuj PNG' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Eksportuj PNG' })).toBeDisabled();
  });

  it('supports the shared icon-only export mode', () => {
    render(
      <KangurDrawingSnapshotActions
        display='icon'
        exportLabel='Eksportuj PNG'
        onExport={() => undefined}
        size='sm'
        variant='ghost'
      />
    );

    expect(screen.getByRole('button', { name: 'Eksportuj PNG' })).toHaveAttribute(
      'title',
      'Eksportuj PNG'
    );
    expect(screen.getByRole('button', { name: 'Eksportuj PNG' })).not.toHaveTextContent(
      'Eksportuj PNG'
    );
  });
});
