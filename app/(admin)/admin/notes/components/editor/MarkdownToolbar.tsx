"use client";

import React from "react";
import { Undo, Redo } from "lucide-react";
import type { NoteFileRecord } from "@/types/notes";

interface MarkdownToolbarProps {
  noteFiles: NoteFileRecord[];
  textColor: string;
  setTextColor: (color: string) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  onApplyWrap: (prefix: string, suffix: string, placeholder: string) => void;
  onApplyLinePrefix: (prefix: string) => void;
  onInsertAtCursor: (value: string) => void;
  onApplyBulletList: () => void;
  onApplyChecklist: () => void;
  onApplySpanStyle: (color: string, font: string) => void;
  onInsertFileReference: (file: NoteFileRecord) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  editorMode: "markdown" | "wysiwyg" | "code";
  onEditorModeChange: (mode: "markdown" | "wysiwyg" | "code") => void;
  isEditorModeLocked?: boolean;
  isMigrating?: boolean;
  onMigrateToWysiwyg?: () => void;
  onMigrateToMarkdown?: () => void;
}

export function MarkdownToolbar({
  noteFiles,
  textColor,
  setTextColor,
  fontFamily,
  setFontFamily,
  showPreview,
  setShowPreview,
  onApplyWrap,
  onApplyLinePrefix,
  onInsertAtCursor,
  onApplyBulletList,
  onApplyChecklist,
  onApplySpanStyle,
  onInsertFileReference,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  editorMode,
  onEditorModeChange,
  isEditorModeLocked = false,
  isMigrating = false,
  onMigrateToWysiwyg,
  onMigrateToMarkdown,
}: MarkdownToolbarProps) {
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
      {/* Editor Mode Display/Toggle */}
      <div className="flex items-center gap-2">
        {isEditorModeLocked ? (
          <>
            {/* Display current mode (locked) */}
            <span className="px-2 py-1 text-xs bg-gray-800 text-gray-300 rounded border border-gray-600">
              {editorMode === "markdown" ? "Markdown" : editorMode === "wysiwyg" ? "WYSIWYG" : "Code"}
            </span>
            {/* Migration buttons */}
            {editorMode === "markdown" && (
              <div className="flex gap-1">
                {onMigrateToWysiwyg && (
                  <button
                    type="button"
                    onClick={onMigrateToWysiwyg}
                    disabled={isMigrating}
                    className="px-2 py-1 text-xs bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded hover:bg-purple-600/30 disabled:opacity-50"
                    title="Convert this note to WYSIWYG format"
                  >
                    {isMigrating ? "Migrating..." : "To WYSIWYG"}
                  </button>
                )}
              </div>
            )}
            {editorMode === "wysiwyg" && onMigrateToMarkdown && (
              <button
                type="button"
                onClick={onMigrateToMarkdown}
                disabled={isMigrating}
                className="px-2 py-1 text-xs bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded hover:bg-purple-600/30 disabled:opacity-50"
                title="Convert this note to Markdown format"
              >
                {isMigrating ? "Migrating..." : "To Markdown"}
              </button>
            )}
            {editorMode === "code" && onMigrateToMarkdown && (
              <button
                type="button"
                onClick={onMigrateToMarkdown}
                disabled={isMigrating}
                className="px-2 py-1 text-xs bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded hover:bg-purple-600/30 disabled:opacity-50"
                title="Convert this note to Markdown format"
              >
                {isMigrating ? "Migrating..." : "To Markdown"}
              </button>
            )}
          </>
        ) : (
          /* Mode toggle for new notes */
          <div className="flex rounded-md border border-gray-600 overflow-hidden">
            <button
              type="button"
              onClick={() => onEditorModeChange("markdown")}
              className={`px-2 py-1 text-xs transition-colors ${
                editorMode === "markdown"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
              title="Markdown editor"
            >
              Markdown
            </button>
            <button
              type="button"
              onClick={() => onEditorModeChange("wysiwyg")}
              className={`px-2 py-1 text-xs transition-colors ${
                editorMode === "wysiwyg"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
              title="WYSIWYG editor"
            >
              WYSIWYG
            </button>
            <button
              type="button"
              onClick={() => onEditorModeChange("code")}
              className={`px-2 py-1 text-xs transition-colors ${
                editorMode === "code"
                  ? "bg-green-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
              title="Code snippets editor"
            >
              Code
            </button>
          </div>
        )}
      </div>
      <div className="h-6 w-px bg-gray-700 mx-1" />
      {(editorMode === "markdown" || editorMode === "code") && (
        <>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Toggle preview"
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
          <div className="h-6 w-px bg-gray-700 mx-1" />
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo"
        >
          <Undo className="size-3.5" />
        </button>
      )}
      {onRedo && (
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo"
        >
          <Redo className="size-3.5" />
        </button>
      )}
      <div className="h-6 w-px bg-gray-700 mx-1" />
      <button
        type="button"
        onClick={() => onApplyWrap("**", "**", "bold text")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Bold"
      >
        Bold
      </button>
      <button
        type="button"
        onClick={() => onApplyWrap("*", "*", "italic text")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Italic"
      >
        Italic
      </button>
      <button
        type="button"
        onClick={() => onApplyWrap("`", "`", "code")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Inline code"
      >
        Code
      </button>
      <button
        type="button"
        onClick={onApplyBulletList}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Bullet list"
      >
        Bullet
      </button>
      <button
        type="button"
        onClick={onApplyChecklist}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Checklist"
      >
        Checklist
      </button>
      <button
        type="button"
        onClick={() => onApplyLinePrefix("# ")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Heading"
      >
        H1
      </button>
      <button
        type="button"
        onClick={() => onApplyLinePrefix("## ")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Heading 2"
      >
        H2
      </button>
      <button
        type="button"
        onClick={() => onApplyLinePrefix("### ")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Heading 3"
      >
        H3
      </button>
      <button
        type="button"
        onClick={() => onApplyLinePrefix("> ")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Blockquote"
      >
        Quote
      </button>
      <button
        type="button"
        onClick={() => onInsertAtCursor("\n---\n")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Horizontal rule"
      >
        HR
      </button>
      <button
        type="button"
        onClick={() => onInsertAtCursor("\n```text\ncode\n```\n")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Code block"
      >
        Code Block
      </button>
      <button
        type="button"
        onClick={() => onApplyWrap("[", "](https://example.com)", "link text")}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Link"
      >
        Link
      </button>
      <button
        type="button"
        onClick={() =>
          onInsertAtCursor(
            "\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n")
        }
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Table"
      >
        Table
      </button>
      {noteFiles.length > 0 && (
        <div className="relative">
          <select
            value=""
            onChange={(e) => {
              const slotIndex = parseInt(e.target.value, 10);
              const file = noteFiles.find((f) => f.slotIndex === slotIndex);
              if (file) {
                onInsertFileReference(file);
              }
              e.target.value = "";
            }}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Insert file reference"
          >
            <option value="">Insert File</option>
            {noteFiles.map((file) => (
              <option key={file.slotIndex} value={file.slotIndex}>
                Slot {file.slotIndex + 1}: {file.filename.replace(/^slot-\d+-\d+-/, "").slice(0, 15)}
                {file.filename.replace(/^slot-\d+-\d+-/, "").length > 15 ? "..." : ""}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="ml-2 flex items-center gap-2 border-l border-gray-700 pl-2">
        <label className="text-xs text-gray-400">Font</label>
        <select
          value={fontFamily}
          onChange={(event) => setFontFamily(event.target.value)}
          className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200"
        >
          <option value="inherit">Default</option>
          <option value="Georgia, serif">Serif</option>
          <option value="Trebuchet MS, sans-serif">Sans</option>
          <option value="Courier New, monospace">Mono</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-400">Color</label>
        <input
          type="color"
          value={textColor}
          onChange={(event) => setTextColor(event.target.value)}
          className="h-7 w-10 rounded border border-gray-700 bg-gray-800"
        />
      </div>
      <button
        type="button"
        onClick={() => onApplySpanStyle(textColor, fontFamily)}
        className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
        title="Apply font and color"
      >
        Apply
      </button>
        </>
      )}
    </div>
  );
}
