// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CLIENT_LOGGING_KEYS,
  OBSERVABILITY_LOGGING_KEYS,
} from '@/shared/contracts/observability';

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
  ToggleRow: ({
    label,
    checked,
    onCheckedChange,
  }: {
    label?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <label>
      <span>{label}</span>
      <input
        type='checkbox'
        aria-label={label}
        checked={checked}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
      />
    </label>
  ),
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
        [OBSERVABILITY_LOGGING_KEYS.infoEnabled, 'true'],
        [OBSERVABILITY_LOGGING_KEYS.activityEnabled, 'false'],
        [OBSERVABILITY_LOGGING_KEYS.errorEnabled, 'true'],
      ]),
    });

    mocks.useUpdateSettingsBulkMock.mockReturnValue({
      mutateAsync: mocks.mutateAsyncMock,
      isPending: false,
    });
  });

  it('saves logging toggles, tags, and flags from the settings tab panel', async () => {
    render(<ObservationPostSettingsPanel />);

    const infoLoggingToggle = screen.getByLabelText('Info logging');
    const activityLoggingToggle = screen.getByLabelText('Activity logging');
    const errorLoggingToggle = screen.getByLabelText('Error logging');
    const featureFlagsField = screen.getByLabelText('Feature flags (JSON)');
    const tagsField = screen.getByLabelText('Tags (JSON)');
    const saveButton = screen.getByRole('button', { name: 'Save settings' });

    expect(infoLoggingToggle).toBeChecked();
    expect(activityLoggingToggle).not.toBeChecked();
    expect(errorLoggingToggle).toBeChecked();
    expect(featureFlagsField).toHaveValue('{\n  "debug": false\n}');
    expect(tagsField).toHaveValue('{\n  "env": "admin"\n}');
    expect(saveButton).toBeDisabled();

    fireEvent.click(activityLoggingToggle);
    fireEvent.change(featureFlagsField, {
      target: { value: '{\n  "debug": true\n}' },
    });

    expect(saveButton).not.toBeDisabled();

    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mocks.mutateAsyncMock).toHaveBeenCalledWith([
        {
          key: OBSERVABILITY_LOGGING_KEYS.infoEnabled,
          value: 'true',
        },
        {
          key: OBSERVABILITY_LOGGING_KEYS.activityEnabled,
          value: 'true',
        },
        {
          key: OBSERVABILITY_LOGGING_KEYS.errorEnabled,
          value: 'true',
        },
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
