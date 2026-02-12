'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import React from 'react';

import {
  PROJECTION_PRESETS,
  SORT_PRESETS,
  buildPresetQueryTemplate,
} from '@/features/ai/ai-paths/config/query-presets';
import type {
  AiNode,
  DatabaseAction,
  DatabaseActionCategory,
  DatabaseConfig,
  DbQueryConfig,
  DbQueryPreset,
  Edge,
  PathDebugEntry,
  UpdaterMapping,
} from '@/features/ai/ai-paths/lib';
import {
  DB_COLLECTION_OPTIONS,
  DB_PROVIDER_PLACEHOLDERS,
  createParserMappings,
  createPresetId,
  extractJsonPathEntries,
  renderTemplate,
  safeParseJson,
  toNumber,
} from '@/features/ai/ai-paths/lib';
import { dbApi } from '@/features/ai/ai-paths/lib/api';
import {
  getDefaultProviderAction,
  getProviderActionCategoryOptions,
  getProviderActionOptions,
  getProviderSpecificActionLabel,
  getUnsupportedProviderActionMessage,
  isProviderActionCategorySupported,
  resolveDbActionProvider,
  resolveProviderAction,
} from '@/features/ai/ai-paths/lib/core/utils/provider-actions';
import { PRODUCT_DB_PROVIDER_SETTING_KEY } from '@/features/products/constants';
import { PROMPT_ENGINE_SETTINGS_KEY, parsePromptEngineSettings, type PromptValidationRule } from '@/features/prompt-engine/settings';
import { useSettingsMap } from '@/shared/hooks/use-settings';
import { Button, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger, Checkbox } from '@/shared/ui';

type ActionResult = {
  item?: unknown;
  items?: unknown[];
  values?: unknown[];
  result?: unknown;
  insertedCount?: number;
  deletedCount?: number;
  matchedCount?: number;
  modifiedCount?: number;
  count?: number;
  value?: unknown;
};

import { useAiPathConfig } from '../AiPathConfigContext';
import { DatabaseConstructorContextProvider } from './database/DatabaseConstructorContext';
import { DatabaseConstructorTab } from './database/DatabaseConstructorTab';
import { DatabasePresetsTab } from './database/DatabasePresetsTab';
import { DatabasePresetsTabContextProvider } from './database/DatabasePresetsTabContext';
import { DatabaseQueryInputControls } from './database/DatabaseQueryInputControls';
import { DatabaseQueryValidatorPanel } from './database/DatabaseQueryValidatorPanel';
import { DatabaseQueryValidatorPanelContextProvider } from './database/DatabaseQueryValidatorPanelContext';
import { DatabaseSaveQueryPresetDialog } from './database/DatabaseSaveQueryPresetDialog';
import { DatabaseSaveQueryPresetDialogContextProvider } from './database/DatabaseSaveQueryPresetDialogContext';
import { DatabaseSettingsTab } from './database/DatabaseSettingsTab';
import { DatabaseSettingsTabContextProvider } from './database/DatabaseSettingsTabContext';
import {
  buildJsonQueryValidation,
  buildMongoQueryValidation,
  buildValidationIssues,
  formatAndFixMongoQuery,
  getQueryPlaceholderByAction,
  getUpdatePlaceholderByAction,
  mergeValidationIssues,
  type ValidationPaletteRule,
} from './database/query-utils';

import type { AiQuery, CollectionSchema, DatabasePresetOption, SchemaData } from './database/types';

const toTitleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const singularize = (value: string): string => {
  if (value.endsWith('ies') && value.length > 3) {
    return `${value.slice(0, -3)}y`;
  }
  if (value.endsWith('ses') && value.length > 3) {
    return value.slice(0, -2);
  }
  if (value.endsWith('s') && !value.endsWith('ss') && value.length > 1) {
    return value.slice(0, -1);
  }
  return value;
};

const normalizeSchemaType = (value: string): string => {
  const normalized = value.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'string') return 'string';
  if (lower === 'int' || lower === 'float' || lower === 'decimal' || lower === 'number') return 'number';
  if (lower === 'boolean' || lower === 'bool') return 'boolean';
  if (lower === 'datetime' || lower === 'date') return 'string';
  if (lower === 'json') return 'Record<string, unknown>';
  return normalized || 'unknown';
};

const formatCollectionSchema = (collectionName: string, fields: Array<{ name: string; type: string }> = []): string => {
  const interfaceName = toTitleCase(singularize(collectionName));
  if (!fields.length) {
    return `interface ${interfaceName} {}`;
  }
  const lines = fields.map((field: { name: string; type: string }) => `  ${field.name}: ${normalizeSchemaType(field.type)};`);
  return `interface ${interfaceName} {\n${lines.join('\n')}\n}`;
};

const formatCollectionLabel = (collection: CollectionSchema, includeProvider: boolean): string => {
  const baseLabel = toTitleCase(collection.name);
  if (includeProvider && collection.provider) {
    return `${baseLabel} (${collection.provider})`;
  }
  return baseLabel;
};

const normalizeSchemaCollections = (schema: SchemaData | null): Array<CollectionSchema> => {
  if (!schema?.collections?.length) return [];
  if (schema.provider === 'multi') return schema.collections;
  return schema.collections.map((collection: CollectionSchema) => ({
    ...collection,
    provider: schema.provider as 'mongodb' | 'prisma',
  }));
};

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

const applySchemaSelection = (
  schema: SchemaData,
  schemaConfig?: SchemaConfig | null
): SchemaData => {
  let collections = normalizeSchemaCollections(schema);
  if (schemaConfig?.mode === 'selected' && schemaConfig.collections?.length) {
    const selectedCollections = new Set(
      schemaConfig.collections.map((name: string) => name.toLowerCase())
    );
    collections = collections.filter((collection: CollectionSchema) =>
      matchesCollectionSelection(collection, selectedCollections)
    );
  }
  if (schemaConfig?.includeFields === false) {
    collections = collections.map((collection: CollectionSchema) => ({
      ...collection,
      fields: [],
    }));
  }
  return { ...schema, collections };
};

const normalizeCollectionKey = (value: string): string => value.trim().toLowerCase();

const toSnakeCase = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/__+/g, '_')
    .toLowerCase();

const pluralize = (value: string): string => {
  if (!value) return value;
  if (value.endsWith('s')) return value;
  if (value.endsWith('y') && !/[aeiou]y$/.test(value)) {
    return `${value.slice(0, -1)}ies`;
  }
  if (value.endsWith('x') || value.endsWith('ch') || value.endsWith('sh') || value.endsWith('z')) {
    return `${value}es`;
  }
  return `${value}s`;
};

const PRODUCT_COLLECTION_KEYS = new Set<string>([
  'products',
  'product_drafts',
  'product_categories',
  'product_tags',
  'catalogs',
  'image_files',
  'product_listings',
  'product_ai_jobs',
]);

const isProductCollection = (collection: string): boolean => {
  if (!collection) return false;
  const trimmed = collection.trim();
  if (!trimmed) return false;
  const lower = normalizeCollectionKey(trimmed);
  if (PRODUCT_COLLECTION_KEYS.has(lower)) return true;
  const snake = toSnakeCase(trimmed);
  if (PRODUCT_COLLECTION_KEYS.has(snake)) return true;
  if (PRODUCT_COLLECTION_KEYS.has(pluralize(snake))) return true;
  if (PRODUCT_COLLECTION_KEYS.has(pluralize(lower))) return true;
  return false;
};

const buildSchemaPlaceholderContext = (schema: SchemaData | null): Record<string, string> => {
  const context: Record<string, string> = {};
  const collections = normalizeSchemaCollections(schema);
  if (collections.length === 0) return context;
  const isMulti = schema?.provider === 'multi';
  collections.forEach((collection: CollectionSchema) => {
    const schemaText = formatCollectionSchema(collection.name, collection.fields ?? []);
    const displayName = toTitleCase(singularize(collection.name));
    if (isMulti && collection.provider) {
      const labeledName = `${collection.name} (${collection.provider})`;
      const labeledDisplay = `${displayName} (${collection.provider})`;
      const nameSet = new Set<string>([labeledName, labeledDisplay]);
      nameSet.forEach((name: string) => {
        context[`Collection: ${name}`] = schemaText;
      });
    } else {
      const nameSet = new Set<string>([collection.name, displayName]);
      nameSet.forEach((name: string) => {
        context[`Collection: ${name}`] = schemaText;
      });
    }
  });
  return context;
};

type SchemaConfig = {
  provider?: 'auto' | 'mongodb' | 'prisma' | 'all';
  mode?: 'all' | 'selected';
  collections?: string[];
  includeFields?: boolean;
};

export function DatabaseNodeConfigSection(): React.JSX.Element | null {
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
    dbNodePresets: _dbNodePresets,
    setDbNodePresets: _setDbNodePresets,
    saveDbNodePresets: _saveDbNodePresets,
    toast,
  } = useAiPathConfig();
  const [queryValidatorEnabled, setQueryValidatorEnabled] = React.useState(false);
  const [queryFormatterEnabled, setQueryFormatterEnabled] = React.useState(true);
  const [selectedQueryPresetId, setSelectedQueryPresetId] = React.useState<string>('');
  const [queryPresetName, setQueryPresetName] = React.useState<string>('');
  const [saveQueryPresetModalOpen, setSaveQueryPresetModalOpen] = React.useState(false);
  const [newQueryPresetName, setNewQueryPresetName] = React.useState<string>('');
  const [databaseTab, setDatabaseTab] = React.useState<'settings' | 'constructor' | 'presets'>('settings');
  const [pendingAiQuery, setPendingAiQuery] = React.useState<string>('');
  const [aiQueries, setAiQueries] = React.useState<AiQuery[]>([]);
  const [selectedAiQueryId, setSelectedAiQueryId] = React.useState<string>('');
  const [testQueryResult, setTestQueryResult] = React.useState<string>('');
  const [testQueryLoading, setTestQueryLoading] = React.useState(false);
  const queryTemplateRef = React.useRef<HTMLTextAreaElement | null>(null);
  const aiPromptRef = React.useRef<HTMLTextAreaElement | null>(null);
  const lastInjectedResponseRef = React.useRef<string>('');
  const lastAutoFetchedRef = React.useRef<string>('');
  const settingsQuery = useSettingsMap();
  const rawPromptEngineSettings = settingsQuery.data?.get(PROMPT_ENGINE_SETTINGS_KEY) ?? null;
  const promptEngineSettings = React.useMemo(
    () => parsePromptEngineSettings(rawPromptEngineSettings),
    [rawPromptEngineSettings]
  );
  const validationPaletteRules = React.useMemo<ValidationPaletteRule[]>(() => {
    const rules: PromptValidationRule[] = [
      ...(promptEngineSettings.promptValidation.rules ?? []),
      ...(promptEngineSettings.promptValidation.learnedRules ?? []),
    ];
    return rules
      .filter((rule: PromptValidationRule) => rule.kind === 'regex' && rule.enabled)
      .map((rule: PromptValidationRule) => {
        if (rule.kind !== 'regex') throw new Error('Expected regex rule');
        return {
          id: rule.id,
          title: rule.title,
          severity: rule.severity,
          message: rule.message,
          pattern: rule.pattern,
          flags: rule.flags,
        };
      });
  }, [promptEngineSettings]);
  const selectedNodeId = selectedNode?.id ?? '';
  const isDatabaseSelected = selectedNode?.type === 'database';
  const incomingEdges = React.useMemo(
    (): Edge[] => edges.filter((edge: Edge) => edge.to === selectedNodeId),
    [edges, selectedNodeId]
  );
  const schemaConnection = React.useMemo(() => {
    if (!isDatabaseSelected || !selectedNodeId) {
      return { hasSchemaConnection: false, schemaConfig: null as SchemaConfig | null };
    }
    const schemaEdge = edges.find((edge: Edge) => {
      if (edge.to !== selectedNodeId) return false;
      const fromNode = nodes.find((node: AiNode) => node.id === edge.from);
      return fromNode?.type === 'db_schema';
    });
    if (!schemaEdge) {
      return { hasSchemaConnection: false, schemaConfig: null as SchemaConfig | null };
    }
    const schemaNode = nodes.find((node: AiNode) => node.id === schemaEdge.from);
    return {
      hasSchemaConnection: Boolean(schemaNode?.type === 'db_schema'),
      schemaConfig: (schemaNode?.config?.db_schema ?? null) as SchemaConfig | null,
    };
  }, [edges, nodes, isDatabaseSelected, selectedNodeId]);

  const schemaProvider = schemaConnection.schemaConfig?.provider ?? 'auto';

  const schemaQuery = useQuery({
    queryKey: ['db-schema', schemaProvider],
    queryFn: async (): Promise<SchemaData> => {
      const result = await dbApi.schema({ provider: schemaProvider });
      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch schema.');
      }
      return result.data as SchemaData;
    },
    enabled: schemaConnection.hasSchemaConnection && isDatabaseSelected,
  });

  const fetchedDbSchema = React.useMemo((): SchemaData | null => {
    if (!schemaConnection.hasSchemaConnection || !schemaQuery.data) return null;
    return applySchemaSelection(schemaQuery.data, schemaConnection.schemaConfig);
  }, [schemaConnection.hasSchemaConnection, schemaConnection.schemaConfig, schemaQuery.data]);
  const schemaLoading = schemaQuery.isFetching;

  const dbActionMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>): Promise<unknown> => {
      const result = await dbApi.action<Record<string, unknown>>(payload as Parameters<typeof dbApi.action>[0]);
      if (!result.ok) {
        throw new Error(result.error || 'Query failed');
      }
      return result.data;
    },
  });

  // Auto-intercept incoming signal data and fetch sample for Field Mapping
  React.useEffect(() => {
    if (!isDatabaseSelected || !selectedNodeId) return;

    const runtimeInputs = (runtimeState.inputs[selectedNodeId] ?? {}) as Record<string, unknown>;

    // Extract potential entityId/productId from various sources
    let detectedId: string | undefined;
    let detectedCollection: string | undefined;

    // Check direct inputs
    if (typeof runtimeInputs['entityId'] === 'string' && (runtimeInputs['entityId']).trim()) {
      detectedId = (runtimeInputs['entityId']).trim();
    } else if (typeof runtimeInputs['productId'] === 'string' && (runtimeInputs['productId']).trim()) {
      detectedId = (runtimeInputs['productId']).trim();
    } else if (typeof runtimeInputs['value'] === 'string' && (runtimeInputs['value']).trim()) {
      detectedId = (runtimeInputs['value']).trim();
    }

    // Check context input for nested entityId/entityType
    const contextInput = runtimeInputs['context'];
    if (contextInput && typeof contextInput === 'object') {
      const ctx = contextInput as Record<string, unknown>;
      if (!detectedId && typeof ctx['entityId'] === 'string' && (ctx['entityId']).trim()) {
        detectedId = (ctx['entityId']).trim();
      }
      if (typeof ctx['entityType'] === 'string' && (ctx['entityType']).trim()) {
        detectedCollection = (ctx['entityType']).trim();
      }
    }

    // Check for collection from inputs
    if (!detectedCollection) {
      if (typeof runtimeInputs['entityType'] === 'string' && (runtimeInputs['entityType']).trim()) {
        detectedCollection = (runtimeInputs['entityType']).trim();
      } else if (typeof runtimeInputs['collection'] === 'string' && (runtimeInputs['collection']).trim()) {
        detectedCollection = (runtimeInputs['collection']).trim();
      }
    }

    // Use the configured collection from queryConfig if not detected
    const persistedDatabase = selectedNode?.config?.database;
    const queryCollection = persistedDatabase?.query?.collection ?? 'products';
    const finalCollection = detectedCollection || queryCollection;

    // Only auto-fetch if we have an ID and it's different from last fetch
    if (!detectedId) return;

    const fetchKey = `${finalCollection}:${detectedId}`;
    if (fetchKey === lastAutoFetchedRef.current) return;

    // Check if we already have a sample for this node
    const existingSample = updaterSamples[selectedNodeId];
    if (existingSample?.entityId === detectedId && existingSample?.json?.trim()) return;

    lastAutoFetchedRef.current = fetchKey;

    // Auto-fetch the sample
    void handleFetchUpdaterSample(selectedNodeId, finalCollection, detectedId, {
      notify: false,
    });
  }, [selectedNodeId, isDatabaseSelected, selectedNode?.config?.database, runtimeState, updaterSamples, handleFetchUpdaterSample]);

  React.useEffect(() => {
    setSelectedQueryPresetId('');
    setQueryPresetName('');
    setDatabaseTab('settings');
    setQueryValidatorEnabled(false);
    setPendingAiQuery('');
    lastInjectedResponseRef.current = '';
  }, [selectedNodeId]);

  React.useEffect(() => {
    if (!isDatabaseSelected || !selectedNodeId) return;
    const callbackValue = (runtimeState.inputs[selectedNodeId] as Record<string, unknown> | undefined)?.[ 'queryCallback' ]
      ?? (runtimeState.outputs[selectedNodeId] as Record<string, unknown> | undefined)?.[ 'queryCallback' ];
    if (typeof callbackValue === 'string' && callbackValue.trim().length > 0) {
      if (callbackValue !== lastInjectedResponseRef.current) {
        lastInjectedResponseRef.current = callbackValue;
        setPendingAiQuery(callbackValue);
        setDatabaseTab('constructor'); // Auto-switch to constructor tab to show pending query
        toast('AI query ready for review.', { variant: 'success' });
      }
    }
  }, [selectedNodeId, isDatabaseSelected, runtimeState, toast]);

  React.useEffect(() => {
    if (!selectedQueryPresetId) return;
    const preset = dbQueryPresets.find((item: DbQueryPreset) => item.id === selectedQueryPresetId);
    if (preset) {
      setQueryPresetName(preset.name);
    }
  }, [selectedQueryPresetId, dbQueryPresets]);

  if (!selectedNode || selectedNode.type !== 'database') return null;

  const defaultQuery: DbQueryConfig = {
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
  const persistedDatabase = selectedNode.config?.database;
  const inferredUseMongoActions =
                  persistedDatabase?.useMongoActions ??
                  Boolean(persistedDatabase?.actionCategory || persistedDatabase?.action);
  const defaultMappings: UpdaterMapping[] = [
    {
      targetPath: 'content_en',
      sourcePort: selectedNode.inputs.includes('result') ? 'result' : 'content_en',
    },
  ];
  const databaseConfig: DatabaseConfig = {
    operation: persistedDatabase?.operation ?? 'query',
    entityType: persistedDatabase?.entityType ?? 'product',
    idField: persistedDatabase?.idField ?? 'entityId',
    mode: persistedDatabase?.mode ?? 'replace',
    updateStrategy: persistedDatabase?.updateStrategy ?? 'one',
    useMongoActions: inferredUseMongoActions,
    ...(persistedDatabase?.actionCategory ? { actionCategory: persistedDatabase.actionCategory } : {}),
    ...(persistedDatabase?.action ? { action: persistedDatabase.action } : {}),
    distinctField: persistedDatabase?.distinctField ?? '',
    updateTemplate: persistedDatabase?.updateTemplate ?? '',
    mappings:
                    persistedDatabase?.mappings && persistedDatabase.mappings.length > 0
                      ? persistedDatabase.mappings
                      : defaultMappings,
    query: {
      ...defaultQuery,
      ...(persistedDatabase?.query ?? {}),
    } as DbQueryConfig,
    writeSource: persistedDatabase?.writeSource ?? 'bundle',
    writeSourcePath: persistedDatabase?.writeSourcePath ?? '',
    dryRun: persistedDatabase?.dryRun ?? false,
    ...(persistedDatabase?.presetId
      ? { presetId: persistedDatabase.presetId }
      : {}),
    skipEmpty: persistedDatabase?.skipEmpty ?? false,
    trimStrings: persistedDatabase?.trimStrings ?? false,
    aiPrompt: persistedDatabase?.aiPrompt ?? '',
    validationRuleIds: persistedDatabase?.validationRuleIds ?? [],
    schemaSnapshot: persistedDatabase?.schemaSnapshot,
  };
  const selectedValidationRuleIds = databaseConfig.validationRuleIds ?? [];
  const selectedValidationRules = selectedValidationRuleIds.length
    ? validationPaletteRules.filter((rule: ValidationPaletteRule) => selectedValidationRuleIds.includes(rule.id))
    : [];
  const handleToggleValidationRule = (ruleId: string): void => {
    const nextIds = selectedValidationRuleIds.includes(ruleId)
      ? selectedValidationRuleIds.filter((id: string) => id !== ruleId)
      : [...selectedValidationRuleIds, ruleId];
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        validationRuleIds: nextIds,
      },
    });
  };
  const handleClearValidationRules = (): void => {
    if (selectedValidationRuleIds.length === 0) return;
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        validationRuleIds: [],
      },
    });
  };
  const lastTemplateWithPlaceholdersRef = React.useRef<string>('');
  const lastTemplateNodeIdRef = React.useRef<string>('');
  const handleSelectAllValidationRules = (): void => {
    if (validationPaletteRules.length === 0) return;
    const allIds = validationPaletteRules.map((rule: ValidationPaletteRule) => rule.id);
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        validationRuleIds: allIds,
      },
    });
  };
  const deriveCategoryFromOperation = (op: string): DatabaseActionCategory => {
    if (op === 'insert') return 'create';
    if (op === 'update') return 'update';
    if (op === 'delete') return 'delete';
    return 'read';
  };
  const queryConfig = databaseConfig.query ?? defaultQuery;
  React.useEffect((): void => {
    if (lastTemplateNodeIdRef.current !== selectedNode.id) {
      lastTemplateNodeIdRef.current = selectedNode.id;
      lastTemplateWithPlaceholdersRef.current = '';
    }
  }, [selectedNode.id]);
  React.useEffect((): void => {
    const template = queryConfig.queryTemplate ?? '';
    if (template.includes('{{')) {
      lastTemplateWithPlaceholdersRef.current = template;
    }
  }, [queryConfig.queryTemplate]);
  const schemaSnapshot = databaseConfig.schemaSnapshot ?? null;
  const effectiveSchema: SchemaData | null = fetchedDbSchema ?? schemaSnapshot;
  const schemaMatrix = effectiveSchema ?? null;
  const runDry = databaseConfig.dryRun ?? false;
  const appDbProvider =
    settingsQuery.data?.get('app_db_provider') === 'mongodb' ? 'mongodb' : 'prisma';
  const productDbProvider =
    settingsQuery.data?.get(PRODUCT_DB_PROVIDER_SETTING_KEY) === 'prisma'
      ? 'prisma'
      : 'mongodb';
  const resolvedProvider = resolveDbActionProvider(queryConfig.provider, appDbProvider);
  const isProductCollectionQuery = isProductCollection(queryConfig.collection ?? '');
  const providerWarning =
    appDbProvider !== resolvedProvider
      ? `App database is ${appDbProvider.toUpperCase()}, but this node is pinned to ${resolvedProvider.toUpperCase()}.`
      : null;
  const productProviderWarning =
    isProductCollectionQuery && productDbProvider !== appDbProvider
      ? `Product data provider is set to ${productDbProvider.toUpperCase()}, so Products/Categories/Tags screens will read from ${productDbProvider.toUpperCase()} even if this node queries ${appDbProvider.toUpperCase()}.`
      : null;
  React.useEffect((): void => {
    const currentTemplate = queryConfig.queryTemplate ?? '';
    if (!currentTemplate || currentTemplate.includes('{{')) return;
    const lastTemplate = lastTemplateWithPlaceholdersRef.current;
    if (!lastTemplate?.includes('{{')) return;
    const runtimeInputs = (runtimeState.inputs[selectedNode.id] ?? {}) as Record<string, unknown>;
    const runtimeOutputs = (runtimeState.outputs[selectedNode.id] ?? {}) as Record<string, unknown>;
    const rawValue =
      runtimeInputs['value'] ??
      runtimeInputs['jobId'] ??
      runtimeOutputs['value'] ??
      runtimeOutputs['jobId'];
    const currentValue = Array.isArray(rawValue) ? (rawValue as unknown[])[0] : rawValue;
    const templateContext = { ...runtimeOutputs, ...runtimeInputs };
    const rendered = renderTemplate(
      lastTemplate,
      templateContext as Record<string, unknown>,
      currentValue ?? ''
    );
    const parsedCurrent = safeParseJson(currentTemplate).value;
    const parsedRendered = safeParseJson(rendered).value;
    const normalizedCurrent = parsedCurrent ? JSON.stringify(parsedCurrent) : null;
    const normalizedRendered = parsedRendered ? JSON.stringify(parsedRendered) : null;
    const matchesRendered =
      normalizedCurrent && normalizedRendered
        ? normalizedCurrent === normalizedRendered
        : rendered.trim() === currentTemplate.trim();
    if (!matchesRendered) return;
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        query: {
          ...queryConfig,
          mode: 'custom',
          queryTemplate: lastTemplate,
        },
      },
    });
  }, [databaseConfig, queryConfig, runtimeState, selectedNode.id, updateSelectedNodeConfig]);
  const schemaSource: 'connected' | 'snapshot' | 'none' = schemaConnection.hasSchemaConnection
    ? 'connected'
    : schemaSnapshot
      ? 'snapshot'
      : 'none';
  const schemaSyncMutation = useMutation({
    mutationFn: async (
      provider: 'auto' | 'mongodb' | 'prisma' | 'all'
    ): Promise<SchemaData> => {
      const result = await dbApi.schema({ provider });
      if (!result.ok) {
        throw new Error(result.error || 'Failed to fetch schema.');
      }
      return result.data as SchemaData;
    },
    onSuccess: (data: SchemaData): void => {
      const filtered = applySchemaSelection(data, schemaConnection.schemaConfig);
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          schemaSnapshot: {
            ...filtered,
            syncedAt: new Date().toISOString(),
          },
        },
      });
      toast('Schema collections synced.', { variant: 'success' });
    },
    onError: (error: unknown): void => {
      toast(
        error instanceof Error ? error.message : 'Failed to sync schema collections.',
        { variant: 'error' }
      );
    },
  });
  const schemaSyncing = schemaSyncMutation.isPending;
  const handleSyncSchema = (): void => {
    const provider = schemaConnection.schemaConfig?.provider ?? queryConfig.provider ?? 'auto';
    schemaSyncMutation.mutate(provider);
  };
  const derivedCategory = deriveCategoryFromOperation(databaseConfig.operation ?? 'query');
  const requestedActionCategory =
    databaseConfig.useMongoActions
      ? databaseConfig.actionCategory ?? derivedCategory
      : derivedCategory;
  const actionCategory = isProviderActionCategorySupported(resolvedProvider, requestedActionCategory)
    ? requestedActionCategory
    : 'read';
  const action = resolveProviderAction(
    resolvedProvider,
    actionCategory,
    databaseConfig.useMongoActions ? databaseConfig.action : null,
    queryConfig.single ?? false,
  );
  const providerActionWarning =
    databaseConfig.useMongoActions && databaseConfig.action
      ? getUnsupportedProviderActionMessage(resolvedProvider, databaseConfig.action)
      : null;
  const providerActionLabel = getProviderSpecificActionLabel(resolvedProvider, action);
  const operation =
                  actionCategory === 'create'
                    ? 'insert'
                    : actionCategory === 'update'
                      ? 'update'
                      : actionCategory === 'delete'
                        ? 'delete'
                        : 'query';
  React.useEffect((): void => {
    if (!databaseConfig.useMongoActions) return;
    const hasActionCategoryChanged = databaseConfig.actionCategory !== actionCategory;
    const hasActionChanged = databaseConfig.action !== action;
    if (!hasActionCategoryChanged && !hasActionChanged) return;
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        actionCategory,
        action,
      },
    });
  }, [
    action,
    actionCategory,
    databaseConfig,
    updateSelectedNodeConfig,
  ]);
  const incomingPorts = Array.from(
    new Set(
      incomingEdges
        .map((edge: Edge) => edge.toPort)
        .filter((port: string | undefined): port is string => Boolean(port))
    )
  );
  const availablePorts = incomingPorts.length
    ? incomingPorts
    : selectedNode.inputs;
  const bundleKeys = new Set<string>();
  incomingEdges.forEach((edge: Edge) => {
    if (edge.toPort !== 'bundle') return;
    const fromNode = nodes.find((node: AiNode) => node.id === edge.from);
    if (!fromNode) return;
    if (fromNode.type === 'parser') {
      const mappings =
                      fromNode.config?.parser?.mappings ??
                      createParserMappings(fromNode.outputs);
      Object.keys(mappings).forEach((key: string) => {
        const trimmed = key.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
      return;
    }
    if (fromNode.type === 'bundle') {
      fromNode.inputs.forEach((port: string) => {
        const trimmed = port.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
    }
    if (fromNode.type === 'mapper') {
      const mapperOutputs =
                      fromNode.config?.mapper?.outputs ?? fromNode.outputs;
      mapperOutputs.forEach((output: string) => {
        const trimmed = output.trim();
        if (trimmed) bundleKeys.add(trimmed);
      });
    }
  });

  const mappings =
                  databaseConfig.mappings && databaseConfig.mappings.length > 0
                    ? databaseConfig.mappings
                    : defaultMappings;

  // Build connected placeholders from actual inputs
  const connectedPlaceholders: string[] = [];
  const placeholderSet = new Set<string>();
  const addPlaceholder = (placeholder: string): void => {
    const trimmed = placeholder.trim();
    if (!trimmed || placeholderSet.has(trimmed)) return;
    placeholderSet.add(trimmed);
    connectedPlaceholders.push(trimmed);
  };
  // Add direct port connections
  incomingPorts.forEach((port: string) => {
    if (port === 'bundle') {
      // Bundle keys are handled separately below
      return;
    }
    if (port === 'result' && operation !== 'update') {
      // result is not a valid placeholder for database queries
      return;
    }
    addPlaceholder(`{{${port}}}`);
  });
  // Add bundle keys as {{bundle.keyName}}
  bundleKeys.forEach((key: string) => {
    addPlaceholder(`{{bundle.${key}}}`);
  });
  // Also add context keys if context is connected
  if (incomingPorts.includes('context')) {
    incomingEdges.forEach((edge: Edge) => {
      if (edge.toPort !== 'context') return;
      const fromNode = nodes.find((node: AiNode) => node.id === edge.from);
      if (!fromNode) return;
      if (fromNode.type === 'context') {
        addPlaceholder('{{context.entityId}}');
        addPlaceholder('{{context.entityType}}');
      }
    });
  }
  // Add meta keys if meta is connected
  if (incomingPorts.includes('meta')) {
    addPlaceholder('{{meta.pathId}}');
    addPlaceholder('{{meta.trigger}}');
  }
  // Add placeholders derived from mappings only when they map to a connected port
  mappings.forEach((mapping: UpdaterMapping) => {
    const sourcePort = mapping.sourcePort?.trim();
    const sourcePath = mapping.sourcePath?.trim();
    if (!sourcePort || !incomingPorts.includes(sourcePort)) return;
    if (sourcePort === 'result' && operation !== 'update') return;

    if (sourcePath) {
      const prefix = sourcePort === 'bundle' ? 'bundle' : sourcePort;
      addPlaceholder(`{{${prefix}.${sourcePath}}}`);
      return;
    }

    if (sourcePort !== 'bundle') {
      addPlaceholder(`{{${sourcePort}}}`);
    }
  });
  const sampleState =
                  updaterSamples[selectedNode.id] ?? {
                    entityType: databaseConfig.entityType ?? 'product',
                    entityId: '',
                    json: '',
                    depth: 2,
                    includeContainers: false,
                  };
  const parsedSample = safeParseJson(sampleState.json);
  const sampleValue = parsedSample.value;
  const sampleEntries = sampleValue
    ? extractJsonPathEntries(sampleValue, sampleState.depth ?? 2)
    : [];
  const targetPaths = sampleEntries
    .filter((entry: { type: string }) => {
      if (sampleState.includeContainers) return true;
      return entry.type === 'value' || entry.type === 'array';
    })
    .map((entry: { path: string }) => entry.path);
  const targetPathOptions = targetPaths.map((path: string) => ({
    label: path,
    value: path,
  }));
  const uniqueTargetPathOptions = Array.from(
    new Map(targetPathOptions.map((option: { label: string; value: string }) => [option.value, option])).values()
  );
  const findMatchingTargetPath = (port: string): string => {
    const normalized = port.toLowerCase();
    const endsWith = targetPaths.find((path: string) =>
      path.toLowerCase().endsWith(normalized)
    );
    if (endsWith) return endsWith;
    const includes = targetPaths.find((path: string) =>
      path.toLowerCase().includes(normalized)
    );
    return includes ?? port;
  };
  const updateMappings = (nextMappings: UpdaterMapping[]): void => {
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        mappings: nextMappings,
      },
    });
  };
  const updateMapping = (index: number, patch: Partial<UpdaterMapping>): void => {
    const nextMappings = mappings.map((mapping: UpdaterMapping, idx: number) =>
      idx === index ? { ...mapping, ...patch } : mapping
    );
    updateMappings(nextMappings);
  };
  const addMapping = (): void => {
    updateMappings([
      ...mappings,
      {
        targetPath: '',
        sourcePort: availablePorts[0] ?? 'result',
        sourcePath: '',
      },
    ]);
  };
  const removeMapping = (index: number): void => {
    if (mappings.length <= 1) return;
    updateMappings(mappings.filter((_: UpdaterMapping, idx: number) => idx !== index));
  };
  const mapInputsToTargets = (): void => {
    const nextMappings: UpdaterMapping[] = [];
    availablePorts.forEach((port: string) => {
      if (port === databaseConfig.idField) return;
      if (port === 'bundle') {
        if (bundleKeys.size === 0) return;
        Array.from(bundleKeys).forEach((key: string) => {
          nextMappings.push({
            targetPath: key,
            sourcePort: 'bundle',
            sourcePath: key,
          });
        });
        return;
      }
      nextMappings.push({
        targetPath: findMatchingTargetPath(port),
        sourcePort: port,
      });
    });
    if (nextMappings.length > 0) {
      updateMappings(nextMappings);
    }
  };
  const presetOptions: DatabasePresetOption[] = [
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
  ];
  const applyDatabasePreset = (presetId: string): void => {
    if (presetId === 'custom') {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          presetId,
        },
      });
      return;
    }

    if (presetId === 'query_by_id') {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          presetId,
          useMongoActions: true,
          actionCategory: 'read',
          action: 'findOne',
          operation: 'query',
          entityType: 'product',
          query: {
            ...defaultQuery,
            collection: 'products',
            mode: 'preset',
            preset: 'by_id',
            idType: 'string',
            single: true,
          },
        },
      });
      return;
    }

    if (presetId === 'query_recent_products') {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          presetId,
          useMongoActions: true,
          actionCategory: 'read',
          action: 'find',
          operation: 'query',
          entityType: 'product',
          query: {
            ...defaultQuery,
            collection: 'products',
            mode: 'custom',
            queryTemplate: '{}',
            sort: '{\n  "createdAt": -1\n}',
            limit: 10,
            single: false,
          },
        },
      });
      return;
    }

    if (presetId === 'query_name_contains') {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          presetId,
          useMongoActions: true,
          actionCategory: 'read',
          action: 'find',
          operation: 'query',
          entityType: 'product',
          query: {
            ...defaultQuery,
            collection: 'products',
            mode: 'custom',
            queryTemplate:
                            '{\n  "name": { "$regex": "{{value}}", "$options": "i" }\n}',
            single: false,
          },
        },
      });
      return;
    }

    if (presetId === 'update_content_en_from_result') {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          presetId,
          useMongoActions: true,
          actionCategory: 'update',
          action: 'updateOne',
          operation: 'update',
          entityType: 'product',
          idField: 'entityId',
          mode: 'replace',
          updateTemplate: '',
          mappings: [
            {
              targetPath: 'content_en',
              sourcePort: selectedNode.inputs.includes('result')
                ? 'result'
                : 'content_en',
              sourcePath: '',
            },
          ],
          query: {
            ...defaultQuery,
            collection: 'products',
            mode: 'custom',
            queryTemplate: '{\n  "_id": "{{value}}"\n}',
            single: true,
          },
          writeSource: databaseConfig.writeSource ?? 'bundle',
          writeSourcePath: databaseConfig.writeSourcePath ?? '',
        },
      });
      return;
    }

    if (presetId === 'delete_product_by_entity') {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          presetId,
          useMongoActions: true,
          actionCategory: 'delete',
          action: 'deleteOne',
          operation: 'delete',
          entityType: 'product',
          idField: 'entityId',
          query: {
            ...defaultQuery,
            collection: 'products',
            mode: 'custom',
            queryTemplate: '{\n  "_id": "{{value}}"\n}',
            single: true,
          },
        },
      });
      return;
    }

    if (presetId === 'insert_from_bundle') {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          presetId,
          useMongoActions: true,
          actionCategory: 'create',
          action: 'insertOne',
          operation: 'insert',
          entityType: 'product',
          query: {
            ...defaultQuery,
            collection: 'products',
            mode: 'custom',
            queryTemplate: '',
          },
          writeSource: 'bundle',
          writeSourcePath: '',
        },
      });
    }
  };
  const schemaCollectionOptions = React.useMemo(() => {
    if (!effectiveSchema?.collections?.length) return [];
    let collections = normalizeSchemaCollections(effectiveSchema);
    if (effectiveSchema.provider === 'multi') {
      const preferredProvider = resolvedProvider;
      collections = collections.filter((collection) => collection.provider === preferredProvider);
    }
    return collections
      .map((collection) => ({
        value: collection.name,
        label: formatCollectionLabel(collection, effectiveSchema.provider === 'multi'),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [effectiveSchema, resolvedProvider]);
  const useSchemaCollections = schemaSource !== 'none';
  const collectionOptions = useSchemaCollections ? schemaCollectionOptions : DB_COLLECTION_OPTIONS;
  const collectionOption = collectionOptions.some(
    (option: { value: string }) => option.value === queryConfig.collection
  )
    ? queryConfig.collection
    : 'custom';
  const normalizePresetValue = (value?: string): string => (value ?? '').trim();
  const isPrismaProvider = resolvedProvider === 'prisma';
  const toPrismaSortPresetValue = (value: string): string => {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const next: Record<string, 'asc' | 'desc'> = {};
      Object.entries(parsed).forEach(([key, val]) => {
        if (val === -1 || val === 'desc') next[key] = 'desc';
        if (val === 1 || val === 'asc') next[key] = 'asc';
      });
      return JSON.stringify(next);
    } catch {
      return value;
    }
  };
  const toPrismaProjectionPresetValue = (value: string): string => {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      const next: Record<string, boolean> = {};
      Object.entries(parsed).forEach(([key, val]) => {
        if (val === 1 || val === true) next[key] = true;
      });
      return JSON.stringify(next);
    } catch {
      return value;
    }
  };
  const sortPresets = isPrismaProvider
    ? SORT_PRESETS.map((preset) => ({
      ...preset,
      value: toPrismaSortPresetValue(preset.value),
    }))
    : SORT_PRESETS;
  const projectionPresets = isPrismaProvider
    ? PROJECTION_PRESETS.map((preset) => ({
      ...preset,
      value: toPrismaProjectionPresetValue(preset.value),
    }))
    : PROJECTION_PRESETS;
  const resolvedSortPresetId = sortPresets.some(
    (preset: { id: string }) => preset.id === queryConfig.sortPresetId
  )
    ? queryConfig.sortPresetId
    : undefined;
  const resolvedProjectionPresetId = projectionPresets.some(
    (preset: { id: string }) => preset.id === queryConfig.projectionPresetId
  )
    ? queryConfig.projectionPresetId
    : undefined;
  const sortPresetId =
                  resolvedSortPresetId ??
                  sortPresets.find(
                    (preset: { value: string }) =>
                      normalizePresetValue(preset.value) ===
                      normalizePresetValue(queryConfig.sort)
                  )?.id ??
                  'custom';
  const projectionPresetId =
                  resolvedProjectionPresetId ??
                  projectionPresets.find(
                    (preset: { value: string }) =>
                      normalizePresetValue(preset.value) ===
                      normalizePresetValue(queryConfig.projection)
                  )?.id ??
                  'custom';
  const presetQueryTemplate = buildPresetQueryTemplate(queryConfig);
  const rawQueryTemplate = queryConfig.queryTemplate ?? '';
  const queryTemplateValue = rawQueryTemplate.trim().length
    ? rawQueryTemplate
    : queryConfig.mode === 'preset'
      ? presetQueryTemplate
      : rawQueryTemplate;
  const updateQueryConfig = (
    patch: Partial<DbQueryConfig>,
    options?: { syncPreset?: boolean }
  ): void => {
    const nextQuery = { ...queryConfig, ...patch };
    if (options?.syncPreset && nextQuery.mode === 'preset') {
      nextQuery.queryTemplate = buildPresetQueryTemplate(nextQuery);
    }
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        query: nextQuery,
      },
    });
  };
  const handleSaveQueryPreset = async (
    overrideName?: string,
    options?: { forceNew?: boolean }
  ): Promise<void> => {
    const previousPresets = dbQueryPresets;
    const previousSelectedPresetId = selectedQueryPresetId;
    const previousPresetName = queryPresetName;

    const name = (overrideName ?? queryPresetName).trim();
    const filterTemplate = queryTemplateValue.trim();
    const updateTemplate = (databaseConfig.updateTemplate ?? '').trim();
    const requiredTemplate = isUpdateAction ? updateTemplate : filterTemplate;
    if (!name) {
      toast('Query preset name is required.', { variant: 'error' });
      return;
    }
    if (!requiredTemplate) {
      toast(
        isUpdateAction ? 'Update document is empty.' : 'Query template is empty.',
        { variant: 'error' }
      );
      return;
    }
    setQueryPresetName(name);
    const now = new Date().toISOString();
    let nextPresets = [...dbQueryPresets];
    const existingIndex = options?.forceNew
      ? -1
      : nextPresets.findIndex(
        (preset: DbQueryPreset) => preset.id === selectedQueryPresetId
      );
    if (existingIndex >= 0) {
      const existingPreset = nextPresets[existingIndex]!;
      nextPresets[existingIndex] = {
        ...existingPreset,
        name,
        queryTemplate: filterTemplate || existingPreset.queryTemplate,
        updateTemplate,
        updatedAt: now,
      };
    } else {
      const newPreset: DbQueryPreset = {
        id: createPresetId(),
        name,
        queryTemplate: filterTemplate || '{\n  "_id": "{{value}}"\n}',
        updateTemplate,
        createdAt: now,
        updatedAt: now,
      };
      nextPresets = [...nextPresets, newPreset];
      setSelectedQueryPresetId(newPreset.id);
    }
    setDbQueryPresets(nextPresets);
    try {
      await saveDbQueryPresets(nextPresets);
      toast('Query preset saved.', { variant: 'success' });
    } catch {
      setDbQueryPresets(previousPresets);
      setSelectedQueryPresetId(previousSelectedPresetId);
      setQueryPresetName(previousPresetName);
    }
  };
  const handleRenameQueryPreset = async (presetId: string, nextName: string): Promise<void> => {
    const trimmed = nextName.trim();
    if (!trimmed) {
      toast('Query preset name is required.', { variant: 'error' });
      return;
    }
    const target = dbQueryPresets.find((preset: DbQueryPreset) => preset.id === presetId);
    if (!target) return;
    if (target.name.trim() === trimmed) return;
    const now = new Date().toISOString();
    const nextPresets = dbQueryPresets.map((preset: DbQueryPreset) =>
      preset.id === presetId
        ? { ...preset, name: trimmed, updatedAt: now }
        : preset
    );
    setDbQueryPresets(nextPresets);
    const previousPresetName = queryPresetName;
    try {
      await saveDbQueryPresets(nextPresets);
      if (selectedQueryPresetId === presetId) {
        setQueryPresetName(trimmed);
      }
      toast('Query preset renamed.', { variant: 'success' });
    } catch {
      setDbQueryPresets(dbQueryPresets);
      setQueryPresetName(previousPresetName);
    }
  };
  const handleDeleteQueryPresetById = async (presetId: string): Promise<void> => {
    const target = dbQueryPresets.find((preset: DbQueryPreset) => preset.id === presetId);
    if (!target) return;
    const confirmed = window.confirm(
      `Delete query preset "${target.name}"?`
    );
    if (!confirmed) return;
    const previousPresets = dbQueryPresets;
    const previousSelectedPresetId = selectedQueryPresetId;
    const previousPresetName = queryPresetName;
    const nextPresets = dbQueryPresets.filter(
      (preset: DbQueryPreset) => preset.id !== presetId
    );
    setDbQueryPresets(nextPresets);
    if (selectedQueryPresetId === presetId) {
      setSelectedQueryPresetId('');
      setQueryPresetName('');
    }
    try {
      await saveDbQueryPresets(nextPresets);
      toast('Query preset deleted.', { variant: 'success' });
    } catch {
      setDbQueryPresets(previousPresets);
      setSelectedQueryPresetId(previousSelectedPresetId);
      setQueryPresetName(previousPresetName);
    }
  };
  const closeSaveQueryPresetModal = (): void => {
    setSaveQueryPresetModalOpen(false);
    setNewQueryPresetName('');
  };
  const handleSaveQueryPresetFromModal = async (): Promise<void> => {
    const name = newQueryPresetName.trim();
    const filterTemplate = queryTemplateValue.trim();
    const updateTemplate = (databaseConfig.updateTemplate ?? '').trim();
    const requiredTemplate = isUpdateAction ? updateTemplate : filterTemplate;
    if (!name) {
      toast('Query preset name is required.', { variant: 'error' });
      return;
    }
    if (!requiredTemplate) {
      toast(
        isUpdateAction ? 'Update document is empty.' : 'Query template is empty.',
        { variant: 'error' }
      );
      return;
    }
    await handleSaveQueryPreset(name, { forceNew: true });
    closeSaveQueryPresetModal();
  };
  const openSaveQueryPresetModal = (): void => {
    setNewQueryPresetName('');
    setSaveQueryPresetModalOpen(true);
  };
  const actionCategoryOptions = getProviderActionCategoryOptions(resolvedProvider);
  const actionOptions = getProviderActionOptions(resolvedProvider, actionCategory);
  const isReadAction = actionCategory === 'read';
  const showFindControls = isReadAction && action === 'find';
  const showFindOneControls = isReadAction && action === 'findOne';
  const showQueryExtras = showFindControls || showFindOneControls;
  const showLimit = showFindControls;
  const showSort = showFindControls;
  const showProjection = showQueryExtras;
  const showSingleToggle = showFindControls;
  const showDistinctField =
                  databaseConfig.useMongoActions && isReadAction && action === 'distinct';
  const isUpdateAction =
                  actionCategory === 'update' &&
                  ['updateOne', 'updateMany', 'replaceOne', 'findOneAndUpdate'].includes(action);
  const sortExample = isPrismaProvider
    ? '{ "createdAt": "desc" }'
    : '{ "createdAt": -1 }';
  const projectionExample = isPrismaProvider
    ? '{ "title": true, "price": true }'
    : '{ "title": 1, "price": 1 }';
  const sortLabel = isPrismaProvider ? 'Order by (JSON)' : 'Sort (JSON)';
  const sortPresetLabel = isPrismaProvider ? 'Order by preset' : 'Sort preset';
  const projectionLabel = isPrismaProvider ? 'Select (JSON)' : 'Projection (JSON)';
  const projectionPresetLabel = isPrismaProvider ? 'Select preset' : 'Projection preset';
  const getPrismaQueryPlaceholder = (dbAction: DatabaseAction): string => {
    switch (dbAction) {
      case 'insertOne':
      case 'insertMany':
        return '{\n  "name_en": "value"\n}';
      case 'aggregate':
        return '{\n  \n}';
      default:
        return '{\n  "id": "{{value}}"\n}';
    }
  };
  const getPrismaUpdatePlaceholder = (): string =>
    '{\n  "description_en": "{{result}}"\n}';
  const queryPlaceholder = isPrismaProvider
    ? getPrismaQueryPlaceholder(action)
    : getQueryPlaceholderByAction(action);
  const updateTemplateValue = databaseConfig.updateTemplate ?? '';
  const updatePlaceholder = isPrismaProvider
    ? getPrismaUpdatePlaceholder()
    : getUpdatePlaceholderByAction(action);
  const activeQueryValue = isUpdateAction
    ? updateTemplateValue
    : queryTemplateValue;
  const activeQueryPlaceholder = isUpdateAction
    ? updatePlaceholder
    : queryPlaceholder;
  const baseValidation = queryValidatorEnabled
    ? isPrismaProvider
      ? buildJsonQueryValidation(activeQueryValue)
      : buildMongoQueryValidation(activeQueryValue)
    : null;
  const paletteIssues = queryValidatorEnabled && selectedValidationRules.length > 0
    ? buildValidationIssues(activeQueryValue, selectedValidationRules)
    : [];
  const queryValidation = baseValidation
    ? mergeValidationIssues(baseValidation, paletteIssues)
    : null;
  const applyActionConfig = (
    nextCategory: DatabaseActionCategory,
    nextAction: DatabaseAction
  ): void => {
    const normalizedCategory = isProviderActionCategorySupported(resolvedProvider, nextCategory)
      ? nextCategory
      : 'read';
    const nextOperation =
                    normalizedCategory === 'create'
                      ? 'insert'
                      : normalizedCategory === 'update'
                        ? 'update'
                        : normalizedCategory === 'delete'
                          ? 'delete'
                          : 'query';
    const nextQueryPatch: Partial<DbQueryConfig> = {};
    if (normalizedCategory === 'read') {
      if (nextAction === 'findOne') {
        nextQueryPatch.single = true;
      } else if (nextAction === 'find') {
        nextQueryPatch.single = false;
      }
    }
    if (normalizedCategory === 'aggregate') {
      nextQueryPatch.single = false;
      nextQueryPatch.mode = 'custom';
      if (!queryConfig.queryTemplate?.trim() || queryConfig.mode === 'preset') {
        nextQueryPatch.queryTemplate = '[]';
      }
    }
    const normalizedAction = resolveProviderAction(
      resolvedProvider,
      normalizedCategory,
      nextAction,
      (nextQueryPatch.single ?? queryConfig.single) ?? false
    );
    const nextUpdateStrategy =
                    normalizedAction === 'updateMany'
                      ? 'many'
                      : normalizedAction === 'updateOne' ||
                        normalizedAction === 'replaceOne' ||
                        normalizedAction === 'findOneAndUpdate'
                        ? 'one'
                        : databaseConfig.updateStrategy ?? 'one';
    updateSelectedNodeConfig({
      database: {
        ...databaseConfig,
        useMongoActions: true,
        actionCategory: normalizedCategory,
        action: normalizedAction,
        operation: nextOperation,
        updateStrategy: nextUpdateStrategy,
        query: {
          ...queryConfig,
          ...nextQueryPatch,
        },
      },
    });
  };
  const handleActionCategoryChange = (value: DatabaseActionCategory): void => {
    const category = isProviderActionCategorySupported(resolvedProvider, value)
      ? value
      : 'read';
    const defaultAction = getDefaultProviderAction(
      resolvedProvider,
      category,
      queryConfig.single ?? false
    );
    applyActionConfig(category, defaultAction);
  };
  const handleActionChange = (value: DatabaseAction): void => {
    applyActionConfig(actionCategory, value);
  };
  const formatJsonQuery = (value: string): string => {
    const parsed = safeParseJson(value).value;
    if (parsed !== null && parsed !== undefined) {
      return JSON.stringify(parsed, null, 2);
    }
    return value.trim();
  };
  const handleFormatClick = (): void => {
    if (queryFormatterEnabled) {
      const formatted = isPrismaProvider
        ? formatJsonQuery(activeQueryValue)
        : formatAndFixMongoQuery(activeQueryValue);
      if (isUpdateAction) {
        updateSelectedNodeConfig({
          database: {
            ...databaseConfig,
            updateTemplate: formatted,
          },
        });
      } else {
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
                queryTemplate: formatted,
              },
            },
          });
        } else {
          updateQueryConfig({
            mode: 'custom',
            queryTemplate: formatted,
          });
        }
      }
      if (queryValidation?.status === 'error') {
        toast('Query auto-corrected based on validation.', { variant: 'success' });
      } else {
        toast('Query formatted and fixed.', { variant: 'success' });
      }
    } else {
      setQueryFormatterEnabled(true);
      toast('Formatter enabled.', { variant: 'success' });
    }
  };
  const handleFormatContextMenu = (event: React.MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();
    setQueryFormatterEnabled((prev: boolean) => !prev);
  };
  const handleToggleValidator = (): void => setQueryValidatorEnabled((prev: boolean) => !prev);
  const handleRunQuery = async (): Promise<void> => {
    if (!['read', 'aggregate', 'update', 'create', 'delete'].includes(actionCategory)) {
      toast('Run is available for read, aggregate, create, update, and delete actions only.', { variant: 'error' });
      return;
    }
    setTestQueryLoading(true);
    setTestQueryResult('');
    try {
      const runtimeInputs = (runtimeState.inputs[selectedNode.id] ?? {}) as Record<string, unknown>;
      const runtimeOutputs = (runtimeState.outputs[selectedNode.id] ?? {}) as Record<string, unknown>;
      const placeholderContext: Record<string, unknown> = {
        'Date: Current': new Date().toISOString(),
        ...buildSchemaPlaceholderContext(schemaMatrix),
      };
      DB_PROVIDER_PLACEHOLDERS.forEach((provider: string) => {
        placeholderContext[`DB Provider: ${provider}`] = provider;
      });
      const templateContext = { ...runtimeOutputs, ...runtimeInputs, ...placeholderContext };
      const rawValue =
                      runtimeInputs['value'] ??
                      runtimeInputs['jobId'] ??
                      runtimeOutputs['value'] ??
                      runtimeOutputs['jobId'];
      const currentValue = Array.isArray(rawValue) ? (rawValue as unknown[])[0] : rawValue;
      const collectionName = queryConfig.collection ?? 'products';
      const serializePreview = (value: unknown): string => {
        try {
          const raw = JSON.stringify(value, null, 2);
          return raw.length > 600 ? `${raw.slice(0, 600)}...` : raw;
        } catch {
          return String(value);
        }
      };
      const confirmWriteAction = (summary: string): boolean => {
        if (runDry) return true;
        return window.confirm(`${summary}\n\nProceed?`);
      };
      const runProvider = resolveDbActionProvider(queryConfig.provider, appDbProvider);
      const actionDisplayName = getProviderSpecificActionLabel(runProvider, action);
      const unsupportedActionMessage = getUnsupportedProviderActionMessage(runProvider, action);
      if (unsupportedActionMessage) {
        setTestQueryResult(
          JSON.stringify(
            {
              error: unsupportedActionMessage,
              provider: runProvider,
              action,
            },
            null,
            2,
          ),
        );
        toast(unsupportedActionMessage, { variant: 'error' });
        setTestQueryLoading(false);
        return;
      }
      if (actionCategory === 'create') {
        const renderedPayload = renderTemplate(
          activeQueryValue,
                        templateContext as Record<string, unknown>,
                        currentValue ?? ''
        );
        const parsedPayload = safeParseJson(renderedPayload);
        const payloadValue = parsedPayload.value ?? null;
        if (parsedPayload.error) {
          const message = parsedPayload.error || 'Insert payload must be valid JSON.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (action === 'insertOne') {
          if (!payloadValue || typeof payloadValue !== 'object' || Array.isArray(payloadValue)) {
            const message = 'insertOne requires a JSON object payload.';
            setTestQueryResult(JSON.stringify({ error: message }, null, 2));
            toast(message, { variant: 'error' });
            setTestQueryLoading(false);
            return;
          }
        } else if (action === 'insertMany') {
          if (!Array.isArray(payloadValue)) {
            const message = 'insertMany requires a JSON array payload.';
            setTestQueryResult(JSON.stringify({ error: message }, null, 2));
            toast(message, { variant: 'error' });
            setTestQueryLoading(false);
            return;
          }
        }
        if (runDry) {
          const preview = {
            dryRun: true,
            action,
            collection: collectionName,
            payload: payloadValue,
          };
          setTestQueryResult(JSON.stringify(preview, null, 2));
          toast('Dry run preview generated.', { variant: 'success' });
          setTestQueryLoading(false);
          return;
        }
        const payloadSummary = serializePreview(payloadValue);
        const confirmed = confirmWriteAction(
          `Run ${actionDisplayName} on ${collectionName}?\n\nPayload:\n${payloadSummary}`
        );
        if (!confirmed) {
          toast('Run cancelled.', { variant: 'success' });
          setTestQueryLoading(false);
          return;
        }
        const data = (await dbActionMutation.mutateAsync({
          provider: (queryConfig.provider ?? 'auto'),
          action,
          collection: collectionName,
          document: action === 'insertOne' ? (payloadValue as Record<string, unknown>) : undefined,
          documents: action === 'insertMany' ? (payloadValue as unknown[]) : undefined,
        })) as ActionResult;
        setTestQueryResult(JSON.stringify(data, null, 2));
        const insertedCount =
                        data.insertedCount ??
                        (Array.isArray(payloadValue) ? payloadValue.length : 1);
        toast(`Inserted ${insertedCount} document${insertedCount === 1 ? '' : 's'}.`, { variant: 'success' });
        setTestQueryLoading(false);
        return;
      }

      if (actionCategory === 'delete') {
        const renderedFilter = renderTemplate(
          queryTemplateValue,
                        templateContext as Record<string, unknown>,
                        currentValue ?? ''
        );
        const parsedFilter = safeParseJson(renderedFilter);
        const filterValue = parsedFilter.value ?? {};
        if (parsedFilter.error) {
          const message = parsedFilter.error || 'Filter must be valid JSON.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (!filterValue || typeof filterValue !== 'object' || Array.isArray(filterValue)) {
          const message = 'Filter must be a JSON object.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (Object.keys(filterValue as Record<string, unknown>).length === 0) {
          const message = 'Delete requires a non-empty filter.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (runDry) {
          const preview = {
            dryRun: true,
            action,
            collection: collectionName,
            filter: filterValue,
          };
          setTestQueryResult(JSON.stringify(preview, null, 2));
          toast('Dry run preview generated.', { variant: 'success' });
          setTestQueryLoading(false);
          return;
        }
        const filterSummary = serializePreview(filterValue);
        const confirmed = confirmWriteAction(
          `Run ${actionDisplayName} on ${collectionName}?\n\nFilter:\n${filterSummary}`
        );
        if (!confirmed) {
          toast('Run cancelled.', { variant: 'success' });
          setTestQueryLoading(false);
          return;
        }
        const data = (await dbActionMutation.mutateAsync({
          provider: (queryConfig.provider ?? 'auto'),
          action,
          collection: collectionName,
          filter: filterValue,
          idType: queryConfig.idType ?? 'string',
        })) as ActionResult;
        setTestQueryResult(JSON.stringify(data, null, 2));
        const deletedCount =
                        data.deletedCount ??
                        (data.value ? 1 : 0);
        toast(`Deleted ${deletedCount} document${deletedCount === 1 ? '' : 's'}.`, { variant: 'success' });
        setTestQueryLoading(false);
        return;
      }

      if (actionCategory === 'update') {
        const renderedFilter = renderTemplate(
          queryTemplateValue,
                        templateContext as Record<string, unknown>,
                        currentValue ?? ''
        );
        const parsedFilter = safeParseJson(renderedFilter);
        const filterValue = parsedFilter.value ?? {};
        if (parsedFilter.error) {
          const message = parsedFilter.error || 'Filter must be valid JSON.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (!filterValue || typeof filterValue !== 'object' || Array.isArray(filterValue)) {
          const message = 'Filter must be a JSON object.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (Object.keys(filterValue as Record<string, unknown>).length === 0) {
          const message = 'Update requires a non-empty filter.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        const renderedUpdate = renderTemplate(
          activeQueryValue,
                        templateContext as Record<string, unknown>,
                        currentValue ?? ''
        );
        const parsedUpdate = safeParseJson(renderedUpdate);
        const updateValue = parsedUpdate.value ?? null;
        if (parsedUpdate.error) {
          const message = parsedUpdate.error || 'Update document must be valid JSON.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (!updateValue || (typeof updateValue !== 'object' && !Array.isArray(updateValue))) {
          const message = 'Update document must be a JSON object or pipeline array.';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (action === 'replaceOne' && Array.isArray(updateValue)) {
          const message = 'replaceOne requires a JSON object (not a pipeline array).';
          setTestQueryResult(JSON.stringify({ error: message }, null, 2));
          toast(message, { variant: 'error' });
          setTestQueryLoading(false);
          return;
        }
        if (runDry) {
          const preview = {
            dryRun: true,
            action,
            collection: collectionName,
            filter: filterValue,
            update: updateValue,
          };
          setTestQueryResult(JSON.stringify(preview, null, 2));
          toast('Dry run preview generated.', { variant: 'success' });
          setTestQueryLoading(false);
          return;
        }
        const filterSummary = serializePreview(filterValue);
        const updateSummary = serializePreview(updateValue);
        const confirmed = confirmWriteAction(
          `Run ${actionDisplayName} on ${collectionName}?\n\nFilter:\n${filterSummary}\n\nUpdate:\n${updateSummary}`
        );
        if (!confirmed) {
          toast('Run cancelled.', { variant: 'success' });
          setTestQueryLoading(false);
          return;
        }
        const data = (await dbActionMutation.mutateAsync({
          provider: (queryConfig.provider ?? 'auto'),
          action,
          collection: collectionName,
          filter: filterValue,
          update: updateValue,
          idType: queryConfig.idType ?? 'string',
        })) as ActionResult;
        setTestQueryResult(JSON.stringify(data, null, 2));
        const matched = data.matchedCount ?? 0;
        const modified = data.modifiedCount;
        const count = modified ?? matched;
        toast(`Update processed ${count} document${count === 1 ? '' : 's'}.`, { variant: 'success' });
        setTestQueryLoading(false);
        return;
      }

      const renderedQuery = renderTemplate(
        queryTemplateValue,
                      templateContext as Record<string, unknown>,
                      currentValue ?? ''
      );
      const parsedQuery = safeParseJson(renderedQuery);
      const parsedValue = parsedQuery.value ?? {};
      if (parsedQuery.error && actionCategory !== 'read' && actionCategory !== 'aggregate') {
        const message = parsedQuery.error || 'Query template must be valid JSON.';
        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
        toast(message, { variant: 'error' });
        setTestQueryLoading(false);
        return;
      }
      if (
        actionCategory === 'read' &&
                      (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue))
      ) {
        const message = 'Read filter must be a JSON object.';
        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
        toast(message, { variant: 'error' });
        setTestQueryLoading(false);
        return;
      }
      if (actionCategory === 'aggregate' && !Array.isArray(parsedValue)) {
        const message = parsedQuery.error || 'Aggregation pipeline must be a JSON array.';
        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
        toast(message, { variant: 'error' });
        setTestQueryLoading(false);
        return;
      }
      if (action === 'distinct' && !databaseConfig.distinctField?.trim()) {
        const message = 'Distinct requires a field name.';
        setTestQueryResult(JSON.stringify({ error: message }, null, 2));
        toast(message, { variant: 'error' });
        setTestQueryLoading(false);
        return;
      }
      const parsedProjection = queryConfig.projection
        ? safeParseJson(queryConfig.projection).value
        : null;
      const parsedSort = queryConfig.sort
        ? safeParseJson(queryConfig.sort).value
        : null;
      const projection =
                      parsedProjection && typeof parsedProjection === 'object'
                        ? parsedProjection
                        : undefined;
      const sort =
                      parsedSort && typeof parsedSort === 'object' ? parsedSort : undefined;
      const data = (await dbActionMutation.mutateAsync({
        provider: (queryConfig.provider ?? 'auto'),
        action,
        collection: queryConfig.collection ?? 'products',
        filter: actionCategory === 'aggregate' ? undefined : parsedValue,
        pipeline: actionCategory === 'aggregate' ? parsedValue : undefined,
        projection,
        sort,
        limit: queryConfig.limit ?? 20,
        idType: queryConfig.idType ?? 'string',
        distinctField: databaseConfig.distinctField?.trim() || undefined,
      })) as ActionResult;
      const resultData =
                      data.item ?? data.items ?? data.values ?? data.result ?? data;
      setTestQueryResult(JSON.stringify(resultData, null, 2));
      const count =
                      data.count ??
                      (Array.isArray(resultData) ? resultData.length : 1);
      toast(`Query returned ${count} result(s)`, { variant: 'success' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute query';
      setTestQueryResult(JSON.stringify({ error: errorMessage }, null, 2));
      toast(errorMessage, { variant: 'error' });
    } finally {
      setTestQueryLoading(false);
    }
  };
  const handleQueryChange = (value: string): void => {
    if (isUpdateAction) {
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          useMongoActions: true,
          actionCategory,
          action,
          operation: 'update',
          updateTemplate: value,
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
            queryTemplate: value,
          },
        },
      });
    } else {
      if (isUpdateAction) {
        updateSelectedNodeConfig({
          database: {
            ...databaseConfig,
            useMongoActions: true,
            actionCategory,
            action,
            operation: 'update',
            query: {
              ...queryConfig,
              mode: 'custom',
              queryTemplate: value,
            },
          },
        });
        return;
      }
      updateQueryConfig({
        mode: 'custom',
        queryTemplate: value,
      });
    }
  };
  const handleFilterChange = (value: string): void => {
    const currentPresetId = databaseConfig.presetId ?? 'custom';
    const currentAiQueryId = selectedAiQueryId;

    if (currentPresetId !== 'custom' || currentAiQueryId) {
      setSelectedAiQueryId('');
      updateSelectedNodeConfig({
        database: {
          ...databaseConfig,
          ...(isUpdateAction
            ? {
              useMongoActions: true,
              actionCategory,
              action,
              operation: 'update',
            }
            : null),
          presetId: 'custom',
          query: {
            ...queryConfig,
            mode: 'custom',
            queryTemplate: value,
          },
        },
      });
    } else {
      updateQueryConfig({
        mode: 'custom',
        queryTemplate: value,
      });
    }
  };
  // Shared query input controls (used in both Query and Constructor tabs)
  const queryInputControls = (
    <DatabaseQueryInputControls
      provider={resolvedProvider}
      actionCategory={actionCategory}
      action={action}
      actionCategoryOptions={[...actionCategoryOptions]}
      actionOptions={[...actionOptions]}
      queryTemplateValue={activeQueryValue}
      queryPlaceholder={activeQueryPlaceholder}
      showFilterInput={isUpdateAction}
      filterTemplateValue={queryTemplateValue}
      filterPlaceholder={queryPlaceholder}
      onFilterChange={handleFilterChange}
      runDry={runDry}
      onToggleRunDry={() =>
        updateSelectedNodeConfig({
          database: {
            ...databaseConfig,
            dryRun: !runDry,
          },
        })
      }
      queryValidation={queryValidation}
      queryFormatterEnabled={queryFormatterEnabled}
      queryValidatorEnabled={queryValidatorEnabled}
      testQueryLoading={testQueryLoading}
      queryTemplateRef={queryTemplateRef}
      onActionCategoryChange={(value: DatabaseActionCategory) => handleActionCategoryChange(value)}
      onActionChange={(value: DatabaseAction) => handleActionChange(value)}
      onFormatClick={handleFormatClick}
      onFormatContextMenu={handleFormatContextMenu}
      onToggleValidator={handleToggleValidator}
      onRunQuery={() => void handleRunQuery()}
      onQueryChange={handleQueryChange}
    />
  );
  const liveDebugPayload = (runtimeState.outputs[selectedNode.id] as
                  | { debugPayload?: unknown }
                  | undefined)?.debugPayload;
  const persistedDebugEntry = pathDebugSnapshot?.entries?.find(
    (entry: PathDebugEntry) => entry.nodeId === selectedNode.id
  );
  const debugPayload = liveDebugPayload ?? persistedDebugEntry?.debug;
  const debugRunAt =
                  liveDebugPayload || !pathDebugSnapshot?.runAt
                    ? null
                    : pathDebugSnapshot.runAt;
  const hasDebugPayload = debugPayload !== undefined && debugPayload !== null;

  const queryEditor = (
    <div className='space-y-4 rounded-md border border-border bg-card/40 p-3'>
      <div>
        {queryInputControls}
        {/* Query Result Display */}
        {testQueryResult && (
          <div className='mt-3 space-y-2'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs text-gray-400'>Query Result</Label>
              <Button
                type='button'
                className='h-6 rounded-md border px-2 text-[10px] text-gray-400 hover:bg-muted/50'
                onClick={() => setTestQueryResult('')}
              >
                              Clear
              </Button>
            </div>
            <Textarea
              className='min-h-[120px] w-full rounded-md border border-cyan-800/50 bg-card/70 font-mono text-xs text-cyan-100'
              value={testQueryResult}
              readOnly
              placeholder='Query results will appear here...'
            />
          </div>
        )}
      </div>
      {queryValidatorEnabled && queryValidation && (
        <DatabaseQueryValidatorPanelContextProvider
          value={{
            queryValidation,
            queryConfig,
            operation,
            queryTemplateValue,
            databaseConfig,
          }}
        >
          <DatabaseQueryValidatorPanel />
        </DatabaseQueryValidatorPanelContextProvider>
      )}
      {queryValidatorEnabled && (
        <div className='rounded-md border border-border bg-card/50 p-3'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <Label className='text-xs text-gray-400'>Validation Palette</Label>
              <div className='text-[11px] text-gray-500'>
                              Select global validation patterns to apply to this query.
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                type='button'
                className='h-6 rounded-md border px-2 text-[10px] text-gray-300 hover:bg-muted/50 disabled:opacity-50'
                disabled={validationPaletteRules.length === 0}
                onClick={handleSelectAllValidationRules}
              >
                              Select all
              </Button>
              <Button
                type='button'
                className='h-6 rounded-md border px-2 text-[10px] text-gray-300 hover:bg-muted/50 disabled:opacity-50'
                disabled={selectedValidationRuleIds.length === 0}
                onClick={handleClearValidationRules}
              >
                              Clear
              </Button>
            </div>
          </div>
          {validationPaletteRules.length === 0 ? (
            <div className='mt-2 text-[11px] text-gray-500'>
                            No global validation patterns found. Add them in Admin → Prompt Engine → Validation Patterns.
            </div>
          ) : (
            <div className='mt-3 grid gap-2'>
              {validationPaletteRules.map((rule: ValidationPaletteRule) => {
                const checked = selectedValidationRuleIds.includes(rule.id);
                return (
                  <label
                    key={rule.id}
                    className='flex items-start gap-2 rounded-md border border-border/60 bg-card/40 px-2 py-2 text-xs text-gray-200'
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => handleToggleValidationRule(rule.id)}
                      className='mt-0.5'
                    />
                    <div className='flex-1'>
                      <div className='text-[11px] font-semibold text-gray-200'>
                        {rule.title}
                      </div>
                      <div className='text-[10px] text-gray-500'>
                        {rule.message}
                      </div>
                    </div>
                    <span
                      className={`rounded border px-2 py-0.5 text-[9px] uppercase tracking-wide ${
                        rule.severity === 'error'
                          ? 'border-rose-500/40 text-rose-200'
                          : rule.severity === 'warning'
                            ? 'border-amber-500/40 text-amber-200'
                            : 'border-cyan-500/40 text-cyan-200'
                      }`}
                    >
                      {rule.severity}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <Label className='text-xs text-gray-400'>Provider</Label>
          <Select
            value={queryConfig.provider ?? 'mongodb'}
            onValueChange={(value: string) => {
              const nextProvider = value as DbQueryConfig['provider'];
              const nextResolvedProvider = resolveDbActionProvider(nextProvider, appDbProvider);
              const nextCategory = isProviderActionCategorySupported(
                nextResolvedProvider,
                requestedActionCategory
              )
                ? requestedActionCategory
                : 'read';
              const nextAction = resolveProviderAction(
                nextResolvedProvider,
                nextCategory,
                action,
                queryConfig.single ?? false
              );
              const nextOperation =
                nextCategory === 'create'
                  ? 'insert'
                  : nextCategory === 'update'
                    ? 'update'
                    : nextCategory === 'delete'
                      ? 'delete'
                      : 'query';
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  useMongoActions: true,
                  actionCategory: nextCategory,
                  action: nextAction,
                  operation: nextOperation,
                  query: {
                    ...queryConfig,
                    provider: nextProvider,
                  },
                },
              });
            }}
          >
            <SelectTrigger className='mt-2 w-full border-border bg-card/70 text-sm text-white'>
              <SelectValue placeholder='Select provider' />
            </SelectTrigger>
            <SelectContent className='border-border bg-gray-900'>
              <SelectItem value='auto'>Auto</SelectItem>
              <SelectItem value='mongodb'>MongoDB</SelectItem>
              <SelectItem value='prisma'>Prisma</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className='text-xs text-gray-400'>Collection</Label>
          <Select
            value={collectionOption}
            onValueChange={(value: string) => {
              updateQueryConfig({
                collection: value === 'custom' ? queryConfig.collection : value,
              });
            }}
          >
            <SelectTrigger className='mt-2 w-full border-border bg-card/70 text-sm text-white'>
              <SelectValue placeholder='Select collection' />
            </SelectTrigger>
            <SelectContent className='border-border bg-gray-900 max-h-60 overflow-y-auto'>
              {collectionOptions.map((option: { value: string; label: string }) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
              <SelectItem value='custom'>Custom</SelectItem>
            </SelectContent>
          </Select>
          <div className='mt-2 flex flex-wrap items-center justify-between gap-2'>
            <p className='text-[10px] text-gray-500'>
              {schemaSource === 'connected'
                ? 'Using live schema from connected Database Schema node.'
                : schemaSource === 'snapshot'
                  ? `Using cached schema snapshot${schemaSnapshot?.syncedAt ? ` (synced ${new Date(schemaSnapshot.syncedAt).toLocaleString()})` : ''}.`
                  : 'No schema snapshot yet. Sync to load collections.'}
            </p>
            <Button
              type='button'
              className='h-6 rounded-md border border-border px-2 text-[10px] text-gray-200 hover:bg-muted/60'
              onClick={handleSyncSchema}
              disabled={schemaSyncing}
            >
              {schemaSyncing ? 'Syncing...' : 'Sync collections'}
            </Button>
          </div>
          {useSchemaCollections && schemaLoading && (
            <p className='mt-2 text-[11px] text-gray-500'>
              Loading schema collections...
            </p>
          )}
          {useSchemaCollections && !schemaLoading && !schemaSyncing && schemaCollectionOptions.length === 0 && (
            <p className='mt-2 text-[11px] text-gray-500'>
              {schemaSource === 'connected'
                ? 'No schema collections available. Check the Database Schema node selection.'
                : 'No synced collections available. Click "Sync collections" to refresh.'}
            </p>
          )}
          {(collectionOption === 'custom' || useSchemaCollections) && (
            <Input
              className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
              value={queryConfig.collection}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                updateQueryConfig({ collection: event.target.value });
              }}
              placeholder='collection_name'
            />
          )}
        </div>
      </div>
      {(providerWarning || productProviderWarning || providerActionWarning) && (
        <div className='mt-3 space-y-1 rounded-md border border-amber-700/50 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
          {providerActionWarning && <div>{providerActionWarning}</div>}
          {providerWarning && <div>{providerWarning}</div>}
          {productProviderWarning && <div>{productProviderWarning}</div>}
        </div>
      )}
      {showLimit && (
        <div>
          <Label className='text-xs text-gray-400'>Limit</Label>
          <Input
            type='number'
            step='1'
            className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={queryConfig.limit}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              updateQueryConfig({
                limit: toNumber(event.target.value, queryConfig.limit),
              })
            }
          />
        </div>
      )}
      {isPrismaProvider && (
        <div className='rounded-md border border-cyan-900/40 bg-cyan-500/5 p-3 text-[11px] text-cyan-100'>
          <div className='font-medium text-cyan-200'>Prisma query tips</div>
          <div className='mt-1 text-cyan-100/90'>
                          Use a Prisma `where` object for filters and a `select` object for projections.
          </div>
          <div className='mt-2 text-cyan-100/90'>
                          Where example: <span className='font-mono'>{'{ "id": "{{value}}" }'}</span>
          </div>
          <div className='mt-1 text-cyan-100/90'>
                          Update data example:{' '}
            <span className='font-mono'>{'{ "description_en": "{{result}}" }'}</span>
          </div>
          <div className='mt-2 text-cyan-100/90'>
                          Active Prisma command: <span className='font-semibold'>{providerActionLabel}</span>
          </div>
        </div>
      )}
      {showSort && (
        <div className='grid gap-3 sm:grid-cols-2'>
          <div>
            <Label className='text-xs text-gray-400'>{sortPresetLabel}</Label>
            <Select
              value={sortPresetId}
              onValueChange={(value: string) => {
                if (value === 'custom') return;
                const preset = sortPresets.find((item: { id: string }) => item.id === value);
                if (!preset) return;
                updateQueryConfig({
                  sort: preset.value,
                  sortPresetId: preset.id,
                });
              }}
            >
              <SelectTrigger className='mt-2 w-full border-border bg-card/70 text-sm text-white'>
                <SelectValue placeholder='Select preset' />
              </SelectTrigger>
              <SelectContent className='border-border bg-gray-900'>
                <SelectItem value='custom'>Custom</SelectItem>
                {sortPresets.map((preset: { id: string; label: string }) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className='mt-3 text-xs text-gray-400'>{sortLabel}</Label>
            <Textarea
              className='mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
              value={queryConfig.sort}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                updateQueryConfig({
                  sort: event.target.value,
                  sortPresetId: 'custom',
                })
              }
            />
            <p className='mt-2 text-[11px] text-gray-500'>
                            Example:{' '}
              <span className='text-gray-300'>{sortExample}</span>
            </p>
          </div>
          {showProjection && (
            <div>
              <Label className='text-xs text-gray-400'>{projectionPresetLabel}</Label>
              <Select
                value={projectionPresetId}
                onValueChange={(value: string) => {
                  if (value === 'custom') return;
                  const preset = projectionPresets.find((item: { id: string }) => item.id === value);
                  if (!preset) return;
                  updateQueryConfig({
                    projection: preset.value,
                    projectionPresetId: preset.id,
                  });
                }}
              >
                <SelectTrigger className='mt-2 w-full border-border bg-card/70 text-sm text-white'>
                  <SelectValue placeholder='Select preset' />
                </SelectTrigger>
                <SelectContent className='border-border bg-gray-900'>
                  <SelectItem value='custom'>Custom</SelectItem>
                  {projectionPresets.map((preset: { id: string; label: string }) => (
                    <SelectItem key={preset.id} value={preset.id}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className='mt-3 text-xs text-gray-400'>
                {projectionLabel}
              </Label>
              <Textarea
                className='mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
                value={queryConfig.projection}
                onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
                  updateQueryConfig({
                    projection: event.target.value,
                    projectionPresetId: 'custom',
                  })
                }
              />
              <p className='mt-2 text-[11px] text-gray-500'>
                            Example:{' '}
                <span className='text-gray-300'>{projectionExample}</span>
              </p>
            </div>
          )}
        </div>
      )}
      {showProjection && !showSort && (
        <div>
          <Label className='text-xs text-gray-400'>{projectionPresetLabel}</Label>
          <Select
            value={projectionPresetId}
            onValueChange={(value: string) => {
              if (value === 'custom') return;
              const preset = projectionPresets.find((item: { id: string }) => item.id === value);
              if (!preset) return;
              updateQueryConfig({
                projection: preset.value,
                projectionPresetId: preset.id,
              });
            }}
          >
            <SelectTrigger className='mt-2 w-full border-border bg-card/70 text-sm text-white'>
              <SelectValue placeholder='Select preset' />
            </SelectTrigger>
            <SelectContent className='border-border bg-gray-900'>
              <SelectItem value='custom'>Custom</SelectItem>
              {projectionPresets.map((preset: { id: string; label: string }) => (
                <SelectItem key={preset.id} value={preset.id}>
                  {preset.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Label className='mt-3 text-xs text-gray-400'>
            {projectionLabel}
          </Label>
          <Textarea
            className='mt-2 min-h-[80px] w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={queryConfig.projection}
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
              updateQueryConfig({
                projection: event.target.value,
                projectionPresetId: 'custom',
              })
            }
          />
          <p className='mt-2 text-[11px] text-gray-500'>
                          Example:{' '}
            <span className='text-gray-300'>{projectionExample}</span>
          </p>
        </div>
      )}
      {showDistinctField && (
        <div>
          <Label className='text-xs text-gray-400'>Distinct field</Label>
          <Input
            className='mt-2 w-full rounded-md border border-border bg-card/70 text-sm text-white'
            value={databaseConfig.distinctField ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  distinctField: event.target.value,
                },
              })
            }
            placeholder='fieldName'
          />
        </div>
      )}
      {showSingleToggle && (
        <div className='flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2 text-xs text-gray-300'>
          <span>Single result</span>
          <Button
            type='button'
            className={`rounded border px-3 py-1 text-xs ${
              queryConfig.single
                ? 'text-emerald-200 hover:bg-emerald-500/10'
                : 'text-gray-300 hover:bg-muted/50'
            }`}
            onClick={() =>
              updateQueryConfig({ single: !queryConfig.single })
            }
          >
            {queryConfig.single ? 'Enabled' : 'Disabled'}
          </Button>
        </div>
      )}
      {showQueryExtras && (
        <p className='text-[11px] text-gray-500'>
                        Collections are allowlisted on the server for safety.
        </p>
      )}
    </div>
  );

  return (
    <>
      <Tabs
        value={databaseTab}
        onValueChange={(value: string) => setDatabaseTab(value as 'settings' | 'constructor' | 'presets')}
        className='space-y-4'
      >
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <TabsList className='justify-start border border-border bg-card/60'>
            <TabsTrigger value='settings'>Query</TabsTrigger>
            <TabsTrigger value='constructor'>Constructor</TabsTrigger>
            <TabsTrigger value='presets'>Presets</TabsTrigger>
          </TabsList>
          <div
            className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-wide ${
              databaseConfig.useMongoActions
                ? 'border-emerald-700/60 bg-emerald-500/10 text-emerald-200'
                : 'border-amber-700/60 bg-amber-500/10 text-amber-200'
            }`}
            title={
              databaseConfig.useMongoActions
                ? `${resolvedProvider.toUpperCase()} action mode enabled`
                : 'Mappings mode (manual field mappings)'
            }
          >
                        Action Mode: {databaseConfig.useMongoActions ? 'On' : 'Off'}
          </div>
        </div>
        <div className='rounded-md border border-border bg-card/50 p-3'>
          <div className='flex items-center justify-between'>
            <Label className='text-xs text-gray-400'>
                          Last Runtime Debug
              {debugRunAt
                ? ` • Saved ${new Date(debugRunAt).toLocaleString()}`
                : ''}
            </Label>
            <Button
              type='button'
              className='h-6 rounded-md border px-2 text-[10px] text-gray-400 hover:bg-muted/50 disabled:opacity-50'
              disabled={!hasDebugPayload}
              onClick={() => {
                if (!hasDebugPayload) return;
                try {
                  const payload = JSON.stringify(debugPayload, null, 2);
                  void navigator.clipboard.writeText(payload);
                  toast('Debug payload copied.', { variant: 'success' });
                } catch {
                  toast('Failed to copy debug payload.', { variant: 'error' });
                }
              }}
            >
                          Copy
            </Button>
          </div>
          <Textarea
            className='mt-2 min-h-[110px] w-full rounded-md border border-amber-800/50 bg-card/70 font-mono text-xs text-amber-100'
            value={hasDebugPayload ? JSON.stringify(debugPayload, null, 2) : ''}
            readOnly
            placeholder='Run the path trigger to capture debug output...'
          />
        </div>
        <TabsContent value='settings'>
          <DatabaseSettingsTabContextProvider
            value={{
              queryEditor,
              availablePorts,
              bundleKeys,
              operation,
            }}
          >
            <DatabaseSettingsTab />
          </DatabaseSettingsTabContextProvider>
        </TabsContent>
        <TabsContent value='constructor'>
          <DatabaseConstructorContextProvider
            value={{
              queryInputControls,
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
              operation,
              queryTemplateValue: activeQueryValue,
              queryTemplateRef,
              sampleState,
              parsedSampleError: parsedSample.error,
              updateQueryConfig,
              connectedPlaceholders,
              hasSchemaConnection:
                schemaConnection.hasSchemaConnection ||
                Boolean(schemaSnapshot?.collections?.length),
              fetchedDbSchema: effectiveSchema,
              schemaMatrix,
              onSyncSchema: handleSyncSchema,
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
            }}
          >
            <DatabaseConstructorTab />
          </DatabaseConstructorContextProvider>
        </TabsContent>
        <TabsContent value='presets'>
          <DatabasePresetsTabContextProvider
            value={{
              builtInPresets: presetOptions,
              onApplyBuiltInPreset: applyDatabasePreset,
              onRenameQueryPreset: handleRenameQueryPreset,
              onDeleteQueryPreset: handleDeleteQueryPresetById,
            }}
          >
            <DatabasePresetsTab />
          </DatabasePresetsTabContextProvider>
        </TabsContent>
      </Tabs>
      <DatabaseSaveQueryPresetDialogContextProvider
        value={{
          open: saveQueryPresetModalOpen,
          onOpenChange: (open: boolean) => {
            if (!open) {
              closeSaveQueryPresetModal();
              return;
            }
            setSaveQueryPresetModalOpen(true);
          },
          newQueryPresetName,
          setNewQueryPresetName,
          queryTemplateValue,
          onCancel: closeSaveQueryPresetModal,
          onSave: () => void handleSaveQueryPresetFromModal(),
        }}
      >
        <DatabaseSaveQueryPresetDialog />
      </DatabaseSaveQueryPresetDialogContextProvider>
    </>
  );
            
}
