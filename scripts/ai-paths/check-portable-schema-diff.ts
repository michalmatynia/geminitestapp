import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import {
  AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  PORTABLE_PATH_JSON_SCHEMA_KINDS,
  type PortablePathJsonSchemaDiffEntry,
  type PortablePathJsonSchemaDiffReport,
  type PortablePathJsonSchemaKind,
  buildPortablePathJsonSchemaDiffReport,
} from '../../src/shared/lib/ai-paths/portable-engine';

export const DEFAULT_PORTABLE_SCHEMA_DIFF_ALLOWLIST_RELATIVE_PATH =
  'scripts/ai-paths/portable-schema-diff-allowlist.json';

export type PortableSchemaDiffAllowlistEntry = {
  kind: PortablePathJsonSchemaKind;
  vNextHash: string;
  breakRisk: 'non_breaking' | 'breaking';
  reason?: string;
  expiresAt?: string;
};

export type PortableSchemaDiffAllowlist = {
  version: 'ai-paths.portable-schema-diff-allowlist.v1';
  entries: PortableSchemaDiffAllowlistEntry[];
};

export type PortableSchemaDiffClassificationEntry = {
  kind: PortablePathJsonSchemaKind;
  currentHash: string;
  vNextHash: string;
  breakRisk: 'non_breaking' | 'breaking';
  reason: string;
  allowlisted: boolean;
};

export type PortableSchemaDiffClassificationReport = {
  expectedNonBreaking: PortableSchemaDiffClassificationEntry[];
  expectedBreaking: PortableSchemaDiffClassificationEntry[];
  unexpectedBreaking: PortableSchemaDiffClassificationEntry[];
  expiredAllowlistEntries: PortableSchemaDiffAllowlistEntry[];
  staleAllowlistEntries: PortableSchemaDiffAllowlistEntry[];
};

type PortableSchemaDiffCliArgs = {
  strict: boolean;
  json: boolean;
  suggestAllowlist: boolean;
  allowlistRelativePath: string;
};

const DEFAULT_ALLOWLIST_SUGGESTION_EXPIRY_DAYS = 14;

const parseCliArgs = (argv: string[]): PortableSchemaDiffCliArgs => {
  const parsed: PortableSchemaDiffCliArgs = {
    strict: false,
    json: false,
    suggestAllowlist: false,
    allowlistRelativePath: DEFAULT_PORTABLE_SCHEMA_DIFF_ALLOWLIST_RELATIVE_PATH,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--strict') {
      parsed.strict = true;
      continue;
    }
    if (token === '--json') {
      parsed.json = true;
      continue;
    }
    if (token === '--suggest-allowlist') {
      parsed.suggestAllowlist = true;
      continue;
    }
    if (token === '--allowlist') {
      const value = argv[index + 1];
      if (!value) {
        throw new Error('Missing value for --allowlist.');
      }
      parsed.allowlistRelativePath = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument "${token}".`);
  }
  return parsed;
};

const isPortableSchemaKind = (value: string): value is PortablePathJsonSchemaKind =>
  PORTABLE_PATH_JSON_SCHEMA_KINDS.includes(value as PortablePathJsonSchemaKind);

const isValidIsoDate = (value: string): boolean => !Number.isNaN(Date.parse(value));

export const validatePortableSchemaDiffAllowlist = (
  value: unknown,
  source: string
): PortableSchemaDiffAllowlist => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Portable schema diff allowlist at ${source} must be an object.`);
  }
  const record = value as Record<string, unknown>;
  if (record['version'] !== 'ai-paths.portable-schema-diff-allowlist.v1') {
    throw new Error(
      `Portable schema diff allowlist at ${source} must use version "ai-paths.portable-schema-diff-allowlist.v1".`
    );
  }
  if (!Array.isArray(record['entries'])) {
    throw new Error(`Portable schema diff allowlist at ${source} must provide an "entries" array.`);
  }
  const seen = new Set<string>();
  const entries = record['entries'].map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`Allowlist entry ${index} in ${source} must be an object.`);
    }
    const item = entry as Record<string, unknown>;
    const kind = item['kind'];
    const vNextHash = item['vNextHash'];
    const breakRisk = item['breakRisk'];
    const reason = item['reason'];
    const expiresAt = item['expiresAt'];
    if (typeof kind !== 'string' || !isPortableSchemaKind(kind)) {
      throw new Error(
        `Allowlist entry ${index} in ${source} has invalid kind "${String(kind)}".`
      );
    }
    if (typeof vNextHash !== 'string' || vNextHash.trim().length < 8) {
      throw new Error(
        `Allowlist entry ${index} in ${source} must include a non-empty vNextHash.`
      );
    }
    if (breakRisk !== 'non_breaking' && breakRisk !== 'breaking') {
      throw new Error(
        `Allowlist entry ${index} in ${source} must set breakRisk to "non_breaking" or "breaking".`
      );
    }
    if (reason !== undefined && typeof reason !== 'string') {
      throw new Error(`Allowlist entry ${index} in ${source} has non-string reason.`);
    }
    if (expiresAt !== undefined) {
      if (typeof expiresAt !== 'string' || !isValidIsoDate(expiresAt)) {
        throw new Error(
          `Allowlist entry ${index} in ${source} has invalid expiresAt "${String(expiresAt)}".`
        );
      }
    }
    const dedupeKey = `${kind}:${vNextHash}`;
    if (seen.has(dedupeKey)) {
      throw new Error(
        `Allowlist entry ${index} in ${source} duplicates kind/hash pair "${dedupeKey}".`
      );
    }
    seen.add(dedupeKey);
    return {
      kind,
      vNextHash: vNextHash.trim(),
      breakRisk,
      ...(reason ? { reason: reason.trim() } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    } satisfies PortableSchemaDiffAllowlistEntry;
  });
  return {
    version: 'ai-paths.portable-schema-diff-allowlist.v1',
    entries,
  };
};

export const loadPortableSchemaDiffAllowlist = async (
  root: string,
  allowlistRelativePath = DEFAULT_PORTABLE_SCHEMA_DIFF_ALLOWLIST_RELATIVE_PATH
): Promise<PortableSchemaDiffAllowlist> => {
  const absolutePath = path.join(root, allowlistRelativePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new Error(`Portable schema diff allowlist at ${allowlistRelativePath} is not valid JSON.`);
  }
  return validatePortableSchemaDiffAllowlist(parsed, allowlistRelativePath);
};

const isAllowlistEntryExpired = (
  entry: PortableSchemaDiffAllowlistEntry,
  now: Date
): boolean => {
  if (!entry.expiresAt) return false;
  return Date.parse(entry.expiresAt) < now.getTime();
};

const createClassificationEntry = (
  entry: PortablePathJsonSchemaDiffEntry,
  options: {
    breakRisk: 'non_breaking' | 'breaking';
    allowlisted: boolean;
    reason: string;
  }
): PortableSchemaDiffClassificationEntry => ({
  kind: entry.kind,
  currentHash: entry.currentHash,
  vNextHash: entry.vNextHash,
  breakRisk: options.breakRisk,
  allowlisted: options.allowlisted,
  reason: options.reason,
});

export const classifyPortableSchemaDiffChanges = (
  diff: PortablePathJsonSchemaDiffReport,
  allowlist: PortableSchemaDiffAllowlist,
  now = new Date()
): PortableSchemaDiffClassificationReport => {
  const allowlistByKindAndHash = new Map<string, PortableSchemaDiffAllowlistEntry>();
  for (const entry of allowlist.entries) {
    allowlistByKindAndHash.set(`${entry.kind}:${entry.vNextHash}`, entry);
  }

  const changedEntries = diff.entries.filter((entry) => entry.changed);
  const consumedAllowlistKeys = new Set<string>();
  const expectedNonBreaking: PortableSchemaDiffClassificationEntry[] = [];
  const expectedBreaking: PortableSchemaDiffClassificationEntry[] = [];
  const unexpectedBreaking: PortableSchemaDiffClassificationEntry[] = [];
  const expiredAllowlistEntries: PortableSchemaDiffAllowlistEntry[] = [];

  for (const entry of changedEntries) {
    const key = `${entry.kind}:${entry.vNextHash}`;
    const allowlisted = allowlistByKindAndHash.get(key);
    if (!allowlisted) {
      unexpectedBreaking.push(
        createClassificationEntry(entry, {
          breakRisk: 'breaking',
          allowlisted: false,
          reason:
            'Changed schema hash is not allowlisted. Treating as breaking until reviewed.',
        })
      );
      continue;
    }

    consumedAllowlistKeys.add(key);
    if (isAllowlistEntryExpired(allowlisted, now)) {
      expiredAllowlistEntries.push(allowlisted);
      unexpectedBreaking.push(
        createClassificationEntry(entry, {
          breakRisk: 'breaking',
          allowlisted: true,
          reason: `Allowlist entry expired at ${allowlisted.expiresAt}.`,
        })
      );
      continue;
    }

    const bucket = allowlisted.breakRisk === 'breaking' ? expectedBreaking : expectedNonBreaking;
    bucket.push(
      createClassificationEntry(entry, {
        breakRisk: allowlisted.breakRisk,
        allowlisted: true,
        reason: allowlisted.reason?.trim() || 'Allowlisted schema change.',
      })
    );
  }

  const staleAllowlistEntries = allowlist.entries.filter(
    (entry) => !consumedAllowlistKeys.has(`${entry.kind}:${entry.vNextHash}`)
  );

  return {
    expectedNonBreaking,
    expectedBreaking,
    unexpectedBreaking,
    expiredAllowlistEntries,
    staleAllowlistEntries,
  };
};

const toIsoDateWithOffsetDays = (base: Date, days: number): string => {
  const value = new Date(base.getTime());
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
};

export const buildPortableSchemaDiffAllowlistSuggestions = (
  classification: PortableSchemaDiffClassificationReport,
  now = new Date()
): PortableSchemaDiffAllowlistEntry[] => {
  const suggestionsByKey = new Map<string, PortableSchemaDiffAllowlistEntry>();
  for (const entry of classification.unexpectedBreaking) {
    const dedupeKey = `${entry.kind}:${entry.vNextHash}`;
    if (suggestionsByKey.has(dedupeKey)) continue;
    suggestionsByKey.set(dedupeKey, {
      kind: entry.kind,
      vNextHash: entry.vNextHash,
      breakRisk: 'breaking',
      reason: `TODO: review ${entry.kind} schema diff and set breakRisk when approved.`,
      expiresAt: toIsoDateWithOffsetDays(now, DEFAULT_ALLOWLIST_SUGGESTION_EXPIRY_DAYS),
    });
  }
  return Array.from(suggestionsByKey.values()).sort((left, right) => {
    if (left.kind === right.kind) return left.vNextHash.localeCompare(right.vNextHash);
    return left.kind.localeCompare(right.kind);
  });
};

type RunPortableSchemaDiffGuardrailOptions = {
  root?: string;
  allowlistRelativePath?: string;
  strict?: boolean;
  json?: boolean;
  suggestAllowlist?: boolean;
  logger?: Pick<typeof console, 'log' | 'error'>;
};

export const runPortableSchemaDiffGuardrail = async (
  options: RunPortableSchemaDiffGuardrailOptions = {}
): Promise<{
  ok: boolean;
  strict: boolean;
  diff: PortablePathJsonSchemaDiffReport;
  classification: PortableSchemaDiffClassificationReport;
  suggestedAllowlistEntries: PortableSchemaDiffAllowlistEntry[];
}> => {
  const root = options.root ?? process.cwd();
  const logger = options.logger ?? console;
  const strict = options.strict ?? false;
  const diff = buildPortablePathJsonSchemaDiffReport();
  const allowlist = await loadPortableSchemaDiffAllowlist(
    root,
    options.allowlistRelativePath
  );
  const classification = classifyPortableSchemaDiffChanges(diff, allowlist);
  const suggestedAllowlistEntries = options.suggestAllowlist
    ? buildPortableSchemaDiffAllowlistSuggestions(classification)
    : [];
  const hasUnexpectedBreaking = classification.unexpectedBreaking.length > 0;
  const hasExpiredAllowlist = classification.expiredAllowlistEntries.length > 0;
  const ok = !strict || (!hasUnexpectedBreaking && !hasExpiredAllowlist);

  const summaryPayload = {
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    strict,
    hasSchemaChanges: diff.hasChanges,
    changedKinds: diff.changedKinds,
    summary: {
      expectedNonBreaking: classification.expectedNonBreaking.length,
      expectedBreaking: classification.expectedBreaking.length,
      unexpectedBreaking: classification.unexpectedBreaking.length,
      expiredAllowlistEntries: classification.expiredAllowlistEntries.length,
      staleAllowlistEntries: classification.staleAllowlistEntries.length,
      suggestedAllowlistEntries: suggestedAllowlistEntries.length,
    },
    classification,
    suggestedAllowlistEntries,
  };

  if (options.json) {
    logger.log(JSON.stringify(summaryPayload, null, 2));
  } else {
    logger.log(
      `[ai-paths:portable-schema-diff] strict=${String(strict)} changed=${String(diff.hasChanges)}`
    );
    logger.log(
      `[ai-paths:portable-schema-diff] expected_non_breaking=${classification.expectedNonBreaking.length} expected_breaking=${classification.expectedBreaking.length} unexpected_breaking=${classification.unexpectedBreaking.length}`
    );
    if (classification.expiredAllowlistEntries.length > 0) {
      logger.error(
        `[ai-paths:portable-schema-diff] expired allowlist entries: ${classification.expiredAllowlistEntries
          .map((entry) => `${entry.kind}@${entry.vNextHash}`)
          .join(', ')}`
      );
    }
    if (classification.staleAllowlistEntries.length > 0) {
      logger.log(
        `[ai-paths:portable-schema-diff] stale allowlist entries: ${classification.staleAllowlistEntries
          .map((entry) => `${entry.kind}@${entry.vNextHash}`)
          .join(', ')}`
      );
    }
    if (classification.unexpectedBreaking.length > 0) {
      for (const entry of classification.unexpectedBreaking) {
        logger.error(
          `[ai-paths:portable-schema-diff] unexpected_breaking kind=${entry.kind} current=${entry.currentHash} vnext=${entry.vNextHash} reason=${entry.reason}`
        );
      }
    }
    if (suggestedAllowlistEntries.length > 0) {
      logger.log('[ai-paths:portable-schema-diff] suggested allowlist entries (review before merge):');
      logger.log(JSON.stringify(suggestedAllowlistEntries, null, 2));
    }
    if (ok) {
      logger.log('[ai-paths:portable-schema-diff] guardrail passed');
    } else {
      logger.error('[ai-paths:portable-schema-diff] guardrail failed');
    }
  }

  return {
    ok,
    strict,
    diff,
    classification,
    suggestedAllowlistEntries,
  };
};

const runCli = async (): Promise<void> => {
  const args = parseCliArgs(process.argv.slice(2));
  const result = await runPortableSchemaDiffGuardrail({
    strict: args.strict,
    json: args.json,
    suggestAllowlist: args.suggestAllowlist,
    allowlistRelativePath: args.allowlistRelativePath,
  });
  if (!result.ok) {
    process.exitCode = 1;
  }
};

const isMainModule = (): boolean => {
  if (!process.argv[1]) return false;
  return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
};

if (isMainModule()) {
  runCli().catch((error: unknown) => {
    console.error('[ai-paths:portable-schema-diff] failed');
    console.error(error instanceof Error ? error.stack : error);
    process.exit(1);
  });
}
