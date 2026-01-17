"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, Upload, FileIcon, Trash2, Link2 } from "lucide-react";
import type { CategoryWithChildren, NoteWithRelations, TagRecord, NoteFileRecord, ThemeRecord } from "@/types/notes";
import type { NoteFormProps } from "@/types/notes-ui";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { renderMarkdownToHtml, autoformatMarkdown } from "../utils";
import { useNoteSettings } from "@/lib/context/NoteSettingsContext";

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
  const [content, setContent] = useState(note?.content || "");
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
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [textColor, setTextColor] = useState("#ffffff");
  const [fontFamily, setFontFamily] = useState("inherit");
  const [showPreview, setShowPreview] = useState(false);
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const editorSplitRef = useRef<HTMLDivElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [noteFiles, setNoteFiles] = useState<NoteFileRecord[]>(note?.files || []);
  const [uploadingSlots, setUploadingSlots] = useState<Set<number>>(new Set());
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isPasting, setIsPasting] = useState(false);
  const { toast } = useToast();
  const { settings } = useNoteSettings();

  const MAX_SLOTS = 10;

  useEffect(() => {
    setColor(note?.color?.toLowerCase().trim() || "#ffffff");
  }, [note?.id, note?.color]);

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

  // Use provided theme or fall back to dark mode theme
  const effectiveTheme = folderTheme ?? FALLBACK_THEME;
  const hasCustomColor = color !== "#ffffff";
  const contentBackground = hasCustomColor
    ? color
    : effectiveTheme.backgroundColor;
  const contentTextColor = hasCustomColor
    ? getReadableTextColor(contentBackground)
    : effectiveTheme.textColor;
  const previewTypographyStyle: React.CSSProperties = {
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
  };
  const relatedNoteStyle: React.CSSProperties = {
    borderWidth: `${effectiveTheme.relatedNoteBorderWidth ?? 1}px`,
    borderColor: effectiveTheme.relatedNoteBorderColor,
    backgroundColor: effectiveTheme.relatedNoteBackgroundColor,
    color: effectiveTheme.relatedNoteTextColor,
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

  const handleFileDrop = (slotIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      void handleFileUpload(slotIndex, file);
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

    // Handle text autoformatting if enabled
    if (settings.autoformatOnPaste) {
      const pastedText = e.clipboardData?.getData("text/plain");
      if (pastedText) {
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
          {noteFiles.length > 0 && (
            <div className="relative">
              <select
                value=""
                onChange={(e) => {
                  const slotIndex = parseInt(e.target.value, 10);
                  const file = noteFiles.find((f) => f.slotIndex === slotIndex);
                  if (file) {
                    insertFileReference(file);
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
            <div className="relative">
              <textarea
                ref={contentRef}
                placeholder="Enter note content (paste images directly!)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onPaste={handlePaste}
                rows={12}
                className="w-full rounded-lg border border-gray-700 px-4 py-2"
                style={{ backgroundColor: contentBackground, color: contentTextColor }}
                required
              />
              {isPasting && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <div className="flex items-center gap-2 text-white">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-400 border-t-white" />
                    <span className="text-sm">Uploading image...</span>
                  </div>
                </div>
              )}
            </div>
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
                  className="prose max-w-none [&_img]:cursor-pointer [&_img]:transition-opacity [&_img]:hover:opacity-80"
                  style={previewTypographyStyle}
                  dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }}
                  onMouseOver={(e) => {
                    const target = e.target as HTMLElement;
                    const wrapper = target.closest("[data-code]") as HTMLElement | null;
                    const button = wrapper?.querySelector("[data-copy-code]") as HTMLElement | null;
                    if (button) button.style.opacity = "1";
                  }}
                  onMouseOut={(e) => {
                    const target = e.target as HTMLElement;
                    const wrapper = target.closest("[data-code]") as HTMLElement | null;
                    const button = wrapper?.querySelector("[data-copy-code]") as HTMLElement | null;
                    if (button) button.style.opacity = "0";
                  }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const copyButton = target.closest("[data-copy-code]") as HTMLButtonElement | null;
                    if (copyButton) {
                      const wrapper = copyButton.closest("[data-code]") as HTMLElement | null;
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
                        .catch(() => toast("Failed to copy code"));
                      return;
                    }
                    if (target.tagName === "IMG") {
                      const imgSrc = (target as HTMLImageElement).src;
                      setLightboxImage(imgSrc);
                    }
                  }}
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
              className="relative flex min-w-[180px] max-w-[240px] cursor-pointer flex-col gap-1 rounded-md border p-2 text-left transition"
              style={relatedNoteStyle}
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
              <div className="text-xs font-semibold truncate">
                {related.title}
              </div>
              <div className="text-[11px] leading-snug max-h-8 overflow-hidden opacity-80">
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
                className="absolute right-1 top-1 opacity-70 hover:opacity-100"
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

      {note?.id && (
        <div className="space-y-2">
          <label className="mb-2 block text-sm font-medium text-white">
            Attachments ({noteFiles.length}/{MAX_SLOTS} slots used)
          </label>
          <div className="flex flex-wrap gap-3">
            {(() => {
              const nextSlot = getNextAvailableSlot();
              const isUploading = nextSlot !== null && uploadingSlots.has(nextSlot);
              return (
                <div
                  className="relative h-20 w-20 rounded-md border border-gray-700 bg-gray-800"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    if (nextSlot === null) return;
                    handleFileDrop(nextSlot, e);
                  }}
                >
                  {isUploading ? (
                    <div className="flex h-full items-center justify-center">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500" />
                    </div>
                  ) : nextSlot === null ? (
                    <div className="flex h-full items-center justify-center text-[10px] text-gray-500">
                      Full
                    </div>
                  ) : (
                    <label className="flex h-full cursor-pointer flex-col items-center justify-center text-gray-500 hover:bg-gray-700/50 hover:text-gray-400 transition-colors">
                      <Upload size={14} />
                      <span className="mt-1 text-[10px]">Upload</span>
                      <span className="mt-0.5 text-[10px] text-gray-400">
                        {MAX_SLOTS - noteFiles.length} left
                      </span>
                      <input
                        ref={(el) => {
                          fileInputRefs.current[nextSlot] = el;
                        }}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files;
                          if (files && files.length > 0) {
                            void handleMultiFileUpload(files);
                          }
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })()}

            {noteFiles.map((file) => (
              <div
                key={file.slotIndex}
                className="relative h-20 w-24 rounded-md border border-gray-700 bg-gray-800/70"
              >
                <div className="group relative h-full">
                  {isImageFile(file.mimetype) ? (
                    <img
                      src={file.filepath}
                      alt={file.filename}
                      className="h-full w-full rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-2">
                      <FileIcon className="h-6 w-6 text-gray-400" />
                      <span className="mt-1 text-[10px] text-gray-400 truncate w-full text-center">
                        {file.filename.length > 12
                          ? file.filename.slice(0, 10) + "..."
                          : file.filename}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-md bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => insertFileReference(file)}
                      className="rounded-full bg-blue-600 p-1.5 text-white hover:bg-blue-700"
                      title="Insert into content"
                    >
                      <Link2 size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFileDelete(file.slotIndex)}
                      className="rounded-full bg-red-600 p-1.5 text-white hover:bg-red-700"
                      title="Delete file"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 rounded-b-md bg-black/70 px-1 py-0.5 text-[9px] text-gray-300 truncate">
                    {formatFileSize(file.size)}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Drag and drop files or click to upload. Max 10MB per file.
          </p>
        </div>
      )}

      {!note?.id && (
        <div className="rounded-lg border border-dashed border-gray-600 bg-gray-800/50 p-4 text-center text-sm text-gray-400">
          Save the note first to enable file attachments (10 slots available)
        </div>
      )}

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
              {Array.from({ length: folder.level }).map(() => "- ").join("")}
              {folder.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-white">Color</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-800"
          />
          <button
            type="button"
            onClick={() => setColor("#ffffff")}
            className="whitespace-nowrap rounded-lg border border-gray-700 px-3 py-2 text-xs text-gray-200 hover:bg-gray-800"
            title="Use folder theme background"
          >
            Use Folder Theme
          </button>
        </div>
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
        <label className="flex items-center gap-2 text-white">
          <input
            type="checkbox"
            checked={isFavorite}
            onChange={(e) => setIsFavorite(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Favorite</span>
        </label>
      </div>

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
          <img
            src={lightboxImage}
            alt="Lightbox preview"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
