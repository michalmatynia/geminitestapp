/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AppModal } from '@/shared/ui/app-modal';

describe('AppModal', () => {
  it('calls boolean open handlers and onClose when the default close button is clicked', () => {
    const handleOpenChange = vi.fn();
    const onClose = vi.fn();
    function onOpenChange(open: boolean): void {
      handleOpenChange(open);
    }

    render(
      <AppModal open onOpenChange={onOpenChange} onClose={onClose} title='Profile'>
        Modal body
      </AppModal>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByText('Modal body')).toBeInTheDocument();
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('treats zero-argument open handlers as close-only callbacks', () => {
    const onOpenChange = vi.fn(() => undefined);

    render(
      <AppModal open onOpenChange={onOpenChange} title='Settings'>
        Settings body
      </AppModal>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onOpenChange).toHaveBeenCalledWith();
  });
});
