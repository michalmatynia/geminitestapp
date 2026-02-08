'use client';

import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query';
import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';

import { useUndo } from '@/shared/hooks/use-undo';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type { 
  NoteWithRelations, 
  TagRecord, 
  NoteFileRecord, 
  ThemeRecord, 
  CategoryWithChildren,
  RelatedNote,
  NoteRelationWithTarget,
  NoteRelationWithSource
} from '@/shared/types/notes';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useNotesAppContext } from '../hooks/NotesAppContext';
import { useNoteSettings } from '../hooks/NoteSettingsContext';
import { useEditorMode } from '../hooks/useEditorMode';
import {
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useCreateNoteFileMutation,
  useDeleteNoteFileMutation,
} from '../hooks/useNoteData';
import { useNoteFileAttachments } from '../hooks/useNoteFileAttachments';
import { useNoteMetadata } from '../hooks/useNoteMetadata';
import { useNoteTags } from '../hooks/useNoteTags';
import { autoformatMarkdown } from '../utils';


// Hardcoded dark mode fallback theme - consistent with page styling
const FALLBACK_THEME = {
  id: 'fallback',
  name: 'Fallback Dark',
  createdAt: new Date(),
  updatedAt: new Date(),
  textColor: '#e5e7eb',                // gray-200
  backgroundColor: '#111827',          // gray-900
  markdownHeadingColor: '#ffffff',     // white
  markdownLinkColor: '#60a5fa',        // blue-400
  markdownCodeBackground: '#1f2937',   // gray-800
  markdownCodeText: '#e5e7eb',         // gray-200
  relatedNoteBorderWidth: 1,
  relatedNoteBorderColor: '#374151',   // gray-700
  relatedNoteBackgroundColor: '#1f2937', // gray-800
  relatedNoteTextColor: '#e5e7eb',     // gray-200
};

interface RelatedNoteItem {
  id: string;
  title: string;
  color: string | null;
  content: string;
}

export interface NoteFormContextValue {
  note: NoteWithRelations | null;
  content: string;
  setContent: (content: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  
  title: string;
  setTitle: (title: string) => void;
  color: string;
  setColor: (color: string) => void;
  isPinned: boolean;
  setIsPinned: (isPinned: boolean) => void;
  isArchived: boolean;
  setIsArchived: (isArchived: boolean) => void;
  isFavorite: boolean;
  setIsFavorite: (isFavorite: boolean) => void;
  getReadableTextColor: (bgColor: string) => string;

  editorMode: 'markdown' | 'wysiwyg' | 'code';
  setEditorMode: (mode: 'markdown' | 'wysiwyg' | 'code') => void;
  isEditorModeLocked: boolean;
  isMigrating: boolean;
  handleMigrateToWysiwyg: (content: string) => Promise<string | undefined>;
  handleMigrateToMarkdown: (content: string) => Promise<string | undefined>;

  noteFiles: NoteFileRecord[];
  uploadingSlots: Set<number>;
  addUploadingSlot: (slot: number) => void;
  removeUploadingSlot: (slot: number) => void;
  lightboxImage: string | null;
  setLightboxImage: (img: string | null) => void;
  isPasting: boolean;
  setIsPasting: (isPasting: boolean) => void;
  MAX_SLOTS: number;
  handleFileUpload: (slotIndex: number, file: File, helpers?: { reportProgress: (loaded: number, total?: number) => void }) => Promise<void>;
  handleMultiFileUpload: (files: FileList | File[], helpers?: { setProgress: (value: number) => void }) => Promise<void>;
  handleFileDelete: (slotIndex: number) => Promise<void>;
  insertFileReference: (file: NoteFileRecord) => void;
  getNextAvailableSlot: () => number | null;
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => Promise<void>;
  formatFileSize: (bytes: number) => string;
  isImageFile: (mimetype: string) => boolean;

  selectedTagIds: string[];
  tagInput: string;
  setTagInput: (input: string) => void;
  isTagDropdownOpen: boolean;
  setIsTagDropdownOpen: (open: boolean) => void;
  filteredTags: TagRecord[];
  handleAddTag: (tag: TagRecord) => void;
  handleCreateTag: () => Promise<void>;
  handleRemoveTag: (tagId: string) => void;

  selectedFolderId: string;
  setSelectedFolderId: (id: string) => void;
  flatFolders: Array<{ id: string; name: string; level: number }>;

  selectedRelatedNotes: RelatedNoteItem[];
  setSelectedRelatedNotes: React.Dispatch<React.SetStateAction<RelatedNoteItem[]>>;
  relatedNoteQuery: string;
  setRelatedNoteQuery: (query: string) => void;
  isRelatedDropdownOpen: boolean;
  setIsRelatedDropdownOpen: (open: boolean) => void;
  relatedNoteResults: NoteWithRelations[];
  isRelatedLoading: boolean;
  handleSelectRelatedNote: (noteId: string) => void;

  availableTags: TagRecord[];
  handleFilterByTag: (tagId: string) => void;
  setIsCreating: (val: boolean) => void;

  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  textColor: string;
  setTextColor: (color: string) => void;
  fontFamily: string;
  setFontFamily: (font: string) => void;
  
  editorWidth: number | null;
  setEditorWidth: (width: number | null | ((prev: number | null) => number | null)) => void;
  isDraggingSplitter: boolean;
  setIsDraggingSplitter: (isDragging: boolean) => void;
  editorSplitRef: React.RefObject<HTMLDivElement | null>;
  contentRef: React.RefObject<HTMLTextAreaElement | null>;

  effectiveTheme: ThemeRecord;
  contentBackground: string;
  contentTextColor: string;
  previewTypographyStyle: React.CSSProperties;
  
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}

const NoteFormContext = createContext<NoteFormContextValue | null>(null);

export function useNoteFormContext(): NoteFormContextValue {
  const context = useContext(NoteFormContext);
  if (!context) {
    throw new Error('useNoteFormContext must be used within NoteFormProvider');
  }
  return context;
}

export function NoteFormProvider({
  note = null,
  onSuccess,
  children
}: {
  note?: NoteWithRelations | null;
  onSuccess: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  const {
    folderTree,
    tags: availableTags,
    selectedNotebookId,
    selectedFolderId: defaultFolderId,
    selectedFolderTheme,
    selectedNoteTheme,
    fetchTags,
    handleSelectNoteFromTree,
    handleFilterByTag,
    setIsCreating,
  } = useNotesAppContext();
  
  const { settings } = useNoteSettings();
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
  } = useUndo(note?.content || '');

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
  } = useNoteMetadata(note);

  // Editor mode & migration
  const {
    editorMode,
    setEditorMode,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
  } = useEditorMode(note, settings.editorMode);

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
    selectedNotebookId,
    note?.notebookId,
    fetchTags
  );

  // Folder state
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    note?.categories[0]?.categoryId || defaultFolderId || ''
  );

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

  const flatFolders = useMemo(
    () => flattenFolderTree(folderTree),
    [folderTree, flattenFolderTree]
  );

  // Related notes logic
  const initialCombinedRelations = useMemo((): RelatedNoteItem[] => {
    if (!note) return [];
    return [
      ...(note.relations ?? []).map((rel: RelatedNote) => ({ id: rel.id, title: rel.title, color: rel.color ?? null, content: '' })),
      ...(note.relationsFrom ?? []).map((rel: NoteRelationWithTarget) => ({ id: rel.targetNote.id, title: rel.targetNote.title, color: rel.targetNote.color ?? null, content: '' })),
      ...(note.relationsTo ?? []).map((rel: NoteRelationWithSource) => ({ id: rel.sourceNote.id, title: rel.sourceNote.title, color: rel.sourceNote.color ?? null, content: '' })),
    ].filter((item: RelatedNoteItem, index: number, array: RelatedNoteItem[]) => array.findIndex((entry: RelatedNoteItem) => entry.id === item.id) === index);
  }, [note]);

  const [selectedRelatedNotes, setSelectedRelatedNotes] = useState<RelatedNoteItem[]>(initialCombinedRelations);

  const relatedNotesQueries = useQueries({
    queries: selectedRelatedNotes.map((rel: RelatedNoteItem) => ({
      queryKey: QUERY_KEYS.notes.detail(rel.id),
      queryFn: () => api.get<NoteWithRelations>(`/api/notes/${rel.id}`),
      staleTime: 1000 * 60 * 5,
    }))
  });

  useEffect(() => {
    const updated = selectedRelatedNotes.map((item: RelatedNoteItem, index: number) => {
      const q = relatedNotesQueries[index] as UseQueryResult<NoteWithRelations, Error>;
      if (q?.data) {
        return {
          ...item,
          content: q.data.content ?? '',
          title: q.data.title ?? item.title,
          color: q.data.color ?? item.color ?? null,
        };
      }
      return item;
    });
    if (JSON.stringify(updated) !== JSON.stringify(selectedRelatedNotes)) {
      setSelectedRelatedNotes(updated);
    }
  }, [relatedNotesQueries, selectedRelatedNotes]);

  const [relatedNoteQuery, setRelatedNoteQuery] = useState('');
  const [isRelatedDropdownOpen, setIsRelatedDropdownOpen] = useState(false);
  
  const [showPreview, setShowPreview] = useState(false);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('inherit');
  
  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const editorSplitRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const { data: relatedNoteResults = [], isFetching: isRelatedLoading } = useQuery({
    queryKey: QUERY_KEYS.notes.search(relatedNoteQuery),
    queryFn: async (): Promise<NoteWithRelations[]> => {
      if (!relatedNoteQuery) return [];
      const resolvedNotebookId = selectedNotebookId ?? note?.notebookId ?? null;
      return api.get<NoteWithRelations[]>('/api/notes', {
        params: {
          search: relatedNoteQuery,
          searchScope: 'title',
          ...(resolvedNotebookId ? { notebookId: resolvedNotebookId } : {}),
        }
      });
    },
    enabled: !!relatedNoteQuery,
  });

  const handleSelectRelatedNote = useCallback((noteId: string): void => {
    if (!note) {
      setIsCreating(false);
    }
    void handleSelectNoteFromTree(noteId);
  }, [note, setIsCreating, handleSelectNoteFromTree]);

  // Theme logic
  const resolvedFolderTheme = note ? selectedNoteTheme : selectedFolderTheme;
  const effectiveTheme = (resolvedFolderTheme ?? FALLBACK_THEME) as ThemeRecord;
  const hasCustomColor: boolean = color !== '#ffffff';
  const contentBackground: string = hasCustomColor
    ? color
    : effectiveTheme.backgroundColor;
  const contentTextColor: string = hasCustomColor
    ? getReadableTextColor(contentBackground)
    : effectiveTheme.textColor;
  
  const previewTypographyStyle: React.CSSProperties = useMemo((): React.CSSProperties => ({
    color: contentTextColor,
    ['--tw-prose-body' as never]: contentTextColor,
    ['--tw-prose-headings' as never]: effectiveTheme.markdownHeadingColor ?? contentTextColor,
    ['--tw-prose-lead' as never]: contentTextColor,
    ['--tw-prose-bold' as never]: contentTextColor,
    ['--tw-prose-counters' as never]: contentTextColor,
    ['--tw-prose-bullets' as never]: contentTextColor,
    ['--tw-prose-quotes' as never]: contentTextColor,
    ['--tw-prose-quote-borders' as never]: 'rgba(148, 163, 184, 0.35)',
    ['--tw-prose-hr' as never]: 'rgba(148, 163, 184, 0.35)',
    ['--note-link-color' as never]: effectiveTheme.markdownLinkColor,
    ['--note-code-bg' as never]: effectiveTheme.markdownCodeBackground,
    ['--note-code-text' as never]: effectiveTheme.markdownCodeText,
    ['--note-inline-code-bg' as never]: effectiveTheme.markdownCodeBackground,
  }), [contentTextColor, effectiveTheme]);

  // Mutations
  const createNoteMutation = useCreateNoteMutation();
  const updateNoteMutation = useUpdateNoteMutation();
  const createFileMutation = useCreateNoteFileMutation(note?.id);
  const deleteFileMutation = useDeleteNoteFileMutation(note?.id);

  const getNextAvailableSlot = useCallback((): number | null => {
    const usedSlots: Set<number> = new Set(noteFiles.map((f: NoteFileRecord): number => f.slotIndex));
    for (let i: number = 0; i < MAX_SLOTS; i++) {
      if (!usedSlots.has(i)) return i;
    }
    return null;
  }, [noteFiles, MAX_SLOTS]);

  const isImageFile = useCallback((mimetype: string): boolean => mimetype.startsWith('image/'), []);

  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  const handleFileUpload = async (
    slotIndex: number,
    file: File,
    helpers?: { reportProgress: (loaded: number, total?: number) => void }
  ): Promise<void> => {
    if (!note?.id) {
      toast('Please save the note first before uploading files');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast('File size exceeds 10MB limit');
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
      toast('File uploaded successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'NoteForm', action: 'uploadFile', noteId: note?.id, slotIndex } });
      const message = error instanceof Error ? error.message : 'Failed to upload file';
      toast(message);
    } finally {
      removeUploadingSlot(slotIndex);
    }
  };

  const handleFileDelete = async (slotIndex: number): Promise<void> => {
    if (!note?.id) return;

    try {
      await deleteFileMutation.mutateAsync(slotIndex);
      removeFile(noteFiles.find((f: NoteFileRecord): boolean => f.slotIndex === slotIndex)?.id || '');
      toast('File deleted successfully');
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'NoteForm', action: 'deleteFile', noteId: note?.id, slotIndex } });
      toast('Failed to delete file');
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>): Promise<void> => {
    const uploadPastedImage = async (file: File): Promise<void> => {
      if (!note?.id) {
        toast('Please save the note first before pasting images');
        return;
      }

      const nextSlot: number | null = getNextAvailableSlot();
      if (nextSlot === null) {
        toast('All file slots are full. Delete a file to paste a new image.');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast('Image size exceeds 10MB limit');
        return;
      }

      setIsPasting(true);
      addUploadingSlot(nextSlot);

      const textarea: HTMLTextAreaElement | null = contentRef.current;
      const cursorPosition: number = textarea?.selectionStart ?? content.length;

      try {
        const timestamp: number = Date.now();
        const extension: string = file.type.split('/')[1] || 'png';
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

        toast('Image pasted and uploaded');
      } catch (error) {
        logClientError(error, { context: { source: 'NoteForm', action: 'uploadPastedImage', noteId: note?.id } });
        toast('Failed to upload pasted image');
      } finally {
        setIsPasting(false);
        removeUploadingSlot(nextSlot);
      }
    };

    const pastedText: string | undefined = e.clipboardData?.getData('text/plain');
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
      if (item?.type.startsWith('image/')) {
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
      if (file?.type.startsWith('image/')) {
        e.preventDefault();
        await uploadPastedImage(file);
        return;
      }
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
        toast('All file slots are full. Delete a file to upload more.');
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

  const insertFileReference = useCallback((file: NoteFileRecord): void => {
    window.dispatchEvent(new CustomEvent('note-insert-file', { detail: file }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent): Promise<void> => {
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
        notebookId: selectedNotebookId ?? note?.notebookId ?? null,
      };

      if (note) {
        await updateNoteMutation.mutateAsync({ id: note.id, ...data });
      } else {
        await createNoteMutation.mutateAsync(data);
      }

      toast(note ? 'Note updated successfully' : 'Note created successfully');
      onSuccess();
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'NoteForm', action: 'saveNote', noteId: note?.id } });
      const message = error instanceof Error ? error.message : 'Failed to save note';
      toast(message, { variant: 'error' });
    }
  }, [
    title,
    content,
    note,
    editorMode,
    color,
    isPinned,
    isArchived,
    isFavorite,
    selectedTagIds,
    selectedRelatedNotes,
    selectedFolderId,
    selectedNotebookId,
    updateNoteMutation,
    createNoteMutation,
    toast,
    onSuccess
  ]);

  useEffect((): void => {
    if (note?.id) {
      resetHistory(note.content);
    }
  }, [note?.id, note?.content, resetHistory]);

  const value: NoteFormContextValue = useMemo(() => ({
    note,
    content,
    setContent,
    undo,
    redo,
    canUndo,
    canRedo,
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
    editorMode,
    setEditorMode,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
    noteFiles,
    uploadingSlots,
    addUploadingSlot,
    removeUploadingSlot,
    lightboxImage,
    setLightboxImage,
    isPasting,
    setIsPasting,
    MAX_SLOTS,
    handleFileUpload,
    handleMultiFileUpload,
    handleFileDelete,
    handlePaste,
    insertFileReference,
    getNextAvailableSlot,
    formatFileSize,
    isImageFile,
    selectedTagIds,
    tagInput,
    setTagInput,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    filteredTags,
    handleAddTag,
    handleCreateTag,
    handleRemoveTag,
    selectedFolderId,
    setSelectedFolderId,
    flatFolders,
    selectedRelatedNotes,
    setSelectedRelatedNotes,
    relatedNoteQuery,
    setRelatedNoteQuery,
    isRelatedDropdownOpen,
    setIsRelatedDropdownOpen,
    relatedNoteResults,
    isRelatedLoading,
    handleSelectRelatedNote,
    availableTags,
    handleFilterByTag,
    setIsCreating,
    showPreview,
    setShowPreview,
    textColor,
    setTextColor,
    fontFamily,
    setFontFamily,
    editorWidth,
    setEditorWidth,
    isDraggingSplitter,
    setIsDraggingSplitter,
    editorSplitRef,
    contentRef,
    effectiveTheme,
    contentBackground,
    contentTextColor,
    previewTypographyStyle,
    handleSubmit
  }), [
    note,
    content,
    setContent,
    undo,
    redo,
    canUndo,
    canRedo,
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
    editorMode,
    setEditorMode,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
    noteFiles,
    uploadingSlots,
    addUploadingSlot,
    removeUploadingSlot,
    lightboxImage,
    isPasting,
    setIsPasting,
    MAX_SLOTS,
    handleFileUpload,
    handleMultiFileUpload,
    handleFileDelete,
    handlePaste,
    insertFileReference,
    getNextAvailableSlot,
    formatFileSize,
    isImageFile,
    selectedTagIds,
    tagInput,
    setTagInput,
    isTagDropdownOpen,
    setIsTagDropdownOpen,
    filteredTags,
    handleAddTag,
    handleCreateTag,
    handleRemoveTag,
    selectedFolderId,
    setSelectedFolderId,
    flatFolders,
    selectedRelatedNotes,
    relatedNoteQuery,
    isRelatedDropdownOpen,
    relatedNoteResults,
    isRelatedLoading,
    handleSelectRelatedNote,
    availableTags,
    handleFilterByTag,
    setIsCreating,
    showPreview,
    setShowPreview,
    textColor,
    setTextColor,
    fontFamily,
    setFontFamily,
    editorWidth,
    setEditorWidth,
    isDraggingSplitter,
    setIsDraggingSplitter,
    editorSplitRef,
    contentRef,
    effectiveTheme,
    contentBackground,
    contentTextColor,
    previewTypographyStyle,
    handleSubmit
  ]);

  return (
    <NoteFormContext.Provider value={value}>
      {children}
    </NoteFormContext.Provider>
  );
}