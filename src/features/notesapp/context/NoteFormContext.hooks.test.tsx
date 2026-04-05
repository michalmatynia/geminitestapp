// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  useNoteContentContext,
  useNoteEditorContext,
  useNoteFilesContext,
  useNoteFoldersContext,
  useNoteMetadataContext,
  useNoteRelationsContext,
  useNoteTagsContext,
} from './NoteFormContext.hooks';
import { NoteContentContext } from './note-form/NoteContentContext';
import { NoteEditorContext } from './note-form/NoteEditorContext';
import { NoteFilesContext } from './note-form/NoteFilesContext';
import { NoteFoldersContext } from './note-form/NoteFoldersContext';
import { NoteMetadataContext } from './note-form/NoteMetadataContext';
import { NoteRelationsContext } from './note-form/NoteRelationsContext';
import { NoteTagsContext } from './note-form/NoteTagsContext';

function buildWrapper(children: React.ReactNode): React.JSX.Element {
  return (
    <NoteContentContext.Provider
      value={{
        canRedo: false,
        canUndo: false,
        content: '',
        redo: vi.fn(),
        setContent: vi.fn(),
        undo: vi.fn(),
      }}
    >
      <NoteMetadataContext.Provider
        value={{
          color: '#fff',
          getReadableTextColor: vi.fn(() => '#000'),
          isArchived: false,
          isFavorite: false,
          isPinned: false,
          setColor: vi.fn(),
          setIsArchived: vi.fn(),
          setIsFavorite: vi.fn(),
          setIsPinned: vi.fn(),
          setTitle: vi.fn(),
          title: 'Note',
        }}
      >
        <NoteEditorContext.Provider
          value={{
            contentBackground: '#fff',
            contentRef: { current: null },
            contentTextColor: '#000',
            editorMode: 'markdown',
            editorSplitRef: { current: null },
            editorWidth: null,
            effectiveTheme: {} as never,
            fontFamily: 'sans',
            handleMigrateToMarkdown: vi.fn(),
            handleMigrateToWysiwyg: vi.fn(),
            isDraggingSplitter: false,
            isEditorModeLocked: false,
            isMigrating: false,
            previewTypographyStyle: {},
            setEditorMode: vi.fn(),
            setEditorWidth: vi.fn(),
            setFontFamily: vi.fn(),
            setIsDraggingSplitter: vi.fn(),
            setShowPreview: vi.fn(),
            setTextColor: vi.fn(),
            showPreview: false,
            textColor: '#000',
          }}
        >
          <NoteFilesContext.Provider
            value={{
              MAX_SLOTS: 10,
              addUploadingSlot: vi.fn(),
              formatFileSize: vi.fn(),
              getNextAvailableSlot: vi.fn(),
              handleFileDelete: vi.fn(),
              handleFileUpload: vi.fn(),
              handleMultiFileUpload: vi.fn(),
              handlePaste: vi.fn(),
              insertFileReference: vi.fn(),
              isImageFile: vi.fn(),
              isPasting: false,
              lightboxImage: null,
              noteFiles: [],
              removeUploadingSlot: vi.fn(),
              setIsPasting: vi.fn(),
              setLightboxImage: vi.fn(),
              uploadingSlots: new Set(),
            }}
          >
            <NoteTagsContext.Provider
              value={{
                availableTags: [],
                filteredTags: [],
                handleAddTag: vi.fn(),
                handleCreateTag: vi.fn(),
                handleFilterByTag: vi.fn(),
                handleRemoveTag: vi.fn(),
                isTagDropdownOpen: false,
                selectedTagIds: [],
                setIsTagDropdownOpen: vi.fn(),
                setTagInput: vi.fn(),
                tagInput: '',
              }}
            >
              <NoteFoldersContext.Provider
                value={{
                  flatFolders: [],
                  selectedFolderId: 'folder-1',
                  setSelectedFolderId: vi.fn(),
                }}
              >
                <NoteRelationsContext.Provider
                  value={{
                    handleSelectRelatedNote: vi.fn(),
                    isRelatedDropdownOpen: false,
                    isRelatedLoading: false,
                    relatedNoteQuery: '',
                    relatedNoteResults: [],
                    selectedRelatedNotes: [],
                    setIsRelatedDropdownOpen: vi.fn(),
                    setRelatedNoteQuery: vi.fn(),
                    setSelectedRelatedNotes: vi.fn(),
                  }}
                >
                  {children}
                </NoteRelationsContext.Provider>
              </NoteFoldersContext.Provider>
            </NoteTagsContext.Provider>
          </NoteFilesContext.Provider>
        </NoteEditorContext.Provider>
      </NoteMetadataContext.Provider>
    </NoteContentContext.Provider>
  );
}

describe('NoteFormContext hooks', () => {
  it('throw outside the provider chain', () => {
    expect(() => renderHook(() => useNoteContentContext())).toThrow(
      'useNoteContentContext must be used within NoteFormProvider'
    );
    expect(() => renderHook(() => useNoteMetadataContext())).toThrow(
      'useNoteMetadataContext must be used within NoteFormProvider'
    );
    expect(() => renderHook(() => useNoteEditorContext())).toThrow(
      'useNoteEditorContext must be used within NoteFormProvider'
    );
    expect(() => renderHook(() => useNoteFilesContext())).toThrow(
      'useNoteFilesContext must be used within NoteFormProvider'
    );
    expect(() => renderHook(() => useNoteTagsContext())).toThrow(
      'useNoteTagsContext must be used within NoteFormProvider'
    );
    expect(() => renderHook(() => useNoteFoldersContext())).toThrow(
      'useNoteFoldersContext must be used within NoteFormProvider'
    );
    expect(() => renderHook(() => useNoteRelationsContext())).toThrow(
      'useNoteRelationsContext must be used within NoteFormProvider'
    );
  });

  it('returns note-form contexts inside the provider chain', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => buildWrapper(children);

    const { result } = renderHook(
      () => ({
        content: useNoteContentContext(),
        editor: useNoteEditorContext(),
        files: useNoteFilesContext(),
        folders: useNoteFoldersContext(),
        metadata: useNoteMetadataContext(),
        relations: useNoteRelationsContext(),
        tags: useNoteTagsContext(),
      }),
      { wrapper }
    );

    expect(result.current.content.content).toBe('');
    expect(result.current.metadata.title).toBe('Note');
    expect(result.current.editor.editorMode).toBe('markdown');
    expect(result.current.files.noteFiles).toEqual([]);
    expect(result.current.tags.selectedTagIds).toEqual([]);
    expect(result.current.folders.selectedFolderId).toBe('folder-1');
    expect(result.current.relations.selectedRelatedNotes).toEqual([]);
  });
});
