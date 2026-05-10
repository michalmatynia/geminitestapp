import { SearchIcon, WorkflowIcon } from 'lucide-react';
import React from 'react';

import type {
  ContextNode,
  ContextRelatedResponse,
  ContextSchemaResponse,
} from '@/shared/contracts/ai-context-registry';
import { JsonViewer } from '@/shared/ui/data-display.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { EmptyState, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { Alert, Badge, Card } from '@/shared/ui/primitives.public';

import type { CatalogTabProps, QueryLike } from './AdminAiContextRegistryCatalogTab';
import { BundlePreviewCard } from './AdminAiContextRegistryBundlePreview';
import { renderRelationshipLabel } from './AdminAiContextRegistryPage.utils';
import { ContextRegistryTagList } from './AdminAiContextRegistryTagList';

export function CatalogDetailsPanel(props: CatalogTabProps): React.JSX.Element {
  return (
    <div className='space-y-6'>
      <SelectedNodeCard selectedNode={props.selectedNode} />
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
        <RelatedNodesCard query={props.relatedQuery} selectedNode={props.selectedNode} />
        <SchemaPreviewCard query={props.schemaQuery} selectedNode={props.selectedNode} />
      </div>
      <BundlePreviewCard {...props} />
    </div>
  );
}

function SelectedNodeCard(props: { selectedNode: ContextNode | null }): React.JSX.Element {
  const { selectedNode } = props;
  if (selectedNode === null) {
    return (
      <EmptyState
        title='Choose a registry node'
        description='Select a page, component, collection, action, or policy to inspect its context graph.'
      />
    );
  }

  return (
    <Card className='space-y-5 border-white/10 bg-black/20 p-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div className='space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <h2 className='text-xl font-semibold text-gray-50'>{selectedNode.name}</h2>
            <Badge>{selectedNode.kind}</Badge>
          </div>
          <div className='font-mono text-xs text-gray-500'>{selectedNode.id}</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='outline'>risk:{selectedNode.permissions.riskTier}</Badge>
          <Badge variant='outline'>class:{selectedNode.permissions.classification}</Badge>
        </div>
      </div>
      <p className='text-sm leading-6 text-gray-300'>{selectedNode.description}</p>
      <ContextRegistryTagList tags={selectedNode.tags} variant='secondary' />
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
        <NodeRelationshipsPanel selectedNode={selectedNode} />
        <NodeSourcePanel selectedNode={selectedNode} />
      </div>
    </Card>
  );
}

function NodeRelationshipsPanel(props: { selectedNode: ContextNode }): React.JSX.Element {
  const relationships = props.selectedNode.relationships ?? [];
  return (
    <div className='space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4'>
      <div className='text-sm font-medium text-gray-100'>Relationships</div>
      {relationships.length > 0 ? (
        <ul className='space-y-2 text-sm text-gray-300'>
          {relationships.map((relationship) => (
            <li key={`${relationship.type}:${relationship.targetId}`} className='rounded-lg bg-black/20 px-3 py-2'>
              <span className='font-medium text-sky-300'>{relationship.type}</span>{' '}
              <span className='font-mono text-xs text-gray-400'>{relationship.targetId}</span>
              {relationship.notes !== undefined && relationship.notes !== '' ? (
                <div className='mt-1 text-xs text-gray-500'>{relationship.notes}</div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <Hint variant='muted'>This node does not declare direct relationships.</Hint>
      )}
    </div>
  );
}

function NodeSourcePanel(props: { selectedNode: ContextNode }): React.JSX.Element {
  const { selectedNode } = props;
  return (
    <div className='space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4'>
      <div className='text-sm font-medium text-gray-100'>Source</div>
      <div className='space-y-2 text-sm text-gray-300'>
        <div><span className='text-gray-500'>Type:</span> {selectedNode.source.type}</div>
        <div className='break-all font-mono text-xs text-gray-400'>{selectedNode.source.ref}</div>
        <div><span className='text-gray-500'>Updated:</span> {new Date(selectedNode.updatedAtISO).toLocaleString()}</div>
        <div><span className='text-gray-500'>Version:</span> {selectedNode.version}</div>
      </div>
    </div>
  );
}

function RelatedNodesCard(props: {
  query: QueryLike<ContextRelatedResponse>;
  selectedNode: ContextNode | null;
}): React.JSX.Element {
  return (
    <Card className='space-y-4 border-white/10 bg-black/20 p-6'>
      <div className='flex items-center gap-2'>
        <SearchIcon className='size-4 text-sky-300' />
        <h3 className='text-sm font-semibold text-gray-100'>Related Nodes</h3>
      </div>
      <RelatedNodesContent query={props.query} selectedNode={props.selectedNode} />
    </Card>
  );
}

function RelatedNodesContent(props: {
  query: QueryLike<ContextRelatedResponse>;
  selectedNode: ContextNode | null;
}): React.JSX.Element {
  if (props.query.error !== null) return <Alert variant='error'>{props.query.error.message}</Alert>;
  if (props.query.isLoading) return <div className='h-32 animate-pulse rounded-xl bg-white/5' />;
  const nodes = props.query.data?.nodes ?? [];
  if (nodes.length === 0) {
    return <Hint variant='muted'>No related nodes were returned for the current selection.</Hint>;
  }

  return (
    <ul className='space-y-2'>
      {nodes.map((node) => (
        <li key={node.id} className='rounded-xl border border-white/10 bg-white/[0.03] p-3'>
          <div className='flex items-start justify-between gap-3'>
            <div>
              <div className='text-sm font-medium text-gray-100'>{node.name}</div>
              <div className='font-mono text-[11px] text-gray-500'>{node.id}</div>
            </div>
            <Badge variant='outline'>{node.kind}</Badge>
          </div>
          {props.selectedNode !== null ? (
            <div className='mt-2 text-xs text-gray-400'>
              {renderRelationshipLabel(props.selectedNode, node.id)}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SchemaPreviewCard(props: {
  query: QueryLike<ContextSchemaResponse>;
  selectedNode: ContextNode | null;
}): React.JSX.Element {
  return (
    <Card className='space-y-4 border-white/10 bg-black/20 p-6'>
      <div className='flex items-center gap-2'>
        <WorkflowIcon className='size-4 text-sky-300' />
        <h3 className='text-sm font-semibold text-gray-100'>Schema Preview</h3>
      </div>
      <SchemaPreviewContent query={props.query} selectedNode={props.selectedNode} />
    </Card>
  );
}

function SchemaPreviewContent(props: {
  query: QueryLike<ContextSchemaResponse>;
  selectedNode: ContextNode | null;
}): React.JSX.Element {
  if (props.selectedNode?.kind !== 'collection') {
    return <Hint variant='muted'>Select a collection node to inspect its JSON schema.</Hint>;
  }
  if (props.query.error !== null) return <Alert variant='error'>{props.query.error.message}</Alert>;
  if (props.query.isLoading) return <div className='h-32 animate-pulse rounded-xl bg-white/5' />;
  if (props.query.data?.schema !== undefined) {
    return <JsonViewer data={props.query.data.schema} title={props.query.data.entity} />;
  }
  return <Hint variant='muted'>No schema is registered for this collection.</Hint>;
}
