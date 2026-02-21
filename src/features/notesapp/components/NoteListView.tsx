import { Plus, Pin, Archive, ChevronLeft, ChevronRight, FileText, Palette } from 'lucide-react';
import React, { useMemo } from 'react';

import { TriggerButtonBar } from '@/features/ai/ai-paths/components/trigger-buttons/TriggerButtonBar';
import { DocumentSearchPage } from '@/features/document-search';
import { useNotesAppContext } from '@/features/notesapp/hooks/NotesAppContext';
import type { NoteWithRelationsDto as NoteWithRelations, NoteThemeDto as ThemeRecord } from '@/shared/contracts/notes';
import type { PickerGroup, PickerOption } from '@/shared/contracts/ui';
import { Button, EmptyState, Pagination } from '@/shared/ui';
import { GenericPickerDropdown } from '@/shared/ui/templates/pickers';

import { NoteCard } from './NoteCard';
import { NotesFilters } from './NotesFilters';
import { buildBreadcrumbPath } from '../utils';


type BreadcrumbItem = { id: string | null; name: string; isNote?: boolean };

export function NoteListView(): React.JSX.Element {
  const {
    settings,
    filters,
    folderTree,
    themes,
    loading,
    selectedFolderId,
    selectedNotebookId,
    sortedNotes,
    pagedNotes,
    totalPages,
    noteLayoutClassName,
    selectedFolderThemeId,
    handleThemeChange,
    setSelectedFolderId,
    setSelectedNote,
    setIsEditing,
    setIsCreating,
    isFolderTreeCollapsed,
    setIsFolderTreeCollapsed,
  } = useNotesAppContext();

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    filterPinned,
    setFilterPinned,
    filterArchived,
    setFilterArchived,
  } = filters;

  const onExpandFolderTree = (): void => setIsFolderTreeCollapsed(false);
  const onCreateNote = (): void => {
    setIsCreating(true);
    setSelectedNote(null);
  };

  const themeGroups = useMemo<PickerGroup[]>(() => [
    {
      label: 'Available Themes',
      icon: <Palette className='h-3 w-3' />,
      options: [
        { key: '', label: 'Default' },
        ...themes.map((theme: ThemeRecord) => ({
          key: theme.id,
          label: theme.name,
        })),
      ]
    }
  ], [themes]);

  return (
    <DocumentSearchPage
      title={
        selectedFolderId
          ? buildBreadcrumbPath(selectedFolderId, null, folderTree).slice(-1)[0]?.name ?? 'Notes'
          : 'Notes'
      }
      startAdornment={(
        <>
          {isFolderTreeCollapsed ? (
            <Button
              onClick={onExpandFolderTree}
              variant='outline'
              size='xs'
              className='border text-gray-300 hover:bg-muted/50 hover:text-white'
            >
              <ChevronLeft className='-scale-x-100' size={16} />
              <span className='ml-2'>Show Folders</span>
            </Button>
          ) : null}
          <Button
            onClick={onCreateNote}
            className='size-11 rounded-full bg-primary p-0 text-primary-foreground hover:bg-primary/90'
            aria-label='Create note'
          >
            <Plus className='size-5' />
          </Button>
        </>
      )}
      titleAdornment={(
        <div className='flex items-center gap-2'>
          <span className='text-xs text-gray-500'>Theme</span>
          <GenericPickerDropdown
            groups={themeGroups}
            selectedKey={selectedFolderThemeId || ''}
            onSelect={(opt: PickerOption) => {
              void handleThemeChange(opt.key || null);
            }}
            triggerContent={
              <span className='text-xs'>
                {selectedFolderThemeId ? (themeGroups.flatMap(g => g.options).find(o => o.key === selectedFolderThemeId)?.label) : 'Select theme'}
              </span>
            }
            triggerClassName='w-32 justify-between border border-border/40 rounded bg-card/50 text-gray-400 hover:text-gray-200 px-2'
            ariaLabel='Change folder theme'
          />
        </div>
      )}
      endAdornment={(
        <>
          <TriggerButtonBar location='note_list' entityType='note' />
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            pageSizeOptions={[12, 24, 48]}
            showPageSize
            variant='compact'
          />
        </>
      )}
      filters={(
        <div className='flex gap-4'>
          <NotesFilters />
          <Button
            onClick={(): void => setFilterPinned(filterPinned === true ? undefined : true)}
            className={`rounded-lg border px-4 py-2 ${
              filterPinned === true
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border bg-gray-800 text-gray-300'
            }`}
          >
            <Pin size={20} />
          </Button>
          <Button
            onClick={(): void => setFilterArchived(filterArchived === true ? undefined : true)}
            className={`rounded-lg border px-4 py-2 ${
              filterArchived === true
                ? 'border-gray-500 bg-gray-700 text-white'
                : 'border bg-gray-800 text-gray-300'
            }`}
          >
            <Archive size={20} />
          </Button>
        </div>
      )}
      breadcrumb={
        settings.selectedFolderId ? (
          <div className='mb-6 flex items-center gap-2 text-sm text-gray-400'>
            {buildBreadcrumbPath(settings.selectedFolderId, null, folderTree).map((crumb: BreadcrumbItem, index: number, array: BreadcrumbItem[]) => (
              <React.Fragment key={index}>
                <Button
                  variant='ghost'
                  size='xs'
                  onClick={(): void => {
                    if (crumb.id) setSelectedFolderId(crumb.id);
                    setSelectedNote(null);
                    setIsEditing(false);
                  }}
                  className='hover:text-blue-400 transition'
                >
                  {crumb.name}
                </Button>
                {index < array.length - 1 ? (
                  <ChevronRight size={16} className='text-gray-600' />
                ) : null}
              </React.Fragment>
            ))}
          </div>
        ) : null
      }
      loading={loading}
      hasResults={sortedNotes.length > 0}
      emptyState={(
        <EmptyState
          title='No notes found'
          description='Create your first note to get started!'
          icon={<FileText className='size-12' />}
          action={
            <Button onClick={onCreateNote}>
              <Plus className='mr-2 size-4' />
              Create Note
            </Button>
          }
        />
      )}
    >
      <div className={noteLayoutClassName}>
        {pagedNotes.map((note: NoteWithRelations) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </DocumentSearchPage>
  );
}
