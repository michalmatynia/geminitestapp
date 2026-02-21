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
import type {
  UpdaterMapping,
  UpdaterSampleState,
} from '@/features/ai/ai-paths/lib';
import { DB_PROVIDER_PLACEHOLDERS } from '@/features/ai/ai-paths/lib';
import { formatPortLabel } from '@/features/ai/ai-paths/utils/ui-utils';
import type { AiQuery, CollectionSchema, DatabasePresetOption, FieldSchema } from '@/shared/contracts/database';
import { Button, Label, Textarea, SelectSimple, Input, Tooltip, Card } from '@/shared/ui';

import {
  extractCodeSnippets,
  formatCollectionDisplayName,
  formatCollectionLabel,
  formatCollectionSchema,
  normalizeSchemaCollections,
} from './database-constructor-tab-helpers';
import { DatabaseAiPromptConnectionStatus } from './DatabaseAiPromptConnectionStatus';
import { DatabaseAiQueryReviewSection } from './DatabaseAiQueryReviewSection';
import { useDatabaseConstructorContext } from './DatabaseConstructorContext';
import { DatabaseQueryInputControls } from './DatabaseQueryInputControls';
import { DatabaseTemplateSnippetsDialog } from './DatabaseTemplateSnippetsDialog';
import { PlaceholderMatrixDialog, type PlaceholderGroup, type PlaceholderTarget } from './PlaceholderMatrixDialog';
import { useAiPathConfig } from '../../AiPathConfigContext';


export function DatabaseConstructorTab(): React.JSX.Element | null {
  const {
    pendingAiQuery,
    setPendingAiQuery,
    aiQueries,
    setAiQueries,
    selectedAiQueryId,
    setSelectedAiQueryId,
    presetOptions,
    applyDatabasePreset,
    openSaveQueryPresetModal,
    databaseConfig,
    queryConfig,
    resolvedProvider,
    operation,
    queryTemplateValue,
    queryTemplateRef,
    sampleState,
    parsedSampleError,
    updateQueryConfig,
    connectedPlaceholders,
    hasSchemaConnection,
    fetchedDbSchema,
    schemaMatrix,
    onSyncSchema,
    schemaSyncing,
    schemaLoading,
    mapInputsToTargets,
    bundleKeys,
    aiPromptRef,
    mappings,
    updateMapping,
    removeMapping,
    addMapping,
    availablePorts,
    uniqueTargetPathOptions,
  } = useDatabaseConstructorContext();
  const {
    setUpdaterSamples,
    handleFetchUpdaterSample: onFetchUpdaterSample,
    updateSelectedNodeConfig,
    nodes,
    edges,
    selectedNode,
    runtimeState,
    onSendToAi,
    sendingToAi,
    updaterSampleLoading,
    toast,
  } = useAiPathConfig();
  if (!selectedNode) return null;
  const selectedNodeId = selectedNode.id;
  const isUpdateAction =
    databaseConfig.useMongoActions && databaseConfig.actionCategory === 'update';
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
  // State for code snippet navigation in AI responses
  const [selectedSnippetIndex, setSelectedSnippetIndex] = React.useState<number>(-1);
  // State for template snippets modal
  const [snippetsModalOpen, setSnippetsModalOpen] = React.useState<boolean>(false);
  const [placeholderMatrixOpen, setPlaceholderMatrixOpen] = React.useState<boolean>(false);
  const [placeholderTarget, setPlaceholderTarget] = React.useState<PlaceholderTarget>('query');

  // Extract code snippets from pending AI query
  const codeSnippets = React.useMemo((): string[] => {
    if (!pendingAiQuery) return [];
    return extractCodeSnippets(pendingAiQuery);
  }, [pendingAiQuery]);

  // Reset snippet selection when pending query changes
  React.useEffect((): void => {
    setSelectedSnippetIndex((_prev: number): number => codeSnippets.length > 0 ? 0 : -1);
  }, [pendingAiQuery, codeSnippets.length]);

  const applyQueryTemplateUpdate = (nextQuery: string): void => {
    if (isUpdateAction) {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          updateTemplate: nextQuery,
        },
      });
      return;
    }
    const currentPresetId = databaseConfig.presetId ?? 'custom';
    const currentAiQueryId = selectedAiQueryId;

    if (currentPresetId !== 'custom' || currentAiQueryId) {
      setSelectedAiQueryId('');
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          presetId: 'custom',
          query: {
            ...queryConfig,
            mode: 'custom',
            queryTemplate: nextQuery,
          },
        },
      });
    } else {
      updateQueryConfig({
        mode: 'custom',
        queryTemplate: nextQuery,
      });
    }
  };

  const insertQueryPlaceholder = (placeholder: string): void => {
    const currentTemplate = queryTemplateValue ?? '';
    const textArea = queryTemplateRef?.current;
    const selectionStart =
      typeof textArea?.selectionStart === 'number' ? textArea.selectionStart : currentTemplate.length;
    const selectionEnd =
      typeof textArea?.selectionEnd === 'number' ? textArea.selectionEnd : currentTemplate.length;
    const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentTemplate.length));
    const rangeEnd = Math.max(rangeStart, Math.min(Math.max(selectionStart, selectionEnd), currentTemplate.length));
    const nextQuery = `${currentTemplate.slice(0, rangeStart)}${placeholder}${currentTemplate.slice(rangeEnd)}`;

    applyQueryTemplateUpdate(nextQuery);

    window.setTimeout(() => {
      const node = queryTemplateRef?.current;
      if (!node) return;
      const cursorPosition = rangeStart + placeholder.length;
      node.focus();
      node.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const insertAiPromptPlaceholder = (placeholder: string): void => {
    const currentValue = databaseConfig.aiPrompt ?? '';
    const textArea = aiPromptRef?.current;
    const selectionStart =
      typeof textArea?.selectionStart === 'number' ? textArea.selectionStart : currentValue.length;
    const selectionEnd =
      typeof textArea?.selectionEnd === 'number' ? textArea.selectionEnd : currentValue.length;
    const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentValue.length));
    const rangeEnd = Math.max(rangeStart, Math.min(Math.max(selectionStart, selectionEnd), currentValue.length));
    const nextValue = `${currentValue.slice(0, rangeStart)}${placeholder}${currentValue.slice(rangeEnd)}`;

    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        aiPrompt: nextValue,
      },
    });

    window.setTimeout(() => {
      const node = aiPromptRef?.current;
      if (!node) return;
      const cursorPosition = rangeStart + placeholder.length;
      node.focus();
      node.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const insertTemplateSnippet = (snippet: string): void => {
    const currentTemplate = queryTemplateValue ?? '';
    const textArea = queryTemplateRef?.current;
    const selectionStart =
      typeof textArea?.selectionStart === 'number' ? textArea.selectionStart : currentTemplate.length;
    const selectionEnd =
      typeof textArea?.selectionEnd === 'number' ? textArea.selectionEnd : currentTemplate.length;
    const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentTemplate.length));
    const rangeEnd = Math.max(rangeStart, Math.min(Math.max(selectionStart, selectionEnd), currentTemplate.length));
    const nextTemplate = `${currentTemplate.slice(0, rangeStart)}${snippet}${currentTemplate.slice(rangeEnd)}`;

    applyQueryTemplateUpdate(nextTemplate);

    window.setTimeout(() => {
      const node = queryTemplateRef?.current;
      if (!node) return;
      const cursorPosition = rangeStart + snippet.length;
      node.focus();
      node.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  };

  const handleInsertPlaceholder = (placeholder: string, target: PlaceholderTarget): void => {
    if (target === 'aiPrompt') {
      insertAiPromptPlaceholder(placeholder);
      return;
    }
    insertQueryPlaceholder(placeholder);
  };

  const placeholderGroups = React.useMemo((): PlaceholderGroup[] => {
    const groups: PlaceholderGroup[] = [];
    const connectedEntries = connectedPlaceholders.map((token: string, index: number) => {
      const raw = token.replace(/^\{\{|\}\}$/g, '').trim();
      let description = 'Connected input placeholder.';
      if (raw.startsWith('bundle.')) {
        description = `Bundle key: ${raw.replace('bundle.', '')}`;
      } else if (raw.startsWith('context.')) {
        description = `Context value: ${raw.replace('context.', '')}`;
      } else if (raw.startsWith('meta.')) {
        description = `Meta value: ${raw.replace('meta.', '')}`;
      }
      return {
        id: `connected-${index}-${raw}`,
        label: raw || token,
        token,
        resolvesTo: description,
      };
    });
    if (connectedEntries.length > 0) {
      groups.push({
        id: 'connected',
        title: 'Connected Inputs',
        description: 'Placeholders derived from currently wired inputs.',
        entries: connectedEntries,
      });
    }

    const activeEntries: PlaceholderGroup = {
      id: 'active',
      title: 'Active Query Context',
      description: 'Current operation & selection placeholders.',
      entries: [
        {
          id: `operation-${operation}`,
          label: `Operation: ${operation}`,
          token: `{{operation:${operation}}}`,
          resolvesTo: operation,
        },
        {
          id: `collection-${queryConfig.collection}`,
          label: `Collection: ${queryConfig.collection}`,
          token: `{{collection:${queryConfig.collection}}}`,
          resolvesTo: queryConfig.collection,
        },
        {
          id: `provider-${queryConfig.provider}`,
          label: `Provider: ${queryConfig.provider === 'auto' ? 'auto' : queryConfig.provider}`,
          token: `{{provider:${queryConfig.provider === 'auto' ? 'auto-detect' : queryConfig.provider}}}`,
          resolvesTo: queryConfig.provider === 'auto' ? 'auto-detect' : queryConfig.provider,
        },
      ],
    };
    groups.push(activeEntries);

    const providerEntries = DB_PROVIDER_PLACEHOLDERS.map((provider: string) => ({
      id: `db-provider-${provider}`,
      label: provider,
      token: `{{DB Provider: ${provider}}}`,
      resolvesTo: provider,
    }));
    if (providerEntries.length > 0) {
      groups.push({
        id: 'providers',
        title: 'Database Providers',
        description: 'Static provider placeholders.',
        entries: providerEntries,
      });
    }

    const dateEntry = {
      id: 'date-current',
      label: 'Date: Current',
      token: '{{Date: Current}}',
      resolvesTo: new Date().toISOString(),
      dynamic: true,
    };
    groups.push({
      id: 'dates',
      title: 'Dynamic Dates',
      description: 'Runtime date placeholders.',
      entries: [dateEntry],
    });

    const schemaEntries: PlaceholderGroup['entries'] = [];
    if (schemaCollections.length) {
      schemaCollections.forEach((collection: CollectionSchema, index: number) => {
        const schemaText = formatCollectionSchema(collection.name, collection.fields ?? []);
        const displayName = formatCollectionDisplayName(collection.name);
        if (isMultiSchema && collection.provider) {
          const labeledName = `${collection.name} (${collection.provider})`;
          const labeledDisplay = `${displayName} (${collection.provider})`;
          const nameSet = new Set<string>([labeledName, labeledDisplay]);
          Array.from(nameSet).forEach((name: string) => {
            schemaEntries.push({
              id: `schema-${index}-${name}`,
              label: `Collection: ${name}`,
              token: `{{Collection: ${name}}}`,
              resolvesTo: schemaText,
              dynamic: true,
            });
          });
        } else {
          const nameSet = new Set<string>([collection.name, displayName]);
          Array.from(nameSet).forEach((name: string) => {
            schemaEntries.push({
              id: `schema-${index}-${name}`,
              label: `Collection: ${name}`,
              token: `{{Collection: ${name}}}`,
              resolvesTo: schemaText,
              dynamic: true,
            });
          });
        }
      });
    }
    if (schemaEntries.length > 0) {
      groups.push({
        id: 'schemas',
        title: 'Collection Schemas',
        description: 'Synchronized schema snapshots for use in prompts or queries.',
        entries: schemaEntries,
      });
    }

    return groups;
  }, [connectedPlaceholders, operation, queryConfig.collection, queryConfig.provider, schemaCollections, isMultiSchema]);

  return (
    <div className='space-y-4 rounded-md border border-border bg-card/40 p-3'>
      <div onFocusCapture={(): void => setPlaceholderTarget('query')}>
        <DatabaseQueryInputControls />
      </div>
      <Card variant='subtle-compact' padding='sm' className='flex flex-wrap items-center gap-2 border-border/60 bg-card/35 text-[10px] text-gray-300'>
        <span className='uppercase tracking-wide text-gray-500'>Provider</span>
        <span className='rounded border border-border/70 bg-card/70 px-2 py-0.5'>
          Requested: {queryConfig.provider}
        </span>
        <span className='rounded border border-border/70 bg-card/70 px-2 py-0.5'>
          Effective: {resolvedProvider}
        </span>
      </Card>

      <DatabaseAiQueryReviewSection
        pendingAiQuery={pendingAiQuery}
        codeSnippets={codeSnippets}
        selectedSnippetIndex={selectedSnippetIndex}
        setSelectedSnippetIndex={setSelectedSnippetIndex}
        setAiQueries={setAiQueries}
        setSelectedAiQueryId={setSelectedAiQueryId}
        setPendingAiQuery={setPendingAiQuery}
        updateSelectedNodeConfig={updateSelectedNodeConfig}
        databaseConfig={databaseConfig}
        queryConfig={queryConfig}
        toast={toast}
      />

      <div className='space-y-3'>
        <Label className='text-xs text-gray-400'>Quick Presets</Label>
        <div className='flex flex-wrap gap-2 items-center'>
          <Button
            type='button'
            className='h-7 rounded-md border border-blue-700 bg-blue-500/10 px-2 text-[10px] text-blue-200 hover:bg-blue-500/20'
            onClick={(): void => openSaveQueryPresetModal()}
          >
            Save As Preset
          </Button>
          <SelectSimple
            size='xs'
            value={databaseConfig.presetId ?? 'custom'}
            onValueChange={(value: string): void => applyDatabasePreset(value)}
            options={presetOptions.map((preset: DatabasePresetOption) => ({
              value: preset.id,
              label: preset.label
            }))}
            placeholder='Select preset'
            triggerClassName='h-7 w-[180px] border-border bg-card/70 text-xs text-white'
          />
          <SelectSimple
            size='xs'
            value={selectedAiQueryId || 'none'}
            onValueChange={(value: string): void => {
              if (value === 'none') {
                setSelectedAiQueryId('');
                return;
              }
              const aiQuery = aiQueries.find((q: AiQuery) => q.id === value);
              if (aiQuery) {
                setSelectedAiQueryId(value);
                updateSelectedNodeConfig({
                  database: {
                    ...databaseConfig,
                    query: {
                      ...queryConfig,
                      mode: 'custom',
                      queryTemplate: aiQuery.query,
                    },
                  },
                });
              }
            }}
            options={[
              { value: 'none', label: 'No AI Query' },
              ...aiQueries.map((aiQuery: AiQuery) => ({
                value: aiQuery.id,
                label: `AI Query ${new Date(aiQuery.timestamp).toLocaleTimeString()}`
              }))
            ]}
            placeholder='AI Queries'
            triggerClassName='h-7 w-[180px] border-border bg-card/70 text-xs text-white'
          />
          <Button
            type='button'
            className='h-7 rounded-md border border-rose-500/40 px-2 text-[10px] text-rose-200 hover:bg-rose-500/10 disabled:opacity-40'
            disabled={!selectedAiQueryId}
            onClick={(): void => {
              if (!selectedAiQueryId) return;
              const targetId = selectedAiQueryId;
              setAiQueries((prev: AiQuery[]): AiQuery[] =>
                prev.filter((query: AiQuery): boolean => query.id !== targetId)
              );
              setSelectedAiQueryId('');
              toast('AI query removed.', { variant: 'success' });
            }}
            title='Remove selected AI query'
          >
            Remove AI Query
          </Button>
        </div>
      </div>

      <Card variant='subtle-compact' padding='sm' className='flex flex-wrap items-center justify-between gap-2 border-border/60 bg-card/40'>
        <div>
          <div className='text-xs font-medium text-gray-200'>Placeholders</div>
          <div className='text-[10px] text-gray-400'>
            Open the matrix to insert any placeholder into queries or prompts.
          </div>
        </div>
        <Button
          type='button'
          variant='info'
          size='xs'
          onClick={(): void => setPlaceholderMatrixOpen(true)}
        >
          <LayoutGrid className='mr-2 h-3.5 w-3.5' />
          Placeholders
        </Button>
      </Card>

      <PlaceholderMatrixDialog
        open={placeholderMatrixOpen}
        onOpenChange={setPlaceholderMatrixOpen}
        groups={placeholderGroups}
        target={placeholderTarget}
        onTargetChange={setPlaceholderTarget}
        onInsert={handleInsertPlaceholder}
        onSync={onSyncSchema}
        syncing={schemaSyncing}
      />

      {hasSchemaConnection && (
        <div className='rounded-md border border-purple-800/50 bg-purple-950/20 p-3'>
          <div className='mb-2 flex items-center gap-2'>
            <span className='text-[11px] font-medium text-purple-300'>
              Database Schema
            </span>
            {schemaLoading && (
              <span className='text-[10px] text-gray-500'>Loading...</span>
            )}
          </div>
          {fetchedCollections.length > 0 ? (
            <div className='space-y-2'>
              <div className='text-[10px] text-gray-400'>
                Click to set collection or insert field:
              </div>
              <div className='flex flex-wrap gap-1'>
                {fetchedCollections.map((coll: CollectionSchema): React.JSX.Element => {
                  const schemaFields = coll.fields?.map((f: FieldSchema): string => `${f.name}: ${f.type}`).join(', ') ?? '';
                  const resolvedTooltip = `{{schema:Collection "${coll.name}" with fields: ${schemaFields || 'unknown'}}}`;
                  return (
                    <Tooltip
                      key={`${coll.provider ?? 'db'}:${coll.name}`}
                      content={resolvedTooltip}
                      side='bottom'
                      maxWidth='500px'
                    >
                      <Button
                        type='button'
                        className='rounded-md border border-purple-700/50 bg-purple-500/10 px-2 py-1 text-[10px] text-purple-300 hover:bg-purple-500/20'
                        onClick={(): void => {
                          updateQueryConfig({
                            mode: 'custom',
                            collection: coll.name,
                          });
                          toast(`Collection set to: ${coll.name}`, { variant: 'success' });
                        }}
                      >
                        {formatCollectionLabel(coll, Boolean(fetchedDbSchema?.provider === 'multi'))}
                      </Button>
                    </Tooltip>
                  );
                })}
              </div>
              {((): React.JSX.Element | null => {
                const currentColl = fetchedCollections.find(
                  (c: CollectionSchema) => c.name === queryConfig.collection
                );
                if (!currentColl?.fields?.length) return null;
                return (
                  <div className='mt-2'>
                    <div className='text-[10px] text-gray-400'>
                      Fields in {currentColl.name}:
                    </div>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {currentColl.fields.slice(0, 20).map((field: FieldSchema): React.JSX.Element => (
                        <Button
                          key={field.name}
                          type='button'
                          className='rounded-md border border/50 bg-card/30 px-2 py-0.5 text-[9px] text-gray-300 hover:bg-gray-700/50'
                          onClick={(): void => {
                            const fieldQuery = `"${field.name}": "{{value}}"`;
                            const current = queryTemplateValue.trim();
                            let newQuery: string;
                            if (!current || current === '{}') {
                              newQuery = `{\n  ${fieldQuery}\n}`;
                            } else if (current.endsWith('}')) {
                              const insertPos = current.lastIndexOf('}');
                              const before = current.slice(0, insertPos).trimEnd();
                              const needsComma =
                                before.length > 1 && !before.endsWith('{') && !before.endsWith(',');
                              newQuery = `${before}${needsComma ? ',' : ''}\n  ${fieldQuery}\n}`;
                            } else {
                              newQuery = `${current}\n  ${fieldQuery}`;
                            }
                            applyQueryTemplateUpdate(newQuery);
                          }}
                          title={`Type: ${field.type}`}
                        >
                          {field.name}
                          <span className='ml-1 text-[8px] text-gray-500'>
                            {field.type}
                          </span>
                        </Button>
                      ))}
                      {currentColl.fields.length > 20 && (
                        <span className='px-2 py-0.5 text-[9px] text-gray-500'>
                          +{currentColl.fields.length - 20} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : !schemaLoading ? (
            <div className='text-[10px] text-gray-500 italic'>
              No schema data available
            </div>
          ) : null}
        </div>
      )}

      <div className='space-y-2'>
        <Label className='text-xs text-gray-400'>Template Snippets</Label>
        <Button
          type='button'
          className='flex items-center gap-2 rounded-md border border-purple-600 bg-purple-500/10 px-3 py-1.5 text-[11px] text-purple-200 hover:bg-purple-500/20'
          onClick={(): void => setSnippetsModalOpen(true)}
        >
          <LayoutGrid className='h-3.5 w-3.5' />
          Browse Snippets
        </Button>
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
        isPrismaProvider={isPrismaProvider}
        setSelectedAiQueryId={setSelectedAiQueryId}
        updateQueryConfig={updateQueryConfig}
        insertTemplateSnippet={insertTemplateSnippet}
        toast={toast}
      />

      <div className='space-y-3'>
        <Label className='text-xs text-gray-400'>AI Prompt (Output to AI Node)</Label>
        <Textarea
          ref={aiPromptRef}
          className='min-h-[100px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
          value={databaseConfig.aiPrompt ?? ''}
          onFocus={(): void => setPlaceholderTarget('aiPrompt')}
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
              if (onSendToAi && selectedNode?.id && databaseConfig.aiPrompt?.trim() && !sendingToAi) {
                void onSendToAi(selectedNode.id, databaseConfig.aiPrompt);
              }
            }
          }}
          placeholder={`Write a ${providerLabel} query that finds products where... (Ctrl+Enter to send)`}
        />
        <DatabaseAiPromptConnectionStatus
          edges={edges}
          nodes={nodes}
          selectedNodeId={selectedNode.id}
          runtimeState={runtimeState}
          aiPrompt={databaseConfig.aiPrompt ?? ''}
          sendingToAi={sendingToAi}
          onSendToAi={onSendToAi}
          updateQueryConfig={updateQueryConfig}
          toast={toast}
        />
      </div>

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
                options={fetchedCollections.map((coll: CollectionSchema) => ({
                  value: coll.name,
                  label: formatCollectionLabel(coll, Boolean(fetchedDbSchema?.provider === 'multi'))
                }))}
                placeholder='Select collection'
                triggerClassName='w-[180px] border-border bg-card/70 text-sm text-white'
              />
            )}
            <Input
              className='w-[200px] rounded-md border border-border bg-card/70 text-sm text-white'
              value={sampleState.entityId}
              onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                  ...prev,
                  [selectedNodeId]: {
                    ...sampleState,
                    entityId: event.target.value,
                  },
                }))
              }
              placeholder='Document ID'
            />
            <Button
              type='button'
              className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
              disabled={updaterSampleLoading || (hasSchemaConnection && !sampleState.entityType)}
              onClick={(): void =>
                void onFetchUpdaterSample(
                  selectedNodeId,
                  sampleState.entityType,
                  sampleState.entityId
                )
              }
            >
              {updaterSampleLoading ? 'Loading...' : 'Fetch sample'}
            </Button>
          </div>
          {hasSchemaConnection && !fetchedDbSchema?.collections?.length && !schemaLoading && (
            <p className='text-[11px] text-amber-300'>Connect a Database Schema node to select collections</p>
          )}
          <Textarea
            className='min-h-[120px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={sampleState.json}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>): void =>
              setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                ...prev,
                [selectedNodeId]: {
                  ...sampleState,
                  json: event.target.value,
                },
              }))
            }
            placeholder='{ "id": "123", "title": "Sample" }'
          />
          {parsedSampleError ? (
            <p className='text-[11px] text-rose-300'>{parsedSampleError}</p>
          ) : null}
          <div className='flex flex-wrap gap-2'>
            <SelectSimple
              size='sm'
              value={String(sampleState.depth)}
              onValueChange={(value: string): void =>
                setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                  ...prev,
                  [selectedNodeId]: {
                    ...sampleState,
                    depth: Number(value),
                  },
                }))
              }
              options={[1, 2, 3, 4].map((depth: number) => ({
                value: String(depth),
                label: `Depth ${depth}`
              }))}
              placeholder='Depth'
              triggerClassName='w-[150px] border-border bg-card/70 text-sm text-white'
            />
            <Button
              type='button'
              className={`rounded-md border px-3 text-[10px] ${
                sampleState.includeContainers
                  ? 'text-emerald-200 hover:bg-emerald-500/10'
                  : 'text-gray-300 hover:bg-muted/60'
              }`}
              onClick={(): void =>
                setUpdaterSamples((prev: Record<string, UpdaterSampleState>): Record<string, UpdaterSampleState> => ({
                  ...prev,
                  [selectedNodeId]: {
                    ...sampleState,
                    includeContainers: !sampleState.includeContainers,
                  },
                }))
              }
            >
              {sampleState.includeContainers ? 'Containers: On' : 'Containers: Off'}
            </Button>
          </div>
        </div>
      )}

      {/* Field Mapping: Show for query operations always, for update only after sample is fetched */}
      {(operation !== 'update' || sampleState.json.trim().length > 0) && (
        <div className='space-y-3 border-t border-border pt-4'>
          <Label className='text-xs text-gray-400'>Parameter Mapping</Label>
          <div className='flex flex-wrap items-center gap-2 mb-3'>
            <Button
              type='button'
              className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={(): void => mapInputsToTargets()}
            >
            Auto-map inputs
            </Button>
            {bundleKeys.size > 0 && (
              <span className='text-[11px] text-gray-500'>
              Bundle keys:{' '}
                {Array.from(bundleKeys)
                  .map((key: string): string => formatPortLabel(key))
                  .join(', ')}
              </span>
            )}
          </div>

          <div className='space-y-3'>
            {mappings.map((mapping: UpdaterMapping, index: number): React.JSX.Element => {
              const targetValue = mapping.targetPath ?? '';
              const customValue = mapping.sourcePath ?? '';
              // Schema selection = targetValue matches a schema option
              const hasSchemaSelection = uniqueTargetPathOptions.some((opt: { label: string; value: string }): boolean => opt.value === targetValue) && targetValue.trim().length > 0;
              const sourcePort = mapping.sourcePort ?? '';
              const sourcePortOptions =
              sourcePort && !availablePorts.includes(sourcePort)
                ? [sourcePort, ...availablePorts]
                : availablePorts;

              return (
                <div
                  key={`mapping-${index}`}
                  className='flex flex-wrap gap-2 items-start'
                >
                  {/* "Pick from schema" dropdown - ALWAYS visible */}
                  <div className='space-y-2 min-w-[180px]'>
                    <SelectSimple
                      size='xs'
                      value={hasSchemaSelection ? targetValue : ''}
                      onValueChange={(value: string): void => {
                        if (value && value !== '__empty__') {
                          updateMapping(index, { targetPath: value } as Partial<UpdaterMapping>);
                        } else {
                          updateMapping(index, { targetPath: '' } as Partial<UpdaterMapping>);
                        }
                      }}
                      options={[
                        { value: '__empty__', label: '— None —' },
                        ...uniqueTargetPathOptions
                      ]}
                      placeholder='Pick from schema'
                      triggerClassName='border-border bg-card/70 text-[10px] text-gray-200'
                    />
                  </div>

                  {/* Source port selector */}
                  <div className='space-y-2 min-w-[160px]'>
                    <SelectSimple
                      size='xs'
                      value={sourcePort}
                      onValueChange={(value: string): void =>
                        updateMapping(index, {
                          sourcePort: value,
                          sourcePath: mapping.sourcePath ?? '',
                        } as Partial<UpdaterMapping>)
                      }
                      options={sourcePortOptions.map((port: string) => ({
                        value: port,
                        label: formatPortLabel(port)
                      }))}
                      placeholder='Select input'
                      triggerClassName='border-border bg-card/70 text-[10px] text-gray-200'
                    />
                  </div>

                  {/* Source path input */}
                  {hasSchemaSelection && sourcePort && (
                    <div className='space-y-2 min-w-[140px]'>
                      {sourcePort === 'bundle' && bundleKeys.size > 0 ? (
                        <SelectSimple
                          size='xs'
                          value={customValue}
                          onValueChange={(value: string): void =>
                            updateMapping(index, {
                              sourcePath: value,
                            } as Partial<UpdaterMapping>)
                          }
                          options={Array.from(bundleKeys).map((key: string) => ({
                            value: key,
                            label: formatPortLabel(key)
                          }))}
                          placeholder='Pick bundle key'
                          triggerClassName='border-border bg-card/70 text-[10px] text-gray-200'
                        />
                      ) : (
                        <Input
                          className='w-full rounded-md border border-border bg-card/70 text-sm text-white'
                          value={customValue}
                          onChange={(event: React.ChangeEvent<HTMLInputElement>): void =>
                            updateMapping(index, {
                              sourcePath: event.target.value,
                            } as Partial<UpdaterMapping>)
                          }
                          placeholder='Source path (optional)'
                        />
                      )}
                    </div>
                  )}

                  <Button
                    type='button'
                    className='rounded-md border text-[10px] text-gray-200 hover:bg-muted/60 self-start'
                    disabled={mappings.length <= 1}
                    onClick={(): void => removeMapping(index)}
                  >
                  Remove
                  </Button>
                </div>
              );
            })}
          </div>

          <Button
            type='button'
            className='w-full rounded-md border text-xs text-white hover:bg-muted/60'
            onClick={(): void => addMapping()}
          >
          Add mapping
          </Button>
        </div>
      )}
    </div>
  );
}
