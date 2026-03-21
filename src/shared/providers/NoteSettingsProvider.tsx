'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  type ReactNode,
  useCallback,
  useMemo,
} from 'react';

import type { NoteSettings } from '@/shared/contracts/notes';
import { internalError } from '@/shared/errors/app-error';
import { useSettingsMap, useUpdateSetting } from '@/shared/hooks/use-settings';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

export const DEFAULT_NOTE_SETTINGS: NoteSettings = {
  sidebarCollapsed: false,
  showPinnedSection: true,
  defaultNotebookId: null,
  sortBy: 'created',
  sortOrder: 'desc',
  showTimestamps: true,
  showBreadcrumbs: true,
  showRelatedNotes: true,
  searchScope: 'both',
  selectedFolderId: null,
  selectedNotebookId: null,
  viewMode: 'grid',
  gridDensity: 4,
  autoformatOnPaste: false,
  editorMode: 'markdown',
};

const STORAGE_KEY = 'noteSettings';
const DB_SETTING_KEY = 'noteSettings:selectedFolderId';
const DB_NOTEBOOK_KEY = 'noteSettings:selectedNotebookId';
const DB_AUTOFORMAT_KEY = 'noteSettings:autoformatOnPaste';
const DB_EDITOR_MODE_KEY = 'noteSettings:editorMode';

interface NoteSettingsStateContextType {
  settings: NoteSettings;
}

interface NoteSettingsActionsContextType {
  updateSettings: (updates: Partial<NoteSettings>) => void;
  resetToDefaults: () => void;
}

const NoteSettingsStateContext = createContext<NoteSettingsStateContextType | undefined>(undefined);
const NoteSettingsActionsContext = createContext<NoteSettingsActionsContextType | undefined>(
  undefined
);

export function NoteSettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<NoteSettings>(DEFAULT_NOTE_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousFolderIdRef = useRef<string | null>(null);
  const previousNotebookIdRef = useRef<string | null>(null);
  const previousAutoformatRef = useRef<boolean>(false);
  const previousEditorModeRef = useRef<NoteSettings['editorMode']>('markdown');

  const settingsQuery = useSettingsMap({ scope: 'light' });
  const updateSetting = useUpdateSetting();

  useEffect((): void => {
    if (typeof window === 'undefined') return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
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

    const dbFolderId = settingsQuery.data.get(DB_SETTING_KEY) || null;
    const dbNotebookId = settingsQuery.data.get(DB_NOTEBOOK_KEY) || null;
    const dbAutoformat = settingsQuery.data.get(DB_AUTOFORMAT_KEY);
    const dbEditorMode = settingsQuery.data.get(DB_EDITOR_MODE_KEY);

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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
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
        key: DB_SETTING_KEY,
        value: settings.selectedFolderId ?? '',
      });
    }
  }, [settings.selectedFolderId, isInitialized, updateSetting]);

  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.selectedNotebookId !== previousNotebookIdRef.current) {
      previousNotebookIdRef.current = settings.selectedNotebookId ?? null;
      updateSetting.mutate({
        key: DB_NOTEBOOK_KEY,
        value: settings.selectedNotebookId ?? '',
      });
    }
  }, [settings.selectedNotebookId, isInitialized, updateSetting]);

  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.autoformatOnPaste !== previousAutoformatRef.current) {
      previousAutoformatRef.current = settings.autoformatOnPaste;
      updateSetting.mutate({
        key: DB_AUTOFORMAT_KEY,
        value: settings.autoformatOnPaste ? 'true' : 'false',
      });
    }
  }, [settings.autoformatOnPaste, isInitialized, updateSetting]);

  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.editorMode !== previousEditorModeRef.current) {
      previousEditorModeRef.current = settings.editorMode;
      updateSetting.mutate({
        key: DB_EDITOR_MODE_KEY,
        value: settings.editorMode,
      });
    }
  }, [settings.editorMode, isInitialized, updateSetting]);

  const updateSettings = useCallback((updates: Partial<NoteSettings>): void => {
    setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, ...updates }));
  }, []);

  const resetToDefaults = useCallback((): void => {
    setSettings(DEFAULT_NOTE_SETTINGS);
    updateSetting.mutate({ key: DB_SETTING_KEY, value: '' });
    updateSetting.mutate({ key: DB_NOTEBOOK_KEY, value: '' });
    updateSetting.mutate({ key: DB_AUTOFORMAT_KEY, value: 'false' });
    updateSetting.mutate({ key: DB_EDITOR_MODE_KEY, value: 'markdown' });
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

export function useNoteSettingsState(): NoteSettingsStateContextType {
  const context = useContext(NoteSettingsStateContext);
  if (context === undefined) {
    throw internalError('useNoteSettingsState must be used within a NoteSettingsProvider');
  }
  return context;
}

export function useNoteSettingsActions(): NoteSettingsActionsContextType {
  const context = useContext(NoteSettingsActionsContext);
  if (context === undefined) {
    throw internalError('useNoteSettingsActions must be used within a NoteSettingsProvider');
  }
  return context;
}
