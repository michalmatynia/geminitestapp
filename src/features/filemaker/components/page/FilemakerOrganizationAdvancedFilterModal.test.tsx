// @vitest-environment jsdom

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  OrganizationAdvancedFilterGroup,
  OrganizationAdvancedFilterPreset,
} from '../../filemaker-organization-advanced-filters';

const { toastMock } = vi.hoisted(() => ({
  toastMock: vi.fn(),
}));

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: ({
    children,
    footer,
    isOpen,
    title,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    isOpen: boolean;
    title: string;
  }) =>
    isOpen ? (
      <section aria-label={title} role='dialog'>
        {children}
        {footer}
      </section>
    ) : null,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/shared/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('./OrganizationAdvancedFilterBuilder', () => ({
  OrganizationAdvancedFilterBuilder: ({
    group,
  }: {
    group: OrganizationAdvancedFilterGroup;
    onChange: (group: OrganizationAdvancedFilterGroup) => void;
  }) => <div data-testid='organization-advanced-builder'>{group.id}</div>,
}));

import { FilemakerOrganizationAdvancedFilterModal } from './FilemakerOrganizationAdvancedFilterModal';

const warsawFilter: OrganizationAdvancedFilterGroup = {
  combinator: 'and',
  id: 'group-1',
  not: false,
  rules: [
    {
      field: 'city',
      id: 'condition-1',
      operator: 'contains',
      type: 'condition',
      value: 'Warsaw',
    },
  ],
  type: 'group',
};

const createPreset = (overrides: Partial<OrganizationAdvancedFilterPreset> = {}) => ({
  createdAt: '2026-04-28T00:00:00.000Z',
  filter: warsawFilter,
  id: 'preset-1',
  name: 'Warsaw roots',
  updatedAt: '2026-04-28T00:00:00.000Z',
  ...overrides,
});

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof FilemakerOrganizationAdvancedFilterModal>> = {}
): React.ComponentProps<typeof FilemakerOrganizationAdvancedFilterModal> => {
  const props: React.ComponentProps<typeof FilemakerOrganizationAdvancedFilterModal> = {
    open: true,
    presets: [],
    value: JSON.stringify(warsawFilter),
    onApply: vi.fn(),
    onClear: vi.fn(),
    onClose: vi.fn(),
    onSavePresets: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  render(<FilemakerOrganizationAdvancedFilterModal {...props} />);
  return props;
};

describe('FilemakerOrganizationAdvancedFilterModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies the current advanced filter payload and closes the modal', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(props.onApply).toHaveBeenCalledWith(expect.stringContaining('"city"'), null);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('clears the current advanced filter and closes the modal', async () => {
    const user = userEvent.setup();
    const props = renderModal();

    await user.click(screen.getByRole('button', { name: 'Clear' }));

    expect(props.onClear).toHaveBeenCalledTimes(1);
    expect(props.onClose).toHaveBeenCalledTimes(1);
    expect(props.onApply).not.toHaveBeenCalled();
  });

  it('saves the current advanced filter as a new preset', async () => {
    const user = userEvent.setup();
    const onSavePresets = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSavePresets });

    await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'Warsaw roots');
    await user.click(screen.getByRole('button', { name: 'Save Preset' }));

    await waitFor(() => {
      expect(onSavePresets).toHaveBeenCalledWith([
        expect.objectContaining({
          filter: warsawFilter,
          name: 'Warsaw roots',
        }),
      ]);
      expect(toastMock).toHaveBeenCalledWith('Preset saved.', { variant: 'success' });
    });
  });

  it('rejects duplicate preset names before saving', async () => {
    const user = userEvent.setup();
    const onSavePresets = vi.fn().mockResolvedValue(undefined);
    renderModal({
      onSavePresets,
      presets: [createPreset()],
    });

    await user.type(screen.getByRole('textbox', { name: 'Preset name' }), 'warsaw ROOTS');
    await user.click(screen.getByRole('button', { name: 'Save Preset' }));

    expect(onSavePresets).not.toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith('Preset name already exists. Choose a unique name.', {
      variant: 'error',
    });
  });
});
