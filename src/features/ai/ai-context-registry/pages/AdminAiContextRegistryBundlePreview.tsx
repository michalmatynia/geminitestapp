import { NetworkIcon } from 'lucide-react';
import React from 'react';

import type { ContextRegistryResolutionBundle } from '@/shared/contracts/ai-context-registry';
import { JsonViewer } from '@/shared/ui/data-display.public';
import { Hint } from '@/shared/ui/forms-and-actions.public';
import { UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { Alert, Badge, Card, Textarea } from '@/shared/ui/primitives.public';

import type { CatalogTabProps, QueryLike } from './AdminAiContextRegistryCatalogTab';
import { ContextRegistryTagList } from './AdminAiContextRegistryTagList';

export function BundlePreviewCard(props: CatalogTabProps): React.JSX.Element {
  return (
    <Card className='space-y-4 border-white/10 bg-black/20 p-6'>
      <div className='flex items-center gap-2'>
        <NetworkIcon className='size-4 text-sky-300' />
        <h3 className='text-sm font-semibold text-gray-100'>Bundle Preview</h3>
      </div>
      <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]`}>
        <BundleInputPanel {...props} />
        <BundleResultPanel
          bundleQuery={props.bundleQuery}
          envelopePreview={props.envelopePreview}
        />
      </div>
    </Card>
  );
}

function BundleInputPanel(props: CatalogTabProps): React.JSX.Element {
  const refCount = props.bundleRequest?.refs.length ?? 0;
  return (
    <div className='space-y-3'>
      <div className='text-sm text-gray-300'>
        Add runtime refs to preview live documents next to the selected static node.
      </div>
      <Textarea
        value={props.runtimeRefsText}
        onChange={(event) => props.onRuntimeRefsTextChange(event.target.value)}
        placeholder={'runtime:kangur:learner:abc123\nruntime:ai-path-run:run_42'}
        rows={6}
        aria-label='runtime:kangur:learner:abc123\nruntime:ai-path-run:run_42'
        title='runtime:kangur:learner:abc123\nruntime:ai-path-run:run_42'
      />
      <Hint variant='muted' size='xs'>
        Accepted values are raw runtime ref IDs. One per line or comma-separated.
      </Hint>
      {props.bundleRequest !== null ? (
        <div className='rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-400'>
          {refCount} ref{refCount === 1 ? '' : 's'} in preview payload.
        </div>
      ) : null}
    </div>
  );
}

function BundleResultPanel(props: {
  bundleQuery: QueryLike<ContextRegistryResolutionBundle>;
  envelopePreview: unknown;
}): React.JSX.Element {
  if (props.bundleQuery.error !== null) {
    return <Alert variant='error'>{props.bundleQuery.error.message}</Alert>;
  }
  if (props.bundleQuery.data === undefined) {
    return <Hint variant='muted'>Select a node or add runtime refs to build a preview bundle.</Hint>;
  }

  return (
    <div className='space-y-4'>
      <BundleStats bundle={props.bundleQuery.data} />
      <RuntimeDocuments bundle={props.bundleQuery.data} />
      <JsonViewer data={props.envelopePreview} title='Consumer Envelope' maxHeight={320} />
    </div>
  );
}

function BundleStats(props: { bundle: ContextRegistryResolutionBundle }): React.JSX.Element {
  return (
    <div className='grid gap-3 md:grid-cols-3'>
      <BundleStat label='Nodes' value={String(props.bundle.nodes.length)} />
      <BundleStat label='Documents' value={String(props.bundle.documents.length)} />
      <BundleStat label='Truncated' value={props.bundle.truncated ? 'Yes' : 'No'} />
    </div>
  );
}

function BundleStat(props: { label: string; value: string }): React.JSX.Element {
  return (
    <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-4'>
      <div className='text-xs uppercase tracking-wide text-gray-500'>{props.label}</div>
      <div className='mt-2 text-2xl font-semibold text-gray-50'>{props.value}</div>
    </div>
  );
}

function RuntimeDocuments(props: { bundle: ContextRegistryResolutionBundle }): React.JSX.Element {
  const documents = props.bundle.documents;
  if (documents.length === 0) {
    return <Hint variant='muted'>No runtime documents were resolved for the current preview.</Hint>;
  }

  return (
    <div className='space-y-3'>
      <div className='text-sm font-medium text-gray-100'>Runtime Documents</div>
      <div className='space-y-3'>
        {documents.map((document) => (
          <div key={document.id} className='rounded-xl border border-white/10 bg-white/[0.03] p-4'>
            <div className='flex flex-wrap items-center gap-2'>
              <div className='text-sm font-semibold text-gray-100'>{document.title}</div>
              <Badge variant='secondary'>{document.entityType}</Badge>
              {document.status !== null && document.status !== '' ? (
                <Badge variant='outline'>{document.status}</Badge>
              ) : null}
            </div>
            <p className='mt-2 text-sm text-gray-300'>{document.summary}</p>
            <ContextRegistryTagList tags={document.tags} variant='outline' />
          </div>
        ))}
      </div>
    </div>
  );
}
