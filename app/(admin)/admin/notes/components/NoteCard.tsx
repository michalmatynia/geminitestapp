"use client";

import React from "react";
import { ChevronRight, Pin, Star } from "lucide-react";
import type { CategoryWithChildren, NoteWithRelations, ThemeRecord } from "@/types/notes";
import { BreadcrumbScroller } from "./BreadcrumbScroller";
import { darkenColor, renderMarkdownToHtml } from "../utils";

// Hardcoded dark mode fallback theme - consistent with page styling
const FALLBACK_THEME: Omit<ThemeRecord, "id" | "createdAt" | "updatedAt" | "name" | "notebookId"> = {
  textColor: "#e5e7eb",                // gray-200
  backgroundColor: "#111827",          // gray-900
  markdownHeadingColor: "#ffffff",     // white
  markdownLinkColor: "#60a5fa",        // blue-400
  markdownCodeBackground: "#1f2937",   // gray-800
  markdownCodeText: "#e5e7eb",         // gray-200
  relatedNoteBorderWidth: 1,
  relatedNoteBorderColor: "#374151",   // gray-700
  relatedNoteBackgroundColor: "#1f2937", // gray-800
  relatedNoteTextColor: "#e5e7eb",     // gray-200
};

function NoteCardBase({
  note,
  folderTree,
  showTimestamps,
  showBreadcrumbs,
  showRelatedNotes,
  enableDrag = true,
  onSelectNote,
  onSelectFolder,
  onToggleFavorite,
  onDragStart,
  onDragEnd,
  buildBreadcrumbPath,
  theme,
}: {
  note: NoteWithRelations;
  folderTree: CategoryWithChildren[];
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  enableDrag?: boolean;
  onSelectNote: (note: NoteWithRelations) => void;
  onSelectFolder: (folderId: string | null) => void;
  onToggleFavorite: (note: NoteWithRelations) => void;
  onDragStart: (noteId: string) => void;
  onDragEnd: () => void;
  buildBreadcrumbPath: (
    categoryId: string | null,
    noteTitle: string | null,
    categories: CategoryWithChildren[]
  ) => Array<{ id: string | null; name: string; isNote?: boolean }>;
  theme?: ThemeRecord | null;
}) {
  // Use provided theme or fall back to dark mode theme
  const effectiveTheme = theme ?? FALLBACK_THEME;

  const contentHtml = React.useMemo(
    () => renderMarkdownToHtml(note.content),
    [note.content]
  );
  const normalizedColor = note.color?.toLowerCase().trim();
  // Only use note's custom color if it's not white (default)
  const hasCustomColor = normalizedColor && normalizedColor !== "#ffffff";
  const backgroundColor = hasCustomColor
    ? normalizedColor
    : effectiveTheme.backgroundColor;
  const getReadableTextColor = (hexColor: string) => {
    const normalized = hexColor.replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return "#111827";
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? "#111827" : "#f8fafc";
  };
  const textColor = hasCustomColor
    ? getReadableTextColor(backgroundColor)
    : effectiveTheme.textColor;
  const relatedNoteStyle = {
    borderWidth: `${effectiveTheme.relatedNoteBorderWidth ?? 1}px`,
    borderColor: effectiveTheme.relatedNoteBorderColor,
    backgroundColor: effectiveTheme.relatedNoteBackgroundColor,
    color: effectiveTheme.relatedNoteTextColor,
  } as const;

  return (
    <div
      key={note.id}
      draggable={enableDrag}
      onDragStart={
        enableDrag
          ? (e) => {
              e.dataTransfer.setData("noteId", note.id);
              e.dataTransfer.setData("text/plain", note.id);
              e.dataTransfer.effectAllowed = "linkMove";
              const target = e.currentTarget as HTMLElement;
              target.style.opacity = "0.5";
              onDragStart(note.id);
            }
          : undefined
      }
      onDragEnd={
        enableDrag
          ? (e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.opacity = "1";
              onDragEnd();
            }
          : undefined
      }
      onClick={() => onSelectNote(note)}
      style={{
        backgroundColor,
        color: textColor,
        ["--tw-prose-body" as never]: textColor,
        ["--tw-prose-headings" as never]:
          theme?.markdownHeadingColor ?? textColor,
        ["--note-link-color" as never]: theme?.markdownLinkColor ?? "#38bdf8",
        ["--note-code-bg" as never]: theme?.markdownCodeBackground ?? "#0f172a",
        ["--note-code-text" as never]: theme?.markdownCodeText ?? "#e2e8f0",
        ["--note-inline-code-bg" as never]:
          theme?.markdownCodeBackground ?? "rgba(15, 23, 42, 0.12)",
      }}
      className={`rounded-lg border border-gray-700 p-4 shadow-sm transition ${
        enableDrag
          ? "cursor-grab active:cursor-grabbing hover:shadow-md"
          : "cursor-pointer hover:shadow-md hover:brightness-90"
      }`}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold">{note.title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(note);
            }}
            className="text-gray-500 hover:text-yellow-500"
            aria-label={note.isFavorite ? "Unfavorite note" : "Favorite note"}
            title={note.isFavorite ? "Remove favorite" : "Add favorite"}
          >
            <Star
              size={16}
              className={note.isFavorite ? "fill-yellow-400 text-yellow-500" : ""}
            />
          </button>
          {note.isPinned && <Pin size={16} className="text-blue-600" />}
        </div>
      </div>
      <div
        className="mb-3 max-h-36 overflow-hidden text-sm prose prose-sm"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
      <div className="flex flex-wrap gap-2">
        {note.tags.map((nt) => (
          <span
            key={nt.tagId}
            style={{ backgroundColor: nt.tag.color || "#3b82f6" }}
            className="rounded-full px-2 py-1 text-xs text-white"
          >
            {nt.tag.name}
          </span>
        ))}
      </div>
      {showTimestamps && (
        <div className="mt-3 flex flex-col gap-0.5 text-[10px] text-gray-500">
          <span>Created: {new Date(note.createdAt).toLocaleString()}</span>
          <span>Modified: {new Date(note.updatedAt).toLocaleString()}</span>
        </div>
      )}
      {showBreadcrumbs && (
        <div className={showTimestamps ? "mt-3" : "mt-2"}>
          <BreadcrumbScroller backgroundColor={darkenColor(backgroundColor, 20)}>
            {buildBreadcrumbPath(
              note.categories[0]?.categoryId || null,
              null,
              folderTree
            ).map((crumb, index, array) => (
              <React.Fragment key={index}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectFolder(crumb.id);
                  }}
                  className="cursor-pointer hover:underline whitespace-nowrap"
                >
                  {crumb.name}
                </button>
                {index < array.length - 1 && (
                  <ChevronRight size={10} className="flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </BreadcrumbScroller>
        </div>
      )}
      {showRelatedNotes &&
        ((note.relations?.length ?? 0) > 0 ||
          note.relationsFrom?.length ||
          note.relationsTo?.length) && (
          <div className="mt-2">
            <div className="flex flex-wrap gap-2">
              {(note.relations ?? [
                ...(note.relationsFrom ?? []).map((relation) => ({
                  id: relation.targetNote.id,
                  title: relation.targetNote.title,
                  color: relation.targetNote.color ?? null,
                })),
                ...(note.relationsTo ?? []).map((relation) => ({
                  id: relation.sourceNote.id,
                  title: relation.sourceNote.title,
                  color: relation.sourceNote.color ?? null,
                })),
              ])
                .filter(
                  (item, index, array) =>
                    array.findIndex((entry) => entry.id === item.id) === index
                )
                .slice(0, 4)
                .map((related) => (
                  <div
                    key={related.id}
                    className="w-24 cursor-pointer rounded-md px-2 py-1 text-[10px]"
                    style={relatedNoteStyle}
                  >
                    <div className="truncate font-semibold">{related.title}</div>
                    <div className="line-clamp-2 text-[9px] opacity-80">No content</div>
                  </div>
                ))}
            </div>
          </div>
        )}
    </div>
  );
}

export const NoteCard = React.memo(NoteCardBase);
NoteCard.displayName = "NoteCard";
