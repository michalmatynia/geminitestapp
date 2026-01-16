"use client";

import Link from "next/link";
import { ChevronLeftIcon, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useNoteSettings, DEFAULT_NOTE_SETTINGS } from "@/lib/context/NoteSettingsContext";
import type { NoteSettings } from "@/types/notes-settings";

const sortByOptions = [
  { value: "created", label: "Created Date" },
  { value: "updated", label: "Modified Date" },
  { value: "name", label: "Name" },
] as const;

const sortOrderOptions = [
  { value: "desc", label: "Descending (Newest/Z-A)" },
  { value: "asc", label: "Ascending (Oldest/A-Z)" },
] as const;

const searchScopeOptions = [
  { value: "both", label: "Title & Content" },
  { value: "title", label: "Title Only" },
  { value: "content", label: "Content Only" },
] as const;

export default function NoteSettingsPage() {
  const { settings, updateSettings, resetToDefaults } = useNoteSettings();
  const { toast } = useToast();

  const handleResetToDefaults = () => {
    resetToDefaults();
    toast("Settings reset to defaults", { variant: "success" });
  };

  const isDefault = (key: keyof NoteSettings) => {
    return settings[key] === DEFAULT_NOTE_SETTINGS[key];
  };

  const allDefaults =
    settings.sortBy === DEFAULT_NOTE_SETTINGS.sortBy &&
    settings.sortOrder === DEFAULT_NOTE_SETTINGS.sortOrder &&
    settings.showTimestamps === DEFAULT_NOTE_SETTINGS.showTimestamps &&
    settings.showBreadcrumbs === DEFAULT_NOTE_SETTINGS.showBreadcrumbs &&
    settings.showRelatedNotes === DEFAULT_NOTE_SETTINGS.showRelatedNotes &&
    settings.searchScope === DEFAULT_NOTE_SETTINGS.searchScope &&
    settings.selectedFolderId === DEFAULT_NOTE_SETTINGS.selectedFolderId &&
    settings.selectedNotebookId === DEFAULT_NOTE_SETTINGS.selectedNotebookId &&
    settings.viewMode === DEFAULT_NOTE_SETTINGS.viewMode &&
    settings.gridDensity === DEFAULT_NOTE_SETTINGS.gridDensity &&
    settings.autoformatOnPaste === DEFAULT_NOTE_SETTINGS.autoformatOnPaste;

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/notes" aria-label="Back to notes">
            <ChevronLeftIcon className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Note Settings</h1>
          <p className="text-sm text-gray-400">
            Configure default view preferences for the Notes app.
          </p>
        </div>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Sorting Settings */}
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Sorting</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-200">
                <span>Sort By</span>
                {!isDefault("sortBy") && (
                  <span className="text-xs text-blue-400">Modified</span>
                )}
              </label>
              <Select
                value={settings.sortBy}
                onValueChange={(value) =>
                  updateSettings({ sortBy: value as NoteSettings["sortBy"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort field" />
                </SelectTrigger>
                <SelectContent>
                  {sortByOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-200">
                <span>Sort Order</span>
                {!isDefault("sortOrder") && (
                  <span className="text-xs text-blue-400">Modified</span>
                )}
              </label>
              <Select
                value={settings.sortOrder}
                onValueChange={(value) =>
                  updateSettings({ sortOrder: value as NoteSettings["sortOrder"] })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sort order" />
                </SelectTrigger>
                <SelectContent>
                  {sortOrderOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Visibility Settings */}
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">
            Card Visibility
          </h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showTimestamps}
                  onChange={(e) =>
                    updateSettings({ showTimestamps: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">
                    Show Timestamps
                  </span>
                  <p className="text-xs text-gray-500">
                    Display created and modified dates on note cards
                  </p>
                </div>
              </div>
              {!isDefault("showTimestamps") && (
                <span className="text-xs text-blue-400">Modified</span>
              )}
            </label>

            <label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.showBreadcrumbs}
                  onChange={(e) =>
                    updateSettings({ showBreadcrumbs: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">
                    Show Breadcrumbs
                  </span>
                  <p className="text-xs text-gray-500">
                    Display folder path at the bottom of note cards
                  </p>
                </div>
              </div>
              {!isDefault("showBreadcrumbs") && (
                <span className="text-xs text-blue-400">Modified</span>
              )}
            </label>
          </div>
        </div>

        {/* Search Settings */}
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Search</h2>
          <div>
            <label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-200">
              <span>Default Search Scope</span>
              {!isDefault("searchScope") && (
                <span className="text-xs text-blue-400">Modified</span>
              )}
            </label>
            <Select
              value={settings.searchScope}
              onValueChange={(value) =>
                updateSettings({ searchScope: value as NoteSettings["searchScope"] })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select search scope" />
              </SelectTrigger>
              <SelectContent>
                {searchScopeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Editor Settings */}
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Editor</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.autoformatOnPaste}
                  onChange={(e) =>
                    updateSettings({ autoformatOnPaste: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">
                    Autoformat on Paste
                  </span>
                  <p className="text-xs text-gray-500">
                    Automatically format pasted markdown content (trim spaces,
                    normalize blank lines, convert URLs to links, normalize list markers)
                  </p>
                </div>
              </div>
              {!isDefault("autoformatOnPaste") && (
                <span className="text-xs text-blue-400">Modified</span>
              )}
            </label>
          </div>
        </div>

        {/* Navigation State */}
        <div className="rounded-lg border border-gray-800 bg-gray-950 p-6 shadow-lg">
          <h2 className="mb-4 text-lg font-semibold text-white">Navigation</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-gray-200">
                  Remember Selected Folder
                </span>
                <p className="text-xs text-gray-500">
                  Your selected folder is saved to the database. When you return to the Notes app
                  (even after clearing cache or on a different device), it will open to your last selected folder.
                </p>
              </div>
              {!isDefault("selectedFolderId") && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-green-400">Saved to database</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => updateSettings({ selectedFolderId: null })}
                    className="h-6 px-2 text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleResetToDefaults}
            disabled={allDefaults}
            className="gap-2"
          >
            <RotateCcw className="size-4" />
            Reset to Defaults
          </Button>
        </div>

        {/* Current Settings Summary */}
        <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-400">
            Current Settings Summary
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <span>Sort:</span>
            <span className="text-gray-300">
              {sortByOptions.find((o) => o.value === settings.sortBy)?.label} (
              {settings.sortOrder === "desc" ? "Descending" : "Ascending"})
            </span>
            <span>Timestamps:</span>
            <span className="text-gray-300">
              {settings.showTimestamps ? "Visible" : "Hidden"}
            </span>
            <span>Breadcrumbs:</span>
            <span className="text-gray-300">
              {settings.showBreadcrumbs ? "Visible" : "Hidden"}
            </span>
            <span>Search Scope:</span>
            <span className="text-gray-300">
              {searchScopeOptions.find((o) => o.value === settings.searchScope)?.label}
            </span>
            <span>Selected Folder:</span>
            <span className="text-gray-300">
              {settings.selectedFolderId ? "Saved" : "All Notes (default)"}
            </span>
            <span>Autoformat on Paste:</span>
            <span className="text-gray-300">
              {settings.autoformatOnPaste ? "Enabled" : "Disabled"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
