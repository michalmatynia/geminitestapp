"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";

import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useToast } from "@/shared/ui/toast";
import { useNoteSettings, DEFAULT_NOTE_SETTINGS } from "@/features/notesapp/hooks/NoteSettingsContext";
import type { NoteSettings } from "@/features/notesapp/types/notes-settings";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { SectionHeader } from "@/shared/ui/section-header";
import { SectionPanel } from "@/shared/ui/section-panel";

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

const editorModeOptions = [
  { value: "markdown", label: "Markdown", description: "Plain text with markdown syntax and live preview" },
  { value: "wysiwyg", label: "WYSIWYG", description: "Rich text editor with visual formatting" },
  { value: "code", label: "Code Snippets", description: "Optimized for code with syntax highlighting and copy button" },
] as const;

export function AdminNotesSettingsPage() {
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
    settings.autoformatOnPaste === DEFAULT_NOTE_SETTINGS.autoformatOnPaste &&
    settings.editorMode === DEFAULT_NOTE_SETTINGS.editorMode;

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title="Note Settings"
        description="Configure default view preferences for the Notes app."
        eyebrow={(
          <Link href="/admin/notes" className="text-blue-300 hover:text-blue-200">
            ← Back to notes
          </Link>
        )}
        className="mb-6"
      />

      <div className="max-w-xl space-y-6">
        {/* Sorting Settings */}
        <SectionPanel className="p-6">
          <SectionHeader title="Sorting" size="sm" className="mb-4" />
          <div className="space-y-4">
            <div>
              <Label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-200">
                <span>Sort By</span>
                {!isDefault("sortBy") && (
                  <span className="text-xs text-blue-400">Modified</span>
                )}
              </Label>
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
              <Label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-200">
                <span>Sort Order</span>
                {!isDefault("sortOrder") && (
                  <span className="text-xs text-blue-400">Modified</span>
                )}
              </Label>
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
        </SectionPanel>

        {/* Visibility Settings */}
        <SectionPanel className="p-6">
          <SectionHeader title="Card Visibility" size="sm" className="mb-4" />
          <div className="space-y-4">
            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={settings.showTimestamps} onCheckedChange={(checked) =>
                    updateSettings({ showTimestamps: Boolean(checked) })
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
            </Label>

            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={settings.showBreadcrumbs} onCheckedChange={(checked) =>
                    updateSettings({ showBreadcrumbs: Boolean(checked) })
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
            </Label>
          </div>
        </SectionPanel>

        {/* Search Settings */}
        <SectionPanel className="p-6">
          <SectionHeader title="Search" size="sm" className="mb-4" />
          <div>
            <Label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-200">
              <span>Default Search Scope</span>
              {!isDefault("searchScope") && (
                <span className="text-xs text-blue-400">Modified</span>
              )}
            </Label>
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
        </SectionPanel>

        {/* Editor Settings */}
        <SectionPanel className="p-6">
          <SectionHeader title="Editor" size="sm" className="mb-4" />
          <div className="space-y-4">
            <div>
              <Label className="mb-2 flex items-center justify-between text-sm font-medium text-gray-200">
                <span>Default Editor Mode</span>
                {!isDefault("editorMode") && (
                  <span className="text-xs text-blue-400">Modified</span>
                )}
              </Label>
              <div className="space-y-2">
                <RadioGroup
                  value={settings.editorMode}
                  onValueChange={(value) =>
                    updateSettings({ editorMode: value as NoteSettings["editorMode"] })
                  }
                  className="space-y-2"
                >
                  {editorModeOptions.map((option) => {
                    const id = `editor-mode-${option.value}`;
                    const isSelected = settings.editorMode === option.value;
                    return (
                      <div
                        key={option.value}
                        className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                          isSelected
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <RadioGroupItem
                          id={id}
                          value={option.value}
                          className="mt-1 border-gray-600 text-blue-600"
                        />
                        <Label htmlFor={id} className="flex-1 cursor-pointer">
                          <span className="text-sm font-medium text-gray-200">
                            {option.label}
                          </span>
                          <p className="text-xs text-gray-500">{option.description}</p>
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>
              </div>
            </div>

            <Label className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={settings.autoformatOnPaste} onCheckedChange={(checked) =>
                    updateSettings({ autoformatOnPaste: Boolean(checked) })
                  }
                  className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-200">
                    Autoformat on Paste (Markdown mode only)
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
            </Label>
          </div>
        </SectionPanel>

        {/* Navigation State */}
        <SectionPanel className="p-6">
          <SectionHeader title="Navigation" size="sm" className="mb-4" />
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
        </SectionPanel>

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
        <SectionPanel className="p-4">
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
            <span>Editor Mode:</span>
            <span className="text-gray-300">
              {editorModeOptions.find((o) => o.value === settings.editorMode)?.label}
            </span>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
