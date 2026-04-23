import type { CreateProductDraftInput } from '@/shared/contracts/products/drafts';

import {
  buildScripterDraftInput,
  type ScripterCatalogDefaults,
} from './catalog-draft-mapper';
import type { PageDriver } from './page-driver';
import {
  runScripterDryRun,
  type DryRunOptions,
  type DryRunRecord,
  type DryRunSummary,
} from './scripter-dry-run';
import type { ScripterRunResult } from './scripter-runner';
import type { ScripterDefinition } from './types';

export type ScripterImportSourceMeta = {
  type: 'scripter';
  scripterId: string;
  scripterVersion: number;
  siteHost: string;
  executionMode: 'dry_run' | 'commit';
  visitedUrls: string[];
};

export type ScripterImportDraft = {
  index: number;
  externalId: string | null;
  draft: CreateProductDraftInput;
  raw: Record<string, unknown>;
  issues: DryRunRecord['issues'];
};

export type ScripterImportSourceResult = {
  source: ScripterImportSourceMeta;
  drafts: ScripterImportDraft[];
  rawResult: {
    records: Array<Record<string, unknown>>;
    run: ScripterRunResult;
  };
  summary: DryRunSummary;
};

export type ScripterImportSourceOptions = DryRunOptions & {
  executionMode?: 'dry_run' | 'commit';
  catalogDefaults?: ScripterCatalogDefaults;
  skipRecordsWithErrors?: boolean;
};

const deriveExternalId = (record: DryRunRecord): string | null => {
  const sku = record.mapped.sku;
  if (sku && sku.trim().length > 0) return sku.trim();
  const external = record.mapped.externalId;
  if (external && external.trim().length > 0) return external.trim();
  const url = record.mapped.sourceUrl;
  if (url && url.trim().length > 0) return url.trim();
  return null;
};

const hasBlockingIssue = (record: DryRunRecord): boolean =>
  record.issues.some((issue) => issue.severity === 'error');

export const resolveScripterImportSource = async (
  definition: ScripterDefinition,
  driver: PageDriver,
  options: ScripterImportSourceOptions = {}
): Promise<ScripterImportSourceResult> => {
  const { executionMode = 'dry_run', catalogDefaults, skipRecordsWithErrors = false, ...rest } =
    options;

  const dryRun = await runScripterDryRun(definition, driver, rest);

  const drafts: ScripterImportDraft[] = [];
  for (const record of dryRun.records) {
    if (skipRecordsWithErrors && hasBlockingIssue(record)) continue;
    drafts.push({
      index: record.index,
      externalId: deriveExternalId(record),
      draft: buildScripterDraftInput(record.mapped, catalogDefaults),
      raw: record.raw,
      issues: record.issues,
    });
  }

  return {
    source: {
      type: 'scripter',
      scripterId: definition.id,
      scripterVersion: definition.version,
      siteHost: definition.siteHost,
      executionMode,
      visitedUrls: dryRun.run.visitedUrls,
    },
    drafts,
    rawResult: {
      records: dryRun.run.records,
      run: dryRun.run,
    },
    summary: dryRun.summary,
  };
};
