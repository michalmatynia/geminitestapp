"use client";

import React from "react";
import { ChevronRight, Pin } from "lucide-react";
import type { CategoryWithChildren, NoteWithRelations } from "@/types/notes";
import { BreadcrumbScroller } from "./BreadcrumbScroller";
import { darkenColor, renderMarkdownToHtml } from "../utils";

export function NoteCard({
  note,
  folderTree,
  showTimestamps,
  showBreadcrumbs,
  showRelatedNotes,
  enableDrag = true,
  onSelectNote,
  onSelectFolder,
  onDragStart,
  onDragEnd,
  buildBreadcrumbPath,
}: {
  note: NoteWithRelations;
  folderTree: CategoryWithChildren[];
  showTimestamps: boolean;
  showBreadcrumbs: boolean;
  showRelatedNotes: boolean;
  enableDrag?: boolean;
  onSelectNote: (note: NoteWithRelations) => void;
  onSelectFolder: (folderId: string | null) => void;
  onDragStart: (noteId: string) => void;
  onDragEnd: () => void;
  buildBreadcrumbPath: (
    categoryId: string | null,
    noteTitle: string | null,
    categories: CategoryWithChildren[]
  ) => Array<{ id: string | null; name: string; isNote?: boolean }>;
}) {
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
      style={{ backgroundColor: note.color || "#ffffff" }}
      className={`rounded-lg border border-gray-700 p-4 shadow-sm transition ${
        enableDrag
          ? "cursor-grab active:cursor-grabbing hover:shadow-md"
          : "cursor-pointer hover:shadow-md hover:brightness-90"
      }`}
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-semibold text-gray-900">{note.title}</h3>
        {note.isPinned && <Pin size={16} className="text-blue-600" />}
      </div>
      <div
        className="mb-3 max-h-36 overflow-hidden text-sm text-gray-700 prose prose-sm"
        dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(note.content) }}
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
          <BreadcrumbScroller backgroundColor={darkenColor(note.color || "#ffffff", 20)}>
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
                    className="w-24 cursor-pointer rounded-md border border-gray-700 bg-gray-900/70 px-2 py-1 text-[10px] text-gray-200"
                  >
                    <div className="truncate font-semibold">{related.title}</div>
                    <div className="line-clamp-2 text-gray-400">No content</div>
                  </div>
                ))}
            </div>
          </div>
        )}
    </div>
  );
}
