/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { FormModal } from '@/shared/ui/FormModal';

const mocks = vi.hoisted(() => ({
  appModalProps: vi.fn(),
}));

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: (props: Record<string, unknown>) => {
    mocks.appModalProps(props);
    return (
      <div data-testid='app-modal'>
        {props['header'] as ReactNode}
        {props['children'] as ReactNode}
      </div>
    );
  },
}));

describe('FormModal', () => {
  beforeEach(() => {
    mocks.appModalProps.mockReset();
  });

  it('locks close actions while saving when disableCloseWhileSaving is enabled', () => {
    const onClose = vi.fn();

    render(
      <FormModal
        open
        onClose={onClose}
        title='Edit Product'
        onSave={() => {}}
        isSaving
        disableCloseWhileSaving
        cancelText='Close'
      >
        <div>Form content</div>
      </FormModal>
    );

    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toBeDisabled();
    fireEvent.click(closeButton);
    expect(onClose).not.toHaveBeenCalled();

    const lastProps = mocks.appModalProps.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(lastProps).toBeTruthy();
    expect(lastProps['lockClose']).toBe(true);
    expect(lastProps['closeOnOutside']).toBe(false);
    expect(lastProps['closeOnEscape']).toBe(false);
  });
});
