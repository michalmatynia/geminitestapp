import type {
  AiPathsValidationConfig,
  AiPathsValidationRule,
} from '@/shared/types/domain/ai-paths';

export const DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES: string[] = [
  'ai-paths:node-docs',
  'ai-paths:quick-wiring',
  'ai-paths:description-flow',
  'ai-paths:jobs-flow',
  'docs/ai-paths/parameter-inference-workflow.md',
  'docs/ai-paths/description-inference-v3-longform-ui-runbook.md',
];

export const DEFAULT_AI_PATHS_ENTITY_COLLECTION_MAP: Record<string, string> = {
  product: 'products',
  note: 'notes',
};

const buildCoreRules = (): AiPathsValidationRule[] => [
  {
    id: 'graph.requires_trigger',
    title: 'Path has trigger node',
    description: 'A runnable path must include at least one Trigger node.',
    enabled: true,
    severity: 'error',
    module: 'graph',
    sequence: 10,
    conditionMode: 'all',
    conditions: [
      {
        id: 'graph-trigger-exists',
        operator: 'jsonpath_exists',
        valuePath: 'counts.byType.trigger',
      },
      {
        id: 'graph-trigger-non-empty',
        operator: 'jsonpath_equals',
        valuePath: 'counts.byType.trigger',
        expected: 1,
      },
    ],
    weight: 50,
    forceProbabilityIfFailed: 0,
    recommendation: 'Add a Trigger node and connect it to the workflow entry branch.',
    docsBindings: ['ai-paths:node-docs', 'ai-paths:quick-wiring'],
  },
  {
    id: 'simulation.requires_id_and_collection',
    title: 'Simulation requires entity ID and mapped collection',
    description:
      'Simulation nodes used for preflight/testing need an entity ID and a resolvable collection map entry.',
    enabled: true,
    severity: 'error',
    module: 'simulation',
    appliesToNodeTypes: ['simulation'],
    sequence: 20,
    conditionMode: 'all',
    conditions: [
      {
        id: 'simulation-resolves',
        operator: 'entity_collection_resolves',
      },
    ],
    weight: 60,
    forceProbabilityIfFailed: 0,
    recommendation:
      'Set Simulation.entityId (or productId) and define mapping for Simulation.entityType in Validation settings.',
    docsBindings: ['ai-paths:node-docs', 'ai-paths:quick-wiring'],
  },
  {
    id: 'database.query.collection_declared',
    title: 'Database query has collection',
    description: 'Database nodes must target a valid collection.',
    enabled: true,
    severity: 'error',
    module: 'database',
    appliesToNodeTypes: ['database'],
    sequence: 30,
    conditionMode: 'all',
    conditions: [
      {
        id: 'database-collection-exists',
        operator: 'collection_exists',
        field: 'config.database.query.collection',
      },
    ],
    weight: 35,
    recommendation:
      'Choose a known collection in Database node config or provide a valid custom collection.',
    docsBindings: ['ai-paths:node-docs', 'ai-paths:jobs-flow'],
  },
  {
    id: 'database.update.identity_wired',
    title: 'Database update/delete has identity input',
    description:
      'Write operations should have explicit identity wiring to avoid hidden fallback updates.',
    enabled: true,
    severity: 'error',
    module: 'database',
    appliesToNodeTypes: ['database'],
    sequence: 40,
    conditionMode: 'all',
    conditions: [
      {
        id: 'database-write-has-incoming-id-port',
        operator: 'has_incoming_port',
        port: 'entityId',
      },
    ],
    weight: 40,
    recommendation:
      'Wire Parser/Context output into Database.entityId (or productId) for deterministic writes.',
    docsBindings: ['ai-paths:node-docs', 'ai-paths:quick-wiring'],
  },
];

const dedupeRuleIds = (rules: AiPathsValidationRule[]): AiPathsValidationRule[] => {
  const seen = new Set<string>();
  return rules.filter((rule: AiPathsValidationRule): boolean => {
    const id = (rule.id ?? '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const buildAiPathsValidationRulesFromDocs = (
  docsSources: string[] = DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES
): AiPathsValidationRule[] => {
  const scopedDocsSources = Array.isArray(docsSources)
    ? docsSources.filter((entry: string): boolean => typeof entry === 'string' && entry.trim().length > 0)
    : [];
  const rules = buildCoreRules().map((rule: AiPathsValidationRule): AiPathsValidationRule => ({
    ...rule,
    docsBindings:
      scopedDocsSources.length > 0
        ? Array.from(new Set([...(rule.docsBindings ?? []), ...scopedDocsSources]))
        : rule.docsBindings,
  }));
  return dedupeRuleIds(rules);
};

export const DEFAULT_AI_PATHS_VALIDATION_CONFIG: AiPathsValidationConfig = {
  enabled: true,
  policy: 'block_below_threshold',
  warnThreshold: 70,
  blockThreshold: 50,
  baseScore: 100,
  collectionMap: { ...DEFAULT_AI_PATHS_ENTITY_COLLECTION_MAP },
  docsSources: [...DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES],
  rules: buildAiPathsValidationRulesFromDocs(),
};

export const normalizeAiPathsValidationConfig = (
  value: AiPathsValidationConfig | null | undefined
): AiPathsValidationConfig => {
  const source = value ?? {};
  const baseScore =
    typeof source.baseScore === 'number' && Number.isFinite(source.baseScore)
      ? Math.max(0, Math.min(100, Math.trunc(source.baseScore)))
      : DEFAULT_AI_PATHS_VALIDATION_CONFIG.baseScore;
  const warnThreshold =
    typeof source.warnThreshold === 'number' && Number.isFinite(source.warnThreshold)
      ? Math.max(0, Math.min(100, Math.trunc(source.warnThreshold)))
      : DEFAULT_AI_PATHS_VALIDATION_CONFIG.warnThreshold;
  const blockThreshold =
    typeof source.blockThreshold === 'number' && Number.isFinite(source.blockThreshold)
      ? Math.max(0, Math.min(100, Math.trunc(source.blockThreshold)))
      : DEFAULT_AI_PATHS_VALIDATION_CONFIG.blockThreshold;
  const docsSources = Array.isArray(source.docsSources)
    ? source.docsSources.filter((entry: string): boolean => typeof entry === 'string' && entry.trim().length > 0)
    : [...DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES];
  const collectionMap =
    source.collectionMap && typeof source.collectionMap === 'object'
      ? Object.fromEntries(
          Object.entries(source.collectionMap).filter(
            ([key, val]: [string, string]): boolean =>
              typeof key === 'string' && key.trim().length > 0 &&
              typeof val === 'string' && val.trim().length > 0
          )
        )
      : { ...DEFAULT_AI_PATHS_ENTITY_COLLECTION_MAP };

  const rules =
    Array.isArray(source.rules) && source.rules.length > 0
      ? dedupeRuleIds(source.rules)
      : buildAiPathsValidationRulesFromDocs(docsSources);

  return {
    enabled: source.enabled !== false,
    policy:
      source.policy === 'report_only' ||
      source.policy === 'warn_below_threshold' ||
      source.policy === 'block_below_threshold'
        ? source.policy
        : DEFAULT_AI_PATHS_VALIDATION_CONFIG.policy,
    warnThreshold,
    blockThreshold,
    baseScore,
    collectionMap,
    docsSources,
    rules,
  };
};
