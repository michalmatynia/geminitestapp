import React from 'react';

import { CreateNoteModal } from '@/features/notesapp/components/CreateNoteModal';
import { NoteDetailView } from '@/features/notesapp/components/NoteDetailView';
import { NoteListView } from '@/features/notesapp/components/NoteListView';
import { NotesAppFolderTree } from '@/features/notesapp/components/NotesAppFolderTree';
import {
  NotesAppProvider,
  useNotesAppActions,
  useNotesAppState,
} from '@/features/notesapp/hooks/NotesAppContext';
import { useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { Card } from '@/shared/ui/primitives.public';

function AdminNotesPageContent(): React.JSX.Element {
  const { isMenuCollapsed } = useAdminLayoutState();
  const { selectedNote, isFolderTreeCollapsed, isCreating } = useNotesAppState();
  const { setIsCreating, handleCreateSuccess } = useNotesAppActions();

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
        <Card
          variant='subtle'
          padding='none'
          className={`overflow-hidden border-border/60 bg-card/40 ${
            isFolderTreeCollapsed ? 'hidden' : 'hidden lg:block'
          }`}
        >
          <NotesAppFolderTree />
        </Card>

        {/* Main Content */}
        <Card
          variant='subtle'
          padding='lg'
          className='flex min-h-0 flex-col overflow-hidden border-border/60 bg-card/40'
        >
          {selectedNote ? <NoteDetailView /> : <NoteListView />}
        </Card>

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
