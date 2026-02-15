'use client';

import { PlusIcon } from 'lucide-react';
import React, { Suspense, useMemo } from 'react';

import { 
  Button, 
  Input, 
  SectionHeader, 
  Tag, 
  FileUploadTrigger, 
  type FileUploadHelpers, 
  DataTable, 
  StatusToggle,
  useToast
} from '@/shared/ui';

import { ChatbotContextModal } from '../components/ChatbotContextModal';
import { useChatbotContextState } from '../hooks/useChatbotContextState';

import type { ContextItem } from '../hooks/useChatbotContextState';
import type { ColumnDef } from '@tanstack/react-table';

function ChatbotContextPageInner(): React.JSX.Element {
  const { toast } = useToast();
  const {
    activeIds,
    tagQuery,
    setTagQuery,
    tagFilters,
    setTagFilters,
    uniqueTags,
    filteredContexts,
    isModalOpen,
    modalDraft,
    setModalDraft,
    tagDraft,
    setTagDraft,
    loading,
    saving,
    uploading,
    openCreateModal,
    openEditModal,
    closeModal,
    handleDeleteContext,
    handleSaveDraft,
    handlePdfUpload,
    handleSaveContexts,
    toggleActive,
  } = useChatbotContextState();

  const columns = useMemo<ColumnDef<ContextItem>[]>(() => [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => <span className='font-medium text-white'>{row.original.title}</span>,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className='flex flex-wrap gap-1'>
          {(row.original.tags || []).length === 0 ? (
            <span className='text-xs text-gray-500'>None</span>
          ) : (
            (row.original.tags || []).map((tag: string) => (
              <Tag key={tag} label={tag} />
            ))
          )}
        </div>
      ),
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <span className='text-xs text-gray-400 capitalize'>
          {row.original.source || 'manual'}
        </span>
      ),
    },
    {
      id: 'active',
      header: 'Active',
      cell: ({ row }) => (
        <StatusToggle
          enabled={activeIds.includes(row.original.id)}
          onToggle={() => toggleActive(row.original.id, !activeIds.includes(row.original.id))}
        />
      ),
    },
    {
      id: 'actions',
      header: () => <div className='text-right'>Actions</div>,
      cell: ({ row }) => (
        <div className='flex justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='xs'
            onClick={() => openEditModal(row.original)}
          >
            Edit
          </Button>
          <Button
            type='button'
            variant='outline'
            size='xs'
            onClick={() => handleDeleteContext(row.original.id)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ], [activeIds, toggleActive, openEditModal, handleDeleteContext]);

  return (
    <div className='mx-auto w-full max-w-none py-10'>
      <SectionHeader
        title='Chatbot Context'
        description='Define global instructions applied to every chat.'
        eyebrow={(
          <a href='/admin/chatbot' className='text-blue-300 hover:text-blue-200'>
            ← Back to chatbot
          </a>
        )}
        className='mb-6'
      />
      <div className='rounded-lg border border-border/60 bg-card/40 p-6'>
        <SectionHeader
          title='Global Contexts'
          size='xs'
          className='mb-4'
          actions={
            <div className='flex items-center gap-2'>
              <Button
                onClick={openCreateModal}
                size='xs'
                className='h-8'
              >
                <PlusIcon className='mr-2 size-4' />
                Create Context
              </Button>
              <FileUploadTrigger
                accept='application/pdf'
                disabled={loading || saving || uploading}
                onFilesSelected={async (files: File[], helpers?: FileUploadHelpers) => {
                  const file = files[0];
                  if (!file) return;
                  await handlePdfUpload(file, helpers);
                }}
                asChild
              >
                <Button variant='outline' size='xs' className='h-8'>
                  {uploading ? 'Uploading...' : 'Upload PDF'}
                </Button>
              </FileUploadTrigger>
              <Button
                type='button'
                variant='outline'
                size='xs'
                className='h-8'
                onClick={(): void => {
                  const params = new URLSearchParams();
                  if (tagQuery.trim()) {
                    params.set('q', tagQuery.trim());
                  }
                  if (tagFilters.length > 0) {
                    params.set('tags', tagFilters.join(','));
                  }
                  const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
                  void navigator.clipboard.writeText(url);
                  toast('Filtered link copied', { variant: 'success' });
                }}
              >
                Copy link
              </Button>
            </div>
          }
        />
        <div className='mb-4 flex flex-wrap items-center gap-3'>
          <Input
            placeholder='Search contexts or tags...'
            value={tagQuery}
            onChange={(event) => setTagQuery(event.target.value)}
            className='h-8 max-w-xs text-xs'
            disabled={loading}
          />
          <div className='flex flex-wrap gap-2'>
            {uniqueTags.map((tag: string) => (
              <Button
                key={tag}
                type='button'
                size='xs'
                variant={tagFilters.includes(tag) ? 'default' : 'outline'}
                className='rounded-full'
                onClick={(): void => {
                  setTagFilters((prev) =>
                    prev.includes(tag)
                      ? prev.filter((item) => item !== tag)
                      : [...prev, tag]
                  );
                }}
              >
                {tag}
              </Button>
            ))}
            {tagFilters.length > 0 ? (
              <Button
                type='button'
                variant='ghost'
                size='xs'
                onClick={() => setTagFilters([])}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
        
        <div className='rounded-md border border-border bg-gray-900/20'>
          <DataTable
            columns={columns}
            data={filteredContexts}
            isLoading={loading}
          />
        </div>

        <div className='mt-6 flex justify-end'>
          <Button
            type='button'
            onClick={() => { void handleSaveContexts(); }}
            disabled={saving || loading}
          >
            {saving ? 'Saving...' : 'Save Contexts'}
          </Button>
        </div>
      </div>

      <ChatbotContextModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={() => {}}
        item={modalDraft}
        modalDraft={modalDraft!}
        setModalDraft={setModalDraft}
        tagDraft={tagDraft}
        setTagDraft={setTagDraft}
        isSaving={saving}
        onSave={handleSaveDraft}
      />
    </div>
  );
}

export default function ChatbotContextPage(): React.JSX.Element {
  return (
    <Suspense fallback={<div className='p-6 text-sm text-gray-500'>Loading...</div>}>
      <ChatbotContextPageInner />
    </Suspense>
  );
}
