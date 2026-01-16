"use client";

import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { CategoryWithChildren, NoteWithRelations, TagRecord } from "@/types/notes";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { renderMarkdownToHtml } from "../utils";

export function NoteForm({
  note,
  folderTree,
  defaultFolderId,
  availableTags,
  onSuccess,
  onTagCreated,
  onSelectRelatedNote,
  onTagClick,
  notebookId,
}: {
  note?: NoteWithRelations | null;
  folderTree: CategoryWithChildren[];
  defaultFolderId?: string | null;
  availableTags: TagRecord[];
  onSuccess: () => void;
  onTagCreated: () => void;
  onSelectRelatedNote: (noteId: string) => void;
  onTagClick?: (tagId: string) => void;
  notebookId?: string | null;
}) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [color, setColor] = useState(note?.color || "#ffffff");
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isArchived, setIsArchived] = useState(note?.isArchived || false);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    note?.categories[0]?.categoryId || defaultFolderId || ""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    note?.tags.map((t) => t.tagId) || []
  );
  const [selectedRelatedNotes, setSelectedRelatedNotes] = useState<
    Array<{ id: string; title: string; color: string | null; content: string }>
  >(
    note?.relations?.map((rel) => ({
      id: rel.id,
      title: rel.title,
      color: rel.color ?? null,
      content: "",
    })) ||
      note?.relationsFrom?.map((rel) => ({
        id: rel.targetNote.id,
        title: rel.targetNote.title,
        color: rel.targetNote.color ?? null,
        content: "",
      })) ||
      []
  );
  const [relatedNoteQuery, setRelatedNoteQuery] = useState("");
  const [isRelatedDropdownOpen, setIsRelatedDropdownOpen] = useState(false);
  const [relatedNoteResults, setRelatedNoteResults] = useState<NoteWithRelations[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const relatedSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [tagInput, setTagInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("inherit");
  const [showPreview, setShowPreview] = useState(false);
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const editorSplitRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!showPreview) return;
    const container = editorSplitRef.current;
    if (!container) return;
    setEditorWidth((prev) => prev ?? Math.round(container.getBoundingClientRect().width / 2));
  }, [showPreview]);

  useEffect(() => {
    if (!isDraggingSplitter) return;
    const handlePointerMove = (event: PointerEvent) => {
      const container = editorSplitRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const minWidth = 260;
      const maxWidth = rect.width - 260;
      const nextWidth = Math.min(maxWidth, Math.max(minWidth, event.clientX - rect.left));
      setEditorWidth(nextWidth);
    };
    const handlePointerUp = () => {
      setIsDraggingSplitter(false);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDraggingSplitter]);

  const getReadableTextColor = (hex: string) => {
    const normalized = hex.replace("#", "");
    if (normalized.length !== 6) return "#f8fafc";
    const num = parseInt(normalized, 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return luminance > 0.7 ? "#0f172a" : "#f8fafc";
  };

  const contentBackground = color || "#ffffff";
  const contentTextColor = getReadableTextColor(contentBackground);
  const previewTypographyStyle: React.CSSProperties = {
    color: contentTextColor,
    ["--tw-prose-body" as never]: contentTextColor,
    ["--tw-prose-headings" as never]: contentTextColor,
    ["--tw-prose-lead" as never]: contentTextColor,
    ["--tw-prose-bold" as never]: contentTextColor,
    ["--tw-prose-counters" as never]: contentTextColor,
    ["--tw-prose-bullets" as never]: contentTextColor,
    ["--tw-prose-quotes" as never]: contentTextColor,
    ["--tw-prose-quote-borders" as never]: "rgba(148, 163, 184, 0.35)",
    ["--tw-prose-hr" as never]: "rgba(148, 163, 184, 0.35)",
  };

  const flattenFolderTree = (
    folders: CategoryWithChildren[],
    level = 0
  ): Array<{ id: string; name: string; level: number }> => {
    const result: Array<{ id: string; name: string; level: number }> = [];
    for (const folder of folders) {
      result.push({ id: folder.id, name: folder.name, level });
      if (folder.children.length > 0) {
        result.push(...flattenFolderTree(folder.children, level + 1));
      }
    }
    return result;
  };

  const flatFolders = flattenFolderTree(folderTree);

  const applyWrap = (prefix: string, suffix: string, placeholder: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const nextValue =
      content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame(() => {
      const cursor = start + prefix.length + selected.length + suffix.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const insertAtCursor = (value: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = content.slice(0, start) + value + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame(() => {
      const cursor = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const applyLinePrefix = (prefix: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const blockStart = content.lastIndexOf("\n", start - 1) + 1;
    const blockEndIndex = content.indexOf("\n", end);
    const blockEnd = blockEndIndex === -1 ? content.length : blockEndIndex;
    const block = content.slice(blockStart, blockEnd);
    const updated = block
      .split(/\r?\n/)
      .map((line) => (line.trim().length ? `${prefix}${line}` : line))
      .join("\n");
    const nextValue = content.slice(0, blockStart) + updated + content.slice(blockEnd);
    setContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  };

  const applySpanStyle = (colorValue: string, fontValue: string) => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.slice(start, end) || "styled text";
    const styleParts: string[] = [];
    if (colorValue) {
      styleParts.push(`color: ${colorValue}`);
    }
    if (fontValue && fontValue !== "inherit") {
      styleParts.push(`font-family: ${fontValue}`);
    }
    const styleAttribute = styleParts.length > 0 ? ` style="${styleParts.join("; ")}"` : "";
    const wrapped = `<span${styleAttribute}>${selected}</span>`;
    const nextValue =
      content.slice(0, start) + wrapped + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame(() => {
      const cursor = start + wrapped.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const applyBulletList = () => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start === end) {
      const insert = "- ";
      const nextValue = content.slice(0, start) + insert + content.slice(end);
      setContent(nextValue);
      requestAnimationFrame(() => {
        const cursor = start + insert.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
      return;
    }

    const blockStart = content.lastIndexOf("\n", start - 1) + 1;
    const blockEndIndex = content.indexOf("\n", end);
    const blockEnd = blockEndIndex === -1 ? content.length : blockEndIndex;
    const block = content.slice(blockStart, blockEnd);
    const updated = block
      .split(/\r?\n/)
      .map((line) => (line.trim().startsWith("- ") ? line : `- ${line}`))
      .join("\n");
    const nextValue = content.slice(0, blockStart) + updated + content.slice(blockEnd);
    setContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  };

  const applyChecklist = () => {
    const textarea = contentRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const blockStart = content.lastIndexOf("\n", start - 1) + 1;
    const blockEndIndex = content.indexOf("\n", end);
    const blockEnd = blockEndIndex === -1 ? content.length : blockEndIndex;
    const block = content.slice(blockStart, blockEnd);
    const updated = block
      .split(/\r?\n/)
      .map((line) => (line.trim().startsWith("- [") ? line : `- [ ] ${line}`))
      .join("\n");
    const nextValue = content.slice(0, blockStart) + updated + content.slice(blockEnd);
    setContent(nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  };

  const filteredTags = availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTagIds.includes(tag.id)
  );

  const handleAddTag = (tag: TagRecord) => {
    setSelectedTagIds([...selectedTagIds, tag.id]);
    setTagInput("");
    setIsTagDropdownOpen(false);
  };

  const handleCreateTag = async () => {
    if (!tagInput.trim()) return;

    const existingTag = availableTags.find(
      (t) => t.name.toLowerCase() === tagInput.trim().toLowerCase()
    );

    if (existingTag) {
      if (!selectedTagIds.includes(existingTag.id)) {
        handleAddTag(existingTag);
      } else {
        setTagInput("");
        setIsTagDropdownOpen(false);
      }
      return;
    }

    try {
      const response = await fetch("/api/notes/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tagInput.trim(),
          notebookId: notebookId ?? note?.notebookId ?? null,
        }),
      });

      if (response.ok) {
        const newTag = (await response.json()) as TagRecord;
        onTagCreated();
        setSelectedTagIds((prev) => [...prev, newTag.id]);
        setTagInput("");
        setIsTagDropdownOpen(false);
      }
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTagIds(selectedTagIds.filter((id) => id !== tagId));
  };

  useEffect(() => {
    if (!note) {
      setSelectedRelatedNotes([]);
      setRelatedNoteQuery("");
      setIsRelatedDropdownOpen(false);
      setRelatedNoteResults([]);
      return;
    }
    const combinedRelations =
      note.relations?.map((rel) => ({
        id: rel.id,
        title: rel.title,
        color: rel.color ?? null,
        content: "",
      })) ||
      [
        ...(note.relationsFrom ?? []).map((rel) => ({
          id: rel.targetNote.id,
          title: rel.targetNote.title,
          color: rel.targetNote.color ?? null,
          content: "",
        })),
        ...(note.relationsTo ?? []).map((rel) => ({
          id: rel.sourceNote.id,
          title: rel.sourceNote.title,
          color: rel.sourceNote.color ?? null,
          content: "",
        })),
      ].filter(
        (item, index, array) =>
          array.findIndex((entry) => entry.id === item.id) === index
      );
    setSelectedRelatedNotes(combinedRelations);
    setRelatedNoteQuery("");
    setIsRelatedDropdownOpen(false);
    setRelatedNoteResults([]);

    const hydrateRelatedNotes = async () => {
      const relatedIds = combinedRelations.map((rel) => rel.id);
      if (relatedIds.length === 0) return;
      try {
        const details = await Promise.all(
          relatedIds.map(async (relId) => {
            try {
              const response = await fetch(`/api/notes/${relId}`, {
                cache: "no-store",
              });
              if (!response.ok) return null;
              return (await response.json()) as NoteWithRelations;
            } catch {
              return null;
            }
          })
        );
        setSelectedRelatedNotes((prev) =>
          prev.map((item) => {
            const found = details.find((detail) => detail?.id === item.id);
            if (!found) return item;
            return {
              ...item,
              content: found.content ?? "",
              title: found.title ?? item.title,
              color: found.color ?? item.color ?? null,
            };
          })
        );
      } catch (error) {
        console.error("Failed to load related note details:", error);
      }
    };

    void hydrateRelatedNotes();
  }, [note]);

  useEffect(() => {
    if (!relatedNoteQuery) {
      setRelatedNoteResults([]);
      setIsRelatedLoading(false);
      if (relatedSearchTimerRef.current) {
        clearTimeout(relatedSearchTimerRef.current);
        relatedSearchTimerRef.current = null;
      }
      return;
    }

    if (relatedSearchTimerRef.current) {
      clearTimeout(relatedSearchTimerRef.current);
    }

    const timer = setTimeout(() => {
      let isActive = true;
      const fetchResults = async () => {
        setIsRelatedLoading(true);
        try {
          const params = new URLSearchParams({
            search: relatedNoteQuery,
            searchScope: "title",
          });
          const resolvedNotebookId = notebookId ?? note?.notebookId ?? null;
          if (resolvedNotebookId) {
            params.append("notebookId", resolvedNotebookId);
          }
          const response = await fetch(`/api/notes?${params.toString()}`, {
            cache: "no-store",
          });
          if (!response.ok) return;
          const data = (await response.json()) as NoteWithRelations[];
          if (isActive) {
            setRelatedNoteResults(data);
          }
        } catch (error) {
          console.error("Failed to search related notes:", error);
        } finally {
          if (isActive) {
            setIsRelatedLoading(false);
          }
        }
      };

      void fetchResults();
      return () => {
        isActive = false;
      };
    }, 250);

    relatedSearchTimerRef.current = timer;

    return () => {
      clearTimeout(timer);
    };
  }, [relatedNoteQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;

    setIsSubmitting(true);
    try {
      const url = note ? `/api/notes/${note.id}` : "/api/notes";
      const method = note ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          color,
          isPinned,
          isArchived,
          tagIds: selectedTagIds,
          relatedNoteIds: selectedRelatedNotes.map((rel) => rel.id),
          categoryIds: selectedFolderId ? [selectedFolderId] : [],
          notebookId: notebookId ?? note?.notebookId ?? null,
        }),
      });

      if (response.ok) {
        toast(note ? "Note updated successfully" : "Note created successfully");
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to save note:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      id={note ? "note-edit-form" : undefined}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {!note && (
        <div className="flex gap-2 pb-4 border-b border-gray-700">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            {isSubmitting ? "Saving..." : "Create"}
          </Button>
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-white">Title</label>
        <input
          type="text"
          placeholder="Enter note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          Content
        </label>
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2">
          <button
            type="button"
            onClick={() => applyWrap("**", "**", "bold text")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Bold"
          >
            Bold
          </button>
          <button
            type="button"
            onClick={() => applyWrap("*", "*", "italic text")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Italic"
          >
            Italic
          </button>
          <button
            type="button"
            onClick={() => applyWrap("`", "`", "code")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Inline code"
          >
            Code
          </button>
          <button
            type="button"
            onClick={applyBulletList}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Bullet list"
          >
            Bullet
          </button>
          <button
            type="button"
            onClick={applyChecklist}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Checklist"
          >
            Checklist
          </button>
          <button
            type="button"
            onClick={() => applyLinePrefix("# ")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Heading"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => applyLinePrefix("## ")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Heading 2"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => applyLinePrefix("### ")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Heading 3"
          >
            H3
          </button>
          <button
            type="button"
            onClick={() => applyLinePrefix("> ")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Blockquote"
          >
            Quote
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor("\n---\n")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Horizontal rule"
          >
            HR
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor("\n```text\ncode\n```\n")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Code block"
          >
            Code Block
          </button>
          <button
            type="button"
            onClick={() => insertAtCursor("[link text](https://example.com)")}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Link"
          >
            Link
          </button>
          <button
            type="button"
            onClick={() =>
              insertAtCursor(
                "\n| Header | Header |\n| --- | --- |\n| Cell | Cell |\n"
              )
            }
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Table"
          >
            Table
          </button>
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
            onClick={() => applySpanStyle(textColor, fontFamily)}
            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Apply font and color"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowPreview((prev) => !prev)}
            className="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:bg-gray-700"
            title="Toggle preview"
          >
            {showPreview ? "Hide Preview" : "Show Preview"}
          </button>
        </div>
        <div
          ref={editorSplitRef}
          className={`flex ${showPreview ? "gap-0" : ""}`}
        >
          <div
            className={showPreview ? "flex-shrink-0" : "flex-1"}
            style={showPreview && editorWidth ? { width: editorWidth } : undefined}
          >
            <textarea
              ref={contentRef}
              placeholder="Enter note content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={12}
              className="w-full rounded-lg border border-gray-700 px-4 py-2"
              style={{ backgroundColor: contentBackground, color: contentTextColor }}
              required
            />
          </div>
          {showPreview && (
            <>
              <div
                className="mx-3 flex w-3 cursor-col-resize items-stretch"
                onPointerDown={(event) => {
                  event.preventDefault();
                  setIsDraggingSplitter(true);
                }}
              >
                <div className="relative w-full rounded bg-gray-800/80 ring-1 ring-gray-600/70 hover:bg-gray-700">
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="h-6 w-px bg-gray-500/80" />
                  </span>
                </div>
              </div>
              <div
                className="flex-1 rounded-lg border border-gray-700 px-4 py-3"
                style={{ backgroundColor: contentBackground, color: contentTextColor }}
              >
                <div className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                  Preview
                </div>
                <div
                  className="prose max-w-none"
                  style={previewTypographyStyle}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {selectedTagIds.map((tagId) => {
            const tag = availableTags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-200 border border-blue-500/30"
              >
                <button
                  type="button"
                  onClick={() => onTagClick?.(tag.id)}
                  className="hover:text-white"
                >
                  {tag.name}
                </button>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:text-white"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}
        </div>
        <div className="relative">
          <div className="flex gap-2">
            <input
              ref={tagInputRef}
              type="text"
              placeholder={selectedTagIds.length === 0 ? "Tags" : "Add tag..."}
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setIsTagDropdownOpen(true);
              }}
              onFocus={() => setIsTagDropdownOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (tagInput.trim()) {
                    void handleCreateTag();
                  }
                }
              }}
              className="flex-1 rounded-none border-x-0 border-t border-b border-gray-700 bg-transparent px-0 py-2 text-white text-sm focus:outline-none focus:border-gray-500 placeholder:text-gray-500"
            />
          </div>

          {isTagDropdownOpen && (tagInput || filteredTags.length > 0) && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-700 bg-gray-800 shadow-lg">
              <ul className="max-h-60 overflow-auto py-1 text-sm text-gray-300">
                {filteredTags.map((tag) => (
                  <li
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    className="cursor-pointer px-4 py-2 hover:bg-gray-700 hover:text-white"
                  >
                    {tag.name}
                  </li>
                ))}
                {tagInput &&
                  !filteredTags.find(
                    (t) => t.name.toLowerCase() === tagInput.toLowerCase()
                  ) && (
                    <li
                      onClick={() => void handleCreateTag()}
                      className="cursor-pointer px-4 py-2 text-blue-400 hover:bg-gray-700"
                    >
                      Create &quot;{tagInput}&quot;
                    </li>
                  )}
              </ul>
            </div>
          )}
          {isTagDropdownOpen && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setIsTagDropdownOpen(false)}
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <label className="mb-2 block text-sm font-medium text-white">
          Related Notes
        </label>
        <div className="flex flex-wrap gap-2">
          {selectedRelatedNotes.map((related) => (
            <div
              key={related.id}
              className="relative flex min-w-[180px] max-w-[240px] cursor-pointer flex-col gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-left transition hover:border-emerald-400/60"
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
              <div className="text-xs font-semibold text-emerald-100 truncate">
                {related.title}
              </div>
              <div className="text-[11px] text-emerald-200/80 leading-snug max-h-8 overflow-hidden">
                {related.content ? related.content : "No content"}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedRelatedNotes((prev) =>
                    prev.filter((item) => item.id !== related.id)
                  );
                }}
                className="absolute right-1 top-1 text-emerald-100/70 hover:text-white"
                aria-label="Remove related note"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
        <div className="relative">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search notes to relate..."
              value={relatedNoteQuery}
              onChange={(e) => {
                setRelatedNoteQuery(e.target.value);
                setIsRelatedDropdownOpen(true);
              }}
              onFocus={() => setIsRelatedDropdownOpen(true)}
              className="flex-1 rounded-none border-x-0 border-t border-b border-gray-700 bg-transparent px-0 py-2 text-white text-sm focus:outline-none focus:border-gray-500 placeholder:text-gray-500"
            />
          </div>

          {isRelatedDropdownOpen && relatedNoteQuery && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-700 bg-gray-800 shadow-lg">
              <ul className="max-h-60 overflow-auto py-1 text-sm text-gray-300">
                {isRelatedLoading && (
                  <li className="px-4 py-2 text-gray-500">Searching...</li>
                )}
                {relatedNoteResults
                  .filter((candidate) =>
                    note?.id ? candidate.id !== note.id : true
                  )
                  .filter(
                    (candidate) =>
                      candidate.title
                        .toLowerCase()
                        .includes(relatedNoteQuery.toLowerCase()) &&
                      !selectedRelatedNotes.some(
                        (selected) => selected.id === candidate.id
                      )
                  )
                  .map((candidate) => (
                    <li
                      key={candidate.id}
                      onClick={() => {
                        setSelectedRelatedNotes((prev) => [
                          ...prev,
                          {
                            id: candidate.id,
                            title: candidate.title,
                            color: candidate.color ?? null,
                            content: candidate.content ?? "",
                          },
                        ]);
                        setRelatedNoteQuery("");
                        setIsRelatedDropdownOpen(false);
                      }}
                      className="cursor-pointer px-4 py-2 hover:bg-gray-700 hover:text-white"
                    >
                      {candidate.title}
                    </li>
                  ))}
                {!isRelatedLoading &&
                  relatedNoteResults.filter(
                    (candidate) =>
                      (note?.id ? candidate.id !== note.id : true) &&
                      candidate.title
                        .toLowerCase()
                        .includes(relatedNoteQuery.toLowerCase()) &&
                      !selectedRelatedNotes.some(
                        (selected) => selected.id === candidate.id
                      )
                  ).length === 0 && (
                    <li className="px-4 py-2 text-gray-500">No matches</li>
                  )}
              </ul>
            </div>
          )}
          {isRelatedDropdownOpen && (
            <div
              className="fixed inset-0 z-0"
              onClick={() => setIsRelatedDropdownOpen(false)}
            />
          )}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">Folder</label>
        <select
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
        >
          <option value="">No Folder</option>
          {flatFolders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {"\u00A0\u00A0".repeat(folder.level)}
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">Color</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-800"
        />
      </div>

      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Pinned</span>
        </label>
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={isArchived}
            onChange={(e) => setIsArchived(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Archived</span>
        </label>
      </div>
    </form>
  );
}
