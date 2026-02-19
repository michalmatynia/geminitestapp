'use client';

import { BookOpenText, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAiPathsSettingsQuery } from '@/features/ai/ai-paths/hooks/useAiPathQueries';
import type {
  AiPathsValidationConfig,
  AiPathsValidationRule,
  PathConfig,
  PathMeta,
} from '@/features/ai/ai-paths/lib';
import {
  DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES,
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  buildAiPathsValidationRulesFromDocs,
  createDefaultPathConfig,
  evaluateAiPathsValidationPreflight,
  normalizeAiPathsValidationConfig,
} from '@/features/ai/ai-paths/lib';
import { AI_PATHS_NODE_DOCS } from '@/features/ai/ai-paths/lib/core/docs/node-docs';
import { updateAiPathsSettingsBulk } from '@/features/ai/ai-paths/lib/settings-store-client';
import {
  Badge,
  Breadcrumbs,
  Button,
  Input,
  Label,
  LoadingState,
  PanelHeader,
  SearchInput,
  SelectSimple,
  StatusBadge,
  Textarea,
  useToast,
} from '@/shared/ui';

type SettingsRecord = { key: string; value: string };

type ParsedAiPathsSettings = {
  pathMetas: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
};

type RuleParseResult =
  | { ok: true; value: AiPathsValidationRule[] }
  | { ok: false; error: string };

const VALIDATION_POLICY_OPTIONS = [
  { value: 'block_below_threshold', label: 'Block Below Threshold' },
  { value: 'warn_below_threshold', label: 'Warn Below Threshold' },
  { value: 'report_only', label: 'Report Only' },
];

const ENABLE_OPTIONS = [
  { value: 'enabled', label: 'Enabled' },
  { value: 'disabled', label: 'Disabled' },
];

const parseJson = (value: string): unknown | null => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeIso = (value: unknown, fallback: string): string => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : fallback;
};

const parseDocsSourcesText = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split('\n')
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0),
    ),
  );

const serializeDocsSources = (sources: string[]): string =>
  Array.from(
    new Set(
      sources
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0),
    ),
  ).join('\n');

const parseCollectionMapText = (value: string): Record<string, string> => {
  const nextMap: Record<string, string> = {};
  value
    .split('\n')
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line.length > 0)
    .forEach((line: string) => {
      const separatorIndex = line.includes(':') ? line.indexOf(':') : line.indexOf('=');
      if (separatorIndex <= 0) return;
      const entity = line.slice(0, separatorIndex).trim();
      const collection = line.slice(separatorIndex + 1).trim();
      if (!entity || !collection) return;
      nextMap[entity] = collection;
    });
  return nextMap;
};

const serializeCollectionMap = (value: Record<string, string>): string =>
  Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([entity, collection]: [string, string]) => `${entity}:${collection}`)
    .join('\n');

const parseRulesDraft = (value: string): RuleParseResult => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return { ok: false, error: 'Validation rules JSON must be an array.' };
    }
    return { ok: true, value: parsed as AiPathsValidationRule[] };
  } catch {
    return { ok: false, error: 'Invalid validation rules JSON.' };
  }
};

const coercePathConfig = (pathId: string, raw: unknown): PathConfig | null => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const fallback = createDefaultPathConfig(pathId);
  const name = normalizeString(record['name']) || fallback.name || `Path ${pathId.slice(0, 6)}`;
  const updatedAt = normalizeIso(record['updatedAt'], new Date().toISOString());
  const nodes = Array.isArray(record['nodes'])
    ? (record['nodes'] as PathConfig['nodes'])
    : fallback.nodes;
  const edges = Array.isArray(record['edges'])
    ? (record['edges'] as PathConfig['edges'])
    : fallback.edges;

  return {
    ...fallback,
    ...(record as Partial<PathConfig>),
    id: pathId,
    name,
    updatedAt,
    nodes,
    edges,
    aiPathsValidation: normalizeAiPathsValidationConfig(
      (record['aiPathsValidation'] as PathConfig['aiPathsValidation'] | undefined) ??
        fallback.aiPathsValidation,
    ),
  };
};

const parsePathIndex = (raw: string | undefined): PathMeta[] => {
  if (!raw) return [];
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((entry: unknown): PathMeta | null => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const id = normalizeString(record['id']);
      if (!id) return null;
      const fallbackNow = new Date().toISOString();
      const name = normalizeString(record['name']) || `Path ${id.slice(0, 6)}`;
      return {
        id,
        name,
        createdAt: normalizeIso(record['createdAt'], fallbackNow),
        updatedAt: normalizeIso(record['updatedAt'], fallbackNow),
      };
    })
    .filter((entry: PathMeta | null): entry is PathMeta => Boolean(entry));
};

const parseAiPathsSettings = (records: SettingsRecord[]): ParsedAiPathsSettings => {
  const settingsMap = new Map<string, string>(
    records.map((record: SettingsRecord): [string, string] => [record.key, record.value]),
  );
  const configEntries = Array.from(settingsMap.entries()).filter(([key]: [string, string]) =>
    key.startsWith(PATH_CONFIG_PREFIX),
  );

  const parsedConfigById = new Map<string, PathConfig>();
  configEntries.forEach(([key, value]: [string, string]) => {
    const pathId = key.slice(PATH_CONFIG_PREFIX.length).trim();
    if (!pathId) return;
    const parsed = parseJson(value);
    const config = coercePathConfig(pathId, parsed);
    if (!config) return;
    parsedConfigById.set(pathId, config);
  });

  const indexMetas = parsePathIndex(settingsMap.get(PATH_INDEX_KEY));
  const metasFromIndex: PathMeta[] = indexMetas
    .filter((meta: PathMeta): boolean => parsedConfigById.has(meta.id))
    .map((meta: PathMeta): PathMeta => {
      const config = parsedConfigById.get(meta.id);
      return {
        ...meta,
        name: config?.name?.trim() || meta.name || `Path ${meta.id.slice(0, 6)}`,
      };
    });

  const fallbackMetas: PathMeta[] = Array.from(parsedConfigById.values())
    .filter(
      (config: PathConfig): boolean => !metasFromIndex.some((meta: PathMeta) => meta.id === config.id),
    )
    .map((config: PathConfig): PathMeta => ({
      id: config.id,
      name: config.name || `Path ${config.id.slice(0, 6)}`,
      createdAt: config.updatedAt,
      updatedAt: config.updatedAt,
    }));

  const pathMetas = [...metasFromIndex, ...fallbackMetas].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const pathConfigs = Object.fromEntries(
    Array.from(parsedConfigById.entries()).map(([id, config]: [string, PathConfig]) => [id, config]),
  );

  if (pathMetas.length > 0) {
    return {
      pathMetas,
      pathConfigs,
    };
  }

  const fallbackConfig = createDefaultPathConfig('default');
  return {
    pathMetas: [
      {
        id: fallbackConfig.id,
        name: fallbackConfig.name,
        createdAt: fallbackConfig.updatedAt,
        updatedAt: fallbackConfig.updatedAt,
      },
    ],
    pathConfigs: {
      [fallbackConfig.id]: fallbackConfig,
    },
  };
};

export function AdminAiPathsValidationPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const requestedPathId = searchParams?.get('pathId')?.trim() ?? '';
  const focusNodeId = searchParams?.get('focusNodeId')?.trim() ?? '';
  const focusNodeType = searchParams?.get('focusNodeType')?.trim() ?? '';
  const { toast } = useToast();
  const settingsQuery = useAiPathsSettingsQuery();

  const parsedSettings = useMemo(
    () => parseAiPathsSettings(settingsQuery.data ?? []),
    [settingsQuery.data],
  );

  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [validationDraft, setValidationDraft] = useState<AiPathsValidationConfig>(
    normalizeAiPathsValidationConfig(undefined),
  );
  const [docsSourcesDraft, setDocsSourcesDraft] = useState<string>('');
  const [collectionMapDraft, setCollectionMapDraft] = useState<string>('');
  const [rulesDraft, setRulesDraft] = useState<string>('[]');
  const [rulesDraftError, setRulesDraftError] = useState<string | null>(null);
  const [docsSearch, setDocsSearch] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    if (parsedSettings.pathMetas.length === 0) {
      setSelectedPathId('');
      return;
    }
    setSelectedPathId((previous: string) => {
      if (previous && parsedSettings.pathConfigs[previous]) return previous;
      if (requestedPathId && parsedSettings.pathConfigs[requestedPathId]) {
        return requestedPathId;
      }
      return parsedSettings.pathMetas[0]?.id ?? '';
    });
  }, [parsedSettings.pathConfigs, parsedSettings.pathMetas, requestedPathId]);

  const selectedPathConfig = useMemo(
    () => (selectedPathId ? parsedSettings.pathConfigs[selectedPathId] ?? null : null),
    [parsedSettings.pathConfigs, selectedPathId],
  );
  const persistedValidation = useMemo(
    () => normalizeAiPathsValidationConfig(selectedPathConfig?.aiPathsValidation),
    [selectedPathConfig],
  );
  const persistedSignature = useMemo(
    () => JSON.stringify(persistedValidation),
    [persistedValidation],
  );

  useEffect(() => {
    if (!selectedPathConfig) return;
    setValidationDraft(persistedValidation);
    setDocsSourcesDraft(serializeDocsSources(persistedValidation.docsSources ?? []));
    setCollectionMapDraft(serializeCollectionMap(persistedValidation.collectionMap ?? {}));
    setRulesDraft(JSON.stringify(persistedValidation.rules ?? [], null, 2));
    setRulesDraftError(null);
  }, [persistedSignature, selectedPathConfig]);

  const pathOptions = useMemo(
    () =>
      parsedSettings.pathMetas.map((meta: PathMeta) => ({
        value: meta.id,
        label: `${meta.name} (${meta.id.slice(0, 8)})`,
      })),
    [parsedSettings.pathMetas],
  );

  const validationPolicyValue = useMemo(() => {
    const policy = validationDraft.policy;
    if (
      policy === 'report_only' ||
      policy === 'warn_below_threshold' ||
      policy === 'block_below_threshold'
    ) {
      return policy;
    }
    return 'block_below_threshold';
  }, [validationDraft.policy]);

  const filteredNodeDocs = useMemo(() => {
    const query = docsSearch.trim().toLowerCase();
    if (!query) return AI_PATHS_NODE_DOCS;
    return AI_PATHS_NODE_DOCS.filter((doc) => {
      const haystack = [
        doc.type,
        doc.title,
        doc.purpose,
        doc.inputs.join(' '),
        doc.outputs.join(' '),
        doc.config.map((entry) => `${entry.path} ${entry.description}`).join(' '),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [docsSearch]);

  const sortedRules = useMemo(() => {
    const rules = [...(validationDraft.rules ?? [])];
    rules.sort((left, right) => {
      const leftSequence = typeof left.sequence === 'number' ? left.sequence : 0;
      const rightSequence = typeof right.sequence === 'number' ? right.sequence : 0;
      if (leftSequence !== rightSequence) return leftSequence - rightSequence;
      return left.id.localeCompare(right.id);
    });
    return rules;
  }, [validationDraft.rules]);

  const filteredRules = useMemo(() => {
    if (!focusNodeType) return sortedRules;
    return sortedRules.filter((rule: AiPathsValidationRule) => {
      if (!rule.appliesToNodeTypes || rule.appliesToNodeTypes.length === 0) return true;
      return rule.appliesToNodeTypes.includes(focusNodeType);
    });
  }, [focusNodeType, sortedRules]);

  const validationReport = useMemo(() => {
    if (!selectedPathConfig) return null;
    return evaluateAiPathsValidationPreflight({
      nodes: selectedPathConfig.nodes ?? [],
      edges: selectedPathConfig.edges ?? [],
      config: validationDraft,
    });
  }, [selectedPathConfig, validationDraft]);

  const draftSignature = useMemo(
    () => JSON.stringify(validationDraft),
    [validationDraft],
  );
  const isDirty = draftSignature !== persistedSignature;

  const updateDraft = (patch: Partial<AiPathsValidationConfig>): void => {
    setValidationDraft((previous: AiPathsValidationConfig) =>
      normalizeAiPathsValidationConfig({
        ...previous,
        ...patch,
      }),
    );
  };

  const applyDocsSources = (nextSources: string[]): void => {
    const normalized = parseDocsSourcesText(nextSources.join('\n'));
    setDocsSourcesDraft(serializeDocsSources(normalized));
    updateDraft({ docsSources: normalized });
  };

  const handleApplyDocsSources = (): void => {
    applyDocsSources(parseDocsSourcesText(docsSourcesDraft));
    toast('Docs sources applied to AI-Paths validator.', { variant: 'success' });
  };

  const handleApplyCollectionMap = (): void => {
    const parsedMap = parseCollectionMapText(collectionMapDraft);
    setCollectionMapDraft(serializeCollectionMap(parsedMap));
    updateDraft({ collectionMap: parsedMap });
    toast('Entity-to-collection map applied.', { variant: 'success' });
  };

  const handleApplyRulesDraft = (): boolean => {
    const parsed = parseRulesDraft(rulesDraft);
    if (!parsed.ok) {
      setRulesDraftError(parsed.error);
      toast(parsed.error, { variant: 'error' });
      return false;
    }
    setRulesDraftError(null);
    updateDraft({ rules: parsed.value });
    toast(`Applied ${parsed.value.length} validation rules.`, { variant: 'success' });
    return true;
  };

  const handleRebuildRulesFromDocs = (): void => {
    const scopedSources = parseDocsSourcesText(docsSourcesDraft);
    const rebuiltRules = buildAiPathsValidationRulesFromDocs(scopedSources);
    setValidationDraft((previous: AiPathsValidationConfig) =>
      normalizeAiPathsValidationConfig({
        ...previous,
        docsSources: scopedSources,
        rules: rebuiltRules,
      }),
    );
    setDocsSourcesDraft(serializeDocsSources(scopedSources));
    setRulesDraft(JSON.stringify(rebuiltRules, null, 2));
    setRulesDraftError(null);
    toast(`Rebuilt ${rebuiltRules.length} rules from docs sources.`, {
      variant: 'success',
    });
  };

  const handleResetToDefaults = (): void => {
    const defaultConfig = normalizeAiPathsValidationConfig(undefined);
    setValidationDraft(defaultConfig);
    setDocsSourcesDraft(serializeDocsSources(defaultConfig.docsSources ?? []));
    setCollectionMapDraft(serializeCollectionMap(defaultConfig.collectionMap ?? {}));
    setRulesDraft(JSON.stringify(defaultConfig.rules ?? [], null, 2));
    setRulesDraftError(null);
    toast('Reset draft to default AI-Paths validator profile.', { variant: 'info' });
  };

  const handleToggleRuleEnabled = (ruleId: string): void => {
    updateDraft({
      rules: (validationDraft.rules ?? []).map((rule: AiPathsValidationRule) =>
        rule.id === ruleId ? { ...rule, enabled: rule.enabled === false } : rule,
      ),
    });
  };

  const handleRuleSequenceBlur = (ruleId: string, rawValue: string): void => {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return;
    updateDraft({
      rules: (validationDraft.rules ?? []).map((rule: AiPathsValidationRule) =>
        rule.id === ruleId ? { ...rule, sequence: parsed } : rule,
      ),
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedPathConfig || !selectedPathId) return;
    const parsedRules = parseRulesDraft(rulesDraft);
    if (!parsedRules.ok) {
      setRulesDraftError(parsedRules.error);
      toast(parsedRules.error, { variant: 'error' });
      return;
    }

    const now = new Date().toISOString();
    const nextValidation = normalizeAiPathsValidationConfig({
      ...validationDraft,
      docsSources: parseDocsSourcesText(docsSourcesDraft),
      collectionMap: parseCollectionMapText(collectionMapDraft),
      rules: parsedRules.value,
      lastEvaluatedAt: now,
    });
    const nextPathConfig: PathConfig = {
      ...selectedPathConfig,
      updatedAt: now,
      aiPathsValidation: nextValidation,
    };
    const nextPathMetas = parsedSettings.pathMetas.map((meta: PathMeta): PathMeta => {
      if (meta.id !== selectedPathId) return meta;
      return {
        ...meta,
        name: nextPathConfig.name,
        updatedAt: now,
      };
    });

    setSaving(true);
    try {
      await updateAiPathsSettingsBulk([
        {
          key: `${PATH_CONFIG_PREFIX}${selectedPathId}`,
          value: JSON.stringify(nextPathConfig),
        },
        {
          key: PATH_INDEX_KEY,
          value: JSON.stringify(nextPathMetas),
        },
      ]);
      await settingsQuery.refetch();
      toast('AI-Paths Node Validator settings saved.', { variant: 'success' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save AI-Paths validator settings.', {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (settingsQuery.isLoading) {
    return <LoadingState message='Loading AI-Paths validator...' className='py-12' />;
  }

  return (
    <div className='mx-auto w-full max-w-none space-y-6 pb-10'>
      <PanelHeader
        title='AI-Paths Node Validator'
        description={
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'AI Paths', href: '/admin/ai-paths' },
              { label: 'Node Validator', href: '/admin/ai-paths/validation' },
            ]}
          />
        }
        icon={<ShieldCheck className='size-4' />}
        refreshable={true}
        isRefreshing={settingsQuery.isFetching}
        onRefresh={() => {
          void settingsQuery.refetch();
        }}
      />

      <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
        <div className='flex flex-wrap items-end gap-3'>
          <div className='min-w-[260px] flex-1'>
            <Label className='text-xs text-gray-400'>Path</Label>
            <SelectSimple
              size='sm'
              value={selectedPathId}
              onValueChange={(value: string) => setSelectedPathId(value)}
              options={pathOptions}
              className='mt-2'
            />
          </div>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              void settingsQuery.refetch();
            }}
            className='gap-2'
          >
            <RefreshCw className='size-3.5' />
            Reload
          </Button>
          <Button
            type='button'
            size='sm'
            onClick={() => {
              void handleSave();
            }}
            disabled={!selectedPathConfig || saving}
            className='gap-2'
          >
            <Save className='size-3.5' />
            {saving ? 'Saving...' : 'Save Node Validator'}
          </Button>
        </div>
        <div className='mt-3 flex flex-wrap items-center gap-2'>
          <StatusBadge
            status={isDirty ? 'Unsaved changes' : 'Saved'}
            variant={isDirty ? 'warning' : 'success'}
            size='sm'
          />
          {validationReport ? (
            <>
              <StatusBadge
                status={`Score: ${validationReport.score}`}
                variant={
                  validationReport.blocked
                    ? 'error'
                    : validationReport.shouldWarn
                      ? 'warning'
                      : 'success'
                }
                size='sm'
              />
              <StatusBadge
                status={`Failed rules: ${validationReport.failedRules}`}
                variant={validationReport.failedRules > 0 ? 'warning' : 'success'}
                size='sm'
              />
            </>
          ) : null}
          {focusNodeType ? (
            <Badge variant='outline' className='text-[10px]'>
              Focus node type: {focusNodeType}
            </Badge>
          ) : null}
          {focusNodeId ? (
            <Badge variant='outline' className='text-[10px]'>
              Focus node: {focusNodeId}
            </Badge>
          ) : null}
        </div>
      </div>

      {!selectedPathConfig ? (
        <div className='rounded-lg border border-border/60 bg-card/40 p-6 text-sm text-gray-400'>
          No AI Path config found for the selected path.
        </div>
      ) : (
        <div className='grid gap-6 xl:grid-cols-12'>
          <div className='space-y-6 xl:col-span-7'>
            <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-sm font-semibold text-white'>Validation Engine</h3>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleResetToDefaults}
                  >
                    Reset To Defaults
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleRebuildRulesFromDocs}
                  >
                    Rebuild Rules From Docs
                  </Button>
                </div>
              </div>
              <div className='grid gap-4 md:grid-cols-2'>
                <div>
                  <Label className='text-xs text-gray-400'>Status</Label>
                  <SelectSimple
                    size='sm'
                    value={validationDraft.enabled === false ? 'disabled' : 'enabled'}
                    onValueChange={(value: string) =>
                      updateDraft({ enabled: value !== 'disabled' })
                    }
                    options={ENABLE_OPTIONS}
                    className='mt-2'
                  />
                </div>
                <div>
                  <Label className='text-xs text-gray-400'>Policy</Label>
                  <SelectSimple
                    size='sm'
                    value={validationPolicyValue}
                    onValueChange={(value: string) => {
                      updateDraft({
                        policy:
                          value === 'report_only'
                            ? 'report_only'
                            : value === 'warn_below_threshold'
                              ? 'warn_below_threshold'
                              : 'block_below_threshold',
                      });
                    }}
                    options={VALIDATION_POLICY_OPTIONS}
                    className='mt-2'
                  />
                </div>
                <div>
                  <Label className='text-xs text-gray-400'>Base Score</Label>
                  <Input
                    type='number'
                    min={0}
                    max={100}
                    className='mt-2 h-9'
                    value={String(validationDraft.baseScore ?? 100)}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (!Number.isFinite(parsed)) return;
                      updateDraft({ baseScore: Math.max(0, Math.min(100, parsed)) });
                    }}
                  />
                </div>
                <div>
                  <Label className='text-xs text-gray-400'>Warn Threshold</Label>
                  <Input
                    type='number'
                    min={0}
                    max={100}
                    className='mt-2 h-9'
                    value={String(validationDraft.warnThreshold ?? 70)}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (!Number.isFinite(parsed)) return;
                      updateDraft({ warnThreshold: Math.max(0, Math.min(100, parsed)) });
                    }}
                  />
                </div>
                <div>
                  <Label className='text-xs text-gray-400'>Block Threshold</Label>
                  <Input
                    type='number'
                    min={0}
                    max={100}
                    className='mt-2 h-9'
                    value={String(validationDraft.blockThreshold ?? 50)}
                    onChange={(event) => {
                      const parsed = Number.parseInt(event.target.value, 10);
                      if (!Number.isFinite(parsed)) return;
                      updateDraft({ blockThreshold: Math.max(0, Math.min(100, parsed)) });
                    }}
                  />
                </div>
                <div>
                  <Label className='text-xs text-gray-400'>Schema Version</Label>
                  <Input
                    className='mt-2 h-9'
                    value={String(validationDraft.schemaVersion ?? 2)}
                    readOnly={true}
                  />
                </div>
              </div>
            </div>

            <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-sm font-semibold text-white'>Docs Connections</h3>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      applyDocsSources(DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES);
                      toast('Loaded default AI-Paths docs sources.', { variant: 'info' });
                    }}
                  >
                    Load Defaults
                  </Button>
                  <Button type='button' variant='outline' size='sm' onClick={handleApplyDocsSources}>
                    Apply Docs Sources
                  </Button>
                </div>
              </div>
              <Label className='text-xs text-gray-400'>Docs Sources (one per line)</Label>
              <Textarea
                className='mt-2 min-h-[96px]'
                value={docsSourcesDraft}
                onChange={(event) => setDocsSourcesDraft(event.target.value)}
              />

              <div className='mt-4 flex flex-wrap items-center justify-between gap-2'>
                <Label className='text-xs text-gray-400'>Node Docs Catalog</Label>
                <div className='text-xs text-gray-500'>
                  {filteredNodeDocs.length}/{AI_PATHS_NODE_DOCS.length}
                </div>
              </div>
              <SearchInput
                value={docsSearch}
                onChange={(event) => setDocsSearch(event.target.value)}
                onClear={() => setDocsSearch('')}
                placeholder='Search node docs by type, title, ports...'
                className='mt-2 h-9'
              />
              <div className='mt-3 max-h-56 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-card/30 p-2'>
                {filteredNodeDocs.map((doc) => {
                  const sourceId = `ai-paths:node-docs:${doc.type}`;
                  const docsSet = new Set(parseDocsSourcesText(docsSourcesDraft));
                  const connected = docsSet.has(sourceId);
                  return (
                    <div
                      key={doc.type}
                      className='flex items-start justify-between gap-3 rounded border border-border/50 bg-card/40 p-2'
                    >
                      <div className='min-w-0'>
                        <div className='text-xs font-semibold text-gray-100'>
                          {doc.title}
                          <span className='ml-2 text-[10px] uppercase tracking-wide text-gray-400'>
                            {doc.type}
                          </span>
                        </div>
                        <div className='line-clamp-2 text-[11px] text-gray-400'>{doc.purpose}</div>
                      </div>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 px-2 text-[11px]'
                        onClick={() => {
                          applyDocsSources([...docsSet, sourceId]);
                        }}
                      >
                        {connected ? 'Connected' : 'Connect'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-sm font-semibold text-white'>Entity Collection Map</h3>
                <Button type='button' variant='outline' size='sm' onClick={handleApplyCollectionMap}>
                  Apply Map
                </Button>
              </div>
              <Label className='text-xs text-gray-400'>Format: entity:collection</Label>
              <Textarea
                className='mt-2 min-h-[96px]'
                value={collectionMapDraft}
                onChange={(event) => setCollectionMapDraft(event.target.value)}
              />
            </div>

            <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-sm font-semibold text-white'>Patterns and Sequences</h3>
                <StatusBadge
                  status={`Active rules: ${validationDraft.rules?.length ?? 0}`}
                  variant='neutral'
                  size='sm'
                />
              </div>

              {filteredRules.length > 0 ? (
                <div className='space-y-2'>
                  {filteredRules.map((rule: AiPathsValidationRule) => (
                    <div
                      key={rule.id}
                      className='rounded-md border border-border/60 bg-card/30 p-3'
                    >
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='min-w-0'>
                          <div className='text-sm font-medium text-gray-100'>{rule.title}</div>
                          <div className='text-[11px] text-gray-500'>{rule.id}</div>
                        </div>
                        <div className='flex flex-wrap items-center gap-2'>
                          <Badge variant='outline' className='text-[10px] uppercase'>
                            {rule.module}
                          </Badge>
                          <Badge
                            variant={
                              rule.severity === 'error'
                                ? 'error'
                                : rule.severity === 'warning'
                                  ? 'warning'
                                  : 'neutral'
                            }
                            className='text-[10px] uppercase'
                          >
                            {rule.severity}
                          </Badge>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            className='h-7 px-2 text-[11px]'
                            onClick={() => handleToggleRuleEnabled(rule.id)}
                          >
                            {rule.enabled === false ? 'Disabled' : 'Enabled'}
                          </Button>
                        </div>
                      </div>
                      <div className='mt-3 grid gap-2 md:grid-cols-[140px_minmax(0,1fr)] md:items-center'>
                        <Label className='text-[11px] text-gray-400'>Sequence</Label>
                        <Input
                          defaultValue={String(rule.sequence ?? 0)}
                          className='h-8 max-w-[160px]'
                          onBlur={(event) => handleRuleSequenceBlur(rule.id, event.target.value)}
                        />
                      </div>
                      <div className='mt-2 text-[11px] text-gray-400'>
                        Conditions: {rule.conditions?.length ?? 0}
                        {rule.appliesToNodeTypes?.length ? (
                          <span className='ml-2'>
                            Node types: {rule.appliesToNodeTypes.join(', ')}
                          </span>
                        ) : null}
                      </div>
                      {rule.docsBindings?.length ? (
                        <div className='mt-2 text-[11px] text-gray-500'>
                          Docs bindings: {rule.docsBindings.join(', ')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className='rounded-md border border-border/60 bg-card/30 p-3 text-xs text-gray-500'>
                  No validation rules match the current focus filter.
                </div>
              )}

              <div className='mt-4'>
                <div className='mb-2 flex flex-wrap items-center justify-between gap-2'>
                  <Label className='text-xs text-gray-400'>Rules JSON</Label>
                  <Button type='button' variant='outline' size='sm' onClick={handleApplyRulesDraft}>
                    Apply JSON
                  </Button>
                </div>
                <Textarea
                  className='min-h-[220px] font-mono text-xs'
                  value={rulesDraft}
                  onChange={(event) => setRulesDraft(event.target.value)}
                />
                {rulesDraftError ? (
                  <div className='mt-2 text-xs text-rose-300'>{rulesDraftError}</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className='space-y-6 xl:col-span-5'>
            <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
              <div className='mb-4 flex items-center gap-2'>
                <BookOpenText className='size-4 text-sky-300' />
                <h3 className='text-sm font-semibold text-white'>Validation Preview</h3>
              </div>
              {validationReport ? (
                <div className='space-y-3'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <StatusBadge
                      status={
                        validationReport.blocked
                          ? 'Blocked'
                          : validationReport.shouldWarn
                            ? 'Warning'
                            : 'Ready'
                      }
                      variant={
                        validationReport.blocked
                          ? 'error'
                          : validationReport.shouldWarn
                            ? 'warning'
                            : 'success'
                      }
                      size='sm'
                    />
                    <StatusBadge
                      status={`Score: ${validationReport.score}`}
                      variant='neutral'
                      size='sm'
                    />
                    <StatusBadge
                      status={`Rules evaluated: ${validationReport.rulesEvaluated}`}
                      variant='neutral'
                      size='sm'
                    />
                    <StatusBadge
                      status={`Failed: ${validationReport.failedRules}`}
                      variant={validationReport.failedRules > 0 ? 'warning' : 'success'}
                      size='sm'
                    />
                  </div>

                  <div className='rounded-md border border-border/60 bg-card/30 p-3 text-xs text-gray-400'>
                    Graph nodes: {validationReport.graphStats.nodes} | edges: {validationReport.graphStats.edges}
                  </div>

                  {validationReport.findings.length > 0 ? (
                    <div className='space-y-2'>
                      {validationReport.findings.slice(0, 14).map((finding) => (
                        <div
                          key={finding.id}
                          className='rounded-md border border-amber-500/20 bg-amber-500/5 p-3'
                        >
                          <div className='flex flex-wrap items-center gap-2'>
                            <Badge
                              variant={
                                finding.severity === 'error'
                                  ? 'error'
                                  : finding.severity === 'warning'
                                    ? 'warning'
                                    : 'neutral'
                              }
                              className='text-[10px] uppercase'
                            >
                              {finding.severity}
                            </Badge>
                            <span className='text-xs font-medium text-gray-100'>
                              {finding.ruleTitle}
                            </span>
                          </div>
                          <div className='mt-1 text-[11px] text-gray-400'>{finding.message}</div>
                          {finding.recommendation ? (
                            <div className='mt-1 text-[11px] text-sky-200'>
                              {finding.recommendation}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className='rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-200'>
                      No findings. This path is ready under the current validation profile.
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-sm text-gray-400'>Select a path to preview validation.</div>
              )}
            </div>

            <div className='rounded-lg border border-border/60 bg-card/40 p-4'>
              <h3 className='text-sm font-semibold text-white'>How This Is Separate</h3>
              <ul className='mt-3 space-y-2 text-xs text-gray-400'>
                <li>Uses only AI-Paths path configs (`ai_paths_config_*`).</li>
                <li>Runs AI-Paths preflight validation against actual path nodes/edges.</li>
                <li>Builds patterns from AI-Paths docs sources and node docs bindings.</li>
                <li>Saves per-path validator profiles back into the path config.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
