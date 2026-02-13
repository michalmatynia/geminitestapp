'use client';
import React from 'react';

import { useAdminLayout } from '@/features/admin/context/AdminLayoutContext';
import { CreateNoteModal } from '@/features/notesapp/components/CreateNoteModal';
import { NoteDetailView } from '@/features/notesapp/components/NoteDetailView';
import { NoteListView } from '@/features/notesapp/components/NoteListView';
import { NotesAppFolderTree } from '@/features/notesapp/components/NotesAppFolderTree';
import { NotesAppProvider, useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import { SectionPanel } from '@/shared/ui';

function AdminNotesPageContent(): React.JSX.Element {
  const { isMenuCollapsed } = useAdminLayout();
  const {
    selectedNote,
    isFolderTreeCollapsed,
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
        <SectionPanel
          className={`overflow-hidden p-0 ${
            isFolderTreeCollapsed ? 'hidden' : 'hidden lg:block'
          }`}
        >
          <NotesAppFolderTree />
        </SectionPanel>

        {/* Main Content */}
        <SectionPanel className='flex min-h-0 flex-col overflow-hidden p-6'>
          {selectedNote ? <NoteDetailView /> : <NoteListView />}
        </SectionPanel>

        {/* Modals */}
        <CreateNoteModal />
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
