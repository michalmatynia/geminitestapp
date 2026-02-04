"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import type { NoteSettings } from "@/features/notesapp/types/notes-settings";
import { logClientError } from "@/features/observability";
import { fetchSettingsCached, invalidateSettingsCache } from "@/shared/api/settings-client";

export const DEFAULT_NOTE_SETTINGS: NoteSettings = {
  sortBy: "created",
  sortOrder: "desc",
  showTimestamps: true,
  showBreadcrumbs: true,
  showRelatedNotes: true,
  searchScope: "both",
  selectedFolderId: null,
  selectedNotebookId: null,
  viewMode: "grid",
  gridDensity: 4,
  autoformatOnPaste: false,
  editorMode: "markdown",
};

const STORAGE_KEY = "noteSettings";
const DB_SETTING_KEY = "noteSettings:selectedFolderId";
const DB_NOTEBOOK_KEY = "noteSettings:selectedNotebookId";
const DB_AUTOFORMAT_KEY = "noteSettings:autoformatOnPaste";
const DB_EDITOR_MODE_KEY = "noteSettings:editorMode";

const fetchNoteSettingsList = async (): Promise<Array<{ key: string; value: string }>> => {
  return await fetchSettingsCached();
};

interface NoteSettingsContextType {
  settings: NoteSettings;
  updateSettings: (updates: Partial<NoteSettings>) => void;
  resetToDefaults: () => void;
}

const NoteSettingsContext = createContext<NoteSettingsContextType | undefined>(
  undefined
);

// Helper to save selectedFolderId to database
async function saveSelectedFolderToDb(folderId: string | null): Promise<void> {
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: DB_SETTING_KEY,
        value: folderId ?? "",
      }),
    });
    invalidateSettingsCache();
  } catch (error: unknown) {
    logClientError(error, { context: { source: "NoteSettingsContext", action: "saveSelectedFolderToDb", folderId } });
  }
}

async function saveSelectedNotebookToDb(notebookId: string | null): Promise<void> {
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: DB_NOTEBOOK_KEY,
        value: notebookId ?? "",
      }),
    });
    invalidateSettingsCache();
  } catch (error: unknown) {
    logClientError(error, { context: { source: "NoteSettingsContext", action: "saveSelectedNotebookToDb", notebookId } });
  }
}

// Helper to load selectedFolderId from database
async function loadSelectedFolderFromDb(): Promise<string | null> {
  try {
    const settingsList = await fetchNoteSettingsList();
    const setting = settingsList.find((s: { key: string }) => s.key === DB_SETTING_KEY);

    if (setting && setting.value) {
      return setting.value;
    }
    return null;
  } catch (error: unknown) {
    logClientError(error, { context: { source: "NoteSettingsContext", action: "loadSelectedFolderFromDb" } });
    return null;
  }
}

async function loadSelectedNotebookFromDb(): Promise<string | null> {
  try {
    const settingsList = await fetchNoteSettingsList();
    const setting = settingsList.find((s: { key: string }) => s.key === DB_NOTEBOOK_KEY);

    if (setting && setting.value) {
      return setting.value;
    }
    return null;
  } catch (error: unknown) {
    logClientError(error, { context: { source: "NoteSettingsContext", action: "loadSelectedNotebookFromDb" } });
    return null;
  }
}

async function saveAutoformatToDb(enabled: boolean): Promise<void> {
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: DB_AUTOFORMAT_KEY,
        value: enabled ? "true" : "false",
      }),
    });
    invalidateSettingsCache();
  } catch (error: unknown) {
    logClientError(error, { context: { source: "NoteSettingsContext", action: "saveAutoformatToDb", enabled } });
  }
}

async function loadAutoformatFromDb(): Promise<boolean | null> {
  try {
    const settingsList = await fetchNoteSettingsList();
    const setting = settingsList.find((s: { key: string }) => s.key === DB_AUTOFORMAT_KEY);

    if (setting && setting.value) {
      return setting.value === "true";
    }
    return null;
  } catch (error: unknown) {
    logClientError(error, { context: { source: "NoteSettingsContext", action: "loadAutoformatFromDb" } });
    return null;
  }
}

async function saveEditorModeToDb(mode: "markdown" | "wysiwyg" | "code"): Promise<void> {
  try {
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: DB_EDITOR_MODE_KEY,
        value: mode,
      }),
    });
    invalidateSettingsCache();
  } catch (error: unknown) {
    logClientError(error, { context: { source: "NoteSettingsContext", action: "saveEditorModeToDb", mode } });
  }
}

async function loadEditorModeFromDb(): Promise<"markdown" | "wysiwyg" | "code" | null> {
  try {
    const settingsList = await fetchNoteSettingsList();
    const setting = settingsList.find((s: { key: string }) => s.key === DB_EDITOR_MODE_KEY);

    if (setting && (setting.value === "markdown" || setting.value === "wysiwyg" || setting.value === "code")) {
      return setting.value;
    }
    return null;
  } catch (error: unknown) {
    logClientError(error, { context: { source: "NoteSettingsContext", action: "loadEditorModeFromDb" } });
    return null;
  }
}

export function NoteSettingsProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [settings, setSettings] = useState<NoteSettings>(DEFAULT_NOTE_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousFolderIdRef = useRef<string | null>(null);
  const previousNotebookIdRef = useRef<string | null>(null);
  const previousAutoformatRef = useRef<boolean>(false);
  const previousEditorModeRef = useRef<"markdown" | "wysiwyg" | "code">("markdown");

  // Load settings from localStorage first (fast), then from database (authoritative)
  useEffect((): void => {
    if (typeof window === "undefined") return;

    const loadSettings = async (): Promise<void> => {
      // First, load from localStorage for immediate UI
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<NoteSettings>;
          setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, ...parsed }));
          previousFolderIdRef.current = parsed.selectedFolderId ?? null;
          previousNotebookIdRef.current = parsed.selectedNotebookId ?? null;
        }
      } catch (error: unknown) {
        logClientError(error, { context: { source: "NoteSettingsContext", action: "loadSettingsFromLocalStorage" } });
      }

      // Then, load selectedFolderId from database (authoritative source)
      const dbFolderId = await loadSelectedFolderFromDb();
      if (dbFolderId !== null) {
        setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, selectedFolderId: dbFolderId }));
        previousFolderIdRef.current = dbFolderId;
        // Update localStorage cache
        try {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          const current = (stored ? JSON.parse(stored) : {}) as Record<string, unknown>;
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...current, selectedFolderId: dbFolderId })
          );
        } catch (error: unknown) {
          logClientError(error, { context: { source: "NoteSettingsContext", action: "updateLocalStorageCache", key: "selectedFolderId" } });
        }
      }

      setIsInitialized(true);

      // Load selectedNotebookId from database
      const dbNotebookId = await loadSelectedNotebookFromDb();
      if (dbNotebookId !== null) {
        setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, selectedNotebookId: dbNotebookId }));
        previousNotebookIdRef.current = dbNotebookId;
        try {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          const current = (stored ? JSON.parse(stored) : {}) as Record<string, unknown>;
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...current, selectedNotebookId: dbNotebookId })
          );
        } catch (error: unknown) {
          logClientError(error, { context: { source: "NoteSettingsContext", action: "updateLocalStorageCache", key: "selectedNotebookId" } });
        }
      }

      // Load autoformatOnPaste from database
      const dbAutoformat = await loadAutoformatFromDb();
      if (dbAutoformat !== null) {
        setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, autoformatOnPaste: dbAutoformat }));
        previousAutoformatRef.current = dbAutoformat;
        try {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          const current = (stored ? JSON.parse(stored) : {}) as Record<string, unknown>;
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...current, autoformatOnPaste: dbAutoformat })
          );
        } catch (error: unknown) {
          logClientError(error, { context: { source: "NoteSettingsContext", action: "updateLocalStorageCache", key: "autoformatOnPaste" } });
        }
      }

      // Load editorMode from database
      const dbEditorMode = await loadEditorModeFromDb();
      if (dbEditorMode !== null) {
        setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, editorMode: dbEditorMode }));
        previousEditorModeRef.current = dbEditorMode;
        try {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          const current = (stored ? JSON.parse(stored) : {}) as Record<string, unknown>;
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...current, editorMode: dbEditorMode })
          );
        } catch (error: unknown) {
          logClientError(error, { context: { source: "NoteSettingsContext", action: "updateLocalStorageCache", key: "editorMode" } });
        }
      }
    };

    void loadSettings();
  }, []);

  // Save settings to localStorage whenever they change
  useEffect((): void => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error: unknown) {
      logClientError(error, { context: { source: "NoteSettingsContext", action: "saveSettingsToLocalStorage" } });
    }
  }, [settings, isInitialized]);

  // Save selectedFolderId to database when it changes
  useEffect((): void => {
    if (!isInitialized) return;

    // Only save to DB if the folder actually changed
    if (settings.selectedFolderId !== previousFolderIdRef.current) {
      previousFolderIdRef.current = settings.selectedFolderId;
      void saveSelectedFolderToDb(settings.selectedFolderId);
    }
  }, [settings.selectedFolderId, isInitialized]);

  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.selectedNotebookId !== previousNotebookIdRef.current) {
      previousNotebookIdRef.current = settings.selectedNotebookId;
      void saveSelectedNotebookToDb(settings.selectedNotebookId);
    }
  }, [settings.selectedNotebookId, isInitialized]);

  // Save autoformatOnPaste to database when it changes
  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.autoformatOnPaste !== previousAutoformatRef.current) {
      previousAutoformatRef.current = settings.autoformatOnPaste;
      void saveAutoformatToDb(settings.autoformatOnPaste);
    }
  }, [settings.autoformatOnPaste, isInitialized]);

  // Save editorMode to database when it changes
  useEffect((): void => {
    if (!isInitialized) return;
    if (settings.editorMode !== previousEditorModeRef.current) {
      previousEditorModeRef.current = settings.editorMode;
      void saveEditorModeToDb(settings.editorMode);
    }
  }, [settings.editorMode, isInitialized]);

  const updateSettings = (updates: Partial<NoteSettings>): void => {
    setSettings((prev: NoteSettings): NoteSettings => ({ ...prev, ...updates }));
  };

  const resetToDefaults = (): void => {
    setSettings(DEFAULT_NOTE_SETTINGS);
    // Also clear the database values
    void saveSelectedFolderToDb(null);
    void saveSelectedNotebookToDb(null);
    void saveAutoformatToDb(false);
    void saveEditorModeToDb("markdown");
  };

  return (
    <NoteSettingsContext.Provider
      value={{ settings, updateSettings, resetToDefaults }}
    >
      {children}
    </NoteSettingsContext.Provider>
  );
}

export function useNoteSettings(): NoteSettingsContextType {
  const context = useContext(NoteSettingsContext);
  if (context === undefined) {
    throw new Error("useNoteSettings must be used within a NoteSettingsProvider");
  }
  return context;
}
