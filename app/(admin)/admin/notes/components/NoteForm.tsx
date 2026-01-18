"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { CategoryWithChildren, NoteWithRelations, TagRecord, NoteFileRecord, ThemeRecord } from "@/types/notes";
import type { NoteFormProps } from "@/types/notes-ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { autoformatMarkdown } from "../utils";
import { useUndo } from "../hooks/useUndo";
import { useNoteSettings } from "@/lib/context/NoteSettingsContext";
import { MarkdownToolbar } from "./editor/MarkdownToolbar";
import { FileAttachments } from "./editor/FileAttachments";
import { NoteMetadata } from "./editor/NoteMetadata";
import { MarkdownEditor } from "./editor/MarkdownEditor";

// Hardcoded dark mode fallback theme - consistent with page styling
const FALLBACK_THEME = {
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
  folderTheme,
}: NoteFormProps) {
  const [title, setTitle] = useState(note?.title || "");
  const {
    state: content,
    setState: setContent,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useUndo(note?.content || "");

  useEffect(() => {
    if (note?.id) {
      setTitle(note.title);
      resetHistory(note.content);
    }
  }, [note?.id, note?.title, note?.content, resetHistory]);

  const [color, setColor] = useState(note?.color?.toLowerCase().trim() || "#ffffff");
  const [isPinned, setIsPinned] = useState(note?.isPinned || false);
  const [isArchived, setIsArchived] = useState(note?.isArchived || false);
  const [isFavorite, setIsFavorite] = useState(note?.isFavorite || false);
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
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("inherit");
  const [showPreview, setShowPreview] = useState(false);
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const editorSplitRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteFiles, setNoteFiles] = useState<NoteFileRecord[]>(note?.files || []);
  const [uploadingSlots, setUploadingSlots] = useState<Set<number>>(new Set());
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const { toast } = useToast();
  const { settings } = useNoteSettings();

  const MAX_SLOTS = 10;

  useEffect(() => {
    setColor(note?.color?.toLowerCase().trim() || "#ffffff");
  }, [note?.id, note?.color]);

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

  // Use provided theme or fall back to dark mode theme
  const effectiveTheme = folderTheme ?? FALLBACK_THEME;
  const hasCustomColor = color !== "#ffffff";
  const contentBackground = hasCustomColor
    ? color
    : effectiveTheme.backgroundColor;
  const contentTextColor = hasCustomColor
    ? getReadableTextColor(contentBackground)
    : effectiveTheme.textColor;
  
  const previewTypographyStyle: React.CSSProperties = useMemo(() => ({
    color: contentTextColor,
    ["--tw-prose-body" as never]: contentTextColor,
    ["--tw-prose-headings" as never]: effectiveTheme.markdownHeadingColor ?? contentTextColor,
    ["--tw-prose-lead" as never]: contentTextColor,
    ["--tw-prose-bold" as never]: contentTextColor,
    ["--tw-prose-counters" as never]: contentTextColor,
    ["--tw-prose-bullets" as never]: contentTextColor,
    ["--tw-prose-quotes" as never]: contentTextColor,
    ["--tw-prose-quote-borders" as never]: "rgba(148, 163, 184, 0.35)",
    ["--tw-prose-hr" as never]: "rgba(148, 163, 184, 0.35)",
    ["--note-link-color" as never]: effectiveTheme.markdownLinkColor,
    ["--note-code-bg" as never]: effectiveTheme.markdownCodeBackground,
    ["--note-code-text" as never]: effectiveTheme.markdownCodeText,
    ["--note-inline-code-bg" as never]: effectiveTheme.markdownCodeBackground,
  }), [contentTextColor, effectiveTheme]);

  const flattenFolderTree = useCallback((
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
  }, []);

  const flatFolders = useMemo(
    () => flattenFolderTree(folderTree),
    [folderTree, flattenFolderTree]
  );

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
    const selected = content.slice(start, end);
    const styleParts: string[] = [];
    if (colorValue) {
      styleParts.push(`color: ${colorValue}`);
    }
    if (fontValue && fontValue !== "inherit") {
      styleParts.push(`font-family: ${fontValue}`);
    }
    const styleAttribute = styleParts.length > 0 ? ` style=\"${styleParts.join("; ")}\"` : "";
    const openingTag = `<span${styleAttribute}>`;
    const closingTag = "</span>";
    const wrapped = `${openingTag}${selected}${closingTag}`;
    const nextValue =
      content.slice(0, start) + wrapped + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame(() => {
      const cursor = selected.length > 0 
        ? start + wrapped.length 
        : start + openingTag.length;
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

  const filteredTags = useMemo(() => availableTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(tagInput.toLowerCase()) &&
      !selectedTagIds.includes(tag.id)
  ), [availableTags, tagInput, selectedTagIds]);

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

  const handleFileUpload = async (slotIndex: number, file: File) => {
    if (!note?.id) {
      toast("Please save the note first before uploading files");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast("File size exceeds 10MB limit");
      return;
    }

    setUploadingSlots((prev) => new Set(prev).add(slotIndex));

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("slotIndex", slotIndex.toString());

      const response = await fetch(`/api/notes/${note.id}/files`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const newFile = (await response.json()) as NoteFileRecord;
        setNoteFiles((prev) => [...prev.filter((f) => f.slotIndex !== slotIndex), newFile].sort((a, b) => a.slotIndex - b.slotIndex));
        toast("File uploaded successfully");
      } else {
        const error = await response.json();
        toast(error.error || "Failed to upload file");
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
      toast("Failed to upload file");
    } finally {
      setUploadingSlots((prev) => {
        const next = new Set(prev);
        next.delete(slotIndex);
        return next;
      });
    }
  };

  const handleFileDelete = async (slotIndex: number) => {
    if (!note?.id) return;

    try {
      const response = await fetch(`/api/notes/${note.id}/files/${slotIndex}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setNoteFiles((prev) => prev.filter((f) => f.slotIndex !== slotIndex));
        toast("File deleted successfully");
      } else {
        toast("Failed to delete file");
      }
    } catch (error) {
      console.error("Failed to delete file:", error);
      toast("Failed to delete file");
    }
  };

  const handleMultiFileUpload = async (files: FileList | File[]) => {
    const queue = Array.from(files);
    for (const file of queue) {
      const nextSlot = getNextAvailableSlot();
      if (nextSlot === null) {
        toast("All file slots are full. Delete a file to upload more.");
        return;
      }
      await handleFileUpload(nextSlot, file);
    }
  };

  const isImageFile = (mimetype: string) => mimetype.startsWith("image/");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const insertFileReference = (file: NoteFileRecord) => {
    const textarea = contentRef.current;
    if (!textarea) return;

    const isImage = isImageFile(file.mimetype);
    const altText = file.filename.replace(/^slot-\d+-\d+-/, "");
    const reference = isImage
      ? `![${altText}](${file.filepath})`
      : `[${altText}](${file.filepath})`;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue = content.slice(0, start) + reference + content.slice(end);
    setContent(nextValue);

    requestAnimationFrame(() => {
      const cursor = start + reference.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });

    toast(isImage ? "Image reference inserted" : "File link inserted");
  };

  const getNextAvailableSlot = (): number | null => {
    const usedSlots = new Set(noteFiles.map((f) => f.slotIndex));
    for (let i = 0; i < MAX_SLOTS; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return null;
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const uploadPastedImage = async (file: File) => {
      if (!note?.id) {
        toast("Please save the note first before pasting images");
        return;
      }

      const nextSlot = getNextAvailableSlot();
      if (nextSlot === null) {
        toast("All file slots are full. Delete a file to paste a new image.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast("Image size exceeds 10MB limit");
        return;
      }

      setIsPasting(true);
      setUploadingSlots((prev) => new Set(prev).add(nextSlot));

      const textarea = contentRef.current;
      const cursorPosition = textarea?.selectionStart ?? content.length;

      try {
        const formData = new FormData();
        const timestamp = Date.now();
        const extension = file.type.split("/")[1] || "png";
        const renamedFile = new File([file], `pasted-image-${timestamp}.${extension}`, {
          type: file.type,
        });
        formData.append("file", renamedFile);
        formData.append("slotIndex", nextSlot.toString());

        const response = await fetch(`/api/notes/${note.id}/files`, {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const newFile = (await response.json()) as NoteFileRecord;
          setNoteFiles((prev) =>
            [...prev.filter((f) => f.slotIndex !== nextSlot), newFile].sort(
              (a, b) => a.slotIndex - b.slotIndex
            )
          );

          const altText = renamedFile.name;
          const reference = `![${altText}](${newFile.filepath})`;
          const nextValue =
            content.slice(0, cursorPosition) + reference + content.slice(cursorPosition);
          setContent(nextValue);

          toast("Image pasted and uploaded");
        } else {
          const error = await response.json();
          toast(error.error || "Failed to upload pasted image");
        }
      } catch (error) {
        console.error("Failed to upload pasted image:", error);
        toast("Failed to upload pasted image");
      } finally {
        setIsPasting(false);
        setUploadingSlots((prev) => {
          const next = new Set(prev);
          next.delete(nextSlot);
          return next;
        });
      }
    };

    const pastedText = e.clipboardData?.getData("text/plain");
    if (pastedText) {
      if (settings.autoformatOnPaste) {
        e.preventDefault();
        const formattedText = autoformatMarkdown(pastedText);
        const textarea = contentRef.current;
        const selectionStart = textarea?.selectionStart ?? content.length;
        const selectionEnd = textarea?.selectionEnd ?? content.length;
        const newContent =
          content.slice(0, selectionStart) +
          formattedText +
          content.slice(selectionEnd);
        setContent(newContent);
        // Set cursor position after the inserted text
        setTimeout(() => {
          if (textarea) {
            const newPosition = selectionStart + formattedText.length;
            textarea.selectionStart = newPosition;
            textarea.selectionEnd = newPosition;
            textarea.focus();
          }
        }, 0);
      }
      return;
    }

    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) return;
        await uploadPastedImage(file);
        return;
      }
    }

    const pastedFiles = e.clipboardData?.files;
    if (pastedFiles && pastedFiles.length > 0) {
      const file = pastedFiles[0];
      if (file && file.type.startsWith("image/")) {
        e.preventDefault();
        await uploadPastedImage(file);
        return;
      }
    }
  };

  useEffect(() => {
    setNoteFiles(note?.files || []);
  }, [note?.files]);

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
  }, [relatedNoteQuery, notebookId, note?.notebookId]);

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
          color: color.toLowerCase().trim(),
          isPinned,
          isArchived,
          isFavorite,
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
    <>
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
        <label className="mb-2 block text-sm font-medium text-white">
          Title
        </label>
        <input
          type="text"
          placeholder="Enter note title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white text-lg font-semibold placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">
          Content
        </label>
        <MarkdownToolbar
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          noteFiles={noteFiles}
          textColor={textColor}
          setTextColor={setTextColor}
          fontFamily={fontFamily}
          setFontFamily={setFontFamily}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          onApplyWrap={applyWrap}
          onApplyLinePrefix={applyLinePrefix}
          onInsertAtCursor={insertAtCursor}
          onApplyBulletList={applyBulletList}
          onApplyChecklist={applyChecklist}
          onApplySpanStyle={applySpanStyle}
          onInsertFileReference={insertFileReference}
        />
        <MarkdownEditor
          content={content}
          setContent={setContent}
          showPreview={showPreview}
          editorWidth={editorWidth}
          setEditorWidth={setEditorWidth}
          isDraggingSplitter={isDraggingSplitter}
          setIsDraggingSplitter={setIsDraggingSplitter}
          editorSplitRef={editorSplitRef}
          contentRef={contentRef}
          isPasting={isPasting}
          contentBackground={contentBackground}
          contentTextColor={contentTextColor}
          previewTypographyStyle={previewTypographyStyle}
          onPaste={handlePaste}
          setLightboxImage={setLightboxImage}
        />
      </div>

      <FileAttachments
        noteId={note?.id}
        noteFiles={noteFiles}
        maxSlots={MAX_SLOTS}
        uploadingSlots={uploadingSlots}
        getNextAvailableSlot={getNextAvailableSlot}
        onFileUpload={handleFileUpload}
        onMultiFileUpload={handleMultiFileUpload}
        onFileDelete={handleFileDelete}
        onInsertFileReference={insertFileReference}
        formatFileSize={formatFileSize}
        isImageFile={isImageFile}
      />

      <NoteMetadata
        title={title}
        setTitle={setTitle}
        showTitle={false}
        selectedFolderId={selectedFolderId}
        setSelectedFolderId={setSelectedFolderId}
        flatFolders={flatFolders}
        color={color}
        setColor={setColor}
        isPinned={isPinned}
        setIsPinned={setIsPinned}
        isArchived={isArchived}
        setIsArchived={setIsArchived}
        isFavorite={isFavorite}
        setIsFavorite={setIsFavorite}
        selectedTagIds={selectedTagIds}
        availableTags={availableTags}
        tagInput={tagInput}
        setTagInput={setTagInput}
        isTagDropdownOpen={isTagDropdownOpen}
        setIsTagDropdownOpen={setIsTagDropdownOpen}
        filteredTags={filteredTags}
        onAddTag={handleAddTag}
        onCreateTag={handleCreateTag}
        onRemoveTag={handleRemoveTag}
        onTagClick={onTagClick}
        selectedRelatedNotes={selectedRelatedNotes}
        setSelectedRelatedNotes={setSelectedRelatedNotes}
        relatedNoteQuery={relatedNoteQuery}
        setRelatedNoteQuery={setRelatedNoteQuery}
        isRelatedDropdownOpen={isRelatedDropdownOpen}
        setIsRelatedDropdownOpen={setIsRelatedDropdownOpen}
        relatedNoteResults={relatedNoteResults}
        isRelatedLoading={isRelatedLoading}
        onSelectRelatedNote={onSelectRelatedNote}
        effectiveTheme={effectiveTheme}
        noteId={note?.id}
      />
    </form>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxImage(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={() => setLightboxImage(null)}
          >
            <X size={24} />
          </button>
          <div
            className="relative h-[90vh] w-[90vw] max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={lightboxImage}
              alt="Lightbox preview"
              fill
              sizes="90vw"
              className="rounded-lg object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}
