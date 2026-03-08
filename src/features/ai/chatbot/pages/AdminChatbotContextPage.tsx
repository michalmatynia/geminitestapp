'use client';

import { PlusIcon, FileUp, Link as LinkIcon, MessageSquareQuote, Save } from 'lucide-react';
import React, { Suspense, useMemo, useCallback } from 'react';

import {
  Button,
  Tag,
  FileUploadTrigger,
  type FileUploadHelpers,
  StandardDataTablePanel,
  StatusToggle,
  useToast,
  PanelHeader,
  SearchInput,
  EmptyState,
  LoadingState,
  Hint,
} from '@/shared/ui';
import { cn } from '@/shared/utils';

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

  const columns = useMemo<ColumnDef<ContextItem>[]>(
    () => [
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
              (row.original.tags || []).map((tag: string) => <Tag key={tag} label={tag} />)
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
              className='text-red-300 hover:text-red-200'
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [activeIds, toggleActive, openEditModal, handleDeleteContext]
  );

  const handleCopyLink = useCallback(() => {
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
  }, [tagQuery, tagFilters, toast]);

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <PanelHeader
        title='Chatbot Context'
        description='Define global instructions and reference material applied to every chat.'
        icon={<MessageSquareQuote className='size-4' />}
        subtitle={
          <a href='/admin/chatbot' className='text-blue-300 hover:text-blue-200 ml-2'>
            ← Back to chatbot
          </a>
        }
        actions={[
          {
            key: 'create',
            label: 'Create Context',
            icon: <PlusIcon className='size-4' />,
            onClick: openCreateModal,
          },
          {
            key: 'copy',
            label: 'Copy Filter Link',
            icon: <LinkIcon className='size-3.5' />,
            variant: 'outline',
            onClick: handleCopyLink,
          },
          {
            key: 'save',
            label: saving ? 'Saving...' : 'Save Contexts',
            icon: <Save className='size-3.5' />,
            onClick: () => {
              void handleSaveContexts();
            },
            disabled: saving || loading,
          },
        ]}
      />

      <StandardDataTablePanel
        filters={
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-3'>
              <SearchInput
                placeholder='Search contexts or tags...'
                value={tagQuery}
                onChange={(event) => setTagQuery(event.target.value)}
                onClear={() => setTagQuery('')}
                className='h-9 w-full max-w-sm'
                disabled={loading}
                size='sm'
              />

              <FileUploadTrigger
                accept='application/pdf'
                disabled={loading || saving || uploading}
                onFilesSelected={async (files: File[], helpers?: FileUploadHelpers) => {
                  const file = files[0];
                  if (!file) return;
                  await handlePdfUpload(file, helpers);
                }}
                asChild
                preserveChildSemantics
              >
                <Button variant='outline' size='sm' className='h-9 gap-2'>
                  <FileUp className={cn('size-4', uploading && 'animate-bounce')} />
                  {uploading ? 'Uploading PDF...' : 'Upload PDF'}
                </Button>
              </FileUploadTrigger>
            </div>

            {uniqueTags.length > 0 && (
              <div className='flex flex-wrap items-center gap-2 pt-1 border-t border-white/5'>
                <Hint uppercase variant='muted' className='mr-1 font-semibold'>
                  Quick Filter:
                </Hint>
                {uniqueTags.map((tag: string) => (
                  <Button
                    key={tag}
                    type='button'
                    size='xs'
                    variant={tagFilters.includes(tag) ? 'default' : 'outline'}
                    className='rounded-full h-6 px-3'
                    onClick={(): void => {
                      setTagFilters((prev) =>
                        prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
                      );
                    }}
                  >
                    {tag}
                  </Button>
                ))}
                {tagFilters.length > 0 && (
                  <Button
                    type='button'
                    variant='ghost'
                    size='xs'
                    onClick={() => setTagFilters([])}
                    className='h-6 text-gray-400 hover:text-white'
                  >
                    Clear all
                  </Button>
                )}
              </div>
            )}
          </div>
        }
        columns={columns}
        data={filteredContexts}
        isLoading={loading}
        emptyState={
          <EmptyState
            title='No contexts found'
            description={
              tagQuery || tagFilters.length > 0
                ? 'Try adjusting your filters.'
                : 'Global contexts provide instructions to the AI.'
            }
            icon={<MessageSquareQuote className='size-12 opacity-20' />}
          />
        }
      />

      <ChatbotContextModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSuccess={() => {}}
        item={modalDraft}
        modalDraft={modalDraft}
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
    <Suspense
      fallback={<LoadingState message='Mounting context environment...' className='py-12' />}
    >
      <ChatbotContextPageInner />
    </Suspense>
  );
}
