'use client';

import { Trash2, BookOpen } from 'lucide-react';
import React, { useMemo } from 'react';

import type {
  AgentTeachingEmbeddingCollectionRecord,
  AgentTeachingEmbeddingDocumentListItem,
} from '@/shared/contracts/agent-teaching';
import { AdminAgentTeachingBreadcrumbs } from '@/shared/ui/admin.public';
import { Button, Badge } from '@/shared/ui/primitives.public';
import { StandardDataTablePanel, ConfirmModal, PanelHeader } from '@/shared/ui/templates.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

import { DocumentAddForm } from '../components/DocumentAddForm';
import { SearchSimulator } from '../components/SearchSimulator';
import { useAgentTeachingCollectionDetailState } from '../hooks/useAgentTeachingCollectionDetailState';

import type { ColumnDef } from '@tanstack/react-table';

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.length > 0;

const hasTags = (tags: string[] | null | undefined): tags is string[] =>
  tags !== null && tags !== undefined && tags.length > 0;

const formatUpdatedAt = (value: string | null | undefined): string => {
  if (!hasText(value)) {
    return '—';
  }
  return new Date(value).toLocaleString();
};

const buildDocumentColumns = ({
  adding,
  deleting,
  setDocToDelete,
}: Pick<
  ReturnType<typeof useAgentTeachingCollectionDetailState>,
  'adding' | 'deleting' | 'setDocToDelete'
>): ColumnDef<AgentTeachingEmbeddingDocumentListItem>[] => [
  {
    accessorKey: 'text',
    header: 'Document Text',
    cell: ({ row }) => (
      <div className='max-w-[520px] truncate text-sm text-gray-300' title={row.original.text}>
        {row.original.text}
      </div>
    ),
  },
  {
    id: 'meta',
    header: 'Metadata',
    cell: ({ row }) => <DocumentMetadataCell document={row.original} />,
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    cell: ({ row }) => (
      <span className='text-xs text-gray-500'>{formatUpdatedAt(row.original.updatedAt)}</span>
    ),
  },
  {
    id: 'actions',
    header: () => <div className='text-right'>Actions</div>,
    cell: ({ row }) => (
      <DocumentActions
        document={row.original}
        disabled={adding || deleting}
        onDelete={setDocToDelete}
      />
    ),
  },
];

function DocumentMetadataCell({
  document,
}: {
  document: AgentTeachingEmbeddingDocumentListItem;
}): React.JSX.Element {
  return (
    <div className='flex flex-col gap-1 text-xs'>
      {hasText(document.metadata?.title) ? (
        <div className='text-gray-200 font-medium'>{document.metadata.title}</div>
      ) : null}
      {hasText(document.metadata?.source) ? (
        <div className='text-gray-500 italic'>{document.metadata.source}</div>
      ) : null}
      {hasTags(document.metadata?.tags) ? (
        <div className='flex gap-1 flex-wrap'>
          {document.metadata.tags.map((tag) => (
            <Badge key={tag} variant='outline' className='text-[9px] px-1 py-0'>
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
      <div className='text-[10px] text-gray-600 mt-1'>
        {document.embeddingModel} ({document.embeddingDimensions})
      </div>
    </div>
  );
}

function DocumentActions({
  document,
  disabled,
  onDelete,
}: {
  document: AgentTeachingEmbeddingDocumentListItem;
  disabled: boolean;
  onDelete: (document: AgentTeachingEmbeddingDocumentListItem | null) => void;
}): React.JSX.Element {
  return (
    <div className='text-right'>
      <Button
        variant='ghost'
        size='xs'
        className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
        onClick={() => onDelete(document)}
        disabled={disabled}
        aria-label={`Delete ${document.metadata?.title ?? 'document'}`}
        title='Delete document'
      >
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  );
}

type CollectionDetailState = ReturnType<typeof useAgentTeachingCollectionDetailState>;

const getCollectionName = (collection: AgentTeachingEmbeddingCollectionRecord | null): string =>
  collection?.name ?? 'Loading...';

const buildCollectionActions = (
  collection: AgentTeachingEmbeddingCollectionRecord | null
): React.ComponentProps<typeof PanelHeader>['actions'] => {
  if (collection === null) {
    return [];
  }
  return [
    {
      key: 'model',
      label: `Model: ${collection.embeddingModel}`,
      variant: 'secondary',
      onClick: (): void => {},
      disabled: true,
    },
  ];
};

function CollectionDetailHeader({
  collection,
}: {
  collection: CollectionDetailState['collection'];
}): React.JSX.Element {
  const collectionName = getCollectionName(collection);
  return (
    <PanelHeader
      title={collectionName}
      description='Manage documents (original text + embedding vectors).'
      icon={<BookOpen className='size-4' />}
      subtitle={
        <AdminAgentTeachingBreadcrumbs
          parent={{ label: 'Embedding School', href: '/admin/agentcreator/teaching/collections' }}
          current={collectionName}
          className='ml-2'
        />
      }
      actions={buildCollectionActions(collection)}
    />
  );
}

function CollectionDetailTools({
  state,
  onAdd,
  onSearch,
}: {
  state: CollectionDetailState;
  onAdd: () => void;
  onSearch: () => void;
}): React.JSX.Element {
  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
      <DocumentAddForm
        title={state.title}
        setTitle={state.setTitle}
        source={state.source}
        setSource={state.setSource}
        tags={state.tags}
        setTags={state.setTags}
        text={state.text}
        setText={state.setText}
        onAdd={onAdd}
        isAdding={state.adding}
        isDeleting={state.deleting}
        collectionId={state.collectionId}
      />
      <SearchSimulator
        query={state.searchQuery}
        setQuery={state.setSearchQuery}
        topK={state.searchTopK}
        setTopK={state.setSearchTopK}
        minScore={state.searchMinScore}
        setMinScore={state.setSearchMinScore}
        onSearch={onSearch}
        isSearching={state.searching}
        collectionId={state.collectionId}
        results={state.searchResults}
        error={state.searchError}
      />
    </div>
  );
}

function DeleteDocumentModal({
  state,
  onConfirm,
}: {
  state: CollectionDetailState;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <ConfirmModal
      isOpen={state.docToDelete !== null}
      onClose={() => state.setDocToDelete(null)}
      onConfirm={onConfirm}
      title='Delete document'
      message='Are you sure you want to delete this document? This action cannot be undone and will remove the vector representation from the embedding collection.'
      confirmText='Delete'
      isDangerous={true}
      loading={state.deleting}
    />
  );
}

export function AgentTeachingCollectionDetailPage(): React.JSX.Element {
  const state = useAgentTeachingCollectionDetailState();

  const columns = useMemo<ColumnDef<AgentTeachingEmbeddingDocumentListItem>[]>(
    () =>
      buildDocumentColumns({
        adding: state.adding,
        deleting: state.deleting,
        setDocToDelete: state.setDocToDelete,
      }),
    [state.adding, state.deleting, state.setDocToDelete]
  );
  const handleAddClick = (): void => {
    state.handleAdd().catch(() => undefined);
  };
  const handleSearchClick = (): void => {
    state.handleSearch().catch(() => undefined);
  };
  const handleConfirmDelete = (): void => {
    state.handleDelete().catch(() => undefined);
  };

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <CollectionDetailHeader collection={state.collection} />
      <CollectionDetailTools state={state} onAdd={handleAddClick} onSearch={handleSearchClick} />
      <StandardDataTablePanel columns={columns} data={state.docs} isLoading={state.isLoading} />
      <DeleteDocumentModal state={state} onConfirm={handleConfirmDelete} />
    </div>
  );
}
