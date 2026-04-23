import { evaluateFieldMap } from './field-map';
import type { PageDriver } from './page-driver';
import { runScripter, type ScripterRunResult, type RunScripterOptions } from './scripter-runner';
import { BUILTIN_TRANSFORMS, type TransformRegistry } from './transforms';
import type {
  FieldMapEvaluation,
  FieldMapIssue,
  MappedScripterRecord,
  ScripterDefinition,
} from './types';

export type DryRunRecord = {
  index: number;
  raw: Record<string, unknown>;
  mapped: MappedScripterRecord;
  issues: FieldMapIssue[];
};

export type DryRunSummary = {
  rawCount: number;
  mappedCount: number;
  recordsWithErrors: number;
  recordsWithWarnings: number;
  totalIssues: number;
  issueCountByField: Record<string, number>;
};

export type DryRunResult = {
  scripterId: string;
  scripterVersion: number;
  records: DryRunRecord[];
  summary: DryRunSummary;
  run: ScripterRunResult;
};

export type DryRunOptions = RunScripterOptions & {
  transformRegistry?: TransformRegistry;
  limit?: number;
};

const summarize = (records: DryRunRecord[]): DryRunSummary => {
  const issueCountByField: Record<string, number> = {};
  let recordsWithErrors = 0;
  let recordsWithWarnings = 0;
  let totalIssues = 0;

  for (const record of records) {
    if (record.issues.length === 0) continue;
    totalIssues += record.issues.length;
    let hasError = false;
    let hasWarning = false;
    for (const issue of record.issues) {
      issueCountByField[issue.field] = (issueCountByField[issue.field] ?? 0) + 1;
      if (issue.severity === 'error') hasError = true;
      else hasWarning = true;
    }
    if (hasError) recordsWithErrors += 1;
    if (hasWarning) recordsWithWarnings += 1;
  }

  return {
    rawCount: records.length,
    mappedCount: records.length,
    recordsWithErrors,
    recordsWithWarnings,
    totalIssues,
    issueCountByField,
  };
};

export const mapScripterRecords = (
  rawRecords: Array<Record<string, unknown>>,
  definition: ScripterDefinition,
  registry: TransformRegistry = BUILTIN_TRANSFORMS
): DryRunRecord[] =>
  rawRecords.map((raw, index) => {
    const evaluation: FieldMapEvaluation = evaluateFieldMap(raw, definition.fieldMap, registry);
    return { index, raw, mapped: evaluation.record, issues: evaluation.issues };
  });

export const runScripterDryRun = async (
  definition: ScripterDefinition,
  driver: PageDriver,
  options: DryRunOptions = {}
): Promise<DryRunResult> => {
  const run = await runScripter(definition, driver, options);
  const limit = options.limit;
  const rawSlice =
    typeof limit === 'number' && limit >= 0 ? run.records.slice(0, limit) : run.records;
  const records = mapScripterRecords(rawSlice, definition, options.transformRegistry);
  return {
    scripterId: definition.id,
    scripterVersion: definition.version,
    records,
    summary: summarize(records),
    run,
  };
};
