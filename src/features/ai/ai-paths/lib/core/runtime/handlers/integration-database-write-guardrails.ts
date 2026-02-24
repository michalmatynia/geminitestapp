import type {
  DatabaseConfig,
  DatabaseGuardrailMeta,
  DatabaseOperation,
  DatabaseWriteOutcome,
  DatabaseWriteZeroAffectedPolicy,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';

type WriteTemplateSource = {
  name: string;
  template: string;
};

type WriteTemplateTokenDiagnostic = {
  template: string;
  token: string;
  root: string;
  reason: 'missing' | 'empty';
};

type WriteTemplateInspection = {
  missing: WriteTemplateTokenDiagnostic[];
  empty: WriteTemplateTokenDiagnostic[];
};

type ResolveWriteTemplateGuardrailInput = {
  templates: WriteTemplateSource[];
  templateContext: Record<string, unknown>;
  currentValue: unknown;
};

type ResolveWriteTemplateGuardrailResult =
  | { ok: true }
  | {
    ok: false;
    message: string;
    guardrailMeta: DatabaseGuardrailMeta & {
      code: 'write-template-values';
      severity: 'error';
      details: WriteTemplateTokenDiagnostic[];
    };
  };

type ReadNumericCounters = {
  matchedCount: number | null;
  modifiedCount: number | null;
  deletedCount: number | null;
  insertedCount: number | null;
  count: number | null;
};

type EvaluateWriteOutcomeInput = {
  operation: DatabaseOperation | string;
  action?: string | null;
  result: unknown;
  policy: DatabaseWriteZeroAffectedPolicy;
};

type EvaluateWriteOutcomeResult = {
  writeOutcome: DatabaseWriteOutcome;
  isZeroAffected: boolean;
};

const TEMPLATE_TOKEN_REGEX: RegExp =
  /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g;

const SYSTEM_ROOT_PREFIXES = ['Date:', 'DB Provider:', 'Collection:'];

const toRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizeOperation = (
  operation: DatabaseOperation | string
): DatabaseOperation | 'unknown' => {
  if (
    operation === 'query' ||
    operation === 'update' ||
    operation === 'insert' ||
    operation === 'delete'
  ) {
    return operation;
  }
  return 'unknown';
};

const normalizeTokenRoot = (token: string): string => {
  const rootCandidate: string = token.split('.')[0]?.trim() ?? '';
  return rootCandidate.replace(/\[[^\]]*\]/g, '').trim();
};

const isSystemRoot = (root: string): boolean =>
  SYSTEM_ROOT_PREFIXES.some((prefix: string): boolean => root.startsWith(prefix));

const isEmptyTemplateValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
};

const parseStructuredJsonString = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  const startsLikeJson =
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'));
  if (!startsLikeJson) return value;
  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    const repaired = trimmed.replace(
      /(:\s*\{[^{}]*\})(\s*,\s*\{)/g,
      '$1}$2'
    );
    if (repaired !== trimmed) {
      try {
        const parsedRepaired: unknown = JSON.parse(repaired);
        if (parsedRepaired && typeof parsedRepaired === 'object') {
          return parsedRepaired;
        }
      } catch {
        // Keep original when repaired parsing fails.
      }
    }
  }
  return value;
};

const readByPath = (source: unknown, path: string): unknown => {
  const normalized = path
    .replace(/\[(['"]?)([A-Za-z0-9_$-]+)\1\]/g, '.$2')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segment: string): string => segment.trim())
    .filter(Boolean);
  if (normalized.length === 0) return source;

  const readBySegments = (cursor: unknown, index: number): unknown => {
    if (cursor === null || cursor === undefined) return undefined;
    if (index >= normalized.length) return cursor;
    const segment = normalized[index];
    const normalizedCursor =
      typeof cursor === 'string' ? parseStructuredJsonString(cursor) : cursor;

    if (Array.isArray(normalizedCursor)) {
      const numericIndex = Number(segment);
      if (Number.isInteger(numericIndex)) {
        if (numericIndex < 0 || numericIndex >= normalizedCursor.length) {
          return undefined;
        }
        return readBySegments(normalizedCursor[numericIndex], index + 1);
      }
      for (const item of normalizedCursor) {
        const candidate = readBySegments(item, index);
        if (candidate !== undefined) return candidate;
      }
      return undefined;
    }

    const record = toRecord(normalizedCursor);
    if (!record) return undefined;
    return readBySegments(record[segment], index + 1);
  };

  return readBySegments(source, 0);
};

const resolveTokenValue = (
  token: string,
  templateContext: Record<string, unknown>,
  currentValue: unknown,
): unknown => {
  const trimmedToken = token.trim();
  if (!trimmedToken) return undefined;
  if (trimmedToken === 'current') return currentValue;
  if (trimmedToken === 'value') {
    return templateContext['value'] !== undefined
      ? templateContext['value']
      : currentValue;
  }
  if (trimmedToken.startsWith('current.')) {
    return readByPath(currentValue, trimmedToken.slice('current.'.length));
  }
  if (
    Object.prototype.hasOwnProperty.call(templateContext, trimmedToken)
  ) {
    return templateContext[trimmedToken];
  }
  return readByPath(templateContext, trimmedToken);
};

const extractTemplateTokens = (template: string): string[] => {
  const tokens: string[] = [];
  TEMPLATE_TOKEN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null = TEMPLATE_TOKEN_REGEX.exec(template);
  while (match) {
    const token = (match[1] ?? match[2] ?? '').trim();
    if (token) {
      tokens.push(token);
    }
    match = TEMPLATE_TOKEN_REGEX.exec(template);
  }
  return tokens;
};

const inspectWriteTemplates = ({
  templates,
  templateContext,
  currentValue,
}: ResolveWriteTemplateGuardrailInput): WriteTemplateInspection => {
  const missing: WriteTemplateTokenDiagnostic[] = [];
  const empty: WriteTemplateTokenDiagnostic[] = [];

  templates.forEach(({ name, template }: WriteTemplateSource): void => {
    if (!template.trim()) return;
    const tokens = extractTemplateTokens(template);
    const seen = new Set<string>();
    tokens.forEach((token: string): void => {
      const key = `${name}:${token}`;
      if (seen.has(key)) return;
      seen.add(key);
      const root = normalizeTokenRoot(token);
      if (!root || isSystemRoot(root)) return;
      const value = resolveTokenValue(token, templateContext, currentValue);
      if (value === undefined) {
        missing.push({
          template: name,
          token,
          root,
          reason: 'missing',
        });
        return;
      }
      if (isEmptyTemplateValue(value)) {
        empty.push({
          template: name,
          token,
          root,
          reason: 'empty',
        });
      }
    });
  });

  return { missing, empty };
};

const formatTokenList = (diagnostics: WriteTemplateTokenDiagnostic[]): string =>
  diagnostics.map((entry: WriteTemplateTokenDiagnostic): string => `{{${entry.token}}}`).join(', ');

const dedupeValues = (values: string[]): string[] =>
  Array.from(new Set(values.filter((value: string): boolean => value.trim().length > 0)));

const readNumericField = (
  payload: Record<string, unknown>,
  field: string
): number | null => {
  const value = payload[field];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return null;
};

const readWriteCounters = (result: unknown): ReadNumericCounters => {
  const payload = toRecord(result) ?? {};
  return {
    matchedCount: readNumericField(payload, 'matchedCount'),
    modifiedCount: readNumericField(payload, 'modifiedCount'),
    deletedCount: readNumericField(payload, 'deletedCount'),
    insertedCount: readNumericField(payload, 'insertedCount'),
    count: readNumericField(payload, 'count'),
  };
};

const resolveAffectedCount = (
  operation: DatabaseOperation | 'unknown',
  action: string | null | undefined,
  counters: ReadNumericCounters
): { affectedCount: number | null; isZeroAffected: boolean } => {
  const actionLower = action?.toLowerCase() ?? '';
  const treatAsInsert =
    operation === 'insert' ||
    actionLower.startsWith('insert') ||
    actionLower.startsWith('create');
  if (treatAsInsert) {
    const affectedCount = counters.insertedCount ?? counters.count;
    return {
      affectedCount: affectedCount ?? null,
      isZeroAffected: affectedCount === 0,
    };
  }

  const treatAsDelete =
    operation === 'delete' ||
    actionLower.startsWith('delete') ||
    actionLower.includes('anddelete');
  if (treatAsDelete) {
    const affectedCount = counters.deletedCount ?? counters.count;
    return {
      affectedCount: affectedCount ?? null,
      isZeroAffected: affectedCount === 0,
    };
  }

  const treatAsUpdate =
    operation === 'update' ||
    actionLower.startsWith('update') ||
    actionLower.includes('andupdate') ||
    actionLower.startsWith('replace');
  if (treatAsUpdate) {
    if (counters.modifiedCount !== null) {
      return {
        affectedCount: counters.modifiedCount,
        isZeroAffected: counters.modifiedCount === 0,
      };
    }
    if (counters.matchedCount !== null) {
      return {
        affectedCount: counters.matchedCount,
        isZeroAffected: counters.matchedCount === 0,
      };
    }
    const fallback = counters.count;
    return {
      affectedCount: fallback,
      isZeroAffected: fallback === 0,
    };
  }

  return { affectedCount: null, isZeroAffected: false };
};

export const resolveWriteOutcomePolicy = (
  dbConfig: DatabaseConfig
): DatabaseWriteZeroAffectedPolicy =>
  dbConfig.writeOutcomePolicy?.onZeroAffected === 'warn' ? 'warn' : 'fail';

export const resolveWriteTemplateGuardrail = ({
  templates,
  templateContext,
  currentValue,
}: ResolveWriteTemplateGuardrailInput): ResolveWriteTemplateGuardrailResult => {
  const inspection = inspectWriteTemplates({
    templates,
    templateContext,
    currentValue,
  });
  if (inspection.missing.length === 0 && inspection.empty.length === 0) {
    return { ok: true };
  }

  const missingTokens = dedupeValues(
    inspection.missing.map((entry: WriteTemplateTokenDiagnostic): string => entry.token)
  );
  const emptyTokens = dedupeValues(
    inspection.empty.map((entry: WriteTemplateTokenDiagnostic): string => entry.token)
  );
  const missingRoots = dedupeValues(
    inspection.missing.map((entry: WriteTemplateTokenDiagnostic): string => entry.root)
  );
  const emptyRoots = dedupeValues(
    inspection.empty.map((entry: WriteTemplateTokenDiagnostic): string => entry.root)
  );
  const templateNames = dedupeValues(
    [...inspection.missing, ...inspection.empty].map(
      (entry: WriteTemplateTokenDiagnostic): string => entry.template
    )
  );

  const fragments: string[] = [];
  if (missingTokens.length > 0) {
    fragments.push(`missing tokens: ${formatTokenList(inspection.missing)}`);
  }
  if (emptyTokens.length > 0) {
    fragments.push(`empty tokens: ${formatTokenList(inspection.empty)}`);
  }
  const message = `Database write blocked. Template inputs must be connected and non-empty (${fragments.join(
    '; '
  )}).`;

  return {
    ok: false,
    message,
    guardrailMeta: {
      code: 'write-template-values',
      severity: 'error',
      message,
      templates: templateNames,
      missingTokens,
      emptyTokens,
      missingRoots,
      emptyRoots,
      details: [...inspection.missing, ...inspection.empty],
    },
  };
};

export const createWriteTemplateGuardrailOutput = (args: {
  aiPrompt: string;
  message: string;
  guardrailMeta: DatabaseGuardrailMeta;
}): RuntimePortValues => ({
  result: null,
  bundle: {
    error: args.message,
    guardrail: 'write-template-values',
    guardrailMeta: args.guardrailMeta,
  },
  guardrailMeta: args.guardrailMeta,
  writeOutcome: {
    status: 'failed',
    code: 'write_template_values',
    message: args.message,
    zeroAffected: false,
  } satisfies DatabaseWriteOutcome,
  aiPrompt: args.aiPrompt,
});

export const evaluateWriteOutcome = ({
  operation,
  action,
  result,
  policy,
}: EvaluateWriteOutcomeInput): EvaluateWriteOutcomeResult => {
  const normalizedOperation = normalizeOperation(operation);
  const counters = readWriteCounters(result);
  const { affectedCount, isZeroAffected } = resolveAffectedCount(
    normalizedOperation,
    action,
    counters
  );
  const actionLabel = action ? ` (${action})` : '';
  if (!isZeroAffected) {
    return {
      isZeroAffected: false,
      writeOutcome: {
        status: 'success',
        operation: normalizedOperation,
        ...(action ? { action } : {}),
        ...(affectedCount !== null ? { affectedCount } : {}),
        ...(counters.matchedCount !== null ? { matchedCount: counters.matchedCount } : {}),
        ...(counters.modifiedCount !== null ? { modifiedCount: counters.modifiedCount } : {}),
        ...(counters.deletedCount !== null ? { deletedCount: counters.deletedCount } : {}),
        ...(counters.insertedCount !== null ? { insertedCount: counters.insertedCount } : {}),
      },
    };
  }

  const status = policy === 'warn' ? 'warning' : 'failed';
  const message = `Database write affected 0 records for ${normalizedOperation}${actionLabel}.`;
  return {
    isZeroAffected: true,
    writeOutcome: {
      status,
      code: 'zero_affected',
      message,
      policyOnZeroAffected: policy,
      zeroAffected: true,
      operation: normalizedOperation,
      ...(action ? { action } : {}),
      ...(affectedCount !== null ? { affectedCount } : {}),
      ...(counters.matchedCount !== null ? { matchedCount: counters.matchedCount } : {}),
      ...(counters.modifiedCount !== null ? { modifiedCount: counters.modifiedCount } : {}),
      ...(counters.deletedCount !== null ? { deletedCount: counters.deletedCount } : {}),
      ...(counters.insertedCount !== null ? { insertedCount: counters.insertedCount } : {}),
    },
  };
};
