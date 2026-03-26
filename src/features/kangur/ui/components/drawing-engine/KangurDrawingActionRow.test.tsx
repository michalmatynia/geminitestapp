'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurDrawingActionRow } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingActionRow';

describe('KangurDrawingActionRow', () => {
  it('renders clear and primary actions with the default drawing styles', () => {
    const onClear = vi.fn();
    const onPrimary = vi.fn();

    render(
      <KangurDrawingActionRow
        clearLabel='Clear'
        feedback={null}
        onClear={onClear}
        onPrimary={onPrimary}
        primaryLabel='Check'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Check' })).toHaveClass(
      '[background:var(--kangur-soft-card-background)]'
    );
  });

  it('applies coarse-pointer sizing and feedback tone classes', () => {
    const { rerender } = render(
      <KangurDrawingActionRow
        clearDisabled
        clearLabel='Clear'
        feedback={{ kind: 'success', text: 'Nice.' }}
        isCoarsePointer
        onClear={() => {}}
        onPrimary={() => {}}
        primaryDisabled
        primaryLabel='Check'
      />
    );

    expect(screen.getByRole('button', { name: 'Clear' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Check' })).toHaveClass('bg-emerald-500');
    expect(screen.getByRole('button', { name: 'Check' })).toBeDisabled();

    rerender(
      <KangurDrawingActionRow
        clearLabel='Clear'
        feedback={{ kind: 'error', text: 'Try again.' }}
        onClear={() => {}}
        onPrimary={() => {}}
        primaryLabel='Check'
      />
    );
    expect(screen.getByRole('button', { name: 'Check' })).toHaveClass('bg-rose-500');

    rerender(
      <KangurDrawingActionRow
        clearLabel='Clear'
        feedback={{ kind: 'info', text: 'Keep going.' }}
        onClear={() => {}}
        onPrimary={() => {}}
        primaryLabel='Check'
      />
    );
    expect(screen.getByRole('button', { name: 'Check' })).toHaveClass('bg-amber-500');
  });

  it('renders shared history actions ahead of the main row actions', () => {
    render(
      <KangurDrawingActionRow
        clearLabel='Clear'
        feedback={null}
        historyActions={<button type='button'>Undo</button>}
        onClear={() => {}}
        onPrimary={() => {}}
        primaryLabel='Check'
      />
    );

    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Check' })).toBeInTheDocument();
  });
});
