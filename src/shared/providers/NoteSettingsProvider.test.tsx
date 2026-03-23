// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NoteSettingsProvider,
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
});
