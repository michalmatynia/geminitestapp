'use client';

import { Eye, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import type { ChatbotSessionListItem } from '@/shared/contracts/chatbot';
import {
  Button,
  Input,
  Checkbox,
  StandardDataTablePanel,
  SectionHeader,
  EmptyState,
  SearchInput,
  FormActions,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { useChatbotSessionsState } from '../hooks/useChatbotSessionsState';

import type { ColumnDef } from '@tanstack/react-table';

export default function ChatbotSessionsPage(): React.JSX.Element {
  const {
    filteredSessions,
    searchQuery,
    setSearchQuery,
    editingId,
    draftTitle,
    setDraftTitle,
    deletingId,
    selectedIds,
    sessionToDelete,
    setSessionToDelete,
    isBulkDeleteConfirmOpen,
    setIsBulkDeleteConfirmOpen,
    loading,
    isFetching,
    error,
    bulkDeleting,
    selectingAll,
    selectAllVisible,
    selectAllMatching,
    toggleSelected,
    startEditing,
    cancelEditing,
    saveTitle,
    deleteSession,
    handleBulkDeleteClick,
    bulkDelete,
    refetch,
  } = useChatbotSessionsState();

  const columns = useMemo<ColumnDef<ChatbotSessionListItem>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label='Select all'
          />
        ),
        cell: ({ row }: { row: { original: ChatbotSessionListItem } }) => (
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleSelected(row.original.id)}
            aria-label='Select row'
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: 'title',
        header: 'Session',
        cell: ({ row }: { row: { original: ChatbotSessionListItem } }) => {
          const session = row.original;
          const isEditing = editingId === session.id;
          return (
            <div className='flex flex-col gap-1'>
              {isEditing ? (
                <Input
                  size='sm'
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  className='h-7 max-w-xs text-xs'
                  autoFocus
                />
              ) : (
                <span className='font-medium text-white'>
                  {session.title || `Session ${session.id.slice(0, 6)}`}
                </span>
              )}
              <span className='text-[10px] text-gray-500'>
                Updated{' '}
                {session.lastMessageAt ? new Date(session.lastMessageAt).toLocaleString() : 'Never'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'id',
        header: 'ID',
        cell: ({ row }: { row: { original: ChatbotSessionListItem } }) => (
          <span className='font-mono text-[10px] text-gray-500'>{row.original.id}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }: { row: { original: ChatbotSessionListItem } }) => {
          const session = row.original;
          const isEditing = editingId === session.id;
          return (
            <div className='flex justify-end gap-2'>
              {isEditing ? (
                <FormActions
                  onSave={() => void saveTitle(session.id)}
                  onCancel={cancelEditing}
                  saveText='Save'
                  saveVariant='default'
                  cancelVariant='ghost'
                />
              ) : (
                <>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-7 w-7'
                    onClick={() => startEditing(session)}
                    title='Edit title'
                  >
                    <Eye className='size-3.5' />
                  </Button>
                  <Link href={`/admin/chatbot?session=${session.id}`}>
                    <Button size='xs' variant='outline'>
                      Open
                    </Button>
                  </Link>
                  <Button
                    size='icon'
                    variant='ghost'
                    className='h-7 w-7 text-rose-400 hover:text-rose-300'
                    disabled={deletingId === session.id}
                    onClick={() => setSessionToDelete(session)}
                  >
                    <Trash2 className='size-3.5' />
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [
      selectedIds,
      toggleSelected,
      editingId,
      draftTitle,
      setDraftTitle,
      saveTitle,
      cancelEditing,
      startEditing,
      deletingId,
      setSessionToDelete,
    ]
  );

  return (
    <div className='mx-auto w-full max-w-none py-10'>
      <SectionHeader
        title='Chat Sessions'
        description='History of conversations with AI agents.'
        eyebrow={
          <a href='/admin/chatbot' className='text-blue-300 hover:text-blue-200'>
            ← Back to chatbot
          </a>
        }
        actions={
          <Button variant='outline' size='xs' onClick={refetch} disabled={isFetching}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        }
        className='mb-6'
      />

      <StandardDataTablePanel
        variant='flat'
        alerts={error ? <p className='text-sm text-rose-400'>{error}</p> : null}
        filters={
          <div className='flex flex-wrap items-end gap-4'>
            <div className='flex-1 min-w-[240px]'>
              <SearchInput
                placeholder='Search sessions...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                className='h-9'
              />
            </div>
            <div className='flex items-center gap-2 pb-2'>
              <Button
                variant='outline'
                size='sm'
                onClick={selectAllVisible}
                disabled={filteredSessions.length === 0}
              >
                Select visible
              </Button>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  void selectAllMatching();
                }}
                disabled={selectingAll}
              >
                {selectingAll ? 'Selecting...' : 'Select all matching'}
              </Button>
              {selectedIds.size > 0 && (
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleBulkDeleteClick}
                  disabled={bulkDeleting}
                >
                  {bulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size}`}
                </Button>
              )}
            </div>
          </div>
        }
        columns={columns}
        data={filteredSessions}
        isLoading={loading}
        emptyState={
          <EmptyState
            title='No sessions found'
            description={
              searchQuery ? 'Try adjusting your filters.' : 'Start a new chat to see it here.'
            }
            action={
              !searchQuery ? (
                <Link href='/admin/chatbot'>
                  <Button size='sm'>Start Chatting</Button>
                </Link>
              ) : undefined
            }
          />
        }
      />

      <ConfirmModal
        isOpen={!!sessionToDelete}
        onClose={() => setSessionToDelete(null)}
        onConfirm={() => {
          if (sessionToDelete) void deleteSession(sessionToDelete);
        }}
        title='Delete Session'
        message={`Are you sure you want to delete "${sessionToDelete?.title || 'this session'}"?`}
        confirmText='Delete'
        isDangerous={true}
      />

      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        onClose={() => setIsBulkDeleteConfirmOpen(false)}
        onConfirm={bulkDelete}
        title='Delete Sessions'
        message={`Are you sure you want to delete ${selectedIds.size} sessions?`}
        confirmText='Delete All'
        isDangerous={true}
      />
    </div>
  );
}
