'use client';

import {
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { NoteSettings } from '@/shared/contracts/notes';
import { internalError } from '@/shared/errors/app-error';
import { useLiteSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import {
  DEFAULT_NOTE_SETTINGS,
  NOTE_SETTINGS_AUTOFORMAT_KEY,
  NOTE_SETTINGS_EDITOR_MODE_KEY,
  NOTE_SETTINGS_FOLDER_ID_KEY,
  NOTE_SETTINGS_NOTEBOOK_ID_KEY,
  NOTE_SETTINGS_STORAGE_KEY,
} from '@/shared/providers/NoteSettingsProvider.constants';

export { DEFAULT_NOTE_SETTINGS } from '@/shared/providers/NoteSettingsProvider.constants';

interface NoteSettingsStateContextType {
  settings: NoteSettings;
}

interface NoteSettingsActionsContextType {
  updateSettings: (updates: Partial<NoteSettings>) => void;
  resetToDefaults: () => void;
}

const {
  Context: NoteSettingsStateContext,
  useStrictContext: useNoteSettingsStateContext,
} = createStrictContext<NoteSettingsStateContextType>({
  hookName: 'useNoteSettingsState',
  providerName: 'a NoteSettingsProvider',
  errorFactory: internalError,
});

const {
  Context: NoteSettingsActionsContext,
  useStrictContext: useNoteSettingsActionsContext,
} = createStrictContext<NoteSettingsActionsContextType>({
  hookName: 'useNoteSettingsActions',
  providerName: 'a NoteSettingsProvider',
  errorFactory: internalError,
});

export function NoteSettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<NoteSettings>(DEFAULT_NOTE_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousFolderIdRef = useRef<string | null>(null);
  const previousNotebookIdRef = useRef<string | null>(null);
  const previousAutoformatRef = useRef<boolean>(false);
  const previousEditorModeRef = useRef<NoteSettings['editorMode']>('markdown');

  const settingsQuery = useLiteSettingsMap();
  const updateSetting = useUpdateSetting();

  useEffect((): void => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(NOTE_SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<NoteSettings>;
        setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, ...parsed }));
        previousFolderIdRef.current = parsed.selectedFolderId ?? null;
        previousNotebookIdRef.current = parsed.selectedNotebookId ?? null;
        previousAutoformatRef.current = parsed.autoformatOnPaste ?? false;
        previousEditorModeRef.current = parsed.editorMode ?? 'markdown';
      }
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'NoteSettingsContext',
        action: 'loadSettingsFromLocalStorage',
      });
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!settingsQuery.data || !isInitialized) return;

    const dbFolderId = settingsQuery.data.get(NOTE_SETTINGS_FOLDER_ID_KEY) || null;
    const dbNotebookId = settingsQuery.data.get(NOTE_SETTINGS_NOTEBOOK_ID_KEY) || null;
    const dbAutoformat = settingsQuery.data.get(NOTE_SETTINGS_AUTOFORMAT_KEY);
    const dbEditorMode = settingsQuery.data.get(NOTE_SETTINGS_EDITOR_MODE_KEY);

    setSettings((prev: NoteSettings) => {
      const next = { ...prev };
      let changed = false;

      if (dbFolderId !== null && dbFolderId !== prev.selectedFolderId) {
        next.selectedFolderId = dbFolderId;
        previousFolderIdRef.current = dbFolderId;
        changed = true;
      }

      if (dbNotebookId !== null && dbNotebookId !== prev.selectedNotebookId) {
        next.selectedNotebookId = dbNotebookId;
        previousNotebookIdRef.current = dbNotebookId;
        changed = true;
      }

      if (dbAutoformat !== undefined) {
        const enabled = dbAutoformat === 'true';
        if (enabled !== prev.autoformatOnPaste) {
          next.autoformatOnPaste = enabled;
          previousAutoformatRef.current = enabled;
          changed = true;
        }
      }

      if (
        dbEditorMode &&
        (dbEditorMode === 'markdown' || dbEditorMode === 'wysiwyg' || dbEditorMode === 'code')
      ) {
        if (dbEditorMode !== prev.editorMode) {
          next.editorMode = dbEditorMode;
          previousEditorModeRef.current = next.editorMode;
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [settingsQuery.data, isInitialized]);

  useEffect((): void => {
    if (!isInitialized || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(NOTE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'NoteSettingsContext',
        action: 'saveSettingsToLocalStorage',
      });
    }
  }, [settings, isInitialized]);

  useEffect((): void => {
    if (!isInitialized) return;

    if (settings.selectedFolderId !== previousFolderIdRef.current) {
      previousFolderIdRef.current = settings.selectedFolderId ?? null;
      updateSetting.mutate({
        key: NOTE_SETTINGS_FOLDER_ID_KEY,
        value: settings.selectedFolderId ?? '',
      });
    }
  }, [settings.selectedFolderId, isInitialized, updateSetting]);

  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.selectedNotebookId !== previousNotebookIdRef.current) {
      previousNotebookIdRef.current = settings.selectedNotebookId ?? null;
      updateSetting.mutate({
        key: NOTE_SETTINGS_NOTEBOOK_ID_KEY,
        value: settings.selectedNotebookId ?? '',
      });
    }
  }, [settings.selectedNotebookId, isInitialized, updateSetting]);

  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.autoformatOnPaste !== previousAutoformatRef.current) {
      previousAutoformatRef.current = settings.autoformatOnPaste;
      updateSetting.mutate({
        key: NOTE_SETTINGS_AUTOFORMAT_KEY,
        value: settings.autoformatOnPaste ? 'true' : 'false',
      });
    }
  }, [settings.autoformatOnPaste, isInitialized, updateSetting]);

  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.editorMode !== previousEditorModeRef.current) {
      previousEditorModeRef.current = settings.editorMode;
      updateSetting.mutate({
        key: NOTE_SETTINGS_EDITOR_MODE_KEY,
        value: settings.editorMode,
      });
    }
  }, [settings.editorMode, isInitialized, updateSetting]);

  const updateSettings = useCallback((updates: Partial<NoteSettings>): void => {
    setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, ...updates }));
  }, []);

  const resetToDefaults = useCallback((): void => {
    setSettings(DEFAULT_NOTE_SETTINGS);
    updateSetting.mutate({ key: NOTE_SETTINGS_FOLDER_ID_KEY, value: '' });
    updateSetting.mutate({ key: NOTE_SETTINGS_NOTEBOOK_ID_KEY, value: '' });
    updateSetting.mutate({ key: NOTE_SETTINGS_AUTOFORMAT_KEY, value: 'false' });
    updateSetting.mutate({ key: NOTE_SETTINGS_EDITOR_MODE_KEY, value: 'markdown' });
  }, [updateSetting]);

  const stateValue = useMemo<NoteSettingsStateContextType>(
    () => ({
      settings,
    }),
    [settings]
  );

  const actionsValue = useMemo<NoteSettingsActionsContextType>(
    () => ({
      updateSettings,
      resetToDefaults,
    }),
    [updateSettings, resetToDefaults]
  );

  return (
    <NoteSettingsStateContext.Provider value={stateValue}>
      <NoteSettingsActionsContext.Provider value={actionsValue}>
        {children}
      </NoteSettingsActionsContext.Provider>
    </NoteSettingsStateContext.Provider>
  );
}

export const useNoteSettingsState = useNoteSettingsStateContext;
export const useNoteSettingsActions = useNoteSettingsActionsContext;
