// @vitest-environment jsdom

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mutateAsyncMock = vi.fn();
const toastMock = vi.fn();

vi.mock('@/shared/hooks/use-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/hooks/use-settings')>();
  return {
    ...actual,
    useUpdateSettingsBulk: () => ({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    }),
  };
});

vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui')>();
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { AdminTextEditorSettingsPage } from './AdminTextEditorSettingsPage';

describe('AdminTextEditorSettingsPage', () => {
  beforeEach(() => {
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue(undefined);
    toastMock.mockReset();
  });

  it('renders all editor-engine instances', () => {
    render(<AdminTextEditorSettingsPage />);

    expect(screen.getByText('Notes App')).toBeInTheDocument();
    expect(screen.getByText('Filemaker Email')).toBeInTheDocument();
    expect(screen.getByText('Case Resolver')).toBeInTheDocument();
  });

  it('persists edited profiles through the settings store', async () => {
    const user = userEvent.setup();

    render(<AdminTextEditorSettingsPage />);

    const notesPanel = document.getElementById('text-editor-instance-notes_app');
    expect(notesPanel).not.toBeNull();

    await user.click(within(notesPanel as HTMLElement).getByLabelText('Allow Font Family'));
    await user.click(screen.getByRole('button', { name: 'Save Profiles' }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    const payload = mutateAsyncMock.mock.calls[0]?.[0] as Array<{ key: string; value: string }>;
    expect(payload).toHaveLength(3);

    const notesProfile = payload.find((entry) => entry.key === 'text_editor_profile::notes_app');
    expect(notesProfile).toBeDefined();
    expect(JSON.parse(notesProfile?.value ?? '{}')).toMatchObject({
      appearance: 'default',
      allowFontFamily: true,
      allowTextAlign: false,
      enableAdvancedTools: false,
      allowImage: true,
      allowTable: true,
      allowTaskList: true,
    });

    expect(toastMock).toHaveBeenCalledWith('Text editor profiles saved.', {
      variant: 'success',
    });
  });
});
