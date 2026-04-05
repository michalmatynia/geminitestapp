// @vitest-environment jsdom

import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NoteSettingsProvider,
  useNoteSettingsActions,
  useNoteSettingsState,
} from '@/shared/providers/NoteSettingsProvider';

const mocks = vi.hoisted(() => ({
  useLiteSettingsMap: vi.fn(),
  useUpdateSetting: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useLiteSettingsMap: () => mocks.useLiteSettingsMap(),
  useUpdateSetting: () => mocks.useUpdateSetting(),
}));

function Probe(): React.JSX.Element {
  const { settings } = useNoteSettingsState();

  return (
    <div>
      <div data-testid='folder'>{settings.selectedFolderId ?? ''}</div>
      <div data-testid='notebook'>{settings.selectedNotebookId ?? ''}</div>
      <div data-testid='autoformat'>{String(settings.autoformatOnPaste)}</div>
      <div data-testid='editor'>{settings.editorMode}</div>
    </div>
  );
}

describe('NoteSettingsProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.useLiteSettingsMap.mockReset();
    mocks.useUpdateSetting.mockReset();
    mocks.useUpdateSetting.mockReturnValue({
      mutate: vi.fn(),
    });
    mocks.useLiteSettingsMap.mockReturnValue({
      data: new Map<string, string>([
        ['noteSettings:selectedFolderId', 'folder-1'],
        ['noteSettings:selectedNotebookId', 'notebook-1'],
        ['noteSettings:autoformatOnPaste', 'true'],
        ['noteSettings:editorMode', 'wysiwyg'],
      ]),
    });
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useNoteSettingsActions())).toThrow(
      'useNoteSettingsActions must be used within a NoteSettingsProvider'
    );
  });

  it('hydrates note settings from the lite settings map', async () => {
    render(
      <NoteSettingsProvider>
        <Probe />
      </NoteSettingsProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('folder')).toHaveTextContent('folder-1');
      expect(screen.getByTestId('notebook')).toHaveTextContent('notebook-1');
      expect(screen.getByTestId('autoformat')).toHaveTextContent('true');
      expect(screen.getByTestId('editor')).toHaveTextContent('wysiwyg');
    });

    expect(mocks.useLiteSettingsMap).toHaveBeenCalled();
  });

  it('provides actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NoteSettingsProvider>{children}</NoteSettingsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useNoteSettingsActions(),
        state: useNoteSettingsState(),
      }),
      { wrapper }
    );

    expect(result.current.state.settings.editorMode).toBeDefined();
    expect(result.current.actions.updateSettings).toBeTypeOf('function');
    expect(result.current.actions.resetToDefaults).toBeTypeOf('function');
  });
});
