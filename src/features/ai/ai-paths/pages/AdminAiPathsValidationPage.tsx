'use client';

import { BookOpenText, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import {
  useAiPathsSettingsQuery,
} from '@/features/ai/ai-paths/hooks/useAiPathQueries';
import type {
  AiPathsValidationConfig,
  AiPathsValidationRule,
  PathConfig,
  PathMeta,
} from '@/features/ai/ai-paths/lib';
import {
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
} from '@/features/ai/ai-paths/lib/core/constants';
import {
  AI_PATHS_NODE_DOCS as NODE_DOCS_LIST,
  type AiPathsNodeDoc,
} from '@/features/ai/ai-paths/lib/core/docs/node-docs';
import { createDefaultPathConfig } from '@/features/ai/ai-paths/lib/core/utils/factory';
import {
  approveInferredAiPathsValidationRule,
  buildAiPathsValidationRulesFromDocs,
  DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES,
  evaluateAiPathsValidationPreflight,
  normalizeAiPathsValidationConfig,
  rejectInferredAiPathsValidationRule,
  type AiPathsValidationFinding,
} from '@/features/ai/ai-paths/lib/core/validation-engine';
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
  Card,
  Hint,
} from '@/shared/ui';

type SettingsRecord = { key: string; value: string };

type ParsedAiPathsSettings = {
  pathMetas: PathMeta[];
  pathConfigs: Record<string, PathConfig>;
};

type RuleParseResult =
  | { ok: true; value: AiPathsValidationRule[] }
  | { ok: false; error: string };

type CentralDocsSnapshotSource = {
  id: string;
  path: string;
  type: string;
  hash: string;
  assertionCount: number;
  priority?: number | undefined;
  tags?: string[] | undefined;
  snippetNames?: string[] | undefined;
};

type CentralDocsSnapshotPayload = {
  generatedAt: string;
  snapshotHash: string;
  warnings: string[];
  sources: CentralDocsSnapshotSource[];
};

type CentralDocsSnapshotResponse = {
  snapshot: CentralDocsSnapshotPayload;
  inferredCandidates: AiPathsValidationRule[];
};

type CandidateChangeKind = 'new' | 'changed' | 'existing';

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

const uniqueStringList = (values: string[]): string[] =>
  Array.from(
    new Set(
      values
        .map((value: string): string => value.trim())
        .filter((value: string): boolean => value.length > 0),
    ),
  );

const getAssertionIdFromRule = (rule: AiPathsValidationRule): string | null => {
  const value = rule.inference?.assertionId;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const getSourceHashFromRule = (rule: AiPathsValidationRule): string | null => {
  const value = rule.inference?.sourceHash;
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const getCandidateTags = (rule: AiPathsValidationRule): string[] =>
  uniqueStringList(rule.inference?.tags ?? []);

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
  const [candidateTagFilter, setCandidateTagFilter] = useState<string>('all');
  const [candidateModuleFilter, setCandidateModuleFilter] = useState<string>('all');
  const [saving, setSaving] = useState<boolean>(false);
  const [syncingCentralDocs, setSyncingCentralDocs] = useState<boolean>(false);
  const [centralSnapshot, setCentralSnapshot] =
    useState<CentralDocsSnapshotPayload | null>(null);

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
    setCentralSnapshot(null);
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
    if (!query) return NODE_DOCS_LIST;
    return NODE_DOCS_LIST.filter((doc: AiPathsNodeDoc) => {
      const haystack = [
        doc.type,
        doc.title,
        doc.purpose,
        doc.inputs.join(' '),
        doc.outputs.join(' '),
        doc.config.map((entry: { path: string; description: string }) => `${entry.path} ${entry.description}`).join(' '),
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

  const inferredCandidates = useMemo(
    () => [...(validationDraft.inferredCandidates ?? [])],
    [validationDraft.inferredCandidates],
  );
  const centralRuleByAssertionId = useMemo(() => {
    const map = new Map<string, AiPathsValidationRule>();
    (validationDraft.rules ?? []).forEach((rule: AiPathsValidationRule) => {
      const assertionId = getAssertionIdFromRule(rule);
      if (!assertionId) return;
      map.set(assertionId, rule);
    });
    return map;
  }, [validationDraft.rules]);

  const candidateChangeKindById = useMemo(() => {
    const map = new Map<string, CandidateChangeKind>();
    inferredCandidates.forEach((rule: AiPathsValidationRule) => {
      const assertionId = getAssertionIdFromRule(rule);
      if (!assertionId) {
        map.set(rule.id, 'new');
        return;
      }
      const existing = centralRuleByAssertionId.get(assertionId);
      if (!existing) {
        map.set(rule.id, 'new');
        return;
      }
      const nextSourceHash = getSourceHashFromRule(rule);
      const previousSourceHash = getSourceHashFromRule(existing);
      if (nextSourceHash && previousSourceHash && nextSourceHash !== previousSourceHash) {
        map.set(rule.id, 'changed');
        return;
      }
      map.set(rule.id, 'existing');
    });
    return map;
  }, [centralRuleByAssertionId, inferredCandidates]);

  const candidateModuleOptions = useMemo(
    () =>
      [
        { value: 'all', label: 'All Modules' },
        ...Array.from(
          new Set(
            inferredCandidates.map((rule: AiPathsValidationRule): string => rule.module),
          ),
        )
          .sort((left: string, right: string) => left.localeCompare(right))
          .map((module: string) => ({
            value: module,
            label: module,
          })),
      ] satisfies Array<{ value: string; label: string }>,
    [inferredCandidates],
  );

  const candidateTagOptions = useMemo(
    () =>
      [
        { value: 'all', label: 'All Tags' },
        ...Array.from(
          new Set(
            inferredCandidates.flatMap((rule: AiPathsValidationRule): string[] =>
              getCandidateTags(rule),
            ),
          ),
        )
          .sort((left: string, right: string) => left.localeCompare(right))
          .map((tag: string) => ({
            value: tag,
            label: tag,
          })),
      ] satisfies Array<{ value: string; label: string }>,
    [inferredCandidates],
  );

  const candidateRules = useMemo(
    () =>
      inferredCandidates
        .filter(
          (rule: AiPathsValidationRule): boolean =>
            (rule.inference?.status ?? 'candidate') === 'candidate',
        )
        .filter((rule: AiPathsValidationRule): boolean => {
          if (candidateModuleFilter === 'all') return true;
          return rule.module === candidateModuleFilter;
        })
        .filter((rule: AiPathsValidationRule): boolean => {
          if (candidateTagFilter === 'all') return true;
          return getCandidateTags(rule).includes(candidateTagFilter);
        })
        .sort((left, right) => left.id.localeCompare(right.id)),
    [candidateModuleFilter, candidateTagFilter, inferredCandidates],
  );
  const rejectedCandidates = useMemo(
    () =>
      inferredCandidates
        .filter(
          (rule: AiPathsValidationRule): boolean =>
            (rule.inference?.status ?? 'candidate') === 'rejected',
        )
        .sort((left, right) => left.id.localeCompare(right.id)),
    [inferredCandidates],
  );

  const candidateChangeStats = useMemo(() => {
    const stats = { new: 0, changed: 0, existing: 0 };
    candidateRules.forEach((rule: AiPathsValidationRule) => {
      const kind = candidateChangeKindById.get(rule.id) ?? 'new';
      stats[kind] += 1;
    });
    return stats;
  }, [candidateChangeKindById, candidateRules]);

  const validatorCoverage = useMemo(() => {
    const coveredNodeTypes = new Set<string>();
    (validationDraft.rules ?? [])
      .filter((rule: AiPathsValidationRule): boolean => rule.enabled !== false)
      .forEach((rule: AiPathsValidationRule) => {
        (rule.appliesToNodeTypes ?? []).forEach((nodeType: string) =>
          coveredNodeTypes.add(nodeType),
        );
      });
    const docsNodeTypes = NODE_DOCS_LIST.map((doc: AiPathsNodeDoc) => doc.type);
    const uncoveredNodeTypes = docsNodeTypes.filter(
      (nodeType: string): boolean => !coveredNodeTypes.has(nodeType),
    );
    return {
      coveredCount: coveredNodeTypes.size,
      totalCount: docsNodeTypes.length,
      uncoveredNodeTypes,
    };
  }, [validationDraft.rules]);
  const syncWarnings = validationDraft.docsSyncState?.lastSyncWarnings ?? [];

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

  const setDraftRules = (nextRules: AiPathsValidationRule[]): void => {
    updateDraft({ rules: nextRules });
    setRulesDraft(JSON.stringify(nextRules, null, 2));
    setRulesDraftError(null);
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
    setDraftRules(parsed.value);
    toast(`Applied ${parsed.value.length} validation rules.`, { variant: 'success' });
    return true;
  };

  const handleRebuildRulesFromDocs = (): void => {
    const scopedSources = parseDocsSourcesText(docsSourcesDraft);
    const rebuiltRules = buildAiPathsValidationRulesFromDocs(scopedSources);
    updateDraft({
      docsSources: scopedSources,
      rules: rebuiltRules,
    });
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
    const nextRules = (validationDraft.rules ?? []).map((rule: AiPathsValidationRule) =>
      rule.id === ruleId ? { ...rule, enabled: rule.enabled === false } : rule,
    );
    setDraftRules(nextRules);
  };

  const handleRuleSequenceBlur = (ruleId: string, rawValue: string): void => {
    const parsed = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsed)) return;
    const nextRules = (validationDraft.rules ?? []).map((rule: AiPathsValidationRule) =>
      rule.id === ruleId ? { ...rule, sequence: parsed } : rule,
    );
    setDraftRules(nextRules);
  };

  const handleSyncFromCentralDocs = async (): Promise<void> => {
    setSyncingCentralDocs(true);
    try {
      const response = await fetch('/api/ai-paths/validation/docs-snapshot', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`Central docs sync failed (${response.status}).`);
      }
      const payload = (await response.json()) as CentralDocsSnapshotResponse;
      if (!payload?.snapshot || !Array.isArray(payload?.inferredCandidates)) {
        throw new Error('Central docs sync returned invalid payload.');
      }

      const rejectedAssertionIds = new Set<string>(
        (validationDraft.inferredCandidates ?? [])
          .filter(
            (rule: AiPathsValidationRule): boolean =>
              rule.inference?.status === 'rejected',
          )
          .map((rule: AiPathsValidationRule): string | null => {
            const assertionId = rule.inference?.assertionId;
            return typeof assertionId === 'string' && assertionId.trim().length > 0
              ? assertionId.trim()
              : null;
          })
          .filter((value: string | null): value is string => Boolean(value)),
      );

      const mergedCandidates = payload.inferredCandidates.map(
        (candidate: AiPathsValidationRule): AiPathsValidationRule => {
          const assertionId = candidate.inference?.assertionId ?? null;
          if (!assertionId || !rejectedAssertionIds.has(assertionId)) {
            return candidate;
          }
          return rejectInferredAiPathsValidationRule(
            candidate,
            'Previously rejected during docs sync review.',
          );
        },
      );

      const incomingByAssertionId = new Map<string, AiPathsValidationRule>();
      mergedCandidates.forEach((candidate: AiPathsValidationRule) => {
        const assertionId = getAssertionIdFromRule(candidate);
        if (!assertionId) return;
        incomingByAssertionId.set(assertionId, candidate);
      });

      const previousRules = [...(validationDraft.rules ?? [])];
      const nextRules = [...previousRules];
      const autoDeprecatedRuleIds = new Set<string>();
      const staleWarnings: string[] = [];

      mergedCandidates.forEach((candidate: AiPathsValidationRule) => {
        const deprecates = uniqueStringList(candidate.inference?.deprecates ?? []);
        if (deprecates.length === 0) return;
        const assertionId = getAssertionIdFromRule(candidate) ?? candidate.id;
        deprecates.forEach((deprecatedAssertionId: string) => {
          const index = nextRules.findIndex(
            (rule: AiPathsValidationRule): boolean =>
              getAssertionIdFromRule(rule) === deprecatedAssertionId,
          );
          if (index < 0) return;
          const targetRule = nextRules[index];
          if (!targetRule) return;
          autoDeprecatedRuleIds.add(targetRule.id);
          nextRules[index] = {            ...targetRule,
            enabled: false,
            inference: {
              ...(targetRule.inference ?? {}),
              sourceType: targetRule.inference?.sourceType ?? 'central_docs',
              status: 'deprecated',
              reviewNote: `Deprecated by assertion ${assertionId}.`,
            },
          };
          staleWarnings.push(
            `Rule "${targetRule.title}" is deprecated by central assertion "${assertionId}".`,
          );
        });
      });

      previousRules.forEach((rule: AiPathsValidationRule) => {
        if (rule.inference?.sourceType !== 'central_docs') return;
        const assertionId = getAssertionIdFromRule(rule);
        if (!assertionId) return;
        const incoming = incomingByAssertionId.get(assertionId);
        if (!incoming) {
          if (!autoDeprecatedRuleIds.has(rule.id)) {
            staleWarnings.push(
              `Rule "${rule.title}" is no longer present in central docs snapshot.`,
            );
          }
          return;
        }
        const previousHash = getSourceHashFromRule(rule);
        const incomingHash = getSourceHashFromRule(incoming);
        if (previousHash && incomingHash && previousHash !== incomingHash) {
          staleWarnings.push(
            `Rule "${rule.title}" changed in central docs and should be reviewed.`,
          );
        }
      });

      const combinedWarnings = uniqueStringList([
        ...payload.snapshot.warnings,
        ...staleWarnings,
      ]);

      if (JSON.stringify(nextRules) !== JSON.stringify(previousRules)) {
        setDraftRules(nextRules);
      }

      setCentralSnapshot(payload.snapshot);
      updateDraft({
        inferredCandidates: mergedCandidates,
        docsSyncState: {
          lastSnapshotHash: payload.snapshot.snapshotHash,
          lastSyncedAt: payload.snapshot.generatedAt,
          lastSyncStatus: combinedWarnings.length > 0 ? 'warning' : 'success',
          lastSyncWarnings: combinedWarnings,
          sourceCount: payload.snapshot.sources.length,
          candidateCount: mergedCandidates.filter(
            (rule: AiPathsValidationRule): boolean =>
              (rule.inference?.status ?? 'candidate') === 'candidate',
          ).length,
        },
      });
      toast(
        `Synced ${mergedCandidates.length} inferred validation candidates from central docs.`,
        { variant: combinedWarnings.length > 0 ? 'warning' : 'success' },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync central docs.';
      updateDraft({
        docsSyncState: {
          ...(validationDraft.docsSyncState ?? {}),
          lastSyncStatus: 'error',
          lastSyncWarnings: [message],
        },
      });
      toast(message, { variant: 'error' });
    } finally {
      setSyncingCentralDocs(false);
    }
  };

  const handleApproveCandidate = (candidateRuleId: string): void => {
    const candidates = validationDraft.inferredCandidates ?? [];
    const candidate = candidates.find(
      (rule: AiPathsValidationRule): boolean => rule.id === candidateRuleId,
    );
    if (!candidate) return;
    const approved = approveInferredAiPathsValidationRule(candidate);
    const nextRules = [...(validationDraft.rules ?? [])];
    const existingRuleIndex = nextRules.findIndex(
      (rule: AiPathsValidationRule): boolean => rule.id === approved.id,
    );
    if (existingRuleIndex >= 0) {
      nextRules[existingRuleIndex] = approved;
    } else {
      nextRules.push(approved);
    }
    const nextCandidates = candidates.filter(
      (rule: AiPathsValidationRule): boolean => rule.id !== candidateRuleId,
    );
    setDraftRules(nextRules);
    updateDraft({
      inferredCandidates: nextCandidates,
      docsSyncState: {
        ...(validationDraft.docsSyncState ?? {}),
        candidateCount: nextCandidates.filter(
          (rule: AiPathsValidationRule): boolean =>
            (rule.inference?.status ?? 'candidate') === 'candidate',
        ).length,
      },
    });
    toast(`Approved inferred rule "${approved.title}".`, { variant: 'success' });
  };

  const handleRejectCandidate = (candidateRuleId: string): void => {
    const nextCandidates = (validationDraft.inferredCandidates ?? []).map(
      (rule: AiPathsValidationRule): AiPathsValidationRule =>
        rule.id === candidateRuleId
          ? rejectInferredAiPathsValidationRule(rule)
          : rule,
    );
    updateDraft({
      inferredCandidates: nextCandidates,
      docsSyncState: {
        ...(validationDraft.docsSyncState ?? {}),
        candidateCount: nextCandidates.filter(
          (rule: AiPathsValidationRule): boolean =>
            (rule.inference?.status ?? 'candidate') === 'candidate',
        ).length,
      },
    });
    toast('Candidate marked as rejected.', { variant: 'info' });
  };

  const handleApproveAllCandidates = (): void => {
    if (candidateRules.length === 0) return;
    const approvedRules = candidateRules.map((rule: AiPathsValidationRule) =>
      approveInferredAiPathsValidationRule(rule),
    );
    const approvedRuleIds = new Set<string>(
      approvedRules.map((rule: AiPathsValidationRule): string => rule.id),
    );
    const nextRules = [...(validationDraft.rules ?? [])];
    approvedRules.forEach((approvedRule: AiPathsValidationRule) => {
      const index = nextRules.findIndex(
        (existingRule: AiPathsValidationRule): boolean =>
          existingRule.id === approvedRule.id,
      );
      if (index >= 0) {
        nextRules[index] = approvedRule;
      } else {
        nextRules.push(approvedRule);
      }
    });
    const nextCandidates = (validationDraft.inferredCandidates ?? []).filter(
      (rule: AiPathsValidationRule): boolean =>
        !approvedRuleIds.has(rule.id),
    );
    setDraftRules(nextRules);
    updateDraft({
      inferredCandidates: nextCandidates,
      docsSyncState: {
        ...(validationDraft.docsSyncState ?? {}),
        candidateCount: 0,
      },
    });
    toast(`Approved ${approvedRules.length} visible inferred rules.`, {
      variant: 'success',
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!selectedPathConfig || !selectedPathId) return;
    const normalizedRulesText = JSON.stringify(validationDraft.rules ?? [], null, 2).trim();
    const rulesDraftText = rulesDraft.trim();
    const rulesFromDraft =
      rulesDraftText.length > 0 && rulesDraftText !== normalizedRulesText
        ? parseRulesDraft(rulesDraft)
        : null;
    if (rulesFromDraft && !rulesFromDraft.ok) {
      setRulesDraftError(rulesFromDraft.error);
      toast(rulesFromDraft.error, { variant: 'error' });
      return;
    }
    const effectiveRules =
      rulesFromDraft?.ok
        ? rulesFromDraft.value
        : validationDraft.rules ?? [];

    const now = new Date().toISOString();
    const nextValidation = normalizeAiPathsValidationConfig({
      ...validationDraft,
      docsSources: parseDocsSourcesText(docsSourcesDraft),
      collectionMap: parseCollectionMapText(collectionMapDraft),
      rules: effectiveRules,
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

      <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
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
            loading={saving}
            disabled={!selectedPathConfig}
            className='gap-2'
          >
            <Save className='size-3.5' />
            Save Node Validator
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
          <StatusBadge
            status={`Docs sync: ${validationDraft.docsSyncState?.lastSyncStatus ?? 'idle'}`}
            variant={
              validationDraft.docsSyncState?.lastSyncStatus === 'error'
                ? 'error'
                : validationDraft.docsSyncState?.lastSyncStatus === 'warning'
                  ? 'warning'
                  : validationDraft.docsSyncState?.lastSyncStatus === 'success'
                    ? 'success'
                    : 'neutral'
            }
            size='sm'
          />
          <StatusBadge
            status={`Candidates: ${candidateRules.length}`}
            variant={candidateRules.length > 0 ? 'warning' : 'neutral'}
            size='sm'
          />
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
      </Card>

      {!selectedPathConfig ? (
        <Card variant='subtle' padding='lg' className='border-border/60 bg-card/40 text-sm text-gray-400'>
          No AI Path config found for the selected path.
        </Card>
      ) : (
        <div className='grid gap-6 xl:grid-cols-12'>
          <div className='space-y-6 xl:col-span-7'>
            <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
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
            </Card>

            <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
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
                  {filteredNodeDocs.length}/{NODE_DOCS_LIST.length}
                </div>
              </div>
              <SearchInput
                value={docsSearch}
                onChange={(event) => setDocsSearch(event.target.value)}
                onClear={() => setDocsSearch('')}
                placeholder='Search node docs by type, title, ports...'
                className='mt-2 h-9'
              />
              <Card variant='subtle-compact' padding='sm' className='mt-3 max-h-56 space-y-2 overflow-y-auto border-border/60 bg-card/30'>
                {filteredNodeDocs.map((doc) => {
                  const sourceId = `ai-paths:node-docs:${doc.type}`;
                  const docsSet = new Set(parseDocsSourcesText(docsSourcesDraft));
                  const connected = docsSet.has(sourceId);
                  return (
                    <Card
                      key={doc.type}
                      variant='subtle-compact'
                      padding='sm'
                      className='flex items-start justify-between gap-3 border-border/50 bg-card/40'
                    >
                      <div className='min-w-0'>
                        <div className='text-xs font-semibold text-gray-100'>
                          {doc.title}
                          <Hint size='xxs' uppercase className='ml-2 text-gray-400'>
                            {doc.type}
                          </Hint>
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
                    </Card>
                  );
                })}
              </Card>
            </Card>

            <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
              <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                <h3 className='text-sm font-semibold text-white'>
                  Central Docs Inference Sync
                </h3>
                <div className='flex items-center gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      void handleSyncFromCentralDocs();
                    }}
                    loading={syncingCentralDocs}
                  >
                    Sync From Central Docs
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleApproveAllCandidates}
                    disabled={candidateRules.length === 0}
                  >
                    Approve Visible Candidates
                  </Button>
                </div>
              </div>

              <div className='mb-3 flex flex-wrap items-center gap-2'>
                <StatusBadge
                  status={`Snapshot: ${validationDraft.docsSyncState?.lastSnapshotHash?.slice(0, 12) ?? 'none'}`}
                  variant='neutral'
                  size='sm'
                />
                <StatusBadge
                  status={`Sources: ${validationDraft.docsSyncState?.sourceCount ?? 0}`}
                  variant='neutral'
                  size='sm'
                />
                <StatusBadge
                  status={`Candidates: ${candidateRules.length}`}
                  variant={candidateRules.length > 0 ? 'warning' : 'success'}
                  size='sm'
                />
                <StatusBadge
                  status={`New: ${candidateChangeStats.new}`}
                  variant={candidateChangeStats.new > 0 ? 'warning' : 'neutral'}
                  size='sm'
                />
                <StatusBadge
                  status={`Changed: ${candidateChangeStats.changed}`}
                  variant={candidateChangeStats.changed > 0 ? 'warning' : 'neutral'}
                  size='sm'
                />
                <StatusBadge
                  status={`Rejected: ${rejectedCandidates.length}`}
                  variant={rejectedCandidates.length > 0 ? 'warning' : 'neutral'}
                  size='sm'
                />
                <StatusBadge
                  status={`Coverage: ${validatorCoverage.coveredCount}/${validatorCoverage.totalCount}`}
                  variant={
                    validatorCoverage.coveredCount >= validatorCoverage.totalCount
                      ? 'success'
                      : 'warning'
                  }
                  size='sm'
                />
              </div>

              {validatorCoverage.uncoveredNodeTypes.length > 0 ? (
                <div className='mb-3 text-[11px] text-gray-500'>
                  Uncovered node types:{' '}
                  {validatorCoverage.uncoveredNodeTypes.slice(0, 10).join(', ')}
                  {validatorCoverage.uncoveredNodeTypes.length > 10 ? ' …' : ''}
                </div>
              ) : null}

              {syncWarnings.length > 0 ? (
                <Card variant='warning' padding='sm' className='mb-3 space-y-1 text-[11px]'>
                  {syncWarnings.map((warning, index) => (
                    <div key={`${warning}-${index}`}>{warning}</div>
                  ))}
                </Card>
              ) : null}

              {centralSnapshot?.sources?.length ? (
                <Card variant='subtle-compact' padding='sm' className='mb-3 max-h-28 space-y-1 overflow-y-auto border-border/60 bg-card/30'>
                  {centralSnapshot.sources.map((source) => (
                    <div
                      key={`${source.id}:${source.hash}`}
                      className='flex flex-wrap items-center justify-between gap-2 text-[11px]'
                    >
                      <span className='text-gray-300'>{source.path}</span>
                      <span className='text-gray-500'>
                        {source.assertionCount} assertions
                        {typeof source.priority === 'number' ? ` · p${source.priority}` : ''}
                      </span>
                    </div>
                  ))}
                </Card>
              ) : null}

              <div className='mb-3 grid gap-2 sm:grid-cols-2'>
                <SelectSimple
                  value={candidateModuleFilter}
                  onValueChange={(value: string) =>
                    setCandidateModuleFilter(value || 'all')
                  }
                  options={candidateModuleOptions}
                  ariaLabel='Filter candidates by module'
                />
                <SelectSimple
                  value={candidateTagFilter}
                  onValueChange={(value: string) =>
                    setCandidateTagFilter(value || 'all')
                  }
                  options={candidateTagOptions}
                  ariaLabel='Filter candidates by tag'
                />
              </div>
              <div className='space-y-2'>
                <Hint size='xs' uppercase={false} className='font-medium text-gray-300'>
                  Inferred Candidates ({candidateRules.length})
                </Hint>
                {candidateRules.length > 0 ? (
                  <Card variant='subtle-compact' padding='sm' className='max-h-60 space-y-2 overflow-y-auto border-border/60 bg-card/30'>
                    {candidateRules.map((rule: AiPathsValidationRule) => (
                      <Card
                        key={rule.id}
                        variant='subtle-compact'
                        padding='sm'
                        className='border-border/50 bg-card/40'
                      >
                        <div className='flex flex-wrap items-start justify-between gap-2'>
                          <div className='min-w-0'>
                            <div className='text-xs font-medium text-gray-100'>
                              {rule.title}
                            </div>
                            <div className='text-[10px] text-gray-500'>{rule.id}</div>
                            <div className='text-[10px] text-gray-500'>
                              {rule.inference?.sourcePath ?? 'central docs'}
                            </div>
                            <div className='mt-1 flex flex-wrap items-center gap-1'>
                              <Badge variant='outline' className='text-[10px] uppercase'>
                                {rule.module}
                              </Badge>
                              <Badge
                                variant={
                                  (candidateChangeKindById.get(rule.id) ?? 'new') === 'changed'
                                    ? 'warning'
                                    : (candidateChangeKindById.get(rule.id) ?? 'new') === 'new'
                                      ? 'warning'
                                      : 'neutral'
                                }
                                className='text-[10px] uppercase'
                              >
                                {candidateChangeKindById.get(rule.id) ?? 'new'}
                              </Badge>
                              {getCandidateTags(rule).slice(0, 3).map((tag: string) => (
                                <Badge key={`${rule.id}:${tag}`} variant='outline' className='text-[10px]'>
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className='flex items-center gap-1'>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-7 px-2 text-[11px]'
                              onClick={() => handleApproveCandidate(rule.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              type='button'
                              variant='outline'
                              size='sm'
                              className='h-7 px-2 text-[11px]'
                              onClick={() => handleRejectCandidate(rule.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </Card>
                ) : (
                  <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30 text-xs text-gray-500'>
                    Sync from central docs to generate inference candidates.
                  </Card>
                )}
              </div>

              {rejectedCandidates.length > 0 ? (
                <Card variant='subtle-compact' padding='sm' className='mt-3 space-y-1 border-border/60 bg-card/30'>
                  <div className='text-[11px] font-medium text-gray-300'>
                    Rejected candidates
                  </div>
                  <div className='max-h-20 space-y-1 overflow-y-auto'>
                    {rejectedCandidates.map((rule: AiPathsValidationRule) => (
                      <div key={rule.id} className='text-[10px] text-gray-500'>
                        {rule.title} ({rule.id})
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}
            </Card>

            <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
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
            </Card>

            <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
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
                    <Card
                      key={rule.id}
                      variant='subtle-compact'
                      padding='md'
                      className='border-border/60 bg-card/30'
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
                    </Card>
                  ))}
                </div>
              ) : (
                <Card variant='subtle-compact' padding='md' className='border-border/60 bg-card/30 text-xs text-gray-500'>
                  No validation rules match the current focus filter.
                </Card>
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
            </Card>
          </div>

          <div className='space-y-6 xl:col-span-5'>
            <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
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

                  <Card variant='subtle-compact' padding='sm' className='border-border/60 bg-card/30 text-xs text-gray-400'>
                    Graph nodes: {validationReport.graphStats.nodes} | edges: {validationReport.graphStats.edges}
                  </Card>

                  {validationReport.findings.length > 0 ? (
                    <div className='space-y-2'>
                      {validationReport.findings.slice(0, 14).map((finding: AiPathsValidationFinding) => (
                        <Card
                          key={finding.id}
                          variant='warning'
                          padding='sm'
                          className='border-amber-500/20 bg-amber-500/5'
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
                            <Hint size='xs' uppercase={false} className='font-medium text-gray-100'>
                              {finding.ruleTitle}
                            </Hint>
                          </div>                          <div className='mt-1 text-[11px] text-gray-400'>{finding.message}</div>
                          {finding.recommendation ? (
                            <div className='mt-1 text-[11px] text-sky-200'>
                              {finding.recommendation}
                            </div>
                          ) : null}
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card variant='subtle-compact' padding='sm' className='border-emerald-500/20 bg-emerald-500/5 text-xs text-emerald-200'>
                      No findings. This path is ready under the current validation profile.
                    </Card>
                  )}
                </div>
              ) : (
                <div className='text-sm text-gray-400'>Select a path to preview validation.</div>
              )}
            </Card>

            <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
              <h3 className='text-sm font-semibold text-white'>How This Is Separate</h3>
              <ul className='mt-3 space-y-2 text-xs text-gray-400'>
                <li>Uses only AI-Paths path configs (`ai_paths_config_*`).</li>
                <li>Runs AI-Paths preflight validation against actual path nodes/edges.</li>
                <li>Builds patterns from AI-Paths docs sources and node docs bindings.</li>
                <li>Saves per-path validator profiles back into the path config.</li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
