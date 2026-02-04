"use client";

import { Button, useToast, Input, Label } from "@/shared/ui";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { CategoryWithChildren, NoteWithRelations, NoteFileRecord, TagRecord, ThemeRecord } from "@/shared/types/notes";
import type { NoteFormProps } from "@/features/notesapp/types/notes-ui";
import { useQuery, useQueries, UseQueryResult } from "@tanstack/react-query";
import { logClientError } from "@/features/observability";

import { autoformatMarkdown } from "../utils";
import { useUndo } from "@/shared/hooks/use-undo";
import { useNoteMetadata } from "../hooks/useNoteMetadata";
import { useEditorMode } from "../hooks/useEditorMode";
import { useNoteFileAttachments } from "../hooks/useNoteFileAttachments";
import { useNoteTags } from "../hooks/useNoteTags";
import { useNoteSettings } from "@/features/notesapp/hooks/NoteSettingsContext";
import { MarkdownToolbar } from "./editor/MarkdownToolbar";
import { FileAttachments } from "./editor/FileAttachments";
import { NoteMetadata } from "./editor/NoteMetadata";
import { MarkdownEditor } from "./editor/MarkdownEditor";
import { WysiwygEditor } from "./editor/WysiwygEditor";
import {
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useCreateNoteFileMutation,
  useDeleteNoteFileMutation,
} from "../hooks/useNoteData";

// Hardcoded dark mode fallback theme - consistent with page styling
const FALLBACK_THEME = {
  id: "fallback",
  name: "Fallback Dark",
  createdAt: new Date(),
  updatedAt: new Date(),
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

interface RelatedNoteItem {
  id: string;
  title: string;
  color: string | null;
  content: string;
}

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
  formRef,
}: NoteFormProps & { formRef?: React.RefObject<HTMLFormElement | null> }): React.JSX.Element {
  const { toast } = useToast();
  
  // Content & undo/redo
  const {
    state: content,
    setState: setContent,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useUndo(note?.content || "");

  // Note metadata (title, color, status)
  const {
    title,
    setTitle,
    color,
    setColor,
    isPinned,
    setIsPinned,
    isArchived,
    setIsArchived,
    isFavorite,
    setIsFavorite,
    getReadableTextColor,
  } = useNoteMetadata(note ?? null);

  // Editor mode & migration
  const {
    editorMode,
    setEditorMode: handleEditorModeChange,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
  } = useEditorMode(note ?? null, useNoteSettings().settings.editorMode);

  // File attachments
  const {
    noteFiles,
    setNoteFiles,
    uploadingSlots,
    addUploadingSlot,
    removeUploadingSlot,
    lightboxImage,
    openLightbox,
    closeLightbox,
    isPasting,
    setIsPasting,
    MAX_SLOTS,
    removeFile,
  } = useNoteFileAttachments(note?.files);

  const setLightboxImage = (imgSrc: string | null): void => {
    if (imgSrc) {
      openLightbox(imgSrc);
    } else {
      closeLightbox();
    }
  };

  // Mutations
  const createNoteMutation = useCreateNoteMutation();
  const updateNoteMutation = useUpdateNoteMutation();
  const createFileMutation = useCreateNoteFileMutation(note?.id);
  const deleteFileMutation = useDeleteNoteFileMutation(note?.id);

  // Tags
  const {
    selectedTagIds,
    tagInput,
    setTagInput,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    filteredTags,
    handleAddTag,
    handleCreateTag,
    handleRemoveTag,
  } = useNoteTags(
    note?.tags.map((t: { tagId: string; tag: TagRecord }): string => t.tagId) || [],
    availableTags,
    notebookId,
    note?.notebookId,
    onTagCreated
  );

  // Remaining UI state
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    note?.categories[0]?.categoryId || defaultFolderId || ""
  );
  
  // Hydrate related notes
  const initialCombinedRelations = useMemo((): RelatedNoteItem[] => {
    if (!note) return [];
    return [
      ...(note.relations ?? []).map((rel: import("@/shared/types/notes").RelatedNote) => ({ id: rel.id, title: rel.title, color: rel.color ?? null, content: "" })),
      ...(note.relationsFrom ?? []).map((rel: import("@/shared/types/notes").NoteRelationWithTarget) => ({ id: rel.targetNote.id, title: rel.targetNote.title, color: rel.targetNote.color ?? null, content: "" })),
      ...(note.relationsTo ?? []).map((rel: import("@/shared/types/notes").NoteRelationWithSource) => ({ id: rel.sourceNote.id, title: rel.sourceNote.title, color: rel.sourceNote.color ?? null, content: "" })),
    ].filter((item: RelatedNoteItem, index: number, array: RelatedNoteItem[]) => array.findIndex((entry: RelatedNoteItem) => entry.id === item.id) === index);
  }, [note]);

  const [selectedRelatedNotes, setSelectedRelatedNotes] = useState<RelatedNoteItem[]>(initialCombinedRelations);

  const relatedNotesQueries = useQueries({
    queries: selectedRelatedNotes.map((rel: RelatedNoteItem) => ({
      queryKey: ["notes", rel.id],
      queryFn: async (): Promise<NoteWithRelations> => {
        const res = await fetch(`/api/notes/${rel.id}`);
        if (!res.ok) throw new Error("Failed to fetch related note");
        return res.json() as Promise<NoteWithRelations>;
      },
      staleTime: 1000 * 60 * 5,
    }))
  });

  useEffect(() => {
    const updated = selectedRelatedNotes.map((item: RelatedNoteItem, index: number) => {
      const q = relatedNotesQueries[index] as UseQueryResult<NoteWithRelations, Error>;
      if (q?.data) {
        return {
          ...item,
          content: q.data.content ?? "",
          title: q.data.title ?? item.title,
          color: q.data.color ?? item.color ?? null,
        };
      }
      return item;
    });
    // Only update if something actually changed to avoid infinite loop
    if (JSON.stringify(updated) !== JSON.stringify(selectedRelatedNotes)) {
      setSelectedRelatedNotes(updated);
    }
  }, [relatedNotesQueries, selectedRelatedNotes]);

  const [relatedNoteQuery, setRelatedNoteQuery] = useState("");
  const [isRelatedDropdownOpen, setIsRelatedDropdownOpen] = useState(false);
  
  const { data: relatedNoteResults = [], isFetching: isRelatedLoading } = useQuery({
    queryKey: ["notes-search", { query: relatedNoteQuery, notebookId }],
    queryFn: async (): Promise<NoteWithRelations[]> => {
      if (!relatedNoteQuery) return [];
      const params = new URLSearchParams({
        search: relatedNoteQuery,
        searchScope: "title",
      });
      const resolvedNotebookId = notebookId ?? note?.notebookId ?? null;
      if (resolvedNotebookId) params.append("notebookId", resolvedNotebookId);
      const res = await fetch(`/api/notes?${params.toString()}`);
      if (!res.ok) return [];
      return res.json() as Promise<NoteWithRelations[]>;
    },
    enabled: !!relatedNoteQuery,
  });

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [textColor, _setTextColor] = useState("#ffffff");
  const [fontFamily, _setFontFamily] = useState("inherit");
  const [showPreview, setShowPreview] = useState(false);
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const editorSplitRef = useRef<HTMLDivElement>(null);
  const { settings } = useNoteSettings();

  // Sync undo history when note changes
  useEffect((): void => {
    if (note?.id) {
      resetHistory(note.content);
    }
  }, [note?.id, note?.content, resetHistory]);

  // Use provided theme or fall back to dark mode theme
  const effectiveTheme = (folderTheme ?? FALLBACK_THEME) as ThemeRecord;
  const hasCustomColor: boolean = color !== "#ffffff";
  const contentBackground: string = hasCustomColor
    ? color
    : effectiveTheme.backgroundColor;
  const contentTextColor: string = hasCustomColor
    ? getReadableTextColor(contentBackground)
    : effectiveTheme.textColor;
  
  const previewTypographyStyle: React.CSSProperties = useMemo((): React.CSSProperties => ({
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
    level: number = 0
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

  const flatFolders: { id: string; name: string; level: number }[] = useMemo(
    (): { id: string; name: string; level: number }[] => flattenFolderTree(folderTree),
    [folderTree, flattenFolderTree]
  );

  const applyWrap = (prefix: string, suffix: string, placeholder: string): void => {
    const textarea: HTMLTextAreaElement | null = contentRef.current;
    if (!textarea) return;
    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;
    const selected: string = content.slice(start, end) || placeholder;
    const nextValue: string =
      content.slice(0, start) + prefix + selected + suffix + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      const cursor: number = start + prefix.length + selected.length + suffix.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const insertAtCursor = (value: string): void => {
    const textarea: HTMLTextAreaElement | null = contentRef.current;
    if (!textarea) return;
    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;
    const nextValue: string = content.slice(0, start) + value + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      const cursor: number = start + value.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const applyLinePrefix = (prefix: string): void => {
    const textarea: HTMLTextAreaElement | null = contentRef.current;
    if (!textarea) return;
    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;
    const blockStart: number = content.lastIndexOf("\n", start - 1) + 1;
    const blockEndIndex: number = content.indexOf("\n", end);
    const blockEnd: number = blockEndIndex === -1 ? content.length : blockEndIndex;
    const block: string = content.slice(blockStart, blockEnd);
    const updated: string = block
      .split(/\r?\n/)
      .map((line: string): string => (line.trim().length ? `${prefix}${line}` : line))
      .join("\n");
    const nextValue: string = content.slice(0, blockStart) + updated + content.slice(blockEnd);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  };

  const applySpanStyle = (colorValue: string, fontValue: string): void => {
    const textarea: HTMLTextAreaElement | null = contentRef.current;
    if (!textarea) return;
    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;
    const selected: string = content.slice(start, end);
    const styleParts: string[] = [];
    if (colorValue) {
      styleParts.push(`color: ${colorValue}`);
    }
    if (fontValue && fontValue !== "inherit") {
      styleParts.push(`font-family: ${fontValue}`);
    }
    const styleAttribute: string = styleParts.length > 0 ? ` style=\" ${styleParts.join("; ")}\"` : "";
    const openingTag: string = `<span${styleAttribute}>`;
    const closingTag: string = "</span>";
    const wrapped: string = `${openingTag}${selected}${closingTag}`;
    const nextValue:
      string =
      content.slice(0, start) + wrapped + content.slice(end);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      const cursor: number = selected.length > 0 
        ? start + wrapped.length 
        : start + openingTag.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });
  };

  const applyBulletList = (): void => {
    const textarea: HTMLTextAreaElement | null = contentRef.current;
    if (!textarea) return;
    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;

    if (start === end) {
      const insert: string = "- ";
      const nextValue: string = content.slice(0, start) + insert + content.slice(end);
      setContent(nextValue);
      requestAnimationFrame((): void => {
        const cursor: number = start + insert.length;
        textarea.focus();
        textarea.setSelectionRange(cursor, cursor);
      });
      return;
    }

    const blockStart: number = content.lastIndexOf("\n", start - 1) + 1;
    const blockEndIndex: number = content.indexOf("\n", end);
    const blockEnd: number = blockEndIndex === -1 ? content.length : blockEndIndex;
    const block: string = content.slice(blockStart, blockEnd);
    const updated: string = block
      .split(/\r?\n/)
      .map((line: string): string => (line.trim().startsWith("- ") ? line : `- ${line}`))
      .join("\n");
    const nextValue: string = content.slice(0, blockStart) + updated + content.slice(blockEnd);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  };

  const applyChecklist = (): void => {
    const textarea: HTMLTextAreaElement | null = contentRef.current;
    if (!textarea) return;
    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;
    const blockStart: number = content.lastIndexOf("\n", start - 1) + 1;
    const blockEndIndex: number = content.indexOf("\n", end);
    const blockEnd: number = blockEndIndex === -1 ? content.length : blockEndIndex;
    const block: string = content.slice(blockStart, blockEnd);
    const updated: string = block
      .split(/\r?\n/)
      .map((line: string): string => (line.trim().startsWith("- [") ? line : `- [ ] ${line}`))
      .join("\n");
    const nextValue: string = content.slice(0, blockStart) + updated + content.slice(blockEnd);
    setContent(nextValue);
    requestAnimationFrame((): void => {
      textarea.focus();
      textarea.setSelectionRange(blockStart, blockStart + updated.length);
    });
  };

  const handleFileUpload = async (
    slotIndex: number,
    file: File,
    helpers?: { reportProgress: (loaded: number, total?: number) => void }
  ): Promise<void> => {
    if (!note?.id) {
      toast("Please save the note first before uploading files");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast("File size exceeds 10MB limit");
      return;
    }

    addUploadingSlot(slotIndex);

    try {
      const newFile = await createFileMutation.mutateAsync({
        slotIndex,
        file,
        onProgress: (loaded: number, total?: number) => helpers?.reportProgress(loaded, total),
      });
      setNoteFiles((prev: NoteFileRecord[]): NoteFileRecord[] => [...prev.filter((f: NoteFileRecord): boolean => f.slotIndex !== slotIndex), newFile].sort((a: NoteFileRecord, b: NoteFileRecord): number => a.slotIndex - b.slotIndex));
      toast("File uploaded successfully");
    } catch (error: unknown) {
      logClientError(error, { context: { source: "NoteForm", action: "uploadFile", noteId: note?.id, slotIndex } });
      const message = error instanceof Error ? error.message : "Failed to upload file";
      toast(message);
    } finally {
      removeUploadingSlot(slotIndex);
    }
  };

  const handleFileDelete = async (slotIndex: number): Promise<void> => {
    if (!note?.id) return;

    try {
      await deleteFileMutation.mutateAsync(slotIndex);
      removeFile(noteFiles.find((f: NoteFileRecord): boolean => f.slotIndex === slotIndex)?.id || "");
      toast("File deleted successfully");
    } catch (error: unknown) {
      logClientError(error, { context: { source: "NoteForm", action: "deleteFile", noteId: note?.id, slotIndex } });
      toast("Failed to delete file");
    }
  };

  const handleMultiFileUpload = async (
    files: FileList | File[],
    helpers?: { setProgress: (value: number) => void }
  ): Promise<void> => {
    const queue: File[] = Array.from(files);
    for (let index = 0; index < queue.length; index += 1) {
      const file = queue[index]!;
      const nextSlot: number | null = getNextAvailableSlot();
      if (nextSlot === null) {
        toast("All file slots are full. Delete a file to upload more.");
        return;
      }
      await handleFileUpload(nextSlot, file, {
        reportProgress: (loaded: number, total?: number) => {
          if (!helpers || !total) return;
          const pct = Math.min(100, Math.max(0, Math.round((loaded / total) * 100)));
          const combined = Math.round(((index + pct / 100) / queue.length) * 100);
          helpers.setProgress(combined);
        },
      });
    }
  };

  const isImageFile = (mimetype: string): boolean => mimetype.startsWith("image/");

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const insertFileReference = (file: NoteFileRecord): void => {
    const textarea: HTMLTextAreaElement | null = contentRef.current;
    if (!textarea) return;

    const isImage: boolean = isImageFile(file.mimetype);
    const altText: string = file.filename.replace(/^slot-\d+-\d+-/, "");
    const reference: string = isImage
      ? `![${altText}](${file.filepath})`
      : `[${altText}](${file.filepath})`;

    const start: number = textarea.selectionStart;
    const end: number = textarea.selectionEnd;
    const nextValue: string = content.slice(0, start) + reference + content.slice(end);
    setContent(nextValue);

    requestAnimationFrame((): void => {
      const cursor: number = start + reference.length;
      textarea.focus();
      textarea.setSelectionRange(cursor, cursor);
    });

    toast(isImage ? "Image reference inserted" : "File link inserted");
  };

  const getNextAvailableSlot = (): number | null => {
    const usedSlots: Set<number> = new Set(noteFiles.map((f: NoteFileRecord): number => f.slotIndex));
    for (let i: number = 0; i < MAX_SLOTS; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return null;
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>): Promise<void> => {
    const uploadPastedImage = async (file: File): Promise<void> => {
      if (!note?.id) {
        toast("Please save the note first before pasting images");
        return;
      }

      const nextSlot: number | null = getNextAvailableSlot();
      if (nextSlot === null) {
        toast("All file slots are full. Delete a file to paste a new image.");
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast("Image size exceeds 10MB limit");
        return;
      }

      setIsPasting(true);
      addUploadingSlot(nextSlot);

      const textarea: HTMLTextAreaElement | null = contentRef.current;
      const cursorPosition: number = textarea?.selectionStart ?? content.length;

      try {
        const timestamp: number = Date.now();
        const extension: string = file.type.split("/")[1] || "png";
        const renamedFile: File = new File([file], `pasted-image-${timestamp}.${extension}`, {
          type: file.type,
        });
        
        const newFile = await createFileMutation.mutateAsync({ slotIndex: nextSlot, file: renamedFile });
        
        setNoteFiles((prev: NoteFileRecord[]): NoteFileRecord[] =>
          [...prev.filter((f: NoteFileRecord): boolean => f.slotIndex !== nextSlot), newFile].sort(
            (a: NoteFileRecord, b: NoteFileRecord): number => a.slotIndex - b.slotIndex
          )
        );

        const altText: string = renamedFile.name;
        const reference: string = `![${altText}](${newFile.filepath})`;
        const nextValue:
          string =
          content.slice(0, cursorPosition) + reference + content.slice(cursorPosition);
        setContent(nextValue);

        toast("Image pasted and uploaded");
      } catch (error) {
        logClientError(error, { context: { source: "NoteForm", action: "uploadPastedImage", noteId: note?.id } });
        toast("Failed to upload pasted image");
      } finally {
        setIsPasting(false);
        removeUploadingSlot(nextSlot);
      }
    };

    const pastedText: string | undefined = e.clipboardData?.getData("text/plain");
    if (pastedText) {
      if (settings.autoformatOnPaste) {
        e.preventDefault();
        const formattedText: string = autoformatMarkdown(pastedText);
        const textarea: HTMLTextAreaElement | null = contentRef.current;
        const selectionStart: number = textarea?.selectionStart ?? content.length;
        const selectionEnd: number = textarea?.selectionEnd ?? content.length;
        const newContent:
          string =
          content.slice(0, selectionStart) +
          formattedText +
          content.slice(selectionEnd);
        setContent(newContent);
        // Set cursor position after the inserted text
        setTimeout((): void => {
          if (textarea) {
            const newPosition: number = selectionStart + formattedText.length;
            textarea.selectionStart = newPosition;
            textarea.selectionEnd = newPosition;
            textarea.focus();
          }
        }, 0);
      }
      return;
    }

    const items: DataTransferItemList | undefined = e.clipboardData?.items;
    if (!items) return;

    for (let i: number = 0; i < items.length; i++) {
      const item: DataTransferItem | null = items[i] ?? null;
      if (item && item.type.startsWith("image/")) {
        e.preventDefault();
        const file: File | null = item.getAsFile();
        if (!file) return;
        await uploadPastedImage(file);
        return;
      }
    }

    const pastedFiles: FileList | undefined = e.clipboardData?.files;
    if (pastedFiles && pastedFiles.length > 0) {
      const file: File | null = pastedFiles[0] ?? null;
      if (file && file.type.startsWith("image/")) {
        e.preventDefault();
        await uploadPastedImage(file);
        return;
      }
    }
  };

  useEffect((): void => {
    setNoteFiles(note?.files || []);
  }, [note?.files, setNoteFiles]);

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title || !content) return;

    try {
      const data = {
        title,
        content,
        ...(note ? {} : { editorType: editorMode }),
        color: color.toLowerCase().trim(),
        isPinned,
        isArchived,
        isFavorite,
        tagIds: selectedTagIds,
        relatedNoteIds: selectedRelatedNotes.map((rel: { id: string }): string => rel.id),
        categoryIds: selectedFolderId ? [selectedFolderId] : [],
        notebookId: notebookId ?? note?.notebookId ?? null,
      };

      if (note) {
        await updateNoteMutation.mutateAsync({ id: note.id, ...data });
      } else {
        await createNoteMutation.mutateAsync(data);
      }

      toast(note ? "Note updated successfully" : "Note created successfully");
      onSuccess();
    } catch (error: unknown) {
      logClientError(error, { context: { source: "NoteForm", action: "saveNote", noteId: note?.id } });
      const message = error instanceof Error ? error.message : "Failed to save note";
      toast(message, { variant: "error" });
    }
  };

  return (
    <>
          <form
            id={note ? "note-edit-form" : undefined}
            ref={formRef}
            onSubmit={(e: React.FormEvent): void => { void handleSubmit(e); }}
            className="space-y-4"
          >      

      <div>
        <Label className="mb-2 block text-sm font-medium text-white">
          Title
        </Label>
        <Input
          type="text"
          placeholder="Enter note title"
          value={title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setTitle(e.target.value)}
          className="w-full rounded-lg border bg-gray-800 px-4 py-2 text-white text-lg font-semibold placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
          required
        />
      </div>

      <div>
        <Label className="mb-2 block text-sm font-medium text-white">
          Content
        </Label>
        <MarkdownToolbar
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          noteFiles={noteFiles}
          textColor={textColor}
          setTextColor={_setTextColor}
          fontFamily={fontFamily}
          setFontFamily={_setFontFamily}
          showPreview={showPreview}
          setShowPreview={setShowPreview}
          onApplyWrap={applyWrap}
          onApplyLinePrefix={applyLinePrefix}
          onInsertAtCursor={insertAtCursor}
          onApplyBulletList={applyBulletList}
          onApplyChecklist={applyChecklist}
          onApplySpanStyle={applySpanStyle}
          onInsertFileReference={insertFileReference}
          editorMode={editorMode}
                      onEditorModeChange={handleEditorModeChange}
                      isEditorModeLocked={isEditorModeLocked}
                      isMigrating={isMigrating}
                      onMigrateToWysiwyg={(): void => { void handleMigrateToWysiwyg(content); }}
                      onMigrateToMarkdown={(): void => { void handleMigrateToMarkdown(content); }}
                    />        {editorMode === "markdown" || editorMode === "code" ? (
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
            isCodeMode={editorMode === "code"}
          />
        ) : (
          <WysiwygEditor
            content={content}
            setContent={setContent}
            contentBackground={contentBackground}
            contentTextColor={contentTextColor}
          />
        )}
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
          onClick={(): void => closeLightbox()}
        >
          <Button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
            onClick={(): void => closeLightbox()}
          >
            <X size={24} />
          </Button>
          <div
            className="relative h-[90vh] w-[90vw] max-h-[90vh] max-w-[90vw]"
            onClick={(e: React.MouseEvent): void => e.stopPropagation()}
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
