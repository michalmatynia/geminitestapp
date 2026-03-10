'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import type { NoteWithRelations, TagRecord } from '@/shared/contracts/notes';
import { useUndo } from '@/shared/hooks/ui/use-undo';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { useNotesAppActions, useNotesAppState } from '../hooks/NotesAppContext';
import { useNoteSettingsState } from '../hooks/NoteSettingsContext';
import { useEditorMode } from '../hooks/useEditorMode';
import {
  useCreateNoteMutation,
  useUpdateNoteMutation,
  useCreateNoteFileMutation,
  useDeleteNoteFileMutation,
} from '../hooks/useNoteData';
import { useNoteFileAttachments } from '../hooks/useNoteFileAttachments';
import { useNoteFormDerivedState } from '../hooks/useNoteFormDerivedState';
import { useNoteFormFiles } from '../hooks/useNoteFormFiles';
import { useNoteMetadata } from '../hooks/useNoteMetadata';
import { useNoteTags } from '../hooks/useNoteTags';
import { NoteContentContext, type NoteContentData } from './note-form/NoteContentContext';
import { NoteEditorContext, type NoteEditorData } from './note-form/NoteEditorContext';
import { NoteFilesContext, type NoteFilesData } from './note-form/NoteFilesContext';
import { NoteFoldersContext, type NoteFoldersData } from './note-form/NoteFoldersContext';
import {
  NoteFormRuntimeContext,
  type NoteFormRuntimeData,
} from './note-form/NoteFormRuntimeContext';
import { NoteMetadataContext, type NoteMetadataData } from './note-form/NoteMetadataContext';
import {
  NoteRelationsContext,
  type NoteRelationsData,
} from './note-form/NoteRelationsContext';
import { NoteTagsContext, type NoteTagsData } from './note-form/NoteTagsContext';

export {
  useNoteFormRuntime,
  useNoteContentContext,
  useNoteMetadataContext,
  useNoteEditorContext,
  useNoteFilesContext,
  useNoteTagsContext,
  useNoteFoldersContext,
  useNoteRelationsContext,
} from './NoteFormContext.hooks';

export function NoteFormProvider({
  note = null,
  onSuccess,
  children,
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
  } = useNotesAppState();
  const { fetchTags, handleSelectNoteFromTree, handleFilterByTag, setIsCreating } =
    useNotesAppActions();

  const { settings } = useNoteSettingsState();
  const { toast } = useToast();

  const {
    state: content,
    setState: setContent,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useUndo(note?.content || '');

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

  const {
    editorMode,
    setEditorMode,
    isEditorModeLocked,
    isMigrating,
    handleMigrateToWysiwyg,
    handleMigrateToMarkdown,
  } = useEditorMode(note, settings.editorMode);

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
    note?.tags?.map((t: { tagId: string; tag: TagRecord }): string => t.tagId) || [],
    availableTags,
    selectedNotebookId,
    note?.notebookId,
    fetchTags
  );

  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    note?.categories?.[0]?.categoryId || defaultFolderId || ''
  );
  const {
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
    effectiveTheme,
    contentBackground,
    contentTextColor,
    previewTypographyStyle,
  } = useNoteFormDerivedState({
    color,
    folderTree,
    getReadableTextColor,
    handleSelectNoteFromTree,
    note,
    selectedFolderTheme,
    selectedNoteTheme,
    selectedNotebookId,
    setIsCreating,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [textColor, setTextColor] = useState('#ffffff');
  const [fontFamily, setFontFamily] = useState('inherit');

  const [editorWidth, setEditorWidth] = useState<number | null>(null);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState(false);
  const editorSplitRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const createNoteMutation = useCreateNoteMutation();
  const updateNoteMutation = useUpdateNoteMutation();
  const createFileMutation = useCreateNoteFileMutation(note?.id);
  const deleteFileMutation = useDeleteNoteFileMutation(note?.id);
  const {
    getNextAvailableSlot,
    isImageFile,
    formatFileSize,
    handleFileUpload,
    handleFileDelete,
    handlePaste,
    handleMultiFileUpload,
    insertFileReference,
  } = useNoteFormFiles({
    addUploadingSlot,
    content,
    contentRef,
    createFile: createFileMutation.mutateAsync,
    deleteFile: deleteFileMutation.mutateAsync,
    maxSlots: MAX_SLOTS,
    noteFiles,
    noteId: note?.id,
    removeFile,
    removeUploadingSlot,
    setContent,
    setIsPasting,
    setNoteFiles,
    settingsAutoformatOnPaste: settings.autoformatOnPaste,
    toast,
  });

  const handleSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      if (!title || !content) return;

      try {
        const baseData = {
          title,
          content,
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
          await updateNoteMutation.mutateAsync({ id: note.id, ...baseData });
        } else {
          await createNoteMutation.mutateAsync({
            ...baseData,
            editorType: editorMode,
          });
        }

        toast(note ? 'Note updated successfully' : 'Note created successfully');
        onSuccess();
      } catch (error: unknown) {
        logClientError(error, {
          context: { source: 'NoteForm', action: 'saveNote', noteId: note?.id },
        });
        const message = error instanceof Error ? error.message : 'Failed to save note';
        toast(message, { variant: 'error' });
      }
    },
    [
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
      onSuccess,
    ]
  );

  useEffect((): void => {
    if (note?.id) {
      resetHistory(note.content);
    }
  }, [note?.id, note?.content, resetHistory]);

  const contentValue = useMemo<NoteContentData>(
    () => ({
      content,
      setContent,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [content, setContent, undo, redo, canUndo, canRedo]
  );

  const metadataValue = useMemo<NoteMetadataData>(
    () => ({
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
    }),
    [title, setTitle, color, setColor, isPinned, isArchived, isFavorite, getReadableTextColor]
  );

  const editorValue = useMemo<NoteEditorData>(
    () => ({
      editorMode,
      setEditorMode,
      isEditorModeLocked,
      isMigrating,
      handleMigrateToWysiwyg,
      handleMigrateToMarkdown,
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
    }),
    [
      editorMode,
      setEditorMode,
      isEditorModeLocked,
      isMigrating,
      handleMigrateToWysiwyg,
      handleMigrateToMarkdown,
      showPreview,
      setShowPreview,
      textColor,
      setTextColor,
      fontFamily,
      setFontFamily,
      editorWidth,
      setEditorWidth,
      isDraggingSplitter,
      effectiveTheme,
      contentBackground,
      contentTextColor,
      previewTypographyStyle,
    ]
  );

  const filesValue = useMemo<NoteFilesData>(
    () => ({
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
      insertFileReference,
      getNextAvailableSlot,
      handlePaste,
      formatFileSize,
      isImageFile,
    }),
    [
      noteFiles,
      uploadingSlots,
      addUploadingSlot,
      removeUploadingSlot,
      lightboxImage,
      isPasting,
      MAX_SLOTS,
      handleFileUpload,
      handleMultiFileUpload,
      handleFileDelete,
      insertFileReference,
      getNextAvailableSlot,
      handlePaste,
      formatFileSize,
      isImageFile,
    ]
  );

  const tagsValue = useMemo<NoteTagsData>(
    () => ({
      selectedTagIds,
      tagInput,
      setTagInput,
      isTagDropdownOpen,
      setIsTagDropdownOpen,
      filteredTags,
      handleAddTag,
      handleCreateTag,
      handleRemoveTag,
      availableTags,
      handleFilterByTag,
    }),
    [
      selectedTagIds,
      tagInput,
      isTagDropdownOpen,
      filteredTags,
      handleAddTag,
      handleCreateTag,
      handleRemoveTag,
      availableTags,
      handleFilterByTag,
    ]
  );

  const foldersValue = useMemo<NoteFoldersData>(
    () => ({
      selectedFolderId,
      setSelectedFolderId,
      flatFolders,
    }),
    [selectedFolderId, setSelectedFolderId, flatFolders]
  );

  const relationsValue = useMemo<NoteRelationsData>(
    () => ({
      selectedRelatedNotes,
      setSelectedRelatedNotes,
      relatedNoteQuery,
      setRelatedNoteQuery,
      isRelatedDropdownOpen,
      setIsRelatedDropdownOpen,
      relatedNoteResults,
      isRelatedLoading,
      handleSelectRelatedNote,
    }),
    [
      selectedRelatedNotes,
      relatedNoteQuery,
      isRelatedDropdownOpen,
      relatedNoteResults,
      isRelatedLoading,
      handleSelectRelatedNote,
    ]
  );

  const runtimeValue = useMemo<NoteFormRuntimeData>(
    () => ({
      note,
      setIsCreating,
      handleSubmit,
    }),
    [note, setIsCreating, handleSubmit]
  );

  return (
    <NoteContentContext.Provider value={contentValue}>
      <NoteMetadataContext.Provider value={metadataValue}>
        <NoteEditorContext.Provider value={editorValue}>
          <NoteFilesContext.Provider value={filesValue}>
            <NoteTagsContext.Provider value={tagsValue}>
              <NoteFoldersContext.Provider value={foldersValue}>
                <NoteRelationsContext.Provider value={relationsValue}>
                  <NoteFormRuntimeContext.Provider value={runtimeValue}>
                    {children}
                  </NoteFormRuntimeContext.Provider>
                </NoteRelationsContext.Provider>
              </NoteFoldersContext.Provider>
            </NoteTagsContext.Provider>
          </NoteFilesContext.Provider>
        </NoteEditorContext.Provider>
      </NoteMetadataContext.Provider>
    </NoteContentContext.Provider>
  );
}
