'use client';

import { LayoutGrid } from 'lucide-react';
import React from 'react';

import {
  TEMPLATE_SNIPPETS,
  PRISMA_TEMPLATE_SNIPPETS,
  SORT_PRESETS,
  PRISMA_SORT_PRESETS,
  PROJECTION_PRESETS,
  PRISMA_PROJECTION_PRESETS,
  READ_QUERY_TYPES,
  PRISMA_READ_QUERY_TYPES,
  QUERY_OPERATOR_GROUPS,
  PRISMA_QUERY_OPERATOR_GROUPS,
  UPDATE_OPERATOR_GROUPS,
  PRISMA_UPDATE_OPERATOR_GROUPS,
  AGGREGATION_STAGE_SNIPPETS,
  PRISMA_AGGREGATION_STAGE_SNIPPETS,
} from '@/features/ai/ai-paths/config/query-presets';
import { Button, Label, Textarea, SelectSimple, Input, Card } from '@/shared/ui';

import {
  formatCollectionLabel,
  formatCollectionSchema,
  normalizeSchemaCollections,
} from './database-constructor-tab-helpers';
import { DatabaseAiPromptConnectionStatus } from './DatabaseAiPromptConnectionStatus';
import { DatabaseAiQueryReviewSection } from './DatabaseAiQueryReviewSection';
import { useDatabaseConstructorContext } from './DatabaseConstructorContext';
import { DatabaseQueryInputControls } from './DatabaseQueryInputControls';
import { DatabaseTemplateSnippetsDialog } from './DatabaseTemplateSnippetsDialog';
import { PlaceholderMatrixDialog, type PlaceholderGroup, type PlaceholderTarget, type PlaceholderEntry } from './PlaceholderMatrixDialog';
import { useAiPathConfig } from '../../AiPathConfigContext';
import { type UpdaterSampleState } from '@/features/ai/ai-paths/lib';


export function DatabaseConstructorTab(): React.JSX.Element | null {
  const {
    setSelectedAiQueryId,
    openSaveQueryPresetModal,
    databaseConfig,
    queryConfig,
    resolvedProvider,
    operation,
    connectedPlaceholders,
    hasSchemaConnection,
    fetchedDbSchema,
    schemaMatrix,
    onSyncSchema,
    schemaSyncing,
    schemaLoading,
    insertQueryPlaceholder,
    insertAiPromptPlaceholder,
    sampleState,
  } = useDatabaseConstructorContext();

  const {
    setUpdaterSamples,
    handleFetchUpdaterSample: onFetchUpdaterSample,
    updateSelectedNodeConfig,
    selectedNode,
    onSendToAi,
    sendingToAi,
    updaterSampleLoading,
    toast,
  } = useAiPathConfig();

  // State for template snippets modal
  const [snippetsModalOpen, setSnippetsModalOpen] = React.useState<boolean>(false);
  const [placeholderMatrixOpen, setPlaceholderMatrixOpen] = React.useState<boolean>(false);
  const [placeholderTarget, setPlaceholderTarget] = React.useState<PlaceholderTarget>('query');

  if (!selectedNode) return null;

  const selectedNodeId = selectedNode.id;
  const isPrismaProvider = resolvedProvider === 'prisma';
  const providerLabel =
    queryConfig.provider === 'auto'
      ? `Auto (resolved: ${resolvedProvider === 'prisma' ? 'Prisma' : 'MongoDB'})`
      : resolvedProvider === 'prisma'
        ? 'Prisma'
        : 'MongoDB';
  const templateSnippets = isPrismaProvider ? PRISMA_TEMPLATE_SNIPPETS : TEMPLATE_SNIPPETS;
  const readQueryTypes = isPrismaProvider ? PRISMA_READ_QUERY_TYPES : READ_QUERY_TYPES;
  const queryOperatorGroups = isPrismaProvider ? PRISMA_QUERY_OPERATOR_GROUPS : QUERY_OPERATOR_GROUPS;
  const updateOperatorGroups = isPrismaProvider ? PRISMA_UPDATE_OPERATOR_GROUPS : UPDATE_OPERATOR_GROUPS;
  const aggregationStageSnippets = isPrismaProvider
    ? PRISMA_AGGREGATION_STAGE_SNIPPETS
    : AGGREGATION_STAGE_SNIPPETS;
  const sortPresets = isPrismaProvider ? PRISMA_SORT_PRESETS : SORT_PRESETS;
  const projectionPresets = isPrismaProvider ? PRISMA_PROJECTION_PRESETS : PROJECTION_PRESETS;
  
  const schemaCollections = React.useMemo(
    () => normalizeSchemaCollections(schemaMatrix),
    [schemaMatrix]
  );
  const fetchedCollections = React.useMemo(
    () => normalizeSchemaCollections(fetchedDbSchema),
    [fetchedDbSchema]
  );
  const isMultiSchema = schemaMatrix?.provider === 'multi';
  
  const handleInsertPlaceholder = (placeholder: string, target: PlaceholderTarget): void => {
    if (target === 'aiPrompt') {
      insertAiPromptPlaceholder(placeholder);
      return;
    }
    insertQueryPlaceholder(placeholder);
  };

  const placeholderGroups = React.useMemo((): PlaceholderGroup[] => {
    const groups: PlaceholderGroup[] = [];
    const connectedEntries = connectedPlaceholders.map((token: string, index: number): PlaceholderEntry => {
      const raw = token.replace(/^\{\{|\}\}$/g, '').trim();
      return {
        id: `connected-${index}`,
        label: raw,
        token,
        resolvesTo: '—',
      };
    });

    if (connectedEntries.length > 0) {
      groups.push({
        id: 'connected',
        title: 'Connected Inputs',
        entries: connectedEntries,
      });
    }

    groups.push({
      id: 'special',
      title: 'Special Tokens',
      entries: [
        { id: 'val', label: 'value', token: '{{value}}', resolvesTo: 'Last node output' },
        { id: 'ctx-id', label: 'context.entityId', token: '{{context.entityId}}', resolvesTo: 'ID of current entity' },
        { id: 'ctx-type', label: 'context.entityType', token: '{{context.entityType}}', resolvesTo: 'Type of current entity' },
      ],
    });

    return groups;
  }, [connectedPlaceholders]);

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <Card variant='subtle-compact' padding='sm' className='flex flex-wrap items-center gap-2 border-border/60 bg-card/35 text-[10px] text-gray-300'>
          <span className='uppercase tracking-wide text-gray-500'>Provider</span>
          <span className='rounded border border-border/70 bg-card/70 px-2 py-0.5'>
            Requested: {queryConfig.provider}
          </span>
          <span className='rounded border border-border/70 bg-card/70 px-2 py-0.5'>
            Effective: {resolvedProvider}
          </span>
        </Card>

        <DatabaseAiQueryReviewSection />

        <div className='space-y-3'>
          <Label className='text-xs text-gray-400'>Quick Presets</Label>
          <div className='flex flex-wrap gap-2 items-center'>
            <Button
              type='button'
              className='h-7 rounded-md border border-blue-700 bg-blue-500/10 px-2 text-[10px] text-blue-200 hover:bg-blue-500/20'
              onClick={(): void => openSaveQueryPresetModal()}
            >
              Save as Preset
            </Button>
            <Button
              type='button'
              className='h-7 rounded-md border border-purple-700 bg-purple-500/10 px-2 text-[10px] text-purple-200 hover:bg-purple-500/20'
              onClick={(): void => setSnippetsModalOpen(true)}
            >
              Templates & Snippets
            </Button>
          </div>
        </div>

        <DatabaseTemplateSnippetsDialog
          open={snippetsModalOpen}
          onOpenChange={setSnippetsModalOpen}
          templateSnippets={templateSnippets}
          readQueryTypes={readQueryTypes}
          queryOperatorGroups={queryOperatorGroups}
          updateOperatorGroups={updateOperatorGroups}
          aggregationStageSnippets={aggregationStageSnippets}
          sortPresets={sortPresets}
          projectionPresets={projectionPresets}
        />

        <div className='space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <Label className='text-xs text-gray-400'>AI Generation Prompt</Label>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                variant='outline'
                size='xs'
                className='h-6 gap-1 px-2 text-[9px]'
                onClick={(): void => {
                  setPlaceholderTarget('aiPrompt');
                  setPlaceholderMatrixOpen(true);
                }}
              >
                <LayoutGrid className='size-3' />
                Insert Placeholder
              </Button>
              <Button
                type='button'
                className='h-6 rounded-md border border-purple-700 bg-purple-500/10 px-2 text-[9px] text-purple-200 hover:bg-purple-500/20'
                loading={sendingToAi}
                disabled={sendingToAi || !databaseConfig.aiPrompt?.trim()}
                onClick={(): void => {
                  if (onSendToAi && selectedNodeId && databaseConfig.aiPrompt) {
                    void onSendToAi(selectedNodeId, databaseConfig.aiPrompt);
                  }
                }}
              >
                Generate Query
              </Button>
            </div>
          </div>
          <Textarea
            className='min-h-[80px] w-full rounded-md border border-border bg-card/60 text-xs text-white'
            value={databaseConfig.aiPrompt ?? ''}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  aiPrompt: event.target.value,
                },
              })
            }
            onKeyDown={(event: React.KeyboardEvent<HTMLTextAreaElement>): void => {
              // Send on Ctrl+Enter or Cmd+Enter
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                if (onSendToAi && selectedNodeId && databaseConfig.aiPrompt?.trim() && !sendingToAi) {
                  void onSendToAi(selectedNodeId, databaseConfig.aiPrompt);
                }
              }
            }}
            placeholder={`Write a ${providerLabel} query that finds products where... (Ctrl+Enter to send)`}
          />
          <DatabaseAiPromptConnectionStatus
            aiPrompt={databaseConfig.aiPrompt ?? ''}
            updateQueryConfig={(patch) => {
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  query: {
                    ...queryConfig,
                    ...patch,
                  },
                },
              });
            }}
          />
        </div>

        <DatabaseQueryInputControls />

        {operation === 'update' && (
          <div className='space-y-3 rounded-md border border-border bg-card/40 p-3'>
            <Label className='text-xs text-gray-400'>Sample JSON (fetch to enable Field Mapping)</Label>
            <div className='flex flex-wrap gap-2 items-center'>
              {hasSchemaConnection && fetchedCollections.length > 0 && (
                <SelectSimple
                  size='sm'
                  value={sampleState.entityType}
                  onValueChange={(value: string): void => {
                    setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                      ...prev,
                      [selectedNodeId]: {
                        ...sampleState,
                        entityType: value,
                      },
                    }));
                    // Auto-fetch first document from selected collection
                    void onFetchUpdaterSample(selectedNodeId, value, '', {
                      notify: false,
                    });
                  }}
                  options={fetchedCollections.map((coll) => ({
                    value: coll.name,
                    label: formatCollectionLabel(coll, Boolean(fetchedDbSchema?.provider === 'multi'))
                  }))}
                  placeholder='Select collection'
                  triggerClassName='h-7 w-[220px] border-border bg-card/70 text-[11px] text-white'
                />
              )}
              <Input
                size='sm'
                value={sampleState.entityId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>): void => {
                  setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                    ...prev,
                    [selectedNodeId]: { ...sampleState, entityId: e.target.value },
                  }));
                }}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>): void => {
                  if (e.key === 'Enter') {
                    void onFetchUpdaterSample(selectedNodeId, sampleState.entityType, sampleState.entityId);
                  }
                }}
                placeholder='Entity ID (e.g. products/123 or product-uuid)'
                className='h-7 flex-1 border-border bg-card/70 text-[11px] text-white'
              />
              <Button
                type='button'
                className='h-7 rounded-md border border-border bg-card/70 px-3 text-[10px] text-gray-200 hover:bg-muted/60'
                loading={updaterSampleLoading}
                onClick={(): void => {
                  void onFetchUpdaterSample(selectedNodeId, sampleState.entityType, sampleState.entityId);
                }}
              >
                Fetch
              </Button>
            </div>
          </div>
        )}

        <div className='space-y-3'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <Label className='text-xs text-gray-400'>Target Schema Context</Label>
              {hasSchemaConnection ? (
                <div className='flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-400 border border-emerald-500/20'>
                  <div className='h-1 w-1 rounded-full bg-emerald-400' />
                  CONNECTED
                </div>
              ) : (
                <div className='flex items-center gap-1.5 rounded-full bg-gray-500/10 px-2 py-0.5 text-[9px] font-medium text-gray-400 border border-border'>
                  NO SCHEMA NODE
                </div>
              )}
            </div>
            <div className='flex items-center gap-2'>
              {hasSchemaConnection && (
                <Button
                  type='button'
                  variant='outline'
                  size='xs'
                  className='h-6 gap-1 px-2 text-[9px]'
                  onClick={onSyncSchema}
                  loading={schemaSyncing}
                  disabled={schemaSyncing}
                >
                  Sync Schema
                </Button>
              )}
              <Button
                type='button'
                variant='outline'
                size='xs'
                className='h-6 gap-1 px-2 text-[9px]'
                onClick={(): void => {
                  setPlaceholderTarget('query');
                  setPlaceholderMatrixOpen(true);
                }}
              >
                <LayoutGrid className='size-3' />
                Placeholders
              </Button>
            </div>
          </div>

          <div className='grid gap-3 lg:grid-cols-[1fr_300px]'>
            <div className='space-y-3 min-w-0'>
              {!schemaMatrix && !schemaLoading && (
                <div className='rounded-md border border-dashed border-border p-4 text-center'>
                  <p className='text-[11px] text-gray-500'>
                    Connect a <strong>Database Schema</strong> node to enable schema-aware
                    constructor tools.
                  </p>
                </div>
              )}

              {schemaLoading && (
                <div className='flex h-32 items-center justify-center rounded-md border border-border bg-card/20'>
                  <div className='flex items-center gap-2 text-xs text-gray-500'>
                    <div className='h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent' />
                    Analyzing database schema...
                  </div>
                </div>
              )}

              {schemaMatrix && (
                <div className='grid gap-3 sm:grid-cols-2'>
                  <Card variant='subtle-compact' padding='sm' className='space-y-2 border-border/60 bg-card/35'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>Collections</span>
                      <span className='text-[10px] text-gray-400'>{schemaCollections.length} found</span>
                    </div>
                    <div className='max-h-48 overflow-y-auto space-y-1 pr-1'>
                      {schemaCollections.map((coll) => (
                        <button
                          key={coll.name}
                          type='button'
                          className={`w-full text-left rounded px-2 py-1.5 text-[11px] transition-colors ${
                            queryConfig.collection === coll.name
                              ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                              : 'text-gray-400 hover:bg-card/60 border border-transparent'
                          }`}
                          onClick={() => {
                            setSelectedAiQueryId('');
                            updateSelectedNodeConfig({
                              database: {
                                ...databaseConfig,
                                query: {
                                  ...queryConfig,
                                  collection: coll.name,
                                }
                              }
                            });
                          }}
                        >
                          <div className='flex items-center justify-between'>
                            <span className='font-medium truncate'>{coll.name}</span>
                            {isMultiSchema && coll.provider && (
                              <span className='text-[9px] opacity-60 ml-2'>{coll.provider}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </Card>

                  <Card variant='subtle-compact' padding='sm' className='space-y-2 border-border/60 bg-card/35'>
                    <div className='flex items-center justify-between'>
                      <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>Fields</span>
                      <span className='text-[10px] text-gray-400'>
                        {queryConfig.collection ? (schemaCollections.find(c => c.name === queryConfig.collection)?.fields.length ?? 0) : 0} fields
                      </span>
                    </div>
                    <div className='max-h-48 overflow-y-auto pr-1'>
                      {queryConfig.collection ? (
                        <div className='space-y-1'>
                          {schemaCollections.find(c => c.name === queryConfig.collection)?.fields.map(field => (
                            <div key={field.name} className='group flex items-center justify-between rounded px-2 py-1 hover:bg-card/60 transition-colors'>
                              <div className='flex items-center gap-2 truncate'>
                                <span className='text-[11px] text-gray-300 font-medium truncate'>{field.name}</span>
                                <span className='text-[9px] text-gray-500 font-mono'>{field.type}</span>
                              </div>
                              <Button
                                type='button'
                                variant='ghost'
                                size='xs'
                                className='h-5 w-5 p-0 opacity-0 group-hover:opacity-100'
                                onClick={() => handleInsertPlaceholder(`{{${field.name}}}`, 'query')}
                                title='Insert as placeholder'
                              >
                                <LayoutGrid className='size-2.5' />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className='text-[10px] text-gray-500 text-center py-4 italic'>Select a collection to view fields</p>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>

            <div className='space-y-3'>
              {queryConfig.collection && (
                <Card variant='subtle-compact' padding='none' className='border-border/60 bg-card/35 overflow-hidden flex flex-col h-full min-h-[200px]'>
                  <div className='px-3 py-2 border-b border-border/60 bg-black/20 flex items-center justify-between'>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>Type Definition</span>
                    <Button
                      type='button'
                      variant='ghost'
                      size='xs'
                      className='h-5 px-1.5 text-[9px] text-gray-400 hover:text-gray-200'
                      onClick={() => {
                        const coll = schemaCollections.find(c => c.name === queryConfig.collection);
                        if (coll) {
                          const definition = formatCollectionSchema(coll.name, coll.fields);
                          void navigator.clipboard.writeText(definition);
                          toast('Interface copied to clipboard', { variant: 'success' });
                        }
                      }}
                    >
                      Copy TS
                    </Button>
                  </div>
                  <div className='flex-1 p-2 overflow-auto font-mono text-[10px] text-emerald-300/90 leading-relaxed'>
                    {(() => {
                      const coll = schemaCollections.find(c => c.name === queryConfig.collection);
                      if (!coll) return '// Select a collection';
                      return (
                        <pre className='whitespace-pre-wrap break-all'>
                          {formatCollectionSchema(coll.name, coll.fields)}
                        </pre>
                      );
                    })()}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <PlaceholderMatrixDialog
        open={placeholderMatrixOpen}
        onOpenChange={setPlaceholderMatrixOpen}
        groups={placeholderGroups}
        target={placeholderTarget}
        onTargetChange={setPlaceholderTarget}
        onInsert={(token, target) => {
          handleInsertPlaceholder(token, target);
          setPlaceholderMatrixOpen(false);
        }}
      />
    </div>
  );
}
