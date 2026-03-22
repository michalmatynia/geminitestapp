/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FormModal } from '@/shared/ui/FormModal';

describe('FormModal', () => {
  it('submits through the provided form ref before falling back to onSave', () => {
    const requestSubmit = vi.fn();
    const onSave = vi.fn();
    const onClose = vi.fn();
    const formRef = {
      current: {
        requestSubmit,
      },
    } as React.RefObject<HTMLFormElement | null>;

    render(
      <FormModal open onClose={onClose} onSave={onSave} title='Edit Profile' formRef={formRef}>
        <div>Form body</div>
      </FormModal>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(requestSubmit).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
