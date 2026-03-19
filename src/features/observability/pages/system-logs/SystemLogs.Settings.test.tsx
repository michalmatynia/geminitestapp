// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CLIENT_LOGGING_KEYS } from '@/shared/contracts/observability';

const mocks = vi.hoisted(() => ({
  useSettingsMapMock: vi.fn(),
  useUpdateSettingsBulkMock: vi.fn(),
  toastMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: mocks.useSettingsMapMock,
  useUpdateSettingsBulk: mocks.useUpdateSettingsBulkMock,
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  FormField: ({
    label,
    children,
  }: {
    label?: string;
    children?: React.ReactNode;
  }) => (
    <label>
      <span>{label}</span>
      {children}
    </label>
  ),
  FormSection: ({
    title,
    children,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  ),
  Textarea: ({
    value,
    onChange,
  }: {
    value?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  }) => <textarea value={value} onChange={onChange} />,
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-6',
  useToast: () => ({
    toast: mocks.toastMock,
  }),
}));

import { ObservationPostSettingsPanel } from './SystemLogs.Settings';

describe('ObservationPostSettingsPanel', () => {
  beforeEach(() => {
    mocks.useSettingsMapMock.mockReset();
    mocks.useUpdateSettingsBulkMock.mockReset();
    mocks.toastMock.mockReset();
    mocks.mutateAsyncMock.mockReset();

    mocks.useSettingsMapMock.mockReturnValue({
      isLoading: false,
      data: new Map([
        [CLIENT_LOGGING_KEYS.tags, '{"env":"admin"}'],
        [CLIENT_LOGGING_KEYS.featureFlags, '{"debug":false}'],
      ]),
    });

    mocks.useUpdateSettingsBulkMock.mockReturnValue({
      mutateAsync: mocks.mutateAsyncMock,
      isPending: false,
    });
  });

  it('saves logging tags and flags from the settings tab panel', async () => {
    render(<ObservationPostSettingsPanel />);

    const featureFlagsField = screen.getByLabelText('Feature flags (JSON)');
    const tagsField = screen.getByLabelText('Tags (JSON)');
    const saveButton = screen.getByRole('button', { name: 'Save settings' });

    expect(featureFlagsField).toHaveValue('{\n  "debug": false\n}');
    expect(tagsField).toHaveValue('{\n  "env": "admin"\n}');
    expect(saveButton).toBeDisabled();

    fireEvent.change(featureFlagsField, {
      target: { value: '{\n  "debug": true\n}' },
    });

    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mocks.mutateAsyncMock).toHaveBeenCalledWith([
        {
          key: CLIENT_LOGGING_KEYS.tags,
          value: '{"env":"admin"}',
        },
        {
          key: CLIENT_LOGGING_KEYS.featureFlags,
          value: '{"debug":true}',
        },
      ]);
    });

    expect(mocks.toastMock).toHaveBeenCalledWith('Logging settings saved.', {
      variant: 'success',
    });
  });

  it('shows a loading state before the settings map is ready', () => {
    mocks.useSettingsMapMock.mockReturnValue({
      isLoading: true,
      data: null,
    });

    render(<ObservationPostSettingsPanel />);

    expect(screen.getByText('Loading settings...')).toBeInTheDocument();
  });

  it('surfaces invalid JSON errors without sending an update request', async () => {
    render(<ObservationPostSettingsPanel />);

    fireEvent.change(screen.getByLabelText('Feature flags (JSON)'), {
      target: { value: '{' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(mocks.toastMock).toHaveBeenCalledWith(expect.any(String), {
        variant: 'error',
      });
    });

    expect(mocks.mutateAsyncMock).not.toHaveBeenCalled();
  });
});
