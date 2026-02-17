'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import { 
  buildPresetQueryTemplate 
} from '@/features/ai/ai-paths/config/query-presets';
import { 
  renderTemplate, 
  safeParseJson, 
  createPresetId,
  extractJsonPathEntries,
  createParserMappings,
} from '@/features/ai/ai-paths/lib';
import type { 
  AiNode, 
  Edge, 
  DatabaseConfig, 
  DbQueryConfig, 
  UpdaterMapping,
  DbQueryPreset,
  DatabaseAction,
  DatabaseActionCategory
} from '@/features/ai/ai-paths/lib';
import { dbApi } from '@/features/ai/ai-paths/lib/api';
import { 
  resolveDbActionProvider, 
  isProviderActionCategorySupported,
  resolveProviderAction,
  getDefaultProviderAction
} from '@/features/ai/ai-paths/lib/core/utils/provider-actions';
import { PROMPT_ENGINE_SETTINGS_KEY, parsePromptEngineSettings } from '@/features/prompt-engine/settings';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { createListQueryV2, createMutationV2 } from '@/shared/lib/query-factories-v2';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { useAiPathConfig } from '../components/AiPathConfigContext';
import { 
  toDbSchemaSnapshot,
  applySchemaSelection,
} from '../utils/database-node-utils';


import type { SchemaData, AiQuery, DatabasePresetOption } from '../components/node-config/database/types';

type SchemaConfig = {
  provider?: 'auto' | 'mongodb' | 'prisma' | 'all';
  mode?: 'all' | 'selected';
  collections?: string[];
  includeFields?: boolean;
};

const DEFAULT_QUERY: DbQueryConfig = {
  provider: 'auto',
  collection: 'products',
  mode: 'preset',
  preset: 'by_id',
  field: '_id',
  idType: 'string',
  queryTemplate: '{\n  "_id": "{{value}}"\n}',
  limit: 20,
  sort: '',
  projection: '',
  single: false,
};

const DEFAULT_MAPPINGS: UpdaterMapping[] = [
  {
    targetPath: 'content_en',
    sourcePort: 'content_en',
  },
];

export function useDatabaseNodeConfigState() {
  const {
    selectedNode,
    nodes,
    edges,
    runtimeState,
    pathDebugSnapshot,
    updateSelectedNodeConfig,
    updaterSamples,
    handleFetchUpdaterSample,
    dbQueryPresets,
    setDbQueryPresets,
    saveDbQueryPresets,
    toast,
  } = useAiPathConfig();

  const { confirm, ConfirmationModal } = useConfirm();

  const [databaseTab, setDatabaseTab] = useState<'settings' | 'constructor' | 'presets'>('settings');
  const [selectedQueryPresetId, setSelectedQueryPresetId] = useState<string>('');
  const [queryPresetName, setQueryPresetName] = useState<string>('');
  const [saveQueryPresetModalOpen, setSaveQueryPresetModalOpen] = useState(false);
  const [newQueryPresetName, setNewQueryPresetName] = useState<string>('');
  const [pendingAiQuery, setPendingAiQuery] = useState<string>('');
  const [aiQueries, setAiQueries] = useState<AiQuery[]>([]);
  const [selectedAiQueryId, setSelectedAiQueryId] = useState<string>('');
  const [testQueryResult, setTestQueryResult] = useState<string>('');
  const [testQueryLoading, setTestQueryLoading] = useState(false);
  const [queryValidatorEnabled, setQueryValidatorEnabled] = useState(false);
  const [queryFormatterEnabled, setQueryFormatterEnabled] = useState(true);

  const queryTemplateRef = useRef<HTMLTextAreaElement | null>(null);
  const aiPromptRef = useRef<HTMLTextAreaElement | null>(null);
  const lastAutoFetchedRef = useRef<string>('');

  const settingsQuery = useSettingsMap();
  const rawPromptEngineSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptEngineSettings = useMemo(
    () => parsePromptEngineSettings(rawPromptEngineSettings),
    [rawPromptEngineSettings]
  );

  const selectedNodeId = selectedNode?.id ?? '';
  const isDatabaseSelected = selectedNode?.type === 'database';

  const schemaConnection = useMemo(() => {
    if (!isDatabaseSelected || !selectedNodeId) {
      return { hasSchemaConnection: false, schemaConfig: null as SchemaConfig | null };
    }
    const schemaEdge = edges.find((edge: Edge) => edge.to === selectedNodeId && nodes.find(n => n.id === edge.from)?.type === 'db_schema');
    if (!schemaEdge) return { hasSchemaConnection: false, schemaConfig: null };
    const schemaNode = nodes.find(n => n.id === schemaEdge.from);
    return { hasSchemaConnection: true, schemaConfig: schemaNode?.config?.db_schema as SchemaConfig };
  }, [edges, nodes, isDatabaseSelected, selectedNodeId]);

  const schemaProvider = schemaConnection.schemaConfig?.provider ?? 'auto';

  const schemaQuery = createListQueryV2<SchemaData, SchemaData>({
    queryKey: QUERY_KEYS.system.databases.schema({ provider: schemaProvider }),
    queryFn: async () => {
      const res = await dbApi.schema({ provider: schemaProvider });
      if (!res.ok) throw new Error(res.error || 'Failed to fetch schema.');
      return res.data as SchemaData;
    },
    enabled: schemaConnection.hasSchemaConnection && isDatabaseSelected,
    meta: { source: 'ai.ai-paths.node-config.database.schema', operation: 'list', resource: 'databases.schema', domain: 'global' },
  });

  const fetchedDbSchema = useMemo(() => (schemaConnection.hasSchemaConnection && schemaQuery.data ? applySchemaSelection(schemaQuery.data, schemaConnection.schemaConfig) : null), [schemaConnection, schemaQuery.data]);

  const persistedDatabase = selectedNode?.config?.database;
  const databaseConfig: DatabaseConfig = useMemo(() => ({
    operation: persistedDatabase?.operation ?? 'query',
    entityType: persistedDatabase?.entityType ?? 'product',
    idField: persistedDatabase?.idField ?? 'entityId',
    mode: persistedDatabase?.mode ?? 'replace',
    updateStrategy: persistedDatabase?.updateStrategy ?? 'one',
    useMongoActions: persistedDatabase?.useMongoActions ?? Boolean(persistedDatabase?.actionCategory || persistedDatabase?.action),
    actionCategory: persistedDatabase?.actionCategory,
    action: persistedDatabase?.action,
    distinctField: persistedDatabase?.distinctField ?? '',
    updateTemplate: persistedDatabase?.updateTemplate ?? '',
    mappings: persistedDatabase?.mappings && persistedDatabase.mappings.length > 0 ? persistedDatabase.mappings : DEFAULT_MAPPINGS,
    query: { ...DEFAULT_QUERY, ...(persistedDatabase?.query ?? {}) } as DbQueryConfig,
    writeSource: persistedDatabase?.writeSource ?? 'bundle',
    writeSourcePath: persistedDatabase?.writeSourcePath ?? '',
    dryRun: persistedDatabase?.dryRun ?? false,
    presetId: persistedDatabase?.presetId,
    skipEmpty: persistedDatabase?.skipEmpty ?? false,
    trimStrings: persistedDatabase?.trimStrings ?? false,
    aiPrompt: persistedDatabase?.aiPrompt ?? '',
    validationRuleIds: persistedDatabase?.validationRuleIds ?? [],
    schemaSnapshot: persistedDatabase?.schemaSnapshot,
  }), [persistedDatabase]);

  const queryConfig = databaseConfig.query ?? DEFAULT_QUERY;
  const appDbProvider = settingsQuery.data?.get('app_db_provider') === 'mongodb' ? 'mongodb' : 'prisma';
  const resolvedProvider = resolveDbActionProvider(queryConfig.provider, appDbProvider);

  const queryTemplateValue = useMemo(() => {
    const raw = queryConfig.queryTemplate ?? '';
    return raw.trim().length ? raw : queryConfig.mode === 'preset' ? buildPresetQueryTemplate(queryConfig) : raw;
  }, [queryConfig]);

  const isUpdateAction = useMemo(() =>
    databaseConfig.actionCategory === 'update' && ['updateOne', 'updateMany', 'replaceOne', 'findOneAndUpdate'].includes(databaseConfig.action || ''),
  [databaseConfig.action, databaseConfig.actionCategory]);

  const schemaSyncMutation = createMutationV2<SchemaData, 'auto' | 'mongodb' | 'prisma' | 'all'>({
    mutationKey: QUERY_KEYS.ai.aiPaths.mutation('node-config.database.schema-sync'),
    mutationFn: async (provider): Promise<SchemaData> => {
      const result = await dbApi.schema({ provider });
      if (!result.ok) throw new Error(result.error || 'Failed to fetch schema.');
      return result.data as SchemaData;
    },
    meta: {
      source: 'ai.ai-paths.node-config.database.schema-sync',
      operation: 'action',
      resource: 'databases.schema',
      domain: 'global',
    },
    onSuccess: (data) => {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          schemaSnapshot: toDbSchemaSnapshot(data, new Date().toISOString()),
        },
      });
      toast('Schema synced.', { variant: 'success' });
    },
  });

  const handleSyncSchema = useCallback(() => {
    const provider = schemaConnection.schemaConfig?.provider ?? queryConfig.provider ?? 'auto';
    schemaSyncMutation.mutate(provider);
  }, [queryConfig.provider, schemaConnection.schemaConfig?.provider, schemaSyncMutation]);

  const handleRunQuery = useCallback(async () => {
    setTestQueryLoading(true);
    setTestQueryResult('');
    try {
      const ctx = { ...runtimeState.outputs[selectedNodeId], ...runtimeState.inputs[selectedNodeId] };
      const rawValue = runtimeState.inputs[selectedNodeId]?.['value'] || runtimeState.inputs[selectedNodeId]?.['jobId'];
      const val = Array.isArray(rawValue) ? rawValue[0] : rawValue;
      const activeVal = isUpdateAction ? databaseConfig.updateTemplate : queryTemplateValue;
      const rendered = renderTemplate(activeVal || '', ctx, val ?? '');
      const parsed = safeParseJson(rendered);
      if (parsed.error) throw new Error(parsed.error);

      const res = await dbApi.action({
        provider: queryConfig.provider || 'auto',
        action: databaseConfig.action as DatabaseAction,
        collection: queryConfig.collection || 'products',
        [databaseConfig.actionCategory === 'create' ? 'document' : databaseConfig.actionCategory === 'aggregate' ? 'pipeline' : 'filter']: parsed.value,
        idType: queryConfig.idType || 'string',
      });
      if (!res.ok) throw new Error(res.error || 'Query failed');
      setTestQueryResult(JSON.stringify(res.data, null, 2));
      toast('Success', { variant: 'success' });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setTestQueryResult(JSON.stringify({ error: message }, null, 2));
      toast(message, { variant: 'error' });
    } finally {
      setTestQueryLoading(false);
    }
  }, [databaseConfig.action, databaseConfig.actionCategory, databaseConfig.updateTemplate, isUpdateAction, queryConfig, queryTemplateValue, runtimeState, selectedNodeId, toast]);

  const updateQueryConfig = useCallback((patch: Partial<DbQueryConfig>, options?: { syncPreset?: boolean }) => {
    const nextQuery = { ...queryConfig, ...patch };
    if (options?.syncPreset && nextQuery.mode === 'preset') {
      nextQuery.queryTemplate = buildPresetQueryTemplate(nextQuery);
    }
    updateSelectedNodeConfig({
      database: { ...databaseConfig, query: nextQuery },
    });
  }, [databaseConfig, queryConfig, updateSelectedNodeConfig]);

  const applyActionConfig = useCallback((nextCategory: DatabaseActionCategory, nextAction: DatabaseAction) => {
    const normalizedCategory = isProviderActionCategorySupported(resolvedProvider, nextCategory) ? nextCategory : 'read';
    const nextActionResolved = resolveProviderAction(resolvedProvider, normalizedCategory, nextAction, queryConfig.single ?? false);
    
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        useMongoActions: true,
        actionCategory: normalizedCategory,
        action: nextActionResolved,
        operation: normalizedCategory === 'create' ? 'insert' : normalizedCategory === 'update' ? 'update' : normalizedCategory === 'delete' ? 'delete' : 'query',
      },
    });
  }, [databaseConfig, queryConfig.single, resolvedProvider, updateSelectedNodeConfig]);

  const handleActionCategoryChange = useCallback((value: DatabaseActionCategory) => {
    const defaultAction = getDefaultProviderAction(resolvedProvider, value, queryConfig.single ?? false);
    applyActionConfig(value, defaultAction);
  }, [applyActionConfig, queryConfig.single, resolvedProvider]);

  const applyDatabasePreset = useCallback((id: string) => {
    const patch: Partial<DatabaseConfig> = { presetId: id };
    if (id === 'query_by_id') {
      Object.assign(patch, { useMongoActions: true, actionCategory: 'read', action: 'findOne', operation: 'query', entityType: 'product', query: { ...DEFAULT_QUERY, collection: 'products', mode: 'preset', preset: 'by_id', idType: 'string', single: true } });
    }
    updateSelectedNodeConfig({ database: { ...databaseConfig, ...patch } });
  }, [databaseConfig, updateSelectedNodeConfig]);

  const handleSaveQueryPreset = useCallback(async (name?: string, opts?: { forceNew?: boolean }) => {
    const finalName = (name ?? queryPresetName).trim();
    if (!finalName) { toast('Name required', { variant: 'error' }); return; }
    const now = new Date().toISOString();
    const next = [...dbQueryPresets];
    const idx = opts?.forceNew ? -1 : next.findIndex(p => p.id === selectedQueryPresetId);
    if (idx >= 0) {
      next[idx] = { ...next[idx]!, name: finalName, queryTemplate: queryTemplateValue, updateTemplate: databaseConfig.updateTemplate || '', updatedAt: now };
    } else {
      const p: DbQueryPreset = { id: createPresetId(), name: finalName, queryTemplate: queryTemplateValue || '{}', updateTemplate: databaseConfig.updateTemplate || '', createdAt: now, updatedAt: now };
      next.push(p);
      setSelectedQueryPresetId(p.id);
    }
    setDbQueryPresets(next);
    await saveDbQueryPresets(next);
    toast('Saved', { variant: 'success' });
  }, [dbQueryPresets, queryPresetName, selectedQueryPresetId, queryTemplateValue, databaseConfig.updateTemplate, setDbQueryPresets, saveDbQueryPresets, toast]);

  const handleRenameQueryPreset = useCallback(async (presetId: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      toast('Query preset name is required.', { variant: 'error' });
      return;
    }
    const nextPresets = dbQueryPresets.map(p => p.id === presetId ? { ...p, name: trimmed, updatedAt: new Date().toISOString() } : p);
    setDbQueryPresets(nextPresets);
    try {
      await saveDbQueryPresets(nextPresets);
      if (selectedQueryPresetId === presetId) setQueryPresetName(trimmed);
      toast('Query preset renamed.', { variant: 'success' });
    } catch {
      setDbQueryPresets(dbQueryPresets);
    }
  }, [dbQueryPresets, saveDbQueryPresets, selectedQueryPresetId, setDbQueryPresets, toast]);

  const handleDeleteQueryPresetById = useCallback(async (presetId: string) => {
    const target = dbQueryPresets.find(p => p.id === presetId);
    if (!target) return;

    confirm({
      title: 'Delete Preset?',
      message: `Are you sure you want to delete preset "${target.name}"? This action cannot be undone.`,
      confirmText: 'Delete',
      isDangerous: true,
      onConfirm: async () => {
        const nextPresets = dbQueryPresets.filter(p => p.id !== presetId);
        setDbQueryPresets(nextPresets);
        if (selectedQueryPresetId === presetId) {
          setSelectedQueryPresetId('');
          setQueryPresetName('');
        }
        try {
          await saveDbQueryPresets(nextPresets);
          toast('Query preset deleted.', { variant: 'success' });
        } catch {
          setDbQueryPresets(dbQueryPresets);
        }
      }
    });
  }, [dbQueryPresets, saveDbQueryPresets, selectedQueryPresetId, setDbQueryPresets, toast, confirm]);

  const actionCategory = databaseConfig.actionCategory || 'read';
  const action = databaseConfig.action || 'find';
  const operation = databaseConfig.operation;

  const incomingEdges = useMemo(() => edges.filter(e => e.to === selectedNodeId), [edges, selectedNodeId]);
  const incomingPorts = useMemo(() => Array.from(new Set(incomingEdges.map(e => e.toPort).filter((p): p is string => !!p))), [incomingEdges]);

  const sampleState = useMemo(() => updaterSamples[selectedNodeId] ?? {
    entityType: databaseConfig.entityType ?? 'product',
    entityId: '',
    json: '',
    depth: 2,
    includeContainers: false,
  }, [updaterSamples, selectedNodeId, databaseConfig.entityType]);

  const parsedSample = useMemo(() => safeParseJson(sampleState.json), [sampleState.json]);
  const sampleEntries = useMemo(() => (parsedSample.value ? extractJsonPathEntries(parsedSample.value, sampleState.depth ?? 2) : []), [parsedSample.value, sampleState.depth]);
  const targetPaths = useMemo(() => sampleEntries.filter(e => sampleState.includeContainers || e.type === 'value' || e.type === 'array').map(e => e.path), [sampleEntries, sampleState.includeContainers]);
  const uniqueTargetPathOptions = useMemo(() => Array.from(new Map(targetPaths.map(path => [path, { label: path, value: path }])).values()), [targetPaths]);
  const availablePorts = useMemo(() => (incomingPorts.length ? incomingPorts : (selectedNode?.inputs ?? [])), [incomingPorts, selectedNode?.inputs]);

  const bundleKeys = useMemo(() => {
    const keys = new Set<string>();
    incomingEdges.forEach((edge: Edge) => {
      if (edge.toPort !== 'bundle') return;
      const fromNode = nodes.find((node: AiNode) => node.id === edge.from);
      if (!fromNode) return;
      if (fromNode.type === 'parser') {
        const mappings = fromNode.config?.parser?.mappings ?? createParserMappings(fromNode.outputs);
        Object.keys(mappings).forEach((key: string) => {
          const trimmed = key.trim();
          if (trimmed) keys.add(trimmed);
        });
      } else if (fromNode.type === 'bundle') {
        fromNode.inputs.forEach((port: string) => {
          const trimmed = port.trim();
          if (trimmed) keys.add(trimmed);
        });
      } else if (fromNode.type === 'mapper') {
        const mapperOutputs = fromNode.config?.mapper?.outputs ?? fromNode.outputs;
        mapperOutputs.forEach((output: string) => {
          const trimmed = output.trim();
          if (trimmed) keys.add(trimmed);
        });
      }
    });
    return keys;
  }, [incomingEdges, nodes]);

  const connectedPlaceholders = useMemo(() => {
    const placeholders: string[] = [];
    const set = new Set<string>();
    const add = (p: string) => {
      const t = p.trim();
      if (t && !set.has(t)) {
        set.add(t);
        placeholders.push(t);
      }
    };
    incomingPorts.forEach(port => {
      if (port !== 'bundle' && (port !== 'result' || operation === 'update')) {
        add(`{{${port}}}`);
      }
    });
    bundleKeys.forEach(key => add(`{{bundle.${key}}}`));
    if (incomingPorts.includes('context')) {
      add('{{context.entityId}}');
      add('{{context.entityType}}');
    }
    if (incomingPorts.includes('meta')) {
      add('{{meta.pathId}}');
      add('{{meta.trigger}}');
    }
    return placeholders;
  }, [incomingPorts, operation, bundleKeys]);

  const mappings = databaseConfig.mappings && databaseConfig.mappings.length > 0 ? databaseConfig.mappings : DEFAULT_MAPPINGS;

  const updateMapping = useCallback((index: number, patch: Partial<UpdaterMapping>) => {
    const nextMappings = mappings.map((m, idx) => idx === index ? { ...m, ...patch } : m);
    updateSelectedNodeConfig({ database: { ...databaseConfig, mappings: nextMappings } });
  }, [databaseConfig, mappings, updateSelectedNodeConfig]);

  const removeMapping = useCallback((index: number) => {
    if (mappings.length <= 1) return;
    updateSelectedNodeConfig({ database: { ...databaseConfig, mappings: mappings.filter((_, idx) => idx !== index) } });
  }, [databaseConfig, mappings, updateSelectedNodeConfig]);

  const addMapping = useCallback(() => {
    updateSelectedNodeConfig({ database: { ...databaseConfig, mappings: [...mappings, { targetPath: '', sourcePort: availablePorts[0] ?? 'result', sourcePath: '' }] } });
  }, [availablePorts, databaseConfig, mappings, updateSelectedNodeConfig]);

  const mapInputsToTargets = useCallback(() => {
    const nextMappings: UpdaterMapping[] = [];
    availablePorts.forEach(port => {
      if (port === databaseConfig.idField) return;
      if (port === 'bundle') {
        bundleKeys.forEach(key => nextMappings.push({ targetPath: key, sourcePort: 'bundle', sourcePath: key }));
      } else {
        const normalized = port.toLowerCase();
        const target = targetPaths.find(p => p.toLowerCase().endsWith(normalized) || p.toLowerCase().includes(normalized)) ?? port;
        nextMappings.push({ targetPath: target, sourcePort: port });
      }
    });
    if (nextMappings.length > 0) updateSelectedNodeConfig({ database: { ...databaseConfig, mappings: nextMappings } });
  }, [availablePorts, bundleKeys, databaseConfig, targetPaths, updateSelectedNodeConfig]);

  const presetOptions: DatabasePresetOption[] = useMemo(() => [
    { id: 'custom', label: 'Custom', description: 'Keep current settings and customize manually.' },
    { id: 'query_by_id', label: 'Query by ID', description: 'Flexible ID query (supports UUID, ObjectId, entityId).' },
    { id: 'query_recent_products', label: 'Query recent', description: 'Fetches newest documents sorted by createdAt.' },
    { id: 'query_name_contains', label: 'Search by name', description: 'Regex search on name field.' },
    { id: 'update_content_en_from_result', label: 'Update from result', description: 'Updates document field using incoming result.' },
    { id: 'delete_product_by_entity', label: 'Delete by ID', description: 'Deletes document using connected ID input.' },
    { id: 'insert_from_bundle', label: 'Insert from bundle', description: 'Creates new document from bundle payload.' },
  ], []);

  // Sync logic
  useEffect(() => {
    if (!isDatabaseSelected || !selectedNodeId) return;
    const runtimeInputs = (runtimeState.inputs[selectedNodeId] ?? {}) as Record<string, unknown>;
    const detectedId = (runtimeInputs['entityId'] as string || runtimeInputs['productId'] as string || runtimeInputs['value'] as string)?.trim?.();
    if (!detectedId) return;

    const queryCollection = databaseConfig.query?.collection ?? 'products';
    const fetchKey = `${queryCollection}:${detectedId}`;
    if (fetchKey === lastAutoFetchedRef.current) return;

    const existingSample = updaterSamples[selectedNodeId];
    if (existingSample?.entityId === detectedId && existingSample?.json?.trim()) return;

    lastAutoFetchedRef.current = fetchKey;
    void handleFetchUpdaterSample(selectedNodeId, queryCollection, detectedId, { notify: false });
  }, [selectedNodeId, isDatabaseSelected, databaseConfig.query?.collection, runtimeState, updaterSamples, handleFetchUpdaterSample]);

  return {
    selectedNode, databaseConfig, queryConfig, databaseTab, setDatabaseTab,
    selectedQueryPresetId, setSelectedQueryPresetId, queryPresetName, setQueryPresetName,
    saveQueryPresetModalOpen, setSaveQueryPresetModalOpen, newQueryPresetName, setNewQueryPresetName,
    pendingAiQuery, setPendingAiQuery, aiQueries, setAiQueries, selectedAiQueryId, setSelectedAiQueryId,
    testQueryResult, setTestQueryResult, testQueryLoading, setTestQueryLoading,
    queryValidatorEnabled, setQueryValidatorEnabled, queryFormatterEnabled, setQueryFormatterEnabled,
    schemaQuery, promptEngineSettings, schemaConnection, fetchedDbSchema,
    updateSelectedNodeConfig, updateQueryConfig, handleSyncSchema,
    toast, appDbProvider, resolvedProvider, runtimeState, pathDebugSnapshot, nodes, edges,
    queryTemplateRef, aiPromptRef, dbQueryPresets, setDbQueryPresets, saveDbQueryPresets,
    operation, actionCategory, action,
    connectedPlaceholders, sampleState, parsedSampleError: parsedSample.error || undefined,
    uniqueTargetPathOptions, availablePorts, mappings,
    updateMapping, removeMapping, addMapping,
    mapInputsToTargets, presetOptions, applyDatabasePreset,
    openSaveQueryPresetModal: () => { setNewQueryPresetName(''); setSaveQueryPresetModalOpen(true); },
    closeSaveQueryPresetModal: () => setSaveQueryPresetModalOpen(false),
    handleSaveQueryPreset, handleRunQuery, isUpdateAction, queryTemplateValue,
    handleRenameQueryPreset, handleDeleteQueryPresetById,
    handleActionCategoryChange, applyActionConfig, schemaSyncMutation, bundleKeys,
    ConfirmationModal
  };
}
