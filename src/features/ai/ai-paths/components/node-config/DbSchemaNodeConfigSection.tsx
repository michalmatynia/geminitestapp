'use client';

import { keepPreviousData } from '@tanstack/react-query';
import React from 'react';

import { dbApi } from '@/shared/lib/ai-paths/api';
import type { CollectionSchema, SchemaData } from '@/shared/contracts/database';
import { createListQueryV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button, Label, SelectSimple, SearchInput, Pagination, Card, Hint } from '@/shared/ui';

import { useAiPathConfig } from '../AiPathConfigContext';

const normalizeSchemaCollections = (schema: SchemaData | null): CollectionSchema[] => {
  if (!schema) return [];

  const stripUndefinedProvider = (collection: CollectionSchema): CollectionSchema => {
    const { provider, ...rest } = collection;
    return provider ? { ...rest, provider } : rest;
  };

  if (schema.provider === 'multi') {
    const collectionsRaw = Array.isArray(schema.collections)
      ? schema.collections
      : Object.values(schema.collections ?? {});
    const collections: CollectionSchema[] = Array.from(
      collectionsRaw as unknown as CollectionSchema[]
    );
    if (collections.length) {
      return collections.map((collection) => stripUndefinedProvider(collection));
    }
    const merged: CollectionSchema[] = [];
    (['mongodb', 'prisma'] as const).forEach((provider) => {
      const source = schema.sources?.[provider] as
        | { collections?: CollectionSchema[] | Record<string, CollectionSchema> }
        | null
        | undefined;
      if (!source?.collections) return;
      const sourceCollectionsRaw = Array.isArray(source.collections)
        ? source.collections
        : Object.values(source.collections);
      const sourceCollections: CollectionSchema[] = Array.from(
        sourceCollectionsRaw as unknown as CollectionSchema[]
      );
      if (!sourceCollections.length) return;
      sourceCollections.forEach((collection) => {
        merged.push({ ...stripUndefinedProvider(collection), provider });
      });
    });
    return merged;
  }

  const provider = schema.provider as 'mongodb' | 'prisma';
  const baseCollectionsRaw = Array.isArray(schema.collections)
    ? schema.collections
    : Object.values(schema.collections ?? {});
  const baseCollections: CollectionSchema[] = Array.from(
    baseCollectionsRaw as unknown as CollectionSchema[]
  );
  return baseCollections.map((collection) => ({
    ...stripUndefinedProvider(collection),
    provider,
  }));
};

const buildCollectionKey = (collection: CollectionSchema, includeProvider: boolean): string =>
  includeProvider && collection.provider
    ? `${collection.provider}:${collection.name}`
    : collection.name;

const matchesCollectionSelection = (
  collection: CollectionSchema,
  selectedSet: Set<string>
): boolean => {
  const nameKey = collection.name.toLowerCase();
  if (selectedSet.has(nameKey)) return true;
  if (collection.provider) {
    const providerKey = `${collection.provider}:${collection.name}`.toLowerCase();
    if (selectedSet.has(providerKey)) return true;
  }
  return false;
};

interface SchemaConfig {
  provider: 'auto' | 'mongodb' | 'prisma' | 'all';
  mode: 'all' | 'selected';
  collections: string[];
  includeFields: boolean;
  includeRelations: boolean;
  formatAs: 'json' | 'text';
}

export function DbSchemaNodeConfigSection(): React.JSX.Element | null {
  const { selectedNode, updateSelectedNodeConfig } = useAiPathConfig();

  if (!selectedNode) return null;

  // Data Browser state
  const [browseCollection, setBrowseCollection] = React.useState<string | null>(null);
  const [browseSkip, setBrowseSkip] = React.useState(0);
  const [browseSearch, setBrowseSearch] = React.useState('');
  const [browseQuery, setBrowseQuery] = React.useState('');
  const [expandedDocId, setExpandedDocId] = React.useState<string | null>(null);
  const [browseProvider, setBrowseProvider] = React.useState<'mongodb' | 'prisma' | null>(null);
  const browseLimit = 10;

  const schemaConfig: SchemaConfig = {
    provider: selectedNode.config?.db_schema?.provider ?? 'all',
    mode: selectedNode.config?.db_schema?.mode ?? 'all',
    collections: selectedNode.config?.db_schema?.collections ?? [],
    includeFields: selectedNode.config?.db_schema?.includeFields ?? true,
    includeRelations: selectedNode.config?.db_schema?.includeRelations ?? true,
    formatAs: selectedNode.config?.db_schema?.formatAs ?? 'text',
  };

  const schemaQuery = createListQueryV2<SchemaData, SchemaData>({
    queryKey: QUERY_KEYS.system.databases.schema({ provider: schemaConfig.provider ?? 'auto' }),
    queryFn: async (): Promise<SchemaData> => {
      const result = await dbApi.schema({ provider: schemaConfig.provider });
      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch schema.');
      }
      return result.data;
    },
    enabled: selectedNode.type === 'db_schema',
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.node-config.db-schema.schema',
      operation: 'list',
      resource: 'databases.schema',
      domain: 'global',
      tags: ['ai-paths', 'node-config', 'db-schema'],
    },
  });

  const browseQueryResult = createListQueryV2<
    { documents: Record<string, unknown>[]; total: number },
    { documents: Record<string, unknown>[]; total: number }
  >({
    queryKey: QUERY_KEYS.system.databases.preview({
      provider: browseProvider,
      collection: browseCollection,
      skip: browseSkip,
      query: browseQuery,
    }),
    queryFn: async (): Promise<{ documents: Record<string, unknown>[]; total: number }> => {
      if (!browseCollection) {
        return { documents: [], total: 0 };
      }
      const result = await dbApi.browse(browseCollection, {
        limit: browseLimit,
        skip: browseSkip,
        ...(browseQuery.trim() ? { query: browseQuery.trim() } : {}),
        ...(browseProvider ? { provider: browseProvider } : {}),
      });
      if (!result.ok) {
        throw new Error(result.error || 'Failed to browse collection.');
      }
      return {
        documents: result.data.documents ?? [],
        total: result.data.total ?? 0,
      };
    },
    enabled: Boolean(browseCollection),
    placeholderData: keepPreviousData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      source: 'ai.ai-paths.node-config.db-schema.preview',
      operation: 'list',
      resource: 'databases.preview',
      domain: 'global',
      tags: ['ai-paths', 'node-config', 'db-schema'],
    },
  });

  const fetchedDbSchema = schemaQuery.data ?? null;
  const schemaLoading = schemaQuery.isFetching;
  const browseDocuments = browseQueryResult.data?.documents ?? [];
  const browseTotal = browseQueryResult.data?.total ?? 0;
  const browseLoading = browseQueryResult.isFetching;

  const schemaCollections = React.useMemo(
    () => normalizeSchemaCollections(fetchedDbSchema),
    [fetchedDbSchema]
  );
  const showProviderLabel = fetchedDbSchema?.provider === 'multi';
  const availableProviders = React.useMemo<Array<'mongodb' | 'prisma'>>(() => {
    if (!fetchedDbSchema) return [] as Array<'mongodb' | 'prisma'>;
    if (fetchedDbSchema.provider === 'multi') {
      const providers = new Set<'mongodb' | 'prisma'>();
      schemaCollections.forEach((collection) => {
        if (collection.provider === 'mongodb' || collection.provider === 'prisma') {
          providers.add(collection.provider);
        }
      });
      return Array.from(providers);
    }
    if (fetchedDbSchema.provider === 'mongodb' || fetchedDbSchema.provider === 'prisma') {
      return [fetchedDbSchema.provider];
    }
    return [] as Array<'mongodb' | 'prisma'>;
  }, [fetchedDbSchema, schemaCollections]);

  React.useEffect((): void => {
    if (schemaConfig.provider === 'mongodb' || schemaConfig.provider === 'prisma') {
      setBrowseProvider(schemaConfig.provider);
      return;
    }
    if (!browseProvider || !availableProviders.includes(browseProvider)) {
      setBrowseProvider(availableProviders[0] ?? null);
    }
  }, [schemaConfig.provider, availableProviders, browseProvider]);

  React.useEffect((): void => {
    setBrowseCollection(null);
    setBrowseSkip(0);
    setBrowseSearch('');
    setBrowseQuery('');
    setExpandedDocId(null);
  }, [browseProvider]);

  if (selectedNode.type !== 'db_schema') return null;

  const updateSchemaConfig = (patch: Partial<typeof schemaConfig>): void => {
    const nextConfig = { ...schemaConfig, ...patch };
    updateSelectedNodeConfig({
      db_schema: nextConfig,
    });
  };

  const toggleCollection = (collection: CollectionSchema): void => {
    const current = schemaConfig.collections ?? [];
    const includeProvider = fetchedDbSchema?.provider === 'multi';
    const key = buildCollectionKey(collection, includeProvider);
    const next = current.includes(key)
      ? current.filter((c: string): boolean => c !== key)
      : [...current, key];
    updateSchemaConfig({ collections: next });
  };

  return (
    <div className='space-y-4'>
      <Card variant='subtle' padding='md' className='border-purple-800/50 bg-purple-950/20'>
        <Hint size='xs' uppercase={false} className='mb-3 font-medium text-purple-300'>
          Database Schema Browser
        </Hint>

        {schemaLoading ? (
          <div className='py-4 text-center text-sm text-gray-400'>Loading schema...</div>
        ) : schemaCollections.length > 0 ? (
          <div className='space-y-4'>
            <div className='text-xs text-gray-400'>
              Provider:{' '}
              <span className='text-purple-300'>
                {fetchedDbSchema?.provider === 'multi'
                  ? availableProviders.join(' + ') || 'multi'
                  : fetchedDbSchema?.provider || 'N/A'}
              </span>
              {' · '}
              {schemaCollections.length} collections
            </div>

            <div>
              <Label className='text-xs text-gray-400'>Schema Provider</Label>
              <SelectSimple
                size='sm'
                value={schemaConfig.provider ?? 'auto'}
                onValueChange={(value: string) =>
                  updateSchemaConfig({ provider: value as 'auto' | 'mongodb' | 'prisma' | 'all' })
                }
                options={[
                  { value: 'auto', label: 'Auto (Primary DB)' },
                  { value: 'mongodb', label: 'MongoDB' },
                  { value: 'prisma', label: 'Prisma (PostgreSQL)' },
                  { value: 'all', label: 'All Providers' },
                ]}
                triggerClassName='mt-2 border-border bg-card/70'
              />
            </div>

            <div>
              <Label className='text-xs text-gray-400'>Collection Mode</Label>
              <SelectSimple
                size='sm'
                value={schemaConfig.mode}
                onValueChange={(value: string) =>
                  updateSchemaConfig({ mode: value as 'all' | 'selected' })
                }
                options={[
                  { value: 'all', label: 'All Collections' },
                  { value: 'selected', label: 'Selected Collections Only' },
                ]}
                triggerClassName='mt-2 border-border bg-card/70'
              />
            </div>

            {schemaConfig.mode === 'selected' && (
              <div>
                <Label className='text-xs text-gray-400'>
                  Select Collections ({schemaConfig.collections?.length ?? 0} selected)
                </Label>
                <Card
                  variant='subtle-compact'
                  padding='sm'
                  className='mt-2 max-h-[200px] space-y-1 overflow-y-auto border-border bg-card/50'
                >
                  {schemaCollections.map((coll) => {
                    const includeProvider = fetchedDbSchema?.provider === 'multi';
                    const key = buildCollectionKey(coll, includeProvider);
                    const isSelected = schemaConfig.collections?.includes(key);
                    return (
                      <button
                        key={key}
                        type='button'
                        onClick={() => toggleCollection(coll)}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs transition ${
                          isSelected
                            ? 'bg-purple-500/20 text-purple-200'
                            : 'text-gray-300 hover:bg-muted/50'
                        }`}
                      >
                        <span className='font-medium'>
                          {coll.name}
                          {showProviderLabel && coll.provider ? (
                            <span className='ml-2 text-[10px] text-gray-500'>
                              ({coll.provider})
                            </span>
                          ) : null}
                        </span>
                        <span className='text-[10px] text-gray-500'>
                          {coll.fields?.length ?? 0} fields
                        </span>
                      </button>
                    );
                  })}
                </Card>
              </div>
            )}

            <div className='grid grid-cols-2 gap-3'>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-center justify-between border-border bg-card/50 text-xs text-gray-300'
              >
                <span>Include Fields</span>
                <Button
                  variant={schemaConfig.includeFields ? 'success' : 'default'}
                  size='xs'
                  type='button'
                  onClick={() => updateSchemaConfig({ includeFields: !schemaConfig.includeFields })}
                >
                  {schemaConfig.includeFields ? 'Yes' : 'No'}
                </Button>
              </Card>
              <Card
                variant='subtle-compact'
                padding='sm'
                className='flex items-center justify-between border-border bg-card/50 text-xs text-gray-300'
              >
                <span>Include Relations</span>
                <Button
                  variant={schemaConfig.includeRelations ? 'success' : 'default'}
                  size='xs'
                  type='button'
                  onClick={() =>
                    updateSchemaConfig({ includeRelations: !schemaConfig.includeRelations })
                  }
                >
                  {schemaConfig.includeRelations ? 'Yes' : 'No'}
                </Button>
              </Card>
            </div>

            <div>
              <Label className='text-xs text-gray-400'>Output Format</Label>
              <SelectSimple
                size='sm'
                value={schemaConfig.formatAs}
                onValueChange={(value: string) =>
                  updateSchemaConfig({ formatAs: value as 'json' | 'text' })
                }
                options={[
                  { value: 'text', label: 'Text (Human Readable)' },
                  { value: 'json', label: 'JSON (Structured)' },
                ]}
                triggerClassName='mt-2 border-border bg-card/70'
              />
            </div>

            {/* Preview of selected collections */}
            <Card variant='subtle-compact' padding='sm' className='border-border bg-card/40'>
              <div className='mb-2 text-[10px] uppercase text-gray-500'>Preview</div>
              <div className='max-h-[150px] overflow-y-auto text-[11px] text-gray-300'>
                {(schemaConfig.mode === 'all'
                  ? schemaCollections
                  : schemaCollections.filter((collection) =>
                      matchesCollectionSelection(
                        collection,
                        new Set(
                          (schemaConfig.collections ?? []).map((c: string) => c.toLowerCase())
                        )
                      )
                    )
                ).map((coll) => (
                  <div key={`${coll.provider ?? 'db'}:${coll.name}`} className='mb-2'>
                    <div className='font-medium text-purple-300'>
                      {coll.name}
                      {showProviderLabel && coll.provider ? (
                        <span className='ml-2 text-[10px] text-gray-500'>({coll.provider})</span>
                      ) : null}
                    </div>
                    {schemaConfig.includeFields && coll.fields && (
                      <div className='ml-2 text-[10px] text-gray-500'>
                        {coll.fields
                          .slice(0, 5)
                          .map((f) => f.name)
                          .join(', ')}
                        {coll.fields.length > 5 && ` +${coll.fields.length - 5} more`}
                      </div>
                    )}
                  </div>
                ))}
                {schemaConfig.mode === 'selected' &&
                  (!schemaConfig.collections || schemaConfig.collections.length === 0) && (
                    <div className='italic text-gray-500'>No collections selected</div>
                  )}
              </div>
            </Card>

            {/* Data Browser */}
            <Card
              variant='subtle-compact'
              padding='sm'
              className='border-cyan-800/50 bg-cyan-950/20'
            >
              <Hint size='xs' uppercase={false} className='mb-3 font-medium text-cyan-300'>
                Data Browser
              </Hint>
              <div className='space-y-2'>
                <Label className='text-xs text-gray-400'>Browse Collection</Label>
                <div className='flex gap-2'>
                  <div className='flex flex-1 flex-col gap-2'>
                    {availableProviders.length > 1 && (
                      <SelectSimple
                        size='sm'
                        value={browseProvider ?? ''}
                        onValueChange={(value: string) => {
                          setBrowseProvider((value as 'mongodb' | 'prisma') || null);
                        }}
                        options={availableProviders.map((provider) => ({
                          value: provider,
                          label: provider,
                        }))}
                        triggerClassName='border-border bg-card/70'
                        placeholder='Select provider'
                      />
                    )}
                    <SelectSimple
                      size='sm'
                      value={browseCollection ?? ''}
                      onValueChange={(value: string) => {
                        setBrowseCollection(value || null);
                        setBrowseSkip(0);
                        setBrowseSearch('');
                        setBrowseQuery('');
                        setExpandedDocId(null);
                      }}
                      options={schemaCollections
                        .filter((collection) =>
                          browseProvider ? collection.provider === browseProvider : true
                        )
                        .map((coll) => ({
                          value: coll.name,
                          label:
                            coll.name +
                            (showProviderLabel && coll.provider ? ` (${coll.provider})` : ''),
                        }))}
                      triggerClassName='flex-1 border-border bg-card/70'
                      placeholder='Select collection to browse'
                    />
                  </div>
                  {browseCollection && (
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {
                        setBrowseCollection(null);
                        setBrowseSkip(0);
                        setBrowseSearch('');
                        setBrowseQuery('');
                        setExpandedDocId(null);
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {browseCollection && (
                <div className='mt-3 space-y-3'>
                  {/* Search */}
                  <div className='flex gap-2'>
                    <SearchInput
                      className='flex-1 border-border bg-card/70'
                      placeholder='Search documents...'
                      value={browseSearch}
                      onChange={(e) => setBrowseSearch(e.target.value)}
                      onClear={() => {
                        setBrowseSearch('');
                        setBrowseSkip(0);
                        setBrowseQuery('');
                      }}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                          setBrowseSkip(0);
                          setBrowseQuery(browseSearch.trim());
                        }
                      }}
                      size='sm'
                    />
                    <Button
                      type='button'
                      variant='info'
                      size='sm'
                      onClick={() => {
                        setBrowseSkip(0);
                        setBrowseQuery(browseSearch.trim());
                      }}
                    >
                      Search
                    </Button>
                  </div>

                  {/* Results info */}
                  <div className='text-[10px] text-gray-500'>
                    Showing {browseSkip + 1}-{Math.min(browseSkip + browseLimit, browseTotal)} of{' '}
                    {browseTotal} documents
                  </div>

                  {/* Documents list */}
                  {browseLoading ? (
                    <div className='py-4 text-center text-sm text-gray-400'>
                      Loading documents...
                    </div>
                  ) : browseDocuments.length > 0 ? (
                    <div className='max-h-[300px] space-y-2 overflow-y-auto'>
                      {browseDocuments.map((doc: Record<string, unknown>, idx: number) => {
                        const rawId = doc['_id'] ?? doc['id'];
                        let docId: string;
                        if (typeof rawId === 'string') {
                          docId = rawId;
                        } else if (typeof rawId === 'number') {
                          docId = String(rawId);
                        } else if (
                          rawId &&
                          typeof rawId === 'object' &&
                          'toString' in rawId &&
                          typeof (rawId as { toString: unknown }).toString === 'function' &&
                          (rawId as { toString: unknown }).toString !== Object.prototype.toString
                        ) {
                          docId = (rawId as { toString(): string }).toString();
                        } else {
                          docId = `doc-${idx}`;
                        }
                        const isExpanded = expandedDocId === docId;
                        const displayNameValue =
                          doc['name'] ?? doc['title'] ?? doc['name_en'] ?? doc['sku'] ?? docId;
                        let displayName: string;
                        if (typeof displayNameValue === 'string') {
                          displayName = displayNameValue;
                        } else if (
                          typeof displayNameValue === 'number' ||
                          typeof displayNameValue === 'boolean'
                        ) {
                          displayName = String(displayNameValue);
                        } else if (
                          typeof displayNameValue === 'object' &&
                          displayNameValue !== null
                        ) {
                          displayName = JSON.stringify(displayNameValue);
                        } else {
                          displayName = '';
                        }
                        return (
                          <Card
                            key={docId}
                            variant='subtle-compact'
                            padding='none'
                            className='border-border bg-card/50'
                          >
                            <button
                              type='button'
                              className='flex w-full items-center justify-between px-3 py-2 text-left text-xs hover:bg-muted/50/50'
                              onClick={() => setExpandedDocId(isExpanded ? null : docId)}
                            >
                              <div className='flex items-center gap-2'>
                                <span className='text-cyan-300'>{displayName}</span>
                                <span className='text-[9px] text-gray-500'>({docId})</span>
                              </div>
                              <svg
                                className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                fill='none'
                                viewBox='0 0 24 24'
                                stroke='currentColor'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M19 9l-7 7-7-7'
                                />
                              </svg>
                            </button>
                            {isExpanded && (
                              <div className='border-t border-border p-3'>
                                <pre className='max-h-[200px] overflow-auto whitespace-pre-wrap text-[10px] text-gray-300'>
                                  {JSON.stringify(doc, null, 2)}
                                </pre>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className='py-4 text-center text-sm text-gray-500'>No documents found</div>
                  )}

                  {/* Pagination */}
                  {browseTotal > browseLimit && (
                    <div className='flex justify-end pt-2'>
                      <Pagination
                        page={Math.floor(browseSkip / browseLimit) + 1}
                        totalPages={Math.ceil(browseTotal / browseLimit)}
                        pageSize={browseLimit}
                        onPageChange={(p) => setBrowseSkip((p - 1) * browseLimit)}
                        variant='compact'
                      />
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <div className='space-y-3'>
            <div className='py-4 text-center text-sm text-gray-500'>No schema data available</div>
            <Button
              type='button'
              variant='outline'
              className='w-full'
              onClick={(): void => {
                void schemaQuery.refetch();
              }}
            >
              Fetch Schema
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
