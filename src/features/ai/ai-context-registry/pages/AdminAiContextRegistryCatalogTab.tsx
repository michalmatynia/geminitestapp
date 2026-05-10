import React from 'react';

import type {
  ContextBundleRequest,
  ContextNode,
  ContextNodeKind,
  ContextRegistryResolutionBundle,
  ContextRelatedResponse,
  ContextSchemaResponse,
  ContextSearchResponse,
} from '@/shared/contracts/ai-context-registry';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { Hint, SearchInput } from '@/shared/ui/forms-and-actions.public';
import { EmptyState, ListPanel, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { Alert, Badge, Button } from '@/shared/ui/primitives.public';

import { CatalogDetailsPanel } from './AdminAiContextRegistryCatalogDetails';

export type QueryLike<T> = {
  data?: T;
  error: Error | null;
  isLoading: boolean;
};

export type CatalogTabProps = {
  bundleQuery: QueryLike<ContextRegistryResolutionBundle>;
  bundleRequest: ContextBundleRequest | null;
  envelopePreview: unknown;
  kindFilter: ContextNodeKind | 'all';
  nodeKindFilters: Array<LabeledOptionDto<ContextNodeKind | 'all'>>;
  query: string;
  relatedQuery: QueryLike<ContextRelatedResponse>;
  runtimeRefsText: string;
  schemaQuery: QueryLike<ContextSchemaResponse>;
  searchQuery: QueryLike<ContextSearchResponse>;
  selectedId: string | null;
  selectedNode: ContextNode | null;
  onKindFilterChange: (kind: ContextNodeKind | 'all') => void;
  onQueryChange: (query: string) => void;
  onRuntimeRefsTextChange: (text: string) => void;
  onSelectedIdChange: (id: string) => void;
};

export function ContextCatalogTab(props: CatalogTabProps): React.JSX.Element {
  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} xl:grid-cols-[360px_minmax(0,1fr)]`}>
      <CatalogListPanel {...props} />
      <CatalogDetailsPanel {...props} />
    </div>
  );
}

function CatalogListPanel(props: CatalogTabProps): React.JSX.Element {
  return (
    <ListPanel
      filters={
        <CatalogFilters
          kindFilter={props.kindFilter}
          nodeKindFilters={props.nodeKindFilters}
          query={props.query}
          total={props.searchQuery.data?.total ?? 0}
          onKindFilterChange={props.onKindFilterChange}
          onQueryChange={props.onQueryChange}
        />
      }
    >
      <CatalogNodeList
        query={props.searchQuery}
        selectedId={props.selectedId}
        onSelectedIdChange={props.onSelectedIdChange}
      />
    </ListPanel>
  );
}

function CatalogFilters(props: {
  kindFilter: ContextNodeKind | 'all';
  nodeKindFilters: Array<LabeledOptionDto<ContextNodeKind | 'all'>>;
  query: string;
  total: number;
  onKindFilterChange: (kind: ContextNodeKind | 'all') => void;
  onQueryChange: (query: string) => void;
}): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='space-y-2'>
        <div className='text-sm font-medium text-gray-200'>Search registry</div>
        <SearchInput
          value={props.query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            props.onQueryChange(event.target.value)
          }
          onClear={() => props.onQueryChange('')}
          placeholder='Search nodes, tags, descriptions...'
          size='sm'
        />
      </div>
      <div className='flex flex-wrap gap-2'>
        {props.nodeKindFilters.map((filter) => (
          <Button
            key={filter.value}
            type='button'
            variant={props.kindFilter === filter.value ? 'default' : 'outline'}
            size='sm'
            onClick={() => props.onKindFilterChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <Hint variant='muted' size='xs'>
        {props.total} node{props.total === 1 ? '' : 's'} visible in the current filter.
      </Hint>
    </div>
  );
}

function CatalogNodeList(props: {
  query: QueryLike<ContextSearchResponse>;
  selectedId: string | null;
  onSelectedIdChange: (id: string) => void;
}): React.JSX.Element {
  if (props.query.error !== null) return <Alert variant='error'>{props.query.error.message}</Alert>;
  if (props.query.isLoading) return <CatalogNodeSkeleton />;

  const nodes = props.query.data?.nodes ?? [];
  if (nodes.length === 0) {
    return (
      <EmptyState
        title='No registry nodes found'
        description='Try a broader search term or switch to another node kind.'
      />
    );
  }

  return (
    <div className='space-y-3'>
      {nodes.map((node) => (
        <CatalogNodeButton
          key={node.id}
          node={node}
          selected={node.id === props.selectedId}
          onSelect={props.onSelectedIdChange}
        />
      ))}
    </div>
  );
}

function CatalogNodeSkeleton(): React.JSX.Element {
  return (
    <div className='space-y-2'>
      <div className='h-16 animate-pulse rounded-xl bg-white/5' />
      <div className='h-16 animate-pulse rounded-xl bg-white/5' />
      <div className='h-16 animate-pulse rounded-xl bg-white/5' />
    </div>
  );
}

function CatalogNodeButton(props: {
  node: ContextNode;
  selected: boolean;
  onSelect: (id: string) => void;
}): React.JSX.Element {
  const { node, selected, onSelect } = props;
  return (
    <button
      type='button'
      onClick={() => onSelect(node.id)}
      aria-pressed={selected}
      aria-label={`Select ${node.name}`}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected ? 'border-sky-400/70 bg-sky-500/10' : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
      }`}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='text-sm font-semibold text-gray-100'>{node.name}</div>
          <div className='text-[11px] font-mono text-gray-500'>{node.id}</div>
        </div>
        <Badge variant='secondary'>{node.kind}</Badge>
      </div>
      <p className='mt-3 line-clamp-3 text-sm text-gray-300'>{node.description}</p>
      <div className='mt-3 flex flex-wrap gap-1.5'>
        {node.tags.slice(0, 5).map((tag) => (
          <Badge key={tag} variant='outline'>
            {tag}
          </Badge>
        ))}
      </div>
    </button>
  );
}
