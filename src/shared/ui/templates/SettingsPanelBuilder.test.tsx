// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../FormModal', () => ({
  FormModal: (props: {
    cancelText: string;
    children?: React.ReactNode;
    isSaving?: boolean;
    onClose: () => void;
    onSave: () => void;
    open: boolean;
    saveText: string;
    showCancelButton: boolean;
    showSaveButton: boolean;
    size: string;
    subtitle?: string;
    title: string;
  }) => {
    const {
      cancelText,
      children,
      isSaving,
      onClose,
      onSave,
      open,
      saveText,
      showCancelButton,
      showSaveButton,
      size,
      subtitle,
      title,
    } = props;

    return (
      <div
        data-testid='form-modal'
        data-open={String(open)}
        data-is-saving={String(isSaving)}
        data-save-text={saveText}
        data-cancel-text={cancelText}
        data-show-save={String(showSaveButton)}
        data-show-cancel={String(showCancelButton)}
        data-size={size}
        data-subtitle={subtitle}
        data-title={title}
      >
        <button type='button' onClick={onSave}>
          save
        </button>
        <button type='button' onClick={onClose}>
          close
        </button>
        {children}
      </div>
    );
  },
}));

import { SettingsPanelBuilder } from './SettingsPanelBuilder';

describe('SettingsPanelBuilder', () => {
  it('renders the modal and field renderer directly without a local runtime context', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();

    render(
      <SettingsPanelBuilder<{ name: string }>
        open
        onClose={onClose}
        title='Edit settings'
        subtitle='Update the name'
        onSave={onSave}
        isSaving
        size='lg'
        saveText='Apply'
        cancelText='Dismiss'
        fields={[
          {
            key: 'name',
            label: 'Name',
            type: 'text',
            placeholder: 'Enter a name',
          },
        ]}
        values={{ name: 'Alice' }}
        errors={{ name: 'Required' }}
        onChange={onChange}
      />
    );

    const formModal = screen.getByTestId('form-modal');
    expect(formModal.dataset.open).toBe('true');
    expect(formModal.dataset.isSaving).toBe('true');
    expect(formModal.dataset.title).toBe('Edit settings');
    expect(formModal.dataset.subtitle).toBe('Update the name');
    expect(formModal.dataset.saveText).toBe('Apply');
    expect(formModal.dataset.cancelText).toBe('Dismiss');
    expect(formModal.dataset.showSave).toBe('true');
    expect(formModal.dataset.showCancel).toBe('true');
    expect(formModal.dataset.size).toBe('lg');

    const input = screen.getByLabelText('Name');
    expect(input).toHaveValue('Alice');
    expect(input).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'save' }));
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    fireEvent.change(input, { target: { value: 'Bob' } });

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ name: 'Bob' });
  });
});
