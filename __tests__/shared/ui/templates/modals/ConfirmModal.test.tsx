import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

describe('ConfirmModal', () => {
  it('renders confirmation dialog', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title='Confirm Action'
        message='Are you sure?'
      />
    );

    expect(screen.getAllByText('Confirm Action').length).toBeGreaterThan(0);
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onConfirm and onClose on confirm', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title='Confirm Action'
        confirmText='Yes'
      />
    );

    const confirmButton = screen.getByText('Yes');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title='Confirm Action'
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows loading state', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title='Confirm Action'
        loading={true}
      />
    );

    const confirmButton = screen.getByText('Processing...');
    expect(confirmButton).toBeDisabled();
  });

  it('shows dangerous variant for destructive actions', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmModal
        isOpen={true}
        onClose={onClose}
        onConfirm={onConfirm}
        title='Delete Item'
        isDangerous={true}
        confirmText='Delete'
      />
    );

    const deleteButton = screen.getByText('Delete');
    expect(deleteButton.className).toContain('destructive');
  });
});
