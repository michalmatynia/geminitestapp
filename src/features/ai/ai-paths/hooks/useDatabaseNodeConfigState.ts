'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import { createPresetId, extractJsonPathEntries, dbApi } from '@/shared/lib/ai-paths';
import type {
  DatabaseConfig,
  DbQueryConfig,
  DbQueryPreset,
  DatabaseActionCategory,
} from '@/shared/lib/ai-paths';
import type { SchemaData } from '@/shared/contracts/database';
import { safeParseJson } from '@/shared/lib/ai-paths/core/utils/runtime';
import { resolveDbActionProvider } from '@/shared/lib/ai-paths/core/utils/provider-actions';
import {
  PROMPT_ENGINE_SETTINGS_KEY,
  parsePromptEngineSettings,
} from '@/shared/lib/prompt-engine/settings';
import type { AiQuery, DatabasePresetOption } from '@/shared/contracts/database';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { type Toast } from '@/shared/ui';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';

import { useAiPathConfig } from '../components/AiPathConfigContext';
import { extractCodeSnippets } from '../components/node-config/database/database-constructor-tab-helpers';

import { useDatabaseQueryExecution } from './database-node/useDatabaseQueryExecution';
import { useDatabaseActionConfig } from './database-node/useDatabaseActionConfig';
import { useDatabaseMappingState } from './database-node/useDatabaseMappingState';

const DEFAULT_QUERY: DbQueryConfig = {
  provider: 'auto',
  collection: 'products',
  mode: 'custom',
  preset: 'by_id',
  field: '_id',
  idType: 'string',
  queryTemplate: '',
  limit: 20,
  sort: '',
  projection: '',
  single: false,
};

const LEGACY_MONGO_DEFAULT_QUERY_TEMPLATE = '{\n  "_id": "{{value}}"\n}';

const normalizeTemplateText = (value: string | undefined | null): string => {
  if (typeof value !== 'string') return '';
  if (!value.includes('\\n') || value.includes('\n')) return value;
  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
  return value.replace(/\\n/g, '\n');
};

const isLegacyMongoDefaultQuery = (query: DbQueryConfig): boolean =>
  query.provider === 'mongodb' &&
  query.collection === 'products' &&
  query.mode === 'preset' &&
  query.preset === 'by_id' &&
  query.field === '_id' &&
  query.idType === 'string' &&
  query.queryTemplate === LEGACY_MONGO_DEFAULT_QUERY_TEMPLATE &&
  query.limit === 20 &&
  query.sort === '' &&
  query.projection === '' &&
  query.single === false;

const normalizeLegacyQueryProvider = (query: DbQueryConfig): DbQueryConfig => {
  const normalizedTemplate = normalizeTemplateText(query.queryTemplate ?? '');
  if (query.provider !== 'auto' && query.provider !== 'mongodb' && query.provider !== 'prisma') {
    return {
      ...query,
      provider: 'auto',
      queryTemplate: normalizedTemplate,
    };
  }
  if (isLegacyMongoDefaultQuery(query)) {
    return {
      ...query,
      provider: 'auto',
      queryTemplate: normalizedTemplate,
    };
  }
  return { ...query, queryTemplate: normalizedTemplate };
};

const mapOperationFromActionCategory = (
  category: DatabaseActionCategory
): 'query' | 'update' | 'insert' | 'delete' | 'action' | 'distinct' => {
  if (category === 'create') return 'insert';
  if (category === 'read' || category === 'aggregate') return 'query';
  if (category === 'update') return 'update';
  if (category === 'delete') return 'delete';
  return 'action';
};

export function useDatabaseNodeConfigState() {
  const {
    selectedNode: contextSelectedNode,
    nodes,
    edges,
    runtimeState,
    updateSelectedNodeConfig,
    toast,
    pathDebugSnapshot,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    updaterSamples,
    handleFetchUpdaterSample,
  } = useAiPathConfig();

  const selectedNodeId = contextSelectedNode?.id ?? '';
  const appDbProvider: 'prisma' | 'mongodb' = 'mongodb';

  const { ConfirmationModal } = useConfirm();

  const [databaseTab, setDatabaseTab] = useState<'query' | 'constructor' | 'advanced'>('query');
  const [selectedQueryPresetId, setSelectedQueryPresetId] = useState<string>('custom');
  const [queryPresetName, setQueryPresetName] = useState<string>('');
  const [saveQueryPresetModalOpen, setSaveQueryPresetModalOpen] = useState(false);
  const [newQueryPresetName, setNewQueryPresetName] = useState<string>('');
  const [pendingAiQuery, setPendingAiQuery] = useState<string>('');
  const [aiQueries, setAiQueries] = useState<AiQuery[]>([]);
  const [selectedAiQueryId, setSelectedAiQueryId] = useState<string>('');
  const [testQueryResult, setTestQueryResult] = useState<unknown | null>(null);
  const [testQueryLoading, setTestQueryLoading] = useState(false);
  const [queryValidatorEnabled, setQueryValidatorEnabled] = useState(true);
  const [queryFormatterEnabled, setQueryFormatterEnabled] = useState(true);
  const [selectedSnippetIndex, setSelectedSnippetIndex] = useState<number | null>(null);

  const queryTemplateRef = useRef<HTMLTextAreaElement>(null);
  const aiPromptRef = useRef<HTMLTextAreaElement>(null);
  const lastAutoFetchedRef = useRef<string | null>(null);

  const selectedNode = contextSelectedNode;

  const isDatabaseSelected = selectedNode?.type === 'database';
  const databaseConfig = useMemo(
    () => (selectedNode?.config?.database as DatabaseConfig) ?? ({} as DatabaseConfig),
    [selectedNode]
  );
  const queryConfig = useMemo(
    () => normalizeLegacyQueryProvider(databaseConfig.query ?? DEFAULT_QUERY),
    [databaseConfig.query]
  );

  const operation = databaseConfig.operation ?? 'query';
  const actionCategory = databaseConfig.actionCategory ?? 'read';
  const action = databaseConfig.action ?? 'find';
  const isUpdateAction = actionCategory === 'update';
  const resolvedProvider = resolveDbActionProvider(queryConfig.provider, appDbProvider);

  const queryTemplateValue = isUpdateAction
    ? (databaseConfig.updateTemplate ?? '')
    : (queryConfig.queryTemplate ?? '');

  const { handleRunQuery, updateQueryConfig } = useDatabaseQueryExecution({
    selectedNodeId,
    databaseConfig,
    queryConfig,
    runtimeState,
    queryTemplateValue,
    isUpdateAction,
    updateSelectedNodeConfig,
    toast: toast as unknown as Toast,
    setTestQueryResult,
    setTestQueryLoading,
  });
  const { handleProviderChange, handleActionCategoryChange, applyActionConfig } =
    useDatabaseActionConfig({
      databaseConfig,
      queryConfig,
      appDbProvider,
      resolvedProvider,
      updateSelectedNodeConfig,
      mapOperationFromActionCategory,
    });

  const settingsMap = useSettingsMap();
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(settingsMap.data?.get(PROMPT_ENGINE_SETTINGS_KEY)),
    [settingsMap.data]
  );

  const schemaQuery = createListQueryV2<SchemaData, SchemaData>({
    queryKey: ['ai-paths', 'database', 'schema'] as const,
    queryFn: () => dbApi.schema() as unknown as Promise<SchemaData>,
    meta: {
      source: 'ai.ai-paths.database-node.schema',
      operation: 'action',
      resource: 'database.schema',
      domain: 'global',
    },
  });

  const schemaSyncMutation = createMutationV2<void, string | undefined>({
    mutationFn: async (_provider) => {
      await dbApi.schema();
    },
    onSuccess: () => {
      void schemaQuery.refetch();
      toast('Schema synced', { variant: 'success' });
    },
    meta: {
      source: 'ai.ai-paths.database-node.sync-schema',
      operation: 'action',
      resource: 'database.schema',
      domain: 'global',
    },
  });

  const fetchedDbSchema = schemaQuery.data;
  const schemaConnection = useMemo(() => {
    const config = selectedNode?.config?.db_schema ?? {};
    return {
      nodeId: selectedNodeId,
      schemaConfig: config,
      snapshot: selectedNode?.config?.database?.schemaSnapshot ?? null,
    };
  }, [selectedNode, selectedNodeId]);

  const handleSyncSchema = useCallback(() => {
    const schemaConfig = schemaConnection.schemaConfig as { provider?: string } | undefined;
    const provider = schemaConfig?.provider ?? queryConfig.provider ?? 'auto';
    schemaSyncMutation.mutate(provider);
  }, [queryConfig.provider, schemaConnection.schemaConfig, schemaSyncMutation]);

  const applyQueryTemplateUpdate = useCallback(
    (nextQuery: string): void => {
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
    },
    [
      databaseConfig,
      isUpdateAction,
      queryConfig,
      selectedAiQueryId,
      updateQueryConfig,
      updateSelectedNodeConfig,
    ]
  );

  const insertTemplateSnippet = useCallback(
    (placeholder: string): void => {
      const currentTemplate = queryTemplateValue ?? '';
      const textArea = queryTemplateRef?.current;
      const selectionStart = textArea?.selectionStart ?? currentTemplate.length;
      const selectionEnd = textArea?.selectionEnd ?? currentTemplate.length;
      const rangeStart = Math.max(
        0,
        Math.min(selectionStart, selectionEnd, currentTemplate.length)
      );
      const rangeEnd = Math.max(
        rangeStart,
        Math.min(Math.max(selectionStart, selectionEnd), currentTemplate.length)
      );
      const nextQuery = `${currentTemplate.slice(0, rangeStart)}${placeholder}${currentTemplate.slice(rangeEnd)}`;

      applyQueryTemplateUpdate(nextQuery);

      window.setTimeout(() => {
        const node = queryTemplateRef?.current;
        if (!node) return;
        const cursorPosition = rangeStart + placeholder.length;
        node.focus();
        node.setSelectionRange(cursorPosition, cursorPosition);
      }, 0);
    },
    [applyQueryTemplateUpdate, queryTemplateValue]
  );

  const insertQueryPlaceholder = insertTemplateSnippet;

  const insertAiPromptPlaceholder = useCallback(
    (placeholder: string): void => {
      const currentValue = databaseConfig.aiPrompt ?? '';
      const textArea = aiPromptRef?.current;
      const selectionStart = textArea?.selectionStart ?? currentValue.length;
      const selectionEnd = textArea?.selectionEnd ?? currentValue.length;
      const rangeStart = Math.max(0, Math.min(selectionStart, selectionEnd, currentValue.length));
      const rangeEnd = Math.max(
        rangeStart,
        Math.min(Math.max(selectionStart, selectionEnd), currentValue.length)
      );
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
    },
    [databaseConfig, updateSelectedNodeConfig]
  );

  const applyDatabasePreset = useCallback(
    (id: string) => {
      const patch: Partial<DatabaseConfig> = { presetId: id };
      if (id === 'query_by_id') {
        Object.assign(patch, {
          useMongoActions: true,
          actionCategory: 'read',
          action: 'findOne',
          operation: 'query',
          entityType: 'product',
          query: {
            ...DEFAULT_QUERY,
            collection: 'products',
            mode: 'custom',
            preset: 'by_id',
            idType: 'string',
            queryTemplate: '{\n  "id": "{{value}}"\n}',
            single: true,
          },
        });
      }
      updateSelectedNodeConfig({ database: { ...databaseConfig, ...patch } });
    },
    [databaseConfig, updateSelectedNodeConfig]
  );

  const handleSaveQueryPreset = useCallback(
    async (name?: string, opts?: { forceNew?: boolean }) => {
      const finalName = (name ?? queryPresetName).trim();
      if (!finalName) {
        toast('Name required', { variant: 'error' });
        return;
      }
      const now = new Date().toISOString();
      const next = [...dbQueryPresets];
      const idx = opts?.forceNew ? -1 : next.findIndex((p) => p.id === selectedQueryPresetId);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx]!,
          name: finalName,
          queryTemplate: queryTemplateValue,
          updateTemplate: databaseConfig.updateTemplate || '',
          updatedAt: now,
        };
      } else {
        const p: DbQueryPreset = {
          id: createPresetId(),
          name: finalName,
          queryTemplate: queryTemplateValue || '{}',
          updateTemplate: databaseConfig.updateTemplate || '',
          createdAt: now,
          updatedAt: now,
        };
        next.push(p);
        setSelectedQueryPresetId(p.id);
      }
      setDbQueryPresets(next);
      await saveDbQueryPresets(next);
      toast('Saved', { variant: 'success' });
    },
    [
      dbQueryPresets,
      queryPresetName,
      selectedQueryPresetId,
      queryTemplateValue,
      databaseConfig.updateTemplate,
      setDbQueryPresets,
      saveDbQueryPresets,
      toast,
    ]
  );

  const handleRenameQueryPreset = useCallback(
    async (presetId: string, nextName: string) => {
      const trimmed = nextName.trim();
      if (!trimmed) return;
      const next = dbQueryPresets.map((p) => (p.id === presetId ? { ...p, name: trimmed } : p));
      setDbQueryPresets(next);
      await saveDbQueryPresets(next);
    },
    [dbQueryPresets, setDbQueryPresets, saveDbQueryPresets]
  );

  const handleDeleteQueryPresetById = useCallback(
    async (presetId: string) => {
      const next = dbQueryPresets.filter((p) => p.id !== presetId);
      setDbQueryPresets(next);
      await saveDbQueryPresets(next);
      if (selectedQueryPresetId === presetId) {
        setSelectedQueryPresetId('custom');
      }
    },
    [dbQueryPresets, selectedQueryPresetId, setDbQueryPresets, saveDbQueryPresets]
  );

  const connectedPlaceholders = useMemo(() => {
    const incoming: string[] = [];
    edges.forEach((edge) => {
      if (edge.to === selectedNodeId && edge.fromPort) {
        incoming.push(edge.fromPort);
      }
    });
    return Array.from(new Set(incoming));
  }, [edges, selectedNodeId]);

  const sampleState = useMemo(
    () => updaterSamples[selectedNodeId],
    [updaterSamples, selectedNodeId]
  );
  const parsedSample = useMemo(() => safeParseJson(sampleState?.json ?? ''), [sampleState]);

  const uniqueTargetPathOptions = useMemo(() => {
    if (!parsedSample.value) return [];
    return extractJsonPathEntries(parsedSample.value).map((e) => e.path);
  }, [parsedSample.value]);

  const availablePorts = useMemo(() => {
    const ports = ['result', 'bundle', 'value', 'jobId'];
    connectedPlaceholders.forEach((p) => {
      if (!ports.includes(p)) ports.push(p);
    });
    return ports;
  }, [connectedPlaceholders]);

  const bundleKeys = useMemo(() => {
    const keys = new Set<string>();
    edges.forEach((edge) => {
      if (edge.to === selectedNodeId && edge.fromPort === 'bundle') {
        const sourceNode = nodes.find((n) => n.id === edge.from);
        if (sourceNode?.type === 'parser') {
          const parserConfig = sourceNode.config?.parser;
          if (parserConfig?.mappings) {
            Object.keys(parserConfig.mappings).forEach((k) => keys.add(k));
          }
        }
      }
    });
    return Array.from(keys);
  }, [edges, nodes, selectedNodeId]);

  const mappings = useMemo(() => databaseConfig.mappings ?? [], [databaseConfig.mappings]);
  const targetPaths = useMemo(() => uniqueTargetPathOptions, [uniqueTargetPathOptions]);

  const mappingState = useDatabaseMappingState({
    databaseConfig,
    mappings,
    availablePorts,
    bundleKeys,
    targetPaths,
    updateSelectedNodeConfig,
  });

  const codeSnippets = useMemo(() => extractCodeSnippets(queryTemplateValue), [queryTemplateValue]);

  const presetOptions: DatabasePresetOption[] = useMemo(
    () => [
      {
        id: 'custom',
        label: 'Custom',
        description: 'Keep current settings and customize manually.',
      },
      {
        id: 'query_by_id',
        label: 'Query by ID',
        description: 'Flexible ID query (supports UUID, ObjectId, entityId).',
      },
      {
        id: 'query_recent_products',
        label: 'Query recent',
        description: 'Fetches newest documents sorted by createdAt.',
      },
      {
        id: 'query_name_contains',
        label: 'Search by name',
        description: 'Regex search on name field.',
      },
      {
        id: 'update_content_en_from_result',
        label: 'Update from result',
        description: 'Updates document field using incoming result.',
      },
      {
        id: 'delete_product_by_entity',
        label: 'Delete by ID',
        description: 'Deletes document using connected ID input.',
      },
      {
        id: 'insert_from_bundle',
        label: 'Insert from bundle',
        description: 'Creates new document from bundle payload.',
      },
    ],
    []
  );

  useEffect(() => {
    if (!isDatabaseSelected || !selectedNodeId) return;
    const runtimeInputs = runtimeState.inputs?.[selectedNodeId] ?? {};
    const detectedId = (
      (runtimeInputs['entityId'] as string) ||
      (runtimeInputs['productId'] as string) ||
      (runtimeInputs['value'] as string)
    )?.trim?.();
    if (!detectedId) return;

    const queryCollection = databaseConfig.query?.collection ?? 'products';
    const fetchKey = `${queryCollection}:${detectedId}`;
    if (fetchKey === lastAutoFetchedRef.current) return;

    const existingSample = updaterSamples[selectedNodeId];
    if (existingSample?.entityId === detectedId && existingSample?.json?.trim()) return;

    lastAutoFetchedRef.current = fetchKey;
    void handleFetchUpdaterSample(selectedNodeId, queryCollection, detectedId, { notify: false });
  }, [
    selectedNodeId,
    isDatabaseSelected,
    databaseConfig.query?.collection,
    runtimeState,
    updaterSamples,
    handleFetchUpdaterSample,
  ]);

  return {
    selectedNode,
    databaseConfig,
    queryConfig,
    databaseTab,
    setDatabaseTab,
    selectedQueryPresetId,
    setSelectedQueryPresetId,
    queryPresetName,
    setQueryPresetName,
    saveQueryPresetModalOpen,
    setSaveQueryPresetModalOpen,
    newQueryPresetName,
    setNewQueryPresetName,
    pendingAiQuery,
    setPendingAiQuery,
    aiQueries,
    setAiQueries,
    selectedAiQueryId,
    setSelectedAiQueryId,
    testQueryResult,
    setTestQueryResult,
    testQueryLoading,
    setTestQueryLoading,
    queryValidatorEnabled,
    setQueryValidatorEnabled,
    queryFormatterEnabled,
    setQueryFormatterEnabled,
    codeSnippets,
    selectedSnippetIndex,
    setSelectedSnippetIndex,
    schemaQuery,
    promptEngineSettings,
    schemaConnection,
    fetchedDbSchema,
    updateSelectedNodeConfig,
    updateQueryConfig,
    handleSyncSchema,
    toast,
    appDbProvider,
    resolvedProvider,
    runtimeState,
    pathDebugSnapshot,
    nodes,
    edges,
    queryTemplateRef,
    aiPromptRef,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    operation,
    actionCategory,
    action,
    connectedPlaceholders,
    sampleState,
    parsedSampleError: parsedSample.error || undefined,
    uniqueTargetPathOptions,
    availablePorts,
    mappings,
    ...mappingState,
    presetOptions,
    applyDatabasePreset,
    insertTemplateSnippet,
    applyQueryTemplateUpdate,
    insertQueryPlaceholder,
    insertAiPromptPlaceholder,
    openSaveQueryPresetModal: () => {
      setNewQueryPresetName('');
      setSaveQueryPresetModalOpen(true);
    },
    closeSaveQueryPresetModal: () => setSaveQueryPresetModalOpen(false),
    handleSaveQueryPreset,
    handleRunQuery,
    isUpdateAction,
    queryTemplateValue,
    handleRenameQueryPreset,
    handleDeleteQueryPresetById,
    handleActionCategoryChange,
    applyActionConfig,
    handleProviderChange,
    schemaSyncMutation,
    bundleKeys,
    ConfirmationModal,
  };
}
