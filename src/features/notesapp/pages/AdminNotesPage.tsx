'use client';
import React from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { CreateNoteModal } from '@/features/notesapp/components/CreateNoteModal';
import { NoteDetailView } from '@/features/notesapp/components/NoteDetailView';
import { NoteListView } from '@/features/notesapp/components/NoteListView';
import { NotesAppFolderTree } from '@/features/notesapp/components/NotesAppFolderTree';
import { NotesAppProvider, useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';

function AdminNotesPageContent(): React.JSX.Element {
  const { isMenuCollapsed } = useAdminLayout();
  const {
    selectedNote,
    isFolderTreeCollapsed,
    isCreating,
    setIsCreating,
    handleCreateSuccess,
  } = useNotesAppContext();

  return (
    <div className='w-full'>
      <div
        className={`grid h-[calc(100vh-120px)] w-full grid-cols-1 gap-6 ${
          isFolderTreeCollapsed
            ? ''
            : isMenuCollapsed
              ? 'lg:grid-cols-[360px_minmax(0,1fr)]'
              : 'lg:grid-cols-[420px_minmax(0,1fr)]'
        }`}
      >
        {/* Sidebar */}
        <div
          className={`overflow-hidden rounded-lg border border-border/60 bg-card/40 p-0 ${
            isFolderTreeCollapsed ? 'hidden' : 'hidden lg:block'
          }`}
        >
          <NotesAppFolderTree />
        </div>

        {/* Main Content */}
        <div className='flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/60 bg-card/40 p-6'>
          {selectedNote ? <NoteDetailView /> : <NoteListView />}
        </div>

        {/* Modals */}
        <CreateNoteModal
          isOpen={isCreating}
          onClose={() => setIsCreating(false)}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </div>
  );
}

export function AdminNotesPage(): React.JSX.Element {
  return (
    <NotesAppProvider>
      <AdminNotesPageContent />
    </NotesAppProvider>
  );
}
