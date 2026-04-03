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

export type PortableSchemaDiffAllowlistGovernance = {
  owner: string;
  ticket: string;
  approvedAt: string;
};

export type PortableSchemaDiffAllowlistEntry = {
  kind: PortablePathJsonSchemaKind;
  vNextHash: string;
  breakRisk: 'non_breaking' | 'breaking';
  reason?: string;
  expiresAt?: string;
  governance?: PortableSchemaDiffAllowlistGovernance;
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
  governance: PortableSchemaDiffAllowlistGovernance | null;
};

export type PortableSchemaDiffClassificationReport = {
  expectedNonBreaking: PortableSchemaDiffClassificationEntry[];
  expectedBreaking: PortableSchemaDiffClassificationEntry[];
  unexpectedBreaking: PortableSchemaDiffClassificationEntry[];
  missingGovernanceEntries: PortableSchemaDiffClassificationEntry[];
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
const DEFAULT_ALLOWLIST_SUGGESTION_OWNER = 'TODO:owner';
const DEFAULT_ALLOWLIST_SUGGESTION_TICKET = 'TODO:ticket';

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
const PORTABLE_SCHEMA_DIFF_GOVERNANCE_PLACEHOLDER_PATTERN = /^(todo|tbd|pending)(:|$)/i;

const isPortableSchemaDiffGovernancePlaceholder = (value: string): boolean =>
  PORTABLE_SCHEMA_DIFF_GOVERNANCE_PLACEHOLDER_PATTERN.test(value.trim());

const hasValidPortableSchemaDiffGovernance = (
  entry: PortableSchemaDiffAllowlistEntry
): boolean => {
  if (!entry.governance) return false;
  if (entry.governance.owner.trim().length === 0 || entry.governance.ticket.trim().length === 0) {
    return false;
  }
  if (
    isPortableSchemaDiffGovernancePlaceholder(entry.governance.owner) ||
    isPortableSchemaDiffGovernancePlaceholder(entry.governance.ticket)
  ) {
    return false;
  }
  return isValidIsoDate(entry.governance.approvedAt);
};

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
    const governance = item['governance'];
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
    let normalizedGovernance: PortableSchemaDiffAllowlistGovernance | undefined;
    if (governance !== undefined) {
      if (!governance || typeof governance !== 'object' || Array.isArray(governance)) {
        throw new Error(`Allowlist entry ${index} in ${source} has non-object governance metadata.`);
      }
      const governanceRecord = governance as Record<string, unknown>;
      const owner = governanceRecord['owner'];
      const ticket = governanceRecord['ticket'];
      const approvedAt = governanceRecord['approvedAt'];
      if (typeof owner !== 'string' || owner.trim().length === 0) {
        throw new Error(`Allowlist entry ${index} in ${source} has invalid governance.owner.`);
      }
      if (typeof ticket !== 'string' || ticket.trim().length === 0) {
        throw new Error(`Allowlist entry ${index} in ${source} has invalid governance.ticket.`);
      }
      if (typeof approvedAt !== 'string' || !isValidIsoDate(approvedAt)) {
        throw new Error(`Allowlist entry ${index} in ${source} has invalid governance.approvedAt.`);
      }
      normalizedGovernance = {
        owner: owner.trim(),
        ticket: ticket.trim(),
        approvedAt,
      };
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
      ...(normalizedGovernance ? { governance: normalizedGovernance } : {}),
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
    governance?: PortableSchemaDiffAllowlistGovernance | null;
  }
): PortableSchemaDiffClassificationEntry => ({
  kind: entry.kind,
  currentHash: entry.currentHash,
  vNextHash: entry.vNextHash,
  breakRisk: options.breakRisk,
  allowlisted: options.allowlisted,
  reason: options.reason,
  governance: options.governance ?? null,
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
  const missingGovernanceEntries: PortableSchemaDiffClassificationEntry[] = [];
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
          governance: null,
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
          governance: allowlisted.governance ?? null,
        })
      );
      continue;
    }

    const bucket = allowlisted.breakRisk === 'breaking' ? expectedBreaking : expectedNonBreaking;
    const classificationEntry = createClassificationEntry(entry, {
      breakRisk: allowlisted.breakRisk,
      allowlisted: true,
      reason: allowlisted.reason?.trim() || 'Allowlisted schema change.',
      governance: allowlisted.governance ?? null,
    });
    bucket.push(classificationEntry);
    if (!hasValidPortableSchemaDiffGovernance(allowlisted)) {
      missingGovernanceEntries.push(classificationEntry);
    }
  }

  const staleAllowlistEntries = allowlist.entries.filter(
    (entry) => !consumedAllowlistKeys.has(`${entry.kind}:${entry.vNextHash}`)
  );

  return {
    expectedNonBreaking,
    expectedBreaking,
    unexpectedBreaking,
    missingGovernanceEntries,
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
      governance: {
        owner: DEFAULT_ALLOWLIST_SUGGESTION_OWNER,
        ticket: DEFAULT_ALLOWLIST_SUGGESTION_TICKET,
        approvedAt: now.toISOString(),
      },
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

export const evaluatePortableSchemaDiffStrictViolations = (
  classification: PortableSchemaDiffClassificationReport
): {
  hasUnexpectedBreaking: boolean;
  hasExpiredAllowlist: boolean;
  hasMissingGovernance: boolean;
} => ({
  hasUnexpectedBreaking: classification.unexpectedBreaking.length > 0,
  hasExpiredAllowlist: classification.expiredAllowlistEntries.length > 0,
  hasMissingGovernance: classification.missingGovernanceEntries.length > 0,
});

type PortableSchemaDiffSummaryPayload = {
  specVersion: typeof AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION;
  strict: boolean;
  hasSchemaChanges: boolean;
  changedKinds: PortablePathJsonSchemaDiffReport['changedKinds'];
  summary: {
    expectedNonBreaking: number;
    expectedBreaking: number;
    unexpectedBreaking: number;
    missingGovernanceEntries: number;
    expiredAllowlistEntries: number;
    staleAllowlistEntries: number;
    suggestedAllowlistEntries: number;
  };
  classification: PortableSchemaDiffClassificationReport;
  suggestedAllowlistEntries: PortableSchemaDiffAllowlistEntry[];
};

const isPortableSchemaDiffGuardrailOk = ({
  strict,
  violations,
}: {
  strict: boolean;
  violations: ReturnType<typeof evaluatePortableSchemaDiffStrictViolations>;
}): boolean =>
  !strict ||
  (!violations.hasUnexpectedBreaking &&
    !violations.hasExpiredAllowlist &&
    !violations.hasMissingGovernance);

export const buildPortableSchemaDiffSummaryPayload = ({
  classification,
  diff,
  strict,
  suggestedAllowlistEntries,
}: {
  classification: PortableSchemaDiffClassificationReport;
  diff: PortablePathJsonSchemaDiffReport;
  strict: boolean;
  suggestedAllowlistEntries: PortableSchemaDiffAllowlistEntry[];
}): PortableSchemaDiffSummaryPayload => ({
  specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
  strict,
  hasSchemaChanges: diff.hasChanges,
  changedKinds: diff.changedKinds,
  summary: {
    expectedNonBreaking: classification.expectedNonBreaking.length,
    expectedBreaking: classification.expectedBreaking.length,
    unexpectedBreaking: classification.unexpectedBreaking.length,
    missingGovernanceEntries: classification.missingGovernanceEntries.length,
    expiredAllowlistEntries: classification.expiredAllowlistEntries.length,
    staleAllowlistEntries: classification.staleAllowlistEntries.length,
    suggestedAllowlistEntries: suggestedAllowlistEntries.length,
  },
  classification,
  suggestedAllowlistEntries,
});

const formatPortableSchemaDiffAllowlistTag = (
  entry: Pick<PortableSchemaDiffAllowlistEntry, 'kind' | 'vNextHash'>
): string => `${entry.kind}@${entry.vNextHash}`;

const formatPortableSchemaDiffClassificationTag = (
  entry: Pick<PortableSchemaDiffClassificationEntry, 'kind' | 'currentHash' | 'vNextHash' | 'reason'>
): string =>
  `kind=${entry.kind} current=${entry.currentHash} vnext=${entry.vNextHash} reason=${entry.reason}`;

export const logPortableSchemaDiffSummary = ({
  json,
  logger,
  ok,
  payload,
}: {
  json: boolean;
  logger: Pick<typeof console, 'log' | 'error'>;
  ok: boolean;
  payload: PortableSchemaDiffSummaryPayload;
}): void => {
  if (json) {
    logger.log(JSON.stringify(payload, null, 2));
    return;
  }

  logger.log(
    `[ai-paths:portable-schema-diff] strict=${String(payload.strict)} changed=${String(payload.hasSchemaChanges)}`
  );
  logger.log(
    `[ai-paths:portable-schema-diff] expected_non_breaking=${payload.summary.expectedNonBreaking} expected_breaking=${payload.summary.expectedBreaking} unexpected_breaking=${payload.summary.unexpectedBreaking}`
  );
  if (payload.classification.missingGovernanceEntries.length > 0) {
    logger.error(
      `[ai-paths:portable-schema-diff] allowlisted changes missing governance metadata: ${payload.classification.missingGovernanceEntries
        .map(formatPortableSchemaDiffAllowlistTag)
        .join(', ')}`
    );
  }
  if (payload.classification.expiredAllowlistEntries.length > 0) {
    logger.error(
      `[ai-paths:portable-schema-diff] expired allowlist entries: ${payload.classification.expiredAllowlistEntries
        .map(formatPortableSchemaDiffAllowlistTag)
        .join(', ')}`
    );
  }
  if (payload.classification.staleAllowlistEntries.length > 0) {
    logger.log(
      `[ai-paths:portable-schema-diff] stale allowlist entries: ${payload.classification.staleAllowlistEntries
        .map(formatPortableSchemaDiffAllowlistTag)
        .join(', ')}`
    );
  }
  if (payload.classification.unexpectedBreaking.length > 0) {
    payload.classification.unexpectedBreaking.forEach((entry) => {
      logger.error(
        `[ai-paths:portable-schema-diff] unexpected_breaking ${formatPortableSchemaDiffClassificationTag(entry)}`
      );
    });
  }
  if (payload.suggestedAllowlistEntries.length > 0) {
    logger.log('[ai-paths:portable-schema-diff] suggested allowlist entries (review before merge):');
    logger.log(JSON.stringify(payload.suggestedAllowlistEntries, null, 2));
  }
  if (ok) {
    logger.log('[ai-paths:portable-schema-diff] guardrail passed');
    return;
  }
  logger.error('[ai-paths:portable-schema-diff] guardrail failed');
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
  const violations = evaluatePortableSchemaDiffStrictViolations(classification);
  const ok = isPortableSchemaDiffGuardrailOk({ strict, violations });
  const summaryPayload = buildPortableSchemaDiffSummaryPayload({
    classification,
    diff,
    strict,
    suggestedAllowlistEntries,
  });
  logPortableSchemaDiffSummary({
    json: options.json ?? false,
    logger,
    ok,
    payload: summaryPayload,
  });

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
