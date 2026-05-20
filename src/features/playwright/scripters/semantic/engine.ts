import type { PageDriver } from '../page-driver';
import { runScripter, type RunScripterOptions } from '../scripter-runner';
import { BUILTIN_TRANSFORMS, type TransformRegistry } from '../transforms';
import { evaluateSemanticFieldMap } from './field-map';
import { semanticScripterDefinitionSchema } from './schema';
import type {
  SemanticExtractedRecord,
  SemanticMappedRecord,
  SemanticRunResult,
  SemanticRunSummary,
  SemanticScripterDefinition,
} from './types';

export type LoadSemanticScripterResult =
  | { ok: true; definition: SemanticScripterDefinition }
  | { ok: false; errors: string[] };

export const loadSemanticScripter = (input: unknown): LoadSemanticScripterResult => {
  const parsed = semanticScripterDefinitionSchema.safeParse(input);
  if (parsed.success) return { ok: true, definition: parsed.data };
  const errors = parsed.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
    return `${path}: ${issue.message}`;
  });
  return { ok: false, errors };
};

export const loadSemanticScripterFromJson = (json: string): LoadSemanticScripterResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    return { ok: false, errors: [`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`] };
  }
  return loadSemanticScripter(parsed);
};

// ── Summary builder ───────────────────────────────────────────────────────────

const buildSummary = (records: SemanticExtractedRecord[]): SemanticRunSummary => {
  let withErrors = 0;
  let withWarnings = 0;
  for (const record of records) {
    const hasError = record.issues.some((i) => i.severity === 'error');
    const hasWarning = record.issues.some((i) => i.severity === 'warning');
    if (hasError) withErrors++;
    else if (hasWarning) withWarnings++;
  }
  return {
    total: records.length,
    withErrors,
    withWarnings,
    clean: records.length - withErrors - withWarnings,
  };
};

// ── Migration shim — wraps an existing ScripterDefinition ────────────────────

/**
 * Upgrades a legacy ScripterDefinition (product-only, 11 fields) to a
 * SemanticScripterDefinition so it can run through the semantic engine
 * without any changes to the original JSON.
 */
export const upgradeToSemanticDefinition = (
  legacy: Record<string, unknown>
): SemanticScripterDefinition => {
  const result = semanticScripterDefinitionSchema.parse({
    outputKind: 'product',
    ...legacy,
  });
  return result;
};

// ── Core runner ───────────────────────────────────────────────────────────────

export type SemanticRunOptions = RunScripterOptions & {
  transformRegistry?: TransformRegistry;
};

export const runSemanticScripter = async (
  definition: SemanticScripterDefinition,
  driver: PageDriver,
  options: SemanticRunOptions = {}
): Promise<SemanticRunResult> => {
  const { transformRegistry = BUILTIN_TRANSFORMS, ...runOptions } = options;

  const run = await runScripter(definition, driver, runOptions);

  const records: SemanticExtractedRecord[] = run.records.map((raw, index) => {
    const evaluation = evaluateSemanticFieldMap(raw, definition.fieldMap, transformRegistry);
    return {
      index,
      raw,
      mapped: evaluation.record,
      issues: evaluation.issues,
    };
  });

  return {
    scripterId: definition.id,
    scripterVersion: definition.version,
    outputKind: definition.outputKind,
    records,
    summary: buildSummary(records),
    telemetry: run.telemetry,
    errors: run.errors,
    visitedUrls: run.visitedUrls,
  };
};

// ── Convenience: extract only valid records ───────────────────────────────────

export const getCleanRecords = (
  result: SemanticRunResult
): SemanticExtractedRecord[] =>
  result.records.filter((r) => !r.issues.some((i) => i.severity === 'error'));

export const getMapped = (result: SemanticRunResult): SemanticMappedRecord[] =>
  result.records.map((r) => r.mapped);
