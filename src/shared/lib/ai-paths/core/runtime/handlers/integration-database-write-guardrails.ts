import type {
  DatabaseConfig,
  DatabaseGuardrailMeta,
  DatabaseOperation,
  DatabaseWriteOutcome,
  DatabaseWriteZeroAffectedPolicy,
  RuntimePortValues,
} from '@/shared/contracts/ai-paths';

import {
  normalizeJsonLikeValue,
  type JsonIntegrityParseState,
  type JsonIntegrityPolicy,
} from './json-integrity';

type WriteTemplateSource = {
  name: string;
  template: string;
};

type WriteTemplateParseDiagnostic = {
  port?: string;
  token: string;
  rawType: string;
  parseState: JsonIntegrityParseState;
  repairApplied: boolean;
  parseError?: string;
  truncationDetected?: boolean;
  repairSteps?: string[];
};

type WriteTemplateTokenDiagnostic = {
  template: string;
  token: string;
  root: string;
  reason: 'missing' | 'empty' | 'unparseable';
};

type WriteTemplateInspection = {
  missing: WriteTemplateTokenDiagnostic[];
  empty: WriteTemplateTokenDiagnostic[];
  unparseable: WriteTemplateTokenDiagnostic[];
  parseDiagnostics: WriteTemplateParseDiagnostic[];
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

const TEMPLATE_TOKEN_REGEX: RegExp = /{{\s*([^}]+)\s*}}|\[\s*([A-Za-z0-9_.$:-]+)\s*\]/g;

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

type PathReadResult = {
  value: unknown;
  parseDiagnostic?: {
    rawType: string;
    parseState: JsonIntegrityParseState;
    repairApplied: boolean;
    parseError?: string;
    truncationDetected?: boolean;
    repairSteps?: string[];
  };
};

const readByPath = (source: unknown, path: string, policy: JsonIntegrityPolicy): PathReadResult => {
  const normalized = path
    .replace(/\[(['"]?)([A-Za-z0-9_$-]+)\1\]/g, '.$2')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segment: string): string => segment.trim())
    .filter(Boolean);
  if (normalized.length === 0) return { value: source };

  const readBySegments = (cursor: unknown, index: number): PathReadResult => {
    if (cursor === null || cursor === undefined) return { value: undefined };
    if (index >= normalized.length) return { value: cursor };
    const segment = normalized[index];
    if (segment === undefined) return { value: undefined };
    const normalizedCursorResult = normalizeJsonLikeValue(cursor, policy);
    const normalizedCursor = normalizedCursorResult.value;
    const parseDiagnostic =
      normalizedCursorResult.state === 'repaired' || normalizedCursorResult.state === 'unparseable'
        ? {
            rawType: normalizedCursorResult.diagnostic.rawType,
            parseState: normalizedCursorResult.diagnostic.parseState,
            repairApplied: normalizedCursorResult.diagnostic.repairApplied,
            parseError: normalizedCursorResult.diagnostic.parseError,
            truncationDetected: normalizedCursorResult.diagnostic.truncationDetected,
            repairSteps: normalizedCursorResult.diagnostic.repairSteps,
          }
        : undefined;
    if (normalizedCursorResult.state === 'unparseable') {
      return {
        value: undefined,
        ...(parseDiagnostic ? { parseDiagnostic } : {}),
      };
    }

    if (Array.isArray(normalizedCursor)) {
      const numericIndex = Number(segment);
      if (Number.isInteger(numericIndex)) {
        if (numericIndex < 0 || numericIndex >= normalizedCursor.length) {
          return { value: undefined };
        }
        const indexed = readBySegments(normalizedCursor[numericIndex], index + 1);
        if (indexed.parseDiagnostic) return indexed;
        return parseDiagnostic ? { ...indexed, parseDiagnostic } : indexed;
      }
      let firstDiagnostic: PathReadResult['parseDiagnostic'] | undefined;
      for (const item of normalizedCursor) {
        const candidate = readBySegments(item, index);
        if (candidate.value !== undefined) {
          if (candidate.parseDiagnostic) return candidate;
          return parseDiagnostic ? { ...candidate, parseDiagnostic } : candidate;
        }
        if (!firstDiagnostic && candidate.parseDiagnostic) {
          firstDiagnostic = candidate.parseDiagnostic;
        }
      }
      return firstDiagnostic
        ? { value: undefined, parseDiagnostic: firstDiagnostic }
        : parseDiagnostic
          ? { value: undefined, parseDiagnostic }
          : { value: undefined };
    }

    const record = toRecord(normalizedCursor);
    if (!record) {
      return parseDiagnostic ? { value: undefined, parseDiagnostic } : { value: undefined };
    }
    const nested = readBySegments(record[segment], index + 1);
    if (nested.parseDiagnostic) return nested;
    return parseDiagnostic ? { ...nested, parseDiagnostic } : nested;
  };

  return readBySegments(source, 0);
};

type ResolvedTokenValue = {
  value: unknown;
  parseDiagnostic?: WriteTemplateParseDiagnostic;
};

const resolveTokenValue = (
  token: string,
  templateContext: Record<string, unknown>,
  currentValue: unknown,
  policy: JsonIntegrityPolicy
): ResolvedTokenValue => {
  const trimmedToken = token.trim();
  if (!trimmedToken) return { value: undefined };
  if (trimmedToken === 'current') return { value: currentValue };
  if (trimmedToken === 'value') {
    return {
      value: templateContext['value'] !== undefined ? templateContext['value'] : currentValue,
    };
  }
  if (trimmedToken.startsWith('current.')) {
    const resolved = readByPath(currentValue, trimmedToken.slice('current.'.length), policy);
    return {
      value: resolved.value,
      ...(resolved.parseDiagnostic
        ? {
            parseDiagnostic: {
              token: trimmedToken,
              rawType: resolved.parseDiagnostic.rawType,
              parseState: resolved.parseDiagnostic.parseState,
              repairApplied: resolved.parseDiagnostic.repairApplied,
              parseError: resolved.parseDiagnostic.parseError,
              truncationDetected: resolved.parseDiagnostic.truncationDetected,
              repairSteps: resolved.parseDiagnostic.repairSteps,
            },
          }
        : {}),
    };
  }
  if (Object.prototype.hasOwnProperty.call(templateContext, trimmedToken)) {
    return {
      value: templateContext[trimmedToken],
    };
  }
  const resolved = readByPath(templateContext, trimmedToken, policy);
  return {
    value: resolved.value,
    ...(resolved.parseDiagnostic
      ? {
          parseDiagnostic: {
            port: normalizeTokenRoot(trimmedToken) || undefined,
            token: trimmedToken,
            rawType: resolved.parseDiagnostic.rawType,
            parseState: resolved.parseDiagnostic.parseState,
            repairApplied: resolved.parseDiagnostic.repairApplied,
            parseError: resolved.parseDiagnostic.parseError,
            truncationDetected: resolved.parseDiagnostic.truncationDetected,
            repairSteps: resolved.parseDiagnostic.repairSteps,
          },
        }
      : {}),
  };
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
  const unparseable: WriteTemplateTokenDiagnostic[] = [];
  const parseDiagnostics: WriteTemplateParseDiagnostic[] = [];
  const policy: JsonIntegrityPolicy = 'repair';

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
      const resolved = resolveTokenValue(token, templateContext, currentValue, policy);
      const value = resolved.value;
      if (resolved.parseDiagnostic) {
        parseDiagnostics.push({
          ...resolved.parseDiagnostic,
          token,
          ...(resolved.parseDiagnostic.port ? {} : { port: root }),
        });
      }
      if (resolved.parseDiagnostic?.parseState === 'unparseable') {
        unparseable.push({
          template: name,
          token,
          root,
          reason: 'unparseable',
        });
        return;
      }
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

  return { missing, empty, unparseable, parseDiagnostics };
};

const formatTokenList = (diagnostics: WriteTemplateTokenDiagnostic[]): string =>
  diagnostics.map((entry: WriteTemplateTokenDiagnostic): string => `{{${entry.token}}}`).join(', ');

const dedupeValues = (values: string[]): string[] =>
  Array.from(new Set(values.filter((value: string): boolean => value.trim().length > 0)));

const buildLikelyCauseFragment = (diagnostics: WriteTemplateParseDiagnostic[]): string | null => {
  const truncationRoots = Array.from(
    new Set(
      diagnostics
        .filter(
          (diagnostic: WriteTemplateParseDiagnostic): boolean =>
            diagnostic.parseState === 'unparseable' && diagnostic.truncationDetected === true
        )
        .map(
          (diagnostic: WriteTemplateParseDiagnostic): string =>
            diagnostic.port?.trim() || normalizeTokenRoot(diagnostic.token)
        )
        .filter((value: string): boolean => value.length > 0)
    )
  );
  if (truncationRoots.length === 0) return null;
  const quotedRoots = truncationRoots.map((root: string): string => `"${root}"`);
  return `likely cause: truncated JSON on root ${quotedRoots.join(', ')}`;
};

const readNumericField = (payload: Record<string, unknown>, field: string): number | null => {
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
    operation === 'insert' || actionLower.startsWith('insert') || actionLower.startsWith('create');
  if (treatAsInsert) {
    const affectedCount = counters.insertedCount ?? counters.count;
    return {
      affectedCount: affectedCount ?? null,
      isZeroAffected: affectedCount === 0,
    };
  }

  const treatAsDelete =
    operation === 'delete' || actionLower.startsWith('delete') || actionLower.includes('anddelete');
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
  if (
    inspection.missing.length === 0 &&
    inspection.empty.length === 0 &&
    inspection.unparseable.length === 0
  ) {
    return { ok: true };
  }

  const missingTokens = dedupeValues(
    inspection.missing.map((entry: WriteTemplateTokenDiagnostic): string => entry.token)
  );
  const emptyTokens = dedupeValues(
    inspection.empty.map((entry: WriteTemplateTokenDiagnostic): string => entry.token)
  );
  const unparseableTokens = dedupeValues(
    inspection.unparseable.map((entry: WriteTemplateTokenDiagnostic): string => entry.token)
  );
  const missingRoots = dedupeValues(
    inspection.missing.map((entry: WriteTemplateTokenDiagnostic): string => entry.root)
  );
  const emptyRoots = dedupeValues(
    inspection.empty.map((entry: WriteTemplateTokenDiagnostic): string => entry.root)
  );
  const unparseableRoots = dedupeValues(
    inspection.unparseable.map((entry: WriteTemplateTokenDiagnostic): string => entry.root)
  );
  const templateNames = dedupeValues(
    [...inspection.missing, ...inspection.empty, ...inspection.unparseable].map(
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
  if (unparseableTokens.length > 0) {
    fragments.push(`unparseable JSON tokens: ${formatTokenList(inspection.unparseable)}`);
  }
  const likelyCauseFragment = buildLikelyCauseFragment(inspection.parseDiagnostics);
  if (likelyCauseFragment) {
    fragments.push(likelyCauseFragment);
  }
  const message = `Database write blocked. Template inputs must be connected and non-empty (${fragments.join(
    '; '
  )}).`;

  const parseDiagnostics = Array.from(
    new Map(
      inspection.parseDiagnostics.map((diagnostic: WriteTemplateParseDiagnostic) => {
        const key = [
          diagnostic.token,
          diagnostic.port ?? '',
          diagnostic.rawType,
          diagnostic.parseState,
          diagnostic.repairApplied ? '1' : '0',
          diagnostic.parseError ?? '',
          diagnostic.truncationDetected ? '1' : '0',
          (diagnostic.repairSteps ?? []).join(','),
        ].join('|');
        return [key, diagnostic] as const;
      })
    ).values()
  );

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
      unparseableTokens,
      unparseableRoots,
      parseDiagnostics,
      details: [...inspection.missing, ...inspection.empty, ...inspection.unparseable],
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
