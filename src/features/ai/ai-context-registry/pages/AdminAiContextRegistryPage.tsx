'use client';

import { NetworkIcon, SearchIcon, WorkflowIcon, WrenchIcon } from 'lucide-react';
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';

import type {
  ContextBundleRequest,
  ContextNode,
  ContextNodeKind,
  ContextRegistryRef,
  ContextRegistryResolutionBundle,
  ContextRelatedResponse,
  ContextSchemaResponse,
  ContextSearchResponse,
} from '@/shared/contracts/ai-context-registry';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Hint,
  JsonViewer,
  ListPanel,
  PanelHeader,
  SearchInput,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  UI_GRID_ROOMY_CLASSNAME,
} from '@/shared/ui';

import {
  buildContextRegistryConsumerEnvelope,
  createStaticContextRegistryRef,
  mergeContextRegistryRefs,
} from '../context/page-context-shared';
import { contextPacks } from '../registry/context-packs';
import { buildContextRegistryTools } from '../tools/ai-tools';

const NODE_KIND_FILTERS: Array<LabeledOptionDto<ContextNodeKind | 'all'>> = [
  { label: 'All', value: 'all' },
  { label: 'Pages', value: 'page' },
  { label: 'Components', value: 'component' },
  { label: 'Collections', value: 'collection' },
  { label: 'Actions', value: 'action' },
  { label: 'Policies', value: 'policy' },
  { label: 'Events', value: 'event' },
  { label: 'Workflows', value: 'workflow' },
];

const KANGUR_RECENT_FEATURES_REF_ID = 'runtime:kangur:recent-features';
const KANGUR_RECENT_FEATURES_PROVIDER_ID = 'kangur-recent-features';
const KANGUR_RECENT_FEATURES_ENTITY_TYPE = 'kangur_recent_features';

const readErrorMessage = async (response: Response): Promise<string> => {
  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return String(payload?.['message'] ?? payload?.['error'] ?? response.statusText);
};

const postJson = async <T,>(url: string, body: unknown): Promise<T> => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
};

const getJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return (await response.json()) as T;
};

const parseRuntimeRefs = (input: string): ContextRegistryRef[] => {
  const parts = input
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const refs = parts.map((id): ContextRegistryRef => ({
    id,
    kind: 'runtime_document',
    ...(id === KANGUR_RECENT_FEATURES_REF_ID
      ? {
        providerId: KANGUR_RECENT_FEATURES_PROVIDER_ID,
        entityType: KANGUR_RECENT_FEATURES_ENTITY_TYPE,
      }
      : {}),
    ...(id.startsWith('runtime:kangur:') && id !== KANGUR_RECENT_FEATURES_REF_ID
      ? { providerId: 'kangur' }
      : {}),
    ...(id.startsWith('runtime:ai-path-run:')
      ? { providerId: 'ai-path-run', entityType: 'ai_path_run' }
      : {}),
  }));

  return mergeContextRegistryRefs(refs);
};

const renderRelationshipLabel = (node: ContextNode, targetId: string): string => {
  const relationship = node.relationships?.find((entry) => entry.targetId === targetId);
  return relationship ? `${relationship.type} -> ${targetId}` : targetId;
};

const selectedRootIdsToRefs = (selectedId: string | null): ContextRegistryRef[] =>
  selectedId ? [createStaticContextRegistryRef(selectedId)] : [];

export function AdminAiContextRegistryPage(): React.JSX.Element {
  const [tab, setTab] = useState<'catalog' | 'packs' | 'tools'>('catalog');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<ContextNodeKind | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runtimeRefsText, setRuntimeRefsText] = useState('');
  const deferredQuery = useDeferredValue(query);
  const deferredRuntimeRefsText = useDeferredValue(runtimeRefsText);

  const runtimeRefs = useMemo(
    () => parseRuntimeRefs(deferredRuntimeRefsText),
    [deferredRuntimeRefsText]
  );

  const searchQuery = createListQueryV2<ContextSearchResponse, ContextSearchResponse>({
    queryKey: QUERY_KEYS.ai.contextRegistry.search(deferredQuery, kindFilter),
    queryFn: async () =>
      await postJson<ContextSearchResponse>('/api/ai/context/search', {
        query: deferredQuery.trim() || undefined,
        kinds: kindFilter === 'all' ? undefined : [kindFilter],
        limit: 24,
      }),
    meta: {
      source: 'ai-context-registry.page.search',
      operation: 'list',
      resource: 'ai.context-registry.search',
      domain: 'ai',
      queryKey: QUERY_KEYS.ai.contextRegistry.search(deferredQuery, kindFilter),
      tags: ['ai', 'context-registry', 'search'],
      description: 'Searches AI context registry nodes.',
    },
  });

  const selectedNode = useMemo(
    () => searchQuery.data?.nodes.find((node) => node.id === selectedId) ?? null,
    [searchQuery.data?.nodes, selectedId]
  );

  useEffect(() => {
    if (!searchQuery.data?.nodes.length) {
      setSelectedId(null);
      return;
    }

    if (!selectedId || !searchQuery.data.nodes.some((node) => node.id === selectedId)) {
      setSelectedId(searchQuery.data.nodes[0]?.id ?? null);
    }
  }, [searchQuery.data?.nodes, selectedId]);

  const relatedQuery = createListQueryV2<ContextRelatedResponse, ContextRelatedResponse>({
    queryKey: QUERY_KEYS.ai.contextRegistry.related(selectedId),
    queryFn: async () => {
      if (!selectedId) {
        throw new Error('Select a node before loading related context.');
      }
      return await getJson<ContextRelatedResponse>(
        `/api/ai/context/related/${encodeURIComponent(selectedId)}`
      );
    },
    enabled: Boolean(selectedId),
    meta: {
      source: 'ai-context-registry.page.related',
      operation: 'detail',
      resource: 'ai.context-registry.related',
      domain: 'ai',
      queryKey: QUERY_KEYS.ai.contextRegistry.related(selectedId),
      tags: ['ai', 'context-registry', 'related'],
      description: 'Loads related AI context registry nodes.',
    },
  });

  const schemaQuery = createListQueryV2<ContextSchemaResponse, ContextSchemaResponse>({
    queryKey: QUERY_KEYS.ai.contextRegistry.schema(selectedNode?.id ?? null),
    queryFn: async () => {
      if (!selectedNode) {
        throw new Error('Select a collection node before loading its schema.');
      }
      return await getJson<ContextSchemaResponse>(
        `/api/ai/schema/${encodeURIComponent(selectedNode.name)}`
      );
    },
    enabled: selectedNode?.kind === 'collection',
    meta: {
      source: 'ai-context-registry.page.schema',
      operation: 'detail',
      resource: 'ai.context-registry.schema',
      domain: 'ai',
      queryKey: QUERY_KEYS.ai.contextRegistry.schema(selectedNode?.id ?? null),
      tags: ['ai', 'context-registry', 'schema'],
      description: 'Loads AI context registry collection schema.',
    },
  });

  const bundleRequest = useMemo<ContextBundleRequest | null>(() => {
    const refs = mergeContextRegistryRefs(selectedRootIdsToRefs(selectedId), runtimeRefs);
    if (refs.length === 0) {
      return null;
    }

    return {
      refs,
      depth: 1,
      maxNodes: 48,
    };
  }, [runtimeRefs, selectedId]);

  const bundleQuery = createListQueryV2<
    ContextRegistryResolutionBundle,
    ContextRegistryResolutionBundle
  >({
    queryKey: QUERY_KEYS.ai.contextRegistry.bundle(JSON.stringify(bundleRequest ?? null)),
    queryFn: async () => {
      if (!bundleRequest) {
        throw new Error('Select a node or add runtime refs before resolving a bundle.');
      }
      return await postJson<ContextRegistryResolutionBundle>(
        '/api/ai/context/bundle',
        bundleRequest
      );
    },
    enabled: Boolean(bundleRequest),
    meta: {
      source: 'ai-context-registry.page.bundle',
      operation: 'detail',
      resource: 'ai.context-registry.bundle',
      domain: 'ai',
      queryKey: QUERY_KEYS.ai.contextRegistry.bundle(JSON.stringify(bundleRequest ?? null)),
      tags: ['ai', 'context-registry', 'bundle'],
      description: 'Resolves AI context registry bundles.',
    },
  });

  const envelopePreview = useMemo(
    () =>
      buildContextRegistryConsumerEnvelope({
        rootNodeIds: selectedId ? [selectedId] : [],
        refs: runtimeRefs,
        resolved: bundleQuery.data ?? null,
      }),
    [bundleQuery.data, runtimeRefs, selectedId]
  );

  const tools = useMemo(() => buildContextRegistryTools({ baseUrl: '', maxResults: 24 }), []);

  const packPreviews = useMemo(
    () =>
      contextPacks.map((pack) => ({
        ...pack,
        seedContext: selectedId ? pack.buildSeedContext([selectedId]) : null,
      })),
    [selectedId]
  );

  return (
    <div className='page-section space-y-6'>
      <PanelHeader
        title='Context Registry'
        description='Centralized workspace for inspecting AI-readable nodes, runtime refs, bundles, and reusable context packs.'
        icon={<NetworkIcon className='size-4' />}
      />

      <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)} className='space-y-6'>
        <TabsList aria-label='Context registry views' className='grid w-full max-w-md grid-cols-3'>
          <TabsTrigger value='catalog'>Catalog</TabsTrigger>
          <TabsTrigger value='packs'>Packs</TabsTrigger>
          <TabsTrigger value='tools'>Tools</TabsTrigger>
        </TabsList>

        <TabsContent value='catalog' className='space-y-6'>
          <div
            className={`${UI_GRID_ROOMY_CLASSNAME} xl:grid-cols-[360px_minmax(0,1fr)]`}
          >
            <ListPanel
              filters={
                <div className='space-y-4'>
                  <div className='space-y-2'>
                    <div className='text-sm font-medium text-gray-200'>Search registry</div>
                    <SearchInput
                      value={query}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setQuery(event.target.value)
                      }
                      onClear={() => setQuery('')}
                      placeholder='Search nodes, tags, descriptions...'
                      size='sm'
                    />
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {NODE_KIND_FILTERS.map((filter) => {
                      const active = kindFilter === filter.value;
                      return (
                        <Button
                          key={filter.value}
                          type='button'
                          variant={active ? 'default' : 'outline'}
                          size='sm'
                          onClick={() => setKindFilter(filter.value)}
                        >
                          {filter.label}
                        </Button>
                      );
                    })}
                  </div>
                  <Hint variant='muted' size='xs'>
                    {searchQuery.data?.total ?? 0} node{(searchQuery.data?.total ?? 0) === 1 ? '' : 's'} visible
                    in the current filter.
                  </Hint>
                </div>
              }
            >
              {searchQuery.error ? (
                <Alert variant='error'>{searchQuery.error.message}</Alert>
              ) : searchQuery.isLoading ? (
                <div className='space-y-2'>
                  <div className='h-16 animate-pulse rounded-xl bg-white/5' />
                  <div className='h-16 animate-pulse rounded-xl bg-white/5' />
                  <div className='h-16 animate-pulse rounded-xl bg-white/5' />
                </div>
              ) : searchQuery.data?.nodes.length ? (
                <div className='space-y-3'>
                  {searchQuery.data.nodes.map((node) => {
                    const isSelected = node.id === selectedId;
                    return (
                      <button
                        key={node.id}
                        type='button'
                        onClick={() => setSelectedId(node.id)}
                        aria-pressed={isSelected}
                        aria-label={`Select ${node.name}`}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          isSelected
                            ? 'border-sky-400/70 bg-sky-500/10'
                            : 'border-white/10 bg-black/20 hover:border-white/20 hover:bg-white/5'
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
                  })}
                </div>
              ) : (
                <EmptyState
                  title='No registry nodes found'
                  description='Try a broader search term or switch to another node kind.'
                />
              )}
            </ListPanel>

            <div className='space-y-6'>
              {selectedNode ? (
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
                      <Badge variant='outline'>
                        class:{selectedNode.permissions.classification}
                      </Badge>
                    </div>
                  </div>
                  <p className='text-sm leading-6 text-gray-300'>{selectedNode.description}</p>

                  <div className='flex flex-wrap gap-2'>
                    {selectedNode.tags.map((tag) => (
                      <Badge key={tag} variant='secondary'>
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
                    <div className='space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4'>
                      <div className='text-sm font-medium text-gray-100'>Relationships</div>
                      {selectedNode.relationships?.length ? (
                        <ul className='space-y-2 text-sm text-gray-300'>
                          {selectedNode.relationships.map((relationship) => (
                            <li key={`${relationship.type}:${relationship.targetId}`} className='rounded-lg bg-black/20 px-3 py-2'>
                              <span className='font-medium text-sky-300'>{relationship.type}</span>{' '}
                              <span className='font-mono text-xs text-gray-400'>
                                {relationship.targetId}
                              </span>
                              {relationship.notes ? (
                                <div className='mt-1 text-xs text-gray-500'>{relationship.notes}</div>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <Hint variant='muted'>This node does not declare direct relationships.</Hint>
                      )}
                    </div>

                    <div className='space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4'>
                      <div className='text-sm font-medium text-gray-100'>Source</div>
                      <div className='space-y-2 text-sm text-gray-300'>
                        <div>
                          <span className='text-gray-500'>Type:</span> {selectedNode.source.type}
                        </div>
                        <div className='break-all font-mono text-xs text-gray-400'>
                          {selectedNode.source.ref}
                        </div>
                        <div>
                          <span className='text-gray-500'>Updated:</span>{' '}
                          {new Date(selectedNode.updatedAtISO).toLocaleString()}
                        </div>
                        <div>
                          <span className='text-gray-500'>Version:</span> {selectedNode.version}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ) : (
                <EmptyState
                  title='Choose a registry node'
                  description='Select a page, component, collection, action, or policy to inspect its context graph.'
                />
              )}

              <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
                <Card className='space-y-4 border-white/10 bg-black/20 p-6'>
                  <div className='flex items-center gap-2'>
                    <SearchIcon className='size-4 text-sky-300' />
                    <h3 className='text-sm font-semibold text-gray-100'>Related Nodes</h3>
                  </div>
                  {relatedQuery.error ? (
                    <Alert variant='error'>{relatedQuery.error.message}</Alert>
                  ) : relatedQuery.isLoading ? (
                    <div className='h-32 animate-pulse rounded-xl bg-white/5' />
                  ) : relatedQuery.data?.nodes.length ? (
                    <ul className='space-y-2'>
                      {relatedQuery.data.nodes.map((node) => (
                        <li key={node.id} className='rounded-xl border border-white/10 bg-white/[0.03] p-3'>
                          <div className='flex items-start justify-between gap-3'>
                            <div>
                              <div className='text-sm font-medium text-gray-100'>{node.name}</div>
                              <div className='font-mono text-[11px] text-gray-500'>{node.id}</div>
                            </div>
                            <Badge variant='outline'>{node.kind}</Badge>
                          </div>
                          {selectedNode ? (
                            <div className='mt-2 text-xs text-gray-400'>
                              {renderRelationshipLabel(selectedNode, node.id)}
                            </div>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <Hint variant='muted'>No related nodes were returned for the current selection.</Hint>
                  )}
                </Card>

                <Card className='space-y-4 border-white/10 bg-black/20 p-6'>
                  <div className='flex items-center gap-2'>
                    <WorkflowIcon className='size-4 text-sky-300' />
                    <h3 className='text-sm font-semibold text-gray-100'>Schema Preview</h3>
                  </div>
                  {selectedNode?.kind !== 'collection' ? (
                    <Hint variant='muted'>Select a collection node to inspect its JSON schema.</Hint>
                  ) : schemaQuery.error ? (
                    <Alert variant='error'>{schemaQuery.error.message}</Alert>
                  ) : schemaQuery.isLoading ? (
                    <div className='h-32 animate-pulse rounded-xl bg-white/5' />
                  ) : schemaQuery.data?.schema ? (
                    <JsonViewer data={schemaQuery.data.schema} title={schemaQuery.data.entity} />
                  ) : (
                    <Hint variant='muted'>No schema is registered for this collection.</Hint>
                  )}
                </Card>
              </div>

              <Card className='space-y-4 border-white/10 bg-black/20 p-6'>
                <div className='flex items-center gap-2'>
                  <NetworkIcon className='size-4 text-sky-300' />
                  <h3 className='text-sm font-semibold text-gray-100'>Bundle Preview</h3>
                </div>
                <div
                  className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]`}
                >
                  <div className='space-y-3'>
                    <div className='text-sm text-gray-300'>
                      Add runtime refs to preview live documents next to the selected static node.
                    </div>
                    <Textarea
                      value={runtimeRefsText}
                      onChange={(event) => setRuntimeRefsText(event.target.value)}
                      placeholder={'runtime:kangur:learner:abc123\nruntime:ai-path-run:run_42'}
                      rows={6}
                     aria-label='runtime:kangur:learner:abc123\nruntime:ai-path-run:run_42' title='runtime:kangur:learner:abc123\nruntime:ai-path-run:run_42'/>
                    <Hint variant='muted' size='xs'>
                      Accepted values are raw runtime ref IDs. One per line or comma-separated.
                    </Hint>
                    {bundleRequest ? (
                      <div className='rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-gray-400'>
                        {bundleRequest.refs.length} ref{bundleRequest.refs.length === 1 ? '' : 's'} in
                        preview payload.
                      </div>
                    ) : null}
                  </div>

                  <div className='space-y-4'>
                    {bundleQuery.error ? (
                      <Alert variant='error'>{bundleQuery.error.message}</Alert>
                    ) : bundleQuery.data ? (
                      <>
                        <div className='grid gap-3 md:grid-cols-3'>
                          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-4'>
                            <div className='text-xs uppercase tracking-wide text-gray-500'>Nodes</div>
                            <div className='mt-2 text-2xl font-semibold text-gray-50'>
                              {bundleQuery.data.nodes.length}
                            </div>
                          </div>
                          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-4'>
                            <div className='text-xs uppercase tracking-wide text-gray-500'>Documents</div>
                            <div className='mt-2 text-2xl font-semibold text-gray-50'>
                              {bundleQuery.data.documents.length}
                            </div>
                          </div>
                          <div className='rounded-2xl border border-white/10 bg-white/[0.03] p-4'>
                            <div className='text-xs uppercase tracking-wide text-gray-500'>Truncated</div>
                            <div className='mt-2 text-2xl font-semibold text-gray-50'>
                              {bundleQuery.data.truncated ? 'Yes' : 'No'}
                            </div>
                          </div>
                        </div>

                        {bundleQuery.data.documents.length ? (
                          <div className='space-y-3'>
                            <div className='text-sm font-medium text-gray-100'>Runtime Documents</div>
                            <div className='space-y-3'>
                              {bundleQuery.data.documents.map((document) => (
                                <div key={document.id} className='rounded-xl border border-white/10 bg-white/[0.03] p-4'>
                                  <div className='flex flex-wrap items-center gap-2'>
                                    <div className='text-sm font-semibold text-gray-100'>
                                      {document.title}
                                    </div>
                                    <Badge variant='secondary'>{document.entityType}</Badge>
                                    {document.status ? (
                                      <Badge variant='outline'>{document.status}</Badge>
                                    ) : null}
                                  </div>
                                  <p className='mt-2 text-sm text-gray-300'>{document.summary}</p>
                                  {document.tags.length ? (
                                    <div className='mt-3 flex flex-wrap gap-1.5'>
                                      {document.tags.map((tag) => (
                                        <Badge key={tag} variant='outline'>
                                          {tag}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Hint variant='muted'>
                            No runtime documents were resolved for the current preview.
                          </Hint>
                        )}

                        <JsonViewer data={envelopePreview} title='Consumer Envelope' maxHeight={320} />
                      </>
                    ) : (
                      <Hint variant='muted'>
                        Select a node or add runtime refs to build a preview bundle.
                      </Hint>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value='packs' className='space-y-6'>
          <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
            {packPreviews.map((pack) => (
              <Card key={pack.id} className='space-y-4 border-white/10 bg-black/20 p-6'>
                <div className='flex items-start justify-between gap-3'>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-50'>{pack.id}</h3>
                    <p className='mt-2 text-sm text-gray-300'>{pack.description}</p>
                  </div>
                  <Badge variant='outline'>{pack.allowedKinds.join(', ')}</Badge>
                </div>
                <div className='grid gap-3 sm:grid-cols-3'>
                  <div className='rounded-xl border border-white/10 bg-white/[0.03] p-3'>
                    <div className='text-xs uppercase tracking-wide text-gray-500'>Max steps</div>
                    <div className='mt-2 text-lg font-semibold text-gray-50'>{pack.maxSteps}</div>
                  </div>
                  <div className='rounded-xl border border-white/10 bg-white/[0.03] p-3'>
                    <div className='text-xs uppercase tracking-wide text-gray-500'>Max nodes</div>
                    <div className='mt-2 text-lg font-semibold text-gray-50'>{pack.maxNodes}</div>
                  </div>
                  <div className='rounded-xl border border-white/10 bg-white/[0.03] p-3'>
                    <div className='text-xs uppercase tracking-wide text-gray-500'>Max bytes</div>
                    <div className='mt-2 text-lg font-semibold text-gray-50'>{pack.maxBytes}</div>
                  </div>
                </div>
                <JsonViewer data={pack.systemPrompt} title='System Prompt' maxHeight={180} />
                {pack.seedContext ? (
                  <JsonViewer data={pack.seedContext} title='Seed Context Preview' maxHeight={180} />
                ) : (
                  <Hint variant='muted'>
                    Select a registry node in Catalog to preview the generated seed context.
                  </Hint>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value='tools' className='space-y-6'>
          <div className={`${UI_GRID_ROOMY_CLASSNAME} lg:grid-cols-2`}>
            {tools.map((tool) => (
              <Card key={tool.function.name} className='space-y-4 border-white/10 bg-black/20 p-6'>
                <div className='flex items-center gap-2'>
                  <WrenchIcon className='size-4 text-sky-300' />
                  <h3 className='text-lg font-semibold text-gray-50'>{tool.function.name}</h3>
                </div>
                <p className='text-sm text-gray-300'>{tool.function.description}</p>
                <JsonViewer
                  data={tool.function.parameters ?? {}}
                  title='Parameters'
                  maxHeight={220}
                />
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
