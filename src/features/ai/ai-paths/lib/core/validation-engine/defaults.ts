import type {
  AiPathsValidationCondition,
  AiPathsValidationConfig,
  AiPathsValidationModule,
  AiPathsValidationRule,
  AiPathsValidationSeverity,
} from '@/shared/types/domain/ai-paths';

const VALIDATION_SEVERITIES: ReadonlySet<AiPathsValidationSeverity> =
  new Set<AiPathsValidationSeverity>(['error', 'warning', 'info']);

const VALIDATION_MODULES: ReadonlySet<AiPathsValidationModule> =
  new Set<AiPathsValidationModule>([
    'graph',
    'trigger',
    'simulation',
    'context',
    'parser',
    'database',
    'model',
    'poll',
    'router',
    'gate',
    'validation_pattern',
    'custom',
  ]);

export const AI_PATHS_VALIDATION_SCHEMA_VERSION = 2;
export const DEFAULT_AI_PATHS_VALIDATION_SCHEMA_VERSION =
  AI_PATHS_VALIDATION_SCHEMA_VERSION;

const sanitizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .filter(
          (entry: unknown): entry is string =>
            typeof entry === 'string' && entry.trim().length > 0,
        )
        .map((entry: string): string => entry.trim()),
    ),
  );
};

const sanitizeCondition = (
  rawCondition: AiPathsValidationCondition,
  index: number,
): AiPathsValidationCondition | null => {
  const id =
    typeof rawCondition.id === 'string' && rawCondition.id.trim().length > 0
      ? rawCondition.id.trim()
      : `condition_${index + 1}`;
  if (typeof rawCondition.operator !== 'string') {
    return null;
  }
  return {
    ...rawCondition,
    id,
  };
};

const sanitizeRule = (
  rawRule: AiPathsValidationRule,
  index: number,
): AiPathsValidationRule | null => {
  const id =
    typeof rawRule.id === 'string' && rawRule.id.trim().length > 0
      ? rawRule.id.trim()
      : '';
  const title =
    typeof rawRule.title === 'string' && rawRule.title.trim().length > 0
      ? rawRule.title.trim()
      : '';
  if (!id || !title) return null;

  const module = VALIDATION_MODULES.has(rawRule.module)
    ? rawRule.module
    : 'custom';
  const severity = VALIDATION_SEVERITIES.has(rawRule.severity)
    ? rawRule.severity
    : 'warning';
  const sequence =
    typeof rawRule.sequence === 'number' && Number.isFinite(rawRule.sequence)
      ? Math.trunc(rawRule.sequence)
      : (index + 1) * 10;
  const conditions = Array.isArray(rawRule.conditions)
    ? rawRule.conditions
      .map((condition: AiPathsValidationCondition, conditionIndex: number) =>
        sanitizeCondition(condition, conditionIndex),
      )
      .filter(
        (
          condition: AiPathsValidationCondition | null,
        ): condition is AiPathsValidationCondition => Boolean(condition),
      )
    : [];

  if (conditions.length === 0) return null;

  const appliesToNodeTypes = sanitizeStringArray(rawRule.appliesToNodeTypes);
  const docsBindings = sanitizeStringArray(rawRule.docsBindings);

  return {
    ...rawRule,
    id,
    title,
    enabled: rawRule.enabled !== false,
    module,
    severity,
    sequence,
    conditionMode: rawRule.conditionMode === 'any' ? 'any' : 'all',
    appliesToNodeTypes:
      appliesToNodeTypes.length > 0 ? appliesToNodeTypes : undefined,
    docsBindings: docsBindings.length > 0 ? docsBindings : undefined,
    conditions,
  };
};

const dedupeRuleIds = (rules: AiPathsValidationRule[]): AiPathsValidationRule[] => {
  const seen = new Set<string>();
  return rules.filter((rule: AiPathsValidationRule): boolean => {
    const id = (rule.id ?? '').trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const sanitizeRules = (rules: AiPathsValidationRule[]): AiPathsValidationRule[] =>
  dedupeRuleIds(
    rules
      .map((rule: AiPathsValidationRule, index: number) =>
        sanitizeRule(rule, index),
      )
      .filter(
        (rule: AiPathsValidationRule | null): rule is AiPathsValidationRule =>
          Boolean(rule),
      ),
  );

export const createAiPathsValidationRuleId = (
  title: string,
  existingRuleIds: Iterable<string>,
): string => {
  const normalizedBase = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  const base = normalizedBase.length > 0 ? normalizedBase : 'rule';
  const existing = new Set<string>();
  for (const entry of existingRuleIds) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      existing.add(entry.trim());
    }
  }
  if (!existing.has(base)) return base;

  let suffix = 2;
  while (suffix <= 9999) {
    const candidate = `${base}_${suffix}`;
    if (!existing.has(candidate)) return candidate;
    suffix += 1;
  }

  return `${base}_${Date.now().toString(36)}`;
};

export const createAiPathsValidationConditionId = (
  operator: string,
  existingConditionIds: Iterable<string>,
): string => {
  const normalizedOperator = operator
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  const base = normalizedOperator.length > 0 ? normalizedOperator : 'condition';

  const existing = new Set<string>();
  for (const entry of existingConditionIds) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      existing.add(entry.trim());
    }
  }
  if (!existing.has(base)) return base;

  let suffix = 2;
  while (suffix <= 9999) {
    const candidate = `${base}_${suffix}`;
    if (!existing.has(candidate)) return candidate;
    suffix += 1;
  }

  return `${base}_${Date.now().toString(36)}`;
};

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
    conditionMode: 'any',
    conditions: [
      {
        id: 'database-op-is-not-write',
        operator: 'in',
        field: 'config.database.operation',
        list: ['update', 'delete'],
        negate: true,
      },
      {
        id: 'database-write-has-incoming-id-port',
        operator: 'has_incoming_port',
        port: 'entityId',
      },
      {
        id: 'database-write-has-incoming-product-id-port',
        operator: 'has_incoming_port',
        port: 'productId',
      },
    ],
    weight: 40,
    recommendation:
      'Wire Parser/Context output into Database.entityId (or productId) for deterministic writes.',
    docsBindings: ['ai-paths:node-docs', 'ai-paths:quick-wiring'],
  },
];

export const buildAiPathsValidationRulesFromDocs = (
  docsSources: string[] = DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES,
): AiPathsValidationRule[] => {
  const scopedDocsSources = sanitizeStringArray(docsSources);
  const rules = buildCoreRules().map(
    (rule: AiPathsValidationRule): AiPathsValidationRule => ({
      ...rule,
      docsBindings:
        scopedDocsSources.length > 0
          ? Array.from(new Set([...(rule.docsBindings ?? []), ...scopedDocsSources]))
          : rule.docsBindings,
    }),
  );
  return sanitizeRules(rules);
};

export const DEFAULT_AI_PATHS_VALIDATION_CONFIG: AiPathsValidationConfig = {
  schemaVersion: AI_PATHS_VALIDATION_SCHEMA_VERSION,
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
  value: AiPathsValidationConfig | null | undefined,
): AiPathsValidationConfig => {
  const source = value ?? {};
  const legacySchemaVersion =
    typeof source.schemaVersion === 'number' &&
    Number.isInteger(source.schemaVersion) &&
    source.schemaVersion > 0
      ? source.schemaVersion
      : 1;

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

  const parsedDocsSources = sanitizeStringArray(source.docsSources);
  const docsSources =
    parsedDocsSources.length > 0
      ? parsedDocsSources
      : [...DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES];

  const collectionMap =
    source.collectionMap && typeof source.collectionMap === 'object'
      ? (Object.fromEntries(
        Object.entries(source.collectionMap as Record<string, unknown>).filter(
          ([key, val]: [string, unknown]): boolean =>
            typeof key === 'string' &&
              key.trim().length > 0 &&
              typeof val === 'string' &&
              val.trim().length > 0,
        ),
      ) as Record<string, string>)
      : { ...DEFAULT_AI_PATHS_ENTITY_COLLECTION_MAP };

  const sanitizedRules =
    Array.isArray(source.rules) && source.rules.length > 0
      ? sanitizeRules(source.rules)
      : [];
  const rules =
    sanitizedRules.length > 0
      ? sanitizedRules
      : buildAiPathsValidationRulesFromDocs(docsSources);

  const lastEvaluatedAt =
    typeof source.lastEvaluatedAt === 'string' &&
    source.lastEvaluatedAt.trim().length > 0
      ? source.lastEvaluatedAt
      : null;

  return {
    schemaVersion: AI_PATHS_VALIDATION_SCHEMA_VERSION,
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
    lastEvaluatedAt:
      legacySchemaVersion < AI_PATHS_VALIDATION_SCHEMA_VERSION
        ? null
        : lastEvaluatedAt,
  };
};
