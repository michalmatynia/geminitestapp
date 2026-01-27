import React, { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight, Star, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { NoteForm } from "./NoteForm";
import { buildBreadcrumbPath, renderMarkdownToHtml } from "../utils";
import type { NoteWithRelations } from "@/shared/types/notes";
import type { NoteDetailViewProps } from "@/features/notesapp/types/notes-ui";
import { useToast } from "@/shared/ui/toast";

export function NoteDetailView({
  selectedNote,
  folderTree,
  selectedFolderId,
  isFolderTreeCollapsed,
  onExpandFolderTree,
  setSelectedFolderId,
  setSelectedNote,
  isEditing,
  setIsEditing,
  onToggleFavorite,
  onDeleteNote,
  tags,
  selectedNotebookId,
  onUpdateSuccess,
  fetchTags,
  selectedNoteTheme,
  onSelectRelatedNote,
  onFilterByTag,
  onUnlinkRelatedNote,
}: NoteDetailViewProps) {
  const { toast } = useToast();
  const [relatedPreviewNotes, setRelatedPreviewNotes] = useState<Record<string, NoteWithRelations>>({});

  const relatedNotes = useMemo(() => {
    if (!selectedNote) return [];
    if (selectedNote.relations && selectedNote.relations.length > 0) {
      return selectedNote.relations;
    }

    const build = (
      id: string | undefined,
      title: string | undefined,
      color: string | null | undefined
    ) => (id ? { id, title: title ?? "Untitled note", color: color ?? null } : null);

    const fromRelations = (selectedNote.relationsFrom ?? [])
      .map((relation) =>
        build(
          relation.targetNote?.id ?? (relation as { targetNoteId?: string }).targetNoteId,
          relation.targetNote?.title,
          relation.targetNote?.color
        )
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    const toRelations = (selectedNote.relationsTo ?? [])
      .map((relation) =>
        build(
          relation.sourceNote?.id ?? (relation as { sourceNoteId?: string }).sourceNoteId,
          relation.sourceNote?.title,
          relation.sourceNote?.color
        )
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    return [...fromRelations, ...toRelations];
  }, [selectedNote]);

  const relationIds = useMemo(
    () =>
      relatedNotes
        .map((rel) => rel.id)
        .filter(
          (id, index, array) => array.findIndex((entry) => entry === id) === index
        ),
    [relatedNotes]
  );

  useEffect(() => {
    if (!selectedNote || relationIds.length === 0) return;
    let isActive = true;
    const fetchRelated = async () => {
      try {
        const notes = await Promise.all(
          relationIds.map(async (id) => {
            try {
              const res = await fetch(`/api/notes/${id}`, { cache: "no-store" });
              if (!res.ok) return null;
              return (await res.json()) as NoteWithRelations;
            } catch {
              return null;
            }
          })
        );
        if (!isActive) return;
        const nextMap: Record<string, NoteWithRelations> = {};
        notes.filter(Boolean).forEach((note) => {
          if (note) nextMap[note.id] = note;
        });
        setRelatedPreviewNotes(nextMap);
      } catch (error) {
        console.error("Failed to load related notes:", error);
      }
    };

    void fetchRelated();
    return () => {
      isActive = false;
    };
  }, [selectedNote, relationIds]);

  const getReadableTextColor = (hexColor: string) => {
    const normalized = hexColor.replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
      return "#f8fafc";
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? "#0f172a" : "#f8fafc";
  };

  const fallbackTheme = useMemo(
    () => ({
      textColor: "#e5e7eb",
      backgroundColor: "#111827",
      markdownHeadingColor: "#f9fafb",
      markdownLinkColor: "#93c5fd",
      markdownCodeBackground: "#1f2937",
      markdownCodeText: "#e5e7eb",
      relatedNoteBorderWidth: 1,
      relatedNoteBorderColor: "#374151",
      relatedNoteBackgroundColor: "#1f2937",
      relatedNoteTextColor: "#e5e7eb",
    }),
    []
  );

  const effectivePreviewTheme = selectedNoteTheme ?? fallbackTheme;

  const previewStyle = (() => {
    const normalizedColor = selectedNote?.color?.toLowerCase().trim();
    const isDefaultColor = !normalizedColor || normalizedColor === "#ffffff";
    const color =
      !isDefaultColor
        ? normalizedColor ?? selectedNote?.color ?? effectivePreviewTheme.backgroundColor
        : effectivePreviewTheme.backgroundColor ||
          normalizedColor ||
          selectedNote?.color ||
          "#1f2937";
    const hex = color.replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
      return { backgroundColor: color };
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const borderColor = luminance > 0.78 ? "rgba(15, 23, 42, 0.35)" : "rgba(148, 163, 184, 0.2)";
    return {
      backgroundColor: color,
      borderColor,
      boxShadow: luminance > 0.78 ? "0 0 0 1px rgba(15, 23, 42, 0.12)" : undefined,
    };
  })();

  const previewTextColor = (() => {
    const normalizedColor = selectedNote?.color?.toLowerCase().trim();
    const isDefaultColor = !normalizedColor || normalizedColor === "#ffffff";
    const background =
      !isDefaultColor
        ? normalizedColor ?? selectedNote?.color ?? effectivePreviewTheme.backgroundColor
        : effectivePreviewTheme.backgroundColor ||
          normalizedColor ||
          selectedNote?.color ||
          "#1f2937";
    if (effectivePreviewTheme.textColor && !isDefaultColor) {
      return getReadableTextColor(background);
    }
    return effectivePreviewTheme.textColor ?? getReadableTextColor(background);
  })();

  const previewTypographyStyle = useMemo(
    () => ({
      color: previewTextColor,
      ["--tw-prose-body" as never]: previewTextColor,
      ["--tw-prose-headings" as never]:
        effectivePreviewTheme.markdownHeadingColor ?? previewTextColor,
      ["--tw-prose-lead" as never]: previewTextColor,
      ["--tw-prose-bold" as never]: previewTextColor,
      ["--tw-prose-counters" as never]: previewTextColor,
      ["--tw-prose-bullets" as never]: previewTextColor,
      ["--tw-prose-quotes" as never]: previewTextColor,
      ["--tw-prose-quote-borders" as never]: "rgba(148, 163, 184, 0.35)",
      ["--tw-prose-hr" as never]: "rgba(148, 163, 184, 0.35)",
      ["--note-link-color" as never]:
        effectivePreviewTheme.markdownLinkColor ?? "#38bdf8",
      ["--note-code-bg" as never]:
        effectivePreviewTheme.markdownCodeBackground ?? "#0f172a",
      ["--note-code-text" as never]:
        effectivePreviewTheme.markdownCodeText ?? "#e2e8f0",
      ["--note-inline-code-bg" as never]:
        effectivePreviewTheme.markdownCodeBackground ?? "rgba(15, 23, 42, 0.12)",
    }),
    [
      previewTextColor,
      effectivePreviewTheme,
    ]
  );

  const relatedPreviewStyle = useMemo(
    () => ({
      borderWidth: `${effectivePreviewTheme.relatedNoteBorderWidth ?? 1}px`,
      borderColor:
        effectivePreviewTheme.relatedNoteBorderColor ?? "rgba(15, 23, 42, 0.2)",
      backgroundColor:
        effectivePreviewTheme.relatedNoteBackgroundColor ??
        "rgba(15, 23, 42, 0.05)",
      color: effectivePreviewTheme.relatedNoteTextColor ?? "#f8fafc",
    }),
    [
      effectivePreviewTheme,
    ]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb for selected note */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
        {isFolderTreeCollapsed && (
          <Button
            onClick={onExpandFolderTree}
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <ChevronLeft className="-scale-x-100" size={16} />
            <span className="ml-2">Show Folders</span>
          </Button>
        )}
        {buildBreadcrumbPath(
          selectedNote.categories[0]?.categoryId || null,
          selectedNote.title,
          folderTree
        ).map((crumb, index, array) => (
          <React.Fragment key={index}>
            {crumb.isNote ? (
              <span className="text-gray-300">{crumb.name}</span>
            ) : (
              <Button
                variant="link"
                onClick={() => {
                  setSelectedFolderId(crumb.id);
                  setSelectedNote(null);
                  setIsEditing(false);
                }}
                className="h-auto p-0 text-gray-400 hover:text-blue-400 transition"
              >
                {crumb.name}
              </Button>
            )}
            {index < array.length - 1 && (
              <ChevronRight size={16} className="text-gray-600" />
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-4">
        <Button
          onClick={() => {
            if (isEditing) {
              setIsEditing(false);
            } else {
              setSelectedNote(null);
            }
          }}
          className="min-w-[80px] border border-white/20 hover:border-white/40"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={() => onToggleFavorite(selectedNote)}
          className="flex items-center gap-2 border border-white/20 hover:border-white/40"
        >
          <Star
            size={16}
            className={selectedNote.isFavorite ? "fill-yellow-400 text-yellow-500" : ""}
          />
          <span className="text-sm">
            {selectedNote.isFavorite ? "Favorited" : "Favorite"}
          </span>
        </Button>
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            className="min-w-[80px] border border-white/20 hover:border-white/40"
          >
            Edit
          </Button>
        ) : (
          <>
            <Button
              type="button"
              form="note-edit-form"
              onClick={() => {
                const form = document.getElementById("note-edit-form") as HTMLFormElement;
                form?.requestSubmit();
              }}
              className="min-w-[80px] border border-white/20 hover:border-white/40"
            >
              Update
            </Button>
            <Button
              type="button"
              onClick={() => setIsEditing(false)}
              className="min-w-[80px] border border-white/20 hover:border-white/40"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => { void onDeleteNote(); }}
              className="min-w-[80px] border border-red-500/20 hover:border-red-500/40 text-red-400"
            >
              Delete
            </Button>
          </>
        )}
      </div>

      {isEditing ? (
        <div className="flex-1 overflow-y-auto">
          <NoteForm
            note={selectedNote}
            folderTree={folderTree}
            defaultFolderId={selectedFolderId}
            availableTags={tags}
            notebookId={selectedNotebookId}
            onSuccess={onUpdateSuccess}
            onTagCreated={fetchTags}
            folderTheme={selectedNoteTheme}
            onSelectRelatedNote={onSelectRelatedNote}
            onTagClick={onFilterByTag}
          />
        </div>
      ) : (
        <div
          className="flex-1 overflow-y-auto rounded-lg border border-gray-800 bg-gray-900 p-6 cursor-text"
          onDoubleClick={() => setIsEditing(true)}
          style={previewStyle}
        >
          <h1
            className="mb-4 text-3xl font-bold"
            style={{ color: previewTextColor }}
          >
            {selectedNote.title}
          </h1>
          <div
            className="prose max-w-none"
            style={previewTypographyStyle}
            dangerouslySetInnerHTML={{
              __html:
                selectedNote.editorType === "wysiwyg"
                  ? selectedNote.content
                  : renderMarkdownToHtml(selectedNote.content),
            }}
            onMouseOver={(e) => {
              const target = e.target;
              if (!(target instanceof HTMLElement)) return;
              const wrapper = target.closest("[data-code]");
              const button = wrapper?.querySelector("[data-copy-code]");
              if (button instanceof HTMLElement) button.style.opacity = "1";
            }}
            onMouseOut={(e) => {
              const target = e.target;
              if (!(target instanceof HTMLElement)) return;
              const wrapper = target.closest("[data-code]");
              const button = wrapper?.querySelector("[data-copy-code]");
              if (button instanceof HTMLElement) button.style.opacity = "0";
            }}
            onClick={(e) => {
              const target = e.target;
              if (!(target instanceof HTMLElement)) return;
              const copyButton = target.closest("[data-copy-code]");
              if (!(copyButton instanceof HTMLButtonElement)) return;
              const wrapper = copyButton.closest("[data-code]");
              const encoded = wrapper?.getAttribute("data-code");
              if (!encoded) return;
              const originalLabel = copyButton.textContent;
              navigator.clipboard
                .writeText(decodeURIComponent(encoded))
                .then(() => {
                  copyButton.textContent = "Copied";
                  window.setTimeout(() => {
                    copyButton.textContent = originalLabel ?? "Copy";
                  }, 1500);
                })
                .catch(() => toast("Failed to copy code", { variant: "error" }));
            }}
          />
          {relatedNotes.length > 0 && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-wide text-gray-400">
                  Related Notes
                </div>
                <div className="flex flex-wrap gap-2">
                  {relatedNotes
                    .filter(
                      (noteItem, index, array) =>
                        array.findIndex((item) => item.id === noteItem.id) === index
                    )
                    .map((related) => {
                      const relatedNote = relatedPreviewNotes[related.id];
                      return (
                        <div
                          key={related.id}
                          className="relative w-40 cursor-pointer rounded-md border px-3 py-2 text-left text-xs transition"
                          style={relatedPreviewStyle}
                          role="button"
                          tabIndex={0}
                          onClick={() => onSelectRelatedNote(related.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              onSelectRelatedNote(related.id);
                            }
                          }}
                        >
                          <div className="truncate font-semibold">
                            {relatedNote?.title ?? related.title}
                          </div>
                          <div className="line-clamp-2 text-[11px] opacity-80">
                            {relatedNote?.content ?? "No content"}
                          </div>
                          <Button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void onUnlinkRelatedNote(related.id);
                            }}
                            className="absolute right-2 top-2 opacity-70 hover:opacity-100"
                            aria-label="Unlink related note"
                          >
                            <X size={12} />
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
          <div className="mt-8 pt-4 border-t border-gray-800 flex gap-6 text-sm text-gray-500">
            <span>Created: {new Date(selectedNote.createdAt).toLocaleString()}</span>
            <span>Modified: {new Date(selectedNote.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
