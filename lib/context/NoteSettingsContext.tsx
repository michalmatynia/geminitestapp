"use client";

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

export interface NoteSettings {
  // Sorting
  sortBy: "created" | "name";
  sortOrder: "asc" | "desc";
  // Visibility
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  // Search
  searchScope: "both" | "title" | "content";
  // Navigation state
  selectedFolderId: string | null;
}

export const DEFAULT_NOTE_SETTINGS: NoteSettings = {
  sortBy: "created",
  sortOrder: "desc",
  showTimestamps: true,
  showBreadcrumbs: true,
  searchScope: "both",
  selectedFolderId: null,
};

const STORAGE_KEY = "noteSettings";
const DB_SETTING_KEY = "noteSettings:selectedFolderId";

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
  } catch (error) {
    console.error("Failed to save selectedFolderId to database:", error);
  }
}

// Helper to load selectedFolderId from database
async function loadSelectedFolderFromDb(): Promise<string | null> {
  try {
    const response = await fetch("/api/settings");
    if (!response.ok) return null;

    const settings = await response.json() as Array<{ key: string; value: string }>;
    const setting = settings.find((s) => s.key === DB_SETTING_KEY);

    if (setting && setting.value) {
      return setting.value;
    }
    return null;
  } catch (error) {
    console.error("Failed to load selectedFolderId from database:", error);
    return null;
  }
}

export function NoteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<NoteSettings>(DEFAULT_NOTE_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);
  const previousFolderIdRef = useRef<string | null>(null);

  // Load settings from localStorage first (fast), then from database (authoritative)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadSettings = async () => {
      // First, load from localStorage for immediate UI
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<NoteSettings>;
          setSettings((prev) => ({ ...prev, ...parsed }));
          previousFolderIdRef.current = parsed.selectedFolderId ?? null;
        }
      } catch (error) {
        console.error("Failed to load note settings from localStorage:", error);
      }

      // Then, load selectedFolderId from database (authoritative source)
      const dbFolderId = await loadSelectedFolderFromDb();
      if (dbFolderId !== null) {
        setSettings((prev) => ({ ...prev, selectedFolderId: dbFolderId }));
        previousFolderIdRef.current = dbFolderId;
        // Update localStorage cache
        try {
          const stored = window.localStorage.getItem(STORAGE_KEY);
          const current = stored ? JSON.parse(stored) : {};
          window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ ...current, selectedFolderId: dbFolderId })
          );
        } catch (error) {
          console.error("Failed to update localStorage cache:", error);
        }
      }

      setIsInitialized(true);
    };

    void loadSettings();
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error("Failed to save note settings:", error);
    }
  }, [settings, isInitialized]);

  // Save selectedFolderId to database when it changes
  useEffect(() => {
    if (!isInitialized) return;

    // Only save to DB if the folder actually changed
    if (settings.selectedFolderId !== previousFolderIdRef.current) {
      previousFolderIdRef.current = settings.selectedFolderId;
      void saveSelectedFolderToDb(settings.selectedFolderId);
    }
  }, [settings.selectedFolderId, isInitialized]);

  const updateSettings = (updates: Partial<NoteSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_NOTE_SETTINGS);
    // Also clear the database value
    void saveSelectedFolderToDb(null);
  };

  return (
    <NoteSettingsContext.Provider
      value={{ settings, updateSettings, resetToDefaults }}
    >
      {children}
    </NoteSettingsContext.Provider>
  );
}

export function useNoteSettings() {
  const context = useContext(NoteSettingsContext);
  if (context === undefined) {
    throw new Error("useNoteSettings must be used within a NoteSettingsProvider");
  }
  return context;
}
