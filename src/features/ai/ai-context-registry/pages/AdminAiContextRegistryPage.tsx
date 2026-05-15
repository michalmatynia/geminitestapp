'use client';

import { NetworkIcon } from 'lucide-react';
import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';

import type {
  ContextBundleRequest,
  ContextNode,
  ContextNodeKind,
  ContextRegistryResolutionBundle,
  ContextRelatedResponse,
  ContextSchemaResponse,
  ContextSearchResponse,
} from '@/shared/contracts/ai-context-registry';
import { useListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { PanelHeader } from '@/shared/ui/templates.public';

import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryRefs,
} from '../context/page-context-shared';
import { contextPacks } from '../registry/context-packs';
import { buildContextRegistryTools } from '../tools/ai-tools';
import { ContextCatalogTab } from './AdminAiContextRegistryCatalogTab';
import {
  ContextPacksTab,
  ContextToolsTab,
} from './AdminAiContextRegistryPageSecondaryTabs';
import {
  NODE_KIND_FILTERS,
  parseRuntimeRefs,
  selectedRootIdsToRefs,
} from './AdminAiContextRegistryPage.utils';

type PageTab = 'catalog' | 'packs' | 'tools';
type ContextRegistrySearchState = {
  deferredQuery: string;
  kindFilter: ContextNodeKind | 'all';
  query: string;
  runtimeRefsText: string;
  searchQuery: ReturnType<typeof useListQueryV2<ContextSearchResponse, ContextSearchResponse>>;
  selectedId: string | null;
  selectedNode: ContextNode | null;
  setKindFilter: (kind: ContextNodeKind | 'all') => void;
  setQuery: (query: string) => void;
  setRuntimeRefsText: (text: string) => void;
  setSelectedId: (id: string | null) => void;
};

const asPageTab = (value: string): PageTab =>
  value === 'packs' || value === 'tools' ? value : 'catalog';

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

  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as T;
};

const getJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) throw new Error(await readErrorMessage(response));
  return (await response.json()) as T;
};

const useContextRegistrySearchState = (): ContextRegistrySearchState => {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<ContextNodeKind | 'all'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [runtimeRefsText, setRuntimeRefsText] = useState('');
  const deferredQuery = useDeferredValue(query);
  const trimmedQuery = deferredQuery.trim();

  const searchQuery = useListQueryV2<ContextSearchResponse, ContextSearchResponse>({
    queryKey: QUERY_KEYS.ai.contextRegistry.search(deferredQuery, kindFilter),
    queryFn: async () =>
      await postJson<ContextSearchResponse>('/api/ai/context/search', {
        query: trimmedQuery === '' ? undefined : trimmedQuery,
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
    const nodes = searchQuery.data?.nodes ?? [];
    if (nodes.length === 0) {
      setSelectedId(null);
      return;
    }
    if (selectedId === null || !nodes.some((node) => node.id === selectedId)) {
      setSelectedId(nodes[0]?.id ?? null);
    }
  }, [searchQuery.data?.nodes, selectedId]);

  return {
    deferredQuery,
    kindFilter,
    query,
    runtimeRefsText,
    searchQuery,
    selectedId,
    selectedNode,
    setKindFilter,
    setQuery,
    setRuntimeRefsText,
    setSelectedId,
  };
};

const useRelatedQuery = (
  selectedId: string | null
): ReturnType<typeof useListQueryV2<ContextRelatedResponse, ContextRelatedResponse>> =>
  useListQueryV2<ContextRelatedResponse, ContextRelatedResponse>({
    queryKey: QUERY_KEYS.ai.contextRegistry.related(selectedId),
    queryFn: async () => {
      if (selectedId === null) throw new Error('Select a node before loading related context.');
      return await getJson<ContextRelatedResponse>(
        `/api/ai/context/related/${encodeURIComponent(selectedId)}`
      );
    },
    enabled: selectedId !== null,
    meta: {
      source: 'ai-context-registry.page.related',
      operation: 'list',
      resource: 'ai.context-registry.related',
      domain: 'ai',
      queryKey: QUERY_KEYS.ai.contextRegistry.related(selectedId),
      tags: ['ai', 'context-registry', 'related'],
      description: 'Loads related AI context registry nodes.',
    },
  });

const useSchemaQuery = (
  selectedNode: ContextNode | null
): ReturnType<typeof useListQueryV2<ContextSchemaResponse, ContextSchemaResponse>> =>
  useListQueryV2<ContextSchemaResponse, ContextSchemaResponse>({
    queryKey: QUERY_KEYS.ai.contextRegistry.schema(selectedNode?.id ?? null),
    queryFn: async () => {
      if (selectedNode === null) {
        throw new Error('Select a collection node before loading its schema.');
      }
      return await getJson<ContextSchemaResponse>(
        `/api/ai/schema/${encodeURIComponent(selectedNode.name)}`
      );
    },
    enabled: selectedNode?.kind === 'collection',
    meta: {
      source: 'ai-context-registry.page.schema',
      operation: 'list',
      resource: 'ai.context-registry.schema',
      domain: 'ai',
      queryKey: QUERY_KEYS.ai.contextRegistry.schema(selectedNode?.id ?? null),
      tags: ['ai', 'context-registry', 'schema'],
      description: 'Loads AI context registry collection schema.',
    },
  });

const useBundleState = (input: {
  runtimeRefsText: string;
  selectedId: string | null;
}): {
  bundleQuery: ReturnType<
    typeof useListQueryV2<ContextRegistryResolutionBundle, ContextRegistryResolutionBundle>
  >;
  bundleRequest: ContextBundleRequest | null;
  envelopePreview: unknown;
  runtimeRefs: ReturnType<typeof parseRuntimeRefs>;
} => {
  const deferredRuntimeRefsText = useDeferredValue(input.runtimeRefsText);
  const runtimeRefs = useMemo(
    () => parseRuntimeRefs(deferredRuntimeRefsText),
    [deferredRuntimeRefsText]
  );
  const bundleRequest = useMemo<ContextBundleRequest | null>(() => {
    const refs = mergeContextRegistryRefs(selectedRootIdsToRefs(input.selectedId), runtimeRefs);
    return refs.length === 0 ? null : { refs, depth: 1, maxNodes: 48 };
  }, [input.selectedId, runtimeRefs]);

  const bundleKey = JSON.stringify(bundleRequest ?? null);
  const bundleQuery = useListQueryV2<
    ContextRegistryResolutionBundle,
    ContextRegistryResolutionBundle
  >({
    queryKey: QUERY_KEYS.ai.contextRegistry.bundle(bundleKey),
    queryFn: async () => {
      if (bundleRequest === null) {
        throw new Error('Select a node or add runtime refs before resolving a bundle.');
      }
      return await postJson<ContextRegistryResolutionBundle>('/api/ai/context/bundle', bundleRequest);
    },
    enabled: bundleRequest !== null,
    meta: {
      source: 'ai-context-registry.page.bundle',
      operation: 'list',
      resource: 'ai.context-registry.bundle',
      domain: 'ai',
      queryKey: QUERY_KEYS.ai.contextRegistry.bundle(bundleKey),
      tags: ['ai', 'context-registry', 'bundle'],
      description: 'Resolves AI context registry bundles.',
    },
  });

  const envelopePreview = useMemo(
    () =>
      buildContextRegistryConsumerEnvelope({
        rootNodeIds: input.selectedId !== null ? [input.selectedId] : [],
        refs: runtimeRefs,
        resolved: bundleQuery.data ?? null,
      }),
    [bundleQuery.data, input.selectedId, runtimeRefs]
  );

  return { bundleQuery, bundleRequest, envelopePreview, runtimeRefs };
};

export function AdminAiContextRegistryPage(): React.JSX.Element {
  const [tab, setTab] = useState<PageTab>('catalog');
  const searchState = useContextRegistrySearchState();
  const relatedQuery = useRelatedQuery(searchState.selectedId);
  const schemaQuery = useSchemaQuery(searchState.selectedNode);
  const bundleState = useBundleState({
    runtimeRefsText: searchState.runtimeRefsText,
    selectedId: searchState.selectedId,
  });
  const tools = useMemo(() => buildContextRegistryTools({ baseUrl: '', maxResults: 24 }), []);
  const packPreviews = useMemo(
    () =>
      contextPacks.map((pack) => ({
        ...pack,
        seedContext:
          searchState.selectedId !== null ? pack.buildSeedContext([searchState.selectedId]) : null,
      })),
    [searchState.selectedId]
  );

  return (
    <div className='page-section space-y-6'>
      <PanelHeader
        title='Context Registry'
        description='Centralized workspace for inspecting AI-readable nodes, runtime refs, bundles, and reusable context packs.'
        icon={<NetworkIcon className='size-4' />}
      />
      <Tabs value={tab} onValueChange={(value) => setTab(asPageTab(value))} className='space-y-6'>
        <TabsList aria-label='Context registry views' className='grid w-full max-w-md grid-cols-3'>
          <TabsTrigger value='catalog'>Catalog</TabsTrigger>
          <TabsTrigger value='packs'>Packs</TabsTrigger>
          <TabsTrigger value='tools'>Tools</TabsTrigger>
        </TabsList>
        <TabsContent value='catalog' className='space-y-6'>
          <ContextCatalogTab
            {...searchState}
            {...bundleState}
            nodeKindFilters={NODE_KIND_FILTERS}
            relatedQuery={relatedQuery}
            schemaQuery={schemaQuery}
            onKindFilterChange={searchState.setKindFilter}
            onQueryChange={searchState.setQuery}
            onRuntimeRefsTextChange={searchState.setRuntimeRefsText}
            onSelectedIdChange={searchState.setSelectedId}
          />
        </TabsContent>
        <TabsContent value='packs' className='space-y-6'>
          <ContextPacksTab packPreviews={packPreviews} />
        </TabsContent>
        <TabsContent value='tools' className='space-y-6'>
          <ContextToolsTab tools={tools} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
